/**
 * Combined Payouts Utility
 *
 * Merges skins and wolf payout data into unified standings
 * and simplified debt transactions for the Payouts tab.
 */

import { roundCurrency, formatCurrency, formatNetResult } from './currency';

// ============================================================================
// TYPES
// ============================================================================

export interface CombinedPlayerPayout {
  player_id: string;
  name: string;
  skins_net: number;
  wolf_net: number;
  total_net: number;
  in_skins: boolean;
  in_wolf: boolean;
  rank: number;
}

export interface CombinedDebtTransaction {
  from_player_id: string;
  to_player_id: string;
  amount: number;
}

export type PayoutsMode = 'combined' | 'skins-only' | 'wolf-only';

export interface CombinedPayoutsResult {
  standings: CombinedPlayerPayout[];
  debts: CombinedDebtTransaction[];
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Merge skins and wolf net results into combined standings and debts.
 *
 * @param skinsEntries - Array of { player_id, net_result } from skins payouts
 * @param wolfEntries - Array of { player_id, net_result } from wolf payouts/standings
 * @param playerNameMap - Map of player ID to display name
 * @returns Combined standings sorted by total_net descending, and simplified debts
 */
export function calculateCombinedPayouts(
  skinsEntries: { player_id: string; net_result: number }[],
  wolfEntries: { player_id: string; net_result: number }[],
  playerNameMap: Record<string, string>
): CombinedPayoutsResult {
  // Build a map of player_id -> combined data
  const combinedMap = new Map<string, CombinedPlayerPayout>();

  // Process skins entries
  for (const entry of skinsEntries) {
    combinedMap.set(entry.player_id, {
      player_id: entry.player_id,
      name: playerNameMap[entry.player_id] || 'Unknown',
      skins_net: roundCurrency(entry.net_result),
      wolf_net: 0,
      total_net: 0,
      in_skins: true,
      in_wolf: false,
      rank: 0,
    });
  }

  // Process wolf entries
  for (const entry of wolfEntries) {
    const existing = combinedMap.get(entry.player_id);
    if (existing) {
      existing.wolf_net = roundCurrency(entry.net_result);
      existing.in_wolf = true;
    } else {
      combinedMap.set(entry.player_id, {
        player_id: entry.player_id,
        name: playerNameMap[entry.player_id] || 'Unknown',
        skins_net: 0,
        wolf_net: roundCurrency(entry.net_result),
        total_net: 0,
        in_skins: false,
        in_wolf: true,
        rank: 0,
      });
    }
  }

  // Calculate total_net and sort
  const standings = Array.from(combinedMap.values());
  for (const s of standings) {
    s.total_net = roundCurrency(s.skins_net + s.wolf_net);
  }
  standings.sort((a, b) => b.total_net - a.total_net);

  // Assign ranks (handle ties)
  let currentRank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0 && standings[i].total_net === standings[i - 1].total_net) {
      standings[i].rank = standings[i - 1].rank;
    } else {
      standings[i].rank = currentRank;
    }
    currentRank = i + 2;
  }

  // Simplify debts using greedy algorithm
  const debts = simplifyCombinedDebts(standings);

  return { standings, debts };
}

/**
 * Greedy debt simplification on combined net positions.
 *
 * Unlike single-game settlement, combined payouts may not be zero-sum
 * mid-game (e.g. skins carryover sits in the pot, making everyone negative).
 * We normalize to relative positions (subtract the average) so that
 * settlement reflects who owes whom based on the differences between players,
 * not their absolute positions against the house.
 */
function simplifyCombinedDebts(
  standings: CombinedPlayerPayout[]
): CombinedDebtTransaction[] {
  if (standings.length < 2) return [];

  const transactions: CombinedDebtTransaction[] = [];

  // Normalize to zero-sum by subtracting the average.
  // This handles mid-game scenarios where skins carryover makes everyone negative.
  const totalNet = standings.reduce((sum, s) => sum + s.total_net, 0);
  const average = totalNet / standings.length;

  // Create mutable positions relative to average
  const positions = standings.map((s) => ({
    player_id: s.player_id,
    net_amount: roundCurrency(s.total_net - average),
  }));

  const creditors = positions.filter((p) => p.net_amount > 0.01);
  const debtors = positions.filter((p) => p.net_amount < -0.01);

  // Sort: largest first
  creditors.sort((a, b) => b.net_amount - a.net_amount);
  debtors.sort((a, b) => a.net_amount - b.net_amount);

  for (const debtor of debtors) {
    let remaining = Math.abs(debtor.net_amount);

    for (const creditor of creditors) {
      if (remaining <= 0.01) break;
      if (creditor.net_amount <= 0.01) continue;

      const amount = Math.min(remaining, creditor.net_amount);
      if (amount > 0.01) {
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
 * Build a share message for combined payouts.
 *
 * @param standings - Combined standings
 * @param debts - Simplified debt transactions
 * @param skinsInfo - Skins game info for subtitle (pot value)
 * @param wolfInfo - Wolf game info for subtitle (pot value per point)
 * @param playerNameMap - Player ID to name lookup
 * @param mode - Payouts mode: 'combined', 'skins-only', or 'wolf-only'
 * @returns Formatted share message string
 */
export function buildCombinedShareMessage(
  standings: CombinedPlayerPayout[],
  debts: CombinedDebtTransaction[],
  skinsInfo: { pot_value: number } | null,
  wolfInfo: { pot_value_per_point: number } | null,
  playerNameMap: Record<string, string>,
  mode: PayoutsMode = 'combined'
): string {
  const title = mode === 'skins-only'
    ? 'Skins Payouts'
    : mode === 'wolf-only'
      ? 'Wolf Payouts'
      : 'Combined Payouts - Skins & Wolf';
  let message = `${title}\n`;

  const parts: string[] = [];
  if (skinsInfo) {
    parts.push(`Skins: ${formatCurrency(skinsInfo.pot_value)}/hole`);
  }
  if (wolfInfo) {
    parts.push(`Wolf: ${formatCurrency(wolfInfo.pot_value_per_point)}/point`);
  }
  if (parts.length > 0) {
    message += `${parts.join(' | ')}\n`;
  }

  message += '\nStandings:\n';
  for (const s of standings) {
    const medal = s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `${s.rank}.`;
    if (mode === 'combined') {
      const skinsStr = s.in_skins ? formatNetResult(s.skins_net) : '--';
      const wolfStr = s.in_wolf ? formatNetResult(s.wolf_net) : '--';
      message += `${medal} ${s.name} | Skins: ${skinsStr} | Wolf: ${wolfStr} | Total: ${formatNetResult(s.total_net)}\n`;
    } else {
      message += `${medal} ${s.name} | Net: ${formatNetResult(s.total_net)}\n`;
    }
  }

  if (debts.length > 0) {
    message += '\nSettlement:\n';
    for (const d of debts) {
      const fromName = playerNameMap[d.from_player_id] || 'Unknown';
      const toName = playerNameMap[d.to_player_id] || 'Unknown';
      message += `  ${fromName} → ${toName}: ${formatCurrency(d.amount)}\n`;
    }
  } else {
    message += '\nAll even - no money owed!\n';
  }

  message += '\nShared from The Nineteenth 🏌️';

  return message;
}
