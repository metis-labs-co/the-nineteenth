# Log Additional Shots from the Shots Tab — Design Spec

**Date:** 2026-05-08
**Status:** Draft — pending approval
**Author:** Sam (with Claude)
**Surfaces:** `ShotLogList`, `HoleMapScreen`, View Round Screen → Shots tab, Review Scorecard Screen → Shots tab

> If approved for implementation, this spec should be copied to `docs/superpowers/specs/2026-05-08-log-additional-shots-from-shots-tab-design.md` to match the existing spec doc convention.

---

## Problem

Players sometimes log fewer GPS shots than the strokes they entered for a hole, or forget to log shots for a hole entirely. They want to backfill from the Shots tab on either screen — during a round (Review Scorecard) or after (View Round). Today both screens are read-only for shots; the only path to add a shot is `LogShotInline` on the live scoring screen, which captures the *current* GPS position.

## Goal

Allow a user to add missing shots to a hole from the Shots tab by tapping the position on the hole map, with smart cap behaviour:

- **In-progress round, under cap** (`shots_logged < strokes_scored`): add freely, no prompt.
- **In-progress round, at/over cap** (`shots_logged ≥ strokes_scored`): confirm dialog explains the score will be incremented; on yes, log the shot AND bump the stroke count.
- **Completed round**: strict cap. Hide "Add shot" once `shots_logged ≥ strokes_scored`. No bump path.
- **Hole with no shots and no strokes** (in-progress only): allow adding via a hole picker; the bump path covers strokes 0 → 1.

## Non-Goals

- Editing or adding *other* players' shots (RLS already prevents this).
- A live-GPS path from these tabs (`LogShotInline` remains the live-GPS surface).
- Multi-shot bulk add. One tap, one shot.
- Per-tee custom origins (already covered by `teeOverrideStore`; out of scope here).
- Decrementing strokes (the inverse of the bump). Strokes only ever go up here.

## Behaviour matrix (single hole, current player)

`n` = shots logged, `s` = strokes scored.

| # | n vs s | Round status | Section in list | "Add shot" visible | On confirm |
|---|---|---|---|---|---|
| 1 | n < s | in-progress / completed | rendered | yes | log only |
| 2 | n == s | in-progress | rendered | yes | confirm dialog → bump strokes to n+1 + log |
| 3 | n == s | completed | rendered | hidden | — |
| 4 | n > s | any | rendered | visible (defensive) | log only (data already inconsistent) |
| 5 | n = 0, s > 0 | any | rendered with placeholder | visible per cases above | as 1/2/3 by `n,s` |
| 6 | n = 0, s = 0 | in-progress | not rendered. Reachable via bottom hole-picker. | yes via picker | confirm dialog → bump strokes 0→1 + log |
| 7 | n = 0, s = 0 | completed | not rendered, not reachable | no | — |
| 8 | upcoming round | any | section not rendered, picker hidden | no | — |

## Architecture

### Data flow — reads

- **ViewRoundScreen** already exposes `vm.getPlayerScore(playerId, holeNumber): number` via `useViewRoundPlayerData` (`src/screens/rounds/ViewRoundScreen/hooks/useViewRoundPlayerData.ts:117-129`). Source: `useRoundScorecards` TanStack query (NOT the scorecard store).
- **ReviewScorecardScreen** exposes `getPlayerScore` via the scorecard store (`src/store/scorecardStore.ts:161`). Source: store, hydrated by `initializeRound` when scoring is entered.

Both call sites build a `holeStrokeCounts: Record<number, number>` for the *current user only* and pass it to `ShotLogList`. Holes with strokes but no shots use 0 in the merged set.

### Data flow — writes

Two writes happen on Save in log-shot mode:

1. **Shot insert** — `useLogShot.mutate({ roundId, holeNumber, latitude, longitude, clubKey, accuracyMeters: null })` (`src/hooks/shots/mutations.ts:84`). Caller provides lat/lng; sequence is auto-assigned server-side via `fetchMaxSequence`. `accuracy_meters: null` because this is a manual placement, not a GPS reading.
2. **Strokes bump (conditional)** — only when `n + 1 > s` AND round is in-progress. Use `useScorecardStore.getState().setPlayerScore(playerId, holeNumber, newStrokes)` (`src/store/scoreUpdateSlice.ts:74`). This handles SQLite persistence + sync queue + totals recalc.

**Hydration guard for ViewRoundScreen path**: the scorecard store is hydrated by ReviewScorecardScreen's scoring entry, but ViewRoundScreen reads via TanStack query and doesn't initialize the store. Before calling `setPlayerScore` from a log-shot save initiated via ViewRoundScreen, check `useScorecardStore.getState().currentRoundId !== roundId`; if so, call `loadFromOffline(roundId)` (`src/store/initializeRoundSlice.ts:159`) and await before bumping. If `loadFromOffline` returns false (no SQLite scorecard for this round), fall back to a direct mutation (see "Fallback path" below) to avoid blocking the user.

**Fallback path (direct DB)** — when the store can't be hydrated for the bump:
- Call `saveHoleScore(scorecardId, holeNumber, holeScore)` (re-exported via `src/store/scorecardPersistence.ts:11`) — writes SQLite directly without store dependence.
- Queue the sync via the existing sync queue mechanism.
- Invalidate `useRoundScorecards(roundId)` so ViewRoundScreen re-renders.
- The trade-off is loss of totals recalc; acceptable here because (a) totals are recomputed on next scorecard submit / refetch, and (b) this branch is rare (in-progress round opened directly from ViewRoundScreen with no prior scoring session).

### Component changes

#### `src/components/features/shots/ShotLogList.tsx`

New optional props (backwards compatible — existing callers behave as before until they pass them):

```ts
roundStatus?: 'upcoming' | 'in-progress' | 'completed';
/** Strokes scored per hole for the *current user*. Used to gate the
 *  "Add shot" affordance and to render placeholder sections for holes
 *  with strokes but no shots. */
holeStrokeCounts?: Record<number, number>;
```

Behavior changes:

1. **Merged hole set** — render sections for the union of `(holes appearing in shots) ∪ (holes in holeStrokeCounts where strokes > 0)`. Iterate by ascending hole number.
2. **Placeholder sections** — when a hole has 0 shots but strokes > 0, render a "No shots logged for this hole yet" placeholder body (in place of the per-shot rows).
3. **Per-hole "+ Add shot" button** — sit alongside the existing map icon in the hole header row. Visibility per the table above. Hidden if `courseId == null` (can't open the map).
4. **Bottom "Log shot for another hole"** — for in-progress rounds only. Renders below the last hole section. Tapping opens a hole picker `BottomSheet` listing all holes 1–18 (or the round's hole count) with current `n / s` per hole. Picker is hidden when there are no addable holes.

The "+ Add shot" button navigates:

```ts
navigation.navigate('HoleMap', {
  courseId,
  holeNumber,
  roundId,
  mode: 'log-shot',
  // hints for cap behaviour; HoleMapScreen re-derives `n` from useShotLog at save
  // time to avoid stale-cache bugs, but uses these values for the initial banner UX.
  strokesScoredAtNav: holeStrokeCounts?.[holeNumber] ?? null,
  roundStatus: roundStatus ?? 'in-progress',
});
```

#### `src/screens/scoring/HoleMapScreen.tsx`

New `mode === 'log-shot'` alongside existing `'live' | 'review'`.

- `isLogShot = mode === 'log-shot'`. Add a single derivation near the top.
- GPS auto-prompt remains gated to `isLive` (no change). Log-shot doesn't need user GPS.
- Read `useShotLog(roundId, holeNumber)` already in place.
- New state: `pendingLogPosition: LatLng | null`. Distinct from existing `tap` (distance-to-pin) and `previewCoord` (move flow) — collisions would be confusing.
- Existing `onMapPress` handler grows a branch:

  ```ts
  if (isLogShot && !movingShotId) {
    setPendingLogPosition(e.nativeEvent.coordinate);
    return;
  }
  ```

- Banner render: when `pendingLogPosition` is non-null, render `<LogShotPreviewBanner>` with:
  - `distanceMeters` = `calculateDistance(prior, pendingLogPosition)` where `prior` is the last shot in `shots` (sorted by sequence) or `teeAnchor` if shots is empty.
  - `isAboveCap` = `(s != null && shots.length >= s)`.
  - `onCancel` clears `pendingLogPosition`.
  - `onSave` runs the save flow.

- **Save flow** (`handleLogShotSave`):
  1. Resolve `n = shots.length` (live from `useShotLog`, not nav param).
  2. Resolve `s = strokesScoredAtNav` (from route params; sufficient for the cap check at the moment of save). For cases where the user might navigate to the map before scoring strokes, `s` may be `null` — treated as "no cap known" (allow without prompt).
  3. **Cap check**:
     - `roundStatus === 'completed'` and `s != null && n >= s`: show `Alert.alert('Cannot exceed score', '...')` and abort. (Defensive — button should be hidden.)
     - `roundStatus === 'in-progress'` and `s != null && n + 1 > s`: show `Alert.alert` confirm: `"Log shot ${n+1}? You scored ${s} on this hole, so we'll bump your score to ${n+1}."`. On Cancel: abort. On Confirm: continue to step 4 with `bump = true`.
     - Otherwise: continue with `bump = false`.
  4. **Open `BagClubPickerSheet`** to pick the club. Saving the candidate position into a ref/state so it survives the picker. If user cancels picker → abort, no shot is created. (Atomic.)
  5. **On club picked**:
     - If `bump === true`: hydrate scorecard store if needed (see Hydration guard above), call `setPlayerScore(playerId, holeNumber, n + 1, currentUserId)`. Surface error toast on failure and abort the log.
     - Call `useLogShot.mutate({ roundId, holeNumber, latitude, longitude, clubKey, accuracyMeters: null })`.
     - On `useLogShot` success: clear `pendingLogPosition`, close picker. Optional success toast: `"Shot logged."` (or omit if marker appearing on the trail is feedback enough).
     - On error: keep `pendingLogPosition` so the user can retry.

- **Trail rendering in log-shot mode**: behaves the same as review (`origin={teeAnchor}` etc.). The user sees the trail to date as context for placing the new shot.

- **Other affordances in log-shot mode**:
  - Tee override chooser: still tappable (same logic as review).
  - Existing shot markers: read-only; long-press is disabled (same gate as review). Allowing edit + add together gets confusing.

#### `src/navigation/types.ts`

Extend the `HoleMap` mode union and add new optional params:

```ts
HoleMap: {
  courseId: string;
  holeNumber: number;
  roundId: string;
  mode?: 'live' | 'review' | 'log-shot';
  strokesScoredAtNav?: number | null;
  roundStatus?: 'upcoming' | 'in-progress' | 'completed';
};
```

#### New: `src/components/scorecard/HoleMap/LogShotPreviewBanner.tsx`

Mirrors `MovePreviewBanner.tsx` styling. Props:

```ts
interface LogShotPreviewBannerProps {
  visible: boolean;
  /** Distance from prior shot (or tee) to the pending position. Null when no prior anchor. */
  distanceMeters: number | null;
  /** When true, the Save label changes to "Save & bump score" and the helper text explains. */
  isAboveCap: boolean;
  /** Saving = a save handler is in flight (mutation pending OR strokes-bump pending). */
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  distanceUnit?: 'yards' | 'metres';
}
```

#### New: hole picker bottom sheet

`src/components/features/shots/AddShotHolePickerSheet.tsx` (or inline within `ShotLogList` if simpler). Lists holes 1–N with a per-row badge showing `n / s`. Tapping a row:
- Closes the sheet.
- Navigates to `HoleMap` with `mode: 'log-shot'` for the chosen hole.

For the in-progress, no-strokes hole case (`n=0, s=0`), the chosen hole has `strokesScoredAtNav: 0` → save flow triggers the confirm-and-bump (0 → 1).

### Caller wiring

#### `src/screens/rounds/ViewRoundScreen/index.tsx`

Build strokes for the current user from existing data:

```tsx
const holeStrokeCounts = useMemo(() => {
  if (!vm.user?.id || !round?.course?.holes) return undefined;
  const map: Record<number, number> = {};
  for (const h of round.course.holes) {
    const strokes = vm.getPlayerScore(vm.user.id, h.hole_number);
    if (typeof strokes === 'number' && strokes > 0) map[h.hole_number] = strokes;
  }
  return map;
}, [vm.user?.id, vm.getPlayerScore, round?.course?.holes]);

<ShotLogList
  // ... existing
  roundStatus={round?.status}
  holeStrokeCounts={holeStrokeCounts}
/>
```

#### `src/screens/scoring/ReviewScorecardScreen/index.tsx`

Same shape, sourced from the scorecard store via `useScoreReview()`:

```tsx
const holeStrokeCounts = useMemo(() => {
  if (!currentUserId) return undefined;
  const map: Record<number, number> = {};
  for (let h = 1; h <= totalHoles; h++) {
    const score = useScorecardStore.getState().getPlayerScore(currentUserId, h);
    const strokes =
      score && 'strokes' in score && typeof score.strokes === 'number' ? score.strokes : 0;
    if (strokes > 0) map[h] = strokes;
  }
  return map;
}, [currentUserId, totalHoles, /* re-key on store version */]);
```

(Use a Zustand selector via `useScorecardStore` to subscribe so this rebuilds when scores change. Pseudocode above for clarity.)

### Edge cases & safeguards

- **`courseId === null`**: Add buttons hidden. (Map can't render without it.)
- **Hole without ingested coordinates**: Map opens, `NoCoordinatesFallback` renders. Tap-to-place won't work — fine, user can request backfill from there.
- **No prior anchor (no shots, no tee data)**: distance preview shows `—`. Save proceeds; first-shot distance will be `null` in display.
- **User taps repeatedly**: each tap moves `pendingLogPosition`; banner stays open. Save uses last position.
- **Race — another shot is logged while picker is open**: re-read `n` from cache when the club picker resolves; if cap behaviour now differs (e.g. another client added a shot), re-prompt before continuing. Acceptable rare path.
- **Picker cancelled**: shot NOT inserted, scorecard NOT bumped. Atomic.
- **Bump fails** (e.g. RLS, network): toast error, do NOT log the shot. Atomic.
- **Two-step atomicity**: bump runs before insert. If insert fails after bump, surface toast + roll back the bump? Decision: do NOT auto-rollback. Flag in toast: "Score bumped but shot couldn't be saved — try again." Rolling back automatically is risky if other clients have observed the new score.
- **Multi-ball / scramble / team formats**: out of scope for V1. Gate the affordance: hide "Add shot" when `gameType` requires multi-ball or team scoring (existing `useScorecardStore` exposes `gameType`). Show a small helper text: "Shot logging not yet supported for this format."
- **Stableford/match-play side effects**: bumping strokes on an in-progress hole recomputes totals via `setPlayerScore`'s existing path — same code path as live scoring, no special handling.

## Files modified / added

**Modified:**
- `src/navigation/types.ts` — extend `HoleMap.mode`, add new params
- `src/components/features/shots/ShotLogList.tsx` — props, hole-merging, per-hole button, bottom hole-picker entry
- `src/screens/scoring/HoleMapScreen.tsx` — `log-shot` mode, banner, save flow
- `src/screens/rounds/ViewRoundScreen/index.tsx` — pass `roundStatus` + `holeStrokeCounts`
- `src/screens/scoring/ReviewScorecardScreen/index.tsx` — pass `roundStatus` + `holeStrokeCounts`

**New:**
- `src/components/scorecard/HoleMap/LogShotPreviewBanner.tsx`
- `src/components/features/shots/AddShotHolePickerSheet.tsx` (or inline in ShotLogList)

**Reused (no changes):**
- `useLogShot` (`src/hooks/shots/mutations.ts:84`)
- `useShotLog` (`src/hooks/shots/queries.ts`) — for the live `n` count
- `setPlayerScore` (`src/store/scoreUpdateSlice.ts:74`)
- `loadFromOffline` (`src/store/initializeRoundSlice.ts:159`)
- `BagClubPickerSheet` (`src/components/features/bag/BagClubPickerSheet.tsx`)
- `calculateDistance`, `metersToYards` (`src/utils/gpsCalculations.ts`)
- Existing `ShotTrail`, `MapMarkerSet`, `RecenterButton` — render unchanged

## Implementation order

1. **Navigation type** — extend `HoleMap` route params (1 line union + 2 optional fields).
2. **`LogShotPreviewBanner`** — new component (~80 lines, mirrors `MovePreviewBanner` structure).
3. **`HoleMapScreen` log-shot mode** — state, `onMapPress` branch, banner render, save handler with cap-check + bump + insert. Test in isolation by navigating directly with a hardcoded route.
4. **`ShotLogList` updates** — new props, hole-merging logic, per-hole button rendering, hole-picker entry button. Default behaviour preserved when new props are absent.
5. **`AddShotHolePickerSheet`** — new picker sheet for the missing-hole case.
6. **Caller wiring** — `ViewRoundScreen` and `ReviewScorecardScreen` build & pass `holeStrokeCounts` + `roundStatus`.
7. **Type-check + smoke test** — `pnpm type-check`. Manual test the verification scenarios below.

## Verification

1. **Under cap, no prompt**:
   - In-progress round, hole 5 has `n=3, s=4`.
   - Tap "+ Add shot" on the hole row → HoleMap opens in log-shot mode.
   - Tap a position → banner shows distance from shot 3 → Save → club picker → pick → shot 4 appears in trail and Shots tab. Score remains 4.

2. **In-progress, exceed cap → bump**:
   - Hole with `n=4, s=4`, in-progress. Tap "+ Add shot" → place → Save.
   - Confirm dialog: "Log shot 5? You scored 4 on this hole, so we'll bump your score to 5." → Confirm.
   - Pick club. Verify: Shots tab shows shot 5, scorecard total reflects strokes=5 for that hole.

3. **Completed round — strict cap**:
   - Completed round; hole with `n=s=4`: button hidden.
   - Same round; hole with `n=3, s=4`: button visible. Add a shot → no prompt → shot 4 saved. No score change.

4. **Missing hole entirely (in-progress)**:
   - Round in-progress, hole 7 has no shots and no strokes scored.
   - On the Shots tab, tap "Log shot for another hole" at the bottom → picker → tap hole 7.
   - HoleMap opens. Place → Save → confirm dialog "Log shot 1? You scored 0..." → Confirm.
   - Pick club → shot 1 appears, hole 7 score becomes 1.

5. **Hole with 0 shots and strokes set**:
   - Hole `n=0, s=4`: section renders with placeholder + "+ Add shot" button. Tap → place → save (no prompt) → shot 1 of 4 added.

6. **Cross-screen**: verify cases 1–5 work identically via Review Scorecard → Shots tab AND via View Round → Shots tab (in-progress).

7. **Hydration fallback**: open ViewRoundScreen for an in-progress round WITHOUT first entering the scoring screen. Try case 2 (bump). Confirm: store hydrates from SQLite via `loadFromOffline`, bump succeeds, shot saved.

8. **Atomicity**:
   - Cancel the club picker after dialog confirm → verify NO shot inserted, NO score bumped.
   - Force a network error during shot insert (after bump) → toast surfaces, score remains bumped (no auto-rollback) — verify toast wording is honest.

9. **Type check**: `pnpm type-check` clean for modified files.

## Open questions / future work

- **Multi-ball / team formats**: V1 hides "Add shot" for these. Future work to support multi-ball logging per ball.
- **Animated banner entrance** to match `MovePreviewBanner` polish (deferred).
- **Undo toast** after a shot is added (optional polish).
- **Atomic rollback** on insert-after-bump failure: deliberately deferred (see edge cases). Could add later with a retry mechanism.
- **Hole picker UX detail**: a single picker sheet vs always rendering all 18 hole sections. V1 picks the picker for screen real estate. If users find it discoverable enough we keep it.

---

