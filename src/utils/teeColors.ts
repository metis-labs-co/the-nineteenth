/**
 * Tee colour utilities — map the GolfAPI `tee_back` / `tee_front` POIs to
 * the course's longest and shortest TeeBoxes and resolve their colours
 * to a hex swatch we can render on the map and chooser sheet.
 *
 * Pure — no React, no Supabase. Easy to unit-test.
 */

import { CUSTOM_TEE_COLORS } from '@/types/database/customHoleTees.types';
import type { TeeBox } from '@/types/database/base';

/**
 * Result for one POI ("back" or "front"). When a course has no usable tees
 * (no totalYardage data, or `tees` is null) every field is `null`.
 */
export interface TeeColorInfo {
  /** The TeeBox.color string (e.g. "Black", "Red"). Free-form per GolfAPI. */
  colorName: string | null;
  /** Display label, capitalised (e.g. "Black"). Falls back to the raw color. */
  label: string | null;
  /** Hex swatch — pulled from `CUSTOM_TEE_COLORS` when the name matches a
   *  standard colour, or a neutral grey otherwise. */
  swatch: string | null;
  /** TeeBox.name (e.g. "Championship", "Men", "Women") for sub-labelling. */
  teeName: string | null;
}

const NEUTRAL_SWATCH = '#9E9E9E';

/** Lowercase color name → swatch hex. Reuses `CUSTOM_TEE_COLORS`. */
const SWATCH_BY_NAME: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const c of CUSTOM_TEE_COLORS) map[c.key] = c.swatch;
  // Common synonyms / alternative spellings used in GolfAPI feeds.
  map['championship'] = '#212121'; // black
  map['champ'] = '#212121';
  map['tips'] = '#212121';
  map['back'] = '#212121';
  map['front'] = '#E53935'; // red — typical forward tee
  map['ladies'] = '#E53935';
  map['womens'] = '#E53935';
  map["women's"] = '#E53935';
  map['mens'] = '#1E88E5'; // blue — typical mid tee
  map["men's"] = '#1E88E5';
  map['senior'] = '#F9A825'; // gold
  map['seniors'] = '#F9A825';
  map['yellow'] = '#FBC02D';
  map['green'] = '#43A047';
  map['orange'] = '#FB8C00';
  return map;
})();

/**
 * Resolve a TeeBox.color string to a hex swatch. Falls back to a neutral
 * grey for unknown colour names so we never render `null`.
 */
export function getTeeSwatch(colorName: string | null | undefined): string {
  if (!colorName) return NEUTRAL_SWATCH;
  return SWATCH_BY_NAME[colorName.trim().toLowerCase()] ?? NEUTRAL_SWATCH;
}

/**
 * Identify the longest and shortest TeeBoxes by `totalYardage`. The longest
 * tee maps to the `tee_back` POI; the shortest maps to `tee_front`.
 *
 * Returns `{ back: null, front: null }` shape when `tees` is missing or no
 * tees carry a yardage. When only ONE tee has yardage, both back and front
 * point at the same tee — the marker still renders but the chooser would
 * show identical labels.
 */
export function analyseCourseTeeColors(
  tees: TeeBox[] | null | undefined
): { back: TeeColorInfo; front: TeeColorInfo } {
  const empty: TeeColorInfo = {
    colorName: null,
    label: null,
    swatch: null,
    teeName: null,
  };
  if (!tees || tees.length === 0) {
    return { back: empty, front: empty };
  }

  // Only TeeBoxes with a numeric totalYardage take part in the ordering —
  // tees with `null` yardage can't be compared meaningfully.
  const withYardage = tees.filter(
    (t): t is TeeBox & { totalYardage: number } =>
      typeof t.totalYardage === 'number' && Number.isFinite(t.totalYardage)
  );
  if (withYardage.length === 0) return { back: empty, front: empty };

  const sorted = [...withYardage].sort(
    (a, b) => b.totalYardage - a.totalYardage
  );
  const longest = sorted[0];
  const shortest = sorted[sorted.length - 1];

  const toInfo = (tee: TeeBox): TeeColorInfo => ({
    colorName: tee.color ?? null,
    label: tee.color ? capitaliseFirst(tee.color) : null,
    swatch: getTeeSwatch(tee.color),
    teeName: tee.name ?? null,
  });

  return { back: toInfo(longest), front: toInfo(shortest) };
}

function capitaliseFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Pick the tee override that best matches the player's selected tee box for
 * a single hole. Resolution order:
 *
 *   1. **Custom tee match** — if a user-defined custom tee on this hole has
 *      the same colour as the selected tee, use its UUID. Custom tees are
 *      the most precise: they're a real GPS coordinate the user has saved
 *      for the exact tee they play from.
 *   2. **Back / Front POI by yardage rank** — identify whether the selected
 *      TeeBox is the longest or shortest in the course's tees array (by
 *      `totalYardage`). Match by `tee_id` first (most reliable), then by
 *      colour name. Longest → `'back'`, shortest → `'front'`.
 *   3. **Default to `'back'`** when the selected tee sits in the middle of
 *      the rank ordering (3+ tees and the player picked a mid one) or when
 *      no rank can be determined. The user can adjust per hole in scoring.
 *   4. **Return `null`** when there's nothing to base the choice on
 *      (no selected tee, or no course tees at all). The caller skips
 *      writing an override in that case.
 *
 * Pure — no React, no Supabase. Suitable for unit tests.
 */
export function resolveAutoTeeOverride(
  selectedTee: TeeBox | null | undefined,
  courseTees: TeeBox[] | null | undefined,
  customTeesForHole: ReadonlyArray<{ id: string; color: string }>
): 'back' | 'front' | string | null {
  if (!selectedTee) return null;
  const selectedColor = selectedTee.color?.trim().toLowerCase() ?? null;

  // 1. Custom-tee colour match wins outright.
  if (selectedColor) {
    const customMatch = customTeesForHole.find(
      (t) => (t.color ?? '').trim().toLowerCase() === selectedColor
    );
    if (customMatch) return customMatch.id;
  }

  // 2. Compare against the course's TeeBoxes ordered by yardage. We need at
  //    least one yardage to do the longest/shortest comparison.
  if (!courseTees || courseTees.length === 0) return null;
  const withYardage = courseTees.filter(
    (t): t is TeeBox & { totalYardage: number } =>
      typeof t.totalYardage === 'number' && Number.isFinite(t.totalYardage)
  );
  if (withYardage.length === 0) return null;

  const sorted = [...withYardage].sort((a, b) => b.totalYardage - a.totalYardage);
  const longest = sorted[0];
  const shortest = sorted[sorted.length - 1];

  // Prefer matching by `tee_id` (stable) over colour (could collide across
  // courses with weird colour names).
  const matches = (tee: TeeBox): boolean => {
    if (selectedTee.tee_id && tee.tee_id) {
      return selectedTee.tee_id === tee.tee_id;
    }
    return selectedColor != null && tee.color?.trim().toLowerCase() === selectedColor;
  };

  if (matches(longest)) return 'back';
  if (matches(shortest) && shortest !== longest) return 'front';

  // 3. Mid tee or no clean match — default to back (safest, longest yardage)
  //    so shot 1 distance has *some* anchor. The user can swap on the map.
  return 'back';
}
