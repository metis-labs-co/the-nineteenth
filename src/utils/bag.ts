/**
 * Pure helpers for the Bag editor.
 * No React, no Supabase — easy to unit test.
 */

import { MAX_BAG_SIZE, PUTTER_KEY, type ClubKey } from '@/constants/clubs';

/** Diff a previous bag against a next bag and return adds/removes. */
export function diffBag(
  prev: readonly ClubKey[],
  next: readonly ClubKey[]
): { adds: ClubKey[]; removes: ClubKey[] } {
  const prevSet = new Set(prev);
  const nextSet = new Set(next);
  return {
    adds: next.filter((k) => !prevSet.has(k)),
    removes: prev.filter((k) => !nextSet.has(k)),
  };
}

/** Always include the putter. Idempotent — safe to call repeatedly. */
export function ensurePutter(keys: readonly ClubKey[]): ClubKey[] {
  return keys.includes(PUTTER_KEY) ? [...keys] : [PUTTER_KEY, ...keys];
}

/** True when the bag is at or above the USGA max. */
export function isBagFull(keys: readonly ClubKey[]): boolean {
  return keys.length >= MAX_BAG_SIZE;
}

/**
 * Toggle a club in the bag, respecting:
 *   - the putter is permanent (cannot be removed)
 *   - the 14-club cap (cannot add when full)
 *
 * Returns the previous list unchanged if the toggle is rejected.
 */
export function toggleClub(
  keys: readonly ClubKey[],
  clubKey: ClubKey
): ClubKey[] {
  if (clubKey === PUTTER_KEY) return [...keys]; // putter is locked
  if (keys.includes(clubKey)) {
    return keys.filter((k) => k !== clubKey);
  }
  if (isBagFull(keys)) return [...keys];
  return [...keys, clubKey];
}
