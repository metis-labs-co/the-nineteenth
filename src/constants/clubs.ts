/**
 * Canonical golf-club catalogue used by:
 *   - the Bag editor (multi-select up to 14)
 *   - the per-shot club picker (single-select from current bag)
 *   - per-club aggregations on the Bag screen
 *
 * Stored as TEXT keys on `player_bag.club_key` and `shot_log.club_used`.
 * Keep keys stable — historical `shot_log` rows are aggregated by key.
 */

export type ClubCategory = 'wood' | 'hybrid' | 'iron' | 'wedge' | 'putter';

export type ClubKey =
  | 'driver'
  | '3-wood'
  | '5-wood'
  | '7-wood'
  | '2-hybrid'
  | '3-hybrid'
  | '4-hybrid'
  | '5-hybrid'
  | '2-iron'
  | '3-iron'
  | '4-iron'
  | '5-iron'
  | '6-iron'
  | '7-iron'
  | '8-iron'
  | '9-iron'
  | 'pitching-wedge'
  | 'gap-wedge'
  | 'sand-wedge'
  | 'lob-wedge'
  | 'wedge-48'
  | 'wedge-50'
  | 'wedge-52'
  | 'wedge-54'
  | 'wedge-56'
  | 'wedge-58'
  | 'wedge-60'
  | 'putter';

export interface Club {
  key: ClubKey;
  label: string;
  category: ClubCategory;
}

export const CLUBS: readonly Club[] = [
  { key: 'driver', label: 'Driver', category: 'wood' },
  { key: '3-wood', label: '3 Wood', category: 'wood' },
  { key: '5-wood', label: '5 Wood', category: 'wood' },
  { key: '7-wood', label: '7 Wood', category: 'wood' },
  { key: '2-hybrid', label: '2 Hybrid', category: 'hybrid' },
  { key: '3-hybrid', label: '3 Hybrid', category: 'hybrid' },
  { key: '4-hybrid', label: '4 Hybrid', category: 'hybrid' },
  { key: '5-hybrid', label: '5 Hybrid', category: 'hybrid' },
  { key: '2-iron', label: '2 Iron', category: 'iron' },
  { key: '3-iron', label: '3 Iron', category: 'iron' },
  { key: '4-iron', label: '4 Iron', category: 'iron' },
  { key: '5-iron', label: '5 Iron', category: 'iron' },
  { key: '6-iron', label: '6 Iron', category: 'iron' },
  { key: '7-iron', label: '7 Iron', category: 'iron' },
  { key: '8-iron', label: '8 Iron', category: 'iron' },
  { key: '9-iron', label: '9 Iron', category: 'iron' },
  { key: 'pitching-wedge', label: 'Pitching Wedge', category: 'wedge' },
  { key: 'gap-wedge', label: 'Gap Wedge', category: 'wedge' },
  { key: 'sand-wedge', label: 'Sand Wedge', category: 'wedge' },
  { key: 'lob-wedge', label: 'Lob Wedge', category: 'wedge' },
  { key: 'wedge-48', label: '48° Wedge', category: 'wedge' },
  { key: 'wedge-50', label: '50° Wedge', category: 'wedge' },
  { key: 'wedge-52', label: '52° Wedge', category: 'wedge' },
  { key: 'wedge-54', label: '54° Wedge', category: 'wedge' },
  { key: 'wedge-56', label: '56° Wedge', category: 'wedge' },
  { key: 'wedge-58', label: '58° Wedge', category: 'wedge' },
  { key: 'wedge-60', label: '60° Wedge', category: 'wedge' },
  { key: 'putter', label: 'Putter', category: 'putter' },
] as const;

export const CLUBS_BY_KEY: Readonly<Record<ClubKey, Club>> = Object.fromEntries(
  CLUBS.map((c) => [c.key, c])
) as Readonly<Record<ClubKey, Club>>;

export const CATEGORY_ORDER: readonly ClubCategory[] = [
  'wood',
  'hybrid',
  'iron',
  'wedge',
  'putter',
] as const;

export const CATEGORY_LABELS: Readonly<Record<ClubCategory, string>> = {
  wood: 'Woods',
  hybrid: 'Hybrids',
  iron: 'Irons',
  wedge: 'Wedges',
  putter: 'Putter',
};

export const PUTTER_KEY: ClubKey = 'putter';

/** USGA bag size limit — also enforced as a soft cap in the picker. */
export const MAX_BAG_SIZE = 14;

/** Type guard — narrows arbitrary strings (e.g. from shot_log.club_used) to ClubKey. */
export function isClubKey(value: string | null | undefined): value is ClubKey {
  return value != null && value in CLUBS_BY_KEY;
}

/** Display label for a club, with a graceful fallback for legacy/unknown keys. */
export function clubLabel(key: string | null | undefined): string {
  return isClubKey(key) ? CLUBS_BY_KEY[key].label : 'Unknown club';
}
