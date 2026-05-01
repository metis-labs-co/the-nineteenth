/**
 * Hole hazard row shape — mirrors `hole_hazards` table.
 * Phase C1 of the tiered hole-map roadmap.
 */

export type HazardType = 'bunker' | 'water';
export type HazardSource = 'golfapi' | 'osm' | 'manual';

/** GeoJSON-style polygon coordinate ring (closed: first == last). */
export interface PolygonRing {
  /** [lng, lat] pairs (GeoJSON convention). */
  coordinates: Array<[number, number]>;
}

/** Database row shape for hole_hazards. */
export interface HoleHazardRow {
  id: string;
  course_id: string;
  hole_number: number;
  hazard_type: HazardType;
  /** PostGIS geography stored as GeoJSON. */
  polygon: { type: 'Polygon'; coordinates: number[][][] };
  source: HazardSource;
  external_id: string | null;
  created_at: string;
}

/** Decoded shape for client rendering. Polygon as a list of LatLngs. */
export interface HazardPolygon {
  type: HazardType;
  source: HazardSource;
  externalId: string | null;
  /** Outer ring as LatLngs in render-ready order. */
  polygon: Array<{ latitude: number; longitude: number }>;
}
