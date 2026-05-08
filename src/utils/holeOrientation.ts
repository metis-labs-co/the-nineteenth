/**
 * Hole-camera framing utilities.
 *
 * Both HoleMapScreen and ShotMapScreen frame the map the same way: rotate
 * so the tee→green axis runs vertically up the screen (green at top, tee
 * at bottom), centre near the green, and zoom to fit a typical par-4/5
 * with margin. This module centralises the constants and the bearing /
 * interpolation helpers so the two screens can't drift.
 *
 * Pure — no React, no Supabase, no react-native-maps types. Suitable for
 * unit tests.
 */

interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Camera centre bias — fraction of the green→tee segment, measured from
 * the green toward the tee. 0 = camera right on the green, 0.5 = midpoint,
 * 1 = camera on the tee. 0.35 keeps the camera near the green while pushing
 * the green toward the top of the screen so the approach is visible below.
 */
export const GREEN_AT_TOP_BIAS = 0.35;

/** Camera altitude (iOS) for the oriented hole view (~800m fits a par-4/5). */
export const HOLE_CAMERA_ALTITUDE = 800;

/** Camera zoom (Android) — equivalent framing to HOLE_CAMERA_ALTITUDE. */
export const HOLE_CAMERA_ZOOM = 17;

/**
 * Initial bearing from `from` to `to` in degrees clockwise from north.
 * Used to rotate the map so the tee→green axis runs vertically up the
 * screen.
 */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const phi1 = toRad(from.latitude);
  const phi2 = toRad(to.latitude);
  const dLambda = toRad(to.longitude - from.longitude);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Linearly interpolate between two coordinates. Good enough at hole-scale
 * (~hundreds of metres) — no need for great-circle interpolation here.
 */
export function lerpCoord(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

export interface OrientedCamera {
  center: LatLng;
  heading: number;
  pitch: 0;
  altitude: number;
  zoom: number;
}

/**
 * Build the camera config that frames the hole with green at the top of
 * the screen and the tee at the bottom. Returns null when either anchor
 * is missing — caller should fall back to a region-based framing.
 */
export function holeOrientedCamera(
  tee: LatLng | null | undefined,
  green: LatLng | null | undefined
): OrientedCamera | null {
  if (!tee || !green) return null;
  return {
    center: lerpCoord(green, tee, GREEN_AT_TOP_BIAS),
    heading: bearingDegrees(tee, green),
    pitch: 0,
    altitude: HOLE_CAMERA_ALTITUDE,
    zoom: HOLE_CAMERA_ZOOM,
  };
}
