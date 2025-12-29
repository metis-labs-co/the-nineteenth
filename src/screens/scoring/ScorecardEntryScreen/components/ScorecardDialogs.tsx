/**
 * ScorecardDialogs Component
 *
 * Renders all confirmation and error dialogs:
 * - Leave confirmation (unsaved changes)
 * - Incomplete round confirmation
 * - Submit error dialog
 * - Debug panel
 */

import React from 'react';
import { ConfirmationDialog } from '@/components/common';
import { ScorecardDebugPanel } from '@/components/scorecard';
import type { Player } from '@/types';
import type { TeamFormat, TeamWithMembers } from '@/types/database.types';

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
  // Debug panel
  showDebugPanel: boolean;
  onDebugPanelClose: () => void;
  roundId: string;
  competitionId: string;
  courseName: string | null;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  teams: TeamWithMembers[];
  scoringPairsEnabled: boolean;
  playersToScore: Player[];
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
  // Debug panel
  showDebugPanel,
  onDebugPanelClose,
  roundId,
  competitionId,
  courseName,
  isTeamRound,
  teamFormat,
  teams,
  scoringPairsEnabled,
  playersToScore,
}: ScorecardDialogsProps) {
  return (
    <>
      {/* Debug Panel */}
      <ScorecardDebugPanel
        visible={showDebugPanel}
        onClose={onDebugPanelClose}
        roundId={roundId}
        competitionId={competitionId}
        courseName={courseName}
        isTeamRound={isTeamRound}
        teamFormat={teamFormat}
        teams={teams}
        scoringPairsEnabled={scoringPairsEnabled}
        playersToScore={playersToScore}
      />

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
