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
  {
    version: 4,
    name: 'add_shot_contributions_column',
    up: `ALTER TABLE hole_scores ADD COLUMN shot_contributions TEXT`,
  },
  {
    version: 5,
    name: 'add_tee_data_column',
    up: `ALTER TABLE scorecards ADD COLUMN tee_data TEXT`,
  },
  {
    version: 6,
    name: 'add_course_par_column',
    up: `ALTER TABLE scorecards ADD COLUMN course_par INTEGER`,
  },
  {
    version: 7,
    name: 'add_player_gender_column',
    up: `ALTER TABLE scorecards ADD COLUMN player_gender TEXT`,
  },
  {
    version: 8,
    name: 'add_player_handicap_used_column',
    up: `ALTER TABLE scorecards ADD COLUMN player_handicap_used REAL`,
  },
  {
    // Rename shot contribution key `drive` -> `teeShot` in stored JSON.
    // Safe substring replace because `shot_contributions` is a flat object
    // whose only keys are slot names ("drive", "approach", "putt", etc.) —
    // no risk of colliding with player UUIDs.
    version: 9,
    name: 'rename_shot_contribution_drive_to_tee_shot',
    up: `UPDATE hole_scores
            SET shot_contributions = REPLACE(shot_contributions, '"drive":', '"teeShot":')
          WHERE shot_contributions LIKE '%"drive":%'`,
  },
  {
    version: 10,
    name: 'add_pending_sync_entity_key',
    up: `ALTER TABLE pending_syncs ADD COLUMN entity_key TEXT`,
  },
  {
    version: 11,
    name: 'add_pending_sync_revision',
    up: `ALTER TABLE pending_syncs ADD COLUMN revision INTEGER NOT NULL DEFAULT 1`,
  },
  {
    version: 12,
    name: 'add_pending_sync_status',
    up: `ALTER TABLE pending_syncs ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`,
  },
  {
    version: 13,
    name: 'add_pending_sync_last_error',
    up: `ALTER TABLE pending_syncs ADD COLUMN last_error TEXT`,
  },
  {
    version: 14,
    name: 'add_pending_sync_last_attempt_at',
    up: `ALTER TABLE pending_syncs ADD COLUMN last_attempt_at TEXT`,
  },
  {
    version: 15,
    name: 'backfill_pending_sync_entity_keys',
    up: `UPDATE pending_syncs
            SET entity_key = type || ':' || COALESCE(
              json_extract(data, '$.roundId') || ':' || json_extract(data, '$.playerId'),
              json_extract(data, '$.id'),
              'legacy:' || id
            )
          WHERE entity_key IS NULL OR entity_key = ''`,
  },
  {
    version: 16,
    name: 'deduplicate_pending_sync_entities',
    up: `DELETE FROM pending_syncs
          WHERE id NOT IN (
            SELECT MAX(id) FROM pending_syncs GROUP BY entity_key
          )`,
  },
  {
    version: 17,
    name: 'index_pending_sync_entity_keys',
    up: `CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_sync_entity_key
          ON pending_syncs(entity_key)`,
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
