/**
 * Scorecard DAO
 *
 * Data access operations for scorecards in SQLite.
 */

import type { Scorecard } from '@/types';
import type { TeeBox } from '@/types/database/base';
import type { ScorecardRow } from '../types';
import { getDb, isValidUUID } from '../DatabaseManager';
import { nowSQLite, fromSQLiteDate, fromSQLiteDateOptional } from '../utils/dateUtils';
import { TABLE_NAMES } from '../schema/tables';
import { getHoleScores, bulkSaveHoleScores, deleteHoleScores } from './HoleScoreDAO';
import { dbLogger } from '@/utils/debugLogger';

/**
 * Convert a database row to a Scorecard object
 */
async function rowToScorecard(row: ScorecardRow): Promise<Scorecard> {
  const scores = await getHoleScores(row.id);

  // Parse tee data JSON if present (stored for handicap calculation in fallback sync path)
  let teeData: TeeBox | null = null;
  if (row.tee_data) {
    try {
      teeData = JSON.parse(row.tee_data) as TeeBox;
    } catch {
      // Ignore parse errors — teeData stays null
    }
  }

  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    player: {
      id: row.player_id,
      name: row.player_name,
      email: '',
      handicap: row.player_handicap,
      createdAt: fromSQLiteDate(row.created_at),
      updatedAt: fromSQLiteDate(row.updated_at),
    },
    scores,
    totalGross: row.total_gross,
    totalNet: row.total_net,
    status: row.status as Scorecard['status'],
    submittedAt: fromSQLiteDateOptional(row.submitted_at),
    submittedBy: row.submitted_by || undefined,
    createdAt: fromSQLiteDate(row.created_at),
    updatedAt: fromSQLiteDate(row.updated_at),
    serverRevision: row.server_revision,
    isStandalone: row.is_standalone === 1,
    // Handicap calculation metadata (for fallback sync path)
    teeData,
    coursePar: row.course_par ?? undefined,
    playerGender: (row.player_gender as 'male' | 'female' | null) ?? null,
    playerHandicap: row.player_handicap_used ?? null,
  };
}

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
  const now = nowSQLite();
  const holeCount = Object.keys(scorecard.scores).length;

  try {
    // Use a transaction to atomically save the scorecard row and all hole scores
    // together. Without this, a failure mid-way through hole saves would leave
    // a scorecard with incomplete hole data in SQLite.
    await database.withTransactionAsync(async () => {
      await database.runAsync(
        `INSERT OR REPLACE INTO ${TABLE_NAMES.SCORECARDS}
         (id, round_id, player_id, player_name, player_handicap, total_gross, total_net, total_points,
          status, submitted_at, submitted_by, created_at, updated_at, is_synced, is_standalone,
          tee_data, course_par, player_gender, player_handicap_used, server_revision)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scorecard.id,
          scorecard.roundId,
          scorecard.playerId,
          scorecard.player?.name || '',
          scorecard.player?.handicap || 0,
          scorecard.totalGross,
          scorecard.totalNet,
          0,
          scorecard.status,
          scorecard.submittedAt?.toISOString() || null,
          scorecard.submittedBy || null,
          scorecard.createdAt.toISOString(),
          now,
          0,
          scorecard.isStandalone ? 1 : 0,
          scorecard.teeData ? JSON.stringify(scorecard.teeData) : null,
          scorecard.coursePar ?? null,
          scorecard.playerGender ?? null,
          scorecard.playerHandicap ?? null,
          scorecard.serverRevision ?? null,
        ]
      );

      // Save individual hole scores within the same transaction
      await bulkSaveHoleScores(scorecard.id, scorecard.scores);
    });

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
 * Get all scorecards for a round
 */
export async function getScorecardsByRound(roundId: string): Promise<Scorecard[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<ScorecardRow>(
    `SELECT * FROM ${TABLE_NAMES.SCORECARDS} WHERE round_id = ?`,
    [roundId]
  );

  const scorecards: Scorecard[] = [];
  for (const row of rows) {
    scorecards.push(await rowToScorecard(row));
  }
  return scorecards;
}

/**
 * Delete a scorecard and its hole scores
 */
export async function deleteScorecard(scorecardId: string): Promise<void> {
  const database = await getDb();
  await deleteHoleScores(scorecardId);
  await database.runAsync(
    `DELETE FROM ${TABLE_NAMES.SCORECARDS} WHERE id = ?`,
    [scorecardId]
  );
  dbLogger.debug('Scorecard deleted', { scorecardId: scorecardId.substring(0, 8) + '...' });
}

/**
 * Delete all scorecards and related data for a round
 */
export async function deleteScorecardsByRound(roundId: string): Promise<void> {
  const database = await getDb();

  const scorecards = await database.getAllAsync<{ id: string }>(
    `SELECT id FROM ${TABLE_NAMES.SCORECARDS} WHERE round_id = ?`,
    [roundId]
  );

  for (const sc of scorecards) {
    await deleteHoleScores(sc.id);
  }

  await database.runAsync(
    `DELETE FROM ${TABLE_NAMES.SCORECARDS} WHERE round_id = ?`,
    [roundId]
  );
  await database.runAsync(
    `DELETE FROM holes WHERE round_id = ?`,
    [roundId]
  );

  // Clean pending syncs for this round
  const pendingSyncs = await database.getAllAsync<{ id: number; data: string }>(
    `SELECT id, data FROM ${TABLE_NAMES.PENDING_SYNCS}`
  );

  for (const sync of pendingSyncs) {
    try {
      const data = JSON.parse(sync.data);
      if (data.roundId === roundId) {
        await database.runAsync(
          `DELETE FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE id = ?`,
          [sync.id]
        );
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  dbLogger.debug('All data deleted for round', { roundId: roundId.substring(0, 8) + '...' });
}

/**
 * Get the number of scored holes per round from offline storage.
 * Efficiently counts holes with valid scores (strokes > 0 or multi-ball data)
 * for a specific player across multiple rounds in a single query.
 */
export async function getHolesCompletedByRounds(
  roundIds: string[],
  playerId: string
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (roundIds.length === 0) return result;

  const database = await getDb();
  const placeholders = roundIds.map(() => '?').join(',');

  const rows = await database.getAllAsync<{ round_id: string; holes_scored: number }>(
    `SELECT sc.round_id, COUNT(DISTINCT hs.hole_number) as holes_scored
     FROM ${TABLE_NAMES.SCORECARDS} sc
     JOIN ${TABLE_NAMES.HOLE_SCORES} hs ON hs.scorecard_id = sc.id
     WHERE sc.round_id IN (${placeholders})
       AND sc.player_id = ?
       AND (hs.strokes > 0 OR hs.ball_scores IS NOT NULL)
     GROUP BY sc.round_id`,
    [...roundIds, playerId]
  );

  for (const row of rows) {
    result.set(row.round_id, row.holes_scored);
  }

  return result;
}

/**
 * Mark scorecards as synced
 */
export async function markScorecardsAsSynced(scorecardIds: string[]): Promise<void> {
  const database = await getDb();
  for (const id of scorecardIds) {
    await database.runAsync(
      `UPDATE ${TABLE_NAMES.SCORECARDS} SET is_synced = 1 WHERE id = ?`,
      [id]
    );
  }
}

/** Mark one scorecard synced and persist the revision acknowledged by the server. */
export async function markScorecardAsSynced(
  scorecardId: string,
  serverRevision: number
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE ${TABLE_NAMES.SCORECARDS}
        SET is_synced = 1, server_revision = ?
      WHERE id = ?`,
    [serverRevision, scorecardId]
  );
}

/**
 * Get unsynced scorecards (excludes standalone rounds which are local-only)
 */
export async function getUnsyncedScorecards(): Promise<Scorecard[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<ScorecardRow>(
    `SELECT * FROM ${TABLE_NAMES.SCORECARDS}
     WHERE is_synced = 0
       AND (is_standalone = 0 OR is_standalone IS NULL)
       AND status = 'completed'`
  );

  const scorecards: Scorecard[] = [];
  for (const row of rows) {
    scorecards.push(await rowToScorecard(row));
  }
  return scorecards;
}

/**
 * Mark all scorecards as synced
 */
export async function markAllScorecardsAsSynced(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE_NAMES.SCORECARDS} WHERE is_synced = 0`
  );
  const count = result?.count ?? 0;

  if (count > 0) {
    await database.runAsync(`UPDATE ${TABLE_NAMES.SCORECARDS} SET is_synced = 1`);
    dbLogger.info('Marked all scorecards as synced', { count });
  }
  return count;
}

/**
 * Delete orphaned scorecards (rounds that no longer exist)
 */
export async function deleteOrphanedScorecards(validRoundIds: string[]): Promise<number> {
  const database = await getDb();

  if (validRoundIds.length === 0) {
    dbLogger.warn('No valid round IDs provided, skipping orphan cleanup');
    return 0;
  }

  const localRounds = await database.getAllAsync<{ round_id: string }>(
    `SELECT DISTINCT round_id FROM ${TABLE_NAMES.SCORECARDS} WHERE is_standalone = 0`
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

/**
 * Mark all non-standalone scorecards as unsynced to trigger re-sync.
 * Used to backfill data that was previously stripped during sync (e.g. FIR/GIR).
 * Returns the number of scorecards marked for re-sync.
 */
export async function markAllForResync(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${TABLE_NAMES.SCORECARDS}
     WHERE is_synced = 1 AND (is_standalone = 0 OR is_standalone IS NULL)`
  );
  const count = result?.count ?? 0;

  if (count > 0) {
    await database.runAsync(
      `UPDATE ${TABLE_NAMES.SCORECARDS} SET is_synced = 0
       WHERE is_synced = 1 AND (is_standalone = 0 OR is_standalone IS NULL)`
    );
    dbLogger.info('Marked scorecards for re-sync (FIR/GIR backfill)', { count });
  }
  return count;
}

/**
 * Clear invalid mock data from the database
 */
export async function clearInvalidMockData(): Promise<number> {
  const database = await getDb();
  let deletedCount = 0;

  const scorecards = await database.getAllAsync<{
    id: string;
    round_id: string;
    player_id: string;
    is_standalone: number;
  }>(`SELECT id, round_id, player_id, is_standalone FROM ${TABLE_NAMES.SCORECARDS}`);

  for (const sc of scorecards) {
    const isStandalone = sc.is_standalone === 1;
    if (!isStandalone && (!isValidUUID(sc.player_id) || !isValidUUID(sc.round_id))) {
      dbLogger.debug('Removing invalid scorecard', { id: sc.id, roundId: sc.round_id });
      await deleteHoleScores(sc.id);
      await database.runAsync(`DELETE FROM ${TABLE_NAMES.SCORECARDS} WHERE id = ?`, [sc.id]);
      deletedCount++;
    }
  }

  const pendingSyncs = await database.getAllAsync<{ id: number; data: string }>(
    `SELECT id, data FROM ${TABLE_NAMES.PENDING_SYNCS}`
  );

  for (const sync of pendingSyncs) {
    try {
      const data = JSON.parse(sync.data);
      const { playerId, roundId, isStandalone } = data;
      if (isStandalone) continue;

      if ((playerId && !isValidUUID(playerId)) || (roundId && !isValidUUID(roundId))) {
        dbLogger.debug('Removing invalid pending sync', { id: sync.id, roundId });
        await database.runAsync(`DELETE FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE id = ?`, [sync.id]);
        deletedCount++;
      }
    } catch {
      // Keep sync if JSON parse fails
    }
  }

  if (deletedCount > 0) {
    dbLogger.info('Cleared invalid mock data', { count: deletedCount });
  }
  return deletedCount;
}
