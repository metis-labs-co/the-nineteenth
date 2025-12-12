/**
 * SQLite Database Service for Offline Scorecard Storage
 *
 * Provides persistent local storage for scorecards when offline.
 * Data syncs to Supabase when connection is restored.
 */

import * as SQLite from 'expo-sqlite';
import type { Scorecard, HoleScore, Hole, PendingSync } from '@/types';
import { dbLogger } from '@/utils/debugLogger';

const DB_NAME = 'the_nineteenth.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the SQLite database and create tables
 */
export async function initDatabase(): Promise<void> {
  dbLogger.info('Initializing database', { dbName: DB_NAME });

  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    dbLogger.debug('Database opened successfully');

    // Create scorecards table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS scorecards (
        id TEXT PRIMARY KEY,
        round_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        player_handicap INTEGER DEFAULT 0,
        total_gross INTEGER DEFAULT 0,
        total_net INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        status TEXT DEFAULT 'in-progress',
        submitted_at TEXT,
        submitted_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        is_standalone INTEGER DEFAULT 0
      );
    `);
    dbLogger.debug('Scorecards table ready');

    // Migration: Add is_standalone column if it doesn't exist (for existing databases)
    try {
      await db.execAsync(`ALTER TABLE scorecards ADD COLUMN is_standalone INTEGER DEFAULT 0`);
      dbLogger.debug('Added is_standalone column');
    } catch {
      // Column already exists, ignore
    }

    // Create hole_scores table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS hole_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scorecard_id TEXT NOT NULL,
        hole_number INTEGER NOT NULL,
        strokes INTEGER NOT NULL,
        putts INTEGER,
        fairway_hit INTEGER,
        green_in_regulation INTEGER,
        penalties INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (scorecard_id) REFERENCES scorecards(id),
        UNIQUE(scorecard_id, hole_number)
      );
    `);
    dbLogger.debug('Hole scores table ready');

    // Create pending_syncs table for tracking changes
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_syncs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0
      );
    `);
    dbLogger.debug('Pending syncs table ready');

    // Create holes table for course data
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS holes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_id TEXT NOT NULL,
        hole_number INTEGER NOT NULL,
        par INTEGER NOT NULL,
        stroke_index INTEGER NOT NULL,
        yardage INTEGER,
        UNIQUE(round_id, hole_number)
      );
    `);
    dbLogger.debug('Holes table ready');

    dbLogger.info('Database initialized successfully');
  } catch (error) {
    dbLogger.error('Failed to initialize database', error);
    throw error;
  }
}

/**
 * Get database instance (initialize if needed)
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    await initDatabase();
  }
  return db!;
}

// ============================================================================
// SCORECARD OPERATIONS
// ============================================================================

/**
 * Save or update a scorecard locally
 */
export async function saveScorecard(scorecard: Scorecard): Promise<void> {
  dbLogger.debug('Saving scorecard', {
    id: scorecard.id.substring(0, 20) + '...',
    roundId: scorecard.roundId.substring(0, 8) + '...',
    playerId: scorecard.playerId.substring(0, 8) + '...',
    status: scorecard.status,
    isStandalone: scorecard.isStandalone,
  });

  const database = await getDb();
  const now = new Date().toISOString();

  try {
    await database.runAsync(
      `INSERT OR REPLACE INTO scorecards
       (id, round_id, player_id, player_name, player_handicap, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at, is_synced, is_standalone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scorecard.id,
        scorecard.roundId,
        scorecard.playerId,
        scorecard.player?.name || '',
        scorecard.player?.handicap || 0,
        scorecard.totalGross,
        scorecard.totalNet,
        0, // totalPoints - calculated separately
        scorecard.status,
        scorecard.submittedAt?.toISOString() || null,
        scorecard.submittedBy || null,
        scorecard.createdAt.toISOString(),
        now,
        0, // Not synced yet
        scorecard.isStandalone ? 1 : 0,
      ]
    );

    // Save individual hole scores
    const holeCount = Object.keys(scorecard.scores).length;
    for (const [holeNumber, score] of Object.entries(scorecard.scores)) {
      if (score) {
        await saveHoleScore(scorecard.id, parseInt(holeNumber), score);
      }
    }

    dbLogger.debug('Scorecard saved successfully', {
      id: scorecard.id.substring(0, 20) + '...',
      holesScored: holeCount,
    });
  } catch (error) {
    dbLogger.error('Failed to save scorecard', error, {
      id: scorecard.id.substring(0, 20) + '...',
    });
    throw error;
  }
}

/**
 * Save a single hole score
 */
export async function saveHoleScore(
  scorecardId: string,
  holeNumber: number,
  score: HoleScore
): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT OR REPLACE INTO hole_scores
     (scorecard_id, hole_number, strokes, putts, fairway_hit, green_in_regulation, penalties, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      scorecardId,
      holeNumber,
      score.strokes,
      score.putts ?? null,
      score.fairwayHit ? 1 : 0,
      score.greenInRegulation ? 1 : 0,
      score.penalties ?? 0,
      now,
    ]
  );
}

/**
 * Get all scorecards for a round
 */
export async function getScorecardsByRound(roundId: string): Promise<Scorecard[]> {
  const database = await getDb();

  const rows = await database.getAllAsync<{
    id: string;
    round_id: string;
    player_id: string;
    player_name: string;
    player_handicap: number;
    total_gross: number;
    total_net: number;
    total_points: number;
    status: string;
    submitted_at: string | null;
    submitted_by: string | null;
    created_at: string;
    updated_at: string;
    is_synced: number;
    is_standalone: number;
  }>('SELECT * FROM scorecards WHERE round_id = ?', [roundId]);

  const scorecards: Scorecard[] = [];

  for (const row of rows) {
    const scores = await getHoleScores(row.id);
    scorecards.push({
      id: row.id,
      roundId: row.round_id,
      playerId: row.player_id,
      player: {
        id: row.player_id,
        name: row.player_name,
        email: '',
        handicap: row.player_handicap,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      scores,
      totalGross: row.total_gross,
      totalNet: row.total_net,
      status: row.status as Scorecard['status'],
      submittedAt: row.submitted_at ? new Date(row.submitted_at) : undefined,
      submittedBy: row.submitted_by || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      isStandalone: row.is_standalone === 1,
    });
  }

  return scorecards;
}

/**
 * Get hole scores for a scorecard
 */
export async function getHoleScores(
  scorecardId: string
): Promise<{ [holeNumber: number]: HoleScore }> {
  const database = await getDb();

  const rows = await database.getAllAsync<{
    hole_number: number;
    strokes: number;
    putts: number | null;
    fairway_hit: number;
    green_in_regulation: number;
    penalties: number;
  }>('SELECT * FROM hole_scores WHERE scorecard_id = ?', [scorecardId]);

  const scores: { [holeNumber: number]: HoleScore } = {};

  for (const row of rows) {
    scores[row.hole_number] = {
      strokes: row.strokes,
      putts: row.putts ?? undefined,
      fairwayHit: row.fairway_hit === 1,
      greenInRegulation: row.green_in_regulation === 1,
      penalties: row.penalties,
    };
  }

  return scores;
}

/**
 * Delete a scorecard and its hole scores
 */
export async function deleteScorecard(scorecardId: string): Promise<void> {
  const database = await getDb();

  await database.runAsync('DELETE FROM hole_scores WHERE scorecard_id = ?', [scorecardId]);
  await database.runAsync('DELETE FROM scorecards WHERE id = ?', [scorecardId]);

  console.log('[SQLite] Scorecard deleted:', scorecardId);
}

/**
 * Delete all scorecards and related data for a round
 */
export async function deleteScorecardsByRound(roundId: string): Promise<void> {
  const database = await getDb();

  // Get all scorecard IDs for this round
  const scorecards = await database.getAllAsync<{ id: string }>(
    'SELECT id FROM scorecards WHERE round_id = ?',
    [roundId]
  );

  // Delete hole scores for each scorecard
  for (const sc of scorecards) {
    await database.runAsync('DELETE FROM hole_scores WHERE scorecard_id = ?', [sc.id]);
  }

  // Delete all scorecards for this round
  await database.runAsync('DELETE FROM scorecards WHERE round_id = ?', [roundId]);

  // Delete holes data for this round
  await database.runAsync('DELETE FROM holes WHERE round_id = ?', [roundId]);

  // Delete any pending syncs for this round
  const pendingSyncs = await database.getAllAsync<{ id: number; data: string }>(
    'SELECT id, data FROM pending_syncs'
  );

  for (const sync of pendingSyncs) {
    try {
      const data = JSON.parse(sync.data);
      if (data.roundId === roundId) {
        await database.runAsync('DELETE FROM pending_syncs WHERE id = ?', [sync.id]);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  console.log('[SQLite] All data deleted for round:', roundId);
}

/**
 * Mark scorecards as synced
 */
export async function markScorecardsAsSynced(scorecardIds: string[]): Promise<void> {
  const database = await getDb();

  for (const id of scorecardIds) {
    await database.runAsync('UPDATE scorecards SET is_synced = 1 WHERE id = ?', [id]);
  }
}

/**
 * Get unsynced scorecards (excludes standalone rounds which are local-only)
 */
export async function getUnsyncedScorecards(): Promise<Scorecard[]> {
  const database = await getDb();

  const rows = await database.getAllAsync<{
    id: string;
    round_id: string;
    player_id: string;
    player_name: string;
    player_handicap: number;
    total_gross: number;
    total_net: number;
    status: string;
    submitted_at: string | null;
    created_at: string;
    updated_at: string;
    is_standalone: number;
  }>('SELECT * FROM scorecards WHERE is_synced = 0 AND (is_standalone = 0 OR is_standalone IS NULL)');

  const scorecards: Scorecard[] = [];

  for (const row of rows) {
    const scores = await getHoleScores(row.id);
    scorecards.push({
      id: row.id,
      roundId: row.round_id,
      playerId: row.player_id,
      player: {
        id: row.player_id,
        name: row.player_name,
        email: '',
        handicap: row.player_handicap,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      scores,
      totalGross: row.total_gross,
      totalNet: row.total_net,
      status: row.status as Scorecard['status'],
      submittedAt: row.submitted_at ? new Date(row.submitted_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      isStandalone: row.is_standalone === 1,
    });
  }

  return scorecards;
}

// ============================================================================
// HOLES OPERATIONS (Course Data)
// ============================================================================

/**
 * Save holes data for a round
 */
export async function saveHoles(roundId: string, holes: Hole[]): Promise<void> {
  const database = await getDb();

  for (const hole of holes) {
    await database.runAsync(
      `INSERT OR REPLACE INTO holes (round_id, hole_number, par, stroke_index, yardage)
       VALUES (?, ?, ?, ?, ?)`,
      [roundId, hole.number, hole.par, hole.strokeIndex, hole.yardages?.white || null]
    );
  }

  console.log('[SQLite] Holes saved for round:', roundId);
}

/**
 * Get holes for a round
 */
export async function getHoles(roundId: string): Promise<Hole[]> {
  const database = await getDb();

  const rows = await database.getAllAsync<{
    hole_number: number;
    par: number;
    stroke_index: number;
    yardage: number | null;
  }>('SELECT * FROM holes WHERE round_id = ? ORDER BY hole_number', [roundId]);

  return rows.map((row) => ({
    number: row.hole_number as Hole['number'],
    par: row.par as Hole['par'],
    strokeIndex: row.stroke_index,
    yardages: { white: row.yardage || 0 },
  }));
}

// ============================================================================
// PENDING SYNC OPERATIONS
// ============================================================================

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
      `INSERT INTO pending_syncs (type, action, data, timestamp, retry_count)
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

  const rows = await database.getAllAsync<{
    id: number;
    type: string;
    action: string;
    data: string;
    timestamp: string;
    retry_count: number;
  }>('SELECT * FROM pending_syncs ORDER BY timestamp ASC');

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
  await database.runAsync('DELETE FROM pending_syncs WHERE id = ?', [id]);
  dbLogger.debug('Removed pending sync', { id });
}

/**
 * Increment retry count for a pending sync
 */
export async function incrementSyncRetryCount(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE pending_syncs SET retry_count = retry_count + 1 WHERE id = ?', [id]);
  dbLogger.debug('Incremented sync retry count', { id });
}

/**
 * Get count of pending syncs
 */
export async function getPendingSyncCount(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_syncs'
  );
  const count = result?.count ?? 0;
  dbLogger.debug('Pending sync count', { count });
  return count;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clear all data from the database (for testing/logout)
 */
export async function clearAllData(): Promise<void> {
  const database = await getDb();

  await database.execAsync('DELETE FROM hole_scores');
  await database.execAsync('DELETE FROM scorecards');
  await database.execAsync('DELETE FROM pending_syncs');
  await database.execAsync('DELETE FROM holes');

  console.log('[SQLite] All data cleared');
}

/**
 * Check if a string is a valid UUID (RFC 4122)
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Clear invalid mock data from the database
 * Removes scorecards and syncs where IDs are not valid UUIDs
 */
export async function clearInvalidMockData(): Promise<number> {
  const database = await getDb();

  let deletedCount = 0;

  // Get all scorecards
  const scorecards = await database.getAllAsync<{
    id: string;
    round_id: string;
    player_id: string;
    is_standalone: number;
  }>('SELECT id, round_id, player_id, is_standalone FROM scorecards');

  for (const sc of scorecards) {
    // Check if player_id or round_id is not a valid UUID (and not standalone)
    const isStandalone = sc.is_standalone === 1;
    if (!isStandalone && (!isValidUUID(sc.player_id) || !isValidUUID(sc.round_id))) {
      console.log('[SQLite] Removing invalid scorecard:', sc.id, 'round:', sc.round_id);
      await database.runAsync('DELETE FROM hole_scores WHERE scorecard_id = ?', [sc.id]);
      await database.runAsync('DELETE FROM scorecards WHERE id = ?', [sc.id]);
      deletedCount++;
    }
  }

  // Clear all pending syncs that have invalid data
  const pendingSyncs = await database.getAllAsync<{ id: number; data: string }>(
    'SELECT id, data FROM pending_syncs'
  );

  for (const sync of pendingSyncs) {
    try {
      const data = JSON.parse(sync.data);
      const playerId = data.playerId;
      const roundId = data.roundId;
      const isStandalone = data.isStandalone === true;

      // Skip standalone data
      if (isStandalone) {
        continue;
      }

      // Remove if invalid UUIDs
      if ((playerId && !isValidUUID(playerId)) || (roundId && !isValidUUID(roundId))) {
        console.log('[SQLite] Removing invalid pending sync:', sync.id, 'round:', roundId);
        await database.runAsync('DELETE FROM pending_syncs WHERE id = ?', [sync.id]);
        deletedCount++;
      }
    } catch {
      // If JSON parse fails, keep the sync
    }
  }

  if (deletedCount > 0) {
    console.log('[SQLite] Cleared', deletedCount, 'invalid mock data entries');
  }

  return deletedCount;
}

/**
 * Clear all pending syncs (useful for manual cleanup)
 */
export async function clearAllPendingSyncs(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_syncs'
  );
  const count = result?.count ?? 0;

  await database.execAsync('DELETE FROM pending_syncs');
  console.log('[SQLite] Cleared all', count, 'pending syncs');

  return count;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    dbLogger.info('Database closed');
  }
}

/**
 * Mark scorecards as synced to stop retry attempts
 * Use this to clear stale scorecards that keep failing RLS checks
 */
export async function markAllScorecardsAsSynced(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM scorecards WHERE is_synced = 0'
  );
  const count = result?.count ?? 0;

  if (count > 0) {
    await database.runAsync('UPDATE scorecards SET is_synced = 1');
    dbLogger.info('Marked all scorecards as synced', { count });
  }

  return count;
}

/**
 * Delete scorecards for rounds that no longer exist or user has no access to
 * Call this to clean up orphaned local data
 */
export async function deleteOrphanedScorecards(validRoundIds: string[]): Promise<number> {
  const database = await getDb();

  if (validRoundIds.length === 0) {
    dbLogger.warn('No valid round IDs provided, skipping orphan cleanup');
    return 0;
  }

  // Get all round IDs in local database
  const localRounds = await database.getAllAsync<{ round_id: string }>(
    'SELECT DISTINCT round_id FROM scorecards WHERE is_standalone = 0'
  );

  const validSet = new Set(validRoundIds);
  const orphanedRoundIds = localRounds
    .map((r) => r.round_id)
    .filter((id) => !validSet.has(id));

  let deletedCount = 0;
  for (const roundId of orphanedRoundIds) {
    dbLogger.info('Deleting orphaned scorecards for round', { roundId: roundId.substring(0, 8) + '...' });
    await deleteScorecardsByRound(roundId);
    deletedCount++;
  }

  if (deletedCount > 0) {
    dbLogger.info('Deleted orphaned scorecards', { roundCount: deletedCount });
  }

  return deletedCount;
}
