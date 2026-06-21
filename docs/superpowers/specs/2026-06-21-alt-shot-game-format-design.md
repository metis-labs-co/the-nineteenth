# Alt Shot (Foursomes) Game Format — Design

**Date:** 2026-06-21
**Status:** Approved design → ready for implementation plan
**Scope:** Add a new "Alt Shot" (alternate shot / foursomes) game format, available for **competition team rounds** only.

---

## 1. Summary

Alt Shot (a.k.a. Foursomes) is a **2-player, one-ball team format**: partners alternate hitting the same ball until it is holed. It is architecturally almost identical to **Scramble** — one ball per team, `shape: 'team-only'`, net stroke play — differing only in the **handicap allowance (50% combined vs Scramble's 25%)** and a **strict 2-player team** rule.

Decisions locked during brainstorming:

| Decision | Choice |
|---|---|
| Scoring | **Net stroke play only** — team net = gross − 50% combined handicap; **lowest wins** |
| Match structure | **Two presets:** combined (whole match) and split (Ryder Cup 2v2 sub-matches) |
| Team size | **Strictly pairs** — exactly 2 players per team / sub-team |
| Handicap allowance | **50% of combined** daily handicaps (WHS foursomes standard) |
| Subscription tier | **Premium** (alongside Scramble / Best Ball / Shamble) |
| Availability | **Competition team rounds only** (no standalone preset) |

> Explicitly **not** included: any Stableford basis. Both presets use net stroke play, lowest score wins, for the whole team (combined) or each sub-team (split).

---

## 2. Core model decision

Alt Shot is **one ball per team**, scored as **net stroke play (lower wins)** — exactly the Scramble shape. It becomes a new **team-only `GameType` `'alt-shot'`** (`shape: 'team-only'`, `betterDirection: 'lower'` in `resultsEngine.ts`).

Because there is a single scoring basis, the engine spec is **static** (like Scramble) — no dynamic direction, no `rules_override` scoring field. Adding the value to the `GameType` union also makes TypeScript's exhaustive switches flag every site that must handle it.

The only behavioural differences from Scramble:
1. Team handicap = **50% of combined** member daily handicaps (Scramble = 25%).
2. Teams (and split sub-teams) must be **exactly 2 players**.

---

## 3. Enums & data model

Files: `src/types/database/enums.ts`

- `GameType` gains `'alt-shot'`.
- `TeamFormat` gains `'alt-shot'` — so a round with `is_team_round = true` satisfies the existing `team_format_required_for_team_rounds` check constraint, and Alt Shot carries its own label/icon distinct from Scramble.

No change to `RoundRulesOverride` (no Stableford basis to carry).

A persisted Alt Shot round:

```
game_type:      'alt-shot'
is_team_round:  true
team_format:    'alt-shot'
round_format:   'combined' | 'split'
sub_match_size: 2          // split only; null for combined
```

---

## 4. Presets

File: `src/constants/roundPresets.ts`

Two presets, both `game_type: 'alt-shot'`, no `standalone` field (competition-only):

| Preset id (proposed) | round_format | sub_match_size | group |
|---|---|---|---|
| `alt_shot` | combined | — | Team — whole match |
| `alt_shot_ryder` | split | 2 | Sub-matches (Ryder Cup style) |

`inferPresetIdFromRound()` matches on the existing six columns — the two presets differ only by `round_format` / `sub_match_size`, exactly like the existing Scramble combined/split pair, so no new matching logic is needed. Preset-level copy (title / shortTitle / summary / longDescription / icon) lives on each preset object.

---

## 5. Handicap — 50% combined (WHS)

File: `src/utils/teamScoring/` (new function alongside `scramble.ts`)

```
calculateAltShotTeamHandicap(memberDailyHandicaps): number
  = round( 0.5 * sum(memberDailyHandicaps), 1 dp )
```

Mirrors `calculateScrambleTeamHandicap` (which uses 25%). Per-hole stroke allocation applies `floor(teamHandicap)` exactly as Scramble does.

---

## 6. Scoring

### Per-hole (live, client-side)

Files: `src/utils/teamScoring/calculations.ts`, `scramble.ts`

- Reuse the Scramble **one-ball** per-hole path (`calculateScrambleHole` / `getGroupHoleScore`), but compute the team handicap via `calculateAltShotTeamHandicap`.
- Add an `'alt-shot'` branch to `getGroupHoleScore` / `buildLiveTeamEntries` that emits team **net** per hole (same as Scramble's net path; no Stableford output).

### Finalize — combined

File: `src/services/rounds/resultsEngine.ts` (+ a `pickAltShotScore` helper, mirroring `pickScrambleScore`)

- Read the single team scorecard (both members record the same ball; finalize off one scorecard).
- `teamGross` from per-hole scores / `total_gross`.
- `teamNet = teamGross − floor(altShotHandicap)`, `betterDirection: 'lower'`.

### Finalize — split (Ryder Cup foursomes)

Files: split / `finalizePairResults` plumbing (`src/services/rounds/finalizeTeamResults.ts` and the sub-match path)

- Each 2-player side plays one Alt Shot ball; compute each side's net, compare the two sides, award `pair_points` (existing split mechanism).
- Reuses the existing `sub_matches` table (`team_a_player_ids` / `team_b_player_ids`, each length 2) and split aggregation; only the per-side score becomes Alt Shot-aware (50% combined handicap, net).

---

## 7. Strict pairs (exactly 2)

- **Split:** already enforced — `sub_match_size: 2`.
- **Combined:** add validation that every participating `competition_teams` entry has exactly 2 members when `game_type = 'alt-shot'`.
- Surface a clear, blocking error in the team-assignment UI and refuse to finalize an Alt Shot round whose teams are not pairs.

---

## 8. UI

- **Descriptions** (`src/constants/gameTypeDescriptions.ts`): add `GAME_TYPE_DESCRIPTIONS['alt-shot']` and `TEAM_FORMAT_DESCRIPTIONS['alt-shot']`. Title "Alt Shot"; icon `swap-horizontal` (provisional — easily changed). Copy explains alternate-shot one-ball play and the 50% combined handicap.
- **Picker:** the two presets flow automatically through `RoundPresetPicker` in the competition **Add Round** wizard (`src/screens/admin/AddRoundScreen/steps/GameFormatStep.tsx`) and the post-creation `RoundTypeSheet`. No standalone presets added.
- **Review / leaderboard:** screens that branch on team formats (`ScrambleLeaderboardTab`, contributions tab, skins team scoring in `src/utils/skins/`) get an `'alt-shot'` branch — treated like Scramble (one net ball). Exhaustive `switch` statements over `GameType`/`TeamFormat` surfaced by `tsc` enumerate the exact sites.

---

## 9. Database migrations

`supabase/migrations/`

1. Drop & recreate `rounds_game_type_check` to add `'alt-shot'` (follow the pattern in `20260131150204_add_par_game_type.sql`).
2. `ALTER TYPE team_format ADD VALUE IF NOT EXISTS 'alt-shot';` (follow `20260126000001_add_shamble_to_team_format_enum.sql`).
3. Append `'alt-shot'` to `tier_limits.allowed_game_types` for **Premium** and **Super Admin** rows (follow the scramble/shamble pattern).

> Deployment note: per project memory, migrations are **not** auto-applied to staging/prod — flag the new migrations as a pending deploy step in the implementation plan.

---

## 10. Testing

Unit tests (`*.test.ts` alongside the touched utils/services):

- `calculateAltShotTeamHandicap` — 50% of combined, rounding, odd/even handicaps.
- Combined finalize — net stroke play, lowest wins.
- Split finalize — Ryder Cup 2v2 sub-match scoring and `pair_points` allocation.
- Strict-pairs validation — rejects teams ≠ 2 members.
- `inferPresetIdFromRound` round-trip for both Alt Shot presets.

Diff against the documented Jest baseline (~243 pre-existing failures on `main`) rather than expecting a green suite.

---

## 11. Out of scope (YAGNI)

- Stableford basis (net stroke play only).
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
| Finalization dispatch | `src/services/rounds/resultsEngine.ts` |
| Team-only / split finalize | `src/services/rounds/finalizeTeamResults.ts` |
| Review / leaderboard | `src/screens/scoring/ReviewScorecardScreen/**`, `src/utils/skins/**` |
| Migrations | `supabase/migrations/` (3 new) |
