/**
 * useScoreSubmission - Hook for handling final score submission and sync logic
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/services/supabase/client';
import { useFinalizeSkinsForRound } from '@/hooks/useSkins';
import { submitLogger } from '@/utils/debugLogger';
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
  submitScorecards: () => Promise<void>;
  resetRound: () => void;
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReviewScorecard'>;
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
}: UseScoreSubmissionParams): UseScoreSubmissionReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Skins finalization hook
  const { finalizeSkinsForRound } = useFinalizeSkinsForRound();

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

    Alert.alert(
      'Submit Scorecard',
      isOnline
        ? 'Are you sure you want to submit all scores? This action cannot be undone.'
        : 'You are offline. Scores will be saved locally and submitted when you reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            submitLogger.info('Submit confirmed by user', { isOnline });
            setIsSubmitting(true);
            setSyncError(null);

            try {
              submitLogger.info('Calling submitScorecards');
              await submitScorecards();
              submitLogger.info('submitScorecards completed successfully');

              if (roundId && isOnline) {
                await updateRoundStatus(roundId);

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
                Alert.alert(
                  'Saved Offline',
                  'Your scores have been saved locally and will be submitted when you reconnect.',
                  [{ text: 'OK', onPress: () => navigateAfterSubmit(roundId) }]
                );
              } else {
                submitLogger.info('Online submission successful');
                Alert.alert(
                  'Success',
                  'All scores have been submitted successfully!',
                  [{ text: 'View Round', onPress: () => navigateAfterSubmit(roundId) }]
                );
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              submitLogger.error('Submission failed', error, {
                errorMessage,
                competitionId: competitionId?.substring(0, 8) + '...',
              });
              setSyncError(errorMessage);
              Alert.alert(
                'Submission Failed',
                `Failed to submit scores: ${errorMessage}. Please try again.`,
                [{ text: 'OK' }]
              );
            } finally {
              setIsSubmitting(false);
              submitLogger.debug('Submission process ended');
            }
          },
        },
      ]
    );
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
    navigateAfterSubmit,
    finalizeSkinsForRound,
  ]);

  const handleSyncPress = useCallback(async () => {
    submitLogger.info('Manual sync button pressed', { isOnline, pendingSyncs });

    if (!isOnline) {
      submitLogger.warn('Sync attempted while offline');
      Alert.alert('No Connection', 'Please connect to the internet to sync your scores.');
      return;
    }

    setIsSubmitting(true);
    try {
      submitLogger.info('Attempting manual sync');
      await submitScorecards();
      setPendingSyncs(0);
      setSyncError(null);
      submitLogger.info('Manual sync completed successfully');
      Alert.alert('Sync Complete', 'All pending scores have been submitted.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      submitLogger.error('Manual sync failed', error, { errorMessage });
      setSyncError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [isOnline, submitScorecards, pendingSyncs]);

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
  };
}
