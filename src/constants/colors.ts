/**
 * Color Generation Utilities
 *
 * Generates complete light and dark color palettes from a brand configuration.
 * This ensures consistent derivation of all theme colors from the brand config.
 *
 * The generated palettes match the exact structure expected by the existing
 * ColorPalette type used throughout the app.
 */

import type { BrandConfig } from '@/config/brand.types';

// ============================================================================
// STATIC ACCENT COLORS (consistent across all brands)
// ============================================================================

/** Purple accent colors for AI features and secondary actions */
const accentColors = {
  accent: '#8b5cf6', // Violet 500
  accentDark: '#7c3aed', // Violet 600
  accentLight: '#a78bfa', // Violet 400
};

// ============================================================================
// COLOR MANIPULATION UTILITIES
// ============================================================================

/**
 * Add opacity to a hex color, returning an 8-character hex color.
 *
 * @param hexColor - Hex color string (e.g., '#6eac4d' or '#fff')
 * @param opacity - Opacity value from 0 to 1 (e.g., 0.2 for 20%)
 * @returns 8-character hex color with alpha (e.g., '#6eac4d33')
 *
 * @example
 * withOpacity('#6eac4d', 0.2)  // Returns '#6eac4d33'
 * withOpacity(colors.primary, 0.3)  // Returns primary color with 30% opacity
 *
 * Common opacity values:
 * - 0.05 = '0D' (very subtle)
 * - 0.10 = '1A' (subtle)
 * - 0.15 = '26'
 * - 0.20 = '33' (light tint)
 * - 0.30 = '4D' (medium tint)
 * - 0.40 = '66'
 * - 0.50 = '80' (half)
 */
export function withOpacity(hexColor: string, opacity: number): string {
  // Normalize hex color (handle shorthand like #fff)
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Convert opacity to 2-digit hex (0-255)
  const alphaHex = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${hex}${alphaHex}`;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h, s, l };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): RGB {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Adjust color lightness to a specific value (0 = black, 1 = white)
 * Used for generating tinted backgrounds
 */
function adjustLightness(hex: string, targetLightness: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.l = targetLightness;
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Brighten a color by increasing lightness
 */
function brightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.l = Math.min(1, hsl.l + amount);
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Darken a color by reducing lightness
 */
function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.l = Math.max(0, hsl.l * (1 - amount));
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

// ============================================================================
// PALETTE GENERATION
// ============================================================================

/**
 * Generate light mode color palette from brand config
 *
 * This produces a palette that matches the original lightColors structure
 * in theme.ts, ensuring backwards compatibility with all components.
 */
export function generateLightColors(brand: BrandConfig) {
  const { primary, semantic, golf, grays } = brand;

  return {
    // Primary colors
    primary: primary.primary,
    primaryDark: primary.primaryDark,
    primaryLight: primary.primaryLight,
    primaryLighter: primary.primaryLighter,

    // Grays (direct mapping)
    white: grays.white,
    gray50: grays.gray50,
    gray100: grays.gray100,
    gray200: grays.gray200,
    gray300: grays.gray300,
    gray400: grays.gray400,
    gray500: grays.gray500,
    gray600: grays.gray600,
    gray700: grays.gray700,
    gray800: grays.gray800,
    gray900: grays.gray900,
    black: grays.black,

    // Semantic colors
    success: semantic.success.base,
    successLight: semantic.success.light,
    successDark: semantic.success.dark,

    warning: semantic.warning.base,
    warningLight: semantic.warning.light,
    warningDark: semantic.warning.dark,

    error: semantic.error.base,
    errorLight: semantic.error.light,
    errorDark: semantic.error.dark,

    info: semantic.info.base,
    infoLight: semantic.info.light,
    infoDark: semantic.info.dark,

    // Golf-specific colors
    birdie: golf.birdie,
    par: golf.par,
    bogey: golf.bogey,
    doubleBogey: golf.doubleBogey,
    eagle: golf.eagle,

    // Golf score backgrounds (light tints for scorecard cells)
    // Using specific Tailwind-like color values for consistency
    eagleBackground: '#d1fae5', // Emerald 100
    birdieBackground: '#eff6ff', // Blue 50 (lighter)
    parBackground: '#f3f4f6', // Gray 100
    bogeyBackground: '#fee4d6', // Red-orange tint
    doubleBogeyBackground: '#fee2e2', // Red 100

    // Status badge backgrounds (very light tints)
    successBackground: '#f0fdf4', // Green 50
    warningBackground: '#fffbeb', // Amber 50
    errorBackground: '#fef2f2', // Red 50
    primaryBackground: adjustLightness(primary.primary, 0.95),

    // Backgrounds
    background: grays.gray50,
    surface: grays.white,
    surfaceVariant: grays.gray100,
    surfaceElevated: grays.white,
    surfaceSelected: grays.white,

    // Borders
    border: grays.gray200,
    borderStrong: grays.gray300,
    borderLight: grays.gray100,

    // Text
    textPrimary: grays.gray900,
    textSecondary: grays.gray500,
    textTertiary: grays.gray400,
    textDisabled: grays.gray400,
    textInverse: grays.white,
    textOnColored: '#ffffff', // Always white - for text on colored backgrounds (badges, buttons on primary/warning/etc.)

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
    scrim: 'rgba(0, 0, 0, 0.3)',

    // Accent colors (static across brands - purple for AI features)
    accent: accentColors.accent,
    accentDark: accentColors.accentDark,
    accentLight: accentColors.accentLight,
  };
}

/**
 * Generate dark mode color palette from brand config
 *
 * This produces a palette that matches the original darkColors structure
 * in theme.ts, with appropriate adjustments for dark backgrounds.
 */
export function generateDarkColors(brand: BrandConfig) {
  const { primary, semantic, golf, grays, darkMode } = brand;

  // Brighten semantic colors for dark backgrounds
  const brightenedSuccess = brightenColor(semantic.success.base, 0.15);
  const brightenedWarning = brightenColor(semantic.warning.base, 0.1);
  const brightenedError = brightenColor(semantic.error.base, 0.1);
  const brightenedInfo = brightenColor(semantic.info.base, 0.15);

  return {
    // Primary (brighter for dark mode)
    primary: darkMode.primary,
    primaryDark: primary.primary, // Original becomes "dark" variant
    primaryLight: brightenColor(darkMode.primary, 0.15),
    primaryLighter: brightenColor(darkMode.primary, 0.3),

    // Grays (inverted semantically for dark mode)
    white: grays.black, // "Lightest" is now dark
    gray50: grays.gray900,
    gray100: grays.gray800,
    gray200: grays.gray700,
    gray300: grays.gray600,
    gray400: grays.gray500,
    gray500: grays.gray400,
    gray600: grays.gray300,
    gray700: grays.gray200,
    gray800: grays.gray100,
    gray900: grays.gray50,
    black: grays.white, // "Darkest" is now light

    // Semantic colors (brightened for visibility on dark backgrounds)
    success: brightenedSuccess,
    successLight: darkenColor(semantic.success.base, 0.6), // Dark tint
    successDark: brightenColor(brightenedSuccess, 0.15),

    warning: brightenedWarning,
    warningLight: darkenColor(semantic.warning.base, 0.7),
    warningDark: brightenColor(brightenedWarning, 0.1),

    error: brightenedError,
    errorLight: darkenColor(semantic.error.base, 0.7),
    errorDark: brightenColor(brightenedError, 0.1),

    info: brightenedInfo,
    infoLight: darkenColor(semantic.info.base, 0.6),
    infoDark: brightenColor(brightenedInfo, 0.15),

    // Golf-specific colors (brightened for dark mode)
    birdie: brightenColor(golf.birdie, 0.1),
    par: '#9ca3af', // Gray 400 - visible on dark backgrounds
    bogey: brightenColor(golf.bogey, 0.05),
    doubleBogey: brightenColor(golf.doubleBogey, 0.1),
    eagle: brightenColor(golf.eagle, 0.1),

    // Golf score backgrounds (dark tints for scorecard cells)
    eagleBackground: '#064e3b', // Emerald 900
    birdieBackground: '#1e3a5f', // Blue 900
    parBackground: '#374151', // Gray 700
    bogeyBackground: '#7f2315', // Red-orange dark
    doubleBogeyBackground: '#7f1d1d', // Red 900

    // Status badge backgrounds (dark tints)
    successBackground: '#052e16', // Green 950
    warningBackground: '#451a03', // Amber 950
    errorBackground: '#450a0a', // Red 950
    primaryBackground: darkenColor(primary.primary, 0.8),

    // Backgrounds
    background: darkMode.background,
    surface: darkMode.surface,
    surfaceVariant: darkMode.surfaceVariant,
    surfaceElevated: darkMode.surface,
    surfaceSelected: darkenColor(darkMode.surface, 0.3),

    // Borders
    border: darkMode.surfaceVariant,
    borderStrong: brightenColor(darkMode.surfaceVariant, 0.15),
    borderLight: darkMode.surface,

    // Text
    textPrimary: '#f1f5f9', // Slate 100
    textSecondary: '#94a3b8', // Slate 400
    textTertiary: '#64748b', // Slate 500
    textDisabled: '#475569', // Slate 600
    textInverse: darkMode.background,
    textOnColored: '#ffffff', // Always white - for text on colored backgrounds (badges, buttons on primary/warning/etc.)

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.7)',
    scrim: 'rgba(0, 0, 0, 0.5)',

    // Accent colors (static across brands - purple for AI features)
    accent: accentColors.accentLight, // Lighter for dark mode visibility
    accentDark: accentColors.accent,
    accentLight: brightenColor(accentColors.accentLight, 0.15),
  };
}
