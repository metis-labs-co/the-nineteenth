import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { lightColors, darkColors } from '@/constants/theme';
import type { Preview } from '@storybook/react';

// Create a fresh query client for Storybook
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Custom Paper themes matching the app
const customLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    surface: lightColors.surface,
    background: lightColors.background,
    onSurface: lightColors.textPrimary,
    onSurfaceVariant: lightColors.textSecondary,
  },
};

const customDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    surface: darkColors.surface,
    background: darkColors.background,
    onSurface: darkColors.textPrimary,
    onSurfaceVariant: darkColors.textSecondary,
  },
};

// Inner decorator that uses theme context
function ThemedStory({ children }: { children: React.ReactNode }) {
  const { isDark, colors } = useTheme();
  const paperTheme = isDark ? customDarkTheme : customLightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {children}
      </View>
    </PaperProvider>
  );
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ThemedStory>
              <Story />
            </ThemedStory>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    ),
  ],
};

export default preview;
