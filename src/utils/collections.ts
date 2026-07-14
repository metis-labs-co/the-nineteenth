/**
 * Small generic collection helpers.
 */

/**
 * Build a lookup Map from an array of objects keyed by their `id`, so callers
 * can do O(1) lookups instead of `.find`.
 *
 * @example
 * const byId = indexById(players); // Map<string, Player>
 * byId.get(someId);
 */
export function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}
