/**
 * useTeamMatchPlayState
 *
 * Manages match-level state for team match play:
 * - Hole results tracking
 * - Match status computation
 * - Match completion detection (dormie)
 * - Holes won counts
 * - Match submission
 * - Score update effect (syncs hole results when scores change)
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useConfirmationDialog } from '@/hooks';
import { teamMatchPlayLogger } from '@/utils/debugLogger';
import {
  calculateTeamMatchStatus,
  getTeamMatchStatusText,
  getTeamMatchStatusDisplay,
  countHolesWon,
} from '../utils';
import type { TeamHoleResult, MatchTeam, TeamMatchStatus } from '../types';

interface UseTeamMatchPlayStateParams {
  team1: MatchTeam;
  team2: MatchTeam;
  currentHole: number;
  team1BestScore: number | null;
  team2BestScore: number | null;
  currentHoleWinner: 'team1' | 'team2' | 'halved' | null;
  getPlayerScoreValue: (playerId: string) => number | null;
  onSubmitSuccess: () => void;
  /**
   * Optional persistence callback invoked on match submission.
   * For split team rounds, the screen wires this to useUpdateSubMatchResult
   * so the completed sub-match writes result + final_differential to the DB,
   * enabling the Ryder-Cup aggregate on MatchTab to reflect the outcome.
   *
   * `differential` is the absolute hole lead at close (e.g. 3 for a 3&2 win,
   * 1 for 1-up, 0 for halved).
   */
  onPersistResult?: (args: {
    winner: 'team1' | 'team2' | 'halved';
    differential: number;
  }) => Promise<void>;
}

export function useTeamMatchPlayState({
  team1,
  team2,
  currentHole,
  team1BestScore,
  team2BestScore,
  currentHoleWinner,
  getPlayerScoreValue,
  onSubmitSuccess,
  onPersistResult,
}: UseTeamMatchPlayStateParams) {
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // State
  const [holeResults, setHoleResults] = useState<Record<number, TeamHoleResult>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update hole results whenever the current-hole derivation changes.
  //
  // No guard on "at least one side has a score" — if both teams transition to
  // null (e.g. every member on both sides picks up, or scores are cleared),
  // the stale winner must be overwritten, otherwise the per-team match-status
  // badge reflects a hole that is no longer decided.
  useEffect(() => {
    setHoleResults((prev) => {
      const current = prev[currentHole] || {
        team1Score: null,
        team2Score: null,
        team1PlayerScores: {},
        team2PlayerScores: {},
        winner: null,
      };

      // Build player scores
      const team1PlayerScores: Record<string, number | null> = {};
      for (const member of team1.members) {
        team1PlayerScores[member.id] = getPlayerScoreValue(member.id);
      }

      const team2PlayerScores: Record<string, number | null> = {};
      for (const member of team2.members) {
        team2PlayerScores[member.id] = getPlayerScoreValue(member.id);
      }

      const newResult: TeamHoleResult = {
        ...current,
        team1Score: team1BestScore,
        team2Score: team2BestScore,
        team1PlayerScores,
        team2PlayerScores,
        winner: currentHoleWinner,
      };

      return {
        ...prev,
        [currentHole]: newResult,
      };
    });
  }, [
    currentHole,
    team1BestScore,
    team2BestScore,
    currentHoleWinner,
    team1.members,
    team2.members,
    getPlayerScoreValue,
  ]);

  // Calculate match status
  const matchStatus: TeamMatchStatus = useMemo(
    () => calculateTeamMatchStatus(holeResults),
    [holeResults]
  );
  const isMatchComplete = matchStatus.status === 'complete';
  const matchStatusText = useMemo(
    () => getTeamMatchStatusText(matchStatus, team1.name, team2.name),
    [matchStatus, team1.name, team2.name]
  );

  // Calculate per-team match status
  const team1MatchStatus = useMemo(
    () => getTeamMatchStatusDisplay(matchStatus, 'team1'),
    [matchStatus]
  );
  const team2MatchStatus = useMemo(
    () => getTeamMatchStatusDisplay(matchStatus, 'team2'),
    [matchStatus]
  );

  // Count holes won
  const holesWon = useMemo(() => countHolesWon(holeResults), [holeResults]);

  // Submit match result
  const handleSubmitMatch = useCallback(async () => {
    if (!isMatchComplete) {
      showAlert('Match Not Complete', 'The match must be finished before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (matchStatus.status === 'complete' && onPersistResult) {
        // Hole lead at close. For halved matches both teams share the count.
        const differential =
          matchStatus.winner === 'halved'
            ? 0
            : Math.abs(holesWon.team1 - holesWon.team2);

        await onPersistResult({
          winner: matchStatus.winner,
          differential,
        });
      }

      showDialog({
        title: 'Match Submitted',
        message: matchStatusText,
        confirmLabel: 'OK',
        cancelLabel: '',
        icon: 'check-circle-outline',
        onConfirm: () => {
          dismissDialog();
          onSubmitSuccess();
        },
      });
    } catch (err) {
      teamMatchPlayLogger.error('Failed to submit match result', err);
      showAlert('Error', 'Failed to submit match result. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isMatchComplete,
    matchStatus,
    matchStatusText,
    onSubmitSuccess,
    onPersistResult,
    holesWon.team1,
    holesWon.team2,
    showAlert,
    showDialog,
    dismissDialog,
  ]);

  return {
    holeResults,
    isSubmitting,
    matchStatus,
    isMatchComplete,
    matchStatusText,
    team1MatchStatus,
    team2MatchStatus,
    holesWon,
    handleSubmitMatch,
    // Dialog passthrough
    dialogConfig,
    showDialog,
    showAlert,
    dismissDialog,
  };
}
