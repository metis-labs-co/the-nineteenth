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
         data = excluded.data,
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

  return rows.map((row) => ({
    id: row.id,
    type: row.type as PendingSync['type'],
    action: row.action as PendingSync['action'],
    data: JSON.parse(row.data),
    timestamp: new Date(row.timestamp),
    retryCount: row.retry_count,
    entityKey: row.entity_key,
    revision: row.revision,
    status: row.status,
    lastError: row.last_error,
    lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : null,
  }));
}

/**
 * Remove a pending sync after successful sync
 */
export async function removePendingSync(id: number, revision?: number): Promise<boolean> {
  const database = await getDb();
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
