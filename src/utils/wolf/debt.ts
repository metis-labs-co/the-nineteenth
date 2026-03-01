/**
 * Wolf Debt Calculation Functions
 *
 * Functions for calculating simplified debts to settle
 * Wolf game results between players.
 */

import { roundCurrency } from '../currency';

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
