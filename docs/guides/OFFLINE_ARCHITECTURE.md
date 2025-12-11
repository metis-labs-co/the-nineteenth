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

**Set up offline support when app starts.**

```typescript
// App.tsx
import { useEffect } from 'react';
import { initializeDatabase, registerBackgroundSync } from '@services/offline';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useOfflineStore } from '@store/offlineStore';

export default function App() {
  const { isOffline } = useNetworkStatus();
  const { setOnlineStatus } = useOfflineStore();

  useEffect(() => {
    // Initialize SQLite database
    initializeDatabase();

    // Register background sync
    registerBackgroundSync();
  }, []);

  useEffect(() => {
    // Update offline store when network status changes
    setOnlineStatus(!isOffline);
  }, [isOffline]);

  return (
    <NavigationContainer>
      {/* Your app content */}
    </NavigationContainer>
  );
}
```

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

## Related Documentation

- **[DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md)** - Database schema details
- **[CLAUDE.md](../../CLAUDE.md)** - Project overview
- **[MVP-PHASE-1.md](../MVP-PHASE-1.md)** - MVP offline requirements

---

*Last Updated: January 2025*
