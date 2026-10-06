# Match-play finalize recompute Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the split-round finalizer resolve 1v1 singles **match-play** sub-matches from the round's actual scores using the *same* engine, handicap basis, and precedence as the live sub-match leaderboard — so the persisted competition standings equal the live header (e.g. 4–4, not 6–2), and a stale `sub_matches.result` can no longer corrupt the standings.

**Architecture:** Reuse the live view's pure functions verbatim. Extract the two currently-in-a-component pure helpers (`persistedMatchData`, `selectMatchSource`) into the pure `subMatchLeaderboard.ts` module, then have `finalizePairResults` resolve each match-play sub-match via `selectMatchSource(computeMatchPlaySubMatch(sides, holes, getStrokes), persistedMatchData(sm))` — playing handicaps computed server-side with `calculatePlayingHandicap` (mirroring `SubMatchLeaderboardTab`), gross strokes read from the scorecards' `scores` JSON (all statuses, not just `completed`). Standings become consistent with the header by construction.

**Tech Stack:** React Native + TypeScript, Supabase (Postgres), jest.

## Global Constraints

- Package manager: **pnpm**; run tests with `pnpm jest <path>`; typecheck with `pnpm tsc --noEmit`.
- Baseline: ~243 pre-existing jest failures on `main` — judge each task against its own new/target tests, no NEW failures.
- The canonical live computation to mirror EXACTLY (from `src/components/leaderboard/SubMatchLeaderboardTab.tsx`): each `SubMatchPlayer.handicap` is the **playing handicap** = `calculatePlayingHandicap({ player, selectedTeeData, holes, handicapSource, gameType }).playingHandicap` (from `@/hooks/player`, pure — safe in services); `getStrokes` returns **gross** strokes only; handicap strokes are applied INSIDE `calculateTeamMatchData` via `getFourBallStrokes` (relative-to-lowest; equals the 1v1 difference method for two players). Per-sub-match precedence = `selectMatchSource`: **manual result → live (once `isComplete`) → persisted → live**.
- `computeMatchPlaySubMatch(sides, holes, getStrokes)` returns `{ statusText, leaderSide: 'a'|'b'|null, isComplete, hasScores }`. Map `leaderSide` → `SideOutcome`: `'a'→'a-wins'`, `'b'→'b-wins'`, `null(+hasScores)→'halved'`; `!hasScores` → undecided (skip).
- `SubMatch` fields: `team_a_player_ids`, `team_b_player_ids`, `status` (`upcoming|in-progress|completed|forfeited`), `result` (`a-wins|b-wins|halved|forfeit-a|forfeit-b`), `manual_result`, `final_differential`, `final_holes_remaining`.
- `rounds` columns needed for the recompute: `selected_tee` (JSONB `TeeBox|null`), `handicap_source` (`HandicapSource|null`), `nine_type`, plus existing `game_type/round_format/team_format/course_id`.
- Commit after each task. Do not push. Branch: current worktree branch.

---

## Task 1: Extract `persistedMatchData` + `selectMatchSource` into the pure module

Move these two pure functions (and any local helpers they need) from the React component file into the pure `subMatchLeaderboard.ts` so a service can import them without pulling in React. Behaviour-preserving refactor.

**Files:**
- Modify: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts` (add the two functions)
- Modify: `src/components/leaderboard/SubMatchLeaderboardTab.tsx` (remove the local defs; import from the util; keep exporting them if other code imports them from here — re-export to avoid breaking callers)
- Test: existing `src/components/leaderboard/SubMatchLeaderboardTab.test.tsx`, `src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx` must still pass unchanged.

**Interfaces:**
- Produces (from `subMatchLeaderboard.ts`): `persistedMatchData(sm: { status: string; result: string | null; final_differential: number | null; final_holes_remaining: number | null; manual_result?: boolean }): { holesUpDown: string; leaderSide: 'a'|'b'|null; hasScores: boolean; isManual: boolean } | null` and `selectMatchSource(live: MatchPlayRowData, persisted: ReturnType<typeof persistedMatchData>): MatchPlayRowData`.

- [ ] **Step 1: Find current defs and callers**

Run: `grep -rn "persistedMatchData\|selectMatchSource" src`
Confirm they're defined in `SubMatchLeaderboardTab.tsx` and note every importer.

- [ ] **Step 2: Move the two functions into `subMatchLeaderboard.ts`**

Cut `persistedMatchData` and `selectMatchSource` (and confirm they only depend on `formatMatchMargin` from `@/utils/matchMargin` and the local `MatchPlayRowData` type — both already available in `subMatchLeaderboard.ts`, which already imports/defines `MatchPlayRowData`). Paste them into `subMatchLeaderboard.ts`, exported. Add the `formatMatchMargin` import there if missing.

- [ ] **Step 3: Re-import in the component**

In `SubMatchLeaderboardTab.tsx`, delete the moved defs and add them to the existing import from `@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard`. If any other file imported `persistedMatchData`/`selectMatchSource` from `SubMatchLeaderboardTab`, either update those imports to the util, or add `export { persistedMatchData, selectMatchSource } from '...subMatchLeaderboard'` in the component to preserve them.

- [ ] **Step 4: Typecheck + run the affected component tests**

Run: `pnpm tsc --noEmit` → no new errors.
Run: `pnpm jest src/components/leaderboard/SubMatchLeaderboardTab.test.tsx src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx` → same pass/fail as baseline (these exercise `selectMatchSource`/`persistedMatchData`).

- [ ] **Step 5: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts src/components/leaderboard/SubMatchLeaderboardTab.tsx
git commit -m "refactor(submatch): move persistedMatchData/selectMatchSource to pure util

So a service can reuse the live match-play resolution without importing React.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Pure `resolveMatchPlaySubMatchOutcome` resolver + tests

Add a pure resolver that reproduces the live tally's per-sub-match decision, returning a finalize `SideOutcome`.

**Files:**
- Modify: `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts` (add resolver)
- Create: `src/screens/scoring/ReviewScorecardScreen/utils/resolveMatchPlaySubMatchOutcome.test.ts`

**Interfaces:**
- Consumes: `computeMatchPlaySubMatch`, `persistedMatchData`, `selectMatchSource` (this module); `SubMatchSides`, `GetStrokes`, `MatchPlayRowData` (this module).
- Produces: `resolveMatchPlaySubMatchOutcome(params: { sm: { status: string; result: string | null; final_differential: number | null; final_holes_remaining: number | null; manual_result?: boolean }; sides: SubMatchSides; holes: Hole[]; getStrokes: GetStrokes }): 'a-wins' | 'b-wins' | 'halved' | null` — computes `live = computeMatchPlaySubMatch(sides, holes, getStrokes)`, `persisted = persistedMatchData(sm)`, `data = selectMatchSource(live, persisted)`; returns `null` when `!data.hasScores`, else `data.leaderSide==='a' → 'a-wins'`, `'b' → 'b-wins'`, `null → 'halved'`.

- [ ] **Step 1: Write the failing test**

Create `resolveMatchPlaySubMatchOutcome.test.ts`. Build a 3-hole `Hole[]` (par/strokeIndex), two `SubMatchPlayer`s (equal handicap 0 → gross), and a `getStrokes` from a fixture map. Cover:
1. **Holes-up winner, no persisted result** — side A wins more holes (closeout) → `'a-wins'`, even though `sm.result` is null.
2. **Live overrides a stale non-manual persisted result** — scores give side B the decisive win (isComplete), but `sm.result==='a-wins'`, `manual_result:false` → returns `'b-wins'` (live wins once complete).
3. **Manual result is authoritative** — `sm.result==='a-wins'`, `manual_result:true`, but scores favour B → returns `'a-wins'`.
4. **Halved** — equal holes → `'halved'`.
5. **No scores** → `null`.

Write concrete hole scores so each case's `computeMatchPlaySubMatch` result is unambiguous (use a large margin so `isComplete` is true on a 3-hole match, e.g. A wins holes 1 & 2 → 2up with 1 to play = closed out).

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm jest resolveMatchPlaySubMatchOutcome` → FAIL (function not exported).

- [ ] **Step 3: Implement the resolver**

```ts
export function resolveMatchPlaySubMatchOutcome(params: {
  sm: { status: string; result: string | null; final_differential: number | null; final_holes_remaining: number | null; manual_result?: boolean };
  sides: SubMatchSides;
  holes: Hole[];
  getStrokes: GetStrokes;
}): 'a-wins' | 'b-wins' | 'halved' | null {
  const { sm, sides, holes, getStrokes } = params;
  const live = computeMatchPlaySubMatch(sides, holes, getStrokes);
  const persisted = persistedMatchData(sm);
  const data = selectMatchSource(live, persisted);
  if (!data.hasScores) return null;
  if (data.leaderSide === 'a') return 'a-wins';
  if (data.leaderSide === 'b') return 'b-wins';
  return 'halved';
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm jest resolveMatchPlaySubMatchOutcome` → PASS (5 cases). Also run existing `subMatchLeaderboard.test.ts` → unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts src/screens/scoring/ReviewScorecardScreen/utils/resolveMatchPlaySubMatchOutcome.test.ts
git commit -m "feat(submatch): resolveMatchPlaySubMatchOutcome mirrors live tally decision

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Use the match-play resolver inside `finalizePairResults`

For `game_type: 'match-play'` split rounds, resolve each sub-match with the new resolver (playing-handicap net, live precedence) instead of `persistedOutcome`/`resolveSubMatchOutcomeFromScores`. This makes standings match the header.

**Files:**
- Modify: `src/services/rounds/finalizePairResults.ts`
- Create: `src/services/rounds/finalizePairResults.matchPlay.test.ts`

**Interfaces:**
- Consumes: `resolveMatchPlaySubMatchOutcome` (Task 2); `calculatePlayingHandicap` from `@/hooks/player`; existing `getHoleGross` (this file); `SubMatchSides`/`SubMatchPlayer` types.
- `FinalizePairResultsInput` gains optional round-handicap context: `selectedTee?: TeeBox | null`, `handicapSource?: HandicapSource | null`, `nineType?: NineType`, and `allScorecards?: Scorecard[]` (round scorecards regardless of status, for the match-play recompute). Keep existing fields.

- [ ] **Step 1: Write the failing test**

Create `finalizePairResults.matchPlay.test.ts`. Provide a match-play round input with: two teams (2 players each), 4 singles `subMatches` whose persisted `result` values would give **6–2** by team, but whose supplied scorecards (all players, gross) make the holes-up net result **4–4** (one sub-match's live winner differs from its stale `result`). Assert the saved team rows (capture via a `saveRoundResults` mock, or the returned rows) award **4–4**, i.e. the recompute overrode the stale `result` for the flipped match. Keep handicaps equal (0) so gross == net and the test is deterministic. Include one sub-match with `manual_result:true` and assert its stale result is honoured (control).

Mock `@/services/rounds/roundResultsService` `saveRoundResults` to capture rows; mock `getCompetitionTeams` if needed, or pass `teams` in the input.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm jest finalizePairResults.matchPlay` → FAIL (finalize still uses stale `persistedOutcome`).

- [ ] **Step 3: Implement**

In `finalizePairResults.ts`:
1. Import `resolveMatchPlaySubMatchOutcome`, `type SubMatchSides`, `type SubMatchPlayer` from the util; `calculatePlayingHandicap` from `@/hooks/player`; `TeeBox`, `HandicapSource`, `NineType` types.
2. Add the new optional input fields (`selectedTee`, `handicapSource`, `nineType`, `allScorecards`).
3. Build a per-player **playing handicap** map for the round: for each player in `teams`, `calculatePlayingHandicap({ player: m.player, selectedTeeData: selectedTee ?? null, holes, handicapSource: handicapSource ?? null, gameType, nineType }).playingHandicap`. Fall back to `daily_handicap_used`/profile only when `selectedTee`/source are absent (keep today's behaviour for non-match-play).
4. Build a gross `getStrokes(playerId, holeNumber)` from `allScorecards ?? input.scorecards` via `getHoleGross(byPlayer.get(playerId)?.scores, holeNumber)` — pass raw gross (pickups handled inside the engine); this reads ALL statuses so DNF/in-progress match cards still count.
5. In the sub-match loop, when `gameType === 'match-play'`, build `SubMatchSides` from `sm.team_a_player_ids`/`team_b_player_ids` (resolve each id to `{ id, name, handicap: playingHc.get(id) ?? 0 }`) and set `outcome = resolveMatchPlaySubMatchOutcome({ sm, sides, holes, getStrokes })` INSTEAD of the persisted/alt-shot/best-ball branch. Leave all non-match-play branches exactly as they are.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm jest finalizePairResults.matchPlay finalizePairResults` → new test PASS, existing pair tests unchanged.
Run: `pnpm tsc --noEmit` → no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/services/rounds/finalizePairResults.ts src/services/rounds/finalizePairResults.matchPlay.test.ts
git commit -m "fix(finalize): recompute match-play sub-matches from scores (live-consistent)

Match-play split rounds resolved each sub-match from a stale sub_matches.result
(or a best-ball stroke-total fallback), diverging from the live header. Resolve
via the live engine (playing-handicap net, manual>live>persisted) so standings
equal the header.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Feed round handicap context + all-status scorecards from the dispatcher

Give `finalizePairResults` the data the match-play recompute needs.

**Files:**
- Modify: `src/services/rounds/refinalizeRoundResults.ts`

**Interfaces:**
- Consumes: `finalizePairResults` new optional inputs (Task 3).

- [ ] **Step 1: Widen the round query**

In `refinalizeRoundResults.ts`, add `selected_tee, handicap_source, nine_type` to the `rounds` select (the query at the top that currently selects `game_type, competition_id, rules_override, round_format, team1_id, team2_id, team_format`). Extend the typed result accordingly.

- [ ] **Step 2: Fetch all-status scorecards for match-play split rounds**

Where the round is split match-play (`isPairPointsOverride(round_format, effectiveOverride)` and `game_type === 'match-play'`), also fetch the round's scorecards **without** the `status = 'completed'` filter (a second query, or reuse the fetched set when the round isn't match-play). Pass them as `allScorecards` to `finalizePairResults`. Do NOT change the completed-only fetch used by individual finalize / other formats.

- [ ] **Step 3: Pass the new fields to every `finalizePairResults(...)` call**

There are multiple `finalizePairResults({...})` call sites in this file (the no-completed-scorecards early path, the team-only split path, and the trailing individual-format path). Add `selectedTee: round.selected_tee, handicapSource: round.handicap_source, nineType: round.nine_type, allScorecards` to each. (For non-match-play split rounds these are simply unused by the resolver.)

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit` → no new errors. Run: `pnpm jest finalizePairResults refinalize 2>/dev/null` (any existing dispatcher tests) → no new failures.

- [ ] **Step 5: Commit**

```bash
git add src/services/rounds/refinalizeRoundResults.ts
git commit -m "fix(finalize): pass tee/handicap-source + all-status cards for match-play recompute

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Verify end-to-end (reference round) — QA, no code

- [ ] **Step 1:** Ship (OTA/build) and, in-app, open round 4 of "Murray Winter Classic 2026" → **Recalculate Results** (or re-save points) to re-finalize.
- [ ] **Step 2:** Confirm the round's team rows now read **Australia 4 – 4 England**, the overall Team Standings and winner update accordingly, and the round's sub-match header still shows 4–4 (now consistent).
- [ ] **Step 3:** Regression spot-check: a pairs better-ball split round and an alt-shot split round still finalize unchanged; a combined team match-play round unchanged.

## Deferred (not in this plan)
- **D3 — force-submit's 18-hole completeness gate** treats a closed-out/17-hole match card as DNF (`forceFinalizeRound`). The finalize recompute above reads all-status scorecards, so standings are correct regardless; but the cards stay `in-progress` (DNF) which affects individual-stats/DNF display. Fix separately if desired.
- Round-header overflow on the Leaderboard tab; Ryder-cup team-leaderboard redesign.

## Self-review

- Root cause (finalize trusts stale `sub_matches.result`, can't recompute match play, reads only completed cards) → Tasks 2+3+4. ✓
- Handicap basis matches the live view (playing handicap via `calculatePlayingHandicap`, net via `getFourBallStrokes` inside `calculateTeamMatchData`) → Task 3 + Global Constraints. ✓
- Precedence matches the live view (`selectMatchSource`) → Task 2. ✓
- No placeholder tests; each test states concrete scores/expected outcomes.
- Non-match-play split rounds (pairs better-ball, alt-shot, scramble) are untouched — the resolver is gated on `game_type === 'match-play'`.
