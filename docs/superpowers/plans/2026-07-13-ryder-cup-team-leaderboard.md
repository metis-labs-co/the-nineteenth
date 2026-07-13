# Ryder-cup Team Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Render the competition Leaderboard tab's Team standings as a Ryder-cup head-to-head scoreboard (two teams side by side, big accumulated-points numbers, tap to expand a two-column per-round breakdown) **when a competition has exactly two teams**; keep the existing ranked `TeamLeaderboardTable` for 3+ teams.

**Architecture:** A new presentational component `TeamHeadToHeadCard` fed by the two `TeamLeaderboardEntry` objects `LeaderboardTab` already builds, plus a team-colour lookup from the already-loaded `useTeams` data. A small pure helper merges the two teams' per-round breakdowns into aligned rows. `LeaderboardTab` branches on team count. No backend / data-hook changes.

**Tech Stack:** React Native + TypeScript, jest + @testing-library/react-native, `useThemeColors()` theming.

## Global Constraints

- Package manager: **pnpm**; tests `pnpm jest <path>`; typecheck `pnpm tsc --noEmit`.
- Baseline: ~243 pre-existing jest failures on `main`; judge each task against its own new/target tests, no NEW failures.
- Theming: read colours via `useThemeColors()`; static tokens (`spacing`, `typography`, `borderRadius`) imported from `@/constants/theme`. No direct palette imports.
- Applies only to `LeaderboardTab` Team view, only when `teamEntries.length === 2`. 3+ teams → existing `TeamLeaderboardTable` (unchanged).
- Round number = positional `display_order` index via `buildPositionalRoundNumbers(rounds)` (from `./roundNumbering`), consistent with the rest of the leaderboard.
- Team colour = `getTeamColorHex(team.color, index, themeColors)` from `@/utils/teamColor`.
- Types already defined: `TeamLeaderboardEntry` and `RoundBreakdownEntry` are exported from `src/components/leaderboard/TeamLeaderboardTable.tsx`. `RoundBreakdownEntry = { roundId: string; roundLabel: string; courseName?: string; position: number; points: number }`. `TeamLeaderboardEntry = { teamId, teamName, avgHandicap, totalPoints, members: { playerId; playerName; handicap }[], roundBreakdown?: RoundBreakdownEntry[] }`.
- Commit after each task. Do not push.

---

## Task 1: Pure merge helper — align two teams' per-round breakdowns

**Files:**
- Create: `src/components/leaderboard/teamHeadToHead.ts`
- Create: `src/components/leaderboard/teamHeadToHead.test.ts`

**Interfaces:**
- Produces:
  - `interface HeadToHeadRoundRow { roundId: string; roundNumber: number; roundLabel: string; courseName?: string; pointsLeft: number; pointsRight: number }`
  - `mergeHeadToHeadRounds(left: RoundBreakdownEntry[] | undefined, right: RoundBreakdownEntry[] | undefined, roundNumberByRoundId: Map<string, number>): HeadToHeadRoundRow[]` — unions round ids from both breakdowns, pairs each side's `points` (0 when a side didn't score that round), orders by `roundNumberByRoundId` (rounds not in the map sort last), and labels `R{roundNumber}`. `courseName` taken from whichever side has it.

- [ ] **Step 1: Write the failing test**

Create `src/components/leaderboard/teamHeadToHead.test.ts`:

```ts
import { mergeHeadToHeadRounds } from './teamHeadToHead';
import type { RoundBreakdownEntry } from './TeamLeaderboardTable';

const rb = (roundId: string, points: number, courseName?: string): RoundBreakdownEntry => ({
  roundId,
  roundLabel: 'ignored',
  courseName,
  position: 1,
  points,
});

describe('mergeHeadToHeadRounds', () => {
  const order = new Map<string, number>([['r1', 1], ['r2', 2], ['r3', 3]]);

  it('aligns both teams by round and orders positionally', () => {
    const left = [rb('r2', 6), rb('r1', 12, 'Old Course')];
    const right = [rb('r1', 8, 'Old Course'), rb('r2', 6)];
    const rows = mergeHeadToHeadRounds(left, right, order);
    expect(rows.map((r) => r.roundLabel)).toEqual(['R1', 'R2']);
    expect(rows[0]).toMatchObject({ roundId: 'r1', roundNumber: 1, courseName: 'Old Course', pointsLeft: 12, pointsRight: 8 });
    expect(rows[1]).toMatchObject({ roundId: 'r2', pointsLeft: 6, pointsRight: 6 });
  });

  it('fills 0 for a round only one team scored', () => {
    const left = [rb('r1', 10)];
    const right = [rb('r1', 4), rb('r3', 5)];
    const rows = mergeHeadToHeadRounds(left, right, order);
    expect(rows.map((r) => [r.roundLabel, r.pointsLeft, r.pointsRight])).toEqual([
      ['R1', 10, 4],
      ['R3', 0, 5],
    ]);
  });

  it('returns [] when both are empty/undefined', () => {
    expect(mergeHeadToHeadRounds(undefined, undefined, order)).toEqual([]);
    expect(mergeHeadToHeadRounds([], [], order)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm jest src/components/leaderboard/teamHeadToHead.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/leaderboard/teamHeadToHead.ts`:

```ts
import type { RoundBreakdownEntry } from './TeamLeaderboardTable';

/** One round rendered as a two-column head-to-head row. */
export interface HeadToHeadRoundRow {
  roundId: string;
  roundNumber: number;
  roundLabel: string;
  courseName?: string;
  pointsLeft: number;
  pointsRight: number;
}

/**
 * Merge two teams' per-round breakdowns into aligned rows for the head-to-head
 * card. A round scored by only one side shows 0 for the other. Rows are ordered
 * by the positional round number (rounds missing from the map sort last).
 */
export function mergeHeadToHeadRounds(
  left: RoundBreakdownEntry[] | undefined,
  right: RoundBreakdownEntry[] | undefined,
  roundNumberByRoundId: Map<string, number>
): HeadToHeadRoundRow[] {
  const leftById = new Map((left ?? []).map((r) => [r.roundId, r]));
  const rightById = new Map((right ?? []).map((r) => [r.roundId, r]));

  const roundIds = new Set<string>([...leftById.keys(), ...rightById.keys()]);

  const rows: HeadToHeadRoundRow[] = [];
  for (const roundId of roundIds) {
    const l = leftById.get(roundId);
    const r = rightById.get(roundId);
    const roundNumber = roundNumberByRoundId.get(roundId) ?? Number.MAX_SAFE_INTEGER;
    rows.push({
      roundId,
      roundNumber,
      roundLabel: `R${roundNumber === Number.MAX_SAFE_INTEGER ? '?' : roundNumber}`,
      courseName: l?.courseName ?? r?.courseName,
      pointsLeft: l?.points ?? 0,
      pointsRight: r?.points ?? 0,
    });
  }

  return rows.sort((a, b) => a.roundNumber - b.roundNumber);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm jest src/components/leaderboard/teamHeadToHead.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/leaderboard/teamHeadToHead.ts src/components/leaderboard/teamHeadToHead.test.ts
git commit -m "feat(leaderboard): head-to-head per-round merge helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `TeamHeadToHeadCard` component

**Files:**
- Create: `src/components/leaderboard/TeamHeadToHeadCard.tsx`
- Create: `src/components/leaderboard/TeamHeadToHeadCard.test.tsx`

**Interfaces:**
- Consumes: `mergeHeadToHeadRounds`/`HeadToHeadRoundRow` (Task 1); `buildPositionalRoundNumbers` (`./roundNumbering`); `TeamLeaderboardEntry` (`./TeamLeaderboardTable`); `RoundWithCourse` (`@/components/competitions/detail/types`).
- Produces:
  ```ts
  export interface TeamHeadToHeadCardProps {
    entries: [TeamLeaderboardEntry, TeamLeaderboardEntry]; // the two teams, any order
    teamColors: Map<string, string>;                       // teamId -> hex
    currentUserId?: string;
    rounds: RoundWithCourse[];                              // for positional R# + course
    testID?: string;
  }
  export function TeamHeadToHeadCard(props: TeamHeadToHeadCardProps): JSX.Element;
  ```
  Internally: sorts the two entries by `totalPoints` desc (leader → left column); an exact tie keeps input order and shows no trophy. Colours resolved from `teamColors.get(teamId)` with a neutral fallback (`colors.textSecondary`). The card body is one tap target toggling an expanded per-round section (`mergeHeadToHeadRounds(leader.roundBreakdown, other.roundBreakdown, buildPositionalRoundNumbers(rounds))`).

- [ ] **Step 1: Write the failing test**

Create `src/components/leaderboard/TeamHeadToHeadCard.test.tsx`. Use the same render harness other leaderboard component tests use (see `src/components/leaderboard/SubMatchLeaderboardTab.test.tsx` for the exact `render` import and any provider wrapper — match it):

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TeamHeadToHeadCard } from './TeamHeadToHeadCard';
import type { TeamLeaderboardEntry } from './TeamLeaderboardTable';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

const rounds = [
  { id: 'r1', display_order: 1, course: { name: 'Old Course' } },
  { id: 'r2', display_order: 2, course: { name: 'West Course' } },
] as unknown as RoundWithCourse[];

const england: TeamLeaderboardEntry = {
  teamId: 'eng', teamName: 'England', avgHandicap: 12.4, totalPoints: 22,
  members: [{ playerId: 'p1', playerName: 'Sam Kay', handicap: 10 }],
  roundBreakdown: [
    { roundId: 'r1', roundLabel: 'R1', courseName: 'Old Course', position: 1, points: 12 },
    { roundId: 'r2', roundLabel: 'R2', courseName: 'West Course', position: 2, points: 10 },
  ],
};
const australia: TeamLeaderboardEntry = {
  teamId: 'aus', teamName: 'Australia', avgHandicap: 10.1, totalPoints: 14,
  members: [{ playerId: 'p2', playerName: 'Andrew Biggs', handicap: 8 }],
  roundBreakdown: [
    { roundId: 'r1', roundLabel: 'R1', courseName: 'Old Course', position: 2, points: 8 },
    { roundId: 'r2', roundLabel: 'R2', courseName: 'West Course', position: 1, points: 6 },
  ],
};
const colors = new Map([['eng', '#1e40af'], ['aus', '#eab308']]);

describe('TeamHeadToHeadCard', () => {
  it('renders both teams and their big totals, leader first', () => {
    const { getByText, getByTestId } = render(
      <TeamHeadToHeadCard entries={[australia, england]} teamColors={colors} rounds={rounds} testID="h2h" />
    );
    expect(getByText('England')).toBeTruthy();
    expect(getByText('Australia')).toBeTruthy();
    expect(getByText('22')).toBeTruthy();
    expect(getByText('14')).toBeTruthy();
    // leader (England, 22) shown in the left column
    expect(getByTestId('h2h-team-left')).toHaveTextContent('England');
  });

  it('shows the "You" badge only on the current user\'s team', () => {
    const { getByTestId, queryAllByText } = render(
      <TeamHeadToHeadCard entries={[england, australia]} teamColors={colors} currentUserId="p2" rounds={rounds} testID="h2h" />
    );
    expect(getByTestId('h2h-team-right')).toHaveTextContent('Australia');
    expect(queryAllByText('You').length).toBe(1);
  });

  it('expands to show the per-round breakdown in two columns', () => {
    const { getByTestId, queryByText, getByText } = render(
      <TeamHeadToHeadCard entries={[england, australia]} teamColors={colors} rounds={rounds} testID="h2h" />
    );
    expect(queryByText('Round Breakdown')).toBeNull();
    fireEvent.press(getByTestId('h2h-card'));
    expect(getByText('Round Breakdown')).toBeTruthy();
    expect(getByText('R1 · Old Course')).toBeTruthy();
    // R1: England 12 vs Australia 8 aligned in the row
    expect(getByTestId('h2h-round-r1')).toHaveTextContent('12');
    expect(getByTestId('h2h-round-r1')).toHaveTextContent('8');
  });
});
```

(If the shared render harness auto-wraps theme, drop any manual provider. If `toHaveTextContent` isn't available, assert via `within(getByTestId(...)).getByText(...)` — match the existing test file's matchers.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm jest src/components/leaderboard/TeamHeadToHeadCard.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the component**

Create `src/components/leaderboard/TeamHeadToHeadCard.tsx`. Requirements:
- `const colors = useThemeColors();` `const [expanded, setExpanded] = useState(false);`
- Sort: `const [leader, other] = [...entries].sort((a, b) => b.totalPoints - a.totalPoints);` `const isTie = entries[0].totalPoints === entries[1].totalPoints;`
- Colours: `const leftColor = teamColors.get(leader.teamId) ?? colors.textSecondary; const rightColor = teamColors.get(other.teamId) ?? colors.textSecondary;`
- Two columns (a left `View` `testID="${testID}-team-left"`, right `testID="${testID}-team-right"`), each with: colour dot/accent (`backgroundColor`/`borderColor` = team colour), team name (`typography.h4`/bold), a `Badge`/inline "You" when `currentUserId` is in that team's `members` (`members.some(m => m.playerId === currentUserId)`), member names joined `members.map(m => m.playerName).join(', ')` (`numberOfLines={1}`, `typography.caption`), and `HC {avgHandicap.toFixed(1)}` (`typography.caption`).
- Centre / big numbers: `leader.totalPoints` and `other.totalPoints` as large text (`typography.h1`/`display`), separated by a dash. Emphasise the leader's number in `leftColor` (bold); on `isTie` render both neutral. Show an `IconTrophy` (from `@tabler/icons-react-native`) by the leader's number when `!isTie`.
- Card root: `TouchableOpacity` `testID="${testID}-card"` `onPress={() => setExpanded(v => !v)}` `accessibilityRole="button"`, with a chevron (`IconChevronDown`/`IconChevronUp`).
- Expanded section (when `expanded`): a `SectionHeader`-style title `Round Breakdown`, then `mergeHeadToHeadRounds(leader.roundBreakdown, other.roundBreakdown, buildPositionalRoundNumbers(rounds))` mapped to rows. Each row `testID="${testID}-round-${row.roundId}"`: left `pointsLeft`, centre `${row.roundLabel}${row.courseName ? ' · ' + row.courseName : ''}`, right `pointsRight`. Highlight the winning side in its team colour (`pointsLeft > pointsRight` → left in `leftColor` bold; `<` → right in `rightColor` bold; equal → both neutral). Empty rows → "No rounds played yet".
- Follow the visual/token patterns in `TeamLeaderboardTable.tsx` (card padding, borders, `withOpacity` highlights) and reference `SubMatchOverallHeader` (`src/components/rounds/SubMatchNetCard.tsx`) for the two-team big-number treatment.

Use `StyleSheet.create` with `spacing`/`typography`/`borderRadius`; theme colours applied inline.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm jest src/components/leaderboard/TeamHeadToHeadCard.test.tsx`
Expected: PASS (3 tests). Adjust `testID` wiring until the queries resolve; do not weaken assertions.
Run: `pnpm tsc --noEmit` → no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/leaderboard/TeamHeadToHeadCard.tsx src/components/leaderboard/TeamHeadToHeadCard.test.tsx
git commit -m "feat(leaderboard): Ryder-cup TeamHeadToHeadCard (2-team scoreboard + breakdown)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Render the head-to-head card for two-team competitions in `LeaderboardTab`

**Files:**
- Modify: `src/components/leaderboard/LeaderboardTab.tsx` (Team-view render block ~lines 480-490; imports; add a team-colour lookup memo)

**Interfaces:**
- Consumes: `TeamHeadToHeadCard` (Task 2); `getTeamColorHex` (`@/utils/teamColor`); existing `teams` from `useTeams` (already in this component, `~line 356`) and `teamEntries` (`~line 397`).

- [ ] **Step 1: Add imports + team-colour lookup**

In `LeaderboardTab.tsx`:
1. Add imports:
```ts
import { TeamHeadToHeadCard } from './TeamHeadToHeadCard';
import { getTeamColorHex } from '@/utils/teamColor';
```
2. After `const playerTeamLookup = useMemo(...)` (~line 358), add a colour lookup built from the same `teams` data:
```ts
  const teamColorById = useMemo(() => {
    const map = new Map<string, string>();
    (teams ?? []).forEach((team, index) => {
      map.set(team.id, getTeamColorHex(team.color, index, _colors));
    });
    return map;
  }, [teams, _colors]);
```
(`_colors` is the `useThemeColors()` value already in scope at the top of the component — confirm its identifier name and use it; it may be named `_colors` or `colors`.)

- [ ] **Step 2: Branch the Team-view render on team count**

Find the Team-view branch (the block that renders `<TeamLeaderboardTable leaderboard={teamEntries} .../>`, ~lines 483-489, inside `effectiveView === 'team'`). Replace the `TeamLeaderboardTable` element with a conditional that keeps the `TeamPointsToWinBanner` above it unchanged:
```tsx
          {teamEntries.length === 2 ? (
            <TeamHeadToHeadCard
              entries={[teamEntries[0], teamEntries[1]]}
              teamColors={teamColorById}
              currentUserId={currentUserId}
              rounds={rounds}
              testID="competition-team-headtohead"
            />
          ) : (
            <TeamLeaderboardTable
              leaderboard={teamEntries}
              currentUserId={currentUserId}
              isLoading={false}
              showTiedIndicator
              testID="competition-team-leaderboard"
            />
          )}
```
(Preserve whatever props the existing `TeamLeaderboardTable` call passed — copy them verbatim into the `else` branch.)

- [ ] **Step 3: Typecheck + leaderboard tests**

Run: `pnpm tsc --noEmit` → no new errors.
Run: `pnpm jest src/components/leaderboard` → no NEW failures vs the known baseline (LeaderboardTab.test.tsx ~4, LeaderboardTable.test.tsx ~6 = 10 baseline).

- [ ] **Step 4: Manual verification note**

On a two-team competition (e.g. "Murray Winter Classic 2026"), the Team standings now show the head-to-head scoreboard; tapping expands the two-column per-round breakdown. A 3+-team competition still shows the ranked `TeamLeaderboardTable`.

- [ ] **Step 5: Commit**

```bash
git add src/components/leaderboard/LeaderboardTab.tsx
git commit -m "feat(leaderboard): use head-to-head card for two-team competitions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review

- Spec: 2-team scoreboard (Task 2 + Task 3 branch), 3+ list fallback (Task 3 `else`), members + avg HC + trophy + "You" badge (Task 2), expanded R#+course+points with winner highlight (Task 2), positional round numbers + course from rounds (Task 1/2), team colours from `useTeams` (Task 3), merge-by-roundId with 0-fill (Task 1). ✓
- Type consistency: `TeamLeaderboardEntry`/`RoundBreakdownEntry` reused from `TeamLeaderboardTable`; `HeadToHeadRoundRow`/`mergeHeadToHeadRounds` defined in Task 1 and consumed in Task 2; `TeamHeadToHeadCardProps` defined in Task 2 and consumed in Task 3. ✓
- No placeholder tests; each has concrete inputs/assertions. Component test notes the harness-matching caveat explicitly rather than leaving it vague.
- No backend/data change; `TeamLeaderboardTable` untouched.
