import type { Player } from '@/types';
import type { RoundRosterSnapshot } from './roundRoster';

export type RosterDecision =
  | { kind: 'ignore' }
  | { kind: 'exit_removed' }
  | { kind: 'exit_deleted' }
  | { kind: 'exit_unavailable' }
  | { kind: 'apply'; added: Player[]; removed: { id: string; name: string }[] };

/**
 * Decide what a scoring device should do with a fresh roster read.
 * A non-owner missing from the list (including an empty list, which is what a
 * removed non-owner sees under RLS) exits. Otherwise never removes from a
 * doubtful read: an empty list or one missing the owner is ignored (fetch
 * errors never reach here — fetchRoundRoster throws).
 */
export function reconcileRoster(
  snapshot: RoundRosterSnapshot,
  storePlayers: { id: string; name: string }[],
  currentUserId: string,
): RosterDecision {
  if (!snapshot.round) return { kind: 'exit_unavailable' };
  if (snapshot.round.deletedAt) return { kind: 'exit_deleted' };

  const serverIds = new Set(snapshot.players.map((p) => p.id));
  // A removed non-owner can still see the round but, under RLS, none of its
  // round_players rows (they only ever see their own) — so an empty list means
  // removed for them. Check this before the doubtful-read guard.
  const isOwner = currentUserId === snapshot.round.userId;
  if (!isOwner && !serverIds.has(currentUserId)) return { kind: 'exit_removed' };
  // The owner never acts on an empty or owner-missing read, so their data is never wiped.
  if (serverIds.size === 0 || !serverIds.has(snapshot.round.userId)) return { kind: 'ignore' };

  const storeIds = new Set(storePlayers.map((p) => p.id));
  return {
    kind: 'apply',
    added: snapshot.players.filter((p) => !storeIds.has(p.id)),
    removed: storePlayers.filter((p) => !serverIds.has(p.id)).map(({ id, name }) => ({ id, name })),
  };
}
