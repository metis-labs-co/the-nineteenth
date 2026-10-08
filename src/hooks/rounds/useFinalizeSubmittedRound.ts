/**
 * finalizeOrQueueRound / useFinalizeSubmittedRound
 *
 * The step every submit screen runs after `submitScorecards`:
 *  - online: write the 'finalize' sync item FIRST (durable; no drain request,
 *    which would race this attempt), then finalise the round now
 *    (finalizeSubmittedRound — status → results → skins). Remove the item only
 *    when the round completed with no status error and no transient skins
 *    error, or when it is waiting only on other devices. Keep it (and ask for
 *    a drain) when the attempt throws (RoundNotReadyError: a drain is already
 *    finalising the round, or B6b's queued-end_early guard), reports a status
 *    error or a transient skins error (isTransientError), or when the round
 *    isn't complete and this device still has unconfirmed cards for it
 *    (getIsOnline() can flip between submitScorecards and this step, leaving
 *    the cards queued — the server can't see them yet). A permanent skins
 *    error (e.g. RLS: only the game's creator can write skins_payouts) doesn't
 *    keep it: no retry can fix that. If the app is killed mid-attempt, the
 *    item is already on disk;
 *  - offline: queue it. The sync queue runs it once the cards upload.
 *
 * The hook also fires the current user's skins achievements for a game it
 * settled online (settlement no longer goes through useFinalizeSkinsGame,
 * whose onSuccess fired them). A game settled later by the queue fires none.
 */

import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCheckAchievements } from '@/hooks/achievements/useCheckAchievements';
import { useAchievementToast } from '@/context/AchievementToastContext';
import { awardSkinsAchievements } from '@/services/skins/finalizeSkinsGame';
import {
  finalizeSubmittedRound,
  queueRoundFinalize,
  removeQueuedRoundFinalize,
  type FinalizeSubmittedRoundResult,
} from '@/services/rounds/finalizeSubmittedRound';
import { isTransientError } from '@/services/errors/transient';
import { hasUnsyncedScorecardsForRound, getFailedSyncCountForRound } from '@/services/offline/database';
import { getIsOnline } from '@/services/offline/sync/networkState';
// By path, not via '@/services/offline/sync' (that barrel re-exports the orchestrator).
import { requestSyncDrain } from '@/services/offline/sync/drain';
import { submitLogger } from '@/utils/debugLogger';
import type { SkinsGame } from '@/types/database/skins.types';

export interface FinalizeOrQueueResult {
  /** True when the round is `completed` on the server — set now or already. */
  completed: boolean;
  /** True when the 'finalize' sync item is left queued to finish the job. */
  queued: boolean;
  /** The skins game settled by this call, or null. */
  skinsGame: SkinsGame | null;
}

const shortId = (roundId: string): string => roundId.substring(0, 8) + '...';

/** The item stays queued; let the queue pick it up now if it can. */
function leaveQueued(roundId: string, reason: string): void {
  submitLogger.info('Round finalisation left to the sync queue', { roundId: shortId(roundId), reason });
  requestSyncDrain('round-finalize-queued');
}

/** Rejects only when queueing fails. */
export async function finalizeOrQueueRound(roundId: string): Promise<FinalizeOrQueueResult> {
  if (!getIsOnline()) {
    // Requests a drain too: a no-op offline.
    await queueRoundFinalize(roundId);
    return { completed: false, queued: true, skinsGame: null };
  }

  // Durable first, so an app kill during the attempt below still leaves the
  // item. No drain request: it would race this attempt.
  await queueRoundFinalize(roundId, { requestDrain: false });

  let result: FinalizeSubmittedRoundResult;
  try {
    result = await finalizeSubmittedRound(roundId);
  } catch (error) {
    // finalizeSubmittedRound only rejects with RoundNotReadyError: a drain is
    // already finalising this round (its atomic in-flight check), or an
    // 'end_early' item for the round is still queued (B6b; the drain runs it
    // first, then this one). Either way the item stays for the queue.
    leaveQueued(roundId, error instanceof Error ? error.message : String(error));
    return { completed: false, queued: true, skinsGame: null };
  }
  const { completed, skinsGame, statusError, skinsError } = result;

  // A permanent skins failure (e.g. RLS: only the game's creator can write
  // skins_payouts) can never succeed on retry, so it doesn't keep the item.
  const skinsRetryable = skinsError != null && isTransientError(skinsError);
  if (skinsError != null && !skinsRetryable) {
    submitLogger.warn('Skins settlement failed permanently; not retrying', {
      roundId: shortId(roundId),
      error: String(skinsError),
    });
  }

  let keepItem = statusError != null || skinsRetryable;
  if (!keepItem && !completed) {
    try {
      keepItem =
        (await hasUnsyncedScorecardsForRound(roundId)) ||
        (await getFailedSyncCountForRound(roundId)) > 0;
    } catch (error) {
      // The item is already durable. Without card state we cannot safely
      // remove it; let the queue check again on a drain.
      submitLogger.warn('Could not read the round\'s queued scorecards', {
        roundId: shortId(roundId),
        error: String(error),
      });
      leaveQueued(roundId, 'card state read failed');
      return { completed, queued: true, skinsGame };
    }
  }

  if (keepItem) {
    leaveQueued(
      roundId,
      statusError != null ? 'status write failed' : skinsRetryable ? 'skins settlement failed' : 'cards still uploading'
    );
    return { completed, queued: true, skinsGame };
  }

  // Done online, or waiting only on other devices (whichever submits the last
  // card completes the round): the item has nothing left to do.
  try {
    await removeQueuedRoundFinalize(roundId);
  } catch (error) {
    // Harmless: the leftover item re-runs the idempotent steps on a drain.
    submitLogger.warn('Could not remove the queued round finalisation', {
      roundId: shortId(roundId),
      error: String(error),
    });
    leaveQueued(roundId, 'queue removal failed');
    return { completed, queued: true, skinsGame };
  }
  return { completed, queued: false, skinsGame };
}

export function useFinalizeSubmittedRound(): (
  roundId: string
) => Promise<{ completed: boolean; queued: boolean }> {
  const { user } = useAuth();
  const { checkAndAward, isReady } = useCheckAchievements(user?.id ?? '');
  const { showMultipleToasts } = useAchievementToast();

  return useCallback(
    async (roundId: string): Promise<{ completed: boolean; queued: boolean }> => {
      try {
        const { completed, queued, skinsGame } = await finalizeOrQueueRound(roundId);
        if (skinsGame && user?.id && isReady) {
          await awardSkinsAchievements(skinsGame, {
            playerId: user.id,
            checkAndAward,
            showMultipleToasts,
          });
        }
        return { completed, queued };
      } catch (error) {
        submitLogger.error('Round finalisation failed and could not be queued', error, {
          roundId: roundId.substring(0, 8) + '...',
        });
        return { completed: false, queued: false };
      }
    },
    [user?.id, isReady, checkAndAward, showMultipleToasts]
  );
}
