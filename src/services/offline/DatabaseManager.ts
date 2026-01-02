/**
 * Database Manager
 *
 * Handles SQLite database initialization, migrations, and connection management.
 */

import * as SQLite from 'expo-sqlite';
import type { DatabaseInstance } from './types';
import { ALL_CREATE_TABLES } from './schema/tables';
import { runMigrations } from './schema/migrations';
import { dbLogger } from '@/utils/debugLogger';

const DB_NAME = 'the_nineteenth.db';

let db: DatabaseInstance | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the SQLite database and create tables
 */
export async function initDatabase(): Promise<void> {
  // Prevent concurrent initialization
  if (initPromise) {
    return initPromise;
  }

  initPromise = doInitialize();
  return initPromise;
}

async function doInitialize(): Promise<void> {
  dbLogger.info('Initializing database', { dbName: DB_NAME });

  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    dbLogger.debug('Database opened successfully');

    // Create all tables
    for (const createStatement of ALL_CREATE_TABLES) {
      await db.execAsync(createStatement);
    }
    dbLogger.debug('All tables created');

    // Run migrations
    await runMigrations(db);

    dbLogger.info('Database initialized successfully');
  } catch (error) {
    initPromise = null; // Allow retry on failure
    dbLogger.error('Failed to initialize database', error);
    throw error;
  }
}

/**
 * Get database instance (initialize if needed)
 */
export async function getDb(): Promise<DatabaseInstance> {
  if (!db) {
    await initDatabase();
  }
  return db!;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    initPromise = null;
    dbLogger.info('Database closed');
  }
}

/**
 * Clear all data from the database (for testing/logout)
 */
export async function clearAllData(): Promise<void> {
  const database = await getDb();

  await database.execAsync('DELETE FROM hole_scores');
  await database.execAsync('DELETE FROM scorecards');
  await database.execAsync('DELETE FROM pending_syncs');
  await database.execAsync('DELETE FROM holes');

  dbLogger.info('All data cleared');
}

/**
 * Check if a string is a valid UUID (RFC 4122)
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Reset database state (for testing only)
 * @internal
 */
export function __resetDatabaseState(): void {
  db = null;
  initPromise = null;
}
