# Alt Shot On-Course Scoring UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Alt Shot a dedicated on-course score card (one ball + per-shot player attribution, no "Scramble" branding) and make the split (Ryder Cup) preset's View Round show Sub-Matches + Contributions instead of Scramble's cross-field tabs.

**Architecture:** A new `AltShotScoreCard` reuses the existing `useTeamScoreControls` hook and `ShotContributionSheet` (so scoring/finalization logic and storage are unchanged — still one ball on the team's single scorecard), but renders an Alt-Shot layout: "ALT SHOT" badge, an odd/even tee-to-go hint, and a per-player shot tally. `ScorecardScoreContent` routes `team_format === 'alt-shot'` to it (splitting alt-shot out of the shared Scramble branch). View Round gains an `isAltShotSplitRound` notion that suppresses the Scramble Scorecard/Leaderboard tabs for split alt-shot while keeping Contributions and Sub-Matches.

**Tech Stack:** React Native (Expo), TypeScript, React Native Paper, Jest + @testing-library/react-native.

## Global Constraints

- The new card keys on `teamFormat === 'alt-shot'`. It applies to ANY alt-shot round (both presets); no structural change is made to the combined `team_alt_shot` preset.
- One ball per team: the card writes the team's single hole score + `shotContributions` exactly as `TeamScoreCard` does (via `useTeamScoreControls`). Finalization/handicap math is NOT touched.
- Shot contributions are ON by default but NOT blocking — a hole with strokes and no attribution is valid.
- Tee convention: team member index 0 tees ODD holes, index 1 tees EVEN holes. Display hint only; never constrains attribution.
- No rendered "Scramble"/"SCRAMBLE" string may appear for an alt-shot round. (Internal type values like the `'scramble'` `ContributionFormat` mapping are fine — they are never rendered.)
- View Round tab fix is scoped to SPLIT alt-shot (`team_format === 'alt-shot' && round_format === 'split'`). Combined alt-shot's tab set is unchanged.
- Contributions already work for alt-shot via the existing `alt-shot → 'scramble'` `ContributionFormat` mapping in `useCompetitionContributions.ts:40` (metric "shots used"). Do NOT add a new `ContributionFormat`; only verify.
- Diff tests against the documented Jest baseline (large pre-existing failure set on `main`); gate on ZERO new failures, not a green suite.

---

### Task 1: `AltShotScoreCard` component

A dedicated one-ball card for Alt Shot. Reuses `useTeamScoreControls` (scoring + shot-contribution logic) and `ShotContributionSheet` (attribution UI) so no scoring logic is duplicated; adds the Alt-Shot-specific chrome.

**Files:**
- Create: `src/components/scorecard/AltShotScoreCard/AltShotScoreCard.tsx`
- Create: `src/components/scorecard/AltShotScoreCard/index.ts`
- Test: `src/components/scorecard/AltShotScoreCard/AltShotScoreCard.test.tsx`

**Interfaces:**
- Consumes: `useTeamScoreControls` from `@/components/scorecard/TeamScoreCard/hooks/useTeamScoreControls` (returns `{ usesShotContributions, teamHandicap, strokesOnHole, selectedScore, isPickedUp, stablefordPoints, teamMemberNames, handlePickUp, handleDecrement, handleIncrement, handleParSelect, handlePlayerSelectForShot, getShotPlayerName, handleClearShot, handleCloseModal }` plus others); `ShotContributionSheet` from `@/components/scorecard/TeamScoreCard/ShotContributionSheet`; `SHEET_HEIGHT` from the hook module.
- Produces: `AltShotScoreCard` (named export) with props:
  ```ts
  interface AltShotScoreCardProps {
    team: TeamWithMembers;
    currentHole: Hole;
    currentScore: HoleScore | MultiBallHoleScore | undefined;
    onScoreSelect: (strokes: number) => void;
    shotContributions?: ShotContributions;
    onShotContributionsChange?: (contributions: ShotContributions) => void;
    disabled?: boolean;
  }
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/scorecard/AltShotScoreCard/AltShotScoreCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AltShotScoreCard } from './AltShotScoreCard';
import type { TeamWithMembers } from '@/types/database.types';
import type { Hole } from '@/types';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => new Proxy({}, { get: () => '#000000' }),
}));

const team = {
  id: 't1',
  name: 'Sam & Alex',
  members: [
    { player_id: 'p1', player: { id: 'p1', name: 'Sam', handicap: 9 } },
    { player_id: 'p2', player: { id: 'p2', name: 'Alex', handicap: 11 } },
  ],
} as unknown as TeamWithMembers;

const hole = (number: number, par = 4): Hole =>
  ({ number, par, strokeIndex: 7 } as Hole);

describe('AltShotScoreCard', () => {
  it('shows an ALT SHOT badge, never SCRAMBLE', () => {
    const { queryByText, getByText } = render(
      <AltShotScoreCard
        team={team}
        currentHole={hole(5)}
        currentScore={undefined}
        onScoreSelect={jest.fn()}
        onShotContributionsChange={jest.fn()}
      />
    );
    expect(getByText('ALT SHOT')).toBeTruthy();
    expect(queryByText('SCRAMBLE')).toBeNull();
  });

  it('hints that member 0 tees on odd holes and member 1 on even holes', () => {
    const odd = render(
      <AltShotScoreCard team={team} currentHole={hole(5)} currentScore={undefined} onScoreSelect={jest.fn()} onShotContributionsChange={jest.fn()} />
    );
    expect(odd.getByText(/Sam tees/i)).toBeTruthy();

    const even = render(
      <AltShotScoreCard team={team} currentHole={hole(6)} currentScore={undefined} onScoreSelect={jest.fn()} onShotContributionsChange={jest.fn()} />
    );
    expect(even.getByText(/Alex tees/i)).toBeTruthy();
  });

  it('reports the per-player shot tally from recorded contributions', () => {
    const { getByText } = render(
      <AltShotScoreCard
        team={team}
        currentHole={hole(5)}
        currentScore={{ strokes: 4 } as never}
        shotContributions={{ teeShot: 'p1', approach: 'p2', putt: 'p1' } as never}
        onScoreSelect={jest.fn()}
        onShotContributionsChange={jest.fn()}
      />
    );
    // Sam (p1) hit 2 shots (tee+putt), Alex (p2) hit 1 (approach).
    expect(getByText(/Sam 2/i)).toBeTruthy();
    expect(getByText(/Alex 1/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/components/scorecard/AltShotScoreCard/AltShotScoreCard.test.tsx`
Expected: FAIL — `Cannot find module './AltShotScoreCard'`.

- [ ] **Step 3: Implement the component**

Mirror `TeamScoreCard`'s score-stepper/pick-up/par controls and styles (same file's `styles` are a good reference for tokens), but with the Alt-Shot chrome. Full implementation:

```tsx
// src/components/scorecard/AltShotScoreCard/AltShotScoreCard.tsx
/**
 * AltShotScoreCard
 *
 * One-ball score entry for Alt Shot (foursomes). Partners alternate shots on a
 * single ball, so this reuses TeamScoreCard's scoring logic (useTeamScoreControls)
 * and the shot-attribution sheet, but presents an Alt-Shot layout: an "ALT SHOT"
 * badge, an odd/even tee-to-go hint, and a per-player shot tally. Storage is
 * identical to scramble (one team scorecard), so finalization is unchanged.
 */
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Hole, HoleScore, MultiBallHoleScore, ShotContributions } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';
import type { ShotSlot } from '@/utils/teamScoring';
import { ShotContributionSheet } from '@/components/scorecard/TeamScoreCard/ShotContributionSheet';
import {
  useTeamScoreControls,
  SHEET_HEIGHT,
} from '@/components/scorecard/TeamScoreCard/hooks/useTeamScoreControls';

interface AltShotScoreCardProps {
  team: TeamWithMembers;
  currentHole: Hole;
  currentScore: HoleScore | MultiBallHoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  shotContributions?: ShotContributions;
  onShotContributionsChange?: (contributions: ShotContributions) => void;
  disabled?: boolean;
}

export const AltShotScoreCard = React.memo(function AltShotScoreCard({
  team,
  currentHole,
  currentScore,
  onScoreSelect,
  shotContributions,
  onShotContributionsChange,
  disabled = false,
}: AltShotScoreCardProps) {
  const colors = useThemeColors();
  const [activeShotType, setActiveShotType] = useState<ShotSlot | null>(null);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (activeShotType !== null) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
    }
  }, [activeShotType, slideAnim]);

  const {
    usesShotContributions,
    teamHandicap,
    strokesOnHole,
    selectedScore,
    isPickedUp,
    teamMemberNames,
    handlePickUp,
    handleDecrement,
    handleIncrement,
    handleParSelect,
    handlePlayerSelectForShot,
    handleClearShot,
    getShotPlayerName,
    handleCloseModal,
  } = useTeamScoreControls({
    team,
    currentHole,
    currentScore,
    shotContributions,
    onShotContributionsChange,
    disabled,
    activeShotType,
    setActiveShotType,
    slideAnim,
    onScoreSelect,
  });

  const members = team.members ?? [];

  // Tee convention: index 0 tees odd holes, index 1 tees even holes.
  const teePlayerName = useMemo(() => {
    if (members.length < 2) return members[0]?.player?.name ?? '';
    const idx = currentHole.number % 2 === 1 ? 0 : 1;
    return members[idx]?.player?.name ?? '';
  }, [members, currentHole.number]);

  // Per-player shot tally for this hole, from recorded contributions.
  const tally = useMemo(() => {
    const counts = new Map<string, number>();
    const slots = shotContributions ?? {};
    for (const key of Object.keys(slots)) {
      const pid = (slots as Record<string, string | undefined>)[key];
      if (pid) counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
    return members.map((m) => ({
      name: m.player?.name ?? '',
      count: counts.get(m.player_id) ?? 0,
    }));
  }, [shotContributions, members]);

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
          {teamMemberNames && (
            <Text style={[styles.teamMemberNames, { color: colors.textSecondary }]} numberOfLines={2}>
              {teamMemberNames}
            </Text>
          )}
          <View style={styles.formatRow}>
            <View style={[styles.formatBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.formatBadgeText, { color: colors.white }]}>ALT SHOT</Text>
            </View>
            <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>
              HC: {teamHandicap.toFixed(1)} {'•'} +{strokesOnHole} shot{strokesOnHole !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Tee-to-go hint */}
      {teePlayerName ? (
        <View style={[styles.teeHintRow, { borderTopColor: colors.border }]}>
          <Icon source="golf-tee" size={16} color={colors.textSecondary} />
          <Text style={[styles.teeHintText, { color: colors.textSecondary }]}>
            {teePlayerName} tees (hole {currentHole.number} {'•'} {currentHole.number % 2 === 1 ? 'odd' : 'even'})
          </Text>
        </View>
      ) : null}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Score controls — mirrors TeamScoreCard */}
      <View style={styles.controlsContainer}>
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.gray300, backgroundColor: colors.surface }, isPickedUp && { backgroundColor: colors.primary, borderColor: colors.primary }, disabled && styles.buttonDisabled]}
            onPress={handlePickUp}
            disabled={disabled}
            accessibilityLabel="Pick up ball"
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, { color: colors.textPrimary }, isPickedUp && { color: colors.white }]}>P</Text>
          </TouchableOpacity>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>PICK UP</Text>
        </View>

        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[styles.stepperButton, { borderColor: colors.gray300, backgroundColor: colors.surface }, disabled && styles.buttonDisabled]}
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
            style={[styles.stepperButton, { borderColor: colors.gray300, backgroundColor: colors.surface }, (disabled || isPickedUp) && styles.buttonDisabled]}
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
            style={[styles.actionButton, { borderColor: colors.gray300, backgroundColor: colors.surface }, selectedScore === currentHole.par && { backgroundColor: colors.primary, borderColor: colors.primary }, disabled && styles.buttonDisabled]}
            onPress={handleParSelect}
            disabled={disabled}
            accessibilityLabel={`Score par ${currentHole.par}`}
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, { color: colors.textPrimary }, selectedScore === currentHole.par && { color: colors.white }]}>
              {currentHole.par}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>PAR</Text>
        </View>
      </View>

      {/* Shot attribution + tally */}
      {usesShotContributions && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ShotContributionSheet
            team={team}
            currentHole={currentHole}
            shotContributions={shotContributions}
            activeShotType={activeShotType}
            setActiveShotType={setActiveShotType}
            slideAnim={slideAnim}
            getShotPlayerName={getShotPlayerName}
            handlePlayerSelectForShot={handlePlayerSelectForShot}
            handleClearShot={handleClearShot}
            handleCloseModal={handleCloseModal}
            disabled={disabled}
          />
          <View style={styles.tallyRow}>
            {tally.map((t, i) => (
              <Text key={i} style={[styles.tallyText, { color: colors.textSecondary }]}>
                {t.name} {t.count}{i < tally.length - 1 ? '  •  ' : ''}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  teamInfo: { flex: 1 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  teamName: { ...typography.bodyBold, flexShrink: 1 },
  teamMemberNames: { ...typography.caption, marginTop: 2 },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  formatBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  formatBadgeText: { ...typography.caption, fontWeight: '700', fontSize: 10 },
  handicapLabel: { ...typography.caption },
  teeHintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm, paddingTop: spacing.sm },
  teeHintText: { ...typography.caption },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  controlsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionButtonContainer: { alignItems: 'center', gap: 4 },
  actionButton: { width: 48, height: 48, borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { ...typography.h3 },
  actionLabel: { ...typography.caption, fontSize: 10 },
  buttonDisabled: { opacity: 0.4 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperButton: { width: 56, height: 56, borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepperButtonText: { ...typography.h2 },
  scoreDisplay: { minWidth: 56, alignItems: 'center' },
  scoreDisplayText: { ...typography.h1 },
  tallyRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm, flexWrap: 'wrap' },
  tallyText: { ...typography.caption },
});
```

Note on the hook call: pass exactly the params `useTeamScoreControls` expects. Read its `UseTeamScoreControlsParams` (in `useTeamScoreControls.ts`) and match the names — the legacy `onContributorSelect`/`selectedContributor` are optional and omitted here (alt-shot uses shot contributions only). If the hook requires `onScoreSelect` under a different key, adjust to the real signature; everything else above is stable.

- [ ] **Step 4: Add the barrel export**

```ts
// src/components/scorecard/AltShotScoreCard/index.ts
export { AltShotScoreCard } from './AltShotScoreCard';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm jest src/components/scorecard/AltShotScoreCard/AltShotScoreCard.test.tsx`
Expected: PASS (3 tests). If the ThemeContext/Paper mocks need adjusting to match repo conventions, mirror an existing card test (e.g. `TeamScoreCard`'s test if present, or another `src/components/scorecard/**/*.test.tsx`).

- [ ] **Step 6: Commit**

```bash
git add src/components/scorecard/AltShotScoreCard/
git commit -m "feat(alt-shot): dedicated AltShotScoreCard (one ball, tee hint, shot tally)"
```

---

### Task 2: Route alt-shot score entry to `AltShotScoreCard`

Split alt-shot out of the shared Scramble branch in `ScorecardScoreContent` so Scramble keeps its `TeamScoreCard` (with the SCRAMBLE badge) and alt-shot renders the new card.

**Files:**
- Modify: `src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx` (the `teamFormat === 'scramble' || teamFormat === 'alt-shot'` branch, ~line 357)

**Interfaces:**
- Consumes: `AltShotScoreCard` from `@/components/scorecard/AltShotScoreCard` (Task 1).
- Produces: nothing new.

- [ ] **Step 1: Add the import**

At the top of `ScorecardScoreContent.tsx`, alongside the other scorecard imports:

```tsx
import { AltShotScoreCard } from '@/components/scorecard/AltShotScoreCard';
```

- [ ] **Step 2: Narrow the Scramble branch and add an Alt-Shot branch**

Change the existing branch condition (~line 357) from:

```tsx
  // Team round: Scramble / Alt Shot format (single-ball formats)
  if (isTeamRound && (teamFormat === 'scramble' || teamFormat === 'alt-shot') && teams.length > 0) {
```

to Scramble-only:

```tsx
  // Team round: Scramble format (single ball)
  if (isTeamRound && teamFormat === 'scramble' && teams.length > 0) {
```

Then add a new branch immediately AFTER that block closes (before the Best Ball branch), rendering `AltShotScoreCard` with the same per-team mapping and the same props the Scramble branch passes:

```tsx
  // Team round: Alt Shot format (single ball, alternating shots)
  if (isTeamRound && teamFormat === 'alt-shot' && teams.length > 0) {
    return (
      <>
        {teams
          .map((team, index) => {
            const filteredMembers = getFilteredTeamMembers(team);
            if (scoringPairsEnabled && (!filteredMembers || filteredMembers.length === 0)) {
              return null;
            }
            return (
              <AltShotScoreCard
                key={team.id}
                team={{ ...team, members: filteredMembers }}
                currentHole={currentHoleData}
                currentScore={getTeamScore(index)}
                onScoreSelect={(strokes) => handleTeamScoreSelect(index, strokes)}
                shotContributions={getTeamShotContributions(index)}
                onShotContributionsChange={createShotContributionsHandler(index)}
              />
            );
          })
          .filter(Boolean)}
      </>
    );
  }
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: no new errors. (`getFilteredTeamMembers`, `getTeamScore`, `handleTeamScoreSelect`, `getTeamShotContributions`, `createShotContributionsHandler`, `currentHoleData`, `scoringPairsEnabled` are all already in scope in this component — confirm by reading the surrounding code.)

- [ ] **Step 4: Verify split scoping still applies**

Read `ScorecardEntryScreen/index.tsx` around the `useActiveSubMatch`/`scopedTeams` block (~lines 232–269) and confirm `teams` passed to `ScorecardScoreContent` is already the sub-match-scoped set for split rounds. No change needed — just confirm in your report that the new alt-shot branch receives `scopedTeams` for split rounds (so each side's pair gets one `AltShotScoreCard`).

- [ ] **Step 5: Commit**

```bash
git add src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx
git commit -m "feat(alt-shot): route alt-shot score entry to AltShotScoreCard"
```

---

### Task 3: Suppress Scramble cross-field tabs for split Alt Shot

For a split alt-shot round, View Round currently inherits Scramble's Scorecard + Leaderboard tabs (they rank across all players — wrong for 2v2). Suppress those two for split alt-shot; keep Contributions and the Sub-Matches tab. Combined alt-shot is untouched.

**Files:**
- Modify: `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundDataFetch.ts` (add `isAltShotSplitRound`, ~line 47–102)
- Modify: `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.ts` (consume it, gate the scramble tabs, ~line 117–120)
- Test: `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.test.ts` (create if absent; otherwise extend)

**Interfaces:**
- Consumes: round fields `team_format`, `round_format`.
- Produces: `isAltShotSplitRound: boolean` from `useViewRoundDataFetch`, consumed by `useViewRoundTabs`.

- [ ] **Step 1: Write the failing test**

Create `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.test.ts` (adapt the import/signature to the real hook — it's a `useMemo` hook taking a params object; call it via `@testing-library/react-native`'s `renderHook`):

```ts
import { renderHook } from '@testing-library/react-native';
import { useViewRoundTabs } from './useViewRoundTabs';

const base = {
  isMatchPlayRound: false,
  isTeamMatchPlayRound: false,
  isShambleRound: false,
  isStrokePlayRound: false,
  isStablefordRound: false,
  isParRound: false,
  isTeamRound: true,
  isSplitRound: true,
  hasSkinsGame: false,
  hasWolfGame: false,
  hasPayoutsTab: false,
  hasStats: false,
  hasShots: false,
  playerCount: 4,
  groupCount: 2,
  teamCount: 2,
};

describe('useViewRoundTabs — split alt-shot', () => {
  it('suppresses scramble Scorecard/Leaderboard but keeps Contributions for split alt-shot', () => {
    const { result } = renderHook(() =>
      useViewRoundTabs({ ...base, isScrambleRound: true, isAltShotSplitRound: true } as never)
    );
    const keys = result.current.map((t: { key: string }) => t.key);
    expect(keys).toContain('subMatches');
    expect(keys).toContain('scrambleContributions');
    expect(keys).not.toContain('scrambleTeamScore');
    expect(keys).not.toContain('scrambleLeaderboard');
  });

  it('keeps all three scramble tabs for a non-split (combined) scramble/alt-shot round', () => {
    const { result } = renderHook(() =>
      useViewRoundTabs({ ...base, isSplitRound: false, isScrambleRound: true, isAltShotSplitRound: false } as never)
    );
    const keys = result.current.map((t: { key: string }) => t.key);
    expect(keys).toContain('scrambleTeamScore');
    expect(keys).toContain('scrambleLeaderboard');
    expect(keys).toContain('scrambleContributions');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.test.ts`
Expected: FAIL — `isAltShotSplitRound` not handled; all three scramble tabs present in the split case.

- [ ] **Step 3: Derive `isAltShotSplitRound`**

In `useViewRoundDataFetch.ts`, after the `isScrambleRound` / `isSplitRound` definitions (~line 47–58), add:

```ts
  const isAltShotSplitRound =
    (round?.team_format === 'alt-shot' || round?.game_type === 'alt-shot') &&
    round?.round_format === 'split';
```

and include `isAltShotSplitRound` in the hook's returned object (alongside `isScrambleRound`, `isSplitRound`, etc., ~line 96–102).

- [ ] **Step 4: Gate the scramble tabs**

In `useViewRoundTabs.ts`, add `isAltShotSplitRound: boolean` to the params interface (~line 9) and the destructure (~line 53), add it to the `useMemo` dependency array (~line 151), and change the scramble-tab block (~line 117–120) from:

```ts
    if (isScrambleRound) {
      result.push({ key: 'scrambleTeamScore', label: 'Scorecard' });
      result.push({ key: 'scrambleLeaderboard', label: 'Leaderboard' });
      result.push({ key: 'scrambleContributions', label: 'Contributions' });
    }
```

to:

```ts
    if (isScrambleRound) {
      // Split alt-shot is head-to-head 2v2: the cross-field Scorecard/Leaderboard
      // tabs rank across all players and are wrong here. Keep only Contributions;
      // the Sub-Matches tab already shows the pair results.
      if (!isAltShotSplitRound) {
        result.push({ key: 'scrambleTeamScore', label: 'Scorecard' });
        result.push({ key: 'scrambleLeaderboard', label: 'Leaderboard' });
      }
      result.push({ key: 'scrambleContributions', label: 'Contributions' });
    }
```

Then thread `isAltShotSplitRound` from `useViewRoundDataFetch` into the `useViewRoundTabs` call site (find where `useViewRoundTabs({...})` is invoked in `ViewRoundScreen` and pass the new field).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm jest src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.test.ts && pnpm type-check`
Expected: PASS / no new type errors.

- [ ] **Step 6: Commit**

```bash
git add src/screens/rounds/ViewRoundScreen/hooks/useViewRoundDataFetch.ts src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.ts src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.test.ts src/screens/rounds/ViewRoundScreen/*.tsx
git commit -m "feat(alt-shot): split preset shows Sub-Matches + Contributions, not scramble tabs"
```

---

### Task 4: Branding sweep + contributions verification

Confirm no rendered "Scramble" string surfaces for an alt-shot round, and that contributions compute for alt-shot.

**Files:**
- Modify (if needed): `src/screens/rounds/ViewRoundScreen/tabs/ScrambleContributionsTab.tsx` and any component reachable by an alt-shot round that renders a literal "Scramble"/"SCRAMBLE" title.
- Test: `src/hooks/competitions/useCompetitionContributions.test.ts` (extend if present; else a focused test).

- [ ] **Step 1: Find rendered "Scramble" strings reachable by alt-shot**

Run:
```bash
grep -rn "Scramble\|SCRAMBLE" src/screens/rounds/ViewRoundScreen/tabs src/components/scorecard --include="*.tsx" | grep -vE "//|/\*|\* |import|teamFormat|game_type|\.test\." 
```
For each hit that is a **rendered** string (JSX text, `label=`, `title=`) shown when the round is alt-shot, make it format-aware (e.g., derive the label from the round's format → "Alt Shot"). The `scrambleContributions` tab is the one that still renders for split alt-shot — if its header/empty-state says "Scramble", change it to a neutral or format-derived label (e.g. "Contributions"/"Alt Shot"). Comments and internal identifiers (`teamFormat === 'scramble'`, `ContributionFormat` `'scramble'`) are NOT rendered — leave them.

Report every rendered string you changed and every "Scramble" you intentionally left (with why).

- [ ] **Step 2: Verify contributions compute for alt-shot**

Add/extend a test asserting the `alt-shot → 'scramble'` `ContributionFormat` mapping is intact and yields per-player shot counts. In `src/hooks/competitions/useCompetitionContributions.test.ts` (create if absent):

```ts
// Guards that alt-shot keeps producing a (scramble-shaped) contribution format.
// contributionFormat is module-internal; assert via the public hook output or,
// if it is exported for testing, directly. If not exported, test through the
// computeContributions path with format 'scramble' + alt-shot shotContributions
// and assert the per-player shot counts.
import { computeContributions } from '@/utils/contributions/computeContributions';

it('alt-shot one-ball contributions count shots per player', () => {
  const board = computeContributions({
    rounds: [
      {
        roundId: 'r1',
        roundLabel: 'R1',
        format: 'scramble', // alt-shot maps to this internally
        gameType: 'alt-shot',
        holes: [{ number: 1, par: 4, strokeIndex: 1 } as never],
        teams: [
          {
            teamId: 't1',
            teamName: 'Sam & Alex',
            color: null,
            members: [
              { playerId: 'p1', playerName: 'Sam', handicap: 9 },
              { playerId: 'p2', playerName: 'Alex', handicap: 11 },
            ],
            strokesByPlayerHole: { p1: { 1: 4 }, p2: { 1: 4 } },
            shotContributionsByHole: { 1: { teeShot: 'p1', approach: 'p2', putt: 'p1' } },
          },
        ],
      },
    ],
  });
  const team = board.rounds[0].teams[0];
  const sam = team.players.find((p) => p.playerId === 'p1');
  const alex = team.players.find((p) => p.playerId === 'p2');
  expect(sam?.value).toBe(2);
  expect(alex?.value).toBe(1);
});
```

Adjust field names to the real `ComputeContributionsInput`/`computeScrambleTeam` shapes (see `src/utils/contributions/types.ts` and `computeContributions.ts`). If `computeScrambleTeam` counts differently (e.g. shares rather than raw counts), assert the metric it actually produces — the point is to lock alt-shot contributions behavior, not to invent a new metric.

- [ ] **Step 3: Run tests + type-check**

Run: `pnpm jest src/hooks/competitions/useCompetitionContributions.test.ts && pnpm type-check`
Expected: PASS / no new errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(alt-shot): drop scramble branding from alt-shot view; verify contributions"
```

---

### Task 5: Whole-feature verification

- [ ] **Step 1: Type-check**

Run: `pnpm type-check`
Expected: clean (no new errors vs baseline).

- [ ] **Step 2: Targeted tests**

Run:
```bash
pnpm jest src/components/scorecard/AltShotScoreCard src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.test.ts src/hooks/competitions/useCompetitionContributions.test.ts
```
Expected: all green.

- [ ] **Step 3: Baseline diff for touched areas**

Run:
```bash
pnpm jest src/screens/scoring/ScorecardEntryScreen src/screens/rounds/ViewRoundScreen src/components/scorecard 2>&1 | grep -E "Tests:|Test Suites:"
```
Compare failing suites against the documented baseline (run the same suites at the branch base commit if any look new). Expected: ZERO new failures attributable to this branch. Report the comparison.

- [ ] **Step 4: Manual QA note**

Record for on-device QA: create a `ryder_cup_foursomes_2v2` round, open score entry → confirm the **Alt Shot** card (badge "ALT SHOT", tee hint, shot tally; no "SCRAMBLE"), tag shots to each player; open View Round → confirm **Sub-Matches** + **Contributions** tabs and NO cross-field Scorecard/Leaderboard tab; confirm a combined `team_alt_shot` round still shows its existing tabs.

---

## Notes for the implementer

- The single biggest file is the `AltShotScoreCard` (Task 1). It deliberately reuses `useTeamScoreControls` + `ShotContributionSheet` — do NOT duplicate scoring logic. If the hook's param/return names differ from what Task 1 assumes, trust the real hook and adapt the card.
- Tasks 2–4 are additive and surgical: a new entry branch, a gated tab, and label fixes. Scramble, Best Ball, and the combined alt-shot preset must behave exactly as before — verify by reading each changed condition.
- This plan does NOT touch finalization, handicap math, presets, or migrations — those shipped previously and are out of scope.
