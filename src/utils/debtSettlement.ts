/**
 * Generic Debt Settlement Algorithm
 *
 * Shared greedy algorithm for minimizing the number of transactions
 * needed to settle debts between participants. Used by both Skins
 * and Wolf game calculations.
 */

import { roundCurrency } from './currency';

/** Minimum threshold to consider a debt meaningful (avoids rounding dust) */
const MIN_AMOUNT = 0.01;

/**
 * A participant with a net position (positive = owed money, negative = owes money).
 */
export interface NetPosition {
  id: string;
  netAmount: number;
}

/**
 * A simplified transaction between two participants.
 */
export interface DebtTransaction {
  fromId: string;
  toId: string;
  amount: number;
}

/**
 * Simplify debts to minimize the number of transactions.
 * Uses a greedy algorithm to match creditors with debtors.
 *
 * @param positions - Array of { id, netAmount } for each participant.
 *                    Positive netAmount = owed money (creditor).
 *                    Negative netAmount = owes money (debtor).
 * @returns Minimal set of transactions to settle all debts.
 *
 * @example
 * simplifyDebts([
 *   { id: 'p1', netAmount: 22.50 },
 *   { id: 'p2', netAmount: 2.50 },
 *   { id: 'p3', netAmount: -12.50 },
 *   { id: 'p4', netAmount: -12.50 },
 * ])
 * // [
 * //   { fromId: 'p3', toId: 'p1', amount: 12.50 },
 * //   { fromId: 'p4', toId: 'p1', amount: 10.00 },
 * //   { fromId: 'p4', toId: 'p2', amount: 2.50 },
 * // ]
 */
export function simplifyDebts(positions: NetPosition[]): DebtTransaction[] {
  const transactions: DebtTransaction[] = [];

  // Create mutable copies
  const creditors = positions
    .filter(p => p.netAmount > MIN_AMOUNT)
    .map(p => ({ ...p }))
    .sort((a, b) => b.netAmount - a.netAmount);

  const debtors = positions
    .filter(p => p.netAmount < -MIN_AMOUNT)
    .map(p => ({ ...p }))
    .sort((a, b) => a.netAmount - b.netAmount);

  // Match debtors to creditors
  for (const debtor of debtors) {
    let remaining = Math.abs(debtor.netAmount);

    for (const creditor of creditors) {
      if (remaining <= MIN_AMOUNT) break;
      if (creditor.netAmount <= MIN_AMOUNT) continue;

      const amount = Math.min(remaining, creditor.netAmount);
      if (amount > MIN_AMOUNT) {
        transactions.push({
          fromId: debtor.id,
          toId: creditor.id,
          amount: roundCurrency(amount),
        });
      }

      remaining -= amount;
      creditor.netAmount -= amount;
    }
  }

  return transactions;
}
