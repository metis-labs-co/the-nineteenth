# Live-shifting rows during rounds reorder

**Date:** 2026-07-09
**Screen:** Competition Detail → Rounds tab
**Files:** `src/components/competitions/detail/RoundsTab.tsx` (primary), `src/components/competitions/detail/CompetitionRoundCard.tsx` (unchanged behaviourally)

## Problem

Organizers reorder rounds by long-pressing a card and dragging it. Today **only the dragged card moves** — every other card sits completely still. The final drop position is computed from the pan distance *on release* (`RoundsTab.tsx` `finishDrag`), so the user gets no indication of where the card will land until they let go.

The desired behaviour is the standard draggable-list feel: as the dragged card hovers over/between the other cards, the static cards **part to open a gap**, showing exactly where the drop will happen.

The original author anticipated this — `handleActiveChange` is a deliberate no-op commented *"Hook left in place for future polish (e.g. dimming non-active rows)"* (`RoundsTab.tsx:264-267`).

## Approach

Extend the existing hand-rolled `react-native-gesture-handler` implementation. **No new dependency, no library swap** — a drag library (e.g. `react-native-draggable-flatlist`) is itself a virtualized scroll list and nesting one inside the outer competition-detail `ScrollView` is a known RN anti-pattern (scroll fights, warnings). The custom gesture stays; we only add the sibling-shift feedback.

Constraint chosen by the user: **uniform row-height** (no per-row measurement, matching today's release math). No auto-scroll-at-edges (out of scope).

## Mechanism

### Shared state lifted into `RoundsTab`

Two Reanimated shared values, owned by the parent and passed to every `DraggableRow`:

- `activeIndex: SharedValue<number>` — index of the dragged row, `-1` when idle.
- `activeOffsetY: SharedValue<number>` — the dragged row's live pan `translationY`.

Plus a `slotHeight` shared value mirrored from measured layout (see below) so all row worklets read a consistent, current value.

### Per-row computation (UI thread)

Each row derives its target shift from the shared values:

```
hoverIndex = clamp(activeIndex + round(activeOffsetY / slotHeight), 0, count - 1)

shift =
  0            if activeIndex < 0, or index === activeIndex, or slotHeight <= 0
  -slotHeight  if activeIndex <  index && index <= hoverIndex   // dragging down → slide up to fill
  +slotHeight  if hoverIndex  <= index && index <  activeIndex   // dragging up   → slide down
  0            otherwise

translateY = dragY.value + withTiming(shift, { duration: 150 })
```

- **Active row:** `shift` resolves to 0 (excluded via `index === activeIndex`); `dragY` follows the finger; renders on top via elevated `zIndex`/`elevation`. Unchanged from today.
- **Sibling rows:** `dragY` stays 0; they timing-animate `shift` open/closed as the rounded `hoverIndex` crosses them. Rounding produces the "snap once you pass the halfway point of a row" feel and keeps the gap consistent with the release index.
- **Idle rows:** both terms 0.

A single combined `translateY = dragY + shift` per row composes all three cases cleanly — no branching in the style.

### Gesture handlers (active row writes shared state)

Building on the existing `LongPress(300ms)` + `Pan` (`Gesture.Simultaneous`) composition:

- `longPress.onStart`: `elevated = 1`; `activeIndex.value = index`; `runOnJS(setActive)(true)`.
- `pan.onUpdate`: `dragY.value = e.translationY`; `activeOffsetY.value = e.translationY`.
- `pan.onEnd`: `runOnJS(finishDrag)(e.translationY)`; `dragY = withTiming(0, 180)`; `elevated = 0`; `activeIndex.value = -1`; `activeOffsetY.value = 0`; `runOnJS(setActive)(false)`.
- `onFinalize` (safety net for cancelled gestures): same resets.

`finishDrag` keeps its existing shape — `newIndex = clamp(index + round(translationY / slotHeight))` then `onMove(index, newIndex)` — now dividing by `slotHeight` (see fix below) so it agrees exactly with `hoverIndex`.

### Why the release stays seamless

React state order changes **only on release** (already true today — during drag everything is transform offsets). Because each row keeps `key={round.id}`, when the reordered data lands each row moves to a new base slot, and that base-slot change **exactly cancels** the `shift` we simultaneously remove. So siblings don't jump; only the dropped card's `dragY` animates to 0 (the existing drop-settle). This base/shift compensation is what makes the transition clean without a data flash.

**Risk / QA focus:** the reset of `activeIndex`/`activeOffsetY` (worklet) and the `onReorder` React state update (via `runOnJS`) happen on different timings. If the shift zeroes a frame before the reorder lands, a sibling can flicker one slot. The 150ms sibling timing masks this, and the compensation guarantees the *final* state is correct, but the release transition must be verified flicker-free on-device and the sibling timing tuned if needed. This is the single trickiest part of the implementation.

## Correctness fix: `slotHeight`

The `row` style has `marginBottom: spacing.md` (16px), but `onLayout` measures the card height **without** margin. Today's `finishDrag` divides the pan distance by that under-sized height, so the drag advances an index slightly early.

Fix: define one **`slotHeight = measuredCardHeight + spacing.md`** and use it for *both* the sibling `shift` magnitude and the release index computation. This aligns the visual gap with where the card actually drops and removes the pre-existing imprecision. `slotHeight` locks to the first non-zero measurement (as `rowHeight` does today) and is mirrored into a shared value for the worklets.

## Testability

Extract the pure logic as standalone, unit-tested functions (Jest):

- `getHoverIndex(activeIndex, activeOffsetY, slotHeight, count): number`
- `computeReorderShift(index, activeIndex, hoverIndex): -1 | 0 | 1` (returns a direction; caller multiplies by `slotHeight`)

These cover the index arithmetic and the up/down/no-shift ranges. The animation itself (timing, gesture, elevation) remains manual on-device QA.

The `handleActiveChange` no-op hook is retired (replaced by the real shared-state wiring).

## Out of scope (YAGNI)

- New drag/reorder dependency or library swap.
- Per-row variable-height measurement.
- Auto-scroll when dragging near the top/bottom edge of the viewport.
- Any change to how the new order is persisted (`onReorder` contract is unchanged: full array of round IDs).

## Acceptance criteria

1. While dragging a round, the other cards animate to open a gap at the projected drop position, updating live as the drag crosses row boundaries.
2. The opened gap matches the size of a round slot (card + margin).
3. On release the card drops into the gap and the list settles into the new order with no visible flicker/jump.
4. The persisted order (`onReorder` payload) matches the visually-shown drop position in all cases.
5. Non-organizers and single-round lists are unaffected (no drag, no shift).
6. Vertical scroll of the parent still passes through when the user swipes without holding for 300ms.
7. `getHoverIndex` and `computeReorderShift` have passing unit tests.
