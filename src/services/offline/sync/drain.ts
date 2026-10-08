/**
 * Sync drain requests.
 *
 * Anything that changes what the sync queue should do — a signed-in app start,
 * the app returning to the foreground, an item queued while online — asks for
 * a drain here instead of calling syncAll directly. Requests are debounced and
 * coalesced; offline they are dropped (the network listener drains when the
 * connection returns); during a running drain they wait for it to finish.
 *
 * This module never imports the sync orchestrator. initSyncService registers
 * its drain (syncAll) here, so services the orchestrator itself imports (e.g.
 * finalizeSubmittedRound) can request a drain without an import cycle. Import
 * it by its path, not through the '@/services/offline/sync' barrel (which
 * re-exports the orchestrator). Before the service starts, requests are no-ops.
 */

import { getIsOnline, getIsSyncing } from './networkState';
import { syncLogger } from '@/utils/debugLogger';

export const SYNC_DRAIN_DEBOUNCE_MS = 500;

type DrainHandler = () => Promise<unknown>;

let drainHandler: DrainHandler | null = null;
let drainTimer: ReturnType<typeof setTimeout> | null = null;
let pendingReasons: string[] = [];

/** Called by initSyncService with the function that drains the queue. */
export function registerSyncDrainHandler(handler: DrainHandler): void {
  drainHandler = handler;
}

export function requestSyncDrain(reason: string): void {
  if (!getIsOnline()) {
    syncLogger.debug('Sync drain request dropped (offline)', { reason });
    return;
  }
  if (!pendingReasons.includes(reason)) pendingReasons.push(reason);
  if (drainTimer) return;
  scheduleDrain();
}

function scheduleDrain(): void {
  drainTimer = setTimeout(runDrain, SYNC_DRAIN_DEBOUNCE_MS);
}

function runDrain(): void {
  drainTimer = null;

  if (!getIsOnline()) {
    pendingReasons = [];
    return;
  }
  if (getIsSyncing()) {
    // syncAll skips while another drain runs; ask again once it has finished.
    scheduleDrain();
    return;
  }

  const handler = drainHandler;
  const reasons = pendingReasons;
  pendingReasons = [];
  if (!handler) {
    syncLogger.debug('Sync drain requested before the sync service started', { reasons });
    return;
  }

  syncLogger.info('Draining sync queue', { reasons });
  handler().catch((error) => {
    syncLogger.error('Requested sync drain failed', error, { reasons });
  });
}

/** Test-only: forget the handler and any scheduled drain. */
export function __resetSyncDrainForTests(): void {
  if (drainTimer) clearTimeout(drainTimer);
  drainTimer = null;
  drainHandler = null;
  pendingReasons = [];
}
