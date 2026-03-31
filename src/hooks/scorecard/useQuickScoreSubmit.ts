/**
 * useQuickScoreSubmit - Direct Supabase scorecard upsert for admin quick entry
 *
 * Bypasses offline/SQLite layer. Designed for admin backfill scenarios
 * where the user is expected to be online.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUser } from '@/services/supabase/client';
import { calculateScoreDifferential } from '@/utils/handicapDifferential';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import type { TeeBox, Hole } from '@/types/database.types';
import type { HandicapSource } from '@/types/database/enums';
import { getBaseHandicap, type ScorecardPlayerInfo } from '@/utils/scorecardCalculations';

interface QuickScoreSubmitInput {
  roundId: string;
  playerId: string;
  scores: Record<string, { strokes: number }>;
  totalGross: number;
  totalNet: number;
  totalPoints: number;
  player: ScorecardPlayerInfo;
  selectedTee: TeeBox | null;
  holes: Hole[];
  handicapSource: HandicapSource;
}

interface QuickScoreSubmitResult {
  success: boolean;
  scorecardId?: string;
}

export function useQuickScoreSubmit() {
  const queryClient = useQueryClient();

  return useMutation<QuickScoreSubmitResult, Error, QuickScoreSubmitInput>({
    mutationFn: async (input) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) throw new Error('Not authenticated');

      const {
        roundId, playerId, scores, totalGross, totalNet, totalPoints,
        player, selectedTee, holes, handicapSource,
      } = input;

      // Calculate handicap snapshot
      const coursePar = holes.reduce((sum, h) => sum + h.par, 0);
      const baseHandicap = getBaseHandicap(player, handicapSource);

      let dailyHandicap = baseHandicap;
      let courseRatingUsed: number | null = null;
      let slopeRatingUsed: number | null = null;

      if (handicapSource !== 'none' && selectedTee?.slopeRating && selectedTee?.courseRating && coursePar > 0) {
        const result = calculateGADailyHandicap({
          gaHandicap: baseHandicap,
          slopeRating: selectedTee.slopeRating,
          courseRating: selectedTee.courseRating,
          par: coursePar,
          gender: player.gender,
        });
        dailyHandicap = result.dailyHandicap;
        courseRatingUsed = selectedTee.courseRating;
        slopeRatingUsed = selectedTee.slopeRating;
      }

      // Calculate handicap differential
      let handicapDifferential: number | null = null;
      if (courseRatingUsed && slopeRatingUsed && totalGross > 0) {
        handicapDifferential = calculateScoreDifferential({
          adjustedGrossScore: totalGross,
          courseRating: courseRatingUsed,
          slopeRating: slopeRatingUsed,
        });
      }

      const scorecardData = {
        round_id: roundId,
        player_id: playerId,
        scores,
        total_gross: totalGross,
        total_net: totalNet,
        total_points: totalPoints,
        status: 'completed',
        submitted_at: new Date().toISOString(),
        submitted_by: currentUser.id,
        synced_at: new Date().toISOString(),
        ga_handicap_used: baseHandicap || null,
        daily_handicap_used: dailyHandicap || null,
        handicap_differential: handicapDifferential,
        course_rating_used: courseRatingUsed,
        slope_rating_used: slopeRatingUsed,
      };

      const { error, data } = await (supabase.from('scorecards') as any).upsert(
        scorecardData,
        { onConflict: 'round_id,player_id' }
      ).select('id').single();

      if (error) {
        throw new Error(`Failed to save scorecard: ${error.message}`);
      }

      return { success: true, scorecardId: data?.id };
    },
    onSuccess: (_result, input) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['round', input.roundId] });
      queryClient.invalidateQueries({ queryKey: ['scorecards', input.roundId] });
      queryClient.invalidateQueries({ queryKey: ['roundDetails'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
