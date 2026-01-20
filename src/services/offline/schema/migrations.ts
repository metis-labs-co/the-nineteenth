/**
 * SQLite Database Migrations
 *
 * Handles schema migrations for the offline database.
 */

import type { DatabaseInstance } from '../types';
import { dbLogger } from '@/utils/debugLogger';

/**
 * Migration definition
 */
interface Migration {
  version: number;
  name: string;
  up: string;
}

/**
 * Database migrations in order
 * Add new migrations at the end with incrementing version numbers
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'add_is_standalone_column',
    up: `ALTER TABLE scorecards ADD COLUMN is_standalone INTEGER DEFAULT 0`,
  },
  {
    version: 2,
    name: 'add_ball_scores_column',
    up: `ALTER TABLE hole_scores ADD COLUMN ball_scores TEXT`,
  },
  {
    version: 3,
    name: 'add_scored_by_column',
    up: `ALTER TABLE hole_scores ADD COLUMN scored_by TEXT`,
  },
];

/**
 * Run a single migration safely (ignores if already applied)
 */
async function runMigration(db: DatabaseInstance, migration: Migration): Promise<boolean> {
  try {
    await db.execAsync(migration.up);
    dbLogger.debug(`Migration applied: ${migration.name}`);
    return true;
  } catch {
    // Column/table already exists - migration already applied
    return false;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(db: DatabaseInstance): Promise<void> {
  let appliedCount = 0;

  for (const migration of MIGRATIONS) {
    const applied = await runMigration(db, migration);
    if (applied) {
      appliedCount++;
    }
  }

  if (appliedCount > 0) {
    dbLogger.info(`Applied ${appliedCount} migrations`);
  }
}
