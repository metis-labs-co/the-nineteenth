/**
 * Scorecard Persistence Helper
 *
 * Wraps the repeated try/catch pattern for persisting scorecard changes
 * to SQLite and queuing them for sync. Used by scorecardStore to avoid
 * duplicating the same save + sync + error-handling logic in every action.
 */

import { Scorecard, HoleScore } from '@/types';
import { MultiBallHoleScore } from '@/types/database/base';
import { saveScorecard, saveHoleScore } from '@/services/offline/database';
import { queueScorecardSync } from '@/services/offline/sync';
import { storeLogger } from '@/utils/debugLogger';

export interface PersistOptions {
  /** Save a single hole score to SQLite */
  holeScore?: { scorecardId: string; holeNumber: number; score: HoleScore | MultiBallHoleScore };
  /** Save the full scorecard to SQLite */
  scorecard?: { scorecardId: string; scorecard: Scorecard };
  /** Queue the scorecard for background sync */
  sync?: { scorecard: Scorecard };
  /** Descriptive label for error logging (e.g. 'setPlayerScore') */
  context?: string;
}

/**
 * Persist scorecard updates to SQLite and optionally queue for sync.
 *
 * Executes each step that is provided in the options:
 *   1. saveHoleScore  (if `holeScore` is set)
 *   2. saveScorecard  (if `scorecard` is set)
 *   3. queueScorecardSync  (if `sync` is set)
 *
 * All three steps share a single try/catch so that any failure is logged
 * with the supplied `context` string and does **not** throw to the caller,
 * matching the fire-and-forget semantics used throughout the store.
 *
 * @returns `true` if all requested steps succeeded, `false` on error.
 */
export async function persistScorecardUpdate(options: PersistOptions): Promise<boolean> {
  const { holeScore, scorecard, sync, context = 'persistScorecardUpdate' } = options;

  try {
    if (holeScore) {
      await saveHoleScore(holeScore.scorecardId, holeScore.holeNumber, holeScore.score);
    }

    if (scorecard) {
      await saveScorecard(scorecard.scorecard);
    }

    if (sync) {
      await queueScorecardSync(sync.scorecard, 'update');
    }

    return true;
  } catch (error) {
    storeLogger.error(`Failed to persist scorecard update [${context}]`, error, {
      scorecardId: holeScore?.scorecardId ?? scorecard?.scorecardId ?? 'unknown',
      holeNumber: holeScore?.holeNumber,
    });
    return false;
  }
}
