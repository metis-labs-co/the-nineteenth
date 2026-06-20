# Home Social Handicap Index Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a prominent, tappable Social Handicap Index card to the Home screen — showing the index value plus a compact trend graph, deep-linking to the full history screen, and gated behind the `handicap_history` tier feature.

**Architecture:** Reuse existing data (`useHandicapHistory`), formatting (`formatHandicapIndex`), the chart (`HandicapTrendChart`, given a new compact variant), and gating (`FeatureLock`). A new presentational `HandicapHomeCard` composes them; `useHomeData` exposes the summary; `HomeScreen` renders the card wrapped in `FeatureLock`.

**Tech Stack:** React Native (Expo), TypeScript, TanStack Query, React Navigation, `react-native-gifted-charts`, Jest + `@testing-library/react-native`.

## Global Constraints

- Styling: use `useThemeColors()` for colors; import static tokens (`spacing`, `typography`, `borderRadius`, `shadows`) directly from `@/constants/theme`. Never import colors directly. (CLAUDE.md)
- Do NOT use Paper's `Button`; use `TouchableOpacity`. Use Paper `Text`/`Icon`. (CLAUDE.md)
- Gating feature flag is exactly `handicap_history` (same as `HandicapHistoryScreen`). Upgrade route is `Subscription`.
- Deep-link target route is exactly `HandicapHistory` (params: `undefined`).
- Index formatting must go through `formatHandicapIndex` from `@/utils/displayHelpers`.
- Tests are colocated `*.test.tsx` / `*.test.ts`; run with `pnpm test`. Render via `@testing-library/react-native` with no provider wrapper (theme context has a default), matching `src/screens/home/components/HomeTile.test.tsx`.
- Baseline jest has ~243 pre-existing failures on `main`; judge results by diff vs baseline, not absolute pass.

---

### Task 1: Add a `compact` variant to `HandicapTrendChart`

**Files:**
- Modify: `src/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart.tsx`
- Test: `src/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart.test.tsx` (create)

**Interfaces:**
- Consumes: `HandicapRound[]` (existing `@/types`).
- Produces: `HandicapTrendChart` now accepts `variant?: 'full' | 'compact'` (default `'full'`). Compact renders only the curved line (height ~56px), no title/subtitle/legend/footer/card chrome; renders `null` when `rounds.length < 2`. Full mode behaviour is unchanged.

- [ ] **Step 1: Write the failing test**

Create `src/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { HandicapTrendChart } from './HandicapTrendChart';
import type { HandicapRound } from '@/types';

// Stub the charting lib so jest never renders the native chart.
jest.mock('react-native-gifted-charts', () => ({
  LineChart: () => null,
}));

function makeRounds(n: number): HandicapRound[] {
  return Array.from({ length: n }, (_, i) => ({
    scorecardId: `s${i}`,
    roundDate: `2026-01-0${(i % 9) + 1}`,
    handicapDifferential: 10 + i,
    isQualifying: i % 2 === 0,
    isCombined: false,
  })) as unknown as HandicapRound[];
}

describe('HandicapTrendChart', () => {
  it('renders title and legend in full mode', () => {
    const { getByText } = render(<HandicapTrendChart rounds={makeRounds(5)} />);
    expect(getByText('Differential Trend')).toBeTruthy();
    expect(getByText('Counts toward index')).toBeTruthy();
  });

  it('omits title and legend in compact mode', () => {
    const { queryByText } = render(
      <HandicapTrendChart rounds={makeRounds(5)} variant="compact" />,
    );
    expect(queryByText('Differential Trend')).toBeNull();
    expect(queryByText('Counts toward index')).toBeNull();
  });

  it('renders nothing in compact mode with fewer than 2 rounds', () => {
    const { toJSON } = render(
      <HandicapTrendChart rounds={makeRounds(1)} variant="compact" />,
    );
    expect(toJSON()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- HandicapTrendChart`
Expected: FAIL — compact-mode assertions fail (component ignores `variant`, still renders title).

- [ ] **Step 3: Implement the compact variant**

In `HandicapTrendChart.tsx`, update the props interface and add compact handling. Change the interface (around line 18):

```tsx
interface HandicapTrendChartProps {
  rounds: HandicapRound[];
  variant?: 'full' | 'compact';
}
```

Update the component signature (around line 22):

```tsx
export const HandicapTrendChart = React.memo(function HandicapTrendChart({
  rounds,
  variant = 'full',
}: HandicapTrendChartProps) {
```

Immediately after the `chartData`/`yAxisConfig`/`chartWidth` memos and before the existing `if (rounds.length < 2)` block (around line 64), add the compact branch:

```tsx
  if (variant === 'compact') {
    if (!chartData) return null;
    return (
      <View style={styles.compactContainer}>
        <LineChart
          data={chartData}
          height={56}
          width={chartWidth}
          spacing={chartWidth / Math.max(chartData.length - 1, 1)}
          initialSpacing={6}
          endSpacing={6}
          color1={colors.primary}
          thickness={2}
          curved
          curvature={0.2}
          hideRules
          hideDataPoints
          hideYAxisText
          xAxisColor="transparent"
          yAxisColor="transparent"
          hideAxesAndRules
        />
      </View>
    );
  }
```

Add the `compactContainer` style to the `StyleSheet.create` block (after `card`):

```tsx
  compactContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- HandicapTrendChart`
Expected: PASS (3 tests).

- [ ] **Step 5: Type-check**

Run: `pnpm type-check`
Expected: no new errors introduced by this file.

- [ ] **Step 6: Commit**

```bash
git add src/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart.tsx \
        src/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart.test.tsx
git commit -m "feat(handicap): add compact variant to HandicapTrendChart"
```

---

### Task 2: Create `HandicapHomeCard` and export it

**Files:**
- Create: `src/screens/home/components/HandicapHomeCard.tsx`
- Create: `src/screens/home/components/HandicapHomeCard.test.tsx`
- Modify: `src/screens/home/components/index.ts`

**Interfaces:**
- Consumes: `HandicapSummary | null` (`@/types/handicap.types`), `formatHandicapIndex` (`@/utils/displayHelpers`), `HandicapTrendChart` with `variant="compact"` (from Task 1).
- Produces: `HandicapHomeCard({ summary, onPress, testID? })` — a full-width `TouchableOpacity`. Props:
  ```tsx
  interface HandicapHomeCardProps {
    summary: HandicapSummary | null;
    onPress: () => void;
    testID?: string;
  }
  ```
  When `summary` is null or `summary.totalRounds === 0`, renders the index as `—` with prompt copy `Play rounds to establish your index` and no chart. Otherwise renders the formatted index, subtitle `Best {qualifyingRoundsCount} of {totalRounds}`, and the compact chart when `summary.rounds.length >= 2`.

- [ ] **Step 1: Write the failing test**

Create `src/screens/home/components/HandicapHomeCard.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HandicapHomeCard } from './HandicapHomeCard';
import type { HandicapSummary } from '@/types/handicap.types';

// Isolate from the charting lib.
jest.mock(
  '@/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart',
  () => ({ HandicapTrendChart: () => null }),
);

function makeSummary(overrides: Partial<HandicapSummary> = {}): HandicapSummary {
  return {
    handicapIndex: 12.4,
    totalRounds: 20,
    qualifyingRoundsCount: 8,
    rounds: [],
    combinablePairs: [],
    lastUpdated: null,
    ...overrides,
  } as unknown as HandicapSummary;
}

describe('HandicapHomeCard', () => {
  it('renders the formatted index and subtitle when data exists', () => {
    const { getByText } = render(
      <HandicapHomeCard summary={makeSummary()} onPress={jest.fn()} />,
    );
    expect(getByText('Social Handicap Index')).toBeTruthy();
    expect(getByText('12.4')).toBeTruthy();
    expect(getByText('Best 8 of 20')).toBeTruthy();
  });

  it('renders the empty prompt when summary is null', () => {
    const { getByText } = render(
      <HandicapHomeCard summary={null} onPress={jest.fn()} />,
    );
    expect(getByText('—')).toBeTruthy();
    expect(getByText('Play rounds to establish your index')).toBeTruthy();
  });

  it('renders the empty prompt when there are zero rounds', () => {
    const { getByText } = render(
      <HandicapHomeCard
        summary={makeSummary({ handicapIndex: null, totalRounds: 0, qualifyingRoundsCount: 0 })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('—')).toBeTruthy();
    expect(getByText('Play rounds to establish your index')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HandicapHomeCard summary={makeSummary()} onPress={onPress} testID="hcap-card" />,
    );
    fireEvent.press(getByTestId('hcap-card'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- HandicapHomeCard`
Expected: FAIL — `Cannot find module './HandicapHomeCard'`.

- [ ] **Step 3: Implement the component**

Create `src/screens/home/components/HandicapHomeCard.tsx`:

```tsx
/**
 * HandicapHomeCard - Home-screen card surfacing the player's Social Handicap
 * Index with a compact trend graph. Taps through to the full HandicapHistory
 * screen. Empty (no qualifying rounds) state still renders, prompting play.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { formatHandicapIndex } from '@/utils/displayHelpers';
import { HandicapTrendChart } from '@/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart';
import type { HandicapSummary } from '@/types/handicap.types';

interface HandicapHomeCardProps {
  summary: HandicapSummary | null;
  onPress: () => void;
  testID?: string;
}

export function HandicapHomeCard({ summary, onPress, testID }: HandicapHomeCardProps) {
  const colors = useThemeColors();

  const hasData = !!summary && summary.totalRounds > 0;
  const showChart = hasData && summary!.rounds.length >= 2;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="View handicap history"
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Social Handicap Index
          </Text>
          <Text style={[styles.indexValue, { color: colors.textPrimary }]}>
            {hasData ? formatHandicapIndex(summary!.handicapIndex) : '—'}
          </Text>
          {hasData ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Best {summary!.qualifyingRoundsCount} of {summary!.totalRounds}
            </Text>
          ) : (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Play rounds to establish your index
            </Text>
          )}
        </View>
        <Icon source="chevron-right" size={24} color={colors.textTertiary} />
      </View>

      {showChart ? (
        <View style={styles.chartWrapper}>
          <HandicapTrendChart rounds={summary!.rounds} variant="compact" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xxs,
  },
  indexValue: {
    ...typography.display,
    fontSize: 40,
    lineHeight: 46,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  chartWrapper: {
    marginTop: spacing.md,
  },
});
```

- [ ] **Step 4: Export from the components barrel**

In `src/screens/home/components/index.ts`, add after the `RoundTodayCard` export:

```tsx
export { HandicapHomeCard } from './HandicapHomeCard';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- HandicapHomeCard`
Expected: PASS (4 tests).

- [ ] **Step 6: Type-check**

Run: `pnpm type-check`
Expected: no new errors from the new file.

- [ ] **Step 7: Commit**

```bash
git add src/screens/home/components/HandicapHomeCard.tsx \
        src/screens/home/components/HandicapHomeCard.test.tsx \
        src/screens/home/components/index.ts
git commit -m "feat(home): add HandicapHomeCard component"
```

---

### Task 3: Expose `handicapSummary` from `useHomeData`

**Files:**
- Modify: `src/hooks/home/useHomeData.ts`
- Test: `src/hooks/home/useHomeData.test.ts` (create — covers only the new field plumbing)

**Interfaces:**
- Consumes: `useHandicapHistory(userId)` → `{ data: HandicapSummary | undefined, refetch }` (from `@/hooks/player`).
- Produces: `HomeData` gains `handicapSummary: HandicapSummary | null`. Present in both the dev `forceNewUserHome` return (as `null`) and the normal return (as `handicapHistory ?? null`). Its `refetch` is added to `refetchAll`.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/home/useHomeData.test.ts`. This isolates `useHomeData` by mocking every hook it composes; the assertion is only that `handicapSummary` is surfaced from `useHandicapHistory`.

```ts
import { renderHook } from '@testing-library/react-native';
import { useHomeData } from './useHomeData';

// --- Mock every composed hook so useHomeData runs in isolation. ---
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, player: { id: 'p1', name: 'Sam Kay' } }),
}));
jest.mock('@/screens/rounds/RoundListScreen/hooks/useRoundList', () => ({
  useRoundList: () => ({ rounds: { active: [], history: [] }, isLoading: false, isRefetching: false, refetch: jest.fn() }),
}));
jest.mock('@/hooks/competitions/queries', () => ({ useCompetitions: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/leagues/queries', () => ({ useLeagues: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/player/queries', () => ({ usePlayer: () => ({ data: { handicap: 12 }, refetch: jest.fn() }) }));
jest.mock('@/hooks/playerStatistics/queries', () => ({ usePlayerStatistics: () => ({ data: null, refetch: jest.fn() }) }));
jest.mock('@/hooks/achievements/queries', () => ({
  useAchievementProgress: () => ({ data: [], refetch: jest.fn() }),
  useAchievementDefinitions: () => ({ data: [] }),
  useAchievementSummary: () => ({ data: null }),
}));
jest.mock('@/hooks/friends', () => ({ useFriends: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/notifications/queries', () => ({ useUnreadNotificationCount: () => ({ data: 0, refetch: jest.fn() }) }));
jest.mock('@/hooks/queries/useBag', () => ({ useBag: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/queries/useHasCreatedRound', () => ({ useHasCreatedRound: () => ({ data: false, refetch: jest.fn() }) }));
jest.mock('./usePendingActions', () => ({ usePendingActions: () => ({ actions: [], refetch: jest.fn() }) }));
jest.mock('./useInProgressRounds', () => ({ useInProgressRounds: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('./useUpcomingRounds', () => ({ useUpcomingRounds: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/store/devFlagsStore', () => ({ useDevFlagsStore: () => false }));

const mockHandicap = { handicapIndex: 9.1, totalRounds: 15, qualifyingRoundsCount: 6, rounds: [], combinablePairs: [], lastUpdated: null };
jest.mock('@/hooks/player', () => ({
  useHandicapHistory: () => ({ data: mockHandicap, refetch: jest.fn() }),
  useCombineHandicapRounds: () => ({ mutate: jest.fn(), isPending: false }),
  useUncombineHandicapRound: () => ({ mutate: jest.fn(), isPending: false }),
}));

describe('useHomeData', () => {
  it('exposes handicapSummary from useHandicapHistory', () => {
    const { result } = renderHook(() => useHomeData());
    expect(result.current.handicapSummary).toEqual(mockHandicap);
  });
});
```

> Note: `useHomeData` imports `useHandicapHistory` directly from `@/hooks/player` (added in Step 3). If it instead imports from `@/hooks/useHandicapHistory`, mock that path. Use the import path the implementation actually uses.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- useHomeData`
Expected: FAIL — `handicapSummary` is `undefined` (field doesn't exist yet).

- [ ] **Step 3: Add the import**

In `src/hooks/home/useHomeData.ts`, add to the imports near the other player hooks (after the `usePlayer` import on line 14):

```ts
import { useHandicapHistory } from '@/hooks/player';
```

Add `HandicapSummary` to the type imports (extend the existing `@/types/...` imports near the top):

```ts
import type { HandicapSummary } from '@/types/handicap.types';
```

- [ ] **Step 4: Add the field to the `HomeData` interface**

In the `HomeData` interface (around line 192), add after `handicap: HandicapHighlight;`:

```ts
  /** Full Social Handicap Index summary for the Home handicap card. */
  handicapSummary: HandicapSummary | null;
```

- [ ] **Step 5: Call the hook and wire refetch**

Inside `useHomeData`, after the `usePlayer` call (around line 256), add:

```ts
  const { data: handicapHistory, refetch: refetchHandicap } =
    useHandicapHistory(userId);
```

In `refetchAll` (around line 459), add a line:

```ts
    refetchHandicap();
```

- [ ] **Step 6: Add the field to both return objects**

In the dev `forceNewUserHome` return (around line 492), add after `handicap: { value: null, delta30d: null, hasHandicap: false },`:

```ts
      handicapSummary: null,
```

In the normal return (around line 516), add after `handicap: handicapHighlight,`:

```ts
    handicapSummary: handicapHistory ?? null,
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm test -- useHomeData`
Expected: PASS.

- [ ] **Step 8: Type-check**

Run: `pnpm type-check`
Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/home/useHomeData.ts src/hooks/home/useHomeData.test.ts
git commit -m "feat(home): expose handicapSummary from useHomeData"
```

---

### Task 4: Render the gated card in `HomeScreen`

**Files:**
- Modify: `src/screens/home/HomeScreen.tsx`

**Interfaces:**
- Consumes: `home.handicapSummary` (Task 3), `HandicapHomeCard` (Task 2), `FeatureLock` (`@/components/subscription`), navigation routes `HandicapHistory` and `Subscription`.
- Produces: (no new exports) — visual integration only.

- [ ] **Step 1: Add imports**

In `src/screens/home/HomeScreen.tsx`, add `HandicapHomeCard` to the components-barrel import block (the `from './components'` import, around lines 43-53):

```tsx
  HandicapHomeCard,
```

Add the `FeatureLock` import near the other component imports (after the `@/components/competitions/detail/sections` import, around line 35):

```tsx
import { FeatureLock } from '@/components/subscription';
```

- [ ] **Step 2: Add the navigation handler**

Alongside the other `useCallback` handlers (after `handleViewAllRounds`, around line 135):

```tsx
  const handleViewHandicap = useCallback(() => {
    navigation.navigate('HandicapHistory');
  }, [navigation]);
```

- [ ] **Step 3: Render the gated card below active rounds**

In the JSX `styles.body` block, insert immediately after the `RoundTodayCard` block (after line 200, the closing `) : null}` of the `upcomingWithin24h` conditional) and before `<PendingActionsSection ... />`:

```tsx
              <FeatureLock
                feature="handicap_history"
                onUpgradePress={() => navigation.navigate('Subscription')}
              >
                <HandicapHomeCard
                  summary={home.handicapSummary}
                  onPress={handleViewHandicap}
                  testID="home-handicap-card"
                />
              </FeatureLock>
```

- [ ] **Step 4: Type-check**

Run: `pnpm type-check`
Expected: no new errors. (If `navigation.navigate('Subscription')` or `'HandicapHistory'` errors, confirm the route names against `src/navigation/types.ts` — both already exist and are used elsewhere in the app.)

- [ ] **Step 5: Lint**

Run: `pnpm lint -- src/screens/home/HomeScreen.tsx`
Expected: no new errors.

- [ ] **Step 6: Full home test sweep (diff vs baseline)**

Run: `pnpm test -- src/screens/home`
Expected: HandicapHomeCard tests pass; no NEW failures vs the ~243-failure baseline.

- [ ] **Step 7: Commit**

```bash
git add src/screens/home/HomeScreen.tsx
git commit -m "feat(home): show gated Social Handicap Index card on Home"
```

---

### Task 5: Manual verification

**Files:** none (manual QA).

- [ ] **Step 1: Run the app** — `npx expo start` (or your usual device/sim flow).
- [ ] **Step 2:** As a user **with** `handicap_history` access and qualifying rounds: confirm the card appears below the active-round sections, shows the index, subtitle, and compact graph, and tapping opens `HandicapHistory`.
- [ ] **Step 3:** As a user **with** access but **no** qualifying rounds: confirm the card shows `—` and "Play rounds to establish your index", no graph, still taps through.
- [ ] **Step 4:** As a user **without** access (Free): confirm the card renders dimmed under the `FeatureLock` overlay and the upgrade affordance routes to `Subscription`.
- [ ] **Step 5:** Toggle light/dark theme and confirm the card reads correctly in both.

---

## Self-Review

**Spec coverage:**
- New `HandicapHomeCard` → Task 2. ✅
- Compact chart variant on `HandicapTrendChart` → Task 1. ✅
- `useHomeData` exposes `handicapSummary` (+ refetch, + dev-blank null) → Task 3. ✅
- Gated render in `HomeScreen`, placed below active rounds, before `PendingActionsSection` → Task 4. ✅
- Empty state ("Play rounds…") → Task 2 (component) + Task 5 step 3 (QA). ✅
- Deep-link to `HandicapHistory`; upgrade to `Subscription` → Task 4. ✅
- Gating via `handicap_history` flag → Task 4. ✅
- Whole-card overlay (index + graph) → Task 4 (FeatureLock wraps the entire `HandicapHomeCard`). ✅

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✅

**Type consistency:** `HandicapHomeCardProps` (`summary`, `onPress`, `testID`) is identical in Task 2's interface block, implementation, and Task 4's usage. `handicapSummary: HandicapSummary | null` consistent across Tasks 2/3/4. `variant?: 'full' | 'compact'` consistent across Tasks 1/2. ✅
