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
}: UseTeamMatchPlayStateParams) {
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // State
  const [holeResults, setHoleResults] = useState<Record<number, TeamHoleResult>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update hole results when scores change
  useEffect(() => {
    if (team1BestScore !== null || team2BestScore !== null) {
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
    }
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
      // TODO: Submit match result to API
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
    } catch {
      showAlert('Error', 'Failed to submit match result. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isMatchComplete, matchStatusText, onSubmitSuccess, showAlert, showDialog, dismissDialog]);

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
