/**
 * GolfAPI.io hazard polygon fetcher.
 *
 * Phase C1 spec §3.2 flagged this as a pre-flight investigation: GolfAPI.io's
 * documentation needs a check to confirm whether their API exposes hazard
 * polygons. Until that's done, this returns an empty array and logs once,
 * which lets the orchestrator fall through to OSM cleanly.
 *
 * When GolfAPI.io's endpoint is confirmed:
 *   - Implement the real fetch here using the same auth/env setup as the
 *     existing course/coordinates services.
 *   - Map their feature shape onto HazardPolygon[].
 *   - The orchestrator will pick it up automatically.
 */

import type { HazardPolygon } from '@/types/database/holeHazards.types';

let warned = false;

export async function fetchGolfApiHazards(_courseId: string): Promise<HazardPolygon[]> {
  if (!warned) {
    // eslint-disable-next-line no-console
    console.info('[golfApiHazards] No GolfAPI.io hazard endpoint wired yet; skipping.');
    warned = true;
  }
  return [];
}
