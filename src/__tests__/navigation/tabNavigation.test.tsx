/**
 * Tab Navigation Tests
 *
 * Tests for bottom tab navigation behavior:
 * - Tab switching correctly changes active screen
 * - Tab state is preserved when switching between tabs
 * - Active tab indicator updates correctly
 * - Rapid tab switching is handled without race conditions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Theme, NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';


// Import after mocks
import MainTabNavigator from '@/navigation/MainTabNavigator';

// ============================================================================
// MOCKS
// ============================================================================

// Unmock NavigationContainer to use real navigation
jest.unmock('@react-navigation/native');

// Re-apply navigation hooks mock but keep NavigationContainer and other core components real
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    // Keep real NavigationContainer, createNavigatorFactory, etc.
    // Only mock hooks that might cause issues
    useFocusEffect: jest.fn((callback) => {
      callback();
    }),
  };
});

// Mock useAuth to simulate authenticated user
const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock NotificationContext
jest.mock('@/context/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
  useNotificationContext: () => ({
    unreadCount: 0,
    notifications: [],
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  }),
}));

// Mock ThemeContext
const mockLightColors = {
  primary: '#2E7D32',
  primaryLight: '#60AD5E',
  primaryDark: '#1B5E20',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  border: '#E0E0E0',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
  white: '#FFFFFF',
  black: '#000000',
  gray200: '#EEEEEE',
  gray500: '#9E9E9E',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockLightColors,
}));

// Safe area context is mocked in jest.setup.js - no need to re-mock here

// Mock Tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconGolf: (props: any) => <View testID="icon-golf" {...props} />,
    IconTrophy: (props: any) => <View testID="icon-trophy" {...props} />,
    IconUser: (props: any) => <View testID="icon-user" {...props} />,
    IconTournament: (props: any) => <View testID="icon-tournament" {...props} />,
    IconMap: (props: any) => <View testID="icon-map" {...props} />,
  };
});

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { Text: RNText, ActivityIndicator: RNActivityIndicator, View } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <RNText style={style} {...props}>{children}</RNText>
    ),
    ActivityIndicator: (props: any) => <RNActivityIndicator testID="activity-indicator" {...props} />,
    Divider: () => <View testID="divider" />,
  };
});

// Track which screen was rendered and scroll positions
const screenRenderHistory: string[] = [];
const scrollPositions: Record<string, number> = {};

// Mock screen components with state tracking
jest.mock('@/screens/rounds', () => ({
  RoundListScreen: function MockRoundListScreen() {
    const React = require('react');
    const { View, Text, ScrollView } = require('react-native');

    React.useEffect(() => {
      screenRenderHistory.push('RoundsTab');
    }, []);

    const handleScroll = (event: any) => {
      scrollPositions['RoundsTab'] = event.nativeEvent.contentOffset.y;
    };

    return (
      <View testID="rounds-screen">
        <Text>Rounds Screen</Text>
        <ScrollView testID="rounds-scroll" onScroll={handleScroll}>
          <Text>Scrollable content</Text>
        </ScrollView>
      </View>
    );
  },
}));

jest.mock('@/screens/competitions/CompetitionsListScreen', () => {
  const React = require('react');
  const { View, Text, ScrollView } = require('react-native');
  return function MockCompetitionsListScreen() {
    React.useEffect(() => {
      screenRenderHistory.push('CompetitionsTab');
    }, []);

    const handleScroll = (event: any) => {
      scrollPositions['CompetitionsTab'] = event.nativeEvent.contentOffset.y;
    };

    return (
      <View testID="competitions-screen">
        <Text>Competitions Screen</Text>
        <ScrollView testID="competitions-scroll" onScroll={handleScroll}>
          <Text>Scrollable content</Text>
        </ScrollView>
      </View>
    );
  };
});

jest.mock('@/screens/courses/CourseListScreen', () => {
  const React = require('react');
  const { View, Text, ScrollView } = require('react-native');
  return function MockCourseListScreen() {
    React.useEffect(() => {
      screenRenderHistory.push('CoursesTab');
    }, []);

    const handleScroll = (event: any) => {
      scrollPositions['CoursesTab'] = event.nativeEvent.contentOffset.y;
    };

    return (
      <View testID="courses-screen">
        <Text>Courses Screen</Text>
        <ScrollView testID="courses-scroll" onScroll={handleScroll}>
          <Text>Scrollable content</Text>
        </ScrollView>
      </View>
    );
  };
});

jest.mock('@/screens/leagues/LeagueListScreen', () => {
  const React = require('react');
  const { View, Text, ScrollView } = require('react-native');
  return function MockLeagueListScreen() {
    React.useEffect(() => {
      screenRenderHistory.push('LeaguesTab');
    }, []);

    const handleScroll = (event: any) => {
      scrollPositions['LeaguesTab'] = event.nativeEvent.contentOffset.y;
    };

    return (
      <View testID="leagues-screen">
        <Text>Leagues Screen</Text>
        <ScrollView testID="leagues-scroll" onScroll={handleScroll}>
          <Text>Scrollable content</Text>
        </ScrollView>
      </View>
    );
  };
});

jest.mock('@/screens/profile/ProfileScreen', () => {
  const React = require('react');
  const { View, Text, ScrollView } = require('react-native');
  return function MockProfileScreen() {
    React.useEffect(() => {
      screenRenderHistory.push('ProfileTab');
    }, []);

    const handleScroll = (event: any) => {
      scrollPositions['ProfileTab'] = event.nativeEvent.contentOffset.y;
    };

    return (
      <View testID="profile-screen">
        <Text>Profile Screen</Text>
        <ScrollView testID="profile-scroll" onScroll={handleScroll}>
          <Text>Scrollable content</Text>
        </ScrollView>
      </View>
    );
  };
});

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

const mockTheme: Theme = {
  dark: false,
  colors: {
    primary: '#2E7D32',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1A1A1A',
    border: '#E0E0E0',
    notification: '#FF0000',
  },
};

function renderTabNavigator() {
  const queryClient = createTestQueryClient();

  return render(
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={mockTheme}>
          <MainTabNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

// ============================================================================
// TESTS
// ============================================================================

describe('Tab Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear render history and scroll positions before each test
    screenRenderHistory.length = 0;
    Object.keys(scrollPositions).forEach(key => delete scrollPositions[key]);

    // Set up authenticated user mock
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isInitializing: false,
      isLoading: false,
      player: {
        id: 'player-123',
        user_id: 'user-123',
        display_name: 'Test Player',
        handicap: 15,
        handicap_updated_at: '2024-01-01T00:00:00Z',
      },
    });
  });

  describe('tab switching', () => {
    it('switches between tabs correctly', async () => {
      renderTabNavigator();

      // Initially should show Rounds screen (initial route)
      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      // Press Competitions tab
      const compsTab = screen.getByLabelText('Navigate to competitions list');
      fireEvent.press(compsTab);

      // Should now show Competitions screen
      await waitFor(() => {
        expect(screen.getByTestId('competitions-screen')).toBeTruthy();
      });

      // Press Courses tab
      const coursesTab = screen.getByLabelText('Navigate to courses list');
      fireEvent.press(coursesTab);

      // Should now show Courses screen
      await waitFor(() => {
        expect(screen.getByTestId('courses-screen')).toBeTruthy();
      });

      // Press Friends tab
      const leaguesTab = screen.getByLabelText('Navigate to leagues');
      fireEvent.press(leaguesTab);

      // Should now show Friends screen
      await waitFor(() => {
        expect(screen.getByTestId('leagues-screen')).toBeTruthy();
      });

      // Press Profile tab
      const profileTab = screen.getByLabelText('Navigate to your profile');
      fireEvent.press(profileTab);

      // Should now show Profile screen
      await waitFor(() => {
        expect(screen.getByTestId('profile-screen')).toBeTruthy();
      });
    });

    it('can navigate back to initial tab', async () => {
      renderTabNavigator();

      // Initially on Rounds
      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      // Go to Profile
      const profileTab = screen.getByLabelText('Navigate to your profile');
      fireEvent.press(profileTab);

      await waitFor(() => {
        expect(screen.getByTestId('profile-screen')).toBeTruthy();
      });

      // Go back to Rounds
      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      fireEvent.press(roundsTab);

      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });
    });

    it('loads screens lazily when tabs are first pressed', async () => {
      renderTabNavigator();

      // Initially only Rounds should be in history (lazy loading)
      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      expect(screenRenderHistory).toContain('RoundsTab');
      expect(screenRenderHistory).not.toContain('CompetitionsTab');
      expect(screenRenderHistory).not.toContain('ProfileTab');

      // Navigate to Competitions
      const compsTab = screen.getByLabelText('Navigate to competitions list');
      fireEvent.press(compsTab);

      await waitFor(() => {
        expect(screen.getByTestId('competitions-screen')).toBeTruthy();
      });

      // Now Competitions should be in history too
      expect(screenRenderHistory).toContain('CompetitionsTab');
    });
  });

  describe('tab state preservation', () => {
    it('maintains tab state on switch (tabs remain mounted)', async () => {
      renderTabNavigator();

      // Initially on Rounds
      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      // Navigate to Competitions
      const compsTab = screen.getByLabelText('Navigate to competitions list');
      fireEvent.press(compsTab);

      await waitFor(() => {
        expect(screen.getByTestId('competitions-screen')).toBeTruthy();
      });

      // Navigate back to Rounds
      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      fireEvent.press(roundsTab);

      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      // Check Rounds was only mounted once (preserved)
      const roundsMountCount = screenRenderHistory.filter(
        (s) => s === 'RoundsTab'
      ).length;
      expect(roundsMountCount).toBe(1);
    });

    it('does not remount screens when switching back', async () => {
      renderTabNavigator();

      // Initially on Rounds
      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      // Navigate away and back multiple times
      const compsTab = screen.getByLabelText('Navigate to competitions list');
      const roundsTab = screen.getByLabelText('Navigate to rounds screen');

      fireEvent.press(compsTab);
      await waitFor(() => {
        expect(screen.getByTestId('competitions-screen')).toBeTruthy();
      });

      fireEvent.press(roundsTab);
      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      fireEvent.press(compsTab);
      await waitFor(() => {
        expect(screen.getByTestId('competitions-screen')).toBeTruthy();
      });

      fireEvent.press(roundsTab);
      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      // Each screen should only be mounted once due to lazy loading preservation
      const roundsMounts = screenRenderHistory.filter(s => s === 'RoundsTab').length;
      const compsMounts = screenRenderHistory.filter(s => s === 'CompetitionsTab').length;

      expect(roundsMounts).toBe(1);
      expect(compsMounts).toBe(1);
    });
  });

  describe('active tab indicator', () => {
    it('shows correct active tab indicator for initial tab', async () => {
      renderTabNavigator();

      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      // Rounds tab should be selected
      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      expect(roundsTab.props.accessibilityState.selected).toBe(true);

      // Other tabs should not be selected
      const compsTab = screen.getByLabelText('Navigate to competitions list');
      const coursesTab = screen.getByLabelText('Navigate to courses list');
      const leaguesTab = screen.getByLabelText('Navigate to leagues');
      const profileTab = screen.getByLabelText('Navigate to your profile');

      expect(compsTab.props.accessibilityState.selected).toBe(false);
      expect(coursesTab.props.accessibilityState.selected).toBe(false);
      expect(leaguesTab.props.accessibilityState.selected).toBe(false);
      expect(profileTab.props.accessibilityState.selected).toBe(false);
    });

    it('updates active indicator when switching tabs', async () => {
      renderTabNavigator();

      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      // Navigate to Competitions
      const compsTab = screen.getByLabelText('Navigate to competitions list');
      fireEvent.press(compsTab);

      await waitFor(() => {
        expect(screen.getByTestId('competitions-screen')).toBeTruthy();
      });

      // Competitions should now be selected
      expect(compsTab.props.accessibilityState.selected).toBe(true);

      // Rounds should no longer be selected
      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      expect(roundsTab.props.accessibilityState.selected).toBe(false);
    });

    it('only shows one active tab at a time', async () => {
      renderTabNavigator();

      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      // Navigate through all tabs
      const tabs = [
        screen.getByLabelText('Navigate to competitions list'),
        screen.getByLabelText('Navigate to courses list'),
        screen.getByLabelText('Navigate to leagues'),
        screen.getByLabelText('Navigate to your profile'),
      ];

      for (const tab of tabs) {
        fireEvent.press(tab);

        await waitFor(() => {
          // Only this tab should be selected
          expect(tab.props.accessibilityState.selected).toBe(true);
        });

        // Count how many tabs are selected
        const allTabs = screen.getAllByRole('tab');
        const selectedCount = allTabs.filter(
          (t) => t.props.accessibilityState?.selected === true
        ).length;

        expect(selectedCount).toBe(1);
      }
    });
  });

  describe('rapid tab switching', () => {
    it('handles rapid tab switching without race conditions', async () => {
      renderTabNavigator();

      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      const compsTab = screen.getByLabelText('Navigate to competitions list');
      const coursesTab = screen.getByLabelText('Navigate to courses list');
      const leaguesTab = screen.getByLabelText('Navigate to leagues');
      const profileTab = screen.getByLabelText('Navigate to your profile');

      // Rapidly press all tabs
      fireEvent.press(compsTab);
      fireEvent.press(coursesTab);
      fireEvent.press(leaguesTab);
      fireEvent.press(profileTab);
      fireEvent.press(roundsTab);
      fireEvent.press(profileTab);

      // Final state should be Profile tab
      await waitFor(() => {
        expect(screen.getByTestId('profile-screen')).toBeTruthy();
        expect(profileTab.props.accessibilityState.selected).toBe(true);
      });

      // No errors should occur and we should end up on the last pressed tab
      expect(roundsTab.props.accessibilityState.selected).toBe(false);
      expect(compsTab.props.accessibilityState.selected).toBe(false);
      expect(coursesTab.props.accessibilityState.selected).toBe(false);
      expect(leaguesTab.props.accessibilityState.selected).toBe(false);
    });

    it('processes all tab presses in order', async () => {
      renderTabNavigator();

      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      const compsTab = screen.getByLabelText('Navigate to competitions list');
      const profileTab = screen.getByLabelText('Navigate to your profile');
      const coursesTab = screen.getByLabelText('Navigate to courses list');

      // Press tabs in sequence
      fireEvent.press(compsTab);
      fireEvent.press(profileTab);
      fireEvent.press(coursesTab);

      // Should end on Courses
      await waitFor(() => {
        expect(screen.getByTestId('courses-screen')).toBeTruthy();
      });

      // Verify all tabs were visited (through render history)
      expect(screenRenderHistory).toContain('RoundsTab');
      expect(screenRenderHistory).toContain('CompetitionsTab');
      expect(screenRenderHistory).toContain('ProfileTab');
      expect(screenRenderHistory).toContain('CoursesTab');
    });

    it('maintains consistent state after rapid switching', async () => {
      renderTabNavigator();

      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      const tabs = [
        { tab: screen.getByLabelText('Navigate to competitions list'), testId: 'competitions-screen' },
        { tab: screen.getByLabelText('Navigate to courses list'), testId: 'courses-screen' },
        { tab: screen.getByLabelText('Navigate to leagues'), testId: 'leagues-screen' },
        { tab: screen.getByLabelText('Navigate to your profile'), testId: 'profile-screen' },
        { tab: screen.getByLabelText('Navigate to rounds screen'), testId: 'rounds-screen' },
      ];

      // Rapid fire 20 random tab presses
      for (let i = 0; i < 20; i++) {
        const randomIndex = Math.floor(Math.random() * tabs.length);
        fireEvent.press(tabs[randomIndex].tab);
      }

      // Press a known tab at the end
      const leaguesTab = screen.getByLabelText('Navigate to leagues');
      fireEvent.press(leaguesTab);

      // Wait for navigation to settle
      await waitFor(() => {
        expect(screen.getByTestId('leagues-screen')).toBeTruthy();
      });

      // Verify only friends tab is selected
      const allTabs = screen.getAllByRole('tab');
      const selectedTabs = allTabs.filter(
        (t) => t.props.accessibilityState?.selected === true
      );

      expect(selectedTabs).toHaveLength(1);
      expect(leaguesTab.props.accessibilityState.selected).toBe(true);
    });
  });

  describe('tab navigation integration', () => {
    it('all tabs render their respective screens', async () => {
      renderTabNavigator();

      const tabScreenPairs = [
        { label: 'Navigate to rounds screen', testId: 'rounds-screen' },
        { label: 'Navigate to competitions list', testId: 'competitions-screen' },
        { label: 'Navigate to courses list', testId: 'courses-screen' },
        { label: 'Navigate to leagues', testId: 'leagues-screen' },
        { label: 'Navigate to your profile', testId: 'profile-screen' },
      ];

      for (const { label, testId } of tabScreenPairs) {
        const tab = screen.getByLabelText(label);
        fireEvent.press(tab);

        await waitFor(() => {
          expect(screen.getByTestId(testId)).toBeTruthy();
        });
      }
    });

    it('pressing the same tab twice does not cause issues', async () => {
      renderTabNavigator();

      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
      });

      const roundsTab = screen.getByLabelText('Navigate to rounds screen');

      // Press rounds tab multiple times
      fireEvent.press(roundsTab);
      fireEvent.press(roundsTab);
      fireEvent.press(roundsTab);

      // Should still be on rounds without error
      await waitFor(() => {
        expect(screen.getByTestId('rounds-screen')).toBeTruthy();
        expect(roundsTab.props.accessibilityState.selected).toBe(true);
      });
    });
  });
});
