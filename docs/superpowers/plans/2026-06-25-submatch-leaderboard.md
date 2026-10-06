# Per-Match Leaderboard for Sub-Match Rounds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the Review Scorecard screen's Leaderboard tab, render one row/card per sub-match for any split round, with the card style forking by scoring model (match-play rows vs. net/points pair cards) plus an overall Team A vs Team B header.

**Architecture:** A new pure util (`subMatchLeaderboard.ts`) computes per-sub-match state from in-progress scores, reusing the canonical engines (`calculateTeamMatchData`/`calculateMatchStatus` for match play, `computeAltShotTeamRoundScore` for alt shot, `getStrokesReceived`/`calculateStablefordPoints` for aggregate/best-ball). Two presentational components (`MatchPlayMatchRow`, `SubMatchNetCard`) render the two styles. A new tab (`SubMatchLeaderboardTab`) wires the `useSubMatches` + `useRoundTeams` hooks to the util and components. `ReviewScorecardScreen` routes split rounds to the new tab ahead of the scramble/match-play-team branches.

**Tech Stack:** React Native + TypeScript, TanStack Query hooks, Zustand scorecard store, Jest + `@testing-library/react-native` (`jest-expo` preset), React Native Paper, `useThemeColors` theming.

## Global Constraints

- **Theming:** colours from `useThemeColors()`; static tokens (`spacing`, `typography`, `borderRadius`, `shadows`) imported from `@/constants/theme`. Never import colours directly. (`CLAUDE.md`)
- **Paper:** use `Text`/`Icon` from `react-native-paper`; do NOT use Paper's `Button`. (`CLAUDE.md`)
- **One source of truth for scoring:** live values MUST reuse the canonical utils (`computeAltShotTeamRoundScore`, `calculateTeamMatchData`/`calculateMatchStatus`, `getStrokesReceived`, `calculateStablefordPoints`) — no parallel formulas. (spec §2/§6)
- **Scope gate:** only rounds with `round_format === 'split'`. Combined Team Match Play, scramble, combined alt shot, individual leaderboards stay untouched. (spec, confirmed)
- **Test runner:** `pnpm test <path>`; files named `*.test.ts` / `*.test.tsx`. Diff against the known-noisy baseline (~243 pre-existing failures on main) — only assert on the new tests added here.
- **Commit message footer:** end every commit body with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

**Create:**
- `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts` — pure computation: model resolver, per-sub-match match-play + net/points computation, overall tally. Types exported for components/tab.
- `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts` — unit tests.
- `src/components/rounds/MatchPlayMatchRow.tsx` — centered match-play row (names ‹ status › names).
- `src/components/rounds/MatchPlayMatchRow.test.tsx`
- `src/components/rounds/SubMatchNetCard.tsx` — net/points pair card + `SubMatchOverallHeader` (overall Team A–B tally). 
- `src/components/rounds/SubMatchNetCard.test.tsx`
- `src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.tsx` — tab wiring.
- `src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.test.tsx`

**Modify:**
- `src/screens/scoring/ReviewScorecardScreen/components/index.ts` — export the new tab.
- `src/screens/scoring/ReviewScorecardScreen/hooks/useReviewScorecardTabs.ts` — add `isSubMatchRound` flag.
- `src/screens/scoring/ReviewScorecardScreen/index.tsx` — route split rounds to the new tab ahead of scramble / match-play-team.

---

## Task 1: Pure util scaffolding — types + `resolveSubMatchModel`

**Files:**
- Create: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts`
- Test: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts`

**Interfaces:**
- Produces: `SubMatchModel`, `SubMatchPlayer`, `SubMatchSides`, `GetStrokes`, `resolveSubMatchModel(gameType, teamFormat)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts
import { resolveSubMatchModel } from './subMatchLeaderboard';

describe('resolveSubMatchModel', () => {
  it('maps match-play game type to the match-play model', () => {
    expect(resolveSubMatchModel('match-play', null)).toBe('match-play');
    expect(resolveSubMatchModel('match-play', 'match-play-team')).toBe('match-play');
  });

  it('maps alt-shot and aggregate to net, best-ball to points', () => {
    expect(resolveSubMatchModel('alt-shot', 'alt-shot')).toBe('alt-shot');
    expect(resolveSubMatchModel('stroke', 'aggregate')).toBe('aggregate');
    expect(resolveSubMatchModel('stableford', 'best-ball')).toBe('best-ball');
  });

  it('defaults unknown combinations to aggregate (net)', () => {
    expect(resolveSubMatchModel('stroke', null)).toBe('aggregate');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts`
Expected: FAIL — `resolveSubMatchModel` is not exported / module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts
import type { GameType, TeamFormat } from '@/types';

/** Which scoring model a sub-match round uses for its per-match display. */
export type SubMatchModel = 'match-play' | 'alt-shot' | 'aggregate' | 'best-ball';

/** A player on one side of a sub-match, with their *playing* handicap. */
export interface SubMatchPlayer {
  id: string;
  name: string;
  handicap: number;
}

/** The two sides of a sub-match. `a` = team_a_player_ids, `b` = team_b_player_ids. */
export interface SubMatchSides {
  a: SubMatchPlayer[];
  b: SubMatchPlayer[];
}

/** Reads a player's gross strokes for a hole from the in-progress store. */
export type GetStrokes = (playerId: string, holeNumber: number) => number | undefined;

/**
 * Resolve the per-sub-match scoring model from the round's game type and team
 * format. Match play wins regardless of team_format (covers singles and
 * Ryder-Cup singles). Otherwise team_format selects net vs. points.
 */
export function resolveSubMatchModel(
  gameType: GameType,
  teamFormat: TeamFormat | null | undefined
): SubMatchModel {
  if (gameType === 'match-play') return 'match-play';
  if (teamFormat === 'alt-shot') return 'alt-shot';
  if (teamFormat === 'best-ball') return 'best-ball';
  return 'aggregate';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts
git commit -m "feat(scoring): sub-match leaderboard model resolver

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Match-play sub-match computation

**Files:**
- Modify: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts`
- Test: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts`

**Interfaces:**
- Consumes: `calculateTeamMatchData` (`src/components/scorecard/TeamMatchPlayScorecardTable/utils.ts`) — `(holes, team1, team2, getPlayerScore) => { holeResults, finalStatus, ... }`; `MatchTeam` (`src/screens/scoring/TeamMatchPlayScoringScreen/types.ts`).
- Produces: `MatchPlayRowData { statusText: string; leaderSide: 'a'|'b'|null; isComplete: boolean; hasScores: boolean }`, `computeMatchPlaySubMatch(sides, holes, getStrokes)`.

- [ ] **Step 1: Write the failing test**

Add to `subMatchLeaderboard.test.ts`:

```ts
import { computeMatchPlaySubMatch } from './subMatchLeaderboard';
import type { Hole } from '@/types';

function hole(number: number, par = 4, strokeIndex = number): Hole {
  return { number, par, strokeIndex } as Hole;
}

// 9 holes, stroke index 1..9 ascending.
const NINE: Hole[] = Array.from({ length: 9 }, (_, i) => hole(i + 1));

describe('computeMatchPlaySubMatch', () => {
  const sides = {
    a: [{ id: 'a1', name: 'Sam', handicap: 0 }],
    b: [{ id: 'b1', name: 'Bob', handicap: 0 }],
  };

  it('reports all square before any scores', () => {
    const r = computeMatchPlaySubMatch(sides, NINE, () => undefined);
    expect(r.statusText).toBe('A/S');
    expect(r.leaderSide).toBeNull();
    expect(r.hasScores).toBe(false);
  });

  it('reports the leading side as "N UP" in progress', () => {
    // Sam wins holes 1 & 2 (4 vs 5), rest unscored.
    const getStrokes = (pid: string, h: number) => {
      if (h > 2) return undefined;
      return pid === 'a1' ? 4 : 5;
    };
    const r = computeMatchPlaySubMatch(sides, NINE, getStrokes);
    expect(r.statusText).toBe('2 UP');
    expect(r.leaderSide).toBe('a');
    expect(r.hasScores).toBe(true);
    expect(r.isComplete).toBe(false);
  });

  it('formats a closed-out match as "N&M"', () => {
    // Sam wins holes 1-7 (all of them through 7); 2 holes remain, 7-up: closed.
    const getStrokes = (pid: string, h: number) => {
      if (h > 7) return undefined;
      return pid === 'a1' ? 3 : 5;
    };
    const r = computeMatchPlaySubMatch(sides, NINE, getStrokes);
    expect(r.isComplete).toBe(true);
    expect(r.leaderSide).toBe('a');
    expect(r.statusText).toBe('7&2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts -t computeMatchPlaySubMatch`
Expected: FAIL — `computeMatchPlaySubMatch` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `subMatchLeaderboard.ts`:

```ts
import type { Hole } from '@/types';
import { calculateTeamMatchData } from '@/components/scorecard/TeamMatchPlayScorecardTable/utils';
import type { MatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';

export interface MatchPlayRowData {
  /** Centered status: 'A/S' | '2 UP' | '3&2'. */
  statusText: string;
  /** Side currently ahead (colours the status); null when level. */
  leaderSide: 'a' | 'b' | null;
  isComplete: boolean;
  /** True once at least one hole has been decided. */
  hasScores: boolean;
}

function toMatchSide(players: SubMatchPlayer[], id: string): MatchTeam {
  return {
    id,
    name: id,
    handicap: 0,
    members: players.map((p) => ({
      id: p.id,
      name: p.name,
      handicap: p.handicap,
      score: null,
      pickedUp: false,
    })),
  };
}

/** Normalise the engine's margin string to the compact display form. */
function normaliseMargin(margin: string): string {
  if (margin === 'All Square') return 'A/S';
  if (margin.includes('&')) return margin.replace(/\s+/g, ''); // '3 & 2' -> '3&2'
  if (margin.toLowerCase().endsWith('up')) return `${margin.split(' ')[0]} UP`; // '2 up' -> '2 UP'
  return margin;
}

export function computeMatchPlaySubMatch(
  sides: SubMatchSides,
  holes: Hole[],
  getStrokes: GetStrokes
): MatchPlayRowData {
  const team1 = toMatchSide(sides.a, 'a');
  const team2 = toMatchSide(sides.b, 'b');
  const calc = calculateTeamMatchData(holes, team1, team2, getStrokes);
  const status = calc.finalStatus;
  const hasScores = Object.values(calc.holeResults).some((r) => r.winner !== null);

  if (status.status === 'complete') {
    if (status.winner === 'halved') {
      return { statusText: 'A/S', leaderSide: null, isComplete: true, hasScores };
    }
    return {
      statusText: normaliseMargin(status.margin),
      leaderSide: status.winner === 'player1' ? 'a' : 'b',
      isComplete: true,
      hasScores,
    };
  }

  if (status.leader === null) {
    return { statusText: 'A/S', leaderSide: null, isComplete: false, hasScores };
  }
  return {
    statusText: `${status.holesUp} UP`,
    leaderSide: status.leader === 'player1' ? 'a' : 'b',
    isComplete: false,
    hasScores,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts -t computeMatchPlaySubMatch`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts
git commit -m "feat(scoring): match-play sub-match status computation

Reuses calculateTeamMatchData so live status matches finalised result.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Net / points sub-match computation

**Files:**
- Modify: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts`
- Test: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts`

**Interfaces:**
- Consumes: `computeAltShotTeamRoundScore`, `AltShotTeamMember` (`@/utils/teamScoring/altShot`); `getStrokesReceived`, `calculateStablefordPoints` (`@/utils/scoring`); `Scorecard` (`@/types/database/scorecard.types`).
- Produces: `NetCardData { valueA: number|null; valueB: number|null; unit: ''|' pts'; leaderSide: 'a'|'b'|null; diff: number; hasScores: boolean }`, `computeNetSubMatch(model, sides, holes, getStrokes)`.

- [ ] **Step 1: Write the failing test**

Add to `subMatchLeaderboard.test.ts`:

```ts
import { computeNetSubMatch } from './subMatchLeaderboard';

describe('computeNetSubMatch', () => {
  const sides = {
    a: [{ id: 'a1', name: 'Sam', handicap: 0 }, { id: 'a2', name: 'Al', handicap: 0 }],
    b: [{ id: 'b1', name: 'Bob', handicap: 0 }, { id: 'b2', name: 'Ed', handicap: 0 }],
  };

  it('alt-shot: lower combined net leads, scratch pairs use raw gross', () => {
    // Side A's shared ball: 4 on holes 1-2 (gross 8). Side B: 5,5 (gross 10).
    const getStrokes = (pid: string, h: number) => {
      if (h > 2) return undefined;
      if (pid === 'a1' || pid === 'a2') return 4;
      return 5;
    };
    const r = computeNetSubMatch('alt-shot', sides, NINE, getStrokes);
    expect(r.valueA).toBe(8);
    expect(r.valueB).toBe(10);
    expect(r.leaderSide).toBe('a');
    expect(r.diff).toBe(2);
    expect(r.unit).toBe('');
  });

  it('best-ball: higher stableford points lead, unit is pts', () => {
    // Par-4 holes, scratch. Side A makes 4 (par=2pts) on holes 1-2 => 4 pts.
    // Side B makes 5 (bogey=1pt) on holes 1-2 => 2 pts.
    const getStrokes = (pid: string, h: number) => {
      if (h > 2) return undefined;
      return pid.startsWith('a') ? 4 : 5;
    };
    const r = computeNetSubMatch('best-ball', sides, NINE, getStrokes);
    expect(r.valueA).toBe(4);
    expect(r.valueB).toBe(2);
    expect(r.leaderSide).toBe('a');
    expect(r.unit).toBe(' pts');
  });

  it('returns nulls and no leader before any scores', () => {
    const r = computeNetSubMatch('aggregate', sides, NINE, () => undefined);
    expect(r.valueA).toBeNull();
    expect(r.valueB).toBeNull();
    expect(r.leaderSide).toBeNull();
    expect(r.hasScores).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts -t computeNetSubMatch`
Expected: FAIL — `computeNetSubMatch` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `subMatchLeaderboard.ts`:

```ts
import { getStrokesReceived, calculateStablefordPoints } from '@/utils/scoring';
import { computeAltShotTeamRoundScore } from '@/utils/teamScoring/altShot';
import type { AltShotTeamMember } from '@/utils/teamScoring/altShot';
import type { Scorecard } from '@/types/database/scorecard.types';

export interface NetCardData {
  /** Side A's net (alt-shot/aggregate) or points (best-ball); null if unscored. */
  valueA: number | null;
  valueB: number | null;
  /** '' for net strokes, ' pts' for best-ball stableford. */
  unit: '' | ' pts';
  leaderSide: 'a' | 'b' | null;
  /** Absolute lead magnitude (0 until both sides have scores). */
  diff: number;
  hasScores: boolean;
}

interface SideValue {
  value: number;
  hasScores: boolean;
}

/** Alt-shot pair net via the canonical engine (synthetic in-progress cards). */
function altShotSideNet(players: SubMatchPlayer[], holes: Hole[], getStrokes: GetStrokes): SideValue {
  const scores: Record<string, { strokes: number }> = {};
  let holesScored = 0;
  // Both partners share one ball; read from the first member.
  const ballPlayerId = players[0]?.id;
  for (const h of holes) {
    const s = ballPlayerId ? getStrokes(ballPlayerId, h.number) : undefined;
    if (typeof s === 'number' && s > 0) {
      scores[String(h.number)] = { strokes: s };
      holesScored++;
    }
  }
  const synthetic = players.map(
    (p) =>
      ({ player_id: p.id, daily_handicap_used: p.handicap, scores, total_gross: 0 } as unknown as Scorecard)
  );
  const members: AltShotTeamMember[] = players.map((p) => ({ player_id: p.id, handicap: p.handicap }));
  const result = computeAltShotTeamRoundScore(synthetic, members);
  return { value: result.teamNet, hasScores: holesScored > 0 };
}

/** Aggregate net: sum of each member's per-hole net across scored holes. */
function aggregateSideNet(players: SubMatchPlayer[], holes: Hole[], getStrokes: GetStrokes): SideValue {
  let total = 0;
  let scored = false;
  for (const p of players) {
    for (const h of holes) {
      const s = getStrokes(p.id, h.number);
      if (typeof s === 'number' && s > 0) {
        total += s - getStrokesReceived(p.handicap, h.strokeIndex);
        scored = true;
      }
    }
  }
  return { value: total, hasScores: scored };
}

/** Best-ball: sum of the best stableford points among the side per hole. */
function bestBallSidePoints(players: SubMatchPlayer[], holes: Hole[], getStrokes: GetStrokes): SideValue {
  let total = 0;
  let scored = false;
  for (const h of holes) {
    let best: number | null = null;
    for (const p of players) {
      const s = getStrokes(p.id, h.number);
      if (typeof s === 'number' && s > 0) {
        const pts = calculateStablefordPoints(s, p.handicap, h);
        if (best === null || pts > best) best = pts;
      }
    }
    if (best !== null) {
      total += best;
      scored = true;
    }
  }
  return { value: total, hasScores: scored };
}

function finalise(a: SideValue, b: SideValue, higherWins: boolean, unit: '' | ' pts'): NetCardData {
  let leaderSide: 'a' | 'b' | null = null;
  let diff = 0;
  if (a.hasScores && b.hasScores && a.value !== b.value) {
    const aLeads = higherWins ? a.value > b.value : a.value < b.value;
    leaderSide = aLeads ? 'a' : 'b';
    diff = Math.abs(a.value - b.value);
  }
  return {
    valueA: a.hasScores ? a.value : null,
    valueB: b.hasScores ? b.value : null,
    unit,
    leaderSide,
    diff,
    hasScores: a.hasScores || b.hasScores,
  };
}

export function computeNetSubMatch(
  model: Exclude<SubMatchModel, 'match-play'>,
  sides: SubMatchSides,
  holes: Hole[],
  getStrokes: GetStrokes
): NetCardData {
  if (model === 'best-ball') {
    return finalise(
      bestBallSidePoints(sides.a, holes, getStrokes),
      bestBallSidePoints(sides.b, holes, getStrokes),
      true,
      ' pts'
    );
  }
  const sideNet = model === 'alt-shot' ? altShotSideNet : aggregateSideNet;
  return finalise(sideNet(sides.a, holes, getStrokes), sideNet(sides.b, holes, getStrokes), false, '');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts -t computeNetSubMatch`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts
git commit -m "feat(scoring): net/points sub-match computation (alt-shot, aggregate, best-ball)

Alt-shot reuses computeAltShotTeamRoundScore via synthetic in-progress cards.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Overall Ryder-cup tally

**Files:**
- Modify: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts`
- Test: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts`

**Interfaces:**
- Produces: `SubMatchLeader { leaderSide: 'a'|'b'|null; hasScores: boolean }`, `tallyOverall(results) => { pointsA: number; pointsB: number }`.

- [ ] **Step 1: Write the failing test**

Add to `subMatchLeaderboard.test.ts`:

```ts
import { tallyOverall } from './subMatchLeaderboard';

describe('tallyOverall', () => {
  it('awards 1 to the current leader, 0.5 each when level, 0 when unscored', () => {
    const result = tallyOverall([
      { leaderSide: 'a', hasScores: true },
      { leaderSide: 'b', hasScores: true },
      { leaderSide: null, hasScores: true }, // level -> 0.5 each
      { leaderSide: null, hasScores: false }, // not started -> 0
    ]);
    expect(result.pointsA).toBe(1.5);
    expect(result.pointsB).toBe(1.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts -t tallyOverall`
Expected: FAIL — `tallyOverall` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `subMatchLeaderboard.ts`:

```ts
export interface SubMatchLeader {
  leaderSide: 'a' | 'b' | null;
  hasScores: boolean;
}

/**
 * Live projected Team A vs Team B tally: the side currently ahead in a
 * sub-match earns 1 point, a level-but-started sub-match splits 0.5/0.5, and an
 * unstarted sub-match contributes nothing.
 */
export function tallyOverall(results: SubMatchLeader[]): { pointsA: number; pointsB: number } {
  let pointsA = 0;
  let pointsB = 0;
  for (const r of results) {
    if (!r.hasScores) continue;
    if (r.leaderSide === 'a') pointsA += 1;
    else if (r.leaderSide === 'b') pointsB += 1;
    else {
      pointsA += 0.5;
      pointsB += 0.5;
    }
  }
  return { pointsA, pointsB };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts -t tallyOverall`
Expected: PASS.

- [ ] **Step 5: Run the full util test file**

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts`
Expected: PASS (all suites: resolveSubMatchModel, computeMatchPlaySubMatch, computeNetSubMatch, tallyOverall).

- [ ] **Step 6: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts
git commit -m "feat(scoring): overall Ryder-cup tally for sub-match leaderboard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `MatchPlayMatchRow` component

**Files:**
- Create: `src/components/rounds/MatchPlayMatchRow.tsx`
- Test: `src/components/rounds/MatchPlayMatchRow.test.tsx`

**Interfaces:**
- Consumes: `MatchPlayRowData` (Task 2).
- Produces: `MatchPlayMatchRow` (named export) with props below.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/rounds/MatchPlayMatchRow.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MatchPlayMatchRow } from './MatchPlayMatchRow';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#fff',
    border: '#eee',
    textPrimary: '#000',
    textSecondary: '#666',
  }),
}));

describe('MatchPlayMatchRow', () => {
  it('renders both names and the centered status', () => {
    render(
      <MatchPlayMatchRow
        leftName="Sam"
        rightName="Bob"
        leftColor="#0a0"
        rightColor="#a00"
        data={{ statusText: '2 UP', leaderSide: 'a', isComplete: false, hasScores: true }}
      />
    );
    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('2 UP');
  });

  it('shows A/S when not started', () => {
    render(
      <MatchPlayMatchRow
        leftName="Sam"
        rightName="Bob"
        leftColor="#0a0"
        rightColor="#a00"
        data={{ statusText: 'A/S', leaderSide: null, isComplete: false, hasScores: false }}
      />
    );
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('A/S');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/rounds/MatchPlayMatchRow.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/rounds/MatchPlayMatchRow.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { MatchPlayRowData } from '@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard';

export interface MatchPlayMatchRowProps {
  leftName: string;
  rightName: string;
  /** Team colour for the left side (team_a). */
  leftColor: string;
  /** Team colour for the right side (team_b). */
  rightColor: string;
  data: MatchPlayRowData;
  /** Emphasise a name when it is the current user. */
  highlightLeft?: boolean;
  highlightRight?: boolean;
  testID?: string;
}

export function MatchPlayMatchRow({
  leftName,
  rightName,
  leftColor,
  rightColor,
  data,
  highlightLeft = false,
  highlightRight = false,
  testID,
}: MatchPlayMatchRowProps) {
  const colors = useThemeColors();
  const statusColor =
    data.leaderSide === 'a' ? leftColor : data.leaderSide === 'b' ? rightColor : colors.textSecondary;

  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      testID={testID}
    >
      <View style={[styles.side, styles.left]}>
        <View style={[styles.dot, { backgroundColor: leftColor }]} />
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            { color: colors.textPrimary, fontWeight: highlightLeft ? '700' : '500' },
          ]}
        >
          {leftName}
        </Text>
      </View>

      <Text
        testID="match-row-status"
        style={[styles.status, { color: statusColor }]}
        accessibilityLabel={`Match status ${data.statusText}`}
      >
        {data.statusText}
      </Text>

      <View style={[styles.side, styles.right]}>
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            styles.nameRight,
            { color: colors.textPrimary, fontWeight: highlightRight ? '700' : '500' },
          ]}
        >
          {rightName}
        </Text>
        <View style={[styles.dot, { backgroundColor: rightColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { ...typography.body, flexShrink: 1 },
  nameRight: { textAlign: 'right' },
  status: { ...typography.h4, fontWeight: '800', textAlign: 'center', minWidth: 64, paddingHorizontal: spacing.sm },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/rounds/MatchPlayMatchRow.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/rounds/MatchPlayMatchRow.tsx src/components/rounds/MatchPlayMatchRow.test.tsx
git commit -m "feat(rounds): MatchPlayMatchRow — centered, team-coloured match status

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `SubMatchNetCard` + `SubMatchOverallHeader`

**Files:**
- Create: `src/components/rounds/SubMatchNetCard.tsx`
- Test: `src/components/rounds/SubMatchNetCard.test.tsx`

**Interfaces:**
- Consumes: `NetCardData` (Task 3).
- Produces: `SubMatchNetCard`, `SubMatchOverallHeader` (named exports).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/rounds/SubMatchNetCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SubMatchNetCard, SubMatchOverallHeader } from './SubMatchNetCard';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#fff',
    border: '#eee',
    textPrimary: '#000',
    textSecondary: '#666',
    success: '#0a0',
  }),
}));

const baseData = { unit: '' as const, diff: 2, hasScores: true };

describe('SubMatchNetCard', () => {
  it('renders both pair labels, nets, and the "leads by" status', () => {
    render(
      <SubMatchNetCard
        index={0}
        leftLabel="Team A"
        rightLabel="Team B"
        leftColor="#0a0"
        rightColor="#a00"
        data={{ ...baseData, valueA: 34, valueB: 36, leaderSide: 'a' }}
      />
    );
    expect(screen.getByText('Team A')).toBeTruthy();
    expect(screen.getByText('Team B')).toBeTruthy();
    expect(screen.getByText('34')).toBeTruthy();
    expect(screen.getByText('36')).toBeTruthy();
    expect(screen.getByTestId('net-card-status-0')).toHaveTextContent('Team A leads by 2');
  });

  it('shows "Not started" with no scores', () => {
    render(
      <SubMatchNetCard
        index={1}
        leftLabel="Team A"
        rightLabel="Team B"
        leftColor="#0a0"
        rightColor="#a00"
        data={{ unit: '', diff: 0, hasScores: false, valueA: null, valueB: null, leaderSide: null }}
      />
    );
    expect(screen.getByTestId('net-card-status-1')).toHaveTextContent('Not started');
  });
});

describe('SubMatchOverallHeader', () => {
  it('renders the projected team tally', () => {
    render(
      <SubMatchOverallHeader
        leftLabel="Reds"
        rightLabel="Blues"
        leftColor="#a00"
        rightColor="#00a"
        pointsA={1.5}
        pointsB={0.5}
      />
    );
    expect(screen.getByText('Reds')).toBeTruthy();
    expect(screen.getByText('Blues')).toBeTruthy();
    expect(screen.getByText('1.5')).toBeTruthy();
    expect(screen.getByText('0.5')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/rounds/SubMatchNetCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/rounds/SubMatchNetCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { NetCardData } from '@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard';

export interface SubMatchNetCardProps {
  index: number;
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
  data: NetCardData;
}

function statusText(data: NetCardData, leftLabel: string, rightLabel: string): string {
  if (!data.hasScores) return 'Not started';
  if (data.leaderSide === null) return 'All square';
  const leader = data.leaderSide === 'a' ? leftLabel : rightLabel;
  return `${leader} leads by ${data.diff}${data.unit}`;
}

function SideRow({
  label,
  color,
  value,
  unit,
  isLeader,
}: {
  label: string;
  color: string;
  value: number | null;
  unit: string;
  isLeader: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.sideRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={[styles.sideLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.sideValue,
          { color: isLeader ? colors.success : colors.textPrimary, fontWeight: isLeader ? '800' : '600' },
        ]}
      >
        {value === null ? '—' : `${value}${unit}`}
      </Text>
    </View>
  );
}

export function SubMatchNetCard({
  index,
  leftLabel,
  rightLabel,
  leftColor,
  rightColor,
  data,
}: SubMatchNetCardProps) {
  const colors = useThemeColors();
  return (
    <View style={[styles.card, shadows.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Icon source="trophy-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.headerText, { color: colors.textSecondary }]}>Sub-Match {index + 1}</Text>
      </View>
      <SideRow label={leftLabel} color={leftColor} value={data.valueA} unit={data.unit} isLeader={data.leaderSide === 'a'} />
      <SideRow label={rightLabel} color={rightColor} value={data.valueB} unit={data.unit} isLeader={data.leaderSide === 'b'} />
      <Text testID={`net-card-status-${index}`} style={[styles.status, { color: colors.textSecondary }]}>
        {statusText(data, leftLabel, rightLabel)}
      </Text>
    </View>
  );
}

export interface SubMatchOverallHeaderProps {
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
  pointsA: number;
  pointsB: number;
}

export function SubMatchOverallHeader({
  leftLabel,
  rightLabel,
  leftColor,
  rightColor,
  pointsA,
  pointsB,
}: SubMatchOverallHeaderProps) {
  const colors = useThemeColors();
  return (
    <View style={[styles.card, shadows.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.overallRow}>
        <View style={styles.overallSide}>
          <Text style={[styles.overallPoints, { color: colors.textPrimary }]}>{pointsA}</Text>
          <View style={styles.overallLabelRow}>
            <View style={[styles.dot, { backgroundColor: leftColor }]} />
            <Text numberOfLines={1} style={[styles.overallLabel, { color: colors.textSecondary }]}>{leftLabel}</Text>
          </View>
        </View>
        <Text style={[styles.overallDash, { color: colors.textSecondary }]}>–</Text>
        <View style={styles.overallSide}>
          <Text style={[styles.overallPoints, { color: colors.textPrimary }]}>{pointsB}</Text>
          <View style={styles.overallLabelRow}>
            <Text numberOfLines={1} style={[styles.overallLabel, { color: colors.textSecondary }]}>{rightLabel}</Text>
            <View style={[styles.dot, { backgroundColor: rightColor }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderBottomWidth: 1, paddingBottom: spacing.sm, marginBottom: spacing.sm },
  headerText: { ...typography.caption, fontWeight: '600' },
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sideLabel: { ...typography.body, flex: 1 },
  sideValue: { ...typography.body },
  status: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
  overallRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  overallSide: { alignItems: 'center', flex: 1 },
  overallPoints: { ...typography.h2, fontWeight: '800' },
  overallLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  overallLabel: { ...typography.caption },
  overallDash: { ...typography.h3 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/rounds/SubMatchNetCard.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/rounds/SubMatchNetCard.tsx src/components/rounds/SubMatchNetCard.test.tsx
git commit -m "feat(rounds): SubMatchNetCard + SubMatchOverallHeader

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `SubMatchLeaderboardTab` wiring

**Files:**
- Create: `src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.tsx`
- Modify: `src/screens/scoring/ReviewScorecardScreen/components/index.ts`
- Test: `src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.test.tsx`

**Interfaces:**
- Consumes: util from Tasks 1-4; `MatchPlayMatchRow` (Task 5); `SubMatchNetCard`, `SubMatchOverallHeader` (Task 6); `useSubMatches` (`@/hooks/rounds`); `useRoundTeams` (`@/hooks/scorecard/useRoundTeams`); `calculatePlayingHandicap` (`@/hooks/usePlayingHandicap`); `getTeamColorHex` (`@/utils/teamColor`); `isSingleBallScore` (`@/types/database/base`).
- Produces: `SubMatchLeaderboardTab` (named export) with props matching the other leaderboard tabs.

**Implementation notes (read before coding):**
- Build a `Map<playerId, SubMatchPlayer>` from `useRoundTeams` members, where `handicap` is the **playing** handicap from `calculatePlayingHandicap({ player, selectedTeeData, holes, handicapSource, gameType })`. Mirror `MatchPlayLeaderboardTab` exactly for handicap + `getStrokes`.
- `getStrokes` wraps the store: `isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes`.
- Build `teamColorByPlayer` like `SubMatchesTab` (`getTeamColorHex(team.color, index, colors)` mapped to each member). Fallbacks: left `colors.success`, right `colors.error` when a player has no team colour.
- `labelForSide(playerIds, fallback, teamNameByPlayer)`: when every id maps to the same team name (and counts match) return that name, else the fallback ("Team A"/"Team B"). Inline a small copy (the original lives un-exported in `SubMatchesTab`).
- Resolve sides for each sub-match: `sides.a` from `team_a_player_ids`, `sides.b` from `team_b_player_ids`, via the player map (skip ids missing from the map).
- `model = resolveSubMatchModel(gameType, teamFormat)`. For `match-play` use `computeMatchPlaySubMatch` + `MatchPlayMatchRow`; else `computeNetSubMatch(model, ...)` + `SubMatchNetCard`.
- Overall header: render only when `teams.length >= 2`. Build `SubMatchLeader[]` from each sub-match's `leaderSide` + `hasScores` and call `tallyOverall`. Header labels/colours come from the first sub-match's two sides.
- Empty state: `EmptyState` (`@/components/common`) icon `golf`, compact, when no sub-matches.

- [ ] **Step 1: Write the failing test**

```tsx
// src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SubMatchLeaderboardTab } from './SubMatchLeaderboardTab';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#fff', border: '#eee', textPrimary: '#000', textSecondary: '#666',
    success: '#0a0', error: '#a00',
  }),
}));
jest.mock('@/hooks/rounds', () => ({
  useSubMatches: () => ({
    data: [
      { id: 'sm1', round_id: 'r1', sort_order: 0, team_a_player_ids: ['a1'], team_b_player_ids: ['b1'], tee_time: null, pairing_id: null, status: 'in-progress', result: null, final_differential: null, team_a_net_total: null, team_b_net_total: null, created_at: '', updated_at: '' },
    ],
    isLoading: false,
  }),
}));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({
    teams: [
      { id: 't1', name: 'Reds', color: null, members: [{ player_id: 'a1', player: { id: 'a1', name: 'Sam', handicap: 0 } }] },
      { id: 't2', name: 'Blues', color: null, members: [{ player_id: 'b1', player: { id: 'b1', name: 'Bob', handicap: 0 } }] },
    ],
    isLoading: false,
  }),
}));
jest.mock('@/hooks/usePlayingHandicap', () => ({
  calculatePlayingHandicap: () => ({ playingHandicap: 0 }),
}));
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: (sel: any) => sel({ getPlayerScore: () => undefined }),
}));

const holes = Array.from({ length: 9 }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }));

describe('SubMatchLeaderboardTab', () => {
  it('renders a match-play row for a singles sub-match', () => {
    render(
      <SubMatchLeaderboardTab
        roundId="r1"
        competitionId="c1"
        gameType="match-play"
        teamFormat={null}
        holes={holes as any}
        currentUserId="a1"
        selectedTeeData={null}
        handicapSource="manual"
        isRefreshing={false}
        onRefresh={() => {}}
        bottomInset={0}
      />
    );
    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByTestId('match-row-status')).toHaveTextContent('A/S');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.tsx
import React, { useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { useSubMatches } from '@/hooks/rounds';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { calculatePlayingHandicap } from '@/hooks/usePlayingHandicap';
import { useScorecardStore } from '@/store/scorecardStore';
import { getTeamColorHex } from '@/utils/teamColor';
import { isSingleBallScore } from '@/types/database/base';
import { EmptyState } from '@/components/common';
import { MatchPlayMatchRow } from '@/components/rounds/MatchPlayMatchRow';
import { SubMatchNetCard, SubMatchOverallHeader } from '@/components/rounds/SubMatchNetCard';
import {
  resolveSubMatchModel,
  computeMatchPlaySubMatch,
  computeNetSubMatch,
  tallyOverall,
  type SubMatchPlayer,
  type SubMatchSides,
  type SubMatchLeader,
} from '../utils/subMatchLeaderboard';
import type { Hole, TeeBox, GameType, TeamFormat } from '@/types';
import type { HandicapSource } from '@/types/database/enums';

interface SubMatchLeaderboardTabProps {
  roundId: string;
  competitionId?: string | null;
  gameType: GameType;
  teamFormat?: TeamFormat | null;
  holes: Hole[];
  currentUserId?: string;
  selectedTeeData?: TeeBox | null;
  handicapSource?: HandicapSource;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

function labelForSide(
  ids: string[],
  fallback: string,
  teamNameByPlayer: Map<string, string>
): string {
  const names = ids.map((id) => teamNameByPlayer.get(id)).filter((n): n is string => !!n);
  if (names.length === 0 || names.length !== ids.length) return fallback;
  return names.every((n) => n === names[0]) ? names[0] : fallback;
}

export function SubMatchLeaderboardTab({
  roundId,
  competitionId,
  gameType,
  teamFormat,
  holes,
  currentUserId,
  selectedTeeData,
  handicapSource,
  isRefreshing,
  onRefresh,
  bottomInset,
}: SubMatchLeaderboardTabProps) {
  const colors = useThemeColors();
  const getPlayerScoreFromStore = useScorecardStore((s) => s.getPlayerScore);
  const { data: subMatches, isLoading: smLoading } = useSubMatches(roundId);
  const { teams, isLoading: teamsLoading } = useRoundTeams(competitionId ?? undefined, true, roundId);

  const getStrokes = useMemo(
    () => (playerId: string, holeNumber: number): number | undefined => {
      const raw = getPlayerScoreFromStore(playerId, holeNumber);
      if (!raw) return undefined;
      return isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes;
    },
    [getPlayerScoreFromStore]
  );

  const { playerById, teamNameByPlayer, teamColorByPlayer } = useMemo(() => {
    const playerById = new Map<string, SubMatchPlayer>();
    const teamNameByPlayer = new Map<string, string>();
    const teamColorByPlayer = new Map<string, string>();
    teams.forEach((team, index) => {
      const hex = getTeamColorHex(team.color, index, colors);
      (team.members || []).forEach((m) => {
        if (!m.player_id) return;
        const { playingHandicap } = calculatePlayingHandicap({
          player: m.player ?? null,
          selectedTeeData: selectedTeeData ?? null,
          holes,
          handicapSource,
          gameType,
        });
        playerById.set(m.player_id, {
          id: m.player_id,
          name: m.player?.name ?? 'Unknown',
          handicap: playingHandicap,
        });
        teamNameByPlayer.set(m.player_id, team.name);
        teamColorByPlayer.set(m.player_id, hex);
      });
    });
    return { playerById, teamNameByPlayer, teamColorByPlayer };
  }, [teams, colors, selectedTeeData, holes, handicapSource, gameType]);

  const model = resolveSubMatchModel(gameType, teamFormat);

  const rows = useMemo(() => {
    return (subMatches ?? []).map((sm, index) => {
      const sides: SubMatchSides = {
        a: sm.team_a_player_ids.map((id) => playerById.get(id)).filter((p): p is SubMatchPlayer => !!p),
        b: sm.team_b_player_ids.map((id) => playerById.get(id)).filter((p): p is SubMatchPlayer => !!p),
      };
      const leftColor = teamColorByPlayer.get(sm.team_a_player_ids[0]) ?? colors.success;
      const rightColor = teamColorByPlayer.get(sm.team_b_player_ids[0]) ?? colors.error;
      const leftLabel = labelForSide(sm.team_a_player_ids, 'Team A', teamNameByPlayer);
      const rightLabel = labelForSide(sm.team_b_player_ids, 'Team B', teamNameByPlayer);
      return { sm, index, sides, leftColor, rightColor, leftLabel, rightLabel };
    });
  }, [subMatches, playerById, teamColorByPlayer, teamNameByPlayer, colors]);

  const { leaders, content } = useMemo(() => {
    const leaders: SubMatchLeader[] = [];
    const content = rows.map((row) => {
      if (model === 'match-play') {
        const data = computeMatchPlaySubMatch(row.sides, holes, getStrokes);
        leaders.push({ leaderSide: data.leaderSide, hasScores: data.hasScores });
        return (
          <MatchPlayMatchRow
            key={row.sm.id}
            leftName={row.sides.a.map((p) => p.name).join(' & ') || 'TBD'}
            rightName={row.sides.b.map((p) => p.name).join(' & ') || 'TBD'}
            leftColor={row.leftColor}
            rightColor={row.rightColor}
            data={data}
            highlightLeft={!!currentUserId && row.sides.a.some((p) => p.id === currentUserId)}
            highlightRight={!!currentUserId && row.sides.b.some((p) => p.id === currentUserId)}
            testID={`submatch-row-${row.index}`}
          />
        );
      }
      const data = computeNetSubMatch(model, row.sides, holes, getStrokes);
      leaders.push({ leaderSide: data.leaderSide, hasScores: data.hasScores });
      return (
        <SubMatchNetCard
          key={row.sm.id}
          index={row.index}
          leftLabel={row.leftLabel}
          rightLabel={row.rightLabel}
          leftColor={row.leftColor}
          rightColor={row.rightColor}
          data={data}
        />
      );
    });
    return { leaders, content };
  }, [rows, model, holes, getStrokes, currentUserId]);

  const isLoading = smLoading || teamsLoading;
  const hasSubMatches = (subMatches?.length ?? 0) > 0;
  const showOverall = hasSubMatches && teams.length >= 2;
  const tally = tallyOverall(leaders);
  const first = rows[0];

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing || isLoading}
          onRefresh={onRefresh}
          tintColor={colors.textPrimary}
          colors={[colors.textPrimary]}
        />
      }
      showsVerticalScrollIndicator
    >
      {!hasSubMatches ? (
        <EmptyState
          icon="golf"
          title="No Sub-Matches"
          message="Sub-matches will appear here once the round is split into matches."
          compact
        />
      ) : (
        <>
          {showOverall && first && (
            <SubMatchOverallHeader
              leftLabel={first.leftLabel}
              rightLabel={first.rightLabel}
              leftColor={first.leftColor}
              rightColor={first.rightColor}
              pointsA={tally.pointsA}
              pointsB={tally.pointsB}
            />
          )}
          <View>{content}</View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
});
```

- [ ] **Step 4: Add the export**

Append to `src/screens/scoring/ReviewScorecardScreen/components/index.ts`:

```ts
export { SubMatchLeaderboardTab } from './SubMatchLeaderboardTab';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.tsx src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.test.tsx src/screens/scoring/ReviewScorecardScreen/components/index.ts
git commit -m "feat(scoring): SubMatchLeaderboardTab wiring

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Route split rounds to the new tab

**Files:**
- Modify: `src/screens/scoring/ReviewScorecardScreen/hooks/useReviewScorecardTabs.ts`
- Modify: `src/screens/scoring/ReviewScorecardScreen/index.tsx`

**Interfaces:**
- Consumes: `SubMatchLeaderboardTab` (Task 7); `isSubMatchRound` from the hook.
- Produces: `isSubMatchRound` flag on the hook's return value.

**Implementation notes:** `roundDetails.round_format` is `'combined' | 'split'`. `isSubMatchRound = roundDetails?.round_format === 'split'`. The leaderboard tab key already exists for all in-scope rounds (alt-shot via `isScramble`, singles/match-play-team via the default/best-ball branches), so the tab LIST needs no change — only the leaderboard CONTENT branch.

- [ ] **Step 1: Add the flag in the hook**

In `useReviewScorecardTabs.ts`, after the `isMatchPlayTeam` line (currently line 51), add:

```ts
  const isSubMatchRound = roundDetails?.round_format === 'split';
```

And add `isSubMatchRound` to the returned object, alongside the other game-type flags (after `isMatchPlayTeam,` in the `return { ... }` block):

```ts
    isMatchPlayTeam,
    isSubMatchRound,
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm type-check`
Expected: PASS (no new errors attributable to this change — compare against baseline).

- [ ] **Step 3: Destructure the flag in the screen**

In `index.tsx`, add `isSubMatchRound` to the destructured `useReviewScorecardTabs(...)` result (near `isMatchPlayTeam`, around line 104):

```ts
    isMatchPlayTeam,
    isSubMatchRound,
```

- [ ] **Step 4: Add the leaderboard branch and guard the others**

In `index.tsx`, insert this block immediately BEFORE the existing `{activeTab === 'leaderboard' && isScramble && (` block (currently line 429):

```tsx
      {activeTab === 'leaderboard' && isSubMatchRound && roundId && (
        <SubMatchLeaderboardTab
          roundId={roundId}
          competitionId={route.params?.competitionId}
          gameType={effectiveGameType}
          teamFormat={roundDetails?.team_format ?? null}
          holes={holes}
          currentUserId={currentUserId}
          selectedTeeData={selectedTeeData}
          handicapSource={handicapSource}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

```

Then add `&& !isSubMatchRound` to the three existing leaderboard guards so the new tab wins for split rounds. Change:

```tsx
      {activeTab === 'leaderboard' && isScramble && (
```
to
```tsx
      {activeTab === 'leaderboard' && !isSubMatchRound && isScramble && (
```

Change:
```tsx
      {activeTab === 'leaderboard' && !isScramble && isMatchPlayTeam && (
```
to
```tsx
      {activeTab === 'leaderboard' && !isSubMatchRound && !isScramble && isMatchPlayTeam && (
```

Change:
```tsx
      {activeTab === 'leaderboard' && !isScramble && !isMatchPlayTeam && (
```
to
```tsx
      {activeTab === 'leaderboard' && !isSubMatchRound && !isScramble && !isMatchPlayTeam && (
```

- [ ] **Step 5: Add the import**

In `index.tsx`, add `SubMatchLeaderboardTab` to the existing import from `'./components'` (the block around lines 35-49):

```ts
  MatchScorecardTabContent,
  SubMatchLeaderboardTab,
```

- [ ] **Step 6: Type-check and run the new test suites**

Run: `pnpm type-check`
Expected: PASS (no new errors vs baseline).

Run: `pnpm test src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.test.ts src/components/rounds/MatchPlayMatchRow.test.tsx src/components/rounds/SubMatchNetCard.test.tsx src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.test.tsx`
Expected: PASS (all suites green).

- [ ] **Step 7: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/hooks/useReviewScorecardTabs.ts src/screens/scoring/ReviewScorecardScreen/index.tsx
git commit -m "feat(scoring): route split rounds to per-match leaderboard

Split rounds (singles, ryder-cup singles, split alt-shot, best-ball/aggregate
splits) now render SubMatchLeaderboardTab ahead of the scramble/match-play-team
branches. Combined rounds unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Manual verification (post-implementation)

On a device/simulator, score each in-scope round type and open the Leaderboard tab while reviewing:

1. **Singles Match Play (standalone, 2 players):** one centered match-play row, "A/S" before scores, "N UP" after, leader-coloured; no overall header (no teams).
2. **Ryder-Cup Singles (competition, 8 players → multiple 1v1s):** one row per match + overall Team A–B header.
3. **Split 2v2 Alt Shot:** net pair cards + overall header; live net matches the finalized result after submit.
4. **Best-ball split:** points cards (" pts", higher leads).
5. **Untouched:** combined Team Match Play, scramble, combined alt shot, individual stroke — all render exactly as before.

---

## Self-Review (completed by plan author)

- **Spec coverage:** routing gate (Task 8) ✓; match-play rows (Tasks 2,5) ✓; net/points cards incl. alt-shot reuse (Tasks 3,6) ✓; overall tally (Tasks 4,6,7) ✓; scope = split only + precedence over scramble/match-play-team (Task 8) ✓; edge/empty handling (Task 7 empty state, util null/`hasScores` paths) ✓.
- **Placeholder scan:** no TBD/placeholder steps; every code step contains full code.
- **Type consistency:** `MatchPlayRowData`/`NetCardData`/`SubMatchPlayer`/`SubMatchSides`/`SubMatchLeader` defined in the util (Tasks 1-4) and consumed verbatim by components (Tasks 5-6) and the tab (Task 7); `computeNetSubMatch` typed to `Exclude<SubMatchModel,'match-play'>` and only called in the non-match-play branch.
- **Open risk:** import path for `computeAltShotTeamRoundScore` is `@/utils/teamScoring/altShot` (verified file location); if a barrel re-export is preferred, adjust in Task 3. `RoundWithCourse.round_format` confirmed present via the `Round` base type.
```
