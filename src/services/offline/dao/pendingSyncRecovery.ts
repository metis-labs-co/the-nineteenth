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


/** Canonical key alone determines scope; payload IDs never redirect an end dependency. */
export function roundEndIntentRoundId(entityKey: string | null | undefined): string | null {
  return typeof entityKey === 'string'
    ? (entityKey.match(/^round:([^:]+):end_early$/)?.[1] ?? null)
    : null;
}

/** Copy comparison inputs before any native acquisition/read await. */
export function capturePendingEndIntentSnapshot(expected: PendingSync): PendingSync {
  return Object.freeze({
    ...expected,
    timestamp: new Date(expected.timestamp),
    lastAttemptAt: expected.lastAttemptAt
      ? new Date(expected.lastAttemptAt)
      : expected.lastAttemptAt,
    endIntentRead: expected.endIntentRead && Object.freeze({ ...expected.endIntentRead }),
  });
}

export function pendingEndIntentSnapshotMatches(
  expected: PendingSync,
  actual: PendingSyncRow
): boolean {
  return Boolean(
    expected.endIntentRead &&
      typeof expected.endIntentRead.rawData === 'string' &&
      Number.isInteger(expected.id) &&
      (expected.id ?? 0) > 0 &&
      Number.isInteger(expected.revision) &&
      (expected.revision ?? 0) > 0 &&
      expected.id === actual.id &&
      expected.revision === actual.revision &&
      (expected.entityKey ?? null) === (actual.entity_key ?? null) &&
      expected.endIntentRead.rawData === actual.data &&
      pendingSyncRecoveryMatches(expected, actual)
  );
}

/** Only a decoded, canonically scoped, valid owned end can ever be acknowledged. */
export function isOwnedEndIntentSnapshot(expected: PendingSync): boolean {
  const roundId = roundEndIntentRoundId(expected.entityKey);
  if (
    !roundId ||
    expected.endIntentRead?.decode !== 'decoded' ||
    expected.type !== 'round' ||
    expected.action !== 'update'
  )
    return false;
  try {
    const data = JSON.parse(expected.endIntentRead.rawData);
    return Boolean(
      data &&
        data.id === roundId &&
        data.action === 'end_early' &&
        Number.isInteger(data.holesPlayed) &&
        data.holesPlayed > 0 &&
        typeof data.userId === 'string' &&
        data.userId.trim()
    );
  } catch {
    return false;
  }
}
