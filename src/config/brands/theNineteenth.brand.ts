/**
 * The Nineteenth - Default Brand Configuration
 *
 * This is the default brand identity for The Nineteenth app.
 * Primary color: #459668 (Forest Green)
 */

import type { BrandConfig } from '../brand.types';

export const theNineteenthBrand: BrandConfig = {
  id: 'the-nineteenth',
  name: 'The Nineteenth',

  // Primary brand colors (Forest Green based on #459668)
  primary: {
    primary: '#459668',
    primaryDark: '#357a53',
    primaryLight: '#5aab7d',
    primaryLighter: '#8fcca6',
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
      base: '#459668', // Matches primary for brand cohesion
      light: '#8fcca6',
      dark: '#357a53',
    },
  },

  // Golf score colors
  golf: {
    eagle: '#10b981',
    birdie: '#22c55e',
    par: '#459668', // Matches brand primary
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
    primary: '#5aab7d', // Brighter green for dark backgrounds
    background: '#121614', // Very subtle green-tinted black
    surface: '#1c211e', // Subtle dark green
    surfaceVariant: '#2a302c', // Subtle medium dark green
  },
};

export default theNineteenthBrand;
