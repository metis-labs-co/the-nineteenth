# Phase 1B.1 — Relocate Structural Config into Settings — Implementation Plan

> **For workers:** implement task-by-task; steps use `- [ ]` checkboxes. This is a **move + rewire**
> (no new schema), grounded in the two real files: `SettingsSection.tsx` (source) and
> `CompetitionSettingsScreen/index.tsx` (destination). Two non-obvious gotchas are handled explicitly:
> the destination doesn't load `rounds`, and it reads a **different** competition query than the edit
> sheets invalidate.

**Goal:** Move the editing of Type / Handicap / Format / Team Size / Dates / Rules Mode / General Rules /
Points Config from the **Details tab** into the **Competition Settings** screen (match mock), with edits
still persisting and refreshing correctly.

> **Tie-break is explicitly EXCLUDED from this plan.** `PLAN.md` / `PHASE-1-PLAN.md` list
> "Dates/Scoring/Handicap/**Tie-break**" as relocating, but there is **no editable Tie-break field**
> anywhere in the schema/UI (verified — `grep` for tie-break in types/schemas is empty). You cannot
> relocate UI that doesn't exist. Tie-break becomes a **net-new spec item** (field + allowed values +
> editor + scoring-engine integration) tracked alongside the other backend features — not part of 1B.1.

**Architecture:** Relocate the existing `SettingsSection` component (and its edit sheets) from
`DetailsTab` into `CompetitionSettingsScreen`. Supply the data `SettingsSection` needs there, and make
the shared edit sheets invalidate the Settings screen's competition query so relocated rows refresh.

**Tech stack:** React Native, TanStack Query, existing sheets in
`components/competitions/detail/sections/sheets/`.

## Global Constraints

- **No new schema, no new fields.** Pure relocation + wiring. (Visibility/guests/notifications/organisers
  are separate subsystems — see `PHASE-1-PLAN.md`.)
- **Preserve the blanket lock:** `structureLocked = hasStartedRound` (already available from
  `useCompetitionData`). Locked rows stay locked identically.
- **Reuse the existing sheets** verbatim: `EditCompetitionTypeSheet`, `EditHandicapSystemSheet`,
  `EditTeamModeSheet`, `EditDatesSheet`, `EditScoringRulesModeSheet`, `EditCompetitionRulesSheet`,
  `PointsConfigSheet` — do not re-implement.
- **Settings screen is a pushed screen** (not modal) — `SystemModalTheme` is NOT required on the screen;
  the sheets manage their own presentation (`PLAN.md` #2).
- Colours via `useThemeColors()`; tokens from `@/constants/theme`; AU date via `formatDateAustralian`.

## Product micro-decision (confirm before Task 4)

Owner chose "**Move into Settings**". Default here: the Details tab **drops** these rows entirely (Settings
owns them). If instead you want a **read-only summary** left on Details, say so — it changes Task 4.

---

### Task 1: Give the Settings screen the data `SettingsSection` needs

`SettingsSection` requires props `competition, isOrganizer, hasStartedRound, teams, rounds, onViewTeams`.
The Settings screen already has `competition, isOrganizer, hasStartedRound` (from `useCompetitionData`) and
`teams` (from `useTeams`), but **not `rounds`** (only a `roundCount`). `PointsConfigSheet` and the points
total need the full `rounds` array.

**Files:**
- Modify: `src/screens/competitions/CompetitionSettingsScreen/hooks/` (the `useCompetitionData` hook) OR
  `CompetitionSettingsScreen/index.tsx` to add a rounds query.
- Test: `src/screens/competitions/CompetitionSettingsScreen/__tests__/useCompetitionData.test.ts` (create
  if absent).

**Correct approach (the two queries have DIFFERENT shapes — do not try to "share one key"):**
- Settings today: `useCompetitionData` → key `['competition', id]` → competition + counts (no rounds).
- Detail: `useCompetitionDetailsData` → key `['competition', id, 'details']` → competition + full
  `rounds` + `players`.
These return different shapes, so they **cannot** share a key. Pick one:
- **Recommended:** call the existing **`useCompetitionDetailsData(competitionId)`** in the Settings
  screen to obtain `rounds` (reuses its `['competition', id, 'details']` cache — no new key, no new
  fetch shape). Keep `useCompetitionData` for the counts it already provides.

**Steps:**
- [ ] Add `useCompetitionDetailsData(competitionId)` to the Settings screen; destructure `rounds`.
- [ ] Write a test asserting the Settings screen has a `rounds` array available for a competition with
  rounds (or that `SettingsSection` receives a non-empty `rounds` prop).
- [ ] Run it (fail → implement → pass). `pnpm type-check`.
- [ ] Commit: `feat(settings): provide rounds to competition settings (1B.1.1)`

### Task 2: Refactor `SettingsSection` into grouped rows, then render in Settings

**Why a refactor, not verbatim reuse:** `SettingsSection` currently renders **one** "Competition Details"
`SectionHeader` + **one** card containing every row (`SettingsSection.tsx:164–166`). The mock groups
these into **two** cards — "Competition" (Type, Format, Dates, …) and "Scoring & handicaps" (Handicap,
Rules Mode, General Rules, Points Config). You cannot get two groups by dropping the component in
whole. This is an **in-place refactor** (extract reusable row + group-card primitives, or add a
grouping variant/prop) — **not a fork**, and it's shared with the 1A visual restyle of these rows.

**Files:**
- Modify: `src/components/competitions/detail/sections/SettingsSection.tsx` — extract the `SettingRow`
  (already an internal component) + a group-card wrapper so callers can compose named groups; keep the
  existing single-group render working (or replace its callers).
- Modify: `src/screens/competitions/CompetitionSettingsScreen/index.tsx` — render the two groups.

**Steps:**
- [ ] Extract `SettingRow` and a `SettingsGroupCard` (title + card of rows) as exported presentational
  primitives from `SettingsSection` (in place). Keep the edit-sheet state/handlers co-located.
- [ ] In the Settings screen, compose the two mock groups from those primitives, passing the same
  `competition/isOrganizer/hasStartedRound/teams/rounds` data. **`onViewTeams`:** from Settings, navigate
  to the detail Teams tab — check `CompetitionDetail` route params for an `initialTab`/equivalent; if none
  exists, do NOT invent a nav param in this task — flag it and fall back to navigating to `CompetitionDetail`.
- [ ] Update/point `DetailsTab` at the refactored primitives if it still renders these rows (until Task 4
  removes them) so nothing breaks mid-refactor.
- [ ] `pnpm type-check` + `pnpm lint`; grep diff for colour literals.
- [ ] Screenshot the Settings screen light+dark; confirm both groups render, in mock order, with locked
  state shown.
- [ ] Commit: `refactor(settings): grouped structural config in settings (1B.1.2)`

### Task 3: Verify edits refresh the relocated rows (mostly already handled)

**Good news (verified):** the shared `useUpdateCompetitionField` mutation already invalidates **both**
`['competition', id]` **and** `['competition', id, 'details']` (and `['competitions']`) — and all the
structural sheets except Points Config use it (`EditCompetitionType/Handicap/TeamMode/TeamSize/Dates/
ScoringRulesMode/CompetitionRules`). So those relocated rows refresh in Settings **for free**; no
invalidation changes needed for them.

**The one to check:** `PointsConfigSheet` edits **per-round points config** via a different mutation
path (not `useUpdateCompetitionField`). Its result feeds the "Points Config → N pts" row via
`summarizeCompetition(rounds)`, which reads the `['competition', id, 'details']` rounds.

**Steps:**
- [ ] Inspect `PointsConfigSheet`'s mutation `onSuccess`; confirm it invalidates the rounds query
  (`['competition', id, 'details']`) that the relocated points total reads. If not, add it.
- [ ] Test/manual matrix: edit each relocated field from Settings → the row's value updates without a
  manual refresh. Fields via `useUpdateCompetitionField` are covered by its existing invalidation; assert
  Points Config specifically.
- [ ] `pnpm type-check` + `pnpm lint`.
- [ ] Commit: `fix(settings): points-config invalidates rounds for settings (1B.1.3)`

### Task 4: Remove the section from the Details tab

**Files:** Modify `src/components/competitions/detail/DetailsTab.tsx` (remove the `SettingsSection`
render) and check `DetailsTab.test.tsx` / `DetailsTab.stories.tsx` for references.

**Steps:**
- [ ] Per the micro-decision (default = drop): remove `<SettingsSection …>` from `DetailsTab`. If
  "read-only summary" was chosen instead, render a non-interactive summary variant here instead (flag —
  `SettingsSection` currently has no read-only-only mode; that would be a small prop addition).
- [ ] Update `DetailsTab.test.tsx` expectations and the story so the suite stays green (do not delete
  coverage — move any settings-row assertions to a Settings-screen test).
- [ ] `pnpm test --testPathPattern='competitions/detail'` → green.
- [ ] Screenshot the Details tab (should no longer show the config rows).
- [ ] Commit: `feat(details): remove structural config (moved to settings) (1B.1.4)`

### Task 5: Regression sweep

- [ ] Verify locked behaviour: with a started round, all relocated rows are locked in Settings and show the
  "locked once scoring has started" footnote.
- [ ] Verify organiser vs non-organiser: non-organisers don't see editable structural rows (SettingsSection
  gates on `isOrganizer`; the Points Config row is intentionally viewable by all — preserve that).
- [ ] `pnpm verify:gate` passes; grep-clean for colour literals.
- [ ] Final screenshots light+dark; sign-off.
- [ ] Commit: `test(settings): relocation regression pass (1B.1.5)`

---

## Self-review checklist

- [ ] `rounds` is available in Settings by consuming the existing **details** query
      (`useCompetitionDetailsData` → `['competition', id, 'details']`), while `useCompetitionData`
      keeps providing its separate counts query. No new key, no forced key-sharing.
- [ ] Every relocated field edits AND refreshes from the Settings screen (no stale rows).
- [ ] Details tab no longer renders the config rows (or shows the agreed read-only summary).
- [ ] Locked state, organiser gating, and the Points-Config-viewable-by-all rule are all preserved.
- [ ] Suite green, gate green, grep-clean, light+dark signed off.
