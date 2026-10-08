/**
 * finalizeSubmittedRound
 *
 * The server steps that follow a scorecard submission. Every submit screen
 * runs them (through finalizeOrQueueRound / useFinalizeSubmittedRound), and so
 * does the queued `round` sync item, so an offline-submitted round is
 * finalised once its scorecards have uploaded:
 *
 *   1. finalizeRoundStatus — flips the round to `completed` once every card is
 *      terminal (see that service for the split / multi-group rules);
 *   2. refinalizeRoundResults — competition standings (a no-op for social
 *      rounds). Runs even when the round isn't complete, so standings update
 *      as each group submits — as the inline submit always did;
 *   3. finalizeActiveSkinsForRound — settles the round's active skins game.
 *
 * Never rejects on a step failure. A failed status read/write comes back as
 * `statusError`, and a failed skins settlement as `skinsError`, after every
 * step has still run, so the caller can retry (the sync queue spends a retry;
 * the online path keeps its queued item) and still use `skinsGame`.
 * Re-running is idempotent: the status write is a no-op on a completed round,
 * results are delete-then-insert and skins settlement only picks up `active`
 * games.
 *
 * While it runs, the round is "in flight" (isRoundFinalizeInFlight). A second
 * call for the same round meanwhile rejects with RoundNotReadyError and runs
 * nothing: the check and the mark happen before the first await, so they are
 * atomic. The queue keeps its item pending on that error; the online path
 * keeps its queued item.
 */

import { finalizeRoundStatus } from './finalizeRoundStatus';
import { refinalizeRoundResults } from './refinalizeRoundResults';
import { finalizeActiveSkinsForRound } from '@/services/skins/finalizeSkinsGame';
import { addPendingSync, removePendingSyncByEntityKey } from '@/services/offline/database';
import { queryClient, invalidateLeaderboardCache } from '@/services/queryClient';
import { roundKeys, skinsKeys, competitionKeys } from '@/hooks/queryKeys';
import { submitLogger } from '@/utils/debugLogger';
import type { SkinsGame } from '@/types/database/skins.types';

/**
 * Data of a queued `round` sync item (B6b adds the 'end_early' variant).
 * `userId` is the user signed in when it was queued (A6b-1 stamps it); the
 * queue runs the item only for that user. Older items have none.
 */
export type RoundSyncData = { id: string; action: 'finalize'; userId?: string };

export interface FinalizeSubmittedRoundResult {
  /** True when the round is `completed` on the server — set now or already. */
  completed: boolean;
  /** The skins game this call settled, or null when there was none. */
  skinsGame: SkinsGame | null;
  /** The status read/write error to retry, or null when it succeeded. */
  statusError: unknown;
  /** The skins settlement error to retry, or null when it succeeded. */
  skinsError: unknown;
}

/** Entity key of a round's queued finalisation (one row per round). */
export function roundFinalizeEntityKey(roundId: string): string {
  return `round:${roundId}:finalize`;
}

/** Rounds whose finalisation is running right now, from any caller. */
const finalizeInFlight = new Set<string>();

/** True while finalizeSubmittedRound is running for this round (tests, diagnostics). */
export function isRoundFinalizeInFlight(roundId: string): boolean {
  return finalizeInFlight.has(roundId);
}

/**
 * "Not yet; try again on a later drain." Thrown while this device still holds
 * scorecards for the round that haven't uploaded (the queue's round handler),
 * or by finalizeSubmittedRound while the round's finalisation is already
 * running. The queue keeps the item pending, spends no retry and raises no
 * error; the online path keeps its queued item.
 */
export class RoundNotReadyError extends Error {
  constructor(roundId: string, reason = "is waiting for this device's scorecards to upload") {
    super(`Round ${roundId.substring(0, 8)} ${reason}`);
    this.name = 'RoundNotReadyError';
  }
}

const shortId = (roundId: string): string => roundId.substring(0, 8) + '...';

export async function finalizeSubmittedRound(roundId: string): Promise<FinalizeSubmittedRoundResult> {
  // Atomic test-and-set: no await between the check and the mark, so a submit
  // screen and a drain can never both run the steps. The loser runs nothing and
  // leaves the winner's mark alone (it never reaches the finally below).
  if (finalizeInFlight.has(roundId)) {
    throw new RoundNotReadyError(roundId, 'is already being finalised');
  }
  finalizeInFlight.add(roundId);
  try {
    return await runFinalizeSteps(roundId);
  } finally {
    finalizeInFlight.delete(roundId);
  }
}

/**
 * The steps themselves. B6b-1's "end_early still queued" guard is the first
 * statement here (not in finalizeSubmittedRound), so the in-flight mark is
 * always taken and released around it.
 */
async function runFinalizeSteps(roundId: string): Promise<FinalizeSubmittedRoundResult> {
  let completed = false;
  let statusError: unknown = null;
  try {
    completed = await finalizeRoundStatus(roundId);
  } catch (error) {
    statusError = error;
    submitLogger.error('Round status update failed; it will be retried', error, { roundId: shortId(roundId) });
  }

  try {
    await refinalizeRoundResults(roundId);
  } catch (error) {
    submitLogger.error('Round results finalisation failed (non-blocking)', error, { roundId: shortId(roundId) });
  }

  const skins = await finalizeActiveSkinsForRound(roundId);
  const skinsError: unknown = skins.error ?? null;
  if (skinsError) {
    submitLogger.warn('Skins finalization failed; it will be retried', {
      roundId: shortId(roundId),
      error: String(skinsError),
    });
  }

  // roundKeys.all (['rounds']) prefixes every round query, including the
  // Rounds list (['rounds', userId], 5-minute staleTime) and round details.
  queryClient.invalidateQueries({ queryKey: roundKeys.all });
  // Results were (re)written above whether or not the round completed, and the
  // queue path has no screen to refresh them: leaderboards, the competition
  // screens and Home's round lists (['home', 'inProgressRounds' | 'upcomingRounds', uid]).
  invalidateLeaderboardCache();
  queryClient.invalidateQueries({ queryKey: competitionKeys.all });
  queryClient.invalidateQueries({ queryKey: ['home'] });
  if (skins.finalized) {
    queryClient.invalidateQueries({ queryKey: skinsKeys.all });
  }

  return { completed, skinsGame: skins.game ?? null, statusError, skinsError };
}

/**
 * Queue the post-submit steps as a durable `round` sync item. The queue runs
 * it after every scorecard upload in a drain, and only once this device has
 * no scorecards for the round left to upload. Keyed per action so a later
 * 'end_early' item for the same round never overwrites it.
 */
export async function queueRoundFinalize(roundId: string): Promise<void> {
  const data: RoundSyncData = { id: roundId, action: 'finalize' };
  await addPendingSync({
    type: 'round',
    action: 'update',
    data,
    entityKey: roundFinalizeEntityKey(roundId),
    timestamp: new Date(),
    retryCount: 0,
  });
  submitLogger.info('Round finalisation queued for sync', { roundId: shortId(roundId) });
}

/**
 * Drop the round's queued finalisation, once an online run has finished the
 * job. By entity key, whatever its revision or status. True when a row went.
 */
export async function removeQueuedRoundFinalize(roundId: string): Promise<boolean> {
  return removePendingSyncByEntityKey(roundFinalizeEntityKey(roundId));
}
