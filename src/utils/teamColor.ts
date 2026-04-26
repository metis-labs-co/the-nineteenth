/**
 * Team colour resolution.
 *
 * Teams store an avatar palette id (e.g. `'avatar-green'`) in `teams.color`.
 * Render sites call `getTeamColorHex` to resolve that id to a hex string,
 * with a legacy index-based fallback for any team whose colour hasn't been
 * set yet (very-old rows that pre-date the migration; rare after rollout).
 */

import {
  AVATARS,
  getAvatarById,
  type ColorPalette as AvatarColorPalette,
} from '@/constants/avatars';
import type { ColorPalette } from '@/constants/theme';

/**
 * Legacy index-based palette. Mirrors what `TeamsSection` and the
 * `getTeamColor` scoring helper used before stored colours existed —
 * kept so any team without a stored colour renders the same as it did
 * before the migration ran.
 */
function legacyTeamColor(themeColors: ColorPalette, index: number): string {
  const palette: string[] = [
    themeColors.success,
    themeColors.warning,
    themeColors.info,
    themeColors.error,
    themeColors.primary,
  ];
  const safeIndex = Math.max(0, Number.isFinite(index) ? index : 0);
  return palette[safeIndex % palette.length];
}

/**
 * Resolve a stored avatar colour id to its `palette.dark` hex.
 * Falls back to the legacy theme cycle when `colorId` is null/unknown.
 */
export function getTeamColorHex(
  colorId: string | null | undefined,
  fallbackIndex: number,
  themeColors: ColorPalette
): string {
  const avatar = colorId ? getAvatarById(colorId) : undefined;
  if (avatar) {
    return avatar.colorPalette.dark;
  }
  return legacyTeamColor(themeColors, fallbackIndex);
}

/**
 * Get the full 5-tier palette (`darkest` → `lightest`) for a stored
 * colour id. Returns `null` when the id is missing or unknown so the
 * caller can decide whether to fall back.
 */
export function getTeamColorPalette(
  colorId: string | null | undefined
): AvatarColorPalette | null {
  const avatar = colorId ? getAvatarById(colorId) : undefined;
  return avatar ? avatar.colorPalette : null;
}

/**
 * First palette id not present in `taken`. Walks `AVATARS` declaration
 * order. If every colour is taken, returns the last entry — the caller
 * can decide what to do with the duplicate (in practice, max teams is
 * ≈ 6, so this fallback is essentially unreachable).
 */
export function nextAvailableTeamColor(
  taken: readonly (string | null | undefined)[]
): string {
  const takenSet = new Set(taken.filter((v): v is string => !!v));
  const available = AVATARS.find((a) => !takenSet.has(a.id));
  return (available ?? AVATARS[AVATARS.length - 1]).id;
}
