/**
 * Match play calculation utilities
 */

import type { MatchStatus, HoleResult } from '../types';

/**
 * Determine hole winner based on scores
 */
export function determineHoleWinner(
  p1Score: number | null,
  p2Score: number | null
): 'player1' | 'player2' | 'halved' | null {
  if (p1Score === null || p2Score === null) return null;
  if (p1Score < p2Score) return 'player1';
  if (p2Score < p1Score) return 'player2';
  return 'halved';
}

/**
 * Calculate match status from hole results
 */
export function calculateMatchStatus(holeResults: Record<number, HoleResult>): MatchStatus {
  let player1Up = 0;
  let holesPlayed = 0;

  for (let i = 1; i <= 18; i++) {
    const result = holeResults[i];
    if (result?.winner) {
      holesPlayed++;
      if (result.winner === 'player1') {
        player1Up++;
      } else if (result.winner === 'player2') {
        player1Up--;
      }
    }
  }

  const holesRemaining = 18 - holesPlayed;
  const absLead = Math.abs(player1Up);

  // Check for early finish (dormie or beyond)
  if (absLead > holesRemaining) {
    const winner = player1Up > 0 ? 'player1' : 'player2';
    const margin = `${absLead} & ${holesRemaining}`;
    return { status: 'complete', winner, margin };
  }

  // Check if all holes played
  if (holesRemaining === 0) {
    if (player1Up === 0) {
      return { status: 'complete', winner: 'halved', margin: 'All Square' };
    }
    const winner = player1Up > 0 ? 'player1' : 'player2';
    return { status: 'complete', winner, margin: `${absLead} up` };
  }

  // Match in progress
  if (player1Up === 0) {
    return { status: 'in_progress', leader: null, holesUp: 0, holesRemaining };
  }

  return {
    status: 'in_progress',
    leader: player1Up > 0 ? 'player1' : 'player2',
    holesUp: absLead,
    holesRemaining,
  };
}

/**
 * Get match status text
 */
export function getMatchStatusText(
  matchStatus: MatchStatus,
  player1Name: string,
  player2Name: string
): string {
  if (matchStatus.status === 'complete') {
    const winnerName = matchStatus.winner === 'player1'
      ? player1Name
      : matchStatus.winner === 'player2'
        ? player2Name
        : null;

    if (matchStatus.winner === 'halved') {
      return 'Match Halved';
    }
    return `${winnerName} wins ${matchStatus.margin}`;
  }

  if (matchStatus.leader === null) {
    return `All Square with ${matchStatus.holesRemaining} to play`;
  }

  const leaderName = matchStatus.leader === 'player1' ? player1Name : player2Name;
  return `${leaderName} is ${matchStatus.holesUp} up with ${matchStatus.holesRemaining} to play`;
}
