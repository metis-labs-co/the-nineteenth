/**
 * GPS Calculations Utility
 *
 * Pure calculation functions for GPS/coordinate operations.
 * Extracted from coordinatesService for reusability.
 *
 * Features:
 * - Haversine formula for distance calculations
 * - Unit conversions (meters/yards)
 * - Coordinate grouping helpers
 */

import type { HoleCoordinate } from '@/types/database.types';
import type { PoiType } from '@/types/database/enums';

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Earth's radius in meters for Haversine calculations
 */
export const EARTH_RADIUS_METERS = 6371000;

/**
 * Conversion factor from meters to yards
 */
export const METERS_TO_YARDS = 1.09361;

// =====================================================
// CONVERSION FUNCTIONS
// =====================================================

/**
 * Convert degrees to radians
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert distance in meters to yards
 *
 * @param meters - Distance in meters
 * @returns Distance in yards
 */
export function metersToYards(meters: number): number {
  return meters * METERS_TO_YARDS;
}

/**
 * Convert distance in yards to meters
 *
 * @param yards - Distance in yards
 * @returns Distance in meters
 */
export function yardsToMeters(yards: number): number {
  return yards / METERS_TO_YARDS;
}

// =====================================================
// DISTANCE CALCULATIONS
// =====================================================

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 *
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate distance between two HoleCoordinate objects
 *
 * @param from - Starting coordinate
 * @param to - Ending coordinate
 * @returns Distance in meters
 */
export function calculateCoordinateDistance(
  from: HoleCoordinate,
  to: HoleCoordinate
): number {
  return calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude);
}

/**
 * Calculate distance from a point to a HoleCoordinate
 *
 * @param lat - Latitude of the point
 * @param lon - Longitude of the point
 * @param to - Target coordinate
 * @returns Distance in meters
 */
export function calculateDistanceToCoordinate(
  lat: number,
  lon: number,
  to: HoleCoordinate
): number {
  return calculateDistance(lat, lon, to.latitude, to.longitude);
}

// =====================================================
// FORMATTING
// =====================================================

/**
 * Format a distance in meters to a human-readable km/m string
 *
 * @param meters - Distance in meters
 * @returns Formatted string (e.g. "850m", "4.2km", "142km")
 */
export function formatDistanceKm(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  if (meters < 100000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters / 1000)}km`;
}

// =====================================================
// COORDINATE GROUPING
// =====================================================

/**
 * Grouped coordinates by hole number
 */
export interface HoleCoordinatesByHole {
  [holeNumber: number]: HoleCoordinate[];
}

/**
 * Group coordinates by hole number
 *
 * @param coordinates - Array of hole coordinates
 * @returns Object with hole numbers as keys and coordinate arrays as values
 */
export function groupCoordinatesByHole(
  coordinates: HoleCoordinate[]
): HoleCoordinatesByHole {
  const grouped: HoleCoordinatesByHole = {};
  for (const coord of coordinates) {
    if (!grouped[coord.hole_number]) {
      grouped[coord.hole_number] = [];
    }
    grouped[coord.hole_number].push(coord);
  }
  return grouped;
}

/**
 * Get a specific POI type from a list of coordinates
 *
 * @param coordinates - Array of coordinates for a hole
 * @param poiType - The POI type to find
 * @returns The coordinate or undefined if not found
 */
export function getCoordinateByPoiType(
  coordinates: HoleCoordinate[],
  poiType: PoiType
): HoleCoordinate | undefined {
  return coordinates.find((c) => c.poi_type === poiType);
}

/**
 * Get coordinates for a specific hole from grouped coordinates
 *
 * @param groupedCoords - Coordinates grouped by hole
 * @param holeNumber - The hole number to get
 * @returns Array of coordinates for the hole (empty if not found)
 */
export function getCoordinatesForHole(
  groupedCoords: HoleCoordinatesByHole,
  holeNumber: number
): HoleCoordinate[] {
  return groupedCoords[holeNumber] || [];
}
