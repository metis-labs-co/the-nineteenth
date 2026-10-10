import type { Scorecard } from '@/types';
import type { ScorecardConflictError } from './scorecardSync';
import { syncLogger } from '@/utils/debugLogger';

export type ScorecardConflictResolution =
  | { kind: 'retry'; scorecard: Scorecard } // merged snapshot at the server revision
  | { kind: 'final' } // final server card durably adopted as synced; drop only captured queue work
  | null; // not handled: keep today's behaviour

export type ScorecardConflictResolver = (
  queued: Scorecard,
  conflict: ScorecardConflictError
) => Promise<ScorecardConflictResolution>;

let conflictResolver: ScorecardConflictResolver | null = null;

/** Register who may merge a scorecard revision conflict (the store, for social rounds). */
export function setScorecardConflictResolver(resolver: ScorecardConflictResolver | null): void {
  conflictResolver = resolver;
}

export async function resolveScorecardConflict(
  scorecard: Scorecard,
  error: ScorecardConflictError
): Promise<ScorecardConflictResolution> {
  if (!conflictResolver) return null;
  try {
    return await conflictResolver(scorecard, error);
  } catch (resolverError) {
    syncLogger.warn('Scorecard conflict resolver failed', {
      error: resolverError instanceof Error ? resolverError.message : String(resolverError),
    });
    return null;
  }
}
