/**
 * OSM Overpass hazard polygon fetcher.
 *
 * Queries the public Overpass API for bunkers and water hazards within a
 * course's bounding box. Returns HazardPolygon[] decoded from the response.
 *
 * Phase C1 spec §3.3 — public Overpass has fair-use limits (~10k queries
 * per IP per day). Cache aggressively (the orchestrator persists results
 * in `hole_hazards` so repeat opens don't re-query).
 */

import type {
  HazardPolygon,
  HazardType,
} from '@/types/database/holeHazards.types';

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

export interface CourseBBox {
  /** Min latitude (south). */
  south: number;
  /** Min longitude (west). */
  west: number;
  /** Max latitude (north). */
  north: number;
  /** Max longitude (east). */
  east: number;
}

interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
}

interface OverpassWay {
  type: 'way';
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements: Array<OverpassNode | OverpassWay>;
}

/**
 * Build the Overpass QL query for bunkers + water hazards in a bbox.
 */
function buildQuery(bbox: CourseBBox): string {
  const { south, west, north, east } = bbox;
  return `
    [out:json][timeout:25];
    (
      way["golf"="bunker"](${south},${west},${north},${east});
      way["golf"="water_hazard"](${south},${west},${north},${east});
      way["natural"="water"]["golf"](${south},${west},${north},${east});
    );
    out geom;
  `.trim();
}

/**
 * Map an OSM way to our HazardType. Returns null when the way isn't a hazard.
 */
function classifyWay(way: OverpassWay): HazardType | null {
  const golf = way.tags?.golf;
  const natural = way.tags?.natural;
  if (golf === 'bunker') return 'bunker';
  if (golf === 'water_hazard') return 'water';
  if (natural === 'water') return 'water';
  return null;
}

export async function fetchOsmHazards(
  bbox: CourseBBox,
  fetchImpl: typeof fetch = fetch
): Promise<HazardPolygon[]> {
  const body = buildQuery(bbox);
  const response = await fetchImpl(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Overpass query failed: ${response.status}`);
  }

  const json = (await response.json()) as OverpassResponse;
  const hazards: HazardPolygon[] = [];

  for (const el of json.elements) {
    if (el.type !== 'way') continue;
    const type = classifyWay(el);
    if (!type) continue;
    if (!el.geometry || el.geometry.length < 3) continue;

    hazards.push({
      type,
      source: 'osm',
      externalId: `osm/way/${el.id}`,
      polygon: el.geometry.map(({ lat, lon }) => ({ latitude: lat, longitude: lon })),
    });
  }

  return hazards;
}
