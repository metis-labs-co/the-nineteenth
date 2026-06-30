# Organiser Manual Sub-Match Result Entry (on force-submit)

**Date:** 2026-06-30
**Branch:** `feat/manual-submatch-result`
**Status:** Approved design — ready for implementation plan

## Problem

The organiser force-submit feature (merged 2026-06-29) finalizes a competition round
and marks unfinished players DNF. Two real gaps surfaced in on-device testing:

1. **It can't finalize the rounds organisers actually have.** In practice the organiser
   enters scores for the group but the scorecards stay `in-progress` (nobody taps the
   formal "submit"). Force-submit counts only `completed`/`confirmed` cards, so it sees
   zero, the dialog disables Submit, and the round never completes — with no error shown.
   (Confirmed on staging: a round where 4 players had full 18-hole cards, all `in-progress`,
   could not be force-submitted.)
2. **No way to record a match result directly.** For split / team match-play rounds the
   meaningful output is a result like **"6 & 5 to Team A"**, but the organiser has no way
   to enter that manually — only the per-sub-match *forfeit* button and the normal
   hole-by-hole match-play scoring flow set sub-match results today.

## Goals

1. **Manual per-sub-match result entry.** On a split round (rounds with `sub_matches`),
   an organiser can manually set each sub-match's result: **winner (Team A / Team B /
   Halved) + margin "X & Y"** (holes up & holes to play, e.g. "6 & 5"). This drives
   competition points and completes the round, reusing the existing finalize cascade.
   Manual entry is an **optional override** — a sub-match left unset still derives from
   scorecards.
2. **Make force-submit actually finalize combined/individual rounds.** A scorecard with a
   score on **every** hole counts as finished (even if status is `in-progress`); partial
   or empty cards are DNF. Force-submit is allowed even when no card is complete (round
   closes, everyone DNF).
3. Replace the current "split rounds are excluded from force-submit" rule with the manual
   result path.

## Non-goals

- Per-player manual *final-score* entry for individual stableford/stroke combined rounds
  (no sub-matches). Those finalize via the scorecard-counting fix. (Can be a later design.)
- Changing competition-points math or the finalize pipeline. We reuse it.
- Net-score manual entry for stroke-based sub-matches (winner + margin only for v1).

## Key codebase facts (verified)

- **`sub_matches` already models match results.** Columns: `status`
  (`upcoming`/`in-progress`/`completed`/`forfeited`), `result`
  (`a-wins`/`b-wins`/`halved`/`forfeit-a`/`forfeit-b`), `final_differential` SMALLINT
  (unsigned holes-up margin; sign derived from `result`), `team_a_net_total`/
  `team_b_net_total`. (`20260422100000_round_sub_matches.sql`.) **There is no column for
  holes-remaining** (the "& 5").
- **The write path exists.** `useUpdateSubMatchResult(roundId)`
  (`src/hooks/rounds/subMatches.ts`) → `updateSubMatchResult`
  (`src/services/subMatches/index.ts`) accepts `{ subMatchId, status, result,
  finalDifferential, teamANetTotal, teamBNetTotal }`. On success it invalidates caches,
  finalizes any sub-match skins, calls `refinalizeRoundResults(roundId)` (pair-points →
  `round_results`), then `finalizeRoundStatus(roundId)` (completes the round once **every**
  sub-match is terminal). We reuse this end to end.
- **Results → points.** `finalizePairResults` (`src/services/rounds/finalizePairResults.ts`)
  reads each sub-match's persisted `result` first (a-wins/b-wins/halved/forfeit), falling
  back to live score computation; accumulates `pair_points` win/tie/loss per team into
  `round_results` (position, competition_points, raw_result_data). Manual results flow
  through the same persisted-result branch — no new points logic.
- **Margin string format.** `MatchPlayEngine.ts` builds the display margin as
  `` `${holesUp}&${holesRemaining}` `` (e.g. `6&5`), `` `${up} up` `` when holes-remaining
  is 0, or `A/S` when halved. The leaderboard reads `raw_result_data.final_margin`
  (`roundLeaderboardFormatters.formatMatchPlayData`). We mirror this format for manual
  results so display is unchanged.
- **Permissions.** RLS already allows the organiser to UPDATE `sub_matches` and `rounds`.
- **Round shape detection.** Split round = `round.round_format === 'split'` (has
  `sub_matches` rows); combined individual round has none.
- **Scorecard completion math** is computed on normal submit (sets `total_net`,
  `total_points`, `daily_handicap_used`). An `in-progress` card has `total_gross` but may
  lack the net/points snapshot. Promoting a full card to `completed` must run that same
  computation (reuse the existing scorecard-finalization service —
  `recalculateScorecardDifferential` / the submit-path scoring util) so results are correct.

## Architecture

### 1. Migration (single additive column)

```sql
ALTER TABLE sub_matches
  ADD COLUMN final_holes_remaining SMALLINT
  CHECK (final_holes_remaining IS NULL OR final_holes_remaining BETWEEN 0 AND 17);
COMMENT ON COLUMN sub_matches.final_holes_remaining IS
  'Holes-to-play half of a match-play margin (the "5" in "6 & 5"); set for organiser
   manual results and stored so the margin survives re-finalization. NULL = went the
   distance ("X up") or not a manually-entered match result.';
```

Nullable, additive, no backfill. **Must be deployed to staging + prod before the feature
ships** (manual margins won't persist otherwise). Deployment is manual in this project.

### 2. Service + hook extension

- Extend `UpdateSubMatchResultInput` and `updateSubMatchResult`
  (`src/services/subMatches/index.ts`) with optional `finalHolesRemaining?: number | null`,
  persisted to the new column. No other change to the function's cascade.
- `useUpdateSubMatchResult` passes it through unchanged.
- **Margin string source of truth.** `finalizePairResults` (and any sub-match → match-play
  result writer) builds `raw_result_data.final_margin` from the sub-match's
  `result` + `final_differential` + `final_holes_remaining`, using the same format as
  `MatchPlayEngine` (`"6&5"`, `"6 up"`, `"A/S"`). Add a small shared helper
  `formatMatchMargin(holesUp, holesRemaining, halved)` in `src/utils` and use it in both
  the engine and finalize path (DRY; the engine currently inlines this).

### 3. Manual result UI (new) — `SubMatchResultSheet`

Organiser-only bottom sheet (wrapped in `SystemModalTheme` if presented as a modal).
Inputs:
- **Winner:** segmented control — Team A / Halved / Team B (labelled with the side names).
- **Margin** (hidden when Halved): two small steppers/number inputs — **holes up** (1–17)
  and **holes to play** (0–17). Live preview of the formatted result ("Team A — 6 & 5").
- Confirm → `useUpdateSubMatchResult({ subMatchId, status: 'completed', result:
  'a-wins'|'b-wins'|'halved', finalDifferential: holesUp (or null when halved),
  finalHolesRemaining: holesToPlay (or null) })`.
- Validation: holes-up ≥ 1 for a winner; holes-to-play ≤ remaining sanity; Halved clears
  margin. Block confirm otherwise with an inline message.

Entry points (organiser-only):
- The **sub-match leaderboard / SubMatchesTab** row gains a "Set / edit result" action
  (alongside the existing forfeit affordance).
- The **force-submit flow** for split rounds (below).

### 4. Force-submit flow

- **Split rounds:** "Submit Round Now" opens a **per-sub-match checklist** showing each
  sub-match's current result (manual, scored, forfeited, or "not set") with a "Set result"
  control per row. Submitting requires every sub-match to be terminal — the organiser sets
  any "not set" ones manually (or via existing forfeit). Once all are terminal,
  `finalizeRoundStatus` completes the round (existing behaviour). Remove the prior
  `isSplitRound` exclusion from the Submit-now gating in `RoundSettingsScreen` /
  `RoundsTab` / `CompetitionRoundCard`.
- **Combined / individual rounds:** the existing `ForceSubmitRoundDialog` is used, with the
  counting fix below.

### 5. Counting fix (combined rounds + scorecard fallback)

In `forceFinalizeRound` (`src/services/rounds/forceFinalizeRound.ts`), before flipping
status:
- For each scorecard of the round that is **not** terminal but has a score on **every**
  hole of the round (`holesScored === round hole count`), promote it: run the existing
  scorecard-finalization computation (so `total_net`/`total_points`/`daily_handicap_used`
  are correct) and set status `completed`.
- Then set the round `completed` and `refinalizeRoundResults` (counts the now-completed
  cards; partial/empty cards have no result row → DNF, as today).
- **Relax the guard:** allow force-submit when there is ≥1 full card **or** (for split
  rounds) ≥1 manual/terminal sub-match; if neither, still close the round (everyone DNF)
  per the approved "allow it" choice. `NoCompletedScorecardsError` is removed or downgraded
  to a non-blocking case.
- Update `ForceSubmitRoundDialog`: "incomplete" = a player whose card is **not** full
  (missing holes), not merely "not formally submitted". The zero-completed disable is
  replaced by this full-card definition.

### 6. Data flow

Manual sub-match result:
1. Organiser opens `SubMatchResultSheet`, picks winner + "6 & 5", confirms.
2. `useUpdateSubMatchResult` writes `sub_matches` (result, final_differential,
   final_holes_remaining, status='completed') → cascade: `refinalizeRoundResults`
   (pair points; `final_margin` = "6 & 5") → `finalizeRoundStatus` (round completes when
   all sub-matches terminal) → competition points update.
3. Leaderboard shows "Team A 6 & 5" via existing match-play formatter.

Combined force-submit:
1. Organiser confirms `ForceSubmitRoundDialog` (lists players with non-full cards as DNF).
2. `forceFinalizeRound` promotes full in-progress cards → `completed`, flips round →
   `completed`, re-finalizes. Full-card players counted; non-full = DNF.

## Error handling

- Invalid manual margin (holes-up 0 for a winner, holes-to-play out of range) → blocked in
  the sheet with an inline message; no write.
- `updateSubMatchResult` / `forceFinalizeRound` surface failures via the existing toast/
  alert paths (organiser sees a clear message; no silent stay-in-progress).
- Scorecard promotion failures are logged; the round still finalizes with whatever cards
  did promote (best-effort, mirrors `refinalizeRoundResults`'s tolerant style).

## Testing

- **Unit (margin helper):** `formatMatchMargin` → "6&5", "6 up" (rem 0), "A/S" (halved).
- **Unit (service):** `updateSubMatchResult` persists `final_holes_remaining`; cascade
  invoked. `finalizePairResults` builds `final_margin` from the stored fields.
- **Unit (counting fix):** `forceFinalizeRound` promotes a full `in-progress` card to
  `completed` and leaves a partial card unpromoted (→ DNF); guard relaxed (submit with 0
  formally-completed but ≥1 full card succeeds; 0 full cards still closes round).
- **Component:** `SubMatchResultSheet` — winner+margin entry, live preview, validation,
  calls the hook with the right payload; organiser-only.
- **Component:** split-round force-submit checklist requires all sub-matches terminal.

## Files touched (anticipated)

- `supabase/migrations/<ts>_sub_match_final_holes_remaining.sql` (new)
- `src/services/subMatches/index.ts` (input + persist)
- `src/hooks/rounds/subMatches.ts` (pass-through; types)
- `src/utils/matchMargin.ts` (new `formatMatchMargin`) + use in `MatchPlayEngine.ts` and
  `finalizePairResults.ts`
- `src/components/.../SubMatchResultSheet.tsx` (new)
- sub-match leaderboard / `SubMatchesTab` (entry point)
- `src/services/rounds/forceFinalizeRound.ts` (promote full cards; relax guard)
- `src/components/rounds/ForceSubmitRoundDialog.tsx` (full-card definition)
- `RoundSettingsScreen` / `RoundsTab` / `CompetitionRoundCard` (split-round force-submit
  enabled with checklist; remove split exclusion)
- Tests alongside.

## Out-of-scope follow-ups

- Per-player manual final-score entry for combined individual rounds.
- Manual net-total entry for stroke sub-matches.
