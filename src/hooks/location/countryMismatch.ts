/**
 * useCountryMismatchPrompt - Detect when GPS country differs from effective browsing country
 *
 * Performs a passive GPS check (no permission prompt), compares against the effective country,
 * and manages "already dismissed" suppression via AsyncStorage. Returns state for a
 * ConfirmationDialog in CourseListScreen.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeCountryFromGps } from '@/constants/countries';
import { useSettingsStore } from '@/store/settingsStore';

// =====================================================
// CONSTANTS
// =====================================================

/** Stores the GPS country string that was dismissed (not a boolean) */
const MISMATCH_DISMISSED_KEY = '@country_mismatch_dismissed_gps';

// =====================================================
// TYPES
// =====================================================

export interface UseCountryMismatchPromptReturn {
  /** Whether to show the mismatch prompt */
  showPrompt: boolean;
  /** Country detected via GPS */
  gpsCountry: string | null;
  /** Currently effective browsing country */
  effectiveCountry: string | null;
  /** User chose to switch to GPS country */
  handleSwitch: () => void;
  /** User chose to keep current country */
  handleKeep: () => void;
}

// =====================================================
// HOOK
// =====================================================

export function useCountryMismatchPrompt(
  effectiveCountry: string | null,
  isLoading: boolean
): UseCountryMismatchPromptReturn {
  const setCountryOverride = useSettingsStore((state) => state.setCountryOverride);

  const [gpsCountry, setGpsCountry] = useState<string | null>(null);
  const [dismissedCountry, setDismissedCountry] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissedLoaded, setDismissedLoaded] = useState(false);

  // Track previous effective country to clear dismissal on change
  const prevEffectiveRef = useRef<string | null>(null);

  // Step 1: Load dismissed country from AsyncStorage on mount
  useEffect(() => {
    async function loadDismissed() {
      try {
        const stored = await AsyncStorage.getItem(MISMATCH_DISMISSED_KEY);
        setDismissedCountry(stored);
      } catch {
        // Ignore read errors
      } finally {
        setDismissedLoaded(true);
      }
    }
    loadDismissed();
  }, []);

  // Step 2: GPS detection (runs once, passive — no permission prompt)
  useEffect(() => {
    let cancelled = false;

    async function detectGpsCountry() {
      try {
        // Request permission (no-op if already granted; on iOS, denied stays denied without re-prompting)
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) return;

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });

        if (cancelled) return;

        const [result] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (cancelled) return;

        const detected = normalizeCountryFromGps(result?.country ?? null);
        if (detected) {
          setGpsCountry(detected);
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[useCountryMismatchPrompt] GPS detection failed:', err);
        }
      }
    }

    detectGpsCountry();
    return () => { cancelled = true; };
  }, []);

  // Step 3: Clear dismissed flag when effective country changes (allows re-prompting after Settings change)
  useEffect(() => {
    if (prevEffectiveRef.current !== null && effectiveCountry !== prevEffectiveRef.current) {
      setDismissedCountry(null);
      AsyncStorage.removeItem(MISMATCH_DISMISSED_KEY).catch(() => {});
    }
    prevEffectiveRef.current = effectiveCountry;
  }, [effectiveCountry]);

  // Step 4: Evaluate whether to show prompt
  useEffect(() => {
    if (isLoading || !dismissedLoaded) return;

    const shouldShow =
      gpsCountry !== null &&
      effectiveCountry !== null &&
      gpsCountry !== effectiveCountry &&
      gpsCountry !== dismissedCountry;

    setShowPrompt(shouldShow);
  }, [isLoading, dismissedLoaded, gpsCountry, effectiveCountry, dismissedCountry]);

  // Handlers
  const handleSwitch = useCallback(() => {
    if (!gpsCountry) return;
    setCountryOverride(gpsCountry);
    AsyncStorage.removeItem(MISMATCH_DISMISSED_KEY).catch(() => {});
    setDismissedCountry(null);
    setShowPrompt(false);
  }, [gpsCountry, setCountryOverride]);

  const handleKeep = useCallback(() => {
    if (!gpsCountry) return;
    setDismissedCountry(gpsCountry);
    AsyncStorage.setItem(MISMATCH_DISMISSED_KEY, gpsCountry).catch(() => {});
    setShowPrompt(false);
  }, [gpsCountry]);

  return {
    showPrompt,
    gpsCountry,
    effectiveCountry,
    handleSwitch,
    handleKeep,
  };
}
