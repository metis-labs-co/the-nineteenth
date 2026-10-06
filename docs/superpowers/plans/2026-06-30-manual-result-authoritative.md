# Manual Sub-Match Results Authoritative — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an organiser's manually-entered sub-match result authoritative — overriding hole scores in the display, the team tally, and protected from being overwritten by later scoring — and fix the team tally to count by team instead of by table side.

**Architecture:** Add a `sub_matches.manual_result` boolean. The "Set result" sheet sets it; the scoring screen skips writing when it's set. The leaderboard's `selectMatchSource` prefers a manual result over the live hole-score computation. The overall tally resolves each winner to its competition team and sums by team. Points already honour the persisted result (`persistedOutcome`), so no points/finalization change.

**Tech Stack:** React Native, TypeScript, Supabase JS, TanStack Query, Jest + @testing-library/react-native.

## Global Constraints

- Sub-match `result` ∈ `'a-wins' | 'b-wins' | 'halved' | 'forfeit-a' | 'forfeit-b'`. A manual result is written with `status:'completed'`. `final_differential` is the UNSIGNED holes-up margin.
- The new column is `manual_result BOOLEAN NOT NULL DEFAULT FALSE`. Thread it through the `Row` type, `rowToSubMatch`, `UpdateSubMatchResultInput` patch, and the `SubMatch` domain type — mirroring how `final_holes_remaining`/`final_differential` are modelled.
- No change to points/finalization logic (`finalizePairResults.persistedOutcome` already reads `result` first).
- Forfeits keep their existing `forfeitWinner` handling.
- Supabase typed-client workaround `(supabase.from(...) as any)` where the file already uses it.
- Migration is NOT auto-deployed — flag at hand-off that it must reach staging + prod before the JS ships.
- Before each commit: run the task's jest file(s); `pnpm type-check` shows no NEW errors in touched files (repo has pre-existing unrelated type-check noise — check your files specifically).

---

## File Structure

- `supabase/migrations/<ts>_sub_match_manual_result.sql` (new) — the column.
- `src/services/subMatches/index.ts` — input + persist + Row/rowToSubMatch.
- `src/types/database/round.types.ts` — `SubMatch.manual_result`.
- `src/screens/rounds/ViewRoundScreen/tabs/SubMatchesTab.tsx` — `handleManualResult` sets the flag.
- `src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx` — `handlePersistSubMatchResult` guard.
- `src/components/leaderboard/SubMatchLeaderboardTab.tsx` — `persistedMatchData` `isManual`, `selectMatchSource` precedence, by-team tally wiring + header.
- `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts` — `TeamMatchLeader` + `tallyByTeam`.

---

### Task 1: Migration — `sub_matches.manual_result`

**Files:**
- Create: `supabase/migrations/20260630010000_sub_match_manual_result.sql`

- [ ] **Step 1: Write the migration**

```sql
-- True when an organiser set the sub-match result by hand. A manual result
-- takes precedence over hole-by-hole scoring in the display and tally, and the
-- scoring flow must not overwrite it.
ALTER TABLE sub_matches
  ADD COLUMN manual_result BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN sub_matches.manual_result IS
  'True when the result was set manually by an organiser; takes precedence over hole-score computation and is not overwritten by the scoring flow.';
```

- [ ] **Step 2: Verify it parses**

Run: `grep -c "manual_result" supabase/migrations/20260630010000_sub_match_manual_result.sql`
Expected: `3` (ADD COLUMN line + COMMENT target + a mention; any count ≥ 2 is fine — confirm the ALTER and COMMENT are present).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260630010000_sub_match_manual_result.sql
git commit -m "feat(db): add sub_matches.manual_result flag"
```

---

### Task 2: Thread `manual_result` through the data layer

**Files:**
- Modify: `src/services/subMatches/index.ts` (`Row` type, `rowToSubMatch`, `UpdateSubMatchResultInput`, patch builder)
- Modify: `src/types/database/round.types.ts` (`SubMatch` type)
- Test: `src/__tests__/services/subMatches/updateSubMatchResult.test.ts` (extend)

**Interfaces:**
- Produces: `UpdateSubMatchResultInput.manualResult?: boolean`; `SubMatch.manual_result: boolean`; persisted to column `manual_result`.

- [ ] **Step 1: Write the failing test (extend the existing file)**

```ts
// add inside the existing describe in src/__tests__/services/subMatches/updateSubMatchResult.test.ts
it('persists manual_result when provided', async () => {
  const chain = mockUpdateChain({
    id: 'sm-1', round_id: 'r1', sort_order: 0,
    team_a_player_ids: ['a'], team_b_player_ids: ['b'],
    status: 'completed', result: 'a-wins', final_differential: 6,
    final_holes_remaining: 5, manual_result: true,
    team_a_net_total: null, team_b_net_total: null, tee_time: null, pairing_id: null,
  });
  (supabase.from as jest.Mock).mockImplementation(chain.from);

  await updateSubMatchResult({
    subMatchId: 'sm-1', status: 'completed', result: 'a-wins',
    finalDifferential: 6, finalHolesRemaining: 5, manualResult: true,
  });

  expect(chain._update).toHaveBeenCalledWith(
    expect.objectContaining({ manual_result: true })
  );
});

it('omits manual_result from the patch when undefined', async () => {
  const chain = mockUpdateChain({
    id: 'sm-1', round_id: 'r1', sort_order: 0,
    team_a_player_ids: ['a'], team_b_player_ids: ['b'],
    status: 'completed', result: 'a-wins', final_differential: 2,
    final_holes_remaining: null, manual_result: false,
    team_a_net_total: null, team_b_net_total: null, tee_time: null, pairing_id: null,
  });
  (supabase.from as jest.Mock).mockImplementation(chain.from);

  await updateSubMatchResult({ subMatchId: 'sm-1', status: 'completed', result: 'a-wins', finalDifferential: 2 });

  expect(chain._update.mock.calls[0][0]).not.toHaveProperty('manual_result');
});
```

> The existing test file already has a `mockUpdateChain` helper. If its returned-row object shape requires `manual_result`, add it to all of that helper's fixtures (the `SubMatch` type now requires the field — same fallout as when `final_holes_remaining` was added).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/services/subMatches/updateSubMatchResult.test.ts`
Expected: FAIL — `manual_result` not in the patch / type errors on the fixture.

- [ ] **Step 3: Implement**

In `src/services/subMatches/index.ts`:
- Add `manual_result: boolean;` to the internal `Row` type.
- In `rowToSubMatch`, add `manual_result: r.manual_result,` (mirror `final_holes_remaining`).
- Add to `UpdateSubMatchResultInput`:

```ts
  manualResult?: boolean;
```

- Destructure `manualResult` alongside the others and add to the patch (after the `finalHolesRemaining` line):

```ts
  if (manualResult !== undefined) patch.manual_result = manualResult;
```

In `src/types/database/round.types.ts`, add to the `SubMatch` type (mirror `final_holes_remaining`):

```ts
  manual_result: boolean;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/__tests__/services/subMatches/updateSubMatchResult.test.ts`
Expected: PASS. Fix any other fixtures across the repo that build a `SubMatch` literal and now need `manual_result` (run `pnpm type-check 2>&1 | grep -i manual_result` and add `manual_result: false` to each flagged fixture).

- [ ] **Step 5: Commit**

```bash
git add src/services/subMatches/index.ts src/types/database/round.types.ts src/__tests__/services/subMatches/updateSubMatchResult.test.ts
git commit -m "feat(subMatches): thread manual_result flag through service + type"
```

---

### Task 3: Writers set / respect the flag

**Files:**
- Modify: `src/screens/rounds/ViewRoundScreen/tabs/SubMatchesTab.tsx` (`handleManualResult` ~lines 445-466)
- Modify: `src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx` (`handlePersistSubMatchResult` ~lines 332-351)
- Test: none new (covered by Task 2 + reviewer logic check). Verify with `pnpm type-check` + existing suites.

**Interfaces:**
- Consumes: `UpdateSubMatchResultInput.manualResult` (Task 2); `SubMatch.manual_result` (Task 2).

- [ ] **Step 1: Set the flag in the manual write**

In `SubMatchesTab.tsx` `handleManualResult`, add `manualResult: true` to the `updateSubMatchResult` call:

```ts
      await updateSubMatchResult({
        subMatchId: resultSheetFor.id,
        status: 'completed',
        result: r.result,
        finalDifferential: r.finalDifferential,
        finalHolesRemaining: r.finalHolesRemaining,
        manualResult: true,
      });
```

- [ ] **Step 2: Guard the scoring write so it never clobbers a manual result**

In `TeamMatchPlayScoringScreen/index.tsx` `handlePersistSubMatchResult`, add an early return when the active sub-match is manual. Place it right after the existing `if (!isSplitRound || !activeSubMatch) return;` guard:

```ts
      // Never overwrite an organiser's manually-entered result with a scored one.
      if (activeSubMatch.manual_result) return;
```

(`activeSubMatch` is the current `SubMatch`; `manual_result` exists on it after Task 2. If `activeSubMatch`'s type here is a narrower/local shape that doesn't include `manual_result`, widen it to read the field — confirm by inspecting how `activeSubMatch` is typed in this file.)

- [ ] **Step 3: Verify types + existing suites**

Run: `pnpm type-check 2>&1 | grep -E "SubMatchesTab|TeamMatchPlayScoringScreen"` → no new errors.
Run: `pnpm jest src/screens/scoring/TeamMatchPlayScoringScreen/hooks/useTeamMatchPlayScores.test.ts src/screens/rounds/ViewRoundScreen/tabs/SubMatchesTab.test.tsx 2>&1 | tail -6` → no new failures vs baseline (the SubMatchesTab suite has ~2 pre-existing Stroke pairs-aggregate failures; unrelated).

- [ ] **Step 4: Commit**

```bash
git add src/screens/rounds/ViewRoundScreen/tabs/SubMatchesTab.tsx src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx
git commit -m "feat(rounds): set manual_result on manual entry; scoring won't overwrite it"
```

---

### Task 4: Display precedence — manual result wins over live scores

**Files:**
- Modify: `src/components/leaderboard/SubMatchLeaderboardTab.tsx` (`persistedMatchData` ~lines 30-50, `selectMatchSource` ~lines 61-75)
- Test: `src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx` (extend) and the existing `SubMatchLeaderboardTab.test.tsx` `selectMatchSource` tests

**Interfaces:**
- Consumes: `SubMatch.manual_result`.
- Produces: `persistedMatchData` returns `{ ..., isManual: boolean }`; `selectMatchSource` returns the persisted row when `persisted.isManual` is true regardless of `live.isComplete`.

- [ ] **Step 1: Write the failing tests**

```tsx
// add to src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx
import { persistedMatchData, selectMatchSource } from '@/components/leaderboard/SubMatchLeaderboardTab';

describe('persistedMatchData isManual', () => {
  it('forwards manual_result as isManual', () => {
    const d = persistedMatchData({
      status: 'completed', result: 'b-wins', final_differential: 2,
      final_holes_remaining: 1, manual_result: true,
    });
    expect(d).toMatchObject({ holesUpDown: '2&1', leaderSide: 'b', isManual: true });
  });
  it('isManual is false for a scored (non-manual) result', () => {
    const d = persistedMatchData({
      status: 'completed', result: 'a-wins', final_differential: 3,
      final_holes_remaining: null, manual_result: false,
    });
    expect(d).toMatchObject({ leaderSide: 'a', isManual: false });
  });
});

describe('selectMatchSource manual precedence', () => {
  const liveComplete = { statusText: '3&2', leaderSide: 'a' as const, isComplete: true, hasScores: true };
  it('prefers a MANUAL persisted result even when live is complete', () => {
    const persisted = { holesUpDown: '2&1', leaderSide: 'b' as const, hasScores: true, isManual: true };
    const out = selectMatchSource(liveComplete, persisted);
    expect(out).toMatchObject({ statusText: '2&1', leaderSide: 'b' });
  });
  it('prefers live when the persisted result is NOT manual and live is complete', () => {
    const persisted = { holesUpDown: '2&1', leaderSide: 'b' as const, hasScores: true, isManual: false };
    const out = selectMatchSource(liveComplete, persisted);
    expect(out).toMatchObject({ statusText: '3&2', leaderSide: 'a' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm jest src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx`
Expected: FAIL — `isManual` not returned; manual not preferred.

- [ ] **Step 3: Implement**

In `persistedMatchData`, widen the param type and return `isManual`:

```ts
export function persistedMatchData(sm: {
  status: string;
  result: string | null;
  final_differential: number | null;
  final_holes_remaining: number | null;
  manual_result?: boolean;
}): { holesUpDown: string; leaderSide: 'a' | 'b' | null; hasScores: boolean; isManual: boolean } | null {
  if (sm.status !== 'completed') return null;
  const isManual = sm.manual_result === true;
  if (sm.result === 'halved') {
    return { holesUpDown: formatMatchMargin(0, 0, true), leaderSide: null, hasScores: true, isManual };
  }
  if (sm.result === 'a-wins' || sm.result === 'b-wins') {
    const up = sm.final_differential ?? 0;
    const rem = sm.final_holes_remaining ?? 0;
    return {
      holesUpDown: formatMatchMargin(up, rem, false),
      leaderSide: sm.result === 'a-wins' ? 'a' : 'b',
      hasScores: true,
      isManual,
    };
  }
  return null;
}
```

In `selectMatchSource`, prefer a manual persisted result first:

```ts
export function selectMatchSource(
  live: MatchPlayRowData,
  persisted: ReturnType<typeof persistedMatchData>
): MatchPlayRowData {
  // A manually-entered result is authoritative — it overrides hole scores even
  // when the live engine has reached a decided result.
  if (persisted?.isManual) {
    return {
      statusText: persisted.holesUpDown,
      leaderSide: persisted.leaderSide,
      isComplete: true,
      hasScores: persisted.hasScores,
    };
  }
  if (live.isComplete) return live;
  if (persisted) {
    return {
      statusText: persisted.holesUpDown,
      leaderSide: persisted.leaderSide,
      isComplete: true,
      hasScores: persisted.hasScores,
    };
  }
  return live;
}
```

The `rows` memo already calls `persistedMatchData(sm)` — `sm` now carries `manual_result`, so `row.persisted.isManual` flows through with no other change.

- [ ] **Step 4: Run tests**

Run: `pnpm jest src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx src/components/leaderboard/SubMatchLeaderboardTab.test.tsx`
Expected: PASS. If an existing `persistedMatchData` test asserts the exact returned object shape, update it to include `isManual` (don't weaken — add the field). `pnpm type-check` clean for the file.

- [ ] **Step 5: Commit**

```bash
git add src/components/leaderboard/SubMatchLeaderboardTab.tsx src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx src/components/leaderboard/SubMatchLeaderboardTab.test.tsx
git commit -m "feat(leaderboard): manual sub-match result overrides live scores in display"
```

---

### Task 5: Team tally — count by team, not by side

**Files:**
- Modify: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts` (add `TeamMatchLeader` + `tallyByTeam`)
- Modify: `src/components/leaderboard/SubMatchLeaderboardTab.tsx` (tally loop ~lines 223-269, header ~lines 287-296)
- Test: `src/__tests__/utils/subMatchTallyByTeam.test.ts` (new)

**Interfaces:**
- Consumes: `teamNameByPlayer: Map<playerId, teamName>` (already in `SubMatchLeaderboardTab`).
- Produces:
  - `interface TeamMatchLeader { teamA: string | null; teamB: string | null; leaderSide: 'a' | 'b' | null; hasScores: boolean }`
  - `tallyByTeam(leaders: TeamMatchLeader[]): Map<string, number>`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/utils/subMatchTallyByTeam.test.ts
import { tallyByTeam, type TeamMatchLeader } from '@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard';

describe('tallyByTeam', () => {
  it('tallies by team across sub-matches where sides alternate teams (Ryder-cup singles)', () => {
    // SM0: A=Australia, B=England, England won (side b)
    // SM1: A=England,  B=Australia, Australia won (side b)
    // SM2: A=Australia, B=England, England won (side b)
    // SM3: A=England,  B=Australia, Australia won (side b)
    const leaders: TeamMatchLeader[] = [
      { teamA: 'Australia', teamB: 'England',  leaderSide: 'b', hasScores: true },
      { teamA: 'England',  teamB: 'Australia', leaderSide: 'b', hasScores: true },
      { teamA: 'Australia', teamB: 'England',  leaderSide: 'b', hasScores: true },
      { teamA: 'England',  teamB: 'Australia', leaderSide: 'b', hasScores: true },
    ];
    const t = tallyByTeam(leaders);
    // By SIDE this would be 0-4; by TEAM it is 2-2.
    expect(t.get('England')).toBe(2);
    expect(t.get('Australia')).toBe(2);
  });

  it('splits a halved match 0.5 / 0.5 between the two teams', () => {
    const leaders: TeamMatchLeader[] = [
      { teamA: 'England', teamB: 'Australia', leaderSide: null, hasScores: true },
    ];
    const t = tallyByTeam(leaders);
    expect(t.get('England')).toBe(0.5);
    expect(t.get('Australia')).toBe(0.5);
  });

  it('ignores matches with no scores', () => {
    const leaders: TeamMatchLeader[] = [
      { teamA: 'England', teamB: 'Australia', leaderSide: 'a', hasScores: false },
    ];
    expect(tallyByTeam(leaders).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm jest src/__tests__/utils/subMatchTallyByTeam.test.ts`
Expected: FAIL — `tallyByTeam` / `TeamMatchLeader` not exported.

- [ ] **Step 3: Implement the helper**

Add to `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts` (keep the existing `SubMatchLeader`/`tallyOverall` untouched):

```ts
/** A decided sub-match with its two sides resolved to competition team names. */
export interface TeamMatchLeader {
  teamA: string | null;
  teamB: string | null;
  leaderSide: 'a' | 'b' | null;
  hasScores: boolean;
}

/**
 * Tally sub-match wins by resolved competition team rather than by positional
 * A/B side. Ryder-cup singles alternate which team is side A, so summing by
 * side mis-attributes (e.g. side B winning all four reads as 4-0). Win → 1 to
 * the winner's team; a started-but-level match splits 0.5/0.5; an unstarted
 * match contributes nothing.
 */
export function tallyByTeam(leaders: TeamMatchLeader[]): Map<string, number> {
  const points = new Map<string, number>();
  const add = (team: string | null, n: number) => {
    if (!team) return;
    points.set(team, (points.get(team) ?? 0) + n);
  };
  for (const r of leaders) {
    if (!r.hasScores) continue;
    if (r.leaderSide === 'a') add(r.teamA, 1);
    else if (r.leaderSide === 'b') add(r.teamB, 1);
    else { add(r.teamA, 0.5); add(r.teamB, 0.5); }
  }
  return points;
}
```

- [ ] **Step 4: Run the helper test**

Run: `pnpm jest src/__tests__/utils/subMatchTallyByTeam.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire it into `SubMatchLeaderboardTab`**

In `SubMatchLeaderboardTab.tsx`:

a) Import `tallyByTeam` + the type (extend the existing import from `subMatchLeaderboard`):

```ts
import {
  resolveSubMatchModel,
  computeMatchPlaySubMatch,
  computeNetSubMatch,
  tallyByTeam,
  type SubMatchPlayer,
  type SubMatchSides,
  type SubMatchLeader,
  type TeamMatchLeader,
} from '@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard';
```

(Keep `SubMatchLeader` import if still referenced elsewhere; otherwise drop it.)

b) In the `{ leaders, content }` memo, change `leaders` to `TeamMatchLeader[]` and resolve each side's team inside the map, before `pushLeader`:

```ts
  const { leaders, content } = useMemo(() => {
    const leaders: TeamMatchLeader[] = [];
    const content = rows.map((row) => {
      const teamA = row.sides.a[0] ? teamNameByPlayer.get(row.sides.a[0].id) ?? null : null;
      const teamB = row.sides.b[0] ? teamNameByPlayer.get(row.sides.b[0].id) ?? null : null;
      const pushLeader = (data: { leaderSide: 'a' | 'b' | null; hasScores: boolean }) =>
        leaders.push(
          row.forfeitWinner
            ? { teamA, teamB, leaderSide: row.forfeitWinner, hasScores: true }
            : { teamA, teamB, leaderSide: data.leaderSide, hasScores: data.hasScores }
        );
      // ...rest of the map body unchanged (match-play + net branches)...
```

Add `teamNameByPlayer` to the memo's dependency array (it's already a stable map but list it):

```ts
  }, [rows, model, holes, getStrokes, currentUserId, teamNameByPlayer]);
```

c) Replace the tally + header points. Change:

```ts
  const tally = tallyOverall(leaders);
```
to:
```ts
  const tally = tallyByTeam(leaders);
```

And in the header JSX, map points by the header's team labels:

```tsx
        <SubMatchOverallHeader
          leftLabel={first.leftLabel}
          rightLabel={first.rightLabel}
          leftColor={first.leftColor}
          rightColor={first.rightColor}
          pointsA={tally.get(first.leftLabel) ?? 0}
          pointsB={tally.get(first.rightLabel) ?? 0}
        />
```

Remove the now-unused `tallyOverall` import from this file (leave the function defined in the utils module for any other caller).

- [ ] **Step 6: Run the leaderboard suites + type-check**

Run: `pnpm jest src/components/leaderboard/SubMatchLeaderboardTab.test.tsx src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx`
Expected: PASS (existing component tests still pass).
Run: `pnpm type-check 2>&1 | grep -E "SubMatchLeaderboardTab|subMatchLeaderboard"` → no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts src/components/leaderboard/SubMatchLeaderboardTab.tsx src/__tests__/utils/subMatchTallyByTeam.test.ts
git commit -m "fix(leaderboard): tally sub-match wins by team, not by table side"
```

---

## Final verification

- [ ] Run the feature test set:
  `pnpm jest src/__tests__/services/subMatches/updateSubMatchResult.test.ts src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx src/components/leaderboard/SubMatchLeaderboardTab.test.tsx src/__tests__/utils/subMatchTallyByTeam.test.ts`
  Expected: all PASS.
- [ ] `pnpm type-check` — clean for all touched files.
- [ ] **Deploy the migration** `20260630010000_sub_match_manual_result.sql` to staging + prod before shipping JS.
- [ ] Manual smoke (device): on a 1v1 singles match-play round, set a result via "Set result" that disagrees with the hole scores → leaderboard row shows the manual winner/margin; the header tally reads by team (e.g. 2-2, not 0-4); scoring that match and submitting does NOT change the manual result; competition points reflect the manual result after Recalculate.

## Deployment & remediation note

Existing `sub_matches` rows default `manual_result=false`. After deploy, the organiser re-opens "Set result" on affected matches (at minimum the Murray Winter Classic round-6 match 3 → Arthur/England) to set the flag and make them authoritative; the round then reads 2-2 across display, tally, and points.
