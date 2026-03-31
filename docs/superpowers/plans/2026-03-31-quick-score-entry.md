# Quick Score Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow superadmins and competition organizers to quickly enter/edit scores for players, and allow superadmins to create full rounds from league details.

**Architecture:** New `QuickScoreEntryScreen` with scrollable hole list and +/- steppers (matching existing `ScoreInputStepper` pattern). Direct Supabase upsert (no offline/SQLite layer). A `LeagueQuickAddRoundScreen` wizard wraps the same score entry with player/course/tee selection steps. Both screens are permission-gated via `useIsSuperAdmin()` and organizer checks.

**Tech Stack:** React Native, TypeScript, React Navigation, Supabase, React Query, Zustand (subscription store)

**Spec:** `docs/superpowers/specs/2026-03-31-quick-score-entry-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/screens/scoring/QuickScoreEntryScreen/index.tsx` | Main quick score entry screen (hole list + steppers + review modal) |
| `src/screens/scoring/QuickScoreEntryScreen/useQuickScoreEntry.ts` | Hook: data loading, score state, save logic |
| `src/screens/scoring/QuickScoreEntryScreen/QuickScoreHoleRow.tsx` | Single hole row component (hole info + stepper + points) |
| `src/screens/scoring/QuickScoreEntryScreen/QuickScoreReviewModal.tsx` | Review summary modal before save |
| `src/screens/scoring/QuickScoreEntryScreen/QuickScoreTotalsBar.tsx` | Running totals bar (gross, net, points) |
| `src/screens/leagues/LeagueQuickAddRoundScreen/index.tsx` | Wizard: player → course → tee → scores → review |
| `src/screens/leagues/LeagueQuickAddRoundScreen/useLeagueQuickAddRound.ts` | Hook: wizard state, course search, save logic |
| `src/hooks/scorecard/useQuickScoreSubmit.ts` | React Query mutation for direct scorecard upsert to Supabase |

### Modified Files
| File | Change |
|------|--------|
| `src/navigation/types.ts` | Add `QuickScoreEntry` and `LeagueQuickAddRound` route params |
| `src/navigation/RootNavigator.tsx` | Register both new screens |
| `src/screens/rounds/ViewRoundScreen/index.tsx` | Add "Enter Scores" button for admin/organizer |
| `src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts` | Add `isSuperAdmin`, `canQuickEnterScores`, and handler |
| `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundPermissions.ts` | Add `canQuickEnterScores` permission |
| `src/screens/leagues/LeagueDetailScreen/index.tsx` | Add "Add Round" button for superadmins |

---

## Task 1: Navigation & Route Setup

**Files:**
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Add route types**

In `src/navigation/types.ts`, add two new routes inside `RootStackParamList` after the existing `PlayerScorecard` route (around line 53):

```typescript
// Quick Score Entry (admin/organizer backfill)
QuickScoreEntry: {
  roundId: string;
  playerId: string;
  competitionId?: string;
};

// League Quick Add Round (superadmin)
LeagueQuickAddRound: {
  leagueId: string;
};
```

- [ ] **Step 2: Add screen imports and registration in RootNavigator**

In `src/navigation/RootNavigator.tsx`, add imports after the existing scoring screen imports (around line 57):

```typescript
import QuickScoreEntryScreen from '@/screens/scoring/QuickScoreEntryScreen';
import LeagueQuickAddRoundScreen from '@/screens/leagues/LeagueQuickAddRoundScreen';
```

Then register both screens after the `MatchPlayScorecard` screen (after line 403):

```typescript
<Stack.Screen
  name="QuickScoreEntry"
  component={QuickScoreEntryScreen}
  options={{
    title: 'Quick Score Entry',
    headerShown: false,
  }}
/>

<Stack.Screen
  name="LeagueQuickAddRound"
  component={LeagueQuickAddRoundScreen}
  options={{
    title: 'Add Round',
    headerShown: false,
  }}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit 2>&1 | head -20`

Expected: Errors about missing screen component files (we'll create them next). No errors in `types.ts` or `RootNavigator.tsx` imports.

- [ ] **Step 4: Commit**

```bash
git add src/navigation/types.ts src/navigation/RootNavigator.tsx
git commit -m "feat: add QuickScoreEntry and LeagueQuickAddRound routes"
```

---

## Task 2: Score Submit Hook (`useQuickScoreSubmit`)

**Files:**
- Create: `src/hooks/scorecard/useQuickScoreSubmit.ts`

This hook handles the direct Supabase upsert for quick score entry, bypassing the offline/SQLite layer.

- [ ] **Step 1: Create the mutation hook**

Create `src/hooks/scorecard/useQuickScoreSubmit.ts`:

```typescript
/**
 * useQuickScoreSubmit - Direct Supabase scorecard upsert for admin quick entry
 *
 * Bypasses offline/SQLite layer. Designed for admin backfill scenarios
 * where the user is expected to be online.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUser } from '@/services/supabase/client';
import { calculateScoreDifferential } from '@/utils/handicapDifferential';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import type { HoleScore, TeeBox, Hole } from '@/types/database.types';
import type { PlayerGender } from '@/types/database/player.types';
import type { HandicapSource } from '@/types/database/enums';
import { getBaseHandicap, type ScorecardPlayerInfo } from '@/utils/scorecardCalculations';

interface QuickScoreSubmitInput {
  roundId: string;
  playerId: string;
  scores: Record<string, { strokes: number }>;
  totalGross: number;
  totalNet: number;
  totalPoints: number;
  player: ScorecardPlayerInfo;
  selectedTee: TeeBox | null;
  holes: Hole[];
  handicapSource: HandicapSource;
}

interface QuickScoreSubmitResult {
  success: boolean;
  scorecardId?: string;
}

export function useQuickScoreSubmit() {
  const queryClient = useQueryClient();

  return useMutation<QuickScoreSubmitResult, Error, QuickScoreSubmitInput>({
    mutationFn: async (input) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) throw new Error('Not authenticated');

      const {
        roundId, playerId, scores, totalGross, totalNet, totalPoints,
        player, selectedTee, holes, handicapSource,
      } = input;

      // Calculate handicap snapshot
      const coursePar = holes.reduce((sum, h) => sum + h.par, 0);
      const baseHandicap = getBaseHandicap(player, handicapSource);

      let dailyHandicap = baseHandicap;
      let courseRatingUsed: number | null = null;
      let slopeRatingUsed: number | null = null;

      if (handicapSource !== 'none' && selectedTee?.slopeRating && selectedTee?.courseRating && coursePar > 0) {
        const result = calculateGADailyHandicap({
          gaHandicap: baseHandicap,
          slopeRating: selectedTee.slopeRating,
          courseRating: selectedTee.courseRating,
          par: coursePar,
          gender: player.gender,
        });
        dailyHandicap = result.dailyHandicap;
        courseRatingUsed = selectedTee.courseRating;
        slopeRatingUsed = selectedTee.slopeRating;
      }

      // Calculate handicap differential
      let handicapDifferential: number | null = null;
      if (courseRatingUsed && slopeRatingUsed && totalGross > 0) {
        handicapDifferential = calculateScoreDifferential({
          adjustedGrossScore: totalGross,
          courseRating: courseRatingUsed,
          slopeRating: slopeRatingUsed,
        });
      }

      const scorecardData = {
        round_id: roundId,
        player_id: playerId,
        scores,
        total_gross: totalGross,
        total_net: totalNet,
        total_points: totalPoints,
        status: 'completed',
        submitted_at: new Date().toISOString(),
        submitted_by: currentUser.id,
        synced_at: new Date().toISOString(),
        ga_handicap_used: baseHandicap || null,
        daily_handicap_used: dailyHandicap || null,
        handicap_differential: handicapDifferential,
        course_rating_used: courseRatingUsed,
        slope_rating_used: slopeRatingUsed,
      };

      const { error, data } = await (supabase.from('scorecards') as any).upsert(
        scorecardData,
        { onConflict: 'round_id,player_id' }
      ).select('id').single();

      if (error) {
        throw new Error(`Failed to save scorecard: ${error.message}`);
      }

      return { success: true, scorecardId: data?.id };
    },
    onSuccess: (_result, input) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['round', input.roundId] });
      queryClient.invalidateQueries({ queryKey: ['scorecards', input.roundId] });
      queryClient.invalidateQueries({ queryKey: ['roundDetails'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | grep "useQuickScoreSubmit" | head -5`

Expected: No errors from this file (may have errors from missing screen files).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/scorecard/useQuickScoreSubmit.ts
git commit -m "feat: add useQuickScoreSubmit hook for direct scorecard upsert"
```

---

## Task 3: QuickScoreHoleRow Component

**Files:**
- Create: `src/screens/scoring/QuickScoreEntryScreen/QuickScoreHoleRow.tsx`

- [ ] **Step 1: Create the hole row component**

Create `src/screens/scoring/QuickScoreEntryScreen/QuickScoreHoleRow.tsx`:

```typescript
/**
 * QuickScoreHoleRow - Single hole row for quick score entry
 *
 * Displays hole info (number, par, SI) with +/- stepper and score color coding.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { getScoreColor } from '@/utils/scoring';
import { ScaledText } from '@/components/common/ScaledText';

interface QuickScoreHoleRowProps {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  score: number | undefined;
  stablefordPoints: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export const QuickScoreHoleRow = React.memo(function QuickScoreHoleRow({
  holeNumber,
  par,
  strokeIndex,
  score,
  stablefordPoints,
  onIncrement,
  onDecrement,
}: QuickScoreHoleRowProps) {
  const colors = useThemeColors();
  const hasScore = score !== undefined && score > 0;
  const scoreColor = hasScore ? getScoreColor(score, par, colors) : colors.gray400;
  const canDecrement = score !== undefined && score > 1;
  const canIncrement = score === undefined || score < 12;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: hasScore ? colors.surface : 'transparent',
          borderColor: hasScore ? colors.border : colors.gray300,
          borderStyle: hasScore ? 'solid' : 'dashed',
        },
      ]}
    >
      {/* Hole info */}
      <View style={styles.holeInfo}>
        <Text style={[styles.holeNumber, { color: hasScore ? colors.textPrimary : colors.textSecondary }]}>
          {holeNumber}
        </Text>
        <Text style={[styles.holeMeta, { color: colors.textSecondary }]}>
          Par {par} · SI {strokeIndex}
        </Text>
      </View>

      {/* Stepper */}
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.stepperButton, { backgroundColor: colors.surface, borderColor: colors.gray300 }]}
          onPress={onDecrement}
          disabled={!canDecrement}
          activeOpacity={0.7}
        >
          <ScaledText category="critical" style={[styles.stepperButtonText, { color: colors.textPrimary, opacity: canDecrement ? 1 : 0.3 }]}>−</ScaledText>
        </TouchableOpacity>

        <View style={[styles.scoreCircle, { backgroundColor: hasScore ? scoreColor : colors.gray300 }]}>
          <ScaledText category="critical" style={[styles.scoreText, { color: hasScore ? colors.white : colors.textSecondary }]}>
            {score ?? '–'}
          </ScaledText>
        </View>

        <TouchableOpacity
          style={[styles.stepperButton, { backgroundColor: colors.surface, borderColor: colors.gray300 }]}
          onPress={onIncrement}
          disabled={!canIncrement}
          activeOpacity={0.7}
        >
          <ScaledText category="critical" style={[styles.stepperButtonText, { color: colors.textPrimary, opacity: canIncrement ? 1 : 0.3 }]}>+</ScaledText>
        </TouchableOpacity>
      </View>

      {/* Points */}
      <View style={styles.pointsContainer}>
        <Text style={[styles.pointsText, { color: hasScore ? scoreColor : colors.textSecondary }]}>
          {hasScore ? `${stablefordPoints} pts` : '–'}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  holeInfo: {
    width: 70,
  },
  holeNumber: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  holeMeta: {
    ...typography.small,
    fontSize: 11,
  },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 24,
    fontWeight: '400',
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
  },
  pointsContainer: {
    width: 45,
    alignItems: 'flex-end',
  },
  pointsText: {
    ...typography.small,
    fontWeight: '600',
  },
});

export default QuickScoreHoleRow;
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/scoring/QuickScoreEntryScreen/QuickScoreHoleRow.tsx
git commit -m "feat: add QuickScoreHoleRow component"
```

---

## Task 4: QuickScoreTotalsBar & QuickScoreReviewModal

**Files:**
- Create: `src/screens/scoring/QuickScoreEntryScreen/QuickScoreTotalsBar.tsx`
- Create: `src/screens/scoring/QuickScoreEntryScreen/QuickScoreReviewModal.tsx`

- [ ] **Step 1: Create the totals bar**

Create `src/screens/scoring/QuickScoreEntryScreen/QuickScoreTotalsBar.tsx`:

```typescript
/**
 * QuickScoreTotalsBar - Running totals display for quick score entry
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

interface QuickScoreTotalsBarProps {
  totalGross: number;
  totalNet: number;
  totalPoints: number;
  holesEntered: number;
  totalHoles: number;
}

export const QuickScoreTotalsBar = React.memo(function QuickScoreTotalsBar({
  totalGross,
  totalNet,
  totalPoints,
  holesEntered,
  totalHoles,
}: QuickScoreTotalsBarProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.stat}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Gross</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{totalGross || '–'}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Net</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{totalNet || '–'}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Points</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{totalPoints || '–'}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Holes</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{holesEntered}/{totalHoles}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    ...typography.small,
    fontSize: 11,
  },
  value: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});

export default QuickScoreTotalsBar;
```

- [ ] **Step 2: Create the review modal**

Create `src/screens/scoring/QuickScoreEntryScreen/QuickScoreReviewModal.tsx`:

```typescript
/**
 * QuickScoreReviewModal - Summary modal before saving quick-entered scores
 */

import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';

interface QuickScoreReviewModalProps {
  visible: boolean;
  playerName: string;
  courseName: string;
  totalGross: number;
  totalNet: number;
  totalPoints: number;
  holesEntered: number;
  totalHoles: number;
  handicapDifferential?: number | null;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const QuickScoreReviewModal = React.memo(function QuickScoreReviewModal({
  visible,
  playerName,
  courseName,
  totalGross,
  totalNet,
  totalPoints,
  holesEntered,
  totalHoles,
  handicapDifferential,
  isSaving,
  onConfirm,
  onCancel,
}: QuickScoreReviewModalProps) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Review Scores</Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {playerName} · {courseName}
          </Text>

          <View style={[styles.statsGrid, { borderColor: colors.border }]}>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gross Score</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalGross}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Net Score</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalNet}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Stableford Points</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalPoints}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Holes Entered</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{holesEntered}/{totalHoles}</Text>
            </View>
            {handicapDifferential != null && (
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>HC Differential</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{handicapDifferential.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {holesEntered < totalHoles && (
            <Text style={[styles.warning, { color: colors.warning }]}>
              {totalHoles - holesEntered} holes have no score entered. The scorecard will be saved as-is.
            </Text>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onCancel}
              disabled={isSaving}
            >
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 }]}
              onPress={onConfirm}
              disabled={isSaving}
            >
              <Text style={[styles.buttonText, { color: colors.white }]}>
                {isSaving ? 'Saving...' : 'Confirm & Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    ...typography.body,
  },
  statValue: {
    ...typography.bodyBold,
  },
  warning: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    ...typography.bodyBold,
  },
});

export default QuickScoreReviewModal;
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/scoring/QuickScoreEntryScreen/QuickScoreTotalsBar.tsx src/screens/scoring/QuickScoreEntryScreen/QuickScoreReviewModal.tsx
git commit -m "feat: add QuickScoreTotalsBar and QuickScoreReviewModal components"
```

---

## Task 5: useQuickScoreEntry Hook

**Files:**
- Create: `src/screens/scoring/QuickScoreEntryScreen/useQuickScoreEntry.ts`

- [ ] **Step 1: Create the hook**

Create `src/screens/scoring/QuickScoreEntryScreen/useQuickScoreEntry.ts`:

```typescript
/**
 * useQuickScoreEntry - State and logic for QuickScoreEntryScreen
 *
 * Manages score state, calculates totals, and handles save flow.
 */

import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoundDetails } from '@/hooks/useRoundDetails';
import { useQuickScoreSubmit } from '@/hooks/scorecard/useQuickScoreSubmit';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
} from '@/utils/scoring';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { calculateScoreDifferential } from '@/utils/handicapDifferential';
import { getHoleCount } from '@/constants/scoring';
import { getBaseHandicap, type ScorecardPlayerInfo } from '@/utils/scorecardCalculations';
import type { Hole, TeeBox } from '@/types/database.types';
import type { HandicapSource } from '@/types/database/enums';

interface UseQuickScoreEntryParams {
  roundId: string;
  playerId: string;
}

export function useQuickScoreEntry({ roundId, playerId }: UseQuickScoreEntryParams) {
  const navigation = useNavigation();
  const { data: roundData, isLoading } = useRoundDetails(roundId);
  const submitMutation = useQuickScoreSubmit();

  // Score state: { "1": 4, "2": 5, ... }
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showReview, setShowReview] = useState(false);

  // Extract round data
  const round = roundData?.round;
  const course = round?.course;
  const allHoles: Hole[] = useMemo(() => {
    if (!course?.holes || !Array.isArray(course.holes)) return [];
    return course.holes as Hole[];
  }, [course?.holes]);

  const selectedTee: TeeBox | null = round?.selected_tee ?? null;
  const nineType = round?.nine_type ?? 'full';
  const handicapSource: HandicapSource = round?.handicap_source ?? 'profile';

  // Filter holes based on nine_type
  const holes: Hole[] = useMemo(() => {
    if (nineType === 'front9') return allHoles.filter((h) => h.number <= 9);
    if (nineType === 'back9') return allHoles.filter((h) => h.number > 9);
    return allHoles;
  }, [allHoles, nineType]);

  const totalHoles = holes.length;

  // Find the target player from scorecards or round_players
  const player: ScorecardPlayerInfo | null = useMemo(() => {
    if (!roundData) return null;
    // Check scorecards first
    const sc = roundData.scorecards?.find((s) => s.player_id === playerId);
    if (sc?.player) {
      return {
        id: sc.player.id,
        name: sc.player.name,
        handicap: sc.player.handicap,
        handicap_index: sc.player.handicap_index ?? null,
        gender: sc.player.gender ?? null,
      };
    }
    // Check round_players
    const rp = roundData.roundPlayers?.find((p) => p.id === playerId || p.player_id === playerId);
    if (rp) {
      return {
        id: rp.player_id ?? rp.id,
        name: (rp as any).name ?? 'Player',
        handicap: (rp as any).handicap ?? null,
        handicap_index: (rp as any).handicap_index ?? null,
        gender: (rp as any).gender ?? null,
      };
    }
    return null;
  }, [roundData, playerId]);

  // Pre-populate from existing scorecard
  const existingScorecard = useMemo(() => {
    return roundData?.scorecards?.find((s) => s.player_id === playerId);
  }, [roundData?.scorecards, playerId]);

  // Initialize scores from existing scorecard on first load
  useMemo(() => {
    if (existingScorecard?.scores && Object.keys(scores).length === 0) {
      const existing: Record<string, number> = {};
      for (const [holeNum, score] of Object.entries(existingScorecard.scores)) {
        if (score && 'strokes' in score && score.strokes > 0) {
          existing[holeNum] = score.strokes;
        }
      }
      if (Object.keys(existing).length > 0) {
        setScores(existing);
      }
    }
  }, [existingScorecard?.scores]);

  // Calculate daily handicap
  const dailyHandicap = useMemo(() => {
    if (!player || handicapSource === 'none') return 0;
    const baseHandicap = getBaseHandicap(player, handicapSource);
    if (!selectedTee?.slopeRating || !selectedTee?.courseRating) return baseHandicap;
    const coursePar = allHoles.reduce((sum, h) => sum + h.par, 0);
    if (coursePar <= 0) return baseHandicap;
    const result = calculateGADailyHandicap({
      gaHandicap: baseHandicap,
      slopeRating: selectedTee.slopeRating,
      courseRating: selectedTee.courseRating,
      par: coursePar,
      gender: player.gender,
    });
    return result.dailyHandicap;
  }, [player, handicapSource, selectedTee, allHoles]);

  // Calculate per-hole stableford points
  const holePoints = useMemo(() => {
    const points: Record<string, number> = {};
    holes.forEach((hole) => {
      const strokes = scores[String(hole.number)];
      if (strokes && strokes > 0) {
        const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
        points[String(hole.number)] = calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
      } else {
        points[String(hole.number)] = 0;
      }
    });
    return points;
  }, [scores, holes, dailyHandicap]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalGross = 0;
    let totalPoints = 0;
    let holesEntered = 0;

    holes.forEach((hole) => {
      const strokes = scores[String(hole.number)];
      if (strokes && strokes > 0) {
        totalGross += strokes;
        totalPoints += holePoints[String(hole.number)] ?? 0;
        holesEntered++;
      }
    });

    const totalNet = totalGross > 0 ? totalGross - dailyHandicap : 0;

    return { totalGross, totalNet, totalPoints, holesEntered };
  }, [scores, holes, holePoints, dailyHandicap]);

  // Handicap differential for review
  const handicapDifferential = useMemo(() => {
    if (!selectedTee?.courseRating || !selectedTee?.slopeRating || totals.totalGross <= 0) return null;
    return calculateScoreDifferential({
      adjustedGrossScore: totals.totalGross,
      courseRating: selectedTee.courseRating,
      slopeRating: selectedTee.slopeRating,
    });
  }, [selectedTee, totals.totalGross]);

  // Score manipulation
  const incrementScore = useCallback((holeNumber: number) => {
    setScores((prev) => {
      const key = String(holeNumber);
      const current = prev[key];
      if (current !== undefined && current >= 12) return prev;
      return { ...prev, [key]: (current ?? 0) + 1 };
    });
  }, []);

  const decrementScore = useCallback((holeNumber: number) => {
    setScores((prev) => {
      const key = String(holeNumber);
      const current = prev[key];
      if (current === undefined || current <= 1) return prev;
      return { ...prev, [key]: current - 1 };
    });
  }, []);

  // Save
  const handleSave = useCallback(() => {
    if (totals.holesEntered === 0) {
      Alert.alert('No Scores', 'Please enter at least one hole score before saving.');
      return;
    }
    setShowReview(true);
  }, [totals.holesEntered]);

  const handleConfirmSave = useCallback(async () => {
    if (!player) return;

    // Build scores in database format
    const dbScores: Record<string, { strokes: number }> = {};
    for (const [holeNum, strokes] of Object.entries(scores)) {
      if (strokes > 0) {
        dbScores[holeNum] = { strokes };
      }
    }

    try {
      await submitMutation.mutateAsync({
        roundId,
        playerId,
        scores: dbScores,
        totalGross: totals.totalGross,
        totalNet: totals.totalNet,
        totalPoints: totals.totalPoints,
        player,
        selectedTee,
        holes: allHoles,
        handicapSource,
      });
      setShowReview(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save scores');
    }
  }, [player, scores, roundId, playerId, totals, selectedTee, allHoles, handicapSource, submitMutation, navigation]);

  return {
    // Data
    isLoading,
    round,
    course,
    holes,
    player,
    selectedTee,
    totalHoles,

    // Scores
    scores,
    holePoints,
    totals,
    handicapDifferential,
    dailyHandicap,

    // Actions
    incrementScore,
    decrementScore,
    handleSave,
    handleConfirmSave,

    // Review modal
    showReview,
    setShowReview,
    isSaving: submitMutation.isPending,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/scoring/QuickScoreEntryScreen/useQuickScoreEntry.ts
git commit -m "feat: add useQuickScoreEntry hook with score state and calculations"
```

---

## Task 6: QuickScoreEntryScreen

**Files:**
- Create: `src/screens/scoring/QuickScoreEntryScreen/index.tsx`

- [ ] **Step 1: Create the main screen**

Create `src/screens/scoring/QuickScoreEntryScreen/index.tsx`:

```typescript
/**
 * QuickScoreEntryScreen - Admin/organizer score backfill
 *
 * Scrollable hole list with +/- steppers for entering all scores in one view.
 * No offline support, no side-game processing.
 */

import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TouchableOpacity } from 'react-native';

import { useQuickScoreEntry } from './useQuickScoreEntry';
import QuickScoreHoleRow from './QuickScoreHoleRow';
import QuickScoreTotalsBar from './QuickScoreTotalsBar';
import QuickScoreReviewModal from './QuickScoreReviewModal';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickScoreEntry'>;

export default function QuickScoreEntryScreen({ route }: Props) {
  const { roundId, playerId } = route.params;
  const colors = useThemeColors();
  const vm = useQuickScoreEntry({ roundId, playerId });

  if (vm.isLoading || !vm.round) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Quick Score Entry" showBack />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Quick Score Entry"
        subtitle={`${vm.player?.name ?? 'Player'} · ${vm.course?.name ?? 'Course'}`}
        showBack
      />

      {/* Running totals */}
      <QuickScoreTotalsBar
        totalGross={vm.totals.totalGross}
        totalNet={vm.totals.totalNet}
        totalPoints={vm.totals.totalPoints}
        holesEntered={vm.totals.holesEntered}
        totalHoles={vm.totalHoles}
      />

      {/* Hole list */}
      <FlatList
        data={vm.holes}
        keyExtractor={(hole) => String(hole.number)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: hole }) => (
          <QuickScoreHoleRow
            holeNumber={hole.number}
            par={hole.par}
            strokeIndex={hole.strokeIndex}
            score={vm.scores[String(hole.number)]}
            stablefordPoints={vm.holePoints[String(hole.number)] ?? 0}
            onIncrement={() => vm.incrementScore(hole.number)}
            onDecrement={() => vm.decrementScore(hole.number)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Save button */}
      <View style={[styles.saveButtonContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={vm.handleSave}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveButtonText, { color: colors.white }]}>
            Save Scores
          </Text>
        </TouchableOpacity>
      </View>

      {/* Review modal */}
      <QuickScoreReviewModal
        visible={vm.showReview}
        playerName={vm.player?.name ?? 'Player'}
        courseName={vm.course?.name ?? 'Course'}
        totalGross={vm.totals.totalGross}
        totalNet={vm.totals.totalNet}
        totalPoints={vm.totals.totalPoints}
        holesEntered={vm.totals.holesEntered}
        totalHoles={vm.totalHoles}
        handicapDifferential={vm.handicapDifferential}
        isSaving={vm.isSaving}
        onConfirm={vm.handleConfirmSave}
        onCancel={() => vm.setShowReview(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100, // Space for save button
  },
  separator: {
    height: spacing.xs,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadows.md,
  },
  saveButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: May still have errors from unresolved types — fix any issues. The QuickScoreEntry screen should compile cleanly.

- [ ] **Step 3: Commit**

```bash
git add src/screens/scoring/QuickScoreEntryScreen/index.tsx
git commit -m "feat: add QuickScoreEntryScreen with hole list and save flow"
```

---

## Task 7: Add "Enter Scores" Button to ViewRoundScreen

**Files:**
- Modify: `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundPermissions.ts`
- Modify: `src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts`
- Modify: `src/screens/rounds/ViewRoundScreen/index.tsx`

- [ ] **Step 1: Add `canQuickEnterScores` to permissions hook**

In `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundPermissions.ts`, add import and new permission:

Add to imports:
```typescript
import { useIsSuperAdmin } from '@/store/subscriptionStore';
```

Add inside the `useViewRoundPermissions` function, after the existing `canDelete` memo (after line 43):

```typescript
const isSuperAdmin = useIsSuperAdmin();

const canQuickEnterScores = useMemo(() => {
  if (!user?.id) return false;
  if (isSuperAdmin) return true;
  if (isOrganizer) return true;
  return false;
}, [user?.id, isSuperAdmin, isOrganizer]);
```

Add `canQuickEnterScores` to the return object:

```typescript
return {
  isUserPlaying,
  isOrganizer,
  canDelete,
  canTagToLeague,
  userScorecardId,
  canQuickEnterScores,
};
```

- [ ] **Step 2: Wire up in useViewRoundScreen**

In `src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts`, add `canQuickEnterScores` to the return object.

Find the line `canTagToLeague: permissions.canTagToLeague,` (around line 184) and add after it:

```typescript
canQuickEnterScores: permissions.canQuickEnterScores,
```

Also add a handler for navigating to quick score entry. Find `handleTagLeagueSheetClose: handlers.handleTagLeagueSheetClose,` (around line 226) and add after it:

```typescript
handleQuickScoreEntry: (playerId: string) => {
  navigation.navigate('QuickScoreEntry', { roundId, playerId, competitionId });
},
```

- [ ] **Step 3: Add "Enter Scores" button to ViewRoundScreen**

In `src/screens/rounds/ViewRoundScreen/index.tsx`, add the button after the "Tag to League" button section (after line 192, before the Competition Card):

```typescript
{/* Quick Score Entry Button (superadmin / organizer) */}
{vm.canQuickEnterScores && (
  <View style={[styles.scoreButtonContainer, { backgroundColor: colors.surface }]}>
    <TouchableOpacity
      style={[styles.tagLeagueButton, { borderColor: colors.primary }]}
      onPress={() => {
        // Show player picker or navigate directly if there's a single player without a completed scorecard
        const playersWithoutScores = (vm.roundPlayers || []).filter((rp) => {
          const playerScorecard = (vm.scorecards || []).find(
            (sc) => sc.player_id === (rp.player_id ?? rp.id)
          );
          return !playerScorecard || playerScorecard.status === 'not-started' || playerScorecard.status === 'in-progress';
        });
        if (playersWithoutScores.length === 1) {
          vm.handleQuickScoreEntry(playersWithoutScores[0].player_id ?? playersWithoutScores[0].id);
        } else if (playersWithoutScores.length > 0) {
          // For multiple players, navigate to first — can improve to picker later
          vm.handleQuickScoreEntry(playersWithoutScores[0].player_id ?? playersWithoutScores[0].id);
        }
      }}
      activeOpacity={0.8}
    >
      <Icon source="pencil-plus-outline" size={20} color={colors.primary} />
      <Text style={[styles.scoreButtonText, { color: colors.primary }]}>
        Enter Scores
      </Text>
    </TouchableOpacity>
  </View>
)}
```

- [ ] **Step 4: Verify the app compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: Clean compile.

- [ ] **Step 5: Commit**

```bash
git add src/screens/rounds/ViewRoundScreen/hooks/useViewRoundPermissions.ts src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts src/screens/rounds/ViewRoundScreen/index.tsx
git commit -m "feat: add Enter Scores button to ViewRoundScreen for admin/organizer"
```

---

## Task 8: LeagueQuickAddRound Screen & Hook

**Files:**
- Create: `src/screens/leagues/LeagueQuickAddRoundScreen/index.tsx`
- Create: `src/screens/leagues/LeagueQuickAddRoundScreen/useLeagueQuickAddRound.ts`

- [ ] **Step 1: Create the wizard hook**

Create `src/screens/leagues/LeagueQuickAddRoundScreen/useLeagueQuickAddRound.ts`:

```typescript
/**
 * useLeagueQuickAddRound - State and logic for the League Quick Add Round wizard
 *
 * Steps: Select Player → Select Course → Select Tee → Enter Scores → Review
 */

import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUser } from '@/services/supabase/client';
import { useLeaguePlayers } from '@/hooks/useLeagues';
import { useCourseDetails } from '@/hooks/useCourseDetails';
import { useQuickScoreSubmit } from '@/hooks/scorecard/useQuickScoreSubmit';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
} from '@/utils/scoring';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { calculateScoreDifferential } from '@/utils/handicapDifferential';
import { getBaseHandicap, type ScorecardPlayerInfo } from '@/utils/scorecardCalculations';
import type { Hole, TeeBox } from '@/types/database.types';

export type WizardStep = 'player' | 'course' | 'tee' | 'scores' | 'review';

interface UseLeagueQuickAddRoundParams {
  leagueId: string;
}

export function useLeagueQuickAddRound({ leagueId }: UseLeagueQuickAddRoundParams) {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const submitScorecard = useQuickScoreSubmit();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('player');
  const [selectedPlayer, setSelectedPlayer] = useState<ScorecardPlayerInfo | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedTee, setSelectedTee] = useState<TeeBox | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [roundDate, setRoundDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  // Data
  const { data: players } = useLeaguePlayers(leagueId);
  const { data: courseDetails } = useCourseDetails(selectedCourseId ?? '');

  const holes: Hole[] = useMemo(() => {
    if (!courseDetails?.holes || !Array.isArray(courseDetails.holes)) return [];
    return courseDetails.holes as Hole[];
  }, [courseDetails?.holes]);

  const tees: TeeBox[] = useMemo(() => {
    if (!courseDetails?.tees || !Array.isArray(courseDetails.tees)) return [];
    return courseDetails.tees as TeeBox[];
  }, [courseDetails?.tees]);

  // Calculate daily handicap
  const dailyHandicap = useMemo(() => {
    if (!selectedPlayer || !selectedTee?.slopeRating || !selectedTee?.courseRating) return 0;
    const baseHandicap = getBaseHandicap(selectedPlayer, 'profile');
    const coursePar = holes.reduce((sum, h) => sum + h.par, 0);
    if (coursePar <= 0) return baseHandicap;
    const result = calculateGADailyHandicap({
      gaHandicap: baseHandicap,
      slopeRating: selectedTee.slopeRating,
      courseRating: selectedTee.courseRating,
      par: coursePar,
      gender: selectedPlayer.gender,
    });
    return result.dailyHandicap;
  }, [selectedPlayer, selectedTee, holes]);

  // Calculate per-hole stableford points
  const holePoints = useMemo(() => {
    const points: Record<string, number> = {};
    holes.forEach((hole) => {
      const strokes = scores[String(hole.number)];
      if (strokes && strokes > 0) {
        const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
        points[String(hole.number)] = calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
      } else {
        points[String(hole.number)] = 0;
      }
    });
    return points;
  }, [scores, holes, dailyHandicap]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalGross = 0;
    let totalPoints = 0;
    let holesEntered = 0;
    holes.forEach((hole) => {
      const strokes = scores[String(hole.number)];
      if (strokes && strokes > 0) {
        totalGross += strokes;
        totalPoints += holePoints[String(hole.number)] ?? 0;
        holesEntered++;
      }
    });
    const totalNet = totalGross > 0 ? totalGross - dailyHandicap : 0;
    return { totalGross, totalNet, totalPoints, holesEntered };
  }, [scores, holes, holePoints, dailyHandicap]);

  // Handicap differential
  const handicapDifferential = useMemo(() => {
    if (!selectedTee?.courseRating || !selectedTee?.slopeRating || totals.totalGross <= 0) return null;
    return calculateScoreDifferential({
      adjustedGrossScore: totals.totalGross,
      courseRating: selectedTee.courseRating,
      slopeRating: selectedTee.slopeRating,
    });
  }, [selectedTee, totals.totalGross]);

  // Score manipulation
  const incrementScore = useCallback((holeNumber: number) => {
    setScores((prev) => {
      const key = String(holeNumber);
      const current = prev[key];
      if (current !== undefined && current >= 12) return prev;
      return { ...prev, [key]: (current ?? 0) + 1 };
    });
  }, []);

  const decrementScore = useCallback((holeNumber: number) => {
    setScores((prev) => {
      const key = String(holeNumber);
      const current = prev[key];
      if (current === undefined || current <= 1) return prev;
      return { ...prev, [key]: current - 1 };
    });
  }, []);

  // Navigation
  const goToStep = useCallback((nextStep: WizardStep) => setStep(nextStep), []);

  const handleSelectPlayer = useCallback((player: ScorecardPlayerInfo) => {
    setSelectedPlayer(player);
    setStep('course');
  }, []);

  const handleSelectCourse = useCallback((courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedTee(null);
    setScores({});
    setStep('tee');
  }, []);

  const handleSelectTee = useCallback((tee: TeeBox) => {
    setSelectedTee(tee);
    setScores({});
    setStep('scores');
  }, []);

  const handleGoToReview = useCallback(() => {
    if (totals.holesEntered === 0) {
      Alert.alert('No Scores', 'Please enter at least one hole score.');
      return;
    }
    setStep('review');
  }, [totals.holesEntered]);

  // Save: create round + scorecard + league tag
  const handleConfirmSave = useCallback(async () => {
    if (!selectedPlayer || !selectedCourseId || !selectedTee) return;
    setIsSaving(true);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) throw new Error('Not authenticated');

      // 1. Create standalone round
      const { data: roundData, error: roundError } = await (supabase.from('rounds') as any)
        .insert({
          course_id: selectedCourseId,
          user_id: currentUser.id,
          competition_id: null,
          round_number: 1,
          date: roundDate,
          game_type: 'stableford',
          status: 'completed',
          selected_tee: selectedTee,
          scoring_pairs_required: false,
          ball_count: 1,
          is_team_round: false,
          team_format: null,
          nine_type: 'full',
          handicap_source: 'profile',
        })
        .select('id')
        .single();

      if (roundError) throw new Error(`Failed to create round: ${roundError.message}`);
      const roundId = roundData.id;

      // 2. Create scorecard via the submit hook
      const dbScores: Record<string, { strokes: number }> = {};
      for (const [holeNum, strokes] of Object.entries(scores)) {
        if (strokes > 0) {
          dbScores[holeNum] = { strokes };
        }
      }

      await submitScorecard.mutateAsync({
        roundId,
        playerId: selectedPlayer.id,
        scores: dbScores,
        totalGross: totals.totalGross,
        totalNet: totals.totalNet,
        totalPoints: totals.totalPoints,
        player: selectedPlayer,
        selectedTee,
        holes,
        handicapSource: 'profile',
      });

      // 3. Get scorecard ID for league tag
      const { data: scData } = await (supabase.from('scorecards') as any)
        .select('id')
        .eq('round_id', roundId)
        .eq('player_id', selectedPlayer.id)
        .single();

      if (!scData?.id) throw new Error('Scorecard not found after creation');

      // 4. Tag to league
      const { error: tagError } = await (supabase.from('league_rounds') as any)
        .insert({
          league_id: leagueId,
          scorecard_id: scData.id,
          player_id: selectedPlayer.id,
          handicap_differential: handicapDifferential,
        });

      if (tagError) throw new Error(`Failed to tag to league: ${tagError.message}`);

      // Invalidate league caches
      queryClient.invalidateQueries({ queryKey: ['league'] });
      queryClient.invalidateQueries({ queryKey: ['leagueLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['leagueRounds'] });
      queryClient.invalidateQueries({ queryKey: ['myLeagueRounds'] });

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save round');
    } finally {
      setIsSaving(false);
    }
  }, [selectedPlayer, selectedCourseId, selectedTee, scores, totals, roundDate, handicapDifferential, leagueId, holes, submitScorecard, queryClient, navigation]);

  return {
    // Wizard
    step,
    goToStep,

    // Player selection
    players,
    selectedPlayer,
    handleSelectPlayer,

    // Course selection
    selectedCourseId,
    courseDetails,
    handleSelectCourse,

    // Tee selection
    tees,
    selectedTee,
    handleSelectTee,

    // Score entry
    holes,
    scores,
    holePoints,
    totals,
    dailyHandicap,
    handicapDifferential,
    incrementScore,
    decrementScore,
    handleGoToReview,

    // Date
    roundDate,
    setRoundDate,

    // Save
    handleConfirmSave,
    isSaving,
  };
}
```

- [ ] **Step 2: Create the wizard screen**

Create `src/screens/leagues/LeagueQuickAddRoundScreen/index.tsx`:

```typescript
/**
 * LeagueQuickAddRoundScreen - Superadmin wizard to add a round to a league
 *
 * Steps: Player → Course → Tee → Scores → Review
 */

import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Icon, TextInput, Searchbar } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CourseSelectionModal } from '@/screens/admin/AddRoundScreen/components';
import type { TeeBox } from '@/types/database.types';

import { useLeagueQuickAddRound, type WizardStep } from './useLeagueQuickAddRound';
import QuickScoreHoleRow from '@/screens/scoring/QuickScoreEntryScreen/QuickScoreHoleRow';
import QuickScoreTotalsBar from '@/screens/scoring/QuickScoreEntryScreen/QuickScoreTotalsBar';
import QuickScoreReviewModal from '@/screens/scoring/QuickScoreEntryScreen/QuickScoreReviewModal';

type Props = NativeStackScreenProps<RootStackParamList, 'LeagueQuickAddRound'>;

export default function LeagueQuickAddRoundScreen({ route }: Props) {
  const { leagueId } = route.params;
  const colors = useThemeColors();
  const vm = useLeagueQuickAddRound({ leagueId });
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showCourseModal, setShowCourseModal] = useState(false);

  const stepTitles: Record<WizardStep, string> = {
    player: 'Select Player',
    course: 'Select Course',
    tee: 'Select Tee',
    scores: 'Enter Scores',
    review: 'Review',
  };

  const canGoBack = vm.step !== 'player';
  const handleBack = () => {
    const order: WizardStep[] = ['player', 'course', 'tee', 'scores', 'review'];
    const idx = order.indexOf(vm.step);
    if (idx > 0) vm.goToStep(order[idx - 1]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={`Add Round — ${stepTitles[vm.step]}`}
        showBack
        onBack={canGoBack ? handleBack : undefined}
      />

      {/* Step 1: Player Selection */}
      {vm.step === 'player' && (
        <FlatList
          data={vm.players ?? []}
          keyExtractor={(item) => item.player_id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() =>
                vm.handleSelectPlayer({
                  id: item.player_id,
                  name: item.player?.name ?? 'Unknown',
                  handicap: item.player?.handicap ?? null,
                  handicap_index: item.player?.handicap_index ?? null,
                  gender: item.player?.gender ?? null,
                })
              }
            >
              <Text style={[styles.listItemName, { color: colors.textPrimary }]}>
                {item.player?.name ?? 'Unknown'}
              </Text>
              <Text style={[styles.listItemMeta, { color: colors.textSecondary }]}>
                HC: {item.player?.handicap ?? 'N/A'}
              </Text>
              <Icon source="chevron-right" size={20} color={colors.gray400} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No league members found
            </Text>
          }
        />
      )}

      {/* Step 2: Course Selection */}
      {vm.step === 'course' && (
        <View style={styles.stepContent}>
          {/* Date picker */}
          <View style={[styles.dateRow, { borderColor: colors.border }]}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Round Date</Text>
            <TextInput
              mode="outlined"
              value={vm.roundDate}
              onChangeText={vm.setRoundDate}
              placeholder="YYYY-MM-DD"
              style={styles.dateInput}
              dense
            />
          </View>

          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowCourseModal(true)}
          >
            <Icon source="golf" size={24} color={colors.primary} />
            <Text style={[styles.selectButtonText, { color: colors.textPrimary }]}>
              {vm.courseDetails ? vm.courseDetails.name : 'Search for a course...'}
            </Text>
            <Icon source="magnify" size={20} color={colors.gray400} />
          </TouchableOpacity>

          <CourseSelectionModal
            visible={showCourseModal}
            onClose={() => setShowCourseModal(false)}
            onSelect={(course) => {
              setShowCourseModal(false);
              vm.handleSelectCourse(course.id);
            }}
            searchQuery={courseSearchQuery}
            onSearchQueryChange={setCourseSearchQuery}
          />
        </View>
      )}

      {/* Step 3: Tee Selection */}
      {vm.step === 'tee' && (
        <FlatList
          data={vm.tees}
          keyExtractor={(item) => item.id ?? item.name}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => vm.handleSelectTee(item)}
            >
              <View style={[styles.teeColor, { backgroundColor: item.color ?? colors.gray400 }]} />
              <View style={styles.teeInfo}>
                <Text style={[styles.listItemName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.listItemMeta, { color: colors.textSecondary }]}>
                  CR: {item.courseRating ?? '–'} · SR: {item.slopeRating ?? '–'}
                </Text>
              </View>
              <Icon source="chevron-right" size={20} color={colors.gray400} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No tees available for this course
            </Text>
          }
        />
      )}

      {/* Step 4: Score Entry */}
      {vm.step === 'scores' && (
        <>
          <QuickScoreTotalsBar
            totalGross={vm.totals.totalGross}
            totalNet={vm.totals.totalNet}
            totalPoints={vm.totals.totalPoints}
            holesEntered={vm.totals.holesEntered}
            totalHoles={vm.holes.length}
          />
          <FlatList
            data={vm.holes}
            keyExtractor={(hole) => String(hole.number)}
            contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
            renderItem={({ item: hole }) => (
              <QuickScoreHoleRow
                holeNumber={hole.number}
                par={hole.par}
                strokeIndex={hole.strokeIndex}
                score={vm.scores[String(hole.number)]}
                stablefordPoints={vm.holePoints[String(hole.number)] ?? 0}
                onIncrement={() => vm.incrementScore(hole.number)}
                onDecrement={() => vm.decrementScore(hole.number)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          <View style={[styles.saveButtonContainer, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={vm.handleGoToReview}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveButtonText, { color: colors.white }]}>Review & Save</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Step 5: Review */}
      {vm.step === 'review' && (
        <QuickScoreReviewModal
          visible={true}
          playerName={vm.selectedPlayer?.name ?? 'Player'}
          courseName={vm.courseDetails?.name ?? 'Course'}
          totalGross={vm.totals.totalGross}
          totalNet={vm.totals.totalNet}
          totalPoints={vm.totals.totalPoints}
          holesEntered={vm.totals.holesEntered}
          totalHoles={vm.holes.length}
          handicapDifferential={vm.handicapDifferential}
          isSaving={vm.isSaving}
          onConfirm={vm.handleConfirmSave}
          onCancel={() => vm.goToStep('scores')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  listItemName: {
    ...typography.bodyBold,
    flex: 1,
  },
  listItemMeta: {
    ...typography.small,
  },
  teeColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  teeInfo: {
    flex: 1,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  selectButtonText: {
    ...typography.body,
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dateLabel: {
    ...typography.bodyBold,
  },
  dateInput: {
    flex: 1,
    maxWidth: 160,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    padding: spacing.xl,
  },
  separator: {
    height: spacing.xs,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadows.md,
  },
  saveButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: Clean compile or minor type issues to fix.

- [ ] **Step 4: Commit**

```bash
git add src/screens/leagues/LeagueQuickAddRoundScreen/
git commit -m "feat: add LeagueQuickAddRoundScreen wizard for superadmin round creation"
```

---

## Task 9: Add "Add Round" Button to LeagueDetailScreen

**Files:**
- Modify: `src/screens/leagues/LeagueDetailScreen/index.tsx`

- [ ] **Step 1: Add superadmin check and button**

In `src/screens/leagues/LeagueDetailScreen/index.tsx`, add the import:

```typescript
import { useIsSuperAdmin } from '@/store/subscriptionStore';
```

Inside the component function (after `const colors = useThemeColors();` on line 44), add:

```typescript
const isSuperAdmin = useIsSuperAdmin();
```

Then add the "Add Round" button after the `LeagueHeader` component (after line 264, before the `<Tabs>` component):

```typescript
{/* Quick Add Round (superadmin only) */}
{isSuperAdmin && !isArchived && (
  <View style={styles.quickAddContainer}>
    <TouchableOpacity
      style={[styles.quickAddButton, { borderColor: colors.primary }]}
      onPress={() => navigation.navigate('LeagueQuickAddRound', { leagueId })}
      activeOpacity={0.8}
    >
      <Icon source="plus-circle-outline" size={20} color={colors.primary} />
      <Text style={[styles.quickAddText, { color: colors.primary }]}>Add Round for Player</Text>
    </TouchableOpacity>
  </View>
)}
```

Add the `Icon` import if not already present (it's already imported from `react-native-paper` but check).

Add styles to the StyleSheet:

```typescript
quickAddContainer: {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
},
quickAddButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  height: 44,
  borderRadius: borderRadius.lg,
  borderWidth: 1.5,
  gap: spacing.sm,
},
quickAddText: {
  ...typography.bodyBold,
},
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/screens/leagues/LeagueDetailScreen/index.tsx
git commit -m "feat: add 'Add Round for Player' button to LeagueDetailScreen for superadmins"
```

---

## Task 10: End-to-End Verification

- [ ] **Step 1: Run TypeScript check**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && npx tsc --noEmit --pretty 2>&1 | tail -5`

Expected: No errors.

- [ ] **Step 2: Run linter**

Run: `cd "/Users/samkay/Documents/Metis Co/Dev/the-nineteenth" && pnpm lint 2>&1 | tail -10`

Expected: No new lint errors.

- [ ] **Step 3: Test on device - Quick Score Entry from round view**

1. Start the app: `npx expo start`
2. Log in as a superadmin user
3. Navigate to any round with players
4. Verify "Enter Scores" button appears
5. Tap it → QuickScoreEntryScreen opens
6. Enter scores for several holes using +/- steppers
7. Verify totals update live (gross, net, points)
8. Tap "Save Scores" → review modal appears with correct summary
9. Tap "Confirm & Save" → scorecard saves, navigates back
10. Verify scorecard appears in the round's scorecard tab

- [ ] **Step 4: Test on device - League Quick Add Round**

1. Navigate to a league as superadmin
2. Verify "Add Round for Player" button appears below the league header
3. Tap it → LeagueQuickAddRoundScreen wizard opens
4. Select a league member → step advances to course
5. Search and select a course → step advances to tee
6. Select a tee → step advances to score entry
7. Enter all 18 scores
8. Tap "Review & Save" → review modal with correct summary
9. Tap "Confirm & Save" → round created, scorecard created, tagged to league
10. Verify league leaderboard updates with new round

- [ ] **Step 5: Test permissions**

1. Log in as a regular player
2. Navigate to a round → verify "Enter Scores" button is NOT visible
3. Navigate to a league → verify "Add Round for Player" button is NOT visible
4. Log in as a competition organizer
5. Navigate to their competition's round → verify "Enter Scores" IS visible
6. Navigate to another user's round → verify "Enter Scores" is NOT visible

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete quick score entry for admins and organizers"
```
