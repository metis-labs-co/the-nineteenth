/**
 * Skins Pot Calculation Functions
 *
 * Functions for calculating hole values, total pots, and buy-in amounts.
 */

import type { SkinsPotType } from '@/types/database';
import { roundCurrency } from '../currency';
import { HOLES_PER_ROUND } from '@/constants/scoring';

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
