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
 * Calculate team match status from hole results
 */
export function calculateTeamMatchStatus(
  holeResults: Record<number, TeamHoleResult>
): TeamMatchStatus {
  let team1Up = 0;
  let holesPlayed = 0;

  for (let i = 1; i <= 18; i++) {
    const result = holeResults[i];
    if (result?.winner) {
      holesPlayed++;
      if (result.winner === 'team1') {
        team1Up++;
      } else if (result.winner === 'team2') {
        team1Up--;
      }
    }
  }

  const holesRemaining = 18 - holesPlayed;
  const absLead = Math.abs(team1Up);

  // Check for early finish (dormie or beyond)
  if (absLead > holesRemaining) {
    const winner = team1Up > 0 ? 'team1' : 'team2';
    const margin = `${absLead} & ${holesRemaining}`;
    return { status: 'complete', winner, margin };
  }

  // Check if all holes played
  if (holesRemaining === 0) {
    if (team1Up === 0) {
      return { status: 'complete', winner: 'halved', margin: 'All Square' };
    }
    const winner = team1Up > 0 ? 'team1' : 'team2';
    return { status: 'complete', winner, margin: `${absLead} up` };
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
 * @returns TeamMatchStatusDisplay with text like "1 UP", "2 DN", "AS"
 */
export function getTeamMatchStatusDisplay(
  matchStatus: TeamMatchStatus,
  team: 'team1' | 'team2'
): TeamMatchStatusDisplay {
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
      text: 'AS',
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
