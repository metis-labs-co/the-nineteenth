/**
 * useClubSync - Hook for syncing individual clubs with GolfAPI.io
 *
 * Provides automatic and manual sync functionality for club data.
 * Used in ClubScreen to auto-refresh stale club data when viewing.
 *
 * Features:
 * - Auto-sync on mount when club is stale (> 30 days old)
 * - Quota-aware (skips sync if API quota exhausted)
 * - Non-blocking (shows cached data immediately, syncs in background)
 * - Manual refresh via forceSync()
 *
 * Created January 2026 for GolfAPI.io integration
 */

import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// Import from the defining module, not the deprecated '@/hooks/useClubDetails'
// shim — the shim re-exports the clubs barrel, which re-exports this file,
// creating a runtime require cycle (Metro "Require cycle" warning).
import { useClubDetails } from './clubDetails';
import { clubKeys, courseKeys } from '@/hooks/queryKeys';
import { courseService } from '@/services/courses';
import { isClubStale, hasApiQuota, canSyncClub } from '@/services/sync';

// =====================================================
// TYPES
// =====================================================

/**
 * Return type for useClubSync hook
 */
export interface UseClubSyncResult {
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Last synced timestamp from the club data */
  lastSynced: Date | null;
  /** Manually trigger a sync (ignores staleness check) */
  forceSync: () => void;
  /** Error from the last sync attempt (if any) */
  syncError: Error | null;
  /** Whether the club can be synced (has golfapi_club_id) */
  canSync: boolean;
  /** Whether the club data is stale */
  isStale: boolean;
}

// =====================================================
// HOOK
// =====================================================

/**
 * Hook for syncing individual clubs with GolfAPI.io
 *
 * Automatically detects stale data and syncs in the background.
 * Non-blocking - user sees cached data immediately.
 *
 * @param clubId - The club ID to sync
 * @returns Sync state and controls
 *
 * @example
 * ```tsx
 * function ClubScreen({ clubId }: { clubId: string }) {
 *   const { data: club } = useClubDetails(clubId);
 *   const { isSyncing, lastSynced, forceSync } = useClubSync(clubId);
 *
 *   return (
 *     <View>
 *       <Text>{club?.name}</Text>
 *       {isSyncing && <ActivityIndicator size="small" />}
 *       <Text>Last updated: {lastSynced?.toLocaleDateString()}</Text>
 *       <Button onPress={forceSync} disabled={isSyncing}>Refresh</Button>
 *     </View>
 *   );
 * }
 * ```
 */
export function useClubSync(clubId: string): UseClubSyncResult {
  const queryClient = useQueryClient();
  const { data: club } = useClubDetails(clubId);

  // Track if we've already triggered auto-sync for this mount
  const hasAutoSynced = useRef(false);

  // Mutation for syncing club data
  const syncMutation = useMutation({
    mutationFn: async (golfapiClubId: string) => {
      return courseService.importClubWithCourses(golfapiClubId);
    },
    onSuccess: () => {
      // Invalidate queries to refresh UI with new data
      queryClient.invalidateQueries({ queryKey: clubKeys.detail(clubId) });
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
    onError: (error) => {
      // Log silently - graceful degradation
      console.warn('[useClubSync] Sync failed:', error);
    },
  });

  // Determine sync state
  const clubCanSync = club ? canSyncClub(club) : false;
  const clubIsStale = club ? isClubStale(club) : false;
  const lastSynced = club?.last_synced ? new Date(club.last_synced) : null;

  // Auto-sync on mount if stale
  useEffect(() => {
    // Skip if we've already synced this mount, or if conditions aren't met
    if (hasAutoSynced.current) return;
    if (!club) return;
    if (!clubCanSync) return;
    if (!clubIsStale) return;
    if (!hasApiQuota()) return;
    if (syncMutation.isPending) return;

    // Mark as synced and trigger
    hasAutoSynced.current = true;

    // Fire and forget - don't await
    syncMutation.mutate(club.golfapi_club_id!);
  }, [club, clubCanSync, clubIsStale, syncMutation]);

  // Reset auto-sync flag when clubId changes
  useEffect(() => {
    hasAutoSynced.current = false;
  }, [clubId]);

  // Force sync function (ignores staleness check)
  const forceSync = () => {
    if (!club?.golfapi_club_id) return;
    if (syncMutation.isPending) return;
    if (!hasApiQuota()) {
      console.warn('[useClubSync] Cannot sync - API quota exhausted');
      return;
    }

    syncMutation.mutate(club.golfapi_club_id);
  };

  return {
    isSyncing: syncMutation.isPending,
    lastSynced,
    forceSync,
    syncError: syncMutation.error as Error | null,
    canSync: clubCanSync,
    isStale: clubIsStale,
  };
}

export default useClubSync;
