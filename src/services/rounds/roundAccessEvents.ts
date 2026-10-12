/**
 * Raised by the sync orchestrator when an upload for a round fails in a way
 * that suggests the roster changed (RLS 42501, or a conflict with no live
 * server row). useRoundRosterSync listens and re-checks the roster.
 */

type Listener = (roundId: string) => void;
const listeners = new Set<Listener>();

export function onRoundAccessLost(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyRoundAccessLost(roundId: string): void {
  for (const listener of listeners) listener(roundId);
}
