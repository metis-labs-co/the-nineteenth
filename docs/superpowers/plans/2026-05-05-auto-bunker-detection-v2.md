# Auto-tracked Bunker Shots V2 — Follow-up Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps from V1 — extend coverage to under-mapped courses (heuristic prompt fallback), bring sand-save % to the course-scoped stats screen, and tighten tier-gating + ops hygiene around the OSM ingestion path.

**Architecture:** Three independent phases. Phase A is two small wins ready to ship. Phase B introduces a single new UX surface (the bunker-prompt toast) and one new mutation (`useSetShotBunker`). Phase C is operational scaffolding for keeping cached polygons fresh.

**Tech Stack:** Same as V1 — PostgreSQL + PostGIS, Supabase Edge Functions (Deno), TypeScript, React Native, TanStack Query, Zustand, Jest.

**Predecessors:**
- V1 spec: `docs/superpowers/specs/2026-05-05-auto-bunker-detection-design.md`
- V1 plan: `docs/superpowers/plans/2026-05-05-auto-bunker-detection.md` (merged via `09dc16b`)

**V1 deferred items addressed here:** §3 non-goals for V1, §15 V2+ roadmap, plus three nits surfaced by the V1 cross-cutting review.

---

## Phase scope summary

| Phase | Items | Effort | Ship readiness |
|---|---|---|---|
| **A** Quick wins | Tier-gate `useHazardBackfill`; CourseStatisticsScreen sand-save merge | ~1 hour each | Concrete, ready to execute |
| **B** Heuristic prompt fallback | "Was that a bunker shot?" prompt for under-mapped courses | ~half day | Design questions flagged; pre-execution review recommended |
| **C** OSM refresh strategy | Periodic re-ingestion when polygon data ages | ~half day | Light design needed |
| **Out of scope** | Crowdsourced polygon contributions; manual bunker-toggle UI; lie classification | — | Separate specs |

---

## Phase A: Quick wins (concrete)

### Task A1: Tier-gate `useHazardBackfill` in `HoleMapScreen`

**Why:** Hazards are a Premium-tier feature per the existing `FeatureLock` patterns in `BunkerStatsSection`. Currently `useHazardBackfill(courseId)` is invoked unconditionally from `HoleMapScreen` for every authenticated user opening a hole map (e.g., a free-tier player viewing another player's round). This wastes Overpass quota per the Free-tier viewer's curiosity. Server-side de-dupe limits damage but doesn't eliminate it.

**Files:**
- Modify: `src/screens/scoring/HoleMapScreen.tsx`

- [ ] **Step 1: Read the current call site**

`src/screens/scoring/HoleMapScreen.tsx` line ~111 currently has bare:

```typescript
useHazardBackfill(courseId);
```

- [ ] **Step 2: Find the tier gate already in use on this screen**

The screen presumably already reads tier (the V1 line 108 mentions `tier`). Locate where `tier` is sourced — likely via `useCurrentSubscriptionTier()` or similar — by reading the surrounding code.

- [ ] **Step 3: Gate the backfill call**

Pass `undefined` to the hook when the user isn't on a tier that gets the feature. The hook already no-ops on `undefined`:

```typescript
const isHazardTier = tier === 'premium' || tier === 'super_admin';
useHazardBackfill(isHazardTier ? courseId : undefined);
```

(Cross-check the actual tier names against `src/types/subscription.types.ts` — they may be `'social' | 'premium' | 'super_admin'` or similar. Read the type before hardcoding.)

- [ ] **Step 4: Test**

```bash
pnpm jest src/__tests__/screens/HoleMapScreen.test.tsx
pnpm type-check
```

Existing test mocks `useHazardBackfill`; should still pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/scoring/HoleMapScreen.tsx
git commit -m "fix(hazards): tier-gate useHazardBackfill in HoleMapScreen

Free-tier viewers shouldn't trigger Overpass ingestion when they
open a hole map (e.g. via shared round links). Pass undefined to
the hook when the caller isn't on a tier that owns hazard data;
the hook's existing courseId-required check makes that a no-op."
```

### Task A2: Wire `useSandSaveStats` into `CourseStatisticsScreen`

**Why:** V1 only merged sand-save data into `MyStatisticsScreen`. `CourseStatisticsScreen` re-renders the same `BunkerStatsSection` component but always passes `sandSavePercentage: null` (from `calculateBunkerStats` defaults). Result: the Sand Save row reads `-` for every course, even courses where the user has confirmed sand saves.

**Two paths:**

1. **Player-scoped data, no course filter (cheapest):** Reuse `useSandSaveStats(playerId)` and merge into the course-scoped `bunkerStats` object. Sand Save % shown is the player's lifetime number, not course-specific. Inconsistent with the rest of `CourseStatisticsScreen` (which IS course-scoped) but very cheap.
2. **Course-scoped via a new hook variant (correct):** Add `useSandSaveStats(playerId, courseId)`. The view-backed query gains an `eq('course_id', courseId)` — but the views don't currently expose `course_id` directly (they expose `round_id`, which can join to `rounds` for `course_id`). Either add `course_id` to the view projection (small migration) OR filter via a JOIN-RPC.

**Recommendation:** Path 2 with the small view-projection migration. It's a 5-line view change and avoids semantic drift. Treating Path 2 as the canonical here.

**Files:**
- Modify: `supabase/migrations/<new>_add_course_id_to_sand_save_views.sql` (new)
- Modify: `src/hooks/queries/useSandSaveStats.ts`
- Modify: `src/__tests__/hooks/queries/useSandSaveStats.test.tsx`
- Modify: `src/screens/profile/CourseStatisticsScreen/components/CourseGameStatsTab.tsx` (or the screen's index.tsx if it builds the bunkerStats prop higher up)

- [ ] **Step 1: Add `course_id` to the views**

Create `supabase/migrations/20260506000000_add_course_id_to_sand_save_views.sql`:

```sql
-- Add course_id to v_sand_saves and v_sand_save_attempts so callers
-- can filter to a single course. Views were originally projected with
-- (bunker_shot_id, round_id, hole_number, player_id, …). Adding the
-- course_id makes course-scoped statistics queryable directly.

CREATE OR REPLACE VIEW v_sand_save_attempts
  WITH (security_invoker = true)
AS
WITH shot_chain AS (
  SELECT
    s.id,
    s.round_id,
    s.hole_number,
    s.player_id,
    s.sequence,
    s.from_bunker,
    LEAD(s.location, 1) OVER (
      PARTITION BY s.round_id, s.hole_number, s.player_id ORDER BY s.sequence
    ) AS next_location
  FROM shot_log s
),
green_centers AS (
  SELECT course_id, hole_number, location AS green_location
  FROM hole_coordinates
  WHERE poi_type = 'green_center'
)
SELECT
  sc.id          AS bunker_shot_id,
  sc.round_id,
  r.course_id,
  sc.hole_number,
  sc.player_id,
  TRUE           AS is_attempt
FROM shot_chain sc
JOIN rounds r        ON r.id = sc.round_id
JOIN green_centers gc
  ON gc.course_id = r.course_id AND gc.hole_number = sc.hole_number
WHERE sc.from_bunker = true
  AND sc.next_location IS NOT NULL
  AND ST_DWithin(sc.next_location, gc.green_location, 10);

CREATE OR REPLACE VIEW v_sand_saves
  WITH (security_invoker = true)
AS
SELECT
  a.bunker_shot_id,
  a.round_id,
  a.course_id,
  a.hole_number,
  a.player_id,
  TRUE AS is_sand_save
FROM v_sand_save_attempts a
JOIN shot_log s ON s.id = a.bunker_shot_id
WHERE (
  SELECT COUNT(*)
  FROM shot_log s2
  WHERE s2.round_id    = a.round_id
    AND s2.hole_number = a.hole_number
    AND s2.player_id   = a.player_id
) - s.sequence <= 2;
```

Apply locally:

```bash
supabase migration up
```

Now that the duplicate-version blocker has been removed, this should succeed.

- [ ] **Step 2: Update `useSandSaveStats` to accept optional courseId**

In `src/hooks/queries/useSandSaveStats.ts`, replace the hook signature and queryFn:

```typescript
async function fetchSandSaveStats(
  playerId: string,
  courseId?: string
): Promise<SandSaveStats> {
  const baseSaves    = supabase.from('v_sand_saves').select('*', { count: 'exact', head: true }).eq('player_id', playerId);
  const baseAttempts = supabase.from('v_sand_save_attempts').select('*', { count: 'exact', head: true }).eq('player_id', playerId);

  const [savesResult, attemptsResult] = await Promise.all([
    courseId ? baseSaves.eq('course_id', courseId)    : baseSaves,
    courseId ? baseAttempts.eq('course_id', courseId) : baseAttempts,
  ]);

  const sandSaves = savesResult.count ?? 0;
  const sandSaveAttempts = attemptsResult.count ?? 0;
  const sandSavePercentage =
    sandSaveAttempts > 0 ? (sandSaves / sandSaveAttempts) * 100 : null;

  return { sandSaves, sandSaveAttempts, sandSavePercentage };
}

export function useSandSaveStats(
  playerId: string | undefined,
  courseId?: string
) {
  return useQuery({
    queryKey: ['stats', 'sandSave', playerId, courseId ?? null],
    queryFn: () => fetchSandSaveStats(playerId as string, courseId),
    enabled: Boolean(playerId),
    staleTime: STALE_TIME_MS,
  });
}
```

Note: `playerId` only is the existing call signature — the V1 `MyStatisticsScreen` integration continues to work unchanged. Adding `courseId` as optional second arg is backward-compatible.

- [ ] **Step 3: Add a test for the courseId variant**

Append to `src/__tests__/hooks/queries/useSandSaveStats.test.tsx`:

```typescript
  it('filters by courseId when provided', async () => {
    const eqMock = jest.fn();
    eqMock.mockImplementation(() => ({ eq: eqMock, ...{ then: undefined } as never }));
    // Final eq returns the result; chain twice (player_id, course_id)
    const finalSaves = { count: 3, data: null, error: null };
    const finalAttempts = { count: 5, data: null, error: null };
    let call = 0;
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve(call++ === 0 ? finalSaves : finalAttempts),
        }),
      }),
    }));

    const { result } = renderHook(
      () => useSandSaveStats('player-1', 'course-9'),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      sandSaves: 3,
      sandSaveAttempts: 5,
      sandSavePercentage: 60,
    });
  });
```

(Adjust the mock chain shape to match supabase-js builder semantics. The two existing tests in this file should hint at the right pattern.)

- [ ] **Step 4: Wire into `CourseStatisticsScreen`**

Read `src/screens/profile/CourseStatisticsScreen/index.tsx` (or whichever consumer mounts `BunkerStatsSection`). Find the existing course-scoped player stats block. Add:

```typescript
const sandSaveQuery = useSandSaveStats(player?.id, courseId);

const mergedBunkerStats = useMemo(
  () => ({
    ...bunkerStats,
    sandSaves:           sandSaveQuery.data?.sandSaves           ?? 0,
    sandSaveAttempts:    sandSaveQuery.data?.sandSaveAttempts    ?? 0,
    sandSavePercentage:  sandSaveQuery.data?.sandSavePercentage  ?? null,
  }),
  [bunkerStats, sandSaveQuery.data]
);
```

Pass `mergedBunkerStats` to `<BunkerStatsSection />` instead of the raw `bunkerStats`.

- [ ] **Step 5: Test**

```bash
pnpm jest src/__tests__/hooks/queries/useSandSaveStats.test.tsx
pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260506000000_add_course_id_to_sand_save_views.sql \
        src/hooks/queries/useSandSaveStats.ts \
        src/__tests__/hooks/queries/useSandSaveStats.test.tsx \
        src/screens/profile/CourseStatisticsScreen/
git commit -m "feat(stats): course-scoped sand save % in CourseStatisticsScreen

useSandSaveStats(playerId, courseId?) now accepts an optional
courseId. Views v_sand_saves and v_sand_save_attempts gain a
course_id column (joined from rounds) so the filter is index-friendly.
CourseStatisticsScreen merges course-scoped sand-save data into its
bunkerStats payload using the same useMemo-then-pass pattern as
MyStatisticsScreen."
```

---

## Phase B: Heuristic prompt fallback

### B0: Design decisions to validate before execution

This phase introduces a new UX surface ("Was that a bunker shot?" prompt). Before implementation, confirm:

**D1. When does the prompt fire?**

Proposed: AFTER a shot is logged, IF
1. `hole_hazards` returns 0 bunker polygons for that (course, hole) — i.e., the auto-detect path can't help, AND
2. The shot pattern is "bunker-shaped" — specifically:
   - Shot distance to green_center < 50m (consistent with the V1 sand-save eligibility window)
   - Prior shot for same (round, hole, player) was > 50m from green_center (i.e., this looks like an approach gone wrong, the kind of pattern that often comes from chunked/short bunker shots)
   - Elapsed time since prior shot < 5 minutes (filters out resumed-after-break shots)

**Alternative to consider:** ask on every shot when no polygons exist (cruder, more taps, no missed bunkers). Recommend the heuristic — false-positive prompt fatigue is the bigger UX risk than missed bunker-shot tags.

**D2. UX shape?**

Proposed: a toast variant rendered through the existing `useShotLoggingUiStore`. Same slot as the regular shot toast, but with two buttons (Yes / No) instead of one (Undo). Auto-dismiss to "No" after 8 seconds.

**Alternative:** an inline confirm pill in the score-entry card. More visible but interrupts flow more.

**D3. Side effect of "Yes"?**

Proposed: a new mutation `useSetShotBunker(shotId, fromBunker: boolean)` that issues `UPDATE shot_log SET from_bunker = $1 WHERE id = $2`. This:
- Triggers no DB-side cascade (the existing detection trigger only fires on INSERT, not UPDATE)
- Reflects in stats immediately (the views read `from_bunker` directly)

**D4. Should "Yes" also crowdsource a polygon?**

Defer. Crowdsourcing is its own large feature in §15 — out of scope for V2.

**D5. Show a small celebratory thing on a Yes that closes a sand save?**

Defer. Out of scope. The stats card will just update on next view.

If these decisions look wrong, revise this section before starting B1. Otherwise proceed.

### Task B1: Heuristic-eligibility hook

**Why:** Centralizes the trigger logic so the toast renderer doesn't need to do its own DB round-trips.

**Files:**
- Create: `src/hooks/shots/useShouldPromptBunker.ts`
- Create: `src/__tests__/hooks/shots/useShouldPromptBunker.test.tsx`

- [ ] **Step 1: Write the test**

The hook takes the just-inserted shot + the previous shot (if any) + course/hole context and returns a boolean.

```typescript
// Test cases
- shot has from_bunker=true → return false (auto-detect already caught it)
- hole has bunker polygons cached → return false (auto-detect should have caught it; if not, no second-guess)
- no prior shot → return false (can't evaluate "approach from where?")
- shot >= 50m from green → return false
- prior shot <= 50m from green → return false (already on/near green; this is putt territory)
- elapsed time > 5 min → return false
- all conditions met → return true
```

- [ ] **Step 2: Implement**

```typescript
import { useHoleHazards } from '@/hooks/hazards';
import { useHoleCoordinates } from '@/hooks/...'; // find existing hook
import type { ShotLogEntry } from '@/types/database/shotLog.types';

const SHORT_SHOT_RADIUS_M = 50;
const PRIOR_SHOT_FAR_M = 50;
const MAX_GAP_MS = 5 * 60 * 1000;

export function useShouldPromptBunker(
  shot: ShotLogEntry | null,
  priorShot: ShotLogEntry | null,
  courseId: string | undefined,
  holeNumber: number
): boolean {
  const { data: hazards } = useHoleHazards(courseId ?? '', holeNumber);
  const greenCenter = useHoleGreenCenter(courseId, holeNumber); // wrap useHoleCoordinates

  if (!shot || !priorShot) return false;
  if (shot.from_bunker) return false;
  if ((hazards ?? []).some((h) => h.type === 'bunker')) return false;
  if (!greenCenter) return false;

  const shotToGreen = haversineMeters(shot, greenCenter);
  if (shotToGreen >= SHORT_SHOT_RADIUS_M) return false;

  const priorToGreen = haversineMeters(priorShot, greenCenter);
  if (priorToGreen <= PRIOR_SHOT_FAR_M) return false;

  const gap = +new Date(shot.created_at) - +new Date(priorShot.created_at);
  if (gap > MAX_GAP_MS) return false;

  return true;
}
```

`haversineMeters` is likely already implemented in `src/utils/distance.ts` — search and reuse.

- [ ] **Step 3: Run tests**

- [ ] **Step 4: Commit**

### Task B2: Bunker-prompt toast variant + mutation

**Files:**
- Modify: `src/store/shotLoggingUiStore.ts`
- Modify: `src/__tests__/store/shotLogging.test.ts`
- Modify: `src/components/scorecard/ShotLogging/InlineShotToast.tsx`
- Modify: `src/components/scorecard/ShotLogging/LogShotUndoToast.tsx`
- Create: `src/hooks/shots/useSetShotBunker.ts`
- Create: `src/__tests__/hooks/shots/useSetShotBunker.test.tsx`

- [ ] **Step 1: Extend the store with a third toast variant**

Today the store has `variant: 'success' | 'error'`. Add `'bunkerPrompt'`. New action `showBunkerPrompt({ shotId, sequence, roundId, holeNumber })` sets variant + dismiss deadline. Reuse the existing `lastShotId` etc. fields.

- [ ] **Step 2: Update both toast renderers**

When `variant === 'bunkerPrompt'`:
- Body text: "Was that a bunker shot?"
- Two buttons instead of one Undo: "Yes" → invoke `useSetShotBunker(lastShotId, true)`; "No" → `clearToast()`
- Auto-dismiss to "No" via existing dismiss timeout

Use the same const-extracted message pattern V1 settled on. Stack the two buttons inline (matches the existing single Undo button slot — just two buttons in row).

- [ ] **Step 3: Implement `useSetShotBunker` mutation**

```typescript
export function useSetShotBunker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shotId, fromBunker }: { shotId: string; fromBunker: boolean }) => {
      const { error } = await shotLogTable()
        .update({ from_bunker: fromBunker })
        .eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: (_, { shotId }) => {
      // Invalidate any shot_log queries that include this shot
      queryClient.invalidateQueries({ queryKey: ['shotLog'] });
      // Sand-save stats may flip too
      queryClient.invalidateQueries({ queryKey: ['stats', 'sandSave'] });
    },
  });
}
```

- [ ] **Step 4: Tests + commit**

### Task B3: Wire prompt into `LogShotInline.onSuccess`

**Files:**
- Modify: `src/components/scorecard/ShotLogging/LogShotInline.tsx`

- [ ] **Step 1: Add the eligibility check after `showToast`**

After `showToast(...)` call in `onSuccess`, also evaluate eligibility and conditionally show the prompt instead. The hook can't be called inside `onSuccess` (hooks rules), so eligibility must be computed at component scope and passed in.

Cleanest shape: compute eligibility at component render scope (the hook reads cached data anyway), then in `onSuccess` switch on it to decide between `showToast` and `showBunkerPrompt`. Tricky because eligibility depends on the JUST-inserted shot. Options:

- **(a)** Show the regular toast, then run a separate `useEffect` that detects a newly-logged shot and triggers the prompt if eligible. Requires reading the latest shot from cache after insert.
- **(b)** Inline the eligibility logic from `useShouldPromptBunker` into `onSuccess` — duplicates logic but avoids the hook-rules issue.

Recommend (a). The toast is dismissable in either direction; converting an existing toast to a prompt is awkward UX. Two distinct UI events (Shot logged → maybe later Bunker? prompt) is acceptable.

Actual implementation likely calls `showBunkerPromptIfEligible(shot)` from a useEffect that depends on the latest mutation result.

- [ ] **Step 2: Test on golden path**

Manual: log a shot off-fairway > 50m from green, then log another shot < 50m from green within 5 min, on a course with NO cached hazards. Toast should switch from "Shot N logged" to "Was that a bunker shot? · Yes / No".

- [ ] **Step 3: Commit**

### Task B4: V2 design-doc update

**Files:**
- Modify: `docs/superpowers/specs/2026-05-05-auto-bunker-detection-design.md`

- [ ] **Step 1: Append a new §16 V2 changes**

Append a section documenting:
- The heuristic-prompt addition (D1–D3 from B0 above)
- The new `useSetShotBunker` mutation
- The new `course_id` projection on the views (Phase A2)
- The tier gate on `useHazardBackfill` (Phase A1)

Don't edit the existing V1 sections — they're historical accuracy. Add §16 inline.

---

## Phase C: OSM refresh strategy

### Task C1: Per-course `last_hazard_sync_at` + scheduled re-ingest

**Why:** V1 ingests once at course import and never refreshes. Bunkers get re-shaped over time (Royal Melbourne renovated multiple holes in 2024-25); cached polygons go stale. Without a refresh path, the most-played courses degrade in accuracy first.

**Approach:**
- Add `courses.last_hazard_sync_at TIMESTAMPTZ`
- Update `ingest-course-hazards` to set it on success
- Add a Supabase scheduled job (cron) that runs nightly, picks the 50 courses with the oldest `last_hazard_sync_at` (or null) AND have ≥ 1 round in the last 30 days, and re-invokes the edge function for each

Tasks would be:

- [ ] C1.1 — migration: `ALTER TABLE courses ADD COLUMN last_hazard_sync_at TIMESTAMPTZ;`
- [ ] C1.2 — edge function: at end of successful ingest, `UPDATE courses SET last_hazard_sync_at = NOW() WHERE id = $1;`
- [ ] C1.3 — new edge function `refresh-stale-course-hazards`: cron-triggered, finds N stale courses, invokes `ingest-course-hazards` for each
- [ ] C1.4 — Supabase project config or pg_cron entry: schedule nightly at 03:00 AEST (off-peak)
- [ ] C1.5 — observability: log how many courses got refreshed each night

This phase has higher operational complexity and only matters for courses you've already played. Defer until Phase B is in production for ~60 days and there's signal that staleness is hurting accuracy.

---

## Out of scope for V2 (future specs)

These are intentionally NOT planned here. Each gets its own spec when prioritized:

- **Crowdsourced bunker polygon contributions** — when users tap "Yes" on the heuristic prompt, those shots are candidate seeds for new polygons. Designing the curation/moderation flow, the polygon-from-points algorithm, the admin review UI, and the conflict resolution is a 2-3 week project on its own.

- **Manual bunker-toggle UI in shot-edit modal** — the existing `EditStatsModal` could gain a `from_bunker` toggle for users who want to fix mis-detected shots. Defer until we have signal that mis-detection is a real complaint.

- **Lie classification beyond bunker** — fairway / rough / green. Requires per-course polygon data we don't have, separate ingestion strategy, separate UX. Scope: 4-6 weeks.

- **Sand save % course leaderboard** — "best sand savers at Royal Melbourne". Cute but not on critical path.

---

## Self-review

**Coverage:**

| V1 spec §15 / review nit | Phase |
|---|---|
| Heuristic prompt fallback when polygons missing | B |
| Manual override toggle in shot-edit modal | Out of scope |
| Crowdsourced bunker polygon contributions | Out of scope |
| Refresh strategy for cached OSM polygons | C |
| Fairway / rough lie classification | Out of scope |
| `CourseStatisticsScreen` always shows "Sand Save: -" | A2 |
| `HoleMapScreen` doesn't tier-gate `useHazardBackfill` | A1 |

**Placeholder scan:** No "TBD" or "implement later" — Phase B has explicit "decide before execution" callouts which are honest about open questions, not placeholders.

**Type/name consistency:** `useSandSaveStats(playerId, courseId?)`, `useSetShotBunker`, `useShouldPromptBunker` — names follow existing project hook naming. View additions reuse existing column conventions.

**Scope:** Three phases that can ship independently. Phase A is concrete and ready. Phase B has design questions but the high-level shape is firm. Phase C is light scaffolding.
