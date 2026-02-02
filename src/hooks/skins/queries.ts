/**
 * Skins Hooks - Query Hooks
 *
 * TanStack Query hooks for fetching skins game data.
 *
 * Hooks:
 * - useSkinsGame: Fetch a single skins game with participants
 * - useSkinsGamesByRound: Fetch all skins games for a round
 * - useSkinsResults: Fetch hole-by-hole results for a game
 * - useSkinsPayouts: Fetch final payouts for a game
 * - useSkinsSummary: Fetch combined summary with calculated metrics
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { skinsKeys } from '@/hooks/queryKeys';
import {
  calculateTotalPot,
  calculateHoleValue,
  calculateCurrentCarryover,
} from '@/utils/skinsCalculations';
import { createError } from './helpers';
import type {
  SkinsGame,
  SkinsGameWithParticipants,
  SkinsGameWithTeamParticipants,
  SkinsResult,
  SkinsResultWithWinner,
  SkinsResultWithTeamWinner,
  SkinsPayoutWithPlayer,
  SkinsGameSummary,
  SkinsParticipant,
  SkinsTeamParticipant,
  SkinsWinner,
  SkinsTeamWinner,
  SkinsPayoutPlayer,
} from '@/types/database/skins.types';

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Query hook to fetch a single skins game with participant details
 *
 * @param gameId - Skins game UUID
 * @returns Query result with SkinsGameWithParticipants
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
