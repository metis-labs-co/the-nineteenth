# Phase 1B.1 — Relocate Structural Config into Settings — Implementation Plan

> **For workers:** implement task-by-task; steps use `- [ ]` checkboxes. This is a **move + rewire**
> (no new schema), grounded in the two real files: `SettingsSection.tsx` (source) and
> `CompetitionSettingsScreen/index.tsx` (destination). Two non-obvious gotchas are handled explicitly:
> the destination doesn't load `rounds`, and it reads a **different** competition query than the edit
> sheets invalidate.

**Goal:** Move the editing of Type / Handicap / Format / Team Size / Dates / Rules Mode / General Rules /
Points Config from the **Details tab** into the **Competition Settings** screen (match mock), with edits
still persisting and refreshing correctly.

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

**Steps:**
- [ ] Find the existing rounds hook used by the detail screen (the detail screen loads rounds via
  `useCompetitionDetailsData`/`useCompetitionDetailData`). Reuse the same query hook + key in the Settings
  screen so both share cache — do **not** invent a new key.
- [ ] Add `rounds` to what the Settings screen has available (extend `useCompetitionData`'s return, or call
  the rounds hook directly in the screen).
- [ ] Write a test asserting the Settings data path returns a `rounds` array for a competition with rounds.
- [ ] Run it (fail → implement → pass). `pnpm type-check`.
- [ ] Commit: `feat(settings): load rounds in competition settings (1B.1.1)`

### Task 2: Render `SettingsSection` in the Settings screen

**Files:** Modify `src/screens/competitions/CompetitionSettingsScreen/index.tsx`.

**Steps:**
- [ ] Import `SettingsSection` from `@/components/competitions/detail/sections/SettingsSection` (or its
  barrel). Import `onViewTeams` behaviour: from Settings, "View teams" should navigate to the detail
  screen's Teams tab — reuse the existing nav param the detail screen uses (check
  `CompetitionDetailScreen` route params for a `initialTab`/equivalent; if none exists, navigate to
  `CompetitionDetail` and leave team viewing as-is — do NOT add new nav params in this task, flag if
  needed).
- [ ] Render `<SettingsSection competition={competition} isOrganizer={isOrganizer}
  hasStartedRound={hasStartedRound} teams={teams ?? []} rounds={rounds} onViewTeams={...} />` in the
  screen, placed per the mock's grouping (a "Competition" / "Scoring & handicaps" group above Prize Pools).
- [ ] `pnpm type-check`; grep diff for colour literals.
- [ ] Screenshot the Settings screen light+dark; confirm the relocated rows render and locked state shows.
- [ ] Commit: `feat(settings): render structural config in settings (1B.1.2)`

### Task 3: Make the edit sheets refresh the Settings screen's data

**Risk:** the sheets were written for the Details tab. The Settings screen reads `useCompetitionData`
(key `['competition', competitionId]`). If a sheet only invalidates the detail-screen's query keys, the
relocated Settings row will show a **stale value** after an edit.

**Files:**
- Inspect each sheet's `onSuccess`/invalidation in `components/competitions/detail/sections/sheets/*`.
- Modify whichever query-invalidation is missing the Settings key (prefer making both screens share ONE
  query key from Task 1 so this is automatic).
- Test: a query-invalidation test per edited field, or a manual matrix if these aren't unit-tested.

**Steps:**
- [ ] For each sheet, confirm its mutation invalidates the query the Settings screen now reads. If Task 1
  unified the key, verify; otherwise add the Settings key to each sheet's invalidation set.
- [ ] Test: edit each field from Settings → assert the row's displayed value updates without a manual
  refresh (unit where possible; otherwise document the manual matrix: Type, Handicap, Format, Dates,
  Rules Mode, General Rules, Points Config).
- [ ] `pnpm type-check` + `pnpm lint`.
- [ ] Commit: `fix(settings): edit sheets invalidate settings query (1B.1.3)`

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

- [ ] `rounds` is available in Settings from a SHARED query key (no duplicate fetch/key).
- [ ] Every relocated field edits AND refreshes from the Settings screen (no stale rows).
- [ ] Details tab no longer renders the config rows (or shows the agreed read-only summary).
- [ ] Locked state, organiser gating, and the Points-Config-viewable-by-all rule are all preserved.
- [ ] Suite green, gate green, grep-clean, light+dark signed off.
