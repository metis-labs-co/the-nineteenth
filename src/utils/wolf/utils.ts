/**
 * Wolf Utility Functions
 *
 * Helper functions for formatting and describing Wolf game
 * decisions and results.
 */

import { formatCurrency, formatNetResult } from '../currency';

/** @deprecated Use formatCurrency from '@/utils/currency' directly */
export const formatWolfCurrency = formatCurrency;

/** @deprecated Use formatNetResult from '@/utils/currency' directly */
export const formatWolfNetResult = formatNetResult;

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
