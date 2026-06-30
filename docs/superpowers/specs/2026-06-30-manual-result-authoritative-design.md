# Manually-Entered Sub-Match Results Are Authoritative

**Date:** 2026-06-30
**Branch:** `feat/manual-result-authoritative`
**Status:** Approved design — ready for implementation plan

## Problem

When an organiser sets a sub-match result via the "Set result" sheet, it does **not**
reliably take precedence over hole-by-hole scored data. Observed on prod
("Murray Winter Classic 2026", round 6, 1v1 singles match play, England vs Australia):

1. **Display ignores the manual result.** `selectMatchSource` prefers the live
   (hole-score) computation whenever it is conclusive, so a fully/partly scored match
   shows the *scored* winner, not the organiser's submitted winner.
2. **The team tally is wrong ("0-4").** The overall header tallies by sub-match *side*
   (A/B), not by *team*. In Ryder-cup singles the sides alternate teams across matches, so
   "side B won all four" renders as "England 4 – Australia 0" even though the rows
   (coloured by team) correctly read 2-2.
3. **Scoring overwrites the manual result.** Submitting a match in the team match-play
   scoring screen writes `result`/`final_differential`, silently clobbering an
   organiser-set result.

Points are **not** affected — `finalizePairResults.persistedOutcome` already reads the
stored `result` first, so points honour the manual result (and the prior finalize-guard
fix makes the round write results at all).

## Goal

An organiser's manually-entered sub-match result is **authoritative**: it overrides the
hole scores in the display, the team tally, and the points; it stays fully editable; and
it is never overwritten by later scoring. The team tally counts by **team**, not table
side.

## Non-goals

- No change to points/finalization logic (`persistedOutcome` already correct).
- No change to forfeits (the existing `forfeitWinner` path already wins; forfeits are
  inherently authoritative).
- Per-player manual entry for non-sub-match rounds (unchanged, out of scope).

## Key codebase facts (verified)

- `selectMatchSource(live, persisted)` (`src/components/leaderboard/SubMatchLeaderboardTab.tsx`)
  returns `live` when `live.isComplete`, else `persisted` — i.e. live wins. `persistedMatchData`
  builds the persisted row from `sm.status/result/final_differential/final_holes_remaining`.
- `tallyOverall` (`src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts`)
  sums `pointsA`/`pointsB` by `leaderSide` ('a'/'b'), which is **per-sub-match side**, not team.
  The tally loop in `SubMatchLeaderboardTab.tsx` builds `leaders` via `pushLeader`. Team
  membership is available there via `teamNameByPlayer: Map<playerId, teamName>`.
- The scoring write: `handlePersistSubMatchResult`
  (`src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx`) calls `updateSubMatchResult`
  with `status:'completed', result, finalDifferential` on "Submit Match"
  (`useTeamMatchPlayState.handleSubmitMatch`). It does NOT pass `finalHolesRemaining`.
- The manual write: `handleManualResult` (`SubMatchesTab.tsx`) calls `updateSubMatchResult`
  with `status:'completed', result, finalDifferential, finalHolesRemaining`.
- `updateSubMatchResult` (`src/services/subMatches/index.ts`) builds a `patch` of only the
  provided fields; `SubMatch` type + `rowToSubMatch` map columns explicitly (so a new column
  must be threaded through the `Row` type, `rowToSubMatch`, and the `SubMatch` domain type).
- `persistedOutcome` (`finalizePairResults.ts`) reads `sm.result` first → points already
  honour persisted/manual results.
- There is currently **no flag** distinguishing a manual result from a scored one
  (`final_holes_remaining` is an unreliable proxy — null for a manual "X up" or halved).

## Architecture

### 1. Migration (one boolean column)

```sql
ALTER TABLE sub_matches
  ADD COLUMN manual_result BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN sub_matches.manual_result IS
  'True when the result was set manually by an organiser; takes precedence over hole-score computation and is not overwritten by the scoring flow.';
```

Additive, defaulted, no backfill. **Must be deployed to staging + prod before the JS ships.**
(Existing rows default `false` — see Remediation.)

### 2. Thread the flag through the data layer

- `src/services/subMatches/index.ts`: add `manual_result: boolean` to the `Row` type and
  `rowToSubMatch`; add optional `manualResult?: boolean` to `UpdateSubMatchResultInput`;
  add `if (manualResult !== undefined) patch.manual_result = manualResult;` to the patch.
- `SubMatch` domain type (`src/types/database/round.types.ts`): add `manual_result: boolean`.

### 3. The two writers set the flag

- `SubMatchesTab.handleManualResult` → pass `manualResult: true`.
- `TeamMatchPlayScoringScreen.handlePersistSubMatchResult` → **guard**: if the active
  sub-match is `manual_result === true`, return early (do not write — never clobber a
  manual result). (When it does write a scored result, it passes `manualResult: false` /
  leaves the default, so a scored result clears any prior manual flag is NOT desired —
  since we early-return on manual, the scored write only runs for non-manual matches, where
  the flag is already false.)

### 4. Display precedence (`selectMatchSource`)

`persistedMatchData` returns an additional `isManual` field (from `sm.manual_result`).
`selectMatchSource`: **if `persisted?.isManual` → return the persisted row first**, before
checking `live.isComplete`. Otherwise unchanged (live if complete, else persisted fallback).
So a manual result wins over hole scores; a scored match still shows the (correct) live
margin.

### 5. Team tally counts by team (fixes "0-4")

In the `SubMatchLeaderboardTab` tally loop, resolve each decided match's winning **side**
to its **competition team** using `teamNameByPlayer.get(row.sides.<side>[0].id)`, and tally
by team key (win → +1 winner team; halved → +0.5 each). Carry a resolved team key on each
`SubMatchLeader` so `tallyOverall` sums by team rather than by positional side. The header's
left/right labels already come from the teams; ensure the tallied points map to the correct
labelled team (not the first row's side).

Handle: the synthesized single combined team-vs-team row (no sub_matches) — its two sides are
whole teams, so side already equals team; behaviour unchanged.

## Data flow (manual override)

1. Organiser taps "Set result" → `updateSubMatchResult({ status:'completed', result,
   finalDifferential, finalHolesRemaining, manualResult: true })`.
2. Cascade re-finalizes (points already honour `result`) and completes the round.
3. Leaderboard: `persistedMatchData.isManual=true` → `selectMatchSource` returns the manual
   row → displays the organiser's winner+margin regardless of hole scores; the tally counts
   that win for the correct team.
4. If someone later scores & submits that match, `handlePersistSubMatchResult` early-returns
   (manual_result=true) → the manual result is preserved.

## Edge cases

- Manual result with no/partial scores: displayed (isManual wins); `hasScores=true` so it
  counts in the tally.
- Editing: re-opening "Set result" overwrites winner/margin and re-asserts `manual_result=true`.
- Non-manual scored matches: unchanged (live wins, correct margin), and they tally by team too.
- Forfeits: unchanged (`forfeitWinner` path); tally already counts the forfeit winner — ensure
  the by-team tally also resolves the forfeit winner side to its team.

## Testing

- **Unit (service):** `updateSubMatchResult` persists `manual_result` when provided; omits it
  otherwise.
- **Unit (`selectMatchSource`):** manual persisted (`isManual=true`) wins even when
  `live.isComplete`; non-manual falls back to today's behaviour.
- **Unit (tally):** four singles sub-matches with alternating side/team where one team wins
  via side A in some and side B in others → tally is by team (e.g. 2-2), not by side (4-0).
- **Unit (scoring guard):** `handlePersistSubMatchResult` does not call `updateSubMatchResult`
  when the active sub-match is `manual_result=true`.
- **Unit (persistedMatchData):** forwards `isManual` from `manual_result`.

## Files touched (anticipated)

- `supabase/migrations/<ts>_sub_match_manual_result.sql` (new)
- `src/services/subMatches/index.ts`
- `src/types/database/round.types.ts`
- `src/screens/rounds/ViewRoundScreen/tabs/SubMatchesTab.tsx` (`handleManualResult`)
- `src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx` (`handlePersistSubMatchResult` guard)
- `src/components/leaderboard/SubMatchLeaderboardTab.tsx` (`persistedMatchData`,
  `selectMatchSource`, tally loop)
- `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts` (`SubMatchLeader`,
  `tallyOverall` by team)
- Tests alongside.

## Deployment & remediation

- **Deploy the migration** to staging + prod before shipping JS (alongside the two prior
  undeployed migrations: `final_holes_remaining` + the finalize-guard fix is JS-only).
- Existing sub-match rows default `manual_result=false`. After deploy, the organiser
  re-opens "Set result" on the affected matches (at minimum **round 6 match 3 → Arthur/
  England**) to set the flag and make them authoritative; then the round reads 2-2 across
  display, tally, and points.
