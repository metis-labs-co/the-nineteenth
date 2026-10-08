/**
 * Team match play calculation utilities
 *
 * Extends patterns from MatchPlayScoringScreen for team-based match play.
 * In team match play, each team's best score counts (best ball format).
 */

import type {
  TeamHoleResult,
  TeamMatchStatus,
  TeamMatchStatusDisplay,
  MatchTeam,
} from '../types';
import { resolveEndedAfter } from '@/utils/matchPlayResult';

/**
 * Calculate the best score from a team's player scores
 */
export function calculateTeamBestScore(
  playerScores: Record<string, number | null>
): number | null {
  const scores = Object.values(playerScores).filter(
    (s): s is number => s !== null
  );
  if (scores.length === 0) return null;
  return Math.min(...scores);
}

/**
 * Determine hole winner based on team scores (best ball)
 */
export function determineTeamHoleWinner(
  team1Score: number | null,
  team2Score: number | null
): 'team1' | 'team2' | 'halved' | null {
  if (team1Score === null || team2Score === null) return null;
  if (team1Score < team2Score) return 'team1';
  if (team2Score < team1Score) return 'team2';
  return 'halved';
}

/**
 * Calculate team match status from hole results.
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
export function calculateTeamMatchStatus(
  holeResults: Record<number, TeamHoleResult>,
  totalHoles: number = 18,
  holesPlayed?: number | null
): TeamMatchStatus {
  const endedAfter = resolveEndedAfter(totalHoles, holesPlayed);
  if (endedAfter !== null) {
    return calculateEndedEarlyTeamMatchStatus(holeResults, totalHoles, endedAfter);
  }

  let team1Up = 0;
  let decidedHoles = 0;

  // Iterate the actual hole results — keys are real hole numbers (10..18
  // on back-9), so a 1..18 counter would miss back-9 holes entirely.
  for (const result of Object.values(holeResults)) {
    if (result?.winner) {
      decidedHoles++;
      if (result.winner === 'team1') {
        team1Up++;
      } else if (result.winner === 'team2') {
        team1Up--;
      }
    }
  }

  const holesRemaining = totalHoles - decidedHoles;
  const absLead = Math.abs(team1Up);

  // No holes left to play: the leader wins "N up", level is halved. Must run
  // BEFORE the close-out check, which would otherwise report a last-hole
  // win as "N & 0" (invariant I10).
  if (holesRemaining <= 0) {
    if (team1Up === 0) {
      return { status: 'complete', winner: 'halved', margin: 'All Square' };
    }
    const winner = team1Up > 0 ? 'team1' : 'team2';
    return { status: 'complete', winner, margin: `${absLead} up` };
  }

  // Closed out early: the lead is bigger than the holes left to play.
  if (absLead > holesRemaining) {
    const winner = team1Up > 0 ? 'team1' : 'team2';
    const margin = `${absLead} & ${holesRemaining}`;
    return { status: 'complete', winner, margin };
  }

  // Match in progress
  if (team1Up === 0) {
    return { status: 'in_progress', leader: null, holesUp: 0, holesRemaining };
  }

  return {
    status: 'in_progress',
    leader: team1Up > 0 ? 'team1' : 'team2',
    holesUp: absLead,
    holesRemaining,
  };
}

/**
 * Status of a team match ended early after `endedAfter` physical holes — see
 * `calculateEndedEarlyMatchStatus` (singles) for the rule; mirrored here for
 * team1 / team2.
 */
function calculateEndedEarlyTeamMatchStatus(
  holeResults: Record<number, TeamHoleResult>,
  totalHoles: number,
  endedAfter: number
): TeamMatchStatus {
  const holeNumbers = Object.keys(holeResults)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, endedAfter);
  let team1Up = 0;
  let decidedHoles = 0;

  for (const holeNumber of holeNumbers) {
    const holeWinner = holeResults[holeNumber]?.winner;
    if (!holeWinner) continue;
    decidedHoles++;
    if (holeWinner === 'team1') team1Up++;
    else if (holeWinner === 'team2') team1Up--;

    const plannedRemaining = totalHoles - decidedHoles;
    const lead = Math.abs(team1Up);
    if (lead > plannedRemaining) {
      const closedOutBy = team1Up > 0 ? 'team1' : 'team2';
      return { status: 'complete', winner: closedOutBy, margin: `${lead} & ${plannedRemaining}` };
    }
  }

  const absLead = Math.abs(team1Up);
  const ahead = team1Up > 0 ? 'team1' : 'team2';

  if (decidedHoles < endedAfter) {
    const holesRemaining = totalHoles - decidedHoles;
    if (team1Up === 0) {
      return { status: 'in_progress', leader: null, holesUp: 0, holesRemaining };
    }
    return { status: 'in_progress', leader: ahead, holesUp: absLead, holesRemaining };
  }

  if (team1Up === 0) {
    return { status: 'complete', winner: 'halved', margin: 'All Square' };
  }
  return { status: 'complete', winner: ahead, margin: `${absLead} up` };
}

/**
 * Get team match status text
 */
export function getTeamMatchStatusText(
  matchStatus: TeamMatchStatus,
  team1Name: string,
  team2Name: string
): string {
  if (matchStatus.status === 'complete') {
    const winnerName =
      matchStatus.winner === 'team1'
        ? team1Name
        : matchStatus.winner === 'team2'
          ? team2Name
          : null;

    if (matchStatus.winner === 'halved') {
      return 'Match Halved';
    }
    return `${winnerName} wins ${matchStatus.margin}`;
  }

  if (matchStatus.leader === null) {
    return `All Square with ${matchStatus.holesRemaining} to play`;
  }

  const leaderName = matchStatus.leader === 'team1' ? team1Name : team2Name;
  return `${leaderName} is ${matchStatus.holesUp} up with ${matchStatus.holesRemaining} to play`;
}

/**
 * Get individual team's match status from their perspective
 * @param matchStatus - The overall match status
 * @param team - Which team's perspective ('team1' or 'team2')
 * @returns TeamMatchStatusDisplay with text like "1 UP", "2 DN", "A/S"
 */
export function getTeamMatchStatusDisplay(
  matchStatus: TeamMatchStatus,
  team: 'team1' | 'team2'
): TeamMatchStatusDisplay {
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

    const isWinner = matchStatus.winner === team;
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

  // Match in progress - one team leading
  const isLeading = matchStatus.leader === team;
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

/**
 * Count holes won by each team
 */
export function countHolesWon(
  holeResults: Record<number, TeamHoleResult>
): { team1: number; team2: number; halved: number } {
  let team1 = 0;
  let team2 = 0;
  let halved = 0;

  for (const result of Object.values(holeResults)) {
    if (result.winner === 'team1') team1++;
    else if (result.winner === 'team2') team2++;
    else if (result.winner === 'halved') halved++;
  }

  return { team1, team2, halved };
}

/**
 * Get the best player score from a team for a specific hole
 * Used for best-ball style team match play
 */
export function getBestPlayerScore(
  team: MatchTeam,
  holeNumber: number,
  getPlayerScore: (playerId: string, hole: number) => { strokes: number } | undefined
): number | null {
  let best: number | null = null;

  for (const member of team.members) {
    const scoreData = getPlayerScore(member.id, holeNumber);
    if (scoreData?.strokes !== undefined && scoreData.strokes !== null) {
      if (best === null || scoreData.strokes < best) {
        best = scoreData.strokes;
      }
    }
  }

  return best;
}

/**
 * Get the player who contributed the best score on a hole
 */
export function getBestContributor(
  team: MatchTeam,
  holeNumber: number,
  getPlayerScore: (playerId: string, hole: number) => { strokes: number } | undefined
): string | null {
  let best: number | null = null;
  let bestPlayerId: string | null = null;

  for (const member of team.members) {
    const scoreData = getPlayerScore(member.id, holeNumber);
    if (scoreData?.strokes !== undefined && scoreData.strokes !== null) {
      if (best === null || scoreData.strokes < best) {
        best = scoreData.strokes;
        bestPlayerId = member.id;
      }
    }
  }

  return bestPlayerId;
}
