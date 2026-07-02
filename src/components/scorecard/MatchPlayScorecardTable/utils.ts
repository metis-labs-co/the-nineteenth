/**
 * MatchPlayScorecardTable Utilities
 *
 * Helper functions for calculating match play data and formatting status text.
 */

import { getMatchPlayStrokes } from '@/utils/scoring';
import { getInitials } from '@/utils/displayHelpers';
import { PICKUP_SCORE } from '@/constants/scoring';
import {
  determineHoleWinner,
  calculateMatchStatus,
} from '@/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations';
import type { HoleResult, MatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/types';
import type { Hole } from '@/types/database.types';
import type { CalculatedData } from './types';

/**
 * Calculate all match play data from holes and scores.
 *
 * Hole winners are determined on net strokes (gross minus strokes received
 * via each player's playing handicap and the hole's stroke index), matching
 * the live match status shown on the score entry screen.
 */
export function calculateAllData(
  holes: Hole[],
  player1Id: string,
  player2Id: string,
  getPlayerScore: (playerId: string, holeNumber: number) => number | undefined,
  player1Handicap = 0,
  player2Handicap = 0
): CalculatedData {
  const holeResults: Record<number, HoleResult> = {};
  const runningStatus: Record<number, MatchStatus> = {};

  let front9Par = 0;
  let front9P1 = 0;
  let front9P2 = 0;
  let front9Played = 0;

  let back9Par = 0;
  let back9P1 = 0;
  let back9P2 = 0;
  let back9Played = 0;

  // Iterate the round's actual holes — back-9 / combo rounds carry numbers
  // 10..18 (or 10..27), so a 1..18 counter would skip them entirely.
  for (const hole of holes) {
    const holeNum = hole.number;

    const p1Score = getPlayerScore(player1Id, holeNum) ?? null;
    const p2Score = getPlayerScore(player2Id, holeNum) ?? null;

    // A pickup (conceded hole) is the explicit PICKUP_SCORE sentinel, set only
    // via the Pick Up action — never inferred from a high score, so a genuine
    // blow-up is recorded and scored on merit (matching the entry screen).
    // Difference method: only the handicap difference is allocated, entirely to
    // the higher-handicap player, so the displayed shots match the match result.
    const { a: p1Strokes, b: p2Strokes } = getMatchPlayStrokes(
      player1Handicap,
      player2Handicap,
      hole.strokeIndex
    );
    const p1PickedUp = p1Score === PICKUP_SCORE;
    const p2PickedUp = p2Score === PICKUP_SCORE;

    // "Has a stroke score" = a recorded score that isn't a concession.
    const p1HasScore = p1Score !== null && !p1PickedUp;
    const p2HasScore = p2Score !== null && !p2PickedUp;

    // Compare net scores so handicap strokes received on the hole decide the winner.
    const p1NetScore = p1HasScore ? p1Score - p1Strokes : null;
    const p2NetScore = p2HasScore ? p2Score - p2Strokes : null;

    const netWinner = determineHoleWinner(p1NetScore, p2NetScore);

    // A concession only hands over the hole once the opponent has actually
    // recorded a score; mutual concessions are halved.
    let winner: 'player1' | 'player2' | 'halved' | null;
    if (p1PickedUp && p2PickedUp) {
      winner = 'halved';
    } else if (p1PickedUp) {
      winner = p2HasScore ? 'player2' : null;
    } else if (p2PickedUp) {
      winner = p1HasScore ? 'player1' : null;
    } else {
      winner = netWinner;
    }

    holeResults[holeNum] = {
      player1Score: p1Score,
      player2Score: p2Score,
      player1PickedUp: p1PickedUp,
      player2PickedUp: p2PickedUp,
      winner,
    };

    // Calculate running status up to this hole
    runningStatus[holeNum] = calculateMatchStatus(holeResults);

    // Accumulate totals (gross).
    // Count the hole as played if either player has a non-pickup score.
    const p1Counts = p1Score !== null && !p1PickedUp;
    const p2Counts = p2Score !== null && !p2PickedUp;
    const holePlayed = p1Counts || p2Counts;
    const isFront9 = holeNum <= 9;
    if (isFront9) {
      front9Par += hole.par;
      if (p1Counts) front9P1 += p1Score;
      if (p2Counts) front9P2 += p2Score;
      if (holePlayed) front9Played++;
    } else {
      back9Par += hole.par;
      if (p1Counts) back9P1 += p1Score;
      if (p2Counts) back9P2 += p2Score;
      if (holePlayed) back9Played++;
    }
  }

  return {
    holeResults,
    runningStatus,
    front9: {
      par: front9Par,
      player1: front9P1,
      player2: front9P2,
      holesPlayed: front9Played,
    },
    back9: {
      par: back9Par,
      player1: back9P1,
      player2: back9P2,
      holesPlayed: back9Played,
    },
    total: {
      par: front9Par + back9Par,
      player1: front9P1 + back9P1,
      player2: front9P2 + back9P2,
      holesPlayed: front9Played + back9Played,
    },
    finalStatus: calculateMatchStatus(holeResults),
  };
}

/**
 * Format a match status into display text.
 */
export function getRunningStatusText(
  status: MatchStatus | undefined,
  player1Name: string,
  player2Name: string
): string {
  if (!status) return '-';

  if (status.status === 'complete') {
    if (status.winner === 'halved') {
      return 'HALVED';
    }
    const winnerInitials = getInitials(status.winner === 'player1' ? player1Name : player2Name);
    return `${winnerInitials} ${status.margin}`;
  }

  if (status.leader === null) {
    return 'AS';
  }

  const leaderInitials = getInitials(status.leader === 'player1' ? player1Name : player2Name);
  return `${leaderInitials} ${status.holesUp} UP`;
}
