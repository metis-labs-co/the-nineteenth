/**
 * useMatchPlayScoring Hook
 *
 * Manages match play score entry and match calculations.
 * Uses the scorecard store for persistence while deriving match-specific state locally.
 *
 * Features:
 * - Score updates persisted to scorecard store (SQLite + sync)
 * - Match status calculated from stored scores
 * - Hole results derived on-the-fly
 * - Pickup (conceded hole) recorded as the explicit PICKUP_SCORE sentinel
 */

import { useCallback, useMemo } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { getMatchPlayStrokes } from '@/utils/scoring';
import { PICKUP_SCORE } from '@/constants/scoring';
import { isSingleBallScore } from '@/types/database/base';
import {
  determineHoleWinner,
  calculateMatchStatus,
  getMatchStatusText,
  getPlayerMatchStatus,
} from '@/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations';
import type { HoleResult, MatchStatus, PlayerMatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/types';

interface UseMatchPlayScoringParams {
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  player1Handicap: number;
  player2Handicap: number;
  currentHole: number;
}

interface UseMatchPlayScoringResult {
  /** Handle score selection for a player */
  handleScoreSelect: (player: 'player1' | 'player2', score: number) => void;
  /** Handle score increment/decrement for a player */
  handleScoreAdjust: (player: 'player1' | 'player2', delta: number) => void;
  /** Handle pickup (concede hole) for a player */
  handlePickUp: (player: 'player1' | 'player2') => void;
  /** Get hole result for a specific hole */
  getHoleResult: (holeNumber: number) => HoleResult;
  /** Get all hole results as a record */
  holeResults: Record<number, HoleResult>;
  /** Current match status */
  matchStatus: MatchStatus;
  /** Human-readable match status text */
  matchStatusText: string;
  /** Whether the match is complete */
  isMatchComplete: boolean;
  /** Player 1's match status from their perspective */
  player1MatchStatus: PlayerMatchStatus;
  /** Player 2's match status from their perspective */
  player2MatchStatus: PlayerMatchStatus;
  /** Get current score for a player on current hole */
  getPlayerScore: (player: 'player1' | 'player2') => number | null;
  /** Check if a player has picked up on current hole */
  isPlayerPickedUp: (player: 'player1' | 'player2') => boolean;
  /** Get score color based on par */
  getScoreColor: (score: number | null, par: number, colors: ScoreColors) => string;
}

interface ScoreColors {
  textSecondary: string;
  birdie: string;
  par: string;
  bogey: string;
  doubleBogey: string;
}

// Score bounds. Manual entry stops one below the pickup sentinel so a genuine
// blow-up score is never mistaken for a concession — PICKUP_SCORE is reserved
// for the explicit Pick Up action.
const MIN_SCORE = 1;
const MAX_SCORE = PICKUP_SCORE - 1;

/**
 * Hook for managing match play scoring with store persistence.
 */
export function useMatchPlayScoring({
  player1Id,
  player2Id,
  player1Name,
  player2Name,
  player1Handicap,
  player2Handicap,
  currentHole,
}: UseMatchPlayScoringParams): UseMatchPlayScoringResult {
  // Get store functions and data
  // IMPORTANT: We need groupScorecards in the dependency to trigger re-renders when scores change
  const { setPlayerScore, getHoleInfo, holes, groupScorecards } = useScorecardStore();

  // Build hole results from store scores
  // Note: We read directly from groupScorecards to ensure reactivity when scores change
  const holeResults = useMemo(() => {
    const results: Record<number, HoleResult> = {};

    // Get scorecards for both players
    const p1Scorecard = groupScorecards.get(player1Id);
    const p2Scorecard = groupScorecards.get(player2Id);

    // Iterate the round's actual holes — back-9 / combo rounds carry hole
    // numbers 10..18 (or 10..27), and a 1..18 counter would skip the
    // played holes entirely and key results against the wrong numbers.
    for (const holeInfo of holes) {
      const h = holeInfo.number;
      const strokeIndex = holeInfo.strokeIndex;

      const p1RawScore = p1Scorecard?.scores[h];
      const p2RawScore = p2Scorecard?.scores[h];

      // Extract strokes from score object
      const p1Score =
        p1RawScore && isSingleBallScore(p1RawScore) && p1RawScore.strokes !== undefined
          ? p1RawScore.strokes
          : null;
      const p2Score =
        p2RawScore && isSingleBallScore(p2RawScore) && p2RawScore.strokes !== undefined
          ? p2RawScore.strokes
          : null;

      // A pickup (conceded hole) is the explicit PICKUP_SCORE sentinel, set
      // only via the Pick Up action — never inferred from a high score, so a
      // genuine blow-up (e.g. a real double bogey) is recorded as scored.
      const p1PickedUp = p1Score === PICKUP_SCORE;
      const p2PickedUp = p2Score === PICKUP_SCORE;

      // "Has a stroke score" = a recorded score that isn't a concession.
      const p1HasScore = p1Score !== null && !p1PickedUp;
      const p2HasScore = p2Score !== null && !p2PickedUp;

      // Determine winner
      let winner: 'player1' | 'player2' | 'halved' | null = null;

      if (p1PickedUp && p2PickedUp) {
        // Both conceded = halved.
        winner = 'halved';
      } else if (p1PickedUp) {
        // Player 1 conceded — Player 2 takes the hole, but only once they have
        // actually recorded a stroke score; otherwise the hole stays undecided.
        winner = p2HasScore ? 'player2' : null;
      } else if (p2PickedUp) {
        // Player 2 conceded — Player 1 takes the hole only if they have a score.
        winner = p1HasScore ? 'player1' : null;
      } else {
        // Compare net scores using match-play difference method (higher handicap gets all strokes)
        const { a: p1StrokesReceived, b: p2StrokesReceived } = getMatchPlayStrokes(
          player1Handicap,
          player2Handicap,
          strokeIndex
        );
        const p1NetScore = p1Score !== null ? p1Score - p1StrokesReceived : null;
        const p2NetScore = p2Score !== null ? p2Score - p2StrokesReceived : null;
        winner = determineHoleWinner(p1NetScore, p2NetScore);
      }

      results[h] = {
        player1Score: p1PickedUp ? null : p1Score,
        player2Score: p2PickedUp ? null : p2Score,
        player1PickedUp: p1PickedUp,
        player2PickedUp: p2PickedUp,
        winner,
      };
    }

    return results;
  }, [player1Id, player2Id, player1Handicap, player2Handicap, holes, groupScorecards]);

  // Calculate match status from hole results
  const matchStatus = useMemo(() => calculateMatchStatus(holeResults), [holeResults]);
  const isMatchComplete = matchStatus.status === 'complete';
  const matchStatusText = useMemo(
    () => getMatchStatusText(matchStatus, player1Name, player2Name),
    [matchStatus, player1Name, player2Name]
  );

  // Calculate per-player match status
  const player1MatchStatus = useMemo(
    () => getPlayerMatchStatus(matchStatus, 'player1'),
    [matchStatus]
  );
  const player2MatchStatus = useMemo(
    () => getPlayerMatchStatus(matchStatus, 'player2'),
    [matchStatus]
  );

  // Get hole result for a specific hole
  const getHoleResult = useCallback(
    (holeNumber: number): HoleResult => {
      return (
        holeResults[holeNumber] || {
          player1Score: null,
          player2Score: null,
          player1PickedUp: false,
          player2PickedUp: false,
          winner: null,
        }
      );
    },
    [holeResults]
  );

  // Get current hole's par
  const currentHolePar = useMemo(() => {
    const holeInfo = getHoleInfo(currentHole);
    return holeInfo?.par ?? 4;
  }, [currentHole, getHoleInfo]);

  // Handle score selection
  // Note: We allow score edits even after match is complete - scores are only locked after submission
  const handleScoreSelect = useCallback(
    (player: 'player1' | 'player2', score: number) => {
      const playerId = player === 'player1' ? player1Id : player2Id;
      setPlayerScore(playerId, currentHole, score);
    },
    [player1Id, player2Id, currentHole, setPlayerScore]
  );

  // Handle score adjustment
  // Note: We allow score edits even after match is complete - scores are only locked after submission
  const handleScoreAdjust = useCallback(
    (player: 'player1' | 'player2', delta: number) => {
      const playerId = player === 'player1' ? player1Id : player2Id;
      const currentResult = holeResults[currentHole];
      const currentScore =
        player === 'player1' ? currentResult?.player1Score : currentResult?.player2Score;
      const isPickedUp =
        player === 'player1' ? currentResult?.player1PickedUp : currentResult?.player2PickedUp;

      // If picked up, unset and start fresh
      if (isPickedUp) {
        setPlayerScore(playerId, currentHole, currentHolePar);
        return;
      }

      let newScore: number;
      if (currentScore === null) {
        newScore = currentHolePar;
      } else {
        newScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, currentScore + delta));
      }

      setPlayerScore(playerId, currentHole, newScore);
    },
    [player1Id, player2Id, currentHole, holeResults, setPlayerScore, currentHolePar]
  );

  // Handle pickup
  // Note: We allow score edits even after match is complete - scores are only locked after submission
  const handlePickUp = useCallback(
    (player: 'player1' | 'player2') => {
      const playerId = player === 'player1' ? player1Id : player2Id;
      const currentResult = holeResults[currentHole];
      const isCurrentlyPickedUp =
        player === 'player1' ? currentResult?.player1PickedUp : currentResult?.player2PickedUp;

      if (isCurrentlyPickedUp) {
        // Toggle off - set back to par
        setPlayerScore(playerId, currentHole, currentHolePar);
      } else {
        // Concede the hole — store the explicit pickup sentinel.
        setPlayerScore(playerId, currentHole, PICKUP_SCORE);
      }
    },
    [player1Id, player2Id, currentHole, currentHolePar, holeResults, setPlayerScore]
  );

  // Get player's current score on current hole
  const getPlayerCurrentScore = useCallback(
    (player: 'player1' | 'player2'): number | null => {
      const result = holeResults[currentHole];
      if (!result) return null;
      return player === 'player1' ? result.player1Score : result.player2Score;
    },
    [holeResults, currentHole]
  );

  // Check if player is picked up on current hole
  const isPlayerPickedUp = useCallback(
    (player: 'player1' | 'player2'): boolean => {
      const result = holeResults[currentHole];
      if (!result) return false;
      return player === 'player1' ? result.player1PickedUp : result.player2PickedUp;
    },
    [holeResults, currentHole]
  );

  // Get score color based on par
  const getScoreColor = useCallback(
    (score: number | null, par: number, colors: ScoreColors): string => {
      if (score === null) return colors.textSecondary;
      if (score < par) return colors.birdie;
      if (score === par) return colors.par;
      if (score === par + 1) return colors.bogey;
      return colors.doubleBogey;
    },
    []
  );

  return {
    handleScoreSelect,
    handleScoreAdjust,
    handlePickUp,
    getHoleResult,
    holeResults,
    matchStatus,
    matchStatusText,
    isMatchComplete,
    player1MatchStatus,
    player2MatchStatus,
    getPlayerScore: getPlayerCurrentScore,
    isPlayerPickedUp,
    getScoreColor,
  };
}
