// src/constants/theme.ts
// Design tokens for The Nineteenth
// Use these throughout the app for consistent styling
//
// COLOR PALETTES are now generated from the active brand configuration.
// To change the app's brand/colors, edit src/config/brands/index.ts

import { activeBrand } from '@/config/brands';
import { generateLightColors, generateDarkColors } from './colors';

// ============================================================================
// COLOR PALETTES - Generated from Brand Config
// ============================================================================

/**
 * Light mode color palette
 * Generated from the active brand configuration
 */
export const lightColors = generateLightColors(activeBrand);

/**
 * Dark mode color palette
 * Generated from the active brand configuration
 */
export const darkColors = generateDarkColors(activeBrand);

// Type for color palette
export type ColorPalette = typeof lightColors;

/**
 * @deprecated Use useThemeColors() hook or ThemeContext for dark mode support.
 * This export is maintained for backward compatibility.
 */
export const colors = lightColors;

// ============================================================================
// STATIC TOKENS - These do not change with brand
// ============================================================================

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
};

export const typography = {
  // Headings
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.25,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
  },

  // Body text
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },

  // Small text
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  smallBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },

  // Tiny text
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },

  // Large display text
  display: {
    fontSize: 40,
    fontWeight: '700' as const,
    lineHeight: 48,
    letterSpacing: -1,
  },
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  full: 9999,
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
};

export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
};

export const buttonSizes = {
  small: {
    height: 36,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  medium: {
    height: 44,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
  large: {
    height: 52,
    paddingHorizontal: spacing.xl,
    fontSize: 18,
  },
};

// Layout constants
export const layout = {
  // Screen padding
  screenPadding: spacing.lg,
  screenPaddingHorizontal: spacing.lg,
  screenPaddingVertical: spacing.lg,

  // Content width (for tablets/web)
  maxContentWidth: 640,

  // Common heights
  headerHeight: 60,
  tabBarHeight: 60,
  buttonHeight: 44,
  inputHeight: 48,

  // Common widths
  scoreButtonSize: 48,
  avatarSize: 40,
  iconButtonSize: 44,
};

// Animation durations (in ms)
export const animations = {
  fast: 150,
  normal: 250,
  slow: 350,
};

// Breakpoints (for responsive design)
export const breakpoints = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
};

// Z-index values
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  toast: 1600,
};

// Skins feature color (amber/gold)
export const skinsColor = '#f59e0b';

// Wolf feature color (blue-purple)
export const wolfColor = '#7C5CFC';

// Feature-specific colors (used across multiple components)
export const featureColors = {
  prizePool: '#059669',
  skins: '#f59e0b',
  warning: '#f59e0b',
  error: '#DC2626',
  adjustment: '#6B7280',
} as const;

// Medal colors for podium/ranking displays
export const medalColors = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

// Export a theme object with everything
export const theme = {
  colors,
  lightColors,
  darkColors,
  spacing,
  typography,
  borderRadius,
  shadows,
  iconSizes,
  buttonSizes,
  layout,
  animations,
  breakpoints,
  zIndex,
  skinsColor,
  wolfColor,
  featureColors,
  medalColors,
} as const;

// Type for the theme
export type Theme = typeof theme;
export type ThemeMode = 'light' | 'dark' | 'system';
export type SurfaceStyle = 'solid' | 'translucent';
export type BackdropStyle = 'image' | 'none';

// Export individual items as default as well
export default theme;
