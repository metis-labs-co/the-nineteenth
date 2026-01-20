/**
 * Base Database Types
 * Core nested types used in JSONB fields
 */

/**
 * Geographic point (PostGIS GEOGRAPHY type)
 * Stored as GeoJSON Point
 */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Hole information (stored in Course.holes JSONB array)
 */
export interface Hole {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;
  par: 3 | 4 | 5;
  strokeIndex: number; // 1-18 (for handicap calculation)
  yardages?: Record<string, number>; // e.g., { blue: 425, white: 400, red: 350 }
}

/**
 * Tee box configuration (stored in Course.tees JSONB array)
 */
export interface TeeBox {
  name: string; // 'Championship', 'Men', 'Women', etc.
  color: string; // 'blue', 'white', 'red', etc.
  totalYardage?: number | null; // Optional - some tees may not have yardage data
  courseRating?: number; // NUMERIC(4,1)
  slopeRating?: number; // NUMERIC(4,1)
}

/**
 * Hole score (stored in Scorecard.scores JSONB object)
 * MVP: Strokes only
 * Phase 2: Putts, fairways, GIR, penalties
 */
export interface HoleScore {
  strokes: number; // Required
  putts?: number; // Phase 2
  fairwayHit?: boolean; // Phase 2
  greenInRegulation?: boolean; // Phase 2 (GIR)
  penalties?: number; // Phase 2
  scoredBy?: string; // UUID of the player who entered this score (for mismatch detection)
}

/**
 * Multi-ball hole score for solo practice rounds
 * Contains an array of scores, one per ball (2-4 balls)
 */
export interface MultiBallHoleScore {
  balls: HoleScore[];
}

/**
 * Type guard to check if a hole score is multi-ball format
 */
export function isMultiBallScore(
  score: HoleScore | MultiBallHoleScore | undefined
): score is MultiBallHoleScore {
  return score !== undefined && 'balls' in score && Array.isArray(score.balls);
}

/**
 * Type guard to check if a hole score is single-ball format
 */
export function isSingleBallScore(
  score: HoleScore | MultiBallHoleScore | undefined
): score is HoleScore {
  return score !== undefined && 'strokes' in score && !('balls' in score);
}

/**
 * Per-ball totals for multi-ball rounds
 */
export interface BallTotals {
  gross: number;
  net: number;
  points: number;
}
