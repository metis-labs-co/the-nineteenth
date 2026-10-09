/**
 * Scorecard DAO
 *
 * Data access operations for scorecards in SQLite.
 */

import type { AcceptedScorecardWrite, PositiveRoundScoringShape, PriorLocalShapes, RoundScoringShape, OwnedRoundEndIntent } from '@/services/rounds/roundScoringWrite';
import { shapeHoleNumbers } from '@/services/rounds/roundScoringWrite';
import { assertCompatibleEndIntent, type EndTransaction, assertIntentOwner, ensureRoundEndIntent } from './roundEndIntent';
import { Platform } from 'react-native';
import { getHoleRange } from '@/constants/scoring';
import type { Scorecard } from '@/types';
import type { TeeBox, Hole } from '@/types/database/base';
import type { GameType, NineType } from '@/types/database/enums';
import type { PendingSyncRow, ScorecardRow } from '../types';
import { getDb, isValidUUID } from '../DatabaseManager';
import { nowSQLite, fromSQLiteDate, fromSQLiteDateOptional } from '../utils/dateUtils';
import { TABLE_NAMES } from '../schema/tables';
import { getHoleScores, bulkSaveHoleScores, deleteHoleScores } from './HoleScoreDAO';
import { dbLogger } from '@/utils/debugLogger';

/**
 * Convert a database row to a Scorecard object
 */
async function rowToScorecard(row: ScorecardRow, connection?: EndTransaction): Promise<Scorecard> {
  const scores = connection ? await getHoleScores(row.id, connection) : await getHoleScores(row.id);

  // Parse tee data JSON if present (stored for handicap calculation in fallback sync path)
  let teeData: TeeBox | null = null;
  if (row.tee_data) {
    try {
      teeData = JSON.parse(row.tee_data) as TeeBox;
    } catch {
      // Ignore parse errors — teeData stays null
    }
  }

  // Planned holes stamped at submit (fallback sync path needs them for
  // points, par score and the net-double-bogey cap).
  let syncHoles: Hole[] | undefined;
  if (row.sync_holes) {
    try {
      syncHoles = JSON.parse(row.sync_holes) as Hole[];
    } catch {
      // Ignore parse errors — syncHoles stays undefined (gross-based fallback)
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
    // Sync metadata (for fallback sync path): without syncNineType a complete
    // 9-hole card would be judged against 18 holes and lose its differential.
    syncNineType: (row.sync_nine_type as NineType | null | undefined) ?? undefined,
    syncGameType: (row.sync_game_type as GameType | null | undefined) ?? undefined,
    syncHoles,
    // End round early marker (local migration 22)
    holesPlayed: row.holes_played ?? null,
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
      // Resolve conflicts in SQL, not a pre-read: a stale asynchronous save
      // cannot clear/change committed N, its tee or its nine. A matching N
      // may correct the tee normally. Non-ended saves retain their old behavior.
      await database.runAsync(
        `INSERT OR REPLACE INTO ${TABLE_NAMES.SCORECARDS}
         (id, round_id, player_id, player_name, player_handicap, total_gross, total_net, total_points,
          status, submitted_at, submitted_by, created_at, updated_at, is_synced, is_standalone,
          tee_data, course_par, player_gender, player_handicap_used, server_revision,
          sync_nine_type, sync_game_type, sync_holes, holes_played)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
          round_id = excluded.round_id,
          player_id = excluded.player_id,
          player_name = excluded.player_name,
          player_handicap = excluded.player_handicap,
          total_gross = excluded.total_gross,
          total_net = excluded.total_net,
          total_points = excluded.total_points,
          status = excluded.status,
          submitted_at = excluded.submitted_at,
          submitted_by = excluded.submitted_by,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          is_synced = excluded.is_synced,
          is_standalone = excluded.is_standalone,
          course_par = excluded.course_par,
          player_gender = excluded.player_gender,
          player_handicap_used = excluded.player_handicap_used,
          server_revision = excluded.server_revision,
          sync_game_type = excluded.sync_game_type,
          sync_holes = excluded.sync_holes,
          holes_played = COALESCE(scorecards.holes_played, excluded.holes_played),
          tee_data = CASE WHEN scorecards.holes_played IS NOT NULL AND scorecards.holes_played IS NOT excluded.holes_played THEN scorecards.tee_data ELSE excluded.tee_data END,
          sync_nine_type = CASE WHEN scorecards.holes_played IS NOT NULL AND scorecards.holes_played IS NOT excluded.holes_played THEN scorecards.sync_nine_type WHEN scorecards.holes_played IS NOT NULL THEN COALESCE(excluded.sync_nine_type, scorecards.sync_nine_type) ELSE excluded.sync_nine_type END`,
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
          scorecard.syncNineType ?? null,
          scorecard.syncGameType ?? null,
          scorecard.syncHoles ? JSON.stringify(scorecard.syncHoles) : null,
          scorecard.holesPlayed ?? null,
        ]
      );

      // Read AFTER the atomic row upsert, inside this transaction: a delayed
      // pre-end full-card save must not resurrect scores outside durable N.
      const shape = await database.getFirstAsync<Pick<ScorecardRow, 'holes_played' | 'sync_nine_type'>>(
        `SELECT holes_played, sync_nine_type FROM ${TABLE_NAMES.SCORECARDS} WHERE id = ?`,
        [scorecard.id]
      );
      let scores = scorecard.scores;
      if (shape?.holes_played != null && shape.holes_played > 0) {
        const { start } = getHoleRange((shape.sync_nine_type as NineType | null) ?? 'full');
        const end = start + shape.holes_played;
        scores = Object.fromEntries(Object.entries(scores).filter(([key]) => {
          const hole = Number(key);
          return hole >= start && hole < end;
        }));
      }
      await bulkSaveHoleScores(scorecard.id, scores);
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
 * Commit the local end marker, effective tee, nine and score removals together.
 * Only this operation replaces an existing authoritative N (in either direction).
 *
 * Expo SQLite 16's ordinary async transactions admit unrelated statements.
 * The isolated txn connection is required here, and is unsupported on web.
 * This iOS/Android feature explicitly rejects web instead of weakening atomicity.
 * Never call saveScorecard/deleteHoleScoresForCards inside this transaction.
 */
export async function persistRoundEarlyEnd(
  roundId: string,
  holesPlayed: number,
  nineType: NineType,
  playedHoleNumbers: readonly number[],
  cards: readonly { scorecardId: string; teeData: TeeBox | null }[],
  options: { intent?: OwnedRoundEndIntent } = {},
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Durable early ending requires native SQLite; web is unsupported');
  }
  if (!Number.isInteger(holesPlayed) || holesPlayed < 1 || playedHoleNumbers.length !== holesPlayed) {
    throw new Error('Invalid durable early-end played holes');
  }
  if (options.intent) assertIntentOwner(options.intent);
  const database = await getDb();
  const now = nowSQLite();
  await database.withExclusiveTransactionAsync(async (txn) => {
    for (const { scorecardId, teeData } of cards) {
      const result = await txn.runAsync(
        `UPDATE ${TABLE_NAMES.SCORECARDS} SET holes_played = ?, tee_data = ?, sync_nine_type = ?, updated_at = ?, is_synced = 0 WHERE id = ? AND round_id = ?`,
        [holesPlayed, teeData ? JSON.stringify(teeData) : null, nineType, now, scorecardId, roundId]
      );
      if (result.changes !== 1) throw new Error(`Missing expected scorecard ${scorecardId} for early end`);
      const placeholders = playedHoleNumbers.map(() => '?').join(', ');
      await txn.runAsync(
        `DELETE FROM ${TABLE_NAMES.HOLE_SCORES} WHERE scorecard_id = ? AND hole_number NOT IN (${placeholders})`,
        [scorecardId, ...playedHoleNumbers]
      );
    }
    if (options.intent) await ensureRoundEndIntent(txn, roundId, holesPlayed, options.intent);
  });
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
 * Persist a server-confirmed revision without marking the scorecard synced.
 *
 * For a write the server accepted while a newer local edit was still queued:
 * the scorecard stays unsynced, but resumes from the confirmed revision.
 * Never lowers the revision.
 */
export async function recordScorecardServerRevision(
  scorecardId: string,
  serverRevision: number
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE ${TABLE_NAMES.SCORECARDS}
        SET server_revision = ?
      WHERE id = ?
        AND COALESCE(server_revision, 0) < ?`,
    [serverRevision, scorecardId, serverRevision]
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

/**
 * Passive authoritative repair: all cached cards and live queue payloads commit
 * together. The caller supplies synchronous existing scoring math/context;
 * this operation neither acknowledges work nor creates an end intent.
 */
export async function persistAuthoritativeRoundShape(
  roundId: string,
  shape: PositiveRoundScoringShape,
  options: {
    ownerId: string;
    acceptedWrite?: AcceptedScorecardWrite;
    rebuild: (card: Scorecard, keep: ReadonlySet<number>) => Scorecard;
  }
): Promise<{ cards: Scorecard[]; priorLocalShapes: PriorLocalShapes }> {
  assertIntentOwner({ userId: options.ownerId });
  if (Platform.OS === 'web') throw new Error('Authoritative scoring repair requires native SQLite');
  const authoritative = shapeHoleNumbers(shape);
  if (shape.holes_played == null)
    throw new Error('Authoritative end requires positive holes played');
  const accepted = options.acceptedWrite;
  if (accepted && (!Number.isInteger(accepted.serverRevision) || accepted.serverRevision < 0))
    throw new Error('Invalid accepted server revision');
  const database = await getDb();
  const cards: Scorecard[] = [];
  const priorLocalShapes = new Map<string, RoundScoringShape>();
  await database.withExclusiveTransactionAsync(async (txn) => {
    const end = await txn.getFirstAsync<PendingSyncRow>(
      `SELECT * FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE entity_key = ?`,
      [`round:${roundId}:end_early`]
    );
    if (end) assertCompatibleEndIntent(end, roundId, { userId: options.ownerId });
    const rows = await txn.getAllAsync<ScorecardRow>(
      `SELECT * FROM ${TABLE_NAMES.SCORECARDS} WHERE round_id = ?`,
      [roundId]
    );
    const queue = await txn.getAllAsync<PendingSyncRow>(
      `SELECT * FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE type = 'scorecard' AND entity_key LIKE ?`,
      [`scorecard:${roundId}:%`]
    );
    let commonKeep = new Set(authoritative);
    for (const row of rows) {
      const prior: RoundScoringShape = {
        nine_type: (row.sync_nine_type ?? shape.nine_type) as NineType,
        holes_played: row.holes_played ?? null,
      };
      if (prior.holes_played != null && !row.sync_nine_type)
        throw new Error('Missing prior ended nine context');
      priorLocalShapes.set(row.id, prior);
      if (prior.holes_played != null)
        commonKeep = new Set([...commonKeep].filter((h) => shapeHoleNumbers(prior).has(h)));
    }
    const queuedCards: { row: PendingSyncRow; card: Scorecard }[] = [];
    for (const queued of queue) {
      if (queued.action === 'delete') continue;
      const card = JSON.parse(queued.data) as Scorecard;
      if (
        !card ||
        !card.id ||
        card.roundId !== roundId ||
        !card.playerId ||
        queued.entity_key !== `scorecard:${roundId}:${card.playerId}` ||
        !card.scores ||
        typeof card.scores !== 'object' ||
        Array.isArray(card.scores) ||
        !['create', 'update'].includes(queued.action)
      ) {
        throw new Error('Malformed queued scorecard blocks authoritative repair');
      }
      queuedCards.push({ row: queued, card });
    }
    const revisions = new Map<string, number>();
    for (const row of rows)
      revisions.set(row.id, Math.max(revisions.get(row.id) ?? 0, row.server_revision ?? 0));
    for (const { card } of queuedCards)
      revisions.set(card.id, Math.max(revisions.get(card.id) ?? 0, card.serverRevision ?? 0));
    if (accepted)
      revisions.set(
        accepted.scorecardId,
        Math.max(revisions.get(accepted.scorecardId) ?? 0, accepted.serverRevision)
      );
    const repair = (source: Scorecard): Scorecard => {
      let keep = new Set(commonKeep);
      if (source.holesPlayed != null) {
        if (!source.syncNineType) throw new Error('Missing queued ended nine context');
        const prior = shapeHoleNumbers({
          nine_type: source.syncNineType,
          holes_played: source.holesPlayed,
        });
        keep = new Set([...keep].filter((h) => prior.has(h)));
      }
      const input = { ...source, holesPlayed: shape.holes_played, syncNineType: shape.nine_type };
      const rebuilt = options.rebuild(input, keep);
      // Context/math may change aggregates and effective tee, never identity,
      // submission history, frozen handicap or source retained score values.
      const scores = Object.fromEntries(
        Object.entries(source.scores).filter(([h]) => keep.has(Number(h)))
      );
      return {
        ...input,
        scores,
        totalGross: rebuilt.totalGross,
        totalNet: rebuilt.totalNet,
        total_par_score: rebuilt.total_par_score,
        teeData: rebuilt.teeData,
        syncHoles: rebuilt.syncHoles ?? source.syncHoles,
        syncGameType: rebuilt.syncGameType ?? source.syncGameType,
        serverRevision: revisions.get(source.id) ?? source.serverRevision,
      };
    };
    for (const row of rows) {
      const card = repair(await rowToScorecard(row, txn));
      cards.push(card);
      const result = await txn.runAsync(
        `UPDATE ${TABLE_NAMES.SCORECARDS}
        SET holes_played = ?, sync_nine_type = ?, tee_data = ?, total_gross = ?, total_net = ?, total_points = ?, sync_holes = ?, sync_game_type = ?, server_revision = ?, is_synced = 0
        WHERE id = ? AND round_id = ?`,
        [
          shape.holes_played,
          shape.nine_type,
          card.teeData ? JSON.stringify(card.teeData) : null,
          card.totalGross,
          card.totalNet,
          card.syncGameType === 'stableford' ? card.totalNet : 0,
          card.syncHoles ? JSON.stringify(card.syncHoles) : null,
          card.syncGameType ?? null,
          card.serverRevision ?? null,
          row.id,
          roundId,
        ]
      );
      if (result.changes !== 1)
        throw new Error('Cached scorecard changed during authoritative repair');
      const keep = Object.keys(card.scores).map(Number);
      await txn.runAsync(
        `DELETE FROM ${TABLE_NAMES.HOLE_SCORES} WHERE scorecard_id = ?${keep.length ? ` AND hole_number NOT IN (${keep.map(() => '?').join(', ')})` : ''}`,
        [row.id, ...keep]
      );
    }
    for (const { row, card } of queuedCards) {
      const rebuilt = repair(card);
      const result = await txn.runAsync(
        `UPDATE ${TABLE_NAMES.PENDING_SYNCS} SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?`,
        [JSON.stringify(rebuilt), row.id, row.revision]
      );
      if (result.changes !== 1)
        throw new Error('Queued scorecard changed during authoritative repair');
    }
  });
  return { cards, priorLocalShapes };
}
