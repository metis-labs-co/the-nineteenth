/**
 * Wolf Calculation Utilities
 *
 * Pure calculation functions for the Wolf strategic partner selection side-game.
 * All functions are side-effect free and can be used both client-side
 * and for offline calculations.
 *
 * Wolf is a game where one player (the "Wolf") on each hole decides to:
 * - Pick a partner from the other players
 * - Go "Lone Wolf" (play alone against the pack)
 * - Go "Blind Wolf" (declare lone wolf before anyone tees off, for double points)
 *
 * Points are awarded based on the outcome and the Wolf's decision.
 */

import type {
  WolfHoleDecision,
  WolfHoleScores,
  WolfPointsAwarded,
  WolfScoringType,
  WolfPointValues,
  WolfHoleResult,
  WolfStandingEntry,
  WolfPayout,
} from '@/types/database/wolf.types';
import { WOLF_POINTS } from '@/types/database/wolf.types';
import { calculateNetScoreFromStrokes } from './scoring';

// =====================================================
// CONSTANTS
// =====================================================

/** Number of holes in a standard round */
const HOLES_PER_ROUND = 18;

/** Minimum players for Wolf (3 players) */
const MIN_WOLF_PLAYERS = 3;

/** Maximum players for Wolf (4 players) */
const MAX_WOLF_PLAYERS = 4;

/** Decimal precision for currency calculations */
const CURRENCY_PRECISION = 2;

/** Default Wolf point values */
export const DEFAULT_WOLF_POINT_VALUES: WolfPointValues = {
  partnerWin: WOLF_POINTS.PARTNER_WIN,
  partnerLoseOpponent: WOLF_POINTS.PARTNER_LOSE_OPPONENT,
  loneWolfWin: WOLF_POINTS.LONE_WOLF_WIN,
  loneWolfLoseOpponent: WOLF_POINTS.LONE_WOLF_LOSE_OPPONENT,
  blindWolfWin: WOLF_POINTS.BLIND_WOLF_WIN,
  blindWolfLoseOpponent: WOLF_POINTS.BLIND_WOLF_LOSE_OPPONENT,
};

// =====================================================
// WOLF ROTATION FUNCTIONS
// =====================================================

/**
 * Determine which player is Wolf for a given hole.
 * Wolf rotates through the wolf_order array based on hole number.
 *
 * @param wolfOrder - Array of player IDs in rotation order
 * @param holeNumber - The hole number (1-18)
 * @returns Player ID who is Wolf for this hole
 *
 * @example
 * // 4 players: A, B, C, D
 * // Hole 1 = A, Hole 2 = B, Hole 3 = C, Hole 4 = D
 * // Hole 5 = A, Hole 6 = B, etc.
 * determineWolfForHole(['A', 'B', 'C', 'D'], 1) // 'A'
 * determineWolfForHole(['A', 'B', 'C', 'D'], 5) // 'A'
 *
 * @example
 * // 3 players: A, B, C
 * // Hole 1 = A, Hole 2 = B, Hole 3 = C
 * // Hole 4 = A, Hole 5 = B, Hole 6 = C, etc.
 * determineWolfForHole(['A', 'B', 'C'], 4) // 'A'
 */
export function determineWolfForHole(
  wolfOrder: string[],
  holeNumber: number
): string {
  if (wolfOrder.length === 0) {
    throw new Error('Wolf order cannot be empty');
  }
  // Use 0-indexed calculation: (holeNumber - 1) % playerCount
  const index = (holeNumber - 1) % wolfOrder.length;
  return wolfOrder[index];
}

/**
 * Get the Wolf player for each hole in a round.
 *
 * @param wolfOrder - Array of player IDs in rotation order
 * @returns Map of hole number to Wolf player ID
 */
export function getWolfRotationForRound(
  wolfOrder: string[]
): Map<number, string> {
  const rotation = new Map<number, string>();
  for (let hole = 1; hole <= HOLES_PER_ROUND; hole++) {
    rotation.set(hole, determineWolfForHole(wolfOrder, hole));
  }
  return rotation;
}

// =====================================================
// NET SCORE CALCULATION
// =====================================================

/**
 * Calculate net score from gross score and strokes received.
 * Simple wrapper for clarity in Wolf context.
 *
 * @param grossScore - Player's gross score on the hole
 * @param strokesReceived - Handicap strokes received on this hole
 * @returns Net score for the hole
 *
 * @example
 * calculateNetScore(5, 1) // 4 (gross 5 minus 1 stroke)
 * calculateNetScore(4, 0) // 4 (no strokes received)
 */
export function calculateNetScore(
  grossScore: number,
  strokesReceived: number
): number {
  return calculateNetScoreFromStrokes(grossScore, strokesReceived);
}

// =====================================================
// HOLE RESULT DETERMINATION
// =====================================================

/**
 * Get the effective score for a player based on scoring type.
 *
 * @param grossScore - Player's gross score
 * @param handicapStrokes - Strokes received on this hole (for net scoring)
 * @param scoringType - 'gross' or 'net'
 * @returns The score to use for comparison
 */
function getEffectiveScore(
  grossScore: number,
  handicapStrokes: number,
  scoringType: WolfScoringType
): number {
  if (scoringType === 'net') {
    return grossScore - handicapStrokes;
  }
  return grossScore;
}

/**
 * Determine the result of a Wolf hole.
 *
 * Wolf team wins if:
 * - Lone Wolf: Wolf's score is strictly better (lower) than ALL other players
 * - With Partner: Best of Wolf/Partner is strictly better than best of others
 *
 * Tie occurs if best scores are equal - no points awarded (hole is "pushed").
 *
 * @param wolfId - Player ID of the Wolf
 * @param partnerId - Partner player ID, or null for lone wolf
 * @param holeScores - Gross scores for all players: { playerId: grossScore }
 * @param scoringType - 'gross' or 'net'
 * @param handicapStrokes - Strokes received per player (required for net scoring)
 * @returns Result with wolfTeamWon and isTie flags
 *
 * @example
 * // Lone Wolf wins
 * determineWolfHoleResult('wolf', null, { wolf: 4, p2: 5, p3: 5 }, 'gross')
 * // { wolfTeamWon: true, isTie: false }
 *
 * @example
 * // Pack wins against Lone Wolf
 * determineWolfHoleResult('wolf', null, { wolf: 5, p2: 4, p3: 5 }, 'gross')
 * // { wolfTeamWon: false, isTie: false }
 *
 * @example
 * // Tie - hole pushed
 * determineWolfHoleResult('wolf', null, { wolf: 4, p2: 4, p3: 5 }, 'gross')
 * // { wolfTeamWon: false, isTie: true }
 *
 * @example
 * // Wolf with partner wins
 * determineWolfHoleResult('wolf', 'p2', { wolf: 5, p2: 3, p3: 4 }, 'gross')
 * // { wolfTeamWon: true, isTie: false } (partner p2 has best score)
 */
export function determineWolfHoleResult(
  wolfId: string,
  partnerId: string | null,
  holeScores: WolfHoleScores,
  scoringType: WolfScoringType,
  handicapStrokes?: Record<string, number>
): WolfHoleResult {
  const playerIds = Object.keys(holeScores);

  if (playerIds.length < MIN_WOLF_PLAYERS) {
    throw new Error(`Wolf requires at least ${MIN_WOLF_PLAYERS} players`);
  }

  // Calculate effective scores (gross or net)
  const effectiveScores: Record<string, number> = {};
  for (const playerId of playerIds) {
    const grossScore = holeScores[playerId];
    const strokes = handicapStrokes?.[playerId] ?? 0;
    effectiveScores[playerId] = getEffectiveScore(grossScore, strokes, scoringType);
  }

  // Determine Wolf team and Pack
  const isLoneWolf = partnerId === null;
  const wolfTeamIds = isLoneWolf ? [wolfId] : [wolfId, partnerId];
  const packIds = playerIds.filter((id) => !wolfTeamIds.includes(id));

  // Find best score for each team
  const wolfTeamBestScore = Math.min(
    ...wolfTeamIds.map((id) => effectiveScores[id])
  );
  const packBestScore = Math.min(
    ...packIds.map((id) => effectiveScores[id])
  );

  // Determine result
  if (wolfTeamBestScore === packBestScore) {
    // Tie - hole is pushed, no points awarded
    return { wolfTeamWon: false, isTie: true };
  }

  // Wolf team wins if their best score is strictly lower
  const wolfTeamWon = wolfTeamBestScore < packBestScore;

  return { wolfTeamWon, isTie: false };
}

// =====================================================
// POINTS CALCULATION
// =====================================================

/**
 * Calculate Wolf points awarded to each player for a hole.
 *
 * Point values:
 * - Partner Win: Wolf team each gets 2 points
 * - Partner Lose: Each opponent gets 3 points
 * - Lone Wolf Win: Wolf gets 4 points
 * - Lone Wolf Lose: Each opponent gets 1 point
 * - Blind Wolf Win: Wolf gets 6 points
 * - Blind Wolf Lose: Each opponent gets 2 points
 * - Tie: All players get 0 points (hole pushed)
 *
 * @param wolfId - Player ID of the Wolf
 * @param partnerId - Partner player ID, or null for lone wolf
 * @param participantIds - All player IDs in the game
 * @param wolfTeamWon - Whether the Wolf team won
 * @param isTie - Whether the hole was tied
 * @param isBlindWolf - Whether Wolf declared blind (before tee shots)
 * @param pointValues - Custom point values (optional)
 * @returns Points awarded to each player: { playerId: points }
 *
 * @example
 * // Lone Wolf wins (4 points)
 * calculateWolfPoints('wolf', null, ['wolf', 'p2', 'p3'], true, false, false)
 * // { wolf: 4, p2: 0, p3: 0 }
 *
 * @example
 * // Lone Wolf loses (each opponent gets 1 point)
 * calculateWolfPoints('wolf', null, ['wolf', 'p2', 'p3'], false, false, false)
 * // { wolf: 0, p2: 1, p3: 1 }
 *
 * @example
 * // Tie - hole pushed
 * calculateWolfPoints('wolf', null, ['wolf', 'p2', 'p3'], false, true, false)
 * // { wolf: 0, p2: 0, p3: 0 }
 *
 * @example
 * // Blind Wolf wins (6 points)
 * calculateWolfPoints('wolf', null, ['wolf', 'p2', 'p3'], true, false, true)
 * // { wolf: 6, p2: 0, p3: 0 }
 */
export function calculateWolfPoints(
  wolfId: string,
  partnerId: string | null,
  participantIds: string[],
  wolfTeamWon: boolean,
  isTie: boolean,
  isBlindWolf: boolean,
  pointValues: WolfPointValues = DEFAULT_WOLF_POINT_VALUES
): WolfPointsAwarded {
  const points: WolfPointsAwarded = {};

  // Initialize all players with 0 points
  for (const playerId of participantIds) {
    points[playerId] = 0;
  }

  // If tie, all players get 0 - hole is pushed
  if (isTie) {
    return points;
  }

  const isLoneWolf = partnerId === null;
  const wolfTeamIds = isLoneWolf ? [wolfId] : [wolfId, partnerId];
  const packIds = participantIds.filter((id) => !wolfTeamIds.includes(id));

  if (wolfTeamWon) {
    // Wolf team wins
    if (isBlindWolf) {
      // Blind Wolf wins - only Wolf gets points (6 default)
      points[wolfId] = pointValues.blindWolfWin;
    } else if (isLoneWolf) {
      // Lone Wolf wins - Wolf gets 4 points
      points[wolfId] = pointValues.loneWolfWin;
    } else {
      // Partner win - Wolf and partner each get 2 points
      points[wolfId] = pointValues.partnerWin;
      points[partnerId!] = pointValues.partnerWin;
    }
  } else {
    // Pack wins
    if (isBlindWolf) {
      // Blind Wolf loses - each opponent gets 2 points
      for (const packId of packIds) {
        points[packId] = pointValues.blindWolfLoseOpponent;
      }
    } else if (isLoneWolf) {
      // Lone Wolf loses - each opponent gets 1 point
      for (const packId of packIds) {
        points[packId] = pointValues.loneWolfLoseOpponent;
      }
    } else {
      // Partner loses - each opponent gets 3 points
      for (const packId of packIds) {
        points[packId] = pointValues.partnerLoseOpponent;
      }
    }
  }

  return points;
}

// =====================================================
// STANDINGS CALCULATION
// =====================================================

/**
 * Calculate total points per player across all completed holes.
 *
 * @param decisions - Array of Wolf hole decisions with points_awarded
 * @param participantIds - All player IDs in the game
 * @returns Map of player ID to total points
 *
 * @example
 * calculateWolfStandings([
 *   { points_awarded: { p1: 4, p2: 0, p3: 0 } },
 *   { points_awarded: { p1: 0, p2: 2, p3: 2 } },
 * ], ['p1', 'p2', 'p3'])
 * // { p1: 4, p2: 2, p3: 2 }
 */
export function calculateWolfStandings(
  decisions: Pick<WolfHoleDecision, 'points_awarded'>[],
  participantIds: string[]
): Record<string, number> {
  const standings: Record<string, number> = {};

  // Initialize all players with 0 points
  for (const playerId of participantIds) {
    standings[playerId] = 0;
  }

  // Sum up points from all decisions
  for (const decision of decisions) {
    if (decision.points_awarded) {
      for (const [playerId, points] of Object.entries(decision.points_awarded)) {
        if (standings[playerId] !== undefined) {
          standings[playerId] += points;
        }
      }
    }
  }

  return standings;
}

/**
 * Convert standings record to sorted array of standing entries.
 *
 * @param standings - Map of player ID to total points
 * @param playerNames - Map of player ID to name
 * @returns Sorted array of standing entries (highest points first)
 */
export function getSortedStandings(
  standings: Record<string, number>,
  playerNames: Record<string, string>
): WolfStandingEntry[] {
  const entries: WolfStandingEntry[] = Object.entries(standings)
    .map(([playerId, totalPoints]) => ({
      player_id: playerId,
      name: playerNames[playerId] || 'Unknown',
      total_points: totalPoints,
      rank: 0, // Will be set after sorting
    }))
    .sort((a, b) => b.total_points - a.total_points); // Highest points first

  // Assign ranks (handle ties)
  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].total_points < entries[i - 1].total_points) {
      currentRank = i + 1;
    }
    entries[i].rank = currentRank;
  }

  return entries;
}

// =====================================================
// PAYOUT CALCULATION
// =====================================================

/**
 * Calculate Wolf payouts for all players when pot is enabled.
 *
 * In Wolf with a per-point pot:
 * - Each point is worth the pot_value amount
 * - Total winnings = points * pot_value
 * - Net result = difference from average (zero-sum game)
 *
 * The net result calculation ensures it's a zero-sum game:
 * - Sum of all net_results = 0
 * - Players with more points than average are positive
 * - Players with fewer points than average are negative
 *
 * @param standings - Map of player ID to total points
 * @param potValue - Dollar value per point (null if no pot)
 * @returns Map of player ID to payout info
 *
 * @example
 * // 3 players, $1 per point
 * // p1: 10 pts, p2: 6 pts, p3: 2 pts (total: 18 pts, avg: 6 pts)
 * calculateWolfPayouts({ p1: 10, p2: 6, p3: 2 }, 1)
 * // {
 * //   p1: { winnings: 10, netResult: 4 },   // 10 - 6 = +4
 * //   p2: { winnings: 6, netResult: 0 },    // 6 - 6 = 0
 * //   p3: { winnings: 2, netResult: -4 },   // 2 - 6 = -4
 * // }
 */
export function calculateWolfPayouts(
  standings: Record<string, number>,
  potValue: number | null
): Record<string, { winnings: number; netResult: number }> {
  const payouts: Record<string, { winnings: number; netResult: number }> = {};

  // If no pot, all values are 0
  if (!potValue || potValue <= 0) {
    for (const playerId of Object.keys(standings)) {
      payouts[playerId] = { winnings: 0, netResult: 0 };
    }
    return payouts;
  }

  const playerIds = Object.keys(standings);
  const totalPoints = Object.values(standings).reduce((sum, pts) => sum + pts, 0);
  const averagePoints = totalPoints / playerIds.length;

  for (const playerId of playerIds) {
    const points = standings[playerId];
    const winnings = roundCurrency(points * potValue);
    // Net result is how much above/below average (makes it zero-sum)
    const netResult = roundCurrency((points - averagePoints) * potValue);

    payouts[playerId] = { winnings, netResult };
  }

  return payouts;
}

/**
 * Create full payout records for database storage.
 *
 * @param standings - Map of player ID to total points
 * @param potValue - Dollar value per point (null if no pot)
 * @returns Array of payout records (without IDs)
 */
export function createPayoutRecords(
  standings: Record<string, number>,
  potValue: number | null
): Omit<WolfPayout, 'id' | 'wolf_game_id' | 'calculated_at'>[] {
  const payoutCalcs = calculateWolfPayouts(standings, potValue);

  return Object.entries(standings).map(([playerId, totalPoints]) => ({
    player_id: playerId,
    total_points: totalPoints,
    total_winnings: payoutCalcs[playerId].winnings,
    net_result: payoutCalcs[playerId].netResult,
  }));
}

// =====================================================
// DEBT CALCULATION (WHO OWES WHO)
// =====================================================

/**
 * Debt transaction between two players.
 */
export interface WolfDebtTransaction {
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
}

/**
 * Calculate simplified debts to settle the Wolf game.
 * Uses a greedy algorithm to minimize transactions.
 *
 * @param payouts - Map of player ID to payout info
 * @returns Array of debt transactions
 *
 * @example
 * // p1: +4, p2: 0, p3: -4
 * simplifyWolfDebts({
 *   p1: { netResult: 4 },
 *   p2: { netResult: 0 },
 *   p3: { netResult: -4 },
 * })
 * // [{ fromPlayerId: 'p3', toPlayerId: 'p1', amount: 4 }]
 */
export function simplifyWolfDebts(
  payouts: Record<string, { netResult: number }>
): WolfDebtTransaction[] {
  const transactions: WolfDebtTransaction[] = [];

  // Create mutable copies of net positions
  const positions = Object.entries(payouts).map(([id, p]) => ({
    playerId: id,
    netAmount: p.netResult,
  }));

  // Separate into creditors (positive) and debtors (negative)
  const creditors = positions.filter((p) => p.netAmount > 0.01);
  const debtors = positions.filter((p) => p.netAmount < -0.01);

  // Sort: largest creditors and debtors first
  creditors.sort((a, b) => b.netAmount - a.netAmount);
  debtors.sort((a, b) => a.netAmount - b.netAmount);

  // Match debtors to creditors
  for (const debtor of debtors) {
    let remaining = Math.abs(debtor.netAmount);

    for (const creditor of creditors) {
      if (remaining <= 0.01) break;
      if (creditor.netAmount <= 0.01) continue;

      const amount = Math.min(remaining, creditor.netAmount);
      if (amount > 0.01) {
        transactions.push({
          fromPlayerId: debtor.playerId,
          toPlayerId: creditor.playerId,
          amount: roundCurrency(amount),
        });
      }

      remaining -= amount;
      creditor.netAmount -= amount;
    }
  }

  return transactions;
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validation result structure.
 */
export interface WolfValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate Wolf game participants.
 * Wolf requires exactly 3 or 4 players.
 *
 * @param participantIds - Array of player IDs
 * @returns Validation result
 *
 * @example
 * validateWolfParticipants(['p1', 'p2', 'p3']) // { isValid: true, errors: [] }
 * validateWolfParticipants(['p1', 'p2']) // { isValid: false, errors: ['Wolf requires 3-4 players'] }
 */
export function validateWolfParticipants(
  participantIds: string[]
): WolfValidationResult {
  const errors: string[] = [];

  if (
    participantIds.length < MIN_WOLF_PLAYERS ||
    participantIds.length > MAX_WOLF_PLAYERS
  ) {
    errors.push(`Wolf requires ${MIN_WOLF_PLAYERS}-${MAX_WOLF_PLAYERS} players`);
  }

  // Check for duplicates
  const uniqueIds = new Set(participantIds);
  if (uniqueIds.size !== participantIds.length) {
    errors.push('Duplicate participants not allowed');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate a Wolf decision.
 *
 * @param wolfId - The Wolf player ID
 * @param partnerId - Partner player ID (null for lone wolf)
 * @param participantIds - All participant IDs
 * @returns Validation result
 *
 * @example
 * validateWolfDecision('wolf', 'p2', ['wolf', 'p2', 'p3'])
 * // { isValid: true, errors: [] }
 *
 * validateWolfDecision('wolf', 'wolf', ['wolf', 'p2', 'p3'])
 * // { isValid: false, errors: ['Wolf cannot partner with themselves'] }
 */
export function validateWolfDecision(
  wolfId: string,
  partnerId: string | null,
  participantIds: string[]
): WolfValidationResult {
  const errors: string[] = [];

  // Wolf must be a participant
  if (!participantIds.includes(wolfId)) {
    errors.push('Wolf must be a game participant');
  }

  // Partner validation (if not lone wolf)
  if (partnerId !== null) {
    if (partnerId === wolfId) {
      errors.push('Wolf cannot partner with themselves');
    }
    if (!participantIds.includes(partnerId)) {
      errors.push('Partner must be a game participant');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Check if Blind Wolf is allowed on this hole.
 * Blind Wolf can only be declared before any scores are entered.
 *
 * @param holeScores - Current hole scores (empty if no scores yet)
 * @param blindWolfEnabled - Whether blind wolf is enabled for this game
 * @returns True if Blind Wolf is allowed
 */
export function canDeclareBlindWolf(
  holeScores: WolfHoleScores | null,
  blindWolfEnabled: boolean
): boolean {
  if (!blindWolfEnabled) return false;
  // Blind Wolf only allowed if no scores entered yet
  return !holeScores || Object.keys(holeScores).length === 0;
}

// =====================================================
// GAME STATUS FUNCTIONS
// =====================================================

/**
 * Check if a Wolf game is complete (all 18 holes have decisions and results).
 *
 * @param decisions - Array of hole decisions
 * @returns True if all 18 holes are complete
 */
export function isWolfGameComplete(
  decisions: Pick<WolfHoleDecision, 'hole_number' | 'calculated_at'>[]
): boolean {
  const completedHoles = decisions.filter((d) => d.calculated_at !== null);
  return completedHoles.length >= HOLES_PER_ROUND;
}

/**
 * Get the next hole number that needs a decision.
 *
 * @param decisions - Array of existing decisions
 * @returns Next hole number (1-18) or null if all decided
 */
export function getNextHoleForDecision(
  decisions: Pick<WolfHoleDecision, 'hole_number' | 'decided_at'>[]
): number | null {
  const decidedHoles = new Set(
    decisions.filter((d) => d.decided_at !== null).map((d) => d.hole_number)
  );

  for (let hole = 1; hole <= HOLES_PER_ROUND; hole++) {
    if (!decidedHoles.has(hole)) return hole;
  }
  return null;
}

/**
 * Get the next hole number that needs result calculation.
 *
 * @param decisions - Array of existing decisions
 * @returns Next hole number or null if all calculated
 */
export function getNextHoleForCalculation(
  decisions: Pick<WolfHoleDecision, 'hole_number' | 'decided_at' | 'calculated_at'>[]
): number | null {
  // Find holes with decision but no calculation
  const needsCalculation = decisions.filter(
    (d) => d.decided_at !== null && d.calculated_at === null
  );

  if (needsCalculation.length === 0) return null;

  // Return the lowest hole number
  return Math.min(...needsCalculation.map((d) => d.hole_number));
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Round a number to currency precision (2 decimal places).
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format a number as currency (e.g., "$12.50").
 *
 * @param value - Number to format
 * @returns Formatted currency string
 */
export function formatWolfCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Format a net result with + or - sign.
 *
 * @param value - Net result value
 * @returns Formatted string with sign prefix
 *
 * @example
 * formatWolfNetResult(4.50) // "+$4.50"
 * formatWolfNetResult(-2.00) // "-$2.00"
 * formatWolfNetResult(0) // "$0.00"
 */
export function formatWolfNetResult(value: number): string {
  if (value > 0) {
    return `+$${value.toFixed(2)}`;
  } else if (value < 0) {
    return `-$${Math.abs(value).toFixed(2)}`;
  }
  return '$0.00';
}

/**
 * Get a human-readable description of a Wolf decision.
 *
 * @param isBlindWolf - Whether Blind Wolf was declared
 * @param partnerId - Partner player ID (null for lone wolf)
 * @param partnerName - Partner's name (optional)
 * @returns Description string
 *
 * @example
 * getWolfDecisionDescription(true, null) // "Blind Wolf"
 * getWolfDecisionDescription(false, null) // "Lone Wolf"
 * getWolfDecisionDescription(false, 'p1', 'John') // "Partner: John"
 */
export function getWolfDecisionDescription(
  isBlindWolf: boolean,
  partnerId: string | null,
  partnerName?: string
): string {
  if (isBlindWolf) {
    return 'Blind Wolf';
  }
  if (partnerId === null) {
    return 'Lone Wolf';
  }
  return `Partner: ${partnerName || partnerId}`;
}

/**
 * Get result description for a hole.
 *
 * @param wolfTeamWon - Whether Wolf team won
 * @param isTie - Whether it was a tie
 * @returns Description string
 */
export function getWolfResultDescription(
  wolfTeamWon: boolean | null,
  isTie: boolean
): string {
  if (isTie) {
    return 'Tie - Pushed';
  }
  if (wolfTeamWon === null) {
    return 'Pending';
  }
  return wolfTeamWon ? 'Wolf Wins' : 'Pack Wins';
}
