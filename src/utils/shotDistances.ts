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

interface LatLng {
  latitude: number;
  longitude: number;
}

export interface ShotWithDistance extends ShotLogEntry {
  /** Distance the shot travelled, in metres. `null` when the prior position is unknown. */
  distanceMeters: number | null;
}

export interface RecomputeAfterMoveResult {
  /** New distance for the moved shot from its prior point (or tee anchor for shot 0). */
  movedNew: number | null;
  /** Distance the moved shot travelled before the move. */
  movedOriginal: number | null;
  /** New distance for the shot immediately after the moved one (now measured from the moved shot's new position). */
  nextNew: number | null;
  /** Distance the next shot travelled before the move. */
  nextOriginal: number | null;
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
 * Pick the tee coordinate honouring a per-hole override. When the requested
 * tee isn't available, falls back to whichever tee exists. When no override
 * is given, behaves identically to `pickTeeCoord`.
 *
 * The override may also be a `custom_hole_tees.id` UUID — this function
 * doesn't know about custom tees, so any non-`back`/`front` value falls
 * through to the default (back tee). Consumers that *do* care about custom
 * tees (e.g. `ShotMapScreen`) resolve the UUID locally before calling this.
 */
export function pickTeeCoordWithOverride(
  holeCoords: readonly HoleCoordinate[],
  override: string | null | undefined
): HoleCoordinate | null {
  if (override === 'front') {
    return (
      holeCoords.find((c) => c.poi_type === 'tee_front') ??
      holeCoords.find((c) => c.poi_type === 'tee_back') ??
      null
    );
  }
  if (override === 'back') {
    return (
      holeCoords.find((c) => c.poi_type === 'tee_back') ??
      holeCoords.find((c) => c.poi_type === 'tee_front') ??
      null
    );
  }
  return pickTeeCoord(holeCoords);
}

/**
 * Resolve the tee origin for a hole, honouring (in priority order):
 *   1. A custom-tee override (override matches a `custom_hole_tees.id`)
 *   2. Back/front tee chosen by the override
 *   3. Default back tee, falling back to front
 *
 * Returns `null` when no tee is available. Pure — no React, no Supabase.
 */
export function resolveTeeAnchor(
  override: string | null | undefined,
  customTees: ReadonlyArray<{ id: string; latitude: number; longitude: number }>,
  holeCoords: readonly HoleCoordinate[]
): LatLng | null {
  if (override) {
    const custom = customTees.find((t) => t.id === override);
    if (custom) return { latitude: custom.latitude, longitude: custom.longitude };
  }
  const tee = pickTeeCoordWithOverride(holeCoords, override ?? null);
  return tee ? { latitude: tee.latitude, longitude: tee.longitude } : null;
}

/**
 * Annotate each shot with its travelled distance.
 * Input shots must already be ordered by `sequence` ascending.
 *
 * `teeCoord` accepts any `{latitude, longitude}` — `HoleCoordinate` is
 * structurally compatible, and custom-tee positions can be passed too.
 */
export function computeShotDistances(
  shots: readonly ShotLogEntry[],
  teeCoord: LatLng | null
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

/**
 * Compute the before/after distances when a shot is hypothetically moved to
 * a new coordinate. Returns the moved shot's old/new travelled distance plus
 * the next shot's old/new distance (since it's measured from the moved one).
 *
 * Pure — used by the move-on-map preview banner to show the user the impact
 * of their pending change before they commit.
 *
 * @param shots Shots ordered by `sequence` ascending (same order as the cache).
 * @param movedIndex Index in `shots` of the shot being moved.
 * @param newCoord The candidate new position.
 * @param teeAnchor Tee coordinate used as the prior point for shot index 0;
 *                  pass `null` when no tee POI is available for the hole.
 */
export function recomputeAfterMove(
  shots: readonly ShotLogEntry[],
  movedIndex: number,
  newCoord: LatLng,
  teeAnchor: LatLng | null
): RecomputeAfterMoveResult {
  if (movedIndex < 0 || movedIndex >= shots.length) {
    return {
      movedNew: null,
      movedOriginal: null,
      nextNew: null,
      nextOriginal: null,
    };
  }

  const moved = shots[movedIndex];
  const prior =
    movedIndex === 0
      ? teeAnchor
      : { latitude: shots[movedIndex - 1].latitude, longitude: shots[movedIndex - 1].longitude };

  const movedOriginal = prior
    ? calculateDistance(prior.latitude, prior.longitude, moved.latitude, moved.longitude)
    : null;
  const movedNew = prior
    ? calculateDistance(prior.latitude, prior.longitude, newCoord.latitude, newCoord.longitude)
    : null;

  const nextIndex = movedIndex + 1;
  if (nextIndex >= shots.length) {
    return { movedNew, movedOriginal, nextNew: null, nextOriginal: null };
  }

  const next = shots[nextIndex];
  const nextOriginal = calculateDistance(
    moved.latitude,
    moved.longitude,
    next.latitude,
    next.longitude
  );
  const nextNew = calculateDistance(
    newCoord.latitude,
    newCoord.longitude,
    next.latitude,
    next.longitude
  );

  return { movedNew, movedOriginal, nextNew, nextOriginal };
}
