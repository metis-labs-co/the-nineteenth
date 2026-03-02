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
import type { PostgrestError } from '@supabase/supabase-js';
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
import { finalizeRound } from '@/services/rounds/roundResultsService';
import { submitLogger } from '@/utils/debugLogger';
import { useLeagues } from '@/hooks/useLeagues';
import type { Scorecard, GameType, PointSystemConfig } from '@/types/database.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { IncompleteHole } from './useScoreReview';

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

  // Skins finalization hook
  const { finalizeSkinsForRound } = useFinalizeSkinsForRound();

  // Prefetch leagues data so it's available synchronously at submission time
  const { data: leaguesData } = useLeagues();

  // Check bypass availability on mount and periodically
  useEffect(() => {
    if (!scoringPairsEnabled || !currentRoundId || !currentUserId) return;

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
  }, [scoringPairsEnabled, currentRoundId, currentUserId, bypassAvailableAt]);

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

  // Update round status to completed in database
  const updateRoundStatus = useCallback(async (roundId: string): Promise<void> => {
    try {
      submitLogger.info('Updating round status to completed', { roundId: roundId.substring(0, 8) + '...' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { error } = await (supabase as any)
        .from('rounds')
        .update({ status: 'completed' })
        .eq('id', roundId);

      if (error) {
        submitLogger.error('Failed to update round status', error, { roundId: roundId.substring(0, 8) + '...' });
        throw error;
      }

      submitLogger.info('Round status updated successfully', { roundId: roundId.substring(0, 8) + '...' });
    } catch (error) {
      submitLogger.error('Error updating round status', error);
    }
  }, []);

  // Finalize round results (calculate positions and competition points)
  const finalizeRoundResults = useCallback(async (roundId: string): Promise<void> => {
    try {
      submitLogger.info('Finalizing round results', { roundId: roundId.substring(0, 8) + '...' });

      // Fetch round data to get game type and point system
      const { data: round, error: roundError } = await supabase
        .from('rounds')
        .select('game_type, competition_id')
        .eq('id', roundId)
        .single() as unknown as { data: { game_type: string; competition_id: string | null } | null; error: PostgrestError | null };

      if (roundError || !round) {
        submitLogger.error('Failed to fetch round data for finalization', roundError, { roundId: roundId.substring(0, 8) + '...' });
        return;
      }

      if (!round.competition_id) {
        submitLogger.warn('Round has no competition_id, skipping finalization');
        return;
      }

      // Fetch competition to get point system config
      const { data: competition, error: compError } = await supabase
        .from('competitions')
        .select('point_system')
        .eq('id', round.competition_id)
        .single() as unknown as { data: { point_system: PointSystemConfig | null } | null; error: PostgrestError | null };

      if (compError || !competition) {
        submitLogger.error('Failed to fetch competition for finalization', compError, { competitionId: round.competition_id?.substring(0, 8) + '...' });
        return;
      }

      // Fetch all scorecards for this round
      const { data: scorecards, error: scError } = await supabase
        .from('scorecards')
        .select('*')
        .eq('round_id', roundId)
        .eq('status', 'completed') as unknown as { data: Scorecard[] | null; error: PostgrestError | null };

      if (scError || !scorecards || scorecards.length === 0) {
        submitLogger.warn('No completed scorecards found for finalization', { roundId: roundId.substring(0, 8) + '...' });
        return;
      }

      // Scorecards are already typed as Scorecard[] from the query assertion
      const scorecardsForFinalize: Scorecard[] = scorecards;

      // Use default point system if none configured
      const pointSystem: PointSystemConfig = competition.point_system || {
        type: 'position',
        rules: { '1': 10, '2': 8, '3': 6, '4': 5, '5': 4, '6': 3, '7': 2, '8': 1, 'default': 1 },
      };

      const gameType = round.game_type as GameType;

      submitLogger.info('Calling finalizeRound', {
        roundId: roundId.substring(0, 8) + '...',
        gameType,
        scorecardCount: scorecardsForFinalize.length,
        pointSystemType: pointSystem.type,
      });

      // Call finalizeRound to calculate positions and competition points
      await finalizeRound(roundId, scorecardsForFinalize, gameType, pointSystem);

      submitLogger.info('Round results finalized successfully', { roundId: roundId.substring(0, 8) + '...' });
    } catch (error) {
      submitLogger.error('Error finalizing round results', error, { roundId: roundId.substring(0, 8) + '...' });
      // Don't throw - this is a non-critical operation and shouldn't block the submission flow
    }
  }, []);

  const navigateAfterSubmit = useCallback((roundId: string | null | undefined) => {
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

    // Check submission readiness when scoring pairs are enabled
    if (scoringPairsEnabled && currentUserId && roundId && isOnline) {
      try {
        submitLogger.info('Checking submission readiness for scoring pairs');
        const readiness = await checkSubmissionReadiness(roundId, currentUserId, true, holeCount);

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
            });
            return;
          }

          if (readiness.reason === 'unresolved_mismatches') {
            submitLogger.info('Unresolved mismatches found', { count: readiness.mismatchCount });
            setShowMismatchModal(true);
            return;
          }
        }

        // Partner complete - now detect and create any mismatches
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
        submitLogger.info('Calling submitScorecards');
        await submitScorecards();
        submitLogger.info('submitScorecards completed successfully');

        if (roundId && isOnline) {
          await updateRoundStatus(roundId);

          // Finalize round results (calculate positions and competition points)
          await finalizeRoundResults(roundId);

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

          // Check if user has active leagues for tagging prompt (uses prefetched data)
          const hasLeagues = (leaguesData ?? []).some((l) => l.status === 'active');

          if (hasLeagues) {
            showDialog({
              title: 'Scores Submitted!',
              message: 'All scores have been submitted successfully. Would you like to tag this round to a league?',
              confirmLabel: 'View Round',
              cancelLabel: '',
              icon: 'check-circle-outline',
              onConfirm: () => {
                dismissDialog();
                navigateAfterSubmit(roundId);
              },
              showSecondaryAction: true,
              secondaryActionLabel: 'Tag to League',
              onSecondaryAction: () => {
                dismissDialog();
                resetRound();
                // Navigate to Leagues tab where user can pick a league and tag
                navigation.reset({
                  index: 0,
                  routes: [{
                    name: 'MainTabs',
                    params: { screen: 'LeaguesTab' },
                  }],
                });
              },
            });
          } else {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- navigation and resetRound excluded to prevent unnecessary re-renders
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
    leaguesData,
    showDialog,
    showAlert,
    dismissDialog,
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

          // Finalize skins (non-blocking)
          finalizeSkinsForRound(roundId).catch((error) => {
            submitLogger.warn('Skins finalization failed (non-blocking)', { error });
          });
        }

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
