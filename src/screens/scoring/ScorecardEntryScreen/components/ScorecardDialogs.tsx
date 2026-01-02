/**
 * ScorecardDialogs Component
 *
 * Renders all confirmation and error dialogs:
 * - Leave confirmation (unsaved changes)
 * - Incomplete round confirmation
 * - Submit error dialog
 */

import React from 'react';
import { ConfirmationDialog } from '@/components/common';

export interface ScorecardDialogsProps {
  // Leave dialog
  showLeaveDialog: boolean;
  pendingSyncCount: number;
  onLeaveConfirm: () => void;
  onLeaveCancel: () => void;
  // Incomplete dialog
  showIncompleteDialog: boolean;
  completedHolesCount: number;
  onIncompleteConfirm: () => void;
  onIncompleteCancel: () => void;
  // Submit error dialog
  showSubmitErrorDialog: boolean;
  onSubmitErrorDismiss: () => void;
}

export function ScorecardDialogs({
  // Leave dialog
  showLeaveDialog,
  pendingSyncCount,
  onLeaveConfirm,
  onLeaveCancel,
  // Incomplete dialog
  showIncompleteDialog,
  completedHolesCount,
  onIncompleteConfirm,
  onIncompleteCancel,
  // Submit error dialog
  showSubmitErrorDialog,
  onSubmitErrorDismiss,
}: ScorecardDialogsProps) {
  return (
    <>
      {/* Leave Confirmation Dialog */}
      <ConfirmationDialog
        visible={showLeaveDialog}
        title="Unsaved Changes"
        message={`You have ${pendingSyncCount} unsaved change${pendingSyncCount !== 1 ? 's' : ''}. Your progress will be saved automatically.`}
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={onLeaveConfirm}
        onCancel={onLeaveCancel}
        icon="content-save-outline"
      />

      {/* Incomplete Round Confirmation Dialog */}
      <ConfirmationDialog
        visible={showIncompleteDialog}
        title="Incomplete Round"
        message={`You have only completed ${completedHolesCount} of 18 holes. Submit anyway?`}
        confirmLabel="Submit"
        cancelLabel="Continue Scoring"
        onConfirm={onIncompleteConfirm}
        onCancel={onIncompleteCancel}
        icon="alert-circle-outline"
      />

      {/* Submit Error Dialog */}
      <ConfirmationDialog
        visible={showSubmitErrorDialog}
        title="Submit Failed"
        message="Failed to submit scorecards. Your scores are saved locally and will sync when connection is restored."
        confirmLabel="OK"
        cancelLabel="Dismiss"
        onConfirm={onSubmitErrorDismiss}
        onCancel={onSubmitErrorDismiss}
        icon="cloud-off-outline"
      />
    </>
  );
}
