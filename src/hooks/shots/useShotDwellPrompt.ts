/**
 * useShotDwellPrompt
 *
 * Detects when the user has been stationary for a sustained window after
 * having moved beforehand, and fires a callback with the captured GPS
 * position so the caller can prompt them to log a shot.
 *
 * Heuristic
 *   - `useUserLocation` runs with `distanceInterval: 20`, so new readings
 *     only arrive when the user has moved >=20m. We treat each new reading
 *     as evidence of movement, then watch for a quiet period of
 *     `DWELL_DURATION_MS` with no further updates.
 *   - We don't fire on the very first reading (no prior movement to anchor
 *     the "stopped after walking" signal). The first reading just sets the
 *     baseline; subsequent readings flip `hasMovedSinceLastEvent`.
 *   - After firing or being dismissed, a cooldown blocks re-firing until
 *     the user moves again AND the cooldown window has elapsed.
 */

import { useEffect, useRef } from 'react';
import { calculateDistance } from '@/utils/gpsCalculations';
import type { UserLocation } from '@/hooks/location/userLocation';

export interface UseShotDwellPromptOptions {
  enabled: boolean;
  location: UserLocation | null;
  accuracy: number | null;
  /**
   * Called when a dwell event is detected. The argument is the user's
   * current GPS position at the time of the prompt.
   */
  onPrompt: (position: {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
  }) => void;
  /**
   * Read by the hook on every tick; if true, no new prompt fires. The
   * caller is responsible for setting this true while a prompt is on-screen
   * or while the club picker is open, so we don't stack prompts.
   */
  isPromptActive: boolean;
}

const DWELL_DURATION_MS = 45_000;
const COOLDOWN_AFTER_EVENT_MS = 30_000;
const TICK_INTERVAL_MS = 2_000;
/** Minimum distance from the last fire/dismiss position before re-arming. */
const REARM_DISTANCE_M = 25;

export function useShotDwellPrompt({
  enabled,
  location,
  accuracy,
  onPrompt,
  isPromptActive,
}: UseShotDwellPromptOptions): void {
  const lastChangeAtRef = useRef<number | null>(null);
  const lastLocationRef = useRef<UserLocation | null>(null);
  const lastEventPositionRef = useRef<UserLocation | null>(null);
  const lastEventAtRef = useRef<number | null>(null);
  const hasMovedSinceLastEventRef = useRef(false);

  // Reset everything when the feature is toggled off.
  useEffect(() => {
    if (!enabled) {
      lastChangeAtRef.current = null;
      lastLocationRef.current = null;
      lastEventPositionRef.current = null;
      lastEventAtRef.current = null;
      hasMovedSinceLastEventRef.current = false;
    }
  }, [enabled]);

  // Track location changes. With distanceInterval: 20 in useUserLocation,
  // each new reading already means the user moved >=20m.
  useEffect(() => {
    if (!enabled || !location) return;
    const prev = lastLocationRef.current;
    const isNew =
      !prev ||
      prev.latitude !== location.latitude ||
      prev.longitude !== location.longitude;
    if (!isNew) return;

    lastLocationRef.current = location;
    lastChangeAtRef.current = Date.now();

    // Compare against the last fire/dismiss position to decide if we've
    // re-armed. On the first reading there's no prior event yet — leave
    // hasMoved at its initial false so we don't fire on the very first
    // dwell after launch.
    const lastEvtPos = lastEventPositionRef.current;
    if (lastEvtPos) {
      const distance = calculateDistance(
        lastEvtPos.latitude,
        lastEvtPos.longitude,
        location.latitude,
        location.longitude
      );
      if (distance >= REARM_DISTANCE_M) {
        hasMovedSinceLastEventRef.current = true;
      }
    } else {
      // Treat any second reading as movement — we have one prior data point
      // to anchor against, even without a prior event.
      hasMovedSinceLastEventRef.current = true;
    }
  }, [enabled, location]);

  // Tick to detect "stationary for DWELL_DURATION_MS" since
  // distanceInterval-filtered watch produces no events while stationary.
  // Use refs for high-frequency-changing inputs so we don't recreate the
  // interval whenever the toast appears/disappears or accuracy updates.
  const onPromptRef = useRef(onPrompt);
  const accuracyRef = useRef<number | null>(accuracy);
  const isPromptActiveRef = useRef(isPromptActive);
  onPromptRef.current = onPrompt;
  accuracyRef.current = accuracy;
  isPromptActiveRef.current = isPromptActive;

  useEffect(() => {
    if (!enabled) return undefined;

    const interval = setInterval(() => {
      if (isPromptActiveRef.current) return;
      if (!hasMovedSinceLastEventRef.current) return;

      const lastChange = lastChangeAtRef.current;
      if (lastChange === null) return;

      const now = Date.now();
      if (now - lastChange < DWELL_DURATION_MS) return;

      const lastEvent = lastEventAtRef.current;
      if (lastEvent !== null && now - lastEvent < COOLDOWN_AFTER_EVENT_MS) {
        return;
      }

      const loc = lastLocationRef.current;
      if (!loc) return;

      onPromptRef.current({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracyMeters: accuracyRef.current,
      });
      lastEventPositionRef.current = loc;
      lastEventAtRef.current = now;
      hasMovedSinceLastEventRef.current = false;
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled]);
}
