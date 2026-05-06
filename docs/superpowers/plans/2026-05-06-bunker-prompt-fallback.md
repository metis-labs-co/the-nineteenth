# Heuristic Bunker-Prompt Fallback Implementation Plan (V2 Phase B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a Premium-tier player logs a GPS-tracked shot on a hole with zero cached bunker polygons AND the shot pattern looks bunker-shaped, prompt them once: "Was that a bunker shot?" Yes flips `from_bunker = true` on the shot row.

**Architecture:** Three independent client-side units — eligibility hook (`useShouldPromptBunker`), zustand store extension (third toast variant + per-(round,hole) cooldown set), UPDATE mutation (`useSetShotBunker`) — wired into `LogShotInline` via a `useEffect` that watches the latest two shots in cache. No schema changes; reuses V1's `from_bunker` column and existing RLS UPDATE policy.

**Tech Stack:** TypeScript, React Native, TanStack Query, Zustand, Jest, `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-05-06-bunker-prompt-fallback-design.md`

---

## File Inventory

### New files

| Path | Responsibility |
|---|---|
| `src/hooks/shots/useSetShotBunker.ts` | TanStack mutation: `UPDATE shot_log SET from_bunker = true WHERE id = $1` + invalidates shot + sand-save query keys |
| `src/hooks/shots/useShouldPromptBunker.ts` | Pure-ish hook returning a boolean — combines latest shot, prior shot, course/hole context, hazard cache, green_center coord, and the cooldown set into the eligibility check |
| `src/__tests__/hooks/shots/useSetShotBunker.test.tsx` | Mocks supabase client; asserts UPDATE call shape + cache invalidations |
| `src/__tests__/hooks/shots/useShouldPromptBunker.test.tsx` | Table-driven tests covering every rule from spec §6 + the all-true case |
| `src/__tests__/components/scorecard/ShotLogging/InlineShotToast.test.tsx` | Render tests for the bunker-prompt variant (Yes/No taps fire the right actions) |

### Modified files

| Path | Change |
|---|---|
| `src/store/shotLoggingUiStore.ts` | Add `'bunkerPrompt'` variant + cooldown Set + `showBunkerPrompt`/`dismissBunkerPrompt`/`clearBunkerCooldownForRound` actions |
| `src/__tests__/store/shotLogging.test.ts` | Append tests for the new actions + cooldown semantics |
| `src/components/scorecard/ShotLogging/InlineShotToast.tsx` | Add bunker-prompt branch in `message` const + Yes/No buttons when variant matches |
| `src/components/scorecard/ShotLogging/LogShotUndoToast.tsx` | Same shape change as InlineShotToast |
| `src/components/scorecard/ShotLogging/LogShotInline.tsx` | `useEffect` watches latest 2 shots; on new shot id, evaluate eligibility and dispatch `showBunkerPrompt` instead of (or after) `showToast` |
| `src/hooks/shots/index.ts` | Export `useSetShotBunker` and `useShouldPromptBunker` |

---

## Task 1: Store extension — `'bunkerPrompt'` variant + cooldown

**Files:**
- Modify: `src/store/shotLoggingUiStore.ts`
- Modify: `src/__tests__/store/shotLogging.test.ts`

- [ ] **Step 1: Append failing tests**

In `src/__tests__/store/shotLogging.test.ts`, add the following tests inside the existing `describe('shotLoggingUiStore', …)` block (after the V1 bunker-toast tests, before the closing brace):

```typescript
  it('showBunkerPrompt sets variant to bunkerPrompt with shot context', () => {
    useShotLoggingUiStore.getState().showBunkerPrompt({
      shotId: 'shot-x',
      sequence: 4,
      roundId: 'r1',
      holeNumber: 7,
    });
    const state = useShotLoggingUiStore.getState();
    expect(state.variant).toBe('bunkerPrompt');
    expect(state.lastShotId).toBe('shot-x');
    expect(state.lastSequence).toBe(4);
    expect(state.lastShotContext).toEqual({ roundId: 'r1', holeNumber: 7 });
    expect(state.dismissAt).not.toBeNull();
  });

  it('dismissBunkerPrompt({ confirmed: false }) adds (round,hole) to cooldown', () => {
    useShotLoggingUiStore.getState().showBunkerPrompt({
      shotId: 'shot-x',
      sequence: 1,
      roundId: 'r1',
      holeNumber: 7,
    });
    useShotLoggingUiStore.getState().dismissBunkerPrompt({ confirmed: false });
    const state = useShotLoggingUiStore.getState();
    expect(state.bunkerPromptCooldown.has('r1:7')).toBe(true);
    expect(state.variant).toBe('success'); // reset to default
    expect(state.dismissAt).toBeNull();
  });

  it('dismissBunkerPrompt({ confirmed: true }) does NOT add to cooldown and morphs to success', () => {
    useShotLoggingUiStore.getState().showBunkerPrompt({
      shotId: 'shot-x',
      sequence: 1,
      roundId: 'r1',
      holeNumber: 7,
    });
    useShotLoggingUiStore.getState().dismissBunkerPrompt({ confirmed: true });
    const state = useShotLoggingUiStore.getState();
    expect(state.bunkerPromptCooldown.has('r1:7')).toBe(false);
    expect(state.variant).toBe('success');
    expect(state.lastFromBunker).toBe(true);
    expect(state.dismissAt).not.toBeNull(); // morphs to success toast
  });

  it('clearBunkerCooldownForRound removes only that round entries', () => {
    useShotLoggingUiStore.setState((s) => ({
      ...s,
      bunkerPromptCooldown: new Set(['r1:5', 'r1:7', 'r2:3']),
    }));
    useShotLoggingUiStore.getState().clearBunkerCooldownForRound('r1');
    const set = useShotLoggingUiStore.getState().bunkerPromptCooldown;
    expect(set.has('r1:5')).toBe(false);
    expect(set.has('r1:7')).toBe(false);
    expect(set.has('r2:3')).toBe(true);
  });
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm jest src/__tests__/store/shotLogging.test.ts
```

Expected: 4 new tests fail (action / state field doesn't exist).

- [ ] **Step 3: Extend the store**

Replace `src/store/shotLoggingUiStore.ts` with:

```typescript
/**
 * UI-state store for the shot-logging undo toast.
 *
 * Phase C2 + V2 Phase B. Three toast variants:
 *  - 'success'      — "Shot N logged · Undo" or (if from_bunker) "Bunker shot N logged · Undo"
 *  - 'error'        — error message + Dismiss
 *  - 'bunkerPrompt' — "Was that a bunker shot? · Yes · No" (under-mapped courses only)
 *
 * Bunker-prompt cooldown: a Set keyed by `${roundId}:${holeNumber}` —
 * dismissing the prompt (No or auto-dismiss to No) adds the pair to
 * the set, suppressing further prompts on that hole for the rest of
 * the round. Tapping Yes does NOT add to the set — the engaged user
 * may have more bunker shots to come.
 */

import { create } from 'zustand';

export type ShotToastVariant = 'success' | 'error' | 'bunkerPrompt';

interface ShotLoggingUiState {
  variant: ShotToastVariant;
  lastShotId: string | null;
  lastShotContext: { roundId: string; holeNumber: number } | null;
  lastSequence: number | null;
  lastFromBunker: boolean;
  errorMessage: string | null;
  dismissAt: number | null;
  /** (roundId:holeNumber) pairs where the user dismissed the bunker prompt this round. */
  bunkerPromptCooldown: Set<string>;

  showToast: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    fromBunker?: boolean;
    durationMs?: number;
  }) => void;
  showErrorToast: (input: { message: string; durationMs?: number }) => void;
  showBunkerPrompt: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    durationMs?: number;
  }) => void;
  dismissBunkerPrompt: (input: { confirmed: boolean }) => void;
  clearBunkerCooldownForRound: (roundId: string) => void;
  clearToast: () => void;
}

const DEFAULT_DURATION_MS = 5_000;
const ERROR_DURATION_MS = 6_000;
const BUNKER_PROMPT_DURATION_MS = 8_000;

export const useShotLoggingUiStore = create<ShotLoggingUiState>((set) => ({
  variant: 'success',
  lastShotId: null,
  lastShotContext: null,
  lastSequence: null,
  lastFromBunker: false,
  errorMessage: null,
  dismissAt: null,
  bunkerPromptCooldown: new Set<string>(),

  showToast: ({ shotId, sequence, roundId, holeNumber, fromBunker, durationMs }) =>
    set({
      variant: 'success',
      lastShotId: shotId,
      lastShotContext: { roundId, holeNumber },
      lastSequence: sequence,
      lastFromBunker: fromBunker ?? false,
      errorMessage: null,
      dismissAt: Date.now() + (durationMs ?? DEFAULT_DURATION_MS),
    }),

  showErrorToast: ({ message, durationMs }) =>
    set({
      variant: 'error',
      lastShotId: null,
      lastShotContext: null,
      lastSequence: null,
      lastFromBunker: false,
      errorMessage: message,
      dismissAt: Date.now() + (durationMs ?? ERROR_DURATION_MS),
    }),

  showBunkerPrompt: ({ shotId, sequence, roundId, holeNumber, durationMs }) =>
    set({
      variant: 'bunkerPrompt',
      lastShotId: shotId,
      lastShotContext: { roundId, holeNumber },
      lastSequence: sequence,
      lastFromBunker: false,
      errorMessage: null,
      dismissAt: Date.now() + (durationMs ?? BUNKER_PROMPT_DURATION_MS),
    }),

  dismissBunkerPrompt: ({ confirmed }) =>
    set((state) => {
      if (confirmed) {
        // Morph the toast into a success "Bunker shot logged" for the
        // remainder of the dismissal window — small reinforcement that
        // the action took effect. Cooldown is NOT added.
        return {
          variant: 'success',
          lastFromBunker: true,
          // dismissAt and other fields stay
        };
      }
      // No / auto-dismiss: cooldown the (round, hole) pair and clear the toast.
      const ctx = state.lastShotContext;
      const nextCooldown = new Set(state.bunkerPromptCooldown);
      if (ctx) {
        nextCooldown.add(`${ctx.roundId}:${ctx.holeNumber}`);
      }
      return {
        variant: 'success',
        lastShotId: null,
        lastShotContext: null,
        lastSequence: null,
        lastFromBunker: false,
        errorMessage: null,
        dismissAt: null,
        bunkerPromptCooldown: nextCooldown,
      };
    }),

  clearBunkerCooldownForRound: (roundId) =>
    set((state) => {
      const prefix = `${roundId}:`;
      const next = new Set<string>();
      for (const key of state.bunkerPromptCooldown) {
        if (!key.startsWith(prefix)) next.add(key);
      }
      return { bunkerPromptCooldown: next };
    }),

  clearToast: () =>
    set({
      variant: 'success',
      lastShotId: null,
      lastShotContext: null,
      lastSequence: null,
      lastFromBunker: false,
      errorMessage: null,
      dismissAt: null,
    }),
}));
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm jest src/__tests__/store/shotLogging.test.ts
```

Expected: all tests pass (V1 bunker tests + new bunker-prompt tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/shotLoggingUiStore.ts src/__tests__/store/shotLogging.test.ts
git commit -m "$(cat <<'EOF'
feat(scoring): add bunker-prompt variant + cooldown to shot toast store

Third toast variant 'bunkerPrompt' for under-mapped courses where
auto-detect can't fire. New showBunkerPrompt / dismissBunkerPrompt
actions; cooldown Set keyed by `${roundId}:${holeNumber}`; Yes morphs
to success toast (lastFromBunker=true) with no cooldown entry; No
adds to cooldown for the rest of the round.

Spec: docs/superpowers/specs/2026-05-06-bunker-prompt-fallback-design.md §8
EOF
)"
```

---

## Task 2: Toast renderers — bunker-prompt branch

**Files:**
- Modify: `src/components/scorecard/ShotLogging/InlineShotToast.tsx`
- Modify: `src/components/scorecard/ShotLogging/LogShotUndoToast.tsx`

- [ ] **Step 1: Update `InlineShotToast.tsx`**

Read the file first to confirm current shape (V1 left a `const message = …` extracted above the return; that's the seam to extend).

Add `bunkerPromptCooldown` is NOT read here — eligibility is the upstream concern. Just render based on `variant`.

Update the imports to include `useSetShotBunker` from the new mutation file (which Task 3 creates). Since this file is committed BEFORE Task 3, you have two options:
1. **Recommended:** order the work so Task 3 lands first (mutation hook), then Task 2 (renderers consume it). Re-order if needed.
2. Stub out the mutation reference behind a comment until Task 3 lands. Don't do this — it makes the test in Step 2 below incomplete.

This plan assumes Task 3 will land before Task 2 in execution. Task 3 has no dependency on Task 2.

After Task 3 has landed:

In `src/components/scorecard/ShotLogging/InlineShotToast.tsx`:

1. Add reads for the new state fields and mutation:

```typescript
import { useSetShotBunker } from '@/hooks/shots';
// ... existing imports ...

// Inside the component:
const dismissBunkerPrompt = useShotLoggingUiStore((s) => s.dismissBunkerPrompt);
const setShotBunker = useSetShotBunker();
```

2. Update the existing `message` const to include the bunker-prompt branch:

```typescript
const isBunkerPrompt = variant === 'bunkerPrompt';
const message = isError
  ? errorMessage
  : isBunkerPrompt
    ? 'Was that a bunker shot?'
    : lastFromBunker
      ? `Bunker shot ${lastSequence} logged`
      : `Shot ${lastSequence} logged`;
```

3. Add Yes/No handlers above the return:

```typescript
const handleYes = useCallback(() => {
  if (!lastShotId) return;
  setShotBunker.mutate({ shotId: lastShotId });
  dismissBunkerPrompt({ confirmed: true });
}, [lastShotId, setShotBunker, dismissBunkerPrompt]);

const handleNo = useCallback(() => {
  dismissBunkerPrompt({ confirmed: false });
}, [dismissBunkerPrompt]);
```

4. Update the auto-dismiss `useEffect` so that it triggers `dismissBunkerPrompt({ confirmed: false })` instead of `clearToast()` when `variant === 'bunkerPrompt'`:

```typescript
useEffect(() => {
  if (!dismissAt) return;
  const remaining = dismissAt - Date.now();
  const onTimeout = isBunkerPrompt
    ? () => dismissBunkerPrompt({ confirmed: false })
    : clearToast;
  if (remaining <= 0) {
    onTimeout();
    return;
  }
  const t = setTimeout(onTimeout, remaining);
  return () => clearTimeout(t);
}, [dismissAt, clearToast, isBunkerPrompt, dismissBunkerPrompt]);
```

5. Update the visibility guard near the top of the return statement (after `if (!dismissAt) return null;`):

```typescript
if (!dismissAt) return null;
if (variant === 'success' && (!lastShotId || lastSequence === null)) return null;
if (variant === 'error' && !errorMessage) return null;
if (variant === 'bunkerPrompt' && !lastShotId) return null;
```

6. Update the action slot at the bottom to render Yes/No when `isBunkerPrompt`. The current shape is:

```tsx
{!isError && (
  <Pressable ...>
    <Text style={[styles.action, { color: textColor }]}>Undo</Text>
  </Pressable>
)}
{isError && ( /* Dismiss button */ )}
```

Replace with:

```tsx
{isBunkerPrompt ? (
  <View style={styles.promptActions}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Yes, that was a bunker shot"
      onPress={handleYes}
      testID="inline-shot-toast-bunker-yes"
      hitSlop={8}
      style={styles.promptButton}
    >
      <Text style={[styles.action, { color: textColor }]}>Yes</Text>
    </Pressable>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="No, not a bunker shot"
      onPress={handleNo}
      testID="inline-shot-toast-bunker-no"
      hitSlop={8}
      style={styles.promptButton}
    >
      <Text style={[styles.action, { color: textColor }]}>No</Text>
    </Pressable>
  </View>
) : !isError ? (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Undo shot ${lastSequence}`}
    onPress={handleUndo}
    testID="inline-shot-toast-undo"
    hitSlop={8}
  >
    <Text style={[styles.action, { color: textColor }]}>Undo</Text>
  </Pressable>
) : (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Dismiss"
    onPress={clearToast}
    testID="inline-shot-toast-dismiss"
    hitSlop={8}
  >
    <Text style={[styles.action, { color: textColor }]}>Dismiss</Text>
  </Pressable>
)}
```

Add to the StyleSheet at the bottom of the file:

```typescript
  promptActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  promptButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
```

(Both touch targets are 44dp minimum per `aesthetics.md`.)

- [ ] **Step 2: Apply the same six edits to `LogShotUndoToast.tsx`**

The file uses identical patterns. The diff is:
1. New imports
2. New state reads (`dismissBunkerPrompt`, `setShotBunker`)
3. `isBunkerPrompt` const
4. Updated `message` const
5. `handleYes`/`handleNo` callbacks
6. Updated visibility guard
7. Updated auto-dismiss effect
8. Yes/No vs Undo vs Dismiss button slot
9. Style additions

Since the two files are nearly identical, do a careful copy of the same changes. Cross-reference with `git diff` after both are done — the deltas should mirror.

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

Expected: passes. The `useSetShotBunker` import resolves because Task 3 has already landed.

- [ ] **Step 4: Run existing tests**

```bash
pnpm jest src/__tests__/store/shotLogging.test.ts
```

Expected: still passing — these tests don't render the toast, just exercise the store.

- [ ] **Step 5: Commit**

```bash
git add src/components/scorecard/ShotLogging/InlineShotToast.tsx \
        src/components/scorecard/ShotLogging/LogShotUndoToast.tsx
git commit -m "$(cat <<'EOF'
feat(scoring): render bunker-prompt variant in shot toasts

Both InlineShotToast and LogShotUndoToast now branch on
variant === 'bunkerPrompt' to render "Was that a bunker shot?" with
Yes/No buttons replacing the standard Undo button. Yes fires the
useSetShotBunker mutation and morphs the toast into a "Bunker shot
N logged" success variant. No / auto-dismiss adds the (round,hole)
pair to the per-round cooldown.

Buttons are 44dp min touch targets.
EOF
)"
```

---

## Task 3: `useSetShotBunker` mutation

**Files:**
- Create: `src/hooks/shots/useSetShotBunker.ts`
- Create: `src/__tests__/hooks/shots/useSetShotBunker.test.tsx`
- Modify: `src/hooks/shots/index.ts` (export the new hook)

> Execute this task BEFORE Task 2 — the toast renderers import this hook.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/hooks/shots/useSetShotBunker.test.tsx`:

```typescript
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSetShotBunker } from '@/hooks/shots/useSetShotBunker';

const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => mockFrom(...a) },
}));

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useSetShotBunker', () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockEq.mockReset();
    mockFrom.mockReset();
    // Builder chain: from('shot_log').update({...}).eq('id', shotId)
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it('issues UPDATE shot_log SET from_bunker=true WHERE id = shotId', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useSetShotBunker(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({ shotId: 'shot-abc' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('shot_log');
    expect(mockUpdate).toHaveBeenCalledWith({ from_bunker: true });
    expect(mockEq).toHaveBeenCalledWith('id', 'shot-abc');
  });

  it('invalidates shotLog and stats/sandSave query keys on success', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useSetShotBunker(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({ shotId: 'shot-abc' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calls = invalidateSpy.mock.calls.map((c) => JSON.stringify(c[0]));
    expect(calls.some((c) => c.includes('shotLog'))).toBe(true);
    expect(calls.some((c) => c.includes('sandSave'))).toBe(true);
  });

  it('throws on supabase error', async () => {
    mockEq.mockResolvedValue({ error: new Error('rls denied') });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useSetShotBunker(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({ shotId: 'shot-abc' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm jest src/__tests__/hooks/shots/useSetShotBunker.test.tsx
```

Expected: tests fail because the hook doesn't exist.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/shots/useSetShotBunker.ts`:

```typescript
/**
 * Mutation that flips shot_log.from_bunker to true on a single shot,
 * used by the V2 Phase B bunker-prompt fallback's "Yes" tap.
 *
 * Bypasses the shot_log_detect_bunker_before_insert trigger (which
 * fires on INSERT only) — manual user choice is authoritative.
 *
 * RLS: shot_log_update permits UPDATE on own shots in 'in-progress'
 * rounds, which matches the prompt's caller context.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { shotLogKeys } from '@/hooks/queryKeys';

// Until the supabase Database types are regenerated post-migration,
// the generated client doesn't know about `from_bunker`. Cast to
// bypass the typed `update()` signature. Drop once gen:db-types runs.
const shotLogTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from('shot_log');

interface SetShotBunkerInput {
  shotId: string;
}

export function useSetShotBunker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shotId }: SetShotBunkerInput) => {
      const { error } = await shotLogTable()
        .update({ from_bunker: true })
        .eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shotLogKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stats', 'sandSave'] });
    },
  });
}
```

- [ ] **Step 4: Add the export**

In `src/hooks/shots/index.ts`, append:

```typescript
export { useSetShotBunker } from './useSetShotBunker';
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
pnpm jest src/__tests__/hooks/shots/useSetShotBunker.test.tsx
```

Expected: 3/3 pass.

- [ ] **Step 6: Type-check**

```bash
pnpm type-check
```

Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/shots/useSetShotBunker.ts \
        src/__tests__/hooks/shots/useSetShotBunker.test.tsx \
        src/hooks/shots/index.ts
git commit -m "$(cat <<'EOF'
feat(shots): add useSetShotBunker mutation

UPDATE shot_log SET from_bunker = true WHERE id = $1. Used by the
V2 Phase B bunker-prompt fallback's 'Yes' tap to retroactively flag
a shot as having originated from a bunker.

Bypasses the V1 shot_log_detect_bunker_before_insert trigger (which
fires on INSERT only) — manual user choice is authoritative.

Invalidates shotLog and stats/sandSave query keys on success so
existing UI reflects the change immediately.
EOF
)"
```

---

## Task 4: `useShouldPromptBunker` eligibility hook

**Files:**
- Create: `src/hooks/shots/useShouldPromptBunker.ts`
- Create: `src/__tests__/hooks/shots/useShouldPromptBunker.test.tsx`
- Modify: `src/hooks/shots/index.ts` (export the new hook)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/hooks/shots/useShouldPromptBunker.test.tsx`:

```typescript
import { renderHook } from '@testing-library/react-native';
import { useShouldPromptBunker } from '@/hooks/shots/useShouldPromptBunker';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

// Mock the dependent hooks
const mockUseHoleHazards = jest.fn();
const mockUseHoleCoordinatesByHole = jest.fn();
jest.mock('@/hooks/hazards', () => ({
  useHoleHazards: (...args: unknown[]) => mockUseHoleHazards(...args),
}));
jest.mock('@/hooks/coordinates', () => ({
  useHoleCoordinatesByHole: (...args: unknown[]) => mockUseHoleCoordinatesByHole(...args),
}));

// Helper: build a ShotLogEntry with sane defaults
function shot(overrides: Partial<ShotLogEntry>): ShotLogEntry {
  return {
    id: 'shot-1',
    round_id: 'r1',
    hole_number: 7,
    player_id: 'p1',
    sequence: 1,
    latitude: -37.95,
    longitude: 144.95,
    club_used: null,
    shot_type: null,
    from_bunker: false,
    created_at: new Date('2026-05-06T10:00:00Z').toISOString(),
    updated_at: new Date('2026-05-06T10:00:00Z').toISOString(),
    ...overrides,
  };
}

const greenCenter = { latitude: -37.95, longitude: 144.95 };

beforeEach(() => {
  mockUseHoleHazards.mockReset();
  mockUseHoleCoordinatesByHole.mockReset();
  // Default: no polygons, has green_center coord
  mockUseHoleHazards.mockReturnValue({ data: [], isLoading: false });
  mockUseHoleCoordinatesByHole.mockReturnValue({
    data: { green_center: { latitude: greenCenter.latitude, longitude: greenCenter.longitude } },
    isLoading: false,
  });
  useShotLoggingUiStore.setState((s) => ({ ...s, bunkerPromptCooldown: new Set() }));
});

describe('useShouldPromptBunker', () => {
  it('returns false when shot is null', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(null, shot({}), 'course-1', 7)
    );
    expect(result.current).toBe(false);
  });

  it('returns false when priorShot is null', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(shot({}), null, 'course-1', 7)
    );
    expect(result.current).toBe(false);
  });

  it('returns false when shot.from_bunker is already true', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2, from_bunker: true }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }), // far
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when bunker polygons exist for the hole', () => {
    mockUseHoleHazards.mockReturnValue({
      data: [{ type: 'bunker', source: 'osm', externalId: null, polygon: [] }],
      isLoading: false,
    });
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2 }), // on green center
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }), // far
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when useHoleHazards is loading', () => {
    mockUseHoleHazards.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2 }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when no green_center available', () => {
    mockUseHoleCoordinatesByHole.mockReturnValue({ data: undefined, isLoading: false });
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2 }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when shot is too far from green (>= 50m)', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        // Shot at (-37.951, 144.951): ~144m from green_center (-37.95, 144.95) → too far
        shot({ id: 'shot-2', sequence: 2, latitude: -37.951, longitude: 144.951 }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when prior shot was already near green (<= 50m)', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        // Shot on green center
        shot({ id: 'shot-2', sequence: 2 }),
        // Prior shot also on/near green (approx 22m away)
        shot({ id: 'shot-1', sequence: 1, latitude: -37.9502, longitude: 144.9502 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when elapsed time > 5 minutes', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({
          id: 'shot-2',
          sequence: 2,
          created_at: new Date('2026-05-06T10:10:00Z').toISOString(), // +10 min
        }),
        shot({
          id: 'shot-1',
          sequence: 1,
          latitude: -37.96,
          longitude: 144.96,
          created_at: new Date('2026-05-06T10:00:00Z').toISOString(),
        }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when (round,hole) is in cooldown', () => {
    useShotLoggingUiStore.setState((s) => ({
      ...s,
      bunkerPromptCooldown: new Set(['r1:7']),
    }));
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2 }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns true when all conditions are met', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        // Shot on green center
        shot({ id: 'shot-2', sequence: 2 }),
        // Prior shot ~144m from green
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(true);
  });

  it('returns false when courseId is undefined', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2 }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        undefined,
        7
      )
    );
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm jest src/__tests__/hooks/shots/useShouldPromptBunker.test.tsx
```

Expected: tests fail because the hook doesn't exist.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/shots/useShouldPromptBunker.ts`:

```typescript
/**
 * Eligibility hook for the V2 Phase B bunker-prompt fallback.
 *
 * Returns true when ALL of these hold:
 *   1. shot and priorShot are both non-null
 *   2. shot.from_bunker is false (auto-detect didn't catch it)
 *   3. courseId is defined and useHoleHazards has loaded with 0 bunker polygons
 *   4. green_center coordinate is available for this hole
 *   5. shot is < 50m from green_center
 *   6. priorShot is > 50m from green_center
 *   7. elapsed time between priorShot and shot is < 5 minutes
 *   8. (roundId, holeNumber) is not in the dismissal cooldown
 *
 * Pure-ish: side-effect-free, reads from cached query hooks + zustand state.
 *
 * Spec §6: docs/superpowers/specs/2026-05-06-bunker-prompt-fallback-design.md
 */

import { useHoleHazards } from '@/hooks/hazards';
import { useHoleCoordinatesByHole } from '@/hooks/coordinates';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import { calculateDistance } from '@/utils/distance';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

const SHORT_SHOT_RADIUS_M = 50;
const PRIOR_SHOT_FAR_M = 50;
const MAX_GAP_MS = 5 * 60 * 1000; // 5 minutes

export function useShouldPromptBunker(
  shot: ShotLogEntry | null,
  priorShot: ShotLogEntry | null,
  courseId: string | undefined,
  holeNumber: number
): boolean {
  // Always call hooks (rules of hooks); pass safe defaults when courseId is undefined.
  const { data: hazards, isLoading: hazardsLoading } = useHoleHazards(
    courseId ?? '',
    courseId ? holeNumber : 0
  );
  const { data: coords } = useHoleCoordinatesByHole(
    courseId ?? '',
    courseId ? holeNumber : 0
  );
  const cooldown = useShotLoggingUiStore((s) => s.bunkerPromptCooldown);

  if (!courseId) return false;
  if (!shot || !priorShot) return false;
  if (shot.from_bunker) return false;
  if (hazardsLoading) return false;
  if ((hazards ?? []).some((h) => h.type === 'bunker')) return false;

  const greenCenter = coords?.green_center;
  if (!greenCenter) return false;

  const shotToGreen = calculateDistance(
    shot.latitude,
    shot.longitude,
    greenCenter.latitude,
    greenCenter.longitude
  );
  if (shotToGreen >= SHORT_SHOT_RADIUS_M) return false;

  const priorToGreen = calculateDistance(
    priorShot.latitude,
    priorShot.longitude,
    greenCenter.latitude,
    greenCenter.longitude
  );
  if (priorToGreen <= PRIOR_SHOT_FAR_M) return false;

  const gapMs =
    new Date(shot.created_at).getTime() -
    new Date(priorShot.created_at).getTime();
  if (gapMs > MAX_GAP_MS) return false;

  if (cooldown.has(`${shot.round_id}:${shot.hole_number}`)) return false;

  return true;
}
```

> **Note:** verify the import paths against the actual codebase. The hooks may live at slightly different paths — adjust as needed:
> - `useHoleHazards` is exported from `@/hooks/hazards` per V1 (`src/hooks/hazards/index.ts`).
> - `useHoleCoordinatesByHole` is at `src/hooks/coordinates/queries.ts:120` (re-exported via `@/hooks/coordinates`).
> - `calculateDistance` should be in `@/utils/distance` — if it's at a different path, find it via `grep -rn "export.*calculateDistance" src/utils/`.

- [ ] **Step 4: Add the export**

In `src/hooks/shots/index.ts`, append:

```typescript
export { useShouldPromptBunker } from './useShouldPromptBunker';
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
pnpm jest src/__tests__/hooks/shots/useShouldPromptBunker.test.tsx
```

Expected: 12/12 pass.

- [ ] **Step 6: Type-check**

```bash
pnpm type-check
```

Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/shots/useShouldPromptBunker.ts \
        src/__tests__/hooks/shots/useShouldPromptBunker.test.tsx \
        src/hooks/shots/index.ts
git commit -m "$(cat <<'EOF'
feat(shots): add useShouldPromptBunker eligibility hook

Pure-ish hook that returns true when a just-inserted shot looks
bunker-shaped on a hole with no cached bunker polygons:
- shot < 50m from green_center
- prior shot > 50m from green_center
- elapsed time < 5 minutes
- (round, hole) not in dismissal cooldown

12 table-driven tests cover each rule from spec §6.
EOF
)"
```

---

## Task 5: Wire-up in `LogShotInline`

**Files:**
- Modify: `src/components/scorecard/ShotLogging/LogShotInline.tsx`

- [ ] **Step 1: Read the file to understand the current shape**

`LogShotInline` already calls `useLogShot` and dispatches `showToast` from its `onSuccess`. We add a `useEffect` that watches the cache after mutation and dispatches `showBunkerPrompt` when eligible.

- [ ] **Step 2: Add imports**

At the top of `src/components/scorecard/ShotLogging/LogShotInline.tsx`, alongside the existing hook imports:

```typescript
import { useShouldPromptBunker } from '@/hooks/shots';
import { useShotLog } from '@/hooks/shots';
import { useRoundDetails } from '@/hooks/rounds/queries';
```

(`useShotLog` is at `src/hooks/shots/queries.ts:34` — re-exported from `@/hooks/shots` via the index.)

(`useRoundDetails` returns the round with course; the spec referenced `useRoundCourseId` as a possible thinner hook, but `useRoundDetails` already exists and is sufficient.)

- [ ] **Step 3: Add cache-watcher state and dispatcher**

Inside the component, after the existing hook calls (around `useShotLoggingUiStore` reads):

```typescript
const showBunkerPrompt = useShotLoggingUiStore((s) => s.showBunkerPrompt);

const { data: roundDetails } = useRoundDetails(roundId);
const courseId = roundDetails?.course_id ?? undefined;

const { data: shotsForHole } = useShotLog(roundId, holeNumber);
const { latestShot, priorShot } = useMemo(() => {
  const list = shotsForHole ?? [];
  // Filter to current player's shots only — useShotLog returns all players on the round.
  const own = player ? list.filter((s) => s.player_id === player.id) : list;
  return {
    latestShot: own.length > 0 ? own[own.length - 1] : null,
    priorShot:  own.length > 1 ? own[own.length - 2] : null,
  };
}, [shotsForHole, player]);

const promptEligible = useShouldPromptBunker(
  latestShot,
  priorShot,
  courseId,
  holeNumber
);

const lastDispatchedShotIdRef = useRef<string | null>(null);

// When a NEW shot id appears in the cache for this player on this hole,
// decide whether to dispatch the bunker prompt. The regular post-shot
// success toast is already dispatched from useLogShot.onSuccess; the
// prompt overwrites it within the same render commit when eligible.
useEffect(() => {
  if (!latestShot) return;
  if (latestShot.id === lastDispatchedShotIdRef.current) return;
  lastDispatchedShotIdRef.current = latestShot.id;

  if (promptEligible) {
    showBunkerPrompt({
      shotId: latestShot.id,
      sequence: latestShot.sequence,
      roundId,
      holeNumber,
    });
  }
}, [latestShot, promptEligible, showBunkerPrompt, roundId, holeNumber]);
```

(The `useRef` import — `useRef` should already be imported alongside `useState`/`useCallback`/`useEffect` from React; if not, add it. Same with `useMemo`.)

- [ ] **Step 4: Type-check**

```bash
pnpm type-check
```

Expected: passes.

- [ ] **Step 5: Run scope-relevant tests**

```bash
pnpm jest src/__tests__/store/shotLogging.test.ts \
  src/__tests__/hooks/shots/useShouldPromptBunker.test.tsx \
  src/__tests__/hooks/shots/useSetShotBunker.test.tsx \
  src/__tests__/components/scorecard/ShotLogging/
```

Expected: all pass. The existing `LogShotInline`-related tests (e.g., `TrackShotsToggle.test.tsx`) shouldn't be affected by this internal addition.

- [ ] **Step 6: Commit**

```bash
git add src/components/scorecard/ShotLogging/LogShotInline.tsx
git commit -m "$(cat <<'EOF'
feat(scoring): dispatch bunker prompt for eligible shots in LogShotInline

useEffect watches the shot_log cache for a new shot id on the
current (round, hole, player); when useShouldPromptBunker reports
eligibility, dispatches showBunkerPrompt — which the toast renderers
(InlineShotToast, LogShotUndoToast) render as "Was that a bunker
shot?" with Yes/No buttons.

The regular onSuccess showToast is unchanged. The bunker-prompt
dispatch overwrites it within the same render commit; users see the
prompt, not the regular toast.
EOF
)"
```

---

## Task 6: Render integration test for the bunker-prompt variant

**Files:**
- Create: `src/__tests__/components/scorecard/ShotLogging/InlineShotToast.test.tsx`

This task establishes a render-test pattern for the toast that V1 deferred. Verifies the bunker-prompt variant actually renders the right copy + buttons + dispatches the right actions.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/scorecard/ShotLogging/InlineShotToast.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InlineShotToast } from '@/components/scorecard/ShotLogging/InlineShotToast';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';

// Mock the mutation since the renderer instantiates it.
const mockMutate = jest.fn();
jest.mock('@/hooks/shots', () => {
  const actual = jest.requireActual('@/hooks/shots');
  return {
    ...actual,
    useSetShotBunker: () => ({ mutate: mockMutate }),
    useDeleteShot: () => ({ mutate: jest.fn() }),
  };
});

// Also stub out theme/colors to keep the render lightweight.
// useThemeColors comes from ThemeContext; if your test setup doesn't
// already provide a default theme, wrap with a minimal provider.
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('InlineShotToast — bunker prompt variant', () => {
  beforeEach(() => {
    mockMutate.mockReset();
    useShotLoggingUiStore.getState().clearToast();
    useShotLoggingUiStore.setState((s) => ({ ...s, bunkerPromptCooldown: new Set() }));
  });

  it('renders "Was that a bunker shot?" when variant is bunkerPrompt', () => {
    act(() => {
      useShotLoggingUiStore.getState().showBunkerPrompt({
        shotId: 'shot-1',
        sequence: 3,
        roundId: 'r1',
        holeNumber: 7,
      });
    });

    const { getByText } = render(<InlineShotToast />, { wrapper: makeWrapper() });
    expect(getByText('Was that a bunker shot?')).toBeTruthy();
    expect(getByText('Yes')).toBeTruthy();
    expect(getByText('No')).toBeTruthy();
  });

  it('Yes tap fires useSetShotBunker mutation and morphs to success', () => {
    act(() => {
      useShotLoggingUiStore.getState().showBunkerPrompt({
        shotId: 'shot-1',
        sequence: 3,
        roundId: 'r1',
        holeNumber: 7,
      });
    });

    const { getByTestId } = render(<InlineShotToast />, { wrapper: makeWrapper() });
    act(() => {
      fireEvent.press(getByTestId('inline-shot-toast-bunker-yes'));
    });

    expect(mockMutate).toHaveBeenCalledWith({ shotId: 'shot-1' });
    const state = useShotLoggingUiStore.getState();
    expect(state.variant).toBe('success');
    expect(state.lastFromBunker).toBe(true);
    expect(state.bunkerPromptCooldown.has('r1:7')).toBe(false);
  });

  it('No tap adds (round,hole) to cooldown and clears toast', () => {
    act(() => {
      useShotLoggingUiStore.getState().showBunkerPrompt({
        shotId: 'shot-1',
        sequence: 3,
        roundId: 'r1',
        holeNumber: 7,
      });
    });

    const { getByTestId } = render(<InlineShotToast />, { wrapper: makeWrapper() });
    act(() => {
      fireEvent.press(getByTestId('inline-shot-toast-bunker-no'));
    });

    expect(mockMutate).not.toHaveBeenCalled();
    const state = useShotLoggingUiStore.getState();
    expect(state.bunkerPromptCooldown.has('r1:7')).toBe(true);
    expect(state.dismissAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail or pass**

```bash
pnpm jest src/__tests__/components/scorecard/ShotLogging/InlineShotToast.test.tsx
```

If the toast renderer changes from Tasks 2/3 are correctly applied, these should PASS without further code changes — they just exercise the existing rendering. If any test fails, the failure indicates a renderer issue:

- "Was that a bunker shot?" not found → check the `message` const in `InlineShotToast.tsx`
- testID not found → check that the Pressable for Yes uses `testID="inline-shot-toast-bunker-yes"` and No uses `inline-shot-toast-bunker-no`
- Mutation not called → check `handleYes` wires through `setShotBunker.mutate({ shotId: lastShotId })`

Fix any renderer bug surfaced; this is the integration check that Tasks 2/3 actually wire up.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/components/scorecard/ShotLogging/InlineShotToast.test.tsx
git commit -m "$(cat <<'EOF'
test(scoring): render-level coverage for bunker-prompt toast variant

Establishes a render-test pattern for the InlineShotToast that V1
deferred. Covers:
- "Was that a bunker shot?" copy renders with Yes/No buttons
- Yes fires useSetShotBunker.mutate({ shotId }) and morphs to
  success variant with lastFromBunker = true
- No adds (roundId,holeNumber) to cooldown and clears the toast

Mocks useSetShotBunker and useDeleteShot so the test exercises the
rendering, not the mutations themselves.
EOF
)"
```

---

## Self-review

**Spec coverage:**

| Spec section / requirement | Implementing task |
|---|---|
| §5 architecture (3 components) | T1 (store), T2 (renderers), T3 (mutation), T4 (eligibility) |
| §6 eligibility heuristic (9 rules) | T4 |
| §7 no schema changes | confirmed in plan header — no migration tasks |
| §8 store extension (variant + cooldown + actions) | T1 |
| §9 toast renderer changes | T2 |
| §10 useSetShotBunker mutation | T3 |
| §11 wire-up in LogShotInline | T5 |
| §12 offline behaviour | covered by mutation error path in T3 (test 3) and existing `useLogShot` behaviour |
| §13 failure modes | covered by `useEffect` dep on `latestShot.id` (T5) and cooldown semantics (T1) |
| §14 file inventory | matches |
| §15 testing strategy | T1, T3, T4 unit; T6 render integration |
| §16 risks | flagged in plan — `useEffect`-driven dispatch tested via T6 |

**Placeholder scan:** No "TBD"/"implement later"/etc. The "verify import paths against actual codebase" note in T4 step 3 is a sanity check pointing at known existing files, not a placeholder — paths are spelled out.

**Type consistency:**
- Variant value `'bunkerPrompt'` consistent across T1 store, T2 renderers, T6 tests.
- Cooldown key format `${roundId}:${holeNumber}` consistent across T1, T4, T6.
- Action names: `showBunkerPrompt`, `dismissBunkerPrompt({ confirmed: boolean })`, `clearBunkerCooldownForRound(roundId)` consistent across T1, T2, T6.
- `useSetShotBunker` consumed in T2 (renderers) and T3 (definition) with same input shape `{ shotId: string }`.
- `useShouldPromptBunker(shot, priorShot, courseId, holeNumber)` consumed in T5 (wire-up) and T4 (definition) with matching argument order.
- Distance constants: 50m for both shot and prior-shot thresholds (T4); time constant 5 min = 300_000 ms (T4).
- Auto-dismiss duration: 8s for bunker prompt (T1), referenced in T2 auto-dismiss effect.

**Out-of-scope items NOT planned:**
- Wiring `clearBunkerCooldownForRound` to a round-completion event handler. The action exists for future use; the cooldown set is volatile (zustand resets on app restart) so memory leakage is bounded. Wiring is a small fast-follow when needed.
- Spec writeup updates after merge — none needed; the existing spec already describes the final state.
