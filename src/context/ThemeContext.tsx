/**
 * ThemeContext - Provides theme colors and dark mode state to the app
 *
 * This context provides:
 * - Current color palette (light or dark)
 * - isDark boolean for conditional styling
 * - Theme mode (light/dark/system)
 * - Methods to change theme
 *
 * Usage:
 * ```tsx
 * import { useThemeColors, useTheme } from '@/context/ThemeContext';
 *
 * // Get just the colors (most common use case)
 * const colors = useThemeColors();
 * <View style={{ backgroundColor: colors.background }}>
 *
 * // Get full theme context
 * const { colors, isDark, themeMode, setThemeMode, toggleTheme } = useTheme();
 * ```
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import {
  ColorPalette,
  ThemeMode,
  SurfaceStyle,
  BackdropStyle,
} from '@/constants/theme';
import { generateLightColors, generateDarkColors } from '@/constants/colors';
import { activeBrand } from '@/config/brands';
import { useThemeStore, useIsDarkMode } from '@/store/themeStore';

// Re-export ColorPalette for use in components that need to type color props
export type { ColorPalette };

// ============================================================================
// TYPES
// ============================================================================

interface ThemeContextValue {
  /** Current color palette based on theme mode and surface style */
  colors: ColorPalette;

  /** Whether dark mode is currently active */
  isDark: boolean;

  /** Current theme mode setting (light/dark/system) */
  themeMode: ThemeMode;

  /** Current surface style setting (solid/translucent) */
  surfaceStyle: SurfaceStyle;

  /** Current backdrop style setting (image/none) */
  backdropStyle: BackdropStyle;

  /** Set the theme mode */
  setThemeMode: (mode: ThemeMode) => void;

  /** Set the surface style */
  setSurfaceStyle: (style: SurfaceStyle) => void;

  /** Set the backdrop style */
  setBackdropStyle: (style: BackdropStyle) => void;

  /** Toggle between light and dark mode */
  toggleTheme: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeMode = useThemeStore((state) => state.themeMode);
  const surfaceStyle = useThemeStore((state) => state.surfaceStyle);
  const backdropStyle = useThemeStore((state) => state.backdropStyle);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const setSurfaceStyle = useThemeStore((state) => state.setSurfaceStyle);
  const setBackdropStyle = useThemeStore((state) => state.setBackdropStyle);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = useIsDarkMode();

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark
        ? generateDarkColors(activeBrand, surfaceStyle, backdropStyle)
        : generateLightColors(activeBrand, surfaceStyle, backdropStyle),
      isDark,
      themeMode,
      surfaceStyle,
      backdropStyle,
      setThemeMode,
      setSurfaceStyle,
      setBackdropStyle,
      toggleTheme,
    }),
    [
      isDark,
      themeMode,
      surfaceStyle,
      backdropStyle,
      setThemeMode,
      setSurfaceStyle,
      setBackdropStyle,
      toggleTheme,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get the full theme context including colors, mode, and actions
 *
 * @example
 * const { colors, isDark, themeMode, setThemeMode, toggleTheme } = useTheme();
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Get just the current color palette - most common use case
 *
 * @example
 * const colors = useThemeColors();
 * <View style={{ backgroundColor: colors.background }}>
 */
export function useThemeColors(): ColorPalette {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeColors must be used within a ThemeProvider');
  }
  return context.colors;
}

/**
 * Get just the isDark boolean
 *
 * @example
 * const isDark = useIsDark();
 * <StatusBar style={isDark ? 'light' : 'dark'} />
 */
export function useIsDark(): boolean {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useIsDark must be used within a ThemeProvider');
  }
  return context.isDark;
}
