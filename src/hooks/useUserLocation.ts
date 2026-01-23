/**
 * useUserLocation - Device Location Management Hook
 *
 * Manages expo-location permissions and position watching for GPS distance-to-pin feature.
 *
 * Features:
 * - Permission status tracking (undetermined, granted, denied)
 * - Background/foreground app state handling (pause/resume watching)
 * - Battery-efficient position watching (10s interval, 20m distance threshold)
 * - Clean unmount handling
 * - Tracks if user has been asked for permission (to avoid re-prompting)
 *
 * @example
 * ```tsx
 * function DistanceDisplay() {
 *   const {
 *     location,
 *     permissionStatus,
 *     isWatching,
 *     requestPermission,
 *     startWatching,
 *   } = useUserLocation();
 *
 *   if (permissionStatus === 'undetermined') {
 *     return <Button onPress={requestPermission}>Enable GPS</Button>;
 *   }
 *
 *   if (location) {
 *     return <Text>Lat: {location.latitude}, Lng: {location.longitude}</Text>;
 *   }
 *
 *   return <Text>Acquiring location...</Text>;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =====================================================
// CONSTANTS
// =====================================================

const GPS_PERMISSION_ASKED_KEY = '@gps_permission_asked';

// Battery-efficient watching configuration
const WATCH_CONFIG: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 10000, // 10 seconds
  distanceInterval: 20, // 20 meters
};

// =====================================================
// TYPES
// =====================================================

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface UseUserLocationReturn {
  /** Current user location (null if not available) */
  location: UserLocation | null;
  /** Location accuracy in meters (null if not available) */
  accuracy: number | null;
  /** Current permission status */
  permissionStatus: LocationPermissionStatus;
  /** Whether we're currently loading/checking permission */
  isLoading: boolean;
  /** Whether location watching is active */
  isWatching: boolean;
  /** Request location permission from the user */
  requestPermission: () => Promise<boolean>;
  /** Start watching user's location (no-op if permission not granted) */
  startWatching: () => void;
  /** Stop watching user's location */
  stopWatching: () => void;
  /** Whether the user has been asked for permission before */
  hasBeenAsked: boolean;
  /** Any error that occurred */
  error: string | null;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if user has been asked for GPS permission before
 */
async function hasBeenAskedForPermission(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(GPS_PERMISSION_ASKED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark that user has been asked for GPS permission
 */
async function markAskedForPermission(): Promise<void> {
  try {
    await AsyncStorage.setItem(GPS_PERMISSION_ASKED_KEY, 'true');
  } catch (error) {
    console.error('[useUserLocation] Error saving permission asked flag:', error);
  }
}

/**
 * Map expo-location permission status to our status type
 */
function mapPermissionStatus(status: Location.PermissionStatus): LocationPermissionStatus {
  switch (status) {
    case Location.PermissionStatus.GRANTED:
      return 'granted';
    case Location.PermissionStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
}

// =====================================================
// MAIN HOOK
// =====================================================

/**
 * Hook for managing device location permissions and tracking
 */
export function useUserLocation(): UseUserLocationReturn {
  // State
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const [hasBeenAsked, setHasBeenAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const shouldWatchRef = useRef(false);

  // =====================================================
  // PERMISSION CHECKING
  // =====================================================

  /**
   * Check current permission status and if user has been asked before
   */
  useEffect(() => {
    const checkPermissionStatus = async () => {
      try {
        setIsLoading(true);

        // Check if user has been asked before
        const asked = await hasBeenAskedForPermission();
        setHasBeenAsked(asked);

        // Check current permission status
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(mapPermissionStatus(status));

        if (__DEV__) {
          console.log('[useUserLocation] Initial permission status:', status, 'hasBeenAsked:', asked);
        }
      } catch (err) {
        console.error('[useUserLocation] Error checking permission:', err);
        setError('Failed to check location permission');
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissionStatus();
  }, []);

  // =====================================================
  // PERMISSION REQUEST
  // =====================================================

  /**
   * Request location permission from the user
   * Returns true if permission was granted
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Mark that we've asked (even if they deny)
      await markAskedForPermission();
      setHasBeenAsked(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      const mappedStatus = mapPermissionStatus(status);
      setPermissionStatus(mappedStatus);

      if (__DEV__) {
        console.log('[useUserLocation] Permission request result:', status);
      }

      return mappedStatus === 'granted';
    } catch (err) {
      console.error('[useUserLocation] Error requesting permission:', err);
      setError('Failed to request location permission');
      return false;
    }
  }, []);

  // =====================================================
  // LOCATION WATCHING
  // =====================================================

  /**
   * Internal function to start the location subscription
   */
  const startLocationSubscription = useCallback(async () => {
    // Don't start if permission isn't granted
    if (permissionStatus !== 'granted') {
      if (__DEV__) {
        console.log('[useUserLocation] Cannot start watching - permission not granted');
      }
      return;
    }

    // Don't start if already watching
    if (watchSubscriptionRef.current) {
      return;
    }

    try {
      setError(null);

      if (__DEV__) {
        console.log('[useUserLocation] Starting location subscription...');
      }

      const subscription = await Location.watchPositionAsync(
        WATCH_CONFIG,
        (newLocation) => {
          setLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          });
          setAccuracy(newLocation.coords.accuracy);

          if (__DEV__) {
            console.log(
              '[useUserLocation] Location update:',
              newLocation.coords.latitude.toFixed(6),
              newLocation.coords.longitude.toFixed(6),
              'accuracy:',
              newLocation.coords.accuracy?.toFixed(0),
              'm'
            );
          }
        }
      );

      watchSubscriptionRef.current = subscription;
      setIsWatching(true);

      if (__DEV__) {
        console.log('[useUserLocation] Location subscription started');
      }
    } catch (err) {
      console.error('[useUserLocation] Error starting location subscription:', err);
      setError('Failed to start location tracking');
      setIsWatching(false);
    }
  }, [permissionStatus]);

  /**
   * Internal function to stop the location subscription
   */
  const stopLocationSubscription = useCallback(() => {
    if (watchSubscriptionRef.current) {
      if (__DEV__) {
        console.log('[useUserLocation] Stopping location subscription');
      }

      watchSubscriptionRef.current.remove();
      watchSubscriptionRef.current = null;
      setIsWatching(false);
    }
  }, []);

  /**
   * Public function to start watching location
   * No-op if permission isn't granted (defensive coding)
   */
  const startWatching = useCallback(() => {
    shouldWatchRef.current = true;

    // Only start if permission is granted
    if (permissionStatus === 'granted') {
      startLocationSubscription();
    } else if (__DEV__) {
      console.log('[useUserLocation] startWatching called but permission not granted, will start when granted');
    }
  }, [permissionStatus, startLocationSubscription]);

  /**
   * Public function to stop watching location
   */
  const stopWatching = useCallback(() => {
    shouldWatchRef.current = false;
    stopLocationSubscription();
  }, [stopLocationSubscription]);

  // =====================================================
  // APP STATE HANDLING
  // =====================================================

  /**
   * Handle app state changes (background/foreground)
   * Pause watching when app backgrounds to save battery
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      if (wasBackground && isNowActive && shouldWatchRef.current) {
        // App came to foreground - resume watching
        if (__DEV__) {
          console.log('[useUserLocation] App foregrounded - resuming location watching');
        }
        startLocationSubscription();
      } else if (!isNowActive && watchSubscriptionRef.current) {
        // App going to background - pause watching
        if (__DEV__) {
          console.log('[useUserLocation] App backgrounded - pausing location watching');
        }
        stopLocationSubscription();
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [startLocationSubscription, stopLocationSubscription]);

  // =====================================================
  // CLEANUP
  // =====================================================

  /**
   * Clean up subscription on unmount
   */
  useEffect(() => {
    return () => {
      if (watchSubscriptionRef.current) {
        if (__DEV__) {
          console.log('[useUserLocation] Cleaning up location subscription on unmount');
        }
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }
    };
  }, []);

  // =====================================================
  // AUTO-START WHEN PERMISSION GRANTED
  // =====================================================

  /**
   * If watching was requested but permission wasn't granted yet,
   * auto-start when permission is granted
   */
  useEffect(() => {
    if (permissionStatus === 'granted' && shouldWatchRef.current && !watchSubscriptionRef.current) {
      startLocationSubscription();
    }
  }, [permissionStatus, startLocationSubscription]);

  // =====================================================
  // RETURN
  // =====================================================

  return {
    location,
    accuracy,
    permissionStatus,
    isLoading,
    isWatching,
    requestPermission,
    startWatching,
    stopWatching,
    hasBeenAsked,
    error,
  };
}

export default useUserLocation;
