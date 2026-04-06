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
import { finalizeRound } from '@/services/rounds/roundResultsService';
import { scorecardKeys } from '@/hooks/queryKeys';
import type { TeeBox, Hole, Scorecard, PointSystemConfig, GameType } from '@/types/database.types';
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
        daily_handicap_used: dailyHandicap != null ? Math.round(dailyHandicap) : null,
        handicap_differential: handicapDifferential,
        course_rating_used: courseRatingUsed,
        slope_rating_used: slopeRatingUsed,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      const { error, data } = await (supabase.from('scorecards') as any).upsert(
        scorecardData,
        { onConflict: 'round_id,player_id' }
      ).select('id').single();

      if (error) {
        throw new Error(`Failed to save scorecard: ${error.message}`);
      }

      // Update round status based on scorecard completion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      const { data: roundRow } = await (supabase.from('rounds') as any)
        .select('status, competition_id')
        .eq('id', roundId)
        .single();

      if (roundRow) {
        // If round is still upcoming, move to in-progress
        if (roundRow.status === 'upcoming') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('rounds') as any)
            .update({ status: 'in-progress' })
            .eq('id', roundId);
        }

        // Check if all players now have completed scorecards
        let playerCount: number | null = null;

        if (roundRow.competition_id) {
          const { count } = await supabase
            .from('competition_players')
            .select('*', { count: 'exact', head: true })
            .eq('competition_id', roundRow.competition_id)
            .eq('status', 'accepted');
          playerCount = count;
        } else {
          // Standalone round: count players from round_players
          const { count } = await supabase
            .from('round_players')
            .select('*', { count: 'exact', head: true })
            .eq('round_id', roundId);
          playerCount = count;
        }

        if (playerCount) {
          const { count: completedCount } = await supabase
            .from('scorecards')
            .select('*', { count: 'exact', head: true })
            .eq('round_id', roundId)
            .eq('status', 'completed');

          if (completedCount && completedCount >= playerCount) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('rounds') as any)
              .update({ status: 'completed' })
              .eq('id', roundId);
          }
        }
      }

      // Finalize round results so the leaderboard picks up the scores
      try {
        if (roundRow?.competition_id) {
          const { data: roundData } = await supabase
            .from('rounds')
            .select('game_type')
            .eq('id', roundId)
            .single() as unknown as { data: { game_type: string } | null };

          const { data: competition } = await supabase
            .from('competitions')
            .select('point_system')
            .eq('id', roundRow.competition_id)
            .single() as unknown as { data: { point_system: PointSystemConfig | null } | null };

          const { data: completedScorecards } = await supabase
            .from('scorecards')
            .select('*')
            .eq('round_id', roundId)
            .eq('status', 'completed') as unknown as { data: Scorecard[] | null };

          if (roundData && completedScorecards?.length) {
            const pointSystem: PointSystemConfig = competition?.point_system || {
              type: 'position',
              rules: { '1': 10, '2': 8, '3': 6, '4': 5, '5': 4, '6': 3, '7': 2, '8': 1, 'default': 1 },
            };
            await finalizeRound(roundId, completedScorecards, roundData.game_type as GameType, pointSystem);
          }
        }
      } catch {
        // Non-critical: scorecard is already saved, finalization can be retried
      }

      return { success: true, scorecardId: data?.id };
    },
    onSuccess: (_result, input) => {
      // Invalidate relevant caches using correct query key formats
      queryClient.invalidateQueries({ queryKey: ['round', input.roundId] });
      queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId: input.roundId }) });
      queryClient.invalidateQueries({ queryKey: ['roundDetails'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}
