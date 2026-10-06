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
import { fetchPlayersByIds, fetchPlayerListByIds } from '@/services/api/players';
import { skinsKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import {
  calculateTotalPot,
  calculateHoleValue,
  calculateCurrentCarryover,
} from '@/utils/skins';
import { createError } from '@/services/errors';
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
// LOCAL DB ROW TYPES
// These bridge the gap between Supabase auto-generated types
// (which may be missing newer columns) and the application types.
// =====================================================

/** Row shape returned from skins_games table queries */
type SkinsGameRow = SkinsGame;

/** Row shape returned from skins_results table queries */
interface SkinsResultRow {
  id: string;
  skins_game_id: string;
  hole_number: number;
  winner_id: string | null;
  team_winner_id: string | null;
  is_carryover: boolean;
  hole_scores: unknown;
  hole_pot_value: number;
  carryover_to_next: number;
  payout_amount: number;
  calculated_at: string;
}

/** Row shape returned from skins_payouts table queries */
interface SkinsPayoutRow {
  id: string;
  skins_game_id: string;
  player_id: string | null;
  team_id: string | null;
  is_team_payout: boolean;
  buy_in: number;
  total_winnings: number;
  net_result: number;
  holes_won: number;
  holes_tied: number;
  holes_lost: number;
  calculated_at: string;
}

/** Row shape for player queries */
interface PlayerRow {
  id: string;
  name: string;
  handicap: number | null;
}

/** Row shape for team with members */
interface TeamWithMembersRow {
  id: string;
  name: string;
  team_members?: {
    player_id: string;
    players: PlayerRow | null;
  }[];
}

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

      const { data: rawGame, error } = await supabase
        .from('skins_games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw createError(`Failed to fetch skins game: ${error.message}`, 'DATABASE');
      }

      const game = rawGame as unknown as SkinsGameRow | null;
      if (!game) return null;

      // Check if this is a team skins game
      if (game.is_team_skins) {
        let teamParticipants: SkinsTeamParticipant[] = [];

        // Source 1: Try using participant_team_ids if available
        if (game.participant_team_ids?.length) {
          const { data: rawTeams, error: teamsError } = await supabase
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

          const teams = (rawTeams ?? []) as unknown as TeamWithMembersRow[];

          teamParticipants = teams.map((team) => ({
            id: team.id,
            name: team.name,
            members: (team.team_members ?? []).map((tm) => ({
              id: tm.player_id,
              name: tm.players?.name ?? 'Unknown',
              handicap: tm.players?.handicap ?? null,
            })),
          }));
        }

        // Source 2: Fallback to round's team_config for standalone rounds
        if (teamParticipants.length === 0 && game.round_id) {
          const { data: rawRound } = await supabase
            .from('rounds')
            .select('team_config')
            .eq('id', game.round_id)
            .single();

          const round = rawRound as unknown as { team_config?: { teams?: { id: string; name: string; memberIds: string[] }[] } } | null;
          const teamConfig = round?.team_config;

          if (teamConfig?.teams && teamConfig.teams.length > 0) {
            // Get player details for members
            const allMemberIds = teamConfig.teams.flatMap(t => t.memberIds);
            const playerMap = await fetchPlayersByIds(allMemberIds);

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
      const participants: SkinsParticipant[] = await fetchPlayerListByIds(
        game.participant_ids
      );

      return {
        ...game,
        participants,
      } as SkinsGameWithParticipants;
    },
    enabled: !!gameId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
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

      const { data: rawGames, error } = await supabase
        .from('skins_games')
        .select('*')
        .eq('round_id', roundId)
        .order('created_at', { ascending: false });

      if (error) {
        throw createError(`Failed to fetch skins games: ${error.message}`, 'DATABASE');
      }

      const games = (rawGames ?? []) as unknown as SkinsGameRow[];
      if (games.length === 0) return [];

      // Collect all unique participant IDs
      const allParticipantIds = [...new Set(games.flatMap((g) => g.participant_ids))];

      // Fetch all participants in one query
      const playerMap = await fetchPlayersByIds(allParticipantIds);

      return games.map((game) => ({
        ...game,
        participants: game.participant_ids
          .map((id: string) => playerMap.get(id))
          .filter((p): p is SkinsParticipant => p !== undefined),
      })) as SkinsGameWithParticipants[];
    },
    enabled: !!roundId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
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
      if (!gameId) return [];

      const { data: rawResults, error } = await supabase
        .from('skins_results')
        .select('*')
        .eq('skins_game_id', gameId)
        .order('hole_number', { ascending: true });

      const results = (rawResults ?? []) as unknown as SkinsResultRow[];

      if (error) {
        throw createError(`Failed to fetch skins results: ${error.message}`, 'DATABASE');
      }

      if (results.length === 0) return [];

      // Check if any results have team winners (team skins)
      const hasTeamWinners = results.some((r) => r.team_winner_id);

      if (hasTeamWinners) {
        // Team skins - fetch team winner details
        const teamWinnerIds = [...new Set(results.map((r) => r.team_winner_id).filter(Boolean))] as string[];

        let teamWinnerMap = new Map<string, SkinsTeamWinner>();
        if (teamWinnerIds.length > 0) {
          // First try to fetch from teams table (competition teams)
          const { data: rawTeams } = await supabase
            .from('teams')
            .select('id, name')
            .in('id', teamWinnerIds);

          const teams = (rawTeams ?? []) as unknown as { id: string; name: string }[];

          if (teams.length > 0) {
            teamWinnerMap = new Map(teams.map((t) => [t.id, { id: t.id, name: t.name, members: [] }]));
          }

          // If not all teams found in teams table, check round.team_config (standalone rounds)
          if (teamWinnerMap.size < teamWinnerIds.length) {
            // Fetch the skins game to get round_id
            const { data: rawSkinsGame } = await supabase
              .from('skins_games')
              .select('round_id')
              .eq('id', gameId)
              .single();

            const skinsGame = rawSkinsGame as unknown as { round_id: string } | null;

            if (skinsGame?.round_id) {
              // Fetch the round's team_config
              const { data: rawRound } = await supabase
                .from('rounds')
                .select('team_config')
                .eq('id', skinsGame.round_id)
                .single();

              const round = rawRound as unknown as { team_config?: { teams?: { id: string; name: string }[] } } | null;
              const teamConfig = round?.team_config;
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
      const winnerIds = [...new Set(results.map((r) => r.winner_id).filter(Boolean))] as string[];

      let winnerMap = new Map<string, SkinsWinner>();
      if (winnerIds.length > 0) {
        const { data: rawWinners } = await supabase
          .from('players')
          .select('id, name')
          .in('id', winnerIds);

        const winners = (rawWinners ?? []) as unknown as { id: string; name: string }[];

        if (winners.length > 0) {
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
    gcTime: GC_TIMES.SHORT,
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

      const { data: rawPayouts, error } = await supabase
        .from('skins_payouts')
        .select('*')
        .eq('skins_game_id', gameId)
        .order('net_result', { ascending: false });

      if (error) {
        throw createError(`Failed to fetch skins payouts: ${error.message}`, 'DATABASE');
      }

      const payouts = (rawPayouts ?? []) as unknown as SkinsPayoutRow[];
      if (payouts.length === 0) return [];

      // Get player details
      const playerIds = payouts.map((p) => p.player_id).filter(Boolean) as string[];
      const { data: rawPlayers } = await supabase
        .from('players')
        .select('id, name')
        .in('id', playerIds);

      const players = (rawPlayers ?? []) as unknown as { id: string; name: string }[];

      const playerMap = new Map<string, SkinsPayoutPlayer>(
        players.map((p) => [p.id, { id: p.id, name: p.name }])
      );

      return payouts.map((payout) => ({
        ...payout,
        player: payout.player_id
          ? playerMap.get(payout.player_id) ?? { id: payout.player_id, name: 'Unknown' }
          : null,
      })) as SkinsPayoutWithPlayer[];
    },
    enabled: !!gameId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
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

  // Compute summary directly using useMemo - this reacts to changes in dependent data
  const summary = useMemo((): SkinsGameSummary | null => {
    if (!game) return null;

    const results = resultsQuery.data ?? [];
    const payouts = payoutsQuery.data ?? [];

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
  }, [game, resultsQuery.data, payoutsQuery.data]);

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
