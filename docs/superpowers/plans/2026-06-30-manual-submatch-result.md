# Organiser Manual Sub-Match Result Entry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an organiser manually enter a per-sub-match result (winner + margin, e.g. "6 & 5 to Team A") that drives competition points and completes the round, and fix force-submit so combined rounds finalize by counting fully-scored cards.

**Architecture:** Reuse the existing `sub_matches` result model and the `useUpdateSubMatchResult` cascade (re-finalize → complete round). Add one nullable column for the "holes remaining" half of a margin, a shared `formatMatchMargin` helper, an organiser entry sheet, a display path on the sub-match leaderboard, and a counting fix in `forceFinalizeRound`.

**Tech Stack:** React Native, TypeScript, Supabase JS, TanStack Query, Jest + @testing-library/react-native, react-native-paper.

## Global Constraints

- Sub-match `result` values are `'a-wins' | 'b-wins' | 'halved' | 'forfeit-a' | 'forfeit-b'`; `status` is `'upcoming' | 'in-progress' | 'completed' | 'forfeited'`. Terminal scorecard statuses are `'completed'`/`'confirmed'`.
- `final_differential` stores the UNSIGNED holes-up margin; sign is derived from `result`. The new `final_holes_remaining` stores holes-to-play (0–17), NULL when not applicable.
- Margin string format MUST match the existing engine: `` `${holesUp}&${holesRemaining}` `` (dormie), `` `${holesUp}UP` `` (holesRemaining 0), `'A/S'` (halved).
- Manual result entry is **optional override**: a sub-match left unset still derives from scorecards. Reuse `useUpdateSubMatchResult` — do NOT add new points/finalize logic.
- Theming: colors via `useThemeColors()`; static tokens from `@/constants/theme`. Do NOT use Paper's `Button` — use `TouchableOpacity`. Modal content wrapped per existing dialog patterns.
- Supabase typed-client workaround: `(supabase.from(...) as any)` with eslint-disable, matching existing services.
- Before each commit: run the task's jest file(s); confirm `pnpm type-check` has no NEW errors in touched files (repo has pre-existing unrelated type-check noise — check your files specifically).

## Migration deployment note

Task 1 adds a column. In this project migrations are NOT auto-deployed — it must be applied to staging + prod manually before the feature ships, or manual margins won't persist. Flag this at hand-off.

---

## File Structure

- `supabase/migrations/<ts>_sub_match_final_holes_remaining.sql` (new) — the column.
- `src/utils/matchMargin.ts` (new) — `formatMatchMargin`.
- `src/services/scoring/engines/MatchPlayEngine.ts` (modify) — use the helper.
- `src/services/subMatches/index.ts` (modify) — input + persist `final_holes_remaining`.
- `src/hooks/rounds/subMatches.ts` (modify) — type pass-through (no logic change).
- `src/components/rounds/SubMatchResultSheet.tsx` (new) — organiser entry UI.
- `src/screens/rounds/ViewRoundScreen/tabs/SubMatchesTab.tsx` (modify) — "Set result" entry point.
- `src/components/leaderboard/SubMatchLeaderboardTab.tsx` (modify) — display persisted margin for terminal sub-matches.
- `src/services/rounds/forceFinalizeRound.ts` (modify) — promote full cards, relax guard.
- `src/components/rounds/ForceSubmitRoundDialog.tsx` (modify) — full-card definition of "incomplete".

Tasks 1–6 deliver the manual-result feature (the priority). Tasks 7–8 are the folded-in counting fix and are independently deliverable.

---

### Task 1: Migration — `sub_matches.final_holes_remaining`

**Files:**
- Create: `supabase/migrations/20260630000000_sub_match_final_holes_remaining.sql`

**Interfaces:**
- Produces: new nullable column `sub_matches.final_holes_remaining SMALLINT`.

- [ ] **Step 1: Write the migration**

```sql
-- Holes-to-play half of a match-play margin (the "5" in "6 & 5") for organiser
-- manual sub-match results. NULL = went the distance ("X UP"), halved, or not a
-- manually-entered match result. Stored so the margin survives re-finalization.
ALTER TABLE sub_matches
  ADD COLUMN final_holes_remaining SMALLINT
  CHECK (final_holes_remaining IS NULL OR final_holes_remaining BETWEEN 0 AND 17);

COMMENT ON COLUMN sub_matches.final_holes_remaining IS
  'Holes-to-play half of a match-play margin (the "5" in "6 & 5"); set for organiser manual results.';
```

- [ ] **Step 2: Verify the SQL parses locally (no DB apply required here)**

Run: `grep -c "final_holes_remaining" supabase/migrations/20260630000000_sub_match_final_holes_remaining.sql`
Expected: `2`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260630000000_sub_match_final_holes_remaining.sql
git commit -m "feat(db): add sub_matches.final_holes_remaining for manual match margins"
```

---

### Task 2: `formatMatchMargin` helper + refactor engine

**Files:**
- Create: `src/utils/matchMargin.ts`
- Modify: `src/services/scoring/engines/MatchPlayEngine.ts` (margin block ~lines 233–256)
- Test: `src/__tests__/utils/matchMargin.test.ts`

**Interfaces:**
- Produces: `formatMatchMargin(holesUp: number, holesRemaining: number, halved: boolean): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/utils/matchMargin.test.ts
import { formatMatchMargin } from '@/utils/matchMargin';

describe('formatMatchMargin', () => {
  it('formats a dormie win as "X&Y"', () => {
    expect(formatMatchMargin(6, 5, false)).toBe('6&5');
    expect(formatMatchMargin(3, 2, false)).toBe('3&2');
  });
  it('formats a win that went the distance as "XUP"', () => {
    expect(formatMatchMargin(1, 0, false)).toBe('1UP');
    expect(formatMatchMargin(4, 0, false)).toBe('4UP');
  });
  it('formats a halved match as "A/S"', () => {
    expect(formatMatchMargin(0, 0, true)).toBe('A/S');
    expect(formatMatchMargin(5, 3, true)).toBe('A/S');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/utils/matchMargin.test.ts`
Expected: FAIL — cannot find module `@/utils/matchMargin`.

- [ ] **Step 3: Write the helper**

```ts
// src/utils/matchMargin.ts
/**
 * Format a match-play margin the same way the live engine does:
 *   - halved        -> "A/S"
 *   - dormie win     -> "6&5"  (holesUp & holesRemaining)
 *   - went distance  -> "6UP"  (holesRemaining === 0)
 * `holesUp` is the unsigned margin (winner's holes up).
 */
export function formatMatchMargin(
  holesUp: number,
  holesRemaining: number,
  halved: boolean
): string {
  if (halved) return 'A/S';
  return holesRemaining > 0 ? `${holesUp}&${holesRemaining}` : `${holesUp}UP`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/__tests__/utils/matchMargin.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Refactor the engine to use the helper (behaviour-preserving)**

In `src/services/scoring/engines/MatchPlayEngine.ts`, add the import at the top with the other imports:

```ts
import { formatMatchMargin } from '@/utils/matchMargin';
```

Replace the margin-building block (the `if (netUp > 0) { ... } else if (netUp < 0) { ... } else if (holesPlayed === 18) { ... }` section, ~lines 240–256) with:

```ts
    if (netUp > 0) {
      result = 'player1';
      margin = formatMatchMargin(netUp, holesRemaining, false);
    } else if (netUp < 0) {
      result = 'player2';
      margin = formatMatchMargin(Math.abs(netUp), holesRemaining, false);
    } else if (holesPlayed === 18) {
      result = 'halved';
      margin = formatMatchMargin(0, 0, true);
    } else {
      result = 'incomplete';
    }
```

(The `const netUp` / `const holesRemaining` lines above this block stay unchanged. `formatMatchMargin` reproduces the exact prior strings: `${netUp}&${holesRemaining}`, `${netUp}UP`, `A/S`.)

- [ ] **Step 6: Verify engine tests still pass**

Run: `pnpm jest src/__tests__ -t "MatchPlay" 2>&1 | tail -5` (and any `MatchPlayEngine` suite)
Expected: existing match-play tests still PASS (no behaviour change). Also `pnpm type-check` clean for the engine file.

- [ ] **Step 7: Commit**

```bash
git add src/utils/matchMargin.ts src/__tests__/utils/matchMargin.test.ts src/services/scoring/engines/MatchPlayEngine.ts
git commit -m "refactor(scoring): extract formatMatchMargin helper, reuse in MatchPlayEngine"
```

---

### Task 3: Persist `finalHolesRemaining` through the service + hook

**Files:**
- Modify: `src/services/subMatches/index.ts` (`UpdateSubMatchResultInput` ~lines 33–40; `updateSubMatchResult` ~lines 170–208)
- Test: `src/__tests__/services/subMatches/updateSubMatchResult.test.ts`

**Interfaces:**
- Consumes: existing `updateSubMatchResult`.
- Produces: `UpdateSubMatchResultInput` gains `finalHolesRemaining?: number | null`; persisted to column `final_holes_remaining`.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/services/subMatches/updateSubMatchResult.test.ts
import { updateSubMatchResult } from '@/services/subMatches';
import { supabase } from '@/services/supabase/client';

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn() } }));

function mockUpdateChain(returnedRow: Record<string, unknown>) {
  const single = jest.fn().mockResolvedValue({ data: returnedRow, error: null });
  const select = jest.fn().mockReturnValue({ single });
  const eq = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq });
  return { from: jest.fn().mockReturnValue({ update }), _update: update };
}

describe('updateSubMatchResult — finalHolesRemaining', () => {
  afterEach(() => jest.restoreAllMocks());

  it('persists final_holes_remaining when provided', async () => {
    const chain = mockUpdateChain({
      id: 'sm-1', round_id: 'r1', sort_order: 0,
      team_a_player_ids: ['a'], team_b_player_ids: ['b'],
      status: 'completed', result: 'a-wins', final_differential: 6,
      final_holes_remaining: 5, team_a_net_total: null, team_b_net_total: null,
      tee_time: null, pairing_id: null,
    });
    (supabase.from as jest.Mock).mockImplementation(chain.from);

    await updateSubMatchResult({
      subMatchId: 'sm-1', status: 'completed', result: 'a-wins',
      finalDifferential: 6, finalHolesRemaining: 5,
    });

    expect(chain._update).toHaveBeenCalledWith(
      expect.objectContaining({ final_differential: 6, final_holes_remaining: 5 })
    );
  });

  it('omits final_holes_remaining from the patch when undefined', async () => {
    const chain = mockUpdateChain({
      id: 'sm-1', round_id: 'r1', sort_order: 0,
      team_a_player_ids: ['a'], team_b_player_ids: ['b'],
      status: 'forfeited', result: 'forfeit-a', final_differential: null,
      final_holes_remaining: null, team_a_net_total: null, team_b_net_total: null,
      tee_time: null, pairing_id: null,
    });
    (supabase.from as jest.Mock).mockImplementation(chain.from);

    await updateSubMatchResult({ subMatchId: 'sm-1', status: 'forfeited', result: 'forfeit-a' });

    expect(chain._update.mock.calls[0][0]).not.toHaveProperty('final_holes_remaining');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/services/subMatches/updateSubMatchResult.test.ts`
Expected: FAIL — `final_holes_remaining` not in the patch.

- [ ] **Step 3: Implement**

In `src/services/subMatches/index.ts`, extend the interface (~lines 33–40):

```ts
export interface UpdateSubMatchResultInput {
  subMatchId: string;
  status: SubMatchStatus;
  result?: SubMatchResult | null;
  finalDifferential?: number | null;
  finalHolesRemaining?: number | null;
  teamANetTotal?: number | null;
  teamBNetTotal?: number | null;
}
```

In `updateSubMatchResult`, add to the destructure and the patch (alongside the existing `finalDifferential` handling):

```ts
  const {
    subMatchId,
    status,
    result,
    finalDifferential,
    finalHolesRemaining,
    teamANetTotal,
    teamBNetTotal,
  } = input;
```

```ts
  if (finalDifferential !== undefined) patch.final_differential = finalDifferential;
  if (finalHolesRemaining !== undefined) patch.final_holes_remaining = finalHolesRemaining;
```

If the `SubMatch` domain type / `rowToSubMatch` maps columns explicitly, add `finalHolesRemaining` ← `final_holes_remaining` there too (mirror the existing `finalDifferential` mapping); if it spreads the row, no change needed. Keep `pnpm type-check` clean.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/__tests__/services/subMatches/updateSubMatchResult.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/subMatches/index.ts src/__tests__/services/subMatches/updateSubMatchResult.test.ts
git commit -m "feat(subMatches): persist finalHolesRemaining on manual result"
```

---

### Task 4: `SubMatchResultSheet` component

**Files:**
- Create: `src/components/rounds/SubMatchResultSheet.tsx`
- Test: `src/__tests__/components/SubMatchResultSheet.test.tsx`

**Interfaces:**
- Consumes: `formatMatchMargin` (Task 2).
- Produces:
  - `interface SubMatchResultSheetProps { visible: boolean; teamALabel: string; teamBLabel: string; loading?: boolean; onSubmit: (r: ManualSubMatchResult) => void; onCancel: () => void }`
  - `interface ManualSubMatchResult { result: 'a-wins' | 'b-wins' | 'halved'; finalDifferential: number | null; finalHolesRemaining: number | null }`
  - exported pure helper `buildManualResult(winner: 'a'|'b'|'halved', holesUp: number, holesRemaining: number): ManualSubMatchResult`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/SubMatchResultSheet.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SubMatchResultSheet, { buildManualResult } from '@/components/rounds/SubMatchResultSheet';

describe('buildManualResult', () => {
  it('maps an A win with margin', () => {
    expect(buildManualResult('a', 6, 5)).toEqual({
      result: 'a-wins', finalDifferential: 6, finalHolesRemaining: 5,
    });
  });
  it('maps a halved result with no margin', () => {
    expect(buildManualResult('halved', 6, 5)).toEqual({
      result: 'halved', finalDifferential: null, finalHolesRemaining: null,
    });
  });
  it('treats 0 holes remaining as a went-the-distance win (null remaining)', () => {
    expect(buildManualResult('b', 2, 0)).toEqual({
      result: 'b-wins', finalDifferential: 2, finalHolesRemaining: null,
    });
  });
});

describe('SubMatchResultSheet', () => {
  it('submits the selected winner + margin', () => {
    const onSubmit = jest.fn();
    const { getByText, getByLabelText } = render(
      <SubMatchResultSheet
        visible teamALabel="Team A" teamBLabel="Team B"
        onSubmit={onSubmit} onCancel={jest.fn()}
      />
    );
    fireEvent.press(getByLabelText('Winner Team A'));
    // default margin starts at 1 & 0; bump holes up to 6 and remaining to 5
    fireEvent.press(getByText('Save result'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'a-wins' })
    );
  });

  it('hides the margin inputs and submits null margin when Halved is chosen', () => {
    const onSubmit = jest.fn();
    const { getByText, getByLabelText, queryByLabelText } = render(
      <SubMatchResultSheet visible teamALabel="A" teamBLabel="B" onSubmit={onSubmit} onCancel={jest.fn()} />
    );
    fireEvent.press(getByLabelText('Winner Halved'));
    expect(queryByLabelText('Holes up')).toBeNull();
    fireEvent.press(getByText('Save result'));
    expect(onSubmit).toHaveBeenCalledWith({
      result: 'halved', finalDifferential: null, finalHolesRemaining: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/components/SubMatchResultSheet.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```tsx
// src/components/rounds/SubMatchResultSheet.tsx
/**
 * SubMatchResultSheet
 *
 * Organiser-only entry for a manual sub-match result: pick the winner (Team A /
 * Halved / Team B) and, for a winner, the margin as holes-up & holes-to-play
 * (e.g. "6 & 5"). Calls onSubmit with values ready for useUpdateSubMatchResult.
 */
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common/GolfBallLoader';
import { useThemeColors } from '@/context/ThemeContext';
import { formatMatchMargin } from '@/utils/matchMargin';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export interface ManualSubMatchResult {
  result: 'a-wins' | 'b-wins' | 'halved';
  finalDifferential: number | null;
  finalHolesRemaining: number | null;
}

/** Pure mapper from the form's winner + margin to the persisted result shape. */
export function buildManualResult(
  winner: 'a' | 'b' | 'halved',
  holesUp: number,
  holesRemaining: number
): ManualSubMatchResult {
  if (winner === 'halved') {
    return { result: 'halved', finalDifferential: null, finalHolesRemaining: null };
  }
  return {
    result: winner === 'a' ? 'a-wins' : 'b-wins',
    finalDifferential: holesUp,
    finalHolesRemaining: holesRemaining > 0 ? holesRemaining : null,
  };
}

export interface SubMatchResultSheetProps {
  visible: boolean;
  teamALabel: string;
  teamBLabel: string;
  loading?: boolean;
  onSubmit: (result: ManualSubMatchResult) => void;
  onCancel: () => void;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export default function SubMatchResultSheet({
  visible,
  teamALabel,
  teamBLabel,
  loading = false,
  onSubmit,
  onCancel,
}: SubMatchResultSheetProps) {
  const colors = useThemeColors();
  const [winner, setWinner] = useState<'a' | 'b' | 'halved'>('a');
  const [holesUp, setHolesUp] = useState(1);
  const [holesRemaining, setHolesRemaining] = useState(0);

  const preview = useMemo(() => {
    if (winner === 'halved') return 'Halved (A/S)';
    const side = winner === 'a' ? teamALabel : teamBLabel;
    return `${side} — ${formatMatchMargin(holesUp, holesRemaining, false)}`;
  }, [winner, holesUp, holesRemaining, teamALabel, teamBLabel]);

  const options: { key: 'a' | 'halved' | 'b'; label: string }[] = [
    { key: 'a', label: teamALabel },
    { key: 'halved', label: 'Halved' },
    { key: 'b', label: teamBLabel },
  ];

  const Stepper = ({ label, value, set, min, max }: {
    label: string; value: number; set: (n: number) => void; min: number; max: number;
  }) => (
    <View style={styles.stepperRow}>
      <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[styles.stepBtn, { borderColor: colors.border }]}
          onPress={() => set(clamp(value - 1, min, max))}
          accessibilityRole="button" accessibilityLabel={`Decrease ${label}`}
        >
          <Icon source="minus" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{value}</Text>
        <TouchableOpacity
          style={[styles.stepBtn, { borderColor: colors.border }]}
          onPress={() => set(clamp(value + 1, min, max))}
          accessibilityRole="button" accessibilityLabel={`Increase ${label}`}
        >
          <Icon source="plus" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.surfaceElevated }, shadows.lg]}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Set match result</Text>

              <View style={styles.winnerRow}>
                {options.map((o) => {
                  const active = winner === o.key;
                  return (
                    <TouchableOpacity
                      key={o.key}
                      style={[
                        styles.winnerBtn,
                        { borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primaryLighter : 'transparent' },
                      ]}
                      onPress={() => setWinner(o.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`Winner ${o.label}`}
                    >
                      <Text style={[styles.winnerText, { color: active ? colors.primary : colors.textPrimary }]} numberOfLines={1}>
                        {o.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {winner !== 'halved' && (
                <>
                  <Stepper label="Holes up" value={holesUp} set={setHolesUp} min={1} max={17} />
                  <Stepper label="Holes to play" value={holesRemaining} set={setHolesRemaining} min={0} max={17} />
                </>
              )}

              <Text style={[styles.preview, { color: colors.textSecondary }]}>{preview}</Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.surfaceVariant, borderWidth: 1, borderColor: colors.borderStrong }]}
                  onPress={onCancel} disabled={loading}
                  accessibilityRole="button" accessibilityLabel="Cancel"
                >
                  <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
                  onPress={() => onSubmit(buildManualResult(winner, holesUp, holesRemaining))}
                  disabled={loading}
                  accessibilityRole="button" accessibilityLabel="Save result"
                >
                  {loading ? <GolfBallLoader size="sm" /> : (
                    <Text style={[styles.buttonText, { color: colors.textOnColored }]}>Save result</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  container: { width: '100%', maxWidth: 380, borderRadius: borderRadius.xl, padding: spacing.xl },
  title: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  winnerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  winnerBtn: { flex: 1, height: 44, borderRadius: borderRadius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  winnerText: { ...typography.smallBold },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  stepperLabel: { ...typography.body },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: { width: 40, height: 40, borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { ...typography.bodyBold, minWidth: 24, textAlign: 'center' },
  preview: { ...typography.body, textAlign: 'center', marginVertical: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  button: { flex: 1, height: 48, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { ...typography.bodyBold },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/__tests__/components/SubMatchResultSheet.test.tsx`
Expected: PASS (5 tests). If the first component test asserts a specific differential, adjust to assert only `result` (the test above does) — keep assertions on real behaviour.

- [ ] **Step 5: Commit**

```bash
git add src/components/rounds/SubMatchResultSheet.tsx src/__tests__/components/SubMatchResultSheet.test.tsx
git commit -m "feat(rounds): SubMatchResultSheet for organiser manual match result"
```

---

### Task 5: Wire "Set result" into the sub-match organiser tab

**Files:**
- Modify: `src/screens/rounds/ViewRoundScreen/tabs/SubMatchesTab.tsx` (next to the existing forfeit buttons + handler)
- Test: none new (logic covered by Tasks 3/4; this is wiring). Verify with `pnpm type-check`.

**Interfaces:**
- Consumes: `SubMatchResultSheet` + `ManualSubMatchResult` (Task 4); `useUpdateSubMatchResult` (already used in this file for forfeits).

This file already renders, for each `subMatch`, organiser-only forfeit buttons (look for `onForfeit(subMatch, 'a')` / `Forfeit ${teamALabel}` and the `handleForfeit` handler that calls `updateSubMatchResult`/`useUpdateSubMatchResult`). Add a "Set result" affordance beside them and a sheet.

- [ ] **Step 1: Read the forfeit region to anchor the edit**

Run: `grep -n "onForfeit\|handleForfeit\|useUpdateSubMatchResult\|teamALabel\|teamBLabel\|Forfeit" src/screens/rounds/ViewRoundScreen/tabs/SubMatchesTab.tsx | head -30`
Note the names in scope: the per-row `subMatch`, `teamALabel`/`teamBLabel`, the `useUpdateSubMatchResult` mutation, and `isOrganizer`.

- [ ] **Step 2: Add imports + sheet state + handler**

Add import:

```tsx
import SubMatchResultSheet, { type ManualSubMatchResult } from '@/components/rounds/SubMatchResultSheet';
```

Add component state near the other `useState`s (replace `<SubMatchType>` with the row type already used in this file, e.g. `SubMatch`):

```tsx
  const [resultSheetFor, setResultSheetFor] = useState<{ id: string; aLabel: string; bLabel: string } | null>(null);
```

Reuse the existing `useUpdateSubMatchResult(roundId)` mutation already in this file (the one the forfeit flow calls; capture its `mutate`/`isPending` if not already). Add the confirm handler:

```tsx
  const handleManualResult = useCallback(
    (r: ManualSubMatchResult) => {
      if (!resultSheetFor) return;
      updateSubMatchResult(
        {
          subMatchId: resultSheetFor.id,
          status: 'completed',
          result: r.result,
          finalDifferential: r.finalDifferential,
          finalHolesRemaining: r.finalHolesRemaining,
        },
        { onSettled: () => setResultSheetFor(null) }
      );
    },
    [resultSheetFor, updateSubMatchResult]
  );
```

(Use the exact mutate function name bound from `useUpdateSubMatchResult` in this file — if it's destructured as `{ mutate: updateSubMatchResult, isPending }`, match that. If the file calls the service directly without a hook, switch the forfeit + this handler to the hook so both share the cascade.)

- [ ] **Step 3: Add the "Set result" button beside the forfeit buttons**

In the organiser-only block that renders the forfeit buttons (gated by `isOrganizer && subMatch.status !== 'completed' && subMatch.status !== 'forfeited'`), add a third button in the same row:

```tsx
      <TouchableOpacity
        style={[styles.forfeitButton, { borderColor: colors.border }]}
        onPress={() => setResultSheetFor({ id: subMatch.id, aLabel: teamALabel, bLabel: teamBLabel })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Set match result"
      >
        <Icon source="flag-checkered" size={14} color={colors.textSecondary} />
        <Text style={[styles.forfeitText, { color: colors.textSecondary }]}>Set result</Text>
      </TouchableOpacity>
```

(Reuse the existing `styles.forfeitButton` / `styles.forfeitText`. If the forfeit block is currently gated on team sizes > 1, gate the "Set result" button only on `isOrganizer && status not terminal` so it appears for singles match-play sub-matches too.)

- [ ] **Step 4: Mount the sheet once (outside the per-row map, e.g. near the tab's root return)**

```tsx
      <SubMatchResultSheet
        visible={!!resultSheetFor}
        teamALabel={resultSheetFor?.aLabel ?? 'Team A'}
        teamBLabel={resultSheetFor?.bLabel ?? 'Team B'}
        onSubmit={handleManualResult}
        onCancel={() => setResultSheetFor(null)}
      />
```

- [ ] **Step 5: Verify types + the existing sub-match tab test**

Run: `pnpm type-check` (no new errors in `SubMatchesTab.tsx`)
Run: `pnpm jest src/screens/rounds/ViewRoundScreen/tabs/SubMatchesTab.test.tsx 2>&1 | tail -5`
Expected: existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/screens/rounds/ViewRoundScreen/tabs/SubMatchesTab.tsx
git commit -m "feat(rounds): organiser Set result action on sub-matches (manual margin)"
```

---

### Task 6: Display the persisted manual margin on the sub-match leaderboard

**Files:**
- Modify: `src/components/leaderboard/SubMatchLeaderboardTab.tsx` (match-play branch ~lines 179–196)
- Test: `src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx` (or extend the existing `SubMatchLeaderboardTab.test.tsx`)

**Interfaces:**
- Consumes: `formatMatchMargin` (Task 2); the sub-match row fields `status`, `result`, `final_differential`, `final_holes_remaining`.

The match-play branch currently always computes the row data live via `computeMatchPlaySubMatch(row.sides, holes, getStrokes)`. For a sub-match with a **persisted terminal result** (manual or scored match), prefer the persisted result so a manually-entered "6 & 5" shows even with no/partial scores.

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx
import { persistedMatchData } from '@/components/leaderboard/SubMatchLeaderboardTab';

describe('persistedMatchData', () => {
  it('returns a/A-side win with formatted margin from persisted fields', () => {
    expect(persistedMatchData({
      status: 'completed', result: 'a-wins', final_differential: 6, final_holes_remaining: 5,
    })).toEqual({ holesUpDown: '6&5', leaderSide: 'a', hasScores: true });
  });
  it('returns halved A/S', () => {
    expect(persistedMatchData({
      status: 'completed', result: 'halved', final_differential: null, final_holes_remaining: null,
    })).toEqual({ holesUpDown: 'A/S', leaderSide: null, hasScores: true });
  });
  it('formats a went-the-distance win as XUP', () => {
    expect(persistedMatchData({
      status: 'completed', result: 'b-wins', final_differential: 2, final_holes_remaining: null,
    })).toEqual({ holesUpDown: '2UP', leaderSide: 'b', hasScores: true });
  });
  it('returns null when the sub-match has no persisted decisive result', () => {
    expect(persistedMatchData({
      status: 'in-progress', result: null, final_differential: null, final_holes_remaining: null,
    })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx`
Expected: FAIL — `persistedMatchData` not exported.

- [ ] **Step 3: Implement the helper + use it**

In `src/components/leaderboard/SubMatchLeaderboardTab.tsx`, add the import:

```tsx
import { formatMatchMargin } from '@/utils/matchMargin';
```

Add an exported pure helper near the top of the file (after imports):

```tsx
/** Match-row display data derived from a sub-match's PERSISTED result (manual or
 *  scored). Returns null when there is no decisive persisted result to show, so
 *  the caller falls back to live score computation. Forfeits are handled
 *  separately via `forfeitWinner`. */
export function persistedMatchData(sm: {
  status: string;
  result: string | null;
  final_differential: number | null;
  final_holes_remaining: number | null;
}): { holesUpDown: string; leaderSide: 'a' | 'b' | null; hasScores: boolean } | null {
  if (sm.status !== 'completed') return null;
  if (sm.result === 'halved') {
    return { holesUpDown: formatMatchMargin(0, 0, true), leaderSide: null, hasScores: true };
  }
  if (sm.result === 'a-wins' || sm.result === 'b-wins') {
    const up = sm.final_differential ?? 0;
    const rem = sm.final_holes_remaining ?? 0;
    return {
      holesUpDown: formatMatchMargin(up, rem, false),
      leaderSide: sm.result === 'a-wins' ? 'a' : 'b',
      hasScores: true,
    };
  }
  return null;
}
```

The match-play branch builds `data` from the live computation; the row needs access to the raw sub-match. The `rows` memo maps `subMatches`; thread the raw fields through. In the `rows` mapping (where each row object is built), add the persisted fields:

```tsx
        return {
          key: sm.id,
          index,
          sides,
          leftColor, rightColor, leftLabel, rightLabel,
          leftName: sides.a.map((p) => p.name).join(' & ') || 'TBD',
          rightName: sides.b.map((p) => p.name).join(' & ') || 'TBD',
          forfeitWinner,
          persisted: persistedMatchData(sm), // <-- new
        };
```

(The synthesized `combined` row has no sub-match → set `persisted: null`.)

Then in the match-play branch of the `content` memo, prefer the persisted data:

```tsx
      if (model === 'match-play') {
        const data = row.persisted ?? computeMatchPlaySubMatch(row.sides, holes, getStrokes);
        pushLeader(data);
        return (
          <MatchPlayMatchRow
            key={row.key}
            leftName={row.leftName}
            rightName={row.rightName}
            leftColor={row.leftColor}
            rightColor={row.rightColor}
            data={data}
            highlightLeft={!!currentUserId && row.sides.a.some((p) => p.id === currentUserId)}
            highlightRight={!!currentUserId && row.sides.b.some((p) => p.id === currentUserId)}
            forfeitWinner={row.forfeitWinner}
            testID={`submatch-row-${row.index}`}
          />
        );
      }
```

Add `persisted` to the row type if the file uses an explicit type for the mapped rows (otherwise inferred). Keep `pnpm type-check` clean. The `SubMatch` row type must expose `final_holes_remaining` — if the domain type maps columns explicitly, ensure Task 3 added it; if `useSubMatches` returns rows including the column, it flows through.

- [ ] **Step 4: Run test + existing leaderboard test**

Run: `pnpm jest src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx src/components/leaderboard/SubMatchLeaderboardTab.test.tsx`
Expected: new helper tests PASS; existing tests still PASS (live computation still used when no persisted result).

- [ ] **Step 5: Commit**

```bash
git add src/components/leaderboard/SubMatchLeaderboardTab.tsx src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx
git commit -m "feat(leaderboard): show persisted manual margin for completed sub-matches"
```

---

### Task 7: `forceFinalizeRound` counting fix (promote full cards)

**Files:**
- Modify: `src/services/rounds/forceFinalizeRound.ts`
- Test: `src/__tests__/services/rounds/forceFinalizeRound.test.ts` (extend)

**Interfaces:**
- Consumes: `getHoleCount` from `@/constants/scoring`; `refinalizeRoundResults`.
- Produces: `forceFinalizeRound` no longer throws when 0 cards are formally terminal but ≥1 card has every hole scored; it promotes full `in-progress`/`not-started` cards to `completed` (with recomputed totals) before re-finalizing. `NoCompletedScorecardsError` is removed.

Promotion needs each card's `scores`, `daily_handicap_used`, and the round's `nine_type` + `game_type` + holes to recompute totals. Reuse the existing totals computation used by the mismatch-resolution path (`recomputeScorecardTotals` in `src/services/scoreMismatch/resolution.ts`); if it is not exported, export it (add `export`) — it is a pure function and safe to share.

- [ ] **Step 1: Write the failing test**

```ts
// add to src/__tests__/services/rounds/forceFinalizeRound.test.ts
// (keep existing mockScorecards / mockRoundsUpdate helpers; add a full-card scenario)

it('promotes a full-scorecard in-progress card and finalizes even with 0 formally-completed cards', async () => {
  // round is 18 holes; one card has 18 holes scored but status in-progress
  const fullScores: Record<string, unknown> = {};
  for (let h = 1; h <= 18; h++) fullScores[String(h)] = { strokes: 4 };

  const promoted: { id: string; status: string }[] = [];
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'rounds') {
      // first call: round meta (nine_type/game_type/holes); later: status update
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({
          data: { nine_type: 'full', game_type: 'stableford' }, error: null }) }) }),
        update: (patch: { status: string }) => ({ eq: () => ({ select: () =>
          Promise.resolve({ data: [{ id: 'r1', status: patch.status }], error: null }) }) }),
      };
    }
    if (table === 'scorecards') {
      return {
        select: () => ({ eq: () => Promise.resolve({ data: [
          { id: 'sc1', player_id: 'p1', status: 'in-progress', scores: fullScores, daily_handicap_used: 0 },
          { id: 'sc2', player_id: 'p2', status: 'in-progress', scores: { '1': { strokes: 4 } }, daily_handicap_used: 0 },
        ], error: null }) }),
        update: (patch: { status: string }) => ({ eq: () => {
          promoted.push({ id: 'matched', status: patch.status });
          return Promise.resolve({ data: null, error: null });
        } }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  const refSpy = jest.spyOn(refinalize, 'refinalizeRoundResults').mockResolvedValue(undefined);

  await forceFinalizeRound('r1');

  // sc1 (18 holes) promoted to completed; sc2 (1 hole) NOT promoted
  expect(promoted.some((p) => p.status === 'completed')).toBe(true);
  expect(refSpy).toHaveBeenCalledWith('r1');
});
```

> Note: this test exercises the control flow (promote-then-finalize). If the exact supabase chain shape differs from the helpers, adapt the mock to the real call order; the assertion that matters is "a full in-progress card is updated to completed and refinalize runs with 0 pre-existing terminal cards".

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/services/rounds/forceFinalizeRound.test.ts`
Expected: FAIL — current code throws `NoCompletedScorecardsError` with 0 terminal cards.

- [ ] **Step 3: Implement**

Rewrite `src/services/rounds/forceFinalizeRound.ts`:

```ts
/**
 * forceFinalizeRound
 *
 * Organiser override: marks a competition round `completed` even when players'
 * scorecards were never formally submitted. Any card with a score on EVERY hole
 * is promoted to `completed` (with recomputed totals) so it counts; cards
 * missing holes are left non-terminal and surface as DNF. The round is then
 * marked completed and results re-finalized. Allowed even when no card is full
 * (round closes, everyone DNF).
 */
import { supabase } from '@/services/supabase/client';
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import { getHoleCount } from '@/constants/scoring';
import { recomputeScorecardTotals } from '@/services/scoreMismatch/resolution';
import { getRoundHoles } from '@/services/courses/getRoundHoles';
import { submitLogger } from '@/utils/debugLogger';

const TERMINAL = new Set(['completed', 'confirmed']);

export async function forceFinalizeRound(roundId: string): Promise<void> {
  // Round meta: hole count + game type for promotion scoring.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
  const { data: roundMeta } = await (supabase as any)
    .from('rounds')
    .select('nine_type, game_type')
    .eq('id', roundId)
    .single();
  const holeCount = getHoleCount(roundMeta?.nine_type ?? 'full');
  const gameType: string | null = roundMeta?.game_type ?? null;

  // All scorecards for the round.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
  const { data: cardRows } = await (supabase as any)
    .from('scorecards')
    .select('id, player_id, status, scores, daily_handicap_used')
    .eq('round_id', roundId);
  const cards: {
    id: string; player_id: string | null; status: string;
    scores: Record<string, unknown> | null; daily_handicap_used: number | null;
  }[] = cardRows ?? [];

  const holes = await getRoundHoles(roundId);

  // Promote any non-terminal card that has a score on every hole.
  for (const card of cards) {
    if (TERMINAL.has(card.status)) continue;
    const scored = Object.keys(card.scores ?? {}).length;
    if (scored < holeCount) continue; // partial → leave as DNF

    const totals = recomputeScorecardTotals(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared pure util
      (card.scores ?? {}) as any,
      holes,
      gameType,
      card.daily_handicap_used,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
    const { error: promoteErr } = await (supabase as any)
      .from('scorecards')
      .update({
        status: 'completed',
        total_gross: totals.totalGross,
        total_net: totals.totalNet,
        total_points: totals.totalPoints,
      })
      .eq('id', card.id);
    if (promoteErr) {
      submitLogger.error('forceFinalizeRound: promote card failed (non-fatal)', promoteErr, {
        scorecardId: card.id.substring(0, 8) + '...',
      });
    }
  }

  // Mark the round completed (bypass the all-terminal gate).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
  const { data: updatedRows, error } = await (supabase as any)
    .from('rounds')
    .update({ status: 'completed' })
    .eq('id', roundId)
    .select('id, status');
  if (error) {
    submitLogger.error('forceFinalizeRound: failed to update status', error, {
      roundId: roundId.substring(0, 8) + '...',
    });
    throw error;
  }
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error(
      `Force-submit affected 0 rows for round ${roundId.substring(0, 8)}. Possible RLS policy issue.`
    );
  }

  await refinalizeRoundResults(roundId);
}
```

Export `recomputeScorecardTotals` from `src/services/scoreMismatch/resolution.ts` if it is not already exported (change `function recomputeScorecardTotals` → `export function recomputeScorecardTotals`). Remove `NoCompletedScorecardsError` from this file.

- [ ] **Step 4: Update the existing 0-terminal test**

The existing test `throws NoCompletedScorecardsError when no terminal scorecards exist` no longer applies (that behaviour is intentionally removed). Replace it with a case asserting that a round with only partial cards still finalizes (round status → completed, refinalize called, no card promoted). Keep the "flips status to completed" test (it still passes once the mock returns round meta + holes).

- [ ] **Step 5: Run tests + fix `NoCompletedScorecardsError` importers**

Run: `grep -rn "NoCompletedScorecardsError" src` — update every importer (e.g. `RoundSettingsScreen.tsx`, `RoundsTab.tsx`) to drop the now-removed import and its error-message branch (the generic `error.message` branch already covers any failure).
Run: `pnpm jest src/__tests__/services/rounds/forceFinalizeRound.test.ts`
Expected: PASS. `pnpm type-check` clean for touched files.

- [ ] **Step 6: Commit**

```bash
git add src/services/rounds/forceFinalizeRound.ts src/services/scoreMismatch/resolution.ts src/__tests__/services/rounds/forceFinalizeRound.test.ts src/screens/rounds/RoundSettingsScreen.tsx src/components/competitions/detail/RoundsTab.tsx
git commit -m "fix(rounds): force-submit promotes fully-scored cards, no longer requires formal submission"
```

---

### Task 8: `ForceSubmitRoundDialog` — full-card definition of DNF

**Files:**
- Modify: `src/components/rounds/ForceSubmitRoundDialog.tsx`
- Test: `src/__tests__/components/ForceSubmitRoundDialog.test.tsx` (extend)

**Interfaces:**
- Consumes: `getHoleCount` from `@/constants/scoring`; `useRoundDetails` for `nine_type`.
- Produces: `getIncompletePlayers(scorecards, holeCount)` — a player is incomplete (DNF) when their card has fewer than `holeCount` holes scored (not merely "not formally submitted"). The zero-completed disable is removed (submit always allowed; a card-less or all-partial round just closes with everyone DNF).

- [ ] **Step 1: Update the test**

```tsx
// replace the getIncompletePlayers describe in src/__tests__/components/ForceSubmitRoundDialog.test.tsx
import { getIncompletePlayers } from '@/components/rounds/ForceSubmitRoundDialog';

describe('getIncompletePlayers', () => {
  const full = (n: number) => {
    const s: Record<string, unknown> = {};
    for (let h = 1; h <= n; h++) s[String(h)] = {};
    return s;
  };
  it('flags only players whose card is missing holes', () => {
    const scorecards = [
      { player_id: 'p1', status: 'in-progress', scores: full(18), player: { name: 'Full' } },
      { player_id: 'p2', status: 'in-progress', scores: full(3), player: { name: 'Partial' } },
    ];
    expect(getIncompletePlayers(scorecards as never, 18)).toEqual([
      { playerId: 'p2', playerName: 'Partial', holesPlayed: 3 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/components/ForceSubmitRoundDialog.test.tsx`
Expected: FAIL — `getIncompletePlayers` has the old single-arg signature / counts the full card as incomplete.

- [ ] **Step 3: Implement**

In `src/components/rounds/ForceSubmitRoundDialog.tsx`:

Add imports:

```tsx
import { getHoleCount } from '@/constants/scoring';
import { useRoundDetails } from '@/hooks/useRoundDetails';
```

Change the helper to take the hole count and define incomplete by holes scored:

```tsx
/**
 * Players who will be DNF: their card has fewer than `holeCount` holes scored.
 * A full card counts (it will be promoted to completed on submit). Deduped by
 * player_id, in scorecard order. Exported for testing.
 */
export function getIncompletePlayers(
  scorecards: ScorecardRow[],
  holeCount: number
): IncompletePlayer[] {
  const seen = new Set<string>();
  const out: IncompletePlayer[] = [];
  for (const sc of scorecards) {
    const holesPlayed = Object.keys(sc.scores ?? {}).length;
    if (holesPlayed >= holeCount) continue; // full card → counts, not DNF
    if (sc.player_id) {
      if (seen.has(sc.player_id)) continue;
      seen.add(sc.player_id);
    }
    out.push({
      playerId: sc.player_id ?? '',
      playerName: sc.player?.name ?? 'Unknown player',
      holesPlayed,
    });
  }
  return out;
}
```

In the component, fetch the hole count and drop the zero-completed block:

```tsx
  const { data: scorecards } = useRoundScorecards(roundId);
  const { data: round } = useRoundDetails(roundId);
  const holeCount = getHoleCount(round?.nine_type ?? 'full');

  const incomplete = useMemo(
    () => getIncompletePlayers((scorecards ?? []) as unknown as ScorecardRow[], holeCount),
    [scorecards, holeCount]
  );
```

Remove `completedCount`, `noCompleted`, the `hint` line, and the `noCompleted` parts of the Submit button's `disabled`/`style` (Submit is disabled only while `loading`). Keep the rest of the dialog.

- [ ] **Step 4: Run tests**

Run: `pnpm jest src/__tests__/components/ForceSubmitRoundDialog.test.tsx`
Expected: PASS. Adjust the component-interaction tests' mocks if they relied on `noCompleted` (the disabled-when-zero test is removed). `pnpm type-check` clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/rounds/ForceSubmitRoundDialog.tsx src/__tests__/components/ForceSubmitRoundDialog.test.tsx
git commit -m "fix(rounds): force-submit DNF = card missing holes, not unsubmitted"
```

---

## Final verification

- [ ] Run the feature test set:
  `pnpm jest src/__tests__/utils/matchMargin.test.ts src/__tests__/services/subMatches/updateSubMatchResult.test.ts src/__tests__/components/SubMatchResultSheet.test.tsx src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx src/__tests__/services/rounds/forceFinalizeRound.test.ts src/__tests__/components/ForceSubmitRoundDialog.test.tsx`
  Expected: all PASS.
- [ ] `pnpm type-check` — clean for all touched files.
- [ ] Confirm existing suites that touch changed files still pass: `MatchPlayEngine`, `SubMatchLeaderboardTab.test.tsx`, `SubMatchesTab.test.tsx`, `useUpdateSubMatchResult.test.tsx`.
- [ ] **Deploy the migration** (`20260630000000_sub_match_final_holes_remaining.sql`) to staging + prod before shipping JS.
- [ ] Manual smoke (device): on a split match-play round, organiser taps "Set result" on a sub-match, enters Team A 6 & 5 → leaderboard shows "6&5", competition points update, round completes when all sub-matches set; on a combined stableford round with full-but-unsubmitted cards, force-submit finalizes and counts those players, DNFs the partial ones.

## Deviations from the spec (flag for review)

- The spec described a dedicated **split-round force-submit checklist**. This plan instead delivers the manual result **per sub-match** (in the sub-match organiser tab) and relies on the existing auto-complete (round completes when all sub-matches terminal). This is simpler and achieves the same outcome; the split exclusion on the `ForceSubmitRoundDialog` path is left in place (split rounds finalize via sub-match results, not the dialog). Confirm this is acceptable, or add a checklist task.
- Per-player manual final-score entry for combined individual rounds remains out of scope (combined rounds finalize via the Task 7/8 counting fix).
