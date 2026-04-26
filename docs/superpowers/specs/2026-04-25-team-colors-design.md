# Team Colours — Design

## Context

Team-based competitions render a coloured dot beside each team name on the View Round → Teams tab, and tint scoring-pair pills by team. Today both surfaces derive their colour from the team's *index* in the array — `TEAM_ACCENTS[i % 4]` in `TeamsSection.tsx`, and a similar 5-slot theme cycle in `ScoringPairFormationUI/utils/helpers.ts`. The colour has no persistent identity: regenerating teams or re-ordering a list silently changes which team is "the green one."

**Goal:** make team colour a stored, organiser-editable property, sourced from the existing 12-colour avatar palette (`src/constants/avatars.ts`). Colours auto-assign at team creation, are switchable via a picker added to the existing rename modal, and propagate to every render site (View Round dot, scoring-pair pill, comp-detail TeamCard).

The avatar palette is the single source of truth for colour choices. The competition organiser is the only role that can change a team's colour; non-organisers see whatever has been assigned. Colour edits remain available even after scoring starts (cosmetic; doesn't invalidate results) — this carves out a small exception to the "teams locked once a round is in-progress" rule we shipped recently.

## Requirements

### Functional

1. **Auto-assign on team creation.** Both the destructive and non-destructive paths in `autoGenerateTeams` give every newly-created team a colour. The non-destructive path preserves existing teams' colours; only freshly-created teams get fresh assignments.
2. **Picker in the team-edit modal.** The rename modal grows a 12-swatch grid below the name input. Saving commits both name and colour as a single mutation.
3. **Uniqueness within a competition.** Auto-assign walks the palette in declaration order and skips colours already taken. The picker visually disables swatches held by other teams in the same competition (the team's own current colour stays selectable).
4. **Three render sites use the stored colour:**
   - View Round → Teams (`TeamsSection`) — existing dot.
   - Scoring-pair pill (`ScoringPairCard` via `getTeamColor` helper).
   - Comp Detail → Teams tab (`TeamCard`) — **new** dot, added so the organiser can see what they assigned without leaving the screen.
5. **Backwards compatibility.** Any team without a stored colour falls back to the legacy index-based theme colour. No existing competition breaks during rollout. The migration backfills existing teams in the same SQL transaction so the fallback is rarely hit in practice.
6. **Lock carve-out.** The team-roster lock (added previously, blocks shuffle/regenerate/manual moves once any round is in-progress) does **not** block colour editing. Same model as the existing rename flow.

### Non-functional

- **Single tier of the avatar palette is used everywhere:** `palette.dark`. No surface uses `lightest` / `darkest` (could be revisited later if the scoring-pair pill is redesigned to a chip).
- **Storage is the avatar id** (e.g. `'avatar-green'`) — not a hex value. The DB stays decoupled from frontend palette tweaks; future palette adjustments propagate.
- **No DB unique constraint on `(competition_id, color)`.** Uniqueness is enforced at the UI level only. A constraint would block legitimate transient states (e.g. two organisers editing teams concurrently before either commits).

## Architecture

### Data model

New column on `teams`:

| column | type | nullable | default |
|---|---|---|---|
| `color` | text | yes | null |

The string stores an `AvatarId` (e.g. `'avatar-green'`). Validation lives in TypeScript — the DB column is plain text.

A single migration file performs both:
1. `ALTER TABLE teams ADD COLUMN color text;`
2. Backfill: for each `(competition_id)` group, walk teams ordered by `created_at` and assign the next palette id in declaration order. Done in a single SQL block using a window function so we don't need a code-driven backfill script.

### Single colour-resolution utility

New file `src/utils/teamColor.ts` exposes the contract that every render site calls:

```ts
import type { AvatarId, ColorPalette } from '@/constants/avatars';
import type { Team } from '@/types/database.types';
import type { ColorPalette as ThemePalette } from '@/context/ThemeContext';

/** Resolve a team's display colour, with legacy index-based fallback. */
export function getTeamColorHex(
  team: Pick<Team, 'color'> | null | undefined,
  fallbackIndex: number,
  themeColors: ThemePalette,
): string;

/** Get the full 5-tier palette for a team, or null if unset. */
export function getTeamColorPalette(
  team: Pick<Team, 'color'> | null | undefined,
): ColorPalette | null;

/** First palette id not present in `taken`. Walks declaration order. */
export function nextAvailableTeamColor(
  taken: ReadonlyArray<string | null | undefined>,
): AvatarId;
```

Resolution: if `team.color` matches a known `AvatarId`, return `palette.dark`; otherwise fall back to the legacy theme cycle (`success` / `warning` / `info` / `error` / `primary`) using `fallbackIndex`. This keeps null-coloured teams (legacy comps before the migration runs, or any future edge case) visually consistent with what they had before.

### Picker UI

Existing `EditTeamNameModal.tsx` is renamed to `EditTeamModal.tsx`. The grid sits below the existing name input:

- 4 cols × 3 rows of 36px swatches; each swatch is a circle filled with `palette.dark`.
- A taken swatch (held by another team in the same competition) is rendered at 0.35 opacity with `pointerEvents="none"` and an `accessibilityState={{ disabled: true }}`.
- The selected swatch shows a `check` icon centred (white on `dark` reads cleanly across all 12 palettes).
- The team's own current colour is **never** in the "taken" set — the organiser can re-confirm it without losing it.

`onSave` signature changes from `(name: string) => void` to `(input: { name: string; color: AvatarId }) => void`. The save button is disabled if either the name is empty or no colour is selected (auto-assign guarantees a colour is always set, so the latter is essentially a safety check).

### Mutation

Reuse the existing `useUpdateTeam` hook (`src/hooks/rounds/teams.ts:182`). It already accepts arbitrary partial updates; the modal calls it with `{ name, color }`.

### Auto-assignment

`src/services/teams/teamGeneration.ts:autoGenerateTeams`:

- **Destructive path** (`preserveNames: false`): clear all existing teams, then walk the palette in declaration order assigning `color` to each new team.
- **Non-destructive path** (`preserveNames: true`): build the set of colours already held by surviving teams. For any new team beyond the existing count, call `nextAvailableTeamColor(taken)` and append.
- **Single-team rename** (no regeneration): unchanged — colour is set explicitly via the picker.

### Render-site changes

Three files swap their colour-derivation calls for the new utility:

1. **`TeamsSection.tsx`** (View Round → Teams dot)
   - Remove the `TEAM_ACCENTS` array and `accent` field on the mapped team object.
   - Inline `getTeamColorHex(t, i, colors)` at the dot's `backgroundColor`.

2. **`ScoringPairFormationUI/utils/helpers.ts`** (`getTeamColor`)
   - Replace the existing index-based body with a delegation to `getTeamColorHex`. Signature changes to `getTeamColor(team, teamIndex, colors)` — accepts the team for primary resolution, falls back to the index. Callers in `PairsListSection.tsx` already build `teamIndexByPlayerId`; they'll add a parallel `teamByPlayerId` map (or use a single combined `teamInfoByPlayerId`) so the team is in scope at the call site.

3. **`TeamCard.tsx`** (Comp Detail → Teams tab)
   - Add a 10px coloured circle to the left of the name in the header row. Uses `getTeamColorHex(team, 0, colors)` (fallback index 0 is fine — backfill ensures every team has `color` set after migration runs; the fallback is purely defensive).

### Files touched

| File | Change |
|---|---|
| `supabase/migrations/<ts>_team_color.sql` | **New.** Add column + backfill. |
| `src/utils/teamColor.ts` | **New.** Resolution utility. |
| `src/types/database/team.types.ts` | Add `color: string \| null` field. |
| `src/services/teams/teamGeneration.ts` | Auto-assign on insert. |
| `src/components/teams/EditTeamNameModal.tsx` → `EditTeamModal.tsx` | Rename file. Add picker. New `onSave` signature. |
| `src/components/teams/TeamCard.tsx` | Add coloured dot. |
| `src/components/competitions/detail/TeamsTab.tsx` | Wire `takenColorIds` to picker; adapt `handleSaveTeamName` → `handleSaveTeam` for new signature. |
| `src/components/rounds/ViewRound/RoundDetailsTab/components/TeamsSection.tsx` | Use `getTeamColorHex`. |
| `src/components/scoring/ScoringPairFormationUI/utils/helpers.ts` | Use `getTeamColorHex`; update callers. |
| `src/components/scoring/ScoringPairFormationUI/components/PairsListSection.tsx` | Pass full team objects (not just index) to colour resolver. |
| `src/components/teams/index.ts` (and any other barrel) | Update export name. |

Anywhere else that imports `EditTeamNameModal` by path needs the rename — a project-wide grep for `EditTeamNameModal` covers it.

## Open questions

None at design time. All decisions captured above.

## Verification

1. **Migration smoke test (local Supabase):** run the migration on a snapshot of staging data; spot-check a competition with 4 teams to confirm each got a distinct palette id ordered by `created_at`.
2. **Auto-assign:** create a fresh team-mode competition, run "Generate balanced teams" with 6 teams, confirm each team in the resulting list has a unique colour matching the first 6 entries of `AVATARS`.
3. **Non-destructive regenerate:** with the same 6 teams, edit team #3's colour to something out of palette order, then non-destructive-regenerate. Confirm team #3 keeps its picked colour, others unchanged.
4. **Destructive regenerate:** change team count from 6 → 4. Confirm the surviving teams get reassigned cleanly in palette order.
5. **Picker UX:** open the rename modal on team #1. Verify team #2's, #3's, …'s colours appear disabled in the swatch grid; team #1's own colour remains selectable. Pick a new colour, save, confirm the dot updates everywhere within the same render.
6. **Render parity:**
   - Comp Detail → Teams tab → TeamCard shows the dot.
   - View Round → Teams tab shows the same dot for the same team.
   - Scoring-pair pill on a round in scoring mode tints to the same colour.
7. **Lock carve-out:** mark a round in-progress. Confirm shuffle/stepper/manual-move remain blocked, but the rename modal still opens and the picker still saves.
8. **Type-check + lint:** `pnpm type-check && pnpm lint` clean for all touched files.
