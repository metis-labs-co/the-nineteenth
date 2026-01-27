/**
 * TanStack Query hooks for Skins Games
 *
 * Provides hooks for fetching and mutating skins game data.
 * Skins is a gambling side-game where players compete hole-by-hole for a pot.
 *
 * Hooks:
 * - Query: useSkinsGame, useSkinsGamesByRound, useSkinsResults, useSkinsPayouts, useSkinsSummary
 * - Mutation: useCreateSkinsGame, useProcessSkinsHole, useFinalizeSkinsGame, useCancelSkinsGame
 * - Utility: useCanUseSkins, useActiveSkinsGameForRound
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { skinsKeys, subscriptionKeys } from '@/hooks/queryKeys';
import {
  calculateTotalPot,
  calculateHoleValue,
  calculateCurrentCarryover,
  calculateFinalPayouts,
  calculateFinalPayoutsWithCarryover,
  processHoleResult,
  determineHoleWinner,
  calculateBuyIn,
  prepareHoleScores,
  validateHoleScores,
  // Team skins functions
  prepareTeamHoleScores,
  processTeamHoleResult,
  calculateTeamFinalPayouts,
} from '@/utils/skinsCalculations';
import type { SkinsTeamInfo, TeamPayoutParticipant } from '@/utils/skinsCalculations';
import { prizePoolKeys } from '@/hooks/queryKeys';
import type {
  SkinsGame,
  SkinsGameWithParticipants,
  SkinsGameWithTeamParticipants,
  SkinsResult,
  SkinsResultWithWinner,
  SkinsResultWithTeamWinner,
  SkinsPayout,
  SkinsPayoutWithPlayer,
  SkinsPayoutWithTeam,
  SkinsGameSummary,
  CreateSkinsGameInput,
  SkinsHoleScores,
  SkinsTeamHoleScores,
  SkinsParticipant,
  SkinsTeamParticipant,
  SkinsWinner,
  SkinsTeamWinner,
  SkinsPayoutPlayer,
  SkinsPayoutTeam,
} from '@/types/database/skins.types';
import type { TeamFormat } from '@/types/database/enums';

// =====================================================
// TYPES
// =====================================================

/**
 * Error type for skins service operations
 */
export interface SkinsServiceError extends Error {
  code: 'NOT_FOUND' | 'VALIDATION' | 'DATABASE' | 'PERMISSION' | 'UNKNOWN';
}

/**
 * Input for processing a skins hole (individual)
 */
export interface ProcessSkinsHoleInput {
  skinsGameId: string;
  holeNumber: number;
  holeScores: SkinsHoleScores;
}

/**
 * Input for processing a team skins hole
 */
export interface ProcessTeamSkinsHoleInput {
  skinsGameId: string;
  holeNumber: number;
  teamScores: SkinsTeamHoleScores;
  teamFormat: TeamFormat;
  /** Skip is_team_skins validation (used when auto-detected from round format) */
  skipTeamValidation?: boolean;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Creates a typed SkinsServiceError
 */
function createError(
  message: string,
  code: SkinsServiceError['code']
): SkinsServiceError {
  const error = new Error(message) as SkinsServiceError;
  error.code = code;
  return error;
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Query hook to fetch a single skins game with participant details
 *
 * @param gameId - Skins game UUID
 * @returns Query result with SkinsGameWithParticipants
 *
 * @example
 * ```tsx
 * function SkinsGameDetails({ gameId }: { gameId: string }) {
 *   const { data: game, isLoading, error } = useSkinsGame(gameId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorState message={error.message} />;
 *   if (!game) return <Text>Game not found</Text>;
 *
 *   return (
 *     <View>
 *       <Text>Pot: ${game.pot_value} {game.pot_type}</Text>
 *       <Text>Players: {game.participants.map(p => p.name).join(', ')}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useSkinsGame(gameId: string | undefined) {
  return useQuery({
    queryKey: skinsKeys.game(gameId ?? ''),
    queryFn: async (): Promise<SkinsGameWithParticipants | SkinsGameWithTeamParticipants | null> => {
      if (!gameId) return null;

      const { data: game, error } = await supabase
        .from('skins_games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw createError(`Failed to fetch skins game: ${error.message}`, 'DATABASE');
      }

      if (!game) return null;

      // Check if this is a team skins game
      if (game.is_team_skins) {
        let teamParticipants: SkinsTeamParticipant[] = [];

        // Source 1: Try using participant_team_ids if available
        if (game.participant_team_ids?.length) {
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
            console.error('[useSkins] Failed to fetch team participants:', teamsError);
          }

          teamParticipants = (teams ?? []).map((team) => ({
            id: team.id,
            name: team.name,
            members: (team.team_members ?? []).map((tm: { player_id: string; players: { id: string; name: string; handicap: number | null } | null }) => ({
              id: tm.player_id,
              name: tm.players?.name ?? 'Unknown',
              handicap: tm.players?.handicap ?? null,
            })),
          }));
        }

        // Source 2: Fallback to round's team_config for standalone rounds
        if (teamParticipants.length === 0 && game.round_id) {
          const { data: round } = await supabase
            .from('rounds')
            .select('team_config')
            .eq('id', game.round_id)
            .single();

          const teamConfig = (round as { team_config?: { teams?: Array<{ id: string; name: string; memberIds: string[] }> } })?.team_config;

          if (teamConfig?.teams && teamConfig.teams.length > 0) {
            // Get player details for members
            const allMemberIds = teamConfig.teams.flatMap(t => t.memberIds);
            const { data: players } = await supabase
              .from('players')
              .select('id, name, handicap')
              .in('id', allMemberIds);

            const playerMap = new Map(players?.map(p => [p.id, p]) ?? []);

            teamParticipants = teamConfig.teams.map(team => ({
              id: team.id,
              name: team.name,
              members: team.memberIds.map(memberId => {
                const player = playerMap.get(memberId);
                return {
                  id: memberId,
                  name: player?.name ?? 'Unknown',
                  handicap: player?.handicap ?? null,
                };
              }),
            }));
          }
        }

        // If we found team data, return with teams
        if (teamParticipants.length > 0) {
          return {
            ...game,
            participants: [], // Empty for team skins
            teams: teamParticipants,
          } as SkinsGameWithTeamParticipants;
        }
      }

      // Individual skins - fetch player participants
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, handicap')
        .in('id', game.participant_ids);

      if (playersError) {
        console.error('[useSkins] Failed to fetch participants:', playersError);
      }

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
    enabled: !!gameId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch all skins games for a round
 *
 * @param roundId - Round UUID
 * @returns Query result with array of SkinsGameWithParticipants
 *
 * @example
 * ```tsx
 * function RoundSkinsGames({ roundId }: { roundId: string }) {
 *   const { data: games } = useSkinsGamesByRound(roundId);
 *
 *   return games?.map(game => (
 *     <SkinsGameCard key={game.id} game={game} />
 *   ));
 * }
 * ```
 */
export function useSkinsGamesByRound(roundId: string | undefined) {
  return useQuery({
    queryKey: skinsKeys.gamesByRound(roundId ?? ''),
    queryFn: async (): Promise<SkinsGameWithParticipants[]> => {
      if (!roundId) return [];

      const { data: games, error } = await supabase
        .from('skins_games')
        .select('*')
        .eq('round_id', roundId)
        .order('created_at', { ascending: false });

      if (error) {
        throw createError(`Failed to fetch skins games: ${error.message}`, 'DATABASE');
      }

      if (!games || games.length === 0) return [];

      // Collect all unique participant IDs
      const allParticipantIds = [...new Set(games.flatMap((g) => g.participant_ids))];

      // Fetch all participants in one query
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, handicap')
        .in('id', allParticipantIds);

      if (playersError) {
        console.error('[useSkins] Failed to fetch participants:', playersError);
      }

      const playerMap = new Map(
        (players ?? []).map((p) => [p.id, { id: p.id, name: p.name, handicap: p.handicap }])
      );

      return games.map((game) => ({
        ...game,
        participants: game.participant_ids
          .map((id) => playerMap.get(id))
          .filter((p): p is SkinsParticipant => p !== undefined),
      })) as SkinsGameWithParticipants[];
    },
    enabled: !!roundId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch skins results for a game
 *
 * Returns hole-by-hole results with winner details.
 *
 * @param gameId - Skins game UUID
 * @returns Query result with array of SkinsResultWithWinner
 *
 * @example
 * ```tsx
 * function SkinsHoleResults({ gameId }: { gameId: string }) {
 *   const { data: results } = useSkinsResults(gameId);
 *
 *   return results?.map(result => (
 *     <View key={result.hole_number}>
 *       <Text>Hole {result.hole_number}: {result.winner?.name ?? 'Carryover'}</Text>
 *     </View>
 *   ));
 * }
 * ```
 */
export function useSkinsResults(gameId: string | undefined) {
  return useQuery({
    queryKey: skinsKeys.results(gameId ?? ''),
    queryFn: async (): Promise<SkinsResultWithWinner[] | SkinsResultWithTeamWinner[]> => {
      if (!gameId) {
        console.log('[useSkinsResults] No gameId provided, returning empty');
        return [];
      }

      console.log('[useSkinsResults] Fetching results for game:', gameId);

      const { data: results, error } = await supabase
        .from('skins_results')
        .select('*')
        .eq('skins_game_id', gameId)
        .order('hole_number', { ascending: true });

      console.log('[useSkinsResults] Query result:', {
        gameId,
        resultsCount: results?.length ?? 0,
        holeNumbers: results?.map(r => r.hole_number),
        teamWinnerIds: results?.map(r => r.team_winner_id),
        error: error?.message,
      });

      if (error) {
        throw createError(`Failed to fetch skins results: ${error.message}`, 'DATABASE');
      }

      if (!results || results.length === 0) return [];

      // Check if any results have team winners (team skins)
      const hasTeamWinners = results.some((r) => r.team_winner_id);

      if (hasTeamWinners) {
        // Team skins - fetch team winner details
        const teamWinnerIds = [...new Set(results.map((r) => r.team_winner_id).filter(Boolean))] as string[];

        let teamWinnerMap = new Map<string, SkinsTeamWinner>();
        if (teamWinnerIds.length > 0) {
          // First try to fetch from teams table (competition teams)
          const { data: teams } = await supabase
            .from('teams')
            .select('id, name')
            .in('id', teamWinnerIds);

          if (teams && teams.length > 0) {
            teamWinnerMap = new Map(teams.map((t) => [t.id, { id: t.id, name: t.name, members: [] }]));
          }

          // If not all teams found in teams table, check round.team_config (standalone rounds)
          if (teamWinnerMap.size < teamWinnerIds.length) {
            // Fetch the skins game to get round_id
            const { data: skinsGame } = await supabase
              .from('skins_games')
              .select('round_id')
              .eq('id', gameId)
              .single();

            if (skinsGame?.round_id) {
              // Fetch the round's team_config
              const { data: round } = await supabase
                .from('rounds')
                .select('team_config')
                .eq('id', skinsGame.round_id)
                .single();

              const teamConfig = (round as { team_config?: { teams?: Array<{ id: string; name: string }> } })?.team_config;
              if (teamConfig?.teams) {
                // Add teams from team_config that aren't already in the map
                teamConfig.teams.forEach((t) => {
                  if (!teamWinnerMap.has(t.id)) {
                    teamWinnerMap.set(t.id, { id: t.id, name: t.name, members: [] });
                  }
                });
              }
            }
          }
        }

        return results.map((result) => ({
          ...result,
          winner: null, // No individual winner for team skins
          team_winner: result.team_winner_id ? teamWinnerMap.get(result.team_winner_id) ?? null : null,
        })) as SkinsResultWithTeamWinner[];
      }

      // Individual skins - fetch player winner details
      const winnerIds = [...new Set(results.map((r) => r.winner_id).filter(Boolean))];

      let winnerMap = new Map<string, SkinsWinner>();
      if (winnerIds.length > 0) {
        const { data: winners } = await supabase
          .from('players')
          .select('id, name')
          .in('id', winnerIds);

        if (winners) {
          winnerMap = new Map(winners.map((w) => [w.id, { id: w.id, name: w.name }]));
        }
      }

      return results.map((result) => ({
        ...result,
        winner: result.winner_id ? winnerMap.get(result.winner_id) ?? null : null,
      })) as SkinsResultWithWinner[];
    },
    enabled: !!gameId,
    staleTime: 0, // Always refetch to ensure fresh data during play
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch skins payouts for a game
 *
 * Returns final settlement amounts for each player.
 *
 * @param gameId - Skins game UUID
 * @returns Query result with array of SkinsPayoutWithPlayer
 *
 * @example
 * ```tsx
 * function SkinsSettlement({ gameId }: { gameId: string }) {
 *   const { data: payouts } = useSkinsPayouts(gameId);
 *
 *   return payouts?.map(payout => (
 *     <View key={payout.player_id}>
 *       <Text>{payout.player.name}: ${payout.net_result.toFixed(2)}</Text>
 *     </View>
 *   ));
 * }
 * ```
 */
export function useSkinsPayouts(gameId: string | undefined) {
  return useQuery({
    queryKey: skinsKeys.payouts(gameId ?? ''),
    queryFn: async (): Promise<SkinsPayoutWithPlayer[]> => {
      if (!gameId) return [];

      const { data: payouts, error } = await supabase
        .from('skins_payouts')
        .select('*')
        .eq('skins_game_id', gameId)
        .order('net_result', { ascending: false });

      if (error) {
        throw createError(`Failed to fetch skins payouts: ${error.message}`, 'DATABASE');
      }

      if (!payouts || payouts.length === 0) return [];

      // Get player details
      const playerIds = payouts.map((p) => p.player_id);
      const { data: players } = await supabase
        .from('players')
        .select('id, name')
        .in('id', playerIds);

      const playerMap = new Map<string, SkinsPayoutPlayer>(
        (players ?? []).map((p) => [p.id, { id: p.id, name: p.name }])
      );

      return payouts.map((payout) => ({
        ...payout,
        player: playerMap.get(payout.player_id) ?? { id: payout.player_id, name: 'Unknown' },
      })) as SkinsPayoutWithPlayer[];
    },
    enabled: !!gameId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch complete skins game summary
 *
 * Combines game, results, and payouts with calculated metrics.
 *
 * @param gameId - Skins game UUID
 * @returns Query result with SkinsGameSummary
 *
 * @example
 * ```tsx
 * function SkinsOverview({ gameId }: { gameId: string }) {
 *   const { data: summary, isLoading } = useSkinsSummary(gameId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!summary) return null;
 *
 *   return (
 *     <View>
 *       <Text>Total Pot: ${summary.total_pot}</Text>
 *       <Text>Carryover: ${summary.current_carryover}</Text>
 *       <Text>Holes Completed: {summary.holes_completed}/18</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useSkinsSummary(gameId: string | undefined) {
  const gameQuery = useSkinsGame(gameId);
  const resultsQuery = useSkinsResults(gameId);
  const payoutsQuery = useSkinsPayouts(gameId);

  // Extract data from dependent queries
  const game = gameQuery.data;
  const results = resultsQuery.data ?? [];
  const payouts = payoutsQuery.data ?? [];

  // Compute summary directly using useMemo - this reacts to changes in dependent data
  const summary = useMemo((): SkinsGameSummary | null => {
    if (!game) return null;

    const totalPot = calculateTotalPot(game.pot_type, game.pot_value);
    const perHoleValue = calculateHoleValue(game.pot_type, game.pot_value);
    const currentCarryover = calculateCurrentCarryover(results as SkinsResult[]);
    const holesCompleted = results.length;

    return {
      game: game as SkinsGameWithParticipants,
      results: results as SkinsResultWithWinner[],
      payouts: payouts as SkinsPayoutWithPlayer[],
      current_carryover: currentCarryover,
      holes_completed: holesCompleted,
      total_pot: totalPot,
      per_hole_value: perHoleValue,
    };
  }, [game, results, payouts]);

  // Return a query-like object for backwards compatibility
  return {
    data: summary,
    isLoading: gameQuery.isLoading || resultsQuery.isLoading || payoutsQuery.isLoading,
    isError: gameQuery.isError || resultsQuery.isError || payoutsQuery.isError,
    error: gameQuery.error || resultsQuery.error || payoutsQuery.error,
    refetch: async () => {
      // Refetch all dependent queries
      await Promise.all([
        gameQuery.refetch(),
        resultsQuery.refetch(),
        payoutsQuery.refetch(),
      ]);
    },
  };
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Mutation hook to create a new skins game
 *
 * Creates the game record with disclaimer acknowledgment.
 *
 * @returns Mutation result with create function
 *
 * @example
 * ```tsx
 * function CreateSkinsButton({ roundId, participants }: Props) {
 *   const { mutate: createGame, isPending } = useCreateSkinsGame();
 *
 *   const handleCreate = () => {
 *     createGame(
 *       {
 *         round_id: roundId,
 *         participant_ids: participants.map(p => p.id),
 *         pot_type: 'per_hole',
 *         pot_value: 5,
 *         scoring_type: 'gross',
 *         disclaimerAcceptedBy: currentUserId,
 *       },
 *       {
 *         onSuccess: (game) => {
 *           Alert.alert('Success', 'Skins game created!');
 *         },
 *       }
 *     );
 *   };
 *
 *   return <Button onPress={handleCreate} loading={isPending}>Create Skins Game</Button>;
 * }
 * ```
 */
/**
 * Extended input for creating skins game with pool support
 */
export interface CreateSkinsGameWithPoolInput extends CreateSkinsGameInput {
  /** User ID who accepted disclaimer and is creating the game */
  disclaimerAcceptedBy: string;
  /** Pool ID when using prize_pool source (required if pool_source is 'prize_pool') */
  pool_id?: string;
}

export function useCreateSkinsGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSkinsGameWithPoolInput): Promise<SkinsGame> => {
      const { disclaimerAcceptedBy, pool_id, ...gameInput } = input;

      let potValue = gameInput.pot_value;
      let poolDrawAmount = 0;

      // When using prize pool, draw from pool first
      if (gameInput.pool_source === 'prize_pool') {
        if (!pool_id) {
          throw createError('Pool ID is required when using prize_pool source', 'VALIDATION');
        }

        // Calculate total pot needed
        const totalPotNeeded = gameInput.pot_type === 'per_hole'
          ? gameInput.pot_value * 18
          : gameInput.pot_value;

        // Check if we can draw the full amount
        const { data: canDraw, error: canDrawError } = await supabase.rpc(
          'can_draw_from_pool' as never,
          {
            p_pool_id: pool_id,
            p_amount: totalPotNeeded,
          } as never
        );

        if (canDrawError) {
          throw createError(`Failed to check pool balance: ${canDrawError.message}`, 'DATABASE');
        }

        if (canDraw !== true) {
          // Get the actual remaining balance for error message
          const { data: remaining } = await supabase.rpc('get_pool_balance' as never, {
            p_pool_id: pool_id,
            p_category: 'skins',
          } as never);

          throw createError(
            `Insufficient skins budget. Requested $${totalPotNeeded.toFixed(2)} but only $${((remaining as number) ?? 0).toFixed(2)} available.`,
            'VALIDATION'
          );
        }

        // Draw from pool
        const { data: drawnAmount, error: drawError } = await supabase.rpc(
          'draw_from_pool' as never,
          {
            p_pool_id: pool_id,
            p_round_id: gameInput.round_id,
            p_amount: totalPotNeeded,
          } as never
        );

        if (drawError) {
          throw createError(`Failed to draw from pool: ${drawError.message}`, 'DATABASE');
        }

        poolDrawAmount = (drawnAmount as number) ?? 0;

        // If pot_type is per_hole, recalculate per-hole value from drawn amount
        if (gameInput.pot_type === 'per_hole') {
          potValue = poolDrawAmount / 18;
        } else {
          potValue = poolDrawAmount;
        }
      }

      const insertData = {
        round_id: gameInput.round_id,
        pairing_id: gameInput.pairing_id ?? null,
        participant_ids: gameInput.participant_ids,
        pot_type: gameInput.pot_type,
        pot_value: potValue,
        currency: gameInput.currency ?? 'AUD',
        scoring_type: gameInput.scoring_type,
        pool_source: gameInput.pool_source ?? 'direct',
        pool_draw_amount: poolDrawAmount,
        status: 'active' as const,
        disclaimer_accepted_at: new Date().toISOString(),
        disclaimer_accepted_by: disclaimerAcceptedBy,
        created_by: disclaimerAcceptedBy,
        // Team skins fields
        is_team_skins: gameInput.is_team_skins ?? false,
        participant_team_ids: gameInput.participant_team_ids ?? null,
      };

      const { data, error } = await supabase
        .from('skins_games')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // If insert fails after drawing from pool, we should return the funds
        // Note: In production, this should be a transaction but Supabase client doesn't support it directly
        if (poolDrawAmount > 0 && pool_id) {
          console.error('[useCreateSkinsGame] Insert failed after pool draw, attempting to return funds...');
          await supabase.rpc('return_to_pool' as never, {
            p_pool_id: pool_id,
            p_round_id: gameInput.round_id,
            p_amount: poolDrawAmount,
            p_description: 'Refund: Skins game creation failed',
          } as never);
        }
        throw createError(`Failed to create skins game: ${error.message}`, 'DATABASE');
      }

      return data as SkinsGame;
    },

    onSuccess: (data) => {
      // Invalidate games list for this round
      queryClient.invalidateQueries({
        queryKey: skinsKeys.gamesByRound(data.round_id),
      });

      // If pool-sourced, invalidate pool queries
      if (data.pool_source === 'prize_pool') {
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.all });
      }
    },

    onError: (error) => {
      console.error('[useCreateSkinsGame] Failed to create game:', error);
    },
  });
}

/**
 * Mutation hook to process a skins hole result
 *
 * Calculates winner/carryover and stores the result.
 * Uses client-side calculation (Phase 1 - DB functions deferred).
 *
 * @returns Mutation result with process function
 *
 * @example
 * ```tsx
 * function ProcessHoleButton({ gameId, holeNumber, holeScores }: Props) {
 *   const { mutate: processHole, isPending } = useProcessSkinsHole();
 *
 *   return (
 *     <Button
 *       onPress={() => processHole({ skinsGameId: gameId, holeNumber, holeScores })}
 *       loading={isPending}
 *     >
 *       Process Skins
 *     </Button>
 *   );
 * }
 * ```
 */
export function useProcessSkinsHole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProcessSkinsHoleInput): Promise<SkinsResult> => {
      const { skinsGameId, holeNumber, holeScores } = input;

      // Fetch game to get scoring type and pot config
      const { data: game, error: gameError } = await supabase
        .from('skins_games')
        .select('*')
        .eq('id', skinsGameId)
        .single();

      if (gameError || !game) {
        throw createError('Skins game not found', 'NOT_FOUND');
      }

      // Fetch existing results to calculate carryover
      const { data: existingResults } = await supabase
        .from('skins_results')
        .select('*')
        .eq('skins_game_id', skinsGameId)
        .order('hole_number', { ascending: true });

      const currentCarryover = calculateCurrentCarryover(existingResults ?? []);
      const baseHoleValue = calculateHoleValue(game.pot_type, game.pot_value);

      // Process the hole result using client-side calculation
      const resultData = processHoleResult(
        holeNumber,
        holeScores,
        baseHoleValue,
        currentCarryover,
        game.scoring_type
      );

      // Check if result already exists for this hole
      const { data: existingHole } = await supabase
        .from('skins_results')
        .select('id')
        .eq('skins_game_id', skinsGameId)
        .eq('hole_number', holeNumber)
        .single();

      let result: SkinsResult;

      if (existingHole) {
        // Update existing result
        const { data, error } = await supabase
          .from('skins_results')
          .update({
            winner_id: resultData.winner_id,
            is_carryover: resultData.is_carryover,
            hole_scores: resultData.hole_scores,
            hole_pot_value: resultData.hole_pot_value,
            carryover_to_next: resultData.carryover_to_next,
            payout_amount: resultData.payout_amount,
            calculated_at: new Date().toISOString(),
          })
          .eq('id', existingHole.id)
          .select()
          .single();

        if (error) {
          throw createError(`Failed to update skins result: ${error.message}`, 'DATABASE');
        }

        result = data as SkinsResult;
      } else {
        // Insert new result
        const { data, error } = await supabase
          .from('skins_results')
          .insert({
            skins_game_id: skinsGameId,
            hole_number: holeNumber,
            winner_id: resultData.winner_id,
            is_carryover: resultData.is_carryover,
            hole_scores: resultData.hole_scores,
            hole_pot_value: resultData.hole_pot_value,
            carryover_to_next: resultData.carryover_to_next,
            payout_amount: resultData.payout_amount,
          })
          .select()
          .single();

        if (error) {
          throw createError(`Failed to insert skins result: ${error.message}`, 'DATABASE');
        }

        result = data as SkinsResult;
      }

      return result;
    },

    onSuccess: (data) => {
      console.log('[useProcessSkinsHole] Success, invalidating cache for game:', data.skins_game_id);
      // Invalidate and refetch results and summary for this game
      queryClient.invalidateQueries({
        queryKey: skinsKeys.results(data.skins_game_id),
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: skinsKeys.summary(data.skins_game_id),
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: skinsKeys.game(data.skins_game_id),
        refetchType: 'all',
      });
    },

    onError: (error) => {
      console.error('[useProcessSkinsHole] Failed to process hole:', error);
    },
  });
}

/**
 * Mutation hook to process a team skins hole result
 *
 * Calculates winning team/carryover and stores the result.
 * Used for team formats: best-ball, scramble, shamble.
 *
 * @returns Mutation result with process function
 *
 * @example
 * ```tsx
 * function ProcessTeamHoleButton({ gameId, holeNumber, teamScores, teamFormat }: Props) {
 *   const { mutate: processHole, isPending } = useProcessTeamSkinsHole();
 *
 *   return (
 *     <Button
 *       onPress={() => processHole({ skinsGameId: gameId, holeNumber, teamScores, teamFormat })}
 *       loading={isPending}
 *     >
 *       Process Team Skins
 *     </Button>
 *   );
 * }
 * ```
 */
export function useProcessTeamSkinsHole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProcessTeamSkinsHoleInput): Promise<SkinsResult> => {
      const { skinsGameId, holeNumber, teamScores, teamFormat, skipTeamValidation } = input;

      // Fetch game to get scoring type and pot config
      const { data: game, error: gameError } = await supabase
        .from('skins_games')
        .select('*')
        .eq('id', skinsGameId)
        .single();

      if (gameError || !game) {
        throw createError('Skins game not found', 'NOT_FOUND');
      }

      // Validate is_team_skins unless explicitly skipped (auto-detected from round format)
      if (!skipTeamValidation && !game.is_team_skins) {
        throw createError('This is not a team skins game', 'VALIDATION');
      }

      // Fetch existing results to calculate carryover
      const { data: existingResults } = await supabase
        .from('skins_results')
        .select('*')
        .eq('skins_game_id', skinsGameId)
        .order('hole_number', { ascending: true });

      const currentCarryover = calculateCurrentCarryover(existingResults ?? []);
      const baseHoleValue = calculateHoleValue(game.pot_type, game.pot_value);

      // Process the team hole result using client-side calculation
      const resultData = processTeamHoleResult(
        holeNumber,
        teamScores,
        baseHoleValue,
        currentCarryover,
        teamFormat,
        game.scoring_type
      );

      // Check if result already exists for this hole (use maybeSingle to avoid error on no match)
      const { data: existingHole, error: existingError } = await supabase
        .from('skins_results')
        .select('id')
        .eq('skins_game_id', skinsGameId)
        .eq('hole_number', holeNumber)
        .maybeSingle();

      console.log('[useProcessTeamSkinsHole] Checking existing result:', {
        skinsGameId,
        holeNumber,
        existingHoleId: existingHole?.id,
        existingError: existingError?.message,
      });

      let result: SkinsResult;

      if (existingHole) {
        // Update existing result
        console.log('[useProcessTeamSkinsHole] Updating existing result:', existingHole.id);
        const { data, error } = await supabase
          .from('skins_results')
          .update({
            team_winner_id: resultData.team_winner_id,
            winner_id: null, // Clear individual winner for team skins
            is_carryover: resultData.is_carryover,
            hole_scores: resultData.hole_scores,
            hole_pot_value: resultData.hole_pot_value,
            carryover_to_next: resultData.carryover_to_next,
            payout_amount: resultData.payout_amount,
            calculated_at: new Date().toISOString(),
          })
          .eq('id', existingHole.id)
          .select()
          .single();

        if (error) {
          throw createError(`Failed to update team skins result: ${error.message}`, 'DATABASE');
        }

        result = data as SkinsResult;
      } else {
        // Insert new result using upsert to handle race conditions
        console.log('[useProcessTeamSkinsHole] Inserting new result for hole:', holeNumber);
        const { data, error } = await supabase
          .from('skins_results')
          .upsert({
            skins_game_id: skinsGameId,
            hole_number: holeNumber,
            team_winner_id: resultData.team_winner_id,
            winner_id: null, // Team skins don't have individual winners
            is_carryover: resultData.is_carryover,
            hole_scores: resultData.hole_scores,
            hole_pot_value: resultData.hole_pot_value,
            carryover_to_next: resultData.carryover_to_next,
            payout_amount: resultData.payout_amount,
            calculated_at: new Date().toISOString(),
          }, {
            onConflict: 'skins_game_id,hole_number',
          })
          .select()
          .single();

        if (error) {
          throw createError(`Failed to upsert team skins result: ${error.message}`, 'DATABASE');
        }

        result = data as SkinsResult;
      }

      return result;
    },

    onSuccess: (data) => {
      console.log('[useProcessTeamSkinsHole] Success, invalidating cache for game:', data.skins_game_id);
      // Invalidate and refetch results and summary for this game
      queryClient.invalidateQueries({
        queryKey: skinsKeys.results(data.skins_game_id),
        refetchType: 'all', // Force immediate refetch of all active queries
      });
      queryClient.invalidateQueries({
        queryKey: skinsKeys.summary(data.skins_game_id),
        refetchType: 'all',
      });
      // Also invalidate the game query to refresh team data
      queryClient.invalidateQueries({
        queryKey: skinsKeys.game(data.skins_game_id),
        refetchType: 'all',
      });
    },

    onError: (error) => {
      console.error('[useProcessTeamSkinsHole] Failed to process team hole:', error);
    },
  });
}

/**
 * Mutation hook to finalize a skins game
 *
 * Calculates final payouts, handles hole 18 carryover appropriately based on pool source:
 * - Direct pot games: Carryover is split evenly among participants
 * - Pool-sourced games: Carryover is returned to the prize pool (via database trigger)
 *
 * Marks the game as completed, which triggers the database to return any carryover
 * to the prize pool for pool-sourced games.
 *
 * @returns Mutation result with finalize function
 *
 * @example
 * ```tsx
 * function FinalizeButton({ gameId }: { gameId: string }) {
 *   const { mutate: finalize, isPending } = useFinalizeSkinsGame();
 *
 *   return (
 *     <Button
 *       onPress={() => finalize({ gameId })}
 *       loading={isPending}
 *     >
 *       Finalize Skins
 *     </Button>
 *   );
 * }
 * ```
 */
export function useFinalizeSkinsGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }): Promise<SkinsGame> => {
      // Fetch game with participants
      const { data: game, error: gameError } = await supabase
        .from('skins_games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        throw createError('Skins game not found', 'NOT_FOUND');
      }

      // Fetch all results
      const { data: results, error: resultsError } = await supabase
        .from('skins_results')
        .select('*')
        .eq('skins_game_id', gameId)
        .order('hole_number', { ascending: true });

      if (resultsError) {
        throw createError(`Failed to fetch results: ${resultsError.message}`, 'DATABASE');
      }

      // Fetch participant details for payout calculation
      const { data: players } = await supabase
        .from('players')
        .select('id, name, handicap')
        .in('id', game.participant_ids);

      const participants = (players ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap,
      }));

      // Check if this is a pool-sourced game
      const isPoolSourced = game.pool_source === 'prize_pool';

      // Calculate final payouts with carryover handling
      // - For direct pot: hole 18 carryover is split among participants
      // - For pool-sourced: carryover is NOT split (returned to pool via DB trigger)
      const payoutResult = calculateFinalPayoutsWithCarryover(
        game as SkinsGame,
        (results ?? []) as SkinsResult[],
        participants,
        { poolSourced: isPoolSourced }
      );

      // Delete existing payouts and insert new ones
      await supabase.from('skins_payouts').delete().eq('skins_game_id', gameId);

      const payoutInserts = payoutResult.payouts.map((p) => ({
        skins_game_id: gameId,
        player_id: p.player_id,
        buy_in: p.buy_in,
        total_winnings: p.total_winnings,
        net_result: p.net_result,
        holes_won: p.holes_won,
        holes_tied: p.holes_tied,
        holes_lost: p.holes_lost,
      }));

      if (payoutInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('skins_payouts')
          .insert(payoutInserts);

        if (insertError) {
          throw createError(`Failed to insert payouts: ${insertError.message}`, 'DATABASE');
        }
      }

      // Mark game as completed
      // For pool-sourced games, the database trigger (on_skins_game_complete_return_carryover)
      // will automatically:
      // 1. Calculate remaining carryover
      // 2. Call return_to_pool() to create pool transaction
      // 3. Update carryover_returned field
      const { data: updatedGame, error: updateError } = await supabase
        .from('skins_games')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      if (updateError) {
        throw createError(`Failed to update game status: ${updateError.message}`, 'DATABASE');
      }

      // Log carryover handling for debugging
      if (isPoolSourced && payoutResult.remainingCarryover > 0) {
        console.log(
          `[useFinalizeSkinsGame] Pool-sourced game completed. ` +
          `Remaining carryover $${payoutResult.remainingCarryover} will be returned to pool via DB trigger.`
        );
      } else if (payoutResult.hole18CarryoverSplit) {
        console.log(
          `[useFinalizeSkinsGame] Direct pot game completed. ` +
          `Hole 18 carryover was split among ${participants.length} participants.`
        );
      }

      return updatedGame as SkinsGame;
    },

    onSuccess: (data) => {
      // Invalidate all skins queries for this game
      queryClient.invalidateQueries({ queryKey: skinsKeys.game(data.id) });
      queryClient.invalidateQueries({ queryKey: skinsKeys.results(data.id) });
      queryClient.invalidateQueries({ queryKey: skinsKeys.payouts(data.id) });
      queryClient.invalidateQueries({ queryKey: skinsKeys.summary(data.id) });
      queryClient.invalidateQueries({ queryKey: skinsKeys.gamesByRound(data.round_id) });

      // For pool-sourced games, also invalidate pool queries since carryover was returned
      if (data.pool_source === 'prize_pool') {
        // Invalidate all prize pool queries to refresh balances
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.all });
      }
    },

    onError: (error) => {
      console.error('[useFinalizeSkinsGame] Failed to finalize game:', error);
    },
  });
}

/**
 * Mutation hook to cancel a skins game
 *
 * Marks the game as cancelled. Cannot be undone.
 *
 * @returns Mutation result with cancel function
 *
 * @example
 * ```tsx
 * function CancelButton({ gameId }: { gameId: string }) {
 *   const { mutate: cancel, isPending } = useCancelSkinsGame();
 *
 *   const handleCancel = () => {
 *     Alert.alert('Cancel Skins', 'Are you sure?', [
 *       { text: 'No', style: 'cancel' },
 *       { text: 'Yes', onPress: () => cancel({ gameId }) },
 *     ]);
 *   };
 *
 *   return <Button onPress={handleCancel} loading={isPending}>Cancel</Button>;
 * }
 * ```
 */
export function useCancelSkinsGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }): Promise<SkinsGame> => {
      const { data, error } = await supabase
        .from('skins_games')
        .update({ status: 'cancelled' })
        .eq('id', gameId)
        .select()
        .single();

      if (error) {
        throw createError(`Failed to cancel skins game: ${error.message}`, 'DATABASE');
      }

      return data as SkinsGame;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: skinsKeys.game(data.id) });
      queryClient.invalidateQueries({ queryKey: skinsKeys.gamesByRound(data.round_id) });
    },

    onError: (error) => {
      console.error('[useCancelSkinsGame] Failed to cancel game:', error);
    },
  });
}

// =====================================================
// UTILITY HOOKS
// =====================================================

/**
 * Utility hook to check if user can use skins feature
 *
 * Calls user_has_feature RPC to check subscription tier.
 *
 * @param userId - User UUID to check
 * @returns Query result with boolean
 *
 * @example
 * ```tsx
 * function SkinsToggle({ userId }: { userId: string }) {
 *   const { data: canUseSkins, isLoading } = useCanUseSkins(userId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!canUseSkins) return <UpgradePrompt feature="skins" />;
 *
 *   return <SkinsConfig />;
 * }
 * ```
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Utility hook to get the active skins game for a round
 *
 * Returns the first active (non-cancelled, non-completed) skins game.
 * Useful for checking if skins is enabled for a round.
 *
 * @param roundId - Round UUID
 * @returns Query result with SkinsGameWithParticipants or null
 *
 * @example
 * ```tsx
 * function ScorecardHeader({ roundId }: { roundId: string }) {
 *   const { data: skinsGame } = useActiveSkinsGameForRound(roundId);
 *
 *   return (
 *     <View>
 *       <Text>Scorecard</Text>
 *       {skinsGame && <SkinsIndicator game={skinsGame} />}
 *     </View>
 *   );
 * }
 * ```
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

        // Fetch team participants with their members
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
          participants: [], // Empty for team skins
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

// =====================================================
// SKINS PROCESSING HOOK (Score Integration)
// =====================================================

/**
 * Input for processing skins after score entry
 */
export interface ProcessSkinsInput {
  /** Round ID to check for active skins game */
  roundId: string;
  /** The hole number that was just scored (1-18) */
  holeNumber: number;
  /** Map of player ID to their scorecard data (scores by hole) */
  scorecards: Record<string, { [holeNumber: string]: { strokes: number } | number }>;
  /** Hole data for the scored hole */
  hole: { par: number; strokeIndex: number };
}

/**
 * Result from processing skins for a hole
 */
export interface ProcessSkinsResult {
  /** Whether skins was processed */
  processed: boolean;
  /** Error message if processing failed */
  error?: string;
  /** Whether there was a winner for this hole */
  hasWinner?: boolean;
  /** Name of the winner (if any) */
  winnerName?: string;
  /** Pot amount won (if winner) */
  winningsAmount?: number;
  /** Carryover amount (if tie) */
  carryoverAmount?: number;
}

/**
 * Hook to process skins results when a hole is completed.
 *
 * This hook encapsulates the logic for:
 * 1. Checking if a skins game exists for the round
 * 2. Detecting individual vs team skins and routing appropriately
 * 3. Validating all participants/teams have scores for the hole
 * 4. Processing the hole result (winner or carryover)
 * 5. Handling errors gracefully (non-blocking)
 *
 * Supports both individual skins and team skins (best-ball, scramble, shamble).
 *
 * @returns Object with process function and loading state
 *
 * @example
 * ```tsx
 * function ScorecardScreen({ roundId }) {
 *   const { processSkinsHole, isProcessing } = useProcessSkinsIfNeeded();
 *
 *   const handleScoreEntry = async (playerId, hole, strokes) => {
 *     // Save score to store
 *     await setPlayerScore(playerId, hole, strokes);
 *
 *     // Process skins if applicable (non-blocking)
 *     // Works for both individual and team skins
 *     const result = await processSkinsHole({
 *       roundId,
 *       holeNumber: hole,
 *       scorecards: groupScorecards,
 *       hole: { par: 4, strokeIndex: 5 },
 *     });
 *
 *     if (result.hasWinner) {
 *       showToast(`${result.winnerName} wins $${result.winningsAmount}!`);
 *     }
 *   };
 * }
 * ```
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
          // No active skins game - this is normal, not an error
          console.log('[useProcessSkinsIfNeeded] No active skins game found, skipping');
          return { processed: false };
        }

        // 2. Determine if this should be treated as team skins
        // Check the skins game flag first, but also check round format as fallback
        let shouldProcessAsTeamSkins = skinsGame.is_team_skins;

        // If not already marked as team skins, check the round format
        if (!shouldProcessAsTeamSkins) {
          const { data: round } = await supabase
            .from('rounds')
            .select('is_team_round, team_format, team_config')
            .eq('id', roundId)
            .single();

          const TEAM_GAME_TYPES = ['best-ball', 'scramble', 'shamble'];
          // Check if this is a team format - either by is_team_round flag, team_format, or has team_config
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

            // Update the skins game to mark it as team skins for future processing
            // Also update the local object so the mutation doesn't fail validation
            await supabase
              .from('skins_games')
              .update({ is_team_skins: true })
              .eq('id', skinsGame.id);

            // Update local object to reflect the change
            skinsGame.is_team_skins = true;
          }
        }

        // 3. Process as team skins if applicable
        if (shouldProcessAsTeamSkins) {
          // TEAM SKINS PROCESSING
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
        // 3. Fetch participant details for handicap calculations
        const { data: players } = await supabase
          .from('players')
          .select('id, name, handicap')
          .in('id', skinsGame.participant_ids);

        if (!players || players.length === 0) {
          console.warn('[useProcessSkinsIfNeeded] No participants found');
          return { processed: false, error: 'No participants found' };
        }

        // 4. Prepare participant info for score calculation
        const participants = players.map((p) => ({
          id: p.id,
          name: p.name,
          handicap: p.handicap,
        }));

        // 5. Check if all participants have scores for this hole
        const holeScores = prepareHoleScores(
          participants.map((p) => ({ id: p.id, handicap: p.handicap })),
          scorecards,
          hole,
          holeNumber
        );

        // Validate all participants have scores
        const { isValid, missingPlayerIds } = validateHoleScores(
          holeScores,
          skinsGame.participant_ids
        );

        if (!isValid) {
          // Not all players have scored this hole yet - wait for completion
          console.log(
            `[useProcessSkinsIfNeeded] Hole ${holeNumber} not complete. Missing: ${missingPlayerIds.length} players`
          );
          return { processed: false };
        }

        // 6. Process the skins hole
        const result = await processSkinsHoleMutation.mutateAsync({
          skinsGameId: skinsGame.id,
          holeNumber,
          holeScores,
        });

        // 7. Return result with human-readable info
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
        // Log error but don't fail - skins is a side feature
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

  // 1. Fetch round to get team format AND team_config (for standalone rounds)
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

  // 2. Fetch teams with their members
  // Try multiple sources: participant_team_ids, teams table by round_id, or team_config
  let teams: Array<{ id: string; name: string; team_members?: Array<{ player_id: string; players: { id: string; name: string; handicap: number | null } | null }> }> | null = null;
  let teamsError;

  // Source 1: Try using participant_team_ids from skins game
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

  // Source 2: Try fetching teams by round_id from teams table
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

    // Also update the skins game with the team IDs for future processing
    if (teams && teams.length > 0) {
      const teamIds = teams.map(t => t.id);
      await supabase
        .from('skins_games')
        .update({ participant_team_ids: teamIds })
        .eq('id', skinsGame.id);
      console.log('[processTeamSkins] Updated skins game with team IDs:', teamIds);
    }
  }

  // Source 3: Try extracting teams from round.team_config (standalone rounds)
  if (!teams || teams.length === 0) {
    console.log('[processTeamSkins] Checking team_config on round');
    const teamConfig = (round as { team_config?: { teams?: Array<{ id: string; name: string; memberIds: string[] }> } })?.team_config;

    if (teamConfig?.teams && teamConfig.teams.length > 0) {
      console.log('[processTeamSkins] Found teams in team_config:', teamConfig.teams.length);

      // Get player details for members
      const allMemberIds = teamConfig.teams.flatMap(t => t.memberIds);
      const { data: players } = await supabase
        .from('players')
        .select('id, name, handicap')
        .in('id', allMemberIds);

      const playerMap = new Map(players?.map(p => [p.id, p]) ?? []);

      // Transform team_config teams to match expected format
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

  // 3. Transform teams into SkinsTeamInfo format
  const teamsInfo: SkinsTeamInfo[] = teams.map((team) => {
    const members = (team.team_members ?? []).map((tm: { player_id: string; players: { id: string; name: string; handicap: number | null } | null }) => ({
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

  // 4. Prepare team hole scores
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

  // 5. Check if all teams have scores (at least one member per team)
  const teamsWithScores = Object.keys(teamHoleScores);
  const totalTeams = teams.length;
  if (teamsWithScores.length < totalTeams) {
    console.log(
      `[processTeamSkins] Hole ${holeNumber} not complete. ` +
      `Teams with scores: ${teamsWithScores.length}/${totalTeams}`
    );
    return { processed: false };
  }

  // 6. Process the team skins hole
  // Skip team validation since we've already auto-detected team skins from round format
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

  // 7. Return result with human-readable info
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
 * Hook to finalize skins game when scorecard is submitted.
 *
 * Call this after all 18 holes are completed and the scorecard is submitted.
 * It calculates final payouts and marks the skins game as completed.
 *
 * **Carryover Handling:**
 * - For direct pot games: Hole 18 carryover is split evenly among participants
 * - For pool-sourced games: Carryover is returned to the prize pool (via database trigger)
 *
 * @returns Object with finalize function and loading state
 *
 * @example
 * ```tsx
 * function ReviewScorecardScreen({ roundId }) {
 *   const { finalizeSkinsForRound, isFinalizing } = useFinalizeSkinsForRound();
 *
 *   const handleSubmit = async () => {
 *     await submitScorecards();
 *
 *     // Finalize skins (non-blocking)
 *     // For pool-sourced games, any remaining carryover is returned to the pool
 *     await finalizeSkinsForRound(roundId);
 *   };
 * }
 * ```
 */
export function useFinalizeSkinsForRound() {
  const finalizeSkinsGameMutation = useFinalizeSkinsGame();
  const [isFinalizing, setIsFinalizing] = useState(false);

  const finalizeSkinsForRound = useCallback(
    async (roundId: string): Promise<{ finalized: boolean; error?: string }> => {
      try {
        setIsFinalizing(true);

        // 1. Check if there's an active skins game for this round
        const { data: skinsGame, error: gameError } = await supabase
          .from('skins_games')
          .select('id, status')
          .eq('round_id', roundId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (gameError || !skinsGame) {
          // No active skins game - nothing to finalize
          return { finalized: false };
        }

        // 2. Finalize the skins game
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

// =====================================================
// AUTO-SPLIT SKINS HOOK
// =====================================================

/**
 * Input for auto-split skins configuration
 */
export interface AutoSplitSkinsInput {
  /** Competition ID */
  competitionId: string;
  /** Pool ID to draw from */
  poolId: string;
  /** Skins budget from pool */
  skinsBudget: number;
  /** Pot per round (pre-calculated from pool) */
  potPerRound: number;
  /** Scoring type for skins games */
  scoringType: 'gross' | 'net';
  /** User ID who is setting up auto-split (for disclaimer) */
  createdBy: string;
}

/**
 * Result from auto-split operation
 */
export interface AutoSplitSkinsResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Number of skins games created */
  gamesCreated: number;
  /** Total amount drawn from pool */
  totalDrawn: number;
  /** Array of created game IDs */
  gameIds: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Result from sync operation (add/remove rounds)
 */
export interface SyncSkinsResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Number of new games created */
  gamesCreated: number;
  /** Number of games cancelled (rounds removed) */
  gamesCancelled: number;
  /** Amount drawn for new rounds */
  amountDrawn: number;
  /** Amount returned for cancelled rounds */
  amountReturned: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Hook to manage auto-split skins for a competition.
 *
 * When auto_split_skins is enabled on a prize pool, this hook handles:
 * 1. Creating skins games for all scheduled rounds
 * 2. Drawing from pool for each round
 * 3. Syncing when rounds are added/removed
 * 4. Cancelling games and returning funds when rounds are deleted
 *
 * @returns Object with auto-split functions and loading states
 *
 * @example
 * ```tsx
 * function CompetitionPoolSetup({ competitionId, pool }: Props) {
 *   const {
 *     createAutoSplitSkins,
 *     syncAutoSplitSkins,
 *     cancelAutoSplitSkins,
 *     isCreating,
 *     isSyncing,
 *   } = useAutoSplitSkinsForCompetition();
 *
 *   const handleEnableAutoSplit = async () => {
 *     const result = await createAutoSplitSkins({
 *       competitionId,
 *       poolId: pool.id,
 *       skinsBudget: pool.skins_budget,
 *       potPerRound: pool.skins_pot_per_round,
 *       scoringType: 'gross',
 *       createdBy: currentUserId,
 *     });
 *
 *     if (result.success) {
 *       Alert.alert('Success', `Created ${result.gamesCreated} skins games`);
 *     }
 *   };
 *
 *   // When rounds change, sync the skins games
 *   const handleRoundsChange = async () => {
 *     await syncAutoSplitSkins({
 *       competitionId,
 *       poolId: pool.id,
 *       potPerRound: pool.skins_pot_per_round,
 *       scoringType: 'gross',
 *       createdBy: currentUserId,
 *     });
 *   };
 * }
 * ```
 */
export function useAutoSplitSkinsForCompetition() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  /**
   * Create skins games for all scheduled rounds with auto-split.
   * Draws from the prize pool for each round.
   */
  const createAutoSplitSkins = useCallback(
    async (input: AutoSplitSkinsInput): Promise<AutoSplitSkinsResult> => {
      const { competitionId, poolId, potPerRound, scoringType, createdBy } = input;

      try {
        setIsCreating(true);

        // 1. Fetch all scheduled rounds for the competition
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

        // 2. Fetch all participants for the competition
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

        // 3. Check for existing skins games to avoid duplicates
        const { data: existingGames } = await supabase
          .from('skins_games')
          .select('round_id, status')
          .in(
            'round_id',
            rounds.map((r) => r.id)
          )
          .neq('status', 'cancelled');

        const roundsWithGames = new Set((existingGames ?? []).map((g) => g.round_id));

        // 4. Filter to rounds that need skins games
        const roundsToCreate = rounds.filter((r) => !roundsWithGames.has(r.id));

        if (roundsToCreate.length === 0) {
          return {
            success: true,
            gamesCreated: 0,
            totalDrawn: 0,
            gameIds: [],
          };
        }

        // 5. Create skins games atomically using batch RPC
        // This ensures all games are created or none are (no partial state)
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
          // Extract user-friendly error message from RPC error
          const errorMessage = batchError.message || 'Failed to create skins games';
          return {
            success: false,
            gamesCreated: 0,
            totalDrawn: 0,
            gameIds: [],
            error: errorMessage,
          };
        }

        // Calculate totals from RPC response
        const batchResults = (results as { game_id: string; round_id: string; draw_amount: number }[]) ?? [];
        const gameIds = batchResults.map((r) => r.game_id);
        const totalDrawn = batchResults.reduce((sum, r) => sum + (r.draw_amount ?? 0), 0);

        // 6. Invalidate queries
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

  /**
   * Sync auto-split skins when rounds are added or removed.
   * Creates games for new rounds and cancels/returns funds for removed rounds.
   */
  const syncAutoSplitSkins = useCallback(
    async (input: Omit<AutoSplitSkinsInput, 'skinsBudget'>): Promise<SyncSkinsResult> => {
      const { competitionId, poolId, potPerRound, scoringType, createdBy } = input;

      try {
        setIsSyncing(true);

        // 1. Get all scheduled rounds
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

        // 2. Get existing skins games for this competition
        const { data: existingGames, error: gamesError } = await supabase
          .from('skins_games')
          .select('id, round_id, pot_value, pool_draw_amount, status')
          .in(
            'round_id',
            (rounds ?? []).map((r) => r.id)
          )
          .eq('pool_source', 'prize_pool')
          .neq('status', 'cancelled');

        if (gamesError) {
          throw createError(`Failed to fetch existing games: ${gamesError.message}`, 'DATABASE');
        }

        const existingRoundIds = new Set((existingGames ?? []).map((g) => g.round_id));

        // 3. Find rounds that need games created
        const roundsToCreate = (rounds ?? []).filter(
          (r) => r.status === 'upcoming' && !existingRoundIds.has(r.id)
        );

        // 4. Find games for rounds that were removed or changed status
        const gamesToCancel = (existingGames ?? []).filter(
          (g) => !scheduledRoundIds.has(g.round_id) && g.status === 'active'
        );

        // 5. Get competition players for new games
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

        // 6. Create games for new rounds
        for (const round of roundsToCreate) {
          if (participantIds.length === 0) continue;

          // Draw from pool
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

          // Create skins game
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

        // 7. Cancel games for removed rounds and return funds
        for (const game of gamesToCancel) {
          // Cancel the game
          const { error: cancelError } = await supabase
            .from('skins_games')
            .update({ status: 'cancelled' })
            .eq('id', game.id);

          if (cancelError) {
            console.error(`[syncAutoSplitSkins] Failed to cancel game ${game.id}:`, cancelError);
            continue;
          }

          // Return the drawn amount to pool
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

        // 8. Invalidate queries
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

  /**
   * Cancel all auto-split skins games and return funds to pool.
   * Use when disabling auto-split or deleting the prize pool.
   */
  const cancelAutoSplitSkins = useCallback(
    async (
      competitionId: string,
      poolId: string
    ): Promise<{ success: boolean; gamesCancelled: number; amountReturned: number; error?: string }> => {
      try {
        setIsCancelling(true);

        // 1. Get all active pool-sourced skins games for this competition
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
          .in(
            'round_id',
            rounds.map((r) => r.id)
          )
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

        // 2. Cancel each game and return funds
        for (const game of games) {
          const { error: cancelError } = await supabase
            .from('skins_games')
            .update({ status: 'cancelled' })
            .eq('id', game.id);

          if (cancelError) {
            console.error(`[cancelAutoSplitSkins] Failed to cancel game ${game.id}:`, cancelError);
            continue;
          }

          // Return the drawn amount to pool
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

        // 3. Invalidate queries
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

// =====================================================
// SKINS PLAYER STATISTICS TYPES
// =====================================================

/**
 * Player skins statistics from the database
 */
export interface SkinsPlayerStatistics {
  id: string;
  player_id: string;
  games_played: number;
  games_won: number;
  total_holes_played: number;
  total_holes_won: number;
  total_holes_tied: number;
  total_buy_ins: number;
  total_winnings: number;
  total_net_result: number;
  current_win_streak: number;
  longest_win_streak: number;
  win_rate: number | null;
  hole_win_rate: number | null;
  last_game_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Leaderboard entry from the get_skins_leaderboard RPC
 */
export interface SkinsLeaderboardEntry {
  rank: number;
  player_id: string;
  games_played: number;
  games_won: number;
  total_holes_won: number;
  total_winnings: number;
  total_net_result: number;
  win_rate: number | null;
  hole_win_rate: number | null;
  current_win_streak: number;
  longest_win_streak: number;
  // Joined player data
  player?: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
}

/**
 * Game history entry with details
 */
export interface SkinsGameHistoryEntry {
  id: string;
  round_id: string;
  pot_type: string;
  pot_value: number;
  scoring_type: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  // Joined data
  round?: {
    id: string;
    round_number: number;
    date: string | null;
    course?: {
      id: string;
      name: string;
    };
    competition?: {
      id: string;
      name: string;
    };
  };
  payout?: {
    buy_in: number;
    total_winnings: number;
    net_result: number;
    holes_won: number;
    holes_tied: number;
    holes_lost: number;
  };
}

/**
 * Options for leaderboard query
 */
export interface SkinsLeaderboardOptions {
  /** Maximum number of entries to fetch */
  limit?: number;
  /** Minimum games played to be included */
  minGames?: number;
  /** Only include friends (requires current user) */
  friendsOnly?: boolean;
}

/**
 * Options for game history query
 */
export interface SkinsGameHistoryOptions {
  /** Maximum number of entries to fetch */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// =====================================================
// STATISTICS & LEADERBOARD HOOKS
// =====================================================

/**
 * Query hook to fetch player skins statistics
 *
 * Retrieves aggregate statistics for a player's skins game history.
 *
 * @param playerId - Player UUID to fetch statistics for
 * @returns Query result with SkinsPlayerStatistics or null
 *
 * @example
 * ```tsx
 * function PlayerStatsCard({ playerId }: { playerId: string }) {
 *   const { data: stats, isLoading } = useSkinsStatistics(playerId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!stats) return <Text>No stats yet</Text>;
 *
 *   return (
 *     <View>
 *       <Text>Games: {stats.games_played}</Text>
 *       <Text>Win Rate: {stats.win_rate?.toFixed(1)}%</Text>
 *       <Text>Net: ${stats.total_net_result.toFixed(2)}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useSkinsStatistics(playerId: string | undefined) {
  return useQuery({
    queryKey: skinsKeys.statistics(playerId ?? ''),
    queryFn: async (): Promise<SkinsPlayerStatistics | null> => {
      if (!playerId) return null;

      // Use the RPC function for proper access control
      const { data, error } = await supabase.rpc('get_player_skins_stats', {
        p_player_id: playerId,
      });

      if (error) {
        // If no stats exist yet, return null (not an error)
        if (error.code === 'PGRST116') return null;
        throw createError(`Failed to fetch skins statistics: ${error.message}`, 'DATABASE');
      }

      return data as SkinsPlayerStatistics;
    },
    enabled: !!playerId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Convenience hook to fetch current user's skins statistics
 *
 * Uses the authenticated user's ID automatically.
 *
 * @returns Query result with SkinsPlayerStatistics or null
 *
 * @example
 * ```tsx
 * function MyStatsOverview() {
 *   const { data: myStats, isLoading } = useMySkinsStatistics();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!myStats) return <Text>Play your first skins game!</Text>;
 *
 *   return <SkinsStatsCard statistics={myStats} />;
 * }
 * ```
 */
export function useMySkinsStatistics() {
  // Fetch current user session
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const userId = session?.user?.id;

  return useQuery({
    queryKey: skinsKeys.statistics(userId ?? 'self'),
    queryFn: async (): Promise<SkinsPlayerStatistics | null> => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_player_skins_stats', {
        p_player_id: userId,
      });

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw createError(`Failed to fetch skins statistics: ${error.message}`, 'DATABASE');
      }

      return data as SkinsPlayerStatistics;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch skins leaderboard
 *
 * Returns top players ranked by net result, with optional filtering.
 *
 * @param options - Leaderboard options (limit, minGames, friendsOnly)
 * @returns Query result with array of SkinsLeaderboardEntry
 *
 * @example
 * ```tsx
 * function SkinsLeaderboardScreen() {
 *   const { data: entries, isLoading } = useSkinsLeaderboard({
 *     limit: 20,
 *     minGames: 3,
 *     friendsOnly: false,
 *   });
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return (
 *     <FlatList
 *       data={entries}
 *       renderItem={({ item }) => (
 *         <View>
 *           <Text>#{item.rank} {item.player?.name}</Text>
 *           <Text>${item.total_net_result.toFixed(2)}</Text>
 *         </View>
 *       )}
 *     />
 *   );
 * }
 * ```
 */
export function useSkinsLeaderboard(options: SkinsLeaderboardOptions = {}) {
  const { limit = 10, minGames = 1, friendsOnly = false } = options;

  // Fetch current user for friends filtering
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const userId = session?.user?.id;

  return useQuery({
    queryKey: skinsKeys.leaderboard({ friendsOnly, minGames }),
    queryFn: async (): Promise<SkinsLeaderboardEntry[]> => {
      // Call the leaderboard RPC function
      const { data: leaderboard, error } = await supabase.rpc('get_skins_leaderboard', {
        p_limit: limit,
        p_min_games: minGames,
        p_friends_only: friendsOnly,
        p_user_id: friendsOnly ? userId ?? null : null,
      });

      if (error) {
        throw createError(`Failed to fetch skins leaderboard: ${error.message}`, 'DATABASE');
      }

      if (!leaderboard || leaderboard.length === 0) return [];

      // Fetch player details for all entries
      const playerIds = leaderboard.map((entry: SkinsLeaderboardEntry) => entry.player_id);
      const { data: players } = await supabase
        .from('players')
        .select('id, name, avatar_url')
        .in('id', playerIds);

      const playerMap = new Map(
        (players ?? []).map((p) => [p.id, { id: p.id, name: p.name, avatar_url: p.avatar_url }])
      );

      return (leaderboard as SkinsLeaderboardEntry[]).map((entry) => ({
        ...entry,
        player: playerMap.get(entry.player_id),
      }));
    },
    enabled: !friendsOnly || !!userId, // Only run if not friends-only OR we have a user
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch player's skins game history
 *
 * Returns past completed skins games with payout details.
 *
 * @param playerId - Player UUID to fetch history for
 * @param options - Pagination options (limit, offset)
 * @returns Query result with array of SkinsGameHistoryEntry
 *
 * @example
 * ```tsx
 * function SkinsHistoryList({ playerId }: { playerId: string }) {
 *   const { data: history, isLoading, fetchNextPage } = useSkinsGameHistory(playerId, {
 *     limit: 20,
 *   });
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return (
 *     <FlatList
 *       data={history}
 *       renderItem={({ item }) => (
 *         <View>
 *           <Text>{item.round?.course?.name}</Text>
 *           <Text>Net: ${item.payout?.net_result.toFixed(2)}</Text>
 *         </View>
 *       )}
 *       onEndReached={fetchNextPage}
 *     />
 *   );
 * }
 * ```
 */
export function useSkinsGameHistory(
  playerId: string | undefined,
  options: SkinsGameHistoryOptions = {}
) {
  const { limit = 20, offset = 0 } = options;

  return useQuery({
    queryKey: [...skinsKeys.history(playerId ?? ''), { limit, offset }],
    queryFn: async (): Promise<SkinsGameHistoryEntry[]> => {
      if (!playerId) return [];

      // First, get games where this player participated
      const { data: games, error: gamesError } = await supabase
        .from('skins_games')
        .select('*')
        .contains('participant_ids', [playerId])
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (gamesError) {
        throw createError(`Failed to fetch skins history: ${gamesError.message}`, 'DATABASE');
      }

      if (!games || games.length === 0) return [];

      // Get the round details for all games
      const roundIds = [...new Set(games.map((g) => g.round_id))];
      const { data: rounds } = await supabase
        .from('rounds')
        .select(`
          id,
          round_number,
          date,
          course_id,
          competition_id
        `)
        .in('id', roundIds);

      // Get course details
      const courseIds = [...new Set((rounds ?? []).map((r) => r.course_id).filter(Boolean))];
      const { data: courses } = courseIds.length > 0
        ? await supabase
            .from('courses')
            .select('id, name')
            .in('id', courseIds)
        : { data: [] };

      // Get competition details
      const competitionIds = [...new Set((rounds ?? []).map((r) => r.competition_id).filter(Boolean))];
      const { data: competitions } = competitionIds.length > 0
        ? await supabase
            .from('competitions')
            .select('id, name')
            .in('id', competitionIds)
        : { data: [] };

      // Get payouts for this player in these games
      const gameIds = games.map((g) => g.id);
      const { data: payouts } = await supabase
        .from('skins_payouts')
        .select('*')
        .in('skins_game_id', gameIds)
        .eq('player_id', playerId);

      // Build lookup maps
      const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));
      const competitionMap = new Map((competitions ?? []).map((c) => [c.id, c]));
      const roundMap = new Map(
        (rounds ?? []).map((r) => [
          r.id,
          {
            id: r.id,
            round_number: r.round_number,
            date: r.date,
            course: r.course_id ? courseMap.get(r.course_id) : undefined,
            competition: r.competition_id ? competitionMap.get(r.competition_id) : undefined,
          },
        ])
      );
      const payoutMap = new Map((payouts ?? []).map((p) => [p.skins_game_id, p]));

      // Combine all data
      return games.map((game) => {
        const payout = payoutMap.get(game.id);
        return {
          id: game.id,
          round_id: game.round_id,
          pot_type: game.pot_type,
          pot_value: game.pot_value,
          scoring_type: game.scoring_type,
          status: game.status,
          completed_at: game.completed_at,
          created_at: game.created_at,
          round: roundMap.get(game.round_id),
          payout: payout
            ? {
                buy_in: payout.buy_in,
                total_winnings: payout.total_winnings,
                net_result: payout.net_result,
                holes_won: payout.holes_won,
                holes_tied: payout.holes_tied,
                holes_lost: payout.holes_lost,
              }
            : undefined,
        };
      });
    },
    enabled: !!playerId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch player's rank in the skins leaderboard
 *
 * @param playerId - Player UUID to get rank for
 * @param minGames - Minimum games to be ranked (default 1)
 * @returns Query result with rank number or null
 *
 * @example
 * ```tsx
 * function PlayerRankBadge({ playerId }: { playerId: string }) {
 *   const { data: rank } = useSkinsRank(playerId);
 *
 *   if (!rank) return null;
 *   return <Text>Ranked #{rank}</Text>;
 * }
 * ```
 */
export function useSkinsRank(playerId: string | undefined, minGames: number = 1) {
  return useQuery({
    queryKey: skinsKeys.rank(playerId ?? ''),
    queryFn: async (): Promise<number | null> => {
      if (!playerId) return null;

      const { data, error } = await supabase.rpc('get_player_skins_rank', {
        p_player_id: playerId,
        p_min_games: minGames,
      });

      if (error) {
        // Player not ranked yet - not an error
        if (error.code === 'PGRST116') return null;
        throw createError(`Failed to fetch skins rank: ${error.message}`, 'DATABASE');
      }

      return data as number | null;
    },
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
