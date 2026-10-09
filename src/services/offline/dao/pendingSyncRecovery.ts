import type { PendingSync } from '@/types';
import type { PendingSyncRow } from '../types';

/** These fields can change without replacing the queued payload/revision. */
export function pendingSyncRecoveryVersion(
  row: Pick<
    PendingSync,
    'type' | 'action' | 'timestamp' | 'retryCount' | 'status' | 'lastError' | 'lastAttemptAt'
  >
): string {
  return JSON.stringify([
    row.type,
    row.action,
    row.timestamp,
    row.retryCount,
    row.status ?? 'pending',
    row.lastError ?? null,
    row.lastAttemptAt ?? null,
  ]);
}

export function pendingSyncRecoveryMatches(
  expected: PendingSync | string,
  row: PendingSyncRow
): boolean {
  return (
    (typeof expected === 'string' ? expected : pendingSyncRecoveryVersion(expected)) ===
    pendingSyncRecoveryVersion({
      type: row.type as PendingSync['type'],
      action: row.action as PendingSync['action'],
      timestamp: new Date(row.timestamp),
      retryCount: row.retry_count,
      status: row.status,
      lastError: row.last_error,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : null,
    })
  );
}
