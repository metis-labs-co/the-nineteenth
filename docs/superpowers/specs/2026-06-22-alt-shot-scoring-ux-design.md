# Alt Shot On-Course Scoring UX — Design

**Date:** 2026-06-22
**Status:** Approved design → ready for implementation plan
**Scope:** Make the Alt Shot (foursomes) format a first-class on-course experience — a dedicated alternate-shot score card with per-shot player attribution, correct View Round structure (sub-matches, not groups), real Contributions, and no "Scramble" branding. Focused on the **split** preset (`ryder_cup_foursomes_2v2`).

---

## 1. Background & problem

Alt Shot shipped reusing Scramble's machinery on-course:
- Score entry routes alt-shot through the **Scramble** `TeamScoreCard` (one shared ball) via a shared `teamFormat === 'scramble' || 'alt-shot'` branch in `ScorecardScoreContent.tsx`.
- View Round lumps alt-shot into an `isScrambleRound` flag, so it inherits Scramble's tab suite (Scorecard / Leaderboard / Contributions) — the Leaderboard ranks across **all** players, which is wrong for head-to-head 2v2.
- The experience reads as "Scramble" even though the header badge text returns "ALT SHOT".

The result: an alt-shot round feels like Scramble and (for the split preset) shows tabs that don't respect the 2v2 sub-match structure.

## 2. Decisions (locked in brainstorming)

| Decision | Choice |
|---|---|
| Format in focus | **Split** preset (`ryder_cup_foursomes_2v2`). Combined `team_alt_shot` left as-is. |
| Score entry | **Dedicated Alt Shot card** — one team ball per hole, each shot attributed to a player, odd/even tee indicator, per-player shot tally. |
| Shot contributions | **On by default**, surfaced prominently, but **not blocking** submission (offline-first). |
| Split View Round tabs | **Sub-Matches + Contributions**. Drop the cross-field Scramble team-leaderboard for the split case. Per-pair hole-by-hole scoring stays in the existing sub-match detail. |
| Branding | No "Scramble" text anywhere for alt-shot rounds. |

The new card keys on `team_format === 'alt-shot'`, so it applies to **any** alt-shot round (both presets) — but no structural change is made to the combined preset (it keeps its Groups + team-leaderboard, which is correct for a multi-pair ranking).

## 3. Architecture overview

Three seams:
1. **Score-entry routing** (`ScorecardScoreContent.tsx`): split alt-shot out of the shared Scramble branch into its own `teamFormat === 'alt-shot'` branch rendering the new card. Scramble's branch is untouched.
2. **New `AltShotScoreCard` component**: a sibling of `TeamScoreCard`, one ball + attribution. Reuses the existing `shotSlots.ts` config and the `shotContributions` storage on the team's single scorecard — so **finalization is unchanged** (it already reads one ball).
3. **View Round wiring** (`useViewRoundDataFetch` / `useViewRoundTabs`): introduce `isAltShotRound`, stop alt-shot from inheriting the Scramble tab set, and give the split preset Sub-Matches + Contributions.

Plus a **Contributions** pipeline extension (`ContributionFormat` + `computeContributions`) to add an `'alt-shot'` case, and a **branding audit** so no Scramble-labeled string surfaces for alt-shot.

## 4. The `AltShotScoreCard` component

`src/components/scorecard/AltShotScoreCard/` (new).

**Inputs (props):** the 2-player team, the current hole (par + stroke index), the team's current hole score (strokes + `shotContributions`), and `onScoreChange` / `onShotContributionsChange` callbacks — mirroring what `TeamScoreCard` receives today so the parent wiring is minimal.

**Behavior:**
- **One stroke entry** for the team ball per hole (same control/UX as Scramble's single team total).
- **Shot attribution:** renders the shot slots for the hole's par (from `shotSlots.ts` — e.g. par 4 → tee / approach / putt), each a toggle between the 2 players. Defaults follow the alternating convention (see below) but are editable.
- **Tee indicator:** player at index 0 tees **odd** holes, index 1 tees **even** holes — shown as a hint label ("⛳ Sam tees"). Convention only; does not constrain attribution.
- **Per-player shot tally** for the hole (e.g. "Sam 2 · Alex 2").
- Writes to the team's **single** scorecard (`shotContributions` on the first member's `HoleScore`), exactly as Scramble does — no new storage, no finalize change.

**Storage note:** contributions are optional. A hole with strokes but no attribution is valid; the Contributions tab treats missing attribution as "data not recorded" (existing behavior).

Open question for review: the dedicated card vs. just re-skinning `TeamScoreCard` — we build a **new** component (per the brainstorm choice) so the alt-shot UX (tee indicator, prominent attribution, tally) can diverge from Scramble without risking Scramble's screen.

## 5. Contributions for Alt Shot

- `src/utils/contributions/types.ts`: add `'alt-shot'` to `ContributionFormat`.
- `src/utils/contributions/computeContributions.ts`: add an `'alt-shot'` case that counts each player's attributed shots per hole (mirrors `computeScrambleTeam`'s per-player shot count — the data shape is identical since both store `shotContributionsByHole`).
- The Contributions tab/leaderboard then shows who hit how many shots — the natural Alt Shot stat. For the split preset, contributions are scoped per pair (per sub-match side).

## 6. View Round — split preset only

The fix must be **scoped to split alt-shot** so the combined preset is untouched (the combined `team_alt_shot` correctly inherits the Scramble-style team leaderboard — a net ranking of pairs — and we leave it alone).

- `useViewRoundDataFetch` / `useViewRoundTabs`: add an `isAltShotSplitRound` notion (`team_format === 'alt-shot' && round_format === 'split'`). Today alt-shot is folded into `isScrambleRound`, which adds the Scramble Scorecard + cross-field **Leaderboard** tabs that rank across all players — wrong for head-to-head 2v2.
- For a **split** alt-shot round: present **Sub-Matches** (already rendered via `round_format === 'split'`) + **Contributions**, and **suppress** the Scramble cross-field Scorecard/Leaderboard tabs.
- For a **combined** alt-shot round: leave the current tab set exactly as-is (Scramble-style team leaderboard is the correct pair ranking; this is the "leave combined as-is" decision).
- The Sub-Matches tab and `SubMatchCard` already render head-to-head pairs and results; no structural change there. Per-pair hole-by-hole scorecard remains reachable via the existing sub-match detail screen.

Implementation note: rather than pulling alt-shot out of `isScrambleRound` wholesale (which would also strip the combined preset's leaderboard), gate the tab suppression on `isAltShotSplitRound`. Confirm during the plan whether the cleanest expression is a new flag or a `round_format` guard on the existing scramble-tab construction.

## 7. Kill "Scramble" branding for Alt Shot

Audit and fix every Scramble-labeled string/title an alt-shot round currently borrows:
- `ScrambleTeamScoreTab`, `ScrambleContributionsTab`, `ScrambleLeaderboardTab` titles/headers.
- Any tab label, card title, or header that renders "Scramble" when the round is alt-shot.
- Account for the recently merged "format name aliases" work — ensure alt-shot resolves to an "Alt Shot" display name through whatever alias map now exists, rather than re-introducing a parallel label path.
Acceptance: viewing or scoring an alt-shot round shows "Alt Shot" everywhere and "Scramble" nowhere.

## 8. Testing

- **`AltShotScoreCard`**: renders one team total; toggling a shot slot updates attribution and the per-player tally; tee indicator reflects odd/even hole; calls `onScoreChange`/`onShotContributionsChange` with the right payloads.
- **Contributions**: `computeContributions` with an `'alt-shot'` format produces correct per-player shot counts; missing attribution → data-not-recorded.
- **View Round wiring**: an alt-shot **split** round exposes Sub-Matches + Contributions and NOT the Scramble cross-field leaderboard; an alt-shot **combined** round keeps its existing tab set (regression guard for the "leave combined as-is" decision).
- **Branding**: a snapshot/string assertion that an alt-shot round surfaces "Alt Shot", not "Scramble".
- Diff against the documented Jest baseline (large pre-existing failure set); gate on zero new failures.

## 9. Out of scope (YAGNI)

- Restructuring the combined `team_alt_shot` preset (groups → sub-matches). Left as-is per the brainstorm.
- Enforcing the alternating-shot rule (who MUST tee/hit) — attribution is a free, editable record, not a rules engine.
- Changes to finalization / handicap math (the one-ball storage and 50% / differential logic already shipped and are unchanged).
- A separate top-level per-pair Scorecard tab for the split preset (sub-match detail already covers it).

## 10. Key files (touch map)

| Concern | File |
|---|---|
| Entry routing | `src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx` |
| New card | `src/components/scorecard/AltShotScoreCard/**` (new) |
| Shot slots (reused) | `src/utils/teamScoring/shotSlots.ts` |
| Contributions type + compute | `src/utils/contributions/types.ts`, `computeContributions.ts` |
| View Round flags | `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundDataFetch.ts` |
| View Round tabs | `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.ts` |
| Scramble-branded tabs (audit) | `src/screens/rounds/ViewRoundScreen/tabs/Scramble*Tab.tsx` |
| Header label | `src/components/scorecard/GameTypeHeader/GameTypeHeader.tsx` |
