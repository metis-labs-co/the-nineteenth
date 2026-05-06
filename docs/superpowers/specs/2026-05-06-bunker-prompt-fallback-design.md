# Heuristic Bunker-Prompt Fallback — Design (V2 Phase B)

**Status:** Approved
**Date:** 2026-05-06
**Owner:** Sam
**Builds on:**
- V1 spec: `docs/superpowers/specs/2026-05-05-auto-bunker-detection-design.md`
- V2 plan: `docs/superpowers/plans/2026-05-05-auto-bunker-detection-v2.md` (Phase B section)

## 1. Problem

V1 auto-detects bunker shots by point-in-polygon against OSM-sourced `hole_hazards` data. Coverage is excellent on commercial sandbelt courses but patchy on rural Australian clubs. On under-mapped courses, real bunker shots silently miss the `from_bunker = true` flag, sand-save % stays at 0/0 forever, and the player's stats are wrong without anyone noticing.

## 2. Goal

When a player logs a GPS-tracked shot whose pattern looks bunker-shaped on a hole with **zero cached bunker polygons**, prompt them once: "Was that a bunker shot?" If they tap Yes, retroactively flip `from_bunker = true` on the just-inserted shot row. Stats recompute from the views as before.

## 3. Non-goals

- **No new schema** — V1's `from_bunker` column + RLS UPDATE policy on own shots in in-progress rounds are sufficient.
- **No re-prompt after dismiss** on the same hole. Cooldown until round end.
- **No manual override toggle** in the shot-edit modal (deferred to V3 — separate feature).
- **No crowdsourcing of bunker polygons** from confirmed Yes taps (deferred — separate spec).
- **No re-evaluation of `from_bunker` on shot UPDATE** (e.g., when the user moves a shot's GPS position later). The trigger fires on INSERT only; subsequent UPDATEs to lat/lng don't re-run detection. Acceptable — manual user choice trumps automated detection.
- **No batched prompts at hole-end.** Per-shot trigger by design (Q1 decision).
- **No second prompt for shots later in the same hole after a No / dismiss.** Cooldown by design (Q3 decision).

## 4. Locked design decisions (from brainstorming)

- **Q1 — Heuristic tightness:** As-proposed per-shot trigger. False positives accepted as a one-tap cost; tighten in V2.5 if telemetry shows a problem.
- **Q2 — UX shape:** Toast variant in the existing post-shot toast slot. "Was that a bunker shot? · Yes · No". Auto-dismisses to No after 8s. Replaces the Undo affordance for shots that trigger the prompt — Undo is rare for legitimately-logged shots and the shot-edit screen still works for late corrections.
- **Q3 — Frequency on the same hole:**
  - Yes → keep prompting future eligible shots on the same hole (engaged user).
  - No / auto-dismiss → cooldown the whole `(round, hole)` for the rest of the round.

## 5. Architecture

Three components, each a small extension of V1.

```
┌─────────────────────────────────────────────────────┐
│ 1. Eligibility hook (client-side)                    │
│    useShouldPromptBunker(shot, priorShot,            │
│      courseId, holeNumber): boolean                  │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ 2. Toast variant (zustand store + 2 renderers)       │
│    variant: 'bunkerPrompt' (third option)            │
│    cooldown: Set<`${roundId}:${holeNumber}`>         │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ 3. Mutation: useSetShotBunker(shotId)                │
│    UPDATE shot_log SET from_bunker = true            │
│    invalidates ['shotLog'] + ['stats','sandSave']    │
└─────────────────────────────────────────────────────┘
```

Wire-up in `LogShotInline` uses a `useEffect` that watches the latest two shots from the cache; on a new shot, evaluates eligibility, then dispatches either `showBunkerPrompt` (eligible) or `showToast` (not eligible).

## 6. Eligibility heuristic

```typescript
useShouldPromptBunker(
  shot: ShotLogEntry | null,
  priorShot: ShotLogEntry | null,
  courseId: string | undefined,
  holeNumber: number
): boolean
```

Returns `true` iff ALL of the following hold:

1. `shot` is non-null and `priorShot` is non-null. (No prior shot → can't evaluate "approach from where?".)
2. `shot.from_bunker === false`. (Auto-detect didn't already catch it; we don't second-guess server-side detection.)
3. `useHoleHazards(courseId, holeNumber)` returns 0 polygons of type `'bunker'`. (Polygons exist → auto-detect should have fired; if it didn't, the shot wasn't in a bunker.)
4. `useHoleHazards` is not in `loading` state. (Suppress prompt during initial cache load; preferring miss over false positive.)
5. The hole has a `green_center` coordinate available via `hole_coordinates`. (Without it, can't compute distance.)
6. Distance from `shot.location` to `green_center` < **50 m**.
7. Distance from `priorShot.location` to `green_center` > **50 m**.
8. `shot.created_at - priorShot.created_at` < **5 minutes** (300_000 ms).
9. The pair `(shot.round_id, shot.hole_number)` is NOT in the dismissal cooldown set.

Any rule fails → `false` → fall through to the regular post-shot toast.

Distance computation: existing `haversineMeters` utility (search `src/utils/distance*` or equivalent — reuse rather than re-implement).

## 7. Data model

**No schema changes.** Reuses:

- `shot_log.from_bunker` (V1) — flipped via UPDATE on Yes taps
- `shot_log_update` RLS policy (V1) — already permits UPDATE on own shots in `'in-progress'` rounds
- `hole_hazards` (V1) — read via existing `useHoleHazards` hook
- `hole_coordinates` (V1) — read via existing hook for green_center lookup
- `v_sand_saves` / `v_sand_save_attempts` (V1) — automatically reflect new `from_bunker = true` rows on next read

The detection trigger from V1 (`shot_log_detect_bunker_before_insert`) is unchanged. The new mutation does a direct UPDATE that intentionally bypasses re-detection — manual user choice is authoritative.

## 8. State: store extensions

`src/store/shotLoggingUiStore.ts` adds:

```typescript
type ShotToastVariant = 'success' | 'error' | 'bunkerPrompt';

interface ShotLoggingUiState {
  // ... existing fields ...
  variant: ShotToastVariant;
  /** (roundId:holeNumber) pairs where the user dismissed the bunker prompt. */
  bunkerPromptCooldown: Set<string>;

  /** Show the bunker prompt variant for a just-inserted shot. */
  showBunkerPrompt: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    durationMs?: number;
  }) => void;

  /** Resolve the bunker prompt. confirmed=false adds to cooldown. */
  dismissBunkerPrompt: (input: { confirmed: boolean }) => void;

  /** Free cooldown memory when a round closes. */
  clearBunkerCooldownForRound: (roundId: string) => void;
}
```

Cooldown key format: `${roundId}:${holeNumber}` (string Set, not nested map — simpler and the access pattern is just `has`/`add`/`delete`).

Default duration for the bunker prompt: **8 seconds** (vs. 5s for the regular toast — gives the user time to think about what just happened on the hole).

The existing `lastFromBunker` field stays. It's set to `true` by `dismissBunkerPrompt({ confirmed: true })` so the toast can morph into the standard "Bunker shot logged" copy for the remaining dismissal window — a small reinforcement that the action took effect. (Implementation detail: `dismissBunkerPrompt({ confirmed: true })` sets `variant: 'success'`, `lastFromBunker: true`, fires the mutation, leaves `dismissAt` in place.)

## 9. Toast renderers

Both `InlineShotToast.tsx` and `LogShotUndoToast.tsx` get a third branch in their `message` const + a different button slot when `variant === 'bunkerPrompt'`:

```typescript
const message = isError
  ? errorMessage
  : isBunkerPrompt
    ? 'Was that a bunker shot?'
    : lastFromBunker
      ? `Bunker shot ${lastSequence} logged`
      : `Shot ${lastSequence} logged`;
```

Button slot when `variant === 'bunkerPrompt'`:

```
[ Yes ]   [ No ]
```

Each is a `Pressable` with the same touch target as the existing Undo button (44dp min). `Yes` calls `setShotBunker.mutate({ shotId: lastShotId! })` then `dismissBunkerPrompt({ confirmed: true })`. `No` calls `dismissBunkerPrompt({ confirmed: false })`. Auto-dismiss timer (existing pattern) calls `dismissBunkerPrompt({ confirmed: false })` on expiry.

Visual style: same `colors.primary` surface as the success toast (don't introduce a new colour for what is fundamentally the same notification class). Yes/No buttons use the same all-caps `letterSpacing: 0.5` typography as the existing Undo button.

## 10. Mutation: `useSetShotBunker`

`src/hooks/shots/useSetShotBunker.ts` (new):

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { shotLogKeys } from '@/hooks/queryKeys';

export function useSetShotBunker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shotId }: { shotId: string }) => {
      const { error } = await (supabase as unknown as {
        from: (table: string) => any;
      })
        .from('shot_log')
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

Cast pattern matches V1's `useLogShot`: the generated `Database` type doesn't yet include the `from_bunker` column on the typed mutation builder. The cast is a known short-term debt that will resolve when types are regenerated post-deploy. The code is identical in shape to the existing mutation pattern.

`shotLogKeys.all` is the existing root key; invalidating it refreshes any consumer of shot data on this round/hole. The `['stats', 'sandSave']` invalidation matches V1's `useSandSaveStats` queryKey root.

## 11. Wire-up in `LogShotInline`

The eligibility check can't run inside `useLogShot.onSuccess` (hook rules: hooks must run during render, not inside callbacks). Pattern:

```typescript
// Inside LogShotInline component body (top-level, not inside callbacks):
const { data: latestShots } = useShotLog(roundId, holeNumber);
const [latestShotId, setLatestShotId] = useState<string | null>(null);

const lastTwo = useMemo(() => {
  if (!latestShots || latestShots.length < 1) return { shot: null, prior: null };
  const shot  = latestShots[latestShots.length - 1] ?? null;
  const prior = latestShots[latestShots.length - 2] ?? null;
  return { shot, prior };
}, [latestShots]);

const courseId = useRoundCourseId(roundId);
const eligible = useShouldPromptBunker(
  lastTwo.shot, lastTwo.prior, courseId, holeNumber
);

// Effect: when a NEW shot lands (latest id changes), branch on eligibility
useEffect(() => {
  if (!lastTwo.shot) return;
  if (lastTwo.shot.id === latestShotId) return;       // already handled
  setLatestShotId(lastTwo.shot.id);

  if (eligible) {
    showBunkerPrompt({
      shotId: lastTwo.shot.id,
      sequence: lastTwo.shot.sequence,
      roundId,
      holeNumber,
    });
  }
  // The regular `showToast` is still dispatched from `useLogShot.onSuccess`
  // for the success case — but if `eligible` is true, the bunker variant
  // will overwrite it within the same render cycle. The store does not
  // queue toasts, so the most recent dispatch wins.
}, [lastTwo.shot, eligible, latestShotId, roundId, holeNumber, showBunkerPrompt]);
```

The two-step (regular toast THEN bunker prompt overwrite) is acceptable because both calls happen in the same render commit — the user sees the bunker prompt, not a flash of the regular toast. If the overwrite turns out to flicker on slow devices, optimisation: skip the regular `showToast` in `useLogShot.onSuccess` when eligibility is also met. Defer this until measured.

`useShotLog(roundId, holeNumber)` is the existing query hook from V1's TanStack setup. `useRoundCourseId(roundId)` may need to be a tiny new hook (or use existing `useRound(roundId)`); cheapest path is whatever already exposes the course id.

## 12. Offline behaviour

- `useLogShot` errors offline today (no offline queue). Behaviour unchanged.
- The mutation `useSetShotBunker` requires network. If the user taps Yes offline, the mutation fails, the user sees an error toast (existing `showErrorToast` pattern), `from_bunker` stays `false`. Acceptable — under-mapped courses are likely also out of cell coverage.
- `useHoleHazards` reads from cache when offline. If the cache says "no polygons" (or `undefined`), eligibility falls through to false → no prompt fires. Conservative, prevents stranded prompts.

## 13. Failure modes

| Mode | Behaviour |
|---|---|
| GPS jitter near 50 m boundary | Prompt may or may not fire. False positive → user taps No → cooldown. False negative → silent miss. Acceptable. |
| Very fast back-to-back shots | Effect dep on `lastTwo.shot.id` — only fires when a NEW shot id arrives. Re-renders without new shot id are no-ops. |
| App backgrounded mid-prompt | Existing dismiss timer (`setTimeout` in `useEffect` cleanup) cancels on unmount; on re-mount, no prompt. The user just doesn't see it. Acceptable. |
| Mutation fails (network/RLS) | Caught in `onError`, dispatch `showErrorToast`. Shot stays un-tagged. Stats unaffected. |
| User taps Yes during the auto-dismiss countdown's final 100ms | Race between user tap and timer. The mutation fires regardless; the cooldown does not get added. Worst case: the cooldown isn't set so a future shot might re-prompt. Tolerable — it's one extra prompt at most. |
| `useShotLog` cache stale at evaluation time | The eligibility check is wrong for one render. Effect re-runs on next cache update, dispatches the right variant. Worst case: the user sees a brief flash. Tolerable. |

## 14. File inventory

### New files

| Path | Purpose |
|---|---|
| `src/hooks/shots/useShouldPromptBunker.ts` | Eligibility heuristic |
| `src/hooks/shots/useSetShotBunker.ts` | UPDATE mutation |
| `src/__tests__/hooks/shots/useShouldPromptBunker.test.tsx` | Heuristic table-driven tests |
| `src/__tests__/hooks/shots/useSetShotBunker.test.tsx` | Mutation test |

### Modified files

| Path | Change |
|---|---|
| `src/store/shotLoggingUiStore.ts` | Add `'bunkerPrompt'` variant + cooldown Set + actions |
| `src/__tests__/store/shotLogging.test.ts` | Add tests for new actions + cooldown semantics |
| `src/components/scorecard/ShotLogging/InlineShotToast.tsx` | Add bunker-prompt branch in `message` + Yes/No buttons |
| `src/components/scorecard/ShotLogging/LogShotUndoToast.tsx` | Same as above |
| `src/components/scorecard/ShotLogging/LogShotInline.tsx` | Wire-up effect to dispatch the prompt on eligible shots |
| `src/hooks/shots/index.ts` | Export `useSetShotBunker` and `useShouldPromptBunker` |

### Files reviewed (no change expected)

- `src/types/database/shotLog.types.ts` — `from_bunker` already non-optional (V1)
- `supabase/migrations/20260501000000_create_shot_log.sql` — RLS UPDATE policy already permits this mutation pattern

## 15. Testing strategy

**Unit (`useShouldPromptBunker`):** table-driven, one row per rule. Each row sets up minimal inputs (a fake `shot`, fake `priorShot`, mocked `useHoleHazards` return, mocked `green_center`) and asserts the boolean. Cover all 9 rules + the all-true case.

**Unit (store):** extend `src/__tests__/store/shotLogging.test.ts`:
- `showBunkerPrompt` sets `variant: 'bunkerPrompt'` and the dismiss deadline
- `dismissBunkerPrompt({ confirmed: false })` adds key to cooldown
- `dismissBunkerPrompt({ confirmed: true })` does NOT add to cooldown, sets `lastFromBunker: true`, sets `variant: 'success'`
- `clearBunkerCooldownForRound(roundId)` removes only that round's entries

**Unit (mutation):** mock supabase, assert `update({ from_bunker: true }).eq('id', …)` is called and the right query keys are invalidated.

**Integration (rendered toast):** render `InlineShotToast` with a mocked store state where `variant === 'bunkerPrompt'`. Assert "Was that a bunker shot?" text appears and Yes/No buttons render. Tap Yes → mutation fires + `dismissBunkerPrompt({confirmed:true})` called. Tap No → only `dismissBunkerPrompt({confirmed:false})` called. Establishes a render-test pattern that V1 deferred.

**Manual (post-merge):** play through a hole on an under-mapped course, log a shot from rough > 50m from green, then a chunked approach < 50m from green within 5 min. Confirm prompt appears, taps work, stats update.

## 16. Risks

1. **`useEffect`-driven prompt is racier than `onSuccess`-driven.** Mitigated by gating on `lastTwo.shot.id` changing. Worst case is a one-render flicker between regular and bunker toast — should be invisible at React's commit cadence but worth measuring.
2. **Cooldown set is volatile (zustand, in-memory).** App restart mid-round → cooldown is reset and a previously-dismissed hole could re-prompt on the next shot. V2 acceptable; if becomes a complaint, persist the Set to AsyncStorage keyed by the active round.
3. **`useHoleHazards` returns `undefined` initially** — eligibility check correctly suppresses prompt during this window. Edge case: a user logs the very first shot of the round before the cache settles. Likely already-warm because `LogShotInline` mounts before tap, but worth one test.
4. **The existing `useShotLog(roundId, holeNumber)` hook may not exist with that exact signature.** Implementer to confirm and adapt the wire-up. If it doesn't exist, the existing query for shots on a hole is what we read; could be `useShotLogForHole` or similar. Don't write a new hook — find and use the existing one.
5. **The "morph" between regular toast and bunker prompt** assumes both dispatches resolve to the same render. If the user sees a flash of "Shot N logged" before the bunker prompt, telemetry/QA will surface it; the cleanup is conditional dispatch in `LogShotInline.onSuccess` (skip the regular toast when eligible).

## 17. V3 follow-ups (informational, NOT in scope)

- Manual override toggle in the shot-edit modal (the proper home for late corrections)
- Persist cooldown across app restarts within a round
- Crowdsource confirmed Yes shots into a manual `hole_hazards` polygon system (separate spec)
- Per-shot eligibility tightening (fairway-corridor heuristic from V2 plan Phase B Q1 option C, if telemetry shows false-positive issues)
- Dismiss-once-per-shot rather than dismiss-once-per-hole, if users complain about losing the second-bunker tagging

## 18. Migration / rollout

No migrations. No edge function changes. No config changes. Pure client-side feature behind the existing Premium tier gate (the prompt only fires when `useHoleHazards` would have been queried, which is itself tier-gated post-Phase-A).

Rollout is an OTA app update. Free / Social tier users see no UX change. Premium tier users on under-mapped courses start seeing the prompt; Premium tier users on sandbelt/well-mapped courses see no change.

No feature flag needed for V2 Phase B itself — the eligibility heuristic is itself the feature flag (zero polygons = prompt enabled; one or more polygons = prompt suppressed). If telemetry shows the prompt is unwelcome, we can land a fast-follow that adds an explicit user-pref toggle.
