import { Hole, GameType, Scorecard } from '@/types';
import { isSingleBallScore } from '@/types/database/base';

/**
 * Calculate the number of strokes a player receives on a specific hole
 * based on their handicap and the hole's stroke index
 */
export function getStrokesOnHole(playerHandicap: number, hole: Hole): number {
  if (playerHandicap <= 0) return 0;

  const baseStrokes = Math.floor(playerHandicap / 18);
  const additionalStroke = hole.strokeIndex <= (playerHandicap % 18) ? 1 : 0;

  return baseStrokes + additionalStroke;
}

/**
 * Calculate strokes received for a hole based on handicap and stroke index directly
 * (Convenience function that doesn't require a full Hole object)
 */
export function getStrokesReceived(handicap: number, strokeIndex: number): number {
  if (handicap <= 0) return 0;

  const baseStrokes = Math.floor(handicap / 18);
  const additionalStroke = strokeIndex <= (handicap % 18) ? 1 : 0;

  return baseStrokes + additionalStroke;
}

/**
 * Calculate net score for a hole in stroke play
 */
export function calculateNetScore(
  grossScore: number,
  playerHandicap: number,
  hole: Hole
): number {
  const strokesOnHole = getStrokesOnHole(playerHandicap, hole);
  return grossScore - strokesOnHole;
}

/**
 * Calculate Stableford points for a hole
 * Par = 2 points
 * 1 under par = 3 points
 * 2 under par = 4 points
 * 1 over par = 1 point
 * 2+ over par = 0 points
 */
export function calculateStablefordPoints(
  grossScore: number,
  playerHandicap: number,
  hole: Hole
): number {
  const netScore = calculateNetScore(grossScore, playerHandicap, hole);
  const diff = hole.par - netScore;

  if (diff >= 2) return 4; // Eagle or better
  if (diff === 1) return 3; // Birdie
  if (diff === 0) return 2; // Par
  if (diff === -1) return 1; // Bogey
  return 0; // Double bogey or worse
}

/**
 * Calculate Stableford points with pre-calculated strokes received
 * (Use when you already know the strokes received for the hole)
 */
export function calculateStablefordPointsNet(
  strokes: number,
  par: number,
  strokesReceived: number
): number {
  const netStrokes = strokes - strokesReceived;
  const relativeToPar = netStrokes - par;

  if (relativeToPar <= -3) return 5; // Albatross or better
  if (relativeToPar === -2) return 4; // Eagle
  if (relativeToPar === -1) return 3; // Birdie
  if (relativeToPar === 0) return 2; // Par
  if (relativeToPar === 1) return 1; // Bogey
  return 0; // Double bogey or worse
}

/**
 * Calculate total score based on game type
 */
export function calculateTotalScore(
  scorecard: Scorecard,
  holes: Hole[],
  gameType: GameType
): { gross: number; net: number; points?: number } {
  const playerHandicap = scorecard.player?.handicap || 0;
  
  let totalGross = 0;
  let totalNet = 0;
  let totalPoints = 0;
  
  holes.forEach((hole) => {
    const rawHoleScore = scorecard.scores[hole.number];
    if (!rawHoleScore) return;

    // Get strokes based on score type
    const strokes = isSingleBallScore(rawHoleScore)
      ? rawHoleScore.strokes
      : rawHoleScore.balls?.[0]?.strokes; // Use first ball for multi-ball

    if (!strokes) return;

    totalGross += strokes;

    if (gameType === 'stroke') {
      totalNet += calculateNetScore(strokes, playerHandicap, hole);
    } else if (gameType === 'stableford') {
      totalPoints += calculateStablefordPoints(strokes, playerHandicap, hole);
      totalNet = totalPoints; // For stableford, net is points
    }
  });
  
  return {
    gross: totalGross,
    net: totalNet,
    points: gameType === 'stableford' ? totalPoints : undefined,
  };
}

/**
 * Calculate match play result between two players on a hole
 * Returns: 1 (player1 wins), 0 (tie), -1 (player2 wins)
 */
export function calculateMatchPlayHole(
  player1Score: number,
  player1Handicap: number,
  player2Score: number,
  player2Handicap: number,
  hole: Hole
): number {
  const net1 = calculateNetScore(player1Score, player1Handicap, hole);
  const net2 = calculateNetScore(player2Score, player2Handicap, hole);
  
  if (net1 < net2) return 1;
  if (net1 > net2) return -1;
  return 0;
}

/**
 * Calculate Ambrose team score
 * Takes best score from team and applies team handicap
 */
export function calculateAmbroseScore(
  teamScores: number[],
  teamHandicap: number,
  hole: Hole
): number {
  const bestScore = Math.min(...teamScores);
  return calculateNetScore(bestScore, teamHandicap, hole);
}

/**
 * Get score description (e.g., "Birdie", "Par", "Bogey")
 */
export function getScoreDescription(score: number, par: number): string {
  const diff = score - par;
  
  if (diff <= -3) return 'Albatross';
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double Bogey';
  if (diff === 3) return 'Triple Bogey';
  return `+${diff}`;
}

/**
 * Format score display with color coding
 */
export function getScoreColor(score: number, par: number): string {
  const diff = score - par;
  
  if (diff < 0) return '#22c55e'; // Green for under par
  if (diff === 0) return '#3b82f6'; // Blue for par
  if (diff === 1) return '#f59e0b'; // Orange for bogey
  return '#ef4444'; // Red for double bogey or worse
}

/**
 * Calculate statistics from hole scores
 * Accepts any object with a `scores` property matching the HoleScore format
 * Works with both app-level (number keys) and database (string keys) Scorecard types
 */
export function calculateStatistics(
  scorecard: { scores: Record<string | number, { strokes: number; putts?: number; fairwayHit?: boolean; greenInRegulation?: boolean }> },
  holes: Hole[]
) {
  const scores = Object.values(scorecard.scores).filter((s) => s.strokes);
  
  if (scores.length === 0) {
    return {
      totalPutts: 0,
      avgPutts: 0,
      fairwaysHit: 0,
      fairwayPercentage: 0,
      greensInRegulation: 0,
      girPercentage: 0,
      birdiesOrBetter: 0,
      pars: 0,
      bogeys: 0,
      doubleBogeyOrWorse: 0,
    };
  }
  
  const totalPutts = scores.reduce((sum, s) => sum + (s.putts || 0), 0);
  const fairwaysHit = scores.filter((s) => s.fairwayHit).length;
  const par4And5Holes = holes.filter((h) => h.par >= 4).length;
  const greensInRegulation = scores.filter((s) => s.greenInRegulation).length;
  
  let birdiesOrBetter = 0;
  let pars = 0;
  let bogeys = 0;
  let doubleBogeyOrWorse = 0;
  
  holes.forEach((hole) => {
    const holeScore = scorecard.scores[hole.number];
    if (!holeScore?.strokes) return;
    
    const diff = holeScore.strokes - hole.par;
    if (diff <= -1) birdiesOrBetter++;
    else if (diff === 0) pars++;
    else if (diff === 1) bogeys++;
    else doubleBogeyOrWorse++;
  });
  
  return {
    totalPutts,
    avgPutts: totalPutts / scores.length,
    fairwaysHit,
    fairwayPercentage: par4And5Holes > 0 ? (fairwaysHit / par4And5Holes) * 100 : 0,
    greensInRegulation,
    girPercentage: (greensInRegulation / holes.length) * 100,
    birdiesOrBetter,
    pars,
    bogeys,
    doubleBogeyOrWorse,
  };
}

/**
 * Sort leaderboard entries by net score (ascending) with tiebreakers
 */
export function sortLeaderboard<T extends { totalNet: number; totalGross: number }>(
  entries: T[]
): T[] {
  return entries.sort((a, b) => {
    // First sort by net score (lower is better)
    if (a.totalNet !== b.totalNet) {
      return a.totalNet - b.totalNet;
    }
    
    // Tiebreaker: use gross score
    return a.totalGross - b.totalGross;
  });
}

/**
 * Calculate playing handicap from course handicap
 * This is a simplified version - real calculation depends on course slope rating
 */
export function calculatePlayingHandicap(
  handicapIndex: number,
  slopeRating: number = 113, // Default USGA slope rating
  courseRating: number,
  par: number
): number {
  // Playing Handicap = Handicap Index × (Slope Rating / 113) + (Course Rating - Par)
  return Math.round(
    handicapIndex * (slopeRating / 113) + (courseRating - par)
  );
}

// =====================================================
// TEAM SCORING UTILITIES
// =====================================================

/**
 * Calculate team handicap for Scramble format
 * Standard formula varies by number of players:
 * - 2 players: 35% of low + 15% of high = 50% total
 * - 3 players: 20% + 15% + 10% = 45% total
 * - 4 players: 20% + 15% + 10% + 5% = 50% total
 *
 * Simplified: Use 25% of sum of all handicaps (common club rule)
 */
export function calculateScrambleTeamHandicap(handicaps: number[]): number {
  if (handicaps.length === 0) return 0;

  const sorted = [...handicaps].sort((a, b) => a - b);

  // Use percentage-based formula depending on team size
  let teamHandicap = 0;
  const percentages = [0.35, 0.15, 0.10, 0.05]; // Standard USGA percentages

  sorted.forEach((h, index) => {
    const pct = percentages[index] ?? 0.05;
    teamHandicap += h * pct;
  });

  return Math.round(teamHandicap * 10) / 10;
}

/**
 * Calculate best ball team score for a hole
 * Returns the best (lowest net) score among all team members
 */
export function calculateBestBallScore(
  playerScores: { strokes: number; handicap: number }[],
  hole: Hole
): { bestStrokes: number; bestNetScore: number; bestPlayerId?: string } | null {
  if (playerScores.length === 0) return null;

  let bestNet = Infinity;
  let bestStrokes = 0;
  let bestPlayerIndex = -1;

  playerScores.forEach((ps, index) => {
    if (ps.strokes > 0) {
      const netScore = calculateNetScore(ps.strokes, ps.handicap, hole);
      if (netScore < bestNet) {
        bestNet = netScore;
        bestStrokes = ps.strokes;
        bestPlayerIndex = index;
      }
    }
  });

  if (bestPlayerIndex === -1) return null;

  return {
    bestStrokes,
    bestNetScore: bestNet,
  };
}

/**
 * Calculate best ball Stableford points for a hole
 * Uses the best player's score
 */
export function calculateBestBallStablefordPoints(
  playerScores: { strokes: number; handicap: number }[],
  hole: Hole
): number {
  if (playerScores.length === 0) return 0;

  let bestPoints = 0;

  playerScores.forEach((ps) => {
    if (ps.strokes > 0 && ps.strokes < 10) { // Exclude picked up scores
      const points = calculateStablefordPoints(ps.strokes, ps.handicap, hole);
      if (points > bestPoints) {
        bestPoints = points;
      }
    }
  });

  return bestPoints;
}

/**
 * Calculate aggregate team score (sum of all players' scores)
 * Used for aggregate team formats
 */
export function calculateAggregateTeamScore(
  playerScores: { strokes: number; handicap: number }[],
  hole: Hole
): { grossTotal: number; netTotal: number } {
  let grossTotal = 0;
  let netTotal = 0;

  playerScores.forEach((ps) => {
    if (ps.strokes > 0) {
      grossTotal += ps.strokes;
      netTotal += calculateNetScore(ps.strokes, ps.handicap, hole);
    }
  });

  return { grossTotal, netTotal };
}

/**
 * Determine match play hole winner between two teams
 * Returns: 'team1' | 'team2' | 'halved'
 */
export function calculateTeamMatchPlayHoleResult(
  team1Score: number | null,
  team2Score: number | null
): 'team1' | 'team2' | 'halved' | null {
  if (team1Score === null || team2Score === null) return null;

  // Handle picked up (score of 10) - auto-loss
  const PICKUP = 10;
  if (team1Score === PICKUP && team2Score === PICKUP) return 'halved';
  if (team1Score === PICKUP) return 'team2';
  if (team2Score === PICKUP) return 'team1';

  if (team1Score < team2Score) return 'team1';
  if (team2Score < team1Score) return 'team2';
  return 'halved';
}

/**
 * Calculate match play status string
 * e.g., "Team A 2 UP", "All Square", "Team B 3&2"
 */
export function calculateMatchPlayStatus(
  team1Wins: number,
  team2Wins: number,
  holesPlayed: number,
  team1Name: string,
  team2Name: string
): {
  status: string;
  leader: 'team1' | 'team2' | null;
  margin: number;
  isMatchOver: boolean;
} {
  const diff = team1Wins - team2Wins;
  const holesRemaining = 18 - holesPlayed;
  const margin = Math.abs(diff);

  // Match is over if lead > remaining holes
  const isMatchOver = margin > holesRemaining;

  if (diff === 0) {
    return {
      status: 'All Square',
      leader: null,
      margin: 0,
      isMatchOver: false,
    };
  }

  const leader = diff > 0 ? 'team1' : 'team2';
  const leaderName = diff > 0 ? team1Name : team2Name;

  if (isMatchOver) {
    return {
      status: `${leaderName} wins ${margin}&${holesRemaining}`,
      leader,
      margin,
      isMatchOver: true,
    };
  }

  // Dormie check (lead = holes remaining)
  if (margin === holesRemaining) {
    return {
      status: `${leaderName} ${margin} UP (Dormie)`,
      leader,
      margin,
      isMatchOver: false,
    };
  }

  return {
    status: `${leaderName} ${margin} UP`,
    leader,
    margin,
    isMatchOver: false,
  };
}