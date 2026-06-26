/**
 * useScoreSubmission - Hook for handling final score submission and sync logic
 *
 * Enhanced with scoring pairs mismatch detection:
 * - Checks partner completion before allowing submission
 * - Detects and creates mismatch records
 * - Supports 30-minute bypass timer for unresponsive partners
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/services/supabase/client';
import { activeRoundSession } from '@/services/activeRoundSession';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import type { DialogConfig } from '@/hooks/useConfirmationDialog';
import { useFinalizeSkinsForRound } from '@/hooks/useSkins';
import {
  checkSubmissionReadiness,
  createMismatchRecords,
  getPendingMismatches,
  startBypassTimer,
  getSubmissionStatus,
  markSubmissionBypassed,
  applyBypassScores,
  getPartnerProgress,
} from '@/services/scoreMismatch';
import { getScoringPartner } from '@/services/scoringPairs';
import { submitLogger } from '@/utils/debugLogger';
import { useCheckAchievements } from '@/hooks/achievements/useCheckAchievements';
import { useAchievementToast } from '@/context/AchievementToastContext';
import { useAuth } from '@/hooks/useAuth';
import type {
  AchievementDefinition,
  AchievementEventData,
} from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';
import { useScorecardStore } from '@/store/scorecardStore';
import { isSingleBallScore } from '@/types/database/base';
import type { Hole, Scorecard } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { roundKeys, scorecardKeys } from '@/hooks/queryKeys';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { IncompleteHole } from './useScoreReview';
import { useRoundFinalization } from './useRoundFinalization';

// =====================================================
// SCORE STATISTICS FOR ACHIEVEMENTS
// =====================================================

/**
 * Counts birdies, eagles, pars, etc. for the player's submitted scorecard.
 * Used to populate AchievementEventData for round/scorecard/score-type events.
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

    const strokes = isSingleBallScore(holeScore)
      ? holeScore.strokes
      : holeScore.balls?.[0]?.strokes;

    if (!strokes || strokes === 0) continue;

    holesPlayed++;
    totalGross += strokes;
    const diff = strokes - hole.par;

    if (strokes === 1) holeInOne = true;

    if (diff <= -3) albatross++;
    else if (diff === -2) eagles++;
    else if (diff === -1) birdies++;
    else if (diff === 0) pars++;
    else if (diff === 1) bogeys++;
    else doubleBogeys++;
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

interface UseScoreSubmissionParams {
  isOnline: boolean;
  competitionId?: string;
  routeRoundId?: string;
  currentRoundId: string | null;
  playerCount: number;
  scorecardCount: number;
  validateScores: () => IncompleteHole[];
  setShowIncompleteModal: (show: boolean) => void;
  submitScorecards: (options?: { bypassed?: boolean }) => Promise<void>;
  resetRound: () => void;
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReviewScorecard'>;
  // Scoring pairs mismatch detection
  scoringPairsEnabled?: boolean;
  currentUserId?: string;
  holeCount?: number;
}

interface UseScoreSubmissionReturn {
  isSubmitting: boolean;
  isRefreshing: boolean;
  pendingSyncs: number;
  syncError: string | null;
  handleSubmit: () => Promise<void>;
  handleSyncPress: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  getOfflineStatus: () => 'online' | 'offline' | 'syncing' | 'error';
  // Mismatch modal state
  showMismatchModal: boolean;
  setShowMismatchModal: (show: boolean) => void;
  // Bypass state
  bypassAvailable: boolean;
  bypassAvailableAt: Date | null;
  handleBypassSubmit: () => Promise<void>;
  // Partner waiting state
  isWaitingForPartner: boolean;
  partnerName: string | null;
  partnerProgress: { completed: number; total: number } | null;
  refreshPartnerStatus: () => Promise<void>;
  /** Dialog config for confirmations/errors - parent should render ConfirmationDialog */
  dialogConfig: DialogConfig;
  /** Dismiss the dialog */
  dismissDialog: () => void;
}

export function useScoreSubmission({
  isOnline,
  competitionId,
  routeRoundId,
  currentRoundId,
  playerCount,
  scorecardCount,
  validateScores,
  setShowIncompleteModal,
  submitScorecards,
  resetRound,
  navigation,
  // Scoring pairs mismatch detection
  scoringPairsEnabled = false,
  currentUserId,
  holeCount = 18,
}: UseScoreSubmissionParams): UseScoreSubmissionReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Confirmation dialog hook
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // Mismatch modal state
  const [showMismatchModal, setShowMismatchModal] = useState(false);

  // Bypass state
  const [bypassAvailable, setBypassAvailable] = useState(false);
  const [bypassAvailableAt, setBypassAvailableAt] = useState<Date | null>(null);

  // Partner waiting state
  const [isWaitingForPartner, setIsWaitingForPartner] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerProgress, setPartnerProgress] = useState<{ completed: number; total: number } | null>(null);

  // Round finalization (extracted hook)
  const { updateRoundStatus, finalizeRoundResults } = useRoundFinalization();
  const queryClient = useQueryClient();

  // Skins finalization hook
  const { finalizeSkinsForRound } = useFinalizeSkinsForRound();

  // Achievement checking for competition/match play events (fired after finalization)
  const { user } = useAuth();
  const achievementPlayerId = currentUserId || user?.id || '';
  const { checkAndAward, isReady: isAchievementReady } = useCheckAchievements(achievementPlayerId);
  const { showMultipleToasts } = useAchievementToast();

  // Check bypass availability on mount and periodically.
  // Runs for both scoring-pairs and multi-scorer rounds — both modes can
  // have a pending bypass timer once the user has attempted submission while
  // other scorers were still in progress.
  useEffect(() => {
    if (!currentRoundId || !currentUserId) return;

    const checkBypassStatus = async () => {
      try {
        const status = await getSubmissionStatus(currentRoundId, currentUserId);
        if (status?.bypass_available_at) {
          const bypassTime = new Date(status.bypass_available_at);
          setBypassAvailableAt(bypassTime);
          setBypassAvailable(bypassTime <= new Date());
        }
      } catch (error) {
        submitLogger.warn('Failed to check bypass status', { error });
      }
    };

    checkBypassStatus();

    // Check every 30 seconds if we have a bypass timer
    const interval = setInterval(() => {
      if (bypassAvailableAt) {
        setBypassAvailable(bypassAvailableAt <= new Date());
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentRoundId, currentUserId, bypassAvailableAt]);

  // Refresh partner status
  const refreshPartnerStatus = useCallback(async () => {
    if (!currentRoundId || !currentUserId) return;

    try {
      const progress = await getPartnerProgress(currentRoundId, currentUserId, holeCount);
      setPartnerName(progress.partnerName);
      setPartnerProgress(progress.progress);
      setIsWaitingForPartner(!progress.complete);
    } catch (error) {
      submitLogger.warn('Failed to refresh partner status', { error });
    }
  }, [currentRoundId, currentUserId, holeCount]);

  // Round / scorecard / score-type achievement checks. Fires events that
  // increment NINE_HOLE_SPECIALIST, ROUND_VETERAN, 18_HOLES_OF_GLORY,
  // STABLEFORD_SPECIALIST, BIRDIE_HUNTER, COURSE_EXPLORER, etc. for BOTH
  // standalone and competition rounds. Non-blocking — never throws.
  const checkRoundAchievements = useCallback(
    async (roundId: string) => {
      if (!achievementPlayerId || !isAchievementReady) return;

      try {
        const {
          holes: storeHoles,
          gameType: storeGameType,
          groupScorecards: storeScorecards,
        } = useScorecardStore.getState();
        const userScorecard = storeScorecards.get(achievementPlayerId);

        if (!userScorecard || storeHoles.length === 0) return;

        const scoreStats = calculateScoreStats(userScorecard, storeHoles);

        let courseIdForEvent: string | undefined;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          const { data: roundData } = await (supabase as any)
            .from('rounds')
            .select('course_id')
            .eq('id', roundId)
            .single();
          courseIdForEvent = roundData?.course_id || undefined;
        } catch (error) {
          submitLogger.warn('Failed to fetch course_id for achievements (non-blocking)', { error });
        }

        const eventData: AchievementEventData = {
          round_id: roundId,
          game_type: storeGameType || 'stableford',
          course_id: courseIdForEvent,
          is_competition: !!competitionId && competitionId !== 'standalone',
          hole_count: scoreStats.holesPlayed,
          gross_score: scoreStats.totalGross,
          net_score: userScorecard.totalNet || undefined,
          birdies: scoreStats.birdies,
          eagles: scoreStats.eagles,
          albatrosses: scoreStats.albatross,
          pars: scoreStats.pars,
          bogeys: scoreStats.bogeys,
          double_bogeys: scoreStats.doubleBogeys,
          hole_in_one: scoreStats.holeInOne,
        };

        const newAchievements: AchievementDefinition[] = [];
        const newCosmetics: CosmeticDefinition[] = [];

        const r1 = await checkAndAward('scorecard_submitted', eventData);
        newAchievements.push(...r1.newAchievements);
        newCosmetics.push(...r1.newCosmetics);

        const r2 = await checkAndAward('round_completed', eventData);
        newAchievements.push(...r2.newAchievements);
        newCosmetics.push(...r2.newCosmetics);

        if (scoreStats.birdies > 0) {
          const r = await checkAndAward('birdie_recorded', { birdies: scoreStats.birdies });
          newAchievements.push(...r.newAchievements);
          newCosmetics.push(...r.newCosmetics);
        }
        if (scoreStats.eagles > 0) {
          const r = await checkAndAward('eagle_recorded', { eagles: scoreStats.eagles });
          newAchievements.push(...r.newAchievements);
          newCosmetics.push(...r.newCosmetics);
        }
        if (scoreStats.albatross > 0) {
          const r = await checkAndAward('albatross_recorded', { albatrosses: scoreStats.albatross });
          newAchievements.push(...r.newAchievements);
          newCosmetics.push(...r.newCosmetics);
        }
        if (scoreStats.holeInOne) {
          const r = await checkAndAward('ace_recorded', { hole_in_one: true });
          newAchievements.push(...r.newAchievements);
          newCosmetics.push(...r.newCosmetics);
        }
        if (scoreStats.pars > 0) {
          const r = await checkAndAward('par_recorded', { pars: scoreStats.pars });
          newAchievements.push(...r.newAchievements);
          newCosmetics.push(...r.newCosmetics);
        }
        if (courseIdForEvent) {
          const r = await checkAndAward('course_played', { course_id: courseIdForEvent });
          newAchievements.push(...r.newAchievements);
          newCosmetics.push(...r.newCosmetics);
        }

        if (newAchievements.length > 0 || newCosmetics.length > 0) {
          showMultipleToasts(newAchievements, newCosmetics);
        }
      } catch (error) {
        submitLogger.warn('Round achievement check failed (non-blocking)', { error });
      }
    },
    [achievementPlayerId, isAchievementReady, competitionId, checkAndAward, showMultipleToasts]
  );

  const navigateAfterSubmit = useCallback((roundId: string | null | undefined) => {
    // Round is fully submitted — clear the resume-on-launch session so the
    // next cold start doesn't land the user back on Score Entry for a round
    // they've already finished.
    void activeRoundSession.clear();
    resetRound();
    if (roundId) {
      submitLogger.info('Navigating to ViewRound (resetting stack)', { roundId: roundId.substring(0, 8) + '...' });
      // Reset navigation stack so back button goes to rounds list, not score entry
      navigation.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          {
            name: 'ViewRound',
            params: {
              roundId,
              competitionId: competitionId !== 'standalone' ? competitionId : undefined,
            },
          },
        ],
      });
    } else {
      submitLogger.info('Navigating to dashboard (no round ID)');
      navigation.popToTop();
    }
  }, [competitionId, navigation, resetRound]);

  const handleSubmit = useCallback(async () => {
    submitLogger.info('Submit button pressed', {
      isOnline,
      competitionId: competitionId?.substring(0, 8) + '...',
      roundId: currentRoundId?.substring(0, 8) + '...',
      playerCount,
      scorecardCount,
      scoringPairsEnabled,
    });

    const incomplete = validateScores();
    if (incomplete.length > 0) {
      submitLogger.warn('Incomplete scores detected', {
        incompleteHoles: incomplete.length,
        holes: incomplete.map((h) => h.holeNumber),
      });
      setShowIncompleteModal(true);
      return;
    }

    const roundId = currentRoundId || routeRoundId;

    // Submission readiness check.
    // Runs for ALL online submissions:
    //  - Scoring pairs enabled → 2-way self-vs-partner verification.
    //  - Otherwise → multi-scorer auto-detect: if 2+ users actually wrote
    //    score_entries, run N-way mismatch + completeness checks. Solo scorer
    //    rounds short-circuit inside the service and submit normally.
    if (currentUserId && roundId && isOnline) {
      try {
        // Players this device is submitting (its on-course group / pair). Used
        // to scope the readiness gate so different groups submit independently.
        const groupPlayerIds = [...useScorecardStore.getState().groupScorecards.keys()];
        submitLogger.info('Checking submission readiness', {
          scoringPairsEnabled,
          groupPlayerCount: groupPlayerIds.length,
        });
        const readiness = await checkSubmissionReadiness(
          roundId,
          currentUserId,
          scoringPairsEnabled,
          holeCount,
          groupPlayerIds,
        );

        if (!readiness.canSubmit) {
          if (readiness.reason === 'waiting_for_partner') {
            submitLogger.info('Waiting for partner to complete scoring', {
              partnerName: readiness.partnerName,
              progress: readiness.partnerProgress,
            });

            // Update partner state
            setIsWaitingForPartner(true);
            setPartnerName(readiness.partnerName ?? null);
            setPartnerProgress(readiness.partnerProgress ?? null);

            // Check if both have complete data (triggers bypass timer)
            const partnerProgress = await getPartnerProgress(roundId, currentUserId, holeCount);
            const myPartner = await getScoringPartner(roundId, currentUserId);

            // If partner exists and we have complete data, start bypass timer
            if (myPartner && !partnerProgress.complete) {
              // Start bypass timer if not already started
              const existingStatus = await getSubmissionStatus(roundId, currentUserId);
              if (!existingStatus?.bypass_available_at) {
                const { bypass_available_at } = await startBypassTimer(roundId, currentUserId, myPartner.id);
                setBypassAvailableAt(new Date(bypass_available_at));
                submitLogger.info('Bypass timer started', { bypass_available_at });
                // TODO: Server-side push notification would be triggered here
              }
            }

            // Convert entries to holes for display
            const holesComplete = Math.floor((readiness.partnerProgress?.completed ?? 0) / 2);
            const totalHoles = Math.floor((readiness.partnerProgress?.total ?? (holeCount * 2)) / 2);

            showDialog({
              title: 'Waiting for Partner',
              message: `${readiness.partnerName ?? 'Your partner'} hasn't finished entering scores yet.\n\nProgress: ${holesComplete}/${totalHoles} holes completed.${bypassAvailableAt ? `\n\nBypass available ${bypassAvailable ? 'now' : `at ${bypassAvailableAt.toLocaleTimeString()}`}` : ''}`,
              confirmLabel: 'Check Again',
              cancelLabel: 'OK',
              icon: 'account-clock-outline',
              onConfirm: () => {
                dismissDialog();
                refreshPartnerStatus();
              },
              showSecondaryAction: bypassAvailable,
              secondaryActionLabel: 'Submit Anyway',
              onSecondaryAction: () => {
                dismissDialog();
                handleBypassSubmit();
              },
            });
            return;
          }

          if (readiness.reason === 'waiting_for_other_scorers') {
            const incomplete = readiness.incompleteScorers ?? [];
            submitLogger.info('Waiting for other scorers to complete', {
              count: incomplete.length,
              names: incomplete.map((s) => s.scorerName),
            });

            // Reuse partner-waiting state for the dialog refresh path; treat
            // the first incomplete scorer as the surfaced "name" for display.
            setIsWaitingForPartner(true);
            setPartnerName(incomplete[0]?.scorerName ?? null);
            setPartnerProgress(incomplete[0]?.progress ?? null);

            // Start bypass timer if not already started. Multi-scorer has no
            // single canonical partner, so partner_id is null.
            const existingStatus = await getSubmissionStatus(roundId, currentUserId);
            if (!existingStatus?.bypass_available_at) {
              const { bypass_available_at } = await startBypassTimer(roundId, currentUserId, null);
              setBypassAvailableAt(new Date(bypass_available_at));
              submitLogger.info('Bypass timer started (multi-scorer)', { bypass_available_at });
            }

            const namesList = incomplete
              .map((s) => `• ${s.scorerName} (${s.progress.completed}/${s.progress.total})`)
              .join('\n');
            const bypassLine = bypassAvailableAt
              ? `\n\nBypass available ${bypassAvailable ? 'now' : `at ${bypassAvailableAt.toLocaleTimeString()}`}`
              : '';

            showDialog({
              title: 'Waiting for Other Scorers',
              message: `These scorers haven't finished entering all scores yet:\n\n${namesList}${bypassLine}`,
              confirmLabel: 'Check Again',
              cancelLabel: 'OK',
              icon: 'account-clock-outline',
              onConfirm: () => {
                dismissDialog();
                refreshPartnerStatus();
              },
              showSecondaryAction: bypassAvailable,
              secondaryActionLabel: 'Submit Anyway',
              onSecondaryAction: () => {
                dismissDialog();
                handleBypassSubmit();
              },
            });
            return;
          }

          if (readiness.reason === 'unresolved_mismatches') {
            submitLogger.info('Unresolved mismatches found', { count: readiness.mismatchCount });
            setShowMismatchModal(true);
            return;
          }
        }

        // Pairs flow: partner complete; run a final mismatch sweep before submit.
        // (Multi-scorer already runs createMismatchRecords inside the readiness
        // check, so this is a no-op for that path.)
        if (scoringPairsEnabled) {
          submitLogger.info('Partner complete, detecting mismatches');
          const mismatchCount = await createMismatchRecords(roundId);
          submitLogger.info('Mismatch detection complete', { mismatchCount });

          if (mismatchCount > 0) {
            const mismatches = await getPendingMismatches(roundId);
            if (mismatches.length > 0) {
              submitLogger.info('Pending mismatches found, showing resolution modal', {
                count: mismatches.length,
              });
              setShowMismatchModal(true);
              return;
            }
          }
        }

        submitLogger.info('No mismatches or all resolved, proceeding with submission');
      } catch (error) {
        submitLogger.error('Error checking submission readiness', error);
        // Continue with submission on error - don't block user
      }
    }

    // Perform the actual submission
    const performSubmission = async () => {
      submitLogger.info('Submit confirmed by user', { isOnline });
      setIsSubmitting(true);
      setSyncError(null);

      try {
        submitLogger.info('Calling submitScorecards', {
          roundId: roundId?.substring(0, 8) + '...',
          isStandalone: !competitionId || competitionId === 'standalone',
          isOnline,
        });
        await submitScorecards();
        submitLogger.info('submitScorecards completed successfully');

        if (roundId && isOnline) {
          try {
            await updateRoundStatus(roundId);
            submitLogger.info('Round status update succeeded', { roundId: roundId.substring(0, 8) + '...' });
          } catch (statusError) {
            submitLogger.error('Round status update failed - round may not appear in correct tab', statusError, {
              roundId: roundId.substring(0, 8) + '...',
            });
          }

          // Finalize round results (calculate positions and competition points)
          await finalizeRoundResults(roundId);

          // Round / scorecard / score-type achievement check (fires for both
          // standalone and competition rounds). Non-blocking.
          await checkRoundAchievements(roundId);

          // Check competition achievements after finalization (non-blocking)
          if (achievementPlayerId && isAchievementReady && competitionId && competitionId !== 'standalone') {
            try {
              // Query the player's position from round results
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
              const { data: playerResult } = await (supabase as any)
                .from('round_results')
                .select('position, raw_result_data')
                .eq('round_id', roundId)
                .eq('player_id', achievementPlayerId)
                .single();

              if (playerResult) {
                const position = playerResult.position as number | null;
                const resultData = playerResult.raw_result_data as Record<string, unknown> | null;

                // Fire competition_won if player finished 1st
                if (position === 1) {
                  const r = await checkAndAward('competition_won', {});
                  if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
                }

                // Fire competition_podium if player finished top 3
                if (position && position <= 3) {
                  const r = await checkAndAward('competition_podium', { position });
                  if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
                }

                // Fire match_play_won if match play with win result
                if (resultData?.match_result === 'win') {
                  const eventData: AchievementEventData = {
                    match_result: 'win',
                    margin: (resultData.final_margin as string) || undefined,
                  };
                  const r = await checkAndAward('match_play_won', eventData);
                  if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
                }
              }
            } catch (error) {
              // Non-blocking — don't fail submission if achievement check fails
              submitLogger.warn('Competition achievement check failed (non-blocking)', { error });
            }
          }

          // Finalize skins game if applicable (non-blocking)
          finalizeSkinsForRound(roundId).then((result) => {
            if (result.finalized) {
              submitLogger.info('Skins game finalized', { roundId: roundId?.substring(0, 8) + '...' });
            } else if (result.error) {
              submitLogger.warn('Skins finalization error (non-blocking)', { error: result.error });
            }
          }).catch((error) => {
            // Non-blocking - log error but don't fail submission
            submitLogger.warn('Skins finalization failed (non-blocking)', { error });
          });
        }

        // Invalidate round list query so the round appears in the correct tab
        const userId = currentUserId || user?.id;
        if (userId) {
          submitLogger.info('Invalidating round list query', { userId: userId.substring(0, 8) + '...' });
          queryClient.invalidateQueries({ queryKey: ['rounds', userId] });
        }
        // Also invalidate the round detail + scorecards so ViewRound shows
        // the new status / submitted scores on its next mount instead of
        // serving stale cache (no swipe-to-refresh needed).
        if (roundId) {
          queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
          queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId }) });
        }

        if (!isOnline) {
          submitLogger.info('Offline submission - scores queued for later sync');
          setPendingSyncs((prev) => prev + 1);
          showDialog({
            title: 'Saved Offline',
            message: 'Your scores have been saved locally and will be submitted when you reconnect.',
            confirmLabel: 'OK',
            cancelLabel: '',
            icon: 'cloud-off-outline',
            onConfirm: () => {
              dismissDialog();
              navigateAfterSubmit(roundId);
            },
          });
        } else {
          submitLogger.info('Online submission successful');

          showDialog({
            title: 'Success',
            message: 'All scores have been submitted successfully!',
            confirmLabel: 'View Round',
            cancelLabel: '',
            icon: 'check-circle-outline',
            onConfirm: () => {
              dismissDialog();
              navigateAfterSubmit(roundId);
            },
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        submitLogger.error('Submission failed', error, {
          errorMessage,
          competitionId: competitionId?.substring(0, 8) + '...',
        });
        setSyncError(errorMessage);
        showAlert(
          'Submission Failed',
          `Failed to submit scores: ${errorMessage}. Please try again.`
        );
      } finally {
        setIsSubmitting(false);
        submitLogger.debug('Submission process ended');
      }
    };

    showDialog({
      title: 'Submit Scorecard',
      message: isOnline
        ? 'Are you sure you want to submit all scores? This action cannot be undone.'
        : 'You are offline. Scores will be saved locally and submitted when you reconnect.',
      confirmLabel: 'Submit',
      cancelLabel: 'Cancel',
      icon: 'check-circle-outline',
      onConfirm: () => {
        dismissDialog();
        performSubmission();
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- navigation and resetRound excluded to prevent unnecessary re-renders. handleBypassSubmit is also excluded — it's declared after handleSubmit (TDZ if added here), and its deps are a strict subset of handleSubmit's, so handleSubmit re-creates whenever handleBypassSubmit's identity would change, keeping the closure fresh.
  }, [
    isOnline,
    competitionId,
    routeRoundId,
    currentRoundId,
    playerCount,
    scorecardCount,
    validateScores,
    setShowIncompleteModal,
    submitScorecards,
    updateRoundStatus,
    finalizeRoundResults,
    navigateAfterSubmit,
    finalizeSkinsForRound,
    scoringPairsEnabled,
    currentUserId,
    holeCount,
    bypassAvailable,
    bypassAvailableAt,
    refreshPartnerStatus,
    showDialog,
    showAlert,
    dismissDialog,
    achievementPlayerId,
    isAchievementReady,
    checkAndAward,
    checkRoundAchievements,
    showMultipleToasts,
    queryClient,
    user?.id,
  ]);

  // Handle bypass submission (skip partner verification)
  const handleBypassSubmit = useCallback(async () => {
    const roundId = currentRoundId || routeRoundId;
    if (!roundId || !currentUserId) {
      showAlert('Error', 'Missing round or user information');
      return;
    }

    // Perform the actual bypass submission
    const performBypassSubmission = async () => {
      submitLogger.info('Bypass submission confirmed', { roundId: roundId.substring(0, 8) + '...' });
      setIsSubmitting(true);
      setSyncError(null);

      try {
        // Mark as bypassed
        await markSubmissionBypassed(roundId, currentUserId);
        submitLogger.info('Submission marked as bypassed');

        // Apply bypass scores (use current user's scores as source of truth)
        await applyBypassScores(roundId, currentUserId);
        submitLogger.info('Bypass scores applied');

        // Continue with normal submission (with bypassed flag)
        await submitScorecards({ bypassed: true });
        submitLogger.info('Bypassed submission completed');

        if (isOnline) {
          await updateRoundStatus(roundId);

          // Finalize round results (calculate positions and competition points)
          await finalizeRoundResults(roundId);

          // Round / scorecard / score-type achievement check (fires for both
          // standalone and competition rounds). Non-blocking.
          await checkRoundAchievements(roundId);

          // Check competition achievements after finalization (non-blocking)
          if (achievementPlayerId && isAchievementReady && competitionId && competitionId !== 'standalone') {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
              const { data: playerResult } = await (supabase as any)
                .from('round_results')
                .select('position, raw_result_data')
                .eq('round_id', roundId)
                .eq('player_id', achievementPlayerId)
                .single();

              if (playerResult) {
                const position = playerResult.position as number | null;
                const resultData = playerResult.raw_result_data as Record<string, unknown> | null;

                if (position === 1) {
                  const r = await checkAndAward('competition_won', {});
                  if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
                }
                if (position && position <= 3) {
                  const r = await checkAndAward('competition_podium', { position });
                  if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
                }
                if (resultData?.match_result === 'win') {
                  const r = await checkAndAward('match_play_won', {
                    match_result: 'win',
                    margin: (resultData.final_margin as string) || undefined,
                  });
                  if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
                }
              }
            } catch (error) {
              submitLogger.warn('Competition achievement check failed (non-blocking)', { error });
            }
          }

          // Finalize skins (non-blocking)
          finalizeSkinsForRound(roundId).catch((error) => {
            submitLogger.warn('Skins finalization failed (non-blocking)', { error });
          });
        }

        // Invalidate round list query so the round appears in the correct tab
        const userId = currentUserId || user?.id;
        if (userId) {
          submitLogger.info('Invalidating round list query (bypass)', { userId: userId.substring(0, 8) + '...' });
          queryClient.invalidateQueries({ queryKey: ['rounds', userId] });
        }
        // Also invalidate round detail + scorecards (see handleSubmit for rationale).
        queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
        queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId }) });

        showDialog({
          title: 'Submitted (Unverified)',
          message: 'Your scores have been submitted. They will be flagged as unverified since partner verification was bypassed.',
          confirmLabel: 'View Round',
          cancelLabel: '',
          icon: 'alert-circle-outline',
          onConfirm: () => {
            dismissDialog();
            navigateAfterSubmit(roundId);
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        submitLogger.error('Bypass submission failed', error, { errorMessage });
        setSyncError(errorMessage);
        showAlert(
          'Submission Failed',
          `Failed to submit scores: ${errorMessage}. Please try again.`
        );
      } finally {
        setIsSubmitting(false);
      }
    };

    showDialog({
      title: 'Submit Without Verification',
      message: 'Your scores will be used for both players. This submission will be flagged as unverified on the leaderboard.\n\nAre you sure you want to proceed?',
      confirmLabel: 'Submit Anyway',
      confirmVariant: 'destructive',
      icon: 'alert-outline',
      onConfirm: () => {
        dismissDialog();
        performBypassSubmission();
      },
    });
  }, [
    currentRoundId,
    routeRoundId,
    currentUserId,
    isOnline,
    submitScorecards,
    updateRoundStatus,
    finalizeRoundResults,
    navigateAfterSubmit,
    finalizeSkinsForRound,
    showDialog,
    showAlert,
    dismissDialog,
    competitionId,
    achievementPlayerId,
    isAchievementReady,
    checkAndAward,
    checkRoundAchievements,
    showMultipleToasts,
    queryClient,
    user?.id,
  ]);

  const handleSyncPress = useCallback(async () => {
    submitLogger.info('Manual sync button pressed', { isOnline, pendingSyncs });

    if (!isOnline) {
      submitLogger.warn('Sync attempted while offline');
      showAlert('No Connection', 'Please connect to the internet to sync your scores.');
      return;
    }

    setIsSubmitting(true);
    try {
      submitLogger.info('Attempting manual sync');
      await submitScorecards();
      setPendingSyncs(0);
      setSyncError(null);
      submitLogger.info('Manual sync completed successfully');
      showAlert('Sync Complete', 'All pending scores have been submitted.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      submitLogger.error('Manual sync failed', error, { errorMessage });
      setSyncError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [isOnline, submitScorecards, pendingSyncs, showAlert]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const getOfflineStatus = useCallback((): 'online' | 'offline' | 'syncing' | 'error' => {
    if (syncError) return 'error';
    if (isSubmitting) return 'syncing';
    if (!isOnline) return 'offline';
    return 'online';
  }, [syncError, isSubmitting, isOnline]);

  return {
    isSubmitting,
    isRefreshing,
    pendingSyncs,
    syncError,
    handleSubmit,
    handleSyncPress,
    handleRefresh,
    getOfflineStatus,
    // Mismatch modal state
    showMismatchModal,
    setShowMismatchModal,
    // Bypass state
    bypassAvailable,
    bypassAvailableAt,
    handleBypassSubmit,
    // Partner waiting state
    isWaitingForPartner,
    partnerName,
    partnerProgress,
    refreshPartnerStatus,
    // Dialog
    dialogConfig,
    dismissDialog,
  };
}
