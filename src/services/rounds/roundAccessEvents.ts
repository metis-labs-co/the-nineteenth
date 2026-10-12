/**
 * Raised by the sync orchestrator on every scorecard upload that fails with a
 * conflict or an RLS error (42501) — either can mean the roster changed.
 * useRoundRosterSync listens and re-checks the roster; a read that shows no
 * change is a no-op.
 */

import { syncLogger } from '@/utils/debugLogger';

type Listener = (roundId: string) => void;
const listeners = new Set<Listener>();

export function onRoundAccessLost(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyRoundAccessLost(roundId: string): void {
  for (const listener of listeners) {
    // Called from inside the sync loop: a listener must never break it.
    try {
      listener(roundId);
    } catch (error) {
      syncLogger.error('Round access listener failed', error, { roundId });
    }
  }
}
