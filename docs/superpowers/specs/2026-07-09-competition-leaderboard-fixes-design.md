# Competition Leaderboard Fixes — Design

**Date:** 2026-07-09
**Status:** Approved (design), pending implementation plan
**Reference competition:** "Murray Winter Classic 2026" (prod) — `team_mode: 'fixed'`, `team_size: 2`, `competition_type: 'event'`, `per_round_rules_enabled: true`, positional point system with `matchPlay { win: 3, draw: 1, loss: 0 }`, status `completed`.

## Overview

Five independent fixes/enhancements to competition leaderboards, spanning the Compete-screen list, the Competition Detail → Leaderboard tab, and round finalization. Items 1, 4, 5 are bug fixes; items 2, 3 are UX enhancements. Item 4 also requires a one-off prod data backfill.

Each item below is self-contained: problem, root cause, fix, and the files it touches.

---

## Item 1 — Show the winning team on the Compete list

**Desired:** A completed team competition's card on the Compete screen shows the winning **team**.

**Root cause (bug):** `fetchCompetitionWinner()` (`src/services/competitions/winnerService.ts`) builds one aggregation input from **all** `round_results` rows — team rows (`is_team_result = true`) and individual rows together — then calls `aggregateCompetitionStandings` and takes `standings[0]`. In a team competition both row types exist and their point totals are not comparable, so the "winner" surfaced can be an individual player (or a wrong total) rather than the winning team.

**Fix:**
- Thread the competition's `team_mode` into `fetchCompetitionWinner`. The sole caller, `useCompetitionGroups` (`src/screens/compete/hooks/useCompetitionGroups.ts`), already has `teamMode` on each competition and only calls the fetcher for `status === 'completed'`.
- When `team_mode !== 'none'`, include only team rows (`is_team_result === true`) in the aggregation; otherwise include only individuals. Return the top entry of the filtered set.
- No UI change: `WinnerRow` (`src/components/common/WinnerRow.tsx`) already renders a team name + trophy when `isTeam` is true.

**Scope decision:** Completed competitions only (matches where the winner is already fetched).

**Files:** `winnerService.ts`, `useCompetitionGroups.ts` (pass `teamMode`).

**Interaction with Item 4:** After Item 4 persists the match-play round's team rows, the winning team's total will be complete/correct.

---

## Item 2 — Default to the Team sub-tab for team competitions

**Desired:** Opening the Leaderboard tab of a team competition shows the **Team** standings sub-view first.

**Root cause:** `CompetitionDetailScreen` (`src/screens/competitions/CompetitionDetailScreen/index.tsx`) owns the controlled view state and hardcodes it:
```ts
const [leaderboardView, setLeaderboardView] = useState<'individual' | 'team'>('individual');
```
Because it passes `selectedView` to `LeaderboardTab`, the child's own `hasTeams ? 'team' : 'individual'` default is bypassed.

**Fix:** Once competition data has loaded, default `leaderboardView` to `'team'` when `team_mode !== 'none'`. Implement as a one-shot effect (mirroring the existing tab-init effect around lines 79–83) guarded by a ref so it sets the default exactly once and never overrides a subsequent manual toggle by the user.

**Files:** `CompetitionDetailScreen/index.tsx`.

---

## Item 3 — Reflect the "dinner bet" (0-point) round on its leaderboard

**Context:** A round can be configured worth **0 competition points** with a social side bet. This is an existing concept: `summarizeRoundPoints()` (`src/utils/competitionPoints/roundPointsSummary.ts`) already returns `voided: true` and a detail string:
- Voided `team_points` round → `"Dinner bet · 0 points"`
- Voided `pair_points` round → `"Void · 0 points"`
- Point-bearing rounds → e.g. `"2 pts to winning team"` / `"2 pt per match (×N)"`

Today this status is shown only in the read-only Points & Rules section, **not** on the round's leaderboard. The reference competition has a stableford round configured as a dinner bet, and its round leaderboard shows only the stableford totals (e.g. "74 – 60") with no indication the round carries no competition points.

**Fix (approved treatment):** On each round's leaderboard header in the Leaderboard tab's "Round Results" section (`LeaderboardHeader`, rendered from `LeaderboardTab.tsx`), show a small, right-aligned, highlighted **points badge** derived from `summarizeRoundPoints()`:
- Voided team round → **"Dinner bet · 0 pts"**
- Voided pair round → **"Void · 0 pts"**
- Otherwise → the points on offer (e.g. "2 pts to winner" / "2 pts per match")

Reuses existing logic; no schema change. `summarizeRoundPoints` needs `membersPerTeam` context (already derived in `LeaderboardTab` for the team-points-to-win banner via competition teams).

**Files:** `LeaderboardTab.tsx` (compute per-round summary, pass to header), `LeaderboardHeader` component (render badge). Reuse `roundPointsSummary.ts`.

**Not doing:** a literal per-team "0 pts" column (rejected in favour of the badge).

---

## Item 4 — Singles match-play team points not counted (2–2 should be 4–4)

**Symptoms:**
1. The 1v1 singles match-play round (round 4 of the reference competition) contributes **nothing** to the overall Team Standings.
2. Its per-round tally shows **2–2** when it should be **4–4** — each singles match is worth **2 pts** per the competition's config.

**Root cause (two layers):**
1. **No team rows persisted.** The singles match-play preset (`INDIVIDUAL_MATCH_PLAY` in `src/constants/roundPresets.ts`) seeds `rules_override: null` (no `pair_points`). When an organiser sets the per-match points in `EditRoundPointsSheet` (`src/components/competitions/detail/sections/sheets/EditRoundPointsSheet.tsx`), its `pointsKey` is chosen as `override.pair_points ? 'pair_points' : 'team_points'` — with no pre-existing `pair_points`, it writes **`team_points`**. But `isPairPointsOverride` (and therefore `finalizePairResults`) only fires on `pair_points`, and no other finalizer handles `team_points` on a match-play round. Result: the finalize dispatcher (`src/services/rounds/refinalizeRoundResults.ts`) falls through to `finalizeRound`, which writes **individual** match-play rows only. The overall Team Standings reads `is_team_result` rows → gets nothing for this round.
2. **Display tally ignores configured points.** `tallyByTeam()` (`src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts`) awards a flat **1 per win / 0.5 per halve**, so `SubMatchOverallHeader` shows raw win counts (2–2) rather than points (4–4).

**Fix:**
- **Treat split rounds as per-match (`pair_points`).**
  - `EditRoundPointsSheet`: choose `pointsKey = 'pair_points'` when `round.round_format === 'split'` (split ⇒ per-match), else `'team_points'`.
  - Finalize dispatcher / `finalizePairResults`: resolve a split round's per-match points from `pair_points`, **falling back to a split round's `team_points`** when `pair_points` is absent. This lets existing prod data (which stored `team_points`) self-heal without a fragile schema migration, and routes split match-play through the existing, tested `finalizePairResults` (which writes `is_team_result` team rows with `competition_points = sum of per-match points`).
- **Scale the display tally.** `tallyByTeam` applies the resolved per-match points (win / tie / loss) instead of flat 1 / 0.5, so `SubMatchOverallHeader` reads 4–4 consistent with the persisted total. Callers pass the round's resolved points config.
- **Backfill (prod, confirmed):** re-finalize round 4 of "Murray Winter Classic 2026" so team rows are written and the overall Team Standings and winner update. Uses the existing re-finalize path; no destructive change beyond overwriting that round's `round_results` (delete-then-insert, already idempotent).

**Assumption:** each decided sub-match awards the configured per-match `win` value (2), a halve awards `tie`, a loss awards `loss` — matching the 2–2 → 4–4 expectation.

**Files:** `EditRoundPointsSheet.tsx`, `refinalizeRoundResults.ts` + `finalizePairResults.ts` (`isPairPointsOverride` / points resolution), `subMatchLeaderboard.ts` (`tallyByTeam`), `SubMatchLeaderboardTab.tsx` (pass points config). Plus a one-off backfill script/step for the prod round.

---

## Item 5 — Wrong round numbers on the overall leaderboard

**Root cause (bug):** The leaderboard labels and sorts rounds by `round.round_number` — a **stable identifier** that develops gaps when rounds are deleted or reordered. The rest of the app numbers rounds **positionally** by `display_order` (e.g. `RoundsTab` uses `index + 1` over the `display_order`-sorted list). So the leaderboard's round numbers disagree with the Rounds tab and the rest of the UI.

Affected spots (all use `round_number`):
- `LeaderboardTab.tsx`: `completedRounds`/`inProgressRounds`/`orderedRounds` sorts, and `LeaderboardHeader roundNumber` / `InProgressRoundLeaderboard roundNumber` props, and testIDs.
- `toTeamLeaderboardEntries` (`LeaderboardTab.tsx`): `roundLabel: \`R${round.round_number}\`` and `_sortKey`.
- `PointsBreakdownModal.tsx`: sort by `round_number` and label `Round {round_number}`.

**Fix:** Number rounds positionally on the leaderboard — build a `roundId → positional number` map from the `display_order`-sorted rounds (index + 1), and use it for all labels/sorts above. This matches `RoundsTab` and the rest of the app.

**Files:** `LeaderboardTab.tsx`, `PointsBreakdownModal.tsx` (and any shared helper for the positional map).

---

## Testing

- **Unit:** `winnerService` team vs individual filtering (Item 1); `tallyByTeam` scaling by point config incl. halves (Item 4); positional round-number mapping with gaps from deleted/reordered rounds (Item 5); `finalizePairResults` fallback to `team_points` on split rounds (Item 4).
- **Component/render:** Team default sub-tab on a team competition (Item 2); round-header points badge for voided vs point-bearing rounds (Item 3).
- **Manual (on device / prod backfill):** re-finalize round 4 of the reference competition; confirm overall Team Standings gains 4–4, per-round header shows 4–4, winner reflects the correct team, and the Compete card shows the winning team.
- **Regression:** existing pairs better-ball / alt-shot split rounds (already `pair_points`) still finalize unchanged; individual (non-team) competitions still show an individual winner and default to the Individual sub-tab.

## Out of scope

- No changes to the point-system model or DB schema.
- No new "dinner bet" configuration surface (uses existing voided-points config).
- No changes to knockout/bracket competitions.

## Decisions (confirmed with user)

- Item 1: completed competitions only.
- Item 3: badge treatment (not a literal per-team 0-pts column).
- Item 4: fix code **and** backfill the prod competition; split rounds are per-match (`pair_points`) with `team_points` fallback for existing data.
