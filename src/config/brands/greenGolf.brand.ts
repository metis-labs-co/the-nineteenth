/**
 * Green Golf - Alternative Brand Configuration
 *
 * A green-themed brand for white-label clients.
 * Primary color: #6eac4d (Lime Green)
 *
 * To use this brand, update src/config/brands/index.ts:
 *   import { greenGolfBrand } from './greenGolf.brand';
 *   export const activeBrand = greenGolfBrand;
 */

import type { BrandConfig } from '../brand.types';

export const greenGolfBrand: BrandConfig = {
  id: 'green-golf',
  name: 'Green Golf',

  // Primary brand colors (Lime Green based on #6eac4d)
  primary: {
    primary: '#6eac4d',
    primaryDark: '#558a3b',
    primaryLight: '#8bc26e',
    primaryLighter: '#b5d9a0',
  },

  // Semantic colors
  semantic: {
    success: {
      base: '#22c55e',
      light: '#86efac',
      dark: '#16a34a',
    },
    warning: {
      base: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      base: '#ef4444',
      light: '#fca5a5',
      dark: '#dc2626',
    },
    info: {
      base: '#6eac4d', // Matches primary for brand cohesion
      light: '#b5d9a0',
      dark: '#558a3b',
    },
  },

  // Golf score colors
  golf: {
    eagle: '#10b981',
    birdie: '#22c55e',
    par: '#6eac4d', // Matches brand primary
    bogey: '#f59e0b',
    doubleBogey: '#ef4444',
  },

  // Gray scale (neutral)
  grays: {
    white: '#ffffff',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    black: '#000000',
  },

  // Dark mode overrides
  darkMode: {
    primary: '#8bc26e', // Brighter lime for dark backgrounds
    background: '#0f1710', // Dark green-tinted black
    surface: '#1a2518', // Dark olive green
    surfaceVariant: '#2d3b28', // Medium dark green
  },
};

export default greenGolfBrand;
