import { getPendingSyncByEntityKey } from '@/services/offline/database';
import type { PendingSync } from '@/types';

const tails = new Map<string, Promise<void>>();
/**
 * Serialize the complete scoring write for one round. Non-reentrant: callers
 * acquire once at their outer boundary; operations must not reacquire it.
 * Ordinary synchronous store edits and unrelated rounds remain independent.
 */
export async function withRoundScoringWrite<T>(
  roundId: string,
  operation: () => Promise<T>
): Promise<T> {
  const previous = tails.get(roundId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  tails.set(roundId, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (tails.get(roundId) === current) tails.delete(roundId);
  }
}

/** Live prerequisite, regardless of status or owner; never cache before acquiring. */
export function getRoundEndPrerequisite(roundId: string): Promise<PendingSync | null> {
  return getPendingSyncByEntityKey(`round:${roundId}:end_early`);
}
