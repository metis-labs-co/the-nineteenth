# Home "Upcoming competition" card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the logged-in user's next upcoming competition round (within 7 days) as a dedicated card on the home screen that links into the competition.

**Architecture:** Reuse the existing `useUpcomingRounds()` query (already returns standalone + accepted-competition rounds in `RoundWithCourse` shape with the `competition` join). Add a pure selector in `useHomeData` that picks the next competition round in the window, expose it as `nextCompetition`, and render a new `NextCompetitionCard` on `HomeScreen` below the 24h hero card. A small refactor extracts the shared date-label helpers so the new card and `RoundTodayCard` share one copy.

**Tech Stack:** React Native (Expo), TypeScript, React Navigation, TanStack Query, Jest + @testing-library/react-native.

## Global Constraints

- Use `useThemeColors()` for dynamic colours; import `spacing`/`typography`/`borderRadius` directly from `@/constants/theme`. Never import colours directly from `theme.ts`.
- Do NOT use Paper's `Button`; use `TouchableOpacity` with explicit styling (the card is a touchable).
- Match existing home-card patterns (`RoundTodayCard`): `React.memo`, `accessibilityRole="button"`, leading icon + headline + subtitle + trailing chevron.
- Run the full test command with `pnpm test` / `pnpm jest <path>` (script: `"test": "jest"`). Use `npx jest <path>` for single files.
- Spec: `docs/superpowers/specs/2026-06-22-home-upcoming-competition-card-design.md`.

---

## File Structure

- `src/screens/home/components/dateLabels.ts` — **new**: shared `localDateStr` + `formatDayLabel` helpers (extracted from `RoundTodayCard`).
- `src/screens/home/components/RoundTodayCard.tsx` — **modify**: import the helpers instead of defining them locally (no behaviour change).
- `src/hooks/home/useHomeData.ts` — **modify**: add `computeNextCompetitionWithin7Days` helper, `nextCompetition` field on `HomeData`, and wire it into both return objects.
- `src/screens/home/components/NextCompetitionCard.tsx` — **new**: the card component.
- `src/screens/home/HomeScreen.tsx` — **modify**: render the card gated on `home.nextCompetition`.
- Tests: `src/__tests__/hooks/home/useHomeData.test.ts` (extend), `src/screens/home/components/NextCompetitionCard.test.tsx` (new), `src/screens/home/components/dateLabels.test.ts` (new).

---

## Task 1: Extract shared date-label helpers

Pull the private `localDateStr` / `formatDayLabel` out of `RoundTodayCard` into a shared module so the new card reuses them. Pure refactor — no behaviour change.

**Files:**
- Create: `src/screens/home/components/dateLabels.ts`
- Create (test): `src/screens/home/components/dateLabels.test.ts`
- Modify: `src/screens/home/components/RoundTodayCard.tsx` (remove local copies at lines 35-50, import instead)

**Interfaces:**
- Produces:
  - `localDateStr(d: Date): string` — local `YYYY-MM-DD`.
  - `formatDayLabel(dateIso: string | null): string` — `"Today"` / `"Tomorrow"` / weekday (`formatDisplayDate(d, { weekday: 'long' })`), `""` for null.

- [ ] **Step 1: Write the failing test**

Create `src/screens/home/components/dateLabels.test.ts`:

```ts
import { localDateStr, formatDayLabel } from './dateLabels';

describe('localDateStr', () => {
  it('formats a date as local YYYY-MM-DD', () => {
    expect(localDateStr(new Date('2026-06-26T08:30:00'))).toBe('2026-06-26');
  });
});

describe('formatDayLabel', () => {
  it('returns empty string for null', () => {
    expect(formatDayLabel(null)).toBe('');
  });

  it('returns "Today" for today', () => {
    const today = localDateStr(new Date());
    expect(formatDayLabel(today)).toBe('Today');
  });

  it('returns "Tomorrow" for tomorrow', () => {
    const tomorrow = localDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000));
    expect(formatDayLabel(tomorrow)).toBe('Tomorrow');
  });

  it('returns a weekday for a more distant date', () => {
    const today = localDateStr(new Date());
    const distant = today === '2026-06-26' ? '2026-07-10' : '2026-06-26';
    expect(formatDayLabel(distant)).not.toBe('');
    expect(['Today', 'Tomorrow']).not.toContain(formatDayLabel(distant));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/home/components/dateLabels.test.ts`
Expected: FAIL — cannot find module `./dateLabels`.

- [ ] **Step 3: Create the shared helper module**

Create `src/screens/home/components/dateLabels.ts`:

```ts
import { formatDisplayDate } from '@/utils/locale';

/** Local-timezone `YYYY-MM-DD` for the given date. */
export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Human day label for a `YYYY-MM-DD` (or ISO) date string:
 * "Today" / "Tomorrow" / weekday name. Empty string for null.
 */
export function formatDayLabel(dateIso: string | null): string {
  if (!dateIso) return '';
  const today = localDateStr(new Date());
  if (dateIso === today) return 'Today';
  const tomorrow = localDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (dateIso === tomorrow) return 'Tomorrow';
  const d = new Date(`${dateIso}T00:00:00`);
  return formatDisplayDate(d, { weekday: 'long' });
}
```

- [ ] **Step 4: Refactor `RoundTodayCard` to import the helpers**

In `src/screens/home/components/RoundTodayCard.tsx`:

1. Delete the local `localDateStr` (lines 35-40) and `formatDayLabel` (lines 42-50) function definitions.
2. Remove the now-unused `import { formatDisplayDate } from '@/utils/locale';` line (only if no other usage remains in the file — verify with a search; `formatTeeTime` does not use it).
3. Add to the imports block:

```ts
import { formatDayLabel } from './dateLabels';
```

Leave the rest of the file (including `getTeeTime`, `formatTeeTime`, and all JSX) unchanged.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/screens/home/components/dateLabels.test.ts src/screens/home/components/RoundTodayCard.test.tsx`
Expected: PASS — new helper tests pass and the existing `RoundTodayCard` tests still pass (proving the refactor preserved behaviour).

- [ ] **Step 6: Typecheck**

Run: `pnpm type-check`
Expected: no new errors (in particular, no "unused import" / "cannot find name" from the refactor).

- [ ] **Step 7: Commit**

```bash
git add src/screens/home/components/dateLabels.ts src/screens/home/components/dateLabels.test.ts src/screens/home/components/RoundTodayCard.tsx
git commit -m "refactor(home): extract shared date-label helpers"
```

---

## Task 2: `computeNextCompetitionWithin7Days` selector + `nextCompetition` on HomeData

Add the pure selector and expose its result from `useHomeData`.

**Files:**
- Modify: `src/hooks/home/useHomeData.ts`
- Modify (test): `src/__tests__/hooks/home/useHomeData.test.ts`

**Interfaces:**
- Consumes: `RoundWithCourse[]` from `useUpcomingRounds()` (already in scope as `upcomingRoundsRwc`), and `upcomingWithin24h?.id` (already computed).
- Produces:
  - `computeNextCompetitionWithin7Days(upcoming: RoundWithCourse[], now: Date, excludeId: string | null): RoundWithCourse | null` (exported).
  - `HomeData.nextCompetition: RoundWithCourse | null`.

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/hooks/home/useHomeData.test.ts` (the `rwcRound` factory already exists in this file — reuse it; do NOT redefine it):

```ts
import { computeNextCompetitionWithin7Days } from '@/hooks/home/useHomeData';

describe('computeNextCompetitionWithin7Days', () => {
  const now = new Date('2026-06-22T07:00:00'); // Monday

  const compRound = (over: Partial<RoundWithCourse>): RoundWithCourse =>
    rwcRound({
      competition: { id: `comp-${over.id ?? 'x'}`, name: 'Saturday Medal' },
      ...over,
    });

  it('picks the earliest competition round within 7 days', () => {
    const rounds = [
      compRound({ id: 'fri', date: '2026-06-26', tee_time: '08:30:00' }),
      compRound({ id: 'sun', date: '2026-06-28', tee_time: '08:00:00' }),
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, null)?.id).toBe('fri');
  });

  it('ignores standalone (non-competition) rounds', () => {
    const rounds = [
      rwcRound({ id: 'solo', date: '2026-06-25', tee_time: '08:00:00', competition: null }),
      compRound({ id: 'fri', date: '2026-06-26', tee_time: '08:30:00' }),
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, null)?.id).toBe('fri');
  });

  it('excludes the hero round by id', () => {
    const rounds = [
      compRound({ id: 'today', date: '2026-06-22', tee_time: '12:00:00' }),
      compRound({ id: 'fri', date: '2026-06-26', tee_time: '08:30:00' }),
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, 'today')?.id).toBe('fri');
  });

  it('includes a round on the +7d boundary', () => {
    const rounds = [
      compRound({ id: 'edge', date: '2026-06-29', tee_time: '06:00:00' }), // within 7d of Mon 07:00
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, null)?.id).toBe('edge');
  });

  it('excludes a round beyond 7 days', () => {
    const rounds = [
      compRound({ id: 'far', date: '2026-07-05', tee_time: '08:00:00' }),
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, null)).toBeNull();
  });

  it('excludes a round earlier today whose tee time has passed', () => {
    const rounds = [
      compRound({ id: 'passed', date: '2026-06-22', tee_time: '06:00:00' }),
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, null)).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(computeNextCompetitionWithin7Days([], now, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/hooks/home/useHomeData.test.ts -t "computeNextCompetitionWithin7Days"`
Expected: FAIL — `computeNextCompetitionWithin7Days` is not exported.

- [ ] **Step 3: Add the selector**

In `src/hooks/home/useHomeData.ts`, just after the `TWENTY_FOUR_HOURS_MS` constant (line 48) add:

```ts
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
```

Then add the helper after `computeUpcomingRwcWithin24h` (after line 93):

```ts
/**
 * Returns the next *competition* round (RoundWithCourse) whose tee time falls
 * within the next 7 days from `now`, or null. `excludeId` lets the caller drop
 * the round already shown in the 24h hero card so it isn't surfaced twice.
 * Standalone (non-competition) rounds are ignored. Assumes `upcoming` is sorted
 * by date ascending (as returned by useUpcomingRounds), so the first match is
 * the earliest.
 */
export function computeNextCompetitionWithin7Days(
  upcoming: RoundWithCourse[],
  now: Date,
  excludeId: string | null,
): RoundWithCourse | null {
  const cutoff = now.getTime() + SEVEN_DAYS_MS;
  for (const r of upcoming) {
    if (excludeId && r.id === excludeId) continue;
    if (!r.competition?.id) continue;
    if (!r.date) continue;
    const teeTime = r.tee_time ?? '09:00:00';
    const dateStr =
      typeof r.date === 'string'
        ? r.date.slice(0, 10)
        : (r.date as Date).toISOString().slice(0, 10);
    const start = new Date(`${dateStr}T${teeTime}`).getTime();
    if (start >= now.getTime() && start <= cutoff) return r;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/hooks/home/useHomeData.test.ts -t "computeNextCompetitionWithin7Days"`
Expected: PASS (all 7 cases).

- [ ] **Step 5: Wire `nextCompetition` into HomeData**

In `src/hooks/home/useHomeData.ts`:

1. Add to the `HomeData` interface, just after the `upcomingWithin24h` field (after line 211):

```ts
  /**
   * The user's next competition round whose tee time is within the next
   * 7 days, or null. Excludes the round already shown by `upcomingWithin24h`
   * so the home screen never shows it twice. Drives the NextCompetitionCard.
   */
  nextCompetition: RoundWithCourse | null;
```

2. Add the memo just after the `upcomingWithin24h` memo (after line 313):

```ts
  // The next competition round within a week — surfaced as a dedicated card.
  // Excludes the hero round (if any) so it isn't duplicated.
  const nextCompetition = useMemo<RoundWithCourse | null>(() => {
    return computeNextCompetitionWithin7Days(
      upcomingRoundsRwc,
      new Date(),
      upcomingWithin24h?.id ?? null,
    );
  }, [upcomingRoundsRwc, upcomingWithin24h]);
```

3. Add `nextCompetition: null,` to the dev `forceNewUserHome` return object, just after `upcomingWithin24h: null,` (line 507).

4. Add `nextCompetition,` to the real return object, just after `upcomingWithin24h,` (line 531).

- [ ] **Step 6: Typecheck**

Run: `pnpm type-check`
Expected: no new errors (both return objects now satisfy `HomeData`).

- [ ] **Step 7: Run the full home-data test file**

Run: `npx jest src/__tests__/hooks/home/useHomeData.test.ts src/hooks/home/useHomeData.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/home/useHomeData.ts src/__tests__/hooks/home/useHomeData.test.ts
git commit -m "feat(home): select next upcoming competition round within 7 days"
```

---

## Task 3: `NextCompetitionCard` component

The card itself, mirroring `RoundTodayCard`.

**Files:**
- Create: `src/screens/home/components/NextCompetitionCard.tsx`
- Create (test): `src/screens/home/components/NextCompetitionCard.test.tsx`

**Interfaces:**
- Consumes: `RoundWithCourse` (with a non-null `competition`), `formatDayLabel` from `./dateLabels`, `RootStackParamList` route `CompetitionDetail: { id: string }`.
- Produces: `NextCompetitionCard({ round }: { round: RoundWithCourse })` default-or-named export (named, `React.memo`).

- [ ] **Step 1: Write the failing test**

Create `src/screens/home/components/NextCompetitionCard.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NextCompetitionCard } from './NextCompetitionCard';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#fff',
    borderLight: '#eee',
    textPrimary: '#000',
    textSecondary: '#666',
    primary: '#080',
  }),
}));

const round = {
  id: 'r-fri',
  date: '2026-06-26',
  tee_time: '08:30:00',
  competition: { id: 'comp-1', name: 'Saturday Medal' },
} as unknown as RoundWithCourse;

beforeEach(() => mockNavigate.mockClear());

describe('NextCompetitionCard', () => {
  it('shows the competition name', () => {
    const { getByText } = render(<NextCompetitionCard round={round} />);
    expect(getByText('Saturday Medal')).toBeTruthy();
  });

  it('navigates to CompetitionDetail on press', () => {
    const { getByTestId } = render(<NextCompetitionCard round={round} />);
    fireEvent.press(getByTestId('next-competition-card'));
    expect(mockNavigate).toHaveBeenCalledWith('CompetitionDetail', { id: 'comp-1' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/home/components/NextCompetitionCard.test.tsx`
Expected: FAIL — cannot find module `./NextCompetitionCard`.

- [ ] **Step 3: Implement the component**

Create `src/screens/home/components/NextCompetitionCard.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { SectionHeader } from './SectionHeader';
import { formatDayLabel } from './dateLabels';
import { formatDisplayDate } from '@/utils/locale';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface NextCompetitionCardProps {
  round: RoundWithCourse;
}

function isoDateStr(date: RoundWithCourse['date']): string | null {
  if (!date) return null;
  return typeof date === 'string'
    ? date.slice(0, 10)
    : (date as Date).toISOString().slice(0, 10);
}

/** "This Friday · 26 Jun" — day label plus a short date. */
function buildSubtitle(dateIso: string | null): string {
  if (!dateIso) return '';
  const dayLabel = formatDayLabel(dateIso);
  const shortDate = formatDisplayDate(new Date(`${dateIso}T00:00:00`), {
    day: 'numeric',
    month: 'short',
  });
  return [dayLabel, shortDate].filter(Boolean).join(' · ');
}

export const NextCompetitionCard = React.memo(function NextCompetitionCard({
  round,
}: NextCompetitionCardProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();

  const competitionId = round.competition?.id;
  const name = round.competition?.name ?? 'Competition';
  const subtitle = buildSubtitle(isoDateStr(round.date));

  // Guard: this card is only rendered for competition rounds, but stay safe.
  if (!competitionId) return null;

  return (
    <View style={styles.wrapper}>
      <SectionHeader title="Upcoming competition" />
      <TouchableOpacity
        testID="next-competition-card"
        onPress={() =>
          navigation.navigate('CompetitionDetail', { id: competitionId })
        }
        accessibilityRole="button"
        accessibilityLabel={`Upcoming competition ${name}, ${subtitle}`}
        accessibilityHint="Opens the competition"
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.row}>
          <Icon source="trophy-outline" size={28} color={colors.primary} />
          <View style={styles.text}>
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {!!subtitle && (
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
          <Icon source="chevron-right" size={22} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  text: { flex: 1 },
  title: { ...typography.body, fontWeight: '700' },
  subtitle: { ...typography.caption, marginTop: 2 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/home/components/NextCompetitionCard.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Typecheck**

Run: `pnpm type-check`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/screens/home/components/NextCompetitionCard.tsx src/screens/home/components/NextCompetitionCard.test.tsx
git commit -m "feat(home): add NextCompetitionCard component"
```

---

## Task 4: Render the card on the home screen

Wire the card into `HomeScreen`, gated on `home.nextCompetition`.

**Files:**
- Modify: `src/screens/home/HomeScreen.tsx`

**Interfaces:**
- Consumes: `home.nextCompetition` (from Task 2), `NextCompetitionCard` (from Task 3).

- [ ] **Step 1: Add the import**

In `src/screens/home/HomeScreen.tsx`, add to the home-component imports (near the `RoundTodayCard` import):

```ts
import { NextCompetitionCard } from './components/NextCompetitionCard';
```

(If imports use a relative `./components/...` style elsewhere in the file, match it; the `RoundTodayCard` import is the reference.)

- [ ] **Step 2: Render the card below the hero**

In the JSX, immediately after the `upcomingWithin24h` block (currently lines 204-206), insert:

```tsx
              {home.nextCompetition ? (
                <NextCompetitionCard round={home.nextCompetition} />
              ) : null}
```

So the order becomes: hero `RoundTodayCard` → `NextCompetitionCard` → `HandicapHomeCard`.

- [ ] **Step 3: Typecheck**

Run: `pnpm type-check`
Expected: no new errors.

- [ ] **Step 4: Run the home test suite**

Run: `npx jest src/screens/home src/__tests__/hooks/home`
Expected: PASS — no regressions in existing home tests.

- [ ] **Step 5: Commit**

```bash
git add src/screens/home/HomeScreen.tsx
git commit -m "feat(home): render upcoming competition card on home screen"
```

---

## Task 5: Manual verification & date caveat

No code unless a problem is found — confirm the real behaviour and the spec's known caveat.

- [ ] **Step 1: Run the app and inspect the home screen**

Run the app (`npx expo start --ios` or the project's usual launcher) signed in as a user with a competition scheduled ~this Friday.

Expected: an "Upcoming competition" card appears below any round-today hero, showing the competition name and a "This Friday · DD Mon"-style subtitle. Tapping it opens that competition's detail screen.

- [ ] **Step 2: If the card does NOT appear, diagnose the `date` caveat**

The card is driven by `useUpcomingRounds`, which filters `status = 'upcoming'` AND `date >= today` (non-null `date`). Query the round in Supabase (staging/prod as appropriate):

```sql
select id, competition_id, status, date, tee_time
from rounds
where competition_id = '<your competition id>';
```

- If `date` is NULL or `status` is not `upcoming`, that is why it is hidden. This matches the spec's documented caveat (rounds relying on the competition `start_date` rather than a per-round `date`). **Do not silently widen the query** — report the finding; broadening to competition `start_date` is a separate, larger change to scope with the user.
- If `date` is set and in the future and `status = 'upcoming'` but the card still doesn't show, capture the `useUpcomingRounds` result and re-open the helper logic (`computeNextCompetitionWithin7Days`) for an off-by-one in the window.

- [ ] **Step 3: Final full test run**

Run: `pnpm test`
Expected: no new failures versus the main baseline (note: the repo has a known set of pre-existing failures; compare against baseline, do not attribute those to this change).

---

## Self-Review

- **Spec coverage:**
  - Dedicated card → Task 3. ✓
  - Tap → `CompetitionDetail` → Task 3 Step 3 + test. ✓
  - 7-day window → Task 2 `computeNextCompetitionWithin7Days`. ✓
  - Content = name + date/day label → Task 3 (`buildSubtitle` + name). ✓
  - Below hero, above handicap → Task 4 Step 2. ✓
  - Hero de-dup via `excludeId` → Task 2 (memo passes `upcomingWithin24h?.id`). ✓
  - Shared date helper refactor → Task 1. ✓
  - Edge cases (null date, within-24h, multiple, none) → Task 2 tests + Task 5 caveat. ✓
  - Tests for the helper → Task 2 Step 1. ✓
- **Placeholder scan:** none — all steps contain concrete code/commands.
- **Type consistency:** `computeNextCompetitionWithin7Days` signature identical in Task 2 definition, test, and the `useHomeData` memo; `nextCompetition: RoundWithCourse | null` consistent across interface + both return objects + screen usage; `formatDayLabel` signature identical in Task 1 and Task 3; route `CompetitionDetail: { id: string }` matches `navigation/types.ts:35`.
