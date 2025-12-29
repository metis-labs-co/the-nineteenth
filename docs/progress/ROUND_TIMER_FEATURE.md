# Round Timer Feature

## Overview

Add a timer feature that tracks elapsed time during round scoring. Premium-only feature with user setting toggle.

---

## Requirements Summary

| Aspect | Decision |
|--------|----------|
| **Availability** | Premium users only |
| **Setting Scope** | Global user setting (applies to all rounds) |
| **Non-premium UX** | Show setting as locked, prompt to upgrade on tap |
| **Timer Start** | When player starts scoring a round |
| **Timer Pause** | Prompt on back button navigation; auto-pause on force-close |
| **Background Behavior** | Timer continues running |
| **Persistence** | Timer state persists across app restarts |
| **Multi-device** | Per-device timer (each scorer has own timer) |
| **Display Format** | Elapsed time only (HH:MM:SS) |
| **Data Storage** | Save final elapsed time to database on round submission |

---

## Wireframe Options - Header Timer Display

### Option A: Inline with Header Title
```
┌─────────────────────────────────────────────────┐
│  ←  Round 1 - Sandringham GC       ⏱ 2:15:32   │
│─────────────────────────────────────────────────│
│                                                 │
│  Hole 7 | Par 4 | 385m | SI 5                   │
│                                                 │
```
- Timer sits right-aligned in header bar
- Compact, doesn't take extra vertical space
- Tap timer to pause/resume

### Option B: Sub-header Timer Bar
```
┌─────────────────────────────────────────────────┐
│  ←  Round 1 - Sandringham GC                    │
│─────────────────────────────────────────────────│
│  ⏱ 2:15:32                          ▐▐ Pause   │
│─────────────────────────────────────────────────│
│                                                 │
│  Hole 7 | Par 4 | 385m | SI 5                   │
│                                                 │
```
- Dedicated timer bar below header
- Explicit pause/resume button
- More visible, takes extra vertical space

### Option C: Floating Timer Badge
```
┌─────────────────────────────────────────────────┐
│  ←  Round 1 - Sandringham GC                    │
│─────────────────────────────────────────────────│
│                                                 │
│  Hole 7 | Par 4 | 385m | SI 5                   │
│                                                 │
│  ┌─────────────┐                                │
│  │ ⏱ 2:15:32  │                                │
│  └─────────────┘                                │
│                                                 │
│         [ 4 ] [ 5 ] [ 6 ] [ 7 ]                 │
```
- Floating pill/badge, draggable position
- Can be minimized or hidden
- Doesn't interfere with header navigation
- Most flexible but more complex to implement

**Recommendation**: Option A for simplicity, Option B if we want explicit pause control visible at all times.

---

## Technical Design

### 1. Database Changes

**New columns on `rounds` table:**
```sql
ALTER TABLE rounds ADD COLUMN elapsed_time_seconds INTEGER DEFAULT NULL;
ALTER TABLE rounds ADD COLUMN timer_enabled BOOLEAN DEFAULT FALSE;
```

**New column on `user_preferences` table (or create if doesn't exist):**
```sql
ALTER TABLE user_preferences ADD COLUMN round_timer_enabled BOOLEAN DEFAULT FALSE;
```

### 2. Local Storage Schema

Store timer state in AsyncStorage for persistence:

```typescript
interface RoundTimerState {
  roundId: string;
  elapsedSeconds: number;      // Total elapsed time
  isRunning: boolean;          // Is timer currently running
  lastTickTimestamp: number;   // Unix timestamp of last save (for recovery)
  startedAt: string;           // ISO timestamp when timer first started
}

// Key format: `round_timer_${roundId}`
```

### 3. Timer Hook

```typescript
// src/hooks/useRoundTimer.ts

interface UseRoundTimerOptions {
  roundId: string;
  enabled: boolean;  // From user settings + premium check
}

interface UseRoundTimerReturn {
  elapsedSeconds: number;
  formattedTime: string;        // "2:15:32"
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}
```

### 4. Component Structure

```
src/
├── components/
│   └── timer/
│       ├── RoundTimer.tsx           # Timer display component
│       ├── RoundTimer.test.tsx
│       ├── RoundTimerPauseModal.tsx # "Pause timer?" prompt
│       └── index.ts
├── hooks/
│   └── useRoundTimer.ts             # Timer logic hook
├── screens/
│   └── settings/
│       └── components/
│           └── TimerSettingRow.tsx  # Setting toggle with premium gate
```

### 5. Auto-Save Strategy

- Save timer state to AsyncStorage every **30 seconds** while running
- Also save on:
  - Manual pause
  - Navigation away (after user confirms)
  - App going to background (via AppState listener)

- On app launch / screen mount:
  1. Load saved timer state
  2. If `isRunning === true`, calculate gap since `lastTickTimestamp`
  3. Since force-close should pause: set `isRunning = false`, keep `elapsedSeconds` as-is
  4. Show timer in paused state, user can resume

### 6. Navigation Interception

Use React Navigation's `beforeRemove` listener:

```typescript
useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', (e) => {
    if (!timerEnabled || !isRunning) return;

    // Prevent default navigation
    e.preventDefault();

    // Show pause prompt
    showPauseModal(() => {
      // On confirm: pause timer, then navigate
      pauseTimer();
      navigation.dispatch(e.data.action);
    });
  });

  return unsubscribe;
}, [navigation, timerEnabled, isRunning]);
```

### 7. Premium Gating

```typescript
// In settings screen
const { tier } = useSubscription();
const isPremium = tier === 'premium' || tier === 'super_admin';

<TimerSettingRow
  enabled={timerEnabled}
  onToggle={handleToggle}
  locked={!isPremium}
  onLockedPress={() => navigation.navigate('UpgradeScreen')}
/>
```

---

## User Flows

### Flow 1: Starting a Round (Timer Enabled)

1. User navigates to scorecard for a round
2. Check: Is user premium? Is timer setting enabled?
3. If yes to both:
   - Check for existing timer state in AsyncStorage
   - If exists and was paused: show "Resume timer?" prompt
   - If no existing state: auto-start timer
4. Timer displays in header, counting up

### Flow 2: Leaving via Back Button

1. User taps back button
2. If timer running: intercept navigation
3. Show modal: "Pause the round timer?"
   - [Pause & Leave] - Pauses timer, navigates back
   - [Keep Running] - Timer continues, navigates back (for quick checks)
   - [Cancel] - Stay on scorecard
4. Save timer state to AsyncStorage

### Flow 3: App Goes to Background

1. AppState changes to 'background'
2. Save current timer state to AsyncStorage
3. Timer continues conceptually (we'll calculate elapsed on return)
4. On foreground: calculate elapsed time since background, add to timer

### Flow 4: Force Close / Crash Recovery

1. App is force-closed (or crashes)
2. Last auto-saved state (within 30s) is preserved
3. On next app open + navigate to same round:
   - Load saved state
   - Timer shows as paused at last saved time
   - User can tap to resume

### Flow 5: Submitting Round

1. User completes all holes and submits scorecard
2. Timer automatically stops
3. Final `elapsedSeconds` saved to `rounds.elapsed_time_seconds` in database
4. Display confirmation: "Round completed in 3h 42m"

### Flow 6: Non-Premium User Tries to Enable

1. User navigates to Settings
2. Sees "Round Timer" toggle with lock icon
3. Taps on it
4. Modal appears: "Round Timer is a Premium feature. Upgrade to track your round times."
   - [Upgrade Now] - Navigate to subscription screen
   - [Maybe Later] - Dismiss

---

## Implementation Tasks

### Phase 1: Core Timer Logic
- [ ] Create `useRoundTimer` hook with start/pause/resume/reset
- [ ] Add AsyncStorage persistence layer
- [ ] Implement 30-second auto-save interval
- [ ] Handle AppState changes (background/foreground)

### Phase 2: UI Components
- [ ] Create `RoundTimer` display component (Option A or B from wireframes)
- [ ] Create `RoundTimerPauseModal` prompt
- [ ] Integrate timer into `ScorecardEntryScreen` header

### Phase 3: Settings & Premium Gate
- [ ] Add timer setting to user preferences (database + local)
- [ ] Create `TimerSettingRow` component with lock state
- [ ] Add premium check logic
- [ ] Connect to upgrade flow

### Phase 4: Database & Submission
- [ ] Add `elapsed_time_seconds` column to `rounds` table
- [ ] Save elapsed time on round submission
- [ ] Display elapsed time in round history/details

### Phase 5: Testing
- [ ] Unit tests for timer hook
- [ ] Unit tests for persistence/recovery
- [ ] Integration tests for navigation interception
- [ ] Manual testing: background, force-close, resume scenarios

---

## Open Questions / Future Considerations

1. **Pace of Play Indicators**: Could add "On pace" / "Slow" indicators based on expected time per hole (future enhancement)

2. **Shared Round Timer**: If needed later, could add database-synced timer for group timing

3. **Timer History**: Track timing patterns over multiple rounds (average round time, fastest round, etc.)

4. **Notification**: Optional notification when round exceeds X hours?

---

## Files to Create/Modify

### New Files
- `src/hooks/useRoundTimer.ts`
- `src/hooks/useRoundTimer.test.ts`
- `src/components/timer/RoundTimer.tsx`
- `src/components/timer/RoundTimer.test.tsx`
- `src/components/timer/RoundTimerPauseModal.tsx`
- `src/components/timer/index.ts`
- `src/screens/settings/components/TimerSettingRow.tsx`
- `supabase/migrations/XXXXXX_add_round_timer.sql`

### Modified Files
- `src/screens/scoring/ScorecardEntryScreen.tsx` - Add timer to header
- `src/screens/settings/SettingsScreen.tsx` - Add timer toggle
- `src/types/database/round.types.ts` - Add elapsed_time_seconds
- `src/hooks/index.ts` - Export new hook

---

*Created: December 2024*
*Status: Planning*
