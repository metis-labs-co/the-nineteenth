/**
 * Hole Score DAO
 *
 * Data access operations for hole scores in SQLite.
 */

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
  score: HoleScore | MultiBallHoleScore
): Promise<void> {
  const database = await getDb();
  const now = nowSQLite();

  if (isMultiBallScore(score)) {
    // Multi-ball score: serialize balls array to JSON
    const ballScoresJson = JSON.stringify(score.balls);
    await database.runAsync(
      `INSERT OR REPLACE INTO ${TABLE_NAMES.HOLE_SCORES}
       (scorecard_id, hole_number, strokes, putts, fairway_hit, green_in_regulation, penalties, ball_scores, scored_by, shot_contributions, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [scorecardId, holeNumber, 0, null, 0, 0, 0, ballScoresJson, null, null, now]
    );
  } else {
    // Single-ball score: store normally with attribution and shot contributions
    const shotContributionsJson = score.shotContributions
      ? JSON.stringify(score.shotContributions)
      : null;

    await database.runAsync(
      `INSERT OR REPLACE INTO ${TABLE_NAMES.HOLE_SCORES}
       (scorecard_id, hole_number, strokes, putts, fairway_hit, green_in_regulation, penalties, ball_scores, scored_by, shot_contributions, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    'hole_number' | 'strokes' | 'putts' | 'fairway_hit' | 'green_in_regulation' | 'penalties' | 'ball_scores' | 'scored_by' | 'shot_contributions'
  >>(
    `SELECT hole_number, strokes, putts, fairway_hit, green_in_regulation, penalties, ball_scores, scored_by, shot_contributions
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
