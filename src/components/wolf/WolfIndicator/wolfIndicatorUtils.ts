/**
 * Wolf Indicator Utility Functions
 *
 * Helper functions for determining Wolf decision descriptions,
 * partner names, and result text for display in the indicator.
 */

import type { WolfHoleDecision } from '@/types/database/wolf.types';

/**
 * Get description of Wolf's decision for display
 */
export function getDecisionDescription(
  decision: WolfHoleDecision | null | undefined
): string | null {
  if (!decision) return null;
  if (!decision.decided_at) return null;

  if (decision.is_blind_wolf) {
    return 'Blind 🔥';
  }
  if (!decision.partner_id) {
    return 'Lone Wolf';
  }
  return null; // Partner selected - will use partner name
}

/**
 * Get Wolf's partner name from participants
 */
export function getPartnerName(
  decision: WolfHoleDecision | null | undefined,
  participants: { id: string; name: string }[]
): string | null {
  if (!decision?.partner_id) return null;
  const partner = participants.find((p) => p.id === decision.partner_id);
  return partner?.name ?? 'Unknown';
}

/**
 * Get result description for a completed hole
 */
export function getResultDescription(
  decision: WolfHoleDecision | null | undefined
): string | null {
  if (!decision?.calculated_at) return null;

  if (decision.is_tie) {
    return 'Tie - pushed';
  }
  if (decision.wolf_team_won === true) {
    return 'Wolf wins!';
  }
  if (decision.wolf_team_won === false) {
    return 'Pack wins!';
  }
  return null;
}
