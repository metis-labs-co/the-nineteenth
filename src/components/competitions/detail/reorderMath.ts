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
