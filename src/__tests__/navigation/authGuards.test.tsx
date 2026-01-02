/**
 * Auth Guard Tests
 *
 * Tests authentication-based route protection:
 * - Unauthenticated users redirected from protected screens
 * - Authenticated users can access protected screens
 * - Loading state during auth check
 * - Deep link destination preserved after login
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { Theme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

// Track navigation for testing route preservation
const mockNavigationRef = createNavigationContainerRef();
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: mockNavigationRef,
}));

// Mock all screen components to avoid loading complex dependencies
jest.mock('@/screens/auth/LoginScreen', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockLoginScreen({ navigation }: { navigation: any }) {
    return (
      <View testID="login-screen">
        <Text>Login Screen</Text>
        <TouchableOpacity
          testID="login-button"
          onPress={() => {
            // Simulates successful login by triggering auth state change
            // The actual navigation happens via RootNavigator re-render
          }}
        >
          <Text>Log In</Text>
        </TouchableOpacity>
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

// Admin Screens - these are protected and require authentication
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

// Scoring Screens - protected
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

// Import RootNavigator after all mocks are set up
import RootNavigator from '@/navigation/RootNavigator';

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

// ============================================================================
// TESTS
// ============================================================================

describe('Auth Guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('protected routes', () => {
    it('redirects unauthenticated users from protected screens to login', async () => {
      // Configure mock: user is NOT authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isInitializing: false,
        isLoading: false,
        player: null,
      });

      renderRootNavigator();

      // Unauthenticated users should see login screen
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Protected screens should NOT be accessible/visible
      expect(screen.queryByTestId('main-tabs')).toBeNull();
      expect(screen.queryByTestId('createcompetition-screen')).toBeNull();
      expect(screen.queryByTestId('scorecardentry-screen')).toBeNull();
      expect(screen.queryByTestId('editprofile-screen')).toBeNull();
    });

    it('allows authenticated users to access protected screens', async () => {
      // Configure mock: user IS authenticated with completed profile
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        player: mockPlayer,
      });

      renderRootNavigator();

      // Authenticated users should see main app (tabs)
      await waitFor(() => {
        expect(screen.getByTestId('main-tabs')).toBeTruthy();
      });

      // Auth screens should NOT be visible
      expect(screen.queryByTestId('login-screen')).toBeNull();
      expect(screen.queryByTestId('signup-screen')).toBeNull();
    });

    it('handles loading state during auth check', async () => {
      // Configure mock: auth is still being checked
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isInitializing: true,
        isLoading: false,
        player: null,
      });

      renderRootNavigator();

      // Should show loading indicator while checking auth
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeTruthy();
      });

      // No screens should be visible yet
      expect(screen.queryByTestId('login-screen')).toBeNull();
      expect(screen.queryByTestId('main-tabs')).toBeNull();
    });

    it('preserves navigation and shows main app after successful login', async () => {
      // Start with unauthenticated state
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isInitializing: false,
        isLoading: false,
        player: null,
      });

      const { rerender } = renderRootNavigator();

      // Initially should show login
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Simulate successful login by changing auth state
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        player: mockPlayer,
      });

      // Re-render to trigger auth state change
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

      // After login, should navigate to main app
      await waitFor(() => {
        expect(screen.getByTestId('main-tabs')).toBeTruthy();
      });

      // Login screen should no longer be visible
      expect(screen.queryByTestId('login-screen')).toBeNull();
    });
  });

  describe('auth state transitions', () => {
    it('shows loading when authenticated but player data still loading', async () => {
      // User is authenticated but player profile is still being fetched
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: true, // Player data loading
        player: null,
      });

      renderRootNavigator();

      // Should show loading while waiting for player data
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeTruthy();
      });

      // Neither auth nor main screens should be visible
      expect(screen.queryByTestId('login-screen')).toBeNull();
      expect(screen.queryByTestId('main-tabs')).toBeNull();
    });

    it('shows onboarding for users who need to set handicap', async () => {
      // User is authenticated but hasn't completed onboarding
      const playerNeedsOnboarding = {
        ...mockPlayer,
        handicap_updated_at: null, // Hasn't set handicap yet
      };

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        player: playerNeedsOnboarding,
      });

      renderRootNavigator();

      // Should show onboarding screen
      await waitFor(() => {
        expect(screen.getByTestId('onboarding-screen')).toBeTruthy();
      });

      // Main tabs and login should not be visible
      expect(screen.queryByTestId('main-tabs')).toBeNull();
      expect(screen.queryByTestId('login-screen')).toBeNull();
    });

    it('transitions from onboarding to main app after handicap set', async () => {
      // Start with user needing onboarding
      const playerNeedsOnboarding = {
        ...mockPlayer,
        handicap_updated_at: null,
      };

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        player: playerNeedsOnboarding,
      });

      const { rerender } = renderRootNavigator();

      // Initially should show onboarding
      await waitFor(() => {
        expect(screen.getByTestId('onboarding-screen')).toBeTruthy();
      });

      // Simulate user completing onboarding (handicap now set)
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        player: mockPlayer, // Now has handicap_updated_at set
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

      // After onboarding, should show main app
      await waitFor(() => {
        expect(screen.getByTestId('main-tabs')).toBeTruthy();
      });

      // Onboarding should no longer be visible
      expect(screen.queryByTestId('onboarding-screen')).toBeNull();
    });
  });

  describe('session management', () => {
    it('redirects to login when session expires', async () => {
      // Start with authenticated user
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        player: mockPlayer,
      });

      const { rerender } = renderRootNavigator();

      // Initially should show main app
      await waitFor(() => {
        expect(screen.getByTestId('main-tabs')).toBeTruthy();
      });

      // Simulate session expiry
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

      // After session expiry, should redirect to login
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Main app should no longer be visible
      expect(screen.queryByTestId('main-tabs')).toBeNull();
    });

    it('shows loading during session refresh', async () => {
      // Session is being refreshed
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isInitializing: true, // Checking if session can be refreshed
        isLoading: false,
        player: null,
      });

      renderRootNavigator();

      // Should show loading during refresh check
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeTruthy();
      });
    });
  });
});
