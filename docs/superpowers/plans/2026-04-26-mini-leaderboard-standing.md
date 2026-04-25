# Mini-Leaderboard Standing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare "Your Current Standing" card on the Competition Details tab with a contextual mini-leaderboard (you ± 1) for both individual and team standings, deep-linking into the Leaderboard tab. Fixes the bug where organiser-players see no standing.

**Architecture:** A new pure utility (`miniLeaderboard.ts`) computes 3-row windows from existing leaderboard data. A new presentational component (`MiniLeaderboardSection`) replaces `CurrentStandingSection`. The screen lifts `LeaderboardTab.selectedView` and adds a transient `scrollTarget` so taps on the mini sections switch tabs and scroll to the user's row.

**Tech Stack:** TypeScript, React Native, React Native Paper, TanStack Query, Jest + React Native Testing Library, Storybook (RN). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-26-mini-leaderboard-standing-design.md`

---

## Task 1: Mini-leaderboard pure helpers (TDD)

**Files:**
- Create: `src/utils/miniLeaderboard.ts`
- Create: `src/utils/__tests__/miniLeaderboard.test.ts`

- [ ] **Step 1.1: Write the failing tests**

Create `src/utils/__tests__/miniLeaderboard.test.ts`:

```typescript
import {
  getMiniIndividualRows,
  getMiniTeamRows,
  resolveUserTeamId,
} from '@/utils/miniLeaderboard';
import type { CompetitionLeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';
import type { TeamWithMembers } from '@/types/database/team.types';

function ind(
  participantId: string,
  participantName: string,
  position: number,
  totalPoints: number,
): CompetitionLeaderboardEntry {
  return {
    participantId,
    participantName,
    isTeam: false,
    totalPoints,
    roundsPlayed: 2,
    position,
    tied: false,
    handicap: 10,
    teamMembers: [],
    roundPoints: [],
  };
}

function team(
  participantId: string,
  participantName: string,
  position: number,
  totalPoints: number,
): CompetitionLeaderboardEntry {
  return {
    ...ind(participantId, participantName, position, totalPoints),
    isTeam: true,
    handicap: null,
  };
}

const board = [
  ind('p1', 'Alice', 1, 40),
  ind('p2', 'Jess', 2, 38),
  ind('p3', 'You', 3, 32),
  ind('p4', 'Mike', 4, 28),
  ind('p5', 'Sam', 5, 20),
];

describe('getMiniIndividualRows', () => {
  it('returns above/you/below when user is in the middle', () => {
    const result = getMiniIndividualRows(board, 'p3');
    expect(result).toEqual({
      above: { id: 'p2', position: 2, name: 'Jess', points: 38, isCurrent: false },
      you:   { id: 'p3', position: 3, name: 'You',  points: 32, isCurrent: true },
      below: { id: 'p4', position: 4, name: 'Mike', points: 28, isCurrent: false },
    });
  });

  it('returns no above when user is first', () => {
    const result = getMiniIndividualRows(board, 'p1');
    expect(result?.above).toBeNull();
    expect(result?.you.id).toBe('p1');
    expect(result?.below?.id).toBe('p2');
  });

  it('returns no below when user is last', () => {
    const result = getMiniIndividualRows(board, 'p5');
    expect(result?.above?.id).toBe('p4');
    expect(result?.you.id).toBe('p5');
    expect(result?.below).toBeNull();
  });

  it('returns null when user is not in the leaderboard', () => {
    expect(getMiniIndividualRows(board, 'p99')).toBeNull();
  });

  it('returns just the user when leaderboard has one entry', () => {
    const single = [ind('p1', 'You', 1, 10)];
    const result = getMiniIndividualRows(single, 'p1');
    expect(result).toEqual({
      above: null,
      you: { id: 'p1', position: 1, name: 'You', points: 10, isCurrent: true },
      below: null,
    });
  });

  it('returns null when leaderboard is undefined or empty', () => {
    expect(getMiniIndividualRows(undefined, 'p1')).toBeNull();
    expect(getMiniIndividualRows([], 'p1')).toBeNull();
  });

  it('returns null when userId is undefined', () => {
    expect(getMiniIndividualRows(board, undefined)).toBeNull();
  });
});

describe('getMiniTeamRows', () => {
  const teams = [
    team('t1', 'Eagles', 1, 88),
    team('t2', 'Hawks', 2, 82),
    team('t3', 'Falcons', 3, 79),
  ];

  it('returns above/you/below when team is in the middle', () => {
    const result = getMiniTeamRows(teams, 't2');
    expect(result?.above?.id).toBe('t1');
    expect(result?.you.id).toBe('t2');
    expect(result?.below?.id).toBe('t3');
    expect(result?.you.isCurrent).toBe(true);
  });

  it('returns null when team is undefined', () => {
    expect(getMiniTeamRows(teams, undefined)).toBeNull();
  });

  it('returns null when team is not in the leaderboard', () => {
    expect(getMiniTeamRows(teams, 't99')).toBeNull();
  });
});

describe('resolveUserTeamId', () => {
  const t = (id: string, memberIds: string[]): TeamWithMembers => ({
    id,
    competition_id: 'c1',
    name: `Team ${id}`,
    color: null,
    created_at: '',
    updated_at: '',
    members: memberIds.map((pid) => ({
      team_id: id,
      player_id: pid,
      joined_at: '',
    })),
  });

  it('returns the team id the user belongs to', () => {
    const teamsList = [t('t1', ['p1', 'p2']), t('t2', ['p3', 'p4'])];
    expect(resolveUserTeamId(teamsList, 'p3')).toBe('t2');
  });

  it('returns undefined when user is on no team', () => {
    const teamsList = [t('t1', ['p1', 'p2'])];
    expect(resolveUserTeamId(teamsList, 'p9')).toBeUndefined();
  });

  it('returns undefined when teams or userId is missing', () => {
    expect(resolveUserTeamId(undefined, 'p1')).toBeUndefined();
    expect(resolveUserTeamId([], 'p1')).toBeUndefined();
    expect(resolveUserTeamId([t('t1', ['p1'])], undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

Run: `pnpm test src/utils/__tests__/miniLeaderboard.test.ts`
Expected: FAIL with "Cannot find module '@/utils/miniLeaderboard'"

- [ ] **Step 1.3: Implement helpers**

Create `src/utils/miniLeaderboard.ts`:

```typescript
/**
 * Mini-leaderboard helpers — derive a 3-row window (above/you/below) from a
 * full leaderboard array, anchored on the current user (or their team).
 *
 * Pure, fully unit-tested; consumed by MiniLeaderboardSection.
 */

import type { CompetitionLeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';
import type { TeamWithMembers } from '@/types/database/team.types';

export interface MiniLeaderboardEntry {
  /** Player id or team id */
  id: string;
  /** 1-indexed position */
  position: number;
  /** Display name */
  name: string;
  /** Total competition points */
  points: number;
  /** True for the row representing the current user / their team */
  isCurrent: boolean;
}

export interface MiniLeaderboardData {
  above: MiniLeaderboardEntry | null;
  you: MiniLeaderboardEntry;
  below: MiniLeaderboardEntry | null;
}

function toMini(
  entry: CompetitionLeaderboardEntry,
  isCurrent: boolean,
): MiniLeaderboardEntry {
  return {
    id: entry.participantId,
    position: entry.position,
    name: entry.participantName,
    points: entry.totalPoints,
    isCurrent,
  };
}

function getMiniRows(
  leaderboard: CompetitionLeaderboardEntry[] | undefined,
  anchorId: string | undefined,
): MiniLeaderboardData | null {
  if (!leaderboard || leaderboard.length === 0 || !anchorId) return null;

  // Sort by position so above/below are deterministic regardless of input order.
  const sorted = [...leaderboard].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex((e) => e.participantId === anchorId);
  if (idx === -1) return null;

  return {
    above: idx > 0 ? toMini(sorted[idx - 1], false) : null,
    you:   toMini(sorted[idx], true),
    below: idx < sorted.length - 1 ? toMini(sorted[idx + 1], false) : null,
  };
}

export function getMiniIndividualRows(
  leaderboard: CompetitionLeaderboardEntry[] | undefined,
  userId: string | undefined,
): MiniLeaderboardData | null {
  return getMiniRows(leaderboard, userId);
}

export function getMiniTeamRows(
  teamLeaderboard: CompetitionLeaderboardEntry[] | undefined,
  userTeamId: string | undefined,
): MiniLeaderboardData | null {
  return getMiniRows(teamLeaderboard, userTeamId);
}

export function resolveUserTeamId(
  teams: TeamWithMembers[] | undefined,
  userId: string | undefined,
): string | undefined {
  if (!teams || teams.length === 0 || !userId) return undefined;
  const team = teams.find((t) => t.members.some((m) => m.player_id === userId));
  return team?.id;
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

Run: `pnpm test src/utils/__tests__/miniLeaderboard.test.ts`
Expected: PASS — all 13 tests green.

- [ ] **Step 1.5: Commit**

```bash
git add src/utils/miniLeaderboard.ts src/utils/__tests__/miniLeaderboard.test.ts
git commit -m "feat(mini-leaderboard): add pure helpers for above/you/below window

Derives a 3-row mini-leaderboard from CompetitionLeaderboardEntry, anchored
on the current user (individual) or their team. Handles edges (1st, last,
single entry) and missing data.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Update sections types

**Files:**
- Modify: `src/components/competitions/detail/sections/types.ts`

- [ ] **Step 2.1: Replace `CurrentStandingSectionProps` with `MiniLeaderboardSectionProps`**

In `src/components/competitions/detail/sections/types.ts`, remove the existing `CurrentStandingSectionProps` block and add (anywhere among the other props blocks):

```typescript
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';
```

Then replace the `CurrentStandingSectionProps` interface with:

```typescript
export interface MiniLeaderboardSectionProps {
  /** 3-row window for individual standings (null hides the whole section) */
  individual: MiniLeaderboardData | null;
  /** 3-row window for team standings (null hides only the team sub-section) */
  team: MiniLeaderboardData | null;
  /** Display label for the user's team (e.g. "Hawks") */
  teamName?: string;
  /** Called when a sub-section is tapped */
  onOpenLeaderboard: (view: 'individual' | 'team') => void;
}
```

- [ ] **Step 2.2: Verify type-check passes (will still fail in DetailsTab — expected)**

Run: `pnpm type-check`
Expected: errors **only** in `DetailsTab.tsx` and `sections/index.ts` referring to the now-removed `CurrentStandingSectionProps` / `CurrentStandingSection`. Those are fixed in later tasks. No commit yet — types are inconsistent.

---

## Task 3: Build `MiniLeaderboardSection` component (TDD)

**Files:**
- Create: `src/components/competitions/detail/sections/MiniLeaderboardSection.tsx`
- Create: `src/components/competitions/detail/sections/MiniLeaderboardSection.test.tsx`

- [ ] **Step 3.1: Write the failing tests**

Create `src/components/competitions/detail/sections/MiniLeaderboardSection.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MiniLeaderboardSection } from './MiniLeaderboardSection';
import { ThemeProvider } from '@/context/ThemeContext';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';

const wrap = (ui: React.ReactElement) => <ThemeProvider>{ui}</ThemeProvider>;

const individual: MiniLeaderboardData = {
  above: { id: 'p2', position: 2, name: 'Jess Patel', points: 38, isCurrent: false },
  you:   { id: 'p3', position: 3, name: 'You',        points: 32, isCurrent: true },
  below: { id: 'p4', position: 4, name: 'Mike',       points: 28, isCurrent: false },
};

const team: MiniLeaderboardData = {
  above: { id: 't1', position: 1, name: 'Eagles',  points: 88, isCurrent: false },
  you:   { id: 't2', position: 2, name: 'Hawks',   points: 82, isCurrent: true },
  below: { id: 't3', position: 3, name: 'Falcons', points: 79, isCurrent: false },
};

describe('MiniLeaderboardSection', () => {
  it('renders both individual and team sub-sections when both provided', () => {
    const { getByTestId } = render(
      wrap(
        <MiniLeaderboardSection
          individual={individual}
          team={team}
          teamName="Hawks"
          onOpenLeaderboard={jest.fn()}
        />,
      ),
    );
    expect(getByTestId('mini-leaderboard-individual')).toBeTruthy();
    expect(getByTestId('mini-leaderboard-team')).toBeTruthy();
  });

  it('hides team sub-section when team is null', () => {
    const { queryByTestId } = render(
      wrap(
        <MiniLeaderboardSection
          individual={individual}
          team={null}
          onOpenLeaderboard={jest.fn()}
        />,
      ),
    );
    expect(queryByTestId('mini-leaderboard-team')).toBeNull();
  });

  it('renders nothing when individual is null', () => {
    const { queryByTestId } = render(
      wrap(
        <MiniLeaderboardSection
          individual={null}
          team={team}
          onOpenLeaderboard={jest.fn()}
        />,
      ),
    );
    expect(queryByTestId('mini-leaderboard-individual')).toBeNull();
    expect(queryByTestId('mini-leaderboard-team')).toBeNull();
  });

  it('calls onOpenLeaderboard("individual") when individual section pressed', () => {
    const onOpen = jest.fn();
    const { getByTestId } = render(
      wrap(
        <MiniLeaderboardSection
          individual={individual}
          team={null}
          onOpenLeaderboard={onOpen}
        />,
      ),
    );
    fireEvent.press(getByTestId('mini-leaderboard-individual'));
    expect(onOpen).toHaveBeenCalledWith('individual');
  });

  it('calls onOpenLeaderboard("team") when team section pressed', () => {
    const onOpen = jest.fn();
    const { getByTestId } = render(
      wrap(
        <MiniLeaderboardSection
          individual={individual}
          team={team}
          teamName="Hawks"
          onOpenLeaderboard={onOpen}
        />,
      ),
    );
    fireEvent.press(getByTestId('mini-leaderboard-team'));
    expect(onOpen).toHaveBeenCalledWith('team');
  });

  it('omits the above row when user is first', () => {
    const firstPlace: MiniLeaderboardData = {
      above: null,
      you: { id: 'p1', position: 1, name: 'You', points: 50, isCurrent: true },
      below: { id: 'p2', position: 2, name: 'Jess', points: 40, isCurrent: false },
    };
    const { queryByText, getByText } = render(
      wrap(
        <MiniLeaderboardSection
          individual={firstPlace}
          team={null}
          onOpenLeaderboard={jest.fn()}
        />,
      ),
    );
    expect(queryByText('Jess')).toBeTruthy(); // below is shown
    expect(getByText('You')).toBeTruthy();
  });
});
```

- [ ] **Step 3.2: Run the tests — expect failure**

Run: `pnpm test src/components/competitions/detail/sections/MiniLeaderboardSection.test.tsx`
Expected: FAIL — "Cannot find module './MiniLeaderboardSection'".

- [ ] **Step 3.3: Implement the component**

Create `src/components/competitions/detail/sections/MiniLeaderboardSection.tsx`:

```typescript
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { formatPosition } from '@/utils/formatting';
import type { MiniLeaderboardEntry } from '@/utils/miniLeaderboard';
import type { MiniLeaderboardSectionProps } from './types';

interface MiniRowProps {
  entry: MiniLeaderboardEntry;
}

function MiniRow({ entry }: MiniRowProps) {
  const colors = useThemeColors();
  const rowStyle = entry.isCurrent
    ? [styles.row, { backgroundColor: colors.primaryLighter }]
    : styles.row;
  const textColor = entry.isCurrent ? colors.primaryDark : colors.textPrimary;
  const subColor = entry.isCurrent ? colors.primaryDark : colors.textSecondary;

  return (
    <View style={rowStyle}>
      <Text style={[styles.position, { color: subColor }]}>
        {formatPosition(entry.position)}
      </Text>
      <Text
        style={[styles.name, { color: textColor }, entry.isCurrent && styles.nameCurrent]}
        numberOfLines={1}
      >
        {entry.name}
      </Text>
      <Text style={[styles.points, { color: textColor }, entry.isCurrent && styles.nameCurrent]}>
        {entry.points}
      </Text>
    </View>
  );
}

interface SubSectionProps {
  testID: string;
  label: string;
  rows: { above: MiniLeaderboardEntry | null; you: MiniLeaderboardEntry; below: MiniLeaderboardEntry | null };
  onPress: () => void;
}

function SubSection({ testID, label, rows, onPress }: SubSectionProps) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label} — open leaderboard`}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Icon source="chevron-right" size={18} color={colors.textSecondary} />
      </View>
      {rows.above && <MiniRow entry={rows.above} />}
      <MiniRow entry={rows.you} />
      {rows.below && <MiniRow entry={rows.below} />}
    </TouchableOpacity>
  );
}

export function MiniLeaderboardSection({
  individual,
  team,
  teamName,
  onOpenLeaderboard,
}: MiniLeaderboardSectionProps) {
  const colors = useThemeColors();

  if (!individual) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}
      testID="mini-leaderboard-card"
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Your Standing</Text>

      <SubSection
        testID="mini-leaderboard-individual"
        label="Individual"
        rows={individual}
        onPress={() => onOpenLeaderboard('individual')}
      />

      {team && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SubSection
            testID="mini-leaderboard-team"
            label={teamName ? `Team — ${teamName}` : 'Team'}
            rows={team}
            onPress={() => onOpenLeaderboard('team')}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  headerLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  position: {
    ...typography.small,
    width: 36,
    fontVariant: ['tabular-nums'],
  },
  name: {
    ...typography.body,
    flex: 1,
  },
  nameCurrent: {
    fontWeight: '700',
  },
  points: {
    ...typography.body,
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
});

export default MiniLeaderboardSection;
```

- [ ] **Step 3.4: Update `sections/index.ts` to export the new component and remove the old**

In `src/components/competitions/detail/sections/index.ts`:
- Remove the `export { CurrentStandingSection } from './CurrentStandingSection';` line.
- Add `export { MiniLeaderboardSection } from './MiniLeaderboardSection';`

- [ ] **Step 3.5: Run tests to verify they pass**

Run: `pnpm test src/components/competitions/detail/sections/MiniLeaderboardSection.test.tsx`
Expected: PASS — all 6 tests green.

- [ ] **Step 3.6: Commit**

```bash
git add src/components/competitions/detail/sections/MiniLeaderboardSection.tsx \
        src/components/competitions/detail/sections/MiniLeaderboardSection.test.tsx \
        src/components/competitions/detail/sections/types.ts \
        src/components/competitions/detail/sections/index.ts
git commit -m "feat(mini-leaderboard): add MiniLeaderboardSection component

Single combined card with tap-targetable individual and team sub-sections.
Each sub-section calls onOpenLeaderboard with its view name. Hides cleanly
when individual data is null and gracefully omits team sub-section when
team data is null.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Update `useCompetitionDetailData` to provide new data

**Files:**
- Modify: `src/screens/competitions/CompetitionDetailScreen/hooks/useCompetitionDetailData.ts`

- [ ] **Step 4.1: Add team-leaderboard query and derive new values**

Replace the imports section (top of file) with:

```typescript
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useCompetitionDetailsData } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useCompetitionLeaderboard } from '@/hooks/useCompetitionLeaderboard';
import { useTeams } from '@/hooks/useTeams';
import { useCompetitionPrizePool, usePrizePoolPlacements } from '@/hooks/prizePool';
import { scoringPairsKeys, scorecardKeys } from '@/hooks/queryKeys';
import { getRoundScoringPairs } from '@/services/scoringPairs';
import { supabase } from '@/services/supabase/client';
import {
  getMiniIndividualRows,
  getMiniTeamRows,
  resolveUserTeamId,
} from '@/utils/miniLeaderboard';
```

Note: `getCurrentPlayerStanding` is no longer imported — `currentStanding` is being removed from this hook's return.

After the existing `useCompetitionLeaderboard(id, { filter: 'individuals' })` call, add:

```typescript
  // Fetch team leaderboard data for the team mini-leaderboard
  const { data: teamLeaderboard } = useCompetitionLeaderboard(id, {
    filter: 'teams',
  });
```

Replace the existing `currentStanding` `useMemo` block (lines ~138-141) with:

```typescript
  // Derive whether the current user is a player in this competition
  const isPlayer = useMemo(() => {
    if (!user || !competitionData?.players) return false;
    return competitionData.players.some((p) => p.player_id === user.id);
  }, [competitionData?.players, user]);

  // Resolve current user's team (if any)
  const userTeamId = useMemo(
    () => resolveUserTeamId(teams, user?.id),
    [teams, user?.id],
  );

  const userTeamName = useMemo(() => {
    if (!userTeamId || !teams) return undefined;
    return teams.find((t) => t.id === userTeamId)?.name;
  }, [teams, userTeamId]);

  // Derive 3-row mini-leaderboard windows
  const miniIndividual = useMemo(
    () => getMiniIndividualRows(leaderboard, user?.id),
    [leaderboard, user?.id],
  );

  const miniTeam = useMemo(
    () => getMiniTeamRows(teamLeaderboard, userTeamId),
    [teamLeaderboard, userTeamId],
  );
```

In the return object, **remove** `currentStanding` and **add**:

```typescript
    isPlayer,
    userTeamId,
    userTeamName,
    miniIndividual,
    miniTeam,
```

- [ ] **Step 4.2: Verify type-check (`useCompetitionDetailData` should be clean; downstream consumers will still error)**

Run: `pnpm type-check 2>&1 | head -30`
Expected: errors limited to `CompetitionDetailScreen/index.tsx` (`currentStanding` no longer exported) and `DetailsTab.tsx` (still imports old props). Both are fixed in the next tasks.

No commit yet — system is incoherent.

---

## Task 5: Wire `MiniLeaderboardSection` into `DetailsTab` & remove `CurrentStandingSection`

**Files:**
- Modify: `src/components/competitions/detail/DetailsTab.tsx`
- Delete: `src/components/competitions/detail/sections/CurrentStandingSection.tsx`

- [ ] **Step 5.1: Update DetailsTab props and rendering**

Replace `src/components/competitions/detail/DetailsTab.tsx` with:

```typescript
/**
 * DetailsTab - Competition details and courses
 *
 * Shows:
 * - Competition header card
 * - Mini-leaderboard standing (you ± 1, individual + team) for players
 * - Competition settings
 * - Prize pool section
 * - Courses used in rounds
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { Competition, Course } from '@/types/database.types';
import type { CompetitionPrizePool, PrizePoolPlacement } from '@/types';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';
import { type RoundWithCourse } from './types';
import {
  CompetitionInfoSection,
  MiniLeaderboardSection,
  SettingsSection,
  PrizePoolSection,
  CoursesSection,
} from './sections';

export interface DetailsTabProps {
  competition: Competition;
  rounds: RoundWithCourse[];
  playerCount: number;
  /** True when the current user is a player in this competition */
  isPlayer: boolean;
  /** 3-row individual mini-leaderboard window, or null to hide */
  miniIndividual: MiniLeaderboardData | null;
  /** 3-row team mini-leaderboard window, or null to hide team sub-section */
  miniTeam: MiniLeaderboardData | null;
  /** Display name for the user's team */
  userTeamName?: string;
  /** Called when user taps a mini-leaderboard sub-section */
  onOpenLeaderboard?: (view: 'individual' | 'team') => void;
  isOrganizer: boolean;
  hasStartedRound?: boolean;
  prizePool?: CompetitionPrizePool | null;
  prizePoolPlacements?: PrizePoolPlacement[];
  isPrizePoolLocked?: boolean;
  onViewCourse?: (course: Course) => void;
  onUpdateCompetition?: (updates: Partial<Competition>) => Promise<void>;
  onAddPrizePool?: () => void;
  onEditPrizePool?: () => void;
  onViewPrizePoolTransactions?: () => void;
  onViewTeams?: () => void;
}

export const DetailsTab = React.memo(function DetailsTab({
  competition,
  rounds,
  playerCount: _playerCount,
  isPlayer,
  miniIndividual,
  miniTeam,
  userTeamName,
  onOpenLeaderboard,
  isOrganizer,
  hasStartedRound = false,
  prizePool,
  prizePoolPlacements,
  isPrizePoolLocked = false,
  onViewCourse,
  onUpdateCompetition: _onUpdateCompetition,
  onAddPrizePool,
  onEditPrizePool,
  onViewPrizePoolTransactions,
  onViewTeams,
}: DetailsTabProps) {
  const uniqueCourses = useMemo(() => {
    const courseMap = new Map<
      string,
      Course & { clubs?: { name: string; city: string | null; state: string | null } | null }
    >();
    for (const round of rounds) {
      if (round.course && !courseMap.has(round.course.id)) {
        courseMap.set(round.course.id, round.course);
      }
    }
    return Array.from(courseMap.values());
  }, [rounds]);

  const showMiniLeaderboard =
    isPlayer &&
    competition.competition_type !== 'knockout' &&
    miniIndividual !== null;

  return (
    <View>
      <CompetitionInfoSection competition={competition} />

      {showMiniLeaderboard && (
        <MiniLeaderboardSection
          individual={miniIndividual}
          team={miniTeam}
          teamName={userTeamName}
          onOpenLeaderboard={onOpenLeaderboard ?? (() => {})}
        />
      )}

      <SettingsSection
        competition={competition}
        isOrganizer={isOrganizer}
        hasStartedRound={hasStartedRound}
        onViewTeams={onViewTeams}
      />

      <PrizePoolSection
        pool={prizePool ?? null}
        placements={prizePoolPlacements ?? []}
        isOrganizer={isOrganizer}
        isLocked={isPrizePoolLocked}
        onAddPress={onAddPrizePool}
        onEditPress={onEditPrizePool}
        onViewTransactionsPress={onViewPrizePoolTransactions}
      />

      <CoursesSection courses={uniqueCourses} onViewCourse={onViewCourse} />
    </View>
  );
});

export default DetailsTab;
```

- [ ] **Step 5.2: Delete the old component file**

Run: `rm "src/components/competitions/detail/sections/CurrentStandingSection.tsx"`

- [ ] **Step 5.3: Verify type-check (consumers in screen still need updating — that's next)**

Run: `pnpm type-check 2>&1 | head -30`
Expected: Errors confined to `CompetitionDetailScreen/index.tsx` (using old props on DetailsTab) and possibly `DetailsTab.test.tsx` / `DetailsTab.stories.tsx`. Fixed in Tasks 6–8.

No commit yet.

---

## Task 6: Make `LeaderboardTab.selectedView` controlled-with-fallback + add scrollTarget plumbing

**Files:**
- Modify: `src/components/leaderboard/LeaderboardTab.tsx`

- [ ] **Step 6.1: Update `LeaderboardTabProps` and accept new optional props**

In `src/components/leaderboard/LeaderboardTab.tsx`, update the interface (around line 29):

```typescript
export type LeaderboardView = 'individual' | 'team';

export interface LeaderboardScrollTarget {
  kind: 'player' | 'team';
  id: string;
}

export interface LeaderboardTabProps {
  competitionId: string;
  teamMode: TeamMode;
  rounds: RoundWithCourse[];
  currentUserId?: string;
  autoRefresh?: boolean;
  onEntryPress?: (entry: CompetitionLeaderboardEntry) => void;
  /** Optional controlled view. When provided, parent owns the state. */
  selectedView?: LeaderboardView;
  /** Called when the view changes (only meaningful when controlled). */
  onViewChange?: (view: LeaderboardView) => void;
  /**
   * Optional row to scroll into focus on next render. The component clears
   * the target by calling `onScrollHandled` after acting on it.
   */
  scrollTarget?: LeaderboardScrollTarget | null;
  /** Called after the component has acted on `scrollTarget`. */
  onScrollHandled?: () => void;
}
```

The existing `type LeaderboardView` declaration (at line 44) should be removed since it's now exported.

- [ ] **Step 6.2: Make `selectedView` controlled-with-fallback**

Replace the component body's view-state block (currently lines ~272-302) with:

```typescript
  // Controlled-with-fallback selectedView. Parent passes selectedView+onViewChange
  // when it wants to drive the toggle (e.g., from a deep-link). Otherwise we fall
  // back to internal state so standalone usage (stories/tests) stays unchanged.
  const [internalView, setInternalView] = useState<LeaderboardView>(
    hasTeams ? 'team' : 'individual',
  );
  const isControlled = selectedView !== undefined;
  const view: LeaderboardView = isControlled ? selectedView! : internalView;

  // Effective view (forced to 'team' for scramble-only competitions)
  const effectiveView = isAllScrambleFormat ? 'team' : view;

  const filter: LeaderboardFilter = useMemo(() => {
    if (!hasTeams) return 'individuals';
    if (isAllScrambleFormat) return 'teams';
    return view === 'team' ? 'teams' : 'individuals';
  }, [hasTeams, view, isAllScrambleFormat]);

  // Fetch leaderboard data
  const { data: leaderboard, isLoading, error, refetch } = useCompetitionLeaderboard(
    competitionId,
    { filter, autoRefresh },
  );

  const handleViewChange = useCallback(
    (next: LeaderboardView) => {
      if (isControlled) {
        onViewChange?.(next);
      } else {
        setInternalView(next);
      }
    },
    [isControlled, onViewChange],
  );
```

Update the destructured props in the function signature to include the new optional props:

```typescript
export const LeaderboardTab = React.memo(function LeaderboardTab({
  competitionId,
  teamMode,
  rounds,
  currentUserId,
  autoRefresh = true,
  onEntryPress,
  selectedView,
  onViewChange,
  scrollTarget,
  onScrollHandled,
}: LeaderboardTabProps) {
```

- [ ] **Step 6.3: Wire `scrollTarget` through to the underlying tables**

The deep-link "scroll to row" feature is best-effort: we pass `scrollTarget` down to the rendered standings list, and clear it via `onScrollHandled` after one render. Since `LeaderboardTab` already renders four different list components (`StablefordLeaderboard`, `StrokePlayLeaderboard`, `MatchPlayLeaderboard`, `TeamLeaderboardTable`), we add a thin effect that calls `onScrollHandled` after the data resolves. The child tables already highlight `currentUserId` rows, so the user's row is visually marked when they land on the tab — the scroll itself is deferred to a later polish task once the underlying tables expose a scroll-to API.

Add this effect inside the component, just before the `if (isLoading) return ...` block:

```typescript
  // Best-effort: once leaderboard data is available and a scrollTarget was
  // requested, signal back to the parent so it can clear the transient state.
  // The visible "you" highlight on the row provides the immediate visual cue;
  // imperative scroll-into-view across all four list variants is deferred.
  React.useEffect(() => {
    if (scrollTarget && leaderboard && !isLoading) {
      onScrollHandled?.();
    }
  }, [scrollTarget, leaderboard, isLoading, onScrollHandled]);
```

- [ ] **Step 6.4: Verify type-check on this file**

Run: `pnpm type-check 2>&1 | grep -E "LeaderboardTab\.tsx|MiniLeaderboard|DetailsTab|CompetitionDetailScreen"`
Expected: only errors related to the screen wiring (next task).

- [ ] **Step 6.5: Run existing LeaderboardTab tests**

Run: `pnpm test src/components/leaderboard/LeaderboardTab`
Expected: PASS — uncontrolled fallback preserves existing behaviour.

If any existing test fails because the internal state changed name, update the test to use the new prop names. Do not weaken assertions.

- [ ] **Step 6.6: Commit**

```bash
git add src/components/leaderboard/LeaderboardTab.tsx
git commit -m "feat(leaderboard-tab): controllable selectedView + scrollTarget signal

LeaderboardTab now accepts an optional selectedView/onViewChange pair so a
parent screen can drive the view from a deep-link. When not provided, the
component falls back to the existing internal state. Adds scrollTarget +
onScrollHandled props as the wiring contract for tap-through navigation
(imperative scroll-into-view deferred — currentUserId row highlight is the
immediate visual cue).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire deep-link from `CompetitionDetailScreen`

**Files:**
- Modify: `src/screens/competitions/CompetitionDetailScreen/index.tsx`

- [ ] **Step 7.1: Update destructured fields from data hook**

Find the data-hook destructuring block (around line 71) and:
- Remove `currentStanding`
- Add `isPlayer, userTeamId, userTeamName, miniIndividual, miniTeam`

```typescript
  const {
    user,
    competitionData,
    isLoading,
    error,
    refetch,
    isRefetching,
    teams,
    isLoadingTeams,
    prizePool,
    refetchPrizePool,
    prizePoolPlacements,
    scoringPairsStatus,
    allScoredStatus,
    isOrganizer,
    hasStartedRound,
    isPrizePoolLocked,
    isPlayer,
    userTeamId,
    userTeamName,
    miniIndividual,
    miniTeam,
    refetchLeaderboard,
    refetchTeams,
  } = useCompetitionDetailData(id);
```

- [ ] **Step 7.2: Add lifted view state and tap handler**

Just below the `const [activeTab, setActiveTab] = useState<TabValue>('details');` line, add:

```typescript
  // Lifted leaderboard state — lets the mini-leaderboard tap-through select a view
  const [leaderboardView, setLeaderboardView] = useState<'individual' | 'team'>(
    'individual',
  );
  const [leaderboardScrollTarget, setLeaderboardScrollTarget] = useState<
    { kind: 'player' | 'team'; id: string } | null
  >(null);

  const handleOpenLeaderboardFromMini = useCallback(
    (view: 'individual' | 'team') => {
      setActiveTab('leaderboard');
      setLeaderboardView(view);
      if (view === 'team' && userTeamId) {
        setLeaderboardScrollTarget({ kind: 'team', id: userTeamId });
      } else if (view === 'individual' && user?.id) {
        setLeaderboardScrollTarget({ kind: 'player', id: user.id });
      } else {
        setLeaderboardScrollTarget(null);
      }
    },
    [user?.id, userTeamId],
  );

  const handleScrollHandled = useCallback(() => {
    setLeaderboardScrollTarget(null);
  }, []);
```

- [ ] **Step 7.3: Update `<DetailsTab ... />` JSX**

Replace the existing `<DetailsTab ... />` block (around line 282) with:

```typescript
        {activeTab === 'details' && (
          <DetailsTab
            competition={competition}
            rounds={rounds}
            playerCount={players.length}
            isPlayer={isPlayer}
            miniIndividual={miniIndividual}
            miniTeam={miniTeam}
            userTeamName={userTeamName}
            onOpenLeaderboard={handleOpenLeaderboardFromMini}
            isOrganizer={isOrganizer}
            hasStartedRound={hasStartedRound}
            prizePool={prizePool}
            prizePoolPlacements={prizePoolPlacements}
            isPrizePoolLocked={isPrizePoolLocked}
            onAddPrizePool={handleAddPrizePool}
            onEditPrizePool={handleEditPrizePool}
            onViewPrizePoolTransactions={prizePool ? () => setActiveTab('payouts') : undefined}
            onViewTeams={
              competition.team_mode !== 'none' ? () => setActiveTab('teams') : undefined
            }
          />
        )}
```

- [ ] **Step 7.4: Update `<LeaderboardTab ... />` JSX to pass controlled props**

Replace the existing `<LeaderboardTab ... />` block (around line 357) with:

```typescript
        {activeTab === 'leaderboard' && competition.competition_type !== 'knockout' && (
          <LeaderboardTab
            competitionId={id}
            teamMode={competition.team_mode}
            rounds={rounds}
            currentUserId={user?.id}
            onEntryPress={handleLeaderboardEntryPress}
            selectedView={leaderboardView}
            onViewChange={setLeaderboardView}
            scrollTarget={leaderboardScrollTarget}
            onScrollHandled={handleScrollHandled}
          />
        )}
```

- [ ] **Step 7.5: Run type-check end-to-end**

Run: `pnpm type-check`
Expected: PASS (the previously-broken consumer is now wired correctly). If `DetailsTab.test.tsx` or `DetailsTab.stories.tsx` still error, they're handled in Task 8.

- [ ] **Step 7.6: Commit (without test/story updates yet)**

```bash
git add src/screens/competitions/CompetitionDetailScreen/index.tsx \
        src/screens/competitions/CompetitionDetailScreen/hooks/useCompetitionDetailData.ts \
        src/components/competitions/detail/DetailsTab.tsx \
        src/components/competitions/detail/sections/CurrentStandingSection.tsx
git commit -m "feat(competition-detail): replace standing card with mini-leaderboard

Players (organisers included) now see a 3-row mini-leaderboard for both
their individual standing and their team standing on the Details tab.
Tapping a sub-section switches to the Leaderboard tab on the matching view.

Resolves the bug where organiser-players saw no standing at all.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Update `DetailsTab` test and stories

**Files:**
- Modify: `src/components/competitions/detail/DetailsTab.test.tsx`
- Modify: `src/components/competitions/detail/DetailsTab.stories.tsx`

- [ ] **Step 8.1: Update `DetailsTab.test.tsx`**

Read the file with `Read` first. For every props block that currently uses `currentStanding: ...`, replace it with the new shape. The pattern is:

| Old prop                                    | New props                                                                                          |
|--------------------------------------------|----------------------------------------------------------------------------------------------------|
| `currentStanding: null`                     | `isPlayer: false, miniIndividual: null, miniTeam: null`                                            |
| `currentStanding: { position: 1, points: 45 }` | `isPlayer: true, miniIndividual: { above: null, you: {id:'p-current', position:1, name:'You', points:45, isCurrent:true}, below: null }, miniTeam: null` |

Helper at the top of the test file:

```typescript
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';

const miniWithPosition = (position: number, points: number): MiniLeaderboardData => ({
  above: position > 1 ? { id: 'p-above', position: position - 1, name: 'Above', points: points + 4, isCurrent: false } : null,
  you:   { id: 'p-current', position, name: 'You', points, isCurrent: true },
  below: { id: 'p-below', position: position + 1, name: 'Below', points: points - 4, isCurrent: false },
});
```

Update assertions: any test that asserted on the rendered `CurrentStandingSection` (e.g., looking for "Your Current Standing" text or `current-standing-card` testID) should now look for `mini-leaderboard-card` testID and the new "Your Standing" title.

Add a new test case in `DetailsTab.test.tsx`:

```typescript
it('renders mini-leaderboard for organiser-player (regression: bug fix)', () => {
  const { getByTestId } = render(
    <DetailsTab
      {...baseProps}
      isOrganizer={true}
      isPlayer={true}
      miniIndividual={miniWithPosition(2, 36)}
      miniTeam={null}
    />,
  );
  expect(getByTestId('mini-leaderboard-card')).toBeTruthy();
});

it('hides mini-leaderboard when user is not a player', () => {
  const { queryByTestId } = render(
    <DetailsTab
      {...baseProps}
      isOrganizer={true}
      isPlayer={false}
      miniIndividual={null}
      miniTeam={null}
    />,
  );
  expect(queryByTestId('mini-leaderboard-card')).toBeNull();
});

it('hides mini-leaderboard for knockout competitions', () => {
  const { queryByTestId } = render(
    <DetailsTab
      {...baseProps}
      competition={{ ...baseProps.competition, competition_type: 'knockout' }}
      isPlayer={true}
      miniIndividual={miniWithPosition(2, 36)}
      miniTeam={null}
    />,
  );
  expect(queryByTestId('mini-leaderboard-card')).toBeNull();
});
```

(`baseProps` should be a const at the top of the test file already containing `competition`, `rounds`, `playerCount`, `isOrganizer`, etc. — drop `currentStanding` from it and add `isPlayer: false, miniIndividual: null, miniTeam: null` as defaults.)

- [ ] **Step 8.2: Update `DetailsTab.stories.tsx`**

Apply the same `currentStanding` → mini-prop substitution pattern across all stories in the file. For each story:
- Drop `currentStanding: ...`
- Add `isPlayer: <true/false matching original>, miniIndividual: <equivalent or null>, miniTeam: null` (`teamName` only on stories that should show team data)

Add or rename the bug-regression and team stories:
- `MiniLeaderboardOrganiserPlayer` — `isOrganizer: true, isPlayer: true, miniIndividual: ...`
- `MiniLeaderboardWithTeam` — both individual and team supplied
- `MiniLeaderboardLeader` — `you.position: 1`, `above: null`

Use the same `miniWithPosition` helper pattern from Step 8.1 (define inline at the top of the stories file).

- [ ] **Step 8.3: Run the focused test files**

Run: `pnpm test src/components/competitions/detail/DetailsTab.test.tsx`
Expected: PASS — including the 3 new test cases.

- [ ] **Step 8.4: Commit**

```bash
git add src/components/competitions/detail/DetailsTab.test.tsx \
        src/components/competitions/detail/DetailsTab.stories.tsx
git commit -m "test(details-tab): update tests + stories for mini-leaderboard

Adds regression tests for the organiser-player bug, the not-a-player
hidden case, and the knockout-suppression case. Replaces currentStanding
fixtures with MiniLeaderboardData equivalents in stories.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Add Storybook stories for `MiniLeaderboardSection`

**Files:**
- Create: `src/components/competitions/detail/sections/MiniLeaderboardSection.stories.tsx`

- [ ] **Step 9.1: Create the stories file**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { MiniLeaderboardSection } from './MiniLeaderboardSection';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';

const individual: MiniLeaderboardData = {
  above: { id: 'p2', position: 2, name: 'Jess Patel',   points: 38, isCurrent: false },
  you:   { id: 'p3', position: 3, name: 'You',          points: 32, isCurrent: true },
  below: { id: 'p4', position: 4, name: "Mike O'Brien", points: 28, isCurrent: false },
};

const team: MiniLeaderboardData = {
  above: { id: 't1', position: 1, name: 'Eagles',  points: 88, isCurrent: false },
  you:   { id: 't2', position: 2, name: 'Hawks',   points: 82, isCurrent: true },
  below: { id: 't3', position: 3, name: 'Falcons', points: 79, isCurrent: false },
};

const leader: MiniLeaderboardData = {
  above: null,
  you:   { id: 'p1', position: 1, name: 'You',  points: 50, isCurrent: true },
  below: { id: 'p2', position: 2, name: 'Jess', points: 40, isCurrent: false },
};

const last: MiniLeaderboardData = {
  above: { id: 'p4', position: 4, name: 'Mike', points: 22, isCurrent: false },
  you:   { id: 'p5', position: 5, name: 'You',  points: 18, isCurrent: true },
  below: null,
};

const single: MiniLeaderboardData = {
  above: null,
  you:   { id: 'p1', position: 1, name: 'You', points: 10, isCurrent: true },
  below: null,
};

const meta: Meta<typeof MiniLeaderboardSection> = {
  title: 'Competitions/Detail/MiniLeaderboardSection',
  component: MiniLeaderboardSection,
  decorators: [
    (Story) => (
      <View style={{ padding: 16, backgroundColor: '#f4f5f7', minHeight: '100%' }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof MiniLeaderboardSection>;

export const PlayerOnly: Story = {
  args: { individual, team: null, onOpenLeaderboard: () => {} },
};

export const PlayerAndTeam: Story = {
  args: { individual, team, teamName: 'Hawks', onOpenLeaderboard: () => {} },
};

export const UserIsLeader: Story = {
  args: { individual: leader, team: null, onOpenLeaderboard: () => {} },
};

export const UserIsLast: Story = {
  args: { individual: last, team: null, onOpenLeaderboard: () => {} },
};

export const SinglePlayer: Story = {
  args: { individual: single, team: null, onOpenLeaderboard: () => {} },
};
```

- [ ] **Step 9.2: Commit**

```bash
git add src/components/competitions/detail/sections/MiniLeaderboardSection.stories.tsx
git commit -m "docs(stories): add MiniLeaderboardSection storybook stories

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Final verification — type-check, lint, full test suite

- [ ] **Step 10.1: Type-check**

Run: `pnpm type-check`
Expected: PASS. If any error remains, fix it before proceeding (do **not** suppress with `any` or `@ts-ignore`).

- [ ] **Step 10.2: Lint the changed files**

Run: `pnpm lint`
Expected: PASS for the files touched. Fix violations rather than suppressing.

- [ ] **Step 10.3: Run the impacted tests**

Run:
```bash
pnpm test \
  src/utils/__tests__/miniLeaderboard.test.ts \
  src/components/competitions/detail/sections/MiniLeaderboardSection.test.tsx \
  src/components/competitions/detail/DetailsTab.test.tsx \
  src/components/leaderboard/LeaderboardTab
```
Expected: PASS.

- [ ] **Step 10.4: Run the full suite as a regression net**

Run: `pnpm test`
Expected: PASS — no regressions in unrelated suites. Investigate any new failures; do not skip them.

- [ ] **Step 10.5: Manual smoke test (UI verification)**

Reviewer note: type-checks/tests verify code correctness, not feature correctness. Start the Expo dev server and verify:

1. As an organiser-player on a competition with at least 2 completed rounds, the Details tab shows a "Your Standing" mini-leaderboard with you ± 1 row.
2. Tapping the individual sub-section switches to the Leaderboard tab on the individual view, with your row visibly highlighted.
3. On a competition with teams (and you on a team), a divider + team sub-section appears. Tapping it switches to the Leaderboard tab on the team view, with your team row highlighted.
4. On a competition with no teams (`team_mode = 'none'`), only the individual sub-section appears.
5. As an organiser who is **not** in the players list, the section is hidden.
6. On a knockout competition, the section is hidden.

If any of those fails, debug before declaring complete. Report any limitations explicitly.

- [ ] **Step 10.6: Final commit if any test/story tweaks were needed during verification**

```bash
git status
# If nothing to commit, skip. Otherwise:
# git add <files> && git commit -m "..."
```
