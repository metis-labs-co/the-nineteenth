# Per-Round Points & Rules Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app "Points & Rules" section to the Competition Detail screen that shows each round's points setup and lets the organiser edit it (including voiding a round's points and adding a holes-up-margin bonus point), so the Ryder-cup "Winter Cobram Classic 2026" config can be managed entirely in-app.

**Architecture:** Per-round points already live in `rounds.rules_override` (JSONB) and are turned into `competition_points` during finalization, which the leaderboard sums. We add (1) a pure summary formatter + read-only UI section, (2) a `useUpdateRoundRules` mutation + an edit sheet that writes `rules_override` and re-runs the existing idempotent `refinalizeRoundResults`, and (3) a new optional `bonus_points` field on `RoundRulesOverride` plus bonus computation inside `finalizePairResults`. No DB migration — `rules_override` and `round_results.raw_result_data` are already JSONB.

**Tech Stack:** React Native + TypeScript, Expo, TanStack Query, Supabase, Jest. UI uses `useThemeColors()` + static tokens per the styling rules. React Native Paper for `Text`/`Icon`/`TextInput`; `TouchableOpacity`/`Pressable` for buttons (never Paper `Button`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-22-per-round-points-and-rules-config-design.md`.
- **Do all work in a dedicated git worktree off `main`** (per user workflow rule): `git worktree add ../the-nineteenth-points-rules -b feat/per-round-points-rules main`. Never edit feature code on the shared main checkout.
- **No DB migration.** `rules_override` (JSONB) and `round_results.raw_result_data` (JSONB) absorb all new data.
- **Editing per-round rules is gated** behind the `advanced_round_rules` Premium feature; **super admin bypasses**. Use `useFeatureAccess()` from `@/hooks/subscription`, which returns `{ checkAccess, isSuperAdmin }` — gate on `isSuperAdmin || checkAccess('advanced_round_rules').allowed`. **Applying** saved overrides is NEVER gated.
- **Void semantics:** `team_points: {win:0,tie:0,loss:0}` with `contributes_to_team_leaderboard: true` — round still finalizes and shows a winner, awards 0.
- **Bonus metric:** net holes up = signed sum of each team's `sub_matches.final_differential` (positive = side A ahead). Higher net total wins. Exact tie → split 0.5 each (`tie: 'split'`).
- **Modals:** any screen presented as `presentation: 'modal'` or RN `<Modal>` must be wrapped in `<SystemModalTheme>` from `@/components/common`. The new sheets follow the existing `EditCompetitionRulesSheet` presentation pattern (already handled) — match it exactly.
- Wrap-up after each task: `pnpm type-check` must pass and the task's tests must pass before committing.

---

## File Structure

**Create:**
- `src/utils/competitionPoints/roundPointsSummary.ts` — pure formatter: per-round points label + max points + custom/void flags + competition totals.
- `src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts`
- `src/components/competitions/detail/sections/PointsConfigSection.tsx` — read-only points list + organiser edit entry points.
- `src/components/competitions/detail/sections/sheets/EditRoundPointsSheet.tsx` — per-round points editor (team/pair points, void toggle, bonus).
- `src/services/rounds/marginBonus.ts` — pure `decideMarginBonus` helper.
- `src/__tests__/services/rounds/marginBonus.test.ts`

**Modify:**
- `src/types/database/roundRules.types.ts` — add `bonus_points` to `RoundRulesOverride` + a `MarginBonusConfig` interface.
- `src/components/competitions/detail/DetailsTab.tsx` — render `PointsConfigSection`; thread `teams` (already a prop) and `competitionId`.
- `src/components/competitions/detail/sections/index.ts` — export `PointsConfigSection`.
- `src/hooks/rounds/mutations.ts` — add `useUpdateRoundRules`.
- `src/hooks/rounds/index.ts` — export `useUpdateRoundRules`.
- `src/services/rounds/finalizePairResults.ts` — accumulate per-team net margin and apply bonus awards.
- `src/__tests__/services/rounds/finalizePairResults.test.ts` — add bonus cases.

---

## Phase 1 — Read-only "Points & Rules" view

### Task 1: Pure round-points summary formatter

**Files:**
- Create: `src/utils/competitionPoints/roundPointsSummary.ts`
- Test: `src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts`
- Modify: `src/types/database/roundRules.types.ts` — define the canonical `MarginBonusConfig` and add `bonus_points?: MarginBonusConfig` to `RoundRulesOverride` (pulled earlier from Task 5, because this formatter reads `bonus_points`). Use the exact strict shape from Task 5: `interface MarginBonusConfig { enabled: boolean; metric: 'combined_match_margin'; points: number; tie: 'split' | 'void' | 'carry' }`.

**Interfaces:**
- Consumes: `Round` (`@/types/database.types`), `RoundRulesOverride` + `WinTieLossPoints` + `MarginBonusConfig` (`@/types/database/roundRules.types`), `ROUND_TEMPLATES` (`@/constants/roundTemplates`).
- Produces:
  - `interface RoundPointsContext { membersPerTeam: number }`
  - `interface RoundPointsSummary { roundId: string; title: string; detail: string; maxPoints: number; isCustom: boolean; voided: boolean }`
  - `function summarizeRoundPoints(round: Round, ctx: RoundPointsContext): RoundPointsSummary`
  - `function summarizeCompetition(rounds: Round[], ctx: RoundPointsContext): { perRound: RoundPointsSummary[]; total: number; toWin: number }`

**Logic notes:**
- Sub-match count for split rounds = `Math.max(1, Math.floor(membersPerTeam / (round.sub_match_size ?? 1)))`.
- `pair_points` round max = `pair_points.win * subMatchCount` + bonus (`bonus_points.enabled ? bonus_points.points : 0`).
- `team_points` round max = `team_points.win` (+ bonus if present).
- `voided` = a `team_points`/`pair_points` block exists and all of win/tie/loss are 0.
- `isCustom` = `template_id` set AND the round's points block differs from `ROUND_TEMPLATES[template_id].override`'s corresponding block, OR a `bonus_points` is present that the template doesn't define.
- `toWin = Math.floor(total / 2) + 1`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts
import {
  summarizeRoundPoints,
  summarizeCompetition,
} from '@/utils/competitionPoints/roundPointsSummary';
import type { Round } from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

function round(id: string, override: RoundRulesOverride, extra: Partial<Round> = {}): Round {
  return {
    id,
    rules_override: override,
    round_format: 'combined',
    sub_match_size: null,
    name: null,
    ...extra,
  } as unknown as Round;
}

const CTX = { membersPerTeam: 4 };

describe('summarizeRoundPoints', () => {
  it('reports team-points max as the win value', () => {
    const s = summarizeRoundPoints(
      round('r3', { team_points: { win: 2, tie: 1, loss: 0 }, template_id: 'team_scramble_fixed_points' }),
      CTX
    );
    expect(s.maxPoints).toBe(2);
    expect(s.voided).toBe(false);
    expect(s.isCustom).toBe(false);
  });

  it('flags a voided round (all zero team points) and 0 max', () => {
    const s = summarizeRoundPoints(
      round('r1', { team_points: { win: 0, tie: 0, loss: 0 }, template_id: 'team_stableford_best_n_of_m' }),
      CTX
    );
    expect(s.maxPoints).toBe(0);
    expect(s.voided).toBe(true);
    expect(s.isCustom).toBe(true); // differs from template default 2/1/0
  });

  it('multiplies pair points by sub-match count and adds bonus', () => {
    const s = summarizeRoundPoints(
      round(
        'r2',
        {
          pair_points: { win: 1, tie: 0.5, loss: 0 },
          bonus_points: { enabled: true, metric: 'combined_match_margin', points: 1, tie: 'split' },
        },
        { round_format: 'split', sub_match_size: 2 }
      ),
      CTX
    );
    expect(s.maxPoints).toBe(3); // 1 * (4/2) + 1 bonus
  });

  it('counts 4 singles sub-matches at 2 pts each', () => {
    const s = summarizeRoundPoints(
      round('r4', { pair_points: { win: 2, tie: 1, loss: 0 } }, { round_format: 'split', sub_match_size: 1 }),
      CTX
    );
    expect(s.maxPoints).toBe(8); // 2 * (4/1)
  });
});

describe('summarizeCompetition', () => {
  it('totals max points and computes first-to-win', () => {
    const rounds: Round[] = [
      round('r1', { team_points: { win: 0, tie: 0, loss: 0 } }),
      round(
        'r2',
        {
          pair_points: { win: 1, tie: 0.5, loss: 0 },
          bonus_points: { enabled: true, metric: 'combined_match_margin', points: 1, tie: 'split' },
        },
        { round_format: 'split', sub_match_size: 2 }
      ),
      round('r3', { team_points: { win: 2, tie: 1, loss: 0 } }),
      round('r4', { pair_points: { win: 2, tie: 1, loss: 0 } }, { round_format: 'split', sub_match_size: 1 }),
    ];
    const result = summarizeCompetition(rounds, CTX);
    expect(result.total).toBe(13); // 0 + 3 + 2 + 8
    expect(result.toWin).toBe(7);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm jest src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts`
Expected: FAIL — "Cannot find module '@/utils/competitionPoints/roundPointsSummary'".

- [ ] **Step 3: Implement the formatter**

```typescript
// src/utils/competitionPoints/roundPointsSummary.ts
/**
 * Pure helpers that translate a round's rules_override into a plain-English
 * points summary and a max-points figure, plus a competition-wide total and
 * "first to N wins" target. Used by the read-only Points & Rules section.
 */
import type { Round } from '@/types/database.types';
import type {
  RoundRulesOverride,
  WinTieLossPoints,
} from '@/types/database/roundRules.types';
import { ROUND_TEMPLATES } from '@/constants/roundTemplates';

export interface RoundPointsContext {
  /** Members on each competition team (used to count split sub-matches). */
  membersPerTeam: number;
}

export interface RoundPointsSummary {
  roundId: string;
  title: string;
  detail: string;
  maxPoints: number;
  isCustom: boolean;
  voided: boolean;
}

function subMatchCount(round: Round, ctx: RoundPointsContext): number {
  const size = round.sub_match_size ?? 1;
  return Math.max(1, Math.floor(ctx.membersPerTeam / Math.max(1, size)));
}

function isZeroPoints(p: WinTieLossPoints | undefined): boolean {
  return !!p && p.win === 0 && p.tie === 0 && p.loss === 0;
}

function samePoints(a: WinTieLossPoints | undefined, b: WinTieLossPoints | undefined): boolean {
  if (!a || !b) return a === b;
  return a.win === b.win && a.tie === b.tie && a.loss === b.loss;
}

function bonusPointsValue(o: RoundRulesOverride): number {
  return o.bonus_points?.enabled ? o.bonus_points.points : 0;
}

export function summarizeRoundPoints(
  round: Round,
  ctx: RoundPointsContext
): RoundPointsSummary {
  const o: RoundRulesOverride = (round.rules_override ?? {}) as RoundRulesOverride;
  const template = o.template_id ? ROUND_TEMPLATES[o.template_id] : undefined;
  const title = round.name?.trim() || `Round`;

  const bonus = bonusPointsValue(o);
  const bonusSuffix = bonus ? ` · +${bonus} bonus (combined margin)` : '';

  // Pair-points (split) round.
  if (o.pair_points) {
    const matches = subMatchCount(round, ctx);
    const voided = isZeroPoints(o.pair_points);
    const maxPoints = voided ? 0 : o.pair_points.win * matches + bonus;
    const detail = voided
      ? 'Void · 0 points'
      : `${o.pair_points.win} pt per match (×${matches})${bonusSuffix}`;
    const isCustom =
      !template ||
      !samePoints(o.pair_points, template.override.pair_points) ||
      bonus !== bonusPointsValue(template.override);
    return { roundId: round.id, title, detail, maxPoints, isCustom, voided };
  }

  // Team-points (combined) round.
  if (o.team_points) {
    const voided = isZeroPoints(o.team_points);
    const maxPoints = voided ? 0 : o.team_points.win + bonus;
    const detail = voided
      ? 'Dinner bet · 0 points'
      : `${o.team_points.win} pts to winning team${bonusSuffix}`;
    const isCustom =
      !template ||
      !samePoints(o.team_points, template.override.team_points) ||
      bonus !== bonusPointsValue(template.override);
    return { roundId: round.id, title, detail, maxPoints, isCustom, voided };
  }

  return {
    roundId: round.id,
    title,
    detail: 'Uses competition default points',
    maxPoints: 0,
    isCustom: false,
    voided: false,
  };
}

export function summarizeCompetition(
  rounds: Round[],
  ctx: RoundPointsContext
): { perRound: RoundPointsSummary[]; total: number; toWin: number } {
  const perRound = rounds.map((r) => summarizeRoundPoints(r, ctx));
  const total = perRound.reduce((sum, r) => sum + r.maxPoints, 0);
  const toWin = Math.floor(total / 2) + 1;
  return { perRound, total, toWin };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `pnpm jest src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Type-check and commit**

```bash
pnpm type-check
git add src/utils/competitionPoints/roundPointsSummary.ts src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts
git commit -m "feat(points): pure round-points summary formatter"
```

---

### Task 2: Read-only `PointsConfigSection` on the Details tab

**Files:**
- Create: `src/components/competitions/detail/sections/PointsConfigSection.tsx`
- Modify: `src/components/competitions/detail/sections/index.ts`
- Modify: `src/components/competitions/detail/DetailsTab.tsx:138-144` (render after `SettingsSection`)

**Interfaces:**
- Consumes: `summarizeCompetition` (Task 1), `Round`/`Competition`/`TeamWithMembers` types, `useThemeColors`, static theme tokens.
- Produces: `PointsConfigSection` component with props
  `{ competition: Competition; rounds: Round[]; teams?: TeamWithMembers[]; isOrganizer: boolean; onEditRound?: (roundId: string) => void }`.

Follow the existing card/section visual pattern from `SettingsSection.tsx` (a titled card of rows). Each round row shows `title`, the `detail` string, a "Custom" chip when `isCustom`, and a chevron when `isOrganizer && onEditRound`. The header row shows `total points available · first to N wins`. When `competition.per_round_rules_enabled === false`, render a single read-only line: "Uses competition-wide points (see Settings → General Rules)".

- [ ] **Step 1: Build the component**

```tsx
// src/components/competitions/detail/sections/PointsConfigSection.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { Competition, Round, TeamWithMembers } from '@/types/database.types';
import { summarizeCompetition } from '@/utils/competitionPoints/roundPointsSummary';

export interface PointsConfigSectionProps {
  competition: Competition;
  rounds: Round[];
  teams?: TeamWithMembers[];
  isOrganizer: boolean;
  onEditRound?: (roundId: string) => void;
}

export function PointsConfigSection({
  competition,
  rounds,
  teams,
  isOrganizer,
  onEditRound,
}: PointsConfigSectionProps) {
  const colors = useThemeColors();

  const membersPerTeam = useMemo(() => {
    const counts = (teams ?? []).map((t) => t.members.length).filter((n) => n > 0);
    return counts.length ? Math.max(...counts) : (competition.team_size ?? 1);
  }, [teams, competition.team_size]);

  const { perRound, total, toWin } = useMemo(
    () => summarizeCompetition(rounds, { membersPerTeam }),
    [rounds, membersPerTeam]
  );

  if (competition.per_round_rules_enabled === false) {
    return (
      <View style={[styles.card, shadows.sm, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Points & Rules</Text>
        <Text style={[typography.small, { color: colors.textSecondary }]}>
          Uses competition-wide points. Open Settings → General Rules to change.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, shadows.sm, { backgroundColor: colors.surface }]}>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Points & Rules</Text>
      <Text style={[styles.summary, { color: colors.textSecondary }]}>
        {total} points available · first to {toWin} wins
      </Text>

      {perRound.map((r, idx) => {
        const rowBody = (
          <View style={[styles.row, { borderTopColor: colors.divider }]}>
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
            {isOrganizer && onEditRound && (
              <Icon source="chevron-right" size={22} color={colors.textMuted} />
            )}
          </View>
        );
        return isOrganizer && onEditRound ? (
          <TouchableOpacity
            key={r.roundId}
            onPress={() => onEditRound(r.roundId)}
            accessibilityRole="button"
            accessibilityLabel={`Edit points for ${r.title || `round ${idx + 1}`}`}
          >
            {rowBody}
          </TouchableOpacity>
        ) : (
          <View key={r.roundId}>{rowBody}</View>
        );
      })}
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

- [ ] **Step 2: Export it**

In `src/components/competitions/detail/sections/index.ts`, add:
```typescript
export { PointsConfigSection } from './PointsConfigSection';
```

- [ ] **Step 3: Render it in `DetailsTab`**

In `src/components/competitions/detail/DetailsTab.tsx`, add `PointsConfigSection` to the import block (lines 17-24), then insert it after the `SettingsSection` block (after line 144, before `PrizePoolSection`):

```tsx
      <PointsConfigSection
        competition={competition}
        rounds={rounds}
        teams={teams}
        isOrganizer={isOrganizer}
      />
```

(Leave `onEditRound` unset for now — Task 4 wires it.)

- [ ] **Step 4: Verify it compiles and renders**

Run: `pnpm type-check`
Expected: no new errors.
Manual: open a per-round-rules competition → Details tab → the "Points & Rules" card lists each round with its points and the total/first-to-win header.

- [ ] **Step 5: Commit**

```bash
git add src/components/competitions/detail/sections/PointsConfigSection.tsx \
  src/components/competitions/detail/sections/index.ts \
  src/components/competitions/detail/DetailsTab.tsx
git commit -m "feat(points): read-only Points & Rules section on competition detail"
```

---

## Phase 2 — Editing per-round points (solves R1 void + R4 doubling)

### Task 3: `useUpdateRoundRules` mutation

**Files:**
- Modify: `src/hooks/rounds/mutations.ts`
- Modify: `src/hooks/rounds/index.ts`
- Test: `src/__tests__/hooks/rounds/useUpdateRoundRules.test.tsx` (create)

**Interfaces:**
- Produces:
  - `interface UpdateRoundRulesInput { roundId: string; competitionId?: string; rulesOverride: RoundRulesOverride }`
  - `function useUpdateRoundRules(): UseMutationResult<void, Error, UpdateRoundRulesInput>` — writes `rounds.rules_override`, then re-runs `refinalizeRoundResults(roundId)`, then invalidates round + competition + leaderboard caches.

It mirrors `useRecalculateRoundResults` (mutations.ts:388) for invalidation and `useUpdateCompetitionField` for the Supabase update shape. `refinalizeRoundResults` is already imported at the top of `mutations.ts`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/hooks/rounds/useUpdateRoundRules.test.tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpdateRoundRules } from '@/hooks/rounds/mutations';
import { supabase } from '@/services/supabase/client';
import * as refinalize from '@/services/rounds/refinalizeRoundResults';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useUpdateRoundRules', () => {
  it('writes rules_override and re-finalizes the round', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });
    const refSpy = jest
      .spyOn(refinalize, 'refinalizeRoundResults')
      .mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateRoundRules(), { wrapper });

    await result.current.mutateAsync({
      roundId: 'round-1',
      competitionId: 'comp-1',
      rulesOverride: { pair_points: { win: 2, tie: 1, loss: 0 } },
    });

    expect(supabase.from).toHaveBeenCalledWith('rounds');
    expect(update).toHaveBeenCalledWith({
      rules_override: { pair_points: { win: 2, tie: 1, loss: 0 } },
    });
    expect(eq).toHaveBeenCalledWith('id', 'round-1');
    await waitFor(() => expect(refSpy).toHaveBeenCalledWith('round-1'));
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm jest src/__tests__/hooks/rounds/useUpdateRoundRules.test.tsx`
Expected: FAIL — `useUpdateRoundRules` is not exported.

- [ ] **Step 3: Implement the hook**

Append to `src/hooks/rounds/mutations.ts` (after `useRecalculateRoundResults`, ~line 408). Add the type import near the other type imports at the top of the file:

```typescript
import type { RoundRulesOverride } from '@/types/database/roundRules.types';
```

Then:

```typescript
// =====================================================
// UPDATE PER-ROUND RULES (rules_override)
// =====================================================

export interface UpdateRoundRulesInput {
  /** Round whose rules_override is being replaced. */
  roundId: string;
  /** Competition ID for leaderboard cache invalidation (optional). */
  competitionId?: string;
  /** Full replacement rules_override payload. */
  rulesOverride: RoundRulesOverride;
}

/**
 * Replace a round's rules_override, then re-finalize so the new points apply
 * immediately. refinalizeRoundResults is idempotent (same path as the
 * Recalculate Results action). Editing should be gated at the call site by the
 * advanced_round_rules feature; applying is never gated.
 */
export function useUpdateRoundRules() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateRoundRulesInput>({
    mutationFn: async ({ roundId, rulesOverride }) => {
      const { error } = await supabase
        .from('rounds')
        // @ts-expect-error - Supabase types don't model partial JSONB updates
        .update({ rules_override: rulesOverride })
        .eq('id', roundId);
      if (error) throw new Error(error.message);
      await refinalizeRoundResults(roundId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(variables.roundId) });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(variables.roundId) });
      if (variables.competitionId) {
        queryClient.invalidateQueries({
          queryKey: leaderboardKeys.competition(variables.competitionId),
        });
        queryClient.invalidateQueries({ queryKey: competitionKeys.detail(variables.competitionId) });
        queryClient.invalidateQueries({
          queryKey: competitionDetailsKeys.detail(variables.competitionId),
        });
      }
    },
    onError: (error) => {
      console.error('[useUpdateRoundRules] Failed:', error);
    },
  });
}
```

- [ ] **Step 4: Export the hook**

In `src/hooks/rounds/index.ts`, add `useUpdateRoundRules` to the export list (next to `useRecalculateRoundResults` ~line 76).

- [ ] **Step 5: Run the test, verify it passes**

Run: `pnpm jest src/__tests__/hooks/rounds/useUpdateRoundRules.test.tsx`
Expected: PASS.

- [ ] **Step 6: Type-check and commit**

```bash
pnpm type-check
git add src/hooks/rounds/mutations.ts src/hooks/rounds/index.ts \
  src/__tests__/hooks/rounds/useUpdateRoundRules.test.tsx
git commit -m "feat(points): useUpdateRoundRules mutation with re-finalize"
```

---

### Task 4: `EditRoundPointsSheet` (team/pair points + void) and wire into the section

**Files:**
- Create: `src/components/competitions/detail/sections/sheets/EditRoundPointsSheet.tsx`
- Modify: `src/components/competitions/detail/sections/PointsConfigSection.tsx` (own the sheet + feature gate)

**Interfaces:**
- Consumes: `useUpdateRoundRules` (Task 3), `useFeatureAccess` (`@/hooks/subscription`) — returns `{ checkAccess, isSuperAdmin, tier }` where `checkAccess(featureId)` yields a `FeatureAccess` with an `allowed: boolean` — and `ROUND_TEMPLATES`.
- Produces: `EditRoundPointsSheet` with props
  `{ visible: boolean; onDismiss: () => void; round: Round; competitionId: string }`.

The sheet detects whether the round uses `pair_points` (label "per match") or `team_points` (label "to winning team"). It renders three numeric fields (Win / Tie / Loss), a **"Void points (side bet)"** toggle that sets all three to 0, and a **"Reset to standard"** action that restores `ROUND_TEMPLATES[round.rules_override.template_id].override`'s points block. (Bonus UI is added in Task 8.) Save calls `useUpdateRoundRules` with the round's existing `rules_override` spread plus the edited points block, preserving all other fields. Match the modal/presentation and styling of `EditCompetitionRulesSheet.tsx` (numeric inputs, save button, `SystemModalTheme` if that file uses it).

- [ ] **Step 1: Build the sheet**

```tsx
// src/components/competitions/detail/sections/sheets/EditRoundPointsSheet.tsx
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, Icon } from 'react-native-paper';
import { Modal } from '@/components/ui';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { Round } from '@/types/database.types';
import type {
  RoundRulesOverride,
  WinTieLossPoints,
} from '@/types/database/roundRules.types';
import { ROUND_TEMPLATES } from '@/constants/roundTemplates';
import { useUpdateRoundRules } from '@/hooks/rounds';

export interface EditRoundPointsSheetProps {
  visible: boolean;
  onDismiss: () => void;
  round: Round;
  competitionId: string;
}

type PointsKey = 'pair_points' | 'team_points';

function clampNum(raw: string): number {
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 2) / 2; // allow halves (0.5)
}

export function EditRoundPointsSheet({
  visible,
  onDismiss,
  round,
  competitionId,
}: EditRoundPointsSheetProps) {
  const colors = useThemeColors();
  const { mutate, isPending } = useUpdateRoundRules();

  const override = (round.rules_override ?? {}) as RoundRulesOverride;
  const pointsKey: PointsKey = override.pair_points ? 'pair_points' : 'team_points';
  const current: WinTieLossPoints =
    override[pointsKey] ?? { win: pointsKey === 'pair_points' ? 1 : 2, tie: pointsKey === 'pair_points' ? 0.5 : 1, loss: 0 };

  const [win, setWin] = useState(String(current.win));
  const [tie, setTie] = useState(String(current.tie));
  const [loss, setLoss] = useState(String(current.loss));

  const winLabel = pointsKey === 'pair_points' ? 'Win (per match)' : 'Win (to team)';

  const templatePoints = useMemo(() => {
    const t = override.template_id ? ROUND_TEMPLATES[override.template_id] : undefined;
    return t?.override[pointsKey];
  }, [override.template_id, pointsKey]);

  const setVoid = () => {
    setWin('0');
    setTie('0');
    setLoss('0');
  };

  const resetStandard = () => {
    if (!templatePoints) return;
    setWin(String(templatePoints.win));
    setTie(String(templatePoints.tie));
    setLoss(String(templatePoints.loss));
  };

  const handleSave = () => {
    const points: WinTieLossPoints = {
      win: clampNum(win),
      tie: clampNum(tie),
      loss: clampNum(loss),
    };
    const next: RoundRulesOverride = { ...override, [pointsKey]: points };
    mutate(
      { roundId: round.id, competitionId, rulesOverride: next },
      { onSuccess: onDismiss }
    );
  };

  const field = (label: string, value: string, onChange: (s: string) => void) => (
    <View style={styles.field}>
      <Text style={[typography.small, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        mode="outlined"
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChange}
        style={styles.input}
        dense
      />
    </View>
  );

  return (
    <Modal visible={visible} onClose={onDismiss} title="Edit round points">
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.fields}>
          {field(winLabel, win, setWin)}
          {field('Tie', tie, setTie)}
          {field('Loss', loss, setLoss)}
        </View>

        <TouchableOpacity
          onPress={setVoid}
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Void points for this round"
        >
          <Icon source="cancel" size={18} color={colors.textSecondary} />
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            Void points (side bet)
          </Text>
        </TouchableOpacity>

        {templatePoints && (
          <TouchableOpacity onPress={resetStandard} style={styles.linkBtn} accessibilityRole="button">
            <Text style={[typography.small, { color: colors.primary }]}>Reset to standard</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isPending ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Save round points"
        >
          <Text style={[typography.body, { color: colors.onPrimary, fontWeight: '600' }]}>
            {isPending ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fields: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  field: { flex: 1 },
  input: { marginTop: spacing.xs },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  linkBtn: { paddingVertical: spacing.sm, marginBottom: spacing.md },
  saveBtn: {
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
});
```

> If `@/components/ui` `Modal` does not match the existing sheet pattern used by `EditCompetitionRulesSheet.tsx`, mirror that file's wrapper instead (it already handles `SystemModalTheme`/presentation). Keep the field/save body identical.

- [ ] **Step 2: Own the sheet + gate editing in `PointsConfigSection`**

In `PointsConfigSection.tsx`: import `useState`, `EditRoundPointsSheet`, and `useFeatureAccess` (`@/hooks/subscription`). Compute the gate:

```tsx
const { checkAccess, isSuperAdmin } = useFeatureAccess();
const canEdit =
  isOrganizer && (isSuperAdmin || checkAccess('advanced_round_rules').allowed);
```

Track `const [editRoundId, setEditRoundId] = useState<string | null>(null)`. Pass `onEditRound={canEdit ? setEditRoundId : undefined}` to the rows, and render the sheet:

```tsx
{editRoundId && (
  <EditRoundPointsSheet
    visible={!!editRoundId}
    onDismiss={() => setEditRoundId(null)}
    round={rounds.find((r) => r.id === editRoundId)!}
    competitionId={competition.id}
  />
)}
```

Read the feature flag via `useFeatureAccess()` — inspect that hook's return shape and use the boolean for `advanced_round_rules` (e.g. `featureAccess.hasFeature('advanced_round_rules')` or the equivalent it exposes). Since `DetailsTab` already passes `isOrganizer`, no `DetailsTab` change is needed beyond Task 2.

- [ ] **Step 3: Verify**

Run: `pnpm type-check`
Manual (super admin on the prod-shaped comp):
1. Details → Points & Rules → tap **Round 1** → toggle **Void points** → Save. Row now shows "Dinner bet · 0 points", total drops by 2.
2. Tap **Round 4** → set Win = 2 → Save. Row shows "2 pts per match (×4)", total rises to reflect 8.
3. Leaderboard reflects re-finalized points (if rounds have results).

- [ ] **Step 4: Commit**

```bash
git add src/components/competitions/detail/sections/sheets/EditRoundPointsSheet.tsx \
  src/components/competitions/detail/sections/PointsConfigSection.tsx
git commit -m "feat(points): edit per-round points (win/tie/loss, void) from detail screen"
```

---

## Phase 3 — Bonus point for combined holes-up margin (solves R2)

### Task 5: Verify `MarginBonusConfig` / `bonus_points` type (folded into Task 1)

> **NOTE:** The canonical `MarginBonusConfig` interface and `RoundRulesOverride.bonus_points?: MarginBonusConfig` field were pulled forward into **Task 1** (the formatter reads `bonus_points`, so the type had to exist first). This task is now a verification no-op — do NOT re-add the type.

**Files:**
- Verify only: `src/types/database/roundRules.types.ts`

**Interfaces:**
- Confirms present: `interface MarginBonusConfig { enabled: boolean; metric: 'combined_match_margin'; points: number; tie: 'split' | 'void' | 'carry' }` and `RoundRulesOverride.bonus_points?: MarginBonusConfig`.

- [ ] **Step 1: Verify the canonical type exists**

```bash
grep -n "MarginBonusConfig" src/types/database/roundRules.types.ts
```
Expected: the `MarginBonusConfig` interface (strict literal `metric`/`tie`) and a `bonus_points?: MarginBonusConfig` field on `RoundRulesOverride`. If a looser `BonusPointsConfig` is present instead, it was an interim shape — it must already have been replaced by `MarginBonusConfig` during the Task 1 fix. No commit needed for this task.

---

### Task 6: Pure `decideMarginBonus` helper

**Files:**
- Create: `src/services/rounds/marginBonus.ts`
- Test: `src/__tests__/services/rounds/marginBonus.test.ts`

**Interfaces:**
- Produces: `function decideMarginBonus(marginByTeam: Map<string, number>, bonus: { points: number; tie: 'split' | 'void' | 'carry' }): Map<string, number>` — returns teamId → bonus awarded (only entries that receive >0). Highest net margin wins `points`; exact tie among leaders → `split` divides equally, `void`/`carry` award nothing.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/services/rounds/marginBonus.test.ts
import { decideMarginBonus } from '@/services/rounds/marginBonus';

describe('decideMarginBonus', () => {
  const bonus = { points: 1, tie: 'split' as const };

  it('awards the full bonus to the higher net margin', () => {
    const m = new Map([['a', 2], ['b', -2]]);
    const out = decideMarginBonus(m, bonus);
    expect(out.get('a')).toBe(1);
    expect(out.get('b') ?? 0).toBe(0);
  });

  it('splits on an exact tie when tie=split', () => {
    const m = new Map([['a', 0], ['b', 0]]);
    const out = decideMarginBonus(m, bonus);
    expect(out.get('a')).toBe(0.5);
    expect(out.get('b')).toBe(0.5);
  });

  it('awards nothing on a tie when tie=void', () => {
    const m = new Map([['a', 1], ['b', 1]]);
    const out = decideMarginBonus(m, { points: 1, tie: 'void' });
    expect(out.size).toBe(0);
  });

  it('awards nothing on a tie when tie=carry', () => {
    const m = new Map([['a', 3], ['b', 3]]);
    const out = decideMarginBonus(m, { points: 1, tie: 'carry' });
    expect(out.size).toBe(0);
  });

  it('returns empty for an empty margin map', () => {
    expect(decideMarginBonus(new Map(), bonus).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm jest src/__tests__/services/rounds/marginBonus.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/services/rounds/marginBonus.ts
/**
 * Pure decision for the combined-match-margin bonus point. Given each team's
 * net holes-up margin for a round (signed sum of sub-match final_differential),
 * award the bonus to the team with the highest margin. Exact ties resolve per
 * the configured `tie` rule.
 */
export function decideMarginBonus(
  marginByTeam: Map<string, number>,
  bonus: { points: number; tie: 'split' | 'void' | 'carry' }
): Map<string, number> {
  const awards = new Map<string, number>();
  if (marginByTeam.size === 0 || bonus.points === 0) return awards;

  let max = -Infinity;
  for (const margin of marginByTeam.values()) {
    if (margin > max) max = margin;
  }
  const leaders = [...marginByTeam.entries()]
    .filter(([, margin]) => margin === max)
    .map(([teamId]) => teamId);

  if (leaders.length === 1) {
    awards.set(leaders[0], bonus.points);
    return awards;
  }

  // Tie among leaders.
  if (bonus.tie === 'split') {
    const share = bonus.points / leaders.length;
    for (const teamId of leaders) awards.set(teamId, share);
  }
  // 'void' and 'carry' → award nothing automatically.
  return awards;
}
```

- [ ] **Step 4: Run, verify it passes**

Run: `pnpm jest src/__tests__/services/rounds/marginBonus.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/rounds/marginBonus.ts src/__tests__/services/rounds/marginBonus.test.ts
git commit -m "feat(points): pure decideMarginBonus helper"
```

---

### Task 7: Wire the bonus into `finalizePairResults`

**Files:**
- Modify: `src/services/rounds/finalizePairResults.ts`
- Test: `src/__tests__/services/rounds/finalizePairResults.test.ts` (add cases)

**Interfaces:**
- Consumes: `decideMarginBonus` (Task 6), `SubMatch.final_differential`, `RoundRulesOverride.bonus_points` (Task 5).
- Produces: unchanged signature; team `round_results` rows now include bonus in `competitionPoints` (pair points stay in `rawScore`) and a `bonus_points` / `margin` breakdown in `rawResultData`. Ranking uses pair points + bonus.

**Logic:** accumulate `marginByTeam` from each decided sub-match's signed `final_differential` (sideA `+`, sideB `-`); after the loop, if `bonus_points.enabled`, compute awards and fold into totals.

- [ ] **Step 1: Add bonus test cases**

Append inside the top-level `describe('finalizePairResults', …)` block in `src/__tests__/services/rounds/finalizePairResults.test.ts`:

```typescript
  describe('combined-match-margin bonus', () => {
    const BONUS_OVERRIDE: RoundRulesOverride = {
      pair_points: { win: 1, tie: 0.5, loss: 0 },
      bonus_points: { enabled: true, metric: 'combined_match_margin', points: 1, tie: 'split' },
    };

    it('adds the bonus to the team with the higher net holes-up margin', async () => {
      // SM0: A wins by 3 (diff +3). SM1: B wins by 1 (diff -1). Net A=+2 → A gets bonus.
      const subMatches: SubMatch[] = [
        subMatch({ sort_order: 0, result: 'a-wins', final_differential: 3 }),
        subMatch({ sort_order: 1, result: 'b-wins', final_differential: -1 }),
      ];

      await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: BONUS_OVERRIDE,
        subMatches,
      });

      const rows = saveSpy.mock.calls[0][1];
      const byTeam = Object.fromEntries(
        rows.map((r: { teamId: string; rawScore: number; competitionPoints: number }) => [r.teamId, r])
      );
      // pair points: A=1 (one win), B=1 (one win). Bonus +1 to A.
      expect(byTeam['team-a'].rawScore).toBe(1);
      expect(byTeam['team-a'].competitionPoints).toBe(2); // 1 + 1 bonus
      expect(byTeam['team-b'].competitionPoints).toBe(1); // 1 + 0 bonus
      expect(byTeam['team-a'].position).toBe(1);
    });

    it('splits the bonus 0.5/0.5 on an exact net-margin tie', async () => {
      const subMatches: SubMatch[] = [
        subMatch({ sort_order: 0, result: 'a-wins', final_differential: 2 }),
        subMatch({ sort_order: 1, result: 'b-wins', final_differential: -2 }),
      ];

      await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: BONUS_OVERRIDE,
        subMatches,
      });

      const rows = saveSpy.mock.calls[0][1];
      const byTeam = Object.fromEntries(
        rows.map((r: { teamId: string; competitionPoints: number }) => [r.teamId, r.competitionPoints])
      );
      expect(byTeam['team-a']).toBe(1.5); // 1 pair + 0.5 bonus
      expect(byTeam['team-b']).toBe(1.5);
    });

    it('does not award a bonus when bonus_points is absent', async () => {
      const subMatches: SubMatch[] = [
        subMatch({ sort_order: 0, result: 'a-wins', final_differential: 5 }),
      ];
      await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: { pair_points: { win: 1, tie: 0.5, loss: 0 } },
        subMatches,
      });
      const rows = saveSpy.mock.calls[0][1];
      const a = rows.find((r: { teamId: string }) => r.teamId === 'team-a');
      expect(a.competitionPoints).toBe(1); // no bonus
    });
  });
```

- [ ] **Step 2: Run, verify the new cases fail**

Run: `pnpm jest src/__tests__/services/rounds/finalizePairResults.test.ts -t "combined-match-margin"`
Expected: FAIL — bonus not yet applied (`competitionPoints` equals pair points only).

- [ ] **Step 3: Implement the bonus in `finalizePairResults.ts`**

Add the import (after the other `./` imports, ~line 48):

```typescript
import { decideMarginBonus } from './marginBonus';
```

Inside the sub-match loop, add a margin accumulator. Just before the loop (next to `const teamPoints = new Map…`, ~line 295) add:

```typescript
  // Per-team net holes-up margin for the optional combined-match-margin bonus.
  const bonusCfg = rulesOverride?.bonus_points;
  const marginByTeam = new Map<string, number>();
  const addMargin = (teamId: string, delta: number) => {
    marginByTeam.set(teamId, (marginByTeam.get(teamId) ?? 0) + delta);
  };
```

Inside the loop, in the decided block (after `decidedCount += 1;`, ~line 336), add:

```typescript
    if (bonusCfg?.enabled && typeof sm.final_differential === 'number') {
      // final_differential is signed: positive = side A ahead.
      addMargin(sideIds.sideATeamId, sm.final_differential);
      addMargin(sideIds.sideBTeamId, -sm.final_differential);
    }
```

Then replace the ranking + row-building block (currently lines 349-374, from `if (decidedCount === 0 …` through `await saveRoundResults(roundId, rows);`) with:

```typescript
  if (decidedCount === 0 || teamPoints.size === 0) return 0;

  // Bonus awards (combined match margin), if configured.
  const bonusByTeam =
    bonusCfg?.enabled
      ? decideMarginBonus(marginByTeam, { points: bonusCfg.points, tie: bonusCfg.tie })
      : new Map<string, number>();

  // Total = pair points + bonus. Rank by total (higher better); pair points
  // remain the rawScore, total is the competition_points contribution.
  const ranked = [...teamPoints.entries()]
    .map(([teamId, pairPts]) => ({
      teamId,
      pairPts,
      bonus: bonusByTeam.get(teamId) ?? 0,
      total: pairPts + (bonusByTeam.get(teamId) ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  let position = 0;
  let prevTotal: number | null = null;
  const rows = ranked.map((entry, index) => {
    if (prevTotal === null || entry.total < prevTotal) {
      position = index + 1;
      prevTotal = entry.total;
    }
    return {
      roundId,
      teamId: entry.teamId,
      rawScore: entry.pairPts,
      rawResultData: {
        team_score: entry.pairPts,
        ...(entry.bonus ? { bonus_points: entry.bonus } : {}),
        ...(bonusCfg?.enabled ? { net_margin: marginByTeam.get(entry.teamId) ?? 0 } : {}),
      },
      position,
      competitionPoints: entry.total,
      isTeamResult: true,
    };
  });

  await saveRoundResults(roundId, rows);
```

- [ ] **Step 4: Run the full file, verify all pass**

Run: `pnpm jest src/__tests__/services/rounds/finalizePairResults.test.ts`
Expected: PASS — existing cases (which use `competitionPoints` implicitly via `rawScore`) still pass because with no bonus, `total === pairPts`; new bonus cases pass.

- [ ] **Step 5: Type-check and commit**

```bash
pnpm type-check
git add src/services/rounds/finalizePairResults.ts src/__tests__/services/rounds/finalizePairResults.test.ts
git commit -m "feat(points): award combined-match-margin bonus in pair finalization"
```

---

### Task 8: Bonus UI in `EditRoundPointsSheet`

**Files:**
- Modify: `src/components/competitions/detail/sections/sheets/EditRoundPointsSheet.tsx`

**Interfaces:** no new exports; extends the existing sheet.

Show the bonus controls only when `pointsKey === 'pair_points'` and `round.round_format === 'split'` (foursomes/singles): a toggle "Bonus point for combined holes-up margin", a points field (default 1), defaulting `tie` to `'split'`. Persist into the saved override.

- [ ] **Step 1: Add bonus state + controls**

In `EditRoundPointsSheet.tsx`, add after the loss state:

```tsx
  const showBonus = pointsKey === 'pair_points' && round.round_format === 'split';
  const [bonusEnabled, setBonusEnabled] = useState(!!override.bonus_points?.enabled);
  const [bonusPts, setBonusPts] = useState(String(override.bonus_points?.points ?? 1));
```

Render before the Save button (only when `showBonus`):

```tsx
        {showBonus && (
          <View style={styles.bonusBlock}>
            <TouchableOpacity
              onPress={() => setBonusEnabled((v) => !v)}
              style={styles.bonusToggle}
              accessibilityRole="switch"
              accessibilityState={{ checked: bonusEnabled }}
              accessibilityLabel="Bonus point for combined holes-up margin"
            >
              <Icon
                source={bonusEnabled ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={bonusEnabled ? colors.primary : colors.textMuted}
              />
              <Text style={[typography.small, { color: colors.textPrimary, flex: 1 }]}>
                Bonus point for combined holes-up margin
              </Text>
            </TouchableOpacity>
            {bonusEnabled && field('Bonus points', bonusPts, setBonusPts)}
          </View>
        )}
```

Add styles:

```tsx
  bonusBlock: { marginBottom: spacing.md },
  bonusToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
```

- [ ] **Step 2: Persist the bonus on save**

In `handleSave`, build the bonus field and include it in `next`:

```tsx
    const next: RoundRulesOverride = { ...override, [pointsKey]: points };
    if (showBonus) {
      next.bonus_points = bonusEnabled
        ? {
            enabled: true,
            metric: 'combined_match_margin',
            points: clampNum(bonusPts),
            tie: override.bonus_points?.tie ?? 'split',
          }
        : { ...(override.bonus_points ?? { metric: 'combined_match_margin', points: 1, tie: 'split' }), enabled: false };
    }
```

- [ ] **Step 3: Verify**

Run: `pnpm type-check`
Manual: edit **Round 2** → enable the bonus, points = 1 → Save. The Points & Rules row now shows "1 pt per match (×2) · +1 bonus (combined margin)" and the competition total reads 13 / first to 7. If R2 sub-matches have match-play `final_differential` values, the leaderboard shows the bonus folded into the leading team's points.

- [ ] **Step 4: Commit**

```bash
git add src/components/competitions/detail/sections/sheets/EditRoundPointsSheet.tsx
git commit -m "feat(points): configure combined-match-margin bonus from the edit sheet"
```

---

## Final verification

- [ ] Run the full affected test set:
  `pnpm jest src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts src/__tests__/services/rounds/marginBonus.test.ts src/__tests__/services/rounds/finalizePairResults.test.ts src/__tests__/hooks/rounds/useUpdateRoundRules.test.tsx`
  Expected: all PASS.
- [ ] `pnpm type-check` — clean.
- [ ] `pnpm lint` — no new errors in changed files.
- [ ] Manual end-to-end on the prod-shaped competition (as super admin): void R1, double R4, enable R2 bonus → total reads **13 points · first to 7**; leaderboard re-finalizes correctly.
- [ ] Use `superpowers:finishing-a-development-branch` to decide merge/PR.

## Open dependency to flag to the user (carried from the spec)

The R2 bonus reads `sub_matches.final_differential` (signed holes-up at close). That value is only populated when foursomes sub-matches are scored as **hole-by-hole match play** (the team match-play scoring path). If R2 is instead scored as stroke/alt-shot best-ball with no persisted differential, each such sub-match contributes 0 to the margin and the bonus may not award as intended. Confirm with the user how R2 will actually be scored on the day; if it must work from stroke-based alt-shot, a follow-up task is needed to compute a hole-by-hole holes-up margin for alt-shot (a new pure helper extending `resolveAltShotSubMatchOutcome` to also return a signed differential).
