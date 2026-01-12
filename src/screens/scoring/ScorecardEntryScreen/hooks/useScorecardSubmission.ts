/**
 * useScorecardSubmission Hook
 *
 * Handles score submission, offline sync, and round deletion:
 * - Submit scorecards with completion validation
 * - Handle incomplete round submission with confirmation
 * - Delete standalone rounds
 * - Navigate to review screen on success
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/services/supabase/client';
import { deleteScorecardsByRound } from '@/services/offline/database';
import { useFinalizeSkinsForRound } from '@/hooks';
import { scoringLogger } from '@/utils/debugLogger';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { Hole } from '@/types';

export interface UseScorecardSubmissionParams {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Scorecard'>;
  roundId: string;
  competitionId: string;
  holes: Hole[];
  playerCount: number;
  getCompletedHolesCount: () => number;
  submitScorecards: () => Promise<void>;
  resetRound: () => void;
  onIncompleteRound: (completedCount: number) => void;
  onSubmitError: () => void;
  onCloseIncompleteDialog: () => void;
}

export interface UseScorecardSubmissionReturn {
  handleSubmit: () => Promise<void>;
  performSubmit: () => Promise<void>;
  handleDeleteRound: () => void;
}

export function useScorecardSubmission({
  navigation,
  roundId,
  competitionId,
  holes,
  playerCount,
  getCompletedHolesCount,
  submitScorecards,
  resetRound,
  onIncompleteRound,
  onSubmitError,
  onCloseIncompleteDialog,
}: UseScorecardSubmissionParams): UseScorecardSubmissionReturn {
  // Skins finalization hook
  const { finalizeSkinsForRound } = useFinalizeSkinsForRound();

  // Perform the actual submission
  const performSubmit = useCallback(async () => {
    onCloseIncompleteDialog();
    scoringLogger.info('SUBMIT: Starting scorecard submission', {
      roundId: roundId?.substring(0, 8),
      competitionId: competitionId?.substring(0, 8),
      playerCount,
    });
    try {
      await submitScorecards();
      scoringLogger.info('SUBMIT: Scorecard submission successful');

      // Finalize skins game if applicable (non-blocking)
      finalizeSkinsForRound(roundId).then((result) => {
        if (result.finalized) {
          scoringLogger.info('SUBMIT: Skins game finalized', { roundId: roundId?.substring(0, 8) });
        } else if (result.error) {
          scoringLogger.warn('SUBMIT: Skins finalization error (non-blocking)', { error: result.error });
        }
        // No skins game = result.finalized is false with no error, which is fine
      }).catch((error) => {
        // Non-blocking - log error but don't fail submission
        scoringLogger.warn('SUBMIT: Skins finalization failed (non-blocking)', { error });
      });

      navigation.navigate('ReviewScorecard', {
        roundId,
        competitionId,
        holes,
      });
    } catch (error) {
      scoringLogger.error('SUBMIT: Scorecard submission failed', error);
      onSubmitError();
    }
  }, [
    submitScorecards,
    navigation,
    roundId,
    competitionId,
    holes,
    playerCount,
    onSubmitError,
    onCloseIncompleteDialog,
    finalizeSkinsForRound,
  ]);

  // Handle submit button press with completion check
  const handleSubmit = useCallback(async () => {
    const completedCount = getCompletedHolesCount();
    scoringLogger.info('SUBMIT: Submit button pressed', {
      completedHoles: completedCount,
      totalHoles: 18,
      isComplete: completedCount === 18,
    });
    if (completedCount < 18) {
      onIncompleteRound(completedCount);
    } else {
      await performSubmit();
    }
  }, [getCompletedHolesCount, performSubmit, onIncompleteRound]);

  // Delete a standalone round
  const handleDeleteRound = useCallback(() => {
    Alert.alert(
      'Delete Round',
      'Are you sure you want to delete this round? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('rounds').delete().eq('id', roundId);

              if (error) {
                console.error('[ScorecardEntryScreen] Failed to delete round:', error);
                Alert.alert('Error', 'Failed to delete round. Please try again.');
                return;
              }

              await deleteScorecardsByRound(roundId);
              resetRound();
              navigation.goBack();
            } catch (error) {
              console.error('[ScorecardEntryScreen] Error deleting round:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            }
          },
        },
      ]
    );
  }, [roundId, navigation, resetRound]);

  return {
    handleSubmit,
    performSubmit,
    handleDeleteRound,
  };
}
