/**
 * useScorecardDialogs Hook
 *
 * Manages all dialog states for the ScorecardEntryScreen:
 * - Incomplete round dialog (when submitting before all holes scored)
 * - Submit error dialog (when submission fails)
 */

import { useState, useCallback } from 'react';

export interface ScorecardDialogState {
  showIncompleteDialog: boolean;
  showSubmitErrorDialog: boolean;
  completedHolesCount: number;
}

export interface ScorecardDialogActions {
  openIncompleteDialog: (completedCount: number) => void;
  closeIncompleteDialog: () => void;
  openSubmitErrorDialog: () => void;
  closeSubmitErrorDialog: () => void;
}

export type UseScorecardDialogsReturn = ScorecardDialogState & ScorecardDialogActions;

export function useScorecardDialogs(): UseScorecardDialogsReturn {
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [showSubmitErrorDialog, setShowSubmitErrorDialog] = useState(false);
  const [completedHolesCount, setCompletedHolesCount] = useState(0);

  // Incomplete dialog actions
  const openIncompleteDialog = useCallback((completedCount: number) => {
    setCompletedHolesCount(completedCount);
    setShowIncompleteDialog(true);
  }, []);

  const closeIncompleteDialog = useCallback(() => {
    setShowIncompleteDialog(false);
  }, []);

  // Submit error dialog actions
  const openSubmitErrorDialog = useCallback(() => {
    setShowSubmitErrorDialog(true);
  }, []);

  const closeSubmitErrorDialog = useCallback(() => {
    setShowSubmitErrorDialog(false);
  }, []);

  return {
    // State
    showIncompleteDialog,
    showSubmitErrorDialog,
    completedHolesCount,
    // Actions
    openIncompleteDialog,
    closeIncompleteDialog,
    openSubmitErrorDialog,
    closeSubmitErrorDialog,
  };
}
