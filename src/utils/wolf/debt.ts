/**
 * Wolf Debt Calculation Functions
 *
 * Functions for calculating simplified debts to settle
 * Wolf game results between players.
 *
 * Uses the shared debt settlement algorithm from utils/debtSettlement.
 */

import { simplifyDebts } from '../debtSettlement';

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
  const positions = Object.entries(payouts).map(([id, p]) => ({
    id,
    netAmount: p.netResult,
  }));

  const generic = simplifyDebts(positions);
  return generic.map(t => ({
    fromPlayerId: t.fromId,
    toPlayerId: t.toId,
    amount: t.amount,
  }));
}
