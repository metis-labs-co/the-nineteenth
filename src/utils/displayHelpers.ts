/**
 * Display Helpers
 *
 * Shared utility functions for formatting and displaying data in
 * scorecard UIs. Includes score color logic, name formatting,
 * and visual indicator utilities.
 */

import type { ColorPalette } from '@/constants/theme';
import { PICKUP_SCORE } from '@/constants/scoring';

// =====================================================
// SCORE DISPLAY TYPES
// =====================================================

/**
 * Types of score indicators for visual display
 */
export type ScoreIndicatorType =
  | 'eagle-or-better' // -2 or better: double circle
  | 'birdie'          // -1: single circle
  | 'par'             // 0: no indicator
  | 'bogey'           // +1: single square
  | 'double-bogey'    // +2 or worse: double square
  | 'pickup'          // 10 strokes: red "P"
  | 'no-score';       // no strokes recorded

// =====================================================
// SCORE COLOR FUNCTIONS
// =====================================================

/**
 * Get the color for a score relative to par
 *
 * @param strokes Gross strokes for the hole
 * @param par Par for the hole
 * @returns Color hex string
 */
export function getScoreDisplayColor(strokes: number, par: number): string {
  const diff = strokes - par;

  if (diff <= -2) return '#10b981'; // Emerald for eagle or better
  if (diff === -1) return '#22c55e'; // Green for birdie
  if (diff === 0) return '#3b82f6';  // Blue for par
  if (diff === 1) return '#f59e0b';  // Orange for bogey
  return '#ef4444';                   // Red for double bogey or worse
}

/**
 * Get background color for a score cell based on score vs par
 *
 * @param strokes Gross strokes
 * @param par Par for the hole
 * @param colors Theme color palette
 * @returns Background color or undefined for no background
 */
export function getScoreBackgroundColor(
  strokes: number,
  par: number,
  colors: ColorPalette
): string | undefined {
  const diff = strokes - par;

  if (diff <= -2) return colors.eagleBackground;
  if (diff === -1) return colors.birdieBackground;
  if (diff === 0) return colors.parBackground;
  if (diff === 1) return colors.bogeyBackground;
  if (diff >= 2) return colors.doubleBogeyBackground;

  return undefined;
}

/**
 * Determine the type of score indicator to display
 *
 * @param strokes Gross strokes (undefined if no score)
 * @param par Par for the hole
 * @returns The type of indicator to render
 */
export function getScoreIndicatorType(
  strokes: number | undefined,
  par: number
): ScoreIndicatorType {
  if (!strokes) return 'no-score';
  if (strokes >= PICKUP_SCORE) return 'pickup';

  const diff = strokes - par;

  if (diff <= -2) return 'eagle-or-better';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  return 'double-bogey';
}

// =====================================================
// NAME FORMATTING FUNCTIONS
// =====================================================

/**
 * Get the first name from a full name
 *
 * @param fullName The full name string
 * @returns The first name or 'Unknown' if not available
 */
export function getFirstName(fullName: string | undefined | null): string {
  if (!fullName) return 'Unknown';
  return fullName.split(' ')[0] || 'Unknown';
}

/**
 * Get initials from a full name
 *
 * @param fullName The full name string
 * @param maxChars Maximum number of characters to return (default: 2)
 * @returns The initials (e.g., "JD" for "John Doe")
 */
export function getInitials(fullName: string | undefined | null, maxChars: number = 2): string {
  if (!fullName) return '??';

  const parts = fullName.trim().split(/\s+/);
  const initials = parts
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, maxChars);

  return initials || '??';
}

/**
 * Truncate a name to fit within a given character limit
 *
 * @param name The name to truncate
 * @param maxLength Maximum characters to display
 * @returns Truncated name with ellipsis if needed
 */
export function truncateName(name: string | undefined | null, maxLength: number): string {
  if (!name) return 'Unknown';
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength - 1)}…`;
}

// =====================================================
// SCORE FORMATTING FUNCTIONS
// =====================================================

/**
 * Format a score for display, handling special cases
 *
 * @param strokes The strokes value
 * @returns Formatted string for display
 */
export function formatScore(strokes: number | undefined | null): string {
  if (strokes === undefined || strokes === null || strokes === 0) {
    return '-';
  }
  if (strokes >= PICKUP_SCORE) {
    return 'P';
  }
  return String(strokes);
}

/**
 * Format a total score with sign for relative to par display
 *
 * @param total The total score
 * @param parTotal The par for the course
 * @returns Formatted string with +/- (e.g., "+5", "-2", "E" for even)
 */
export function formatScoreRelativeToPar(total: number, parTotal: number): string {
  const diff = total - parTotal;

  if (diff === 0) return 'E';
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

/**
 * Format handicap for display
 *
 * @param handicap The handicap value
 * @returns Formatted string (e.g., "HC: 12")
 */
export function formatHandicap(handicap: number | undefined | null): string {
  return `HC: ${handicap ?? 0}`;
}

// =====================================================
// STAT FORMATTING FUNCTIONS
// =====================================================

/**
 * Format a percentage for display
 *
 * @param value The percentage value
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a ratio as "X/Y" for display
 *
 * @param numerator The numerator
 * @param denominator The denominator
 * @returns Formatted ratio string
 */
export function formatRatio(numerator: number, denominator: number): string {
  return `${numerator}/${denominator}`;
}
