/**
 * Skins Debt Calculation Functions
 *
 * Functions for calculating net positions, simplifying debts,
 * and formatting debt transactions for both individual and team games.
 */

import type {
  SkinsPayout,
  SkinsNetPosition,
  SkinsDebtTransaction,
  SkinsTeamNetPosition,
  SkinsTeamDebtTransaction,
} from '@/types/database';
import { roundCurrency } from '../currency';
import type { CalculatedTeamPayout, TeamPayoutParticipant } from './payouts';

/**
 * Player name lookup map
 */
export type PlayerNameMap = Record<string, string>;

/**
 * Team name lookup map
 */
export type TeamNameMap = Record<string, string>;

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
      player_id: p.player_id as string,
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
