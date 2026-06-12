/**
 * Invitation Summary
 *
 * Pure helpers over round_players invitation state for scheduled social
 * rounds: status counts for the detail screen, and the start-time gate.
 */
import { checkPresetPlayerCount } from '@/utils/presetPlayers';
import type { RoundPresetId } from '@/constants/roundPresets';
import type { RoundInvitationStatus } from '@/types/database/enums';

interface InvitationRow {
  player_id: string;
  invitation_status: RoundInvitationStatus;
}

export interface InvitationSummary {
  accepted: number;
  pending: number;
  declined: number;
  /** accepted + pending — players who may still tee off. */
  activeCount: number;
}

export function summarizeInvitations(rows: InvitationRow[]): InvitationSummary {
  const accepted = rows.filter((r) => r.invitation_status === 'accepted').length;
  const pending = rows.filter((r) => r.invitation_status === 'pending').length;
  const declined = rows.filter((r) => r.invitation_status === 'declined').length;
  return { accepted, pending, declined, activeCount: accepted + pending };
}

/**
 * Null when the round can be started, otherwise the human-readable reason.
 * Pending players count toward the requirement — the keep-or-drop prompt
 * resolves them at start time and re-checks against the kept set.
 */
export function startBlockReason(
  presetId: RoundPresetId,
  rows: InvitationRow[]
): string | null {
  const { activeCount } = summarizeInvitations(rows);
  // checkPresetPlayerCount takes partner count excluding the organiser,
  // but rows here INCLUDE the organiser's own row.
  const result = checkPresetPlayerCount(presetId, activeCount - 1);
  return result.ok ? null : result.message;
}
