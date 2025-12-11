// src/constants/theme.ts
// Design tokens for The Nineteenth
// Use these throughout the app for consistent styling

// ============================================================================
// COLOR PALETTES - Light & Dark Mode
// ============================================================================

/**
 * Light mode color palette
 */
export const lightColors = {
  // Primary (Blue)
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  primaryLight: '#60a5fa',
  primaryLighter: '#93c5fd',

  // Grays
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

  // Semantic Colors
  success: '#22c55e',
  successLight: '#86efac',
  successDark: '#16a34a',

  warning: '#f59e0b',
  warningLight: '#fbbf24',
  warningDark: '#d97706',

  error: '#ef4444',
  errorLight: '#fca5a5',
  errorDark: '#dc2626',

  info: '#3b82f6',
  infoLight: '#93c5fd',
  infoDark: '#2563eb',

  // Golf-Specific Colors
  birdie: '#22c55e',     // Green - 1 under par
  par: '#3b82f6',        // Blue - even par
  bogey: '#f59e0b',      // Orange - 1 over par
  doubleBogey: '#ef4444', // Red - 2+ over par
  eagle: '#10b981',      // Emerald - 2 under par

  // Golf Score Backgrounds (light tints for scorecard cells)
  eagleBackground: '#d1fae5',   // Emerald 100
  birdieBackground: '#dcfce7',  // Green 100
  parBackground: '#dbeafe',     // Blue 100
  bogeyBackground: '#fef3c7',   // Amber 100
  doubleBogeyBackground: '#fee2e2', // Red 100

  // Status Badge Backgrounds (very light tints)
  successBackground: '#f0fdf4', // Green 50
  warningBackground: '#fffbeb', // Amber 50
  errorBackground: '#fef2f2',   // Red 50
  primaryBackground: '#eff6ff', // Blue 50

  // Backgrounds
  background: '#f9fafb',
  surface: '#ffffff',
  surfaceVariant: '#f3f4f6',
  surfaceElevated: '#ffffff',
  surfaceSelected: '#ffffff',     // Selected tab/item background

  // Borders
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  borderLight: '#f3f4f6',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textDisabled: '#9ca3af',
  textInverse: '#ffffff',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  scrim: 'rgba(0, 0, 0, 0.3)',
};

/**
 * Dark mode color palette
 */
export const darkColors = {
  // Primary (Blue) - slightly brighter for dark backgrounds
  primary: '#60a5fa',
  primaryDark: '#3b82f6',
  primaryLight: '#93c5fd',
  primaryLighter: '#bfdbfe',

  // Grays (inverted)
  white: '#000000',       // Semantic: "lightest" color
  gray50: '#111827',
  gray100: '#1f2937',
  gray200: '#374151',
  gray300: '#4b5563',
  gray400: '#6b7280',
  gray500: '#9ca3af',
  gray600: '#d1d5db',
  gray700: '#e5e7eb',
  gray800: '#f3f4f6',
  gray900: '#f9fafb',
  black: '#ffffff',       // Semantic: "darkest" color

  // Semantic Colors - adjusted for dark backgrounds
  success: '#4ade80',
  successLight: '#166534',
  successDark: '#86efac',

  warning: '#fbbf24',
  warningLight: '#78350f',
  warningDark: '#fcd34d',

  error: '#f87171',
  errorLight: '#7f1d1d',
  errorDark: '#fca5a5',

  info: '#60a5fa',
  infoLight: '#1e3a5f',
  infoDark: '#93c5fd',

  // Golf-Specific Colors - adjusted for dark backgrounds
  birdie: '#4ade80',     // Brighter green
  par: '#60a5fa',        // Brighter blue
  bogey: '#fbbf24',      // Brighter orange
  doubleBogey: '#f87171', // Brighter red
  eagle: '#34d399',      // Brighter emerald

  // Golf Score Backgrounds (darker tints for scorecard cells in dark mode)
  eagleBackground: '#064e3b',   // Emerald 900
  birdieBackground: '#14532d',  // Green 900
  parBackground: '#1e3a5f',     // Blue 900
  bogeyBackground: '#78350f',   // Amber 900
  doubleBogeyBackground: '#7f1d1d', // Red 900

  // Status Badge Backgrounds (dark mode tints with ~10-15% opacity feel)
  successBackground: '#052e16', // Green 950
  warningBackground: '#451a03', // Amber 950
  errorBackground: '#450a0a',   // Red 950
  primaryBackground: '#172554', // Blue 950

  // Backgrounds
  background: '#0f172a',      // Slate 900
  surface: '#1e293b',         // Slate 800
  surfaceVariant: '#334155',  // Slate 700
  surfaceElevated: '#1e293b', // Elevated surfaces
  surfaceSelected: '#0c1929', // Dark blue-black for selected tabs

  // Borders
  border: '#334155',
  borderStrong: '#475569',
  borderLight: '#1e293b',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  textDisabled: '#475569',
  textInverse: '#0f172a',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  scrim: 'rgba(0, 0, 0, 0.5)',
};

// Type for color palette
export type ColorPalette = typeof lightColors;

/**
 * @deprecated Use useThemeColors() hook or ThemeContext for dark mode support.
 * This export is maintained for backward compatibility.
 */
export const colors = lightColors;

export const spacing = {
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
} as const;

// Type for the theme
export type Theme = typeof theme;
export type ThemeMode = 'light' | 'dark' | 'system';

// Export individual items as default as well
export default theme;