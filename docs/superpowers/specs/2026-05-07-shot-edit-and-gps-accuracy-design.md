# Shot Edit & GPS Accuracy — Design

**Date:** 2026-05-07
**Status:** Approved (brainstormed)
**Author:** Sam (with Claude)
**Surface:** `HoleMapScreen` (live mode), `LogShotInline`

## Problem

Players using the GPS shot-logging feature have hit two related issues:

1. **No accuracy validation at log time.** When GPS quality is poor (tree cover, weather, basement clubhouse), `getCurrentPositionAsync` may return a coordinate that is 20–50m off true position. The current `LogShotInline.tsx` accepts whatever comes back and persists it without any signal to the user that the reading was weak. The result is a shot row whose distance is measurably wrong and indistinguishable from a good one on the map.
2. **The correction path is hidden and unforgiving.** Repositioning a logged shot today requires: tap the marker → action sheet → "Move on map" → tap a new spot — and the new position commits immediately on tap, with no preview of the recalculated distance. Most users don't discover the flow, and those who do can't see the impact of their move before it lands.

A separate, related bug — the first-shot tee origin uses a generic `tee_back` / `tee_front` POI from `hole_coordinates` rather than the player's selected tee colour — is acknowledged but **out of scope here**. It needs schema/data work that warrants its own design.

## Goal

- Log every shot regardless of GPS quality, but tag low-confidence shots so users know which ones to revisit.
- Make the move flow fast (one gesture to enter), reversible (preview before committing), and informative (show both the moved shot's new distance *and* the knock-on change to the next shot).

## Non-Goals

- Per-tee-colour tee origin coordinates (deferred — separate design).
- Editing shots in `HoleMapScreen`'s read-only / review mode.
- A new permission surface — editing a shot inherits the same rule as logging it.
- True drag-the-marker interaction (`react-native-maps` `draggable` prop). Considered and rejected: fights map panning, fragile across iOS/Android.
- Blocking dialogs or retry prompts on weak GPS — never block the player mid-round.

## Scope

| Surface | Change |
|---|---|
| **`HoleMapScreen`** (live mode) | Move-flow polish: long-press entry, ghost-pin preview, Save/Cancel banner. Markers render a dashed outer ring when `accuracy_meters > 10`. |
| **`LogShotInline`** (scorecard quick-log) | After logging, if reported `accuracy > 10m`, show inline warning toast. The shot is logged regardless. |
| **`HoleMapScreen`** review mode | Unchanged. No edit affordance. |

## Architecture

### File layout

```
supabase/migrations/
  <ts>_add_shot_log_accuracy.sql       [NEW] — adds accuracy_meters column

src/
  types/
    models.ts                          [edit] — add accuracy_meters to ShotLogEntry

  hooks/shots/
    mutations.ts                       [edit] — useLogShot persists accuracy;
                                                useUpdateShot clears it

  utils/
    shotDistances.ts                   [edit] — new recomputeAfterMove() helper

  components/
    scorecard/ShotLogging/
      LogShotInline.tsx                [edit] — pass accuracy to mutation;
                                                trigger warning toast above threshold
      InlineShotToast.tsx              [edit] — add variant="warning"
    scoring/
      MovePreviewBanner.tsx            [NEW] — ghost-pin Save/Cancel banner
      MovePreviewBanner.test.tsx       [NEW]

  screens/scoring/
    HoleMapScreen.tsx                  [edit] — long-press handler,
                                                previewCoord state,
                                                MovePreviewBanner integration

  __tests__/utils/
    shotDistances.test.ts              [edit/NEW] — recomputeAfterMove tests
```

## Data layer

### Migration

```sql
ALTER TABLE shot_log
  ADD COLUMN accuracy_meters DECIMAL NULL;
```

Legacy rows remain `NULL`. NULL is treated as "trusted" — no warning ring is rendered for legacy shots.

### Mutation behaviour

| Hook | Change |
|---|---|
| `useLogShot` | Reads `accuracy` from `getCurrentPositionAsync()` and writes it into `accuracy_meters`. |
| `useUpdateShot` | On a manual reposition, sets `accuracy_meters = NULL`. The user has overridden the position, so the warning ring should clear. |
| `useSetShotClub` | Unchanged. |
| `useDeleteShot` | Unchanged. |

### Type changes

`ShotLogEntry` (in `src/types/models.ts`) gains:

```typescript
accuracy_meters: number | null;
```

## Accuracy gate (`LogShotInline`)

**Threshold:** 10 metres.

After a successful log:

- `accuracy ≤ 10m`: no UX change.
- `accuracy > 10m` *or* `accuracy == null`: render `InlineShotToast` with the new `variant="warning"` prop. Copy: *"⚠ Weak GPS — tap the shot on the map to reposition."*

The shot is persisted in both cases. The toast is non-blocking — it auto-dismisses with the existing toast timer.

## Marker rendering (`HoleMapScreen`)

Shots with `accuracy_meters > 10` render with a dashed outer ring:

- Diameter 8px greater than the regular marker.
- Stroke colour `colors.warning` from theme.
- Dash pattern `[4, 4]`.
- Static styling, no extra hooks; a small `<ShotMarker accuracy={…} />` prop addition.

Shots with `accuracy_meters ≤ 10` or `NULL` render unchanged.

## Move-flow UX (`HoleMapScreen`, live mode only)

### Entry — two paths supported

1. **Long-press a shot marker** — the new fast path. `onLongPress` on the marker sets `movingShotId` directly.
2. **Tap shot → action sheet → "Move on map"** — entry is unchanged (the action sheet still hosts Delete and Change Club too). However, both paths now route through the same `previewCoord` → banner → Save/Cancel flow. The current "tap-on-map commits immediately" behaviour is replaced — every reposition now passes through the preview banner, regardless of how move mode was entered.

### State

`HoleMapScreen` extends its existing `movingShotId` state:

```typescript
const [movingShotId, setMovingShotId] = useState<string | null>(null);
const [previewCoord, setPreviewCoord] = useState<LatLng | null>(null);
```

### Behaviour

1. Entering move mode dims the original marker to 40% opacity (kept rendered as a reference).
2. The first map tap drops a **ghost pin** at the tapped coordinate; `previewCoord` is set.
3. Subsequent taps on the map move the ghost pin (replace `previewCoord`).
4. While `previewCoord` is set, `MovePreviewBanner` renders at the bottom of the screen showing the recalculated distances and Save/Cancel actions.

### Distance recalculation

A new pure helper in `src/utils/shotDistances.ts`:

```typescript
export function recomputeAfterMove(
  shots: ShotLogEntry[],
  movedIndex: number,
  newCoord: LatLng,
  teeAnchor: LatLng | null
): {
  movedNew: number | null;        // shot[movedIndex]'s new distance from prev (or tee for index 0)
  movedOriginal: number | null;
  nextNew: number | null;         // shot[movedIndex + 1]'s new distance, or null if no next shot
  nextOriginal: number | null;
};
```

Pure, takes the existing shots array plus an override coord, returns the four numbers needed by the banner. Unit-testable without mounting the map.

### Save / Cancel

- **Save** fires the existing `useUpdateShot({ shotId, roundId, holeNumber, latitude, longitude })`. The mutation's update path also clears `accuracy_meters` (see Data layer). On settle: clear `movingShotId` and `previewCoord`.
- **Cancel** clears `movingShotId` and `previewCoord` only. No mutation. Original shot remains untouched.

### `MovePreviewBanner` component

`src/components/scoring/MovePreviewBanner.tsx`:

```typescript
interface MovePreviewBannerProps {
  shotNumber: number;             // human-friendly: shot #3
  movedOriginal: number | null;   // metres
  movedNew: number;               // metres
  nextShotNumber: number | null;
  nextOriginal: number | null;
  nextNew: number | null;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}
```

Pure presentational. Uses `useThemeColors` and the standard static tokens (`spacing`, `typography`, `shadows`, `borderRadius`). Approximately 80 lines. Renders distance values converted to yards (existing `metersToYards` util) to match the rest of the scoring UI.

If `nextOriginal` is `null` (the moved shot is the last shot for that hole), only the moved row is rendered.

## Error handling

- `useUpdateShot` failure: existing error path is preserved. Banner stays open with a transient error toast; user can retry Save or Cancel.
- `useLogShot` failure: existing error path. Warning toast is suppressed (only show on success).
- A move that produces an obviously bogus distance (e.g. > 800 yards) is allowed — the user is in control. We don't second-guess manual repositions.

## Testing

### Unit (`shotDistances.test.ts`)

- `recomputeAfterMove` returns correct distances when the moved shot is in the middle of a sequence.
- Edge case: moved shot is index 0 (uses `teeAnchor` as the previous point); `teeAnchor === null` → `movedNew === null`.
- Edge case: moved shot is the last shot → `nextNew === null`, `nextOriginal === null`.
- Edge case: only one shot exists → `nextNew === null`.

### Mutations

- `useLogShot` writes `accuracy_meters` from input.
- `useUpdateShot` writes `accuracy_meters: null` on every update.

### Component (`MovePreviewBanner.test.tsx`)

- Renders both rows when `nextOriginal !== null`.
- Renders only the moved row when `nextOriginal === null`.
- `onSave` invoked on Save tap; `onCancel` invoked on Cancel tap.
- Disables both buttons while `isSaving` is true.
- `InlineShotToast` warning variant uses `colors.warning` and the warning copy.

### Manual / device

- Log a shot with mocked `accuracy = 25` → see warning toast and dashed ring on the marker once it appears on the map.
- Long-press a marker → pin dims, banner does *not* yet appear.
- Tap a new spot → ghost pin appears, banner shows correct moved + next distances.
- Tap a different spot → ghost pin moves, banner updates.
- Save → mutation fires, marker moves, dashed ring clears, banner dismisses.
- Cancel → no DB write, marker returns to full opacity, banner dismisses.
- Existing tap → action sheet → "Move on map" path still routes through the same `previewCoord` flow.
- Read-only / review mode: long-press does nothing; action sheet does not appear.

## Rollout

Single PR. No feature flag — the change is additive:

- New nullable column with NULL default; existing rows render as today.
- New banner is only mounted when `previewCoord !== null`, which is unreachable until a user enters move mode.
- The accuracy gate emits a warning but never blocks logging, so the worst-case regression is "user sees a warning when they didn't before".

Migration ordering: the SQL migration must land before the app code that reads `accuracy_meters`. The app code already handles `NULL`, so a brief mid-deploy gap is safe.

## Open questions

None — all clarified during brainstorm.
