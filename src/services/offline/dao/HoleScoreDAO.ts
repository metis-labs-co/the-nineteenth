/**
 * Hole Score DAO
 *
 * Data access operations for hole scores in SQLite.
 */

import type { HoleScore, MultiBallHoleScore } from '@/types';
import { isMultiBallScore } from '@/types/database/base';
import type { HoleScoreRow } from '../types';
import { getDb } from '../DatabaseManager';
import { nowSQLite } from '../utils/dateUtils';
import { TABLE_NAMES } from '../schema/tables';
import { dbLogger } from '@/utils/debugLogger';

/**
 * Save a single hole score (supports both single-ball and multi-ball scores)
 */
export async function saveHoleScore(
  scorecardId: string,
  holeNumber: number,
  score: HoleScore | MultiBallHoleScore
): Promise<void> {
  const database = await getDb();
  const now = nowSQLite();

  if (isMultiBallScore(score)) {
    // Multi-ball score: serialize balls array to JSON
    const ballScoresJson = JSON.stringify(score.balls);
    await database.runAsync(
      `INSERT OR REPLACE INTO ${TABLE_NAMES.HOLE_SCORES}
       (scorecard_id, hole_number, strokes, putts, fairway_hit, green_in_regulation, penalties, ball_scores, scored_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [scorecardId, holeNumber, 0, null, 0, 0, 0, ballScoresJson, null, now]
    );
  } else {
    // Single-ball score: store normally with attribution
    await database.runAsync(
      `INSERT OR REPLACE INTO ${TABLE_NAMES.HOLE_SCORES}
       (scorecard_id, hole_number, strokes, putts, fairway_hit, green_in_regulation, penalties, ball_scores, scored_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        now,
      ]
    );
  }
}

/**
 * Get hole scores for a scorecard (supports both single-ball and multi-ball scores)
 */
export async function getHoleScores(
  scorecardId: string
): Promise<{ [holeNumber: number]: HoleScore | MultiBallHoleScore }> {
  const database = await getDb();

  const rows = await database.getAllAsync<Pick<HoleScoreRow,
    'hole_number' | 'strokes' | 'putts' | 'fairway_hit' | 'green_in_regulation' | 'penalties' | 'ball_scores' | 'scored_by'
  >>(
    `SELECT hole_number, strokes, putts, fairway_hit, green_in_regulation, penalties, ball_scores, scored_by
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
      // Single-ball score with attribution
      scores[row.hole_number] = {
        strokes: row.strokes,
        putts: row.putts ?? undefined,
        fairwayHit: row.fairway_hit === 1,
        greenInRegulation: row.green_in_regulation === 1,
        penalties: row.penalties,
        scoredBy: row.scored_by ?? undefined,
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
 * Bulk save hole scores for a scorecard
 */
export async function bulkSaveHoleScores(
  scorecardId: string,
  scores: { [holeNumber: number]: HoleScore | MultiBallHoleScore }
): Promise<void> {
  for (const [holeNumber, score] of Object.entries(scores)) {
    if (score) {
      await saveHoleScore(scorecardId, parseInt(holeNumber), score);
    }
  }
}
