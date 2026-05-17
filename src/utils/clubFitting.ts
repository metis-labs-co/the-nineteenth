/**
 * Pure helpers for per-club fitting metadata (brand, model, loft, lie,
 * shaft details, notes). Stored on `player_bag` rows; surfaced in the
 * What's in the Bag screen and the ClubFittingSheet.
 *
 * No React, no Supabase — easy to unit test.
 */

import { CLUBS_BY_KEY, isIronKey, type ClubKey } from '@/constants/clubs';

export const SHAFT_FLEXES = ['L', 'A', 'R', 'S', 'X', 'TX'] as const;
export type ShaftFlex = (typeof SHAFT_FLEXES)[number];

export const SHAFT_FLEX_LABELS: Readonly<Record<ShaftFlex, string>> = {
  L: 'Ladies',
  A: 'Senior',
  R: 'Regular',
  S: 'Stiff',
  X: 'X-Stiff',
  TX: 'Tour X',
};

export interface ClubFitting {
  brand: string | null;
  model: string | null;
  loftDegrees: number | null;
  lieAngleDegrees: number | null;
  shaftBrand: string | null;
  shaftModel: string | null;
  shaftFlex: ShaftFlex | null;
  shaftLengthInches: number | null;
  notes: string | null;
}

export const EMPTY_FITTING: Readonly<ClubFitting> = Object.freeze({
  brand: null,
  model: null,
  loftDegrees: null,
  lieAngleDegrees: null,
  shaftBrand: null,
  shaftModel: null,
  shaftFlex: null,
  shaftLengthInches: null,
  notes: null,
});

const FITTING_FIELDS = [
  'brand',
  'model',
  'loftDegrees',
  'lieAngleDegrees',
  'shaftBrand',
  'shaftModel',
  'shaftFlex',
  'shaftLengthInches',
  'notes',
] as const satisfies readonly (keyof ClubFitting)[];

/** True if any fitting field is filled in. */
export function hasFitting(f: ClubFitting): boolean {
  return FITTING_FIELDS.some((k) => f[k] != null && f[k] !== '');
}

/**
 * Short subtitle for chips/lists. Prefers "Brand · Model" if either is set,
 * else falls back to shaft/loft/lie summary. Returns null when nothing is set.
 */
export function fittingSummary(f: ClubFitting): string | null {
  const brandModel = [f.brand, f.model].filter((s): s is string => !!s).join(' · ');
  if (brandModel) return brandModel;

  const parts: string[] = [];
  if (f.loftDegrees != null) parts.push(`${f.loftDegrees}°`);
  if (f.shaftFlex) parts.push(SHAFT_FLEX_LABELS[f.shaftFlex]);
  if (f.shaftLengthInches != null) parts.push(`${f.shaftLengthInches}"`);
  if (f.lieAngleDegrees != null) parts.push(`lie ${f.lieAngleDegrees}°`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Merge: take only the non-null fields from `source` and copy them onto
 * `target`. Empty fields in the source don't overwrite anything in target —
 * this is what the "copy to other irons" helper uses, so you can copy
 * brand+shaft without trampling the per-club loft.
 */
export function mergeFitting(target: ClubFitting, source: ClubFitting): ClubFitting {
  const out: ClubFitting = { ...target };
  for (const key of FITTING_FIELDS) {
    const v = source[key];
    if (v != null && v !== '') {
      (out[key] as ClubFitting[typeof key]) = v;
    }
  }
  return out;
}

/**
 * Iron keys present in the user's bag, excluding `exclude`. Used by the
 * ClubFittingSheet's "Copy to…" picker so users can fill the whole iron
 * set from one entry.
 */
export function otherIronsInBag(bag: readonly ClubKey[], exclude: ClubKey): ClubKey[] {
  return bag.filter((k) => k !== exclude && isIronKey(k));
}

/** True when both fittings are equivalent (deep equal across known fields). */
export function fittingEquals(a: ClubFitting, b: ClubFitting): boolean {
  return FITTING_FIELDS.every((k) => a[k] === b[k]);
}

/** Number of filled fields — drives the "N detail(s) saved" subtitle. */
export function countFilledFields(f: ClubFitting): number {
  return FITTING_FIELDS.reduce(
    (n, k) => n + (f[k] != null && f[k] !== '' ? 1 : 0),
    0
  );
}

/** Type guard for ShaftFlex strings coming from the DB. */
export function isShaftFlex(value: string | null | undefined): value is ShaftFlex {
  return value != null && (SHAFT_FLEXES as readonly string[]).includes(value);
}

/** Label "5 Iron" → used by the copy-to picker rows. */
export function clubKeyLabel(key: ClubKey): string {
  return CLUBS_BY_KEY[key].label;
}
