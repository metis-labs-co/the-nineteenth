/**
 * Compute per-shot distance for a single (round, hole, player) shot sequence.
 *
 * Distance for shot N = haversine(prior position, this position).
 * The "prior position" for shot 1 is the hole's tee coordinate. If no tee
 * coordinate is available, shot 1's distance is `null`.
 *
 * Pure — no React, no Supabase — fully unit testable.
 */

import { calculateDistance } from '@/utils/gpsCalculations';
import type { HoleCoordinate } from '@/types/database/course.types';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

export interface ShotWithDistance extends ShotLogEntry {
  /** Distance the shot travelled, in metres. `null` when the prior position is unknown. */
  distanceMeters: number | null;
}

/**
 * Pick the best tee coordinate from a hole's coordinates list.
 * Prefers `tee_back`, falls back to `tee_front`, then null.
 */
export function pickTeeCoord(
  holeCoords: readonly HoleCoordinate[]
): HoleCoordinate | null {
  return (
    holeCoords.find((c) => c.poi_type === 'tee_back') ??
    holeCoords.find((c) => c.poi_type === 'tee_front') ??
    null
  );
}

/**
 * Annotate each shot with its travelled distance.
 * Input shots must already be ordered by `sequence` ascending.
 */
export function computeShotDistances(
  shots: readonly ShotLogEntry[],
  teeCoord: HoleCoordinate | null
): ShotWithDistance[] {
  return shots.map((shot, idx) => {
    const prior =
      idx === 0
        ? teeCoord
          ? { latitude: teeCoord.latitude, longitude: teeCoord.longitude }
          : null
        : { latitude: shots[idx - 1].latitude, longitude: shots[idx - 1].longitude };

    const distanceMeters = prior
      ? calculateDistance(prior.latitude, prior.longitude, shot.latitude, shot.longitude)
      : null;

    return { ...shot, distanceMeters };
  });
}
