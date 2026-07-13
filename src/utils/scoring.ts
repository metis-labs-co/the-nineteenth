import { Hole, GameType, Scorecard } from '@/types';
import { isSingleBallScore } from '@/types/database/base';
import { STABLEFORD_POINTS, PAR_GAME_POINTS, PICKUP_SCORE, STANDARD_SLOPE_RATING } from '@/constants/scoring';
import { colors, ColorPalette } from '@/constants/theme';

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
 * Match-play per-hole stroke allocation (difference method).
 *
 * The lower-handicap player plays off scratch; the higher-handicap player
 * receives the whole handicap difference, allocated by stroke index using the
 * standard {@link getStrokesReceived} rule. Equal handicaps yield no strokes
 * either side. Uses the regular per-hole stroke index — no match-play-specific
 * index is available from our course data.
 *
 * @returns strokes received by each player on the hole (`{ a, b }`).
 */
export function getMatchPlayStrokes(
  handicapA: number,
  handicapB: number,
  strokeIndex: number
): { a: number; b: number } {
  const diff = Math.abs(handicapA - handicapB);
  const strokes = getStrokesReceived(diff, strokeIndex);
  if (handicapA > handicapB) return { a: strokes, b: 0 };
  if (handicapB > handicapA) return { a: 0, b: strokes };
  return { a: 0, b: 0 };
}

/**
 * Four-ball match-play per-hole stroke allocation (relative-to-lowest method).
 *
 * Among all players in the match (both teams), the lowest playing handicap
 * plays off scratch; every other player receives the difference from that
 * lowest handicap, allocated by stroke index via {@link getStrokesReceived}.
 * Tied-lowest players all receive 0. Uses the regular per-hole stroke index.
 *
 * @returns strokes received on the hole, keyed by playerId.
 */
export function getFourBallStrokes(
  players: { playerId: string; handicap: number }[],
  strokeIndex: number
): Map<string, number> {
  const result = new Map<string, number>();
  if (players.length === 0) return result;
  const lowest = Math.min(...players.map((p) => p.handicap));
  for (const p of players) {
    result.set(p.playerId, getStrokesReceived(p.handicap - lowest, strokeIndex));
  }
  return result;
}

/**
 * Pickup score offset: strokes above "par + strokes received" that represent
 * a conceded hole in match-play formats. Example: par 4 + 1 stroke + 2 = 7.
 */
export const PICKUP_THRESHOLD = 2;

/**
 * Calculate the pickup score for a player on a specific hole.
 * Pickup score = par + strokes received + PICKUP_THRESHOLD
 */
export function calculatePickupScore(
  par: number,
  handicap: number,
  strokeIndex: number
): number {
  return par + getStrokesReceived(handicap, strokeIndex) + PICKUP_THRESHOLD;
}

/**
 * Check whether a stored gross score represents a pickup on the given hole.
 * Any score at or above the computed pickup threshold counts as a pickup.
 */
export function isPickupScore(
  score: number,
  par: number,
  handicap: number,
  strokeIndex: number
): boolean {
  return score >= calculatePickupScore(par, handicap, strokeIndex);
}

/**
 * WHS net-double-bogey offset used as the maximum score for handicap purposes.
 * Net double bogey = par + 2 (double bogey) + strokes received on the hole.
 */
export const NET_DOUBLE_BOGEY_OFFSET = 2;

/**
 * Resolve the effective gross strokes for a hole under WHS "most likely score"
 * handling, used for gross/net/differential totals.
 *
 * - Not played (no score, zero, or negative): returns `null` so the hole is
 *   excluded from totals.
 * - Pickup (strokes at or above PICKUP_SCORE — the app's max-strokes sentinel):
 *   the player did not hole out, so WHS records net double bogey
 *   (`par + 2 + strokesReceived`) rather than the raw sentinel or nothing.
 * - Completed hole below the pickup threshold: the actual strokes.
 *
 * Net double bogey is exactly the threshold for 0 Stableford points / a lost
 * Par-game hole, so callers can pass the result straight into the points
 * helpers and get the same result as treating the hole as a blow-up.
 */
export function getEffectiveGrossStrokes(
  strokes: number | undefined | null,
  par: number,
  strokesReceived: number
): number | null {
  if (!strokes || strokes <= 0) return null;
  if (strokes >= PICKUP_SCORE) {
    return par + NET_DOUBLE_BOGEY_OFFSET + strokesReceived;
  }
  return strokes;
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
 * Calculate net score from pre-calculated strokes received.
 * Use this when you've already determined the strokes received for the hole.
 *
 * This is the primitive form - for convenience, use calculateNetScore() when
 * you have a Hole object and want automatic stroke calculation.
 *
 * @param grossScore - The player's gross score on the hole
 * @param strokesReceived - Number of strokes received on this hole
 * @returns Net score for the hole
 */
export function calculateNetScoreFromStrokes(
  grossScore: number,
  strokesReceived: number
): number {
  return grossScore - strokesReceived;
}

/**
 * Calculate Stableford points for a hole
 * Uses standard Stableford scoring:
 * - 2+ under par: 4 points (eagle or better)
 * - 1 under par: 3 points (birdie)
 * - Even with par: 2 points (par)
 * - 1 over par: 1 point (bogey)
 * - 2+ over par: 0 points (double bogey or worse)
 */
export function calculateStablefordPoints(
  grossScore: number,
  playerHandicap: number,
  hole: Hole
): number {
  const netScore = calculateNetScore(grossScore, playerHandicap, hole);
  const diff = hole.par - netScore;

  if (diff >= 2) return STABLEFORD_POINTS.EAGLE_OR_BETTER;
  if (diff === 1) return STABLEFORD_POINTS.BIRDIE;
  if (diff === 0) return STABLEFORD_POINTS.PAR;
  if (diff === -1) return STABLEFORD_POINTS.BOGEY;
  return STABLEFORD_POINTS.DOUBLE_OR_WORSE;
}

/**
 * Calculate Stableford points with pre-calculated strokes received
 * Uses extended Stableford scoring (includes albatross):
 * - 3+ under par: 5 points (albatross or better)
 * - 2 under par: 4 points (eagle)
 * - 1 under par: 3 points (birdie)
 * - Even with par: 2 points (par)
 * - 1 over par: 1 point (bogey)
 * - 2+ over par: 0 points (double bogey or worse)
 */
export function calculateStablefordPointsNet(
  strokes: number,
  par: number,
  strokesReceived: number
): number {
  const netStrokes = strokes - strokesReceived;
  const relativeToPar = netStrokes - par;

  if (relativeToPar <= -3) return STABLEFORD_POINTS.ALBATROSS_OR_BETTER;
  if (relativeToPar === -2) return STABLEFORD_POINTS.EAGLE;
  if (relativeToPar === -1) return STABLEFORD_POINTS.BIRDIE;
  if (relativeToPar === 0) return STABLEFORD_POINTS.PAR;
  if (relativeToPar === 1) return STABLEFORD_POINTS.BOGEY;
  return STABLEFORD_POINTS.DOUBLE_OR_WORSE;
}

/**
 * Calculate Par game score for a hole
 * Par game scoring awards +1 (win), 0 (square), or -1 (loss) based on net score vs par.
 *
 * @param strokes - Gross strokes on the hole
 * @param par - Par for the hole
 * @param strokesReceived - Strokes received on this hole (from handicap)
 * @returns Par game score (+1, 0, or -1)
 */
export function calculateParScore(
  strokes: number,
  par: number,
  strokesReceived: number
): number {
  const netStrokes = strokes - strokesReceived;
  const relativeToPar = netStrokes - par;

  if (relativeToPar <= -1) return PAR_GAME_POINTS.WIN;
  if (relativeToPar === 0) return PAR_GAME_POINTS.SQUARE;
  return PAR_GAME_POINTS.LOSS;
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
export function getScoreColor(score: number, par: number, themeColors?: ColorPalette): string {
  const c = themeColors ?? colors;
  const diff = score - par;

  if (diff <= -2) return c.eagle; // Eagle or better
  if (diff === -1) return c.birdie; // Birdie
  if (diff === 0) return c.par; // Par
  if (diff === 1) return c.bogey; // Bogey
  return c.doubleBogey; // Double bogey or worse
}

/**
 * Canonical gross score categories relative to par, finest granularity.
 * Consumers that display a coarser breakdown fold neighbouring categories
 * themselves (e.g. albatross → eagles).
 */
export type ScoreCategory =
  | 'albatross'
  | 'eagle'
  | 'birdie'
  | 'par'
  | 'bogey'
  | 'double-bogey'
  | 'triple-plus';

/**
 * Classify a gross hole score relative to par — the single source of truth for
 * score-distribution counting across the app.
 *
 * Returns `null` when the hole should not be counted in a gross distribution:
 * - no score (undefined, zero, or negative)
 * - a pickup (strokes at or above {@link PICKUP_SCORE}, the max-strokes sentinel);
 *   the player never holed out, so it belongs to no gross category. Net/points
 *   views handle pickups separately via {@link getEffectiveGrossStrokes}.
 */
export function getScoreCategory(
  strokes: number | undefined | null,
  par: number
): ScoreCategory | null {
  if (!strokes || strokes <= 0) return null;
  if (strokes >= PICKUP_SCORE) return null;

  const diff = strokes - par;
  if (diff <= -3) return 'albatross';
  if (diff === -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  if (diff === 2) return 'double-bogey';
  return 'triple-plus';
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
    const category = getScoreCategory(holeScore?.strokes, hole.par);
    if (!category) return; // no score or pickup

    if (category === 'albatross' || category === 'eagle' || category === 'birdie') {
      birdiesOrBetter++;
    } else if (category === 'par') {
      pars++;
    } else if (category === 'bogey') {
      bogeys++;
    } else {
      doubleBogeyOrWorse++; // double-bogey or triple-plus
    }
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
  slopeRating: number = STANDARD_SLOPE_RATING,
  courseRating: number,
  par: number
): number {
  // Playing Handicap = Handicap Index × (Slope Rating / 113) + (Course Rating - Par)
  return Math.round(
    handicapIndex * (slopeRating / STANDARD_SLOPE_RATING) + (courseRating - par)
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
    if (ps.strokes > 0 && ps.strokes < PICKUP_SCORE) { // Exclude picked up scores
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

  // Handle picked up - auto-loss
  if (team1Score === PICKUP_SCORE && team2Score === PICKUP_SCORE) return 'halved';
  if (team1Score === PICKUP_SCORE) return 'team2';
  if (team2Score === PICKUP_SCORE) return 'team1';

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