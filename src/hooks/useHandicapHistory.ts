/**
 * Handicap History Hook
 *
 * TanStack Query hook for fetching a player's handicap history.
 * Returns the last 20 rounds with differentials and calculates
 * the Social Handicap Index.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { calculateHandicapIndex, getQualifyingCount } from '@/utils/handicapDifferential';
import type { HandicapSummary, HandicapRound } from '@/types';

// Query key factory for handicap-related queries
export const handicapKeys = {
  all: ['handicap'] as const,
  history: (playerId: string) => [...handicapKeys.all, 'history', playerId] as const,
};

interface ScorecardWithRound {
  id: string;
  player_id: string;
  round_id: string;
  total_gross: number;
  daily_handicap_used: number | null;
  handicap_differential: number | null;
  course_rating_used: number | null;
  slope_rating_used: number | null;
  submitted_at: string | null;
  rounds: {
    id: string;
    date: string;
    courses: {
      id: string;
      name: string;
      clubs: {
        id: string;
        name: string;
      } | null;
    } | null;
  } | null;
}

/**
 * Fetch and calculate handicap history for a player
 *
 * @param playerId - UUID of the player
 * @returns HandicapSummary with calculated index and round history
 */
async function fetchHandicapHistory(playerId: string): Promise<HandicapSummary> {
  // Fetch last 20 completed scorecards with differentials
  const { data: scorecards, error } = await supabase
    .from('scorecards')
    .select(`
      id,
      player_id,
      round_id,
      total_gross,
      daily_handicap_used,
      handicap_differential,
      course_rating_used,
      slope_rating_used,
      submitted_at,
      rounds (
        id,
        date,
        courses (
          id,
          name,
          clubs (
            id,
            name
          )
        )
      )
    `)
    .eq('player_id', playerId)
    .in('status', ['completed', 'confirmed'])
    .not('handicap_differential', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[useHandicapHistory] Failed to fetch handicap history:', error);
    throw new Error(`Failed to fetch handicap history: ${error.message}`);
  }

  // Filter out any rows with missing required data
  const validScorecards = (scorecards as ScorecardWithRound[]).filter(
    (sc) =>
      sc.handicap_differential !== null &&
      sc.daily_handicap_used !== null &&
      sc.course_rating_used !== null &&
      sc.slope_rating_used !== null
  );

  if (validScorecards.length === 0) {
    return {
      handicapIndex: null,
      totalRounds: 0,
      qualifyingRoundsCount: 0,
      rounds: [],
      lastUpdated: null,
    };
  }

  // Extract differentials for index calculation
  const differentials = validScorecards.map((sc) => sc.handicap_differential as number);

  // Calculate handicap index
  const handicapIndex = calculateHandicapIndex(differentials);
  const qualifyingCount = getQualifyingCount(differentials.length);

  // Sort differentials to determine which rounds are qualifying
  const sortedDifferentials = [...differentials].sort((a, b) => a - b);
  const qualifyingThreshold = sortedDifferentials[qualifyingCount - 1] ?? Infinity;

  // Track how many of each differential value we've marked as qualifying
  // (handles ties correctly)
  const qualifyingUsed = new Map<number, number>();

  // Transform to HandicapRound array
  const rounds: HandicapRound[] = validScorecards.map((sc, index) => {
    const differential = sc.handicap_differential as number;

    // Determine if this round is qualifying
    // A round qualifies if its differential is <= the threshold
    // and we haven't already used all qualifying slots for this differential value
    let isQualifying = false;
    if (differential <= qualifyingThreshold) {
      const usedCount = qualifyingUsed.get(differential) || 0;
      const availableAtThisDiff = differentials.filter((d) => d === differential).length;
      const totalQualifyingAtThisDiff = sortedDifferentials.filter(
        (d, i) => i < qualifyingCount && d === differential
      ).length;

      if (usedCount < totalQualifyingAtThisDiff) {
        isQualifying = true;
        qualifyingUsed.set(differential, usedCount + 1);
      }
    }

    // Get course and club names with fallbacks
    const courseName = sc.rounds?.courses?.name ?? 'Unknown Course';
    const clubName = sc.rounds?.courses?.clubs?.name ?? '';

    return {
      scorecardId: sc.id,
      roundId: sc.round_id,
      roundDate: sc.rounds?.date ?? sc.submitted_at ?? '',
      courseName,
      clubName,
      totalGross: sc.total_gross,
      dailyHandicapUsed: sc.daily_handicap_used as number,
      handicapDifferential: differential,
      courseRatingUsed: sc.course_rating_used as number,
      slopeRatingUsed: sc.slope_rating_used as number,
      isQualifying,
      roundNumber: index + 1, // 1 = most recent
    };
  });

  // Find last updated timestamp
  const lastUpdated = validScorecards[0]?.submitted_at ?? null;

  return {
    handicapIndex,
    totalRounds: validScorecards.length,
    qualifyingRoundsCount: qualifyingCount,
    rounds,
    lastUpdated,
  };
}

/**
 * Hook to fetch a player's handicap history
 *
 * @param playerId - UUID of the player (typically current user)
 * @returns TanStack Query result with HandicapSummary
 *
 * @example
 * const { user } = useAuth();
 * const { data: summary, isLoading, refetch } = useHandicapHistory(user?.id);
 *
 * if (summary?.handicapIndex !== null) {
 *   console.log('Social Handicap Index:', summary.handicapIndex);
 * }
 */
export function useHandicapHistory(playerId: string | undefined) {
  return useQuery({
    queryKey: handicapKeys.history(playerId ?? ''),
    queryFn: () => fetchHandicapHistory(playerId!),
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
