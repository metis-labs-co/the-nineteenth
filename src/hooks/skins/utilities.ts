/**
 * Skins Hooks - Utility Hooks
 *
 * Utility hooks for skins feature management.
 *
 * Hooks:
 * - useCanUseSkins: Check if user has skins feature access
 * - useActiveSkinsGameForRound: Get active skins game for a round
 * - useProcessSkinsIfNeeded: Process skins when hole is completed
 * - useFinalizeSkinsForRound: Finalize skins when round is completed
 * - useAutoSplitSkinsForCompetition: Manage auto-split skins for competitions
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { skinsKeys, prizePoolKeys } from '@/hooks/queryKeys';
import {
  prepareHoleScores,
  validateHoleScores,
  prepareTeamHoleScores,
} from '@/utils/skinsCalculations';
import type { SkinsTeamInfo } from '@/utils/skinsCalculations';
import { createError } from './helpers';
import { useProcessSkinsHole, useProcessTeamSkinsHole, useFinalizeSkinsGame } from './mutations';
import type {
  ProcessSkinsResult,
  AutoSplitSkinsInput,
  AutoSplitSkinsResult,
  SyncSkinsResult,
} from './types';
import type {
  SkinsGame,
  SkinsGameWithParticipants,
  SkinsGameWithTeamParticipants,
  SkinsParticipant,
  SkinsTeamParticipant,
} from '@/types/database/skins.types';
import type { TeamFormat } from '@/types/database/enums';

// =====================================================
// INPUT TYPES (local to this file)
// =====================================================

/**
 * Input for processing skins after score entry
 */
interface ProcessSkinsInput {
  roundId: string;
  holeNumber: number;
  scorecards: Record<string, { [holeNumber: string]: { strokes: number } | number }>;
  hole: { par: number; strokeIndex: number };
}

// =====================================================
// UTILITY HOOKS
// =====================================================

/**
 * Utility hook to check if user can use skins feature
 */
export function useCanUseSkins(userId: string | undefined) {
  return useQuery({
    queryKey: skinsKeys.canUseSkins(userId ?? ''),
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;

      const { data, error } = await supabase.rpc('user_has_feature', {
        p_user_id: userId,
        p_feature: 'skins',
      });

      if (error) {
        console.error('[useCanUseSkins] RPC error:', error);
        return false;
      }

      return data === true;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Utility hook to get the active skins game for a round
 */
export function useActiveSkinsGameForRound(roundId: string | undefined) {
  return useQuery({
    queryKey: [...skinsKeys.gamesByRound(roundId ?? ''), 'active'],
    queryFn: async (): Promise<SkinsGameWithParticipants | SkinsGameWithTeamParticipants | null> => {
      console.log('[useActiveSkinsGameForRound] Fetching for roundId:', roundId);

      if (!roundId) {
        console.log('[useActiveSkinsGameForRound] No roundId provided, returning null');
        return null;
      }

      const { data: game, error } = await supabase
        .from('skins_games')
        .select('*')
        .eq('round_id', roundId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('[useActiveSkinsGameForRound] Query result:', {
        gameFound: !!game,
        gameId: game?.id,
        gameStatus: game?.status,
        isTeamSkins: game?.is_team_skins,
        errorCode: error?.code,
        errorMessage: error?.message
      });

      if (error) {
        console.error('[useActiveSkinsGameForRound] Database error:', error);
        throw createError(`Failed to fetch active skins game: ${error.message}`, 'DATABASE');
      }

      if (!game) return null;

      // Check if this is a team skins game
      if (game.is_team_skins && game.participant_team_ids?.length) {
        console.log('[useActiveSkinsGameForRound] Team skins game, fetching teams:', game.participant_team_ids);

        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            team_members (
              player_id,
              players:player_id (
                id,
                name,
                handicap
              )
            )
          `)
          .in('id', game.participant_team_ids);

        if (teamsError) {
          console.error('[useActiveSkinsGameForRound] Failed to fetch team participants:', teamsError);
        }

        const teamParticipants: SkinsTeamParticipant[] = (teams ?? []).map((team) => ({
          id: team.id,
          name: team.name,
          members: (team.team_members ?? []).map((tm: { player_id: string; players: { id: string; name: string; handicap: number | null } | null }) => ({
            id: tm.player_id,
            name: tm.players?.name ?? 'Unknown',
            handicap: tm.players?.handicap ?? null,
          })),
        }));

        console.log('[useActiveSkinsGameForRound] Team participants:', teamParticipants);

        return {
          ...game,
          participants: [],
          teams: teamParticipants,
        } as SkinsGameWithTeamParticipants;
      }

      // Individual skins - fetch player participants
      const { data: players } = await supabase
        .from('players')
        .select('id, name, handicap')
        .in('id', game.participant_ids);

      const participants: SkinsParticipant[] = (players ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap,
      }));

      return {
        ...game,
        participants,
      } as SkinsGameWithParticipants;
    },
    enabled: !!roundId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to process skins results when a hole is completed
 */
export function useProcessSkinsIfNeeded() {
  const processSkinsHoleMutation = useProcessSkinsHole();
  const processTeamSkinsHoleMutation = useProcessTeamSkinsHole();
  const [isProcessing, setIsProcessing] = useState(false);

  const processSkinsHole = useCallback(
    async (input: ProcessSkinsInput): Promise<ProcessSkinsResult> => {
      const { roundId, holeNumber, scorecards, hole } = input;

      console.log('[useProcessSkinsIfNeeded] Starting processing:', {
        roundId,
        holeNumber,
        scorecardCount: Object.keys(scorecards).length,
        hole,
      });

      try {
        setIsProcessing(true);

        // 1. Fetch active skins game for this round
        const { data: skinsGame, error: gameError } = await supabase
          .from('skins_games')
          .select('*')
          .eq('round_id', roundId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        console.log('[useProcessSkinsIfNeeded] Skins game query result:', {
          found: !!skinsGame,
          gameId: skinsGame?.id,
          isTeamSkins: skinsGame?.is_team_skins,
          participantTeamIds: skinsGame?.participant_team_ids,
          participantIds: skinsGame?.participant_ids?.length,
          error: gameError?.message,
        });

        if (gameError || !skinsGame) {
          console.log('[useProcessSkinsIfNeeded] No active skins game found, skipping');
          return { processed: false };
        }

        // 2. Determine if this should be treated as team skins
        let shouldProcessAsTeamSkins = skinsGame.is_team_skins;

        if (!shouldProcessAsTeamSkins) {
          const { data: round } = await supabase
            .from('rounds')
            .select('is_team_round, team_format, team_config')
            .eq('id', roundId)
            .single();

          const TEAM_GAME_TYPES = ['best-ball', 'scramble', 'shamble'];
          const hasTeamFormat = round?.team_format && TEAM_GAME_TYPES.includes(round.team_format);
          const hasTeamConfig = round?.team_config && typeof round.team_config === 'object' &&
            (round.team_config as { teams?: unknown[] })?.teams?.length;
          const isTeamRound = round?.is_team_round || hasTeamFormat || hasTeamConfig;

          if (isTeamRound && hasTeamFormat) {
            shouldProcessAsTeamSkins = true;
            console.log('[useProcessSkinsIfNeeded] Detected team format from round, processing as team skins:', {
              team_format: round?.team_format,
              is_team_round: round?.is_team_round,
              hasTeamConfig: !!hasTeamConfig,
            });

            await supabase
              .from('skins_games')
              .update({ is_team_skins: true })
              .eq('id', skinsGame.id);

            skinsGame.is_team_skins = true;
          }
        }

        // 3. Process as team skins if applicable
        if (shouldProcessAsTeamSkins) {
          console.log('[useProcessSkinsIfNeeded] Processing as TEAM SKINS');
          const teamResult = await processTeamSkins(
            skinsGame,
            roundId,
            holeNumber,
            scorecards,
            hole,
            processTeamSkinsHoleMutation
          );
          console.log('[useProcessSkinsIfNeeded] Team skins result:', teamResult);
          return teamResult;
        }

        // INDIVIDUAL SKINS PROCESSING
        const { data: players } = await supabase
          .from('players')
          .select('id, name, handicap')
          .in('id', skinsGame.participant_ids);

        if (!players || players.length === 0) {
          console.warn('[useProcessSkinsIfNeeded] No participants found');
          return { processed: false, error: 'No participants found' };
        }

        const participants = players.map((p) => ({
          id: p.id,
          name: p.name,
          handicap: p.handicap,
        }));

        const holeScores = prepareHoleScores(
          participants.map((p) => ({ id: p.id, handicap: p.handicap })),
          scorecards,
          hole,
          holeNumber
        );

        const { isValid, missingPlayerIds } = validateHoleScores(
          holeScores,
          skinsGame.participant_ids
        );

        if (!isValid) {
          console.log(
            `[useProcessSkinsIfNeeded] Hole ${holeNumber} not complete. Missing: ${missingPlayerIds.length} players`
          );
          return { processed: false };
        }

        const result = await processSkinsHoleMutation.mutateAsync({
          skinsGameId: skinsGame.id,
          holeNumber,
          holeScores,
        });

        if (result.is_carryover) {
          return {
            processed: true,
            hasWinner: false,
            carryoverAmount: result.carryover_to_next,
          };
        } else if (result.winner_id) {
          const winner = participants.find((p) => p.id === result.winner_id);
          return {
            processed: true,
            hasWinner: true,
            winnerName: winner?.name ?? 'Unknown',
            winningsAmount: result.payout_amount,
          };
        }

        return { processed: true };
      } catch (error) {
        console.error('[useProcessSkinsIfNeeded] Error processing skins:', error);
        return {
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [processSkinsHoleMutation, processTeamSkinsHoleMutation]
  );

  return {
    processSkinsHole,
    isProcessing,
  };
}

/**
 * Internal helper to process team skins
 */
async function processTeamSkins(
  skinsGame: SkinsGame,
  roundId: string,
  holeNumber: number,
  scorecards: Record<string, { [holeNumber: string]: { strokes: number } | number }>,
  hole: { par: number; strokeIndex: number },
  processTeamSkinsHoleMutation: ReturnType<typeof useProcessTeamSkinsHole>
): Promise<ProcessSkinsResult> {
  console.log('[processTeamSkins] Starting with:', {
    skinsGameId: skinsGame.id,
    roundId,
    holeNumber,
    scorecardPlayerIds: Object.keys(scorecards),
    participantTeamIds: skinsGame.participant_team_ids,
  });

  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('team_format, team_config')
    .eq('id', roundId)
    .single();

  console.log('[processTeamSkins] Round query result:', {
    teamFormat: round?.team_format,
    hasTeamConfig: !!(round as { team_config?: unknown })?.team_config,
    error: roundError?.message,
  });

  if (roundError || !round?.team_format) {
    console.warn('[processTeamSkins] Could not get team format:', roundError);
    return { processed: false, error: 'Could not determine team format' };
  }

  const teamFormat = round.team_format as TeamFormat;

  // Try multiple sources for teams
  type TeamMemberType = { player_id: string; players: { id: string; name: string; handicap: number | null } | null };
  let teams: Array<{ id: string; name: string; team_members?: TeamMemberType[] }> | null = null;
  let teamsError;

  // Source 1: participant_team_ids from skins game
  if (skinsGame.participant_team_ids && skinsGame.participant_team_ids.length > 0) {
    console.log('[processTeamSkins] Fetching teams by participant_team_ids');
    const result = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_members (
          player_id,
          players (
            id,
            name,
            handicap
          )
        )
      `)
      .in('id', skinsGame.participant_team_ids);
    teams = result.data;
    teamsError = result.error;
  }

  // Source 2: teams table by round_id
  if (!teams || teams.length === 0) {
    console.log('[processTeamSkins] Fetching teams by round_id from teams table');
    const result = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_members (
          player_id,
          players (
            id,
            name,
            handicap
          )
        )
      `)
      .eq('round_id', roundId);
    teams = result.data;
    teamsError = result.error;

    if (teams && teams.length > 0) {
      const teamIds = teams.map(t => t.id);
      await supabase
        .from('skins_games')
        .update({ participant_team_ids: teamIds })
        .eq('id', skinsGame.id);
      console.log('[processTeamSkins] Updated skins game with team IDs:', teamIds);
    }
  }

  // Source 3: round.team_config (standalone rounds)
  if (!teams || teams.length === 0) {
    console.log('[processTeamSkins] Checking team_config on round');
    const teamConfig = (round as { team_config?: { teams?: Array<{ id: string; name: string; memberIds: string[] }> } })?.team_config;

    if (teamConfig?.teams && teamConfig.teams.length > 0) {
      console.log('[processTeamSkins] Found teams in team_config:', teamConfig.teams.length);

      const allMemberIds = teamConfig.teams.flatMap(t => t.memberIds);
      const { data: players } = await supabase
        .from('players')
        .select('id, name, handicap')
        .in('id', allMemberIds);

      const playerMap = new Map(players?.map(p => [p.id, p]) ?? []);

      teams = teamConfig.teams.map(team => ({
        id: team.id,
        name: team.name,
        team_members: team.memberIds.map(memberId => ({
          player_id: memberId,
          players: playerMap.get(memberId) ?? { id: memberId, name: 'Unknown', handicap: null },
        })),
      }));

      teamsError = null;
    }
  }

  console.log('[processTeamSkins] Teams query result:', {
    teamsCount: teams?.length ?? 0,
    teamIds: teams?.map(t => t.id),
    teamNames: teams?.map(t => t.name),
    error: teamsError?.message,
  });

  if (teamsError || !teams || teams.length === 0) {
    console.warn('[processTeamSkins] Could not fetch teams:', teamsError);
    return { processed: false, error: 'Could not fetch teams' };
  }

  // Transform teams into SkinsTeamInfo format
  const teamsInfo: SkinsTeamInfo[] = teams.map((team) => {
    const members = (team.team_members ?? []).map((tm: TeamMemberType) => ({
      id: tm.player_id,
      handicap: tm.players?.handicap ?? null,
    }));

    return {
      id: team.id,
      member_ids: members.map((m: { id: string }) => m.id),
      members,
    };
  });

  console.log('[processTeamSkins] Teams info built:', {
    teamsCount: teamsInfo.length,
    teams: teamsInfo.map(t => ({
      id: t.id,
      memberIds: t.member_ids,
    })),
  });

  console.log('[processTeamSkins] Preparing team hole scores with scorecards:', {
    scorecardPlayerIds: Object.keys(scorecards),
    hole,
    holeNumber,
    teamFormat,
  });

  const teamHoleScores = prepareTeamHoleScores(
    teamsInfo,
    scorecards,
    hole,
    holeNumber,
    teamFormat
  );

  console.log('[processTeamSkins] Team hole scores result:', {
    teamScoresCount: Object.keys(teamHoleScores).length,
    teamIds: Object.keys(teamHoleScores),
    scores: teamHoleScores,
  });

  // Check if all teams have scores
  const teamsWithScores = Object.keys(teamHoleScores);
  const totalTeams = teams.length;
  if (teamsWithScores.length < totalTeams) {
    console.log(
      `[processTeamSkins] Hole ${holeNumber} not complete. ` +
      `Teams with scores: ${teamsWithScores.length}/${totalTeams}`
    );
    return { processed: false };
  }

  console.log('[processTeamSkins] Calling mutation with:', {
    skinsGameId: skinsGame.id,
    holeNumber,
    teamScores: teamHoleScores,
    teamFormat,
  });

  const result = await processTeamSkinsHoleMutation.mutateAsync({
    skinsGameId: skinsGame.id,
    holeNumber,
    teamScores: teamHoleScores,
    teamFormat,
    skipTeamValidation: true,
  });

  console.log('[processTeamSkins] Mutation result:', {
    holeNumber,
    resultId: result.id,
    isCarryover: result.is_carryover,
    teamWinnerId: result.team_winner_id,
    payoutAmount: result.payout_amount,
  });

  if (result.is_carryover) {
    return {
      processed: true,
      hasWinner: false,
      carryoverAmount: result.carryover_to_next,
    };
  } else if (result.team_winner_id) {
    const winningTeam = teams.find((t) => t.id === result.team_winner_id);
    return {
      processed: true,
      hasWinner: true,
      winnerName: winningTeam?.name ?? 'Unknown Team',
      winningsAmount: result.payout_amount,
    };
  }

  return { processed: true };
}

/**
 * Hook to finalize skins game when scorecard is submitted
 */
export function useFinalizeSkinsForRound() {
  const finalizeSkinsGameMutation = useFinalizeSkinsGame();
  const [isFinalizing, setIsFinalizing] = useState(false);

  const finalizeSkinsForRound = useCallback(
    async (roundId: string): Promise<{ finalized: boolean; error?: string }> => {
      try {
        setIsFinalizing(true);

        const { data: skinsGame, error: gameError } = await supabase
          .from('skins_games')
          .select('id, status')
          .eq('round_id', roundId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (gameError || !skinsGame) {
          return { finalized: false };
        }

        await finalizeSkinsGameMutation.mutateAsync({ gameId: skinsGame.id });

        console.log('[useFinalizeSkinsForRound] Skins game finalized:', skinsGame.id);
        return { finalized: true };
      } catch (error) {
        console.error('[useFinalizeSkinsForRound] Error finalizing skins:', error);
        return {
          finalized: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsFinalizing(false);
      }
    },
    [finalizeSkinsGameMutation]
  );

  return {
    finalizeSkinsForRound,
    isFinalizing,
  };
}

/**
 * Hook to manage auto-split skins for a competition
 */
export function useAutoSplitSkinsForCompetition() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const createAutoSplitSkins = useCallback(
    async (input: AutoSplitSkinsInput): Promise<AutoSplitSkinsResult> => {
      const { competitionId, poolId, potPerRound, scoringType, createdBy } = input;

      try {
        setIsCreating(true);

        const { data: rounds, error: roundsError } = await supabase
          .from('rounds')
          .select('id, round_number, status')
          .eq('competition_id', competitionId)
          .eq('status', 'upcoming')
          .order('round_number', { ascending: true });

        if (roundsError) {
          throw createError(`Failed to fetch rounds: ${roundsError.message}`, 'DATABASE');
        }

        if (!rounds || rounds.length === 0) {
          return {
            success: true,
            gamesCreated: 0,
            totalDrawn: 0,
            gameIds: [],
          };
        }

        const { data: competitionPlayers, error: playersError } = await supabase
          .from('competition_players')
          .select('player_id')
          .eq('competition_id', competitionId);

        if (playersError) {
          throw createError(`Failed to fetch players: ${playersError.message}`, 'DATABASE');
        }

        const participantIds = (competitionPlayers ?? []).map((cp) => cp.player_id);

        if (participantIds.length === 0) {
          return {
            success: false,
            gamesCreated: 0,
            totalDrawn: 0,
            gameIds: [],
            error: 'No players in competition',
          };
        }

        const { data: existingGames } = await supabase
          .from('skins_games')
          .select('round_id, status')
          .in('round_id', rounds.map((r) => r.id))
          .neq('status', 'cancelled');

        const roundsWithGames = new Set((existingGames ?? []).map((g) => g.round_id));
        const roundsToCreate = rounds.filter((r) => !roundsWithGames.has(r.id));

        if (roundsToCreate.length === 0) {
          return {
            success: true,
            gamesCreated: 0,
            totalDrawn: 0,
            gameIds: [],
          };
        }

        const { data: results, error: batchError } = await supabase.rpc(
          'create_auto_split_skins_batch' as never,
          {
            p_competition_id: competitionId,
            p_pool_id: poolId,
            p_round_ids: roundsToCreate.map((r) => r.id),
            p_pot_per_round: potPerRound,
            p_scoring_type: scoringType,
            p_created_by: createdBy,
          } as never
        );

        if (batchError) {
          const errorMessage = batchError.message || 'Failed to create skins games';
          return {
            success: false,
            gamesCreated: 0,
            totalDrawn: 0,
            gameIds: [],
            error: errorMessage,
          };
        }

        const batchResults = (results as { game_id: string; round_id: string; draw_amount: number }[]) ?? [];
        const gameIds = batchResults.map((r) => r.game_id);
        const totalDrawn = batchResults.reduce((sum, r) => sum + (r.draw_amount ?? 0), 0);

        queryClient.invalidateQueries({ queryKey: skinsKeys.all });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.balance(poolId) });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.transactions(poolId) });

        return {
          success: true,
          gamesCreated: gameIds.length,
          totalDrawn,
          gameIds,
        };
      } catch (error) {
        console.error('[createAutoSplitSkins] Error:', error);
        return {
          success: false,
          gamesCreated: 0,
          totalDrawn: 0,
          gameIds: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsCreating(false);
      }
    },
    [queryClient]
  );

  const syncAutoSplitSkins = useCallback(
    async (input: Omit<AutoSplitSkinsInput, 'skinsBudget'>): Promise<SyncSkinsResult> => {
      const { competitionId, poolId, potPerRound, scoringType, createdBy } = input;

      try {
        setIsSyncing(true);

        const { data: rounds, error: roundsError } = await supabase
          .from('rounds')
          .select('id, round_number, status')
          .eq('competition_id', competitionId)
          .order('round_number', { ascending: true });

        if (roundsError) {
          throw createError(`Failed to fetch rounds: ${roundsError.message}`, 'DATABASE');
        }

        const scheduledRoundIds = new Set(
          (rounds ?? []).filter((r) => r.status === 'upcoming').map((r) => r.id)
        );

        const { data: existingGames, error: gamesError } = await supabase
          .from('skins_games')
          .select('id, round_id, pot_value, pool_draw_amount, status')
          .in('round_id', (rounds ?? []).map((r) => r.id))
          .eq('pool_source', 'prize_pool')
          .neq('status', 'cancelled');

        if (gamesError) {
          throw createError(`Failed to fetch existing games: ${gamesError.message}`, 'DATABASE');
        }

        const existingRoundIds = new Set((existingGames ?? []).map((g) => g.round_id));

        const roundsToCreate = (rounds ?? []).filter(
          (r) => r.status === 'upcoming' && !existingRoundIds.has(r.id)
        );

        const gamesToCancel = (existingGames ?? []).filter(
          (g) => !scheduledRoundIds.has(g.round_id) && g.status === 'active'
        );

        let participantIds: string[] = [];
        if (roundsToCreate.length > 0) {
          const { data: competitionPlayers } = await supabase
            .from('competition_players')
            .select('player_id')
            .eq('competition_id', competitionId);

          participantIds = (competitionPlayers ?? []).map((cp) => cp.player_id);
        }

        let gamesCreated = 0;
        let gamesCancelled = 0;
        let amountDrawn = 0;
        let amountReturned = 0;

        for (const round of roundsToCreate) {
          if (participantIds.length === 0) continue;

          const { data: drawnAmount, error: drawError } = await supabase.rpc(
            'draw_from_pool' as never,
            {
              p_pool_id: poolId,
              p_round_id: round.id,
              p_amount: potPerRound,
            } as never
          );

          if (drawError) {
            console.error(`[syncAutoSplitSkins] Failed to draw for round ${round.id}:`, drawError);
            continue;
          }

          const actualDrawn = drawnAmount as number;
          amountDrawn += actualDrawn;

          const { error: gameError } = await supabase.from('skins_games').insert({
            round_id: round.id,
            participant_ids: participantIds,
            pot_type: 'fixed' as const,
            pot_value: actualDrawn,
            currency: 'AUD',
            scoring_type: scoringType,
            pool_source: 'prize_pool' as const,
            pool_draw_amount: actualDrawn,
            status: 'active' as const,
            disclaimer_accepted_at: new Date().toISOString(),
            disclaimer_accepted_by: createdBy,
            created_by: createdBy,
          });

          if (!gameError) {
            gamesCreated++;
          }
        }

        for (const game of gamesToCancel) {
          const { error: cancelError } = await supabase
            .from('skins_games')
            .update({ status: 'cancelled' })
            .eq('id', game.id);

          if (cancelError) {
            console.error(`[syncAutoSplitSkins] Failed to cancel game ${game.id}:`, cancelError);
            continue;
          }

          const returnAmount = game.pool_draw_amount ?? game.pot_value;
          if (returnAmount > 0) {
            const { error: returnError } = await supabase.rpc('return_to_pool' as never, {
              p_pool_id: poolId,
              p_round_id: game.round_id,
              p_amount: returnAmount,
              p_description: 'Auto-split skins cancelled - round removed',
            } as never);

            if (!returnError) {
              amountReturned += returnAmount;
            }
          }

          gamesCancelled++;
        }

        queryClient.invalidateQueries({ queryKey: skinsKeys.all });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.balance(poolId) });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.transactions(poolId) });

        return {
          success: true,
          gamesCreated,
          gamesCancelled,
          amountDrawn,
          amountReturned,
        };
      } catch (error) {
        console.error('[syncAutoSplitSkins] Error:', error);
        return {
          success: false,
          gamesCreated: 0,
          gamesCancelled: 0,
          amountDrawn: 0,
          amountReturned: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsSyncing(false);
      }
    },
    [queryClient]
  );

  const cancelAutoSplitSkins = useCallback(
    async (
      competitionId: string,
      poolId: string
    ): Promise<{ success: boolean; gamesCancelled: number; amountReturned: number; error?: string }> => {
      try {
        setIsCancelling(true);

        const { data: rounds } = await supabase
          .from('rounds')
          .select('id')
          .eq('competition_id', competitionId);

        if (!rounds || rounds.length === 0) {
          return { success: true, gamesCancelled: 0, amountReturned: 0 };
        }

        const { data: games, error: gamesError } = await supabase
          .from('skins_games')
          .select('id, round_id, pot_value, pool_draw_amount')
          .in('round_id', rounds.map((r) => r.id))
          .eq('pool_source', 'prize_pool')
          .eq('status', 'active');

        if (gamesError) {
          throw createError(`Failed to fetch games: ${gamesError.message}`, 'DATABASE');
        }

        if (!games || games.length === 0) {
          return { success: true, gamesCancelled: 0, amountReturned: 0 };
        }

        let gamesCancelled = 0;
        let amountReturned = 0;

        for (const game of games) {
          const { error: cancelError } = await supabase
            .from('skins_games')
            .update({ status: 'cancelled' })
            .eq('id', game.id);

          if (cancelError) {
            console.error(`[cancelAutoSplitSkins] Failed to cancel game ${game.id}:`, cancelError);
            continue;
          }

          const returnAmount = game.pool_draw_amount ?? game.pot_value;
          if (returnAmount > 0) {
            const { error: returnError } = await supabase.rpc('return_to_pool' as never, {
              p_pool_id: poolId,
              p_round_id: game.round_id,
              p_amount: returnAmount,
              p_description: 'Auto-split skins disabled - funds returned',
            } as never);

            if (!returnError) {
              amountReturned += returnAmount;
            }
          }

          gamesCancelled++;
        }

        queryClient.invalidateQueries({ queryKey: skinsKeys.all });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.balance(poolId) });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.transactions(poolId) });

        return {
          success: true,
          gamesCancelled,
          amountReturned,
        };
      } catch (error) {
        console.error('[cancelAutoSplitSkins] Error:', error);
        return {
          success: false,
          gamesCancelled: 0,
          amountReturned: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsCancelling(false);
      }
    },
    [queryClient]
  );

  return {
    createAutoSplitSkins,
    syncAutoSplitSkins,
    cancelAutoSplitSkins,
    isCreating,
    isSyncing,
    isCancelling,
  };
}
