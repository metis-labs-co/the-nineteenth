/**
 * Theme Store - Zustand state management for dark mode
 *
 * Manages theme preferences including:
 * - Theme mode (light/dark/system)
 * - Persisted to AsyncStorage for offline support
 * - Syncs with system color scheme when in 'system' mode
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import { ThemeMode, SurfaceStyle, BackdropStyle } from '@/constants/theme';

interface ThemeState {
  // Theme mode preference
  themeMode: ThemeMode;

  // Surface treatment preference (solid vs brand-tinted translucent)
  surfaceStyle: SurfaceStyle;

  // Backdrop preference for the dark + translucent combination
  // (the photographic image only renders when both dark mode and translucent
  // surfaces are active; this toggle lets users opt out of the image alone)
  backdropStyle: BackdropStyle;

  // Resolved theme (light or dark) based on mode and system preference
  resolvedTheme: 'light' | 'dark';

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setSurfaceStyle: (style: SurfaceStyle) => void;
  setBackdropStyle: (style: BackdropStyle) => void;
  toggleTheme: () => void;

  // Internal: Update resolved theme based on system changes
  _updateResolvedTheme: (systemScheme: ColorSchemeName) => void;
}

/**
 * Resolve the actual theme based on mode and system preference
 */
function resolveTheme(mode: ThemeMode, systemScheme: ColorSchemeName): 'light' | 'dark' {
  if (mode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Initial state - defaults to system preference
      themeMode: 'system',
      surfaceStyle: 'solid',
      backdropStyle: 'image',
      resolvedTheme: resolveTheme('system', Appearance.getColorScheme()),

      // Actions
      setThemeMode: (mode) => {
        const systemScheme = Appearance.getColorScheme();
        set({
          themeMode: mode,
          resolvedTheme: resolveTheme(mode, systemScheme),
        });
      },

      setSurfaceStyle: (style) => {
        set({ surfaceStyle: style });
      },

      setBackdropStyle: (style) => {
        set({ backdropStyle: style });
      },

      toggleTheme: () => {
        const { themeMode, resolvedTheme } = get();
        // If in system mode, switch to the opposite of current resolved theme
        // Otherwise toggle between light and dark
        if (themeMode === 'system') {
          set({
            themeMode: resolvedTheme === 'light' ? 'dark' : 'light',
            resolvedTheme: resolvedTheme === 'light' ? 'dark' : 'light',
          });
        } else {
          const newMode = themeMode === 'light' ? 'dark' : 'light';
          set({
            themeMode: newMode,
            resolvedTheme: newMode,
          });
        }
      },

      _updateResolvedTheme: (systemScheme) => {
        const { themeMode } = get();
        if (themeMode === 'system') {
          set({ resolvedTheme: systemScheme === 'dark' ? 'dark' : 'light' });
        }
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user preferences, not resolvedTheme (which is computed)
      partialize: (state) => ({
        themeMode: state.themeMode,
        surfaceStyle: state.surfaceStyle,
        backdropStyle: state.backdropStyle,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, resolve the theme based on persisted mode
        if (state) {
          const systemScheme = Appearance.getColorScheme();
          state.resolvedTheme = resolveTheme(state.themeMode, systemScheme);
          // Existing users may not have these persisted yet
          if (!state.surfaceStyle) {
            state.surfaceStyle = 'solid';
          }
          if (!state.backdropStyle) {
            state.backdropStyle = 'image';
          }
        }
      },
    }
  )
);

// Subscribe to system color scheme changes
Appearance.addChangeListener(({ colorScheme }) => {
  useThemeStore.getState()._updateResolvedTheme(colorScheme);
});

/**
 * Hook to check if dark mode is active
 */
export function useIsDarkMode(): boolean {
  return useThemeStore((state) => state.resolvedTheme === 'dark');
}

/**
 * Hook to get current theme mode setting
 */
export function useThemeMode(): ThemeMode {
  return useThemeStore((state) => state.themeMode);
}

/**
 * Hook to get current surface style setting
 */
export function useSurfaceStyle(): SurfaceStyle {
  return useThemeStore((state) => state.surfaceStyle);
}

/**
 * Hook to get current backdrop style setting
 */
export function useBackdropStyle(): BackdropStyle {
  return useThemeStore((state) => state.backdropStyle);
}
