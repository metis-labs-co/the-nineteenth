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
