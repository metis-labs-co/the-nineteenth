# Plan: Round Timer Feature

## Overview

Add a timer feature that tracks elapsed time during round scoring. Premium-only feature with user setting toggle. Timer displays in the scorecard header and saves final elapsed time to database on round submission.

## Approach

1. **Leverage existing infrastructure** - The `user_preferences` table already has `round_timer_enabled` column; just wire it up
2. **Follow established patterns** - Add to `settingsStore.ts` like other settings (GPS, putts, etc.)
3. **Simple UX** - Inline timer in header (Option A), auto-pause on leave, no confirmation modals
4. **Offline-first** - Timer state in AsyncStorage, final result syncs to database

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI placement | Option A: Inline with header title | Simplest, no extra vertical space |
| Pause UX | Auto-pause on navigation/background | No modal friction - users can resume on return |
| Settings storage | Add to existing `settingsStore.ts` | Consistent with GPS, putts, FIR/GIR pattern |
| Timer state storage | AsyncStorage with `round_timer_${roundId}` key | Offline-first, per-round persistence |
| Auto-save interval | On pause/background/submit only | Simpler than 30s interval, sufficient for recovery |
| Premium check | Use existing `useIsPremium()` hook | Consistent with FIR/GIR gating |
| Force-close recovery | Timer shows paused at last saved time | User can manually resume |

---

## Phase 1: Database & Types

### Step 1.1: Add elapsed_time_seconds to rounds table
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Create a migration to add `elapsed_time_seconds` column to the `rounds` table.

File: `supabase/migrations/YYYYMMDDHHMMSS_add_round_elapsed_time.sql`

```sql
-- Add elapsed time tracking to rounds
-- Stores final round duration in seconds when scorecard is submitted

ALTER TABLE rounds ADD COLUMN elapsed_time_seconds INTEGER DEFAULT NULL;

COMMENT ON COLUMN rounds.elapsed_time_seconds IS 'Final round duration in seconds, saved on scorecard submission. NULL if timer was not used.';
```

**Deliverables:**
- [ ] Migration file created with proper naming convention
- [ ] Column added with NULL default (timer is optional)
- [ ] Comment added for documentation

**Dependencies:** None

---

### Step 1.2: Update Round TypeScript type
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Update `src/types/database/round.types.ts` to add the new column to the `Round` interface.

Add after line 39 (after `status: RoundStatus;`):
```typescript
  // Timer
  elapsed_time_seconds: number | null; // Final round duration in seconds
```

**Deliverables:**
- [ ] `Round` interface updated with `elapsed_time_seconds` field
- [ ] Comment added for clarity

**Dependencies:** Step 1.1

---

### Step 1.3: Add timer setting to settingsStore
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Update `src/store/settingsStore.ts` to add the round timer setting.

1. Add to `SettingsState` interface:
```typescript
  // Round timer (Premium feature)
  roundTimerEnabled: boolean;
```

2. Add to `DEFAULT_SETTINGS`:
```typescript
  roundTimerEnabled: false, // Premium feature, off by default
```

3. Add setter to store:
```typescript
  setRoundTimerEnabled: (enabled: boolean) => void;
```

4. Add action in store creation:
```typescript
  setRoundTimerEnabled: (enabled) => set({ roundTimerEnabled: enabled }),
```

5. Add a hook for timer visibility (following `useStatsVisibilityWithTier` pattern):
```typescript
/**
 * Hook to get timer enabled status - respects subscription tier
 * Round timer requires Premium tier.
 */
export function useRoundTimerEnabled() {
  const roundTimerEnabled = useSettingsStore((state) => state.roundTimerEnabled);
  const isPremium = useIsPremium();

  return isPremium && roundTimerEnabled;
}
```

**Deliverables:**
- [ ] `roundTimerEnabled` added to state interface
- [ ] Default value set to `false`
- [ ] Setter action added
- [ ] `useRoundTimerEnabled()` hook created with premium check

**Dependencies:** None

---

## Phase 2: Timer Hook

### Step 2.1: Create useRoundTimer hook
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Create `src/hooks/useRoundTimer.ts` - the core timer logic hook.

Requirements:
- Manage timer state (elapsed seconds, running status)
- Persist to AsyncStorage with key `round_timer_${roundId}`
- Handle AppState changes (background/foreground)
- Calculate elapsed time on recovery
- Auto-pause on background

```typescript
/**
 * useRoundTimer - Manages round timer state with persistence
 *
 * Features:
 * - Tracks elapsed time in seconds
 * - Persists state to AsyncStorage
 * - Auto-pauses when app goes to background
 * - Recovers timer state on mount
 * - Premium feature - use with useRoundTimerEnabled() guard
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RoundTimerState {
  elapsedSeconds: number;
  isRunning: boolean;
  lastTickTimestamp: number; // Unix ms - for gap calculation on recovery
}

interface UseRoundTimerOptions {
  roundId: string;
  enabled: boolean; // From useRoundTimerEnabled()
}

interface UseRoundTimerReturn {
  elapsedSeconds: number;
  formattedTime: string; // "H:MM:SS" or "MM:SS"
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  getElapsedSeconds: () => number; // For submission
}

const STORAGE_KEY_PREFIX = 'round_timer_';

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function useRoundTimer({ roundId, enabled }: UseRoundTimerOptions): UseRoundTimerReturn {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const storageKey = `${STORAGE_KEY_PREFIX}${roundId}`;

  // Load saved state on mount
  useEffect(() => {
    if (!enabled) return;

    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const state: RoundTimerState = JSON.parse(saved);
          setElapsedSeconds(state.elapsedSeconds);
          // Always start paused on recovery - user can resume
          setIsRunning(false);
        }
      } catch (error) {
        console.error('[useRoundTimer] Failed to load state:', error);
      }
    };

    loadState();
  }, [roundId, enabled, storageKey]);

  // Save state to storage
  const saveState = useCallback(async (elapsed: number, running: boolean) => {
    const state: RoundTimerState = {
      elapsedSeconds: elapsed,
      isRunning: running,
      lastTickTimestamp: Date.now(),
    };
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('[useRoundTimer] Failed to save state:', error);
    }
  }, [storageKey]);

  // Timer tick
  useEffect(() => {
    if (!enabled || !isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isRunning]);

  // Handle app state changes
  useEffect(() => {
    if (!enabled) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Auto-pause and save
        if (isRunning) {
          setIsRunning(false);
          saveState(elapsedSeconds, false);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [enabled, isRunning, elapsedSeconds, saveState]);

  // Actions
  const start = useCallback(() => {
    if (!enabled) return;
    setIsRunning(true);
    saveState(elapsedSeconds, true);
  }, [enabled, elapsedSeconds, saveState]);

  const pause = useCallback(() => {
    setIsRunning(false);
    saveState(elapsedSeconds, false);
  }, [elapsedSeconds, saveState]);

  const resume = useCallback(() => {
    if (!enabled) return;
    setIsRunning(true);
    saveState(elapsedSeconds, true);
  }, [enabled, elapsedSeconds, saveState]);

  const reset = useCallback(async () => {
    setElapsedSeconds(0);
    setIsRunning(false);
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error('[useRoundTimer] Failed to remove state:', error);
    }
  }, [storageKey]);

  const getElapsedSeconds = useCallback(() => elapsedSeconds, [elapsedSeconds]);

  return {
    elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
    isRunning,
    start,
    pause,
    resume,
    reset,
    getElapsedSeconds,
  };
}
```

**Deliverables:**
- [ ] `src/hooks/useRoundTimer.ts` created
- [ ] Persistence to AsyncStorage working
- [ ] AppState handling for auto-pause
- [ ] Clean interval management

**Dependencies:** Step 1.3

---

### Step 2.2: Export hook from index
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Add export to `src/hooks/index.ts`:

```typescript
export { useRoundTimer } from './useRoundTimer';
```

**Deliverables:**
- [ ] Hook exported from barrel file

**Dependencies:** Step 2.1

---

## Phase 3: UI Components

### Step 3.1: Create RoundTimer display component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Create `src/components/timer/RoundTimer.tsx` - the timer display component.

Requirements:
- Compact pill/badge style for header placement
- Shows formatted time with timer icon
- Tap to toggle pause/resume
- Visual indicator for paused state

```typescript
/**
 * RoundTimer - Compact timer display for scorecard header
 *
 * Shows elapsed time with pause/resume toggle on tap.
 * Displays clock icon when running, pause icon when paused.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

interface RoundTimerProps {
  formattedTime: string;
  isRunning: boolean;
  onToggle: () => void;
}

export function RoundTimer({ formattedTime, isRunning, onToggle }: RoundTimerProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isRunning ? colors.primaryLight : colors.gray100,
          borderColor: isRunning ? colors.primary : colors.gray300,
        },
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isRunning ? 'Pause timer' : 'Resume timer'}
      accessibilityHint={`Round time: ${formattedTime}`}
    >
      <Icon
        source={isRunning ? 'timer-outline' : 'pause'}
        size={14}
        color={isRunning ? colors.primary : colors.textSecondary}
      />
      <Text
        style={[
          styles.time,
          { color: isRunning ? colors.primary : colors.textSecondary },
        ]}
      >
        {formattedTime}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  time: {
    ...typography.smallBold,
    fontVariant: ['tabular-nums'], // Monospace numbers for stable width
  },
});
```

Also create `src/components/timer/index.ts`:
```typescript
export { RoundTimer } from './RoundTimer';
```

**Deliverables:**
- [ ] `src/components/timer/RoundTimer.tsx` created
- [ ] `src/components/timer/index.ts` barrel file created
- [ ] Tap to toggle pause/resume working
- [ ] Visual states for running/paused

**Dependencies:** Step 2.1

---

### Step 3.2: Integrate timer into ScorecardHeader
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Update `src/screens/scoring/ScorecardEntryScreen/components/ScorecardHeader.tsx` to include the timer.

1. Add new props to interface:
```typescript
  // Timer (Premium feature)
  timerEnabled: boolean;
  formattedTime: string;
  isTimerRunning: boolean;
  onTimerToggle: () => void;
```

2. Import RoundTimer:
```typescript
import { RoundTimer } from '@/components/timer';
```

3. Add timer to `rightContent` (before SkinsIndicator):
```typescript
const renderRightContent = () => (
  <View style={styles.rightContent}>
    {/* Round Timer - Premium feature */}
    {timerEnabled && (
      <RoundTimer
        formattedTime={formattedTime}
        isRunning={isTimerRunning}
        onToggle={onTimerToggle}
      />
    )}

    {/* Skins Indicator - shows when skins game is active */}
    <SkinsIndicator roundId={roundId} size="sm" />
    ...
  </View>
);
```

**Deliverables:**
- [ ] Props added to ScorecardHeaderProps
- [ ] RoundTimer imported and rendered
- [ ] Timer shows before skins indicator in header

**Dependencies:** Step 3.1

---

### Step 3.3: Wire timer in ScorecardEntryScreen
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Update `src/screens/scoring/ScorecardEntryScreen/index.tsx` to use the timer hook and pass props to header.

1. Import hooks:
```typescript
import { useRoundTimer } from '@/hooks';
import { useRoundTimerEnabled } from '@/store/settingsStore';
```

2. Add timer hook usage (near other hooks):
```typescript
// Round timer (Premium feature)
const timerEnabled = useRoundTimerEnabled();
const {
  formattedTime,
  isRunning: isTimerRunning,
  start: startTimer,
  pause: pauseTimer,
  resume: resumeTimer,
  getElapsedSeconds,
} = useRoundTimer({ roundId: round.id, enabled: timerEnabled });

// Toggle handler
const handleTimerToggle = useCallback(() => {
  if (isTimerRunning) {
    pauseTimer();
  } else {
    resumeTimer();
  }
}, [isTimerRunning, pauseTimer, resumeTimer]);
```

3. Auto-start timer on first mount if enabled:
```typescript
// Start timer when screen first loads (if enabled and not already running)
useEffect(() => {
  if (timerEnabled && !isTimerRunning && formattedTime === '0:00') {
    startTimer();
  }
}, [timerEnabled]); // Only on mount
```

4. Pass to header:
```typescript
<ScorecardHeader
  ...existingProps
  timerEnabled={timerEnabled}
  formattedTime={formattedTime}
  isTimerRunning={isTimerRunning}
  onTimerToggle={handleTimerToggle}
/>
```

5. Include elapsed time in submission (find the submit handler):
```typescript
// When submitting scorecard, include elapsed time if timer was used
const elapsedTimeSeconds = timerEnabled ? getElapsedSeconds() : null;
// Pass elapsedTimeSeconds to the submission mutation/service
```

**Deliverables:**
- [ ] Timer hook integrated in ScorecardEntryScreen
- [ ] Auto-start on first load
- [ ] Toggle handler wired to header
- [ ] Elapsed time passed to submission

**Dependencies:** Step 3.2

---

## Phase 4: Settings UI

### Step 4.1: Add timer toggle to SettingsScreen
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Update `src/screens/profile/SettingsScreen.tsx` to add the timer setting toggle.

1. Import from settingsStore:
```typescript
const roundTimerEnabled = useSettingsStore((state) => state.roundTimerEnabled);
const setRoundTimerEnabled = useSettingsStore((state) => state.setRoundTimerEnabled);
```

2. Add after GPS Distance row (inside FeatureLock for Premium gating):
```typescript
<FeatureLock
  feature="round_timer"
  onUpgradePress={() => navigation.navigate('Subscription')}
  lockedMessage="Round Timer requires Premium"
>
  <SettingRow
    icon="timer-outline"
    label="Round Timer"
    description="Track elapsed time during rounds"
    value={roundTimerEnabled}
    onValueChange={setRoundTimerEnabled}
    colors={colors}
  />
</FeatureLock>
```

Note: May need to add `round_timer` to the feature gate configuration if not already present.

**Deliverables:**
- [ ] Timer toggle added to Settings screen
- [ ] Premium gating with FeatureLock
- [ ] Follows existing SettingRow pattern

**Dependencies:** Step 1.3

---

### Step 4.2: Add round_timer to feature gates (if needed)
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Check `src/hooks/subscription/useFeatureGate.ts` or similar to ensure `round_timer` feature is defined.

If the feature gate system uses a config, add:
```typescript
round_timer: {
  requiredTier: 'premium',
  lockedMessage: 'Round Timer requires Premium',
}
```

If FeatureLock already handles any unknown feature as "Premium required", this step may be skipped.

**Deliverables:**
- [ ] Feature gate configured (or verified unnecessary)

**Dependencies:** None

---

## Phase 5: Submission Integration

### Step 5.1: Update scorecard submission to save elapsed time
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Update the scorecard submission flow to save `elapsed_time_seconds` to the database.

Find the submission handler/service (likely in `src/hooks/scorecard/` or `src/services/scoring/`) and:

1. Accept `elapsedTimeSeconds?: number | null` parameter
2. Include in the round update:
```typescript
// When updating round status to 'completed'
await supabase
  .from('rounds')
  .update({
    status: 'completed',
    elapsed_time_seconds: elapsedTimeSeconds,
    updated_at: new Date().toISOString(),
  })
  .eq('id', roundId);
```

3. Clear timer storage after successful submission:
```typescript
// After successful submission
await AsyncStorage.removeItem(`round_timer_${roundId}`);
```

**Deliverables:**
- [ ] Submission accepts elapsed time parameter
- [ ] Elapsed time saved to rounds table
- [ ] Timer storage cleared after submission

**Dependencies:** Step 1.1, Step 3.3

---

### Step 5.2: Display elapsed time in round completion
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
After successful scorecard submission, if timer was used, show completion message.

In the submission success handler or completion screen:
```typescript
if (elapsedTimeSeconds) {
  const hours = Math.floor(elapsedTimeSeconds / 3600);
  const minutes = Math.floor((elapsedTimeSeconds % 3600) / 60);

  const timeMessage = hours > 0
    ? `Round completed in ${hours}h ${minutes}m`
    : `Round completed in ${minutes} minutes`;

  // Show in success toast/alert
}
```

**Deliverables:**
- [ ] Completion message shows elapsed time
- [ ] Properly formatted (hours and minutes)

**Dependencies:** Step 5.1

---

## Phase 6: Testing

### Step 6.1: Write unit tests for useRoundTimer
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Create `src/hooks/__tests__/useRoundTimer.test.ts` with tests for:

1. Initial state (0 seconds, not running)
2. Start/pause/resume functionality
3. Time increments when running
4. AsyncStorage persistence
5. AppState background handling
6. Reset clears storage

Use `@testing-library/react-hooks` and mock AsyncStorage.

**Deliverables:**
- [ ] Unit tests for timer hook
- [ ] Coverage for all actions
- [ ] Persistence tests

**Dependencies:** Step 2.1

---

### Step 6.2: Manual testing checklist
**Status:** ⏳ Pending
**Type:** Manual

**Prompt:**
Manual testing scenarios:

- [ ] Timer shows for Premium users with setting enabled
- [ ] Timer hidden for Free/Social tier users
- [ ] Timer hidden when setting is disabled
- [ ] Timer starts automatically on first scorecard entry
- [ ] Tap pauses timer, tap again resumes
- [ ] Navigating away pauses timer
- [ ] App background pauses timer
- [ ] Returning to scorecard shows paused timer
- [ ] Force close and reopen shows paused timer at last time
- [ ] Submitting scorecard saves elapsed time
- [ ] Elapsed time shows in completion message
- [ ] New round starts with fresh timer (0:00)

**Deliverables:**
- [ ] All scenarios tested and passing

**Dependencies:** All previous steps

---

## Critical Files

### To Create
- `supabase/migrations/YYYYMMDDHHMMSS_add_round_elapsed_time.sql` - Database migration
- `src/hooks/useRoundTimer.ts` - Timer logic hook
- `src/hooks/__tests__/useRoundTimer.test.ts` - Hook tests
- `src/components/timer/RoundTimer.tsx` - Timer display component
- `src/components/timer/index.ts` - Barrel export

### To Modify
- `src/types/database/round.types.ts` - Add `elapsed_time_seconds` to Round interface
- `src/store/settingsStore.ts` - Add `roundTimerEnabled` setting
- `src/hooks/index.ts` - Export useRoundTimer
- `src/screens/scoring/ScorecardEntryScreen/components/ScorecardHeader.tsx` - Add timer to header
- `src/screens/scoring/ScorecardEntryScreen/index.tsx` - Integrate timer hook
- `src/screens/profile/SettingsScreen.tsx` - Add timer toggle
- Scorecard submission service - Save elapsed time

### To Delete
- `docs/progress/ROUND_TIMER_FEATURE.md` - Original planning doc (superseded by this plan)

---

## Verification

How to verify the plan is complete:

- [ ] Premium user can enable Round Timer in Settings
- [ ] Free/Social user sees locked timer toggle with upgrade prompt
- [ ] Timer appears in scorecard header when enabled
- [ ] Timer counts up from 0:00 when scoring begins
- [ ] Tapping timer toggles pause/resume
- [ ] Timer persists across app restarts (shows paused state)
- [ ] Timer auto-pauses when app goes to background
- [ ] Elapsed time saved to database on submission
- [ ] Completion message shows round duration
- [ ] Timer resets for new rounds

---

*Created: January 2026*
*Status: Planning*
*Supersedes: docs/progress/ROUND_TIMER_FEATURE.md*
