/**
 * ScorecardDialogs Component
 *
 * Renders all confirmation and error dialogs:
 * - Incomplete round confirmation
 * - Submit error dialog
 */

import React from 'react';
import { ConfirmationDialog } from '@/components/common';

export interface ScorecardDialogsProps {
  // Incomplete dialog
  showIncompleteDialog: boolean;
  completedHolesCount: number;
  /** Total scorable holes for the round (9 for front/back nine, 18 for full). */
  totalHolesCount: number;
  onIncompleteConfirm: () => void;
  onIncompleteCancel: () => void;
  // Submit error dialog
  showSubmitErrorDialog: boolean;
  onSubmitErrorDismiss: () => void;
}

export function ScorecardDialogs({
  // Incomplete dialog
  showIncompleteDialog,
  completedHolesCount,
  totalHolesCount,
  onIncompleteConfirm,
  onIncompleteCancel,
  // Submit error dialog
  showSubmitErrorDialog,
  onSubmitErrorDismiss,
}: ScorecardDialogsProps) {
  return (
    <>
      {/* Incomplete Round Confirmation Dialog */}
      <ConfirmationDialog
        visible={showIncompleteDialog}
        title="Incomplete Round"
        message={`You have only completed ${completedHolesCount} of ${totalHolesCount} holes. Submit anyway?`}
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
