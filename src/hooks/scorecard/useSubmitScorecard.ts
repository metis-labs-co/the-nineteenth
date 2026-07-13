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
import { flushPendingScorecardSyncs } from '@/store/scorecardSyncDebounce';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import { scorecardKeys } from './useScorecards';
import { useAuth } from '@/hooks/useAuth';
import { useCheckAchievements } from '@/hooks/achievements/useCheckAchievements';
import { useAchievementToast } from '@/context/AchievementToastContext';
import { isSingleBallScore } from '@/types/database/base';
import { getScoreCategory } from '@/utils/scoring';
import type { Scorecard, Hole, GameType } from '@/types';
import type { AchievementEventData, AchievementDefinition } from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';

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

    // Check for hole-in-one
    if (strokes === 1) {
      holeInOne = true;
    }

    // Categorize by score type via the canonical classifier. A pickup
    // (strokes >= PICKUP_SCORE) returns null and is counted in no category.
    const category = getScoreCategory(strokes, hole.par);
    if (category === 'albatross') {
      albatross++;
    } else if (category === 'eagle') {
      eagles++;
    } else if (category === 'birdie') {
      birdies++;
    } else if (category === 'par') {
      pars++;
    } else if (category === 'bogey') {
      bogeys++;
    } else if (category === 'double-bogey' || category === 'triple-plus') {
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
      // Cancel any in-flight live (in-progress) syncs so a trailing
      // 'in-progress' upsert can't land after the 'completed' one we're
      // about to push.
      flushPendingScorecardSyncs();

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

      // Free the bunker-prompt cooldown set's entries for this round —
      // the round is now finalized, no more shot logging will happen on it.
      useShotLoggingUiStore
        .getState()
        .clearBunkerCooldownForRound(variables.roundId);

      // Check for achievements if we have the required data
      if (!playerId || !isAchievementReady) {
        return;
      }

      const { scorecards, holes, gameType, courseId, isCompetition, roundId } = variables;

      // Find the current user's scorecard
      const userScorecard = scorecards.find((sc) => sc.playerId === playerId);
      if (!userScorecard) {
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
          net_score: userScorecard.totalNet || undefined,
          // Score type counts
          birdies: scoreStats.birdies,
          eagles: scoreStats.eagles,
          albatrosses: scoreStats.albatross,
          pars: scoreStats.pars,
          bogeys: scoreStats.bogeys,
          double_bogeys: scoreStats.doubleBogeys,
          hole_in_one: scoreStats.holeInOne,
        };

        // Collect all new rewards across multiple event checks
        const allNewAchievements: AchievementDefinition[] = [];
        const allNewCosmetics: CosmeticDefinition[] = [];

        // 1. scorecard_submitted — game type counts, score thresholds
        const result = await checkAndAward('scorecard_submitted', eventData);
        allNewAchievements.push(...result.newAchievements);
        allNewCosmetics.push(...result.newCosmetics);

        // 2. round_completed — round counting, practice/competition, course tracking
        const roundResult = await checkAndAward('round_completed', eventData);
        allNewAchievements.push(...roundResult.newAchievements);
        allNewCosmetics.push(...roundResult.newCosmetics);

        // 3. Score-specific achievements (with counts for efficient batch tracking)
        if (scoreStats.birdies > 0) {
          const r = await checkAndAward('birdie_recorded', { birdies: scoreStats.birdies });
          allNewAchievements.push(...r.newAchievements);
          allNewCosmetics.push(...r.newCosmetics);
        }
        if (scoreStats.eagles > 0) {
          const r = await checkAndAward('eagle_recorded', { eagles: scoreStats.eagles });
          allNewAchievements.push(...r.newAchievements);
          allNewCosmetics.push(...r.newCosmetics);
        }
        if (scoreStats.albatross > 0) {
          const r = await checkAndAward('albatross_recorded', { albatrosses: scoreStats.albatross });
          allNewAchievements.push(...r.newAchievements);
          allNewCosmetics.push(...r.newCosmetics);
        }
        if (scoreStats.holeInOne) {
          const r = await checkAndAward('ace_recorded', { hole_in_one: true });
          allNewAchievements.push(...r.newAchievements);
          allNewCosmetics.push(...r.newCosmetics);
        }
        if (scoreStats.pars > 0) {
          const r = await checkAndAward('par_recorded', { pars: scoreStats.pars });
          allNewAchievements.push(...r.newAchievements);
          allNewCosmetics.push(...r.newCosmetics);
        }

        // 4. course_played — unique course tracking
        if (courseId) {
          const r = await checkAndAward('course_played', { course_id: courseId });
          allNewAchievements.push(...r.newAchievements);
          allNewCosmetics.push(...r.newCosmetics);
        }

        // 5. Show all achievement toasts
        if (allNewAchievements.length > 0 || allNewCosmetics.length > 0) {
          showMultipleToasts(allNewAchievements, allNewCosmetics);
        }
      } catch {
        // Don't fail the submission if achievement check fails
      }
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
    mutationFn: async ({ scorecardId: _scorecardId, roundId: _roundId, holeNumber: _holeNumber, strokes: _strokes }) => {
      // TODO: Implement when we need direct mutation
      // For now, score updates go through the Zustand store
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
