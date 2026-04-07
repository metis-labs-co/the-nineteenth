/**
 * MatchPlayScorecardTable Utilities
 *
 * Helper functions for calculating match play data and formatting status text.
 */

import { PICKUP_SCORE } from '@/constants/scoring';
import { getInitials } from '@/utils/displayHelpers';
import {
  determineHoleWinner,
  calculateMatchStatus,
} from '@/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations';
import type { HoleResult, MatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/types';
import type { Hole } from '@/types/database.types';
import type { CalculatedData } from './types';

/**
 * Calculate all match play data from holes and scores.
 */
export function calculateAllData(
  holes: Hole[],
  player1Id: string,
  player2Id: string,
  getPlayerScore: (playerId: string, holeNumber: number) => number | undefined
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

  // Calculate results for each hole
  for (let holeNum = 1; holeNum <= 18; holeNum++) {
    const hole = holes.find((h) => h.number === holeNum);
    if (!hole) continue;

    const p1Score = getPlayerScore(player1Id, holeNum) ?? null;
    const p2Score = getPlayerScore(player2Id, holeNum) ?? null;

    const p1PickedUp = p1Score !== null && p1Score >= PICKUP_SCORE;
    const p2PickedUp = p2Score !== null && p2Score >= PICKUP_SCORE;

    const winner = determineHoleWinner(
      p1PickedUp ? null : p1Score,
      p2PickedUp ? null : p2Score
    );

    holeResults[holeNum] = {
      player1Score: p1Score,
      player2Score: p2Score,
      player1PickedUp: p1PickedUp,
      player2PickedUp: p2PickedUp,
      winner: p1PickedUp && !p2PickedUp ? 'player2' : p2PickedUp && !p1PickedUp ? 'player1' : winner,
    };

    // Calculate running status up to this hole
    runningStatus[holeNum] = calculateMatchStatus(holeResults);

    // Accumulate totals
    const isFront9 = holeNum <= 9;
    if (isFront9) {
      front9Par += hole.par;
      if (p1Score !== null && !p1PickedUp) {
        front9P1 += p1Score;
        front9Played++;
      }
      if (p2Score !== null && !p2PickedUp) {
        front9P2 += p2Score;
      }
    } else {
      back9Par += hole.par;
      if (p1Score !== null && !p1PickedUp) {
        back9P1 += p1Score;
        back9Played++;
      }
      if (p2Score !== null && !p2PickedUp) {
        back9P2 += p2Score;
      }
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
