# Player Contributions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "player contributions" view to the Competition Detail screen showing who carried their team in team-format rounds, delivered as a new "Contributions" segment inside a renamed "Breakdown" tab (which absorbs the existing Ringer tab).

**Architecture:** A pure util (`src/utils/contributions/`) computes a typed board from already-fetched round/team/scorecard data — per-round contribution per team (format-native metric) plus a competition-wide MVP rollup. A hook (`useCompetitionContributions`, modeled on `useRingerBoard`) fetches and adapts the data. A `ContributionsBoard` component renders it. The Competition Detail screen's Ringer tab becomes a "Breakdown" tab with a segmented control (Ringer / Team Ringer / Contributions), each segment shown only when its data exists.

**Tech Stack:** TypeScript, React Native, React Native Paper, TanStack Query (`useQuery`/`useQueries`), Jest. No DB migrations — everything computed from existing data.

**Reference spec:** `docs/superpowers/specs/2026-06-15-player-contributions-design.md`

---

## File Structure

**Create:**
- `src/utils/contributions/types.ts` — board/entry/breakdown types + input types
- `src/utils/contributions/computeContributions.ts` — the pure computation
- `src/utils/contributions/index.ts` — barrel export
- `src/utils/contributions/computeContributions.test.ts` — unit tests
- `src/hooks/competitions/useCompetitionContributions.ts` — data-fetching hook
- `src/components/competitions/contributions/ContributionsBoard.tsx` — main component
- `src/components/competitions/contributions/index.ts` — barrel export
- `src/components/competitions/contributions/ContributionsBoard.test.tsx` — component tests

**Modify:**
- `src/hooks/queryKeys/scoring.ts` — add `contributionKeys` factory
- `src/screens/competitions/CompetitionDetailScreen/index.tsx` — rename Ringer tab → Breakdown, add segmented control + Contributions segment + visibility rules

**Reuse (do not modify):**
- `src/utils/scoring.ts` — `calculateStablefordPoints`, `calculateNetScore`, `calculateParScore`
- `src/services/teams/teamQueries.ts` — `getCompetitionTeams`
- `src/services/courses/getRoundHoles.ts` — `getRoundHoles`
- `src/components/competitions/ringer` — `RingerBoard` (rendered as a segment)

---

## Key Computation Contract

The pure util takes plain, pre-assembled data (no Supabase, no React) so it is fully unit-testable. The hook is responsible for turning scorecards into this shape.

Contribution metric per format (all normalized to a 0–1 `share`, surfaced as a %):
- **best-ball:** per hole, the member(s) with the best counted value win the hole. Ties split evenly (0.5 each for a 2-way tie). `share = holesWon / holesScored`.
- **scramble:** count shot slots (`teeShot`/`secondShot`/`approach`/`putt`) attributed to each player across holes. `share = playerShots / totalShots`. Breakdown by drives/approaches/putts.
- **shamble:** average of two sub-shares — drives used (`teeShot`) and holes won (best-ball logic on own-ball strokes). If no drive data, fall back to holes-won-only and flag it.
- **aggregate:** every member's score counts. Use **Stableford points** as the common "higher = more" currency (so the share is sensible even for stroke-aggregate). `share = playerPoints / teamPoints`.

Rollup: each player's MVP score = average of their `share` across the team rounds they played, excluding rounds flagged `dataMissing`.

---

## Task 1: Contribution types

**Files:**
- Create: `src/utils/contributions/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/utils/contributions/types.ts
import type { GameType, TeamFormat } from '@/types/database/enums';
import type { Hole } from '@/types';

/** Formats that produce a meaningful team-contribution story. */
export type ContributionFormat = 'best-ball' | 'scramble' | 'shamble' | 'aggregate';

/** Shot slots attributed to players on a single hole (scramble/shamble). */
export interface HoleShotSlots {
  teeShot?: string;
  secondShot?: string;
  approach?: string;
  putt?: string;
}

export interface ContributionMemberInput {
  playerId: string;
  playerName: string;
  handicap: number;
}

export interface ContributionTeamInput {
  teamId: string;
  teamName: string;
  color: string | null;
  members: ContributionMemberInput[];
  /** Gross strokes per player per hole number; undefined = no score. */
  strokesByPlayerHole: Record<string, Record<number, number | undefined>>;
  /** Shot attributions per hole number (scramble/shamble only). */
  shotContributionsByHole?: Record<number, HoleShotSlots>;
}

export interface ContributionRoundInput {
  roundId: string;
  roundLabel: string;
  format: ContributionFormat;
  gameType: GameType;
  holes: Hole[];
  teams: ContributionTeamInput[];
}

export interface ComputeContributionsInput {
  rounds: ContributionRoundInput[];
}

/** Per-shot-type counts (scramble/shamble breakdown). */
export interface ShotBreakdown {
  drives: number;
  approaches: number;
  putts: number;
}

export interface PlayerContribution {
  playerId: string;
  playerName: string;
  /** Raw metric: holes won (may be fractional) or shots used or points. */
  value: number;
  /** 0–1 share of the team's total for this round. */
  share: number;
  /** Present for scramble/shamble. */
  shotBreakdown?: ShotBreakdown;
  /** 1-indexed rank within the team; ties share a position. */
  position: number;
  isMvp: boolean;
}

export interface TeamContribution {
  teamId: string;
  teamName: string;
  color: string | null;
  players: PlayerContribution[];
}

export interface RoundContribution {
  roundId: string;
  roundLabel: string;
  format: ContributionFormat;
  /** Short label of the metric, e.g. 'holes won', 'shots used'. */
  metricLabel: string;
  teams: TeamContribution[];
  /** True when the metric needs data that wasn't captured (e.g. scramble shots). */
  dataMissing: boolean;
  /** Set when shamble fell back to holes-won-only. */
  drivesMissing?: boolean;
}

export interface RollupEntry {
  playerId: string;
  playerName: string;
  /** Average share across played, non-missing rounds (0–1). */
  averageShare: number;
  /** Number of rounds that fed this average. */
  roundsCounted: number;
  position: number;
  isMvp: boolean;
}

export interface ContributionsBoard {
  rollup: RollupEntry[];
  rounds: RoundContribution[];
  /** True when there is no usable team-format data at all. */
  isEmpty: boolean;
}

export type { Hole, GameType, TeamFormat };
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/contributions/types.ts
git commit -m "feat(contributions): add contribution board types"
```

---

## Task 2: Best-ball & aggregate per-round contribution

**Files:**
- Create: `src/utils/contributions/computeContributions.ts`
- Create: `src/utils/contributions/index.ts`
- Test: `src/utils/contributions/computeContributions.test.ts`

This task adds `computeContributions` covering **best-ball** (with tie-splitting) and **aggregate**. Scramble/shamble are added in Task 3, the rollup in Task 4.

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/contributions/computeContributions.test.ts
import { computeContributions } from './computeContributions';
import type { ComputeContributionsInput, ContributionRoundInput } from './types';
import type { Hole } from '@/types';

// 3 holes, all par 4, stroke index 1..3, scratch players so net = gross.
const HOLES: Hole[] = [
  { number: 1, par: 4, strokeIndex: 1 } as Hole,
  { number: 2, par: 4, strokeIndex: 2 } as Hole,
  { number: 3, par: 4, strokeIndex: 3 } as Hole,
];

function bestBallRound(overrides: Partial<ContributionRoundInput> = {}): ContributionRoundInput {
  return {
    roundId: 'r1',
    roundLabel: 'R1',
    format: 'best-ball',
    gameType: 'stroke',
    holes: HOLES,
    teams: [
      {
        teamId: 't1',
        teamName: 'Eagles',
        color: 'avatar-green',
        members: [
          { playerId: 'a', playerName: 'Ann', handicap: 0 },
          { playerId: 'b', playerName: 'Bob', handicap: 0 },
        ],
        strokesByPlayerHole: {
          // Ann wins holes 1 & 2 (lower net), tie on hole 3.
          a: { 1: 3, 2: 4, 3: 4 },
          b: { 1: 5, 2: 5, 3: 4 },
        },
      },
    ],
    ...overrides,
  };
}

describe('computeContributions — best-ball', () => {
  it('counts holes won and splits ties 0.5 each', () => {
    const input: ComputeContributionsInput = { rounds: [bestBallRound()] };
    const board = computeContributions(input);

    const team = board.rounds[0].teams[0];
    const ann = team.players.find((p) => p.playerId === 'a')!;
    const bob = team.players.find((p) => p.playerId === 'b')!;

    // Ann: holes 1, 2 outright + 0.5 of hole 3 = 2.5. Bob: 0.5 of hole 3.
    expect(ann.value).toBe(2.5);
    expect(bob.value).toBe(0.5);
    expect(ann.share).toBeCloseTo(2.5 / 3);
    expect(bob.share).toBeCloseTo(0.5 / 3);
    expect(ann.isMvp).toBe(true);
    expect(bob.isMvp).toBe(false);
    expect(board.rounds[0].metricLabel).toBe('holes won');
    expect(board.rounds[0].dataMissing).toBe(false);
  });

  it('uses stableford points (higher wins) for stableford rounds', () => {
    const input: ComputeContributionsInput = {
      rounds: [bestBallRound({ gameType: 'stableford' })],
    };
    const board = computeContributions(input);
    const ann = board.rounds[0].teams[0].players.find((p) => p.playerId === 'a')!;
    // Ann still wins holes 1 & 2 (more points), tie on 3 → 2.5.
    expect(ann.value).toBe(2.5);
  });
});

describe('computeContributions — aggregate', () => {
  it('shares stableford points across both members', () => {
    const round: ContributionRoundInput = {
      ...bestBallRound(),
      format: 'aggregate',
      gameType: 'stableford',
    };
    const board = computeContributions({ rounds: [round] });
    const team = board.rounds[0].teams[0];
    const totalShare = team.players.reduce((s, p) => s + p.share, 0);
    expect(totalShare).toBeCloseTo(1);
    expect(board.rounds[0].metricLabel).toBe('points');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/utils/contributions/computeContributions.test.ts`
Expected: FAIL — `computeContributions` is not defined / module not found.

- [ ] **Step 3: Write the implementation (best-ball + aggregate paths)**

```typescript
// src/utils/contributions/computeContributions.ts
import {
  calculateStablefordPoints,
  calculateNetScore,
  calculateParScore,
} from '@/utils/scoring';
import type {
  ComputeContributionsInput,
  ContributionsBoard,
  ContributionRoundInput,
  ContributionTeamInput,
  ContributionFormat,
  GameType,
  Hole,
  PlayerContribution,
  RoundContribution,
  TeamContribution,
} from './types';

const PICKUP_SCORE = 99; // sentinel used elsewhere in the app for picked-up holes

/** Higher value wins for stableford/par; lower (net strokes) wins otherwise. */
function higherIsBetter(gameType: GameType): boolean {
  return gameType === 'stableford' || gameType === 'par';
}

/** Per-player "goodness" value on a hole for the given game type. */
function holeValue(
  strokes: number | undefined,
  handicap: number,
  hole: Hole,
  gameType: GameType
): number | null {
  if (!strokes || strokes === PICKUP_SCORE) return null;
  if (gameType === 'stableford') return calculateStablefordPoints(strokes, handicap, hole);
  if (gameType === 'par') return calculateParScore(strokes, hole.par, handicap);
  return calculateNetScore(strokes, handicap, hole);
}

/** Always-higher-is-better value for aggregate share math. */
function aggregateValue(
  strokes: number | undefined,
  handicap: number,
  hole: Hole
): number | null {
  if (!strokes || strokes === PICKUP_SCORE) return null;
  return calculateStablefordPoints(strokes, handicap, hole);
}

const METRIC_LABEL: Record<ContributionFormat, string> = {
  'best-ball': 'holes won',
  scramble: 'shots used',
  shamble: 'drives + holes won',
  aggregate: 'points',
};

function rank(players: PlayerContribution[]): PlayerContribution[] {
  const sorted = [...players].sort((a, b) => b.value - a.value);
  const top = sorted.length ? sorted[0].value : 0;
  let lastValue = Number.POSITIVE_INFINITY;
  let lastPos = 0;
  sorted.forEach((p, i) => {
    if (p.value < lastValue) {
      lastPos = i + 1;
      lastValue = p.value;
    }
    p.position = lastPos;
    p.isMvp = top > 0 && p.value === top;
  });
  return sorted;
}

/** Best-ball / shamble-ownball holes-won with 0.5 tie-splitting. */
function holesWonByPlayer(
  team: ContributionTeamInput,
  holes: Hole[],
  gameType: GameType
): { won: Map<string, number>; holesScored: number } {
  const won = new Map<string, number>();
  team.members.forEach((m) => won.set(m.playerId, 0));
  let holesScored = 0;

  for (const hole of holes) {
    const values: { playerId: string; value: number }[] = [];
    for (const m of team.members) {
      const v = holeValue(
        team.strokesByPlayerHole[m.playerId]?.[hole.number],
        m.handicap,
        hole,
        gameType
      );
      if (v !== null) values.push({ playerId: m.playerId, value: v });
    }
    if (values.length === 0) continue;
    holesScored += 1;

    const best = higherIsBetter(gameType)
      ? Math.max(...values.map((v) => v.value))
      : Math.min(...values.map((v) => v.value));
    const winners = values.filter((v) => v.value === best);
    const credit = 1 / winners.length;
    for (const w of winners) won.set(w.playerId, (won.get(w.playerId) ?? 0) + credit);
  }

  return { won, holesScored };
}

function computeBestBallTeam(
  team: ContributionTeamInput,
  holes: Hole[],
  gameType: GameType
): TeamContribution {
  const { won, holesScored } = holesWonByPlayer(team, holes, gameType);
  const players: PlayerContribution[] = team.members.map((m) => {
    const value = won.get(m.playerId) ?? 0;
    return {
      playerId: m.playerId,
      playerName: m.playerName,
      value,
      share: holesScored > 0 ? value / holesScored : 0,
      position: 0,
      isMvp: false,
    };
  });
  return { teamId: team.teamId, teamName: team.teamName, color: team.color, players: rank(players) };
}

function computeAggregateTeam(
  team: ContributionTeamInput,
  holes: Hole[]
): TeamContribution {
  const points = new Map<string, number>();
  team.members.forEach((m) => points.set(m.playerId, 0));
  for (const hole of holes) {
    for (const m of team.members) {
      const v = aggregateValue(team.strokesByPlayerHole[m.playerId]?.[hole.number], m.handicap, hole);
      if (v !== null) points.set(m.playerId, (points.get(m.playerId) ?? 0) + v);
    }
  }
  const teamTotal = [...points.values()].reduce((s, v) => s + v, 0);
  const players: PlayerContribution[] = team.members.map((m) => {
    const value = points.get(m.playerId) ?? 0;
    return {
      playerId: m.playerId,
      playerName: m.playerName,
      value,
      share: teamTotal > 0 ? value / teamTotal : 0,
      position: 0,
      isMvp: false,
    };
  });
  return { teamId: team.teamId, teamName: team.teamName, color: team.color, players: rank(players) };
}

function computeRound(round: ContributionRoundInput): RoundContribution {
  const base = {
    roundId: round.roundId,
    roundLabel: round.roundLabel,
    format: round.format,
    metricLabel: METRIC_LABEL[round.format],
  };

  if (round.format === 'aggregate') {
    return {
      ...base,
      teams: round.teams.map((t) => computeAggregateTeam(t, round.holes)),
      dataMissing: false,
    };
  }

  // best-ball (scramble/shamble handled in Task 3 — fall through for now)
  return {
    ...base,
    teams: round.teams.map((t) => computeBestBallTeam(t, round.holes, round.gameType)),
    dataMissing: false,
  };
}

export function computeContributions(input: ComputeContributionsInput): ContributionsBoard {
  const rounds = input.rounds.map(computeRound);
  return {
    rollup: [], // filled in Task 4
    rounds,
    isEmpty: rounds.length === 0,
  };
}
```

```typescript
// src/utils/contributions/index.ts
export * from './types';
export { computeContributions } from './computeContributions';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/utils/contributions/computeContributions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/contributions/
git commit -m "feat(contributions): best-ball and aggregate per-round calc"
```

---

## Task 3: Scramble & shamble per-round contribution

**Files:**
- Modify: `src/utils/contributions/computeContributions.ts`
- Test: `src/utils/contributions/computeContributions.test.ts`

- [ ] **Step 1: Write the failing tests (append to the existing test file)**

```typescript
describe('computeContributions — scramble', () => {
  it('counts shot slots and breaks down by type', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'scramble',
          gameType: 'stroke',
          holes: HOLES,
          teams: [
            {
              teamId: 't1',
              teamName: 'Eagles',
              color: null,
              members: [
                { playerId: 'a', playerName: 'Ann', handicap: 0 },
                { playerId: 'b', playerName: 'Bob', handicap: 0 },
              ],
              strokesByPlayerHole: {},
              shotContributionsByHole: {
                1: { teeShot: 'a', approach: 'a', putt: 'b' },
                2: { teeShot: 'a', approach: 'b', putt: 'b' },
                3: { teeShot: 'b', approach: 'a', putt: 'a' },
              },
            },
          ],
        },
      ],
    });

    const team = board.rounds[0].teams[0];
    const ann = team.players.find((p) => p.playerId === 'a')!;
    const bob = team.players.find((p) => p.playerId === 'b')!;
    // Ann: tee 2, approach 2, putt 1 = 5. Bob: tee 1, approach 1, putt 2 = 4.
    expect(ann.value).toBe(5);
    expect(bob.value).toBe(4);
    expect(ann.shotBreakdown).toEqual({ drives: 2, approaches: 2, putts: 1 });
    expect(ann.share).toBeCloseTo(5 / 9);
    expect(board.rounds[0].dataMissing).toBe(false);
  });

  it('flags dataMissing when no shot contributions exist', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'scramble',
          gameType: 'stroke',
          holes: HOLES,
          teams: [
            {
              teamId: 't1',
              teamName: 'Eagles',
              color: null,
              members: [{ playerId: 'a', playerName: 'Ann', handicap: 0 }],
              strokesByPlayerHole: {},
              shotContributionsByHole: {},
            },
          ],
        },
      ],
    });
    expect(board.rounds[0].dataMissing).toBe(true);
  });
});

describe('computeContributions — shamble', () => {
  it('averages drives-used and holes-won shares', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'shamble',
          gameType: 'stroke',
          holes: HOLES,
          teams: [
            {
              teamId: 't1',
              teamName: 'Eagles',
              color: null,
              members: [
                { playerId: 'a', playerName: 'Ann', handicap: 0 },
                { playerId: 'b', playerName: 'Bob', handicap: 0 },
              ],
              // Ann wins all 3 holes on own ball.
              strokesByPlayerHole: {
                a: { 1: 3, 2: 3, 3: 3 },
                b: { 1: 5, 2: 5, 3: 5 },
              },
              // Drives: Ann 1, Bob 2.
              shotContributionsByHole: {
                1: { teeShot: 'b' },
                2: { teeShot: 'b' },
                3: { teeShot: 'a' },
              },
            },
          ],
        },
      ],
    });
    const ann = board.rounds[0].teams[0].players.find((p) => p.playerId === 'a')!;
    // drives share Ann = 1/3; holes-won share Ann = 3/3 = 1. avg = (1/3 + 1)/2 = 2/3.
    expect(ann.share).toBeCloseTo((1 / 3 + 1) / 2);
    expect(board.rounds[0].drivesMissing).toBe(false);
  });

  it('falls back to holes-won only when drives are missing', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'shamble',
          gameType: 'stroke',
          holes: HOLES,
          teams: [
            {
              teamId: 't1',
              teamName: 'Eagles',
              color: null,
              members: [
                { playerId: 'a', playerName: 'Ann', handicap: 0 },
                { playerId: 'b', playerName: 'Bob', handicap: 0 },
              ],
              strokesByPlayerHole: {
                a: { 1: 3, 2: 3, 3: 3 },
                b: { 1: 5, 2: 5, 3: 5 },
              },
              shotContributionsByHole: {},
            },
          ],
        },
      ],
    });
    const ann = board.rounds[0].teams[0].players.find((p) => p.playerId === 'a')!;
    expect(ann.share).toBeCloseTo(1); // holes-won only
    expect(board.rounds[0].drivesMissing).toBe(true);
    expect(board.rounds[0].dataMissing).toBe(false); // own-ball data present
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/utils/contributions/computeContributions.test.ts`
Expected: FAIL — scramble/shamble currently routed through best-ball path; `shotBreakdown`/`drivesMissing` undefined.

- [ ] **Step 3: Add scramble & shamble implementation**

Add these helpers above `computeRound` in `computeContributions.ts`:

```typescript
import type { ShotBreakdown } from './types';

const SHOT_KEYS = ['teeShot', 'secondShot', 'approach', 'putt'] as const;

function emptyBreakdown(): ShotBreakdown {
  return { drives: 0, approaches: 0, putts: 0 };
}

/** Count shot slots per player. Returns null when nothing was tracked. */
function countShots(
  team: ContributionTeamInput
): { byPlayer: Map<string, ShotBreakdown>; total: number } | null {
  const byPlayer = new Map<string, ShotBreakdown>();
  team.members.forEach((m) => byPlayer.set(m.playerId, emptyBreakdown()));
  let total = 0;
  const holes = team.shotContributionsByHole ?? {};
  for (const slots of Object.values(holes)) {
    for (const key of SHOT_KEYS) {
      const playerId = slots[key];
      if (!playerId) continue;
      const bd = byPlayer.get(playerId);
      if (!bd) continue;
      if (key === 'teeShot') bd.drives += 1;
      else if (key === 'putt') bd.putts += 1;
      else bd.approaches += 1; // secondShot + approach
      total += 1;
    }
  }
  return total === 0 ? null : { byPlayer, total };
}

function computeScrambleTeam(team: ContributionTeamInput): TeamContribution | null {
  const shots = countShots(team);
  if (!shots) return null; // signal data-missing to caller
  const players: PlayerContribution[] = team.members.map((m) => {
    const bd = shots.byPlayer.get(m.playerId) ?? emptyBreakdown();
    const value = bd.drives + bd.approaches + bd.putts;
    return {
      playerId: m.playerId,
      playerName: m.playerName,
      value,
      share: shots.total > 0 ? value / shots.total : 0,
      shotBreakdown: bd,
      position: 0,
      isMvp: false,
    };
  });
  return { teamId: team.teamId, teamName: team.teamName, color: team.color, players: rank(players) };
}

/** Drives-used share per player; null when no tee-shot data. */
function drivesShare(team: ContributionTeamInput): Map<string, number> | null {
  const holes = team.shotContributionsByHole ?? {};
  const counts = new Map<string, number>();
  team.members.forEach((m) => counts.set(m.playerId, 0));
  let total = 0;
  for (const slots of Object.values(holes)) {
    if (!slots.teeShot) continue;
    if (!counts.has(slots.teeShot)) continue;
    counts.set(slots.teeShot, (counts.get(slots.teeShot) ?? 0) + 1);
    total += 1;
  }
  if (total === 0) return null;
  const share = new Map<string, number>();
  counts.forEach((c, id) => share.set(id, c / total));
  return share;
}

function computeShambleTeam(
  team: ContributionTeamInput,
  holes: Hole[],
  gameType: GameType
): { team: TeamContribution; drivesMissing: boolean } {
  const { won, holesScored } = holesWonByPlayer(team, holes, gameType);
  const drives = drivesShare(team);
  const drivesMissing = drives === null;

  const players: PlayerContribution[] = team.members.map((m) => {
    const holesShare = holesScored > 0 ? (won.get(m.playerId) ?? 0) / holesScored : 0;
    const share = drives ? (holesShare + (drives.get(m.playerId) ?? 0)) / 2 : holesShare;
    return {
      playerId: m.playerId,
      playerName: m.playerName,
      value: won.get(m.playerId) ?? 0,
      share,
      position: 0,
      isMvp: false,
    };
  });
  return {
    team: { teamId: team.teamId, teamName: team.teamName, color: team.color, players: rank(players) },
    drivesMissing,
  };
}
```

Replace the body of `computeRound` with format-aware routing:

```typescript
function computeRound(round: ContributionRoundInput): RoundContribution {
  const base = {
    roundId: round.roundId,
    roundLabel: round.roundLabel,
    format: round.format,
    metricLabel: METRIC_LABEL[round.format],
  };

  if (round.format === 'aggregate') {
    return { ...base, teams: round.teams.map((t) => computeAggregateTeam(t, round.holes)), dataMissing: false };
  }

  if (round.format === 'best-ball') {
    return {
      ...base,
      teams: round.teams.map((t) => computeBestBallTeam(t, round.holes, round.gameType)),
      dataMissing: false,
    };
  }

  if (round.format === 'scramble') {
    const teams = round.teams.map((t) => computeScrambleTeam(t)).filter((t): t is TeamContribution => t !== null);
    return { ...base, teams, dataMissing: teams.length === 0 };
  }

  // shamble
  const results = round.teams.map((t) => computeShambleTeam(t, round.holes, round.gameType));
  return {
    ...base,
    teams: results.map((r) => r.team),
    dataMissing: false,
    drivesMissing: results.length > 0 && results.every((r) => r.drivesMissing),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/utils/contributions/computeContributions.test.ts`
Expected: PASS (all best-ball, aggregate, scramble, shamble tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/contributions/
git commit -m "feat(contributions): scramble and shamble per-round calc"
```

---

## Task 4: Competition-wide MVP rollup

**Files:**
- Modify: `src/utils/contributions/computeContributions.ts`
- Test: `src/utils/contributions/computeContributions.test.ts`

- [ ] **Step 1: Write the failing test (append)**

```typescript
describe('computeContributions — rollup', () => {
  it('averages each player share across played rounds, excluding missing rounds', () => {
    const mk = (id: string, format: 'best-ball'): ContributionRoundInput => ({
      roundId: id,
      roundLabel: id.toUpperCase(),
      format,
      gameType: 'stroke',
      holes: HOLES,
      teams: [
        {
          teamId: 't1',
          teamName: 'Eagles',
          color: null,
          members: [
            { playerId: 'a', playerName: 'Ann', handicap: 0 },
            { playerId: 'b', playerName: 'Bob', handicap: 0 },
          ],
          strokesByPlayerHole: {
            a: { 1: 3, 2: 3, 3: 3 }, // Ann wins all 3 → share 1
            b: { 1: 5, 2: 5, 3: 5 }, // Bob share 0
          },
        },
      ],
    });

    // Round 2 is a scramble with no shot data → excluded from rollup.
    const missing: ContributionRoundInput = {
      roundId: 'r2',
      roundLabel: 'R2',
      format: 'scramble',
      gameType: 'stroke',
      holes: HOLES,
      teams: [
        {
          teamId: 't1',
          teamName: 'Eagles',
          color: null,
          members: [{ playerId: 'a', playerName: 'Ann', handicap: 0 }],
          strokesByPlayerHole: {},
          shotContributionsByHole: {},
        },
      ],
    };

    const board = computeContributions({ rounds: [mk('r1', 'best-ball'), missing] });
    const ann = board.rollup.find((r) => r.playerId === 'a')!;
    expect(ann.averageShare).toBeCloseTo(1);
    expect(ann.roundsCounted).toBe(1); // missing round excluded
    expect(ann.isMvp).toBe(true);
    expect(board.rollup[0].playerId).toBe('a'); // sorted desc
    expect(board.isEmpty).toBe(false);
  });

  it('marks isEmpty when every round is data-missing', () => {
    const board = computeContributions({
      rounds: [
        {
          roundId: 'r1',
          roundLabel: 'R1',
          format: 'scramble',
          gameType: 'stroke',
          holes: HOLES,
          teams: [
            {
              teamId: 't1',
              teamName: 'Eagles',
              color: null,
              members: [{ playerId: 'a', playerName: 'Ann', handicap: 0 }],
              strokesByPlayerHole: {},
              shotContributionsByHole: {},
            },
          ],
        },
      ],
    });
    expect(board.rollup).toHaveLength(0);
    expect(board.isEmpty).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/utils/contributions/computeContributions.test.ts`
Expected: FAIL — `board.rollup` is empty / `isEmpty` always derived from round count.

- [ ] **Step 3: Implement the rollup**

Add to `computeContributions.ts`:

```typescript
import type { RollupEntry } from './types';

function buildRollup(rounds: RoundContribution[]): RollupEntry[] {
  // Sum shares per player across non-missing rounds.
  const sum = new Map<string, { name: string; total: number; count: number }>();
  for (const round of rounds) {
    if (round.dataMissing) continue;
    for (const team of round.teams) {
      for (const p of team.players) {
        const cur = sum.get(p.playerId) ?? { name: p.playerName, total: 0, count: 0 };
        cur.total += p.share;
        cur.count += 1;
        cur.name = p.playerName;
        sum.set(p.playerId, cur);
      }
    }
  }

  const entries: RollupEntry[] = [...sum.entries()].map(([playerId, v]) => ({
    playerId,
    playerName: v.name,
    averageShare: v.count > 0 ? v.total / v.count : 0,
    roundsCounted: v.count,
    position: 0,
    isMvp: false,
  }));

  entries.sort((a, b) => b.averageShare - a.averageShare);
  const top = entries.length ? entries[0].averageShare : 0;
  let lastValue = Number.POSITIVE_INFINITY;
  let lastPos = 0;
  entries.forEach((e, i) => {
    if (e.averageShare < lastValue) {
      lastPos = i + 1;
      lastValue = e.averageShare;
    }
    e.position = lastPos;
    e.isMvp = top > 0 && e.averageShare === top;
  });
  return entries;
}
```

Update the exported function:

```typescript
export function computeContributions(input: ComputeContributionsInput): ContributionsBoard {
  const rounds = input.rounds.map(computeRound);
  const rollup = buildRollup(rounds);
  const isEmpty = rounds.every((r) => r.dataMissing);
  return { rollup, rounds, isEmpty };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/utils/contributions/computeContributions.test.ts`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add src/utils/contributions/
git commit -m "feat(contributions): competition-wide MVP rollup"
```

---

## Task 5: Data hook `useCompetitionContributions`

**Files:**
- Modify: `src/hooks/queryKeys/scoring.ts`
- Create: `src/hooks/competitions/useCompetitionContributions.ts`

This hook mirrors `useRingerBoard` (`src/hooks/competitions/useRingerBoard.ts`) — read it first for the exact fetch patterns. It fetches finished scorecards + holes per team-format round + competition teams, then maps them into `ComputeContributionsInput`.

- [ ] **Step 1: Add the query-key factory**

In `src/hooks/queryKeys/scoring.ts`, after the `ringerKeys` block:

```typescript
export const contributionKeys = {
  all: ['contributions'] as const,
  competition: (competitionId: string) =>
    [...contributionKeys.all, 'competition', competitionId] as const,
  roundHoles: (roundId: string) => [...contributionKeys.all, 'roundHoles', roundId] as const,
  scorecards: (roundId: string) => [...contributionKeys.all, 'scorecards', roundId] as const,
  teams: (competitionId: string) => [...contributionKeys.all, 'teams', competitionId] as const,
} as const;
```

- [ ] **Step 2: Write the hook**

```typescript
// src/hooks/competitions/useCompetitionContributions.ts
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useCompetitionDetailsData } from './queries';
import { supabase } from '@/services/supabase/client';
import { getRoundHoles } from '@/services/courses/getRoundHoles';
import { getCompetitionTeams } from '@/services/teams/teamQueries';
import { contributionKeys } from '@/hooks/queryKeys/scoring';
import { computeContributions } from '@/utils/contributions';
import type {
  ComputeContributionsInput,
  ContributionFormat,
  ContributionRoundInput,
  ContributionsBoard,
  ContributionTeamInput,
  HoleShotSlots,
} from '@/utils/contributions';
import type { Scorecard as DBScorecard } from '@/types/database/scorecard.types';
import type { TeamWithMembers } from '@/types/database/team.types';

interface UseCompetitionContributionsResult {
  board: ContributionsBoard | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const TEAM_FORMATS: ContributionFormat[] = ['best-ball', 'scramble', 'shamble', 'aggregate'];

/** Resolve a round's contribution format, or null if it's not a team format. */
function contributionFormat(round: {
  team_format?: string | null;
  game_type?: string;
}): ContributionFormat | null {
  const tf = round.team_format ?? undefined;
  const gt = round.game_type ?? undefined;
  if (tf === 'best-ball' || gt === 'best-ball') return 'best-ball';
  if (tf === 'scramble' || gt === 'scramble') return 'scramble';
  if (tf === 'shamble' || gt === 'shamble') return 'shamble';
  if (tf === 'aggregate') return 'aggregate';
  return null;
}

async function fetchScorecards(roundId: string): Promise<DBScorecard[]> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('round_id', roundId)
    .in('status', ['completed', 'confirmed']);
  if (error) throw new Error(`Failed to fetch scorecards for round ${roundId}: ${error.message}`);
  return (data ?? []) as DBScorecard[];
}

/** Build a team input from a competition team + this round's scorecards. */
function buildTeamInput(
  team: TeamWithMembers,
  scorecards: DBScorecard[]
): ContributionTeamInput {
  const memberIds = new Set((team.members ?? []).map((m) => m.player_id));
  const teamCards = scorecards.filter((sc) => memberIds.has(sc.player_id));

  const strokesByPlayerHole: Record<string, Record<number, number | undefined>> = {};
  const shotContributionsByHole: Record<number, HoleShotSlots> = {};

  for (const card of teamCards) {
    const scores = (card.scores ?? {}) as Record<string, { strokes?: number; shotContributions?: HoleShotSlots }>;
    const perHole: Record<number, number | undefined> = {};
    for (const [holeStr, hs] of Object.entries(scores)) {
      const holeNum = Number(holeStr);
      perHole[holeNum] = hs?.strokes;
      // Shot contributions live on whichever card carries them (the team ball).
      if (hs?.shotContributions) shotContributionsByHole[holeNum] = hs.shotContributions;
    }
    strokesByPlayerHole[card.player_id] = perHole;
  }

  return {
    teamId: team.id,
    teamName: team.name,
    color: team.color ?? null,
    members: (team.members ?? []).map((m) => ({
      playerId: m.player_id,
      playerName: m.player?.name ?? 'Unknown',
      handicap: m.player?.handicap ?? 0,
    })),
    strokesByPlayerHole,
    shotContributionsByHole,
  };
}

export function useCompetitionContributions(
  competitionId: string | undefined
): UseCompetitionContributionsResult {
  const {
    data: compData,
    isLoading: compLoading,
    error: compError,
    refetch: refetchComp,
  } = useCompetitionDetailsData(competitionId);

  const teamRounds = useMemo(() => {
    return (compData?.rounds ?? [])
      .map((r, idx) => ({ round: r, format: contributionFormat(r), label: `R${idx + 1}` }))
      .filter((x): x is { round: typeof x.round; format: ContributionFormat; label: string } =>
        x.format !== null
      );
  }, [compData]);

  const scorecardResults = useQueries({
    queries: teamRounds.map(({ round }) => ({
      queryKey: contributionKeys.scorecards(round.id),
      queryFn: () => fetchScorecards(round.id),
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    })),
  });

  const holeResults = useQueries({
    queries: teamRounds.map(({ round }) => ({
      queryKey: contributionKeys.roundHoles(round.id),
      queryFn: () => getRoundHoles(round.id),
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60,
    })),
  });

  const {
    data: teams,
    isLoading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: contributionKeys.teams(competitionId ?? ''),
    queryFn: () => getCompetitionTeams(competitionId!),
    enabled: !!competitionId,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading =
    compLoading ||
    teamsLoading ||
    scorecardResults.some((q) => q.isLoading) ||
    holeResults.some((q) => q.isLoading);

  const error =
    (compError as Error | null) ??
    (teamsError as Error | null) ??
    (scorecardResults.find((q) => q.error)?.error as Error | undefined) ??
    (holeResults.find((q) => q.error)?.error as Error | undefined) ??
    null;

  const board = useMemo<ContributionsBoard | null>(() => {
    if (isLoading || error) return null;
    const allTeams = teams ?? [];

    const rounds: ContributionRoundInput[] = teamRounds.map(({ round, format, label }, idx) => {
      const cards = scorecardResults[idx]?.data ?? [];
      const teamInputs = allTeams
        .map((t) => buildTeamInput(t, cards))
        // Only teams that actually have a scorecard in this round.
        .filter((t) => Object.keys(t.strokesByPlayerHole).length > 0 || t.shotContributionsByHole);
      return {
        roundId: round.id,
        roundLabel: label,
        format,
        gameType: round.game_type,
        holes: holeResults[idx]?.data ?? [],
        teams: teamInputs,
      };
    });

    const input: ComputeContributionsInput = { rounds };
    return computeContributions(input);
  }, [isLoading, error, teamRounds, scorecardResults, holeResults, teams]);

  const refetch = () => {
    refetchComp();
    refetchTeams();
    scorecardResults.forEach((q) => q.refetch());
    holeResults.forEach((q) => q.refetch());
  };

  return { board, isLoading, error, refetch };
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS (no new errors). If `card.scores` typing is stricter, cast via `as Record<string, ...>` as shown.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/queryKeys/scoring.ts src/hooks/competitions/useCompetitionContributions.ts
git commit -m "feat(contributions): add useCompetitionContributions hook"
```

---

## Task 6: `ContributionsBoard` component

**Files:**
- Create: `src/components/competitions/contributions/ContributionsBoard.tsx`
- Create: `src/components/competitions/contributions/index.ts`

Follow the styling rules in CLAUDE.md: `useThemeColors()` for colors, import `spacing`/`typography`/`borderRadius`/`shadows` from `@/constants/theme`, `TouchableOpacity` (not Paper `Button`). Mirror loading/error handling from `RingerBoard.tsx`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/competitions/contributions/ContributionsBoard.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { ErrorState } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useCompetitionContributions } from '@/hooks/competitions/useCompetitionContributions';
import type { RoundContribution, PlayerContribution } from '@/utils/contributions';

interface ContributionsBoardProps {
  competitionId: string;
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

function fmtValue(p: PlayerContribution, round: RoundContribution): string {
  if (round.format === 'scramble') {
    const b = p.shotBreakdown;
    return b ? `🏌 ${b.drives}  ⛳ ${b.putts}` : '';
  }
  if (round.format === 'aggregate') return `${p.value} pts`;
  // best-ball / shamble: holes won (may be fractional)
  const holes = Number.isInteger(p.value) ? `${p.value}` : p.value.toFixed(1);
  return `${holes} holes`;
}

export function ContributionsBoard({ competitionId }: ContributionsBoardProps) {
  const colors = useThemeColors();
  const { board, isLoading, error, refetch } = useCompetitionContributions(competitionId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <ErrorState
        error={error instanceof Error ? error : new Error('An error occurred')}
        title="Unable to load contributions"
        onRetry={refetch}
      />
    );
  }
  if (!board || board.isEmpty) {
    return (
      <View style={styles.centered}>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          No team-format contributions yet. Play a best ball, scramble, shamble, or aggregate
          round to see who carried the team.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Rollup */}
      <View
        style={[
          styles.rollup,
          { backgroundColor: colors.primary + '22', borderColor: colors.primary },
        ]}
      >
        <Text style={[typography.small, styles.rollupLabel, { color: colors.primary }]}>
          ★ COMPETITION MVP
        </Text>
        {board.rollup.map((r) => (
          <View key={r.playerId} style={styles.rollupRow}>
            <Text style={{ width: 22 }}>{r.isMvp ? '👑' : ''}</Text>
            <Text style={[typography.body, { flex: 1, color: colors.textPrimary }]}>
              {firstName(r.playerName)}
            </Text>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.round(r.averageShare * 100)}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
            <Text style={[typography.bodyBold, { color: colors.primary, width: 48, textAlign: 'right' }]}>
              {pct(r.averageShare)}
            </Text>
          </View>
        ))}
      </View>

      {/* Per-round cards */}
      {board.rounds.map((round) => {
        const isOpen = expanded[round.roundId] ?? false;
        return (
          <TouchableOpacity
            key={round.roundId}
            activeOpacity={round.dataMissing ? 1 : 0.7}
            onPress={() =>
              !round.dataMissing &&
              setExpanded((e) => ({ ...e, [round.roundId]: !isOpen }))
            }
            style={[styles.roundCard, { backgroundColor: colors.surface }, shadows.sm]}
          >
            <View style={styles.roundHeader}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                {round.roundLabel} · {labelForFormat(round.format)}
              </Text>
              {!round.dataMissing && (
                <Icon source={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              )}
            </View>

            {round.dataMissing ? (
              <Text style={[typography.small, { color: colors.warning }]}>
                ⚠ Shot contributions weren't tracked for this round — excluded from MVP.
              </Text>
            ) : (
              round.teams.map((team) => (
                <View key={team.teamId} style={styles.teamBlock}>
                  <Text style={[typography.small, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                    {team.teamName} · {round.metricLabel}
                    {round.drivesMissing ? ' (drives not tracked)' : ''}
                  </Text>
                  {(isOpen ? team.players : team.players.slice(0, 2)).map((p) => (
                    <View key={p.playerId} style={styles.playerRow}>
                      <Text style={[typography.body, { color: colors.textPrimary }]}>
                        {p.isMvp ? '👑 ' : ''}
                        {firstName(p.playerName)}
                      </Text>
                      <Text style={[typography.small, { color: colors.textSecondary }]}>
                        {fmtValue(p, round)} · {pct(p.share)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function labelForFormat(format: RoundContribution['format']): string {
  switch (format) {
    case 'best-ball':
      return 'Best Ball';
    case 'scramble':
      return 'Scramble';
    case 'shamble':
      return 'Shamble';
    case 'aggregate':
      return 'Aggregate';
  }
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  centered: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  rollup: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  rollupLabel: { letterSpacing: 1, marginBottom: spacing.sm },
  rollupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  barTrack: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  roundCard: { borderRadius: borderRadius.lg, padding: spacing.md },
  roundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  teamBlock: { marginTop: spacing.xs },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
});
```

```typescript
// src/components/competitions/contributions/index.ts
export { ContributionsBoard } from './ContributionsBoard';
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS. (If `typography.bodyBold`/`typography.small` names differ, match the actual tokens in `src/constants/theme.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/competitions/contributions/
git commit -m "feat(contributions): ContributionsBoard component"
```

---

## Task 7: Wire into Competition Detail — "Breakdown" tab + segments

**Files:**
- Modify: `src/screens/competitions/CompetitionDetailScreen/index.tsx`

Read lines 54–64 (TabValue), 225–261 (visibility memos), 336–368 (tab list), 491–540 (tab content) before editing.

- [ ] **Step 1: Add the contributions visibility memo**

Near the existing `showRingerTab` memo (~line 237), add:

```typescript
// Contributions needs at least one team-format round.
const showContributionsTab = useMemo(() => {
  const roundsList = competition?.rounds ?? [];
  const teamFormats = ['best-ball', 'scramble', 'shamble', 'aggregate'];
  return roundsList.some(
    (r) => teamFormats.includes(r.team_format ?? '') || teamFormats.includes(r.game_type ?? '')
  );
}, [competition]);

// The Breakdown tab shows if any of its segments are available.
const showBreakdownTab = showRingerTab || showContributionsTab;
```

- [ ] **Step 2: Replace the Ringer tab entry with a Breakdown tab**

In the `tabs={[...]}` array (~line 349), replace the Ringer entry:

```typescript
// before:
// ...(showRingerTab ? [{ key: 'ringer' as const, label: 'Ringer' }] : []),
// after:
...(showBreakdownTab ? [{ key: 'breakdown' as const, label: 'Breakdown' }] : []),
```

Add `'breakdown'` to the `TabValue` union (~line 54):

```typescript
type TabValue =
  | 'details'
  | 'rounds'
  | 'players'
  | 'teams'
  | 'stats'
  | 'leaderboard'
  | 'bracket'
  | 'payouts'
  | 'skins'
  | 'breakdown';
```

(Remove `'ringer'` from the union.)

- [ ] **Step 3: Add the Breakdown tab content with a segmented control**

Replace the existing `{activeTab === 'ringer' && ...}` block (~line 536) with:

```tsx
{activeTab === 'breakdown' && showBreakdownTab && (
  <BreakdownTab
    competitionId={id}
    showRinger={showRingerTab}
    showContributions={showContributionsTab}
  />
)}
```

- [ ] **Step 4: Create the BreakdownTab wrapper component**

Create `src/components/competitions/breakdown/BreakdownTab.tsx`:

```tsx
// src/components/competitions/breakdown/BreakdownTab.tsx
import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { RingerBoard } from '@/components/competitions/ringer';
import { ContributionsBoard } from '@/components/competitions/contributions';

interface BreakdownTabProps {
  competitionId: string;
  showRinger: boolean;
  showContributions: boolean;
}

type Segment = 'ringer' | 'contributions';

export function BreakdownTab({ competitionId, showRinger, showContributions }: BreakdownTabProps) {
  const colors = useThemeColors();
  const segments = useMemo<{ key: Segment; label: string }[]>(() => {
    const s: { key: Segment; label: string }[] = [];
    if (showRinger) s.push({ key: 'ringer', label: 'Ringer' });
    if (showContributions) s.push({ key: 'contributions', label: 'Contributions' });
    return s;
  }, [showRinger, showContributions]);

  const [segment, setSegment] = useState<Segment>(segments[0]?.key ?? 'ringer');
  const active = segments.some((s) => s.key === segment) ? segment : segments[0]?.key;

  return (
    <View>
      {segments.length > 1 && (
        <View style={[styles.toggle, { backgroundColor: colors.surfaceVariant }]}>
          {segments.map((s) => {
            const isActive = active === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.toggleBtn, isActive && { backgroundColor: colors.surface }, isActive && shadows.sm]}
                onPress={() => setSegment(s.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    typography.small,
                    { color: isActive ? colors.textPrimary : colors.textSecondary, fontWeight: isActive ? '600' : '400' },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {active === 'ringer' && <RingerBoard competitionId={competitionId} />}
      {active === 'contributions' && <ContributionsBoard competitionId={competitionId} />}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', borderRadius: borderRadius.lg, padding: 4, marginBottom: spacing.md },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md },
});
```

Add the import at the top of `CompetitionDetailScreen/index.tsx` (replacing the direct `RingerBoard` import if it is no longer used elsewhere in the file):

```typescript
import { BreakdownTab } from '@/components/competitions/breakdown/BreakdownTab';
```

Create the barrel `src/components/competitions/breakdown/index.ts`:

```typescript
export { BreakdownTab } from './BreakdownTab';
```

> Note: `RingerBoard`'s internal Individual/Team toggle stays as-is. The "Team Ringer" segment from the spec remains inside `RingerBoard`'s own toggle; we are not splitting it into a separate top-level segment in v1. Update the spec's segment table footnote if exactness matters.

- [ ] **Step 5: Type-check and run the app smoke path**

Run: `pnpm type-check`
Expected: PASS. Manually verify (or via existing screen tests) that:
- A comp with a best-ball round shows a "Breakdown" tab with Ringer + Contributions segments.
- A scramble-only comp shows "Breakdown" with only the Contributions segment (tab no longer hidden).

- [ ] **Step 6: Commit**

```bash
git add src/screens/competitions/CompetitionDetailScreen/index.tsx src/components/competitions/breakdown/
git commit -m "feat(contributions): Breakdown tab with Ringer + Contributions segments"
```

---

## Task 8: Component tests for ContributionsBoard

**Files:**
- Create: `src/components/competitions/contributions/ContributionsBoard.test.tsx`

Mock the hook so the test is deterministic and doesn't touch Supabase.

- [ ] **Step 1: Write the tests**

```tsx
// src/components/competitions/contributions/ContributionsBoard.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ContributionsBoard } from './ContributionsBoard';
import type { ContributionsBoard as Board } from '@/utils/contributions';

const mockUse = jest.fn();
jest.mock('@/hooks/competitions/useCompetitionContributions', () => ({
  useCompetitionContributions: (id: string) => mockUse(id),
}));

function board(partial: Partial<Board> = {}): Board {
  return {
    rollup: [
      { playerId: 'a', playerName: 'Ann Smith', averageShare: 0.64, roundsCounted: 2, position: 1, isMvp: true },
      { playerId: 'b', playerName: 'Bob Jones', averageShare: 0.36, roundsCounted: 2, position: 2, isMvp: false },
    ],
    rounds: [
      {
        roundId: 'r1',
        roundLabel: 'R1',
        format: 'best-ball',
        metricLabel: 'holes won',
        dataMissing: false,
        teams: [
          {
            teamId: 't1',
            teamName: 'Eagles',
            color: null,
            players: [
              { playerId: 'a', playerName: 'Ann Smith', value: 11, share: 0.61, position: 1, isMvp: true },
              { playerId: 'b', playerName: 'Bob Jones', value: 7, share: 0.39, position: 2, isMvp: false },
            ],
          },
        ],
      },
    ],
    isEmpty: false,
    ...partial,
  };
}

describe('ContributionsBoard', () => {
  beforeEach(() => mockUse.mockReset());

  it('renders the MVP rollup and per-round breakdown', () => {
    mockUse.mockReturnValue({ board: board(), isLoading: false, error: null, refetch: jest.fn() });
    const { getByText, queryAllByText } = render(<ContributionsBoard competitionId="c1" />);
    expect(getByText('★ COMPETITION MVP')).toBeTruthy();
    expect(getByText('64%')).toBeTruthy();
    expect(getByText('R1 · Best Ball')).toBeTruthy();
    expect(queryAllByText(/👑/).length).toBeGreaterThan(0);
  });

  it('shows the not-tracked warning for a data-missing round', () => {
    mockUse.mockReturnValue({
      board: board({
        rounds: [
          { roundId: 'r2', roundLabel: 'R2', format: 'scramble', metricLabel: 'shots used', dataMissing: true, teams: [] },
        ],
      }),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    const { getByText } = render(<ContributionsBoard competitionId="c1" />);
    expect(getByText(/weren't tracked/)).toBeTruthy();
  });

  it('shows empty state', () => {
    mockUse.mockReturnValue({
      board: { rollup: [], rounds: [], isEmpty: true },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    const { getByText } = render(<ContributionsBoard competitionId="c1" />);
    expect(getByText(/No team-format contributions yet/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm test -- src/components/competitions/contributions/ContributionsBoard.test.tsx`
Expected: PASS (3 tests). If render helpers differ, match the project's existing component-test setup (see `RingerBoard` tests or any `*.test.tsx` under `src/components`).

- [ ] **Step 3: Commit**

```bash
git add src/components/competitions/contributions/ContributionsBoard.test.tsx
git commit -m "test(contributions): ContributionsBoard component tests"
```

---

## Final Verification

- [ ] Run the full contributions util + component tests:
  `pnpm test -- src/utils/contributions src/components/competitions/contributions`
  Expected: all PASS.
- [ ] `pnpm type-check` — no new errors.
- [ ] `pnpm lint` — clean for new files.
- [ ] Diff overall Jest run against the known baseline (~243 pre-existing failures on main) — no *new* failures introduced.

---

## Notes & Deviations from Spec

- **Aggregate uses Stableford points** as the share currency (not raw net strokes), so "more = better" reads correctly for stroke-aggregate. This refines the spec's "share of points." Update the spec if you want them perfectly aligned.
- **Team Ringer** remains inside `RingerBoard`'s existing Individual/Team toggle rather than becoming a third top-level segment. v1 ships two top-level segments (Ringer, Contributions). The spec's 3-segment table is aspirational; this is the pragmatic mapping.
- **Tie-splitting** credits 0.5 per tied player on a best-ball/shamble hole, so a row can read "10.5 holes" — matches the approved design's open-question resolution.
- No DB migrations; scramble/shamble accuracy depends on optional shot-tracking (graceful `dataMissing` / `drivesMissing` states cover the gaps).
```
