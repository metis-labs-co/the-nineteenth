# Competition Leaderboard Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix and enhance competition leaderboards: show the winning team on the Compete list, default team competitions to the Team sub-tab, surface a per-round points/"dinner bet" badge, make singles match-play team points count in the overall standings (2–2 → 4–4) with a prod backfill, and correct round numbering on the leaderboard.

**Architecture:** Five mostly-independent changes. Pure logic (round numbering, tally scaling, split pair-points resolution, winner filtering) is extracted into small testable helpers with jest unit tests; UI wiring passes those results into existing components. Item 4's finalize fix reuses the existing `finalizePairResults` path by widening `isPairPointsOverride` to accept a split round's `team_points` as per-match points, so existing prod data self-heals on re-finalize.

**Tech Stack:** React Native + TypeScript, TanStack Query, Supabase (Postgres), jest + @testing-library/react-native.

## Global Constraints

- Package manager: **pnpm**. Run tests with `pnpm jest <path>` (or `pnpm test`).
- Baseline test noise: ~243 pre-existing jest failures exist on `main`; judge each task against its **own** new/target tests, not a green whole-suite run.
- Theming: components read colours via `useThemeColors()`; never import palette directly. Follow existing file patterns.
- Round numbering rule (verbatim from codebase): the user-facing round number is the **positional index within the `display_order`-sorted rounds** (`index + 1`), NOT `round.round_number` (a stable id that gets gaps on delete/reorder).
- Split round points semantics: for `round_format === 'split'`, per-match points come from `rules_override.pair_points`, falling back to `rules_override.team_points` for legacy data. `WinTieLossPoints = { win: number; tie: number; loss: number }`.
- Commit after each task. Do not push. Branch: `worktree-enlarge-distance-to-pin` (current worktree, off `main`).

---

## Task 1: Positional round numbering on the leaderboard (Item 5)

**Files:**
- Create: `src/components/leaderboard/roundNumbering.ts`
- Create: `src/components/leaderboard/roundNumbering.test.ts`
- Modify: `src/components/leaderboard/LeaderboardTab.tsx` (sorts at ~277-304; `toTeamLeaderboardEntries` at ~210-253; `LeaderboardHeader`/`InProgressRoundLeaderboard` `roundNumber` props at ~504, 533)
- Modify: `src/components/leaderboard/PointsBreakdownModal.tsx:67-73, 182`

**Interfaces:**
- Produces: `buildPositionalRoundNumbers(rounds: { id: string; display_order: number }[]): Map<string, number>` — sorts by `display_order` ascending and maps each `round.id` to its 1-based position.

- [ ] **Step 1: Write the failing test**

Create `src/components/leaderboard/roundNumbering.test.ts`:

```ts
import { buildPositionalRoundNumbers } from './roundNumbering';

describe('buildPositionalRoundNumbers', () => {
  it('numbers rounds positionally by display_order (1-based), ignoring round_number gaps', () => {
    const rounds = [
      { id: 'c', display_order: 3 },
      { id: 'a', display_order: 1 },
      { id: 'b', display_order: 2 },
    ];
    const map = buildPositionalRoundNumbers(rounds);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
    expect(map.get('c')).toBe(3);
  });

  it('closes gaps left by a deleted round (display_order 1,2,4 -> positions 1,2,3)', () => {
    const rounds = [
      { id: 'a', display_order: 1 },
      { id: 'b', display_order: 2 },
      { id: 'd', display_order: 4 },
    ];
    const map = buildPositionalRoundNumbers(rounds);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
    expect(map.get('d')).toBe(3);
  });

  it('returns an empty map for no rounds', () => {
    expect(buildPositionalRoundNumbers([]).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/components/leaderboard/roundNumbering.test.ts`
Expected: FAIL — cannot find module `./roundNumbering`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/leaderboard/roundNumbering.ts`:

```ts
/**
 * Maps each round id to its user-facing round number: the 1-based position of
 * the round within the display_order-sorted list. This matches the Rounds tab
 * and the rest of the app, which number positionally so gaps left by deleted or
 * reordered rounds don't surface. `round.round_number` is a stable id (with
 * gaps) and must NOT be used for display.
 */
export function buildPositionalRoundNumbers(
  rounds: { id: string; display_order: number }[]
): Map<string, number> {
  const sorted = [...rounds].sort((a, b) => a.display_order - b.display_order);
  const map = new Map<string, number>();
  sorted.forEach((round, index) => map.set(round.id, index + 1));
  return map;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/components/leaderboard/roundNumbering.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire into LeaderboardTab**

In `src/components/leaderboard/LeaderboardTab.tsx`:

1. Add import near the other local imports:
```ts
import { buildPositionalRoundNumbers } from './roundNumbering';
```

2. Change `toTeamLeaderboardEntries` (the block at ~210-253) so the breakdown uses positional numbers. Replace the `roundBreakdown` mapping body so it builds and reads a positional map:
```ts
function toTeamLeaderboardEntries(
  entries: CompetitionLeaderboardEntry[],
  rounds: RoundWithCourse[]
): TeamLeaderboardEntry[] {
  const roundsById = new Map(rounds.map((r) => [r.id, r]));
  const positionalByRoundId = buildPositionalRoundNumbers(rounds);

  return entries.map((entry) => {
    const avgHandicap =
      entry.teamMembers.length > 0
        ? entry.teamMembers.reduce((sum, m) => sum + m.handicap, 0) / entry.teamMembers.length
        : 0;

    const roundBreakdown = entry.roundPoints
      .map((rp) => {
        const round = roundsById.get(rp.roundId);
        const positional = positionalByRoundId.get(rp.roundId);
        return {
          roundId: rp.roundId,
          roundLabel: positional ? `R${positional}` : 'R?',
          courseName: round?.course?.name ?? undefined,
          position: rp.position,
          points: rp.points,
          _sortKey: positional ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => a._sortKey - b._sortKey)
      .map(({ _sortKey: _omit, ...keep }) => keep);

    return {
      teamId: entry.participantId,
      teamName: entry.participantName,
      avgHandicap,
      totalPoints: entry.totalPoints,
      members: entry.teamMembers.map((member) => ({
        playerId: member.playerId,
        playerName: member.playerName,
        handicap: member.handicap,
      })),
      roundBreakdown,
    };
  });
}
```

3. Inside the `LeaderboardTab` component body, after `orderedRounds` is defined (~line 304), add a positional map memo and change the three round sorts to sort by `display_order`:
```ts
  const positionalRoundNumbers = useMemo(
    () => buildPositionalRoundNumbers(rounds),
    [rounds]
  );
```
Change `completedRounds` sort (`.sort((a, b) => a.round_number - b.round_number)`) to `.sort((a, b) => a.display_order - b.display_order)`, and likewise `inProgressRounds` and `orderedRounds` (`a.round.display_order - b.round.display_order`).

4. In the "Round Results" render (~line 500-555), pass the positional number to the headers. For the `LeaderboardHeader` at ~504 change `roundNumber={round.round_number}` to:
```tsx
                    roundNumber={positionalRoundNumbers.get(round.id) ?? round.round_number}
```
and for the `InProgressRoundLeaderboard` at ~533 change `roundNumber={round.round_number}` to:
```tsx
                      roundNumber={positionalRoundNumbers.get(round.id) ?? round.round_number}
```
Leave `testID` props as-is (they use `round.round_number`; internal only).

- [ ] **Step 6: Wire into PointsBreakdownModal**

In `src/components/leaderboard/PointsBreakdownModal.tsx`:

1. Add import:
```ts
import { buildPositionalRoundNumbers } from './roundNumbering';
```
2. After `roundInfoMap` (~line 64), add:
```ts
  const positionalByRoundId = useMemo(
    () => buildPositionalRoundNumbers(rounds),
    [rounds]
  );
```
3. Replace the `sortedRoundPoints` comparator (lines 67-73) to sort by positional number:
```ts
  const sortedRoundPoints = useMemo(() => {
    return [...roundPoints].sort((a, b) => {
      const posA = positionalByRoundId.get(a.roundId) ?? Number.MAX_SAFE_INTEGER;
      const posB = positionalByRoundId.get(b.roundId) ?? Number.MAX_SAFE_INTEGER;
      return posA - posB;
    });
  }, [roundPoints, positionalByRoundId]);
```
4. Replace the label at line 182 (`Round {roundInfo?.round_number ?? index + 1}`) with:
```tsx
                        Round {positionalByRoundId.get(rp.roundId) ?? index + 1}
```

- [ ] **Step 7: Typecheck and run affected tests**

Run: `pnpm tsc --noEmit`
Expected: no NEW errors in the files touched.
Run: `pnpm jest src/components/leaderboard/roundNumbering.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/leaderboard/roundNumbering.ts src/components/leaderboard/roundNumbering.test.ts src/components/leaderboard/LeaderboardTab.tsx src/components/leaderboard/PointsBreakdownModal.tsx
git commit -m "fix(leaderboard): number rounds positionally by display_order

Overall leaderboard labelled/sorted rounds by round_number (a stable id
with gaps after delete/reorder); switch to positional display_order
numbering to match the Rounds tab.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Winning team on the Compete list (Item 1)

**Files:**
- Modify: `src/services/competitions/winnerService.ts`
- Modify: `src/screens/compete/hooks/useCompetitionGroups.ts:113-116, 189-192`
- Create: `src/services/competitions/winnerService.test.ts`

**Interfaces:**
- Consumes: `getCompetitionResults(competitionId)` (unchanged), `aggregateCompetitionStandings` (unchanged), `TeamMode` from `@/types/database/enums`.
- Produces: `fetchCompetitionWinner(competitionId: string, teamMode?: TeamMode): Promise<CompetitionWinnerInfo | undefined>` — when `teamMode` is a team mode (`!== 'none'`) it aggregates only `is_team_result === true` rows; otherwise only individual rows. Backwards compatible: omitting `teamMode` keeps today's mixed behaviour.

- [ ] **Step 1: Write the failing test**

Create `src/services/competitions/winnerService.test.ts`:

```ts
import { fetchCompetitionWinner } from './winnerService';
import { getCompetitionResults } from '@/services/rounds/roundResultsService';

jest.mock('@/services/rounds/roundResultsService');

const mockGet = getCompetitionResults as jest.MockedFunction<typeof getCompetitionResults>;

// One round: team "Eagles" (12 pts) beats individual "Sam" (40 pts raw).
// Mixed aggregation would wrongly pick Sam; team-filtered must pick Eagles.
function resultsFixture() {
  return {
    rounds: [
      {
        roundId: 'r1',
        roundNumber: 1,
        gameType: 'stableford',
        results: [
          {
            player_id: null,
            team_id: 't-eagles',
            is_team_result: true,
            team: { name: 'Eagles' },
            player: null,
            raw_score: 74,
            position: 1,
            competition_points: 12,
          },
          {
            player_id: 'p-sam',
            team_id: null,
            is_team_result: false,
            team: null,
            player: { name: 'Sam' },
            raw_score: 40,
            position: 1,
            competition_points: 40,
          },
        ],
      },
    ],
  } as unknown as Awaited<ReturnType<typeof getCompetitionResults>>;
}

describe('fetchCompetitionWinner', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the winning TEAM for a team competition', async () => {
    mockGet.mockResolvedValue(resultsFixture());
    const winner = await fetchCompetitionWinner('c1', 'fixed');
    expect(winner).toEqual({ name: 'Eagles', points: 12, isTeam: true });
  });

  it('returns the winning INDIVIDUAL for a non-team competition', async () => {
    mockGet.mockResolvedValue(resultsFixture());
    const winner = await fetchCompetitionWinner('c1', 'none');
    expect(winner).toEqual({ name: 'Sam', points: 40, isTeam: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/services/competitions/winnerService.test.ts`
Expected: FAIL — team test currently returns Sam (mixed aggregation) or arg is ignored.

- [ ] **Step 3: Implement the filter**

In `src/services/competitions/winnerService.ts`:

1. Add import at top:
```ts
import type { TeamMode } from '@/types/database/enums';
```
2. Change the signature and add a filter over each round's results. Replace the function header and the results loop so it filters by team mode:
```ts
export async function fetchCompetitionWinner(
  competitionId: string,
  teamMode?: TeamMode
): Promise<CompetitionWinnerInfo | undefined> {
  try {
    const competitionResults = await getCompetitionResults(competitionId);

    if (!competitionResults.rounds || competitionResults.rounds.length === 0) {
      return undefined;
    }

    // For team competitions, the winner is the top TEAM; for individual
    // competitions, the top player. Team and individual rows coexist in a team
    // competition and their point totals aren't comparable, so aggregating both
    // together would surface the wrong winner.
    const wantTeams = teamMode !== undefined && teamMode !== 'none';
    const includeRow = (isTeam: boolean) =>
      teamMode === undefined ? true : wantTeams ? isTeam : !isTeam;

    const participantMap = new Map<string, { name: string; isTeam: boolean }>();
    const roundResultsForAggregation = [];

    for (const round of competitionResults.rounds) {
      const results = [];

      for (const result of round.results) {
        const isTeam = result.is_team_result;
        if (!includeRow(isTeam)) continue;

        const id = result.player_id || result.team_id;
        if (!id) continue;

        const name = isTeam ? result.team?.name : result.player?.name;
        if (!participantMap.has(id) && name) {
          participantMap.set(id, { name, isTeam });
        }

        results.push({
          participantId: id,
          rawScore: result.raw_score ?? 0,
          position: result.position ?? 0,
          tied: false,
          competitionPoints: result.competition_points,
        });
      }

      if (results.length > 0) {
        roundResultsForAggregation.push({ roundId: round.roundId, results });
      }
    }

    if (roundResultsForAggregation.length === 0) {
      return undefined;
    }

    const standings = aggregateCompetitionStandings(roundResultsForAggregation);
    if (standings.length === 0) return undefined;

    const winner = standings[0];
    const participant = participantMap.get(winner.participantId);
    if (!participant) return undefined;

    return {
      name: participant.name,
      points: winner.totalPoints,
      isTeam: participant.isTeam,
    };
  } catch (error) {
    console.error(`Error fetching winner for competition ${competitionId}:`, error);
    return undefined;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/services/competitions/winnerService.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Pass teamMode from the caller**

In `src/screens/compete/hooks/useCompetitionGroups.ts`, update BOTH winner fetches to pass the team mode:
- Line ~114 (organizer branch):
```ts
            const winner = await fetchCompetitionWinner(comp.id, comp.team_mode ?? 'none');
```
- Line ~190 (joined branch):
```ts
            const winner = await fetchCompetitionWinner(comp.id, comp.team_mode ?? 'none');
```
Confirm `team_mode` is selected in both queries (it is — used for `teamMode` mapping). If the organizer query's select list lacks `team_mode`, add it.

- [ ] **Step 6: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 7: Commit**

```bash
git add src/services/competitions/winnerService.ts src/services/competitions/winnerService.test.ts src/screens/compete/hooks/useCompetitionGroups.ts
git commit -m "fix(compete): show winning team for team competitions

fetchCompetitionWinner mixed team + individual rows and could surface an
individual as the winner of a team competition. Filter by the
competition's team mode so team comps resolve the top team.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Default to the Team sub-tab for team competitions (Item 2)

**Files:**
- Modify: `src/screens/competitions/CompetitionDetailScreen/index.tsx` (state ~86-88; add effect after competition data resolves)

**Interfaces:**
- Consumes: `competitionData` (from the data hook) whose competition carries `team_mode: TeamMode`. Reuses existing `leaderboardView` / `setLeaderboardView` state.

- [ ] **Step 1: Add a one-shot default effect**

In `src/screens/competitions/CompetitionDetailScreen/index.tsx`:

1. Add a ref import if not present (`useRef` from React) and a ref beside the leaderboard state (~line 88):
```ts
  const didDefaultLeaderboardView = React.useRef(false);
```
2. After `competitionData` is destructured from the data hook (the block starting ~line 94), add an effect. Use the actual competition object path from `competitionData` (e.g. `competitionData?.competition?.team_mode`; confirm the exact shape in this file and match it):
```ts
  // Team competitions open the leaderboard on the Team sub-view. Runs once when
  // competition data first resolves; never fights a later manual toggle.
  const competitionTeamMode = competitionData?.competition?.team_mode;
  React.useEffect(() => {
    if (didDefaultLeaderboardView.current) return;
    if (competitionTeamMode === undefined) return; // not loaded yet
    if (competitionTeamMode !== 'none') {
      setLeaderboardView('team');
    }
    didDefaultLeaderboardView.current = true;
  }, [competitionTeamMode]);
```

- [ ] **Step 2: Verify the competition shape**

Run: `grep -n "competitionData" src/screens/competitions/CompetitionDetailScreen/index.tsx | head`
Confirm the correct property path to `team_mode` (adjust `competitionData?.competition?.team_mode` if the field lives directly on `competitionData` or under another key). The `team_mode` value must be the `TeamMode` used elsewhere in this file (search `team_mode` in the same file to confirm the path already in use, e.g. where `showLeaderboardToggle`/Teams tab is derived).

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 4: Manual verification note**

On device/simulator (or in a follow-up render test): open a team competition → Leaderboard tab shows **Team Standings** first; open an individual competition → shows **Individual Standings**; toggle to Individual on a team comp, navigate away and back within the same mount → the manual choice is preserved (effect does not re-fire).

- [ ] **Step 5: Commit**

```bash
git add src/screens/competitions/CompetitionDetailScreen/index.tsx
git commit -m "feat(leaderboard): default team competitions to the Team sub-tab

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Scale the sub-match tally by configured points (Item 4, display)

**Files:**
- Modify: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts` (`tallyByTeam` ~281-294; add `resolveSplitMatchDisplayPoints`)
- Modify: `src/__tests__/utils/subMatchTallyByTeam.test.ts` (add scaled cases)

**Interfaces:**
- Produces:
  - `tallyByTeam(leaders: TeamMatchLeader[], points?: { win: number; tie: number }): Map<string, number>` — winner earns `points.win` (default 1), a halved started match splits `points.tie` (default 0.5) to each side, unstarted contributes nothing. Default args reproduce the previous flat 1 / 0.5 behaviour.
  - `resolveSplitMatchDisplayPoints(round: { round_format?: string | null; rules_override?: RoundRulesOverride | null }): { win: number; tie: number }` — for `round_format === 'split'` returns `{ win, tie }` from `pair_points ?? team_points`; otherwise `{ win: 1, tie: 0.5 }`.

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/utils/subMatchTallyByTeam.test.ts`:

```ts
describe('tallyByTeam with configured points', () => {
  it('scales wins by the configured per-match win value (2 pts -> 4-4)', () => {
    const leaders: TeamMatchLeader[] = [
      { teamA: 'Australia', teamB: 'England',  leaderSide: 'b', hasScores: true },
      { teamA: 'England',  teamB: 'Australia', leaderSide: 'b', hasScores: true },
      { teamA: 'Australia', teamB: 'England',  leaderSide: 'b', hasScores: true },
      { teamA: 'England',  teamB: 'Australia', leaderSide: 'b', hasScores: true },
    ];
    const t = tallyByTeam(leaders, { win: 2, tie: 1 });
    expect(t.get('England')).toBe(4);
    expect(t.get('Australia')).toBe(4);
  });

  it('uses the configured tie value for a halved match', () => {
    const leaders: TeamMatchLeader[] = [
      { teamA: 'England', teamB: 'Australia', leaderSide: null, hasScores: true },
    ];
    const t = tallyByTeam(leaders, { win: 2, tie: 1 });
    expect(t.get('England')).toBe(1);
    expect(t.get('Australia')).toBe(1);
  });
});
```

Create `src/screens/scoring/ReviewScorecardScreen/utils/resolveSplitMatchDisplayPoints.test.ts`:

```ts
import { resolveSplitMatchDisplayPoints } from './subMatchLeaderboard';

describe('resolveSplitMatchDisplayPoints', () => {
  it('reads pair_points for a split round', () => {
    expect(
      resolveSplitMatchDisplayPoints({
        round_format: 'split',
        rules_override: { pair_points: { win: 2, tie: 1, loss: 0 } },
      })
    ).toEqual({ win: 2, tie: 1 });
  });

  it('falls back to team_points for a split round without pair_points (legacy data)', () => {
    expect(
      resolveSplitMatchDisplayPoints({
        round_format: 'split',
        rules_override: { team_points: { win: 2, tie: 1, loss: 0 } },
      })
    ).toEqual({ win: 2, tie: 1 });
  });

  it('returns the flat default for a non-split round', () => {
    expect(
      resolveSplitMatchDisplayPoints({
        round_format: 'combined',
        rules_override: { team_points: { win: 5, tie: 2, loss: 0 } },
      })
    ).toEqual({ win: 1, tie: 0.5 });
  });

  it('returns the flat default when there is no override', () => {
    expect(
      resolveSplitMatchDisplayPoints({ round_format: 'split', rules_override: null })
    ).toEqual({ win: 1, tie: 0.5 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest subMatchTallyByTeam resolveSplitMatchDisplayPoints`
Expected: FAIL — `tallyByTeam` ignores the second arg; `resolveSplitMatchDisplayPoints` not exported.

- [ ] **Step 3: Implement**

In `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts`:

1. Add the import at the top (with the other type imports):
```ts
import type { RoundRulesOverride } from '@/types/database/roundRules.types';
```
2. Replace `tallyByTeam` (lines ~281-294) with a points-aware version whose defaults preserve current behaviour:
```ts
export function tallyByTeam(
  leaders: TeamMatchLeader[],
  points: { win: number; tie: number } = { win: 1, tie: 0.5 }
): Map<string, number> {
  const tally = new Map<string, number>();
  const add = (team: string | null, n: number) => {
    if (!team) return;
    tally.set(team, (tally.get(team) ?? 0) + n);
  };
  for (const r of leaders) {
    if (!r.hasScores) continue;
    if (r.leaderSide === 'a') add(r.teamA, points.win);
    else if (r.leaderSide === 'b') add(r.teamB, points.win);
    else {
      add(r.teamA, points.tie);
      add(r.teamB, points.tie);
    }
  }
  return tally;
}
```
3. Add the resolver (below `tallyByTeam`):
```ts
/**
 * Per-match display points for a split sub-match round. Split rounds are scored
 * per match via `pair_points`; legacy singles match-play rounds stored the value
 * under `team_points` (the points editor wrote there when no pair_points seed
 * existed), so fall back to it. Non-split rounds use the flat 1 / 0.5 tally.
 */
export function resolveSplitMatchDisplayPoints(round: {
  round_format?: string | null;
  rules_override?: RoundRulesOverride | null;
}): { win: number; tie: number } {
  if (round.round_format !== 'split') return { win: 1, tie: 0.5 };
  const pts = round.rules_override?.pair_points ?? round.rules_override?.team_points;
  if (!pts) return { win: 1, tie: 0.5 };
  return { win: pts.win, tie: pts.tie };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest subMatchTallyByTeam resolveSplitMatchDisplayPoints`
Expected: PASS. Also run the existing default-behaviour test file: `pnpm jest src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts` — expected still PASS (defaults unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts src/__tests__/utils/subMatchTallyByTeam.test.ts src/screens/scoring/ReviewScorecardScreen/utils/resolveSplitMatchDisplayPoints.test.ts
git commit -m "feat(submatch): scale team tally by configured per-match points

tallyByTeam awarded a flat 1 per win / 0.5 per halve, ignoring the round's
configured points, so a 2-pt singles round read 2-2 instead of 4-4. Add an
optional points arg (default preserves old behaviour) and a resolver that
reads pair_points (falling back to team_points for legacy split rounds).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Wire scaled points into the sub-match leaderboard UI (Item 4, display)

**Files:**
- Modify: `src/components/leaderboard/SubMatchLeaderboardTab.tsx` (add `matchPoints` prop; use it in `tallyByTeam` call ~290)
- Modify: `src/components/leaderboard/RoundSubMatchLeaderboard.tsx` (resolve + pass `matchPoints`)
- Modify: any other `SubMatchLeaderboardTab` caller (find via grep) to pass `matchPoints`

**Interfaces:**
- Consumes: `resolveSplitMatchDisplayPoints` (Task 4); `useRoundDetails` round (has `round_format`, `rules_override`).
- Produces: `SubMatchLeaderboardTab` accepts optional `matchPoints?: { win: number; tie: number }` (default `{ win: 1, tie: 0.5 }`), passed to `tallyByTeam`.

- [ ] **Step 1: Add the prop and use it**

In `src/components/leaderboard/SubMatchLeaderboardTab.tsx`:
1. Add to `SubMatchLeaderboardTabProps` (interface ~90-104):
```ts
  /** Per-match points for the overall tally header. Defaults to flat 1 / 0.5. */
  matchPoints?: { win: number; tie: number };
```
2. Destructure it in the component signature (default in destructure):
```ts
  matchPoints = { win: 1, tie: 0.5 },
```
3. Change the tally call (~line 290) from `const tally = tallyByTeam(leaders);` to:
```ts
  const tally = tallyByTeam(leaders, matchPoints);
```

- [ ] **Step 2: Resolve and pass from RoundSubMatchLeaderboard**

In `src/components/leaderboard/RoundSubMatchLeaderboard.tsx`:
1. Add import:
```ts
import { resolveSplitMatchDisplayPoints } from '@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard';
```
2. Compute after `round` is available:
```ts
  const matchPoints = resolveSplitMatchDisplayPoints({
    round_format: round?.round_format ?? null,
    rules_override: round?.rules_override ?? null,
  });
```
3. Pass it to `<SubMatchLeaderboardTab ... matchPoints={matchPoints} />`.

- [ ] **Step 3: Update any other callers**

Run: `grep -rn "<SubMatchLeaderboardTab" src`
For each caller other than `RoundSubMatchLeaderboard` (e.g. the ReviewScorecardScreen live view), if it has the round's `round_format` + `rules_override` in scope, compute `resolveSplitMatchDisplayPoints({...})` and pass `matchPoints`. If a caller lacks the round shape, leave it — the default keeps current behaviour. Note in the commit which callers were updated.

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/leaderboard/SubMatchLeaderboardTab.tsx src/components/leaderboard/RoundSubMatchLeaderboard.tsx
# add any other updated callers
git commit -m "feat(submatch): show configured per-match points in the tally header

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Persist singles match-play team points (Item 4, finalize)

**Files:**
- Modify: `src/services/rounds/finalizePairResults.ts` (`isPairPointsOverride` ~111-117; `pairPoints` resolution ~252)
- Create: `src/services/rounds/finalizePairResults.splitTeamPoints.test.ts`

**Interfaces:**
- Consumes: `RoundRulesOverride` (`pair_points`, `team_points`).
- Produces:
  - `isPairPointsOverride(roundFormat, override)` — returns true for a split round with `pair_points` **or** `team_points` (legacy singles match play stored per-match points under `team_points`).
  - `finalizePairResults` resolves per-match points as `pair_points ?? team_points` (only ever called for split rounds via the dispatcher gate).

- [ ] **Step 1: Write the failing test**

Create `src/services/rounds/finalizePairResults.splitTeamPoints.test.ts`:

```ts
import { isPairPointsOverride } from './finalizePairResults';

describe('isPairPointsOverride — split team_points fallback', () => {
  it('is true for a split round with pair_points', () => {
    expect(
      isPairPointsOverride('split', { pair_points: { win: 1, tie: 0.5, loss: 0 } })
    ).toBe(true);
  });

  it('is true for a split round with only team_points (legacy singles match play)', () => {
    expect(
      isPairPointsOverride('split', { team_points: { win: 2, tie: 1, loss: 0 } })
    ).toBe(true);
  });

  it('is false for a non-split round even with team_points', () => {
    expect(
      isPairPointsOverride('combined', { team_points: { win: 2, tie: 1, loss: 0 } })
    ).toBe(false);
  });

  it('is false for a split round with no points override', () => {
    expect(isPairPointsOverride('split', null)).toBe(false);
    expect(isPairPointsOverride('split', {})).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest finalizePairResults.splitTeamPoints`
Expected: FAIL — the `team_points` case returns false.

- [ ] **Step 3: Implement**

In `src/services/rounds/finalizePairResults.ts`:
1. Update `isPairPointsOverride` (lines ~111-117):
```ts
export function isPairPointsOverride(
  roundFormat: string | null | undefined,
  override: RoundRulesOverride | null | undefined
): boolean {
  if (roundFormat !== 'split') return false;
  // Split rounds are scored per-match. New rounds store per-match points under
  // pair_points; legacy singles match-play rounds stored them under team_points
  // (the points editor wrote there when no pair_points seed existed).
  return !!(override?.pair_points ?? override?.team_points);
}
```
2. Update the points resolution inside `finalizePairResults` (line ~252) from `const pairPoints = rulesOverride?.pair_points;` to:
```ts
  // Split rounds only reach here via the dispatcher's isPairPointsOverride gate,
  // so team_points here means legacy per-match points.
  const pairPoints = rulesOverride?.pair_points ?? rulesOverride?.team_points;
```
(The following `if (!pairPoints) return 0;` line stays.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest finalizePairResults.splitTeamPoints`
Expected: PASS (4 assertions). Also run any existing pair-results tests to confirm no regression: `pnpm jest finalizePairResults`.

- [ ] **Step 5: Verify dispatcher wiring (no code change expected)**

Read `src/services/rounds/refinalizeRoundResults.ts` and confirm: for a split match-play round with `team_points`, `splitWithPairPoints` is now true, the round still passes through `finalizeRound` (individual match-play rows), and the trailing `if (isPairPointsOverride(round.round_format, effectiveOverride))` block (lines ~394-418) now fires `finalizePairResults`, writing `is_team_result` team rows. No edit needed — note this in the commit body.

- [ ] **Step 6: Commit**

```bash
git add src/services/rounds/finalizePairResults.ts src/services/rounds/finalizePairResults.splitTeamPoints.test.ts
git commit -m "fix(finalize): persist team points for singles match-play rounds

A split singles match-play round stored per-match points under team_points
(no pair_points seed), so isPairPointsOverride was false and no team rows
were written -> the round contributed 0 to the overall team standings.
Treat a split round's team_points as per-match pair points. The existing
dispatcher tail now routes it through finalizePairResults.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Points editor writes pair_points for split rounds (Item 4, config)

**Files:**
- Modify: `src/components/competitions/detail/sections/sheets/EditRoundPointsSheet.tsx:64`

**Interfaces:**
- Consumes: `round.round_format`, `round.rules_override`.
- Produces: for a `round_format === 'split'` round the editor edits/writes `pair_points`; otherwise `team_points` (unchanged for combined rounds).

- [ ] **Step 1: Change the points key selection**

In `src/components/competitions/detail/sections/sheets/EditRoundPointsSheet.tsx`, replace line 64:
```ts
  const pointsKey: PointsKey = override.pair_points ? 'pair_points' : 'team_points';
```
with:
```ts
  // Split rounds are scored per match -> pair_points. Combined rounds award the
  // whole-round result -> team_points. Previously this keyed off whichever block
  // already existed, so a split singles round with no pair_points seed wrote
  // team_points, which no finalizer consumed.
  const pointsKey: PointsKey =
    round.round_format === 'split'
      ? 'pair_points'
      : override.pair_points
        ? 'pair_points'
        : 'team_points';
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no NEW errors. (`showBonus`, `winLabel`, defaults already branch on `pointsKey` and `round_format` correctly — a split round now shows "Win (per match)" and the bonus controls, matching pair semantics.)

- [ ] **Step 3: Manual verification note**

Open the points editor on a split singles match-play round → the Win field is labelled **"Win (per match)"** and Save writes `rules_override.pair_points`. On save, the round re-finalizes (via the existing `applyPresetToRound`/`useUpdateRoundRules` path) and team rows appear in the overall standings.

- [ ] **Step 4: Commit**

```bash
git add src/components/competitions/detail/sections/sheets/EditRoundPointsSheet.tsx
git commit -m "fix(points-editor): write pair_points for split rounds

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Per-round points / dinner-bet badge on the round header (Item 3)

**Files:**
- Modify: `src/components/leaderboard/LeaderboardHeader.tsx` (add optional `pointsBadge` prop + render)
- Modify: `src/components/leaderboard/LeaderboardTab.tsx` (compute `summarizeRoundPoints` per round; pass badge text to the header at ~503)
- Modify: `src/components/leaderboard/RoundLeaderboard.styles.ts` (badge style, if a new style is needed)

**Interfaces:**
- Consumes: `summarizeRoundPoints(round, { membersPerTeam })` from `src/utils/competitionPoints/roundPointsSummary.ts` → `{ detail, voided, ... }`.
- Produces: `LeaderboardHeader` accepts optional `pointsBadge?: string`; when set, renders it right-aligned/highlighted in the header top row.

- [ ] **Step 1: Add the badge prop to LeaderboardHeader**

In `src/components/leaderboard/LeaderboardHeader.tsx`:
1. Add to `LeaderboardHeaderProps`:
```ts
  /** Optional right-aligned points/status badge (e.g. "Dinner bet · 0 pts"). */
  pointsBadge?: string;
```
2. Destructure `pointsBadge` in the component params.
3. Render it in the `headerTop` row, right-aligned after the badge row. Replace the `headerTop` block:
```tsx
      <View style={styles.headerTop}>
        <ScaledText category="title" style={[styles.roundTitle, { color: colors.textPrimary }]}>
          {title}
        </ScaledText>
        <View style={styles.badgeRow}>
          <Pill
            label={formatLabel}
            variant={getGameTypeVariant(gameType)}
            size="sm"
          />
          {isTeamRound && (
            <View style={[styles.teamBadge, { backgroundColor: colors.gray200 }]}>
              <IconUsers size={12} color={colors.textSecondary} />
              <ScaledText category="caption" style={[styles.teamBadgeText, { color: colors.textSecondary }]}>
                Teams
              </ScaledText>
            </View>
          )}
          {pointsBadge && (
            <View style={[styles.pointsBadge, { backgroundColor: colors.primaryLighter }]}>
              <ScaledText category="caption" style={[styles.pointsBadgeText, { color: colors.primary }]}>
                {pointsBadge}
              </ScaledText>
            </View>
          )}
        </View>
      </View>
```

- [ ] **Step 2: Add the badge styles**

In `src/components/leaderboard/RoundLeaderboard.styles.ts`, add to the `StyleSheet.create({...})` object (match existing token usage — `spacing`, `borderRadius`, `typography` are already imported there; confirm and mirror `teamBadge`/`teamBadgeText`):
```ts
  pointsBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  pointsBadgeText: {
    ...typography.captionBold,
  },
```

- [ ] **Step 3: Compute and pass the badge from LeaderboardTab**

In `src/components/leaderboard/LeaderboardTab.tsx`:
1. Add import:
```ts
import { summarizeRoundPoints } from '@/utils/competitionPoints/roundPointsSummary';
```
2. Reuse the `membersPerTeam` derivation already used for `teamPointsToWin` (~line 395-397). Extract it into a memo available to the round render:
```ts
  const membersPerTeam = useMemo(() => {
    const counts = (teams ?? []).map((t) => t.members.length).filter((n) => n > 0);
    return counts.length > 0 ? Math.max(...counts) : 0;
  }, [teams]);
```
(and reference `membersPerTeam` inside the existing `teamPointsToWin` memo instead of recomputing.)
3. In the "Round Results" map, compute the badge per round and pass to `LeaderboardHeader`. Only meaningful for team competitions with per-round rules; guard so individual comps show nothing:
```tsx
                  <LeaderboardHeader
                    roundNumber={positionalRoundNumbers.get(round.id) ?? round.round_number}
                    gameType={gameType}
                    isTeamRound={round.is_team_round}
                    roundFormat={round.round_format}
                    teamFormat={round.team_format}
                    subMatchSize={round.sub_match_size}
                    rulesOverride={round.rules_override}
                    date={round.date ?? undefined}
                    courseName={round.course?.name ?? undefined}
                    roundName={round.name}
                    pointsBadge={
                      hasTeams && perRoundRulesEnabled && membersPerTeam > 0
                        ? summarizeRoundPoints(round, { membersPerTeam }).detail
                        : undefined
                    }
                  />
```
Note: `summarizeRoundPoints` returns `detail` = `"Dinner bet · 0 points"` / `"Void · 0 points"` / `"N pts to winning team"` / `"N pt per match (×M)"` / `"Uses competition default points"`. Only pass the badge for the split/team paths — if `round.rules_override` has neither `pair_points` nor `team_points`, `detail` is the generic default; suppress it:
```tsx
                    pointsBadge={
                      hasTeams &&
                      perRoundRulesEnabled &&
                      membersPerTeam > 0 &&
                      (round.rules_override?.pair_points || round.rules_override?.team_points)
                        ? summarizeRoundPoints(round, { membersPerTeam }).detail
                        : undefined
                    }
```

Apply the same `pointsBadge` prop to the `LeaderboardHeader` used in the split/alt-shot/match-play branch (~line 503) so the dinner-bet/points badge also appears on those round headers.

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 5: Manual verification note**

On a team competition: the dinner-bet stableford round header shows **"Dinner bet · 0 points"**; a 2-pt singles round shows **"2 pt per match (×N)"**; individual competitions show no badge.

- [ ] **Step 6: Commit**

```bash
git add src/components/leaderboard/LeaderboardHeader.tsx src/components/leaderboard/LeaderboardTab.tsx src/components/leaderboard/RoundLeaderboard.styles.ts
git commit -m "feat(leaderboard): show per-round points / dinner-bet badge on round headers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Backfill "Murray Winter Classic 2026" round 4 (Item 4, prod data)

**This task changes PRODUCTION data. It is an operational step, run once, AFTER Tasks 4–7 are merged/shipped so the code path writes team rows correctly. Get explicit user go-ahead before running it.**

Competition: `56f37146-4b91-4813-8ebf-3a8105eed1c6` ("Murray Winter Classic 2026"), the 1v1 singles match-play round (4th by display_order).

**Files:** none (data operation).

- [ ] **Step 1: Confirm the round's stored config**

With user authorization for a read-only prod query, inspect the round's `rules_override`, `round_format`, `team1_id`, `team2_id` and its `sub_matches` results. Confirm `round_format === 'split'` and that per-match points live under `pair_points` or `team_points` (expected `win: 2`). Record the round id.

- [ ] **Step 2: Normalise the config if needed**

If the round stored per-match points under `team_points` (legacy) and you want the data clean going forward, set `rules_override.pair_points = <that value>` (keep `team_points` or drop it — the fallback handles either). This can also be done in-app via the fixed points editor (Task 7): open the round's points editor and Save (it now writes `pair_points`), which triggers re-finalize automatically.

- [ ] **Step 3: Re-finalize the round**

Trigger `refinalizeRoundResults(roundId)` for the round (via the in-app "Recalculate results" / points-save path, or a one-off script that calls it). This writes the `is_team_result` team rows with `competition_points` = each team's summed per-match points (4 and 4).

- [ ] **Step 4: Verify**

- Overall **Team Standings** for the competition now include the round-4 points (each team +4), and the round's sub-match header reads **4–4**.
- The **winner** (Compete card + WinnerRow) reflects the corrected team totals.
- The round header shows the **points badge** (Task 8).

- [ ] **Step 5: Record outcome**

Note in the PR/commit description that the prod round was backfilled and the standings verified. No code commit for this task.

---

## Self-Review

**Spec coverage:**
- Item 1 (winning team on list) → Task 2. ✓
- Item 2 (default team sub-tab) → Task 3. ✓
- Item 3 (dinner-bet badge) → Task 8. ✓
- Item 4 (singles match-play points 2–2 → 4–4 + overall + backfill) → Tasks 4 (tally scaling), 5 (display wiring), 6 (finalize persistence), 7 (points editor), 9 (backfill). ✓
- Item 5 (round numbering) → Task 1. ✓

**Type consistency:** `WinTieLossPoints`, `RoundRulesOverride`, `TeamMode` used from their defining modules. `buildPositionalRoundNumbers`, `resolveSplitMatchDisplayPoints`, `tallyByTeam(leaders, points)`, `isPairPointsOverride`, `fetchCompetitionWinner(id, teamMode)`, `pointsBadge` prop names are consistent across the tasks that consume them.

**Placeholder scan:** No TBD/TODO; each code step shows the code. UI-only steps (default tab, badge, backfill) that resist unit tests carry explicit manual-verification steps.

**Note on manual verification:** Tasks 3, 5, 7, 8, 9 include device/data verification because they are UI wiring or prod-data operations. Pure logic (Tasks 1, 2, 4, 6) is covered by jest unit tests.
