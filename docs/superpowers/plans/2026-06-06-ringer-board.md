# Ringer Board (Best-of Composite) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Ringer Board" to a competition that, for each hole, takes the best Stableford points across the qualifying rounds (all rounds except Scramble) and assembles an idealised 18-hole composite — one board ranking all individual players, one ranking the teams.

**Architecture:** A pure, fully-tested computation util (`src/utils/ringer/`) does all the work from plain data. A thin data hook (`useRingerBoard`) fetches scorecards + per-round holes + teams via existing services and feeds the util. A self-contained `RingerBoard` component renders an Individual/Teams toggle, a ranked list, and an expandable composite scorecard. It is surfaced as a new tab inside `CompetitionDetailScreen` plus a button on the Details tab. **No database changes.**

**Tech Stack:** TypeScript, React Native, React Native Paper, TanStack Query (`useQueries`), Jest. Reuses the existing Stableford engine (`calculateStablefordPointsNet`, `getStrokesReceived` in `src/utils/scoring.ts`).

**Spec:** `docs/superpowers/specs/2026-06-06-ringer-board-design.md`

---

## Key facts the implementer must know

- **Stableford points per hole** are computed from gross strokes + the hole's par/stroke index + the player's playing handicap. The scorecard stores the playing handicap as `Scorecard.daily_handicap_used` (strokes received for the round). Per-hole strokes received = `getStrokesReceived(daily_handicap_used, hole.strokeIndex)`. Points = `calculateStablefordPointsNet(strokes, hole.par, strokesReceived)`.
- We compute Stableford points **regardless of the round's `game_type`** — this is what unifies the two Stableford rounds and the Best Ball round into one currency. (In Best Ball each player records their own ball, so individual per-hole scores exist.)
- **Pickups** are stored as `strokes === PICKUP_SCORE` (`= 10`, from `src/constants/scoring.ts`). `calculateStablefordPointsNet` naturally returns `0` for them, which is correct — they simply won't win a hole. No special handling needed.
- A **hole with no entry** (`scorecard.scores["7"]` undefined) means "not played" → contributes nothing (null), distinct from a 0-point hole.
- **Scramble rounds are excluded.** Identify them by `round.team_format === 'scramble' || round.game_type === 'scramble'`.
- A competition's rounds may be on **different courses**, so holes (par/stroke index) must be fetched per round.
- The competition is "teams of N" via the `teams` table; `getCompetitionTeams` returns `TeamWithMembers[]` where each `team.members[].player_id` identifies a member.

## File structure

| File | Responsibility |
|---|---|
| `src/utils/ringer/types.ts` | Input/output types for the computation |
| `src/utils/ringer/computeRingerBoard.ts` | Pure best-of computation + per-hole points helper + position assignment |
| `src/utils/ringer/index.ts` | Barrel export |
| `src/utils/ringer/computeRingerBoard.test.ts` | Unit tests (the core of this feature) |
| `src/services/courses/getRoundHoles.ts` | Fetch `Hole[]` (par/stroke index) for a round's course |
| `src/hooks/queryKeys/scoring.ts` | Add `ringerKeys` factory (modify) |
| `src/hooks/queryKeys/index.ts` | Re-export `ringerKeys` (modify, if barrel exists) |
| `src/hooks/competitions/useRingerBoard.ts` | Data hook composing services → util |
| `src/components/competitions/ringer/RingerScorecard.tsx` | Composite 18-hole grid for one entry |
| `src/components/competitions/ringer/RingerBoard.tsx` | Toggle + ranked list + expandable scorecard |
| `src/components/competitions/ringer/index.ts` | Barrel export |
| `src/components/competitions/detail/DetailsTab.tsx` | Add "Ringer Board" button (modify) |
| `src/screens/competitions/CompetitionDetailScreen/index.tsx` | Add `ringer` tab + render block + wire button (modify) |

---

## Task 1: Ringer computation types

**Files:**
- Create: `src/utils/ringer/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/utils/ringer/types.ts
import type { Hole, Scorecard } from '@/types';

/** One qualifying round's data, pre-fetched and ready to score. */
export interface RingerRoundInput {
  roundId: string;
  /** Display label, e.g. 'R1' (position among the competition's rounds). */
  roundLabel: string;
  /** Par + stroke index for this round's course. */
  holes: Hole[];
  /** Individual scorecards for this round (one per player who scored). */
  scorecards: Scorecard[];
}

export interface RingerPlayerMeta {
  playerId: string;
  name: string;
}

export interface RingerTeamInput {
  teamId: string;
  name: string;
  color: string | null;
  memberPlayerIds: string[];
}

/** A single hole of a composite ringer round. */
export interface RingerHole {
  hole: number; // 1..18
  /** Best Stableford points for this hole (0 if the participant has no score). */
  points: number;
  /** Which round the best came from, e.g. 'R2'; null when no score exists. */
  sourceRoundLabel: string | null;
  /** Contributing player (the player themselves for individuals; the best member for teams). */
  sourcePlayerId: string | null;
}

export interface RingerEntry {
  participantId: string;
  participantName: string;
  isTeam: boolean;
  /** Team colour token (e.g. 'avatar-green'); null for individuals. */
  color: string | null;
  /** One entry per covered hole, in ascending hole order. */
  holes: RingerHole[];
  total: number;
  /** 1-indexed standing; ties share a position. */
  position: number;
  tied: boolean;
}

export interface RingerBoardResult {
  individuals: RingerEntry[];
  teams: RingerEntry[];
  /** Labels of the rounds that fed the board, e.g. ['R1','R2','R3']. */
  includedRoundLabels: string[];
  /** Ordered hole numbers covered (usually [1..18]). */
  holeNumbers: number[];
}

export interface ComputeRingerBoardInput {
  rounds: RingerRoundInput[];
  players: RingerPlayerMeta[];
  teams: RingerTeamInput[];
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm type-check`
Expected: PASS (no errors referencing `src/utils/ringer/types.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/utils/ringer/types.ts
git commit -m "feat(ringer): add ringer board computation types"
```

---

## Task 2: Per-hole points helper (TDD)

**Files:**
- Create: `src/utils/ringer/computeRingerBoard.ts`
- Test: `src/utils/ringer/computeRingerBoard.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/ringer/computeRingerBoard.test.ts
import { holeStablefordPoints } from './computeRingerBoard';
import type { Hole, Scorecard } from '@/types';

function hole(number: number, par: 3 | 4 | 5, strokeIndex: number): Hole {
  return { number, par, strokeIndex } as Hole;
}

/** Build a minimal scorecard with the fields the ringer reads. */
function card(
  playerId: string,
  dailyHandicap: number,
  scores: Record<string, { strokes: number }>
): Scorecard {
  return {
    player_id: playerId,
    daily_handicap_used: dailyHandicap,
    scores,
  } as unknown as Scorecard;
}

describe('holeStablefordPoints', () => {
  it('scores a net par as 2 points', () => {
    // par 4, 0 handicap, gross 4 -> net 4 -> par -> 2 pts
    const sc = card('p1', 0, { '1': { strokes: 4 } });
    expect(holeStablefordPoints(sc, hole(1, 4, 1))).toBe(2);
  });

  it('applies a received stroke (handicap) to raise points', () => {
    // par 4, handicap 18 -> 1 stroke on every hole, gross 4 -> net 3 -> birdie -> 3 pts
    const sc = card('p1', 18, { '1': { strokes: 4 } });
    expect(holeStablefordPoints(sc, hole(1, 4, 1))).toBe(3);
  });

  it('returns 0 for a pickup (blow-up) hole', () => {
    // par 4, 0 handicap, gross 10 (PICKUP_SCORE) -> 0 pts
    const sc = card('p1', 0, { '1': { strokes: 10 } });
    expect(holeStablefordPoints(sc, hole(1, 4, 1))).toBe(0);
  });

  it('returns null when the hole was not played', () => {
    const sc = card('p1', 0, { '2': { strokes: 4 } });
    expect(holeStablefordPoints(sc, hole(1, 4, 1))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/utils/ringer/computeRingerBoard.test.ts`
Expected: FAIL — `holeStablefordPoints is not a function` / module not found.

- [ ] **Step 3: Implement the helper**

```typescript
// src/utils/ringer/computeRingerBoard.ts
import { getStrokesReceived, calculateStablefordPointsNet } from '@/utils/scoring';
import { isSingleBallScore } from '@/types/database/base';
import type { Hole, Scorecard } from '@/types';

/**
 * Stableford points a player scored on one hole, or null if the hole was not
 * played. Pickups (stored as PICKUP_SCORE strokes) resolve to 0 via the engine.
 */
export function holeStablefordPoints(scorecard: Scorecard, hole: Hole): number | null {
  const raw = scorecard.scores[String(hole.number)];
  if (!isSingleBallScore(raw)) return null; // undefined or multi-ball -> no individual score
  const strokes = raw.strokes;
  if (!strokes || strokes <= 0) return null;
  const handicap = scorecard.daily_handicap_used ?? 0;
  const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
  return calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/utils/ringer/computeRingerBoard.test.ts`
Expected: PASS (4 passing).

- [ ] **Step 5: Commit**

```bash
git add src/utils/ringer/computeRingerBoard.ts src/utils/ringer/computeRingerBoard.test.ts
git commit -m "feat(ringer): per-hole stableford points helper"
```

---

## Task 3: Individual + team board computation and ranking (TDD)

**Files:**
- Modify: `src/utils/ringer/computeRingerBoard.ts`
- Modify: `src/utils/ringer/computeRingerBoard.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/utils/ringer/computeRingerBoard.test.ts`:

```typescript
import { computeRingerBoard } from './computeRingerBoard';
import type { RingerRoundInput } from './types';

function holes18(): Hole[] {
  // Every hole par 4, stroke index = hole number (so handicap 0 means 0 received strokes everywhere).
  return Array.from({ length: 18 }, (_, i) => hole(i + 1, 4, i + 1));
}

/** A round where the named players each have a flat gross score on every hole. */
function flatRound(
  roundId: string,
  roundLabel: string,
  grossByPlayer: Record<string, number>
): RingerRoundInput {
  const scorecards = Object.entries(grossByPlayer).map(([playerId, gross]) => {
    const scores: Record<string, { strokes: number }> = {};
    for (let h = 1; h <= 18; h++) scores[String(h)] = { strokes: gross };
    return card(playerId, 0, scores);
  });
  return { roundId, roundLabel, holes: holes18(), scorecards };
}

describe('computeRingerBoard - individuals', () => {
  it('takes the best points per hole across rounds and tags the source round', () => {
    // p1: R1 all pars (2 pts/hole), R2 all birdies (3 pts/hole) -> best is R2 everywhere.
    const board = computeRingerBoard({
      rounds: [
        flatRound('r1', 'R1', { p1: 4 }), // par -> 2 pts
        flatRound('r2', 'R2', { p1: 3 }), // birdie -> 3 pts
      ],
      players: [{ playerId: 'p1', name: 'Pat' }],
      teams: [],
    });

    const pat = board.individuals[0];
    expect(pat.total).toBe(18 * 3); // 54
    expect(pat.holes[0].points).toBe(3);
    expect(pat.holes[0].sourceRoundLabel).toBe('R2');
    expect(pat.holes[0].sourcePlayerId).toBe('p1');
    expect(board.includedRoundLabels).toEqual(['R1', 'R2']);
    expect(board.holeNumbers).toHaveLength(18);
  });

  it('falls back to a played round when a player missed a round', () => {
    // p1 only has R1 (pars). R2 has no card for p1.
    const board = computeRingerBoard({
      rounds: [flatRound('r1', 'R1', { p1: 4 }), flatRound('r2', 'R2', { p2: 3 })],
      players: [{ playerId: 'p1', name: 'Pat' }],
      teams: [],
    });
    expect(board.individuals[0].total).toBe(18 * 2);
    expect(board.individuals[0].holes[0].sourceRoundLabel).toBe('R1');
  });

  it('ranks players by total and flags ties', () => {
    const board = computeRingerBoard({
      rounds: [flatRound('r1', 'R1', { p1: 3, p2: 3, p3: 4 })], // p1,p2 birdies; p3 pars
      players: [
        { playerId: 'p1', name: 'Pat' },
        { playerId: 'p2', name: 'Sam' },
        { playerId: 'p3', name: 'Lee' },
      ],
      teams: [],
    });
    const byId = Object.fromEntries(board.individuals.map((e) => [e.participantId, e]));
    expect(byId.p1.position).toBe(1);
    expect(byId.p2.position).toBe(1);
    expect(byId.p1.tied).toBe(true);
    expect(byId.p3.position).toBe(3); // ties consume positions
    expect(byId.p3.tied).toBe(false);
  });
});

describe('computeRingerBoard - teams', () => {
  it('takes the single best across all members and all rounds, tagging the member', () => {
    // Team A = p1,p2. R1: p1 pars(2), p2 birdies(3). R2: p1 eagle(4), p2 pars(2).
    const board = computeRingerBoard({
      rounds: [
        flatRound('r1', 'R1', { p1: 4, p2: 3 }),
        flatRound('r2', 'R2', { p1: 2, p2: 4 }), // p1 gross 2 on a par 4 -> eagle -> 4 pts
      ],
      players: [
        { playerId: 'p1', name: 'Pat' },
        { playerId: 'p2', name: 'Sam' },
      ],
      teams: [{ teamId: 't1', name: 'Team A', color: 'avatar-green', memberPlayerIds: ['p1', 'p2'] }],
    });
    const team = board.teams[0];
    expect(team.holes[0].points).toBe(4); // p1's eagle in R2
    expect(team.holes[0].sourceRoundLabel).toBe('R2');
    expect(team.holes[0].sourcePlayerId).toBe('p1');
    expect(team.total).toBe(18 * 4);
    expect(team.isTeam).toBe(true);
    expect(team.color).toBe('avatar-green');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/utils/ringer/computeRingerBoard.test.ts`
Expected: FAIL — `computeRingerBoard is not a function`.

- [ ] **Step 3: Implement the computation**

Append to `src/utils/ringer/computeRingerBoard.ts`:

```typescript
import type {
  ComputeRingerBoardInput,
  RingerBoardResult,
  RingerEntry,
  RingerHole,
  RingerRoundInput,
} from './types';

interface RoundCtx {
  round: RingerRoundInput;
  holeByNumber: Map<number, Hole>;
  cardByPlayer: Map<string, Scorecard>;
}

function buildRoundCtx(round: RingerRoundInput): RoundCtx {
  const holeByNumber = new Map<number, Hole>();
  round.holes.forEach((h) => holeByNumber.set(h.number, h));
  const cardByPlayer = new Map<string, Scorecard>();
  round.scorecards.forEach((sc) => cardByPlayer.set(sc.player_id, sc));
  return { round, holeByNumber, cardByPlayer };
}

function pointsForPlayer(ctx: RoundCtx, playerId: string, holeNumber: number): number | null {
  const sc = ctx.cardByPlayer.get(playerId);
  if (!sc) return null;
  const hole = ctx.holeByNumber.get(holeNumber);
  if (!hole) return null;
  return holeStablefordPoints(sc, hole);
}

/** Sort entries by total desc and assign shared positions + tie flags in place. */
function assignPositions(entries: RingerEntry[]): void {
  entries.sort((a, b) => b.total - a.total);

  let position = 0;
  let previousTotal: number | null = null;
  entries.forEach((entry, index) => {
    if (previousTotal === null || entry.total !== previousTotal) {
      position = index + 1;
      previousTotal = entry.total;
    }
    entry.position = position;
  });

  const counts = new Map<number, number>();
  entries.forEach((e) => counts.set(e.total, (counts.get(e.total) ?? 0) + 1));
  entries.forEach((e) => {
    e.tied = (counts.get(e.total) ?? 0) > 1;
  });
}

/**
 * Build the individual and team ringer boards: for each hole, the best
 * Stableford points over the relevant pool (a player's rounds, or all of a
 * team's members across all rounds).
 */
export function computeRingerBoard(input: ComputeRingerBoardInput): RingerBoardResult {
  const { rounds, players, teams } = input;
  const roundCtxs = rounds.map(buildRoundCtx);

  const holeSet = new Set<number>();
  rounds.forEach((r) => r.holes.forEach((h) => holeSet.add(h.number)));
  const holeNumbers = Array.from(holeSet).sort((a, b) => a - b);

  const individuals: RingerEntry[] = players.map((player) => {
    const holes: RingerHole[] = holeNumbers.map((holeNumber) => {
      let best = -1;
      let sourceRoundLabel: string | null = null;
      for (const ctx of roundCtxs) {
        const pts = pointsForPlayer(ctx, player.playerId, holeNumber);
        if (pts !== null && pts > best) {
          best = pts;
          sourceRoundLabel = ctx.round.roundLabel;
        }
      }
      return {
        hole: holeNumber,
        points: best < 0 ? 0 : best,
        sourceRoundLabel,
        sourcePlayerId: sourceRoundLabel ? player.playerId : null,
      };
    });
    return {
      participantId: player.playerId,
      participantName: player.name,
      isTeam: false,
      color: null,
      holes,
      total: holes.reduce((sum, h) => sum + h.points, 0),
      position: 0,
      tied: false,
    };
  });

  const teamEntries: RingerEntry[] = teams.map((team) => {
    const holes: RingerHole[] = holeNumbers.map((holeNumber) => {
      let best = -1;
      let sourceRoundLabel: string | null = null;
      let sourcePlayerId: string | null = null;
      for (const ctx of roundCtxs) {
        for (const memberId of team.memberPlayerIds) {
          const pts = pointsForPlayer(ctx, memberId, holeNumber);
          if (pts !== null && pts > best) {
            best = pts;
            sourceRoundLabel = ctx.round.roundLabel;
            sourcePlayerId = memberId;
          }
        }
      }
      return { hole: holeNumber, points: best < 0 ? 0 : best, sourceRoundLabel, sourcePlayerId };
    });
    return {
      participantId: team.teamId,
      participantName: team.name,
      isTeam: true,
      color: team.color,
      holes,
      total: holes.reduce((sum, h) => sum + h.points, 0),
      position: 0,
      tied: false,
    };
  });

  assignPositions(individuals);
  assignPositions(teamEntries);

  return {
    individuals,
    teams: teamEntries,
    includedRoundLabels: rounds.map((r) => r.roundLabel),
    holeNumbers,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/utils/ringer/computeRingerBoard.test.ts`
Expected: PASS (all individual + team tests green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/ringer/computeRingerBoard.ts src/utils/ringer/computeRingerBoard.test.ts
git commit -m "feat(ringer): individual and team board computation with ranking"
```

---

## Task 4: Barrel export for the util

**Files:**
- Create: `src/utils/ringer/index.ts`

- [ ] **Step 1: Write the barrel**

```typescript
// src/utils/ringer/index.ts
export * from './types';
export { computeRingerBoard, holeStablefordPoints } from './computeRingerBoard';
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/utils/ringer/index.ts
git commit -m "feat(ringer): barrel export for ringer util"
```

---

## Task 5: `getRoundHoles` service

**Files:**
- Create: `src/services/courses/getRoundHoles.ts`

> Note: This is a thin Supabase wrapper (mirrors the course fetch in `src/hooks/scorecard/useRoundCourse.ts`, minus tee-yardage hydration, which the ringer does not need). It is validated by `pnpm type-check` and the manual verification in Task 10; a unit test would only exercise a Supabase mock, so none is added here.

- [ ] **Step 1: Write the service**

```typescript
// src/services/courses/getRoundHoles.ts
import { supabase } from '@/services/supabase/client';
import { transformHolesIfNeeded } from '@/utils/holeTransformers';
import { DEFAULT_HOLES } from '@/types/supabase/roundQueries';
import type { Hole } from '@/types';

/**
 * Fetch the holes (par + stroke index) for a round's course.
 * Falls back to DEFAULT_HOLES when the course has no hole data.
 */
export async function getRoundHoles(roundId: string): Promise<Hole[]> {
  const { data, error } = (await supabase
    .from('rounds')
    .select(
      `
      courses!course_id (
        id,
        name,
        holes
      )
    `
    )
    .eq('id', roundId)
    .single()) as {
    data: { courses: { id: string; name: string; holes: Hole[] | null } | null } | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(`Failed to load round holes: ${error.message}`);
  }

  const rawHoles = data?.courses?.holes;
  return Array.isArray(rawHoles) && rawHoles.length > 0
    ? transformHolesIfNeeded(rawHoles)
    : DEFAULT_HOLES;
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm type-check`
Expected: PASS. (If `transformHolesIfNeeded` or `DEFAULT_HOLES` import paths error, confirm them against `src/hooks/scorecard/useRoundCourse.ts`, which imports `transformHolesIfNeeded` from `@/utils/holeTransformers` and `DEFAULT_HOLES` from `@/types/supabase/roundQueries`.)

- [ ] **Step 3: Commit**

```bash
git add src/services/courses/getRoundHoles.ts
git commit -m "feat(ringer): add getRoundHoles service"
```

---

## Task 6: `ringerKeys` query-key factory

**Files:**
- Modify: `src/hooks/queryKeys/scoring.ts`
- Modify: `src/hooks/queryKeys/index.ts` (only if a barrel exists there)

- [ ] **Step 1: Add the factory**

Append to `src/hooks/queryKeys/scoring.ts` (alongside `scorecardKeys` / `leaderboardKeys`):

```typescript
export const ringerKeys = {
  all: ['ringer'] as const,
  competition: (competitionId: string) => [...ringerKeys.all, 'competition', competitionId] as const,
  roundHoles: (roundId: string) => [...ringerKeys.all, 'roundHoles', roundId] as const,
  teams: (competitionId: string) => [...ringerKeys.all, 'teams', competitionId] as const,
} as const;
```

- [ ] **Step 2: Re-export from the barrel if present**

Check `src/hooks/queryKeys/index.ts`. If it re-exports the other key factories (e.g. `export { scorecardKeys, leaderboardKeys } from './scoring'` or `export * from './scoring'`), ensure `ringerKeys` is included. If it uses `export *`, no change is needed. If it lists names explicitly, add `ringerKeys` to that list.

Run: `grep -n "scorecardKeys\|export \*\|ringerKeys" src/hooks/queryKeys/index.ts`
Expected: confirm `ringerKeys` is reachable from `@/hooks/queryKeys`.

- [ ] **Step 3: Verify type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/queryKeys/scoring.ts src/hooks/queryKeys/index.ts
git commit -m "feat(ringer): add ringerKeys query-key factory"
```

---

## Task 7: `useRingerBoard` data hook

**Files:**
- Create: `src/hooks/competitions/useRingerBoard.ts`

- [ ] **Step 1: Write the hook**

```typescript
// src/hooks/competitions/useRingerBoard.ts
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useCompetitionDetailsData } from './queries';
import { getScorecardsByRound } from '@/services/offline/database';
import { getRoundHoles } from '@/services/courses/getRoundHoles';
import { getCompetitionTeams } from '@/services/teams/teamQueries';
import { scorecardKeys, ringerKeys } from '@/hooks/queryKeys';
import { computeRingerBoard } from '@/utils/ringer';
import type { RingerBoardResult, RingerRoundInput } from '@/utils/ringer';
import type { Hole, Scorecard } from '@/types';

interface UseRingerBoardResult {
  board: RingerBoardResult | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** A Scramble round produces a single team ball, not individual scorecards. */
function isScramble(round: { team_format?: string | null; game_type?: string }): boolean {
  return round.team_format === 'scramble' || round.game_type === 'scramble';
}

export function useRingerBoard(competitionId: string | undefined): UseRingerBoardResult {
  const {
    data: compData,
    isLoading: compLoading,
    error: compError,
    refetch: refetchComp,
  } = useCompetitionDetailsData(competitionId);

  // Stable labels: number every round by its position in the full rounds list,
  // so labels (R1..R4) match what users see even though Scramble is excluded.
  const roundLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    (compData?.rounds ?? []).forEach((r, idx) => {
      map[r.id] = `R${idx + 1}`;
    });
    return map;
  }, [compData]);

  const qualifyingRounds = useMemo(
    () => (compData?.rounds ?? []).filter((r) => !isScramble(r)),
    [compData]
  );

  const scorecardResults = useQueries({
    queries: qualifyingRounds.map((r) => ({
      queryKey: scorecardKeys.list({ roundId: r.id }),
      queryFn: () => getScorecardsByRound(r.id),
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    })),
  });

  const holeResults = useQueries({
    queries: qualifyingRounds.map((r) => ({
      queryKey: ringerKeys.roundHoles(r.id),
      queryFn: () => getRoundHoles(r.id),
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
    queryKey: ringerKeys.teams(competitionId ?? ''),
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

  const board = useMemo<RingerBoardResult | null>(() => {
    if (isLoading || error) return null;

    const rounds: RingerRoundInput[] = qualifyingRounds.map((r, idx) => ({
      roundId: r.id,
      roundLabel: roundLabelById[r.id] ?? `R${idx + 1}`,
      holes: (holeResults[idx]?.data ?? []) as Hole[],
      scorecards: (scorecardResults[idx]?.data ?? []) as Scorecard[],
    }));

    const players = (compData?.players ?? []).map((cp) => ({
      playerId: cp.player_id,
      name: (cp as { player?: { name?: string } | null }).player?.name ?? 'Unknown',
    }));

    const teamInputs = (teams ?? []).map((t) => ({
      teamId: t.id,
      name: t.name,
      color: t.color,
      memberPlayerIds: (t.members ?? []).map((m) => m.player_id),
    }));

    return computeRingerBoard({ rounds, players, teams: teamInputs });
  }, [
    isLoading,
    error,
    qualifyingRounds,
    roundLabelById,
    holeResults,
    scorecardResults,
    compData,
    teams,
  ]);

  const refetch = () => {
    refetchComp?.();
    refetchTeams?.();
    scorecardResults.forEach((q) => q.refetch());
    holeResults.forEach((q) => q.refetch());
  };

  return { board, isLoading, error, refetch };
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm type-check`
Expected: PASS. Common fixups if it errors:
- `getScorecardsByRound` is exported from `@/services/offline/database` (re-exported from the ScorecardDAO). Confirm with `grep -n "getScorecardsByRound" src/services/offline/database.ts`.
- `useCompetitionDetailsData` returns `{ data: { competition, rounds, players }, ... }` from `src/hooks/competitions/queries.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/competitions/useRingerBoard.ts
git commit -m "feat(ringer): add useRingerBoard data hook"
```

---

## Task 8: `RingerScorecard` composite grid component

**Files:**
- Create: `src/components/competitions/ringer/RingerScorecard.tsx`

- [ ] **Step 1: Write the component**

```typescript
// src/components/competitions/ringer/RingerScorecard.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RingerEntry } from '@/utils/ringer';

interface RingerScorecardProps {
  entry: RingerEntry;
  /** Resolve a player id to a short display name (for team source tags). */
  shortNameFor: (playerId: string | null) => string;
}

/** Horizontal 18-hole composite card: hole number, best points, source tag. */
export const RingerScorecard = React.memo(function RingerScorecard({
  entry,
  shortNameFor,
}: RingerScorecardProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {entry.holes.map((h) => {
        const tag =
          h.sourceRoundLabel === null
            ? '—'
            : entry.isTeam
              ? `${h.sourceRoundLabel} · ${shortNameFor(h.sourcePlayerId)}`
              : h.sourceRoundLabel;
        return (
          <View
            key={h.hole}
            style={[styles.cell, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{h.hole}</Text>
            <Text style={[typography.h4, { color: colors.textPrimary }]}>{h.points}</Text>
            <Text style={[styles.tag, { color: colors.textMuted }]} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        );
      })}
      <View
        style={[
          styles.cell,
          styles.totalCell,
          { borderColor: colors.primary, backgroundColor: colors.surface },
        ]}
      >
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Total</Text>
        <Text style={[typography.h4, { color: colors.primary }]}>{entry.total}</Text>
        <Text style={[styles.tag, { color: colors.textMuted }]}>pts</Text>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  cell: {
    width: 56,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    gap: 2,
  },
  totalCell: {
    borderWidth: 2,
  },
  tag: {
    fontSize: 10,
    maxWidth: 52,
  },
});

export default RingerScorecard;
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/competitions/ringer/RingerScorecard.tsx
git commit -m "feat(ringer): composite scorecard grid component"
```

---

## Task 9: `RingerBoard` component + barrel

**Files:**
- Create: `src/components/competitions/ringer/RingerBoard.tsx`
- Create: `src/components/competitions/ringer/index.ts`

- [ ] **Step 1: Write the main component**

```typescript
// src/components/competitions/ringer/RingerBoard.tsx
import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { ErrorState } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useRingerBoard } from '@/hooks/competitions/useRingerBoard';
import type { RingerEntry } from '@/utils/ringer';
import { RingerScorecard } from './RingerScorecard';

interface RingerBoardProps {
  competitionId: string;
}

type RingerView = 'individuals' | 'teams';

function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

export function RingerBoard({ competitionId }: RingerBoardProps) {
  const colors = useThemeColors();
  const { board, isLoading, error, refetch } = useRingerBoard(competitionId);
  const [view, setView] = useState<RingerView>('individuals');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // playerId -> short name, from the individual entries (one per player).
  const shortNameById = useMemo(() => {
    const map = new Map<string, string>();
    board?.individuals.forEach((e) => map.set(e.participantId, firstName(e.participantName)));
    return map;
  }, [board]);

  const shortNameFor = (playerId: string | null) =>
    playerId ? (shortNameById.get(playerId) ?? '—') : '—';

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
        error={error instanceof Error ? error : 'An error occurred'}
        title="Unable to load ringer board"
        onRetry={refetch}
      />
    );
  }

  const entries: RingerEntry[] =
    view === 'individuals' ? (board?.individuals ?? []) : (board?.teams ?? []);

  const hasRounds = (board?.includedRoundLabels.length ?? 0) > 0;

  return (
    <View>
      {/* Segmented toggle */}
      <View style={[styles.toggle, { backgroundColor: colors.surfaceVariant }]}>
        {(['individuals', 'teams'] as RingerView[]).map((v) => {
          const active = view === v;
          return (
            <TouchableOpacity
              key={v}
              style={[styles.toggleBtn, active && { backgroundColor: colors.surface }, active && shadows.sm]}
              onPress={() => {
                setView(v);
                setExpandedId(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={v === 'individuals' ? 'Individual ringer' : 'Team ringer'}
            >
              <Text
                style={[
                  typography.small,
                  { color: active ? colors.textPrimary : colors.textSecondary, fontWeight: active ? '600' : '400' },
                ]}
              >
                {v === 'individuals' ? 'Individual' : 'Teams'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {hasRounds && (
        <Text style={[typography.caption, styles.caption, { color: colors.textSecondary }]}>
          Best score on each hole across {board?.includedRoundLabels.join(', ')}
        </Text>
      )}

      {entries.length === 0 ? (
        <Text style={[typography.body, styles.empty, { color: colors.textSecondary }]}>
          No scores yet. The ringer board fills in as rounds are played.
        </Text>
      ) : (
        entries.map((entry) => {
          const expanded = expandedId === entry.participantId;
          return (
            <View key={entry.participantId} style={[styles.card, shadows.sm, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpandedId(expanded ? null : entry.participantId)}
                accessibilityRole="button"
                accessibilityLabel={`${entry.participantName}, ${entry.total} points, position ${entry.position}`}
              >
                <Text style={[styles.position, typography.body, { color: colors.textSecondary }]}>
                  {entry.tied ? `T${entry.position}` : entry.position}
                </Text>
                <Text style={[typography.body, styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                  {entry.participantName}
                </Text>
                <Text style={[typography.h4, { color: colors.primary }]}>{entry.total}</Text>
                <Icon
                  source={expanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {expanded && <RingerScorecard entry={entry} shortNameFor={shortNameFor} />}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: spacing.xxl, alignItems: 'center' },
  toggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  caption: { marginBottom: spacing.md },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
  card: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  position: { width: 32 },
  name: { flex: 1 },
});

export default RingerBoard;
```

- [ ] **Step 2: Write the barrel**

```typescript
// src/components/competitions/ringer/index.ts
export { RingerBoard } from './RingerBoard';
export { RingerScorecard } from './RingerScorecard';
```

- [ ] **Step 3: Verify type-check**

Run: `pnpm type-check`
Expected: PASS. If `ErrorState` is not exported from `@/components/common`, confirm its location with `grep -rn "export.*ErrorState" src/components/common/` (it is used by `src/screens/competitions/LeaderboardScreen.tsx`).

- [ ] **Step 4: Commit**

```bash
git add src/components/competitions/ringer/
git commit -m "feat(ringer): RingerBoard component with toggle and rankings"
```

---

## Task 10: Wire into CompetitionDetailScreen (tab + button)

**Files:**
- Modify: `src/screens/competitions/CompetitionDetailScreen/index.tsx`
- Modify: `src/components/competitions/detail/DetailsTab.tsx`

- [ ] **Step 1: Add `'ringer'` to the `TabValue` union**

In `src/screens/competitions/CompetitionDetailScreen/index.tsx`, extend the union (currently ends at `| 'skins';`):

```typescript
type TabValue =
  | 'details'
  | 'rounds'
  | 'players'
  | 'teams'
  | 'leaderboard'
  | 'bracket'
  | 'stats'
  | 'payouts'
  | 'skins'
  | 'ringer';
```

- [ ] **Step 2: Import `RingerBoard` and compute `showRingerTab`**

Add the import near the other component imports at the top of the file:

```typescript
import { RingerBoard } from '@/components/competitions/ringer';
```

Then, near where `showStatsTab` is derived (around line 245), add:

```typescript
// Ringer board needs at least one non-scramble round to draw from.
const showRingerTab = useMemo(
  () =>
    (rounds ?? []).some(
      (r) => r.team_format !== 'scramble' && r.game_type !== 'scramble'
    ),
  [rounds]
);
```

(If `useMemo` is not already imported from `react` in this file, add it. `rounds` is already in scope — it is passed to `DetailsTab` and `RoundsTab`.)

- [ ] **Step 3: Add the tab to the `tabs` array**

In the `tabs` array (around lines 326–352), add a Ringer entry after the Stats tab entry:

```typescript
...(showRingerTab ? [{ key: 'ringer' as const, label: 'Ringer' }] : []),
```

- [ ] **Step 4: Add the render block**

After the `{activeTab === 'skins' && ...}` block (around line 520), before the closing `</ScrollView>`, add:

```typescript
        {activeTab === 'ringer' && showRingerTab && (
          <RingerBoard competitionId={id} />
        )}
```

- [ ] **Step 5: Add the `onViewRinger` prop to `DetailsTab` and a button**

In `src/components/competitions/detail/DetailsTab.tsx`:

(a) Update the imports at the top:

```typescript
import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
```

(b) Add the prop to `DetailsTabProps` (next to `onViewTeams`):

```typescript
  /** Switches to the Ringer tab. Omitted when no qualifying rounds exist. */
  onViewRinger?: () => void;
```

(c) Add `onViewRinger` to the destructured params (next to `onViewTeams,`):

```typescript
  onViewRinger,
```

(d) Add `const colors = useThemeColors();` at the top of the component body (first line inside the function, before `showMiniLeaderboard`).

(e) Render the button inside the returned `<View>`, immediately after `<WhatsAppGroupSection ... />`:

```typescript
      {onViewRinger && (
        <TouchableOpacity
          onPress={onViewRinger}
          style={[styles.ringerCta, shadows.sm, { backgroundColor: colors.surface }]}
          accessibilityRole="button"
          accessibilityLabel="View ringer board"
        >
          <Icon source="trophy-outline" size={22} color={colors.primary} />
          <View style={styles.ringerCtaText}>
            <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
              Ringer Board
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Best score on each hole across the rounds
            </Text>
          </View>
          <Icon source="chevron-right" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
```

(f) Add a `StyleSheet` at the bottom of the file (the file currently has no styles). If a `StyleSheet.create` already exists, add these keys to it instead:

```typescript
const styles = StyleSheet.create({
  ringerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  ringerCtaText: {
    flex: 1,
  },
});
```

- [ ] **Step 6: Pass `onViewRinger` from the screen into `DetailsTab`**

Back in `CompetitionDetailScreen/index.tsx`, in the `<DetailsTab ... />` JSX (around lines 392–419), add the prop next to `onViewTeams`:

```typescript
            onViewRinger={showRingerTab ? () => setActiveTab('ringer') : undefined}
```

- [ ] **Step 7: Verify type-check and lint**

Run: `pnpm type-check`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS (no new errors in the files touched by this plan).

- [ ] **Step 8: Commit**

```bash
git add src/screens/competitions/CompetitionDetailScreen/index.tsx src/components/competitions/detail/DetailsTab.tsx
git commit -m "feat(ringer): surface ringer board as competition tab and button"
```

---

## Task 11: Full verification

- [ ] **Step 1: Run the ringer unit tests**

Run: `pnpm test src/utils/ringer/computeRingerBoard.test.ts`
Expected: PASS (all suites green).

- [ ] **Step 2: Type-check and lint the whole project**

Run: `pnpm type-check && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Manual smoke test (device/simulator)**

Run: `npx expo start --ios` (or the team's usual dev command), then:
1. Open a competition that has at least one non-Scramble round with scores.
2. Confirm a **Ringer** tab appears, and the **Ringer Board** button appears on the Details tab.
3. Tap the button → it switches to the Ringer tab.
4. Toggle **Individual / Teams**; confirm rankings and totals look right.
5. Tap an entry → the composite 18-hole card expands; confirm each hole shows the best points and a source tag (`R2` for individuals, `R1 · Name` for teams).
6. Confirm a competition with only a Scramble round shows **no** Ringer tab.

- [ ] **Step 4: Final commit (if any manual fixups were needed)**

```bash
git add -A
git commit -m "fix(ringer): manual verification fixups"
```

---

## Self-review notes (addressed)

- **Spec coverage:** metric = Stableford points (Task 2); auto-exclude Scramble (Task 7 `isScramble`, Task 10 `showRingerTab`); individual board (Task 3); team board = max over 4 members × rounds (Task 3); source tags R# / R#·Name (Tasks 8–9); edge cases — pickup→0 and unplayed→null (Task 2 tests), missed round (Task 3 test), ties (Task 3 test); UI toggle + ranked list + composite card (Tasks 8–9); tab + button entry points (Task 10); unit tests (Tasks 2–3). No persisted table / manual round selection (out of scope, per spec).
- **Type consistency:** `holeStablefordPoints` and `computeRingerBoard` names are consistent across util, tests, and hook. `RingerEntry`/`RingerHole`/`RingerBoardResult` field names match between `types.ts`, the computation, and the components. `ringerKeys.roundHoles`/`ringerKeys.teams` are defined in Task 6 and used in Task 7.
- **Pickups:** relies on `calculateStablefordPointsNet` returning 0 for `PICKUP_SCORE` (10) strokes — verified against `src/utils/scoring.ts` (relative-to-par ≥ 2 → 0).
