/**
 * Match play calculation utilities
 */

import type { MatchStatus, HoleResult, PlayerMatchStatus } from '../types';
import { resolveEndedAfter } from '@/utils/matchPlayResult';

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
 * Calculate match status from hole results.
 *
 * `totalHoles` is the planned hole count (9 or 18). Margins:
 * - closed out with holes still to play → "N & M"
 * - no holes left → "N up", or "All Square" when level — never "N & 0" (I10)
 *
 * `holesPlayed` (a positive count below `totalHoles`) means the round ended
 * early after that many holes: a close-out reached against the planned holes
 * stands; otherwise, once `holesPlayed` holes are decided, the leader wins
 * "N up" (level = "All Square"). For this ended path, callers must enumerate
 * planned holes (or a running physical prefix) with explicit null winners for
 * undecided holes; sparse maps cannot identify the physical cutoff.
 */
export function calculateMatchStatus(
  holeResults: Record<number, HoleResult>,
  totalHoles: number = 18,
  holesPlayed?: number | null
): MatchStatus {
  const endedAfter = resolveEndedAfter(totalHoles, holesPlayed);
  if (endedAfter !== null) {
    return calculateEndedEarlyMatchStatus(holeResults, totalHoles, endedAfter);
  }

  let player1Up = 0;
  let decidedHoles = 0;

  // Iterate the actual hole results — keys are real hole numbers (10..18 on
  // back-9 / 10..27 on combo rounds), so a 1..totalHoles counter would skip
  // everything for back-9 and miss combo holes entirely.
  for (const result of Object.values(holeResults)) {
    if (result?.winner) {
      decidedHoles++;
      if (result.winner === 'player1') {
        player1Up++;
      } else if (result.winner === 'player2') {
        player1Up--;
      }
    }
  }

  const holesRemaining = totalHoles - decidedHoles;
  const absLead = Math.abs(player1Up);

  // No holes left to play: the match went the distance, so the leader wins
  // "N up" and a level match is halved. This must run BEFORE the close-out
  // check — with 0 remaining any lead is "> holesRemaining", which used to
  // report a last-hole win as "N & 0" (invariant I10).
  if (holesRemaining <= 0) {
    if (player1Up === 0) {
      return { status: 'complete', winner: 'halved', margin: 'All Square' };
    }
    const winner = player1Up > 0 ? 'player1' : 'player2';
    return { status: 'complete', winner, margin: `${absLead} up` };
  }

  // Closed out early: the lead is bigger than the holes left to play.
  if (absLead > holesRemaining) {
    const winner = player1Up > 0 ? 'player1' : 'player2';
    const margin = `${absLead} & ${holesRemaining}`;
    return { status: 'complete', winner, margin };
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
 * Walk the first `endedAfter` physical entries before skipping undecided holes.
 * The first close-out against the planned count stands; otherwise all retained
 * holes must be decided to settle the final lead. A partial running prefix
 * stays in progress against the planned count.
 */
function calculateEndedEarlyMatchStatus(
  holeResults: Record<number, HoleResult>,
  totalHoles: number,
  endedAfter: number
): MatchStatus {
  const holeNumbers = Object.keys(holeResults)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, endedAfter);
  let player1Up = 0;
  let decidedHoles = 0;

  for (const holeNumber of holeNumbers) {
    const holeWinner = holeResults[holeNumber]?.winner;
    if (!holeWinner) continue;
    decidedHoles++;
    if (holeWinner === 'player1') player1Up++;
    else if (holeWinner === 'player2') player1Up--;

    const plannedRemaining = totalHoles - decidedHoles;
    const lead = Math.abs(player1Up);
    if (lead > plannedRemaining) {
      const closedOutBy = player1Up > 0 ? 'player1' : 'player2';
      return { status: 'complete', winner: closedOutBy, margin: `${lead} & ${plannedRemaining}` };
    }
  }

  const absLead = Math.abs(player1Up);
  const ahead = player1Up > 0 ? 'player1' : 'player2';

  if (decidedHoles < endedAfter) {
    const holesRemaining = totalHoles - decidedHoles;
    if (player1Up === 0) {
      return { status: 'in_progress', leader: null, holesUp: 0, holesRemaining };
    }
    return { status: 'in_progress', leader: ahead, holesUp: absLead, holesRemaining };
  }

  if (player1Up === 0) {
    return { status: 'complete', winner: 'halved', margin: 'All Square' };
  }
  return { status: 'complete', winner: ahead, margin: `${absLead} up` };
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
 * @returns PlayerMatchStatus with text like "1 UP", "2 DN", "A/S"
 */
export function getPlayerMatchStatus(
  matchStatus: MatchStatus,
  player: 'player1' | 'player2'
): PlayerMatchStatus {
  // Match complete
  if (matchStatus.status === 'complete') {
    if (matchStatus.winner === 'halved') {
      return {
        text: 'A/S',
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
      text: 'A/S',
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
