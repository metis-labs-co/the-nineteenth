/**
 * Hole Data Transformers
 *
 * Utilities for transforming hole data between database format (snake_case)
 * and app format (camelCase).
 *
 * Database stores holes as JSONB with snake_case keys:
 * { hole: 1, par: 4, stroke_index: 7, yards_white: 350, ... }
 *
 * App uses camelCase Hole type:
 * { number: 1, par: 4, strokeIndex: 7, yardages: { white: 350 }, ... }
 */

import type { Hole } from '@/types';

/**
 * Database hole format (snake_case, from Supabase JSONB)
 */
export interface DatabaseHole {
  hole: number;
  par: number;
  stroke_index: number;
  stroke_index_red?: number;
  yards_white?: number;
  yards_blue?: number;
  yards_red?: number;
  yards_yellow?: number;
  yards_black?: number;
}

/**
 * Transform a single database hole to app Hole type.
 */
export function transformDatabaseHole(dbHole: DatabaseHole): Hole {
  const yardages: Record<string, number> = {};

  if (dbHole.yards_white != null) yardages.white = dbHole.yards_white;
  if (dbHole.yards_blue != null) yardages.blue = dbHole.yards_blue;
  if (dbHole.yards_red != null) yardages.red = dbHole.yards_red;
  if (dbHole.yards_yellow != null) yardages.yellow = dbHole.yards_yellow;
  if (dbHole.yards_black != null) yardages.black = dbHole.yards_black;

  return {
    number: dbHole.hole as Hole['number'],
    par: dbHole.par as Hole['par'],
    strokeIndex: dbHole.stroke_index,
    yardages: Object.keys(yardages).length > 0 ? yardages : undefined,
  };
}

/**
 * Check if hole data is in database format (snake_case)
 */
export function isDatabaseHoleFormat(hole: unknown): hole is DatabaseHole {
  return (
    typeof hole === 'object' &&
    hole !== null &&
    'hole' in hole &&
    'stroke_index' in hole
  );
}

/**
 * Check if hole data is in app format (camelCase)
 */
export function isAppHoleFormat(hole: unknown): hole is Hole {
  return (
    typeof hole === 'object' &&
    hole !== null &&
    'number' in hole &&
    'strokeIndex' in hole
  );
}

/**
 * Transform holes array from database format to app format if needed.
 * Handles both already-transformed (camelCase) and raw database (snake_case) formats.
 *
 * @param holes - Raw holes data from database (can be snake_case or camelCase)
 * @returns Normalized Hole[] in app format
 */
export function transformHolesIfNeeded(holes: unknown[] | null | undefined): Hole[] {
  if (!holes || holes.length === 0) return [];

  // Check if first hole is in database format
  const firstHole = holes[0];
  if (isDatabaseHoleFormat(firstHole)) {
    return holes.map((h) => transformDatabaseHole(h as DatabaseHole));
  }

  // Already in app format
  return holes as Hole[];
}

/**
 * Parse and transform holes from various formats.
 * Handles: null, string (JSON), database format array, or app format array.
 *
 * @param holesData - Holes data in various formats
 * @returns Normalized Hole[] in app format
 */
export function parseAndTransformHoles(holesData: Hole[] | unknown[] | string | null | undefined): Hole[] {
  if (!holesData) return [];

  // Handle JSON string (sometimes returned from certain queries)
  if (typeof holesData === 'string') {
    try {
      const parsed = JSON.parse(holesData);
      return transformHolesIfNeeded(parsed);
    } catch {
      return [];
    }
  }

  // Handle array (database or app format)
  if (Array.isArray(holesData)) {
    return transformHolesIfNeeded(holesData);
  }

  return [];
}

/**
 * Tee type from the normalized tees table
 * Importing here to avoid circular dependencies
 */
interface TeeWithLengths {
  name: string;
  color?: string | null;
  length_hole_1?: number | null;
  length_hole_2?: number | null;
  length_hole_3?: number | null;
  length_hole_4?: number | null;
  length_hole_5?: number | null;
  length_hole_6?: number | null;
  length_hole_7?: number | null;
  length_hole_8?: number | null;
  length_hole_9?: number | null;
  length_hole_10?: number | null;
  length_hole_11?: number | null;
  length_hole_12?: number | null;
  length_hole_13?: number | null;
  length_hole_14?: number | null;
  length_hole_15?: number | null;
  length_hole_16?: number | null;
  length_hole_17?: number | null;
  length_hole_18?: number | null;
}

/**
 * Common hex color to color name mappings.
 * Exported for use in other components that need consistent tee key resolution.
 */
export const TEE_HEX_COLOR_MAP: Record<string, string> = {
  '#ffffff': 'white',
  '#000000': 'black',
  '#0000ff': 'blue',
  '#00ccff': 'blue',
  '#0066cc': 'blue',
  '#ff0000': 'red',
  '#ff5050': 'red',
  '#ffff00': 'yellow',
  '#cccc00': 'gold',
  '#ffd700': 'gold',
  '#008000': 'green',
  '#66ff66': 'green',
  '#c0c0c0': 'silver',
};

/**
 * Resolve a tee color (hex or name) to a consistent yardage key.
 * Normalizes hex colors to color names (e.g., "#00CCFF" → "blue").
 * Falls back to the input lowercased if not a recognized hex.
 *
 * @param color - Hex color string or color name
 * @param fallbackName - Optional fallback name if color is null/undefined
 * @returns Normalized color key (lowercase color name)
 */
export function resolveTeeYardageKey(color: string | null | undefined, fallbackName?: string): string {
  if (!color) {
    return fallbackName?.toLowerCase() ?? 'unknown';
  }

  const lowerColor = color.toLowerCase();

  // Check if it's a hex color and map it
  if (lowerColor.startsWith('#')) {
    return TEE_HEX_COLOR_MAP[lowerColor] ?? fallbackName?.toLowerCase() ?? lowerColor;
  }

  return lowerColor;
}

/**
 * Get the tee key for the yardages object.
 * Uses color if available (lowercase), otherwise falls back to name (lowercase).
 * Normalizes hex colors (e.g., "#FFFFFF" → "white") for common tee colors.
 */
function getTeeYardageKey(tee: TeeWithLengths): string {
  return resolveTeeYardageKey(tee.color, tee.name);
}

/**
 * Get the hole length from a tee for a specific hole number.
 */
function getTeeHoleLengthFromTee(tee: TeeWithLengths, holeNumber: number): number | null {
  const key = `length_hole_${holeNumber}` as keyof TeeWithLengths;
  const value = tee[key];
  return typeof value === 'number' ? value : null;
}

/**
 * Hydrate holes with yardage data from the tees table.
 *
 * The tees table stores per-hole yardages in separate columns (length_hole_1, etc.),
 * but the Hole type expects yardages as a Record<string, number> keyed by tee color.
 *
 * This function merges tee yardages into holes so they can be displayed properly.
 *
 * @param holes - The holes array (with par and strokeIndex but no yardages)
 * @param tees - The tees array from the tees table (with length_hole_X columns)
 * @returns Holes array with yardages populated from tee data
 *
 * @example
 * // Input hole: { number: 1, par: 4, strokeIndex: 5 }
 * // Input tee: { name: 'Blue', color: 'blue', length_hole_1: 425, ... }
 * // Output hole: { number: 1, par: 4, strokeIndex: 5, yardages: { blue: 425 } }
 */
export function hydrateHolesWithTeeYardages(
  holes: Hole[] | null | undefined,
  tees: TeeWithLengths[] | null | undefined
): Hole[] {
  if (!holes || holes.length === 0) return [];
  if (!tees || tees.length === 0) return holes;

  return holes.map((hole) => {
    // Build yardages object from all tees
    const yardages: Record<string, number> = {};

    for (const tee of tees) {
      const length = getTeeHoleLengthFromTee(tee, hole.number);
      if (length !== null && length > 0) {
        const key = getTeeYardageKey(tee);
        yardages[key] = length;
      }
    }

    // Return hole with yardages (or preserve existing if no new data)
    return {
      ...hole,
      yardages: Object.keys(yardages).length > 0 ? yardages : hole.yardages,
    };
  });
}
