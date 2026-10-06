# Alt-Shot Derived Contributions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual per-hole shot-contribution entry for alternate-shot rounds with a one-time "who tees first" choice, deriving all contribution stats from that + each hole's stroke count.

**Architecture:** A pure derivation util encodes foursomes alternation (first-tee player tees odd holes, partner even; partners alternate every stroke). The alt-shot scoring card gains a hole-1 first-tee toggle (persisted as hole-1 `teeShot`), drops the manual `ShotContributionSheet`, and shows a derived tally. The competition contributions board derives exact per-player shot counts pair-by-pair using `sub_matches` pairings.

**Tech Stack:** React Native, TypeScript, React Native Paper, Zustand, TanStack Query, Jest.

## Global Constraints

- Alt-shot only — scramble / shamble / best-ball contribution entry must remain unchanged.
- No DB migration. No scoring-logic changes (alt-shot results already ignore contributions).
- The in-round `ContributionLeaderboard` / `useContributionData` is NOT touched (not an alt-shot consumer).
- Persistence anchor: the first-tee choice lives in `shotContributions.teeShot` on hole 1 of the pair's ball; fallback to `members[0]` when unset.
- Styling: `useThemeColors()` for colours; import `spacing`/`typography`/`borderRadius`/`shadows` from `@/constants/theme`.
- Tee convention: first-tee player tees ODD holes; partner tees EVEN holes.
- Derivation buckets: `drives` = stroke 1 (tee), `putts` = final holing stroke (only when strokes ≥ 2), `approaches` = strokes in between. Per-player `total` = physical strokes hit.
- Pickup sentinel `99` and missing/0 strokes derive to all-zero counts.

---

## Phase 1 — Core scoring UX (Tasks 1–4)

### Task 1: Alt-shot derivation util

**Files:**
- Create: `src/utils/teamScoring/altShotContributions.ts`
- Test: `src/utils/teamScoring/altShotContributions.test.ts`
- Modify: `src/utils/teamScoring/index.ts` (add exports after line 44)

**Interfaces:**
- Produces:
  - `interface AltShotHoleBreakdown { drives: number; approaches: number; putts: number; total: number }`
  - `altShotTeePlayer(firstTeePlayerId: string, partnerPlayerId: string, holeNumber: number): string`
  - `deriveAltShotShotCounts(firstTeePlayerId: string, partnerPlayerId: string, holeNumber: number, strokes: number | undefined, pickupScore?: number): Record<string, AltShotHoleBreakdown>`

- [ ] **Step 1: Write the failing test**

Create `src/utils/teamScoring/altShotContributions.test.ts`:

```typescript
import { altShotTeePlayer, deriveAltShotShotCounts } from './altShotContributions';

const A = 'player-a';
const B = 'player-b';

describe('altShotTeePlayer', () => {
  it('first-tee player tees odd holes, partner tees even holes', () => {
    expect(altShotTeePlayer(A, B, 1)).toBe(A);
    expect(altShotTeePlayer(A, B, 2)).toBe(B);
    expect(altShotTeePlayer(A, B, 17)).toBe(A);
    expect(altShotTeePlayer(A, B, 18)).toBe(B);
  });
});

describe('deriveAltShotShotCounts', () => {
  it('returns all-zero when strokes is missing, zero, or a pickup', () => {
    for (const strokes of [undefined, 0, 99]) {
      const r = deriveAltShotShotCounts(A, B, 1, strokes);
      expect(r[A]).toEqual({ drives: 0, approaches: 0, putts: 0, total: 0 });
      expect(r[B]).toEqual({ drives: 0, approaches: 0, putts: 0, total: 0 });
    }
  });

  it('odd hole, 4 strokes: tee player drives+approach, partner approach+putt', () => {
    // hole 1 -> A tees. strokes: 1=A(drive) 2=B(appr) 3=A(appr) 4=B(putt)
    const r = deriveAltShotShotCounts(A, B, 1, 4);
    expect(r[A]).toEqual({ drives: 1, approaches: 1, putts: 0, total: 2 });
    expect(r[B]).toEqual({ drives: 0, approaches: 1, putts: 1, total: 2 });
  });

  it('odd hole, 3 strokes: tee player takes the putt (odd final stroke)', () => {
    // hole 3 -> A tees. 1=A(drive) 2=B(appr) 3=A(putt)
    const r = deriveAltShotShotCounts(A, B, 3, 3);
    expect(r[A]).toEqual({ drives: 1, approaches: 0, putts: 1, total: 2 });
    expect(r[B]).toEqual({ drives: 0, approaches: 1, putts: 0, total: 1 });
  });

  it('even hole, 4 strokes: partner is the tee player', () => {
    // hole 2 -> B tees. 1=B(drive) 2=A(appr) 3=B(appr) 4=A(putt)
    const r = deriveAltShotShotCounts(A, B, 2, 4);
    expect(r[B]).toEqual({ drives: 1, approaches: 1, putts: 0, total: 2 });
    expect(r[A]).toEqual({ drives: 0, approaches: 1, putts: 1, total: 2 });
  });

  it('ace (1 stroke): tee player gets a drive only, no putt', () => {
    const r = deriveAltShotShotCounts(A, B, 1, 1);
    expect(r[A]).toEqual({ drives: 1, approaches: 0, putts: 0, total: 1 });
    expect(r[B]).toEqual({ drives: 0, approaches: 0, putts: 0, total: 0 });
  });

  it('2 strokes: tee drive then partner putt', () => {
    const r = deriveAltShotShotCounts(A, B, 1, 2);
    expect(r[A]).toEqual({ drives: 1, approaches: 0, putts: 0, total: 1 });
    expect(r[B]).toEqual({ drives: 0, approaches: 0, putts: 1, total: 1 });
  });

  it('per-player total equals ceil/floor of strokes', () => {
    const r = deriveAltShotShotCounts(A, B, 1, 7); // A tees: A=4, B=3
    expect(r[A].total).toBe(4);
    expect(r[B].total).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx jest src/utils/teamScoring/altShotContributions.test.ts`
Expected: FAIL — "Cannot find module './altShotContributions'".

- [ ] **Step 3: Implement the util**

Create `src/utils/teamScoring/altShotContributions.ts`:

```typescript
/**
 * Alternate-shot (foursomes) contribution derivation.
 *
 * In alt shot the player who tees the 1st hole tees all ODD holes; their
 * partner tees all EVEN holes. Within a hole the partners strictly alternate
 * every stroke until the ball is holed. So given who tees first and a hole's
 * stroke count, every shot's owner is fully determined — no manual entry needed.
 */

export interface AltShotHoleBreakdown {
  drives: number;
  approaches: number;
  putts: number;
  total: number;
}

const PICKUP_SCORE = 99;

/** Which player tees off on a given hole. First-tee = odd holes, partner = even. */
export function altShotTeePlayer(
  firstTeePlayerId: string,
  partnerPlayerId: string,
  holeNumber: number,
): string {
  return holeNumber % 2 === 1 ? firstTeePlayerId : partnerPlayerId;
}

/**
 * Per-player shot counts for one alt-shot hole, by strict alternation.
 * - drives: stroke 1 (the tee shot)
 * - putts: the final holing stroke (only when strokes >= 2)
 * - approaches: the strokes in between
 * Returns all-zero counts when strokes is missing, <= 0, or a pickup.
 */
export function deriveAltShotShotCounts(
  firstTeePlayerId: string,
  partnerPlayerId: string,
  holeNumber: number,
  strokes: number | undefined,
  pickupScore: number = PICKUP_SCORE,
): Record<string, AltShotHoleBreakdown> {
  const result: Record<string, AltShotHoleBreakdown> = {
    [firstTeePlayerId]: { drives: 0, approaches: 0, putts: 0, total: 0 },
    [partnerPlayerId]: { drives: 0, approaches: 0, putts: 0, total: 0 },
  };

  if (!strokes || strokes <= 0 || strokes === pickupScore) {
    return result;
  }

  const teePlayer = altShotTeePlayer(firstTeePlayerId, partnerPlayerId, holeNumber);
  const otherPlayer = teePlayer === firstTeePlayerId ? partnerPlayerId : firstTeePlayerId;

  for (let stroke = 1; stroke <= strokes; stroke++) {
    const owner = stroke % 2 === 1 ? teePlayer : otherPlayer;
    const bd = result[owner];
    bd.total += 1;
    if (stroke === 1) bd.drives += 1;
    else if (stroke === strokes) bd.putts += 1;
    else bd.approaches += 1;
  }

  return result;
}
```

- [ ] **Step 4: Add barrel exports**

In `src/utils/teamScoring/index.ts`, immediately after line 44 (`export { getShotSlotsForPar } from './shotSlots';`) add:

```typescript

// Alt-shot derived contributions
export { altShotTeePlayer, deriveAltShotShotCounts } from './altShotContributions';
export type { AltShotHoleBreakdown } from './altShotContributions';
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx jest src/utils/teamScoring/altShotContributions.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add src/utils/teamScoring/altShotContributions.ts src/utils/teamScoring/altShotContributions.test.ts src/utils/teamScoring/index.ts
git commit -m "feat(scoring): alt-shot contribution derivation util"
```

---

### Task 2: Make shot-sheet params optional in useTeamScoreControls

The alt-shot card will stop rendering the `ShotContributionSheet`, so it no longer needs to supply `activeShotType` / `setActiveShotType` / `slideAnim`. Make them optional so the card can omit them without affecting `TeamScoreCard` (scramble), which still passes them.

**Files:**
- Modify: `src/components/scorecard/TeamScoreCard/hooks/useTeamScoreControls.ts:55-57, 153-197`

- [ ] **Step 1: Make the three params optional**

In `useTeamScoreControls.ts`, change the params interface (lines 55-57) from:

```typescript
  activeShotType: ShotSlot | null;
  setActiveShotType: (type: ShotSlot | null) => void;
  slideAnim: Animated.Value;
```

to:

```typescript
  activeShotType?: ShotSlot | null;
  setActiveShotType?: (type: ShotSlot | null) => void;
  slideAnim?: Animated.Value;
```

- [ ] **Step 2: Guard the handlers that use them**

Replace `handleShotSelect` (lines 153-167) with:

```typescript
  const handleShotSelect = useCallback((shotType: ShotSlot, playerId: string | undefined) => {
    if (!onShotContributionsChange) return;
    onShotContributionsChange({
      ...shotContributions,
      [shotType]: playerId,
    });
    // Animate the close
    if (slideAnim) {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setActiveShotType?.(null);
      });
    } else {
      setActiveShotType?.(null);
    }
  }, [onShotContributionsChange, shotContributions, slideAnim, setActiveShotType]);
```

Replace `handleCloseModal` (lines 189-197) with:

```typescript
  const handleCloseModal = useCallback(() => {
    if (slideAnim) {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setActiveShotType?.(null);
      });
    } else {
      setActiveShotType?.(null);
    }
  }, [slideAnim, setActiveShotType]);
```

- [ ] **Step 3: Verify type-check + scramble tests still pass**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep useTeamScoreControls || echo "clean"`
Expected: `clean`

Run: `npx jest src/components/scorecard/TeamScoreCard 2>&1 | grep -E "Tests:|Test Suites:"`
Expected: existing TeamScoreCard tests pass (no regressions).

- [ ] **Step 4: Commit**

```bash
git add src/components/scorecard/TeamScoreCard/hooks/useTeamScoreControls.ts
git commit -m "refactor(scoring): make shot-sheet params optional in useTeamScoreControls"
```

---

### Task 3: AltShotScoreCard — first-tee toggle, derived tally, drop manual sheet

**Files:**
- Modify: `src/components/scorecard/AltShotScoreCard/AltShotScoreCard.tsx` (full rewrite below)
- Test: `src/components/scorecard/AltShotScoreCard/AltShotScoreCard.test.tsx` (update)

**Interfaces:**
- Consumes: `deriveAltShotShotCounts`, `altShotTeePlayer` from `@/utils/teamScoring` (Task 1); `useTeamScoreControls` with optional shot params (Task 2).
- Produces: `AltShotScoreCardProps` now includes `firstTeePlayerId?: string`.

- [ ] **Step 1: Update the existing test first**

Open `src/components/scorecard/AltShotScoreCard/AltShotScoreCard.test.tsx`. The current test asserts on the `ShotContributionSheet`/slot tally. Replace its body so it covers the new behaviour. Use this as the test (adjust imports to match the file's existing test helpers/render setup if they differ — keep the existing `render` import and any existing mock for `useThemeColors`):

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AltShotScoreCard } from './AltShotScoreCard';
import type { Hole, HoleScore } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';

const HOLE: Hole = { number: 1, par: 4, strokeIndex: 5 } as Hole;

const team: TeamWithMembers = {
  id: 'team-1',
  name: 'Pair 1',
  color: null,
  members: [
    { player_id: 'a', player: { id: 'a', name: 'Alice', handicap: 10 } },
    { player_id: 'b', player: { id: 'b', name: 'Bob', handicap: 12 } },
  ],
} as unknown as TeamWithMembers;

describe('AltShotScoreCard (derived contributions)', () => {
  it('shows the first-tee toggle on hole 1 and writes hole-1 teeShot on select', () => {
    const onShotContributionsChange = jest.fn();
    const { getByText } = render(
      <AltShotScoreCard
        team={team}
        currentHole={HOLE}
        currentScore={{ strokes: 4 } as HoleScore}
        onScoreSelect={jest.fn()}
        onShotContributionsChange={onShotContributionsChange}
        firstTeePlayerId="a"
      />,
    );

    // Toggle visible on hole 1
    fireEvent.press(getByText('Bob'));
    expect(onShotContributionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ teeShot: 'b' }),
    );
  });

  it('does not show the first-tee toggle after hole 1', () => {
    const { queryByText } = render(
      <AltShotScoreCard
        team={team}
        currentHole={{ number: 5, par: 4, strokeIndex: 5 } as Hole}
        currentScore={{ strokes: 4 } as HoleScore}
        onScoreSelect={jest.fn()}
        onShotContributionsChange={jest.fn()}
        firstTeePlayerId="a"
      />,
    );
    expect(queryByText('Who tees off first?')).toBeNull();
  });

  it('renders a derived per-player tally from the stroke count (4 strokes -> 2 / 2)', () => {
    const { getByText } = render(
      <AltShotScoreCard
        team={team}
        currentHole={HOLE}
        currentScore={{ strokes: 4 } as HoleScore}
        onScoreSelect={jest.fn()}
        onShotContributionsChange={jest.fn()}
        firstTeePlayerId="a"
      />,
    );
    expect(getByText('Alice 2')).toBeTruthy();
    expect(getByText('Bob 2')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx jest src/components/scorecard/AltShotScoreCard/AltShotScoreCard.test.tsx`
Expected: FAIL (toggle/tally not implemented; `firstTeePlayerId` prop unknown).

- [ ] **Step 3: Rewrite AltShotScoreCard.tsx**

Replace the entire contents of `src/components/scorecard/AltShotScoreCard/AltShotScoreCard.tsx` with:

```typescript
/**
 * AltShotScoreCard
 *
 * One-ball score entry for Alt Shot (foursomes). Partners alternate shots on a
 * single ball, so this reuses TeamScoreCard's scoring logic (useTeamScoreControls)
 * and presents an Alt-Shot layout: an "ALT SHOT" badge, a tee-to-go hint, a
 * one-time "who tees first" toggle on hole 1, and a per-player shot tally.
 *
 * Contributions are NOT entered by hand. The first-tee choice (stored as hole-1
 * teeShot) plus each hole's stroke count fully determines every shot via strict
 * alternation, so the tally is derived. Storage is identical to scramble (one
 * team scorecard), so finalization is unchanged.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Hole, HoleScore, MultiBallHoleScore, ShotContributions } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';
import { altShotTeePlayer, deriveAltShotShotCounts } from '@/utils/teamScoring';
import { useTeamScoreControls } from '@/components/scorecard/TeamScoreCard/hooks/useTeamScoreControls';

interface AltShotScoreCardProps {
  team: TeamWithMembers;
  currentHole: Hole;
  currentScore: HoleScore | MultiBallHoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  shotContributions?: ShotContributions;
  onShotContributionsChange?: (contributions: ShotContributions) => void;
  /** Player who tees the 1st hole (stored as hole-1 teeShot). Drives all
   *  derivation. Falls back to the first team member when undefined. */
  firstTeePlayerId?: string;
  disabled?: boolean;
}

export const AltShotScoreCard = React.memo(function AltShotScoreCard({
  team,
  currentHole,
  currentScore,
  onScoreSelect,
  shotContributions,
  onShotContributionsChange,
  firstTeePlayerId,
  disabled = false,
}: AltShotScoreCardProps) {
  const colors = useThemeColors();

  const {
    teamHandicap,
    strokesOnHole,
    selectedScore,
    isPickedUp,
    teamMemberNames,
    handlePickUp,
    handleDecrement,
    handleIncrement,
    handleParSelect,
  } = useTeamScoreControls({
    team,
    currentHole,
    currentScore,
    shotContributions,
    onShotContributionsChange,
    disabled,
  });

  const members = team.members ?? [];
  const firstTee = firstTeePlayerId ?? members[0]?.player_id;
  const partnerId = members.find((m) => m.player_id !== firstTee)?.player_id ?? firstTee ?? '';

  // Whose tee shot is it on this hole (derived from the first-tee choice).
  const teePlayerName = useMemo(() => {
    if (members.length < 2 || !firstTee) return members[0]?.player?.name ?? '';
    const teeId = altShotTeePlayer(firstTee, partnerId, currentHole.number);
    return members.find((m) => m.player_id === teeId)?.player?.name ?? '';
  }, [members, firstTee, partnerId, currentHole.number]);

  // Per-player shot tally for this hole, DERIVED from the stroke count.
  const tally = useMemo(() => {
    if (members.length < 2 || !firstTee) {
      return members.map((m) => ({ name: m.player?.name ?? '', count: 0 }));
    }
    const counts = deriveAltShotShotCounts(firstTee, partnerId, currentHole.number, selectedScore);
    return members.map((m) => ({
      name: m.player?.name ?? '',
      count: counts[m.player_id]?.total ?? 0,
    }));
  }, [members, firstTee, partnerId, currentHole.number, selectedScore]);

  const isFirstHole = currentHole.number === 1;
  const hasScore = selectedScore !== undefined && !isPickedUp;

  const handleSelectFirstTee = (playerId: string) => {
    if (disabled || !onShotContributionsChange) return;
    onShotContributionsChange({ ...shotContributions, teeShot: playerId });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.teamInfo}>
          <View style={styles.teamNameRow}>
            <Icon source="swap-horizontal" size={20} color={colors.primary} />
            <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={1}>
              {team.name}
            </Text>
          </View>
          {teamMemberNames ? (
            <Text style={[styles.teamMemberNames, { color: colors.textSecondary }]} numberOfLines={2}>
              {teamMemberNames}
            </Text>
          ) : null}
          <View style={styles.formatRow}>
            <View style={[styles.formatBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.formatBadgeText, { color: colors.white }]}>ALT SHOT</Text>
            </View>
            <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>
              {'HC: '}
              {teamHandicap.toFixed(1)}
              {' • +'}
              {strokesOnHole}
              {' shot'}
              {strokesOnHole !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Tee-to-go hint */}
      {teePlayerName ? (
        <View style={[styles.teeHintRow, { borderTopColor: colors.border }]}>
          <Icon source="golf-tee" size={16} color={colors.textSecondary} />
          <Text style={[styles.teeHintText, { color: colors.textSecondary }]}>
            {teePlayerName}
            {' tees (hole '}
            {currentHole.number}
            {' • '}
            {currentHole.number % 2 === 1 ? 'odd' : 'even'}
            {')'}
          </Text>
        </View>
      ) : null}

      {/* First-tee chooser — only on hole 1 */}
      {isFirstHole && members.length >= 2 ? (
        <View style={styles.firstTeeRow}>
          <Text style={[styles.firstTeeLabel, { color: colors.textSecondary }]}>
            Who tees off first?
          </Text>
          <View style={styles.firstTeeButtons}>
            {members.map((m) => {
              const selected = m.player_id === firstTee;
              return (
                <TouchableOpacity
                  key={m.player_id}
                  style={[
                    styles.firstTeeButton,
                    { borderColor: colors.gray300 },
                    selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    disabled && styles.buttonDisabled,
                  ]}
                  onPress={() => handleSelectFirstTee(m.player_id)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.player?.name ?? 'Player'} tees first`}
                >
                  <Text
                    style={[
                      styles.firstTeeButtonText,
                      { color: colors.textPrimary },
                      selected && { color: colors.white },
                    ]}
                  >
                    {m.player?.name ?? 'Player'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Score controls — mirrors TeamScoreCard */}
      <View style={styles.controlsContainer}>
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: colors.gray300, backgroundColor: colors.surface },
              isPickedUp && { backgroundColor: colors.primary, borderColor: colors.primary },
              disabled && styles.buttonDisabled,
            ]}
            onPress={handlePickUp}
            disabled={disabled}
            accessibilityLabel="Pick up ball"
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.textPrimary },
                isPickedUp && { color: colors.white },
              ]}
            >
              P
            </Text>
          </TouchableOpacity>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>PICK UP</Text>
        </View>

        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { borderColor: colors.gray300, backgroundColor: colors.surface },
              disabled && styles.buttonDisabled,
            ]}
            onPress={handleDecrement}
            disabled={disabled || (selectedScore !== undefined && selectedScore <= 1)}
            accessibilityLabel="Decrease score"
            accessibilityRole="button"
          >
            <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>{'−'}</Text>
          </TouchableOpacity>
          <View style={styles.scoreDisplay}>
            <Text style={[styles.scoreDisplayText, { color: colors.textPrimary }]}>
              {isPickedUp ? 'P' : (selectedScore ?? '-')}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { borderColor: colors.gray300, backgroundColor: colors.surface },
              (disabled || isPickedUp) && styles.buttonDisabled,
            ]}
            onPress={handleIncrement}
            disabled={disabled || isPickedUp || (selectedScore !== undefined && selectedScore >= 12)}
            accessibilityLabel="Increase score"
            accessibilityRole="button"
          >
            <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: colors.gray300, backgroundColor: colors.surface },
              selectedScore === currentHole.par && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
              disabled && styles.buttonDisabled,
            ]}
            onPress={handleParSelect}
            disabled={disabled}
            accessibilityLabel={`Score par ${currentHole.par}`}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.textPrimary },
                selectedScore === currentHole.par && { color: colors.white },
              ]}
            >
              {currentHole.par}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>PAR</Text>
        </View>
      </View>

      {/* Derived per-player shot tally */}
      {hasScore && members.length >= 2 ? (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.tallyRow}>
            {tally.map((t, i) => (
              <React.Fragment key={i}>
                <Text style={[styles.tallyText, { color: colors.textSecondary }]}>
                  {t.name}
                  {' '}
                  {t.count}
                </Text>
                {i < tally.length - 1 ? (
                  <Text style={[styles.tallyText, { color: colors.textSecondary }]}>
                    {'  •  '}
                  </Text>
                ) : null}
              </React.Fragment>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  teamInfo: { flex: 1 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  teamName: { ...typography.bodyBold, flexShrink: 1 },
  teamMemberNames: { ...typography.caption, marginTop: 2 },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  formatBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  formatBadgeText: { ...typography.caption, fontWeight: '700', fontSize: 10 },
  handicapLabel: { ...typography.caption },
  teeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  teeHintText: { ...typography.caption },
  firstTeeRow: { marginTop: spacing.sm, gap: spacing.xs },
  firstTeeLabel: { ...typography.caption },
  firstTeeButtons: { flexDirection: 'row', gap: spacing.sm },
  firstTeeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  firstTeeButtonText: { ...typography.caption, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  controlsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionButtonContainer: { alignItems: 'center', gap: 4 },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: { ...typography.h3 },
  actionLabel: { ...typography.caption, fontSize: 10 },
  buttonDisabled: { opacity: 0.4 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { ...typography.h2 },
  scoreDisplay: { minWidth: 56, alignItems: 'center' },
  scoreDisplayText: { ...typography.h1 },
  tallyRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm, flexWrap: 'wrap' },
  tallyText: { ...typography.caption },
});
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx jest src/components/scorecard/AltShotScoreCard/AltShotScoreCard.test.tsx`
Expected: PASS. If the existing test file used different render helpers, reconcile imports — the assertions above are the contract.

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep AltShotScoreCard || echo "clean"`
Expected: `clean`
Run: `npx eslint src/components/scorecard/AltShotScoreCard/AltShotScoreCard.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/scorecard/AltShotScoreCard/AltShotScoreCard.tsx src/components/scorecard/AltShotScoreCard/AltShotScoreCard.test.tsx
git commit -m "feat(scoring): alt-shot first-tee toggle + derived tally, drop manual sheet"
```

---

### Task 4: Pass firstTeePlayerId from the score-entry screen

**Files:**
- Modify: `src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx:214-241, 399-407`

**Interfaces:**
- Consumes: `AltShotScoreCard` now accepts `firstTeePlayerId?: string` (Task 3).
- Uses existing in-file helpers: `getPlayerScore`, `isSingleBallScore`, `teams`, `currentHole`.

- [ ] **Step 1: Add a helper that reads the stored first-tee (hole-1 teeShot)**

In `ScorecardScoreContent.tsx`, directly after the `createShotContributionsHandler` definition (ends at line 241), add:

```typescript
  // Alt-shot: the player who tees hole 1 (stored as hole-1 teeShot) drives all
  // shot derivation. Falls back to the first team member until chosen.
  const getTeamFirstTee = useCallback(
    (teamIndex: number): string | undefined => {
      const team = teams[teamIndex];
      const firstMember = team?.members?.[0];
      if (!firstMember) return undefined;
      const holeOne = getPlayerScore(firstMember.player_id, 1);
      if (holeOne && isSingleBallScore(holeOne)) {
        return holeOne.shotContributions?.teeShot ?? firstMember.player_id;
      }
      return firstMember.player_id;
    },
    [teams, getPlayerScore]
  );
```

- [ ] **Step 2: Pass it to AltShotScoreCard**

In the `AltShotScoreCard` JSX block (around lines 399-407), add the prop. The block becomes:

```typescript
              <AltShotScoreCard
                key={team.id}
                team={{ ...team, members: filteredMembers }}
                currentHole={currentHoleData}
                currentScore={getTeamScore(index)}
                onScoreSelect={(strokes) => handleTeamScoreSelect(index, strokes)}
                shotContributions={getTeamShotContributions(index)}
                onShotContributionsChange={createShotContributionsHandler(index)}
                firstTeePlayerId={getTeamFirstTee(index)}
              />
```

(Keep any other existing props such as `disabled` if present — only add `firstTeePlayerId`.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep ScorecardScoreContent || echo "clean"`
Expected: `clean`

- [ ] **Step 4: Commit**

```bash
git add src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx
git commit -m "feat(scoring): feed alt-shot first-tee into the score-entry card"
```

**Phase 1 is now functional:** alt-shot scoring shows the hole-1 first-tee toggle, derives the tally, and no longer requires manual shot entry.

---

## Phase 2 — Competition contributions board (pair-aware derivation) (Tasks 5–7)

### Task 5: Add the 'alt-shot' contribution format + pair input type

**Files:**
- Modify: `src/utils/contributions/types.ts:6, 33-40`

**Interfaces:**
- Produces:
  - `ContributionFormat` now includes `'alt-shot'`.
  - `interface AltShotPairInput { playerIds: string[]; firstTeePlayerId: string; strokesByHole: Record<number, number | undefined> }`
  - `ContributionRoundInput` gains `altShotPairs?: AltShotPairInput[]`.

- [ ] **Step 1: Extend the format union**

In `src/utils/contributions/types.ts` line 6, change:

```typescript
export type ContributionFormat = 'best-ball' | 'scramble' | 'shamble' | 'aggregate';
```

to:

```typescript
export type ContributionFormat = 'best-ball' | 'scramble' | 'shamble' | 'aggregate' | 'alt-shot';
```

- [ ] **Step 2: Add the pair input type and thread it into the round input**

In the same file, immediately before `export interface ContributionRoundInput {` (line 33), add:

```typescript
/** One alt-shot pair (2 players sharing a ball) for a round. */
export interface AltShotPairInput {
  /** The two players who share the ball. */
  playerIds: string[];
  /** Player who tees hole 1 (drives the alternation). */
  firstTeePlayerId: string;
  /** The pair's single-ball gross strokes per hole number. */
  strokesByHole: Record<number, number | undefined>;
}

```

Then add `altShotPairs` to `ContributionRoundInput` (after the `teams` field, line 39):

```typescript
export interface ContributionRoundInput {
  roundId: string;
  roundLabel: string;
  format: ContributionFormat;
  gameType: GameType;
  holes: Hole[];
  teams: ContributionTeamInput[];
  /** Alt-shot pairs for the round (only set when format === 'alt-shot'). */
  altShotPairs?: AltShotPairInput[];
}
```

- [ ] **Step 3: Type-check (expect a known error to fix next)**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep computeContributions || echo "clean"`
Expected: an error in `computeContributions.ts` about `METRIC_LABEL` not covering `'alt-shot'` — fixed in Task 6. (If `clean`, that's fine too.)

- [ ] **Step 4: Commit**

```bash
git add src/utils/contributions/types.ts
git commit -m "feat(contributions): add alt-shot format + pair input type"
```

---

### Task 6: computeAltShotTeam — pair-aware derivation in computeContributions

**Files:**
- Modify: `src/utils/contributions/computeContributions.ts:1-20, 63-68, 275-314`
- Test: `src/utils/contributions/computeContributions.test.ts` (add a describe block)

**Interfaces:**
- Consumes: `deriveAltShotShotCounts` from `@/utils/teamScoring`; `AltShotPairInput` from `./types`.
- Produces: alt-shot rounds now return per-player `shotBreakdown` derived from pairings.

- [ ] **Step 1: Write the failing test**

Append to `src/utils/contributions/computeContributions.test.ts` (inside the top-level describe or as a new one — match the file's existing style; this assumes named import `computeContributions` is already imported there, add `AltShotPairInput` import if needed):

```typescript
describe('computeContributions — alt-shot (pair-aware)', () => {
  const holes = [
    { number: 1, par: 4, strokeIndex: 1 },
    { number: 2, par: 4, strokeIndex: 2 },
  ] as any;

  it('derives per-player drives/approaches/putts from pairings + strokes', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'alt-shot',
          gameType: 'stableford',
          holes,
          teams: [
            {
              teamId: 't1',
              teamName: 'Red',
              color: null,
              members: [
                { playerId: 'a', playerName: 'Alice', handicap: 10 },
                { playerId: 'b', playerName: 'Bob', handicap: 12 },
              ],
              strokesByPlayerHole: { a: { 1: 4, 2: 4 } },
            },
          ],
          altShotPairs: [
            {
              playerIds: ['a', 'b'],
              firstTeePlayerId: 'a',
              strokesByHole: { 1: 4, 2: 4 },
            },
          ],
        },
      ],
    });

    const round = board.rounds[0];
    expect(round.dataMissing).toBe(false);
    expect(round.metricLabel).toBe('shots used');
    const red = round.teams.find((t) => t.teamId === 't1')!;
    const alice = red.players.find((p) => p.playerId === 'a')!;
    const bob = red.players.find((p) => p.playerId === 'b')!;
    // Hole 1 (A tees): A drive+appr, B appr+putt. Hole 2 (B tees): B drive+appr, A appr+putt.
    // Totals across 2 holes: A = {drives:1, approaches:2, putts:1} = 4 shots; B = same = 4 shots.
    expect(alice.shotBreakdown).toEqual({ drives: 1, approaches: 2, putts: 1 });
    expect(bob.shotBreakdown).toEqual({ drives: 1, approaches: 2, putts: 1 });
    expect(alice.value).toBe(4);
    expect(bob.value).toBe(4);
  });

  it('marks dataMissing when there are no pairs', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'alt-shot',
          gameType: 'stableford',
          holes,
          teams: [
            {
              teamId: 't1',
              teamName: 'Red',
              color: null,
              members: [{ playerId: 'a', playerName: 'Alice', handicap: 10 }],
              strokesByPlayerHole: {},
            },
          ],
          altShotPairs: [],
        },
      ],
    });
    expect(board.rounds[0].dataMissing).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx jest src/utils/contributions/computeContributions.test.ts -t "alt-shot"`
Expected: FAIL (alt-shot not handled; `dataMissing` true / metricLabel undefined).

- [ ] **Step 3: Implement the derivation**

In `computeContributions.ts`:

(a) Add the import near the top (after line 20):

```typescript
import { deriveAltShotShotCounts } from '@/utils/teamScoring';
import type { AltShotPairInput } from './types';
```

(b) Add the metric label. Change `METRIC_LABEL` (lines 63-68) to include alt-shot:

```typescript
const METRIC_LABEL: Record<ContributionFormat, string> = {
  'best-ball': 'holes won',
  scramble: 'shots used',
  shamble: 'drives + holes won',
  aggregate: 'points',
  'alt-shot': 'shots used',
};
```

(c) Add `computeAltShotTeam` immediately before `function computeRound` (line 275):

```typescript
/**
 * Alt-shot per-team contribution, derived from the team's 2-player pairs.
 * Each pair shares one ball; within a hole partners strictly alternate, so
 * per-player shot counts come from the first-tee player + the hole's strokes.
 */
function computeAltShotTeam(
  team: ContributionTeamInput,
  holes: Hole[],
  pairs: AltShotPairInput[]
): TeamContribution | null {
  const memberIds = new Set(team.members.map((m) => m.playerId));
  const teamPairs = pairs.filter(
    (p) => p.playerIds.length >= 2 && p.playerIds.every((id) => memberIds.has(id))
  );

  const byPlayer = new Map<string, ShotBreakdown>();
  team.members.forEach((m) => byPlayer.set(m.playerId, emptyBreakdown()));
  let total = 0;

  for (const pair of teamPairs) {
    const [p0, p1] = pair.playerIds;
    const firstTee = pair.firstTeePlayerId || p0;
    const partner = firstTee === p0 ? p1 : p0;
    for (const hole of holes) {
      const counts = deriveAltShotShotCounts(
        firstTee,
        partner,
        hole.number,
        pair.strokesByHole[hole.number]
      );
      for (const pid of pair.playerIds) {
        const c = counts[pid];
        const bd = byPlayer.get(pid);
        if (!c || !bd) continue;
        bd.drives += c.drives;
        bd.approaches += c.approaches;
        bd.putts += c.putts;
        total += c.total;
      }
    }
  }

  if (total === 0) return null;

  const players: PlayerContribution[] = team.members.map((m) => {
    const bd = byPlayer.get(m.playerId) ?? emptyBreakdown();
    const value = bd.drives + bd.approaches + bd.putts;
    return {
      playerId: m.playerId,
      playerName: m.playerName,
      value,
      share: total > 0 ? value / total : 0,
      shotBreakdown: bd,
      position: 0,
      isMvp: false,
    };
  });

  return { teamId: team.teamId, teamName: team.teamName, color: team.color, players: rank(players) };
}
```

(d) Add the alt-shot branch in `computeRound`, immediately after the `scramble` branch (after line 304, before the `// shamble` comment):

```typescript
  if (round.format === 'alt-shot') {
    const pairs = round.altShotPairs ?? [];
    const teams = round.teams
      .map((t) => computeAltShotTeam(t, round.holes, pairs))
      .filter((t): t is TeamContribution => t !== null);
    return { ...base, teams, dataMissing: teams.length === 0 };
  }
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx jest src/utils/contributions/computeContributions.test.ts -t "alt-shot"`
Expected: PASS. Also run the full file to confirm no regressions:
Run: `npx jest src/utils/contributions/computeContributions.test.ts 2>&1 | grep -E "Tests:|Test Suites:"`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/contributions/computeContributions.ts src/utils/contributions/computeContributions.test.ts
git commit -m "feat(contributions): pair-aware alt-shot derivation in computeContributions"
```

---

### Task 7: Wire sub-matches into useCompetitionContributions

**Files:**
- Modify: `src/hooks/queryKeys/scoring.ts:92-99` (add `subMatches` key)
- Modify: `src/hooks/competitions/useCompetitionContributions.ts` (imports, `contributionFormat`, fetch sub-matches, build pair inputs)

**Interfaces:**
- Consumes: `listSubMatchesForRound(roundId: string): Promise<SubMatch[]>` from `@/services/subMatches`; `SubMatch` from `@/types/database/round.types`; `AltShotPairInput` from `@/utils/contributions`.

- [ ] **Step 1: Add the sub-match query key**

In `src/hooks/queryKeys/scoring.ts`, inside the `contributionKeys` object (after line 98 `teams: ...`), add:

```typescript
  subMatches: (roundId: string) => [...contributionKeys.all, 'subMatches', roundId] as const,
```

- [ ] **Step 2: Change alt-shot's resolved format to 'alt-shot'**

In `useCompetitionContributions.ts`, in `contributionFormat` (lines 37-43), change the alt-shot line from:

```typescript
  // Alt-shot is a single-ball team format like scramble; map to scramble contributions.
  if (tf === 'alt-shot' || gt === 'alt-shot') return 'scramble';
```

to:

```typescript
  // Alt-shot derives contributions per 2-player pair (see buildAltShotPairs).
  if (tf === 'alt-shot' || gt === 'alt-shot') return 'alt-shot';
```

- [ ] **Step 3: Add imports**

Add to the imports at the top of `useCompetitionContributions.ts`:

```typescript
import { listSubMatchesForRound } from '@/services/subMatches';
import type { SubMatch } from '@/types/database/round.types';
import type { AltShotPairInput } from '@/utils/contributions';
```

(Confirm the export name: `grep -n "listSubMatchesForRound" src/services/subMatches/index.ts`. If the barrel `@/services/subMatches` does not re-export it, import from `@/services/subMatches/index` or add the re-export.)

- [ ] **Step 4: Add a helper that builds pairs from sub-matches + scorecards**

Add this function near `buildTeamInput` (after line 107):

```typescript
/** Build alt-shot pair inputs for a round from its sub-matches + scorecards.
 *  Each sub-match side (team_a_player_ids / team_b_player_ids) is one pair that
 *  shares a ball; both members hold identical ball scores, so read from the
 *  first member whose card has scores. */
function buildAltShotPairs(
  subMatches: SubMatch[],
  scorecards: DBScorecard[]
): AltShotPairInput[] {
  const cardByPlayer = new Map(scorecards.map((c) => [c.player_id, c]));
  const pairs: AltShotPairInput[] = [];

  for (const sm of subMatches) {
    for (const side of [sm.team_a_player_ids, sm.team_b_player_ids]) {
      if (!side || side.length < 2) continue;

      const ballCard = side
        .map((id) => cardByPlayer.get(id))
        .find((c) => c && c.scores && Object.keys(c.scores).length > 0);

      const strokesByHole: Record<number, number | undefined> = {};
      let firstTee: string | undefined;

      if (ballCard) {
        for (const [holeStr, hs] of Object.entries(ballCard.scores ?? {})) {
          if (!isSingleBallScore(hs)) continue;
          const holeNum = Number(holeStr);
          strokesByHole[holeNum] = hs.strokes;
          if (holeNum === 1 && hs.shotContributions?.teeShot) {
            firstTee = hs.shotContributions.teeShot;
          }
        }
      }

      pairs.push({
        playerIds: side,
        firstTeePlayerId: firstTee ?? side[0],
        strokesByHole,
      });
    }
  }

  return pairs;
}
```

- [ ] **Step 5: Fetch sub-matches per round (only for alt-shot rounds)**

After the `holeResults` `useQueries` block (ends line 146), add:

```typescript
  const subMatchResults = useQueries({
    queries: teamRounds.map(({ round, format }) => ({
      queryKey: contributionKeys.subMatches(round.id),
      queryFn: () => listSubMatchesForRound(round.id),
      enabled: format === 'alt-shot',
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    })),
  });
```

Add `subMatchResults.some((q) => q.isLoading)` to the `isLoading` expression (line 160-164) and `(subMatchResults.find((q) => q.error)?.error as Error | undefined)` to the `error` chain (lines 166-171).

- [ ] **Step 6: Pass altShotPairs into the round input**

In the `board` useMemo, update the round-building map (lines 178-195) so alt-shot rounds get pairs. Replace the `return { ... }` for each round with:

```typescript
      const isAltShot = format === 'alt-shot';
      const altShotPairs = isAltShot
        ? buildAltShotPairs(subMatchResults[idx]?.data ?? [], cards)
        : undefined;
      return {
        roundId: round.id,
        roundLabel: label,
        format,
        gameType: round.game_type,
        holes: holeResults[idx]?.data ?? [],
        teams: teamInputs,
        altShotPairs,
      };
```

Add `subMatchResults` to the `board` useMemo dependency array (line 199).

- [ ] **Step 7: Type-check + run the hook's tests (if any) + full contributions suite**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "useCompetitionContributions|queryKeys" || echo "clean"`
Expected: `clean`
Run: `npx jest src/utils/contributions 2>&1 | grep -E "Tests:|Test Suites:"`
Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/queryKeys/scoring.ts src/hooks/competitions/useCompetitionContributions.ts
git commit -m "feat(contributions): wire sub-match pairings into alt-shot competition board"
```

---

## Final verification

- [ ] **Full type-check:** `npx tsc --noEmit -p tsconfig.json` → no new errors.
- [ ] **Targeted tests:** `npx jest src/utils/teamScoring/altShotContributions.test.ts src/utils/contributions src/components/scorecard/AltShotScoreCard` → all pass.
- [ ] **Lint touched files:** `npx eslint src/utils/teamScoring/altShotContributions.ts src/components/scorecard/AltShotScoreCard/AltShotScoreCard.tsx src/utils/contributions/computeContributions.ts src/hooks/competitions/useCompetitionContributions.ts` → no errors.
- [ ] **Manual (on device), alt-shot split round:** hole 1 shows the first-tee toggle; selecting flips the tee hint and tally; holes 2–18 show no toggle, correct "X tees" hint, and a tally that matches the stroke count; the manual shot sheet is gone; the competition Contributions tab shows per-player shots for the alt-shot round.

## Self-review notes

- **Spec coverage:** util (Task 1) ✓; first-tee selector hole-1 (Task 3) ✓; remove manual sheet (Task 3) ✓; derived tally (Task 3) ✓; pass first-tee from screen (Task 4) ✓; pair-aware comp board (Tasks 5–7) ✓; scoring untouched ✓; in-round leaderboard untouched ✓.
- **Type consistency:** `deriveAltShotShotCounts` / `altShotTeePlayer` signatures identical across Tasks 1, 3, 6. `AltShotPairInput` shape identical across Tasks 5, 6, 7. `firstTeePlayerId` prop identical across Tasks 3, 4.
- **Known follow-up (not in scope):** the negative handicap-index bug seen during the earlier sync investigation is unrelated and untouched here.
