/**
 * useUserCountry - Detect user's country for location-aware featured courses
 *
 * Priority chain:
 * 1. Cached country from AsyncStorage (7-day TTL)
 * 2. GPS reverse geocode via expo-location (one-shot, not continuous)
 * 3. Home club country fallback
 * 4. null → search-only view
 *
 * Returns { country, isLoading } where country is 'Australia' | 'New Zealand' | null
 */

import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHomeClub } from '@/hooks/useHomeClub';
import { useSettingsStore } from '@/store/settingsStore';
import { COUNTRY_NAMES, normalizeCountryFromGps } from '@/constants/countries';

// =====================================================
// CONSTANTS
// =====================================================

const COUNTRY_CACHE_KEY = '@detected_country';
const COUNTRY_CACHE_TTL_KEY = '@detected_country_ttl';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// =====================================================
// TYPES
// =====================================================

export interface UseUserCountryReturn {
  /** Detected country or null if unknown */
  country: string | null;
  /** True while detection is in progress */
  isLoading: boolean;
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Read cached country if still within TTL
 */
async function getCachedCountry(): Promise<string | null> {
  try {
    const [country, ttlStr] = await Promise.all([
      AsyncStorage.getItem(COUNTRY_CACHE_KEY),
      AsyncStorage.getItem(COUNTRY_CACHE_TTL_KEY),
    ]);

    if (!country || !ttlStr) return null;

    const expiry = parseInt(ttlStr, 10);
    if (Date.now() > expiry) {
      // Cache expired — clear it
      await AsyncStorage.multiRemove([COUNTRY_CACHE_KEY, COUNTRY_CACHE_TTL_KEY]);
      return null;
    }

    return COUNTRY_NAMES.includes(country) ? country : null;
  } catch {
    return null;
  }
}

/**
 * Persist detected country with TTL
 */
async function setCachedCountry(country: string): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [COUNTRY_CACHE_KEY, country],
      [COUNTRY_CACHE_TTL_KEY, String(Date.now() + CACHE_TTL_MS)],
    ]);
  } catch (err) {
    console.warn('[useUserCountry] Failed to cache country:', err);
  }
}

/**
 * Normalize country strings from reverse geocode to a known country name.
 * Re-exported for backwards compatibility.
 */
export const normalizeSupportedCountry = normalizeCountryFromGps;

// =====================================================
// MAIN HOOK
// =====================================================

export function useUserCountry(): UseUserCountryReturn {
  const countryOverride = useSettingsStore((state) => state.countryOverride);

  const [country, setCountry] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const resolvedRef = useRef(false);
  const [gpsChecked, setGpsChecked] = useState(false);

  const { data: homeClub, isLoading: homeClubLoading } = useHomeClub();

  // If user has set a country override, skip all detection
  if (countryOverride) {
    return { country: countryOverride, isLoading: false };
  }

  // Step 1: Check cache on mount
  useEffect(() => {
    let cancelled = false;

    async function checkCache() {
      const cached = await getCachedCountry();
      if (cached && !cancelled) {
        setCountry(cached);
        setIsLoading(false);
        resolvedRef.current = true;
      }
    }

    checkCache();
    return () => { cancelled = true; };
  }, []);

  // Step 2: GPS reverse geocode (one-shot, no continuous watching)
  useEffect(() => {
    if (resolvedRef.current) return;

    let cancelled = false;

    async function detectViaGps() {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          if (!cancelled) setGpsChecked(true);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low, // Low accuracy is sufficient for country
        });

        if (cancelled || resolvedRef.current) return;

        const [result] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (cancelled || resolvedRef.current) return;

        const detected = normalizeCountryFromGps(result?.country ?? null);
        if (detected) {
          setCountry(detected);
          setIsLoading(false);
          resolvedRef.current = true;
          await setCachedCountry(detected);
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[useUserCountry] GPS detection failed:', err);
        }
      } finally {
        if (!cancelled) setGpsChecked(true);
      }
    }

    detectViaGps();
    return () => { cancelled = true; };
  }, []);

  // Step 3: Home club fallback — runs once GPS check is done and home club loaded
  useEffect(() => {
    if (resolvedRef.current) return;
    if (!gpsChecked) return;
    if (homeClubLoading) return;

    const clubCountry = normalizeCountryFromGps(homeClub?.country ?? null);
    if (clubCountry) {
      setCountry(clubCountry);
      resolvedRef.current = true;
      setCachedCountry(clubCountry);
    }
    setIsLoading(false);
  }, [gpsChecked, homeClub, homeClubLoading]);

  // Safety timeout: if still loading after 5s, stop loading
  useEffect(() => {
    if (!isLoading) return;

    const timer = setTimeout(() => {
      if (!resolvedRef.current) {
        setIsLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  return { country, isLoading };
}

export default useUserCountry;
