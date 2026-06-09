/**
 * Wind arrow geometry — shared, pure, and unit-tested. The Swift Distance view
 * mirrors this exact math (see DistanceView.swift / windArrowDegrees).
 */

/** Normalize any degree value into the [0, 360) range. */
export function normalize360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * On-screen rotation (degrees clockwise from "up") for the wind arrow.
 *
 * @param fromDeg  Bearing the wind blows FROM (true north), as Open-Meteo reports.
 * @param heading  The user's compass heading (true north). Pass 0 for a
 *                 north-up arrow when no heading is available.
 *
 * `+180` converts "wind from" → "wind blows to". `- heading` makes it head-up:
 * screen up (0°) is the way the user faces, so the arrow rotates as they turn.
 * 0° points up, 90° points right.
 */
export function windArrowDegrees(fromDeg: number, heading: number): number {
  return normalize360(fromDeg + 180 - heading);
}
