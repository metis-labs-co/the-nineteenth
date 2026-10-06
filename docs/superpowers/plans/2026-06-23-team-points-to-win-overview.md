# Team Points-to-Win Overview (+ sheet padding fix) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "First to N points wins · X available" overview banner to the team leaderboard view of per-round team competitions, and fix the flush top padding of the Points Config sheet summary.

**Architecture:** A pure `TeamPointsToWinBanner` presentational component, rendered by `LeaderboardTab` above the team standings when the team view is active on a per-round team comp. `LeaderboardTab` computes `{ total, toWin }` from the existing `summarizeCompetition` using `membersPerTeam` derived from its already-fetched `useTeams` data; a new `perRoundRulesEnabled` prop (threaded from the detail screen) gates it. The padding fix is a one-line style change on `PointsConfigSection`'s `plain` variant.

**Tech Stack:** React Native + TypeScript, React Native Paper, TanStack Query. UI-only — no data-model/type/migration changes.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-23-team-points-to-win-overview-design.md`.
- **Do all work in a dedicated git worktree off `main`** (per user workflow rule). Never edit feature code on the shared main checkout.
- **No data-model, DB-migration, or scoring-logic changes.** Reuse `summarizeCompetition(rounds, { membersPerTeam })` unchanged.
- **Banner content (verbatim):** title `First to {toWin} points wins`; subtext `{total} points available`.
- **Banner visibility:** team leaderboard view only, AND `teamMode !== 'none'`, AND `perRoundRulesEnabled === true`. Visible to all users.
- **`toWin`/`total` source:** `summarizeCompetition(rounds, { membersPerTeam })`; `membersPerTeam = max team member count from useTeams data, fallback 1` (consistent with `PointsConfigSection`).
- **Styling:** dynamic colours via `useThemeColors()`; static tokens (`spacing`, `typography`, `borderRadius`) imported directly. Paper `Text`/`Icon`.
- Wrap-up after each task: `pnpm type-check` clean before committing.

---

## File Structure

**Create:**
- `src/components/leaderboard/TeamPointsToWinBanner.tsx` — pure banner (props `{ total, toWin }`).

**Modify:**
- `src/components/competitions/detail/sections/PointsConfigSection.tsx` — add `paddingTop` to `styles.plain`.
- `src/components/leaderboard/LeaderboardTab.tsx` — add `perRoundRulesEnabled` prop; compute `{ total, toWin }`; render the banner above `TeamLeaderboardTable`.
- `src/screens/competitions/CompetitionDetailScreen/index.tsx` — pass `perRoundRulesEnabled` to `<LeaderboardTab>`.

---

## Task 1: Sheet summary padding fix

**Files:**
- Modify: `src/components/competitions/detail/sections/PointsConfigSection.tsx`

**Interfaces:** none changed — style-only.

- [ ] **Step 1: Add `paddingTop` to the `plain` style**

In `src/components/competitions/detail/sections/PointsConfigSection.tsx`, change the `plain` entry in the `StyleSheet.create` block from:

```tsx
  plain: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
```

to:

```tsx
  plain: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/competitions/detail/sections/PointsConfigSection.tsx
git commit -m "style(points): add top padding to Points Config sheet summary"
```

---

## Task 2: `TeamPointsToWinBanner` component

**Files:**
- Create: `src/components/leaderboard/TeamPointsToWinBanner.tsx`

**Interfaces:**
- Produces: `TeamPointsToWinBanner` with props `{ total: number; toWin: number }` (pure presentational; no data fetching).

- [ ] **Step 1: Create the banner**

```tsx
// src/components/leaderboard/TeamPointsToWinBanner.tsx
/**
 * TeamPointsToWinBanner
 *
 * Compact overview shown above the team standings for per-round team competitions:
 * the points target ("first to N wins") and total points available. Pure — the
 * caller computes total/toWin via summarizeCompetition.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

export interface TeamPointsToWinBannerProps {
  total: number;
  toWin: number;
}

export function TeamPointsToWinBanner({ total, toWin }: TeamPointsToWinBannerProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`First to ${toWin} points wins. ${total} points available.`}
    >
      <Icon source="flag-checkered" size={22} color={colors.primary} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          First to {toWin} points wins
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {total} points available
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  textContainer: { flex: 1 },
  title: { ...typography.bodyBold },
  subtitle: { ...typography.small },
});
```

> `typography.bodyBold` is used by `src/components/subscription/InfoBanner.tsx`; confirm it exists in `src/constants/theme.ts` (it does). If for any reason it doesn't resolve, use `{ ...typography.body, fontWeight: '600' }` instead.

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/leaderboard/TeamPointsToWinBanner.tsx
git commit -m "feat(leaderboard): TeamPointsToWinBanner component"
```

---

## Task 3: Wire the banner into `LeaderboardTab` + thread the prop

**Files:**
- Modify: `src/components/leaderboard/LeaderboardTab.tsx`
- Modify: `src/screens/competitions/CompetitionDetailScreen/index.tsx`

**Interfaces:**
- Consumes: `TeamPointsToWinBanner` (Task 2), `summarizeCompetition` (`@/utils/competitionPoints/roundPointsSummary`).
- Produces: `LeaderboardTabProps` gains `perRoundRulesEnabled: boolean`.

**Context:** `LeaderboardTab` already derives `hasTeams` and `effectiveView`, fetches `teams` via `useTeams` (each `TeamWithMembers` has a `members` array), and renders `<TeamLeaderboardTable>` in the `effectiveView === 'team'` branch. `rounds` is `RoundWithCourse[]`, assignable to `Round[]`.

- [ ] **Step 1: Add the prop to `LeaderboardTabProps`**

In `src/components/leaderboard/LeaderboardTab.tsx`, add to the `LeaderboardTabProps` interface (next to `teamMode` / `rounds`):

```tsx
  /** True when the competition uses per-round rules — gates the team points-to-win banner. */
  perRoundRulesEnabled: boolean;
```

- [ ] **Step 2: Import the banner + the formatter**

Add near the other imports in `LeaderboardTab.tsx`:

```tsx
import { TeamPointsToWinBanner } from './TeamPointsToWinBanner';
import { summarizeCompetition } from '@/utils/competitionPoints/roundPointsSummary';
```

- [ ] **Step 3: Destructure the prop**

Add `perRoundRulesEnabled` to the component's destructured params (alongside `teamMode`, `rounds`):

```tsx
export const LeaderboardTab = React.memo(function LeaderboardTab({
  competitionId,
  teamMode,
  rounds,
  perRoundRulesEnabled,
  currentUserId,
  autoRefresh = true,
  onEntryPress,
  selectedView,
  onViewChange,
  scrollTarget,
  onScrollHandled,
  renderInlineToggle = true,
}: LeaderboardTabProps) {
```

- [ ] **Step 4: Compute the points-to-win figures**

Add this `useMemo` after `teamEntries` is defined (it depends on `effectiveView`, `hasTeams`, `teams`, `rounds`, all already in scope):

```tsx
  // Points target for the team standings overview. Only meaningful for per-round
  // team competitions. membersPerTeam mirrors PointsConfigSection's derivation.
  const teamPointsToWin = useMemo(() => {
    if (effectiveView !== 'team' || !hasTeams || !perRoundRulesEnabled) return null;
    const counts = (teams ?? []).map((t) => t.members.length).filter((n) => n > 0);
    const membersPerTeam = counts.length ? Math.max(...counts) : 1;
    const { total, toWin } = summarizeCompetition(rounds, { membersPerTeam });
    return { total, toWin };
  }, [effectiveView, hasTeams, perRoundRulesEnabled, teams, rounds]);
```

- [ ] **Step 5: Render the banner above the team table**

Find the team-view render branch (currently `) : effectiveView === 'team' ? (` followed by `<TeamLeaderboardTable … />`). Wrap it in a fragment so the banner renders first:

```tsx
      ) : effectiveView === 'team' ? (
        <>
          {teamPointsToWin && (
            <TeamPointsToWinBanner
              total={teamPointsToWin.total}
              toWin={teamPointsToWin.toWin}
            />
          )}
          <TeamLeaderboardTable
            leaderboard={teamEntries}
            currentUserId={currentUserId}
            isLoading={false}
            showTiedIndicator
            testID="competition-team-leaderboard"
          />
        </>
      ) : (
```

(Keep the existing `<TeamLeaderboardTable>` props exactly as they are — only wrap with the fragment + banner.)

- [ ] **Step 6: Thread the prop from the detail screen**

In `src/screens/competitions/CompetitionDetailScreen/index.tsx`, add `perRoundRulesEnabled` to the `<LeaderboardTab>` render (the `competition` object is in scope there):

```tsx
          <LeaderboardTab
            competitionId={id}
            teamMode={competition.team_mode}
            rounds={rounds}
            perRoundRulesEnabled={competition.per_round_rules_enabled ?? false}
            currentUserId={user?.id}
            onEntryPress={handleLeaderboardEntryPress}
            selectedView={leaderboardView}
            onViewChange={setLeaderboardView}
            scrollTarget={leaderboardScrollTarget}
            onScrollHandled={handleScrollHandled}
            renderInlineToggle={false}
          />
```

- [ ] **Step 7: Type-check**

Run: `pnpm type-check`
Expected: clean. (If another caller of `LeaderboardTab` exists, `grep -rn "<LeaderboardTab" src` and add `perRoundRulesEnabled` there too — `CompetitionDetailScreen` is the expected sole caller.)

- [ ] **Step 8: Commit**

```bash
git add src/components/leaderboard/LeaderboardTab.tsx \
  src/screens/competitions/CompetitionDetailScreen/index.tsx
git commit -m "feat(leaderboard): show points-to-win banner on team standings (per-round comps)"
```

---

## Final verification

- [ ] `pnpm type-check` — clean.
- [ ] `pnpm lint` — no new errors in changed files.
- [ ] Manual:
  - Per-round team comp → Leaderboard → Team view shows the "First to N points wins · X available" banner above the standings; numbers match the Points Config sheet.
  - Individual view → no banner. General-rules comp or non-team comp → no banner.
  - Points Config sheet: the summary line now has comfortable spacing under the title.
- [ ] Use `superpowers:finishing-a-development-branch` to merge.
