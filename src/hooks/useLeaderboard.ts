/**
 * useLeaderboard - Hook for fetching competition leaderboard data
 *
 * This is a legacy hook that wraps useCompetitionLeaderboard for backward compatibility.
 * For new code, prefer using useCompetitionLeaderboard directly for access to:
 * - Team support
 * - Position and tie tracking
 * - Round-by-round points breakdown
 *
 * @deprecated Use useCompetitionLeaderboard for new features
 */

import {
  useCompetitionLeaderboard,
  type CompetitionLeaderboardEntry,
} from './useCompetitionLeaderboard';

/** Leaderboard entry returned by the hook (legacy format) */
export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  handicap: number;
  totalPoints: number;
  roundsPlayed: number;
}

/**
 * Transform CompetitionLeaderboardEntry to legacy LeaderboardEntry format
 */
function transformToLegacyFormat(entry: CompetitionLeaderboardEntry): LeaderboardEntry {
  return {
    playerId: entry.participantId,
    playerName: entry.participantName,
    handicap: entry.handicap ?? 0,
    totalPoints: entry.totalPoints,
    roundsPlayed: entry.roundsPlayed,
  };
}

/**
 * Hook to fetch and manage leaderboard data
 *
 * @param competitionId - The ID of the competition
 * @param options - Optional configuration
 * @returns Query result with leaderboard data
 *
 * @deprecated Use useCompetitionLeaderboard for new features
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

  const { data, ...rest } = useCompetitionLeaderboard(competitionId, {
    filter: 'individuals', // Legacy hook only supported individuals
    autoRefresh,
    refetchInterval,
  });

  return {
    data: data?.map(transformToLegacyFormat),
    ...rest,
  };
}
