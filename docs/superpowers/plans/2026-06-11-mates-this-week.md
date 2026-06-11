# Mates This Week Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home screen's `FriendActivitySection` carousel with a ranked "Mates this week" leaderboard showing each friend's (and your own) best Stableford round submitted this week.

**Architecture:** A pure aggregation module (`matesLeaderboard.ts`) turns weekly scorecard rows into a ranked best-round-per-player list. A thin TanStack Query hook (`useMatesThisWeek`) fetches scorecards for `[you, ...friends]` joined to `rounds` filtered to the current Monday–Sunday week (client-side query, no migration — same RLS-permitted pattern as `useFriendStats`). A new `MatesThisWeekSection` component renders the ranked list reusing existing tokens, `SectionHeader`, `PlayerAvatar`, and the current-user highlight treatment from `MiniLeaderboardSection`. The old `FriendActivitySection`, `HomeActivityHeroCard`, and `useHomeActivityPreview` are deleted.

**Tech Stack:** React Native + TypeScript, TanStack Query, Supabase JS client, date-fns, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-06-11-mates-this-week-design.md`

**Conventions that apply to every task:**
- Run all commands from the repo root: `/Users/samkay/Documents/MetisCo/Dev/the-nineteenth`
- Test runner is Jest via pnpm: `pnpm test -- <pattern>` (e.g. `pnpm test -- matesLeaderboard`)
- Never import colors statically — use `useThemeColors()` from `@/context/ThemeContext`. Static tokens (`spacing`, `typography`, `borderRadius`, `shadows`) ARE imported directly from `@/constants/theme`.
- Use `TouchableOpacity` (not Paper's Button), `Text` from `react-native-paper`.

---

### Task 1: `getWeekRange` utility

**Files:**
- Modify: `src/utils/formatting.ts` (add function after `parseLocalDateString`, ~line 49; extend the existing `date-fns` import at line 8)
- Create: `src/utils/__tests__/formatting.test.ts` (no formatting test file exists yet)

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/formatting.test.ts`:

```typescript
import { getWeekRange } from '../formatting';

describe('getWeekRange', () => {
  it('returns Monday to Sunday for a midweek date', () => {
    // Thursday 11 June 2026
    expect(getWeekRange(new Date(2026, 5, 11))).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    });
  });

  it('treats Monday as the start of its own week', () => {
    expect(getWeekRange(new Date(2026, 5, 8))).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    });
  });

  it('keeps Sunday in the preceding week (week starts Monday)', () => {
    expect(getWeekRange(new Date(2026, 5, 14))).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    });
  });

  it('spans month boundaries', () => {
    // Wednesday 1 July 2026
    expect(getWeekRange(new Date(2026, 6, 1))).toEqual({
      start: '2026-06-29',
      end: '2026-07-05',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- formatting.test`
Expected: FAIL — `getWeekRange` is not exported.

- [ ] **Step 3: Implement `getWeekRange`**

In `src/utils/formatting.ts`, change the date-fns import (line 8) to:

```typescript
import { format, parse, isValid, startOfWeek, endOfWeek } from 'date-fns';
```

Add after `parseLocalDateString` (after ~line 49):

```typescript
/**
 * Get the Monday–Sunday range of the week containing `date`, as local
 * YYYY-MM-DD strings (inclusive). Used to filter "this week" content
 * against `rounds.date` (a local calendar date string).
 */
export function getWeekRange(date: Date = new Date()): { start: string; end: string } {
  return {
    start: format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- formatting.test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/formatting.ts src/utils/__tests__/formatting.test.ts
git commit -m "feat(home): add getWeekRange local Monday-Sunday week utility"
```

---

### Task 2: `buildMatesLeaderboard` pure aggregation

**Files:**
- Create: `src/hooks/home/matesLeaderboard.ts`
- Create: `src/__tests__/hooks/home/matesLeaderboard.test.ts` (directory `src/__tests__/hooks/home/` already exists)

The aggregation is a separate file (not inside the hook) so tests don't pull in the Supabase client or auth context.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/hooks/home/matesLeaderboard.test.ts`:

```typescript
import {
  buildMatesLeaderboard,
  type MateProfile,
  type WeeklyScorecardRow,
} from '@/hooks/home/matesLeaderboard';

const profiles = new Map<string, MateProfile>([
  ['me', { name: 'Sam', photoUrl: null }],
  ['f1', { name: 'Mia', photoUrl: 'https://example.com/mia.jpg' }],
  ['f2', { name: 'Jess', photoUrl: null }],
]);

function row(playerId: string, points: number | null, roundId: string): WeeklyScorecardRow {
  return { player_id: playerId, total_points: points, round_id: roundId };
}

describe('buildMatesLeaderboard', () => {
  it('keeps each player best round and sorts by points descending', () => {
    const result = buildMatesLeaderboard(
      [row('me', 31, 'r1'), row('f1', 34, 'r2'), row('f1', 38, 'r3'), row('f2', 22, 'r4')],
      profiles,
      'me'
    );
    expect(result.map((e) => [e.playerId, e.points, e.roundId])).toEqual([
      ['f1', 38, 'r3'],
      ['me', 31, 'r1'],
      ['f2', 22, 'r4'],
    ]);
  });

  it('flags the current user', () => {
    const result = buildMatesLeaderboard([row('me', 31, 'r1'), row('f1', 38, 'r2')], profiles, 'me');
    expect(result.find((e) => e.playerId === 'me')?.isCurrentUser).toBe(true);
    expect(result.find((e) => e.playerId === 'f1')?.isCurrentUser).toBe(false);
  });

  it('carries name and photoUrl from the profile map', () => {
    const result = buildMatesLeaderboard([row('f1', 38, 'r2')], profiles, 'me');
    expect(result[0]).toMatchObject({ name: 'Mia', photoUrl: 'https://example.com/mia.jpg' });
  });

  it('breaks point ties by name ascending for stable output', () => {
    const result = buildMatesLeaderboard(
      [row('f2', 30, 'r1'), row('f1', 30, 'r2')],
      profiles,
      'me'
    );
    expect(result.map((e) => e.name)).toEqual(['Jess', 'Mia']);
  });

  it('omits players with no rows and skips null points', () => {
    const result = buildMatesLeaderboard([row('me', null, 'r1'), row('f1', 20, 'r2')], profiles, 'me');
    expect(result.map((e) => e.playerId)).toEqual(['f1']);
  });

  it('ignores rows for players not in the profile map', () => {
    const result = buildMatesLeaderboard([row('stranger', 40, 'r9'), row('f1', 20, 'r2')], profiles, 'me');
    expect(result.map((e) => e.playerId)).toEqual(['f1']);
  });

  it('returns an empty array for empty input', () => {
    expect(buildMatesLeaderboard([], profiles, 'me')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- matesLeaderboard`
Expected: FAIL — module `@/hooks/home/matesLeaderboard` not found.

- [ ] **Step 3: Implement the module**

Create `src/hooks/home/matesLeaderboard.ts`:

```typescript
/**
 * Mates-this-week leaderboard helpers — pure aggregation from weekly
 * scorecard rows to a ranked best-round-per-player list.
 *
 * Kept separate from useMatesThisWeek so the logic is testable without
 * the Supabase client or auth context.
 */

export interface MateWeeklyEntry {
  playerId: string;
  name: string;
  photoUrl: string | null;
  /** Best single-round Stableford points this week */
  points: number;
  /** Round id of that best round, for tap-through to RoundActivity */
  roundId: string;
  isCurrentUser: boolean;
}

export interface WeeklyScorecardRow {
  player_id: string;
  total_points: number | null;
  round_id: string;
}

export interface MateProfile {
  name: string;
  photoUrl: string | null;
}

export function buildMatesLeaderboard(
  rows: WeeklyScorecardRow[],
  profiles: Map<string, MateProfile>,
  currentUserId: string
): MateWeeklyEntry[] {
  const bestByPlayer = new Map<string, { points: number; roundId: string }>();

  for (const row of rows) {
    if (row.total_points == null) continue;
    if (!profiles.has(row.player_id)) continue;
    const best = bestByPlayer.get(row.player_id);
    if (!best || row.total_points > best.points) {
      bestByPlayer.set(row.player_id, { points: row.total_points, roundId: row.round_id });
    }
  }

  return [...bestByPlayer.entries()]
    .map(([playerId, best]) => {
      const profile = profiles.get(playerId)!;
      return {
        playerId,
        name: profile.name,
        photoUrl: profile.photoUrl,
        points: best.points,
        roundId: best.roundId,
        isCurrentUser: playerId === currentUserId,
      };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- matesLeaderboard`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/home/matesLeaderboard.ts src/__tests__/hooks/home/matesLeaderboard.test.ts
git commit -m "feat(home): add mates-this-week leaderboard aggregation"
```

---

### Task 3: `useMatesThisWeek` query hook

**Files:**
- Modify: `src/hooks/queryKeys/social.ts` (add key to `friendsKeys`, ~line 22)
- Create: `src/hooks/home/useMatesThisWeek.ts`
- Modify: `src/hooks/home/index.ts` (export hook + types)

This hook is thin glue (auth + friends cache + one Supabase query + the tested aggregation); it is covered by type-check and the component test in Task 4 rather than its own unit test.

- [ ] **Step 1: Add the query key**

In `src/hooks/queryKeys/social.ts`, add to the `friendsKeys` object after the `detail` line (line 22):

```typescript
  matesThisWeek: (userId?: string, weekStart?: string) =>
    [...friendsKeys.all, 'mates-this-week', userId, weekStart] as const,
```

The key is rooted at `friendsKeys.all` so existing friend-mutation invalidations also refresh this query.

- [ ] **Step 2: Implement the hook**

Create `src/hooks/home/useMatesThisWeek.ts`:

```typescript
/**
 * useMatesThisWeek - ranked "best Stableford round this week" for the
 * current user and their accepted friends, powering the Home screen
 * "Mates this week" section.
 *
 * Client-side query (no RPC): RLS permits reading friends' scorecards,
 * matching the pattern in useFriendStats.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { friendsKeys } from '../queryKeys';
import { useAuth } from '../useAuth';
import { useFriends } from '../useFriends';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { getWeekRange } from '@/utils/formatting';
import {
  buildMatesLeaderboard,
  type MateProfile,
  type MateWeeklyEntry,
  type WeeklyScorecardRow,
} from './matesLeaderboard';

export function useMatesThisWeek() {
  const { user, player } = useAuth();
  const { data: friends } = useFriends();
  const { start, end } = getWeekRange();
  const userId = user?.id;

  return useQuery({
    queryKey: friendsKeys.matesThisWeek(userId, start),
    queryFn: async (): Promise<MateWeeklyEntry[]> => {
      if (!userId) return [];

      const profiles = new Map<string, MateProfile>();
      profiles.set(userId, {
        name: player?.name ?? 'You',
        photoUrl: player?.photo_url ?? null,
      });
      (friends ?? []).forEach((f) => {
        profiles.set(f.id, { name: f.name, photoUrl: f.photo_url });
      });

      const { data, error } = await supabase
        .from('scorecards')
        .select(
          `
          player_id,
          total_points,
          round_id,
          round:rounds!inner(date)
        `
        )
        .in('player_id', [...profiles.keys()])
        .in('status', ['completed', 'confirmed'])
        .is('round.deleted_at', null)
        .gte('round.date', start)
        .lte('round.date', end);

      if (error) {
        console.error('Error fetching mates this week:', error);
        throw error;
      }

      return buildMatesLeaderboard(
        (data ?? []) as unknown as WeeklyScorecardRow[],
        profiles,
        userId
      );
    },
    enabled: !!userId && friends !== undefined,
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
  });
}
```

- [ ] **Step 3: Export from the home hooks index**

In `src/hooks/home/index.ts`, add:

```typescript
export { useMatesThisWeek } from './useMatesThisWeek';
export { buildMatesLeaderboard } from './matesLeaderboard';
export type { MateWeeklyEntry } from './matesLeaderboard';
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/queryKeys/social.ts src/hooks/home/useMatesThisWeek.ts src/hooks/home/index.ts
git commit -m "feat(home): add useMatesThisWeek weekly friends leaderboard hook"
```

---

### Task 4: `MatesThisWeekSection` component

**Files:**
- Create: `src/screens/home/components/MatesThisWeekSection.tsx`
- Create: `src/screens/home/components/MatesThisWeekSection.test.tsx` (component tests live next to components in this folder — see `RoundTodayCard.test.tsx`)

The current-user highlight copies the treatment in `src/components/competitions/detail/sections/MiniLeaderboardSection.tsx` (`colors.primaryBackground` fill, `${colors.primary}66` border, `primaryLight`/`primaryDark` text by theme).

- [ ] **Step 1: Write the failing tests**

Create `src/screens/home/components/MatesThisWeekSection.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MatesThisWeekSection } from './MatesThisWeekSection';
import * as matesHook from '@/hooks/home/useMatesThisWeek';
import type { MateWeeklyEntry } from '@/hooks/home/matesLeaderboard';

jest.mock('@/hooks/home/useMatesThisWeek');

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: mockNavigate }) };
});

const entries: MateWeeklyEntry[] = [
  { playerId: 'f1', name: 'Mia Chen', photoUrl: null, points: 38, roundId: 'r1', isCurrentUser: false },
  { playerId: 'f2', name: 'Jess Mol', photoUrl: null, points: 34, roundId: 'r2', isCurrentUser: false },
  { playerId: 'me', name: 'Sam Kay', photoUrl: null, points: 31, roundId: 'r3', isCurrentUser: true },
];

const wrap = (node: React.ReactNode) => <NavigationContainer>{node}</NavigationContainer>;

function mockData(data: MateWeeklyEntry[] | undefined, extra: object = {}) {
  (matesHook.useMatesThisWeek as jest.Mock).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...extra,
  });
}

describe('MatesThisWeekSection', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders ranked mates with points', () => {
    mockData(entries);
    const { getByText } = render(wrap(<MatesThisWeekSection />));
    expect(getByText('Mates this week')).toBeTruthy();
    expect(getByText('Mia Chen')).toBeTruthy();
    expect(getByText('38')).toBeTruthy();
    expect(getByText('Jess Mol')).toBeTruthy();
    expect(getByText('34')).toBeTruthy();
  });

  it('labels the current user row "You"', () => {
    mockData(entries);
    const { getByText, queryByText } = render(wrap(<MatesThisWeekSection />));
    expect(getByText('You')).toBeTruthy();
    expect(queryByText('Sam Kay')).toBeNull();
  });

  it('shows "Leading" for first place and "N behind" for the rest', () => {
    mockData(entries);
    const { getByText } = render(wrap(<MatesThisWeekSection />));
    expect(getByText('Leading')).toBeTruthy();
    expect(getByText('4 behind')).toBeTruthy();
    expect(getByText('7 behind')).toBeTruthy();
  });

  it('renders nothing when there are no entries', () => {
    mockData([]);
    const { queryByText } = render(wrap(<MatesThisWeekSection />));
    expect(queryByText('Mates this week')).toBeNull();
  });

  it('renders nothing while loading', () => {
    mockData(undefined, { isLoading: true });
    const { queryByText } = render(wrap(<MatesThisWeekSection />));
    expect(queryByText('Mates this week')).toBeNull();
  });

  it('navigates to the round on row press', () => {
    mockData(entries);
    const { getByTestId } = render(wrap(<MatesThisWeekSection />));
    fireEvent.press(getByTestId('mate-row-f1'));
    expect(mockNavigate).toHaveBeenCalledWith('RoundActivity', { roundId: 'r1' });
  });

  it('navigates to the activity feed on See all', () => {
    mockData(entries);
    const { getByText } = render(wrap(<MatesThisWeekSection />));
    fireEvent.press(getByText('See all'));
    expect(mockNavigate).toHaveBeenCalledWith('Activity');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- MatesThisWeekSection`
Expected: FAIL — module `./MatesThisWeekSection` not found.

- [ ] **Step 3: Implement the component**

Create `src/screens/home/components/MatesThisWeekSection.tsx`:

```typescript
/**
 * MatesThisWeekSection - ranked list of your and your friends' best
 * Stableford rounds submitted this week (Mon-Sun). Tapping a row opens
 * that round's activity view. Renders nothing while loading, on error,
 * or when nobody (including you) has a submitted round this week.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { useMatesThisWeek } from '@/hooks/home/useMatesThisWeek';
import type { MateWeeklyEntry } from '@/hooks/home/matesLeaderboard';
import type { RootStackParamList } from '@/navigation/types';
import { SectionHeader } from './SectionHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AVATAR_SIZE = 40;

interface MateRowProps {
  entry: MateWeeklyEntry;
  position: number;
  leaderPoints: number;
  onPress: (roundId: string) => void;
}

function MateRow({ entry, position, leaderPoints, onPress }: MateRowProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  const displayName = entry.isCurrentUser ? 'You' : entry.name;
  const sublabel = position === 1 ? 'Leading' : `${leaderPoints - entry.points} behind`;
  const highlightText = isDark ? colors.primaryLight : colors.primaryDark;
  const nameColor = entry.isCurrentUser ? highlightText : colors.textPrimary;
  const subColor = entry.isCurrentUser ? highlightText : colors.textSecondary;

  return (
    <TouchableOpacity
      testID={`mate-row-${entry.playerId}`}
      onPress={() => onPress(entry.roundId)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${displayName}, position ${position}, ${entry.points} points — view round`}
      style={[
        styles.row,
        entry.isCurrentUser && {
          backgroundColor: colors.primaryBackground,
          borderColor: `${colors.primary}66`,
        },
      ]}
    >
      <Text style={[styles.position, { color: subColor }]}>{position}</Text>
      <PlayerAvatar photoUrl={entry.photoUrl} name={entry.name} size={AVATAR_SIZE} />
      <View style={styles.nameBlock}>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: nameColor }, entry.isCurrentUser && styles.nameCurrent]}
        >
          {displayName}
        </Text>
        <Text style={[styles.sublabel, { color: subColor }]}>{sublabel}</Text>
      </View>
      <Text style={[styles.points, { color: nameColor }]}>{entry.points}</Text>
    </TouchableOpacity>
  );
}

export const MatesThisWeekSection = React.memo(function MatesThisWeekSection() {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const { data, isLoading, isError } = useMatesThisWeek();

  const openRound = useCallback(
    (roundId: string) => navigation.navigate('RoundActivity', { roundId }),
    [navigation]
  );
  const openActivity = useCallback(() => navigation.navigate('Activity'), [navigation]);

  const entries = data ?? [];
  if (isLoading || isError || entries.length === 0) return null;

  const leaderPoints = entries[0].points;

  return (
    <View style={styles.container}>
      <SectionHeader title="Mates this week" actionLabel="See all" onActionPress={openActivity} />
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        Stableford points · tap to view
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
        {entries.map((entry, idx) => (
          <MateRow
            key={entry.playerId}
            entry={entry}
            position={idx + 1}
            leaderPoints={leaderPoints}
            onPress={openRound}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  caption: {
    ...typography.caption,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 56,
  },
  position: {
    ...typography.small,
    width: 24,
    fontVariant: ['tabular-nums'],
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    ...typography.body,
  },
  nameCurrent: {
    fontWeight: '700',
  },
  sublabel: {
    ...typography.caption,
  },
  points: {
    ...typography.h4,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- MatesThisWeekSection`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/home/components/MatesThisWeekSection.tsx src/screens/home/components/MatesThisWeekSection.test.tsx
git commit -m "feat(home): add MatesThisWeekSection ranked weekly leaderboard"
```

---

### Task 5: Wire into HomeScreen

**Files:**
- Modify: `src/screens/home/components/index.ts` (swap exports)
- Modify: `src/screens/home/HomeScreen.tsx:52` (import) and `src/screens/home/HomeScreen.tsx:293` (usage)

- [ ] **Step 1: Update the components index**

In `src/screens/home/components/index.ts`, replace:

```typescript
export { FriendActivitySection } from './FriendActivitySection';
```

with:

```typescript
export { MatesThisWeekSection } from './MatesThisWeekSection';
```

- [ ] **Step 2: Update HomeScreen**

In `src/screens/home/HomeScreen.tsx`, in the import block from `'./components'` (line 52), replace `FriendActivitySection,` with `MatesThisWeekSection,`.

At line 293, replace:

```tsx
              <FriendActivitySection />
```

with:

```tsx
              <MatesThisWeekSection />
```

- [ ] **Step 3: Verify compile and full home tests**

Run: `pnpm type-check && pnpm test -- home`
Expected: type-check clean; home-related suites PASS. (`FriendActivitySection.tsx` still exists but is now unimported — deleted next task.)

- [ ] **Step 4: Commit**

```bash
git add src/screens/home/components/index.ts src/screens/home/HomeScreen.tsx
git commit -m "feat(home): replace friend activity carousel with Mates this week"
```

---

### Task 6: Delete the old section and orphaned hook

**Files:**
- Delete: `src/screens/home/components/FriendActivitySection.tsx`
- Delete: `src/screens/home/components/HomeActivityHeroCard.tsx`
- Modify: `src/hooks/activity/queries.ts` (remove `useHomeActivityPreview`, ~lines 100–138)
- Modify: `src/hooks/activity/index.ts` (remove `useHomeActivityPreview` and `HomeActivityPreviewCard` exports)
- Modify: `src/hooks/activity/types.ts` (remove `HomeActivityPreviewCard`, ~line 66)
- Possibly modify: `src/hooks/queryKeys/*` and `src/hooks/activity/mutations.ts` (remove `activityKeys.preview` if orphaned — verify first)

- [ ] **Step 1: Verify there are no other consumers**

Run: `grep -rn "FriendActivitySection\|HomeActivityHeroCard\|useHomeActivityPreview\|HomeActivityPreviewCard" src --include="*.ts*"`
Expected: matches only in the files being deleted/modified in this task (the two components, `hooks/activity/queries.ts`, `hooks/activity/index.ts`, `hooks/activity/types.ts`). If anything else matches (e.g. a Storybook file or screen), stop and update that consumer first — do not delete blindly.

- [ ] **Step 2: Delete the component files**

```bash
git rm src/screens/home/components/FriendActivitySection.tsx src/screens/home/components/HomeActivityHeroCard.tsx
```

- [ ] **Step 3: Remove the hook, type, and exports**

- In `src/hooks/activity/queries.ts`: delete the `useHomeActivityPreview` function and its doc comment (the block between `useActivityFeed` and `useRoundFeedCard`, ~lines 100–138). Remove `HomeActivityPreviewCard` from the types import at the top of the file if no longer referenced there.
- In `src/hooks/activity/index.ts`: remove `useHomeActivityPreview,` from the queries export block and `HomeActivityPreviewCard,` from the types export block.
- In `src/hooks/activity/types.ts`: delete the `HomeActivityPreviewCard` interface (~line 66).

- [ ] **Step 4: Check whether `activityKeys.preview` is now orphaned**

Run: `grep -rn "preview" src/hooks/activity src/hooks/queryKeys --include="*.ts"`

- If the only remaining references are the key definition itself (in `src/hooks/queryKeys/`) plus cache invalidations in `src/hooks/activity/mutations.ts`: remove the key definition AND those invalidation lines.
- If the key is still queried anywhere, leave everything as is.

- [ ] **Step 5: Full verification**

Run: `pnpm type-check && pnpm lint && pnpm test`
Expected: all clean/passing. Any failure here means a missed consumer — fix before committing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(home): remove FriendActivitySection and orphaned activity preview hook"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| `getWeekRange()` utility + tests | 1 |
| Best-round-per-player aggregation, ties by name, exported & tested | 2 |
| `useMatesThisWeek` client-side query (status filter, week filter, deleted_at guard) | 3 |
| Section UI: SectionHeader, caption, avatar rows, You highlight, Leading/N behind, points | 4 |
| Tap row → RoundActivity; See all → Activity | 4 |
| Hidden when empty/loading/error | 4 |
| Replace FriendActivitySection in HomeScreen | 5 |
| Delete dead code (component, hero card, preview hook) after verifying consumers | 6 |
| Component tests (rows, You, sublabels, hidden-when-empty, navigation) | 4 |
