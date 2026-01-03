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
