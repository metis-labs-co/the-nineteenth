/**
 * Hole Score DAO
 *
 * Data access operations for hole scores in SQLite.
 */

import { runRoundPersistence, roundPersistenceLeaseRoundId, type RoundPersistenceOptions } from '../roundPersistenceBarrier';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { HoleScore, HoleShotContributions, MultiBallHoleScore } from '@/types';
import { isMultiBallScore } from '@/types/database/base';
import type { HoleScoreRow } from '../types';
import { getDb } from '../DatabaseManager';
import { nowSQLite } from '../utils/dateUtils';
import { TABLE_NAMES } from '../schema/tables';
import { dbLogger } from '@/utils/debugLogger';

/**
 * Parse a stored shot_contributions JSON blob, mapping the legacy `drive`
 * key to `teeShot` if present so older offline rows continue to work even
 * if the SQLite migration hasn't run yet (e.g. user upgrades while offline).
 */
export function parseShotContributions(raw: string): HoleShotContributions {
  const parsed = JSON.parse(raw) as HoleShotContributions & { drive?: string };
  if (parsed.drive && !parsed.teeShot) {
    parsed.teeShot = parsed.drive;
  }
  delete parsed.drive;
  return parsed;
}

/**
 * Save a single hole score (supports both single-ball and multi-ball scores)
 */
export async function saveHoleScore(
  scorecardId: string,
  holeNumber: number,
  score: HoleScore | MultiBallHoleScore,
  options: RoundPersistenceOptions = {},
): Promise<void> {
  return withHolePersistence(scorecardId, options, () => saveHoleScoreLocal(scorecardId, holeNumber, score));
}

async function withHolePersistence<T>(
  scorecardId: string,
  options: RoundPersistenceOptions,
  work: (proof: RoundPersistenceOptions & { roundId: string }) => Promise<T>,
): Promise<T> {
  const roundId = options.roundId ?? options.source?.roundId ?? (options.lease ? roundPersistenceLeaseRoundId(options.lease) : undefined);
  const readParent = async () => {
    const database = await getDb();
    const parent = await database.getFirstAsync<{ round_id: string }>(
      `SELECT round_id FROM ${TABLE_NAMES.SCORECARDS} WHERE id = ?`, [scorecardId]
    );
    if (!parent) throw new Error(`Missing parent scorecard ${scorecardId}`);
    return parent.round_id;
  };
  if (roundId) return runRoundPersistence(roundId, options, async (lease) => {
    if (await readParent() !== roundId) throw new Error('Wrong-round hole persistence lease/source');
    return work({ lease, roundId });
  });
  // Legacy hole-only callers have no round provenance. Resolve the parent solely to enforce
  // missing-source refusal on protected rounds; never manufacture a token after this await.
  const parentRoundId = await readParent();
  return runRoundPersistence(parentRoundId, options, (lease) => work({ lease, roundId: parentRoundId }));
}

async function saveHoleScoreLocal(
  scorecardId: string, holeNumber: number, score: HoleScore | MultiBallHoleScore,
  connection?: Pick<SQLiteDatabase, 'runAsync'>,
): Promise<void> {
  const database = connection ?? await getDb();
  const now = nowSQLite();

  if (isMultiBallScore(score)) {
    // Multi-ball score: serialize balls array to JSON
    const ballScoresJson = JSON.stringify(score.balls);
    await database.runAsync(
      `INSERT OR REPLACE INTO ${TABLE_NAMES.HOLE_SCORES}
       (scorecard_id, hole_number, strokes, putts, fairway_hit, green_in_regulation, penalties, ball_scores, scored_by, shot_contributions, edited_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [scorecardId, holeNumber, 0, null, 0, 0, 0, ballScoresJson, null, null, null, now]
    );
  } else {
    // Single-ball score: store normally with attribution and shot contributions
    const shotContributionsJson = score.shotContributions
      ? JSON.stringify(score.shotContributions)
      : null;

    await database.runAsync(
      `INSERT OR REPLACE INTO ${TABLE_NAMES.HOLE_SCORES}
       (scorecard_id, hole_number, strokes, putts, fairway_hit, green_in_regulation, penalties, ball_scores, scored_by, shot_contributions, edited_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scorecardId,
        holeNumber,
        score.strokes,
        score.putts ?? null,
        score.fairwayHit ? 1 : 0,
        score.greenInRegulation ? 1 : 0,
        score.penalties ?? 0,
        null,
        score.scoredBy ?? null,
        shotContributionsJson,
        score.editedAt ?? null,
        now,
      ]
    );
  }
}

/**
 * Get hole scores for a scorecard (supports both single-ball and multi-ball scores)
 */
export async function getHoleScores(
  scorecardId: string,
  connection?: Pick<SQLiteDatabase, 'getAllAsync'>
): Promise<{ [holeNumber: number]: HoleScore | MultiBallHoleScore }> {
  const database = connection ?? await getDb();

  const rows = await database.getAllAsync<Pick<HoleScoreRow,
    'hole_number' | 'strokes' | 'putts' | 'fairway_hit' | 'green_in_regulation' | 'penalties' | 'ball_scores' | 'scored_by' | 'shot_contributions' | 'edited_at'
  >>(
    `SELECT hole_number, strokes, putts, fairway_hit, green_in_regulation, penalties, ball_scores, scored_by, shot_contributions, edited_at
     FROM ${TABLE_NAMES.HOLE_SCORES} WHERE scorecard_id = ?`,
    [scorecardId]
  );

  const scores: { [holeNumber: number]: HoleScore | MultiBallHoleScore } = {};

  for (const row of rows) {
    if (row.ball_scores) {
      // Multi-ball score: parse JSON ball data
      try {
        const balls = JSON.parse(row.ball_scores) as HoleScore[];
        scores[row.hole_number] = { balls };
      } catch (error) {
        dbLogger.warn('Failed to parse ball_scores JSON', {
          scorecardId: scorecardId.substring(0, 8) + '...',
          holeNumber: row.hole_number,
          error,
        });
        scores[row.hole_number] = { balls: [] };
      }
    } else {
      // Single-ball score with attribution and shot contributions
      let shotContributions: HoleScore['shotContributions'];
      if (row.shot_contributions) {
        try {
          shotContributions = parseShotContributions(row.shot_contributions);
        } catch (error) {
          dbLogger.warn('Failed to parse shot_contributions JSON', {
            scorecardId: scorecardId.substring(0, 8) + '...',
            holeNumber: row.hole_number,
            error,
          });
        }
      }

      scores[row.hole_number] = {
        strokes: row.strokes,
        putts: row.putts ?? undefined,
        fairwayHit: row.fairway_hit === 1,
        greenInRegulation: row.green_in_regulation === 1,
        penalties: row.penalties,
        scoredBy: row.scored_by ?? undefined,
        shotContributions,
        editedAt: row.edited_at ?? undefined,
      };
    }
  }

  return scores;
}

/**
 * Delete all hole scores for a scorecard
 */
export async function deleteHoleScores(scorecardId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `DELETE FROM ${TABLE_NAMES.HOLE_SCORES} WHERE scorecard_id = ?`,
    [scorecardId]
  );
}

/**
 * Delete given holes' scores from several scorecards in ONE transaction.
 *
 * Ending a round early removes every score after the last played hole from
 * every card of the round. `saveScorecard` only upserts hole rows and
 * `getScorecardsByRound` rebuilds `scores` from them, so a removed score must
 * be deleted here or it comes back on the next load. One transaction: either
 * every card loses its later holes or none does — never a half-ended round.
 * Rejects on failure so the caller can abort before changing any state.
 */
export async function deleteHoleScoresForCards(
  entries: { scorecardId: string; holeNumbers: number[] }[]
): Promise<void> {
  const work = entries.filter((entry) => entry.holeNumbers.length > 0);
  if (work.length === 0) return;

  const database = await getDb();
  await database.withTransactionAsync(async () => {
    for (const { scorecardId, holeNumbers } of work) {
      const placeholders = holeNumbers.map(() => '?').join(', ');
      await database.runAsync(
        `DELETE FROM ${TABLE_NAMES.HOLE_SCORES} WHERE scorecard_id = ? AND hole_number IN (${placeholders})`,
        [scorecardId, ...holeNumbers]
      );
    }
  });
}

/**
 * Bulk save hole scores for a scorecard
 */
export async function bulkSaveHoleScores(
  scorecardId: string,
  scores: { [holeNumber: number]: HoleScore | MultiBallHoleScore },
  options: RoundPersistenceOptions = {},
  connection?: Pick<SQLiteDatabase, 'runAsync' | 'getFirstAsync'>,
): Promise<void> {
  if (connection) {
    if (!options.lease) throw new Error('Transaction hole writes require an active round lease');
    const roundId = roundPersistenceLeaseRoundId(options.lease);
    const parent = await connection.getFirstAsync<{ round_id: string }>(
      `SELECT round_id FROM ${TABLE_NAMES.SCORECARDS} WHERE id = ?`, [scorecardId]
    );
    if (parent?.round_id !== roundId) throw new Error('Wrong-round transaction hole parent');
    for (const [holeNumber, score] of Object.entries(scores)) {
      if (score) await saveHoleScoreLocal(scorecardId, Number(holeNumber), score, connection);
    }
    return;
  }
  return withHolePersistence(scorecardId, options, async (proof) => {
    for (const [holeNumber, score] of Object.entries(scores)) {
      if (score) {
        // Parent identity was checked once at the bulk boundary. Keep this bypass private.
        await runRoundPersistence(proof.roundId, proof, () => saveHoleScoreLocal(scorecardId, parseInt(holeNumber), score));
      }
    }
  });
}
