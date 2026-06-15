# Switch Round Tees from Score Entry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the round owner / competition organizer change a player's tee from the hole-by-hole score-entry screen, updating live net/Stableford instantly and persisting the choice.

**Architecture:** The in-memory scorecard store is the source of truth for live scoring, so a new `setPlayerTee` store action updates `playerTeeMap`, recomputes that player's totals, and persists to SQLite — making the header, live scores, GPS auto-tee origins, and the submit snapshot all reflect the new tee immediately. A `useSwitchPlayerTee` mutation writes the override to the DB (`round_players` for standalone, `competition_round_player_tees` for competition) for durability. A new `ChangeTeesSheet` (sharing a `PlayerTeeRow` with the existing post-round `EditTeesSheet`) is opened from an owner/organizer-gated header action. A migration adds a `round_players` owner-update RLS policy so standalone persistence works for all players.

**Tech Stack:** React Native, Zustand, TanStack Query, Supabase (PostgreSQL + RLS), Jest.

**Spec:** `docs/superpowers/specs/2026-06-15-switch-round-tees-from-score-entry-design.md`

---

## File Structure

- **Create** `src/components/common/PlayerTeeRow/index.tsx` — presentational per-player tee-pill row (one player, pick one tee).
- **Modify** `src/components/rounds/ViewRound/EditTeesSheet.tsx` — render `PlayerTeeRow` instead of inlined pill markup (no behavioural change).
- **Create** `src/components/scorecard/ChangeTeesSheet/index.tsx` — store-driven per-player tee sheet for score entry.
- **Modify** `src/components/scorecard/index.ts` — export `ChangeTeesSheet`.
- **Modify** `src/store/scorecardStore.ts` — add `setPlayerTee` action + type.
- **Modify** `src/components/scorecard/RoundHeader.tsx` — add gated "change tees" action icon.
- **Modify** `src/hooks/rounds/mutations.ts` — add `useSwitchPlayerTee`.
- **Modify** `src/screens/scoring/ScorecardEntryScreen/index.tsx` — permission gate + sheet wiring.
- **Create** `supabase/migrations/<ts>_round_players_owner_update.sql` — owner-update RLS policy.
- **Tests:** `src/__tests__/store/scorecardStore.test.ts` (extend), `src/__tests__/hooks/rounds/useSwitchPlayerTee.test.ts` (new).

---

## Task 1: Store action `setPlayerTee`

**Files:**
- Modify: `src/store/scorecardStore.ts`
- Test: `src/__tests__/store/scorecardStore.test.ts`

This action updates the per-player tee, recomputes that player's totals using the new tee's slope/CR (so live net/Stableford change immediately), and persists the updated scorecard to SQLite.

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `src/__tests__/store/scorecardStore.test.ts` (after the existing `getPlayerTotals` block). It initializes a stableford round with a tee that gives the player handicap strokes, then switches to a harder tee and asserts the per-player tee map changed and SQLite persistence was called. Note: with `selectedTeeData` set and `handicapSource: 'profile'`, totals are computed from the tee's daily handicap.

```typescript
describe('setPlayerTee', () => {
  const easyTee = {
    tee_id: 'tee-easy',
    name: 'Red',
    color: 'red',
    slopeRating: 113,
    courseRating: 70,
  };
  const hardTee = {
    tee_id: 'tee-hard',
    name: 'Black',
    color: 'black',
    slopeRating: 140,
    courseRating: 74,
  };

  it('updates playerTeeMap for the player', async () => {
    const store = getStore();
    await store.initializeRound(
      testRoundId,
      testPlayers,
      testHoles,
      'stableford',
      false,
      undefined,
      easyTee,
      'profile'
    );
    const playerId = testPlayers[0].id;

    await getStore().setPlayerTee(playerId, hardTee);

    expect(getStore().getPlayerTee(playerId)).toEqual(hardTee);
  });

  it('persists the updated scorecard to SQLite', async () => {
    const store = getStore();
    await store.initializeRound(
      testRoundId,
      testPlayers,
      testHoles,
      'stableford',
      false,
      undefined,
      easyTee,
      'profile'
    );
    const playerId = testPlayers[0].id;
    (saveScorecard as jest.Mock).mockClear();

    await getStore().setPlayerTee(playerId, hardTee);

    expect(saveScorecard as jest.Mock).toHaveBeenCalled();
  });

  it('recomputes the player totals against the new tee', async () => {
    const store = getStore();
    await store.initializeRound(
      testRoundId,
      testPlayers,
      testHoles,
      'stableford',
      false,
      undefined,
      easyTee,
      'profile'
    );
    const playerId = testPlayers[0].id;
    // Enter a score so there is something to recompute.
    await getStore().setPlayerScore(playerId, 1, 5);
    const before = getStore().getPlayerTotals(playerId);

    await getStore().setPlayerTee(playerId, hardTee);
    const after = getStore().getPlayerTotals(playerId);

    // A harder tee raises the daily handicap → more strokes received →
    // Stableford points for the same gross can only stay equal or rise,
    // and gross is unchanged.
    expect(after.gross).toBe(before.gross);
    expect(after.points).toBeGreaterThanOrEqual(before.points);
  });

  it('does nothing for an unknown player', async () => {
    const store = getStore();
    await store.initializeRound(
      testRoundId,
      testPlayers,
      testHoles,
      'stableford',
      false,
      undefined,
      easyTee,
      'profile'
    );
    (saveScorecard as jest.Mock).mockClear();

    await getStore().setPlayerTee('non-existent-player', hardTee);

    expect(saveScorecard as jest.Mock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/store/scorecardStore.test.ts -t setPlayerTee`
Expected: FAIL — `getStore().setPlayerTee is not a function`.

- [ ] **Step 3: Add `setPlayerTee` to the store type**

In `src/store/scorecardStore.ts`, in the `ScorecardState` interface, add the action signature next to `setSelectedTeeData` (around line 85):

```typescript
  setSelectedTeeData: (teeData: TeeBox | null) => void;
  setPlayerTee: (playerId: string, tee: TeeBox) => Promise<void>;
```

- [ ] **Step 4: Implement `setPlayerTee`**

In `src/store/scorecardStore.ts`, add the implementation immediately after the `setSelectedTeeData` action (after line 197). It clones `playerTeeMap`, recomputes totals via the existing `calculatePlayerTotals`, writes the totals back onto the player's scorecard, updates state, and persists to SQLite using the already-imported `saveScorecard`.

```typescript
    setPlayerTee: async (playerId, tee) => {
      const { groupScorecards, playerTeeMap, holes, gameType, handicapSource } = get();
      const scorecard = groupScorecards.get(playerId);
      if (!scorecard) {
        storeLogger.warn('setPlayerTee: no scorecard for player', {
          playerId: playerId.substring(0, 8) + '...',
        });
        return;
      }

      const nextTeeMap = new Map(playerTeeMap);
      nextTeeMap.set(playerId, tee);

      const totals = calculatePlayerTotals(scorecard, holes, gameType, {
        selectedTee: tee,
        handicapSource,
      });
      const updatedScorecard: Scorecard = {
        ...scorecard,
        totalGross: totals.gross,
        totalNet: totals.net,
        total_par_score: totals.parScore,
        teeData: tee,
        updatedAt: new Date(),
      };

      const nextScorecards = new Map(groupScorecards);
      nextScorecards.set(playerId, updatedScorecard);
      set({ playerTeeMap: nextTeeMap, groupScorecards: nextScorecards });

      try {
        await saveScorecard(updatedScorecard);
        storeLogger.info('Player tee switched', {
          playerId: playerId.substring(0, 8) + '...',
          tee: tee.name,
          slopeRating: tee.slopeRating,
        });
      } catch (error) {
        storeLogger.error('setPlayerTee: failed to persist scorecard', error, {
          playerId: playerId.substring(0, 8) + '...',
        });
      }
    },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- src/__tests__/store/scorecardStore.test.ts -t setPlayerTee`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/store/scorecardStore.ts src/__tests__/store/scorecardStore.test.ts
git commit -m "feat(scoring): add setPlayerTee store action for mid-round tee switch"
```

---

## Task 2: Mutation `useSwitchPlayerTee`

**Files:**
- Modify: `src/hooks/rounds/mutations.ts`
- Test: `src/__tests__/hooks/rounds/useSwitchPlayerTee.test.ts`

Persists the per-player override to the correct table by round type, and best-effort recalculates the differential when a real scorecard with gross already exists.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/hooks/rounds/useSwitchPlayerTee.test.ts`. The test calls the underlying pure async function `switchPlayerTeeAndPersist` (exported from `mutations.ts`) and asserts table routing. Mock Supabase and the competition tee upsert + recalc.

```typescript
import { switchPlayerTeeAndPersist } from '@/hooks/rounds/mutations';
import { supabase } from '@/services/supabase/client';
import { upsertRoundPlayerTee } from '@/services/competitionPlayers/competitionPlayersService';
import { recalculateScorecardDifferential } from '@/services/handicap/recalculateScorecardDifferential';

jest.mock('@/services/competitionPlayers/competitionPlayersService', () => ({
  upsertRoundPlayerTee: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/services/handicap/recalculateScorecardDifferential', () => ({
  recalculateScorecardDifferential: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/services/supabase/client', () => {
  const update = jest.fn(() => ({
    eq: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
  }));
  return { supabase: { from: jest.fn(() => ({ update })) } };
});

const tee = { tee_id: 't1', name: 'Blue', color: 'blue', slopeRating: 120, courseRating: 71 };

describe('switchPlayerTeeAndPersist', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes round_players for standalone rounds', async () => {
    await switchPlayerTeeAndPersist({
      roundId: 'r1',
      playerId: 'p1',
      tee,
    });
    expect(supabase.from).toHaveBeenCalledWith('round_players');
    expect(upsertRoundPlayerTee).not.toHaveBeenCalled();
  });

  it('upserts competition_round_player_tees for competition rounds', async () => {
    await switchPlayerTeeAndPersist({
      roundId: 'r1',
      playerId: 'p1',
      tee,
      competitionId: 'c1',
    });
    expect(upsertRoundPlayerTee).toHaveBeenCalledWith('r1', 'p1', tee);
    expect(supabase.from).not.toHaveBeenCalledWith('round_players');
  });

  it('recalculates when a scorecard id with gross is provided', async () => {
    await switchPlayerTeeAndPersist({
      roundId: 'r1',
      playerId: 'p1',
      tee,
      scorecardId: 'sc1',
    });
    expect(recalculateScorecardDifferential).toHaveBeenCalledWith('sc1');
  });

  it('skips recalculation when no scorecard id is provided', async () => {
    await switchPlayerTeeAndPersist({ roundId: 'r1', playerId: 'p1', tee });
    expect(recalculateScorecardDifferential).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/hooks/rounds/useSwitchPlayerTee.test.ts`
Expected: FAIL — `switchPlayerTeeAndPersist` is not exported.

- [ ] **Step 3: Implement the function and hook**

In `src/hooks/rounds/mutations.ts`, first add the import for the competition tee upsert near the other service imports (after line 24):

```typescript
import { upsertRoundPlayerTee } from '@/services/competitionPlayers/competitionPlayersService';
```

Then add the following after the existing `useUpdatePlayerTee` block (after line 286):

```typescript
// =====================================================
// SWITCH PLAYER TEE (mid-round, from score entry)
// =====================================================

/** Input for switching a player's tee from the score-entry screen. */
export interface SwitchPlayerTeeInput {
  roundId: string;
  playerId: string;
  /** New tee to apply as the per-player override. */
  tee: TeeBox;
  /** Competition id — when set, the override is written to
   *  competition_round_player_tees instead of round_players. */
  competitionId?: string;
  /** Real scorecard id (server UUID). When provided AND the scorecard
   *  already has a gross score, the differential is recalculated. Omit
   *  for players with no scores yet. */
  scorecardId?: string;
}

/**
 * Persist a per-player tee override and (best-effort) recalculate the
 * scorecard differential. Routes the write by round type:
 *   - standalone  → round_players.selected_tee
 *   - competition → competition_round_player_tees.selected_tee
 * Exported for direct unit testing.
 */
export async function switchPlayerTeeAndPersist(input: SwitchPlayerTeeInput): Promise<void> {
  const { roundId, playerId, tee, competitionId, scorecardId } = input;

  if (competitionId) {
    await upsertRoundPlayerTee(roundId, playerId, tee);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed client workaround
    const { error } = await (supabase.from('round_players') as any)
      .update({ selected_tee: tee })
      .eq('round_id', roundId)
      .eq('player_id', playerId);
    if (error) {
      throw new Error(`Failed to update round_players: ${error.message}`);
    }
  }

  // Recalc only when there is a real scorecard to recompute. Mid-round with
  // no scores yet, the live store snapshot drives the eventual submit.
  if (scorecardId) {
    await recalculateScorecardDifferential(scorecardId);
  }
}

/**
 * Mutation hook used by the score-entry ChangeTeesSheet. Owner/organizer
 * changes a player's tee on an in-progress round.
 */
export function useSwitchPlayerTee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: switchPlayerTeeAndPersist,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId: variables.roundId }) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(variables.roundId) });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(variables.roundId) });
      if (variables.competitionId) {
        queryClient.invalidateQueries({ queryKey: leaderboardKeys.competition(variables.competitionId) });
      }
    },
    onError: (error) => {
      console.error('[useSwitchPlayerTee] Failed to switch tee:', error);
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/__tests__/hooks/rounds/useSwitchPlayerTee.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/rounds/mutations.ts src/__tests__/hooks/rounds/useSwitchPlayerTee.test.ts
git commit -m "feat(rounds): add useSwitchPlayerTee mutation for mid-round tee switch"
```

---

## Task 3: Extract shared `PlayerTeeRow` component

**Files:**
- Create: `src/components/common/PlayerTeeRow/index.tsx`
- Modify: `src/components/common/index.ts` (export)

A presentational row: a player's name plus a wrapped set of tee pills; tapping a pill calls `onPick`. This is lifted verbatim from the markup currently inside `EditTeesSheet`'s `playerRows.map(...)` so both sheets share it.

- [ ] **Step 1: Create the component**

```typescript
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { getTeeColor } from '@/screens/rounds/CreateRoundBottomSheet/types';
import type { TeeBox } from '@/types/database/base';

export interface PlayerTeeRowProps {
  playerName: string;
  availableTees: TeeBox[];
  selectedTee: TeeBox | null;
  onPick: (tee: TeeBox) => void;
  disabled?: boolean;
}

export function PlayerTeeRow({
  playerName,
  availableTees,
  selectedTee,
  onPick,
  disabled = false,
}: PlayerTeeRowProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.playerRow, { borderBottomColor: colors.border }]}>
      <Text
        style={[typography.bodyBold, styles.playerName, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {playerName}
      </Text>
      <View style={styles.teePills}>
        {availableTees.map((tee) => {
          const isSelected =
            selectedTee?.tee_id === tee.tee_id ||
            (selectedTee?.name === tee.name && !tee.tee_id);
          const dotColor = getTeeColor(tee.color, colors.textSecondary);
          return (
            <TouchableOpacity
              key={tee.tee_id ?? tee.name}
              style={[
                styles.teePill,
                {
                  backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onPick(tee)}
              activeOpacity={0.7}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`${playerName} ${tee.name} tee`}
              accessibilityState={{ selected: isSelected, disabled }}
            >
              <View
                style={[styles.teeDot, { backgroundColor: dotColor, borderColor: colors.border }]}
              />
              <Text
                style={[
                  styles.teePillText,
                  { color: isSelected ? colors.primary : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {tee.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playerRow: {
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playerName: {
    marginBottom: spacing.sm,
  },
  teePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  teePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  teeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  teePillText: {
    ...typography.caption,
  },
});

export default PlayerTeeRow;
```

- [ ] **Step 2: Export from the common barrel**

Add to `src/components/common/index.ts` (alongside the other exports):

```typescript
export { PlayerTeeRow } from './PlayerTeeRow';
export type { PlayerTeeRowProps } from './PlayerTeeRow';
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm type-check`
Expected: no new type errors referencing `PlayerTeeRow`.

- [ ] **Step 4: Commit**

```bash
git add src/components/common/PlayerTeeRow/index.tsx src/components/common/index.ts
git commit -m "refactor(tees): extract shared PlayerTeeRow component"
```

---

## Task 4: Refactor `EditTeesSheet` to use `PlayerTeeRow`

**Files:**
- Modify: `src/components/rounds/ViewRound/EditTeesSheet.tsx`

Behaviour-preserving: replace the inlined pill markup with `PlayerTeeRow`, keep the disabled-while-pending and save logic.

- [ ] **Step 1: Import `PlayerTeeRow`**

In `src/components/rounds/ViewRound/EditTeesSheet.tsx`, add to the import from `@/components/common` (line 19-20 area). The existing line imports `BottomSheet` from `@/components/common/BottomSheet` and `GolfBallLoader` from `@/components/common`; add `PlayerTeeRow` to the `@/components/common` import:

```typescript
import { GolfBallLoader, PlayerTeeRow } from '@/components/common';
```

- [ ] **Step 2: Replace the row markup**

Replace the entire `playerRows.map((row) => ( ... ))` block (lines 192-243) inside the `ScrollView` with:

```typescript
          {playerRows.map((row) => (
            <PlayerTeeRow
              key={row.scorecardId}
              playerName={row.playerName}
              availableTees={availableTees}
              selectedTee={row.selectedTee}
              onPick={(tee) => handlePickTee(row.playerId, tee)}
              disabled={isPending}
            />
          ))}
```

- [ ] **Step 3: Remove now-dead styles**

Delete the now-unused style keys from the `StyleSheet.create` block: `playerRow`, `playerName`, `teePills`, `teePill`, `teeDot`, `teePillText`. Leave `container`, `title`, `subtitle`, `scrollView`, `scrollContent`, `error`, `actions`, `actionButton`, `actionButtonDisabled`, `emptyContainer`, `closeButton`. Also remove the now-unused `getTeeColor` import (line 24) and the `borderRadius` import if no longer referenced (check: `borderRadius` is still used by `closeButton`/`actionButton` → keep it; `getTeeColor` is no longer used → remove it).

- [ ] **Step 4: Verify type-check and existing behaviour compiles**

Run: `pnpm type-check`
Expected: no errors in `EditTeesSheet.tsx`.

- [ ] **Step 5: Run the EditTees-related tests if any exist**

Run: `pnpm test -- EditTeesSheet 2>/dev/null; pnpm test -- RoundSettings 2>/dev/null || true`
Expected: PASS or "No tests found" (no regressions).

- [ ] **Step 6: Commit**

```bash
git add src/components/rounds/ViewRound/EditTeesSheet.tsx
git commit -m "refactor(tees): EditTeesSheet uses shared PlayerTeeRow"
```

---

## Task 5: `ChangeTeesSheet` for score entry

**Files:**
- Create: `src/components/scorecard/ChangeTeesSheet/index.tsx`
- Modify: `src/components/scorecard/index.ts` (export)

A store-driven sheet listing the scoring group, each with `PlayerTeeRow`. On save it calls `useSwitchPlayerTee` per changed player and, on success, `setPlayerTee` on the store. The caller passes players, the per-player current tee resolver, available tees, and round identity.

- [ ] **Step 1: Create the component**

```typescript
/**
 * ChangeTeesSheet — mid-round per-player tee switch from the score-entry
 * screen. Owner/organizer only (gating handled by the caller). Persists the
 * override to the DB via useSwitchPlayerTee and updates the live store via
 * setPlayerTee so net/Stableford and the header tee dot update immediately.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { GolfBallLoader, PlayerTeeRow } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useSwitchPlayerTee } from '@/hooks/rounds/mutations';
import { useScorecardStore } from '@/store/scorecardStore';
import type { TeeBox } from '@/types/database/base';
import type { Player } from '@/types';

export interface ChangeTeesSheetProps {
  visible: boolean;
  onClose: () => void;
  roundId: string;
  competitionId?: string;
  /** Players in the scoring group. */
  players: Player[];
  /** All selectable tees for the course. */
  availableTees: TeeBox[];
}

export function ChangeTeesSheet({
  visible,
  onClose,
  roundId,
  competitionId,
  players,
  availableTees,
}: ChangeTeesSheetProps) {
  const colors = useThemeColors();
  const { mutateAsync: switchTee, isPending } = useSwitchPlayerTee();
  const getPlayerTee = useScorecardStore((s) => s.getPlayerTee);
  const setPlayerTee = useScorecardStore((s) => s.setPlayerTee);
  const groupScorecards = useScorecardStore((s) => s.groupScorecards);

  const initialSelections = useMemo(() => {
    const map = new Map<string, TeeBox | null>();
    for (const p of players) {
      map.set(p.id, getPlayerTee(p.id));
    }
    return map;
  }, [players, getPlayerTee]);

  const [selections, setSelections] = useState<Map<string, TeeBox | null>>(initialSelections);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelections(initialSelections);
      setErrorMessage(null);
    }
  }, [visible, initialSelections]);

  const handlePick = useCallback((playerId: string, tee: TeeBox) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(playerId, tee);
      return next;
    });
  }, []);

  const changed = useMemo(
    () =>
      players.filter((p) => {
        const initial = initialSelections.get(p.id);
        const current = selections.get(p.id);
        return initial?.tee_id !== current?.tee_id || initial?.name !== current?.name;
      }),
    [players, initialSelections, selections]
  );

  const handleSave = useCallback(async () => {
    setErrorMessage(null);
    if (changed.length === 0) {
      onClose();
      return;
    }
    try {
      for (const player of changed) {
        const tee = selections.get(player.id);
        if (!tee) continue;
        // Real server scorecard id only exists once scores have synced; the
        // store holds a synthetic id, so resolve gross to decide whether to
        // ask for a recalc. We pass scorecardId only when the scorecard has a
        // real (non-synthetic) id, which the store sets after sync.
        const sc = groupScorecards.get(player.id);
        const hasGross = (sc?.totalGross ?? 0) > 0;
        const realScorecardId =
          sc && !sc.id.startsWith('scorecard-') && hasGross ? sc.id : undefined;

        await switchTee({
          roundId,
          competitionId: competitionId && competitionId !== 'standalone' ? competitionId : undefined,
          playerId: player.id,
          tee,
          scorecardId: realScorecardId,
        });
        await setPlayerTee(player.id, tee);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update tees');
    }
  }, [changed, selections, groupScorecards, switchTee, setPlayerTee, roundId, competitionId, onClose]);

  if (availableTees.length === 0) {
    return (
      <BottomSheet visible={visible} onClose={onClose}>
        <View style={styles.emptyContainer}>
          <Text style={[typography.h4, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            No tees available
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            This course doesn&apos;t have tee data.
          </Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surfaceVariant, marginTop: spacing.lg }]}
            onPress={onClose}
          >
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>Change Tees</Text>
        <Text style={[typography.small, styles.subtitle, { color: colors.textSecondary }]}>
          Pick the tee each player is using. Scores update straight away.
        </Text>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {players.map((player) => (
            <PlayerTeeRow
              key={player.id}
              playerName={player.name}
              availableTees={availableTees}
              selectedTee={selections.get(player.id) ?? null}
              onPick={(tee) => handlePick(player.id, tee)}
              disabled={isPending}
            />
          ))}
        </ScrollView>

        {errorMessage && (
          <Text style={[typography.small, styles.error, { color: colors.error }]}>
            {errorMessage}
          </Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
            onPress={onClose}
            disabled={isPending}
          >
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary },
              (changed.length === 0 || isPending) && styles.actionButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={changed.length === 0 || isPending}
          >
            {isPending ? (
              <GolfBallLoader size="sm" />
            ) : (
              <Text style={[typography.bodyBold, { color: colors.textOnColored }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  subtitle: {
    marginBottom: spacing.md,
  },
  scrollView: {
    maxHeight: 360,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  error: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  closeButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
});

export default ChangeTeesSheet;
```

- [ ] **Step 2: Export from the scorecard barrel**

Add to `src/components/scorecard/index.ts`:

```typescript
export { ChangeTeesSheet } from './ChangeTeesSheet';
export type { ChangeTeesSheetProps } from './ChangeTeesSheet';
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm type-check`
Expected: no new errors. (If `colors.textOnColored` is not a palette key, use the same token `EditTeesSheet` uses — confirm by grep: `grep -n "textOnColored" src/components/rounds/ViewRound/EditTeesSheet.tsx`. EditTeesSheet uses `colors.textOnColored`, so it is valid.)

- [ ] **Step 4: Commit**

```bash
git add src/components/scorecard/ChangeTeesSheet/index.tsx src/components/scorecard/index.ts
git commit -m "feat(scoring): add ChangeTeesSheet for mid-round per-player tee switch"
```

---

## Task 6: Header action in `RoundHeader`

**Files:**
- Modify: `src/components/scorecard/RoundHeader.tsx`

Add an optional gated action icon to the header's right content that triggers the sheet (or shows an offline hint).

- [ ] **Step 1: Add props**

In `RoundHeaderProps` (after `showShotLoggingInfo?: boolean;`, line 66), add:

```typescript
  /** When true, show a "change tees" action in the header (owner/organizer). */
  canChangeTees?: boolean;
  /** Called when the change-tees action is tapped while online. */
  onChangeTeesPress?: () => void;
  /** Called when tapped while offline (e.g. to toast a hint). */
  onChangeTeesBlockedOffline?: () => void;
```

- [ ] **Step 2: Destructure the new props**

In the `RoundHeader` function params (after `showShotLoggingInfo = false,`, line 84), add:

```typescript
  canChangeTees = false,
  onChangeTeesPress,
  onChangeTeesBlockedOffline,
```

- [ ] **Step 3: Render the icon**

In `renderRightContent()`, add this `Pressable` as the first child inside the `<View style={styles.rightContent}>` (before the `showShotLoggingInfo` block, around line 150):

```typescript
      {canChangeTees && (
        <Pressable
          onPress={() => {
            if (isOnline) {
              onChangeTeesPress?.();
            } else {
              onChangeTeesBlockedOffline?.();
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Change tees"
          accessibilityState={{ disabled: !isOnline }}
          hitSlop={8}
          style={styles.headerIconButton}
          testID="round-header-change-tees"
        >
          <Icon
            source="golf-tee"
            size={22}
            color={isOnline ? colors.textSecondary : colors.textDisabled}
          />
        </Pressable>
      )}
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm type-check`
Expected: no errors. (`golf-tee` is a Material Community Icon; if type-check or runtime flags it as missing, fall back to `source="cog"`.)

- [ ] **Step 5: Commit**

```bash
git add src/components/scorecard/RoundHeader.tsx
git commit -m "feat(scoring): add gated change-tees action to RoundHeader"
```

---

## Task 7: Wire into `ScorecardEntryScreen`

**Files:**
- Modify: `src/screens/scoring/ScorecardEntryScreen/index.tsx`

Compute the permission gate, hold sheet visibility state, render `ChangeTeesSheet`, and pass the header props.

- [ ] **Step 1: Add imports**

Near the other hook imports (around lines 29-30), add:

```typescript
import { useRoundDetails } from '@/hooks/rounds';
import { useCompetitionInfo } from '@/hooks/competitions';
import { ChangeTeesSheet } from '@/components/scorecard';
```

Confirm `useRoundDetails` is re-exported from `@/hooks/rounds` and `useCompetitionInfo` from `@/hooks/competitions`:
Run: `grep -rn "useRoundDetails" src/hooks/rounds/index.ts; grep -rn "useCompetitionInfo" src/hooks/competitions/index.ts`
If a barrel doesn't re-export, import from the queries module directly: `@/hooks/rounds/queries` / `@/hooks/competitions/queries`.

- [ ] **Step 2: Compute the permission gate + sheet state**

After the existing store destructure and `isStandaloneRound` (the `const isStandaloneRound = competitionId === 'standalone';` line, ~82), add:

```typescript
  const { data: roundDetails } = useRoundDetails(roundId);
  const { data: competitionInfo } = useCompetitionInfo(
    isStandaloneRound ? undefined : competitionId
  );
  const isSuperAdmin = useIsSuperAdmin();
  const [showChangeTeesSheet, setShowChangeTeesSheet] = useState(false);

  const canChangeTees = useMemo(() => {
    if (!user?.id) return false;
    if (isSuperAdmin) return true;
    if (isStandaloneRound) return roundDetails?.user_id === user.id;
    return competitionInfo?.organizer_id === user.id;
  }, [user?.id, isSuperAdmin, isStandaloneRound, roundDetails?.user_id, competitionInfo?.organizer_id]);
```

Note: `useIsSuperAdmin` is already imported at line 28; do not re-import. `useMemo`/`useState` are already imported (line 17).

- [ ] **Step 3: Pass props to `RoundHeader`**

In the `<RoundHeader ... />` JSX (around line 720), add these props after `showShotLoggingInfo`:

```typescript
        canChangeTees={canChangeTees}
        onChangeTeesPress={() => setShowChangeTeesSheet(true)}
        onChangeTeesBlockedOffline={() =>
          toast.show('Connect to the internet to change tees', { type: 'info' })
        }
```

Confirm the toast API: `grep -n "useToast\|const { .*toast\|toast.show\|showToast" src/screens/scoring/ScorecardEntryScreen/index.tsx`. The screen imports `useToast` (line 44). Use whatever method/handle name the screen already destructures (e.g. `toast.show(...)` or `showToast(...)`); match the existing call sites in this file.

- [ ] **Step 4: Render the sheet**

Alongside the other bottom sheets near the end of the screen's JSX (e.g. after `DetailedStatsSheet`, ~line 846), add:

```typescript
      <ChangeTeesSheet
        visible={showChangeTeesSheet}
        onClose={() => setShowChangeTeesSheet(false)}
        roundId={roundId}
        competitionId={isStandaloneRound ? undefined : competitionId}
        players={currentPlayers}
        availableTees={courseTees}
      />
```

`currentPlayers` is already destructured from the store (line ~107) and `courseTees` from `useRoundData` (line ~183).

- [ ] **Step 5: Verify type-check passes**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 6: Run the screen's tests if present**

Run: `pnpm test -- ScorecardEntryScreen 2>/dev/null || true`
Expected: PASS or "No tests found".

- [ ] **Step 7: Commit**

```bash
git add src/screens/scoring/ScorecardEntryScreen/index.tsx
git commit -m "feat(scoring): wire ChangeTeesSheet into score entry, gated to owner/organizer"
```

---

## Task 8: RLS migration — round owner can update `round_players`

**Files:**
- Create: `supabase/migrations/<timestamp>_round_players_owner_update.sql`

Allows the round owner to update participant `round_players` rows (so per-player tee persistence works for all players on standalone rounds). Keeps the existing self-update policy.

- [ ] **Step 1: Determine the timestamp**

Use a timestamp later than the latest existing migration. Check:
Run: `ls supabase/migrations/ | sort | tail -3`
Pick a filename like `20260615000000_round_players_owner_update.sql` (must sort after the newest existing one; bump if a later one exists).

- [ ] **Step 2: Write the migration**

```sql
-- Round owners can update round_players rows for rounds they own.
--
-- Context: the only pre-existing round_players UPDATE policy is
-- "Players can respond to their round invitation" (player_id = auth.uid()),
-- which lets a participant update only their OWN row. The score-entry
-- "change tees" feature needs the round owner to set a per-player tee
-- override (round_players.selected_tee) for ANY participant. Without this
-- policy that update silently affects zero rows under RLS.
--
-- This ADDS an owner policy; the self-update policy remains so participants
-- can still respond to invitations. Mirrors the rounds owner-update pattern.

DROP POLICY IF EXISTS "Round owners can update their round_players" ON round_players;

CREATE POLICY "Round owners can update their round_players"
  ON round_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id
        AND r.user_id = auth.uid()
    )
  );
```

- [ ] **Step 3: Verify SQL applies locally (if local Supabase is available)**

Run: `supabase db reset 2>/dev/null && echo "reset OK" || echo "skip: local supabase not running"`
Expected: either a clean reset, or the skip message (local Supabase is optional; the migration is validated by review + deploy pipeline). Do not block on this step if Supabase isn't running locally.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/*_round_players_owner_update.sql
git commit -m "feat(rls): allow round owners to update round_players (per-player tee)"
```

---

## Task 9: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole project**

Run: `pnpm type-check`
Expected: no errors introduced by this feature.

- [ ] **Step 2: Lint touched files**

Run: `pnpm lint`
Expected: no new lint errors. Fix any in the files this plan created/modified.

- [ ] **Step 3: Run the feature's tests together**

Run: `pnpm test -- src/__tests__/store/scorecardStore.test.ts src/__tests__/hooks/rounds/useSwitchPlayerTee.test.ts`
Expected: PASS.

- [ ] **Step 4: Run the broader scoring test suite to check for regressions**

Run: `pnpm test -- scorecard rounds 2>&1 | tail -30`
Expected: no NEW failures versus the known baseline (the project has pre-existing failures on main — compare against baseline, do not treat pre-existing reds as regressions).

- [ ] **Step 5: Manual smoke (device/simulator)**

Verify in the running app:
1. As round owner/organizer, open a round's score entry → the `golf-tee` icon appears in the header. As a non-owner participant, it does not.
2. Tap it → `ChangeTeesSheet` lists the group. Change a player's tee to a harder one → on save the header tee dot and that player's net/Stableford update immediately.
3. Background the app and reopen the round → the new tee persists.
4. Submit the round → the scorecard reflects the switched tee's handicap.
5. Toggle airplane mode → the header action shows the offline hint instead of opening.

- [ ] **Step 6: Final commit (if any lint/type fixes were made)**

```bash
git add -A
git commit -m "chore(scoring): lint/type fixes for tee-switch feature"
```

---

## Self-Review Notes (coverage map)

- Spec §"Entry point" → Task 6 (header action) + Task 7 (permission gate).
- Spec §"UI ChangeTeesSheet + PlayerTeeRow" → Tasks 3, 4, 5.
- Spec §"Live store update setPlayerTee" → Task 1.
- Spec §"Persistence mutation useSwitchPlayerTee" → Task 2.
- Spec §"RLS migration" → Task 8.
- Spec §"Offline (disabled with hint)" → Task 6 Step 3 + Task 7 Step 3.
- Spec §"Testing" (unit store/mutation/permission) → Tasks 1, 2; permission gate exercised in Task 7/Task 9 manual.
- Spec §"Competition recalc gap" → handled by Task 5 passing `scorecardId` only for real synced scorecards (standalone) and Task 2 skipping recalc otherwise; documented limitation, no task needed.
