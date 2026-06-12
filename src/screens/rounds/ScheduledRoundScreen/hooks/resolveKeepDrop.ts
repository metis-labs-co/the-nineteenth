/**
 * resolveKeepDrop — pure helper
 *
 * Given the round_players rows and a set of player IDs the starter wants to
 * DROP, produces the row set that will actually participate in the round.
 *
 * Rules:
 * - Already-accepted rows are always kept (cannot be dropped here).
 * - Pending rows can be dropped if the starter is the organiser (isOwner = true).
 * - If isOwner = false, dropping is not permitted (non-organiser starter forces
 *   keep-all because RLS only permits round_players DELETE by the round owner).
 * - A dropped row is excluded from the result entirely.
 * - The returned rows represent the "active" participants after the decision.
 */

import type { RoundInvitationStatus } from '@/types/database/enums';

export interface KeepDropRow {
  player_id: string;
  invitation_status: RoundInvitationStatus;
}

export interface ResolvedKeepDrop {
  /** Rows that will be active participants (accepted + kept pending). */
  activeRows: KeepDropRow[];
  /** Player IDs of pending rows to DELETE from round_players. */
  toDrop: string[];
  /**
   * Player IDs of pending rows the starter wants to keep — these stay
   * 'pending' in the DB (they are NOT flipped to 'accepted' here because
   * updating another player's row is blocked by RLS for non-owners and
   * is unnecessary for the scorecard initialisation — they are still
   * counted as participants).
   */
  toKeepPending: string[];
}

/**
 * Compute the active participant set after keep/drop decisions.
 *
 * @param rows          All round_players rows for the round
 * @param keptPendingIds IDs the starter has chosen to KEEP (pending rows only)
 * @param isOwner       True if the starter is the round owner (may delete pending rows)
 */
export function resolveKeepDrop(
  rows: KeepDropRow[],
  keptPendingIds: Set<string>,
  isOwner: boolean
): ResolvedKeepDrop {
  const activeRows: KeepDropRow[] = [];
  const toDrop: string[] = [];
  const toKeepPending: string[] = [];

  for (const row of rows) {
    if (row.invitation_status === 'accepted') {
      // Accepted players always participate
      activeRows.push(row);
    } else if (row.invitation_status === 'pending') {
      if (!isOwner) {
        // Non-owner starter: keep all pending players (cannot drop)
        activeRows.push(row);
        toKeepPending.push(row.player_id);
      } else if (keptPendingIds.has(row.player_id)) {
        // Owner chose to keep this pending player
        activeRows.push(row);
        toKeepPending.push(row.player_id);
      } else {
        // Owner chose to drop this pending player
        toDrop.push(row.player_id);
      }
    }
    // declined rows: never included
  }

  return { activeRows, toDrop, toKeepPending };
}
