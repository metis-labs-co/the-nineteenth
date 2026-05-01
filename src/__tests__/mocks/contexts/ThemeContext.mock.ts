/**
 * Theme Context Mock
 *
 * Provides mock implementations of theme context hooks for testing.
 * Use these to mock theme behavior in component tests.
 */

import { lightColors, darkColors, ColorPalette } from '@/constants/theme';

// ============================================================================
// MOCK VALUES
// ============================================================================

/**
 * Create a mock theme context value
 */
export function createMockThemeContext(isDark = false) {
  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
    themeMode: isDark ? ('dark' as const) : ('light' as const),
    surfaceStyle: 'solid' as const,
    backdropStyle: 'image' as const,
    setThemeMode: jest.fn(),
    setSurfaceStyle: jest.fn(),
    setBackdropStyle: jest.fn(),
    toggleTheme: jest.fn(),
  };
}

/**
 * Create mock useThemeColors return value
 */
export function createMockThemeColors(isDark = false): ColorPalette {
  return isDark ? darkColors : lightColors;
}

// ============================================================================
// JEST MOCK FACTORY
// ============================================================================

/**
 * Create jest.mock factory for ThemeContext
 *
 * @example
 * jest.mock('@/context/ThemeContext', () => createThemeContextMock());
 */
export function createThemeContextMock(isDark = false) {
  const mockContext = createMockThemeContext(isDark);
  const mockColors = createMockThemeColors(isDark);

  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useTheme: () => mockContext,
    useThemeColors: () => mockColors,
    useIsDark: () => isDark,
  };
}

// ============================================================================
// DEFAULT EXPORTS FOR COMMON CASES
// ============================================================================

export const lightThemeMock = createMockThemeContext(false);
export const darkThemeMock = createMockThemeContext(true);
export const lightColorsMock = createMockThemeColors(false);
export const darkColorsMock = createMockThemeColors(true);
