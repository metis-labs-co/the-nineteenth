/**
 * useLeaderboard - Hook for fetching competition leaderboard data
 *
 * Features:
 * - Fetches leaderboard entries from Supabase
 * - Auto-refreshes every 30 seconds (configurable)
 * - Calculates Stableford points from scorecards
 * - Handles loading, error, and empty states
 * - Optimistic cache updates
 */

import { useQuery } from '@tanstack/react-query';
import { leaderboardKeys } from './queryKeys';
import { supabase } from '@/services/supabase/client';

/** Leaderboard entry returned by the hook */
export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  handicap: number;
  totalPoints: number;
  roundsPlayed: number;
}

/** Player info from joined query */
interface PlayerInfo {
  name: string;
  handicap: number | null;
}

/** Scorecard row from Supabase with player join */
interface ScorecardWithPlayer {
  player_id: string;
  total_points: number;
  status: string;
  players: PlayerInfo | null;
}

/** Competition player row from Supabase with player join */
interface CompetitionPlayerWithPlayer {
  player_id: string;
  players: PlayerInfo | null;
}

/** Round row from Supabase */
interface RoundRow {
  id: string;
}

/**
 * Fetch leaderboard data for a competition
 *
 * This query aggregates scorecard data to calculate:
 * - Total Stableford points per player
 * - Number of rounds played
 * - Player handicap from the players table
 */
async function fetchLeaderboard(competitionId: string): Promise<LeaderboardEntry[]> {
  // First, get all rounds for this competition
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('id')
    .eq('competition_id', competitionId);

  if (roundsError) {
    throw new Error(`Failed to fetch rounds: ${roundsError.message}`);
  }

  if (!rounds || rounds.length === 0) {
    return [];
  }

  const roundIds = (rounds as RoundRow[]).map((r) => r.id);

  // Get all scorecards for these rounds with player info
  // Note: Use !player_id to specify which FK to use (scorecards has both player_id and submitted_by referencing players)
  const { data: scorecards, error: scorecardsError } = await supabase
    .from('scorecards')
    .select(`
      player_id,
      total_points,
      status,
      players!player_id (
        name,
        handicap
      )
    `)
    .in('round_id', roundIds)
    .eq('status', 'completed');

  if (scorecardsError) {
    throw new Error(`Failed to fetch scorecards: ${scorecardsError.message}`);
  }

  if (!scorecards || scorecards.length === 0) {
    // Return players with 0 points if no scorecards yet
    const { data: competitionPlayers, error: playersError } = await supabase
      .from('competition_players')
      .select(`
        player_id,
        players!player_id (
          name,
          handicap
        )
      `)
      .eq('competition_id', competitionId)
      .eq('status', 'accepted');

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    if (!competitionPlayers) {
      return [];
    }

    return (competitionPlayers as unknown as CompetitionPlayerWithPlayer[]).map((cp) => ({
      playerId: cp.player_id,
      playerName: cp.players?.name || 'Unknown',
      handicap: cp.players?.handicap || 0,
      totalPoints: 0,
      roundsPlayed: 0,
    }));
  }

  // Aggregate scores by player
  const playerScores = new Map<
    string,
    {
      playerName: string;
      handicap: number;
      totalPoints: number;
      roundsPlayed: number;
    }
  >();

  const typedScorecards = scorecards as unknown as ScorecardWithPlayer[];

  for (const scorecard of typedScorecards) {
    const playerId = scorecard.player_id;
    const playerInfo = scorecard.players;
    const points = scorecard.total_points || 0;

    if (!playerScores.has(playerId)) {
      playerScores.set(playerId, {
        playerName: playerInfo?.name || 'Unknown',
        handicap: playerInfo?.handicap || 0,
        totalPoints: 0,
        roundsPlayed: 0,
      });
    }

    const current = playerScores.get(playerId)!;
    current.totalPoints += points;
    current.roundsPlayed += 1;
  }

  // Convert to array
  return Array.from(playerScores.entries()).map(([playerId, data]) => ({
    playerId,
    ...data,
  }));
}

/**
 * Hook to fetch and manage leaderboard data
 *
 * @param competitionId - The ID of the competition
 * @param options - Optional configuration
 * @returns Query result with leaderboard data
 *
 * @example
 * const { data: leaderboard, isLoading, refetch } = useLeaderboard(competitionId);
 */
export function useLeaderboard(
  competitionId: string,
  options?: {
    /** Enable auto-refresh (default: true) */
    autoRefresh?: boolean;
    /** Auto-refresh interval in ms (default: 30000) */
    refetchInterval?: number;
  }
) {
  const { autoRefresh = true, refetchInterval = 30000 } = options || {};

  return useQuery({
    queryKey: leaderboardKeys.competition(competitionId),
    queryFn: () => fetchLeaderboard(competitionId),
    enabled: !!competitionId,
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: autoRefresh ? refetchInterval : false,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

/**
 * Hook to fetch leaderboard for a specific round
 *
 * @param roundId - The ID of the round
 * @returns Query result with leaderboard data for the round
 */
export function useRoundLeaderboard(roundId: string) {
  return useQuery({
    queryKey: leaderboardKeys.round(roundId),
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      // Note: Use !player_id to specify which FK to use (scorecards has both player_id and submitted_by referencing players)
      const { data: scorecards, error } = await supabase
        .from('scorecards')
        .select(`
          player_id,
          total_points,
          status,
          players!player_id (
            name,
            handicap
          )
        `)
        .eq('round_id', roundId)
        .eq('status', 'completed');

      if (error) {
        throw new Error(`Failed to fetch round leaderboard: ${error.message}`);
      }

      if (!scorecards || scorecards.length === 0) {
        return [];
      }

      const typedScorecards = scorecards as unknown as ScorecardWithPlayer[];

      return typedScorecards.map((scorecard) => ({
        playerId: scorecard.player_id,
        playerName: scorecard.players?.name || 'Unknown',
        handicap: scorecard.players?.handicap || 0,
        totalPoints: scorecard.total_points || 0,
        roundsPlayed: 1,
      }));
    },
    enabled: !!roundId,
    staleTime: 10000,
    gcTime: 5 * 60 * 1000,
  });
}
