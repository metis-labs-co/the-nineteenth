/**
 * useAppSyncService
 *
 * Runs the offline sync service for the app's lifetime. Mounted once, at the
 * app root (App.tsx → AppContent):
 *  1. records the signed-in user for the sync queue (setSyncAuthUser) on every
 *     change. syncAll does nothing while it is null, whatever triggers it (the
 *     network callback, queueScorecardSync, a drain request, Retry);
 *  2. opens the SQLite database, then starts the sync service
 *     (ensureSyncServiceStarted — network listener + drain handler). Nothing
 *     tears it down, so queued uploads and round finalisations keep draining
 *     after the scoring screens unmount;
 *  3. once a user is signed in, requests a drain (whatever earlier sessions
 *     left queued), and another each time the app returns to the foreground.
 *
 * On a cold start the Supabase session is restored asynchronously; until
 * useAuth has it, the user is null and nothing drains. A drain sent before
 * would upload as anon (refused by RLS, retained as failed) and read queued
 * rounds as missing.
 */

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { initDatabase } from '@/services/offline/database';
import { ensureSyncServiceStarted, requestSyncDrain, setSyncAuthUser } from '@/services/offline/sync';
import { syncLogger } from '@/utils/debugLogger';

export function useAppSyncService(): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isStarted, setIsStarted] = useState(false);

  // First, so the user is recorded before the drain effect below asks for a drain.
  useEffect(() => {
    setSyncAuthUser(userId);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    initDatabase()
      .then(() => {
        ensureSyncServiceStarted();
        if (!cancelled) setIsStarted(true);
      })
      .catch((error) => {
        syncLogger.error('Offline database failed to open; app-wide sync not started', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isStarted || !userId) return;

    requestSyncDrain('app-start');
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') requestSyncDrain('foreground');
    });
    return () => subscription.remove();
  }, [isStarted, userId]);
}
