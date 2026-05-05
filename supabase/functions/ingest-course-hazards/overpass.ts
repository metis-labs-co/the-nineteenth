/**
 * OSM Overpass bunker fetcher (Deno port of src/services/hazards/osmHazards.ts).
 * Returns bunker polygons for a given bbox.
 */

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface BunkerPolygon {
  /** [lng, lat] pairs forming a closed ring (first point repeated at end). */
  coordinates: Array<[number, number]>;
  /** OSM way id, used as external_id for idempotent upserts. */
  externalId: string;
}

interface OverpassWay {
  type: 'way';
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements: Array<{ type: string } & Record<string, unknown>>;
}

function buildBunkerQuery(bbox: BBox): string {
  const { south, west, north, east } = bbox;
  return `
    [out:json][timeout:25];
    way["golf"="bunker"](${south},${west},${north},${east});
    out geom;
  `.trim();
}

export async function fetchBunkers(bbox: BBox): Promise<BunkerPolygon[]> {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: buildBunkerQuery(bbox),
  });

  if (!response.ok) {
    throw new Error(`Overpass HTTP ${response.status}`);
  }

  const json = (await response.json()) as OverpassResponse;
  const polygons: BunkerPolygon[] = [];

  for (const el of json.elements) {
    if (el.type !== 'way') continue;
    const way = el as unknown as OverpassWay;
    if (!way.geometry || way.geometry.length < 3) continue;

    const ring: Array<[number, number]> = way.geometry.map(
      ({ lat, lon }) => [lon, lat] as [number, number]
    );
    // Close the ring if Overpass didn't already
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }

    polygons.push({
      coordinates: ring,
      externalId: `osm/way/${way.id}`,
    });
  }

  return polygons;
}

/**
 * Build a per-hole bbox padded by ~40m around the tee→green segment.
 * Approx: 1° lat ≈ 111km, so 40m ≈ 0.00036°. Use 0.0005° (~55m) for safety.
 */
export function holeBBox(
  tee: { lat: number; lng: number },
  green: { lat: number; lng: number }
): BBox {
  const PAD = 0.0005;
  return {
    south: Math.min(tee.lat, green.lat) - PAD,
    north: Math.max(tee.lat, green.lat) + PAD,
    west:  Math.min(tee.lng, green.lng) - PAD,
    east:  Math.max(tee.lng, green.lng) + PAD,
  };
}
