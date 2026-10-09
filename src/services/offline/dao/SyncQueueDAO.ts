import { readSyncHandicapSource } from '@/services/rounds/scorecardScoringMetadata';
import { Platform } from 'react-native';
import type { AcceptedScorecardWrite, OwnedRoundEndIntent } from '@/services/rounds/roundScoringWrite';
import { assertIntentOwner, ensureRoundEndIntent } from './roundEndIntent';
/**
 * Sync Queue DAO
 *
 * Data access operations for pending sync queue in SQLite.
 */

import type { PendingSync } from '@/types';
import type { PendingSyncRow } from '../types';
import { getDb } from '../DatabaseManager';
import { TABLE_NAMES } from '../schema/tables';
import { dbLogger } from '@/utils/debugLogger';

/**
 * Add a pending sync operation
 */
export async function addPendingSync(sync: Omit<PendingSync, 'id'>): Promise<void> {
  dbLogger.debug('Adding pending sync', {
    type: sync.type,
    action: sync.action,
    retryCount: sync.retryCount,
  });

  if (sync.type === 'scorecard' && sync.action !== 'delete') readSyncHandicapSource(sync.data?.syncHandicapSource);
  const database = await getDb();

  const entityKey = sync.entityKey ?? getEntityKey(sync);
  const status = sync.status ?? 'pending';

  try {
    await database.runAsync(
      `INSERT INTO ${TABLE_NAMES.PENDING_SYNCS}
         (type, action, data, timestamp, retry_count, entity_key, revision, status, last_error, last_attempt_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(entity_key) DO UPDATE SET
         action = CASE
           WHEN ${TABLE_NAMES.PENDING_SYNCS}.action = 'create' AND excluded.action = 'update'
             THEN 'create'
           ELSE excluded.action
         END,
         data = CASE
           WHEN excluded.type = 'scorecard'
             AND json_extract(excluded.data, '$.syncHandicapSource') IS NULL
             AND json_extract(pending_syncs.data, '$.syncHandicapSource') IS NOT NULL
           THEN json_set(excluded.data, '$.syncHandicapSource', json_extract(pending_syncs.data, '$.syncHandicapSource'))
           ELSE excluded.data
         END,
         timestamp = excluded.timestamp,
         retry_count = excluded.retry_count,
         revision = ${TABLE_NAMES.PENDING_SYNCS}.revision + 1,
         status = excluded.status,
         last_error = excluded.last_error,
         last_attempt_at = excluded.last_attempt_at`,
      [
        sync.type,
        sync.action,
        JSON.stringify(sync.data),
        sync.timestamp.toISOString(),
        sync.retryCount,
        entityKey,
        sync.revision ?? 1,
        status,
        sync.lastError ?? null,
        sync.lastAttemptAt?.toISOString() ?? null,
      ]
    );

    dbLogger.debug('Pending sync added successfully', {
      type: sync.type,
      action: sync.action,
    });
  } catch (error) {
    dbLogger.error('Failed to add pending sync', error, {
      type: sync.type,
      action: sync.action,
    });
    throw error;
  }
}

/**
 * Get all pending syncs
 */
export async function getPendingSyncs(): Promise<PendingSync[]> {
  const database = await getDb();

  const rows = await database.getAllAsync<PendingSyncRow>(
    `SELECT * FROM ${TABLE_NAMES.PENDING_SYNCS}
     WHERE status = 'pending'
     ORDER BY timestamp ASC`
  );

  dbLogger.debug('Retrieved pending syncs', { count: rows.length });

  return rows.map(decodePendingSyncRow);
}

/**
 * Remove a pending sync after successful sync
 */
export async function removePendingSync(id: number, revision?: number, isCurrent?: () => boolean,
  expectedScorecardAbsence?: { scorecardId: string; roundId: string; playerId: string },
): Promise<boolean> {
  const database = await getDb();
  if (isCurrent && !isCurrent()) return false;
  if (isCurrent && Platform.OS !== 'web') {
    let removed = false;
    await database.withExclusiveTransactionAsync(async txn => {
      if (!isCurrent()) return;
      if (expectedScorecardAbsence && await txn.getFirstAsync(
        `SELECT id FROM ${TABLE_NAMES.SCORECARDS} WHERE id = ? AND round_id = ? AND player_id = ?`,
        [expectedScorecardAbsence.scorecardId, expectedScorecardAbsence.roundId, expectedScorecardAbsence.playerId],
      )) return;
      if (!isCurrent()) return;
      const result = await txn.runAsync(
        `DELETE FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE id = ?${revision == null ? '' : ' AND revision = ?'}`,
        revision == null ? [id] : [id, revision],
      );
      if (!isCurrent()) throw new Error('Scoring queue acknowledgment changed during transaction');
      removed = result.changes > 0;
    });
    return removed;
  }
  const result = await database.runAsync(
    `DELETE FROM ${TABLE_NAMES.PENDING_SYNCS}
     WHERE id = ?${revision == null ? '' : ' AND revision = ?'}`,
    revision == null ? [id] : [id, revision]
  );
  const removed = result.changes > 0;
  dbLogger.debug('Removed pending sync', { id, revision, removed });
  return removed;
}

/**
 * Remove the row with this entity key, whatever its revision or status.
 *
 * For an item its own writer has made unnecessary (a round finalisation that
 * an online run completed). Queue handlers use removePendingSync, whose
 * revision guard keeps a row re-queued while it ran.
 */
export async function removePendingSyncByEntityKey(entityKey: string): Promise<boolean> {
  const database = await getDb();
  const result = await database.runAsync(
    `DELETE FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE entity_key = ?`,
    [entityKey]
  );
  const removed = result.changes > 0;
  dbLogger.debug('Removed pending sync by entity key', { entityKey, removed });
  return removed;
}

/**
 * Increment retry count for a pending sync
 */
export async function incrementSyncRetryCount(
  id: number,
  revision?: number,
  error = 'Sync failed'
): Promise<boolean> {
  const database = await getDb();
  const result = await database.runAsync(
    `UPDATE ${TABLE_NAMES.PENDING_SYNCS}
     SET retry_count = retry_count + 1, last_error = ?, last_attempt_at = ?
     WHERE id = ?${revision == null ? '' : ' AND revision = ?'}`,
    revision == null
      ? [error, new Date().toISOString(), id]
      : [error, new Date().toISOString(), id, revision]
  );
  return result.changes > 0;
}

/** Retain an exhausted operation for explicit user recovery. */
export async function markPendingSyncFailed(
  id: number,
  revision: number,
  error: string
): Promise<boolean> {
  const database = await getDb();
  const result = await database.runAsync(
    `UPDATE ${TABLE_NAMES.PENDING_SYNCS}
     SET status = 'failed', last_error = ?, last_attempt_at = ?
     WHERE id = ? AND revision = ?`,
    [error, new Date().toISOString(), id, revision]
  );
  return result.changes > 0;
}

/** Move retained failures back into the automatic queue. */
export async function resetFailedSyncs(): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `UPDATE ${TABLE_NAMES.PENDING_SYNCS}
     SET status = 'pending', retry_count = 0, last_error = NULL
     WHERE status = 'failed'`
  );
  return result.changes;
}

/**
 * Get count of pending syncs
 */
export async function getPendingSyncCount(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE status = 'pending'`
  );
  const count = result?.count ?? 0;
  dbLogger.debug('Pending sync count', { count });
  return count;
}

export async function getFailedSyncCount(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE status = 'failed'`
  );
  return result?.count ?? 0;
}

/**
 * Count retained failures belonging to a single round.
 *
 * The device-wide `getFailedSyncCount` is the right number for a global
 * troubleshooting surface, but it is the wrong number for an on-course banner:
 * a failure retained from a round played weeks ago would otherwise raise an
 * alarm on every subsequent scorecard. Scorecard rows are keyed
 * `scorecard:<roundId>:<playerId>`, so a prefix match scopes the count.
 */
export async function getFailedSyncCountForRound(roundId: string): Promise<number> {
  if (!roundId) return 0;

  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE_NAMES.PENDING_SYNCS}
     WHERE status = 'failed' AND entity_key LIKE ?`,
    [`scorecard:${roundId}:%`]
  );
  return result?.count ?? 0;
}

/**
 * Whether this device still has scorecards for a round waiting to upload: a
 * queued scorecard upload that is still pending, or a submitted card in
 * SQLite that was never marked synced and has no queue row at all (the
 * fallback upload in syncAll hasn't reached it).
 *
 * Retained failures (`status = 'failed'`) are NOT counted: they never upload
 * on their own (see getFailedSyncCountForRound). A queued round finalisation
 * waits on this before it makes any server call.
 */
export async function hasUnsyncedScorecardsForRound(roundId: string): Promise<boolean> {
  if (!roundId) return false;

  const database = await getDb();
  const queued = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE_NAMES.PENDING_SYNCS}
     WHERE type = 'scorecard' AND status = 'pending' AND entity_key LIKE ?`,
    [`scorecard:${roundId}:%`]
  );
  if ((queued?.count ?? 0) > 0) return true;

  const unqueued = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE_NAMES.SCORECARDS} s
     WHERE s.round_id = ?
       AND s.is_synced = 0
       AND (s.is_standalone = 0 OR s.is_standalone IS NULL)
       AND s.status = 'completed'
       AND NOT EXISTS (
         SELECT 1 FROM ${TABLE_NAMES.PENDING_SYNCS} p
         WHERE p.entity_key = 'scorecard:' || s.round_id || ':' || s.player_id
       )`,
    [roundId]
  );
  return (unqueued?.count ?? 0) > 0;
}

/**
 * List retained failures for troubleshooting.
 *
 * Failed rows are invisible to `getPendingSyncs` (which only drains
 * `status = 'pending'`), so without this there is no way to see what is stuck
 * or why — only an opaque count.
 */
export async function getFailedSyncs(): Promise<PendingSync[]> {
  const database = await getDb();

  const rows = await database.getAllAsync<PendingSyncRow>(
    `SELECT * FROM ${TABLE_NAMES.PENDING_SYNCS}
     WHERE status = 'failed'
     ORDER BY last_attempt_at DESC, timestamp DESC`
  );

  return rows.map(decodePendingSyncRow);
}

/**
 * Delete a single queued operation outright.
 *
 * Unlike `removePendingSync` this does not guard on revision: it exists for
 * failures that can never succeed (the round was deleted, access was revoked)
 * and which the user has explicitly chosen to abandon.
 */
export async function discardPendingSync(id: number): Promise<boolean> {
  const database = await getDb();
  const result = await database.runAsync(
    `DELETE FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE id = ?`,
    [id]
  );
  const removed = result.changes > 0;
  dbLogger.info('Discarded pending sync', { id, removed });
  return removed;
}

/**
 * Replace the stored payload of a queued operation.
 *
 * Used to write back a refreshed `serverRevision` after an optimistic-concurrency
 * rejection. Without it the row keeps the stale revision that caused the
 * conflict and every later retry is rejected for the same reason, forever.
 */
export async function updatePendingSyncData(id: number, data: unknown): Promise<boolean> {
  const database = await getDb();
  const result = await database.runAsync(
    `UPDATE ${TABLE_NAMES.PENDING_SYNCS} SET data = ? WHERE id = ?`,
    [JSON.stringify(data), id]
  );
  return result.changes > 0;
}

/**
 * Raise a queued scorecard edit's expected server revision.
 *
 * Used when an earlier upload of the same scorecard was confirmed while this
 * newer edit sat in the queue: the edit was snapshotted before that revision
 * existed, so without this it is rejected as conflicting with this device's
 * own write. Never lowers the revision.
 */
export async function raisePendingSyncServerRevision(
  id: number,
  serverRevision: number
): Promise<boolean> {
  const database = await getDb();
  const result = await database.runAsync(
    `UPDATE ${TABLE_NAMES.PENDING_SYNCS}
        SET data = json_set(data, '$.serverRevision', ?)
      WHERE id = ?
        AND type = 'scorecard'
        AND COALESCE(json_extract(data, '$.serverRevision'), 0) < ?`,
    [serverRevision, id, serverRevision]
  );
  return result.changes > 0;
}

export async function getQueuedEntityKeys(): Promise<Set<string>> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ entity_key: string }>(
    `SELECT entity_key FROM ${TABLE_NAMES.PENDING_SYNCS}`
  );
  return new Set(rows.map((row) => row.entity_key));
}

/**
 * Clear all pending syncs
 */
export async function clearAllPendingSyncs(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE_NAMES.PENDING_SYNCS}`
  );
  const count = result?.count ?? 0;

  await database.execAsync(`DELETE FROM ${TABLE_NAMES.PENDING_SYNCS}`);
  dbLogger.info('Cleared all pending syncs', { count });

  return count;
}

function getEntityKey(sync: Omit<PendingSync, 'id'>): string {
  if (sync.type === 'scorecard' && sync.data?.roundId && sync.data?.playerId) {
    return `scorecard:${sync.data.roundId}:${sync.data.playerId}`;
  }
  if (sync.data?.id) return `${sync.type}:${sync.data.id}`;
  throw new Error(`Cannot queue ${sync.type} sync without a stable entity identifier`);
}

/** Queue without replacing or reviving an existing end intent. */
export async function queueRoundEarlyEndIntent(
  roundId: string,
  holesPlayed: number,
  intent: OwnedRoundEndIntent
): Promise<void> {
  assertIntentOwner(intent);
  if (!roundId || !Number.isInteger(holesPlayed) || holesPlayed < 1)
    throw new Error('Invalid end intent');
  if (Platform.OS === 'web') throw new Error('Durable end intent requires native SQLite');
  const database = await getDb();
  await database.withExclusiveTransactionAsync((txn) =>
    ensureRoundEndIntent(txn, roundId, holesPlayed, intent)
  );
}

export function decodePendingSyncRow(row: PendingSyncRow): PendingSync {
  const data = JSON.parse(row.data);
  if (row.type === 'scorecard' && row.action !== 'delete') readSyncHandicapSource(data?.syncHandicapSource);
  return {
    id: row.id,
    type: row.type as PendingSync['type'],
    action: row.action as PendingSync['action'],
    data,
    timestamp: new Date(row.timestamp),
    retryCount: row.retry_count,
    entityKey: row.entity_key,
    revision: row.revision,
    status: row.status,
    lastError: row.last_error,
    lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : null,
  };
}

/** Includes retained failures. Invalid JSON throws and therefore stays blocking. */
export async function getPendingSyncByEntityKey(entityKey: string): Promise<PendingSync | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<PendingSyncRow>(
    `SELECT * FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE entity_key = ?`,
    [entityKey]
  );
  return row ? decodePendingSyncRow(row) : null;
}

/** Replace only this version of the payload, invalidating any old upload acknowledgment. */
export async function replacePendingSyncData(
  id: number,
  expectedRevision: number,
  data: unknown
): Promise<number | null> {
  const database = await getDb();
  const result = await database.runAsync(
    `UPDATE ${TABLE_NAMES.PENDING_SYNCS} SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?`,
    [JSON.stringify(data), id, expectedRevision]
  );
  return result.changes === 1 ? expectedRevision + 1 : null;
}

/** Partial snapshot success must raise both live revisions, keeping newer work unsynced. */
export async function recordAcceptedScorecardWrite(
  roundId: string,
  playerId: string,
  accepted: AcceptedScorecardWrite
): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Accepted scoring writes require native SQLite');
  if (!Number.isInteger(accepted.serverRevision) || accepted.serverRevision < 0)
    throw new Error('Invalid accepted server revision');
  const database = await getDb();
  await database.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `UPDATE ${TABLE_NAMES.SCORECARDS} SET server_revision = MAX(COALESCE(server_revision, 0), ?), is_synced = 0 WHERE id = ? AND round_id = ? AND player_id = ?`,
      [accepted.serverRevision, accepted.scorecardId, roundId, playerId]
    );
    await txn.runAsync(
      `UPDATE ${TABLE_NAMES.PENDING_SYNCS}
      SET data = json_set(data, '$.serverRevision', ?), revision = revision + 1
      WHERE entity_key = ? AND type = 'scorecard' AND action != 'delete'
        AND json_extract(data, '$.id') = ?
        AND json_extract(data, '$.roundId') = ? AND json_extract(data, '$.playerId') = ?
        AND COALESCE(json_extract(data, '$.serverRevision'), 0) < ?`,
      [
        accepted.serverRevision,
        `scorecard:${roundId}:${playerId}`,
        accepted.scorecardId,
        roundId,
        playerId,
        accepted.serverRevision,
      ]
    );
  });
}
