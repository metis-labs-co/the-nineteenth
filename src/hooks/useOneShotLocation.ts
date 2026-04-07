/**
 * useOneShotLocation - Lightweight one-shot GPS location hook
 *
 * Performs a single GPS read using already-granted permissions.
 * Does NOT prompt for permission — silently returns null if not granted.
 *
 * Use this for features like distance-based sorting where continuous
 * tracking is unnecessary. For continuous GPS tracking, use useUserLocation instead.
 */

import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface OneShotLocation {
  latitude: number;
  longitude: number;
}

interface UseOneShotLocationReturn {
  /** User's current location, or null if unavailable */
  location: OneShotLocation | null;
  /** Whether the location read is in progress */
  isLoading: boolean;
}

/**
 * Perform a single GPS position read on mount.
 *
 * @param enabled - Whether to attempt the location read (default: true)
 */
export function useOneShotLocation(enabled = true): UseOneShotLocationReturn {
  const [location, setLocation] = useState<OneShotLocation | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const readLocation = async () => {
      try {
        // Check if permission is already granted (don't prompt)
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      } catch {
        // Location read failed - user may not have granted permission
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    readLocation();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { location, isLoading };
}
