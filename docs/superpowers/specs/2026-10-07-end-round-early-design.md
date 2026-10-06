# End a Social Round Early

**Date:** 2026-10-07
**Branch:** `worktree-end-round-early`
**Status:** Approved design — ready for implementation plan

## Problem

A social round is set up for a fixed number of holes (18, front 9 or back 9) and can
only be submitted once every player has a score on every hole. Golfers often run out
of time: two mates start a 9-hole friendly match-play round, play 6, and have no way
to finish it with a proper result. Today their options are to leave the round
`in-progress` forever, delete it, or invent scores.

Nothing in the app models "holes played" separately from "holes planned" — the
planned count is always derived from `rounds.nine_type`, and every consumer assumes
the two are the same.

## Goals

1. On a **social (standalone) round**, the scorer can **end the round early** after any
   number of complete holes.
2. The early-ended round is a **first-class, shorter round**: results, totals and
   to-par are computed over the holes played; match play is settled by whoever leads
   (level = halved).
3. An early-ended round **never counts towards the handicap index** (or handicap
   history, or as a combinable 9). Only a full 18, or two 9s combined, count.
   Exception: an 18-hole round ended after exactly 9 holes becomes a genuine
   front-9 round and is combinable.
4. Works **offline** — ending early is a local action until submit.

## Non-goals

- Competition rounds (organiser force-submit with DNF already covers them).
- Ending an individual player's round while others continue (the whole round ends).
- Choosing an arbitrary finishing hole — the round always ends after the last
  complete hole.
- Restoring scores removed when the round was ended (Resume restores the holes, not
  the discarded scores).
- Handicap credit for partial rounds (WHS "expected score" for unplayed holes).
- Changing Quick Score Entry's own partial-card flow, beyond the handicap check below.

## Decisions (agreed with Sam)

| Question | Decision |
|---|---|
| Which rounds | Social (standalone) rounds only |
| Result | Leader wins; level = halved. Stroke play / stableford total the holes played |
| Who / how | Anyone who can submit today; round ends after the last hole every player has scored; later partial scores are dropped (warned in the confirmation) |
| Stats | Counts as a round played and feeds per-hole stats; excluded from per-round averages/bests/trends |
| Side games | Settled on holes played (skins re-priced, wolf finalised) |
| Exactly 9 of 18 | Converted to a front-9 round, recalculated on 9-hole handicaps, combinable |
| Data approach | `rounds.holes_played` + a card-level handicap check that doesn't depend on it (Approach 1) |

## Key codebase facts (verified during exploration)

- **Hole count model:** `rounds.nine_type` (`full|front9|back9`, standalone only).
  `filterHolesByNineType` (`src/utils/holeTransformers.ts:24`) narrows a course's holes;
  `getHoleCount` (`src/constants/scoring.ts:118`) maps to 18/9. No starting-hole
  concept for social rounds. Split rounds (`sub_matches`) are competition-only.
- **Precedent:** `EditNineTypeSheet` (`src/components/rounds/ViewRound/RoundDetailsTab/sheets/EditNineTypeSheet.tsx`)
  lets a standalone owner switch `nine_type` mid-round. On success it resets the
  Zustand scorecard store and deletes the SQLite holes cache so the next load
  re-filters. The end-early flow follows the same cache-invalidation pattern.
- **Submit gates:**
  1. `validateScores` (`ReviewScorecardScreen/hooks/useScoreReview.ts:115-147`) — iterates
     the store's `holes` × players in scope.
  2. `checkSubmissionReadiness` (`src/services/scoreMismatch/submission.ts`) — compares
     against `holeCount` (online only).
  3. `finalizeRoundStatus` (`src/services/rounds/finalizeRoundStatus.ts`) — all cards
     terminal.

  Gates 1–2 pass naturally once the hole list is truncated.
- **Scoring screens:** `ScorecardEntryScreen`, `MatchPlayScoringScreen` and
  `TeamMatchPlayScoringScreen` all render the shared `RoundHeader`
  (`src/components/scorecard/RoundHeader.tsx`), which has no menu today.
- **Match-play 18-hole default bug:** `useMatchPlayScoring.ts:173`
  (`calculateMatchStatus(holeResults)`), `useTeamMatchPlayState.ts:118`
  (`calculateTeamMatchStatus(holeResults)`) and `TeamMatchPlayScoringScreen/index.tsx:814`
  (`totalHoles={18}`) assume 18, so a 9-hole match can never be "complete".
- **Standalone results** are not persisted — `refinalizeRoundResults` returns early with
  no `competition_id`. Match results are computed at display time (e.g.
  `useRoundList.ts:950-1025` `computeMatchPlayResult`, which uses `holes.length`).
- **Handicap:** seven differential call sites (SCORING_ARCHITECTURE invariant I8):
  - `scorecardSync.ts` `calculateHandicapData`
  - `recalculateScorecardDifferential.ts`
  - `combineHandicapRounds.ts`
  - `useQuickScoreSubmit.ts`
  - `useQuickScoreEntry.ts` (preview)
  - `useLeagueQuickAddRound.ts`
  - `loadCombinedAndPairs.ts` (hand-rolled formula)

  Recalculation of null differentials happens in `handicapHistory.ts`
  (`findScorecardsNeedingRecalculation`), `tagRoundToLeague` and the edit-tees mutation.
  The only guards today are `isSharedBallRound` and gross ≤ 0. An 18-hole round ended
  after 6 holes would produce a differential around −38 and enter the index.
- **Net total today:** `scorecardSync.ts` stores `total_net = gross − daily_handicap_used`.
  `calculatePlayerStats` (`src/utils/scorecardCalculations.ts:222`) does the same.
  The store's `calculatePlayerTotals` (`src/store/utils/scorecardCalculations.ts:87-120`)
  nets per hole.
- **Skins:** `calculateFinalPayoutsWithCarryover` (`src/utils/skins/payouts.ts:168-200`)
  and hole-value processing (`src/hooks/skins/mutations.ts:181, 305`) price over 18.
  Only `calculateInProgressPayouts` takes `totalHoles`.
- **Wolf:** auto-finalize requires `completedDecisions.length >= 18`
  (`WolfGameSection.tsx:102`). The payout maths is hole-count agnostic.
- **Stats:** `src/hooks/playerStatistics/queries.ts` splits cards into "full" (≥18
  scored holes) vs everything else ("nine-hole" bucket). Partial cards pollute the
  nine-hole bucket, `averagePuttsPerRound`, per-round bunker/hazard averages and the
  `roundTrends` sparkline. Same split in `courseQueries.ts`.
- **Activity feed:** `get_activity_feed` / `get_round_feed_card` — latest definitions in
  `supabase/migrations/20260905000150_ugc_moderation_feed.sql`.
- **Per-hole par sums over the full course** in `usePlayerScorecard.ts:315-362`,
  `calculateParTotals` (`scorecardCalculations.ts:258-272`) and
  `multiBallScorecard.ts:150-180`. These are correct only if they are fed the
  truncated hole list.

## Design

### 1. Data model & ending the round

**Schema.** New column `rounds.holes_played SMALLINT NULL CHECK (holes_played > 0)`.
- `NULL` = played as planned.
- The value is a **count** of holes from the round's first hole, so a back-9 round
  ended after 6 holes = holes 10–15.
- The TS round types gain `holes_played` / `holesPlayed`.

**Hole helper.** A single helper (e.g. `filterPlayableHoles(holes, nineType, holesPlayed)`)
applies `filterHolesByNineType`, then keeps the first `holesPlayed` holes in hole order.
Every place that loads an *existing* round's holes moves to it:
- `initializeRoundSlice`
- `useRoundData`
- `useMatchPlayData`
- `ViewRoundScreen`
- `StatsTab`
- `RoundScorecardTab`
- any display path found during planning

Round-creation callers keep `filterHolesByNineType`.

**Exactly 9 of 18.** When a `full` round is ended after exactly 9 holes (holes 1–9),
set `nine_type = 'front9'` and leave `holes_played` NULL. It becomes an ordinary
complete 9-hole round, and daily handicaps / shot allocation are recalculated on
9-hole rules (as `EditNineTypeSheet` does today).

**Entry point.** A ⋮ menu in `RoundHeader` with "End round early", shown when all of
these hold:
- the round is standalone (no `competition_id`);
- the user can submit the round today;
- at least one hole is complete for every player in scope;
- not every planned hole is complete yet (otherwise it's a normal submit).

Available on all three scoring screens.

**N (finishing hole).** N is the largest count such that the round's first N holes
all have a score for every player in scope. A pickup counts as scored. Scores on later
holes (a half-scored hole, or holes after a skipped one) are removed.

**Confirmation dialog** shows:
- "End round after hole N?"
- which scores will be removed;
- the result preview (e.g. "Dave wins 2 UP", "Halved A/S", stroke/stableford leader);
- "This round won't count towards your handicap index" — or, for exactly 9 of 18,
  "This becomes a front-9 round" with the result recalculated on 9-hole handicaps.

**On confirm** (no server write yet):
1. Persist the end-early state locally (survives app restart offline).
2. Remove scores after N from the local cards (queued for sync like any score edit).
3. Truncate the store's hole list to N, or switch the store to `front9` for exactly 9.
4. Navigate to **Review & Submit** — the single finish path for all formats,
   including match play.

**Review screen.** A banner reads "Ended after N of M holes · Resume playing".
Resume clears the local end-early state and restores the full hole list. Removed
scores are not restored.

**Submit.** Before the existing `finalizeRoundStatus` → results → achievements → skins
steps, write `rounds.holes_played = N` (or `nine_type = 'front9'`). Offline, this
write is applied when the queued submission syncs. The plan must verify how today's
offline submit later finalises round status, and attach the round write to that
same path.

### 2. Results & handicap

**Results.** These follow from the truncated hole list.
- **Match play:** with 0 holes remaining, the leader wins "X UP"; level = "A/S".
  This must never render as "X&Y" (e.g. "2&3"). Covers singles and team match play,
  the round-list pill, the ViewRound Match tab and the Review screen.
- **Hole-count bug fix:** fix the 18-hole defaults in `useMatchPlayScoring`,
  `useTeamMatchPlayState` and `TeamMatchPlayScoringScreen` to use the actual hole
  count. This also fixes 9-hole "Submit Match" never enabling.
- **Stroke play / stableford / team formats** total over the holes played.

**Net over holes played.** For early-ended cards, the net total = Σ(gross − strokes
received) over the holes played, instead of gross − full daily handicap.
- `daily_handicap_used` still stores the planned round's daily handicap.
- This changes the "net = gross − DHC" rule *for early-ended cards only* and falls
  under the scoring guardrails: run the analyst and add a characterization test
  first.
- It applies everywhere net totals are computed for these cards: sync, display
  totals and leaderboards.

**Handicap gate.** A shared predicate, e.g. `isCompleteForHandicap(scores, nineType)`,
is true only when every planned hole has a score (pickup counts as scored).
- **Applies at:**
  - all seven differential call sites;
  - combinable-nine eligibility (`loadCombinedAndPairs`);
  - combine validation (`combineHandicapRounds.validateAndBuildContext`).
- **Card-based on purpose:** it reads the card, not `rounds.holes_played`, so it holds
  even when the card syncs before the round write (offline).
- **Belt and braces:** also skip any round with `holes_played` set, wherever the round
  row is available.
- **Recalculation paths** (`handicapHistory`, `tagRoundToLeague`, edit-tees) go
  through `recalculateScorecardDifferential`, which applies the gate. They must not
  resurrect a differential.
- **Side effect:** partial Quick Score Entry cards also stop getting differentials.
- **Leagues:** `tagRoundToLeague` already rejects < 18 holes. `getEligibleScorecards`
  also filters out early-ended rounds.

### 3. Side games, stats & display

**Skins**
- Final settlement (individual and team) and hole values are priced over the holes
  actually played. Payouts stay zero-sum.
- This also fixes the 9-hole final-settlement buy-in being priced for 18.
- Skins results for holes after N are deleted.
- Settlement runs in the normal submit.

**Wolf**
- Auto-finalize when decisions cover every hole in the round (not a hard-coded 18).
  This also fixes 9-hole wolf never finalising.
- Decisions for holes after N are dropped.

**Stats**
- *Counted:* rounds played (and round-count achievements); per-hole metrics — score
  distribution, par-3/4/5 averages, per-hole average, FIR/GIR, putts per hole.
- *Excluded* (numerator and denominator): average score, best/worst, the "9-hole"
  bucket (average and best), the `roundTrends` sparkline, putts/bunker/hazard
  per-round averages. Same rules in `courseQueries.ts`.
- *Achievements:* `hole_count` = holes played, so the 18/9-hole achievements don't
  trigger. `LOW_SCORER` ignores early-ended rounds.

**Display**
- **"Ended after N of M" label** on:
  - the Rounds list row;
  - the ViewRound details/header;
  - the activity-feed round card;
  - the Review banner.
- **Activity-feed RPCs:** `get_activity_feed` and `get_round_feed_card` also return
  `holes_played` and `nine_type`. Recreate them from their latest definitions.
- **Scorecard grids** show only the holes played, like 9-hole rounds hide the back 9.
  This fixes full-course par sums ("−44" to par). The plan enumerates every display
  path that loads a completed round's holes and routes it through the helper.

### 4. Testing & rollout

**Guardrails (CLAUDE.md).**
- Before editing, run `scoring-impact-analyst` on each scoring file touched: store
  slices, `utils/scoring`, `scorecardCalculations`, match-play calculations,
  `components/scorecard`.
- Add characterization tests for unprotected behaviour first: net over holes played,
  the handicap gate across all differential call sites (I8), match status with
  truncated holes.
- After each step, run the scoring subset and `pnpm verify:gate`.

**New tests**
- *Hole helper:* full, front9, back9 (10–15), exact-9 conversion.
- *N computation:* skipped hole, half-scored hole, no complete hole (action hidden).
- *Handicap gate:*
  - every differential call site returns null for incomplete cards;
  - incomplete 9s are not combinable;
  - recalculation paths don't resurrect differentials.
- *Net:* over holes played for early-ended cards; unchanged for complete cards.
- *Match result:* 6-hole match → "2 UP" / "A/S", never "2&3"; the 9-hole match-play
  default fix.
- *Skins / Wolf:* skins zero-sum at 6 and 9 holes; wolf finalises at the round's hole
  count.
- *Stats:* early-ended rounds are excluded from per-round averages and included in
  per-hole stats.
- *End-early state:* survives reload; Resume restores the hole list.

**Rollout**
- Migration (`holes_played` column + the two feed RPCs) deploys to **staging then prod
  before** the app update ships. The new client writes `holes_played` on submit.
- Older clients ignore the column: an early-ended round reads as a shorter-scored
  9/18 and the match pill may show "X&Y". Older clients can't end rounds early, so
  the handicap gate being client-side is acceptable. The force-update gate is
  available if needed.
- **On-device QA:**
  - stroke play;
  - singles match play;
  - team match play;
  - exactly 9 of 18;
  - end offline then sync;
  - skins settlement;
  - wolf settlement;
  - Resume.

## Revision 2 — planning research (2026-10-07)

Code research during planning showed parts of the design above won't work as
written. **Where this section conflicts with the sections above, this section wins.**
Sam approved the three behaviour decisions marked ★.

### R1. The store keeps the planned holes; "played" is derived

*Supersedes* "truncate the store's hole list" (§1 step 3) and "results follow from
the truncated hole list" (§2).

Every daily-handicap calculation takes `par = Σ par of the holes passed in`:
- `store/utils/scorecardCalculations.ts:63`
- `utils/scorecardCalculations.ts:140`
- the `coursePar` stamped in `submitScorecards` (`scorecardStore.ts:410`)

Cutting the store's hole list to N would inflate every daily handicap by tens of
strokes. The truncation would also be undone by:
- `useRoundData`'s yardage-hydration effect;
- `saveHoles` (upsert-only);
- the nine-type mismatch resets.

The rule is: **math gets the planned holes plus `holesPlayed`; anything that
renders, validates or counts holes remaining slices to the played holes.**
- The store gains `holesPlayed: number | null` next to `holes` (planned) and
  `nineType`.
- Played holes = `filterPlayableHoles(holes, nineType, holesPlayed)`.
- **Exactly 9 of 18** is a genuine change of planned holes. The store switches to
  `nineType 'front9'` with holes 1–9, recomputes totals, and keeps `holesPlayed = null`.
  The local record remembers the original nine type so Resume can restore it from the
  SQLite holes cache (`saveHoles` never deletes rows).

### R2. Local end-early record

- An AsyncStorage-persisted zustand store keyed by round id holds
  `{ holesPlayed, convertToFront9, originalNineType, endedAt }`. The precedent is
  `teeOverrideStore`.
- The round shape is resolved by `resolveRoundShape(serverRound, localRecord)`. Every
  scoring init path and both nine-type mismatch guards (`useRoundData`,
  `useMatchPlayData`) use it, so a pending local end isn't "corrected" back by the
  server row.

### R3. Removing scores after N

There is no store action, DAO or sync path that removes a hole score today.

Add:
- a store action that deletes score keys and recomputes totals;
- a per-hole SQLite delete (`hole_scores`);
- a queued snapshot sync. The `write_scorecard_snapshot` RPC replaces `scores`
  wholesale, so removals reach the server.

### R4. One server operation: `end_round_early` RPC

Skins results can only be deleted by the skins-game creator (RLS), so trimming side
games needs a `SECURITY DEFINER` function: `end_round_early(p_round_id,
p_holes_played, p_convert_to_front9)`.

**Permission check:** standalone round (`competition_id IS NULL`); caller is the round
owner or a participant.

**What it does:**
- Sets `holes_played = N`, or `nine_type = 'front9'` with `holes_played = NULL`.
- Deletes, for holes after the last played hole number:
  - `skins_results`;
  - `wolf_hole_decisions`;
  - `score_entries`.
- It is idempotent.

**How the client calls it:** directly on submit when online; via the queued round item
when offline (R5).

### R5. ★ Offline submit finalises the round (all rounds)

Today an offline-submitted social round is never marked `completed`: no sync item,
trigger or retry exists.

**New queued sync item:** `PendingSync.type 'round'`. The type exists, but
`processPendingSync` rejects it today.

**Payload:** `{ id: roundId, action: 'finalize', endRoundEarly? }`.

**Handler**, via `finalizeSubmittedRound(roundId, opts)`:
1. Apply the end-early RPC (if any).
2. `finalizeRoundStatus`.
3. `refinalizeRoundResults`.
4. Skins finalisation, through an extracted non-hook `finalizeSkinsGame` service.

**When it runs:** queued after the card syncs, and only acts when every card is
terminal. Otherwise it stays queued.

**Online submit** calls the same `finalizeSubmittedRound`. Achievements stay online-only
(as today).

### R6. Singles match play finishes on the Match Play Scorecard screen

*Supersedes* "Navigate to Review & Submit … including match play" (§1).

Singles never reaches `ReviewScorecard` today, and Review shows no match result for
singles. Ending early from `MatchPlayScoringScreen` therefore goes to
`MatchPlayScorecardScreen`, which already has "Review & Submit". Its submit path calls
`finalizeSubmittedRound` (fixing its direct `status='completed'` write).

All other formats, including team match play, go to `ReviewScorecard`. Both screens
show the "Ended after N of M · Resume playing" banner.

### R7. ★ Match margins: "N UP" when no holes remain (all matches)

`calculateMatchStatus` and `calculateTeamMatchStatus` check "lead > holes remaining"
before "0 remaining". So any match decided on the last hole reads "N & 0", and the
"N up" branch is unreachable. The same applies to the round-list pill.

This is fixed everywhere, and the tests locking "& 0" are updated deliberately. A new
invariant **I10** (no holes remaining ⇒ "N UP"/"A/S", never "N&M") is added.

**Ended-early match result:**
1. If the lead ever exceeded the *planned* holes remaining at some hole ≤ N, the
   real close-out stands (e.g. 5&4).
2. Otherwise the final lead after N holes wins "N UP" (level = A/S).

`calculateMatchStatus(results, plannedHoles, holesPlayed?)` implements this.

Also fixed — the remaining 18-hole defaults:
- `MatchPlayScorecardTable/utils.ts`;
- `TeamMatchPlayScorecardTable/utils.ts`;
- `TeamMatchPlayScoreView`;
- `TeamMatchPlayScoringScreen` (raw course holes, no `nineType` on init,
  `totalHoles={18}`).

### R8. Handicap gate details

- **`isCompleteForHandicap(scores, nineType)`** judges planned holes from `nineType`
  (`getHoleRange`), never from the hole list passed in.
- **Legacy cards:** a card with **no per-hole data at all** keeps today's gross-based
  behaviour, so existing tests and imports don't change.
- **`recalculateScorecardDifferential`** writes `handicap_differential = null` for an
  incomplete card (still updating daily handicap and points) instead of throwing. It
  returns `handicapDifferential: number | null`. Throwing would break mid-round Change
  Tees, which recalculates partial in-progress cards.
- **`tagRoundToLeague`** checks the 18-hole rule *before* recalculating.
- **`useLeagueQuickAddRound`** blocks partial cards at review, not after it has
  created rows.
- **`useQuickScoreSubmit`** takes an explicit `nineType`. Its caller passes unfiltered
  holes today.

### R9. Skins pricing

Hole values are priced on the **planned** hole count
(`getHoleCount(nine_type)`, not the default 18). Settlement prices the buy-in as:

`calculateTotalPot(type, value, planned) × holesPlayed / planned / participants`

so the pot shrinks in proportion to the holes played and payouts stay zero-sum.
For a complete round this equals today's buy-in at 18 holes, and fixes 9-hole rounds.

Display paths that re-derive payouts get the same hole counts.

Team-skins final settlement uses the individual calculator today (a pre-existing bug).
It is **out of scope** and noted as a follow-up.

### R10. ★ Wolf: trim only

*Supersedes* "Wolf auto-finalize" (§3).

Wolf finalisation is dead code for every round: `WolfGameSection` isn't rendered, and
`useFinalizeWolfGame` reads a non-existent `pot_value_per_point`. Standings are only
computed for display.

This feature:
- trims decisions after N (via the RPC);
- makes the Wolf tab and standings use the holes played ("of 6 holes").

Wiring wolf finalisation is a separate follow-up.

### R11. Smaller decisions

- **Who can end early:** only when the device scores every player in the round (no
  group scoping). Otherwise another group's cards could hold more holes than N.
- **Stats:** early-ended rounds still appear in "recent rounds", with their label.
  Their gross goes into the per-hole average numerator (holes are in the denominator).
- **Achievements:** `gross_score` is omitted from the event for early-ended rounds
  (`LOW_SCORER` skips them). `hole_count` is the played count.
- **Activity feed RPCs:** these must be **dropped and recreated** (the return type
  changes), with grants re-added. The precedent is
  `20260616000000_activity_feed_course_id.sql`.
- **Test subset:** the CLAUDE.md scoring subset misses most of the affected tests. The
  plan defines an extended pattern.
