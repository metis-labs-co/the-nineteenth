# Points Config in a Mode-Conditional Sheet — Design Spec

**Date:** 2026-06-23
**Status:** Approved (design), pending implementation plan
**Follow-up to:** `2026-06-22-per-round-points-and-rules-config-design.md`

## Motivation

The per-round Points & Rules config currently renders as a standalone **card on the
Competition Detail → Details tab** (`PointsConfigSection`). The organiser asked to
move it off the tab and behind a Settings row, alongside the existing rules controls,
so the Settings card is the single home for "how this competition scores."

## Goal

Relocate the per-round points config from the standalone Details-tab card into a
**mode-conditional Settings row** that opens a bottom sheet, keeping the exact same
organiser-edit / player-read-only behaviour.

## Non-goals (YAGNI)

- No data-model, type, or DB-migration changes.
- No change to the points math, the per-round edit flow, or the general-rules
  point-system editor — those sheets are reused as-is.
- No sub-tabs / tabbed sheet (an earlier idea, dropped): Rules and Points stay as
  separate, single-purpose rows.
- The General Rules row keeps its current organiser-only behaviour (unchanged).

## Design decisions (locked)

- **Rules Mode row:** unchanged — organiser picks General vs Per-round
  (`per_round_rules_enabled`).
- **Mode-conditional rows (mutually exclusive):**
  - **General mode** (`per_round_rules_enabled === false`) → the existing
    **"General Rules"** row (opens `EditCompetitionRulesSheet`). Unchanged.
  - **Per-round mode** (`per_round_rules_enabled === true`) → a new **"Points Config"**
    row that opens the **Points Config sheet**.
- **Remove** the standalone `PointsConfigSection` card from the Details tab.
- **Points Config row is tappable by everyone**; the sheet is **read-only for players**
  and **editable only by the organiser** (same gating the card already enforces).
- Row label: **"Points Config"**.

## Architecture

### 1. New `PointsConfigSheet`

New file `src/components/competitions/detail/sections/sheets/PointsConfigSheet.tsx`.
A `BottomSheet` (matching the sibling sheets' `visible` / `onClose` / `useModal`
pattern, title "Points & Rules") whose body renders the existing `PointsConfigSection`
content.

- Props: `{ visible: boolean; onDismiss: () => void; competition: Competition; rounds: Round[]; teams?: TeamWithMembers[]; isOrganizer: boolean }`.
- It renders `PointsConfigSection` (which already owns the read-only list, the
  organiser feature-gate, the `editRoundId` state, and the stacked `EditRoundPointsSheet`).
- The sheet must satisfy the solid-surface modal rule the same way the other detail
  sheets do (via `BottomSheet` + `useModal`).

### 2. `PointsConfigSection` — light reuse for the sheet context

`PointsConfigSection` currently styles itself as a Details-tab card (outer
`marginHorizontal`, surface background, shadow). Inside a sheet that chrome is
redundant. Add an optional `variant?: 'card' | 'plain'` prop (default `'card'` to
preserve any other callers; the sheet passes `'plain'` to drop the outer card
margins/shadow/background). No behavioural change — only the outer container styling
branches on the variant. The per-round list, header, badges, gating, and stacked
edit sheet are unchanged.

### 3. `SettingsSection` wiring

In `src/components/competitions/detail/sections/SettingsSection.tsx`:
- Keep the **Rules Mode** row as-is.
- Keep the **General Rules** row, still gated to `!perRoundEnabled` (general mode).
- Add a **Points Config** row, rendered only when `perRoundEnabled === true`
  (mutually exclusive with General Rules). Its `onPress` opens the new sheet for
  **all** users (organiser and player) — gating of edits happens inside the sheet,
  not on the row. Use an appropriate icon (e.g. `medal-outline`, matching the points
  theme) and show a short value summary (e.g. "{total} pts" via `summarizeCompetition`,
  or simply "View" — see Open question).
- Add `points-config` to the `openSheet` union and render `PointsConfigSheet` when
  selected, passing `competition`, `rounds`, `teams`, and `isOrganizer`.
- `SettingsSection` will need `rounds` and `teams` available. `teams` is already a
  prop; **`rounds` must be threaded in** from `DetailsTab` (which has it) to
  `SettingsSection`.

### 4. Remove the standalone card

In `src/components/competitions/detail/DetailsTab.tsx`:
- Remove the `<PointsConfigSection>` render block and its import.
- Pass `rounds` into `<SettingsSection>` (new prop) so the sheet can summarise/list.

`PointsConfigSection` itself is **not** deleted — it is reused inside the sheet.

## Data flow

`DetailsTab` (has `competition`, `rounds`, `teams`, `isOrganizer`) → `SettingsSection`
(new `rounds` prop) → on tap, opens `PointsConfigSheet` → renders
`PointsConfigSection variant="plain"` → organiser tap on a round → `EditRoundPointsSheet`
(stacked) → `useUpdateRoundRules` → re-finalize + leaderboard refresh (all existing).

## Testing

This is a UI relocation over existing, already-tested logic (`summarizeCompetition`,
`EditRoundPointsSheet`, `useUpdateRoundRules` all have coverage). Verification is
type-check + manual:
- Per-round comp: Settings shows **Points Config** (not General Rules); tapping opens
  the sheet with the card; organiser can edit a round; player sees read-only.
- General comp: Settings shows **General Rules** (not Points Config); unchanged.
- The standalone card no longer appears on the Details tab.

If a focused unit test is cheap (e.g. a render test asserting the row appears only in
the matching mode), add it; otherwise rely on type-check + manual per the above.

## Open question (minor, decide at build time)

The Points Config row's value text: show the points total (e.g. "13 pts · first to 7"
via `summarizeCompetition`) for a useful at-a-glance summary, or a plain "View".
Default: show the total summary (more informative; reuses the formatter already in
`PointsConfigSection`).

## Relevant existing code (reference)

- `src/components/competitions/detail/DetailsTab.tsx` — renders the card today; threads props.
- `src/components/competitions/detail/sections/SettingsSection.tsx` — rows + `openSheet` switch.
- `src/components/competitions/detail/sections/PointsConfigSection.tsx` — the card (reused, gains `variant`).
- `src/components/competitions/detail/sections/sheets/` — `EditRoundPointsSheet`,
  `EditCompetitionRulesSheet`, `EditScoringRulesModeSheet`, `index.ts`, the `BottomSheet` pattern.
- `src/utils/competitionPoints/roundPointsSummary.ts` — `summarizeCompetition`.
