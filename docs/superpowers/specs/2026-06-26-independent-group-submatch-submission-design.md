# Independent Group & Sub-Match Submission — Design

**Date:** 2026-06-26
**Status:** Approved (design), pending implementation plan
**Author:** Sam / Claude

## Problem

In a team competition (e.g. 2 teams of 8, split into 2 on-course groups of 4), each
group must be able to **submit its own scorecards independently** — without waiting for,
or checking, the other group's scores. The same must hold for **sub-matches** within a
split round: each sub-match should be submittable as soon as its own players are done,
not gated on the whole round.

Observed on match day (2026-06-26): with one scorer per group, Group A could not submit
because the app was waiting on Group B's scorer to finish, even though the two groups
scored completely different players.

## Root Cause

The results/finalization layer is **already incremental** — partial submissions produce
partial leaderboards and sub-matches are scored independently
(`refinalizeRoundResults.ts`, `finalizePairResults.ts`, leaderboard reads live from
`round_results`). Nothing there forces a wait.

The block is entirely in the **submission-readiness gate**:
`src/services/scoreMismatch/submission.ts`.

`checkSubmissionReadiness(roundId, userId, scoringPairsEnabled, holeCount)` is **not
scoped to the group being submitted**. It queries the whole round:

- **Multi-scorer path** (`checkMultiScorerReadiness`, line 92): once 2+ distinct scorers
  have written any `score_entries`, it requires **every other scorer in the round** to
  have completed every player they touched — regardless of whether they share any players
  with the submitter. Two groups scoring different people block each other. Returns
  `waiting_for_other_scorers`.
- **Pairs path** (`checkPairsReadiness`, line 49): `getPendingMismatches(roundId)` is
  round-wide, so an unresolved mismatch in *another* group's pair would block an
  unrelated submitter.

The caller (`src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts:417`)
already has the group's player IDs available (`groupScorecards` keys / `currentPlayers`)
but does not pass them down.

Sub-matches scored via `MatchPlayScorecardScreen` already submit directly with **no**
readiness gate, so those are independent today. The risk is only when a split round is
scored through the normal review screen, where the multi-scorer over-block applies.

## Goals

1. Each on-course group submits independently; no cross-group wait.
2. Each sub-match submits independently; no cross-sub-match wait.
3. **Preserve same-group reconciliation:** if two devices score the *same* player
   differently within a group, still surface the mismatch and block until resolved.
4. Scoring-pairs behaviour unchanged: you still only score / wait on yourself + your
   assigned pair.

## Non-Goals

- No database schema changes / migrations.
- No changes to the finalization or leaderboard layers (already incremental).
- No change to the bypass-timer mechanism itself.
- No change to `MatchPlayScorecardScreen`'s direct-submit path.

## Design

**Principle:** scope the readiness gate to the set of players the submitting device is
responsible for (its group). Only other scorers who **overlap** on those players are
relevant; everyone else (other groups) is ignored.

### 1. Thread the group player set into the gate

Add `groupPlayerIds: string[]` to `checkSubmissionReadiness` and its two sub-functions.
Populate it at the call site in `useScoreSubmission.ts` from the scorecard store's
`groupScorecards` keys (equivalently `currentPlayers.map(p => p.id)`).

`groupPlayerIds` represents exactly the players whose scorecards this submit action will
mark `completed`.

### 2. Multi-scorer path — overlap-scoped

In `checkMultiScorerReadiness`:

- **Mismatch block:** filter pending mismatches to those whose `player_id` ∈
  `groupPlayerIds`. Block only on those. (Detection via `createMismatchRecords` can stay
  round-wide — it only creates a mismatch where two scorers disagree on the same
  `player_id` + `hole_number`, so disjoint groups naturally produce none.)
- **Completeness:** for each other scorer, compute
  `overlap = playersTheyScored ∩ groupPlayerIds`.
  - If `overlap` is empty → that scorer is in a different group → **ignore**.
  - Otherwise require they have completed `overlap.size × holeCount` entries **for the
    overlap players**; if short, they're an `incompleteScorer`.
- The `distinctScorers.size <= 1` auto-detect short-circuit becomes "≤1 scorer touching
  *my group's players*" — a solo group still submits with zero friction even if another
  group is mid-entry.

Net: different groups never wait on each other; co-scorers of the *same* player still
reconcile and wait (goal 3 preserved).

### 3. Pairs path — scope mismatch block to the pair

In `checkPairsReadiness`, scope `getPendingMismatches` to the submitter's pair players
(self + assigned partner) so another group's pair mismatch cannot block. Partner-progress
logic already targets only the assigned scorer and is unchanged.

The pair's player set can be derived from `groupPlayerIds` (which on a pairs device is
self + partner) or from the existing `scoring_pairs` lookup; implementation plan to pick
the simpler of the two.

### 4. Sub-matches

No dedicated change. A sub-match's players are a subset of a group, so scoping the gate to
that subset makes each sub-match independently submittable. Implementation step will
**verify** which screen/flow a split round uses (`MatchPlayScorecardScreen` vs
`ReviewScorecardScreen`) and confirm both paths submit independently with the scoping in
place.

### 5. Bypass timer

Unchanged in mechanism. It already keys on `(round_id, player_id)`. With overlap-scoping,
a bypass only ever arises from a genuine same-group / same-pair wait, which is the
intended use.

## Affected Files (anticipated)

- `src/services/scoreMismatch/submission.ts` — add `groupPlayerIds` param; overlap-scope
  both readiness functions.
- `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts` — pass group
  player IDs from the store.
- Possibly `src/services/scoreMismatch/detection.ts` — only if a scoped
  `getPendingMismatches(roundId, playerIds?)` variant is cleaner than filtering at the
  call site.
- Tests under `src/services/scoreMismatch/` for the new scoping behaviour.

## Testing Strategy

Unit tests on the readiness functions:

1. **Two disjoint groups, both multi-scorer:** Group A submits while Group B's scorer has
   only done some holes → `canSubmit: true` for A. (Regression for today's bug.)
2. **Same-group double-scoring, overlapping player incomplete:** other scorer in my group
   started my player but hasn't finished → `waiting_for_other_scorers` listing only that
   scorer. (Goal 3.)
3. **Same-group mismatch on a group player:** unresolved mismatch on a `player_id` in my
   group → `unresolved_mismatches`; a mismatch on another group's player → ignored.
4. **Solo scorer for the group** while another group is active → `canSubmit: true`.
5. **Pairs path:** another group's pair has a pending mismatch → I can still submit; my
   own pair's mismatch still blocks me.
6. **Sub-match:** a sub-match's players done, other sub-matches incomplete → that
   sub-match submits.

Plus manual on-device verification of the two-groups-of-4 scenario (deferred to QA, per
project norms — staging/device QA tracked separately).

## Risks

- **Over-narrow scoping** could let a genuine same-player conflict slip through. Mitigated
  by keeping detection round-wide and only filtering the *block* to group players (a
  same-player conflict is, by definition, on a group player).
- **Shared checkout:** work is being done on the main checkout (user override of the
  worktree rule); no branch switching. Edits are JS-only and ship via OTA from this
  version forward.

---

## REVISION (2026-06-26) — verified data model invalidates the single-coupling assumption

The original design above assumed `groupScorecards` on a device contains only the
on-course group. **Verified false for team rounds.** Investigation + live prod data
(competition "Murray Winter Classic 2026", round played 2026-06-26):

- Every round is `is_team_round = true`.
- The active round has **8 in-progress scorecards, 2 pairings of 4, 2 distinct scorers,
  134 score_entries, nothing submitted** — i.e. exactly the cross-group wait, with no data
  corruption yet.
- `useRoundData.ts:311-338` loads **all team members** into `groupScorecards` for team
  rounds. The user confirmed the scoring screen "showed my group with the option to show
  all 8" — `useGroupFilter` is active (field of 8, display filtered to the pairing of 4).

So the on-course **group boundary is the user's pairing** (`pairings.player_ids`, 4
players), and `groupScorecards` holds the whole 8-player field. Three places couple the
two groups together, not one:

1. **Readiness gate** — original Tasks 1–3. Tasks 1–2 (service-layer scoping) are correct
   and committed. Task 3 passed `groupScorecards.keys()` (all 8) → still round-wide. ❌
2. **`submitScorecards`** (`scorecardStore.ts:353`) — marks **every** card in
   `groupScorecards` `completed` and syncs it → one group's submit completes the other
   group's cards. ❌
3. **`updateRoundStatus`** (`useScoreSubmission.ts:583` → `useRoundFinalization.ts:37`) —
   unconditionally flips the whole **round** to `completed` on the first submit. ❌

### Revised architecture — `allowedPlayerIds` as the single group-scope source

The store already has `allowedPlayerIds` meaning "players this device is responsible for"
(populated today only for scoring-pairs, via `useRoundData.ts:465`; consumed by
`useScoreReview`). Make it the **single source of group scope** and drive all three
couplings from it.

**Group scope decision (user, 2026-06-26): the user's pairing, toggle-aware.** When the
group filter's "show all / mark another group" toggle is on, scope expands to the shown
set; otherwise it's the pairing.

1. **Populate `allowedPlayerIds` for the group-filter case.** In `ScorecardEntryScreen`,
   when `useGroupFilter` is active (team multi-group, no scoring pairs), set
   `allowedPlayerIds` to the filter's **effective** player set (`groupFilter.groupPlayers`
   ids) and update it when the show-all toggle changes. Scoring-pairs population is
   unchanged. (Net: `allowedPlayerIds` = the device's responsibility set in both modes;
   empty when neither applies → legacy whole-field behaviour.)

2. **Readiness gate (#1).** In `useScoreSubmission`, derive `groupPlayerIds` from
   `store.allowedPlayerIds` (fall back to `groupScorecards.keys()` when empty), and pass it
   to `checkSubmissionReadiness` — replacing the current `groupScorecards.keys()` source.

3. **Submit scope (#2).** Add an optional `playerIds?: string[]` to `submitScorecards`;
   when provided, only complete/sync cards for those players (default = all, backward
   compatible). The call site passes `allowedPlayerIds` (when non-empty).

4. **Round completion (#3).** Change `updateRoundStatus` to flip the round to `completed`
   **only when every scorecard for the round is `completed`** (query the round's scorecard
   statuses; if any remain non-completed, leave `in-progress`). Each group's results still
   finalize incrementally via `finalizeRoundResults` on every submit. Backward compatible:
   a single-group round's one submit completes all its cards → round completes as today.

### Decision recap (user, 2026-06-26)

- Same-group reconciliation preserved (already in Tasks 1–2).
- Group scope = pairing, toggle-aware (via `allowedPlayerIds`).
- Round flips to `completed` only when all groups have submitted.
- Work on the main checkout, no branch switch.

### Non-goals (revised)

- No schema change. `is_team_round`, `pairings`, `allowedPlayerIds`, `scorecards.status`
  all already exist.
- No change to `MatchPlayScorecardScreen` (already gate-free, submits directly).
- No change to the incremental finalization / leaderboard layer.

### Manual QA addendum

Reproduce against the real shape: team round, 8-player field, 2 pairings of 4, a scorer per
group. Group A submits while Group B is mid-round → A passes the gate, only A's 4 cards
complete, round stays `in-progress`; Group B later submits → their 4 complete, round flips
to `completed`. Toggle "show all" then mark + submit another group → those cards included.
