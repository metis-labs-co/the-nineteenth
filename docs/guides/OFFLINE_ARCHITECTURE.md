# Offline-First Architecture

**The Nineteenth** - Mobile Golf Competition App

> Complete implementation guide for offline-first score entry with Expo SQLite and background sync

---

## Overview

The app is designed with an **offline-first** architecture, ensuring that the core user flow (score entry) works seamlessly without internet connection. Scores are saved locally and synced to Supabase when connectivity returns.

### Critical User Flows That Must Work Offline

1. ✅ View competition details
2. ✅ View round schedule and pairings
3. ✅ Enter scores for entire group
4. ✅ Navigate between holes
5. ✅ View current leaderboard (stale data acceptable)

---

## Strategy: Offline-First Design

**Principle**: Assume no network connection. All critical operations work locally first, sync opportunistically.

### Data Priority

```typescript
interface DataPriority {
  // Critical: Score entry must work offline
  critical: ['scorecard_entry', 'hole_navigation'];

  // Important: Should cache for offline viewing
  important: ['competition_details', 'round_schedule', 'course_data'];

  // Nice-to-have: Can show stale data or fail gracefully
  optional: ['leaderboard', 'player_stats', 'course_search'];
}
```

### Sync Strategy

```typescript
interface SyncStrategy {
  // Immediate sync (when online)
  immediate: ['competition_create', 'player_invite'];

  // Queue for background sync (can wait)
  queued: ['scorecard_submit', 'scorecard_update'];

  // Periodic sync (every 15 minutes when app is backgrounded)
  periodic: ['leaderboard_update', 'competition_details'];
}
```

---

## Implementation

### 1. Network Status Detection

**Hook: `useNetworkStatus`**

```typescript
// src/hooks/useNetworkStatus.ts
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);

  return {
    isConnected,
    isInternetReachable,
    isOffline: isConnected === false || isInternetReachable === false,
  };
}
```

**Usage:**
```typescript
import { useNetworkStatus } from '@hooks/useNetworkStatus';

function MyComponent() {
  const { isOffline, isConnected } = useNetworkStatus();

  return (
    <View>
      {isOffline && <Text>You are offline</Text>}
    </View>
  );
}
```

---

### 2. Expo SQLite Database

**Local database for offline storage of rounds, scorecards, and sync queue.**

#### Initialize Database

```typescript
// src/services/offline/database.ts
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('the-nineteenth.db');

export const initializeDatabase = () => {
  db.transaction((tx) => {
    // Competitions table
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS competitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        startDate TEXT,
        endDate TEXT,
        handicapSystem TEXT,
        visibility TEXT,
        inviteCode TEXT,
        organizerId TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        synced INTEGER DEFAULT 0
      );`
    );

    // Rounds table
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        competitionId TEXT,
        roundNumber INTEGER,
        courseId TEXT,
        date TEXT,
        teeTime TEXT,
        gameType TEXT,
        status TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (competitionId) REFERENCES competitions(id)
      );`
    );

    // Scorecards table
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS scorecards (
        id TEXT PRIMARY KEY,
        roundId TEXT,
        playerId TEXT,
        scores TEXT,
        totalGross INTEGER,
        totalNet INTEGER,
        status TEXT,
        submittedAt TEXT,
        submittedBy TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (roundId) REFERENCES rounds(id)
      );`
    );

    // Pending syncs table
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS pending_syncs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        retryCount INTEGER DEFAULT 0
      );`
    );
  });
};
```

#### Save Scorecard Locally

```typescript
// src/services/offline/database.ts
import { Scorecard } from '@types/index';

export const saveScorecard = (scorecard: Scorecard): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO scorecards
        (id, roundId, playerId, scores, totalGross, totalNet, status, createdAt, updatedAt, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scorecard.id,
          scorecard.roundId,
          scorecard.playerId,
          JSON.stringify(scorecard.scores),
          scorecard.totalGross,
          scorecard.totalNet,
          scorecard.status,
          scorecard.createdAt.toISOString(),
          scorecard.updatedAt.toISOString(),
          0, // Not synced yet
        ],
        (_, result) => resolve(),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};
```

#### Queue Sync Operation

```typescript
// src/services/offline/database.ts
export const queueSync = (
  type: 'scorecard' | 'competition' | 'round',
  action: 'create' | 'update' | 'delete',
  data: any
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT INTO pending_syncs (type, action, data, timestamp, retryCount)
        VALUES (?, ?, ?, ?, ?)`,
        [type, action, JSON.stringify(data), new Date().toISOString(), 0],
        (_, result) => resolve(),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};
```

---

### 3. Async Storage for Simple Data

**For user preferences and small cached data.**

```typescript
// src/services/offline/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store user preferences
export const saveUserPreferences = async (prefs: any) => {
  await AsyncStorage.setItem('user_preferences', JSON.stringify(prefs));
};

// Cache API responses
export const cacheApiResponse = async (key: string, data: any) => {
  await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(data));
};

// Get cached data
export const getCachedData = async (key: string) => {
  const cached = await AsyncStorage.getItem(`cache:${key}`);
  return cached ? JSON.parse(cached) : null;
};
```

---

### 4. Background Sync

**Auto-sync pending changes when app is backgrounded and connection returns.**

#### Define Background Task

```typescript
// src/services/offline/sync.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { db } from './database';
import { apiClient } from '@services/api/client';

const SYNC_TASK = 'background-sync';

// Define background sync task
TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    await syncPendingChanges();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background sync failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
```

#### Register Background Task

```typescript
// src/services/offline/sync.ts
export const registerBackgroundSync = async () => {
  await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
    minimumInterval: 60 * 15, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
};
```

#### Sync Pending Changes

```typescript
// src/services/offline/sync.ts
export const syncPendingChanges = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM pending_syncs ORDER BY timestamp ASC',
        [],
        async (_, { rows }) => {
          const syncs = rows._array;

          for (const sync of syncs) {
            try {
              const data = JSON.parse(sync.data);

              // Send to API based on type and action
              if (sync.type === 'scorecard') {
                if (sync.action === 'create') {
                  await apiClient.post('/scorecards', data);
                } else if (sync.action === 'update') {
                  await apiClient.put(`/scorecards/${data.id}`, data);
                }
              }

              // Remove from queue after successful sync
              await new Promise((resolveDelete) => {
                db.transaction((txDelete) => {
                  txDelete.executeSql(
                    'DELETE FROM pending_syncs WHERE id = ?',
                    [sync.id],
                    () => resolveDelete(undefined)
                  );
                });
              });

              // Mark original record as synced
              await markAsSynced(sync.type, data.id);
            } catch (error) {
              // Increment retry count
              await incrementRetryCount(sync.id);
              console.error(`Failed to sync ${sync.type}:`, error);
            }
          }

          resolve();
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Mark record as synced
const markAsSynced = (type: string, id: string): Promise<void> => {
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql(
        `UPDATE ${type}s SET synced = 1 WHERE id = ?`,
        [id],
        () => resolve()
      );
    });
  });
};

// Increment retry count
const incrementRetryCount = (syncId: number): Promise<void> => {
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql(
        'UPDATE pending_syncs SET retryCount = retryCount + 1 WHERE id = ?',
        [syncId],
        () => resolve()
      );
    });
  });
};
```

---

### 5. Offline-Aware Store (Zustand)

**State management with offline sync integration.**

```typescript
// src/store/offlineStore.ts
import { create } from 'zustand';
import { syncPendingChanges } from '@services/offline/sync';

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncs: number;
  lastSyncTime: Date | null;
  syncError: string | null;

  setOnlineStatus: (isOnline: boolean) => void;
  triggerSync: () => Promise<void>;
  setPendingSyncs: (count: number) => void;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: true,
  isSyncing: false,
  pendingSyncs: 0,
  lastSyncTime: null,
  syncError: null,

  setOnlineStatus: (isOnline: boolean) => {
    set({ isOnline });

    // Auto-sync when coming back online
    if (isOnline && get().pendingSyncs > 0) {
      get().triggerSync();
    }
  },

  triggerSync: async () => {
    if (get().isSyncing) return;

    set({ isSyncing: true, syncError: null });

    try {
      await syncPendingChanges();
      set({
        isSyncing: false,
        lastSyncTime: new Date(),
        pendingSyncs: 0,
      });
    } catch (error) {
      set({
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  },

  setPendingSyncs: (count: number) => {
    set({ pendingSyncs: count });
  },
}));
```

---

### 6. UI Indicators

**Show offline status and sync state to users.**

```typescript
// src/components/common/OfflineIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useOfflineStore } from '@store/offlineStore';
import { colors, spacing } from '@constants/theme';

export default function OfflineIndicator() {
  const { isOffline } = useNetworkStatus();
  const { isSyncing, pendingSyncs, syncError, triggerSync } = useOfflineStore();

  if (!isOffline && !isSyncing && !syncError) {
    return null;
  }

  return (
    <View style={[
      styles.container,
      isOffline && styles.containerOffline,
      isSyncing && styles.containerSyncing,
      syncError && styles.containerError,
    ]}>
      <Text style={styles.text}>
        {isOffline && `Offline • ${pendingSyncs} changes pending`}
        {isSyncing && 'Syncing changes...'}
        {syncError && 'Sync failed'}
      </Text>

      {syncError && (
        <TouchableOpacity onPress={triggerSync} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  containerOffline: {
    backgroundColor: '#fef3c7', // yellow-100
  },
  containerSyncing: {
    backgroundColor: '#dbeafe', // blue-100
  },
  containerError: {
    backgroundColor: '#fee2e2', // red-100
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray900,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
```

---

## Complete Offline Flow

### Score Entry Flow (Offline-First)

```typescript
// In your scorecard component
import { saveScorecard, queueSync } from '@services/offline/database';
import { useOfflineStore } from '@store/offlineStore';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

function ScorecardScreen() {
  const { isOffline } = useNetworkStatus();
  const { setPendingSyncs } = useOfflineStore();

  const handleScoreChange = async (holeNumber: number, strokes: number) => {
    // 1. Update local state immediately
    const updatedScorecard = {
      ...scorecard,
      scores: {
        ...scorecard.scores,
        [holeNumber]: { strokes },
      },
    };

    // 2. Save to local SQLite
    await saveScorecard(updatedScorecard);

    // 3. Queue for sync
    await queueSync('scorecard', 'update', updatedScorecard);
    setPendingSyncs(await getPendingSyncCount());

    // 4. If online, trigger immediate sync (optional)
    if (!isOffline) {
      await syncPendingChanges();
    }
  };

  const handleSubmit = async () => {
    // 1. Mark as completed locally
    const completedScorecard = {
      ...scorecard,
      status: 'completed',
      submittedAt: new Date(),
    };

    // 2. Save locally
    await saveScorecard(completedScorecard);

    // 3. Queue for sync
    await queueSync('scorecard', 'update', completedScorecard);

    // 4. Sync immediately if online
    if (!isOffline) {
      await syncPendingChanges();
    } else {
      // Show message that it will sync when online
      Alert.alert(
        'Scorecard Saved',
        'Your score has been saved locally and will sync when you\'re back online.'
      );
    }
  };
}
```

---

## App Initialization

The offline layer starts once, at the app root, and stays up for the app's lifetime.

`useAppSyncService()` (`src/hooks/useAppSyncService.ts`) is mounted in `App.tsx` (`AppContent`). It:
1. records the authenticated session user for the queue (`setSyncAuthUser(session?.user.id ?? null)`) on every auth change;
2. opens the SQLite database (`initDatabase`);
3. starts the sync service with `ensureSyncServiceStarted()` (idempotent). This installs the NetInfo listener, loads the queue counts and registers the drain handler;
4. once a user is signed in, requests a drain, and requests another every time the app returns to the foreground.

**No drain runs without an authenticated session.** `syncAll` returns `false` at once while the recorded user is `null`, whatever triggered it: the network callback, `queueScorecardSync`, a drain request, Sync or Retry. The service is up while signed out, and a signed-out drain would upload as anon (RLS retains every card as `failed`) and read a queued round as missing (`PGRST116`), dropping its `'finalize'` item. On a cold start the sync user stays `null` until the Supabase session has been restored. Signup can cache a user while email confirmation is pending and the session is still `null`; that cached user does not open the sync gate.

`getDb()` always awaits the memoised `initDatabase()`, so a DAO call made during start-up waits for the tables and migrations.

**Nothing tears the service down.** `useOfflineSync` (the scoring screens) calls `ensureSyncServiceStarted()` only as a fallback and subscribes to the sync state. On unmount it drops just its own subscription.

Before this, the network listener lived only while a scoring screen was mounted:
- every submit's `navigation.reset` removed it;
- anything queued then waited for the next scoring session;
- `getIsOnline()` went stale.

### When the queue drains

Every trigger ends in `syncAll()`, which does nothing while signed out.

| Trigger | How |
|---|---|
| App start, once signed in | `useAppSyncService` → `requestSyncDrain('app-start')` |
| App returns to the foreground (signed in) | `useAppSyncService` → `requestSyncDrain('foreground')` |
| Network comes back | `networkState` → `syncAll()` |
| A scorecard is queued while online | `queueScorecardSync` → `syncAll()` |
| A round item is queued while online | `queueRoundFinalize` → `requestSyncDrain('round-finalize-queued')` (the online submit path asks only if its item is still needed after its own attempt) |
| The user taps Sync / Retry | `manualSync()` / `retryFailedSyncs()` |

`requestSyncDrain(reason)` (`src/services/offline/sync/drain.ts`):
- is debounced (500 ms) and coalesces requests;
- does nothing offline or before the service has started;
- during a running drain, waits for it to finish.

It never imports the orchestrator: `initSyncService` registers `syncAll` as its handler. Import it by path, not through the `@/services/offline/sync` barrel, which re-exports the orchestrator.

---

## Sync Queue Items

Each `pending_syncs` row has:
- a `type`;
- an `entity_key`: one row per entity. Ordinary re-queueing replaces/reset retries; a same-owner/same-N end intent preserves the entire existing row, including failed recovery metadata;
- a `status`: `pending` or `failed`. `failed` rows wait for an explicit Retry.

| Type | Entity key | Data | Handler |
|---|---|---|---|
| `scorecard` | `scorecard:<roundId>:<playerId>` | the scorecard snapshot | `processScorecardSync` |
| `round` | `round:<roundId>:end_early` | `{ id, action: 'end_early', holesPlayed, userId }` (captured authenticated owner required) | coordinated end consumer in `syncOrchestrator.ts` |
| `round` | `round:<roundId>:finalize` | `{ id, action: 'finalize', userId? }` (`userId`: who was signed in when it was queued) | `processRoundSync` → `finalizeSubmittedRound` |

### Drain order

Each `syncAll()` runs:
1. identifiable queued `end_early` items;
2. a fresh CURRENT queue/source read, then eligible scorecard uploads and SQLite fallback cards;
3. ordinary round items, including `finalize`, after eligible cards.

Pending, failed, foreign-owned or malformed canonical ends block only their
round's card/finalize work. The end prerequisite is read live inside the one
round coordinator; unrelated rounds continue without spending blocked retries.

### `round` items: wait, drop or retry

A `'finalize'` item runs the same steps an online submit runs (`finalizeSubmittedRound`): round status, then competition results, then skins settlement. Before any server call, it checks who queued it and this device's own cards:

| Situation | Outcome |
|---|---|
| A retained canonical end prerequisite exists | **Failed.** Finalize checks this before pending-card readiness so explicit Retry can revive the whole dependency chain. Pending/foreign prerequisites defer. |
| The item's `userId` is another user than the one signed in (SQLite survives sign-out) | **Wait.** It stays `pending`, spends no retry and raises no error, until its owner signs in again. An item with no `userId` (an older build's) runs for whoever is signed in. |
| A card for the round is still `pending` in the queue, or unsynced in SQLite with no queue row (`hasUnsyncedScorecardsForRound`); or a submit screen is finalising the same round right now (`finalizeSubmittedRound`'s atomic in-flight check rejects with `RoundNotReadyError`) | **Wait.** It stays `pending`, spends no retry and raises no error. It runs again on the next drain. |
| The round's only unconfirmed cards are retained `failed` rows | **Failed.** The round item is marked `failed` too. Retry (`retryFailedSyncs`) revives both, and the card uploads first. |
| Steps ran and the round is `completed` | **Done.** The item is removed. |
| Steps ran and the round is not complete (another device's cards are outstanding) | **Done.** The item is removed. The device that submits the last card completes the round. |
| Skins settlement failed permanently: an RLS refusal (only the game's creator can write `skins_payouts`), validation, a missing game, anything `isTransientError` doesn't recognise | **Done.** Logged as a warning; the item is removed. No retry can fix it. |
| The status read or write failed, or skins settlement failed transiently (`isTransientError`: no connection, a timeout, a 5xx or gateway error, a dropped connection) | **Retry.** Normal retry count; retained as `failed` after 3. Re-running the steps is idempotent. |

Every submit screen calls `useFinalizeSubmittedRound()` (`src/hooks/rounds/useFinalizeSubmittedRound.ts`) after `submitScorecards`:
- **Offline:** it queues a `'finalize'` item.
- **Online:** it writes the `'finalize'` item first, without a drain request, then runs `finalizeSubmittedRound` straight away. It removes the item (by entity key) only when the round completed with no status error and no transient skins error, or when the round is waiting only on other devices. Otherwise the item stays and a drain is requested: when the attempt throws, reports a status error or a transient skins error, or when the round isn't complete while this device still has unconfirmed (pending or retained) cards for it. A permanent skins error (e.g. the RLS refusal a non-creator gets on `skins_payouts`) is logged and doesn't keep the item. Local card-state read errors or queue-removal errors also leave the item queued and request a drain. An app kill mid-finalise leaves the item behind.
- **No double run:** `finalizeSubmittedRound` checks and marks the round in flight in one synchronous step. A second caller (the drain, or the online path) gets `RoundNotReadyError` and leaves the item queued.

A skins game settled online fires the user's skins achievements; a game settled later by the queue doesn't.

---

## Scorecard revisions and social-round merging

### The write path: `write_scorecard_snapshot`

Scorecard uploads go through the `write_scorecard_snapshot(p_round_id, p_player_id, p_expected_revision, p_snapshot)` RPC (migration `20260714000000_scorecard_optimistic_concurrency.sql`). `scorecards.revision` is server-owned and increments on every applied write. The local `pending_syncs.revision` only orders work on one device; the server revision protects against stale writes from other devices.

The RPC returns `applied`, `conflict`, `server_revision`, `server_status`, `server_scores`.

- **Create:** no row exists and `p_expected_revision` is NULL or 0 -> inserted at revision 1. A non-zero expected revision on a missing row is a conflict. A concurrent insert (unique violation) returns a conflict with the existing row.
- **Update:** applied only if `p_expected_revision` equals the stored revision; revision becomes `revision + 1`.
- **Conflict (nothing written, server row returned):** expected revision NULL or stale; the stored status is `confirmed`; or the stored status is `completed` and the snapshot is `not-started` / `in-progress` (a completed card never reverts).

### Conflicts in standard rounds

For competition, handicap and scoring-pair rounds a conflict is not merged. The upload is retained as a failed row (never silently dropped). It is recovered at submit, by the Retry action on the failed-sync banner, or from Developer -> Retained Uploads.

### Superseded uploads

If a newer local edit lands while an upload is in flight, the confirmed server revision is still recorded so the next upload is based on it (commit 9609f1ee). Otherwise the next upload would carry a stale expected revision and conflict with the device's own earlier write.

### Social rounds: per-hole last-edit-wins

A round is in `social` scoring mode (`deriveScoringMode`, `src/utils/scoringMode.ts`; exposed as `scoringMode` on the scorecard store) iff `competition_id` is null, `handicap_source` is `'none'` and `scoring_pairs_required` is false. Only social rounds merge; everything else keeps the retained-failure behaviour above.

**Per-hole stamp.** `applyScoreUpdate` (`src/store/scoreUpdateSlice.ts`) stamps `HoleScore.editedAt`. It is stored locally in the `edited_at` column (migration 19) and uploaded with `scoredBy`, `pickedUp` and `didNotAttempt` via `scoresForDb`.

**Merge rule** (`mergeScorecardScores`, `src/services/offline/sync/mergeScorecardScores.ts`), per hole:
- Two copies of a hole are the *same edit* when their `editedAt` match (or, if both are unstamped, their strokes match); the result is that edit.
- Otherwise the later `editedAt` wins. A missing `editedAt` counts as oldest.
- A tie goes to the server copy.
- Holes present on only one side are kept.

**Revision adoption** (`applyRemoteScorecard`, `src/store/remoteScorecardMerge.ts`): an older server row never lowers the local base revision. A final (`completed` / `confirmed`) server row is adopted wholesale, unless the local card is already final at that revision or higher.

**Mark synced after merge (no loops).** `applyRemoteToStore` (`scorecardStore`) saves a merged card that is already identical to the server in a single write, `saveScorecard(card, { syncedAtRevision })`, when nothing local is ahead of the server. Only a card that still differs from the server is queued for upload. Without this, every merge would enqueue an upload, which bumps the revision, which triggers a realtime event and another merge.

**Merge points:**
1. **Sync conflict resolver** (`setScorecardConflictResolver` in `syncOrchestrator.ts`): on a conflict the resolver merges the server row and retries *in memory only* — the queue row is never written, because a tap during the merge may already have coalesced a newer edit into it (if one did, `removePendingSync`'s revision check leaves it pending). If the server row is final, the queued row is discarded (or the fallback card marked synced). The resolver only acts for the social round currently loaded in the store; otherwise it declines and the conflict is retained as in standard rounds. (The revision-guarded `updatePendingSyncData(id, data, expectedRevision)` belongs to `refreshQueuedRevision`, the adopt-server-revision path used when a conflict is retained or by an explicit Retry — not to the resolver.)
2. **Realtime:** `useLiveScorecardMerge` (per-mount channel) feeds `mergeRemoteScorecard`. Payloads without a `scores` column are skipped, and a final row with null `scores` keeps the local holes.
3. **Pull on open:** `pullOnOpenIfSocial` in `useRoundData`, `useMatchPlayData` and `TeamMatchPlayScoringScreen` (`pullServerScorecards`). After a successful pull it re-queues **only this round's** retained scorecard failures (`resetFailedSyncsForRound`, same `scorecard:<roundId>:%` match as the round's failed count) and runs a normal drain (`manualSync`), so a conflict retained on a cold start — before the round was loaded and the resolver could run — is merged instead of staying failed.
4. **Pull before submit.** Both submit pulls pass `{ queueUpload: false }`: submit uploads every in-scope card itself, so no debounced upload is scheduled that could fire mid-submit.

**Retry outside a loaded round.** The banner's Retry (`retryFailedSyncs`) is device-wide and runs in adopt-server-revision mode. For a social round that is *not* loaded in the store the resolver declines, so Retry applies **local-wins** to that round's retained rows (the local snapshot is re-sent against the server's current revision) rather than a per-hole merge. Opening the round first merges them per hole instead.

**Completed cards are final.** Once any scorer submits, the cards are `completed` and the server rejects reversion. When a remote row turns this phone's last open group card final, the store records `submittedElsewhereRoundId` (cleared by `initializeRound`, `loadFromOffline` and `resetRound`, so it never carries into another round). `useSubmittedElsewhereRedirect` on the focused scoring screen of that round alerts once ("This round was submitted on another phone"), clears the flag, and resets navigation to the round summary. The scoring screens are not made read-only; leaving them is what stops further edits, and any local edit the server's final card does not hold is not uploaded (the server rejects reverting a completed card). `submitScorecards` returns `{ alreadySubmitted }` so a second submitter exits cleanly, and a `submitting` guard stops merges applying mid-submit. Social rounds skip `checkMultiScorerReadiness`; there is no scorer-consensus step.

**Accepted risk:** "last edit" is judged by each phone's clock, so skewed clocks can resolve a near-simultaneous same-hole edit the "wrong" way.

---

## Conflict Resolution

**Strategy for MVP: Last-write-wins**

```typescript
// Future enhancement: Conflict resolution
interface ConflictResolution {
  strategy: 'last-write-wins' | 'manual-merge';

  // For manual merge (Phase 2+)
  detectConflict: (local: Scorecard, remote: Scorecard) => boolean;
  resolveConflict: (local: Scorecard, remote: Scorecard) => Scorecard;
}

// MVP: Simple last-write-wins
const syncScorecard = async (local: Scorecard) => {
  try {
    // Overwrite remote with local changes
    await apiClient.put(`/scorecards/${local.id}`, local);
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
};
```

---

## Testing Offline Mode

### Simulate Offline in Development

```typescript
// Use this hook to test offline behavior
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useState } from 'react';

export function useSimulatedOffline() {
  const [forceOffline, setForceOffline] = useState(false);
  const realStatus = useNetworkStatus();

  return {
    ...realStatus,
    isOffline: forceOffline || realStatus.isOffline,
    toggleForceOffline: () => setForceOffline(!forceOffline),
  };
}
```

### Test Scenarios

1. **Offline Score Entry**
   - Turn on Airplane Mode
   - Enter scores for all players
   - Verify scores saved in SQLite
   - Turn off Airplane Mode
   - Verify auto-sync

2. **Intermittent Connection**
   - Start scoring online
   - Toggle Airplane Mode on/off
   - Verify no data loss

3. **Sync Failure Recovery**
   - Simulate API error
   - Verify retry logic
   - Verify error UI

---

## Performance Considerations

### SQLite Optimization

```typescript
// Batch inserts for better performance
export const batchSaveScores = async (scores: HoleScore[]) => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        scores.forEach((score) => {
          tx.executeSql(
            'INSERT OR REPLACE INTO scores VALUES (?, ?, ?)',
            [score.holeNumber, score.strokes, score.playerId]
          );
        });
      },
      reject,
      resolve
    );
  });
};
```

### Sync Throttling

```typescript
// Debounce sync requests
import { debounce } from 'lodash';

const debouncedSync = debounce(async () => {
  await syncPendingChanges();
}, 2000); // Wait 2 seconds after last change

// Use in score entry
const handleScoreChange = async (score: number) => {
  await saveLocally(score);
  debouncedSync(); // Trigger sync after 2 seconds of inactivity
};
```

---

## End round early (offline)

`useEndRoundEarly` and public `endRoundEarly(N)` use the existing store slice
and native `persistRoundEarlyEnd` transaction. Normal server-backed user ends
capture the authenticated owner, private session and source before awaits.
Marker, later-hole deletion, full proven tee/nine/handicap basis and the owned
intent commit or roll back together. No separate `queueRoundEndEarly` runs
afterward; that exported helper is not the production confirmation path.
Local-only cards remain intent-free. Same-owner/same-N work is a full queue-row
no-op; foreign/incompatible work refuses. An already-ended durable marker
requires the existing compatible owned intent inside the transaction, so a
discarded marker-only cache cannot acquire today's owner.

Online confirmation calls the RPC first, then uses the same atomic local finish
as offline/network fallback. Successful online confirmation leaves acknowledgment
to the end consumer; a durable commit requests a drain before any postcommit
guard/error. Only actual mapped end-RPC `P0002` permits no-new-intent finish
and cleanup of the original captured valid owned snapshot. An unavailable
shape read never means the round was deleted. The eight-second caller deadline
does not prove cancellation: a timed-out request can still settle on the server.

### Coordination, source selection and adoption

`withRoundScoringWrite` is per-round and non-reentrant. Confirmation, queued
ends, common card upload and tee operations acquire once at their
outer boundary. Local persistence admission is separate: source tokens attach
before the first await, nested DAO save/queue calls share a lease, and marker
transitions close admission and drain whole chains before committing. They
advance the source epoch only on commit, update guarded CURRENT memory, then
reopen. No lease spans network/coordinator waiting. Original owner and private
session-or-absence proof remain required independently of source currentness.

The queued end consumer rereads CURRENT row identity after waiting and holds
the coordinator through RPC, authorized complete shape read, durable shared
adoption and exact native acknowledgment. It uses the already-held
`adoptRoundShapeWithinScoringWrite`; authoritative repair is valid on CURRENT
closed/submitted cards and never creates/revives user intent. It repairs local
cards and pending/failed queue snapshots together. Local prior range intersects
server range, so N6 → N8 cannot recover discarded 7–8. Retained edits, terminal
metadata and maximum accepted revisions survive. Unknown shape, missing proven
historical context or failed repair keeps work blocked. Server NULL never
clears a local final marker; initialization/load repairs before exposing a
larger authoritative range.

`roundScoringContext.ts` supplies the shared recorded calculation basis.
Complete compatible recorded evidence wins; only proven current active context
can fill gaps. Historical cards cannot borrow today's profile. Explicit `none`
sets DHC0 with absent HI; unknown historical basis remains a visible block.

After end processing, the card phase takes fresh queue/source proof. `syncScorecard`
selects CURRENT queued work ahead of stale fallback, then covers prerequisite,
preparation-consistent `expected_round_shape`, snapshot, trailing entries and
acknowledgment. Shape rejection requires authorized read, shared adoption and
fresh reprepare; no old totals get a new shape label. Accepted SERVER revision
is monotonic and identifies the LOCAL card for repair, not the RPC UUID. Remote
Quick Score acceptance is a separate identity and never acknowledges a local
card/queue. A committed snapshot followed by new entry guard/busy failure
retains accepted revision while deferring repair rather than reporting success;
unrelated legacy entry errors retain their best-effort behavior.

### Errors and strict acknowledgment

| End outcome | Durable behavior |
|---|---|
| Applied or `round_already_ended` | Read authorized full shape, perform shared durable adoption, then strict acknowledgment; conflict alone never drops work before repair |
| Actual `P0002` | Guarded cleanup of the selected matching owned snapshot, without adoption/ownership invention |
| Network, explicit busy hint or typed stale operation | Pending/deferred, no retry spent; original work remains |
| `42501`, other invalid `22023`, missing/invalid owner or identifiable malformed end | Exact guarded failed retention; visible in Retained Uploads |
| Valid foreign owner | Wait for that owner; do not run under another account |
| Repair/read/retention database error | Visible/logged failure, preserving work; unrelated rounds may continue |

Native `removePendingSync` strict end mode checks selected id/revision/entity,
exact raw JSON/decode proof and recovery fields inside the exclusive transaction,
plus original owner/session/source before and after awaited mutation. Invalid
JSON permits exact failed retention only, never acknowledgment. Changed work
survives. Common card acknowledgment additionally checks captured parent and
physical hole-row baseline, live content, expected queue identity or absence,
and recovery state; queue deletion and disk mark occur together. Queue payload
B may differ from unchanged cache A: exact B can be acknowledged while marking
unchanged A synced, preventing stale fallback replay without copying B's scores.
Newer disk/live/queue changes during the request prevent acknowledgment.

### Bounded compatibility and QA

Canonical `round:<id>:end_early` gives dependency scope even when type/action/
payload identity is corrupt. Reads preserve nonpersistent `endIntentRead`
raw/decode proof; display uses safe identity and startup cleanup preserves the
row. Parseable declared ends without a canonical key remain visibly invalid/
unscoped. They cannot synthesize a prerequisite for a claimed payload round.
Noncanonical invalid JSON that cannot be identified as end work retains strict
decoding. There is no general corruption index/repair mechanism. Older ownerless
finalize compatibility is unchanged; ownerless new end work is invalid.

Ordinary web uploads and ordinary Quick Score direct success keep supported
paths and current owner/session/source/content checks. Native authoritative
repair, strict end acknowledgment and atomic durable-end guarantees have no
unguarded web fallback. Reopening offline after a cold start without a cached
round row remains unsupported. A late RPC success is not cancellation proof.

Jest exercises controlled mocked native/Supabase boundaries. Real device SQLite
crash/interleaving, account switching, late network settlement and PostgreSQL
locks/RLS remain deferred to the [1.15.0 QA/runbook](END_ROUND_EARLY_ROLLOUT.md)
and [two-session schedules](../../supabase/tests/round_scoring_writes_two_session.md).

## Related Documentation

- **[DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md)** - Database schema details
- **[CLAUDE.md](../../CLAUDE.md)** - Project overview
- **[MVP-PHASE-1.md](../MVP-PHASE-1.md)** - MVP offline requirements

---

*Last Updated: October 2026*
