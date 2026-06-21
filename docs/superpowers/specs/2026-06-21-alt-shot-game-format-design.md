# Alt Shot (Foursomes) Game Format — Design

**Date:** 2026-06-21
**Status:** Approved design → ready for implementation plan
**Scope:** Add a new "Alt Shot" (alternate shot / foursomes) game format, available for **competition team rounds** only.

---

## 1. Summary

Alt Shot (a.k.a. Foursomes) is a **2-player, one-ball team format**: partners alternate hitting the same ball until it is holed. One ball per team/side, `shape: 'team-only'`, scored as **net stroke play (lowest wins)**. Two presets ship, and they score differently because they have different structures:

| Decision | Choice |
|---|---|
| Handicap allowance | **50% of combined** partner daily handicaps (= average of the pair). WHS foursomes standard. |
| **Combined** preset scoring | **Net lowest score** — each team plays off its **own** 50%-combined handicap; lowest net total wins. Works on a multi-team leaderboard. |
| **Split (Ryder Cup)** preset scoring | **Handicap differential** — the two sides' 50%-combined handicaps are compared; the **difference (rounded)** is given to the higher-handicap side; the sub-match is decided by **total net score** (lower wins the pair point). |
| Team size | **Strictly pairs** — exactly 2 players per team / sub-team |
| Subscription tier | **Premium** (alongside Scramble / Best Ball / Shamble) |
| Availability | **Competition team rounds only** (no standalone preset) |

> Explicitly **not** included: any Stableford basis, and any hole-by-hole match-play decision. Both presets decide by net total, lowest wins.

### Worked example (split differential)

Side A = 9 + 11 HC → team HC **10.0**; Side B = 8 + 13 HC → team HC **10.5**.
Difference = 0.5 → **Side B receives 1 stroke** (rounded), allocated on the hardest hole(s) (stroke index 1). Each side then totals its one ball's net strokes; the lower net total wins the sub-match's `pair_points`. (Because the decision is by total, the stroke allocation to specific holes is for display/scorecard clarity; the outcome depends only on the stroke count.)

---

## 2. Core model decision

Alt Shot is **one ball per team/side**, scored as **net stroke play (lower wins)**. It becomes a new **team-only `GameType` `'alt-shot'`** (`shape: 'team-only'`, `betterDirection: 'lower'` in `resultsEngine.ts`) — the same finalization shape as Scramble. Adding the value to the `GameType` union makes TypeScript's exhaustive switches flag every site that must handle it.

The two presets reuse two **existing** finalization paths, differing from Scramble only in handicap math and the strict-pairs rule:

- **Combined** → the team-only finalize path (`resultsEngine` / `finalizeTeamResults`), like Scramble, but team handicap = **50% combined** (Scramble = 25%).
- **Split** → the existing pair-points path (`finalizePairResults`), but each side is **one ball** (not best-of-two) and the side handicaps are applied as a **rounded differential**, with the sub-match decided by **total net** (the path already decides sub-matches by comparing side net totals).

There is no Stableford basis and no `rules_override` scoring field — the engine spec is static.

---

## 3. Enums & data model

Files: `src/types/database/enums.ts`

- `GameType` gains `'alt-shot'`.
- `TeamFormat` gains `'alt-shot'` — so a round with `is_team_round = true` satisfies the existing `team_format_required_for_team_rounds` check constraint, and Alt Shot carries its own label/icon distinct from Scramble.

No change to `RoundRulesOverride`. The split preset still carries `pair_points` (like the existing Pairs Better Ball preset) and `round_format: 'split'`, `sub_match_size: 2`.

A persisted Alt Shot round:

```
game_type:      'alt-shot'
is_team_round:  true
team_format:    'alt-shot'
round_format:   'combined' | 'split'
sub_match_size: 2          // split only; null for combined
rules_override: { pair_points: {win,tie,loss}, ... }   // split only
```

---

## 4. Presets

File: `src/constants/roundPresets.ts`

Two presets, both `game_type: 'alt-shot'`, no `standalone` field (competition-only):

| Preset id (proposed) | round_format | sub_match_size | pair_points | group |
|---|---|---|---|---|
| `alt_shot` | combined | — | — | Team — whole match |
| `alt_shot_ryder` | split | 2 | yes (e.g. 1/0.5/0) | Sub-matches (Ryder Cup style) |

`inferPresetIdFromRound()` distinguishes the two by `round_format` / `sub_match_size`, mirroring the existing Scramble / Pairs split presets. Preset-level copy (title / shortTitle / summary / longDescription / icon) lives on each preset object.

---

## 5. Handicap — 50% combined (WHS)

File: `src/utils/teamScoring/` (new function alongside `scramble.ts`)

```
calculateAltShotTeamHandicap(memberDailyHandicaps): number
  = round( 0.5 * sum(memberDailyHandicaps), 1 dp )   // for a pair == average
```

Mirrors `calculateScrambleTeamHandicap` (25%). For the **combined** preset, per-hole stroke allocation applies `floor(teamHandicap)` exactly as Scramble does.

For the **split** preset, the differential strokes are:

```
diff = round( | teamHC(sideA) − teamHC(sideB) | )   // nearest; .5 rounds up
higher-HC side receives `diff` strokes via getStrokesReceived(diff, strokeIndex)
lower-HC side receives 0
```

---

## 6. Scoring

### Per-hole (live, client-side)

Files: `src/utils/teamScoring/calculations.ts`, `scramble.ts`

- Reuse the Scramble **one-ball** per-hole path (`calculateScrambleHole` / `getGroupHoleScore`), computing the team handicap via `calculateAltShotTeamHandicap`. Add an `'alt-shot'` branch that emits team **net** per hole (no Stableford output). For the live leaderboard, the **combined** preset shows each team's own net; the **split** preset shows sub-match standings exactly as Pairs split already does (`buildLiveTeamEntries`), with the side-total/differential applied.

### Finalize — combined (net lowest score)

File: `src/services/rounds/resultsEngine.ts` (+ a `pickAltShotScore` helper, mirroring `pickScrambleScore`)

- Read the single team ball (both members record identical strokes; finalize off one scorecard).
- `teamGross` from per-hole scores / `total_gross`; `teamNet = teamGross − floor(altShotHandicap)`; `betterDirection: 'lower'`.

### Finalize — split (Ryder Cup differential, total-net decision)

File: `src/services/rounds/finalizePairResults.ts` (+ `pairPointsCalculation.ts`)

- Add an Alt-Shot-aware side total: each side's **one ball** net total (not `sideBestBallTotal`), reading one player's card per side for the side's gross.
- Apply the **rounded differential** (§5): higher-HC side's net total = side gross − diff; lower-HC side = side gross.
- Decide the sub-match by comparing the two side net totals (lower wins → `a-wins`/`b-wins`/`halved`), then award `pair_points` — reusing the existing accumulation, ranking, and `round_results` persistence in `finalizePairResults`.
- The persisted-result path (forfeits, team match-play screen) is unchanged.

---

## 7. Strict pairs (exactly 2)

- **Split:** already enforced — `sub_match_size: 2`.
- **Combined:** add validation that every participating `competition_teams` entry has exactly 2 members when `game_type = 'alt-shot'`.
- Surface a clear, blocking error in the team-assignment UI and refuse to finalize an Alt Shot round whose teams are not pairs.

---

## 8. UI

- **Descriptions** (`src/constants/gameTypeDescriptions.ts`): add `GAME_TYPE_DESCRIPTIONS['alt-shot']` and `TEAM_FORMAT_DESCRIPTIONS['alt-shot']`. Title "Alt Shot"; icon `swap-horizontal` (provisional). Copy explains alternate-shot one-ball play, the 50% combined handicap, and (for the Ryder Cup preset) the differential.
- **Picker:** the two presets flow automatically through `RoundPresetPicker` in the competition **Add Round** wizard (`src/screens/admin/AddRoundScreen/steps/GameFormatStep.tsx`) and the post-creation `RoundTypeSheet`. No standalone presets added.
- **Review / leaderboard:** screens that branch on team formats (`ScrambleLeaderboardTab`, contributions tab, skins team scoring in `src/utils/skins/`) get an `'alt-shot'` branch — combined treated like Scramble (one net ball); split treated like the existing Pairs split. Exhaustive `switch` statements over `GameType`/`TeamFormat` surfaced by `tsc` enumerate the exact sites.

---

## 9. Database migrations

`supabase/migrations/`

1. Drop & recreate `rounds_game_type_check` to add `'alt-shot'` (follow `20260131150204_add_par_game_type.sql`).
2. `ALTER TYPE team_format ADD VALUE IF NOT EXISTS 'alt-shot';` (follow `20260126000001_add_shamble_to_team_format_enum.sql`).
3. Append `'alt-shot'` to `tier_limits.allowed_game_types` for **Premium** and **Super Admin** rows (follow the scramble/shamble pattern).

> Deployment note: per project memory, migrations are **not** auto-applied to staging/prod — flag the new migrations as a pending deploy step in the implementation plan.

---

## 10. Testing

Unit tests (`*.test.ts` alongside the touched utils/services):

- `calculateAltShotTeamHandicap` — 50% of combined, rounding, odd/even handicaps.
- Combined finalize — net stroke play, lowest wins, off each team's own 50% handicap.
- Split finalize — differential allocation (the 9+11 vs 8+13 → 1-stroke example), total-net decision, `pair_points` allocation incl. halved.
- Strict-pairs validation — rejects teams ≠ 2 members.
- `inferPresetIdFromRound` round-trip for both Alt Shot presets.

Diff against the documented Jest baseline (~243 pre-existing failures on `main`) rather than expecting a green suite.

---

## 11. Out of scope (YAGNI)

- Stableford basis; hole-by-hole match-play decision (both presets decide by net total).
- Standalone (non-competition) Alt Shot rounds.
- Team Alt Shot for 3+ players (format is inherently a pair).
- Per-shot "who hit which shot" tracking — only the team ball total is recorded, as with Scramble.
- Skins/Wolf-specific Alt Shot rules beyond making the existing team skins path recognize `'alt-shot'`.

---

## 12. Key files (touch map)

| Layer | File |
|---|---|
| Enums | `src/types/database/enums.ts` |
| Presets | `src/constants/roundPresets.ts` |
| Descriptions / labels | `src/constants/gameTypeDescriptions.ts` |
| Handicap + team net | `src/utils/teamScoring/` (new alt-shot util + `scramble.ts`, `calculations.ts`) |
| Finalize — combined | `src/services/rounds/resultsEngine.ts`, `finalizeTeamResults.ts` |
| Finalize — split differential | `src/services/rounds/finalizePairResults.ts`, `pairPointsCalculation.ts` |
| Review / leaderboard | `src/screens/scoring/ReviewScorecardScreen/**`, `src/utils/skins/**` |
| Migrations | `supabase/migrations/` (3 new) |
