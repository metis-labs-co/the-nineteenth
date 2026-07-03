# Team (Four-Ball) Match Play Relative-to-Lowest Allocation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make four-ball best-ball match play allocate handicap strokes relative to the lowest handicap in the match (lowest plays off scratch; others get their difference by stroke index) via one shared helper, so the live scoring screen, scorecard table, sub-match leaderboard, and finalised result all agree.

**Architecture:** Add a pure helper `getFourBallStrokes(players, strokeIndex)` to `src/utils/scoring.ts` (built on the existing `getStrokesReceived`). Refactor the three team match-play read paths to use it: the live hook `useTeamMatchPlayScores.ts`, the pure `calculateTeamMatchData` in `TeamMatchPlayScorecardTable/utils.ts` (which the sub-match leaderboard's `computeMatchPlaySubMatch` already delegates to, so the leaderboard is fixed transitively), and the finalisation path `finalizeTeamMatchPlayRound.ts`. Best-net-ball comparison and all winner/match-status/pickup logic are unchanged.

**Tech Stack:** TypeScript, React Native, Jest, `@testing-library/react-native`.

## Global Constraints

- Package manager is **pnpm**. Run tests with `pnpm test`. Type-check with `pnpm type-check`.
- Allocation is **relative to the lowest playing handicap among ALL players in the match (both teams)**: lowest → 0 strokes; each other player → `getStrokesReceived(handicap − lowest, strokeIndex)`.
- **Allowance is unchanged at 100%.** Do not change how playing handicaps are computed or the `gameType: 'match-play'` allowance.
- Use the regular per-hole `strokeIndex`. There is no match-play-specific index.
- Best-net-ball hole-winner logic, concession/pickup handling, and match-status computation are **unchanged** — only per-player stroke allocation changes.
- Scope is **four-ball best-ball match play only**. Do NOT touch alt-shot/foursomes, aggregate, or stableford best-ball paths (`teamScoring/altShot.ts`; the `altShotSideNet`/`aggregateSideNet`/`bestBallSidePoints` branches of `subMatchLeaderboard.ts`).
- Baseline note: the Jest suite has ~243 pre-existing failures on `main`. Evaluate results as a **diff against baseline**; new/changed test files below must pass on their own.

---

### Task 1: Add the shared `getFourBallStrokes` helper (TDD)

**Files:**
- Modify: `src/utils/scoring.ts` (add function after `getMatchPlayStrokes`, which ends line 53)
- Test: `src/utils/scoring.test.ts` (add a new `describe` block; the file already imports from `./scoring`)

**Interfaces:**
- Consumes: existing `getStrokesReceived(handicap, strokeIndex): number` and `getMatchPlayStrokes(a, b, strokeIndex): { a, b }` from the same file.
- Produces: `getFourBallStrokes(players: { playerId: string; handicap: number }[], strokeIndex: number): Map<string, number>` — strokes each player receives on the hole; the lowest handicap in the list → 0, others → `getStrokesReceived(handicap − lowest, strokeIndex)`. Consumed by Tasks 2, 3, 4.

- [ ] **Step 1: Write the failing tests**

Change the import line at the top of `src/utils/scoring.test.ts` from:

```typescript
import { getEffectiveGrossStrokes, getMatchPlayStrokes } from './scoring';
```

to:

```typescript
import { getEffectiveGrossStrokes, getMatchPlayStrokes, getFourBallStrokes } from './scoring';
```

Append this `describe` block to `src/utils/scoring.test.ts`:

```typescript
describe('getFourBallStrokes', () => {
  it('gives the lowest-handicap player no strokes and others their difference by stroke index', () => {
    const players = [
      { playerId: 'a', handicap: 6 },
      { playerId: 'b', handicap: 12 },
      { playerId: 'c', handicap: 20 },
    ];
    // lowest = 6 -> a:0. b diff 6 -> stroke on SI 1..6. c diff 14 -> stroke on SI 1..14.
    const si5 = getFourBallStrokes(players, 5);
    expect(si5.get('a')).toBe(0);
    expect(si5.get('b')).toBe(1); // 5 <= 6
    expect(si5.get('c')).toBe(1); // 5 <= 14

    const si10 = getFourBallStrokes(players, 10);
    expect(si10.get('a')).toBe(0);
    expect(si10.get('b')).toBe(0); // 10 > 6
    expect(si10.get('c')).toBe(1); // 10 <= 14
  });

  it('gives all tied-lowest players zero strokes', () => {
    const players = [
      { playerId: 'a', handicap: 8 },
      { playerId: 'b', handicap: 8 },
      { playerId: 'c', handicap: 15 },
    ];
    const m = getFourBallStrokes(players, 1);
    expect(m.get('a')).toBe(0);
    expect(m.get('b')).toBe(0);
    expect(m.get('c')).toBe(1); // diff 7, SI 1 <= 7
  });

  it('gives a second stroke on the lowest-SI holes when a difference exceeds 18', () => {
    const players = [
      { playerId: 'a', handicap: 4 },
      { playerId: 'b', handicap: 26 },
    ];
    // diff 22 -> 1 stroke every hole, 2nd on SI 1 and 2.
    expect(getFourBallStrokes(players, 2).get('b')).toBe(2);
    expect(getFourBallStrokes(players, 3).get('b')).toBe(1);
    expect(getFourBallStrokes(players, 2).get('a')).toBe(0);
  });

  it('reduces to the singles difference method for a two-player match', () => {
    for (const si of [1, 3, 7, 12, 18]) {
      const m = getFourBallStrokes(
        [
          { playerId: 'a', handicap: 20 },
          { playerId: 'b', handicap: 15 },
        ],
        si
      );
      const singles = getMatchPlayStrokes(20, 15, si);
      expect(m.get('a')).toBe(singles.a);
      expect(m.get('b')).toBe(singles.b);
    }
  });

  it('returns an empty map for an empty players list', () => {
    expect(getFourBallStrokes([], 1).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/utils/scoring.test.ts`
Expected: FAIL — `getFourBallStrokes is not a function` (or a TypeScript "no exported member" error).

- [ ] **Step 3: Implement the helper**

In `src/utils/scoring.ts`, immediately after `getMatchPlayStrokes` (after line 53), add:

```typescript
/**
 * Four-ball match-play per-hole stroke allocation (relative-to-lowest method).
 *
 * Among all players in the match (both teams), the lowest playing handicap
 * plays off scratch; every other player receives the difference from that
 * lowest handicap, allocated by stroke index via {@link getStrokesReceived}.
 * Tied-lowest players all receive 0. Uses the regular per-hole stroke index.
 *
 * @returns strokes received on the hole, keyed by playerId.
 */
export function getFourBallStrokes(
  players: { playerId: string; handicap: number }[],
  strokeIndex: number
): Map<string, number> {
  const result = new Map<string, number>();
  if (players.length === 0) return result;
  const lowest = Math.min(...players.map((p) => p.handicap));
  for (const p of players) {
    result.set(p.playerId, getStrokesReceived(p.handicap - lowest, strokeIndex));
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/utils/scoring.test.ts`
Expected: PASS (all `getFourBallStrokes` tests green; pre-existing `getEffectiveGrossStrokes` / `getMatchPlayStrokes` tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/scoring.ts src/utils/scoring.test.ts
git commit -m "feat(scoring): add getFourBallStrokes relative-to-lowest helper"
```

---

### Task 2: Switch the live team scoring hook to the shared helper

**Files:**
- Modify: `src/screens/scoring/TeamMatchPlayScoringScreen/hooks/useTeamMatchPlayScores.ts`

**Interfaces:**
- Consumes: `getFourBallStrokes` (Task 1).
- Produces: no new exports; the hook's hole winners and per-player stroke dots now reflect relative-to-lowest.

This hook reads scores from the Zustand store, so it is verified structurally (type-check + no remaining `getStrokesReceived` in the file); the behavioural regression lives on the pure `calculateTeamMatchData` (Task 3) and the leaderboard test (Task 5). The two module-level functions `findBestNetContributor` and `resolveTeamHoleWinner` gain an `allPlayers` parameter (the match's players with handicaps, both teams); `findBestNetContributor` builds the per-hole strokes map internally. `isTeamConceded`, `determineTeamHoleWinner`, and all pickup logic are unchanged.

- [ ] **Step 1: Update the import**

Change line 16 from:

```typescript
import { getStrokesReceived } from '@/utils/scoring';
```

to:

```typescript
import { getFourBallStrokes } from '@/utils/scoring';
```

- [ ] **Step 2: Rewrite `findBestNetContributor` to allocate relative to lowest**

Replace the whole function (lines 31–49):

```typescript
function findBestNetContributor(
  team: MatchTeam,
  hole: Hole | undefined,
  getGross: (playerId: string) => number | null
): { playerId: string; gross: number; net: number } | null {
  let best: { playerId: string; gross: number; net: number } | null = null;
  if (!hole) return null;
  for (const member of team.members) {
    const gross = getGross(member.id);
    if (gross === null) continue;
    if (gross === PICKUP_SCORE) continue;
    const strokes = getStrokesReceived(member.handicap, hole.strokeIndex);
    const net = gross - strokes;
    if (best === null || net < best.net || (net === best.net && gross < best.gross)) {
      best = { playerId: member.id, gross, net };
    }
  }
  return best;
}
```

with:

```typescript
function findBestNetContributor(
  team: MatchTeam,
  hole: Hole | undefined,
  getGross: (playerId: string) => number | null,
  allPlayers: { playerId: string; handicap: number }[]
): { playerId: string; gross: number; net: number } | null {
  let best: { playerId: string; gross: number; net: number } | null = null;
  if (!hole) return null;
  // Relative-to-lowest: strokes are the player's difference from the lowest
  // handicap in the match (both teams), allocated by stroke index.
  const strokesForHole = getFourBallStrokes(allPlayers, hole.strokeIndex);
  for (const member of team.members) {
    const gross = getGross(member.id);
    if (gross === null) continue;
    if (gross === PICKUP_SCORE) continue;
    const strokes = strokesForHole.get(member.id) ?? 0;
    const net = gross - strokes;
    if (best === null || net < best.net || (net === best.net && gross < best.gross)) {
      best = { playerId: member.id, gross, net };
    }
  }
  return best;
}
```

- [ ] **Step 3: Thread `allPlayers` through `resolveTeamHoleWinner`**

Replace the function signature and its two `findBestNetContributor` calls (lines 76–92):

```typescript
function resolveTeamHoleWinner(
  team1: MatchTeam,
  team2: MatchTeam,
  hole: Hole | undefined,
  getGross: (playerId: string) => number | null
): 'team1' | 'team2' | 'halved' | null {
  if (!hole) return null;
  const t1Best = findBestNetContributor(team1, hole, getGross);
  const t2Best = findBestNetContributor(team2, hole, getGross);
  const t1Conceded = isTeamConceded(team1, getGross);
  const t2Conceded = isTeamConceded(team2, getGross);

  if (t1Conceded && t2Conceded) return 'halved';
  if (t1Conceded) return t2Best ? 'team2' : null;
  if (t2Conceded) return t1Best ? 'team1' : null;
  return determineTeamHoleWinner(t1Best?.net ?? null, t2Best?.net ?? null);
}
```

with:

```typescript
function resolveTeamHoleWinner(
  team1: MatchTeam,
  team2: MatchTeam,
  hole: Hole | undefined,
  getGross: (playerId: string) => number | null,
  allPlayers: { playerId: string; handicap: number }[]
): 'team1' | 'team2' | 'halved' | null {
  if (!hole) return null;
  const t1Best = findBestNetContributor(team1, hole, getGross, allPlayers);
  const t2Best = findBestNetContributor(team2, hole, getGross, allPlayers);
  const t1Conceded = isTeamConceded(team1, getGross);
  const t2Conceded = isTeamConceded(team2, getGross);

  if (t1Conceded && t2Conceded) return 'halved';
  if (t1Conceded) return t2Best ? 'team2' : null;
  if (t2Conceded) return t1Best ? 'team1' : null;
  return determineTeamHoleWinner(t1Best?.net ?? null, t2Best?.net ?? null);
}
```

- [ ] **Step 4: Add the `allPlayers` memo in the hook**

Immediately after the `const { setPlayerScore, getPlayerScore, groupScorecards } = useScorecardStore();` line (line 106), add:

```typescript
  // All players in this match (both teams) with their playing handicaps.
  // Used to allocate strokes relative to the lowest handicap in the match.
  const allPlayers = useMemo(
    () => [...team1.members, ...team2.members].map((m) => ({ playerId: m.id, handicap: m.handicap })),
    [team1, team2]
  );
```

- [ ] **Step 5: Pass `allPlayers` at every `findBestNetContributor` / `resolveTeamHoleWinner` call site**

Make these six edits (add `allPlayers` as the final argument and to the dependency array):

1. `team1BestContribCurrent` memo (lines 130–133):
```typescript
  const team1BestContribCurrent = useMemo(
    () => findBestNetContributor(team1, currentHoleData, getPlayerScoreValue, allPlayers),
    [team1, currentHoleData, getPlayerScoreValue, allPlayers]
  );
```
2. `team2BestContribCurrent` memo (lines 134–137):
```typescript
  const team2BestContribCurrent = useMemo(
    () => findBestNetContributor(team2, currentHoleData, getPlayerScoreValue, allPlayers),
    [team2, currentHoleData, getPlayerScoreValue, allPlayers]
  );
```
3. `currentHoleWinner` memo (lines 145–148):
```typescript
  const currentHoleWinner = useMemo(
    () => resolveTeamHoleWinner(team1, team2, currentHoleData, getPlayerScoreValue, allPlayers),
    [team1, team2, currentHoleData, getPlayerScoreValue, allPlayers]
  );
```
4. `getTeamBestScoreForHole` callback (lines 164–171) — update the call and deps:
```typescript
  const getTeamBestScoreForHole = useCallback(
    (team: MatchTeam, holeNumber: number): number | null => {
      const hole = getHoleByNumber(holeNumber);
      const best = findBestNetContributor(team, hole, (id) => getPlayerScoreForHole(id, holeNumber), allPlayers);
      return best?.gross ?? null;
    },
    [getHoleByNumber, getPlayerScoreForHole, allPlayers]
  );
```
5. `getBestContributorForHole` callback (lines 174–181):
```typescript
  const getBestContributorForHole = useCallback(
    (team: MatchTeam, holeNumber: number): string | null => {
      const hole = getHoleByNumber(holeNumber);
      const best = findBestNetContributor(team, hole, (id) => getPlayerScoreForHole(id, holeNumber), allPlayers);
      return best?.playerId ?? null;
    },
    [getHoleByNumber, getPlayerScoreForHole, allPlayers]
  );
```
6. `getHoleWinnerForHole` callback (lines 184–192):
```typescript
  const getHoleWinnerForHole = useCallback(
    (holeNumber: number): 'team1' | 'team2' | 'halved' | null => {
      const hole = getHoleByNumber(holeNumber);
      return resolveTeamHoleWinner(team1, team2, hole, (id) =>
        getPlayerScoreForHole(id, holeNumber), allPlayers
      );
    },
    [getHoleByNumber, getPlayerScoreForHole, team1, team2, allPlayers]
  );
```

- [ ] **Step 6: Rewrite `getPlayerStrokesReceivedForHole` to use the helper**

Replace the callback (lines 207–215):

```typescript
  const getPlayerStrokesReceivedForHole = useCallback(
    (playerId: string, holeNumber: number): number => {
      const hole = getHoleByNumber(holeNumber);
      const member = findMember(playerId);
      if (!hole || !member) return 0;
      return getStrokesReceived(member.handicap, hole.strokeIndex);
    },
    [getHoleByNumber, findMember]
  );
```

with:

```typescript
  const getPlayerStrokesReceivedForHole = useCallback(
    (playerId: string, holeNumber: number): number => {
      const hole = getHoleByNumber(holeNumber);
      if (!hole) return 0;
      return getFourBallStrokes(allPlayers, hole.strokeIndex).get(playerId) ?? 0;
    },
    [getHoleByNumber, allPlayers]
  );
```

(`findMember` remains used by `pickUpPlayer`, so leave it defined.)

- [ ] **Step 7: Verify no `getStrokesReceived` remains and type-check**

Run: `grep -n "getStrokesReceived" src/screens/scoring/TeamMatchPlayScoringScreen/hooks/useTeamMatchPlayScores.ts`
Expected: no output.

Run: `pnpm type-check`
Expected: no new errors referencing this file (in particular, no "expected 3 arguments" errors at the call sites and no unused-variable errors).

- [ ] **Step 8: Commit**

```bash
git add src/screens/scoring/TeamMatchPlayScoringScreen/hooks/useTeamMatchPlayScores.ts
git commit -m "fix(team-match-play): allocate live strokes relative to lowest handicap"
```

---

### Task 3: Switch the team scorecard table (and leaderboard) to the shared helper (TDD)

**Files:**
- Modify: `src/components/scorecard/TeamMatchPlayScorecardTable/utils.ts`
- Test: `src/components/scorecard/TeamMatchPlayScorecardTable/utils.test.ts` (create)

**Interfaces:**
- Consumes: `getFourBallStrokes` (Task 1); existing exported `calculateTeamMatchData(holes, team1, team2, getPlayerScore): TeamCalculatedData`.
- Produces: no new exports; `calculateTeamMatchData` hole winners now reflect relative-to-lowest. `computeMatchPlaySubMatch` in `subMatchLeaderboard.ts` delegates to this function, so the sub-match leaderboard is fixed transitively (verified in Task 5).

- [ ] **Step 1: Write the failing test**

Create `src/components/scorecard/TeamMatchPlayScorecardTable/utils.test.ts`:

```typescript
import { calculateTeamMatchData } from './utils';
import type { Hole } from '@/types/database.types';
import type { MatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';

// Divergence hole. Match handicaps: P1=5, P2=20 (team1); P3=10, P4=12 (team2).
// Lowest in match = 5 (P1). At stroke index 3, grosses P1=5, P2=6, P3=5, P4=6:
//   Old (each off own full handicap): every player gets 1 stroke at SI 3, so
//     team1 best net = 4 (P1 5-1), team2 best net = 4 (P3 5-1) -> HALVED.
//   New (relative to lowest 5): P1 diff 0 -> 0 strokes (net 5); P2 diff 15 -> 1
//     (net 5); P3 diff 5 -> 1 (net 4); P4 diff 7 -> 1 (net 5). team1 best = 5,
//     team2 best = 4 -> TEAM 2 wins the hole (winner 'player2').
const hole: Hole = { number: 1, par: 4, strokeIndex: 3 };
const holes: Hole[] = [hole];

const team1: MatchTeam = {
  id: 't1',
  name: 'Team 1',
  handicap: 0,
  members: [
    { id: 'p1', name: 'P1', handicap: 5, score: null, pickedUp: false },
    { id: 'p2', name: 'P2', handicap: 20, score: null, pickedUp: false },
  ],
};
const team2: MatchTeam = {
  id: 't2',
  name: 'Team 2',
  handicap: 0,
  members: [
    { id: 'p3', name: 'P3', handicap: 10, score: null, pickedUp: false },
    { id: 'p4', name: 'P4', handicap: 12, score: null, pickedUp: false },
  ],
};

const grosses: Record<string, number> = { p1: 5, p2: 6, p3: 5, p4: 6 };
const getPlayerScore = (playerId: string, _holeNumber: number): number | undefined =>
  grosses[playerId];

describe('calculateTeamMatchData — relative-to-lowest allocation', () => {
  it('gives the divergence hole to team 2 (would be halved under full handicaps)', () => {
    const data = calculateTeamMatchData(holes, team1, team2, getPlayerScore);
    expect(data.holeResults[1].winner).toBe('player2');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/components/scorecard/TeamMatchPlayScorecardTable/utils.test.ts`
Expected: FAIL — winner is `'halved'` (old full-handicap method) instead of `'player2'`.

- [ ] **Step 3: Update the import**

In `src/components/scorecard/TeamMatchPlayScorecardTable/utils.ts`, change line 14 from:

```typescript
import { getStrokesReceived } from '@/utils/scoring';
```

to:

```typescript
import { getFourBallStrokes } from '@/utils/scoring';
```

- [ ] **Step 4: Rewrite `findBestContributor` to take a per-hole strokes map**

Replace the function (lines 35–56):

```typescript
function findBestContributor(
  team: MatchTeam,
  hole: Hole,
  getGross: (playerId: string) => number | undefined
): TeamHoleContribution | null {
  let best: TeamHoleContribution | null = null;
  for (const member of team.members) {
    const gross = getGross(member.id);
    if (gross == null) continue;
    if (gross === PICKUP_SCORE) continue;
    const strokes = getStrokesReceived(member.handicap, hole.strokeIndex);
    const net = gross - strokes;
    if (
      best === null ||
      net < best.net ||
      (net === best.net && gross < best.gross)
    ) {
      best = { gross, net, playerId: member.id };
    }
  }
  return best;
}
```

with:

```typescript
function findBestContributor(
  team: MatchTeam,
  getGross: (playerId: string) => number | undefined,
  strokesForHole: Map<string, number>
): TeamHoleContribution | null {
  let best: TeamHoleContribution | null = null;
  for (const member of team.members) {
    const gross = getGross(member.id);
    if (gross == null) continue;
    if (gross === PICKUP_SCORE) continue;
    const strokes = strokesForHole.get(member.id) ?? 0;
    const net = gross - strokes;
    if (
      best === null ||
      net < best.net ||
      (net === best.net && gross < best.gross)
    ) {
      best = { gross, net, playerId: member.id };
    }
  }
  return best;
}
```

- [ ] **Step 5: Build the strokes map per hole in `calculateTeamMatchData` and pass it in**

In `calculateTeamMatchData`, first compute the match players once at the top of the function body. Immediately after the opening line `const holeResults: Record<number, HoleResult> = {};` (line 85), add:

```typescript
  // All players in the match (both teams), for relative-to-lowest allocation.
  const allPlayers = [...team1.members, ...team2.members].map((m) => ({
    playerId: m.id,
    handicap: m.handicap,
  }));
```

Then inside the hole loop, replace the two `findBestContributor` calls (lines 104–105):

```typescript
    const t1Best = findBestContributor(team1, hole, getGrossForHole);
    const t2Best = findBestContributor(team2, hole, getGrossForHole);
```

with:

```typescript
    const strokesForHole = getFourBallStrokes(allPlayers, hole.strokeIndex);
    const t1Best = findBestContributor(team1, getGrossForHole, strokesForHole);
    const t2Best = findBestContributor(team2, getGrossForHole, strokesForHole);
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test -- src/components/scorecard/TeamMatchPlayScorecardTable/utils.test.ts`
Expected: PASS (winner `'player2'`).

- [ ] **Step 7: Verify no `getStrokesReceived` remains and type-check**

Run: `grep -n "getStrokesReceived" src/components/scorecard/TeamMatchPlayScorecardTable/utils.ts`
Expected: no output.

Run: `pnpm type-check`
Expected: no new errors referencing this file.

- [ ] **Step 8: Commit**

```bash
git add src/components/scorecard/TeamMatchPlayScorecardTable/utils.ts src/components/scorecard/TeamMatchPlayScorecardTable/utils.test.ts
git commit -m "fix(team-match-play): scorecard table strokes relative to lowest handicap"
```

---

### Task 4: Switch the finalisation path to the shared helper

**Files:**
- Modify: `src/services/rounds/finalizeTeamMatchPlayRound.ts` (imports near line 25; hole loop lines 208–227)

**Interfaces:**
- Consumes: `getFourBallStrokes` (Task 1).
- Produces: no new exports; the persisted team match-play result now uses relative-to-lowest allocation, consistent with the live/scorecard/leaderboard paths.

The finalisation path builds per-team nets from each scorecard's stored `daily_handicap_used`. Each scorecard has a `.player_id`. Build the match players from both teams' scorecards and allocate via the shared helper.

- [ ] **Step 1: Update the import**

Change line 25 from:

```typescript
import { getStrokesReceived } from '@/utils/scoring';
```

to:

```typescript
import { getFourBallStrokes } from '@/utils/scoring';
```

- [ ] **Step 2: Compute the match players once before the hole loop**

Immediately before the hole loop's leading comment `// Iterate the round's actual holes` (line 206), add:

```typescript
  // All players in the match (both teams) with their stored daily handicaps,
  // for relative-to-lowest stroke allocation.
  const allMatchPlayers = [...team1Scorecards, ...team2Scorecards].map((sc) => ({
    playerId: sc.player_id,
    handicap: sc.daily_handicap_used ?? 0,
  }));
```

- [ ] **Step 3: Allocate strokes relative to lowest inside the loop**

Replace the two net-accumulation blocks (lines 211–227):

```typescript
    const team1Nets: number[] = [];
    const team2Nets: number[] = [];

    for (const sc of team1Scorecards) {
      const gross = getHoleGross(sc.scores, h);
      if (gross == null) continue;
      const dailyHc = sc.daily_handicap_used ?? 0;
      const strokesReceived = getStrokesReceived(dailyHc, hole.strokeIndex);
      team1Nets.push(gross - strokesReceived);
    }
    for (const sc of team2Scorecards) {
      const gross = getHoleGross(sc.scores, h);
      if (gross == null) continue;
      const dailyHc = sc.daily_handicap_used ?? 0;
      const strokesReceived = getStrokesReceived(dailyHc, hole.strokeIndex);
      team2Nets.push(gross - strokesReceived);
    }
```

with:

```typescript
    const team1Nets: number[] = [];
    const team2Nets: number[] = [];

    // Relative-to-lowest: strokes are each player's difference from the lowest
    // handicap in the match (both teams), allocated by stroke index.
    const strokesForHole = getFourBallStrokes(allMatchPlayers, hole.strokeIndex);

    for (const sc of team1Scorecards) {
      const gross = getHoleGross(sc.scores, h);
      if (gross == null) continue;
      team1Nets.push(gross - (strokesForHole.get(sc.player_id) ?? 0));
    }
    for (const sc of team2Scorecards) {
      const gross = getHoleGross(sc.scores, h);
      if (gross == null) continue;
      team2Nets.push(gross - (strokesForHole.get(sc.player_id) ?? 0));
    }
```

- [ ] **Step 4: Verify no `getStrokesReceived` remains and type-check**

Run: `grep -n "getStrokesReceived" src/services/rounds/finalizeTeamMatchPlayRound.ts`
Expected: no output.

Run: `pnpm type-check`
Expected: no new errors referencing this file.

- [ ] **Step 5: Commit**

```bash
git add src/services/rounds/finalizeTeamMatchPlayRound.ts
git commit -m "fix(team-match-play): finalised result strokes relative to lowest handicap"
```

---

### Task 5: Leaderboard delegation regression test

**Files:**
- Test: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.fourball.test.ts` (create)

**Interfaces:**
- Consumes: `computeMatchPlaySubMatch(sides, holes, getStrokes): MatchPlayRowData` from `./subMatchLeaderboard` (unchanged; it delegates to `calculateTeamMatchData`).

This locks in that the sub-match leaderboard's team match-play path stays wired to the (now fixed) `calculateTeamMatchData`, using the same divergence match as Task 3. Under the old full-handicap method the single hole was halved (`A/S`); under relative-to-lowest, side B wins it.

- [ ] **Step 1: Write the test**

Create `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.fourball.test.ts`:

```typescript
import { computeMatchPlaySubMatch } from './subMatchLeaderboard';
import type { Hole } from '@/types';

// Same divergence match as the scorecard-table test: side A = P1(5), P2(20);
// side B = P3(10), P4(12); one hole at stroke index 3; grosses P1=5,P2=6,P3=5,P4=6.
// Relative-to-lowest -> side B wins the only hole (1 UP, complete). Old method
// -> halved (A/S). Asserting side B proves the leaderboard inherits the fix.
const holes: Hole[] = [{ number: 1, par: 4, strokeIndex: 3 }];

const sides = {
  a: [
    { id: 'p1', name: 'P1', handicap: 5 },
    { id: 'p2', name: 'P2', handicap: 20 },
  ],
  b: [
    { id: 'p3', name: 'P3', handicap: 10 },
    { id: 'p4', name: 'P4', handicap: 12 },
  ],
};

const grosses: Record<string, number> = { p1: 5, p2: 6, p3: 5, p4: 6 };
const getStrokes = (playerId: string, _holeNumber: number): number | undefined =>
  grosses[playerId];

describe('computeMatchPlaySubMatch — four-ball relative-to-lowest (delegation)', () => {
  it('side B wins the divergence hole (would be A/S under full handicaps)', () => {
    const row = computeMatchPlaySubMatch(sides, holes, getStrokes);
    expect(row.leaderSide).toBe('b');
    expect(row.statusText).not.toBe('A/S');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test -- src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.fourball.test.ts`
Expected: PASS (`leaderSide` is `'b'`). If it fails with `'A/S'` / `null`, the leaderboard is not delegating to the fixed `calculateTeamMatchData` — stop and report.

- [ ] **Step 3: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.fourball.test.ts
git commit -m "test(team-match-play): leaderboard inherits relative-to-lowest allocation"
```

---

### Task 6: Full type-check and targeted test sweep

**Files:** none (verification only).

- [ ] **Step 1: Type-check the whole project**

Run: `pnpm type-check`
Expected: no new errors versus the `main` baseline.

- [ ] **Step 2: Run the touched/related test files together**

Run:
```bash
pnpm test -- src/utils/scoring.test.ts \
  src/components/scorecard/TeamMatchPlayScorecardTable/utils.test.ts \
  src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.fourball.test.ts \
  TeamMatchPlay subMatchLeaderboard finalizeTeamMatchPlayRound
```
Expected: PASS for the new/changed files; any failures in pre-existing files must match the known baseline (see Global Constraints).

- [ ] **Step 3: Lint the changed files**

Run: `pnpm lint`
Expected: no new lint errors in the files touched by this plan.

- [ ] **Step 4: Confirm the changed file set**

Run: `git diff --name-only main...HEAD`
Expected only: `src/utils/scoring.ts`, `src/utils/scoring.test.ts`, `src/screens/scoring/TeamMatchPlayScoringScreen/hooks/useTeamMatchPlayScores.ts`, `src/components/scorecard/TeamMatchPlayScorecardTable/utils.ts` (+ its new `utils.test.ts`), `src/services/rounds/finalizeTeamMatchPlayRound.ts`, `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.fourball.test.ts`, and the docs under `docs/superpowers/`.

---

## Manual QA (post-implementation, on device)

Not automated — track as outstanding on-device QA:
1. Start a four-ball best-ball match-play round with a clear lowest-handicap player. Verify that player shows **no** stroke dots on `TeamScorePanel`, and the others show only their difference from the lowest.
2. Play a divergence hole and confirm the hole winner, the running match status, the scorecard table, and (after finishing) the sub-match leaderboard and finalised result all agree.
3. Sanity-check a match where two players tie for lowest handicap: both show no dots.
4. Split Ryder-cup singles (1 player per side) still behaves exactly like singles match play.

## Out of scope (unchanged)

Alt-shot/foursomes, aggregate, and stableford best-ball paths are untouched. The dead `src/utils/teamScoring/matchPlay.ts` helpers are left as-is. Collapsing the two duplicate best-ball implementations into one shared function (beyond sharing `getFourBallStrokes`) is a possible later refactor, not done here.
