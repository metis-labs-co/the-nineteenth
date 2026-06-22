# Points Config in a Mode-Conditional Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the per-round Points & Rules card off the Competition Detail → Details tab and behind a mode-conditional "Points Config" row in the Settings card that opens a bottom sheet (organiser edits, player views read-only).

**Architecture:** Reuse the existing `PointsConfigSection` (it already owns the read-only list + organiser edit-gating + stacked `EditRoundPointsSheet`). Give it a `variant` prop so it can render without card chrome inside a sheet. Add a thin `PointsConfigSheet` wrapper, add a "Points Config" Settings row shown only in per-round mode (mutually exclusive with the existing "General Rules" row), and remove the standalone card from the Details tab.

**Tech Stack:** React Native + TypeScript, React Native Paper, `BottomSheet` from `@/components/common`. UI-only — no data/type-model/migration changes.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-23-points-config-in-sheet-design.md`.
- **Do all work in a dedicated git worktree off `main`** (per user workflow rule). Never edit feature code on the shared main checkout.
- **No data-model, DB-migration, or scoring-logic changes.** Reuse `PointsConfigSection`, `EditRoundPointsSheet`, `EditCompetitionRulesSheet`, and `summarizeCompetition` unchanged in behaviour.
- **Mode-conditional rows (mutually exclusive):** `per_round_rules_enabled === true` → new **"Points Config"** row; `=== false` → existing **"General Rules"** row (unchanged).
- **Points Config row is tappable by everyone** (organiser + player); the sheet is read-only for players, editable only by the organiser — the gating already lives inside `PointsConfigSection` (`isOrganizer && (isSuperAdmin || advanced_round_rules)`). The row is NOT locked by `structureLocked`.
- **Styling:** dynamic colours via `useThemeColors()`; static tokens (`spacing`, `typography`, `borderRadius`, `shadows`) imported directly. Paper `Text`/`Icon`; `TouchableOpacity` for taps (never Paper `Button`).
- **Modal solidity:** the new sheet uses `BottomSheet` with `useModal` (same as the sibling sheets), which satisfies the solid-surface modal rule.
- Wrap-up after each task: `pnpm type-check` clean before committing.

---

## File Structure

**Create:**
- `src/components/competitions/detail/sections/sheets/PointsConfigSheet.tsx` — `BottomSheet` wrapper rendering `PointsConfigSection variant="plain"`.

**Modify:**
- `src/components/competitions/detail/sections/PointsConfigSection.tsx` — add `variant?: 'card' | 'plain'` prop (default `'card'`); drop card chrome + internal title when `'plain'`.
- `src/components/competitions/detail/sections/sheets/index.ts` — export `PointsConfigSheet`.
- `src/components/competitions/detail/sections/types.ts` — add `rounds: Round[]` to `SettingsSectionProps` (import `Round` if missing).
- `src/components/competitions/detail/sections/SettingsSection.tsx` — destructure `rounds`; add the "Points Config" row (per-round mode) + `points-config` to the `OpenSheet` union + render `PointsConfigSheet`.
- `src/components/competitions/detail/DetailsTab.tsx` — remove the standalone `<PointsConfigSection>` render + import; pass `rounds` to `<SettingsSection>`.

---

## Task 1: `variant` prop on `PointsConfigSection`

**Files:**
- Modify: `src/components/competitions/detail/sections/PointsConfigSection.tsx`

**Interfaces:**
- Produces: `PointsConfigSectionProps` gains `variant?: 'card' | 'plain'` (default `'card'`). `'plain'` renders without the outer card margin/shadow/background and without the internal "Points & Rules" title (the sheet supplies the title). All other behaviour (list, summary, badges, edit-gating, stacked `EditRoundPointsSheet`) unchanged.

- [ ] **Step 1: Add the `variant` prop and branch the container/title**

Replace the props interface and the two `return` blocks' outer container. Final state of the file:

```tsx
// src/components/competitions/detail/sections/PointsConfigSection.tsx
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { Competition, Round, TeamWithMembers } from '@/types/database.types';
import { summarizeCompetition } from '@/utils/competitionPoints/roundPointsSummary';
import { useFeatureAccess } from '@/hooks/subscription';
import { EditRoundPointsSheet } from './sheets/EditRoundPointsSheet';

export interface PointsConfigSectionProps {
  competition: Competition;
  rounds: Round[];
  teams?: TeamWithMembers[];
  isOrganizer: boolean;
  /**
   * 'card' (default) = standalone card with margin/shadow/background + an
   * internal title. 'plain' = embedded in a sheet: no card chrome, no internal
   * title (the sheet provides it).
   */
  variant?: 'card' | 'plain';
}

export function PointsConfigSection({
  competition,
  rounds,
  teams,
  isOrganizer,
  variant = 'card',
}: PointsConfigSectionProps) {
  const colors = useThemeColors();

  const { checkAccess, isSuperAdmin } = useFeatureAccess();
  const canEdit =
    isOrganizer && (isSuperAdmin || checkAccess('advanced_round_rules').allowed);

  const [editRoundId, setEditRoundId] = useState<string | null>(null);

  const membersPerTeam = useMemo(() => {
    const counts = (teams ?? []).map((t) => t.members.length).filter((n) => n > 0);
    return counts.length ? Math.max(...counts) : (competition.team_size ?? 1);
  }, [teams, competition.team_size]);

  const { perRound, total, toWin } = useMemo(
    () => summarizeCompetition(rounds, { membersPerTeam }),
    [rounds, membersPerTeam]
  );

  const isPlain = variant === 'plain';
  const containerStyle = isPlain
    ? styles.plain
    : [styles.card, shadows.sm, { backgroundColor: colors.surface }];

  if (competition.per_round_rules_enabled === false) {
    return (
      <View style={containerStyle}>
        {!isPlain && (
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Points & Rules</Text>
        )}
        <Text style={[typography.small, { color: colors.textSecondary }]}>
          Uses competition-wide points. Open Settings → General Rules to change.
        </Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {!isPlain && (
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Points & Rules</Text>
      )}
      <Text style={[styles.summary, { color: colors.textSecondary }]}>
        {total} points available · first to {toWin} wins
      </Text>

      {perRound.map((r, idx) => {
        const rowBody = (
          <View style={[styles.row, { borderTopColor: colors.border }]}>
            <View style={styles.rowMain}>
              <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={1}>
                {r.title?.trim() ? r.title : `Round ${idx + 1}`}
              </Text>
              <Text style={[typography.small, { color: colors.textSecondary }]}>{r.detail}</Text>
            </View>
            {r.isCustom && (
              <View style={[styles.chip, { backgroundColor: colors.primaryLighter }]}>
                <Text style={[typography.caption, { color: colors.primaryDark }]}>Custom</Text>
              </View>
            )}
            {canEdit && (
              <Icon source="chevron-right" size={22} color={colors.gray400} />
            )}
          </View>
        );
        return canEdit ? (
          <TouchableOpacity
            key={r.roundId}
            onPress={() => setEditRoundId(r.roundId)}
            accessibilityRole="button"
            accessibilityLabel={`Edit points for ${r.title || `round ${idx + 1}`}`}
          >
            {rowBody}
          </TouchableOpacity>
        ) : (
          <View key={r.roundId}>{rowBody}</View>
        );
      })}

      {editRoundId && (
        <EditRoundPointsSheet
          visible={!!editRoundId}
          onDismiss={() => setEditRoundId(null)}
          round={rounds.find((r) => r.id === editRoundId)!}
          competitionId={competition.id}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  plain: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  cardTitle: { ...typography.h4, marginBottom: spacing.xs },
  summary: { ...typography.small, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  rowMain: { flex: 1 },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: clean. (Existing callers omit `variant`, so they default to `'card'` — unchanged behaviour.)

- [ ] **Step 3: Commit**

```bash
git add src/components/competitions/detail/sections/PointsConfigSection.tsx
git commit -m "feat(points): add variant prop to PointsConfigSection for sheet embedding"
```

---

## Task 2: `PointsConfigSheet` wrapper

**Files:**
- Create: `src/components/competitions/detail/sections/sheets/PointsConfigSheet.tsx`
- Modify: `src/components/competitions/detail/sections/sheets/index.ts`

**Interfaces:**
- Consumes: `PointsConfigSection` (Task 1, `variant="plain"`), `BottomSheet` (`@/components/common/BottomSheet`, props `visible` / `onClose` / `title` / `useModal` / optional `height`).
- Produces: `PointsConfigSheet` with props
  `{ visible: boolean; onDismiss: () => void; competition: Competition; rounds: Round[]; teams?: TeamWithMembers[]; isOrganizer: boolean }`.

- [ ] **Step 1: Create the sheet**

```tsx
// src/components/competitions/detail/sections/sheets/PointsConfigSheet.tsx
/**
 * PointsConfigSheet
 *
 * Bottom sheet home for the per-round points config. Renders PointsConfigSection
 * (variant="plain") so the per-round list + organiser edit flow live behind the
 * Settings "Points Config" row instead of a standalone Details-tab card. Editing
 * is organiser-only (gated inside PointsConfigSection); players see a read-only list.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { BottomSheet } from '@/components/common/BottomSheet';
import { spacing } from '@/constants/theme';
import type { Competition, Round, TeamWithMembers } from '@/types/database.types';
import { PointsConfigSection } from '../PointsConfigSection';

export interface PointsConfigSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competition: Competition;
  rounds: Round[];
  teams?: TeamWithMembers[];
  isOrganizer: boolean;
}

export function PointsConfigSheet({
  visible,
  onDismiss,
  competition,
  rounds,
  teams,
  isOrganizer,
}: PointsConfigSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onDismiss} title="Points & Rules" height={0.7} useModal>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <PointsConfigSection
          variant="plain"
          competition={competition}
          rounds={rounds}
          teams={teams}
          isOrganizer={isOrganizer}
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
});
```

> If `BottomSheet`'s prop names differ from `visible`/`onClose`/`title`/`height`/`useModal`, match the exact usage in the sibling `EditCompetitionRulesSheet.tsx` / `EditRoundPointsSheet.tsx` instead (read one to confirm), keeping the `PointsConfigSection variant="plain"` body identical.

- [ ] **Step 2: Export from the sheets barrel**

In `src/components/competitions/detail/sections/sheets/index.ts`, add:

```ts
export { PointsConfigSheet } from './PointsConfigSheet';
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/competitions/detail/sections/sheets/PointsConfigSheet.tsx \
  src/components/competitions/detail/sections/sheets/index.ts
git commit -m "feat(points): PointsConfigSheet wrapper around PointsConfigSection"
```

---

## Task 3: Add the Settings row + remove the standalone card

**Files:**
- Modify: `src/components/competitions/detail/sections/types.ts`
- Modify: `src/components/competitions/detail/sections/SettingsSection.tsx`
- Modify: `src/components/competitions/detail/DetailsTab.tsx`

**Interfaces:**
- Consumes: `PointsConfigSheet` (Task 2), `summarizeCompetition` (`@/utils/competitionPoints/roundPointsSummary`).
- Produces: `SettingsSectionProps` gains `rounds: Round[]`. Settings renders a "Points Config" row only when `per_round_rules_enabled === true`.

- [ ] **Step 1: Add `rounds` to `SettingsSectionProps`**

In `src/components/competitions/detail/sections/types.ts`, add to `SettingsSectionProps` (after `hasStartedRound`), and ensure `Round` is imported in that file (it already imports `Competition`, `TeamWithMembers` — add `Round` to the same import if absent):

```ts
  /** All rounds in the competition — used by the Points Config row/sheet. */
  rounds: Round[];
```

- [ ] **Step 2: Wire the row + sheet into `SettingsSection`**

In `src/components/competitions/detail/sections/SettingsSection.tsx`:

(a) Add imports:
```tsx
import { summarizeCompetition } from '@/utils/competitionPoints/roundPointsSummary';
```
and add `PointsConfigSheet` to the existing `./sheets` import block.

(b) Add `'points-config'` to the `OpenSheet` union:
```tsx
type OpenSheet =
  | 'type'
  | 'handicap'
  | 'team-mode'
  | 'dates'
  | 'rules-mode'
  | 'general-rules'
  | 'points-config'
  | null;
```

(c) Destructure `rounds` from props (add to the existing destructure list):
```tsx
export function SettingsSection({
  competition,
  isOrganizer,
  hasStartedRound,
  teams = [],
  rounds,
  onViewTeams,
}: SettingsSectionProps) {
```

(d) Compute the row's summary value (place near the other derived values, after `perRoundEnabled`):
```tsx
  const pointsMembersPerTeam = useMemo(() => {
    const counts = teams.map((t) => t.members.length).filter((n) => n > 0);
    return counts.length ? Math.max(...counts) : (competition.team_size ?? 1);
  }, [teams, competition.team_size]);
  const pointsTotal = useMemo(
    () => summarizeCompetition(rounds, { membersPerTeam: pointsMembersPerTeam }).total,
    [rounds, pointsMembersPerTeam]
  );
```

(e) Add the **Points Config** row immediately after the General Rules block (so it's adjacent to Rules Mode), shown only in per-round mode. The row's `onPress` is unconditional (organiser + player), and it is NOT locked by `structureLocked` (organisers can adjust points mid-competition):
```tsx
        {perRoundEnabled && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="medal-outline"
              label="Points Config"
              onPress={() => setOpenSheet('points-config')}
              accessibilityLabel="View or edit competition points config"
            >
              <Text style={[styles.value, { color: colors.textPrimary }]}>
                {pointsTotal} pts
              </Text>
            </SettingRow>
          </>
        )}
```

(f) Render the sheet alongside the other `openSheet === …` blocks:
```tsx
      {openSheet === 'points-config' && (
        <PointsConfigSheet
          visible
          onDismiss={handleClose}
          competition={competition}
          rounds={rounds}
          teams={teams}
          isOrganizer={isOrganizer}
        />
      )}
```

- [ ] **Step 3: Remove the standalone card + thread `rounds` in `DetailsTab`**

In `src/components/competitions/detail/DetailsTab.tsx`:
- Remove `PointsConfigSection` from the `./sections` import block.
- Delete the `<PointsConfigSection … />` render block (the one between `SettingsSection` and `PrizePoolSection`).
- Pass `rounds` to `SettingsSection`:
```tsx
      <SettingsSection
        competition={competition}
        isOrganizer={isOrganizer}
        hasStartedRound={hasStartedRound}
        teams={teams}
        rounds={rounds}
        onViewTeams={onViewTeams}
      />
```

(`rounds` is already a `DetailsTab` prop — `RoundWithCourse[]`, which is assignable to `Round[]`.)

- [ ] **Step 4: Type-check**

Run: `pnpm type-check`
Expected: clean. (If it complains that any other caller of `SettingsSection` is missing `rounds`, search `grep -rn "<SettingsSection" src` and thread `rounds` there too — `DetailsTab` is the only expected caller.)

- [ ] **Step 5: Commit**

```bash
git add src/components/competitions/detail/sections/types.ts \
  src/components/competitions/detail/sections/SettingsSection.tsx \
  src/components/competitions/detail/DetailsTab.tsx
git commit -m "feat(points): move points config behind a per-round Settings row; drop the Details card"
```

---

## Final verification

- [ ] `pnpm type-check` — clean.
- [ ] `pnpm lint` — no new errors in the changed files.
- [ ] Manual (per-round comp, e.g. prod-shaped Ryder cup):
  - Details tab no longer shows the standalone Points & Rules card.
  - Settings card shows a **Points Config** row (and NOT "General Rules"); its value reads "{N} pts".
  - Tapping it (as organiser) opens the sheet with the per-round list; tapping a round opens `EditRoundPointsSheet`; an edit saves and re-finalizes.
  - As a non-organiser/player, the row opens the sheet read-only (no chevrons, no edit sheet).
- [ ] Manual (general-rules comp): Settings shows **General Rules** (not Points Config), unchanged; no standalone card.
- [ ] Use `superpowers:finishing-a-development-branch` to merge.
