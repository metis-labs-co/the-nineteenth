# Detailed Shot Statistics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add detailed per-hole shot statistics (fairway miss direction, green miss direction, bunker shots, hazards) behind premium-gated per-user settings toggles, with entry during scoring and post-submission editing.

**Architecture:** Extends existing HoleScore JSONB with optional fields (no DB migration). New stats are entered via a bottom sheet opened from the existing StatsRow. Post-submission editing uses a full-screen modal on ViewRoundScreen. All gated behind `detailed_stats` premium feature.

**Tech Stack:** React Native, TypeScript, Zustand (settings store), TanStack Query (mutations), Supabase (JSONB upsert), existing BottomSheet component.

**Spec:** `docs/superpowers/specs/2026-04-02-detailed-shot-stats-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/scorecard/DetailedStatsSheet.tsx` | Bottom sheet for entering miss directions, bunkers, hazards during scoring |
| `src/components/scorecard/DetailedStatsBadges.tsx` | Summary badge pills showing entered detailed stats inline on StatsRow |
| `src/screens/rounds/ViewRoundScreen/EditStatsModal.tsx` | Full-screen modal for editing stats post-submission with hole navigation |
| `src/hooks/scorecard/useUpdateScorecardStats.ts` | TanStack Query mutation for updating scorecard stats via Supabase |

### Modified Files
| File | Change |
|------|--------|
| `src/types/database/base.ts` | Add `FairwayMissDirection`, `GreenMissDirection`, `HazardType`, `HazardEntry` types + extend `HoleScore` |
| `src/store/settingsStore.ts` | Add 4 new show* settings + setters + defaults |
| `src/hooks/useStatsVisibilityWithTier.ts` | Add 4 new visibility flags + `hasAnyDetailedStats` computed |
| `src/screens/profile/GameSettingsScreen.tsx` | Add 4 new `FeatureLockToggle`-wrapped setting rows |
| `src/components/scorecard/PlayerScoreCard/StatsRow.tsx` | Add badges + "+" button to open DetailedStatsSheet |
| `src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx` | Pass new props (score data, sheet handler) to StatsRow |
| `src/components/scorecard/PlayerScoreCard/usePlayerScoreCardLogic.ts` | Add handler for detailed stats update + auto-clear directions |
| `src/services/offline/sync/scorecardSync.ts` | Include new fields in scoresForDb serialization |
| `src/components/rounds/ViewRound/RoundScorecardTab.tsx` | Add bunker/hazard rows + miss direction display on FIR/GIR rows |
| `src/screens/rounds/ViewRoundScreen/index.tsx` | Add "Edit Stats" button + EditStatsModal |
| `src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts` | Add edit stats modal state + handler |

---

## Task 1: Extend HoleScore Types

**Files:**
- Modify: `src/types/database/base.ts:55-64`

- [ ] **Step 1: Add new types and extend HoleScore**

In `src/types/database/base.ts`, add the new types before the `HoleScore` interface and extend it:

```typescript
// Add after HoleShotContributions (after line 48):

/**
 * Direction the tee shot missed the fairway
 */
export type FairwayMissDirection = 'left' | 'right';

/**
 * Direction/distance the approach missed the green
 */
export type GreenMissDirection = 'left' | 'right' | 'long' | 'short';

/**
 * Type of hazard encountered on a hole
 */
export type HazardType = 'water' | 'ob' | 'lateral' | 'lost_ball';

/**
 * A single hazard incident on a hole
 */
export interface HazardEntry {
  type: HazardType;
}
```

Then extend `HoleScore` by adding these fields after `shotContributions`:

```typescript
  /** Direction fairway was missed — only set when fairwayHit is false (par 4+ holes) */
  fairwayMissDirection?: FairwayMissDirection;
  /** Direction green was missed — only set when greenInRegulation is false */
  greenMissDirection?: GreenMissDirection;
  /** Number of bunker shots on this hole (0–5) */
  bunkerShots?: number;
  /** Hazard incidents on this hole (multi-select, one entry per type) */
  hazards?: HazardEntry[];
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No new errors (existing errors may be present).

- [ ] **Step 3: Commit**

```bash
git add src/types/database/base.ts
git commit -m "feat: add detailed shot stats types to HoleScore (miss directions, bunkers, hazards)"
```

---

## Task 2: Update Settings Store

**Files:**
- Modify: `src/store/settingsStore.ts:16-64`

- [ ] **Step 1: Add new settings fields to SettingsState interface**

In `src/store/settingsStore.ts`, add to the `SettingsState` interface (after line 23, after `showGreenInRegulation`):

```typescript
  // Detailed shot stats toggles (Premium — detailed_stats)
  showFairwayMissDirection: boolean;
  showGreenMissDirection: boolean;
  showBunkerShots: boolean;
  showHazards: boolean;
```

Add setters (after line 44, after `setShowGreenInRegulation`):

```typescript
  setShowFairwayMissDirection: (show: boolean) => void;
  setShowGreenMissDirection: (show: boolean) => void;
  setShowBunkerShots: (show: boolean) => void;
  setShowHazards: (show: boolean) => void;
```

- [ ] **Step 2: Add defaults and store implementations**

In `DEFAULT_SETTINGS` (after `showGreenInRegulation: true,`):

```typescript
  showFairwayMissDirection: true,
  showGreenMissDirection: true,
  showBunkerShots: false,
  showHazards: false,
```

In the store creation (after `setShowGreenInRegulation`):

```typescript
      setShowFairwayMissDirection: (show) => set({ showFairwayMissDirection: show }),
      setShowGreenMissDirection: (show) => set({ showGreenMissDirection: show }),
      setShowBunkerShots: (show) => set({ showBunkerShots: show }),
      setShowHazards: (show) => set({ showHazards: show }),
```

- [ ] **Step 3: Update useStatsVisibility hook**

In the `useStatsVisibility` function (line 132), add selectors and return values:

```typescript
export function useStatsVisibility() {
  const showPutts = useSettingsStore((state) => state.showPutts);
  const showFairwayHit = useSettingsStore((state) => state.showFairwayHit);
  const showGreenInRegulation = useSettingsStore((state) => state.showGreenInRegulation);
  const showFairwayMissDirection = useSettingsStore((state) => state.showFairwayMissDirection);
  const showGreenMissDirection = useSettingsStore((state) => state.showGreenMissDirection);
  const showBunkerShots = useSettingsStore((state) => state.showBunkerShots);
  const showHazards = useSettingsStore((state) => state.showHazards);

  return {
    showPutts,
    showFairwayHit,
    showGreenInRegulation,
    showFairwayMissDirection,
    showGreenMissDirection,
    showBunkerShots,
    showHazards,
  };
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/store/settingsStore.ts
git commit -m "feat: add detailed stats settings to settings store"
```

---

## Task 3: Update Stats Visibility With Tier Hook

**Files:**
- Modify: `src/hooks/useStatsVisibilityWithTier.ts`

- [ ] **Step 1: Extend the hook to include new flags**

Replace the full content of `src/hooks/useStatsVisibilityWithTier.ts`:

```typescript
/**
 * Hook to get visibility settings for stats - respects subscription tier
 *
 * FIR/GIR tracking requires Premium tier (fir_gir_tracking).
 * Detailed stats (miss directions, bunkers, hazards) require Premium tier (detailed_stats).
 * Putts are always available.
 *
 * Use this hook in scorecard entry and display components.
 * Use useStatsVisibility() for the Settings screen itself.
 *
 * Extracted from settingsStore to break the require cycle:
 * settingsStore -> SubscriptionContext -> useSubscription -> useAuth -> AuthContext -> settingsStore
 */

import { useSettingsStore } from '@/store/settingsStore';
import { useIsPremium } from '@/context/SubscriptionContext';

export function useStatsVisibilityWithTier() {
  const showPutts = useSettingsStore((state) => state.showPutts);
  const showFairwayHit = useSettingsStore((state) => state.showFairwayHit);
  const showGreenInRegulation = useSettingsStore((state) => state.showGreenInRegulation);
  const showFairwayMissDirection = useSettingsStore((state) => state.showFairwayMissDirection);
  const showGreenMissDirection = useSettingsStore((state) => state.showGreenMissDirection);
  const showBunkerShots = useSettingsStore((state) => state.showBunkerShots);
  const showHazards = useSettingsStore((state) => state.showHazards);
  const isPremium = useIsPremium();

  const effectiveFairwayMissDirection = isPremium && showFairwayMissDirection;
  const effectiveGreenMissDirection = isPremium && showGreenMissDirection;
  const effectiveBunkerShots = isPremium && showBunkerShots;
  const effectiveHazards = isPremium && showHazards;

  return {
    showPutts,
    // FIR/GIR requires Premium - gracefully degrade for lower tiers
    showFairwayHit: isPremium && showFairwayHit,
    showGreenInRegulation: isPremium && showGreenInRegulation,
    // Detailed stats require Premium
    showFairwayMissDirection: effectiveFairwayMissDirection,
    showGreenMissDirection: effectiveGreenMissDirection,
    showBunkerShots: effectiveBunkerShots,
    showHazards: effectiveHazards,
    // Convenience: true if any detailed stat is enabled (controls "+" button visibility)
    hasAnyDetailedStats:
      effectiveFairwayMissDirection ||
      effectiveGreenMissDirection ||
      effectiveBunkerShots ||
      effectiveHazards,
  };
}
```

- [ ] **Step 2: Update the duplicate hook in settingsStore.ts**

The `useStatsVisibilityWithTier` at line 148 of `settingsStore.ts` is a duplicate. Update it to match, or remove it and ensure all imports point to `@/hooks/useStatsVisibilityWithTier`. Check which one is actually imported by consumers:

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && grep -r "useStatsVisibilityWithTier" src/ --include="*.ts" --include="*.tsx" | grep "from" | head -20`

Remove the duplicate from `settingsStore.ts` (lines 148-157) if the standalone hook file is the one imported everywhere. If both are imported, consolidate to the standalone file.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useStatsVisibilityWithTier.ts src/store/settingsStore.ts
git commit -m "feat: extend stats visibility hook with detailed stats flags"
```

---

## Task 4: Add Settings UI Toggles

**Files:**
- Modify: `src/screens/profile/GameSettingsScreen.tsx`

- [ ] **Step 1: Add new store selectors and setters**

In `GameSettingsScreen`, add these after the existing selectors (after line 27):

```typescript
  const showFairwayMissDirection = useSettingsStore((state) => state.showFairwayMissDirection);
  const showGreenMissDirection = useSettingsStore((state) => state.showGreenMissDirection);
  const showBunkerShots = useSettingsStore((state) => state.showBunkerShots);
  const showHazards = useSettingsStore((state) => state.showHazards);
```

And after the existing setters (after line 33):

```typescript
  const setShowFairwayMissDirection = useSettingsStore((state) => state.setShowFairwayMissDirection);
  const setShowGreenMissDirection = useSettingsStore((state) => state.setShowGreenMissDirection);
  const setShowBunkerShots = useSettingsStore((state) => state.setShowBunkerShots);
  const setShowHazards = useSettingsStore((state) => state.setShowHazards);
```

- [ ] **Step 2: Add toggle rows in the settings group**

After the existing GIR `FeatureLockToggle` block (after line 120, before the closing `</View>` of `settingsGroup`), add:

```tsx
            <FeatureLockToggle
              feature="detailed_stats"
              onUpgradePress={() => navigation.navigate('Subscription')}
            >
              <SettingRow
                icon="arrow-left-right"
                label="Fairway Miss Direction"
                description="Track left/right when you miss the fairway"
                value={showFairwayMissDirection}
                onValueChange={setShowFairwayMissDirection}
                colors={colors}
              />
            </FeatureLockToggle>
            <FeatureLockToggle
              feature="detailed_stats"
              onUpgradePress={() => navigation.navigate('Subscription')}
            >
              <SettingRow
                icon="target"
                label="Green Miss Direction"
                description="Track left/right/long/short when you miss the green"
                value={showGreenMissDirection}
                onValueChange={setShowGreenMissDirection}
                colors={colors}
              />
            </FeatureLockToggle>
            <FeatureLockToggle
              feature="detailed_stats"
              onUpgradePress={() => navigation.navigate('Subscription')}
            >
              <SettingRow
                icon="waves"
                label="Bunker Shots"
                description="Track number of bunker shots per hole"
                value={showBunkerShots}
                onValueChange={setShowBunkerShots}
                colors={colors}
              />
            </FeatureLockToggle>
            <FeatureLockToggle
              feature="detailed_stats"
              onUpgradePress={() => navigation.navigate('Subscription')}
            >
              <SettingRow
                icon="alert-triangle"
                label="Hazards"
                description="Track hazard types (water, OB, lateral, lost ball)"
                value={showHazards}
                onValueChange={setShowHazards}
                colors={colors}
              />
            </FeatureLockToggle>
```

- [ ] **Step 3: Verify it renders**

Run the app and navigate to Profile → Game Settings. Verify the 4 new toggles appear below the GIR toggle, each with a lock badge for non-premium users.

- [ ] **Step 4: Commit**

```bash
git add src/screens/profile/GameSettingsScreen.tsx
git commit -m "feat: add detailed stats toggles to game settings screen"
```

---

## Task 5: Create DetailedStatsBadges Component

**Files:**
- Create: `src/components/scorecard/DetailedStatsBadges.tsx`

- [ ] **Step 1: Create the badges component**

Create `src/components/scorecard/DetailedStatsBadges.tsx`:

```typescript
/**
 * DetailedStatsBadges - Summary pills showing entered detailed stats inline on StatsRow
 *
 * Displays compact badges for: fairway miss direction, green miss direction,
 * bunker count, and hazard types. Only shows badges for stats that have data.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { HoleScore } from '@/types/database/base';

const HAZARD_LABELS: Record<string, string> = {
  water: '\u{1F4A7}',
  ob: 'OB',
  lateral: '\u{1F534}',
  lost_ball: '?',
};

interface DetailedStatsBadgesProps {
  score: HoleScore | undefined;
  /** Whether to show fairway miss direction badge */
  showFairwayMissDirection: boolean;
  /** Whether to show green miss direction badge */
  showGreenMissDirection: boolean;
  /** Whether to show bunker badge */
  showBunkerShots: boolean;
  /** Whether to show hazard badges */
  showHazards: boolean;
}

export const DetailedStatsBadges = React.memo(function DetailedStatsBadges({
  score,
  showFairwayMissDirection,
  showGreenMissDirection,
  showBunkerShots,
  showHazards,
}: DetailedStatsBadgesProps) {
  const colors = useThemeColors();

  if (!score) return null;

  const badges: { label: string; color: string; bgColor: string }[] = [];

  // Fairway miss direction
  if (showFairwayMissDirection && score.fairwayHit === false && score.fairwayMissDirection) {
    const dir = score.fairwayMissDirection === 'left' ? '\u2B05 L' : 'R \u27A1';
    badges.push({ label: dir, color: colors.warning, bgColor: colors.warning + '20' });
  }

  // Green miss direction
  if (showGreenMissDirection && score.greenInRegulation === false && score.greenMissDirection) {
    const dirMap = { left: 'L', right: 'R', long: 'Lo', short: 'Sh' };
    badges.push({
      label: dirMap[score.greenMissDirection],
      color: colors.warning,
      bgColor: colors.warning + '20',
    });
  }

  // Bunker shots
  if (showBunkerShots && score.bunkerShots && score.bunkerShots > 0) {
    badges.push({
      label: `${score.bunkerShots}\u{1F3D6}`,
      color: colors.warning,
      bgColor: colors.warning + '20',
    });
  }

  // Hazards
  if (showHazards && score.hazards && score.hazards.length > 0) {
    for (const hazard of score.hazards) {
      badges.push({
        label: HAZARD_LABELS[hazard.type] || hazard.type,
        color: colors.error,
        bgColor: colors.error + '20',
      });
    }
  }

  if (badges.length === 0) return null;

  return (
    <View style={styles.container}>
      {badges.map((badge, index) => (
        <View
          key={index}
          style={[styles.badge, { backgroundColor: badge.bgColor }]}
        >
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/components/scorecard/DetailedStatsBadges.tsx
git commit -m "feat: create DetailedStatsBadges component for inline stat summary pills"
```

---

## Task 6: Create DetailedStatsSheet Component

**Files:**
- Create: `src/components/scorecard/DetailedStatsSheet.tsx`

- [ ] **Step 1: Create the bottom sheet component**

Create `src/components/scorecard/DetailedStatsSheet.tsx`:

```typescript
/**
 * DetailedStatsSheet - Bottom sheet for advanced stats entry
 *
 * Shows fairway miss direction, green miss direction, bunker count,
 * and hazard type selection. Sections conditionally shown based on
 * current hole state and user settings.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { BottomSheet } from '@/components/common';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type {
  HoleScore,
  FairwayMissDirection,
  GreenMissDirection,
  HazardType,
  HazardEntry,
} from '@/types/database/base';

const MAX_BUNKER_SHOTS = 5;

const HAZARD_OPTIONS: { type: HazardType; label: string; icon: string }[] = [
  { type: 'water', label: 'Water', icon: '\u{1F4A7}' },
  { type: 'ob', label: 'OB', icon: '\u{1F6AB}' },
  { type: 'lateral', label: 'Lateral', icon: '\u{1F534}' },
  { type: 'lost_ball', label: 'Lost Ball', icon: '\u{2753}' },
];

interface DetailedStatsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Current hole number for display */
  holeNumber: number;
  /** Player name for display */
  playerName: string;
  /** Current hole score data */
  score: HoleScore | undefined;
  /** Callback with updated stats */
  onStatsUpdate: (updates: Partial<HoleScore>) => void;
  /** Visibility settings */
  showFairwayMissDirection: boolean;
  showGreenMissDirection: boolean;
  showBunkerShots: boolean;
  showHazards: boolean;
}

export function DetailedStatsSheet({
  visible,
  onClose,
  holeNumber,
  playerName,
  score,
  onStatsUpdate,
  showFairwayMissDirection,
  showGreenMissDirection,
  showBunkerShots,
  showHazards,
}: DetailedStatsSheetProps) {
  const colors = useThemeColors();

  // Local state mirrors score data for editing
  const [fairwayDir, setFairwayDir] = useState<FairwayMissDirection | undefined>(
    score?.fairwayMissDirection
  );
  const [greenDir, setGreenDir] = useState<GreenMissDirection | undefined>(
    score?.greenMissDirection
  );
  const [bunkers, setBunkers] = useState(score?.bunkerShots ?? 0);
  const [hazards, setHazards] = useState<HazardEntry[]>(score?.hazards ?? []);

  // Sync local state when score changes (e.g. navigating holes)
  useEffect(() => {
    setFairwayDir(score?.fairwayMissDirection);
    setGreenDir(score?.greenMissDirection);
    setBunkers(score?.bunkerShots ?? 0);
    setHazards(score?.hazards ?? []);
  }, [score]);

  const handleDone = useCallback(() => {
    onStatsUpdate({
      fairwayMissDirection: fairwayDir,
      greenMissDirection: greenDir,
      bunkerShots: bunkers,
      hazards: hazards.length > 0 ? hazards : undefined,
    });
    onClose();
  }, [fairwayDir, greenDir, bunkers, hazards, onStatsUpdate, onClose]);

  const toggleHazard = useCallback((type: HazardType) => {
    setHazards((prev) => {
      const exists = prev.some((h) => h.type === type);
      if (exists) {
        return prev.filter((h) => h.type !== type);
      }
      return [...prev, { type }];
    });
  }, []);

  const toggleFairwayDir = useCallback((dir: FairwayMissDirection) => {
    setFairwayDir((prev) => (prev === dir ? undefined : dir));
  }, []);

  const toggleGreenDir = useCallback((dir: GreenMissDirection) => {
    setGreenDir((prev) => (prev === dir ? undefined : dir));
  }, []);

  // Determine which sections to show
  const showFairwaySection = showFairwayMissDirection && score?.fairwayHit === false;
  const showGreenSection = showGreenMissDirection && score?.greenInRegulation === false;
  const hasAnySections = showFairwaySection || showGreenSection || showBunkerShots || showHazards;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Hole ${holeNumber} \u2014 Advanced Stats`}
      height={0.6}
      showHandle
      showCloseButton
    >
      <View style={styles.content}>
        {!hasAnySections && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No detailed stats to track for this hole
            </Text>
          </View>
        )}

        {/* Fairway Miss Direction */}
        {showFairwaySection && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              FAIRWAY MISS DIRECTION
            </Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { borderColor: colors.border },
                  fairwayDir === 'left' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                ]}
                onPress={() => toggleFairwayDir('left')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.toggleText,
                  { color: fairwayDir === 'left' ? colors.primary : colors.textSecondary },
                ]}>
                  {'\u2B05'} Left
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { borderColor: colors.border },
                  fairwayDir === 'right' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                ]}
                onPress={() => toggleFairwayDir('right')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.toggleText,
                  { color: fairwayDir === 'right' ? colors.primary : colors.textSecondary },
                ]}>
                  Right {'\u27A1'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Green Miss Direction */}
        {showGreenSection && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              GREEN MISS DIRECTION
            </Text>
            <View style={styles.toggleRow}>
              {(['left', 'right', 'long', 'short'] as GreenMissDirection[]).map((dir) => (
                <TouchableOpacity
                  key={dir}
                  style={[
                    styles.toggleButton,
                    styles.toggleButtonSmall,
                    { borderColor: colors.border },
                    greenDir === dir && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => toggleGreenDir(dir)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.toggleText,
                    { color: greenDir === dir ? colors.primary : colors.textSecondary },
                  ]}>
                    {dir.charAt(0).toUpperCase() + dir.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Bunker Shots */}
        {showBunkerShots && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              BUNKER SHOTS
            </Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  bunkers <= 0 && styles.disabled,
                ]}
                onPress={() => setBunkers((prev) => Math.max(0, prev - 1))}
                disabled={bunkers <= 0}
                activeOpacity={0.7}
              >
                <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>{'\u2212'}</Text>
              </TouchableOpacity>
              <View style={styles.stepperDisplay}>
                <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>{bunkers}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  bunkers >= MAX_BUNKER_SHOTS && styles.disabled,
                ]}
                onPress={() => setBunkers((prev) => Math.min(MAX_BUNKER_SHOTS, prev + 1))}
                disabled={bunkers >= MAX_BUNKER_SHOTS}
                activeOpacity={0.7}
              >
                <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Hazards */}
        {showHazards && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              HAZARDS
            </Text>
            <View style={styles.toggleRow}>
              {HAZARD_OPTIONS.map((option) => {
                const isSelected = hazards.some((h) => h.type === option.type);
                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.hazardChip,
                      { borderColor: colors.border },
                      isSelected && { backgroundColor: colors.error + '20', borderColor: colors.error },
                    ]}
                    onPress={() => toggleHazard(option.type)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.toggleText,
                      { color: isSelected ? colors.error : colors.textSecondary },
                    ]}>
                      {option.icon} {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.helperText, { color: colors.textDisabled }]}>
              Tap multiple if more than one hazard on this hole
            </Text>
          </View>
        )}

        {/* Done Button */}
        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={[styles.doneButtonText, { color: colors.textInverse }]}>Done</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonSmall: {
    paddingVertical: spacing.sm,
  },
  toggleText: {
    ...typography.body,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 24,
    fontWeight: '400',
  },
  stepperDisplay: {
    width: 40,
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  hazardChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  doneButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  doneButtonText: {
    ...typography.bodyBold,
  },
  disabled: {
    opacity: 0.4,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/components/scorecard/DetailedStatsSheet.tsx
git commit -m "feat: create DetailedStatsSheet bottom sheet for advanced stats entry"
```

---

## Task 7: Integrate Into StatsRow and PlayerScoreCard

**Files:**
- Modify: `src/components/scorecard/PlayerScoreCard/StatsRow.tsx`
- Modify: `src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx`
- Modify: `src/components/scorecard/PlayerScoreCard/usePlayerScoreCardLogic.ts`

- [ ] **Step 1: Extend StatsRow props and add badges + "+" button**

In `src/components/scorecard/PlayerScoreCard/StatsRow.tsx`, add the import and extend the props:

Add imports:
```typescript
import { DetailedStatsBadges } from '@/components/scorecard/DetailedStatsBadges';
import type { HoleScore } from '@/types/database/base';
```

Extend `StatsRowProps` (add after `disabled?: boolean;`):
```typescript
  /** Full hole score for badges display */
  score?: HoleScore;
  /** Whether to show the "+" button for detailed stats */
  hasAnyDetailedStats?: boolean;
  /** Handler for opening the detailed stats sheet */
  onDetailedStatsPress?: () => void;
  /** Visibility flags for badge display */
  showFairwayMissDirection?: boolean;
  showGreenMissDirection?: boolean;
  showBunkerShots?: boolean;
  showHazards?: boolean;
```

Add the new props to the destructuring in the component function.

After the Putts Counter section (after line 160, before the closing `</View>`), add:

```tsx
      {/* Detailed Stats Badges + "+" Button */}
      {hasAnyDetailedStats && (
        <View style={styles.detailedStatsContainer}>
          <DetailedStatsBadges
            score={score}
            showFairwayMissDirection={showFairwayMissDirection ?? false}
            showGreenMissDirection={showGreenMissDirection ?? false}
            showBunkerShots={showBunkerShots ?? false}
            showHazards={showHazards ?? false}
          />
          <TouchableOpacity
            style={[styles.detailedStatsButton, { backgroundColor: colors.primary + '15' }]}
            onPress={onDetailedStatsPress}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityLabel="Open advanced stats"
            accessibilityRole="button"
          >
            <Text style={[styles.detailedStatsButtonText, { color: colors.primary }]}>+</Text>
          </TouchableOpacity>
        </View>
      )}
```

Add styles:
```typescript
  detailedStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto' as const,
  },
  detailedStatsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailedStatsButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
```

- [ ] **Step 2: Update usePlayerScoreCardLogic to handle detailed stats + auto-clear**

In `src/components/scorecard/PlayerScoreCard/usePlayerScoreCardLogic.ts`:

Update `handleFairwayToggle` (line 89) to auto-clear `fairwayMissDirection` when toggling to hit:

```typescript
  const handleFairwayToggle = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const newValue = singleBallScore?.fairwayHit === true ? false : true;
      // Auto-clear miss direction when toggling to "hit"
      if (newValue === true) {
        onStatsUpdate({ fairwayHit: true, fairwayMissDirection: undefined });
      } else {
        onStatsUpdate({ fairwayHit: false });
      }
    }
  }, [disabled, onStatsUpdate, singleBallScore?.fairwayHit]);
```

Update `handleGIRToggle` (line 96) similarly:

```typescript
  const handleGIRToggle = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const newValue = singleBallScore?.greenInRegulation === true ? false : true;
      // Auto-clear miss direction when toggling to "hit"
      if (newValue === true) {
        onStatsUpdate({ greenInRegulation: true, greenMissDirection: undefined });
      } else {
        onStatsUpdate({ greenInRegulation: false });
      }
    }
  }, [disabled, onStatsUpdate, singleBallScore?.greenInRegulation]);
```

Add a handler for detailed stats sheet updates. Add to the return object:

```typescript
    handleDetailedStatsUpdate: useCallback((updates: Partial<HoleScore>) => {
      if (!disabled && onStatsUpdate) {
        onStatsUpdate(updates);
      }
    }, [disabled, onStatsUpdate]),
```

Import `HoleScore` type if not already imported (it should already be from `@/types`).

- [ ] **Step 3: Update PlayerScoreCard to pass new props and manage sheet state**

In `src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx`:

Add imports:
```typescript
import { DetailedStatsSheet } from '@/components/scorecard/DetailedStatsSheet';
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';
```

Add state for the sheet (inside the component, before the return):
```typescript
  const [showDetailedSheet, setShowDetailedSheet] = useState(false);
  const statsVisibility = useStatsVisibilityWithTier();
```

Add `useState` to the React import if not already there.

Update the StatsRow usage to pass the new props:
```tsx
<StatsRow
  showFIR={showFIR}
  showGIR={showGreenInRegulation}
  showPutts={showPutts}
  fairwayHit={singleBallScore?.fairwayHit}
  greenInRegulation={singleBallScore?.greenInRegulation}
  putts={singleBallScore?.putts}
  onFairwayToggle={handleFairwayToggle}
  onGIRToggle={handleGIRToggle}
  onPuttsDecrement={handlePuttsDecrement}
  onPuttsIncrement={handlePuttsIncrement}
  disabled={disabled}
  score={singleBallScore}
  hasAnyDetailedStats={statsVisibility.hasAnyDetailedStats}
  onDetailedStatsPress={() => setShowDetailedSheet(true)}
  showFairwayMissDirection={statsVisibility.showFairwayMissDirection}
  showGreenMissDirection={statsVisibility.showGreenMissDirection}
  showBunkerShots={statsVisibility.showBunkerShots}
  showHazards={statsVisibility.showHazards}
/>
```

Add the DetailedStatsSheet after the StatsRow (still inside the `showStatsRow` conditional):
```tsx
{statsVisibility.hasAnyDetailedStats && (
  <DetailedStatsSheet
    visible={showDetailedSheet}
    onClose={() => setShowDetailedSheet(false)}
    holeNumber={hole.number}
    playerName={player?.name || 'Player'}
    score={singleBallScore}
    onStatsUpdate={handleDetailedStatsUpdate}
    showFairwayMissDirection={statsVisibility.showFairwayMissDirection}
    showGreenMissDirection={statsVisibility.showGreenMissDirection}
    showBunkerShots={statsVisibility.showBunkerShots}
    showHazards={statsVisibility.showHazards}
  />
)}
```

Get `handleDetailedStatsUpdate` from the logic hook (add to the destructured values from `usePlayerScoreCardLogic`).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/components/scorecard/PlayerScoreCard/StatsRow.tsx \
  src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx \
  src/components/scorecard/PlayerScoreCard/usePlayerScoreCardLogic.ts
git commit -m "feat: integrate detailed stats badges and sheet into score entry UI"
```

---

## Task 8: Update Scorecard Sync to Include New Fields

**Files:**
- Modify: `src/services/offline/sync/scorecardSync.ts:86-111`

- [ ] **Step 1: Extend the scoresForDb type and serialization**

In `src/services/offline/sync/scorecardSync.ts`, update the `scoresForDb` type definition (line 86) to include the new fields:

```typescript
  const scoresForDb: Record<
    string,
    {
      strokes: number;
      putts?: number;
      fairwayHit?: boolean;
      greenInRegulation?: boolean;
      penalties?: number;
      shotContributions?: { drive?: string; approach?: string; putt?: string };
      fairwayMissDirection?: string;
      greenMissDirection?: string;
      bunkerShots?: number;
      hazards?: { type: string }[];
    }
  > = {};
```

Update the serialization loop (line 100) to include new fields:

```typescript
      scoresForDb[String(holeNum)] = {
        strokes: score.strokes,
        putts: score.putts,
        fairwayHit: score.fairwayHit,
        greenInRegulation: score.greenInRegulation,
        penalties: score.penalties || 0,
        // Include shot contributions if present (scramble/shamble formats)
        ...(score.shotContributions && { shotContributions: score.shotContributions }),
        // Include detailed stats if present
        ...(score.fairwayMissDirection && { fairwayMissDirection: score.fairwayMissDirection }),
        ...(score.greenMissDirection && { greenMissDirection: score.greenMissDirection }),
        ...(score.bunkerShots !== undefined && score.bunkerShots > 0 && { bunkerShots: score.bunkerShots }),
        ...(score.hazards && score.hazards.length > 0 && { hazards: score.hazards }),
      };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/services/offline/sync/scorecardSync.ts
git commit -m "feat: include detailed shot stats in scorecard sync to Supabase"
```

---

## Task 9: Update RoundScorecardTab Display

**Files:**
- Modify: `src/components/rounds/ViewRound/RoundScorecardTab.tsx`

- [ ] **Step 1: Extend stat rows with miss direction display + new rows**

In `src/components/rounds/ViewRound/RoundScorecardTab.tsx`:

The `IndividualScorecardView` currently shows FIR row (lines 260-288) with check/X icons. Update the FIR row to include miss direction:

Replace the FIR miss display (line 275, the `fairwayHit === false` branch):

```tsx
                    ) : fairwayHit === false ? (
                      <View style={individualStyles.cellWithDir}>
                        <Icon source="close" size={14} color={colors.error} />
                        {score && isSingleBallScore(score) && score.fairwayMissDirection && (
                          <Text style={[individualStyles.dirText, { color: colors.textDisabled }]}>
                            {score.fairwayMissDirection === 'left' ? 'L' : 'R'}
                          </Text>
                        )}
                      </View>
```

Similarly update the GIR row (line 304, the `greenInRegulation === false` branch):

```tsx
                    ) : greenInRegulation === false ? (
                      <View style={individualStyles.cellWithDir}>
                        <Icon source="close" size={14} color={colors.error} />
                        {score && isSingleBallScore(score) && score.greenMissDirection && (
                          <Text style={[individualStyles.dirText, { color: colors.textDisabled }]}>
                            {{ left: 'L', right: 'R', long: 'Lo', short: 'Sh' }[score.greenMissDirection]}
                          </Text>
                        )}
                      </View>
```

After the GIR row block (after line 318), add Bunkers and Hazards rows. Follow the same pattern as Putts row (lines 235-257):

```tsx
          {/* Bunkers Row */}
          {showBunkerShots && (
            <View style={[individualStyles.row, { backgroundColor: colors.surface }]}>
              <View style={[individualStyles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.labelText, { color: colors.textSecondary }]}>Bnk</Text>
              </View>
              {holeList.map((hole) => {
                const score = scores?.[String(hole.number)];
                const bunkers = score && isSingleBallScore(score) ? score.bunkerShots : undefined;
                return (
                  <View key={hole.number} style={individualStyles.cell}>
                    <Text style={[individualStyles.cellText, { color: bunkers && bunkers > 0 ? colors.warning : colors.textDisabled }]}>
                      {bunkers && bunkers > 0 ? bunkers : '-'}
                    </Text>
                  </View>
                );
              })}
              <View style={[individualStyles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.totalText, { color: colors.textSecondary }]}>
                  {nineBunkers || '-'}
                </Text>
              </View>
            </View>
          )}

          {/* Hazards Row */}
          {showHazards && (
            <View style={[individualStyles.row, { backgroundColor: colors.surface }]}>
              <View style={[individualStyles.labelCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.labelText, { color: colors.textSecondary }]}>Hzd</Text>
              </View>
              {holeList.map((hole) => {
                const score = scores?.[String(hole.number)];
                const hazards = score && isSingleBallScore(score) ? score.hazards : undefined;
                return (
                  <View key={hole.number} style={individualStyles.cell}>
                    <Text style={[individualStyles.cellText, { color: hazards && hazards.length > 0 ? colors.error : colors.textDisabled }]}>
                      {hazards && hazards.length > 0 ? hazards.length : '-'}
                    </Text>
                  </View>
                );
              })}
              <View style={[individualStyles.totalCell, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[individualStyles.totalText, { color: colors.textSecondary }]}>
                  {nineHazards || '-'}
                </Text>
              </View>
            </View>
          )}
```

You will also need to:
1. Add `showBunkerShots` and `showHazards` to the `IndividualScorecardViewProps` interface
2. Get them from `useStatsVisibilityWithTier()` in the parent `RoundScorecardTab` and pass them down
3. Calculate `nineBunkers` and `nineHazards` totals (same pattern as `ninePutts`/`nineFIR`/`nineGIR`)
4. Add `cellWithDir` and `dirText` styles to `individualStyles`

Add styles:
```typescript
  cellWithDir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  dirText: {
    fontSize: 8,
    fontWeight: '600',
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/components/rounds/ViewRound/RoundScorecardTab.tsx
git commit -m "feat: display detailed stats (miss direction, bunkers, hazards) in scorecard table"
```

---

## Task 10: Create useUpdateScorecardStats Mutation Hook

**Files:**
- Create: `src/hooks/scorecard/useUpdateScorecardStats.ts`

- [ ] **Step 1: Create the mutation hook**

Create `src/hooks/scorecard/useUpdateScorecardStats.ts`:

```typescript
/**
 * useUpdateScorecardStats - Mutation hook for updating scorecard stats post-submission
 *
 * Updates the scores JSONB field on an existing scorecard via Supabase.
 * Used by the EditStatsModal for post-submission stats editing.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { HoleScore } from '@/types/database/base';

interface UpdateScorecardStatsParams {
  scorecardId: string;
  scores: Record<string, HoleScore>;
}

export function useUpdateScorecardStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scorecardId, scores }: UpdateScorecardStatsParams) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      const { error } = await (supabase.from('scorecards') as any)
        .update({ scores, updated_at: new Date().toISOString() })
        .eq('id', scorecardId);

      if (error) {
        throw new Error(`Failed to update scorecard stats: ${error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidate round details and scorecard queries to refresh display
      queryClient.invalidateQueries({ queryKey: ['round-details'] });
      queryClient.invalidateQueries({ queryKey: ['scorecards'] });
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/scorecard/useUpdateScorecardStats.ts
git commit -m "feat: create useUpdateScorecardStats mutation hook for post-submission editing"
```

---

## Task 11: Create EditStatsModal Component

**Files:**
- Create: `src/screens/rounds/ViewRoundScreen/EditStatsModal.tsx`

- [ ] **Step 1: Create the full-screen edit stats modal**

Create `src/screens/rounds/ViewRoundScreen/EditStatsModal.tsx`:

```typescript
/**
 * EditStatsModal - Full-screen modal for editing detailed stats post-submission
 *
 * Uses hole navigation (prev/next) to step through each hole.
 * Pre-populates with existing stats from the scorecard.
 * Saves all changes in a single batch via Supabase mutation.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { BottomSheet } from '@/components/common';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';
import { useUpdateScorecardStats } from '@/hooks/scorecard/useUpdateScorecardStats';
import { isSingleBallScore } from '@/types/database/base';
import type { HoleScore, FairwayMissDirection, GreenMissDirection, HazardType, HazardEntry, Hole } from '@/types/database/base';
import type { ScorecardWithPlayer } from '@/hooks/useRoundDetails';

const HAZARD_OPTIONS: { type: HazardType; label: string; icon: string }[] = [
  { type: 'water', label: 'Water', icon: '\u{1F4A7}' },
  { type: 'ob', label: 'OB', icon: '\u{1F6AB}' },
  { type: 'lateral', label: 'Lateral', icon: '\u{1F534}' },
  { type: 'lost_ball', label: 'Lost Ball', icon: '\u{2753}' },
];

interface EditStatsModalProps {
  visible: boolean;
  onClose: () => void;
  scorecard: ScorecardWithPlayer;
  holes: Hole[];
  courseName: string;
}

export function EditStatsModal({
  visible,
  onClose,
  scorecard,
  holes,
  courseName,
}: EditStatsModalProps) {
  const colors = useThemeColors();
  const statsVisibility = useStatsVisibilityWithTier();
  const mutation = useUpdateScorecardStats();

  const [currentHole, setCurrentHole] = useState(1);
  const totalHoles = holes.length || 18;

  // Deep clone scores into local state for editing
  const [editedScores, setEditedScores] = useState<Record<string, HoleScore>>(() => {
    const initial: Record<string, HoleScore> = {};
    for (const [key, value] of Object.entries(scorecard.scores || {})) {
      if (value && isSingleBallScore(value)) {
        initial[key] = { ...value };
      }
    }
    return initial;
  });

  // Track if any changes were made
  const hasChanges = useRef(false);

  const currentScore = editedScores[String(currentHole)];
  const currentHoleData = holes.find((h) => h.number === currentHole);
  const par = currentHoleData?.par ?? 4;

  const updateCurrentHoleStats = useCallback((updates: Partial<HoleScore>) => {
    hasChanges.current = true;
    setEditedScores((prev) => ({
      ...prev,
      [String(currentHole)]: {
        ...prev[String(currentHole)],
        ...updates,
      },
    }));
  }, [currentHole]);

  const handleSaveAll = useCallback(async () => {
    try {
      await mutation.mutateAsync({
        scorecardId: scorecard.id,
        scores: editedScores,
      });
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save stats. Please try again.');
    }
  }, [editedScores, scorecard.id, mutation, onClose]);

  const handleClose = useCallback(() => {
    if (hasChanges.current) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  }, [onClose]);

  const toggleFairwayDir = useCallback((dir: FairwayMissDirection) => {
    const current = currentScore?.fairwayMissDirection;
    updateCurrentHoleStats({ fairwayMissDirection: current === dir ? undefined : dir });
  }, [currentScore, updateCurrentHoleStats]);

  const toggleGreenDir = useCallback((dir: GreenMissDirection) => {
    const current = currentScore?.greenMissDirection;
    updateCurrentHoleStats({ greenMissDirection: current === dir ? undefined : dir });
  }, [currentScore, updateCurrentHoleStats]);

  const toggleHazard = useCallback((type: HazardType) => {
    const existing = currentScore?.hazards ?? [];
    const hasIt = existing.some((h) => h.type === type);
    const updated = hasIt
      ? existing.filter((h) => h.type !== type)
      : [...existing, { type }];
    updateCurrentHoleStats({ hazards: updated.length > 0 ? updated : undefined });
  }, [currentScore, updateCurrentHoleStats]);

  const showFairwaySection =
    statsVisibility.showFairwayMissDirection && currentScore?.fairwayHit === false && par >= 4;
  const showGreenSection =
    statsVisibility.showGreenMissDirection && currentScore?.greenInRegulation === false;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={`Edit Stats \u2014 ${courseName}`}
      height="full"
      showCloseButton
      headerRight={
        <TouchableOpacity onPress={handleSaveAll} disabled={mutation.isPending}>
          <Text style={[styles.saveText, { color: colors.primary }]}>
            {mutation.isPending ? 'Saving...' : 'Save All'}
          </Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.container}>
        {/* Hole Navigator */}
        <View style={[styles.holeNav, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            onPress={() => setCurrentHole((h) => Math.max(1, h - 1))}
            disabled={currentHole <= 1}
            style={[styles.navButton, currentHole <= 1 && styles.disabled]}
          >
            <Icon source="chevron-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.holeInfo}>
            <Text style={[styles.holeNumber, { color: colors.textPrimary }]}>
              Hole {currentHole}
            </Text>
            <Text style={[styles.holeMeta, { color: colors.textSecondary }]}>
              Par {par} {'\u2022'} Score: {currentScore?.strokes ?? '-'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setCurrentHole((h) => Math.min(totalHoles, h + 1))}
            disabled={currentHole >= totalHoles}
            style={[styles.navButton, currentHole >= totalHoles && styles.disabled]}
          >
            <Icon source="chevron-right" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Hole dots indicator */}
        <View style={styles.dotsRow}>
          {Array.from({ length: totalHoles }, (_, i) => i + 1).map((hole) => (
            <TouchableOpacity
              key={hole}
              onPress={() => setCurrentHole(hole)}
              style={[
                styles.dot,
                { backgroundColor: hole === currentHole ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>

        {/* Stats Form */}
        <View style={styles.form}>
          {/* Fairway Miss Direction */}
          {showFairwaySection && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                FAIRWAY MISS DIRECTION
              </Text>
              <View style={styles.toggleRow}>
                {(['left', 'right'] as FairwayMissDirection[]).map((dir) => (
                  <TouchableOpacity
                    key={dir}
                    style={[
                      styles.toggleButton,
                      { borderColor: colors.border },
                      currentScore?.fairwayMissDirection === dir && {
                        backgroundColor: colors.primary + '20',
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => toggleFairwayDir(dir)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        {
                          color:
                            currentScore?.fairwayMissDirection === dir
                              ? colors.primary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {dir === 'left' ? '\u2B05 Left' : 'Right \u27A1'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Green Miss Direction */}
          {showGreenSection && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                GREEN MISS DIRECTION
              </Text>
              <View style={styles.toggleRow}>
                {(['left', 'right', 'long', 'short'] as GreenMissDirection[]).map((dir) => (
                  <TouchableOpacity
                    key={dir}
                    style={[
                      styles.toggleButtonSmall,
                      { borderColor: colors.border },
                      currentScore?.greenMissDirection === dir && {
                        backgroundColor: colors.primary + '20',
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => toggleGreenDir(dir)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        {
                          color:
                            currentScore?.greenMissDirection === dir
                              ? colors.primary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {dir.charAt(0).toUpperCase() + dir.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Bunker Shots */}
          {statsVisibility.showBunkerShots && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                BUNKER SHOTS
              </Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    (currentScore?.bunkerShots ?? 0) <= 0 && styles.disabled,
                  ]}
                  onPress={() =>
                    updateCurrentHoleStats({
                      bunkerShots: Math.max(0, (currentScore?.bunkerShots ?? 0) - 1),
                    })
                  }
                  disabled={(currentScore?.bunkerShots ?? 0) <= 0}
                >
                  <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>{'\u2212'}</Text>
                </TouchableOpacity>
                <View style={styles.stepperDisplay}>
                  <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>
                    {currentScore?.bunkerShots ?? 0}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    (currentScore?.bunkerShots ?? 0) >= 5 && styles.disabled,
                  ]}
                  onPress={() =>
                    updateCurrentHoleStats({
                      bunkerShots: Math.min(5, (currentScore?.bunkerShots ?? 0) + 1),
                    })
                  }
                  disabled={(currentScore?.bunkerShots ?? 0) >= 5}
                >
                  <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Hazards */}
          {statsVisibility.showHazards && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                HAZARDS
              </Text>
              <View style={styles.hazardRow}>
                {HAZARD_OPTIONS.map((option) => {
                  const isSelected = (currentScore?.hazards ?? []).some(
                    (h) => h.type === option.type
                  );
                  return (
                    <TouchableOpacity
                      key={option.type}
                      style={[
                        styles.hazardChip,
                        { borderColor: colors.border },
                        isSelected && {
                          backgroundColor: colors.error + '20',
                          borderColor: colors.error,
                        },
                      ]}
                      onPress={() => toggleHazard(option.type)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          { color: isSelected ? colors.error : colors.textSecondary },
                        ]}
                      >
                        {option.icon} {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.helperText, { color: colors.textDisabled }]}>
                Tap multiple if more than one hazard on this hole
              </Text>
            </View>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  saveText: {
    ...typography.bodyBold,
  },
  holeNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  navButton: {
    padding: spacing.sm,
  },
  holeInfo: {
    alignItems: 'center',
  },
  holeNumber: {
    ...typography.h3,
  },
  holeMeta: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  form: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  toggleButtonSmall: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  toggleText: {
    ...typography.body,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 24,
    fontWeight: '400',
  },
  stepperDisplay: {
    width: 40,
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  hazardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hazardChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  disabled: {
    opacity: 0.4,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/screens/rounds/ViewRoundScreen/EditStatsModal.tsx
git commit -m "feat: create EditStatsModal for post-submission stats editing"
```

---

## Task 12: Integrate EditStatsModal into ViewRoundScreen

**Files:**
- Modify: `src/screens/rounds/ViewRoundScreen/index.tsx`
- Modify: `src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts`

- [ ] **Step 1: Add state and handler to useViewRoundScreen**

In `src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts`, add state for the modal:

Add a `useState` for the modal:
```typescript
const [showEditStatsModal, setShowEditStatsModal] = useState(false);
```

Add to the return object:
```typescript
  showEditStatsModal,
  handleEditStatsOpen: () => setShowEditStatsModal(true),
  handleEditStatsClose: () => setShowEditStatsModal(false),
```

- [ ] **Step 2: Add "Edit Stats" button and modal to ViewRoundScreen index**

In `src/screens/rounds/ViewRoundScreen/index.tsx`:

Add imports:
```typescript
import { EditStatsModal } from './EditStatsModal';
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';
import { FeatureLockCompact } from '@/components/subscription/FeatureLockCompact';
```

Inside the component, get stats visibility:
```typescript
const statsVisibility = useStatsVisibilityWithTier();
```

Find the user's scorecard for the modal:
```typescript
const userScorecard = vm.scorecards?.find((sc) => sc.id === vm.userScorecardId);
```

After the "Tag to League" button block (after line 192), add:

```tsx
      {/* Edit Stats Button */}
      {vm.userScorecardSubmitted && statsVisibility.hasAnyDetailedStats && (
        <View style={[styles.scoreButtonContainer, { backgroundColor: colors.surface }]}>
          <FeatureLockCompact
            feature="detailed_stats"
            onUpgradePress={vm.handleNavigateToSubscription}
          >
            <TouchableOpacity
              style={[styles.tagLeagueButton, { borderColor: colors.primary }]}
              onPress={vm.handleEditStatsOpen}
              activeOpacity={0.8}
              accessibilityLabel="Edit detailed stats"
              accessibilityRole="button"
            >
              <Icon source="chart-bar" size={20} color={colors.primary} />
              <Text style={[styles.scoreButtonText, { color: colors.primary }]}>
                Edit Stats
              </Text>
            </TouchableOpacity>
          </FeatureLockCompact>
        </View>
      )}
```

At the bottom of the component (before the final closing `</View>`), add the modal:

```tsx
      {/* Edit Stats Modal */}
      {userScorecard && (
        <EditStatsModal
          visible={vm.showEditStatsModal}
          onClose={vm.handleEditStatsClose}
          scorecard={userScorecard}
          holes={round.course?.holes || []}
          courseName={round.course?.name || 'Course'}
        />
      )}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/screens/rounds/ViewRoundScreen/index.tsx \
  src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts
git commit -m "feat: integrate Edit Stats button and modal into ViewRoundScreen"
```

---

## Verification Checklist

After all tasks are complete, verify end-to-end:

- [ ] **Settings**: Toggle each stat on/off in Game Settings, verify score entry UI shows/hides the "+" button accordingly
- [ ] **Score Entry — Sheet**: Tap "+", verify enabled stat sections display, enter data, close, verify summary badges update
- [ ] **Score Entry — Auto-clear**: Toggle FIR from miss to hit, verify `fairwayMissDirection` is cleared (badge disappears)
- [ ] **Post-Submission**: Submit a scorecard, navigate to View Round, verify "Edit Stats" button appears
- [ ] **EditStatsModal**: Open modal, navigate through holes, edit stats, save, verify data persists on reload
- [ ] **Scorecard Display**: Check that bunker/hazard rows and miss direction suffixes appear in the scorecard table
- [ ] **Subscription Gating**: With Free tier, verify all new features show lock overlay
- [ ] **Offline Support**: Enter detailed stats offline, verify they sync when reconnecting
- [ ] **No Regression**: Users with no new stats enabled see zero UI changes
