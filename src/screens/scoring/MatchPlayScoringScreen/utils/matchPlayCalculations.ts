/**
 * Match play calculation utilities
 */

import type { MatchStatus, HoleResult, PlayerMatchStatus } from '../types';

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
export function calculateMatchStatus(
  holeResults: Record<number, HoleResult>,
  totalHoles: number = 18
): MatchStatus {
  let player1Up = 0;
  let holesPlayed = 0;

  for (let i = 1; i <= totalHoles; i++) {
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

  const holesRemaining = totalHoles - holesPlayed;
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

/**
 * Get individual player's match status from their perspective
 * @param matchStatus - The overall match status
 * @param player - Which player's perspective ('player1' or 'player2')
 * @returns PlayerMatchStatus with text like "1 UP", "2 DN", "AS"
 */
export function getPlayerMatchStatus(
  matchStatus: MatchStatus,
  player: 'player1' | 'player2'
): PlayerMatchStatus {
  // Match complete
  if (matchStatus.status === 'complete') {
    if (matchStatus.winner === 'halved') {
      return {
        text: 'AS',
        fullText: 'All Square',
        type: 'halved',
        holesUpDown: 0,
      };
    }

    const isWinner = matchStatus.winner === player;
    return {
      text: isWinner ? 'WIN' : 'LOSS',
      fullText: isWinner ? `Won ${matchStatus.margin}` : `Lost ${matchStatus.margin}`,
      type: isWinner ? 'win' : 'loss',
      holesUpDown: 0,
    };
  }

  // Match in progress - all square
  if (matchStatus.leader === null) {
    return {
      text: 'AS',
      fullText: 'All Square',
      type: 'square',
      holesUpDown: 0,
    };
  }

  // Match in progress - one player leading
  const isLeading = matchStatus.leader === player;
  const holesUp = matchStatus.holesUp;

  if (isLeading) {
    return {
      text: `${holesUp} UP`,
      fullText: `${holesUp} Up`,
      type: 'up',
      holesUpDown: holesUp,
    };
  } else {
    return {
      text: `${holesUp} DN`,
      fullText: `${holesUp} Down`,
      type: 'down',
      holesUpDown: -holesUp,
    };
  }
}
