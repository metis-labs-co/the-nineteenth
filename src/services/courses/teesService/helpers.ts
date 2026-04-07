/**
 * Tees Service - Helper Functions
 *
 * Pure utility functions for tee calculations and color mapping.
 */

import type { Tee } from '@/types/database.types';

/**
 * Common tee colors mapped to hex values
 */
export const TEE_COLORS: Record<string, string> = {
  blue: '#0066CC',
  white: '#FFFFFF',
  red: '#CC0000',
  yellow: '#FFCC00',
  black: '#000000',
  gold: '#FFD700',
  green: '#228B22',
  silver: '#C0C0C0',
  orange: '#FF8C00',
  pink: '#FF69B4',
};

/**
 * Default tee color for unknown tees
 */
export const DEFAULT_TEE_COLOR = '#808080';

/**
 * Calculate total length from per-hole lengths
 * Sum of length_hole_1 through length_hole_18
 *
 * @param tee - Partial tee object with length fields
 * @returns Total length (0 if all holes are null)
 */
export function calculateTotalLength(tee: Partial<Tee>): number {
  let total = 0;
  for (let i = 1; i <= 18; i++) {
    const key = `length_hole_${i}` as keyof Tee;
    const length = tee[key];
    if (typeof length === 'number') {
      total += length;
    }
  }
  return total;
}

/**
 * Calculate front 9 length
 *
 * @param tee - Partial tee object with length fields
 * @returns Front 9 length (0 if all holes are null)
 */
export function calculateFront9Length(tee: Partial<Tee>): number {
  let total = 0;
  for (let i = 1; i <= 9; i++) {
    const key = `length_hole_${i}` as keyof Tee;
    const length = tee[key];
    if (typeof length === 'number') {
      total += length;
    }
  }
  return total;
}

/**
 * Calculate back 9 length
 *
 * @param tee - Partial tee object with length fields
 * @returns Back 9 length (0 if all holes are null)
 */
export function calculateBack9Length(tee: Partial<Tee>): number {
  let total = 0;
  for (let i = 10; i <= 18; i++) {
    const key = `length_hole_${i}` as keyof Tee;
    const length = tee[key];
    if (typeof length === 'number') {
      total += length;
    }
  }
  return total;
}

/**
 * Get hex color for a tee name
 * Maps common tee names to their standard colors
 *
 * @param teeName - Name of the tee (e.g., "Blue", "White", "Red")
 * @returns Hex color code (e.g., "#0066CC")
 */
export function getTeeColor(teeName: string): string {
  const normalized = teeName.toLowerCase().trim();

  // Check for exact match
  if (TEE_COLORS[normalized]) {
    return TEE_COLORS[normalized];
  }

  // Check if the name contains a known color
  for (const [colorName, hexColor] of Object.entries(TEE_COLORS)) {
    if (normalized.includes(colorName)) {
      return hexColor;
    }
  }

  return DEFAULT_TEE_COLOR;
}

/**
 * Normalize tee color - use provided color if hex, otherwise derive from name
 *
 * @param color - Provided hex color (may be null)
 * @param name - Tee name to derive color from if not provided
 * @returns Hex color code
 */
export function normalizeTeeColor(color: string | null, name: string): string {
  // If color is provided and looks like a hex color, use it
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color;
  }

  // Otherwise derive from name
  return getTeeColor(name);
}
