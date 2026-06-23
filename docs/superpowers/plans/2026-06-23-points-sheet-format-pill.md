# Round Format Pill in Points & Rules Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a round-format pill under each round name in the Points & Rules rows, and number the unnamed-round fallback ("Round 3" / "Round 4").

**Architecture:** Make `summarizeRoundPoints` return an empty title when a round has no name (the row component already has a numbered fallback), then in `PointsConfigSection` render a `Pill` per row whose label is derived exactly like `CompetitionRoundCard` (`inferPresetIdFromRound` → `ROUND_PRESETS[id].title`, fallback `GAME_TYPE_LABELS[game_type]`).

**Tech Stack:** React Native + TypeScript, React Native Paper, Jest. UI-only — no data-model/type/migration changes.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-23-points-sheet-format-pill-design.md`.
- **Do all work in a dedicated git worktree off `main`** (per user workflow rule). Never edit feature code on the shared main checkout.
- **No data-model, DB-migration, or scoring-logic changes.** Reuse `inferPresetIdFromRound`, `ROUND_PRESETS`, `GAME_TYPE_LABELS`, `Pill`.
- **Format label derivation (verbatim, mirrors `CompetitionRoundCard`):**
  `inferPresetIdFromRound({ game_type, is_team_round, team_format, round_format, sub_match_size, rules_override })` →
  `(presetId && ROUND_PRESETS[presetId]?.title) || GAME_TYPE_LABELS[round.game_type]`.
- **Numbered fallback:** title is `r.title?.trim() ? r.title : \`Round ${idx + 1}\`` (the component already does this; Task 1 makes it fire for unnamed rounds).
- **Pill placement:** in the row's left column, between the title and the points detail line; `size="sm"`, left-aligned.
- **Styling:** dynamic colours via `useThemeColors()`; static tokens imported directly.
- Wrap-up after each task: `pnpm type-check` clean (and the task's tests pass) before committing.

---

## File Structure

**Modify:**
- `src/utils/competitionPoints/roundPointsSummary.ts` — empty title fallback.
- `src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts` — assert empty title for no-name round.
- `src/components/competitions/detail/sections/PointsConfigSection.tsx` — derive + render the format pill; numbered title.

---

## Task 1: Empty title fallback in `summarizeRoundPoints`

**Files:**
- Modify: `src/utils/competitionPoints/roundPointsSummary.ts`
- Test: `src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts`

**Interfaces:**
- Produces: `summarizeRoundPoints(...).title` is `''` when the round has no name (was the literal `Round`). Numbering of unnamed rounds is delegated to the row component (which already uses `Round ${idx+1}`).

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts` (inside the existing `describe('summarizeRoundPoints', …)` block — the `round()` helper there defaults `name: null`):

```ts
  it('returns an empty title when the round has no name (component numbers it)', () => {
    const s = summarizeRoundPoints(
      round('r5', { team_points: { win: 2, tie: 1, loss: 0 } }),
      CTX
    );
    expect(s.title).toBe('');
  });
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm jest src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts -t "empty title"`
Expected: FAIL — `title` is currently `'Round'`, not `''`.

- [ ] **Step 3: Implement**

In `src/utils/competitionPoints/roundPointsSummary.ts`, find the title line in `summarizeRoundPoints` (currently `const title = round.name?.trim() || \`Round\`;` — a literal `Round` fallback) and change the fallback to an empty string:

```ts
  const title = round.name?.trim() || '';
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `pnpm jest src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts`
Expected: PASS (new case + all pre-existing cases in the file).

- [ ] **Step 5: Type-check and commit**

```bash
pnpm type-check
git add src/utils/competitionPoints/roundPointsSummary.ts src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts
git commit -m "fix(points): empty title for unnamed rounds so rows number them"
```

---

## Task 2: Render the format pill (+ numbered title) in `PointsConfigSection`

**Files:**
- Modify: `src/components/competitions/detail/sections/PointsConfigSection.tsx`

**Interfaces:**
- Consumes: Task 1's empty-title behaviour; `inferPresetIdFromRound`, `ROUND_PRESETS` (`@/constants/roundPresets`), `GAME_TYPE_LABELS` (`../types`), `Pill` (`@/components/common`).

- [ ] **Step 1: Add imports**

In `src/components/competitions/detail/sections/PointsConfigSection.tsx`, add to the import block:

```tsx
import { Pill } from '@/components/common';
import { inferPresetIdFromRound, ROUND_PRESETS } from '@/constants/roundPresets';
import { GAME_TYPE_LABELS } from '../types';
```

- [ ] **Step 2: Add a module-level format-label helper**

Add below the imports, above the `PointsConfigSectionProps` interface:

```tsx
/**
 * Descriptive format label for a round, mirroring CompetitionRoundCard:
 * the matched preset's title (e.g. "1v1 Singles Match Play"), else the bare
 * game-type label.
 */
function roundFormatLabel(round: Round): string {
  const presetId = inferPresetIdFromRound({
    game_type: round.game_type,
    is_team_round: round.is_team_round,
    team_format: round.team_format,
    round_format: round.round_format,
    sub_match_size: round.sub_match_size,
    rules_override: round.rules_override ?? null,
  });
  return (presetId && ROUND_PRESETS[presetId]?.title) || GAME_TYPE_LABELS[round.game_type];
}
```

- [ ] **Step 3: Build a `roundsById` lookup**

Inside the component, after the `summarizeCompetition` `useMemo` (where `perRound` is derived), add:

```tsx
  const roundsById = useMemo(
    () => new Map(rounds.map((rd) => [rd.id, rd])),
    [rounds]
  );
```

- [ ] **Step 4: Render the pill + numbered title in each row**

In the `perRound.map((r, idx) => { … })` body, compute the label at the top of the callback (before `rowBody`):

```tsx
        const round = roundsById.get(r.roundId);
        const formatLabel = round ? roundFormatLabel(round) : null;
```

Then, inside `rowBody`'s `<View style={styles.rowMain}>`, insert the pill between the title `Text` and the detail `Text` so the column reads title → pill → detail:

```tsx
            <View style={styles.rowMain}>
              <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={1}>
                {r.title?.trim() ? r.title : `Round ${idx + 1}`}
              </Text>
              {formatLabel && (
                <Pill label={formatLabel} size="sm" style={styles.formatPill} />
              )}
              <Text style={[typography.small, { color: colors.textSecondary }]}>{r.detail}</Text>
            </View>
```

(The title line already uses the `Round ${idx + 1}` numbered fallback — with Task 1 it now fires for unnamed rounds. Leave the `r.isCustom` chip and `canEdit` chevron after `rowMain` unchanged.)

- [ ] **Step 5: Add the pill style**

Add to the `StyleSheet.create({ … })` block:

```tsx
  formatPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
```

- [ ] **Step 6: Type-check + lint**

Run: `pnpm type-check`
Expected: clean.
Run: `pnpm exec eslint src/components/competitions/detail/sections/PointsConfigSection.tsx`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/competitions/detail/sections/PointsConfigSection.tsx
git commit -m "feat(points): show round format pill (+ numbered unnamed rounds) in Points & Rules rows"
```

---

## Final verification

- [ ] `pnpm type-check` — clean.
- [ ] `pnpm jest src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts` — all pass.
- [ ] `pnpm lint` — no new errors in changed files.
- [ ] Manual (per-round comp "Murray Winter Classic 2026"): open Points & Rules → each row shows a format pill under the name ("Team Stableford — Best 3 of 4", "2v2 Alt Shot (Foursomes)", "4v4 Team Scramble", "1v1 Singles Match Play"); the two formerly-"Round" rows now read "Round 3" / "Round 4" with their pills.
- [ ] Use `superpowers:finishing-a-development-branch` to merge.
