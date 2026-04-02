# Detailed Shot Statistics — Design Spec

## Context

User feedback indicates demand for richer per-hole statistics beyond the current FIR/GIR/putts tracking. Players want to record:
- **Fairway miss direction** (left/right) when they miss the fairway
- **Green miss direction** (left/right/long/short) when they miss the green
- **Bunker shots** per hole
- **Hazard incidents** per hole with type (water, OB, lateral, lost ball)

The goal is to add this depth while preserving the app's simplicity for users who don't need it. All new stats are opt-in via per-user settings toggles and require a Premium subscription.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data model for miss directions | Keep boolean + add separate direction field | Backward compatible, no migration |
| Bunker detail level | Count only (0–5) | Fast to enter, sufficient for analysis |
| Hazard detail level | Count + type (multi-select) | Types: water, OB, lateral, lost ball |
| Configuration scope | Per-user settings | Consistent with existing FIR/GIR toggle pattern |
| Subscription tier | All Premium | Clear premium value, simple gating |
| Score entry UI | Hybrid: inline basics + bottom sheet for detail | FIR/GIR/Putts stay one-tap, advanced stats in sheet |
| Post-submission editing | Full-screen modal with hole navigation | Player edits own stats only |
| Hazard multi-select | Multiple types per hole | Reality: you can hit water AND go OB on the same hole |
| Settings toggles | Independent per stat category | Maximum user control |

---

## 1. Data Model

### HoleScore Type Extension

File: `src/types/database/base.ts`

New optional fields added to the existing `HoleScore` interface:

```typescript
// NEW types
type FairwayMissDirection = 'left' | 'right';
type GreenMissDirection = 'left' | 'right' | 'long' | 'short';
type HazardType = 'water' | 'ob' | 'lateral' | 'lost_ball';

interface HazardEntry {
  type: HazardType;
}

// Extended HoleScore
interface HoleScore {
  // Existing (unchanged)
  strokes: number;
  putts?: number;
  fairwayHit?: boolean;
  greenInRegulation?: boolean;
  penalties?: number;
  scoredBy?: string;
  shotContributions?: HoleShotContributions;

  // NEW
  fairwayMissDirection?: FairwayMissDirection;
  greenMissDirection?: GreenMissDirection;
  bunkerShots?: number;        // 0–5
  hazards?: HazardEntry[];     // Multi-select, one entry per hazard type
}
```

### Storage

No database migration required. All new fields are stored in the existing JSONB `scores` column of the `scorecards` table. Example:

```json
{
  "4": {
    "strokes": 6,
    "putts": 3,
    "fairwayHit": false,
    "fairwayMissDirection": "left",
    "greenInRegulation": false,
    "greenMissDirection": "short",
    "bunkerShots": 1,
    "hazards": [{ "type": "water" }]
  }
}
```

### Data Integrity Rules

- `fairwayMissDirection` must be cleared (set to `undefined`) when `fairwayHit` is set to `true`
- `greenMissDirection` must be cleared when `greenInRegulation` is set to `true`
- `bunkerShots` range: 0–5 (clamped in UI)
- `hazards` array: 0–4 entries (one per type max). Empty array or `undefined` means no hazards
- Fairway direction only relevant for par 4+ holes (par 3 has no fairway)

---

## 2. Settings & Configuration

### Settings Store

File: `src/store/settingsStore.ts`

New settings fields:

```typescript
interface SettingsState {
  // Existing
  showPutts: boolean;                    // Free tier, default: true
  showFairwayHit: boolean;               // Premium (fir_gir_tracking), default: true
  showGreenInRegulation: boolean;        // Premium (fir_gir_tracking), default: true

  // NEW — all Premium (detailed_stats)
  showFairwayMissDirection: boolean;     // Default: true
  showGreenMissDirection: boolean;       // Default: true
  showBunkerShots: boolean;              // Default: false
  showHazards: boolean;                  // Default: false
}
```

Each toggle is independent — miss direction toggles do NOT auto-enable/disable with their parent FIR/GIR toggle.

### Game Settings Screen

File: `src/screens/profile/GameSettingsScreen.tsx`

New toggles in the "Scoring Entry" section:

```
Scoring Entry
├── Putts                          [toggle]     (Free)
├── Fairway Hit (FIR)              [toggle]     (Premium — fir_gir_tracking)
├── Fairway Miss Direction         [toggle]     (Premium — detailed_stats)
├── Green in Regulation (GIR)      [toggle]     (Premium — fir_gir_tracking)
├── Green Miss Direction           [toggle]     (Premium — detailed_stats)
├── Bunker Shots                   [toggle]     (Premium — detailed_stats)
└── Hazards                        [toggle]     (Premium — detailed_stats)
```

Miss direction toggles visually indented under their parent toggle. All new toggles wrapped in `FeatureLockToggle` with `feature="detailed_stats"`.

---

## 3. Subscription Gating

### New Feature ID

Add `detailed_stats` to the feature system:

- File: `src/types/subscription.types.ts` — add to `FeatureId` type
- File: `src/components/subscription/tierConfig.ts` — add with `requiredTier: 'premium'`

### Gating Hierarchy

```
Free tier:    putts only
Premium tier: FIR/GIR (fir_gir_tracking) + miss directions, bunkers, hazards (detailed_stats)
```

### Hook Extension

File: `src/hooks/subscription/` (likely `useStatsVisibilityWithTier.ts`)

Extend the existing `useStatsVisibilityWithTier()` hook to expose the new visibility flags:

```typescript
interface StatsVisibility {
  // Existing
  showFairwayHit: boolean;
  showGreenInRegulation: boolean;

  // NEW
  showFairwayMissDirection: boolean;
  showGreenMissDirection: boolean;
  showBunkerShots: boolean;
  showHazards: boolean;
  hasAnyDetailedStats: boolean;  // True if any of the 4 new stats are enabled
}
```

`hasAnyDetailedStats` used to conditionally render the "+" button and summary badges.

---

## 4. Score Entry UI — Hybrid Inline + Sheet

### Modified StatsRow

File: `src/components/scorecard/PlayerScoreCard/StatsRow.tsx`

Current layout (unchanged):
```
[ FIR ✓/✗ ] [ GIR ✓/✗ ] [ − ] [putts] [ + ]
```

New additions to the right side of the existing row:
```
[ FIR ✓/✗ ] [ GIR ✓/✗ ] [ − ] [putts] [ + ]   [badges...] [+]
```

- **Summary badges**: Small colored pills showing entered detailed stats (e.g. "⬅ L", "⬇ Sh", "1🏖", "💧"). Only appear after data is entered via the sheet.
- **"+" button**: 32px circular button, opens `DetailedStatsSheet`. Only visible when `hasAnyDetailedStats` is true.

### DetailedStatsSheet Component

New component: `src/components/scorecard/DetailedStatsSheet.tsx`

Bottom sheet (using existing bottom sheet pattern in the app) containing:

1. **Header**: "Hole {N} — Advanced Stats" + player name
2. **Fairway Miss Direction** (shown only when `fairwayHit === false` AND `showFairwayMissDirection` enabled):
   - Two large toggle buttons: "⬅ Left" / "Right ➡"
   - Single-select (one or none)
3. **Green Miss Direction** (shown only when `greenInRegulation === false` AND `showGreenMissDirection` enabled):
   - Four toggle buttons: "Left" / "Right" / "Long" / "Short"
   - Single-select (one or none)
4. **Bunker Shots** (shown when `showBunkerShots` enabled):
   - Stepper: [ − ] count [ + ], range 0–5
5. **Hazards** (shown when `showHazards` enabled):
   - Multi-select toggle chips: "💧 Water" / "🚫 OB" / "🔴 Lateral" / "❓ Lost Ball"
   - Each is independently toggleable
   - Helper text: "Tap multiple if more than one hazard on this hole"
6. **Done button**: Closes sheet, saves data to scorecard store

### Empty State

If the sheet opens but no sections are relevant (e.g. fairway hit + GIR hit, and bunkers/hazards disabled), show a message: "No detailed stats to track for this hole" with the Done button.

### Integration with Score Updates

When `fairwayHit` is toggled from `false` to `true` in the inline row:
- Automatically clear `fairwayMissDirection` from the hole score
- Update summary badges to remove the fairway miss badge

Same for `greenInRegulation` → clear `greenMissDirection`.

---

## 5. Post-Submission Stats Editing

### ViewRoundScreen Changes

File: `src/screens/rounds/ViewRoundScreen/`

**New "Edit Stats" button** on the Scorecard tab:
- Positioned next to "Your Scorecard" header
- Only visible when:
  - User is viewing their own scorecard
  - Scorecard is in 'completed' or 'confirmed' status
  - `hasAnyDetailedStats` is true (at least one detailed stat enabled)
- Gated with `FeatureLockCompact` using `feature="detailed_stats"`

### EditStatsModal Component

New component: `src/screens/rounds/ViewRoundScreen/EditStatsModal.tsx`

Full-screen modal with:

1. **Header**: "Edit Stats — {Course Name}" with close button
2. **Hole Navigator**: Swipeable navigation (reuse `SwipeableHoleNavigator` pattern) or simple prev/next buttons
3. **Per-hole content**:
   - Hole number, par, player's score (read-only display)
   - Embedded stats form (same layout as `DetailedStatsSheet` but inline, not in a sheet)
   - Pre-populated with existing stat data from the scorecard
4. **Save behavior**: Explicit "Save All" button at the bottom of the modal. Changes are held in local state until saved, then persisted via a single Supabase mutation.
5. **Close**: Prompts to discard unsaved changes if any, then returns to ViewRoundScreen

### Data Flow

1. Modal reads current scorecard data from React Query cache
2. User edits stats per hole
3. On save: mutation updates the scorecard's `scores` JSONB via Supabase
4. Invalidates scorecard query to refresh ViewRoundScreen display

### Permissions

- Only the scorecard owner can edit their own stats
- No organizer override (player-only editing)
- Available for both standalone rounds and competition rounds

---

## 6. Scorecard Display Updates

### RoundScorecardTab

File: `src/components/rounds/ViewRound/RoundScorecardTab.tsx`

New optional rows in the scorecard table:

| Row | Shows | Format |
|-----|-------|--------|
| FIR | Existing + miss direction | `✓`, `✗ L`, `✗ R`, `—` (par 3) |
| GIR | Existing + miss direction | `✓`, `✗ L`, `✗ R`, `✗ Lo`, `✗ Sh` |
| Putts | Existing | Number |
| 🏖 (Bunkers) | New | Number or `—` |
| ⚠️ (Hazards) | New | Hazard type icons or `—` |

Rows only appear when the viewing user has the corresponding stat enabled in their settings. FIR/GIR rows show miss direction inline when data exists.

---

## 7. Files to Modify

### New Files
- `src/components/scorecard/DetailedStatsSheet.tsx` — Bottom sheet for advanced stats entry
- `src/components/scorecard/DetailedStatsBadges.tsx` — Summary badge pills component
- `src/screens/rounds/ViewRoundScreen/EditStatsModal.tsx` — Full-screen post-submission stats editor

### Modified Files
- `src/types/database/base.ts` — HoleScore type extension
- `src/types/subscription.types.ts` — Add `detailed_stats` feature ID
- `src/components/subscription/tierConfig.ts` — Add tier config for new feature
- `src/store/settingsStore.ts` — New settings fields
- `src/screens/profile/GameSettingsScreen.tsx` — New toggles in settings UI
- `src/hooks/subscription/useStatsVisibilityWithTier.ts` — Extended visibility hook
- `src/components/scorecard/PlayerScoreCard/StatsRow.tsx` — Add badges + sheet button
- `src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx` — Pass new props
- `src/components/rounds/ViewRound/RoundScorecardTab.tsx` — New table rows
- `src/screens/rounds/ViewRoundScreen/index.tsx` — Add Edit Stats button
- `src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts` — Add edit stats handler

### Reusable Components/Patterns
- Existing `SwipeableHoleNavigator` pattern for the EditStatsModal
- Existing `FeatureLockToggle` / `FeatureLockCompact` for subscription gating
- Existing bottom sheet pattern for `DetailedStatsSheet`
- Existing stepper pattern from putts for bunker count

---

## 8. Verification Plan

1. **Settings**: Toggle each stat on/off in Game Settings, verify the score entry UI shows/hides accordingly
2. **Score Entry — FIR/GIR inline**: Toggle FIR/GIR, verify miss direction pills appear/disappear in the sheet
3. **Score Entry — Bottom Sheet**: Tap "+", verify all enabled stat sections display, enter data, close, verify summary badges update
4. **Data Clearing**: Toggle FIR from miss to hit, verify `fairwayMissDirection` is cleared from stored data
5. **Post-Submission**: Submit a scorecard, navigate to View Round, verify "Edit Stats" button appears with FeatureLock
6. **EditStatsModal**: Open modal, navigate through holes, edit stats, save, verify data persists
7. **Scorecard Display**: Check that new stat rows appear in the scorecard table with correct values
8. **Subscription Gating**: Test with Free tier — verify all new features show lock overlay. Test with Premium — verify full access.
9. **Offline Support**: Enter detailed stats while offline, verify they sync correctly when reconnecting
10. **Existing Behavior**: Verify users who don't enable any new stats see zero UI changes
