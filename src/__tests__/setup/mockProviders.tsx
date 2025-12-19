/**
 * Mock Providers for Testing
 *
 * Provides a TestProviders wrapper that includes all necessary contexts
 * for rendering components in tests. Use with renderWithProviders helper.
 */

import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { lightColors, darkColors } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface TestProvidersOptions {
  /** Initial theme mode */
  isDarkMode?: boolean;
  /** Override query client (useful for testing loading/error states) */
  queryClient?: QueryClient;
  /** Initial navigation route */
  initialRoute?: string;
}

export interface TestWrapperProps extends TestProvidersOptions {
  children: ReactNode;
}

// ============================================================================
// MOCK THEME CONTEXT
// ============================================================================

/**
 * Simplified mock theme context value
 */
const createMockThemeValue = (isDark: boolean) => ({
  colors: isDark ? darkColors : lightColors,
  isDark,
  themeMode: isDark ? ('dark' as const) : ('light' as const),
  setThemeMode: jest.fn(),
  toggleTheme: jest.fn(),
});

// Create a simple mock context for theme
const MockThemeContext = React.createContext(createMockThemeValue(false));

export function MockThemeProvider({
  children,
  isDark = false,
}: {
  children: ReactNode;
  isDark?: boolean;
}) {
  const value = React.useMemo(() => createMockThemeValue(isDark), [isDark]);
  return (
    <MockThemeContext.Provider value={value}>
      {children}
    </MockThemeContext.Provider>
  );
}

// Hook to use in tests (mimics useTheme)
export function useMockTheme() {
  return React.useContext(MockThemeContext);
}

// Hook to use in tests (mimics useThemeColors)
export function useMockThemeColors() {
  return React.useContext(MockThemeContext).colors;
}

// ============================================================================
// MOCK SUBSCRIPTION CONTEXT
// ============================================================================

export type MockSubscriptionTier = 'free' | 'social' | 'premium' | 'super_admin';

const createMockSubscriptionValue = (tier: MockSubscriptionTier = 'premium') => ({
  tier,
  isPremium: tier === 'premium' || tier === 'super_admin',
  isSocial: tier !== 'free',
  isFree: tier === 'free',
  isSuperAdmin: tier === 'super_admin',
  subscription: null,
  limits: null,
  allTierLimits: null,
  isLoading: false,
  isError: false,
  error: null,
  checkFeature: jest.fn().mockReturnValue({ allowed: true, reason: null }),
  checkCanCreateCompetition: jest.fn().mockReturnValue({ allowed: true }),
  checkCanAddRound: jest.fn().mockReturnValue({ allowed: true }),
  checkCanAddPlayer: jest.fn().mockReturnValue({ allowed: true }),
  checkGameType: jest.fn().mockReturnValue({ allowed: true }),
  refresh: jest.fn(),
});

const MockSubscriptionContext = React.createContext(createMockSubscriptionValue('premium'));

export function MockSubscriptionProvider({
  children,
  tier = 'premium',
}: {
  children: ReactNode;
  tier?: MockSubscriptionTier;
}) {
  const value = React.useMemo(() => createMockSubscriptionValue(tier), [tier]);
  return (
    <MockSubscriptionContext.Provider value={value}>
      {children}
    </MockSubscriptionContext.Provider>
  );
}

// Hook to use in tests
export function useMockSubscriptionContext() {
  return React.useContext(MockSubscriptionContext);
}

// ============================================================================
// QUERY CLIENT FACTORY
// ============================================================================

/**
 * Create a fresh QueryClient for testing
 * Each test should get its own QueryClient to avoid shared state
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// ============================================================================
// PAPER THEME MOCKS
// ============================================================================

const mockLightPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    surface: lightColors.surface,
    background: lightColors.background,
    onSurface: lightColors.textPrimary,
  },
};

const mockDarkPaperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    surface: darkColors.surface,
    background: darkColors.background,
    onSurface: darkColors.textPrimary,
  },
};

// ============================================================================
// TEST PROVIDERS WRAPPER
// ============================================================================

/**
 * TestProviders - Wraps components with all necessary providers for testing
 *
 * @example
 * render(<MyComponent />, { wrapper: ({ children }) => <TestProviders>{children}</TestProviders> });
 */
export function TestProviders({
  children,
  isDarkMode = false,
  queryClient,
  initialRoute,
}: TestWrapperProps) {
  const testQueryClient = queryClient || createTestQueryClient();
  const paperTheme = isDarkMode ? mockDarkPaperTheme : mockLightPaperTheme;
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <NavigationContainer>
        <QueryClientProvider client={testQueryClient}>
          <MockThemeProvider isDark={isDarkMode}>
            <MockSubscriptionProvider>
              <PaperProvider theme={paperTheme}>
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                  {children}
                </View>
              </PaperProvider>
            </MockSubscriptionProvider>
          </MockThemeProvider>
        </QueryClientProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
