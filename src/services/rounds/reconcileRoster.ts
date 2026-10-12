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
 * Never removes from a doubtful read: an empty list or one missing the owner
 * is ignored (fetch errors never reach here — fetchRoundRoster throws).
 */
export function reconcileRoster(
  snapshot: RoundRosterSnapshot,
  storePlayers: { id: string; name: string }[],
  currentUserId: string,
): RosterDecision {
  if (!snapshot.round) return { kind: 'exit_unavailable' };
  if (snapshot.round.deletedAt) return { kind: 'exit_deleted' };

  const serverIds = new Set(snapshot.players.map((p) => p.id));
  if (serverIds.size === 0 || !serverIds.has(snapshot.round.userId)) return { kind: 'ignore' };
  if (!serverIds.has(currentUserId)) return { kind: 'exit_removed' };

  const storeIds = new Set(storePlayers.map((p) => p.id));
  return {
    kind: 'apply',
    added: snapshot.players.filter((p) => !storeIds.has(p.id)),
    removed: storePlayers.filter((p) => !serverIds.has(p.id)).map(({ id, name }) => ({ id, name })),
  };
}
