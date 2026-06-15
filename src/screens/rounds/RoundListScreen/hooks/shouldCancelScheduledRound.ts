import type { RoundItem } from '../types';

/**
 * Decides whether deleting a round should be treated as *cancelling* a scheduled
 * round (hard delete, notify invitees, no undo) rather than the default
 * soft-delete-with-undo.
 *
 * A delete becomes a cancel only when the round is:
 *   - scheduled (status 'upcoming'), AND
 *   - standalone (not part of a competition), AND
 *   - has at least one invited player other than the current user.
 *
 * Solo scheduled rounds and completed/in-progress rounds keep the soft-delete
 * + Undo behaviour, since there is no one else to notify.
 */
export function shouldCancelScheduledRound(
  round: Pick<RoundItem, 'status' | 'competition' | 'players'> | null | undefined,
  currentUserId?: string
): boolean {
  if (!round) return false;
  if (round.status !== 'upcoming' || round.competition) return false;
  const otherPlayers = (round.players ?? []).filter((p) => p.id !== currentUserId);
  return otherPlayers.length > 0;
}
