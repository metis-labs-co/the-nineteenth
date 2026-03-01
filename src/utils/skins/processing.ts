/**
 * Skins Hole Result Processing Functions
 *
 * Functions for processing hole results, calculating pot values,
 * carryover amounts, and hole 18 splits.
 */

import type {
  SkinsScoringType,
  SkinsHoleScores,
  SkinsTeamHoleScores,
  SkinsResult,
} from '@/types/database';
import type { TeamFormat } from '@/types/database/enums';
import { roundCurrency } from '../currency';
import { determineHoleWinner } from './winner';
import { determineTeamHoleWinner } from './teamWinner';

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
