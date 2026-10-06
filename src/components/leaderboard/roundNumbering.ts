/**
 * Maps each round id to its user-facing round number: the 1-based position of
 * the round within the display_order-sorted list. This matches the Rounds tab
 * and the rest of the app, which number positionally so gaps left by deleted or
 * reordered rounds don't surface. `round.round_number` is a stable id (with
 * gaps) and must NOT be used for display.
 */
export function buildPositionalRoundNumbers(
  rounds: { id: string; display_order: number }[]
): Map<string, number> {
  const sorted = [...rounds].sort((a, b) => a.display_order - b.display_order);
  const map = new Map<string, number>();
  sorted.forEach((round, index) => map.set(round.id, index + 1));
  return map;
}
