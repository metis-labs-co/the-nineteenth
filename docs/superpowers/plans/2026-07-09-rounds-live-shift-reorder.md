# Rounds Live-Shift Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an organizer drags a round to reorder it, the other round cards animate to open a gap at the projected drop position, so the drop target is visible during the drag.

**Architecture:** Extend the existing hand-rolled `react-native-gesture-handler` reorder in `RoundsTab.tsx`. Lift two Reanimated shared values (`activeIndex`, `activeOffsetY`) into the parent `RoundsTab`; each `DraggableRow` reads them, computes a live hover index, and animates a `±slotHeight` transform to open the gap. The index arithmetic is extracted into pure, unit-tested helper functions.

**Tech Stack:** React Native, TypeScript, `react-native-gesture-handler` (Gesture API), `react-native-reanimated` (shared values / worklets), Jest.

## Global Constraints

- No new dependency; do NOT swap in a drag/reorder library (`react-native-draggable-flatlist` etc.). The rounds list lives inside the competition-detail `ScrollView`; nesting a virtualized list there is a known RN anti-pattern.
- Uniform row-height model — do NOT add per-row variable-height measurement.
- No auto-scroll-at-edges.
- `onReorder` contract is unchanged: it receives the full new ordering as an array of round IDs, index 0 first.
- Styling per project rules: static tokens (`spacing`, `typography`) imported from `@/constants/theme`; dynamic colors via the passed `colors` prop. Reference: `docs/superpowers/specs/2026-07-09-rounds-live-shift-reorder-design.md`.
- Non-organizers and single-round lists must remain unaffected (no drag, no shift).

---

### Task 1: Pure reorder-math helpers with unit tests

Extract the index arithmetic that drives both the live gap and the release drop into standalone, testable functions. No UI/animation here.

**Files:**
- Create: `src/components/competitions/detail/reorderMath.ts`
- Test: `src/components/competitions/detail/reorderMath.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `clampIndex(value: number, count: number): number` — clamps to `[0, count - 1]`; returns `0` when `count <= 0`.
  - `getHoverIndex(activeIndex: number, activeOffsetY: number, slotHeight: number, count: number): number` — the index the dragged row currently hovers over. Returns `activeIndex` unchanged when `slotHeight <= 0`. Otherwise `clampIndex(activeIndex + Math.round(activeOffsetY / slotHeight), count)`.
  - `computeReorderShift(index: number, activeIndex: number, hoverIndex: number): -1 | 0 | 1` — direction a *sibling* row shifts (caller multiplies by `slotHeight`). Returns `0` when `activeIndex < 0` or `index === activeIndex`. Returns `-1` (slide up to fill) when `activeIndex < index && index <= hoverIndex`. Returns `+1` (slide down) when `hoverIndex <= index && index < activeIndex`. Otherwise `0`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/components/competitions/detail/reorderMath.test.ts
import { clampIndex, getHoverIndex, computeReorderShift } from './reorderMath';

describe('clampIndex', () => {
  it('clamps below zero to zero', () => {
    expect(clampIndex(-3, 5)).toBe(0);
  });
  it('clamps above the last index', () => {
    expect(clampIndex(9, 5)).toBe(4);
  });
  it('returns zero for an empty list', () => {
    expect(clampIndex(2, 0)).toBe(0);
  });
  it('passes an in-range value through', () => {
    expect(clampIndex(2, 5)).toBe(2);
  });
});

describe('getHoverIndex', () => {
  const count = 4; // indices 0..3, slot height 100
  it('returns the active index when offset is within half a slot', () => {
    expect(getHoverIndex(0, 40, 100, count)).toBe(0);
  });
  it('advances one index once past the halfway point downward', () => {
    expect(getHoverIndex(0, 60, 100, count)).toBe(1);
  });
  it('moves upward for negative offset past halfway', () => {
    expect(getHoverIndex(2, -60, 100, count)).toBe(1);
  });
  it('clamps at the bottom of the list', () => {
    expect(getHoverIndex(3, 500, 100, count)).toBe(3);
  });
  it('clamps at the top of the list', () => {
    expect(getHoverIndex(0, -500, 100, count)).toBe(0);
  });
  it('returns the active index unchanged when slot height is zero', () => {
    expect(getHoverIndex(2, 300, 0, count)).toBe(2);
  });
});

describe('computeReorderShift', () => {
  // Dragging active row 0 downward to hover index 2:
  it('slides up rows between the old slot and the hover target (dragging down)', () => {
    expect(computeReorderShift(1, 0, 2)).toBe(-1);
    expect(computeReorderShift(2, 0, 2)).toBe(-1);
  });
  it('leaves rows beyond the hover target untouched (dragging down)', () => {
    expect(computeReorderShift(3, 0, 2)).toBe(0);
  });
  // Dragging active row 3 upward to hover index 1:
  it('slides down rows between the hover target and the old slot (dragging up)', () => {
    expect(computeReorderShift(1, 3, 1)).toBe(1);
    expect(computeReorderShift(2, 3, 1)).toBe(1);
  });
  it('leaves rows above the hover target untouched (dragging up)', () => {
    expect(computeReorderShift(0, 3, 1)).toBe(0);
  });
  it('never shifts the active row itself', () => {
    expect(computeReorderShift(0, 0, 2)).toBe(0);
    expect(computeReorderShift(3, 3, 1)).toBe(0);
  });
  it('returns zero shift when nothing is active', () => {
    expect(computeReorderShift(1, -1, -1)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- src/components/competitions/detail/reorderMath.test.ts`
Expected: FAIL — `Cannot find module './reorderMath'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/components/competitions/detail/reorderMath.ts
/**
 * Pure index arithmetic for the rounds drag-to-reorder interaction.
 *
 * These helpers are shared by the live gap (which sibling rows shift, and by
 * how much) and by the drop math on release, so both always agree on where a
 * dragged round lands. They contain no UI/animation — see RoundsTab.tsx for
 * the gesture and Reanimated wiring that calls them on the UI thread.
 *
 * Assumes a uniform slot height (card height + row margin).
 */

/** Clamp `value` to a valid list index in `[0, count - 1]`. Empty list -> 0. */
export function clampIndex(value: number, count: number): number {
  'worklet';
  if (count <= 0) return 0;
  if (value < 0) return 0;
  if (value > count - 1) return count - 1;
  return value;
}

/**
 * The index the dragged row currently hovers over, given how far it has been
 * panned from its original slot. Rounds at the half-slot boundary so the gap
 * snaps once the drag passes the midpoint of a row. Returns `activeIndex`
 * unchanged when `slotHeight` has not been measured yet.
 */
export function getHoverIndex(
  activeIndex: number,
  activeOffsetY: number,
  slotHeight: number,
  count: number
): number {
  'worklet';
  if (slotHeight <= 0) return activeIndex;
  const delta = Math.round(activeOffsetY / slotHeight);
  return clampIndex(activeIndex + delta, count);
}

/**
 * Direction a *sibling* row should shift to open the gap, as a signed unit the
 * caller multiplies by `slotHeight`:
 *   -1  slide up to fill the vacated slot (dragging downward)
 *   +1  slide down                        (dragging upward)
 *    0  no shift (idle, the active row itself, or outside the affected range)
 */
export function computeReorderShift(
  index: number,
  activeIndex: number,
  hoverIndex: number
): -1 | 0 | 1 {
  'worklet';
  if (activeIndex < 0) return 0;
  if (index === activeIndex) return 0;
  if (activeIndex < index && index <= hoverIndex) return -1;
  if (hoverIndex <= index && index < activeIndex) return 1;
  return 0;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/components/competitions/detail/reorderMath.test.ts`
Expected: PASS — all describe blocks green.

- [ ] **Step 5: Type-check**

Run: `pnpm type-check`
Expected: no new errors from `reorderMath.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/components/competitions/detail/reorderMath.ts src/components/competitions/detail/reorderMath.test.ts
git commit -m "feat(rounds): pure reorder-math helpers for live-shift drag"
```

---

### Task 2: Wire live-shift into RoundsTab

Lift shared drag state into `RoundsTab`, feed it to each `DraggableRow`, and apply the sibling shift + release fix. This is an animation/gesture change verified on-device; it has no unit test.

**Files:**
- Modify: `src/components/competitions/detail/RoundsTab.tsx`

**Interfaces:**
- Consumes from Task 1: `getHoverIndex`, `computeReorderShift` from `./reorderMath`.
- Produces: no exported API change. `RoundsTabProps` and the `onReorder` contract are unchanged.

- [ ] **Step 1: Import the helpers and reanimated pieces**

At the top of `RoundsTab.tsx`, add `useDerivedValue` and `useAnimatedReaction` are NOT needed; only add the helper import. Update the existing imports:

Add to the `react-native-reanimated` import (it currently imports `runOnJS, useAnimatedStyle, useSharedValue, withTiming`) — no change needed there, all four are already imported.

Add a new import line after the existing local imports (near the `CompetitionRoundCard` import):

```typescript
import { getHoverIndex, computeReorderShift } from './reorderMath';
```

Add `spacing` is already imported from `@/constants/theme`; confirm it is (it is used by styles). No import change required for `spacing`.

- [ ] **Step 2: Change `DraggableRow` props to receive shared drag state**

Replace the `DraggableRowProps` interface (currently `RoundsTab.tsx:77-86`) with:

```typescript
interface DraggableRowProps {
  index: number;
  totalCount: number;
  reorderEnabled: boolean;
  slotHeight: number;
  /** Parent-owned: index of the row being dragged, -1 when idle. */
  activeIndex: Animated.SharedValue<number>;
  /** Parent-owned: live pan translationY of the dragged row. */
  activeOffsetY: Animated.SharedValue<number>;
  onMove: (fromIndex: number, toIndex: number) => void;
  onLayout: (e: LayoutChangeEvent) => void;
  children: (isDragging: boolean) => React.ReactNode;
}
```

Note: `rowHeight` is renamed to `slotHeight`, `onActiveChange` is removed.

- [ ] **Step 3: Rewrite the `DraggableRow` body**

Replace the whole `DraggableRow` function (currently `RoundsTab.tsx:88-189`) with:

```typescript
function DraggableRow({
  index,
  totalCount,
  reorderEnabled,
  slotHeight,
  activeIndex,
  activeOffsetY,
  onMove,
  onLayout,
  children,
}: DraggableRowProps) {
  // This row's own finger-follow translation (non-zero only while IT is the
  // dragged row). Siblings keep this at 0 and move via the shift term instead.
  const dragY = useSharedValue(0);
  const elevated = useSharedValue(0);
  // Mirrors the active flag so the child card (which runs its wiggle from a
  // prop) re-renders when this row's drag starts/ends.
  const [isActive, setIsActive] = useState(false);

  const finishDrag = useCallback(
    (translationY: number) => {
      if (slotHeight <= 0) return;
      const indexDelta = Math.round(translationY / slotHeight);
      const newIndex = Math.max(0, Math.min(totalCount - 1, index + indexDelta));
      if (newIndex !== index) {
        onMove(index, newIndex);
      }
    },
    [index, totalCount, slotHeight, onMove]
  );

  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_MS)
    .enabled(reorderEnabled)
    .onStart(() => {
      'worklet';
      elevated.value = 1;
      activeIndex.value = index;
      activeOffsetY.value = 0;
      runOnJS(setIsActive)(true);
    })
    .onFinalize(() => {
      'worklet';
      // If the pan never engaged (finger lifted right after the long-press),
      // release the elevated/active state and clear the shared drag flag.
      if (dragY.value === 0) {
        elevated.value = 0;
        activeIndex.value = -1;
        activeOffsetY.value = 0;
        runOnJS(setIsActive)(false);
      }
    });

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .enabled(reorderEnabled)
    .onUpdate((e) => {
      'worklet';
      dragY.value = e.translationY;
      activeOffsetY.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      runOnJS(finishDrag)(e.translationY);
      dragY.value = withTiming(0, { duration: 180 });
      elevated.value = 0;
      activeIndex.value = -1;
      activeOffsetY.value = 0;
      runOnJS(setIsActive)(false);
    })
    .onFinalize(() => {
      'worklet';
      // Safety net for cancelled gestures.
      dragY.value = withTiming(0, { duration: 180 });
      elevated.value = 0;
      activeIndex.value = -1;
      activeOffsetY.value = 0;
      runOnJS(setIsActive)(false);
    });

  const composed = Gesture.Simultaneous(longPress, pan);

  const animatedStyle = useAnimatedStyle(() => {
    const hover = getHoverIndex(
      activeIndex.value,
      activeOffsetY.value,
      slotHeight,
      totalCount
    );
    const shiftDir = computeReorderShift(index, activeIndex.value, hover);
    const shift = withTiming(shiftDir * slotHeight, { duration: 150 });
    return {
      transform: [{ translateY: dragY.value + shift }],
      zIndex: elevated.value ? 100 : 1,
      elevation: elevated.value ? 12 : 0,
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.row, animatedStyle]} onLayout={onLayout}>
        {children(isActive)}
      </Animated.View>
    </GestureDetector>
  );
}
```

- [ ] **Step 4: Add shared values and slotHeight in `RoundsTab`**

Inside the `RoundsTab` component body, replace the `rowHeight` state block (currently `RoundsTab.tsx:241-251`) and the `handleActiveChange` callback (currently `RoundsTab.tsx:264-267`) with the following. Keep the `handleMove` callback (`RoundsTab.tsx:253-262`) as-is.

Add near the other hooks (after `const { showToast } = useToast();`):

```typescript
  // Parent-owned drag state, shared with every DraggableRow so siblings can
  // compute where the dragged card is hovering and shift to open a gap.
  const activeIndex = useSharedValue(-1);
  const activeOffsetY = useSharedValue(0);

  // A "slot" is one card plus its bottom margin. onLayout measures the card
  // without margin, so we add spacing.md back to keep the opened gap and the
  // release drop index aligned. Lock to the first non-zero measurement so the
  // math stays stable across re-renders (the active card scales during drag).
  const [slotHeight, setSlotHeight] = useState(0);
  const handleRowLayout = useCallback((e: LayoutChangeEvent) => {
    const measured = e.nativeEvent.layout.height;
    if (measured > 0) {
      setSlotHeight((current) => (current === 0 ? measured + spacing.md : current));
    }
  }, []);
```

Delete the old `handleActiveChange` callback entirely.

- [ ] **Step 5: Update the `DraggableRow` usage in the render**

Replace the `<DraggableRow ...>` JSX (currently `RoundsTab.tsx:323-336`) with:

```typescript
            return (
              <DraggableRow
                key={round.id}
                index={index}
                totalCount={rounds.length}
                reorderEnabled={canReorder}
                slotHeight={slotHeight}
                activeIndex={activeIndex}
                activeOffsetY={activeOffsetY}
                onMove={handleMove}
                onLayout={handleRowLayout}
              >
                {renderCard}
              </DraggableRow>
            );
```

- [ ] **Step 6: Type-check and lint**

Run: `pnpm type-check`
Expected: no errors. (If `Animated.SharedValue` is flagged, it is exported from `react-native-reanimated` via the default `Animated` namespace already imported; the type resolves.)

Run: `pnpm lint -- src/components/competitions/detail/RoundsTab.tsx`
Expected: no new errors. Confirm there are no unused-symbol warnings for the removed `handleActiveChange`.

- [ ] **Step 7: Run the existing detail test suite for regressions**

Run: `pnpm test -- src/components/competitions/detail`
Expected: PASS (or unchanged vs. the pre-existing baseline — this task adds no unit tests and must not break existing ones).

- [ ] **Step 8: Commit**

```bash
git add src/components/competitions/detail/RoundsTab.tsx
git commit -m "feat(rounds): live-shift sibling cards during drag-to-reorder"
```

- [ ] **Step 9: On-device QA (manual — record results)**

Run the app, open a competition you organize with 3+ rounds, go to the Rounds tab. Verify each acceptance criterion:

1. Long-press a card and drag down: the cards below animate up one at a time to open a gap at the projected drop slot; drag up: cards above slide down.
2. The opened gap matches a round card's height (no visibly wrong-sized gap for the common all-upcoming case).
3. Release: the dragged card drops into the gap and the list settles into the new order with **no flicker/jump**. (This is the flagged risk — if a sibling flickers one slot at release, increase the sibling `withTiming` duration in Step 3's `animatedStyle`, or defer the `activeIndex`/`activeOffsetY` reset; retest.)
4. The new order persists (reopen the tab / confirm `onReorder` result matches the shown drop).
5. As a non-organizer (or a competition with a single round), no drag or shift occurs.
6. A short vertical swipe (no 300ms hold) still scrolls the parent screen normally.
7. Mixed-height case (a completed/shorter card among upcoming ones): confirm behaviour is acceptable under the uniform-height model (gap may not perfectly match the odd card — expected, per spec).

---

## Self-Review

**Spec coverage:**
- Shared `activeIndex` + `activeOffsetY` lifted into `RoundsTab` — Task 2 Steps 4-5. ✓
- Per-row hover/shift math — Task 1 (`getHoverIndex`, `computeReorderShift`), applied Task 2 Step 3. ✓
- `translateY = dragY + shift` composition — Task 2 Step 3 `animatedStyle`. ✓
- Active row floats on top (zIndex/elevation) — Task 2 Step 3, preserved. ✓
- `slotHeight = measured + spacing.md` fix, used for both shift and release index — Task 2 Step 4 (`handleRowLayout`) + Step 3 (`finishDrag` divides by `slotHeight`). ✓
- Seamless release via stable `key={round.id}` — preserved in Task 2 Step 5; flicker risk called out in Step 9 QA. ✓
- `getHoverIndex` / `computeReorderShift` unit-tested — Task 1. ✓
- `handleActiveChange` no-op retired — Task 2 Step 4. ✓
- YAGNI out-of-scope items — Global Constraints. ✓
- Acceptance criteria 1-7 — Task 2 Step 9. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; all steps show concrete code or exact commands.

**Type consistency:** `slotHeight` (number) used consistently in both tasks; helper signatures in Task 1 match the call sites in Task 2 Step 3; `activeIndex`/`activeOffsetY` typed as `Animated.SharedValue<number>` in the props and created with `useSharedValue(-1)`/`useSharedValue(0)`.
