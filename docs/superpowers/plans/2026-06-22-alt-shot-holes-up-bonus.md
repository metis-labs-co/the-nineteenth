# Alt-Shot Stroke-Play Holes-Up Bonus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the combined-margin bonus point work for alt-shot **stroke play** by deriving a per-hole holes-up margin from the one-ball net scores (which never persist `final_differential`).

**Architecture:** Add a pure helper `computeAltShotHolesUpMargin` that builds a match-play view from alt-shot one-ball gross + the existing 50%-combined handicap model (rounded difference allocated per hole by stroke index). Wire it into `finalizePairResults`' bonus-margin accumulation as a fallback when `sub_matches.final_differential` is absent and the round is alt-shot. The downstream award/leaderboard logic is unchanged.

**Tech Stack:** TypeScript, Jest. Pure functions (no IO).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-22-alt-shot-holes-up-bonus-design.md`.
- **Do all work in a dedicated git worktree off `main`** (per user workflow rule). Never edit feature code on the shared main checkout.
- **No UI, no type, no DB-migration changes.** Only `pairPointsCalculation.ts` (new helper) + `finalizePairResults.ts` (wiring) + their tests.
- **Handicap basis:** side handicaps via `calculateAltShotTeamHandicap` (50%-combined, 1dp); allocate `Math.round(Math.abs(aHc - bHc))` strokes to the **higher-handicap** side **per hole** via `getStrokesReceived(diff, hole.strokeIndex)`.
- **Holes-up margin** is signed from side A's perspective (positive = side A ahead); halved holes contribute 0; `null` when no hole is comparable.
- **The 1-pt match result is unchanged** (still total net via `resolveAltShotSubMatchOutcome`). **The persisted-`final_differential` path (singles / true match play) must remain unchanged.**
- Wrap-up after each task: `pnpm type-check` clean and the task's tests pass before committing.

---

## File Structure

**Modify:**
- `src/services/rounds/pairPointsCalculation.ts` — add exported `computeAltShotHolesUpMargin`; add `getStrokesReceived` import.
- `src/services/rounds/finalizePairResults.ts` — extend the bonus-margin accumulation block to fall back to the alt-shot helper; add `computeAltShotHolesUpMargin` to the existing `./pairPointsCalculation` import.

**Test:**
- `src/__tests__/services/rounds/pairPointsCalculation.test.ts` — add unit tests for the new helper.
- `src/__tests__/services/rounds/finalizePairResults.test.ts` — add an alt-shot stroke-play bonus integration case.

---

## Task 1: Pure `computeAltShotHolesUpMargin` helper

**Files:**
- Modify: `src/services/rounds/pairPointsCalculation.ts`
- Test: `src/__tests__/services/rounds/pairPointsCalculation.test.ts`

**Interfaces:**
- Consumes: `Hole` (`@/types/database.types`), `calculateAltShotTeamHandicap` (already imported in the file), `getStrokesReceived` (`@/utils/scoring`), and the file's existing module-private `sideTeamHandicap(playerIds, dailyHandicaps)`.
- Produces:
  ```ts
  export function computeAltShotHolesUpMargin(params: {
    teamAPlayerIds: string[];
    teamBPlayerIds: string[];
    holes: Hole[];
    getGross: (playerId: string, hole: Hole) => number | null;
    dailyHandicaps: Map<string, number>;
  }): number | null
  ```
  Returns signed holes-up margin (side A perspective; positive = A ahead), or `null` if no hole is comparable.

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/services/rounds/pairPointsCalculation.test.ts` (add `computeAltShotHolesUpMargin` to the existing import from `@/services/rounds/pairPointsCalculation`, and import `Hole` if not already):

```ts
import type { Hole } from '@/types/database.types';
import { computeAltShotHolesUpMargin } from '@/services/rounds/pairPointsCalculation';

describe('computeAltShotHolesUpMargin', () => {
  const HOLES: Hole[] = [
    { number: 1, par: 4, strokeIndex: 1 },
    { number: 2, par: 4, strokeIndex: 2 },
    { number: 3, par: 4, strokeIndex: 3 },
  ];

  // gross lookup from { playerId: [h1, h2, h3] }; missing player/hole → null.
  function grossFn(table: Record<string, (number | null)[]>) {
    return (playerId: string, hole: Hole): number | null => {
      const row = table[playerId];
      if (!row) return null;
      const v = row[hole.number - 1];
      return v == null ? null : v;
    };
  }

  const levelHc = new Map<string, number>([
    ['a1', 0], ['a2', 0], ['b1', 0], ['b2', 0],
  ]);

  it('returns +holes when side A wins more holes (level handicaps)', () => {
    const margin = computeAltShotHolesUpMargin({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [4, 4, 4], b1: [5, 5, 5] }),
      dailyHandicaps: levelHc,
    });
    expect(margin).toBe(3); // A wins all 3 holes
  });

  it('returns -holes when side B wins more holes', () => {
    const margin = computeAltShotHolesUpMargin({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [5, 5, 5], b1: [4, 4, 4] }),
      dailyHandicaps: levelHc,
    });
    expect(margin).toBe(-3);
  });

  it('counts halved holes as 0', () => {
    const margin = computeAltShotHolesUpMargin({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      // h1 4=4 halve; h2 A5>B4 → B; h3 A4<B5 → A  → 1 - 1 = 0
      getGross: grossFn({ a1: [4, 5, 4], b1: [4, 4, 5] }),
      dailyHandicaps: levelHc,
    });
    expect(margin).toBe(0);
  });

  it('applies a handicap stroke by stroke index, flipping a hole', () => {
    // Side A team handicap = (2 + 0) * 0.5 = 1 → receives 1 stroke on SI 1 (hole 1).
    // Equal gross everywhere; only hole 1 flips to A on net. → margin +1.
    const margin = computeAltShotHolesUpMargin({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [4, 4, 4], b1: [4, 4, 4] }),
      dailyHandicaps: new Map([['a1', 2], ['a2', 0], ['b1', 0], ['b2', 0]]),
    });
    expect(margin).toBe(1);
  });

  it('returns null when no hole is comparable (incomplete)', () => {
    const margin = computeAltShotHolesUpMargin({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [4, 4, 4] }), // side B has no scores
      dailyHandicaps: levelHc,
    });
    expect(margin).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `pnpm jest src/__tests__/services/rounds/pairPointsCalculation.test.ts -t "computeAltShotHolesUpMargin"`
Expected: FAIL — `computeAltShotHolesUpMargin` is not exported.

- [ ] **Step 3: Implement the helper**

In `src/services/rounds/pairPointsCalculation.ts`: add the import near the top (after the existing imports):

```ts
import { getStrokesReceived } from '@/utils/scoring';
```

Then add this exported function (place it after the existing module-private `sideTeamHandicap`, so it can call it):

```ts
/**
 * Per-hole holes-up margin for an alt-shot (foursomes) sub-match scored as stroke
 * play. Builds a match-play view from the one-ball gross: each side's net per hole
 * (the higher-combined-handicap side receives the rounded handicap difference,
 * allocated per hole by stroke index), lower net wins the hole, equal halves.
 *
 * Returns the signed margin from side A's perspective (positive = A ahead), or
 * null when no hole has a usable gross for both sides (incomplete → no bonus).
 */
export function computeAltShotHolesUpMargin(params: {
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  holes: Hole[];
  getGross: (playerId: string, hole: Hole) => number | null;
  dailyHandicaps: Map<string, number>;
}): number | null {
  const { teamAPlayerIds, teamBPlayerIds, holes, getGross, dailyHandicaps } = params;

  const aHc = sideTeamHandicap(teamAPlayerIds, dailyHandicaps);
  const bHc = sideTeamHandicap(teamBPlayerIds, dailyHandicaps);
  const diff = Math.round(Math.abs(aHc - bHc));
  const aReceives = aHc > bHc; // higher-handicap side receives the strokes

  // One ball per side: first partner with a recorded gross on the hole.
  const sideHoleGross = (playerIds: string[], hole: Hole): number | null => {
    for (const id of playerIds) {
      const g = getGross(id, hole);
      if (g != null) return g;
    }
    return null;
  };

  let holesWonA = 0;
  let holesWonB = 0;
  let comparable = 0;
  for (const hole of holes) {
    const aGross = sideHoleGross(teamAPlayerIds, hole);
    const bGross = sideHoleGross(teamBPlayerIds, hole);
    if (aGross == null || bGross == null) continue;
    comparable += 1;
    const strokes = getStrokesReceived(diff, hole.strokeIndex);
    const aNet = aGross - (aReceives ? strokes : 0);
    const bNet = bGross - (!aReceives ? strokes : 0);
    if (aNet < bNet) holesWonA += 1;
    else if (bNet < aNet) holesWonB += 1;
    // equal → halved (no change)
  }

  if (comparable === 0) return null;
  return holesWonA - holesWonB;
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `pnpm jest src/__tests__/services/rounds/pairPointsCalculation.test.ts`
Expected: PASS (new `computeAltShotHolesUpMargin` cases + all pre-existing cases in the file).

- [ ] **Step 5: Type-check and commit**

```bash
pnpm type-check
git add src/services/rounds/pairPointsCalculation.ts src/__tests__/services/rounds/pairPointsCalculation.test.ts
git commit -m "feat(points): per-hole holes-up margin helper for alt-shot stroke play"
```

---

## Task 2: Wire the alt-shot margin into `finalizePairResults`

**Files:**
- Modify: `src/services/rounds/finalizePairResults.ts`
- Test: `src/__tests__/services/rounds/finalizePairResults.test.ts`

**Interfaces:**
- Consumes: `computeAltShotHolesUpMargin` (Task 1). Uses the function's existing in-scope locals: `bonusCfg`, `holes`, `getGross`, `dhcByPlayer`, `sideIds`, `outcome`, `addMargin`.
- Produces: no signature change. When the bonus is enabled on an alt-shot round with no persisted `final_differential`, each team's `marginByTeam` now reflects the per-hole holes-up margin, which folds into `competition_points` exactly as the existing bonus does.

**Context:** Both `refinalizeRoundResults` call sites already pass `gameType` and `scorecards`; `finalizePairResults` lazily fetches course holes when scorecards + gameType are present, so `holes`, `getGross`, and `dhcByPlayer` are all populated for an alt-shot round. No caller change needed.

- [ ] **Step 1: Add the failing integration test**

Append a new `describe` block inside the top-level `describe('finalizePairResults', …)` in `src/__tests__/services/rounds/finalizePairResults.test.ts`. (`Hole`, `Scorecard`, `TeamWithMembers`, `RoundRulesOverride`, `subMatch`, and `saveSpy` are already imported/defined in this file.)

```ts
  describe('alt-shot stroke-play holes-up bonus', () => {
    const ALT_HOLES: Hole[] = [
      { number: 1, par: 4, strokeIndex: 1 },
      { number: 2, par: 4, strokeIndex: 2 },
      { number: 3, par: 4, strokeIndex: 3 },
    ];

    function altMember(playerId: string) {
      return { team_id: '', player_id: playerId, joined_at: '', player: undefined };
    }

    const ALT_TEAMS: TeamWithMembers[] = [
      {
        id: 'team-a', competition_id: 'comp-1', name: 'Team A', color: null,
        created_at: '', updated_at: '',
        members: [altMember('a1'), altMember('a2'), altMember('a3'), altMember('a4')],
      },
      {
        id: 'team-b', competition_id: 'comp-1', name: 'Team B', color: null,
        created_at: '', updated_at: '',
        members: [altMember('b1'), altMember('b2'), altMember('b3'), altMember('b4')],
      },
    ];

    function altCard(playerId: string, strokes: [number, number, number]): Scorecard {
      const scores: Record<string, { strokes: number }> = {};
      strokes.forEach((s, i) => { scores[String(i + 1)] = { strokes: s }; });
      return {
        id: `sc-${playerId}`, round_id: 'round-1', player_id: playerId, scores,
        total_gross: strokes.reduce((a, b) => a + b, 0),
        total_net: strokes.reduce((a, b) => a + b, 0),
        total_points: 0, status: 'completed', daily_handicap_used: 0,
      } as unknown as Scorecard;
    }

    const BONUS_OVERRIDE: RoundRulesOverride = {
      pair_points: { win: 1, tie: 0.5, loss: 0 },
      bonus_points: { enabled: true, metric: 'combined_match_margin', points: 1, tie: 'split' },
    };

    it('derives the bonus from per-hole holes-up when no final_differential is persisted', async () => {
      // Alt-shot, live-computed (status upcoming, result null, final_differential null).
      // SM0: A one-ball [4,4,4] vs B [5,5,5] → A wins all 3 holes (+3) AND wins the match (net 12<15).
      // SM1: A [4,4,4] vs B [4,4,4] → all holes halved (margin 0) AND match halved.
      // Net margin: A +3, B -3 → A wins the bonus point.
      // Pair points: SM0 A win=1/B loss=0; SM1 halved 0.5/0.5 → A=1.5, B=0.5.
      // Competition points: A = 1.5 + 1 bonus = 2.5; B = 0.5 + 0 = 0.5.
      const subMatches: SubMatch[] = [
        subMatch({
          sort_order: 0, status: 'upcoming', result: null, final_differential: null,
          team_a_player_ids: ['a1', 'a2'], team_b_player_ids: ['b1', 'b2'],
        }),
        subMatch({
          sort_order: 1, status: 'upcoming', result: null, final_differential: null,
          team_a_player_ids: ['a3', 'a4'], team_b_player_ids: ['b3', 'b4'],
        }),
      ];

      const scorecards: Scorecard[] = [
        altCard('a1', [4, 4, 4]), altCard('b1', [5, 5, 5]), // SM0
        altCard('a3', [4, 4, 4]), altCard('b3', [4, 4, 4]), // SM1
      ];

      await finalizePairResults({
        roundId: 'round-1',
        rulesOverride: BONUS_OVERRIDE,
        subMatches,
        teams: ALT_TEAMS,
        scorecards,
        courseHoles: ALT_HOLES,
        gameType: 'alt-shot',
      });

      const rows = saveSpy.mock.calls[0][1];
      const byTeam = Object.fromEntries(
        rows.map((r: { teamId: string; rawScore: number; competitionPoints: number; position: number }) => [r.teamId, r])
      );
      expect(byTeam['team-a'].rawScore).toBe(1.5);        // pair points only
      expect(byTeam['team-a'].competitionPoints).toBe(2.5); // + 1 bonus
      expect(byTeam['team-b'].competitionPoints).toBe(0.5); // no bonus
      expect(byTeam['team-a'].position).toBe(1);
      expect(byTeam['team-b'].position).toBe(2);
    });
  });
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm jest src/__tests__/services/rounds/finalizePairResults.test.ts -t "alt-shot stroke-play holes-up bonus"`
Expected: FAIL — bonus not applied for alt-shot (team-a competitionPoints is 1.5, not 2.5), because the current code only reads `final_differential`.

- [ ] **Step 3: Implement the wiring**

In `src/services/rounds/finalizePairResults.ts`, add `computeAltShotHolesUpMargin` to the existing import from `./pairPointsCalculation`:

```ts
import {
  resolveSubMatchOutcomeFromScores,
  resolveAltShotSubMatchOutcome,
  deriveSideTeamIds,
  computeAltShotHolesUpMargin,
  type SideOutcome,
} from './pairPointsCalculation';
```

Then replace the existing bonus-margin block (the `if (bonusCfg?.enabled && typeof sm.final_differential === 'number') { … }` block inside the sub-match loop) with:

```ts
    if (bonusCfg?.enabled) {
      if (typeof sm.final_differential === 'number') {
        // Persisted match-play scoring: final_differential is UNSIGNED; sign by outcome.
        const magnitude = Math.abs(sm.final_differential);
        if (outcome === 'a-wins') {
          addMargin(sideIds.sideATeamId, magnitude);
          addMargin(sideIds.sideBTeamId, -magnitude);
        } else if (outcome === 'b-wins') {
          addMargin(sideIds.sideATeamId, -magnitude);
          addMargin(sideIds.sideBTeamId, magnitude);
        }
        // halved → contributes 0 to each (no-op)
      } else if (gameType === 'alt-shot' && holes.length > 0) {
        // Alt-shot stroke play persists no holes-up; derive it per hole from scores.
        const margin = computeAltShotHolesUpMargin({
          teamAPlayerIds: sm.team_a_player_ids,
          teamBPlayerIds: sm.team_b_player_ids,
          holes,
          getGross,
          dailyHandicaps: dhcByPlayer,
        });
        if (margin !== null) {
          addMargin(sideIds.sideATeamId, margin);
          addMargin(sideIds.sideBTeamId, -margin);
        }
      }
    }
```

- [ ] **Step 4: Run the file, verify all pass**

Run: `pnpm jest src/__tests__/services/rounds/finalizePairResults.test.ts`
Expected: PASS — the new alt-shot case passes, and all pre-existing cases (including the persisted-`final_differential` bonus cases) still pass unchanged.

- [ ] **Step 5: Type-check and commit**

```bash
pnpm type-check
git add src/services/rounds/finalizePairResults.ts src/__tests__/services/rounds/finalizePairResults.test.ts
git commit -m "feat(points): use per-hole holes-up margin for alt-shot stroke-play bonus"
```

---

## Final verification

- [ ] `pnpm jest src/__tests__/services/rounds/pairPointsCalculation.test.ts src/__tests__/services/rounds/finalizePairResults.test.ts` — all PASS.
- [ ] `pnpm type-check` — clean.
- [ ] Manual sanity: on the prod-shaped R2 (alt-shot stroke play, bonus enabled), the team with the higher combined net-holes margin receives the bonus point; the 1-pt match results are unchanged.
- [ ] Use `superpowers:finishing-a-development-branch` to merge.

## Self-review notes (controller)

- Spec coverage: pure helper (Task 1) ✓; finalization wiring with persisted-path precedence + alt-shot fallback (Task 2) ✓; handicap basis = rounded 50%-combined diff per hole by stroke index ✓; signed-A margin, halved=0, null-on-incomplete ✓; no UI/type/migration ✓; singles match-play path untouched (still the `typeof final_differential === 'number'` branch) ✓.
- The existing Task-7 persisted-`final_differential` bonus tests remain in the file as the regression guard for the match-play path.
