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
import { captureRoundPersistenceSource, runRoundPersistence, RoundPersistenceSourceChangedError, type RoundPersistenceSource, type RoundPersistenceLease } from '@/services/offline/roundPersistenceBarrier';
import { storeLogger } from '@/utils/debugLogger';

export type LivePersistenceContext = Pick<PersistOptions, 'source' | 'resolveCurrentScorecard'>;

export interface PersistOptions {
  source?: RoundPersistenceSource;
  /** Reads CURRENT state and returns undefined if the original private store session changed. */
  resolveCurrentScorecard?: () => Scorecard | undefined;
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

  const roundId = options.source?.roundId ?? scorecard?.scorecard.roundId ?? sync?.scorecard.roundId;
  const sessionIsCurrent = () => !options.resolveCurrentScorecard || !!options.resolveCurrentScorecard();
  const save = async (lease?: RoundPersistenceLease, current?: Scorecard) => {
    if (!sessionIsCurrent()) return false;
    const proof = lease ? { lease } : undefined;
    // A rebased full card already contains all retained edits. Never replay the old hole/delta.
    if (holeScore && !current) {
      await saveHoleScore(holeScore.scorecardId, holeScore.holeNumber, holeScore.score, proof);
    }
    if (!sessionIsCurrent()) return false;
    if (scorecard) await saveScorecard(current ?? scorecard.scorecard, proof);
    if (!sessionIsCurrent()) return false;
    if (sync) await queueScorecardSync(current ?? sync.scorecard, 'update', proof);
    return sessionIsCurrent();
  };
  try {
    if (!roundId) return await save(); // Legacy hole-only caller; DAO resolves its round.
    try {
      return await runRoundPersistence(roundId, { source: options.source }, (lease) => {
        if (options.resolveCurrentScorecard && !options.resolveCurrentScorecard()) return Promise.resolve(false);
        return save(lease);
      }, scorecard?.scorecard ?? sync?.scorecard);
    } catch (error) {
      if (!(error instanceof RoundPersistenceSourceChangedError) || !options.resolveCurrentScorecard) throw error;
      const current = options.resolveCurrentScorecard();
      if (!current || current.roundId !== roundId) return false;
      const source = captureRoundPersistenceSource(roundId);
      // One bounded retry; a further transition cancels rather than relabelling a captured card.
      return await runRoundPersistence(roundId, { source }, (lease) => {
        if (options.resolveCurrentScorecard!() !== current) return Promise.resolve(false);
        return save(lease, current);
      }, current);
    }
  } catch (error) {
    storeLogger.error(`Failed to persist scorecard update [${context}]`, error, {
      scorecardId: holeScore?.scorecardId ?? scorecard?.scorecardId ?? 'unknown',
      holeNumber: holeScore?.holeNumber,
    });
    return false;
  }
}
