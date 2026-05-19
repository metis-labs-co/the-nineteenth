/**
 * useReverseGeocode — resolves a friendly place label for the user's
 * device coordinates so the weather modal can show "Melbourne, VIC" rather
 * than just raw lat/lng.
 *
 * Uses expo-location's offline reverse geocoder (no network call) and falls
 * back to the timezone city segment from Open-Meteo when expo-location
 * returns nothing — both are best-effort, so consumers should render the
 * fallback gracefully.
 */

import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import type { Coords } from './useDetailedDayForecast';

export interface ReverseGeocodeResult {
  /** Primary label, e.g. "Melbourne". */
  primary: string;
  /** Secondary label, e.g. "VIC" or country if region missing. May be null. */
  secondary: string | null;
}

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

async function reverseGeocode(coords: Coords): Promise<ReverseGeocodeResult | null> {
  try {
    const [result] = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    if (!result) return null;

    const primary = result.city ?? result.subregion ?? result.region ?? null;
    const secondary = result.region && result.region !== primary ? result.region : result.country ?? null;

    if (!primary) return null;
    return { primary, secondary };
  } catch {
    return null;
  }
}

export function useReverseGeocode(coords: Coords | null) {
  const enabled = coords !== null;
  const lat = coords ? roundCoord(coords.lat) : 0;
  const lng = coords ? roundCoord(coords.lng) : 0;

  return useQuery({
    queryKey: ['reverse-geocode', lat, lng],
    queryFn: () => reverseGeocode(coords as Coords),
    enabled,
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.LONG,
  });
}

/** Best-effort city label derived from an Open-Meteo IANA timezone string,
 *  e.g. "Australia/Melbourne" → "Melbourne". Used as a fallback when the
 *  reverse-geocoder returns nothing. */
export function timezoneToPlace(tz: string | null | undefined): string | null {
  if (!tz) return null;
  const segments = tz.split('/');
  const last = segments[segments.length - 1];
  if (!last || last === 'UTC') return null;
  return last.replace(/_/g, ' ');
}
