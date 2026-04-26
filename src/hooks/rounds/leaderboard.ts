/**
 * useRoundLeaderboard - Format-specific leaderboard for individual rounds
 *
 * Returns RoundLeaderboardEntry[] with format-specific data:
 * - Stableford: totalPoints
 * - Stroke Play: grossScore, netScore
 * - Match Play: matchResult, holesUpDown, opponent
 *
 * Features:
 * - Fetches round_results for roundId
 * - Joins player/team data
 * - Formats based on round.game_type
 * - Includes round metadata (game_type, is_team_round, team_format)
 * - Auto-refresh support
 * - Type-safe format-specific data
 */

import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { leaderboardKeys } from '../queryKeys';
import { supabase } from '@/services/supabase/client';
import {
  transformToLeaderboardEntry,
  sortLeaderboardEntries,
} from '@/utils/roundLeaderboardFormatters';
import type { GameType, TeamFormat } from '@/types/database.types';
import type { RoundResultRow } from '@/utils/roundLeaderboardFormatters';

// Re-export types and type guards from utility for backward compatibility
export type {
  StablefordScoreData,
  StrokeScoreData,
  ParScoreData,
  MatchPlayScoreData,
  TeamScoreData,
  FormatSpecificScoreData,
  PlayerLeaderboardEntry,
  TeamLeaderboardEntry,
  RoundLeaderboardEntry,
} from '@/utils/roundLeaderboardFormatters';

export {
  isPlayerEntry,
  isTeamEntry,
  isStablefordScore,
  isStrokeScore,
  isParScore,
  isMatchPlayScore,
  isTeamScore,
} from '@/utils/roundLeaderboardFormatters';

// =====================================================
// TYPES
// =====================================================

/** Round metadata included in the response */
export interface RoundMetadata {
  gameType: GameType;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  roundId: string;
  roundNumber: number;
  courseName?: string;
  date?: string;
  status: string;
}

/** Complete response from the hook */
export interface RoundLeaderboardResponse {
  /**
   * All entries (teams + individuals) sorted by position. Kept for callers
   * that don't care about the split. Prefer `teamEntries` / `individualEntries`
   * when rendering the per-round view so team rows and individual rows can
   * be displayed in separate sub-tables.
   */
  entries: import('@/utils/roundLeaderboardFormatters').RoundLeaderboardEntry[];
  /** Team rows (`is_team_result=true`) for this round, sorted by position. */
  teamEntries: import('@/utils/roundLeaderboardFormatters').RoundLeaderboardEntry[];
  /** Individual rows (`is_team_result=false`) for this round, sorted by position. */
  individualEntries: import('@/utils/roundLeaderboardFormatters').RoundLeaderboardEntry[];
  metadata: RoundMetadata;
}

// =====================================================
// DATABASE TYPES
// =====================================================

/** Round info from joined query */
interface RoundInfo {
  id: string;
  round_number: number;
  game_type: GameType;
  is_team_round: boolean;
  team_format: TeamFormat | null;
  date: string | null;
  status: string;
  courses: {
    name: string;
  } | null;
}

// =====================================================
// FETCH FUNCTION
// =====================================================

/**
 * Fetch round leaderboard data from Supabase
 */
async function fetchRoundLeaderboard(roundId: string): Promise<RoundLeaderboardResponse> {
  // First, get the round metadata
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select(
      `
      id,
      round_number,
      game_type,
      is_team_round,
      team_format,
      date,
      status,
      courses (
        name
      )
    `
    )
    .eq('id', roundId)
    .single();

  if (roundError) {
    throw new Error(`Failed to fetch round: ${roundError.message}`);
  }

  if (!round) {
    throw new Error('Round not found');
  }

  const typedRound = round as unknown as RoundInfo;

  // Get round results with player/team joins
  const { data: results, error: resultsError } = await supabase
    .from('round_results')
    .select(
      `
      id,
      round_id,
      player_id,
      team_id,
      raw_score,
      raw_result_data,
      position,
      competition_points,
      is_team_result,
      players!player_id (
        id,
        name,
        handicap
      ),
      teams!team_id (
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
      )
    `
    )
    .eq('round_id', roundId)
    .order('position', { ascending: true, nullsFirst: false });

  // Fetch scorecards separately to get bypass status
  const { data: scorecards } = await supabase
    .from('scorecards')
    .select('player_id, bypassed')
    .eq('round_id', roundId);

  // Build a map of player_id -> bypassed status
  const bypassMap = new Map<string, boolean>();
  if (scorecards) {
    for (const sc of scorecards as { player_id: string | null; bypassed: boolean | null }[]) {
      if (sc.player_id) {
        bypassMap.set(sc.player_id, sc.bypassed ?? false);
      }
    }
  }

  if (resultsError) {
    throw new Error(`Failed to fetch round results: ${resultsError.message}`);
  }

  const typedResults = (results || []) as unknown as RoundResultRow[];

  // Transform results to leaderboard entries
  const entries = typedResults.map((result) =>
    transformToLeaderboardEntry(
      result,
      typedRound.game_type,
      typedRound.is_team_round,
      typedRound.team_format,
      typedResults,
      bypassMap
    )
  );

  // Sort by position. Then split into team / individual subsets — each subset
  // already has its own 1..N position numbering on disk (finalizeRound and
  // finalizeTeamRound write independently), so callers can render each as a
  // self-contained table.
  const sortedEntries = sortLeaderboardEntries(entries);
  const teamEntries = sortedEntries.filter((e) => e.isTeamResult);
  const individualEntries = sortedEntries.filter((e) => !e.isTeamResult);

  // Build metadata
  const metadata: RoundMetadata = {
    gameType: typedRound.game_type,
    isTeamRound: typedRound.is_team_round,
    teamFormat: typedRound.team_format,
    roundId: typedRound.id,
    roundNumber: typedRound.round_number,
    courseName: typedRound.courses?.name,
    date: typedRound.date ?? undefined,
    status: typedRound.status,
  };

  return {
    entries: sortedEntries,
    teamEntries,
    individualEntries,
    metadata,
  };
}

// =====================================================
// HOOK
// =====================================================

export interface UseRoundLeaderboardOptions {
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean;
  /** Auto-refresh interval in ms (default: 30000) */
  refetchInterval?: number;
  /** Only fetch when this is true (default: true if roundId exists) */
  enabled?: boolean;
}

/**
 * Hook to fetch format-specific leaderboard for a round
 *
 * @param roundId - The ID of the round
 * @param options - Optional configuration
 * @returns Query result with format-specific leaderboard data
 *
 * @example
 * // Basic usage
 * const { data, isLoading, error } = useRoundLeaderboard(roundId);
 *
 * // Access entries and metadata
 * if (data) {
 *   console.log('Game type:', data.metadata.gameType);
 *   console.log('Entries:', data.entries);
 *
 *   // Type-safe format-specific data
 *   data.entries.forEach(entry => {
 *     if (entry.scoreData.type === 'stableford') {
 *       console.log('Points:', entry.scoreData.totalPoints);
 *     } else if (entry.scoreData.type === 'stroke') {
 *       console.log('Gross:', entry.scoreData.grossScore);
 *       console.log('Net:', entry.scoreData.netScore);
 *     } else if (entry.scoreData.type === 'match-play') {
 *       console.log('Result:', entry.scoreData.matchResult);
 *       console.log('Margin:', entry.scoreData.holesUpDown);
 *     }
 *   });
 * }
 */
export function useRoundLeaderboard(roundId: string, options?: UseRoundLeaderboardOptions) {
  const { autoRefresh = true, refetchInterval = 30000, enabled = !!roundId } = options || {};

  return useQuery({
    queryKey: leaderboardKeys.round(roundId),
    queryFn: () => fetchRoundLeaderboard(roundId),
    enabled,
    staleTime: CACHE_TIMES.REALTIME, // Consider data stale after 10 seconds
    gcTime: GC_TIMES.SHORT, // Keep in cache for 5 minutes
    refetchInterval: autoRefresh ? refetchInterval : false,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
