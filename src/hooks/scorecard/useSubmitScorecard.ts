/**
 * Submit Scorecard Mutation Hook
 *
 * Handles submitting completed scorecards with offline support.
 * Saves locally first, then syncs to server when online.
 * Integrates with the achievement system to check and award achievements on submit.
 *
 * Note: Uses getIsOnline from sync service for consistency with sync logic.
 * For React components that need reactive online status, use
 * useOnlineStatus from '@/hooks/useOnlineStatus' instead.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveScorecard } from '@/services/offline/database';
import { queueScorecardSync, getIsOnline, manualSync } from '@/services/offline/sync';
import { scorecardKeys } from './useScorecards';
import { useAuth } from '@/hooks/useAuth';
import { useCheckAchievements } from '@/hooks/achievements/useCheckAchievements';
import { useAchievementToast } from '@/context/AchievementToastContext';
import { isSingleBallScore } from '@/types/database/base';
import type { Scorecard, Hole, GameType } from '@/types';
import type { AchievementEventData } from '@/types/database/achievement.types';

interface SubmitScorecardInput {
  scorecards: Scorecard[];
  roundId: string;
  /** Course holes for calculating score statistics (birdies, eagles, pars) */
  holes?: Hole[];
  /** Game type for achievement event data */
  gameType?: GameType;
  /** Course ID for achievement event data */
  courseId?: string;
  /** Whether this is a competition round */
  isCompetition?: boolean;
}

interface SubmitScorecardResult {
  success: boolean;
  syncedImmediately: boolean;
  scorecardIds: string[];
}

// =====================================================
// SCORE CALCULATION HELPERS
// =====================================================

/**
 * Calculate score statistics from a scorecard for achievement tracking
 * Counts birdies, eagles, pars, and other score types
 */
function calculateScoreStats(
  scorecard: Scorecard,
  holes: Hole[]
): {
  birdies: number;
  eagles: number;
  pars: number;
  bogeys: number;
  doubleBogeys: number;
  albatross: number;
  holeInOne: boolean;
  totalGross: number;
  holesPlayed: number;
} {
  let birdies = 0;
  let eagles = 0;
  let pars = 0;
  let bogeys = 0;
  let doubleBogeys = 0;
  let albatross = 0;
  let holeInOne = false;
  let totalGross = 0;
  let holesPlayed = 0;

  for (const hole of holes) {
    const holeScore = scorecard.scores[hole.number];
    if (!holeScore) continue;

    // Get strokes based on score type (single ball or multi-ball)
    const strokes = isSingleBallScore(holeScore)
      ? holeScore.strokes
      : holeScore.balls?.[0]?.strokes;

    if (!strokes || strokes === 0) continue;

    holesPlayed++;
    totalGross += strokes;
    const diff = strokes - hole.par;

    // Check for hole-in-one
    if (strokes === 1) {
      holeInOne = true;
    }

    // Categorize by score type
    if (diff <= -3) {
      albatross++;
    } else if (diff === -2) {
      eagles++;
    } else if (diff === -1) {
      birdies++;
    } else if (diff === 0) {
      pars++;
    } else if (diff === 1) {
      bogeys++;
    } else {
      doubleBogeys++;
    }
  }

  return {
    birdies,
    eagles,
    pars,
    bogeys,
    doubleBogeys,
    albatross,
    holeInOne,
    totalGross,
    holesPlayed,
  };
}

/**
 * Submit scorecards for a round
 *
 * 1. Saves to local SQLite database
 * 2. Queues for sync to server
 * 3. Attempts immediate sync if online
 * 4. Checks for achievements after successful submission
 */
export function useSubmitScorecards() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const playerId = user?.id ?? '';
  const { checkAndAward, isReady: isAchievementReady } = useCheckAchievements(playerId);
  const { showMultipleToasts } = useAchievementToast();

  return useMutation<SubmitScorecardResult, Error, SubmitScorecardInput>({
    mutationFn: async ({
      scorecards,
      roundId: _roundId,
      holes: _holes,
      gameType: _gameType,
      courseId: _courseId,
      isCompetition: _isCompetition,
    }): Promise<SubmitScorecardResult> => {
      const now = new Date();
      const scorecardIds: string[] = [];

      // Update and save each scorecard
      for (const scorecard of scorecards) {
        const updatedScorecard: Scorecard = {
          ...scorecard,
          status: 'completed',
          submittedAt: now,
          updatedAt: now,
        };

        // Save to local SQLite
        await saveScorecard(updatedScorecard);

        // Queue for sync
        await queueScorecardSync(updatedScorecard, 'update');

        scorecardIds.push(scorecard.id);
      }

      // Try to sync immediately if online
      let syncedImmediately = false;
      if (getIsOnline()) {
        try {
          await manualSync();
          syncedImmediately = true;
        } catch (error) {
          console.warn('[useSubmitScorecards] Immediate sync failed:', error);
        }
      }

      return {
        success: true,
        syncedImmediately,
        scorecardIds,
      };
    },

    onSuccess: async (data, variables) => {
      // Invalidate scorecard queries to refetch updated data
      queryClient.invalidateQueries({
        queryKey: scorecardKeys.list({ roundId: variables.roundId }),
      });

      // Check for achievements if we have the required data
      if (!playerId || !isAchievementReady) {
        console.log('[useSubmitScorecards] Skipping achievement check - not ready');
        return;
      }

      const { scorecards, holes, gameType, courseId, isCompetition, roundId } = variables;

      // Find the current user's scorecard
      const userScorecard = scorecards.find((sc) => sc.playerId === playerId);
      if (!userScorecard) {
        console.log('[useSubmitScorecards] No scorecard for current user');
        return;
      }

      try {
        // Calculate score statistics for achievements
        let scoreStats = {
          birdies: 0,
          eagles: 0,
          pars: 0,
          bogeys: 0,
          doubleBogeys: 0,
          albatross: 0,
          holeInOne: false,
          totalGross: userScorecard.totalGross || 0,
          holesPlayed: 18,
        };

        if (holes && holes.length > 0) {
          scoreStats = calculateScoreStats(userScorecard, holes);
        }

        // Build achievement event data
        const eventData: AchievementEventData = {
          round_id: roundId,
          game_type: gameType || 'stableford',
          course_id: courseId,
          is_competition: isCompetition ?? false,
          hole_count: scoreStats.holesPlayed,
          gross_score: scoreStats.totalGross,
          // Score type counts
          birdies: scoreStats.birdies,
          eagles: scoreStats.eagles,
          pars: scoreStats.pars,
          bogeys: scoreStats.bogeys,
          double_bogeys: scoreStats.doubleBogeys,
          hole_in_one: scoreStats.holeInOne,
        };

        console.log('[useSubmitScorecards] Checking achievements with data:', eventData);

        // Check and award achievements
        const result = await checkAndAward('scorecard_submitted', eventData);

        if (result.hasNewRewards) {
          console.log('[useSubmitScorecards] New achievements:', result.newAchievements.length);
          console.log('[useSubmitScorecards] New cosmetics:', result.newCosmetics.length);

          // Show achievement toasts
          showMultipleToasts(result.newAchievements, result.newCosmetics);
        }
      } catch (error) {
        // Don't fail the submission if achievement check fails
        console.error('[useSubmitScorecards] Achievement check failed:', error);
      }
    },

    onError: (error) => {
      console.error('[useSubmitScorecards] Error:', error);
    },
  });
}

interface UpdateScoreInput {
  scorecardId: string;
  roundId: string;
  holeNumber: number;
  strokes: number;
}

/**
 * Update a single hole score
 * Uses optimistic update for instant UI feedback
 */
export function useUpdateScore() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateScoreInput>({
    mutationFn: async ({ scorecardId, roundId: _roundId, holeNumber, strokes }) => {
      // TODO: Implement when we need direct mutation
      // For now, score updates go through the Zustand store
      console.log('[useUpdateScore] Update:', { scorecardId, holeNumber, strokes });
    },

    onMutate: async ({ scorecardId, roundId, holeNumber, strokes }): Promise<{ previousScorecards: Scorecard[] | undefined }> => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: scorecardKeys.list({ roundId }),
      });

      // Get current data
      const previousScorecards = queryClient.getQueryData<Scorecard[]>(
        scorecardKeys.list({ roundId })
      );

      // Optimistically update
      if (previousScorecards) {
        const updated = previousScorecards.map((sc) => {
          if (sc.id === scorecardId) {
            return {
              ...sc,
              scores: {
                ...sc.scores,
                [holeNumber]: { strokes },
              },
              updatedAt: new Date(),
            };
          }
          return sc;
        });

        queryClient.setQueryData(scorecardKeys.list({ roundId }), updated);
      }

      return { previousScorecards };
    },

    onError: (err, variables, _onMutateResult, context) => {
      // Rollback on error - context from onMutate
      const ctx = context as unknown as { previousScorecards: Scorecard[] | undefined } | undefined;
      if (ctx?.previousScorecards) {
        queryClient.setQueryData(
          scorecardKeys.list({ roundId: variables.roundId }),
          ctx.previousScorecards
        );
      }
    },

    onSettled: (data, error, variables) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({
        queryKey: scorecardKeys.list({ roundId: variables.roundId }),
      });
    },
  });
}
