/**
 * useScorecardDialogs Hook
 *
 * Manages all dialog states for the ScorecardEntryScreen:
 * - Leave confirmation dialog (when unsaved changes exist)
 * - Incomplete round dialog (when submitting before all holes scored)
 * - Submit error dialog (when submission fails)
 */

import { useState, useCallback } from 'react';

export interface ScorecardDialogState {
  showLeaveDialog: boolean;
  showIncompleteDialog: boolean;
  showSubmitErrorDialog: boolean;
  completedHolesCount: number;
}

export interface ScorecardDialogActions {
  openLeaveDialog: () => void;
  closeLeaveDialog: () => void;
  openIncompleteDialog: (completedCount: number) => void;
  closeIncompleteDialog: () => void;
  openSubmitErrorDialog: () => void;
  closeSubmitErrorDialog: () => void;
}

export type UseScorecardDialogsReturn = ScorecardDialogState & ScorecardDialogActions;

export function useScorecardDialogs(): UseScorecardDialogsReturn {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [showSubmitErrorDialog, setShowSubmitErrorDialog] = useState(false);
  const [completedHolesCount, setCompletedHolesCount] = useState(0);

  // Leave dialog actions
  const openLeaveDialog = useCallback(() => {
    setShowLeaveDialog(true);
  }, []);

  const closeLeaveDialog = useCallback(() => {
    setShowLeaveDialog(false);
  }, []);

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
    showLeaveDialog,
    showIncompleteDialog,
    showSubmitErrorDialog,
    completedHolesCount,
    // Actions
    openLeaveDialog,
    closeLeaveDialog,
    openIncompleteDialog,
    closeIncompleteDialog,
    openSubmitErrorDialog,
    closeSubmitErrorDialog,
  };
}
