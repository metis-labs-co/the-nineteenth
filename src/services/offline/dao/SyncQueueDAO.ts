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

  try {
    await database.runAsync(
      `INSERT INTO ${TABLE_NAMES.PENDING_SYNCS} (type, action, data, timestamp, retry_count)
       VALUES (?, ?, ?, ?, ?)`,
      [sync.type, sync.action, JSON.stringify(sync.data), sync.timestamp.toISOString(), sync.retryCount]
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
    `SELECT * FROM ${TABLE_NAMES.PENDING_SYNCS} ORDER BY timestamp ASC`
  );

  dbLogger.debug('Retrieved pending syncs', { count: rows.length });

  return rows.map((row) => ({
    id: row.id,
    type: row.type as PendingSync['type'],
    action: row.action as PendingSync['action'],
    data: JSON.parse(row.data),
    timestamp: new Date(row.timestamp),
    retryCount: row.retry_count,
  }));
}

/**
 * Remove a pending sync after successful sync
 */
export async function removePendingSync(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `DELETE FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE id = ?`,
    [id]
  );
  dbLogger.debug('Removed pending sync', { id });
}

/**
 * Increment retry count for a pending sync
 */
export async function incrementSyncRetryCount(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE ${TABLE_NAMES.PENDING_SYNCS} SET retry_count = retry_count + 1 WHERE id = ?`,
    [id]
  );
  dbLogger.debug('Incremented sync retry count', { id });
}

/**
 * Get count of pending syncs
 */
export async function getPendingSyncCount(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE_NAMES.PENDING_SYNCS}`
  );
  const count = result?.count ?? 0;
  dbLogger.debug('Pending sync count', { count });
  return count;
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
