/**
 * RootNavigator Tests
 *
 * Tests the main navigation structure and authentication-based routing:
 * - Auth screens shown when not authenticated
 * - Main app shown when authenticated
 * - Loading state during initialization
 * - Session expiry handling
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import { Theme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import RootNavigator after all mocks are set up
import RootNavigator from '@/navigation/RootNavigator';

// ============================================================================
// MOCKS
// ============================================================================

// Unmock NavigationContainer to use real navigation for RootNavigator tests
// (RootNavigator includes its own NavigationContainer)
jest.unmock('@react-navigation/native');

// Re-apply navigation hooks mock but keep NavigationContainer real
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

// Mock useAuth hook - will be configured per test
const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock NotificationContext to avoid side effects
jest.mock('@/context/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock navigationRef with createRef
jest.mock('@/navigation/navigationRef', () => {
  const React = require('react');
  return {
    navigationRef: React.createRef(),
  };
});

// Mock all screen components to avoid loading complex dependencies
jest.mock('@/screens/auth/LoginScreen', () => {
  const { View, Text } = require('react-native');
  return function MockLoginScreen() {
    return (
      <View testID="login-screen">
        <Text>Login Screen</Text>
      </View>
    );
  };
});

jest.mock('@/screens/auth/SignupScreen', () => {
  const { View, Text } = require('react-native');
  return function MockSignupScreen() {
    return (
      <View testID="signup-screen">
        <Text>Signup Screen</Text>
      </View>
    );
  };
});

jest.mock('@/screens/onboarding/OnboardingScreen', () => {
  const { View, Text } = require('react-native');
  return function MockOnboardingScreen() {
    return (
      <View testID="onboarding-screen">
        <Text>Onboarding Screen</Text>
      </View>
    );
  };
});

jest.mock('@/navigation/MainTabNavigator', () => {
  const { View, Text } = require('react-native');
  return function MockMainTabNavigator() {
    return (
      <View testID="main-tabs">
        <Text>Main Tab Navigator</Text>
      </View>
    );
  };
});

// Mock all other screens to prevent import errors
// Note: Each factory must be inline as jest.mock is hoisted

// Admin Screens
jest.mock('@/screens/admin/CreateCompetitionScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'createcompetition-screen' }, React.createElement(Text, null, 'CreateCompetition'));
  };
});
jest.mock('@/screens/admin/AICompetitionScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'aicompetition-screen' }, React.createElement(Text, null, 'AICompetition'));
  };
});
jest.mock('@/screens/admin/EditCompetitionScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'editcompetition-screen' }, React.createElement(Text, null, 'EditCompetition'));
  };
});
jest.mock('@/screens/admin/AddRoundScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'addround-screen' }, React.createElement(Text, null, 'AddRound'));
  };
});
jest.mock('@/screens/admin/EditRoundScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'editround-screen' }, React.createElement(Text, null, 'EditRound'));
  };
});
jest.mock('@/screens/admin/TeamManagementScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'teammanagement-screen' }, React.createElement(Text, null, 'TeamManagement'));
  };
});
jest.mock('@/screens/admin/ScoringPairsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'scoringpairs-screen' }, React.createElement(Text, null, 'ScoringPairs'));
  };
});
jest.mock('@/screens/admin/LinkPlaceholderScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'linkplaceholder-screen' }, React.createElement(Text, null, 'LinkPlaceholder'));
  };
});

// Competition Screens
jest.mock('@/screens/competitions/CompetitionDetailScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'competitiondetail-screen' }, React.createElement(Text, null, 'CompetitionDetail'));
  };
});
jest.mock('@/screens/rounds/ViewRoundScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'viewround-screen' }, React.createElement(Text, null, 'ViewRound'));
  };
});
jest.mock('@/screens/competitions/LeaderboardScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'leaderboard-screen' }, React.createElement(Text, null, 'Leaderboard'));
  };
});
jest.mock('@/screens/competitions/JoinCompetitionScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'joincompetition-screen' }, React.createElement(Text, null, 'JoinCompetition'));
  };
});

// Scoring Screens
jest.mock('@/screens/scoring/ScorecardEntryScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'scorecardentry-screen' }, React.createElement(Text, null, 'ScorecardEntry'));
  };
});
jest.mock('@/screens/scoring/ReviewScorecardScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'reviewscorecard-screen' }, React.createElement(Text, null, 'ReviewScorecard'));
  };
});
jest.mock('@/screens/scoring/PlayerScorecardScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'playerscorecard-screen' }, React.createElement(Text, null, 'PlayerScorecard'));
  };
});
jest.mock('@/screens/scoring/MatchPlayScoringScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'matchplayscoring-screen' }, React.createElement(Text, null, 'MatchPlayScoring'));
  };
});

// Profile Screens
jest.mock('@/screens/profile/EditProfileScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'editprofile-screen' }, React.createElement(Text, null, 'EditProfile'));
  };
});
jest.mock('@/screens/profile/MyStatisticsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'mystatistics-screen' }, React.createElement(Text, null, 'MyStatistics'));
  };
});
jest.mock('@/screens/profile/SettingsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'settings-screen' }, React.createElement(Text, null, 'Settings'));
  };
});
jest.mock('@/screens/profile/NotificationSettingsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'notificationsettings-screen' }, React.createElement(Text, null, 'NotificationSettings'));
  };
});
jest.mock('@/screens/profile/HelpAndSupportScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'helpandsupport-screen' }, React.createElement(Text, null, 'HelpAndSupport'));
  };
});
jest.mock('@/screens/profile/AchievementsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'achievements-screen' }, React.createElement(Text, null, 'Achievements'));
  };
});
jest.mock('@/screens/profile/AchievementLeaderboardScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'achievementleaderboard-screen' }, React.createElement(Text, null, 'AchievementLeaderboard'));
  };
});

// Social Screens
jest.mock('@/screens/social/FriendsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'friends-screen' }, React.createElement(Text, null, 'Friends'));
  };
});
jest.mock('@/screens/social/PlayerDetailScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'playerdetail-screen' }, React.createElement(Text, null, 'PlayerDetail'));
  };
});
jest.mock('@/screens/social/CompareStatsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'comparestats-screen' }, React.createElement(Text, null, 'CompareStats'));
  };
});

// Course Screens
jest.mock('@/screens/courses/VenueScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'venue-screen' }, React.createElement(Text, null, 'Venue'));
  };
});
jest.mock('@/screens/courses/CourseDetailScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'coursedetail-screen' }, React.createElement(Text, null, 'CourseDetail'));
  };
});

// Other Screens
jest.mock('@/screens/notifications/NotificationsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'notifications-screen' }, React.createElement(Text, null, 'Notifications'));
  };
});
jest.mock('@/screens/subscription/SubscriptionScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'subscription-screen' }, React.createElement(Text, null, 'Subscription'));
  };
});

// Mock LoadingSpinner component
jest.mock('@/components/common', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => {
    const { View } = require('react-native');
    return <View testID="loading-spinner" />;
  },
}));

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
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};

function renderRootNavigator() {
  const queryClient = createTestQueryClient();

  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RootNavigator theme={mockTheme} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockPlayer = {
  id: 'player-123',
  user_id: 'user-123',
  display_name: 'Test Player',
  handicap: 15,
  handicap_updated_at: '2024-01-01T00:00:00Z', // Has set handicap
  avatar_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockPlayerNeedsOnboarding = {
  ...mockPlayer,
  handicap_updated_at: null, // Needs to set handicap
};

// ============================================================================
// TESTS
// ============================================================================

describe('RootNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authentication routing', () => {
    it('renders auth screens when not authenticated', async () => {
      // Configure mock: user is NOT authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isInitializing: false,
        isLoading: false,
        player: null,
      });

      renderRootNavigator();

      // Should show login screen (initial auth screen)
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Should NOT show main tabs
      expect(screen.queryByTestId('main-tabs')).toBeNull();
    });

    it('renders main app when authenticated', async () => {
      // Configure mock: user IS authenticated with completed profile
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        player: mockPlayer,
      });

      renderRootNavigator();

      // Should show main tab navigator
      await waitFor(() => {
        expect(screen.getByTestId('main-tabs')).toBeTruthy();
      });

      // Should NOT show auth screens
      expect(screen.queryByTestId('login-screen')).toBeNull();
    });

    it('shows loading state during initialization', async () => {
      // Configure mock: still initializing
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isInitializing: true,
        isLoading: false,
        player: null,
      });

      renderRootNavigator();

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeTruthy();
      });

      // Should NOT show any screens yet
      expect(screen.queryByTestId('login-screen')).toBeNull();
      expect(screen.queryByTestId('main-tabs')).toBeNull();
    });

    it('handles session expiry gracefully', async () => {
      // Start with authenticated state
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        player: mockPlayer,
      });

      const { rerender } = renderRootNavigator();

      // Verify we're on the main app
      await waitFor(() => {
        expect(screen.getByTestId('main-tabs')).toBeTruthy();
      });

      // Simulate session expiry by changing auth state
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isInitializing: false,
        isLoading: false,
        player: null,
      });

      // Re-render to trigger state change
      const queryClient = createTestQueryClient();
      rerender(
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <QueryClientProvider client={queryClient}>
            <RootNavigator theme={mockTheme} />
          </QueryClientProvider>
        </SafeAreaProvider>
      );

      // Should redirect to login screen
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Should NOT show main tabs anymore
      expect(screen.queryByTestId('main-tabs')).toBeNull();
    });
  });

  describe('onboarding flow', () => {
    it('shows onboarding screen for new users who need to set handicap', async () => {
      // Configure mock: authenticated but needs onboarding
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        player: mockPlayerNeedsOnboarding,
      });

      renderRootNavigator();

      // Should show onboarding screen
      await waitFor(() => {
        expect(screen.getByTestId('onboarding-screen')).toBeTruthy();
      });

      // Should NOT show main tabs or auth screens
      expect(screen.queryByTestId('main-tabs')).toBeNull();
      expect(screen.queryByTestId('login-screen')).toBeNull();
    });

    it('shows loading while player data is being fetched', async () => {
      // Configure mock: authenticated but player data still loading
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: true, // Still loading player data
        player: null,
      });

      renderRootNavigator();

      // Should show loading spinner while waiting for player data
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeTruthy();
      });

      // Should NOT show any screens yet
      expect(screen.queryByTestId('main-tabs')).toBeNull();
      expect(screen.queryByTestId('onboarding-screen')).toBeNull();
    });
  });
});
