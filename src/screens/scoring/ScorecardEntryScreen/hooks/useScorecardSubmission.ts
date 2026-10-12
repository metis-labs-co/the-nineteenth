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
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import type { DialogConfig } from '@/hooks/useConfirmationDialog';
import { useDeleteRound } from '@/hooks/rounds/mutations';
import { syncRoundNow } from '@/services/rounds/syncRoundNow';
import { sendRoundEvent } from '@/services/rounds/roundRosterChannel';
import { activeRoundSession } from '@/services/activeRoundSession';
import { scoringLogger } from '@/utils/debugLogger';
import { useScorecardStore } from '@/store/scorecardStore';
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
  submitScorecards: (options?: { bypassed?: boolean; playerIds?: string[] }) => Promise<{ alreadySubmitted: boolean }>;
  resetRound: () => void;
  onIncompleteRound: (completedCount: number) => void;
  onSubmitError: () => void;
  onCloseIncompleteDialog: () => void;
}

export interface UseScorecardSubmissionReturn {
  handleSubmit: () => Promise<void>;
  performSubmit: () => Promise<void>;
  handleDeleteRound: () => void;
  /** Dialog config for confirmations/errors - parent should render ConfirmationDialog */
  dialogConfig: DialogConfig;
  /** Dismiss the dialog */
  dismissDialog: () => void;
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
  // Confirmation dialog hook
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // Shared soft-delete mutation (handles RPC, local cleanup, and Undo toast)
  const deleteRoundMutation = useDeleteRound();

  // Perform the actual submission (navigates to review screen)
  // Note: Skins finalization happens only when submitting from ReviewScorecard
  const performSubmit = useCallback(async () => {
    onCloseIncompleteDialog();
    scoringLogger.info('SUBMIT: Starting scorecard submission', {
      roundId: roundId?.substring(0, 8),
      competitionId: competitionId?.substring(0, 8),
      playerCount,
    });
    try {
      const { allowedPlayerIds, groupScorecards } = useScorecardStore.getState();
      const scopeIds = allowedPlayerIds.length > 0 ? allowedPlayerIds : [...groupScorecards.keys()];
      await submitScorecards({ playerIds: scopeIds });
      scoringLogger.info('SUBMIT: Scorecard submission successful');

      // Round is submitted — clear the resume-on-launch session.
      void activeRoundSession.clear();

      // Navigate to review screen - skins finalization happens there on final submit
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
  ]);

  // Handle submit button press with completion check
  const handleSubmit = useCallback(async () => {
    const completedCount = getCompletedHolesCount();
    scoringLogger.info('SUBMIT: Submit button pressed', {
      completedHoles: completedCount,
      totalHoles: holes.length,
      isComplete: completedCount === holes.length,
    });
    if (completedCount < holes.length) {
      onIncompleteRound(completedCount);
    } else {
      await performSubmit();
    }
  }, [getCompletedHolesCount, performSubmit, onIncompleteRound]);

  // Perform the actual delete operation
  const performDelete = useCallback(async () => {
    try {
      await deleteRoundMutation.mutateAsync({ roundId });
      await sendRoundEvent(roundId, 'round_deleted');
      await activeRoundSession.clear();
      resetRound();
      navigation.goBack();
    } catch (error) {
      console.error('[ScorecardEntryScreen] Error deleting round:', error);
      showAlert('Error', 'Failed to delete round. Please try again.');
    }
  }, [roundId, deleteRoundMutation, navigation, resetRound, showAlert]);

  // Push the latest scores first so the Undo toast restores everything
  const syncThenDelete = useCallback(async () => {
    const cards = [...useScorecardStore.getState().groupScorecards.values()];
    const synced = await syncRoundNow(roundId, cards);
    if (synced) {
      await performDelete();
      return;
    }
    showDialog({
      title: 'Delete Round',
      message: "Some scores haven't uploaded. Delete anyway?",
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      icon: 'trash-can-outline',
      onConfirm: () => {
        dismissDialog();
        void performDelete();
      },
    });
  }, [roundId, performDelete, showDialog, dismissDialog]);

  // Delete a standalone round
  const handleDeleteRound = useCallback(() => {
    showDialog({
      title: 'Delete Round',
      message: 'Delete this round? You can undo for a few seconds afterwards.',
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      icon: 'trash-can-outline',
      onConfirm: () => {
        dismissDialog();
        void syncThenDelete();
      },
    });
  }, [showDialog, dismissDialog, syncThenDelete]);

  return {
    handleSubmit,
    performSubmit,
    handleDeleteRound,
    dialogConfig,
    dismissDialog,
  };
}
