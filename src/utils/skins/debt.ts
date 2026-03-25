/**
 * Skins Debt Calculation Functions
 *
 * Functions for calculating net positions, simplifying debts,
 * and formatting debt transactions for both individual and team games.
 *
 * Uses the shared debt settlement algorithm from utils/debtSettlement.
 */

import type {
  SkinsPayout,
  SkinsNetPosition,
  SkinsDebtTransaction,
  SkinsTeamNetPosition,
  SkinsTeamDebtTransaction,
} from '@/types/database';
import { roundCurrency } from '../currency';
import { simplifyDebts as simplifyDebtsGeneric } from '../debtSettlement';
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
 */
export function calculateNetPositions(
  payouts: Pick<SkinsPayout, 'player_id' | 'net_result'>[]
): SkinsNetPosition[] {
  return payouts
    .map(p => ({
      player_id: p.player_id as string,
      net_amount: p.net_result,
    }))
    .sort((a, b) => b.net_amount - a.net_amount);
}

/**
 * Simplify debts to minimize the number of transactions.
 * Uses a greedy algorithm to match creditors with debtors.
 *
 * @param netPositions - Net positions for all players
 * @returns Minimal set of transactions to settle all debts
 */
export function simplifyDebts(
  netPositions: SkinsNetPosition[]
): SkinsDebtTransaction[] {
  const generic = simplifyDebtsGeneric(
    netPositions.map(p => ({ id: p.player_id, netAmount: p.net_amount }))
  );
  return generic.map(t => ({
    from_player_id: t.fromId,
    to_player_id: t.toId,
    amount: t.amount,
  }));
}

/**
 * Format debt transactions as human-readable strings.
 *
 * @param transactions - Array of debt transactions
 * @param playerMap - Map of player IDs to names
 * @returns Array of formatted strings like "John owes Sarah: $12.50"
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
    .sort((a, b) => b.net_amount - a.net_amount);
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
  const generic = simplifyDebtsGeneric(
    netPositions.map(p => ({ id: p.team_id, netAmount: p.net_amount }))
  );
  return generic.map(t => {
    const debtorTeam = teams.find(team => team.id === t.fromId);
    const debtorMemberCount = debtorTeam?.member_count ?? 1;
    return {
      from_team_id: t.fromId,
      to_team_id: t.toId,
      amount: t.amount,
      per_member_amount: roundCurrency(t.amount / debtorMemberCount),
    };
  });
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
