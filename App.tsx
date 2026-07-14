/**
 * App.tsx - Main application entry point
 *
 * Sets up all providers and navigation:
 * - React Query (TanStack Query) for server state
 * - Subscription Context for tier limits and feature access
 * - React Native Paper for Material Design 3 theming with dark mode
 * - Theme Context for app-wide dark mode support
 * - React Navigation for routing
 *
 * Provider order (outermost to innermost):
 * GestureHandlerRootView > SafeAreaProvider > QueryClientProvider > SubscriptionProvider > ThemeProvider > AppContent
 */

import React, { useMemo } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
} from 'react-native-paper';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from '@/navigation/RootNavigator';
import { queryClient } from '@/services/queryClient';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AchievementToastProvider } from '@/context/AchievementToastContext';
import { UnifiedToastDisplay } from '@/components/common/Toast';
import { ForceUpdateModal } from '@/components/common';
import { lightColors, darkColors } from '@/constants/theme';
import { activeBrand } from '@/config/brands';
import { useWatchBridge } from '@/watch/useWatchBridge';

// React Native resolves static image assets through require().
// eslint-disable-next-line @typescript-eslint/no-var-requires
const darkBackdrop = require('./assets/images/dark-backdrop-bg.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const lightBackdrop = require('./assets/images/light-backdrop-bg.png');

// ============================================================================
// PAPER THEME CONFIGURATION
// ============================================================================

/**
 * Custom Paper themes with app colors
 */
const customLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    primaryContainer: lightColors.primaryLighter,
    secondary: lightColors.gray600,
    secondaryContainer: lightColors.gray100,
    tertiary: lightColors.success,
    tertiaryContainer: lightColors.successLight,
    surface: lightColors.surface,
    surfaceVariant: lightColors.surfaceVariant,
    surfaceDisabled: lightColors.gray200,
    background: lightColors.background,
    error: lightColors.error,
    errorContainer: lightColors.errorLight,
    onPrimary: lightColors.white,
    onPrimaryContainer: lightColors.primaryDark,
    onSecondary: lightColors.white,
    onSecondaryContainer: lightColors.gray900,
    onTertiary: lightColors.white,
    onTertiaryContainer: lightColors.successDark,
    onSurface: lightColors.textPrimary,
    onSurfaceVariant: lightColors.textSecondary,
    onSurfaceDisabled: lightColors.textDisabled,
    onError: lightColors.white,
    onErrorContainer: lightColors.errorDark,
    onBackground: lightColors.textPrimary,
    outline: lightColors.border,
    outlineVariant: lightColors.borderLight,
    inverseSurface: lightColors.gray900,
    inverseOnSurface: lightColors.gray50,
    inversePrimary: lightColors.primaryLight,
    shadow: lightColors.black,
    scrim: lightColors.scrim,
    backdrop: lightColors.overlay,
  },
};

const customDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    primaryContainer: darkColors.primaryDark,
    secondary: darkColors.gray400,
    secondaryContainer: darkColors.gray200,
    tertiary: darkColors.success,
    tertiaryContainer: darkColors.successLight,
    surface: darkColors.surface,
    surfaceVariant: darkColors.surfaceVariant,
    surfaceDisabled: darkColors.gray200,
    background: darkColors.background,
    error: darkColors.error,
    errorContainer: darkColors.errorLight,
    onPrimary: darkColors.gray900,
    onPrimaryContainer: darkColors.primaryLight,
    onSecondary: darkColors.gray900,
    onSecondaryContainer: darkColors.gray50,
    onTertiary: darkColors.gray900,
    onTertiaryContainer: darkColors.successDark,
    onSurface: darkColors.textPrimary,
    onSurfaceVariant: darkColors.textSecondary,
    onSurfaceDisabled: darkColors.textDisabled,
    onError: darkColors.gray900,
    onErrorContainer: darkColors.errorDark,
    onBackground: darkColors.textPrimary,
    outline: darkColors.border,
    outlineVariant: darkColors.borderLight,
    inverseSurface: darkColors.gray800,
    inverseOnSurface: darkColors.gray100,
    inversePrimary: darkColors.primaryDark,
    shadow: darkColors.black,
    scrim: darkColors.scrim,
    backdrop: darkColors.overlay,
  },
};

// Adapt navigation themes to match Paper themes
const { LightTheme: AdaptedLightTheme, DarkTheme: AdaptedDarkTheme } =
  adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
    materialLight: customLightTheme,
    materialDark: customDarkTheme,
  });

// Merge adapted themes with custom colors
const CombinedLightTheme = {
  ...AdaptedLightTheme,
  colors: {
    ...AdaptedLightTheme.colors,
    background: lightColors.background,
    card: lightColors.surface,
    text: lightColors.textPrimary,
    border: lightColors.border,
    notification: lightColors.primary,
  },
};

const CombinedDarkTheme = {
  ...AdaptedDarkTheme,
  colors: {
    ...AdaptedDarkTheme.colors,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.textPrimary,
    border: darkColors.border,
    notification: darkColors.primary,
  },
};

// ============================================================================
// INNER APP (uses theme context)
// ============================================================================

function AppContent() {
  const { isDark, backdropStyle } = useTheme();

  // Apple Watch companion bridge. No-op on Android / when no watch is paired
  // (transport.isSupported() === false). Mounted once below all providers.
  useWatchBridge({});
  const showBackgroundImage = backdropStyle === 'image';
  const backdropSource = isDark ? darkBackdrop : lightBackdrop;
  const fallbackBackground = isDark
    ? activeBrand.darkMode.background
    : activeBrand.grays.gray100;

  const paperTheme = useMemo(() => {
    const base = isDark ? customDarkTheme : customLightTheme;
    if (!showBackgroundImage) return base;
    return {
      ...base,
      colors: { ...base.colors, background: 'transparent' },
    };
  }, [isDark, showBackgroundImage]);

  const navigationTheme = useMemo(() => {
    const base = isDark ? CombinedDarkTheme : CombinedLightTheme;
    if (!showBackgroundImage) return base;
    return {
      ...base,
      colors: { ...base.colors, background: 'transparent' },
    };
  }, [isDark, showBackgroundImage]);

  return (
    <PaperProvider theme={paperTheme}>
      <ToastProvider>
        <AchievementToastProvider>
          <View
            style={[styles.appRoot, { backgroundColor: fallbackBackground }]}
          >
            {showBackgroundImage && (
              <Image
                source={backdropSource}
                style={[
                  styles.backdropImage,
                  isDark ? styles.backdropImageDark : styles.backdropImageLight,
                ]}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            )}
            <RootNavigator theme={navigationTheme} />
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <UnifiedToastDisplay />
            <ForceUpdateModal />
          </View>
        </AchievementToastProvider>
      </ToastProvider>
    </PaperProvider>
  );
}

const screen = Dimensions.get('screen');

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  backdropImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screen.width,
    height: screen.height,
  },
  // Dark image is moody to begin with; keep it muted so it reads as backdrop.
  backdropImageDark: {
    opacity: 0.15,
  },
  // Light image is bright/airy; gets more presence so it doesn't wash out.
  backdropImageLight: {
    opacity: 0.45,
  },
});

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SubscriptionProvider>
              <ThemeProvider>
                <AppContent />
              </ThemeProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
