/**
 * Skins Calculation Utilities
 *
 * Pure calculation functions for the skins gambling side-game feature.
 * All functions are side-effect free and can be used both client-side
 * and for offline calculations.
 */

import type { Hole } from '@/types/database';
import type {
  SkinsPotType,
  SkinsScoringType,
  SkinsHoleScores,
  SkinsHoleScoreData,
  SkinsResult,
  SkinsGame,
  SkinsPayout,
  SkinsNetPosition,
  SkinsDebtTransaction,
  SkinsTeamHoleScores,
  SkinsTeamHoleScoreData,
  TeamHoleWinnerResult,
  SkinsTeamNetPosition,
  SkinsTeamDebtTransaction,
} from '@/types/database';
import type { TeamFormat } from '@/types/database/enums';
import { getStrokesReceived } from './scoring';

// =====================================================
// CONSTANTS
// =====================================================

/** Number of holes in a standard round */
const HOLES_PER_ROUND = 18;

/** Decimal precision for currency calculations */
const CURRENCY_PRECISION = 2;

// =====================================================
// POT CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate the value of each hole in a skins game.
 *
 * @param potType - 'per_hole' or 'total_pot'
 * @param potValue - Dollar amount configured
 * @returns Value per hole rounded to 2 decimal places
 *
 * @example
 * calculateHoleValue('per_hole', 5) // Returns 5.00
 * calculateHoleValue('total_pot', 90) // Returns 5.00 (90/18)
 */
export function calculateHoleValue(
  potType: SkinsPotType,
  potValue: number
): number {
  if (potType === 'per_hole') {
    return roundCurrency(potValue);
  }
  return roundCurrency(potValue / HOLES_PER_ROUND);
}

/**
 * Calculate the total pot for an entire skins game.
 *
 * @param potType - 'per_hole' or 'total_pot'
 * @param potValue - Dollar amount configured
 * @returns Total pot value for 18 holes
 *
 * @example
 * calculateTotalPot('per_hole', 5) // Returns 90.00 (5*18)
 * calculateTotalPot('total_pot', 90) // Returns 90.00
 */
export function calculateTotalPot(
  potType: SkinsPotType,
  potValue: number
): number {
  if (potType === 'per_hole') {
    return roundCurrency(potValue * HOLES_PER_ROUND);
  }
  return roundCurrency(potValue);
}

/**
 * Calculate each participant's buy-in amount.
 *
 * @param potType - 'per_hole' or 'total_pot'
 * @param potValue - Dollar amount configured
 * @param participantCount - Number of players (2-4)
 * @returns Buy-in per player rounded to 2 decimal places
 *
 * @example
 * calculateBuyIn('per_hole', 5, 4) // Returns 22.50 (90/4)
 * calculateBuyIn('total_pot', 100, 4) // Returns 25.00 (100/4)
 */
export function calculateBuyIn(
  potType: SkinsPotType,
  potValue: number,
  participantCount: number
): number {
  const totalPot = calculateTotalPot(potType, potValue);
  return roundCurrency(totalPot / participantCount);
}

// =====================================================
// SCORE PREPARATION FUNCTIONS
// =====================================================

/**
 * Participant info needed for score preparation
 */
export interface SkinsParticipantInfo {
  id: string;
  handicap: number | null;
}

/**
 * Scorecard data structure for a participant
 */
export interface SkinsScorecardData {
  [holeNumber: string]: { strokes: number } | number;
}

/**
 * Prepare hole scores for all participants on a specific hole.
 * Calculates gross, net, and strokes received for each player.
 *
 * @param participants - Array of participant info with id and handicap
 * @param scorecards - Map of player ID to their scorecard data
 * @param hole - Hole data with par and strokeIndex
 * @param holeNumber - The hole number (1-18)
 * @returns SkinsHoleScores record for database storage
 *
 * @example
 * const scores = prepareHoleScores(
 *   [{ id: 'p1', handicap: 18 }, { id: 'p2', handicap: 10 }],
 *   { p1: { '1': { strokes: 5 } }, p2: { '1': { strokes: 4 } } },
 *   { par: 4, strokeIndex: 5 },
 *   1
 * );
 * // Returns: { p1: { gross: 5, net: 4, strokes_received: 1 }, p2: { gross: 4, net: 4, strokes_received: 0 } }
 */
export function prepareHoleScores(
  participants: SkinsParticipantInfo[],
  scorecards: Record<string, SkinsScorecardData>,
  hole: Pick<Hole, 'par' | 'strokeIndex'>,
  holeNumber: number
): SkinsHoleScores {
  const holeScores: SkinsHoleScores = {};

  for (const participant of participants) {
    const scorecard = scorecards[participant.id];
    if (!scorecard) continue;

    const holeData = scorecard[String(holeNumber)];
    if (holeData === undefined) continue;

    const gross = typeof holeData === 'number' ? holeData : holeData.strokes;
    const handicap = participant.handicap ?? 0;
    const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
    const net = gross - strokesReceived;

    holeScores[participant.id] = {
      gross,
      net,
      strokes_received: strokesReceived,
    };
  }

  return holeScores;
}

// =====================================================
// WINNER DETERMINATION FUNCTIONS
// =====================================================

/**
 * Result of determining a hole winner
 */
export interface HoleWinnerResult {
  /** Player ID of winner, null if carryover */
  winnerId: string | null;
  /** True if hole was tied (carryover) */
  isCarryover: boolean;
  /** The winning/tied score */
  minScore: number;
  /** Player IDs who tied for best score */
  tiedPlayerIds: string[];
}

/**
 * Determine the winner of a hole based on scores and scoring type.
 *
 * @param holeScores - Scores for all participants
 * @param scoringType - 'gross' or 'net'
 * @returns Winner result with winnerId (null if tie), isCarryover flag, and tied players
 *
 * @example
 * const result = determineHoleWinner(
 *   { p1: { gross: 4, net: 3, strokes_received: 1 }, p2: { gross: 4, net: 4, strokes_received: 0 } },
 *   'net'
 * );
 * // Returns: { winnerId: 'p1', isCarryover: false, minScore: 3, tiedPlayerIds: ['p1'] }
 */
export function determineHoleWinner(
  holeScores: SkinsHoleScores,
  scoringType: SkinsScoringType
): HoleWinnerResult {
  const playerIds = Object.keys(holeScores);

  if (playerIds.length === 0) {
    return {
      winnerId: null,
      isCarryover: true,
      minScore: 0,
      tiedPlayerIds: [],
    };
  }

  // Find the minimum score based on scoring type
  let minScore = Infinity;
  for (const playerId of playerIds) {
    const score = scoringType === 'gross'
      ? holeScores[playerId].gross
      : holeScores[playerId].net;
    if (score < minScore) {
      minScore = score;
    }
  }

  // Find all players with the minimum score
  const tiedPlayerIds = playerIds.filter((playerId) => {
    const score = scoringType === 'gross'
      ? holeScores[playerId].gross
      : holeScores[playerId].net;
    return score === minScore;
  });

  // If more than one player has the minimum score, it's a tie (carryover)
  const isCarryover = tiedPlayerIds.length > 1;
  const winnerId = isCarryover ? null : tiedPlayerIds[0];

  return {
    winnerId,
    isCarryover,
    minScore,
    tiedPlayerIds,
  };
}

// =====================================================
// TEAM SCORE PREPARATION FUNCTIONS
// =====================================================

/**
 * Team info needed for team skins score preparation
 */
export interface SkinsTeamInfo {
  id: string;
  /** Member player IDs */
  member_ids: string[];
  /** Member details with handicaps (optional, populated for score calculation) */
  members?: Array<{ id: string; handicap: number | null }>;
}

/**
 * Prepare team hole scores for all teams on a specific hole.
 * Calculates team scores based on team format (best-ball, scramble, shamble).
 *
 * @param teams - Array of team info with member IDs and handicaps
 * @param scorecards - Map of player ID to their scorecard data
 * @param hole - Hole data with par and strokeIndex
 * @param holeNumber - The hole number (1-18)
 * @param teamFormat - The team format ('best-ball', 'scramble', 'shamble')
 * @returns SkinsTeamHoleScores record for database storage
 *
 * @example
 * const scores = prepareTeamHoleScores(
 *   [{ id: 't1', member_ids: ['p1', 'p2'], members: [...] }],
 *   { p1: { '1': { strokes: 5 } }, p2: { '1': { strokes: 4 } } },
 *   { par: 4, strokeIndex: 5 },
 *   1,
 *   'best-ball'
 * );
 */
export function prepareTeamHoleScores(
  teams: SkinsTeamInfo[],
  scorecards: Record<string, SkinsScorecardData>,
  hole: Pick<Hole, 'par' | 'strokeIndex'>,
  holeNumber: number,
  teamFormat: TeamFormat
): SkinsTeamHoleScores {
  const teamScores: SkinsTeamHoleScores = {};

  for (const team of teams) {
    // Calculate individual member scores first
    const memberScores: Record<string, SkinsHoleScoreData> = {};
    let bestNetScore = Infinity;
    let bestGrossScore = Infinity;
    let contributingPlayerId: string | undefined;

    for (const memberId of team.member_ids) {
      const scorecard = scorecards[memberId];
      if (!scorecard) continue;

      const holeData = scorecard[String(holeNumber)];
      if (holeData === undefined) continue;

      const gross = typeof holeData === 'number' ? holeData : holeData.strokes;

      // Find member handicap
      const member = team.members?.find((m) => m.id === memberId);
      const handicap = member?.handicap ?? 0;
      const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
      const net = gross - strokesReceived;

      memberScores[memberId] = {
        gross,
        net,
        strokes_received: strokesReceived,
      };

      // Track best scores for team calculation
      if (net < bestNetScore) {
        bestNetScore = net;
        contributingPlayerId = memberId;
      }
      if (gross < bestGrossScore) {
        bestGrossScore = gross;
      }
    }

    // Skip if no member scores
    if (Object.keys(memberScores).length === 0) continue;

    // Calculate team score based on format
    let teamScore: number;

    switch (teamFormat) {
      case 'best-ball':
      case 'shamble':
        // Best individual net score
        teamScore = bestNetScore;
        break;
      case 'scramble':
        // For scramble, all players play from the same position
        // The team score is typically the single team score (all players have same score)
        // Use the best gross score as the team score
        teamScore = bestGrossScore;
        contributingPlayerId = undefined; // All contribute in scramble
        break;
      default:
        // For other formats (aggregate, match-play-team), use best net
        teamScore = bestNetScore;
    }

    teamScores[team.id] = {
      team_score: teamScore,
      member_scores: memberScores,
      contributing_player_id: contributingPlayerId,
    };
  }

  return teamScores;
}

/**
 * Get the comparison score for a team based on format and scoring type.
 *
 * @param teamData - Team hole score data
 * @param teamFormat - Team format ('best-ball', 'scramble', 'shamble')
 * @param scoringType - 'gross' or 'net'
 * @returns The score to use for comparison
 */
export function getTeamScoreForFormat(
  teamData: SkinsTeamHoleScoreData,
  teamFormat: TeamFormat,
  scoringType: SkinsScoringType
): number {
  switch (teamFormat) {
    case 'scramble':
      // Scramble always uses the team_score (gross-based)
      return teamData.team_score;

    case 'best-ball':
    case 'shamble':
      // Best individual score - recalculate from member scores
      if (scoringType === 'gross') {
        return Math.min(
          ...Object.values(teamData.member_scores).map((s) => s.gross)
        );
      }
      // Net scoring - use pre-calculated team_score or find best net
      return Math.min(
        ...Object.values(teamData.member_scores).map((s) => s.net)
      );

    default:
      // Default to team_score
      return teamData.team_score;
  }
}

// =====================================================
// TEAM WINNER DETERMINATION FUNCTIONS
// =====================================================

/**
 * Determine the winning team for a hole based on team scores and format.
 * Ties always result in carryover (no tie-breakers).
 *
 * @param teamScores - Scores for all teams
 * @param teamFormat - Team format ('best-ball', 'scramble', 'shamble')
 * @param scoringType - 'gross' or 'net'
 * @returns Winner result with winnerTeamId (null if tie), isCarryover flag, and tied teams
 *
 * @example
 * const result = determineTeamHoleWinner(
 *   { t1: { team_score: 3, member_scores: {...} }, t2: { team_score: 4, member_scores: {...} } },
 *   'best-ball',
 *   'net'
 * );
 * // Returns: { winnerTeamId: 't1', isCarryover: false, minScore: 3, tiedTeamIds: ['t1'] }
 */
export function determineTeamHoleWinner(
  teamScores: SkinsTeamHoleScores,
  teamFormat: TeamFormat,
  scoringType: SkinsScoringType
): TeamHoleWinnerResult {
  const teamIds = Object.keys(teamScores);

  if (teamIds.length === 0) {
    return {
      winnerTeamId: null,
      isCarryover: true,
      minScore: 0,
      tiedTeamIds: [],
    };
  }

  // Find the minimum score based on format and scoring type
  let minScore = Infinity;
  for (const teamId of teamIds) {
    const score = getTeamScoreForFormat(
      teamScores[teamId],
      teamFormat,
      scoringType
    );
    if (score < minScore) {
      minScore = score;
    }
  }

  // Find all teams with the minimum score
  const tiedTeamIds = teamIds.filter((teamId) => {
    const score = getTeamScoreForFormat(
      teamScores[teamId],
      teamFormat,
      scoringType
    );
    return score === minScore;
  });

  // If more than one team has the minimum score, it's a tie (carryover)
  const isCarryover = tiedTeamIds.length > 1;
  const winnerTeamId = isCarryover ? null : tiedTeamIds[0];

  return {
    winnerTeamId,
    isCarryover,
    minScore,
    tiedTeamIds,
  };
}

// =====================================================
// TEAM HOLE RESULT PROCESSING
// =====================================================

/**
 * Processed team hole result (without database IDs)
 */
export interface ProcessedTeamHoleResult {
  hole_number: number;
  team_winner_id: string | null;
  is_carryover: boolean;
  hole_scores: SkinsTeamHoleScores;
  hole_pot_value: number;
  carryover_to_next: number;
  payout_amount: number;
}

/**
 * Process a team hole result, calculating pot values and carryover.
 *
 * @param holeNumber - The hole number (1-18)
 * @param teamScores - Scores for all teams
 * @param baseHoleValue - Base pot value for this hole
 * @param currentCarryover - Carryover from previous holes
 * @param teamFormat - Team format ('best-ball', 'scramble', 'shamble')
 * @param scoringType - 'gross' or 'net'
 * @returns Processed result ready for database insert (without IDs)
 *
 * @example
 * const result = processTeamHoleResult(3, teamScores, 5, 10, 'best-ball', 'net');
 * // If winner: { payout_amount: 15, carryover_to_next: 0 }
 * // If tie: { payout_amount: 0, carryover_to_next: 15 }
 */
export function processTeamHoleResult(
  holeNumber: number,
  teamScores: SkinsTeamHoleScores,
  baseHoleValue: number,
  currentCarryover: number,
  teamFormat: TeamFormat,
  scoringType: SkinsScoringType
): ProcessedTeamHoleResult {
  const { winnerTeamId, isCarryover } = determineTeamHoleWinner(
    teamScores,
    teamFormat,
    scoringType
  );
  const totalHolePot = roundCurrency(baseHoleValue + currentCarryover);

  if (isCarryover) {
    return {
      hole_number: holeNumber,
      team_winner_id: null,
      is_carryover: true,
      hole_scores: teamScores,
      hole_pot_value: baseHoleValue,
      carryover_to_next: totalHolePot,
      payout_amount: 0,
    };
  }

  return {
    hole_number: holeNumber,
    team_winner_id: winnerTeamId,
    is_carryover: false,
    hole_scores: teamScores,
    hole_pot_value: baseHoleValue,
    carryover_to_next: 0,
    payout_amount: totalHolePot,
  };
}

// =====================================================
// TEAM PAYOUT CALCULATIONS
// =====================================================

/**
 * Team participant info for payout calculations
 */
export interface TeamPayoutParticipant {
  id: string;
  /** Number of members in the team (for split calculation) */
  member_count: number;
}

/**
 * Calculated team payout data (without database IDs)
 */
export interface CalculatedTeamPayout {
  team_id: string;
  buy_in: number;
  total_winnings: number;
  net_result: number;
  holes_won: number;
  holes_tied: number;
  holes_lost: number;
  /** Per-member split of net result */
  per_member_amount: number;
}

/**
 * Result of final team payout calculation with carryover info
 */
export interface FinalTeamPayoutResult {
  /** Payouts for each team */
  payouts: CalculatedTeamPayout[];
  /** Remaining carryover (for pool-sourced games) */
  remainingCarryover: number;
  /** Whether hole 18 carryover was split among teams */
  hole18CarryoverSplit: boolean;
}

/**
 * Calculate final payouts for all teams in a completed team skins game.
 *
 * @param game - The skins game configuration
 * @param results - All hole results
 * @param teams - List of teams with member counts
 * @param options - Options including poolSourced flag
 * @returns Team payout result with payouts and carryover info
 */
export function calculateTeamFinalPayouts(
  game: Pick<SkinsGame, 'pot_type' | 'pot_value' | 'participant_team_ids'>,
  results: Pick<
    SkinsResult,
    | 'hole_number'
    | 'team_winner_id'
    | 'is_carryover'
    | 'payout_amount'
    | 'carryover_to_next'
    | 'hole_scores'
  >[],
  teams: TeamPayoutParticipant[],
  options?: FinalPayoutOptions
): FinalTeamPayoutResult {
  const buyIn = calculateBuyIn(game.pot_type, game.pot_value, teams.length);
  const poolSourced = options?.poolSourced ?? false;

  // Initialize payout tracking for each team
  const payoutMap = new Map<string, CalculatedTeamPayout>();
  for (const team of teams) {
    payoutMap.set(team.id, {
      team_id: team.id,
      buy_in: buyIn,
      total_winnings: 0,
      net_result: 0,
      holes_won: 0,
      holes_tied: 0,
      holes_lost: 0,
      per_member_amount: 0,
    });
  }

  // Process each hole result
  for (const result of results) {
    const teamIds = Object.keys(result.hole_scores);

    if (result.is_carryover) {
      // All teams in this hole tied
      for (const teamId of teamIds) {
        const payout = payoutMap.get(teamId);
        if (payout) {
          payout.holes_tied += 1;
        }
      }
    } else if (result.team_winner_id) {
      // One winner, everyone else lost
      for (const teamId of teamIds) {
        const payout = payoutMap.get(teamId);
        if (payout) {
          if (teamId === result.team_winner_id) {
            payout.holes_won += 1;
            payout.total_winnings += result.payout_amount;
          } else {
            payout.holes_lost += 1;
          }
        }
      }
    }
  }

  // Calculate remaining carryover (from hole 18 if it was tied)
  const remainingCarryover = calculateCurrentCarryover(results);
  let hole18CarryoverSplit = false;

  // For direct pot games, split hole 18 carryover among teams
  if (remainingCarryover > 0 && !poolSourced) {
    const splitAmount = calculateHole18Split(remainingCarryover, teams.length);
    for (const payout of payoutMap.values()) {
      payout.total_winnings += splitAmount;
    }
    hole18CarryoverSplit = true;
  }

  // Calculate net results and per-member amounts
  const payouts: CalculatedTeamPayout[] = [];
  for (const payout of payoutMap.values()) {
    payout.net_result = roundCurrency(payout.total_winnings - payout.buy_in);

    // Find team to get member count
    const team = teams.find((t) => t.id === payout.team_id);
    const memberCount = team?.member_count ?? 1;
    payout.per_member_amount = roundCurrency(payout.net_result / memberCount);

    payouts.push(payout);
  }

  return {
    payouts,
    remainingCarryover: poolSourced ? remainingCarryover : 0,
    hole18CarryoverSplit,
  };
}

// =====================================================
// TEAM DEBT CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate net positions for all teams from payouts.
 *
 * @param payouts - Array of team payouts
 * @param teams - Array of teams with member counts
 * @returns Array of net positions sorted by amount (creditors first)
 */
export function calculateTeamNetPositions(
  payouts: Pick<CalculatedTeamPayout, 'team_id' | 'net_result'>[],
  teams: TeamPayoutParticipant[]
): SkinsTeamNetPosition[] {
  return payouts
    .map((p) => {
      const team = teams.find((t) => t.id === p.team_id);
      const memberCount = team?.member_count ?? 1;
      return {
        team_id: p.team_id,
        net_amount: p.net_result,
        per_member_amount: roundCurrency(p.net_result / memberCount),
      };
    })
    .sort((a, b) => b.net_amount - a.net_amount); // Creditors first
}

/**
 * Simplify team debts to minimize the number of transactions.
 *
 * @param netPositions - Net positions for all teams
 * @param teams - Array of teams with member counts
 * @returns Minimal set of team transactions to settle all debts
 */
export function simplifyTeamDebts(
  netPositions: SkinsTeamNetPosition[],
  teams: TeamPayoutParticipant[]
): SkinsTeamDebtTransaction[] {
  const transactions: SkinsTeamDebtTransaction[] = [];

  // Create mutable copies
  const positions = netPositions.map((p) => ({ ...p }));

  // Separate into creditors (positive) and debtors (negative)
  const creditors = positions.filter((p) => p.net_amount > 0);
  const debtors = positions.filter((p) => p.net_amount < 0);

  // Match debtors to creditors
  for (const debtor of debtors) {
    let remaining = Math.abs(debtor.net_amount);
    const debtorTeam = teams.find((t) => t.id === debtor.team_id);
    const debtorMemberCount = debtorTeam?.member_count ?? 1;

    for (const creditor of creditors) {
      if (remaining <= 0) break;
      if (creditor.net_amount <= 0) continue;

      const amount = Math.min(remaining, creditor.net_amount);
      if (amount > 0.01) {
        // Skip tiny amounts
        transactions.push({
          from_team_id: debtor.team_id,
          to_team_id: creditor.team_id,
          amount: roundCurrency(amount),
          per_member_amount: roundCurrency(amount / debtorMemberCount),
        });
      }

      remaining -= amount;
      creditor.net_amount -= amount;
    }
  }

  return transactions;
}

/**
 * Team name lookup map
 */
export type TeamNameMap = Record<string, string>;

/**
 * Format team debt transactions as human-readable strings.
 *
 * @param transactions - Array of team debt transactions
 * @param teamMap - Map of team IDs to names
 * @returns Array of formatted strings like "Team A owes Team B: $12.50 ($6.25/member)"
 */
export function formatTeamDebtTransactions(
  transactions: SkinsTeamDebtTransaction[],
  teamMap: TeamNameMap
): string[] {
  return transactions.map((t) => {
    const fromName = teamMap[t.from_team_id] || 'Unknown';
    const toName = teamMap[t.to_team_id] || 'Unknown';
    return `${fromName} owes ${toName}: $${t.amount.toFixed(2)} ($${t.per_member_amount.toFixed(2)}/member)`;
  });
}

// =====================================================
// CARRYOVER CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate the current carryover amount from previous results.
 *
 * @param results - Array of skins results so far
 * @returns Current carryover amount (0 if no results or last hole was won)
 *
 * @example
 * const carryover = calculateCurrentCarryover([
 *   { hole_number: 1, carryover_to_next: 5 },
 *   { hole_number: 2, carryover_to_next: 10 },
 * ]);
 * // Returns: 10
 */
export function calculateCurrentCarryover(
  results: Pick<SkinsResult, 'hole_number' | 'carryover_to_next'>[]
): number {
  if (results.length === 0) return 0;

  // Sort by hole number descending and get the last result
  const sortedResults = [...results].sort((a, b) => b.hole_number - a.hole_number);
  return sortedResults[0].carryover_to_next;
}

// =====================================================
// HOLE RESULT PROCESSING
// =====================================================

/**
 * Processed hole result (without database IDs)
 */
export interface ProcessedHoleResult {
  hole_number: number;
  winner_id: string | null;
  is_carryover: boolean;
  hole_scores: SkinsHoleScores;
  hole_pot_value: number;
  carryover_to_next: number;
  payout_amount: number;
}

/**
 * Process a hole result, calculating pot values and carryover.
 *
 * @param holeNumber - The hole number (1-18)
 * @param holeScores - Scores for all participants
 * @param baseHoleValue - Base pot value for this hole
 * @param currentCarryover - Carryover from previous holes
 * @param scoringType - 'gross' or 'net'
 * @returns Processed result ready for database insert (without IDs)
 *
 * @example
 * const result = processHoleResult(3, holeScores, 5, 10, 'gross');
 * // If winner: { payout_amount: 15, carryover_to_next: 0 }
 * // If tie: { payout_amount: 0, carryover_to_next: 15 }
 */
export function processHoleResult(
  holeNumber: number,
  holeScores: SkinsHoleScores,
  baseHoleValue: number,
  currentCarryover: number,
  scoringType: SkinsScoringType
): ProcessedHoleResult {
  const { winnerId, isCarryover } = determineHoleWinner(holeScores, scoringType);
  const totalHolePot = roundCurrency(baseHoleValue + currentCarryover);

  if (isCarryover) {
    return {
      hole_number: holeNumber,
      winner_id: null,
      is_carryover: true,
      hole_scores: holeScores,
      hole_pot_value: baseHoleValue,
      carryover_to_next: totalHolePot,
      payout_amount: 0,
    };
  }

  return {
    hole_number: holeNumber,
    winner_id: winnerId,
    is_carryover: false,
    hole_scores: holeScores,
    hole_pot_value: baseHoleValue,
    carryover_to_next: 0,
    payout_amount: totalHolePot,
  };
}

// =====================================================
// HOLE 18 SPLIT
// =====================================================

/**
 * Calculate how to split remaining carryover at hole 18.
 * When the last hole is tied, the remaining pot is split evenly.
 *
 * @param carryoverAmount - Total carryover to split
 * @param participantCount - Number of players to split among
 * @returns Amount each player receives
 *
 * @example
 * calculateHole18Split(20, 4) // Returns 5.00
 * calculateHole18Split(10, 3) // Returns 3.33
 */
export function calculateHole18Split(
  carryoverAmount: number,
  participantCount: number
): number {
  return roundCurrency(carryoverAmount / participantCount);
}

// =====================================================
// FINAL PAYOUT CALCULATIONS
// =====================================================

/**
 * Minimal participant info for payout calculations
 */
export interface PayoutParticipant {
  id: string;
}

/**
 * Calculated payout data (without database IDs)
 */
export interface CalculatedPayout {
  player_id: string;
  buy_in: number;
  total_winnings: number;
  net_result: number;
  holes_won: number;
  holes_tied: number;
  holes_lost: number;
}

/**
 * Result of final payout calculation with carryover info
 */
export interface FinalPayoutResult {
  /** Payouts for each participant */
  payouts: CalculatedPayout[];
  /** Remaining carryover (for pool-sourced games, this should be returned to pool) */
  remainingCarryover: number;
  /** Whether hole 18 carryover was split among participants */
  hole18CarryoverSplit: boolean;
}

/**
 * Options for final payout calculation
 */
export interface FinalPayoutOptions {
  /**
   * Whether the game is funded from a prize pool.
   * If true, hole 18 carryover is NOT split among participants
   * and should be returned to the pool instead.
   */
  poolSourced?: boolean;
}

/**
 * Calculate final payouts for all participants in a completed skins game.
 *
 * @param game - The skins game configuration
 * @param results - All hole results
 * @param participants - List of participants
 * @returns Array of calculated payouts for each participant
 *
 * @example
 * const payouts = calculateFinalPayouts(game, results, participants);
 * // Returns: [{ player_id: 'p1', buy_in: 22.50, total_winnings: 45, net_result: 22.50, ... }]
 */
export function calculateFinalPayouts(
  game: Pick<SkinsGame, 'pot_type' | 'pot_value' | 'participant_ids'>,
  results: Pick<SkinsResult, 'winner_id' | 'is_carryover' | 'payout_amount' | 'hole_scores'>[],
  participants: PayoutParticipant[]
): CalculatedPayout[] {
  const result = calculateFinalPayoutsWithCarryover(game, results, participants);
  return result.payouts;
}

/**
 * Calculate final payouts with carryover handling for pool-sourced games.
 *
 * For direct pot games (poolSourced=false or undefined):
 * - Hole 18 carryover is split evenly among all participants
 *
 * For pool-sourced games (poolSourced=true):
 * - Hole 18 carryover is NOT split - it's returned to the pool
 * - The remainingCarryover field indicates the amount to return
 *
 * @param game - The skins game configuration
 * @param results - All hole results (should include all 18 holes)
 * @param participants - List of participants
 * @param options - Options including poolSourced flag
 * @returns Final payout result with payouts and carryover info
 *
 * @example
 * // Direct pot game - carryover is split
 * const result = calculateFinalPayoutsWithCarryover(game, results, participants);
 * // result.hole18CarryoverSplit = true, result.remainingCarryover = 0
 *
 * @example
 * // Pool-sourced game - carryover returns to pool
 * const result = calculateFinalPayoutsWithCarryover(game, results, participants, { poolSourced: true });
 * // result.hole18CarryoverSplit = false, result.remainingCarryover = 10 (to return to pool)
 */
export function calculateFinalPayoutsWithCarryover(
  game: Pick<SkinsGame, 'pot_type' | 'pot_value' | 'participant_ids'>,
  results: Pick<SkinsResult, 'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'>[],
  participants: PayoutParticipant[],
  options?: FinalPayoutOptions
): FinalPayoutResult {
  const buyIn = calculateBuyIn(game.pot_type, game.pot_value, participants.length);
  const poolSourced = options?.poolSourced ?? false;

  // Initialize payout tracking for each participant
  const payoutMap = new Map<string, CalculatedPayout>();
  for (const participant of participants) {
    payoutMap.set(participant.id, {
      player_id: participant.id,
      buy_in: buyIn,
      total_winnings: 0,
      net_result: 0,
      holes_won: 0,
      holes_tied: 0,
      holes_lost: 0,
    });
  }

  // Process each hole result
  for (const result of results) {
    const participantIds = Object.keys(result.hole_scores);

    if (result.is_carryover) {
      // All participants in this hole tied
      for (const playerId of participantIds) {
        const payout = payoutMap.get(playerId);
        if (payout) {
          payout.holes_tied += 1;
        }
      }
    } else if (result.winner_id) {
      // One winner, everyone else lost
      for (const playerId of participantIds) {
        const payout = payoutMap.get(playerId);
        if (payout) {
          if (playerId === result.winner_id) {
            payout.holes_won += 1;
            payout.total_winnings += result.payout_amount;
          } else {
            payout.holes_lost += 1;
          }
        }
      }
    }
  }

  // Calculate remaining carryover (from hole 18 if it was tied)
  const remainingCarryover = calculateCurrentCarryover(results);
  let hole18CarryoverSplit = false;

  // For direct pot games, split hole 18 carryover among participants
  // For pool-sourced games, don't split - return to pool instead
  if (remainingCarryover > 0 && !poolSourced) {
    const splitAmount = calculateHole18Split(remainingCarryover, participants.length);
    for (const payout of payoutMap.values()) {
      payout.total_winnings += splitAmount;
    }
    hole18CarryoverSplit = true;
  }

  // Calculate net results
  const payouts: CalculatedPayout[] = [];
  for (const payout of payoutMap.values()) {
    payout.net_result = roundCurrency(payout.total_winnings - payout.buy_in);
    payouts.push(payout);
  }

  return {
    payouts,
    remainingCarryover: poolSourced ? remainingCarryover : 0,
    hole18CarryoverSplit,
  };
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validation result structure
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate skins game configuration.
 *
 * @param participantIds - Array of player IDs
 * @param potValue - Configured pot value
 * @returns Validation result with isValid flag and error messages
 *
 * @example
 * validateSkinsGame(['p1', 'p2'], 5) // { isValid: true, errors: [] }
 * validateSkinsGame(['p1'], 5) // { isValid: false, errors: ['At least 2 participants required'] }
 */
export function validateSkinsGame(
  participantIds: string[],
  potValue: number
): ValidationResult {
  const errors: string[] = [];

  if (participantIds.length < 2) {
    errors.push('At least 2 participants required');
  }
  if (potValue <= 0) {
    errors.push('Pot value must be greater than 0');
  }

  // Check for duplicate participants
  const uniqueIds = new Set(participantIds);
  if (uniqueIds.size !== participantIds.length) {
    errors.push('Duplicate participants not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hole scores validation result
 */
export interface HoleScoresValidationResult {
  isValid: boolean;
  missingPlayerIds: string[];
}

/**
 * Validate that all participants have scores for a hole.
 *
 * @param holeScores - Scores recorded for the hole
 * @param participantIds - Expected participant IDs
 * @returns Validation result with list of missing players
 *
 * @example
 * validateHoleScores({ p1: {...}, p2: {...} }, ['p1', 'p2', 'p3'])
 * // { isValid: false, missingPlayerIds: ['p3'] }
 */
export function validateHoleScores(
  holeScores: SkinsHoleScores,
  participantIds: string[]
): HoleScoresValidationResult {
  const scoredPlayerIds = new Set(Object.keys(holeScores));
  const missingPlayerIds = participantIds.filter(id => !scoredPlayerIds.has(id));

  return {
    isValid: missingPlayerIds.length === 0,
    missingPlayerIds,
  };
}

// =====================================================
// DEBT CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate net positions for all players from payouts.
 * Positive = owes money to the pot, Negative = owed money from the pot.
 *
 * @param payouts - Array of player payouts
 * @returns Array of net positions sorted by amount (creditors first)
 *
 * @example
 * calculateNetPositions([
 *   { player_id: 'p1', net_result: 22.50 },
 *   { player_id: 'p2', net_result: -12.50 },
 * ])
 * // Returns: [{ player_id: 'p1', net_amount: 22.50 }, { player_id: 'p2', net_amount: -12.50 }]
 */
export function calculateNetPositions(
  payouts: Pick<SkinsPayout, 'player_id' | 'net_result'>[]
): SkinsNetPosition[] {
  return payouts
    .map(p => ({
      player_id: p.player_id,
      net_amount: p.net_result,
    }))
    .sort((a, b) => b.net_amount - a.net_amount); // Creditors first
}

/**
 * Simplify debts to minimize the number of transactions.
 * Uses a greedy algorithm to match creditors with debtors.
 *
 * @param netPositions - Net positions for all players
 * @returns Minimal set of transactions to settle all debts
 *
 * @example
 * simplifyDebts([
 *   { player_id: 'p1', net_amount: 22.50 },
 *   { player_id: 'p2', net_amount: 2.50 },
 *   { player_id: 'p3', net_amount: -12.50 },
 *   { player_id: 'p4', net_amount: -12.50 },
 * ])
 * // Returns: [
 * //   { from_player_id: 'p3', to_player_id: 'p1', amount: 12.50 },
 * //   { from_player_id: 'p4', to_player_id: 'p1', amount: 10.00 },
 * //   { from_player_id: 'p4', to_player_id: 'p2', amount: 2.50 },
 * // ]
 */
export function simplifyDebts(
  netPositions: SkinsNetPosition[]
): SkinsDebtTransaction[] {
  const transactions: SkinsDebtTransaction[] = [];

  // Create mutable copies
  const positions = netPositions.map(p => ({ ...p }));

  // Separate into creditors (positive) and debtors (negative)
  const creditors = positions.filter(p => p.net_amount > 0);
  const debtors = positions.filter(p => p.net_amount < 0);

  // Match debtors to creditors
  for (const debtor of debtors) {
    let remaining = Math.abs(debtor.net_amount);

    for (const creditor of creditors) {
      if (remaining <= 0) break;
      if (creditor.net_amount <= 0) continue;

      const amount = Math.min(remaining, creditor.net_amount);
      if (amount > 0.01) { // Skip tiny amounts
        transactions.push({
          from_player_id: debtor.player_id,
          to_player_id: creditor.player_id,
          amount: roundCurrency(amount),
        });
      }

      remaining -= amount;
      creditor.net_amount -= amount;
    }
  }

  return transactions;
}

/**
 * Player name lookup map
 */
export type PlayerNameMap = Record<string, string>;

/**
 * Format debt transactions as human-readable strings.
 *
 * @param transactions - Array of debt transactions
 * @param playerMap - Map of player IDs to names
 * @returns Array of formatted strings like "John owes Sarah: $12.50"
 *
 * @example
 * formatDebtTransactions(
 *   [{ from_player_id: 'p1', to_player_id: 'p2', amount: 12.50 }],
 *   { p1: 'John', p2: 'Sarah' }
 * )
 * // Returns: ['John owes Sarah: $12.50']
 */
export function formatDebtTransactions(
  transactions: SkinsDebtTransaction[],
  playerMap: PlayerNameMap
): string[] {
  return transactions.map(t => {
    const fromName = playerMap[t.from_player_id] || 'Unknown';
    const toName = playerMap[t.to_player_id] || 'Unknown';
    return `${fromName} owes ${toName}: $${t.amount.toFixed(2)}`;
  });
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Round a number to currency precision (2 decimal places).
 *
 * @param value - Number to round
 * @returns Rounded number
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format a number as currency (e.g., "$12.50")
 *
 * @param value - Number to format
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(12.5) // Returns "$12.50"
 * formatCurrency(0) // Returns "$0.00"
 */
export function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Format a net result with + or - sign
 *
 * @param value - Net result value (positive or negative)
 * @returns Formatted string with sign prefix
 *
 * @example
 * formatNetResult(22.50) // Returns "+$22.50"
 * formatNetResult(-12.50) // Returns "-$12.50"
 * formatNetResult(0) // Returns "$0.00"
 */
export function formatNetResult(value: number): string {
  if (value > 0) {
    return `+$${value.toFixed(2)}`;
  } else if (value < 0) {
    return `-$${Math.abs(value).toFixed(2)}`;
  }
  return '$0.00';
}

/**
 * Check if a skins game is complete (all 18 holes played).
 *
 * @param results - Array of hole results
 * @returns True if all 18 holes have results
 */
export function isSkinsGameComplete(
  results: Pick<SkinsResult, 'hole_number'>[]
): boolean {
  return results.length >= HOLES_PER_ROUND;
}

/**
 * Get the next hole number to process.
 *
 * @param results - Array of existing results
 * @returns Next hole number (1-18) or null if complete
 */
export function getNextHoleNumber(
  results: Pick<SkinsResult, 'hole_number'>[]
): number | null {
  if (results.length >= HOLES_PER_ROUND) return null;

  const completedHoles = new Set(results.map(r => r.hole_number));
  for (let i = 1; i <= HOLES_PER_ROUND; i++) {
    if (!completedHoles.has(i)) return i;
  }
  return null;
}
