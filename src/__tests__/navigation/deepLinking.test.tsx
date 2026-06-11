/**
 * Deep Linking Tests
 *
 * Tests the deep link handling for various app routes:
 * - Competition invite links
 * - Round scoring links
 * - Invalid deep links
 * - Protected links requiring authentication
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Theme, getStateFromPath, getPathFromState } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import RootNavigator after all mocks are set up
import RootNavigator from '@/navigation/RootNavigator';

// ============================================================================
// DEEP LINKING CONFIGURATION
// ============================================================================

/**
 * Deep linking configuration that maps URLs to navigation routes.
 * This matches the expected URL structure for the app.
 */
const linkingConfig = {
  prefixes: ['thenineteenth://', 'https://thenineteenth.golf', 'https://www.thenineteenth.golf'],
  config: {
    screens: {
      // Auth screens (no deep links - users go to login first)
      Login: 'login',
      Signup: 'signup',

      // Public deep links
      JoinCompetition: 'join/:code?',

      // Authenticated screens (nested navigator)
      MainTabs: {
        screens: {
          HomeTab: 'home',
          CompeteTab: 'compete',
          ActivityTab: 'activity',
          CoursesTab: 'courses',
          ProfileTab: 'profile',
        },
      },

      // Competition routes
      CompetitionDetail: 'competition/:id',
      Leaderboard: 'competition/:competitionId/leaderboard',

      // Round routes
      ViewRound: 'round/:roundId',
      Scorecard: 'round/:roundId/score',
      ReviewScorecard: 'round/:roundId/review',

      // Player routes
      PlayerDetail: 'player/:id',

      // Course routes
      Club: 'club/:clubId',
      Course: 'course/:courseId',
    },
  } as { initialRouteName?: string; screens: Record<string, any> },
};

// ============================================================================
// MOCKS
// ============================================================================

// Unmock NavigationContainer to use real navigation
jest.unmock('@react-navigation/native');

// Re-apply navigation hooks mock but keep NavigationContainer real
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
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
jest.mock('@/screens/profile/AppearanceScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'appearance-screen' }, React.createElement(Text, null, 'Appearance'));
  };
});
jest.mock('@/screens/profile/GameSettingsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'gamesettings-screen' }, React.createElement(Text, null, 'GameSettings'));
  };
});
jest.mock('@/screens/profile/SecurityScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'security-screen' }, React.createElement(Text, null, 'Security'));
  };
});
jest.mock('@/screens/profile/DeveloperScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'developer-screen' }, React.createElement(Text, null, 'Developer'));
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
jest.mock('@/screens/courses/ClubScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'club-screen' }, React.createElement(Text, null, 'Club'));
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

// Scoring Screens (additional)
jest.mock('@/screens/scoring/TeamMatchPlayScoringScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'teammatchplayscoring-screen' }, React.createElement(Text, null, 'TeamMatchPlayScoring'));
  };
});
jest.mock('@/screens/scoring', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    MatchPlayScorecardScreen: function MockScreen() {
      return React.createElement(View, { testID: 'matchplayscorecard-screen' }, React.createElement(Text, null, 'MatchPlayScorecard'));
    },
  };
});

// Profile Screens (additional)
jest.mock('@/screens/profile/HandicapHistoryScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'handicaphistory-screen' }, React.createElement(Text, null, 'HandicapHistory'));
  };
});
jest.mock('@/screens/profile/PrivacyDataScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'privacydata-screen' }, React.createElement(Text, null, 'PrivacyData'));
  };
});
jest.mock('@/screens/profile/CountryRegionScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'countryregion-screen' }, React.createElement(Text, null, 'CountryRegion'));
  };
});
jest.mock('@/screens/profile/GameResultsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'gameresults-screen' }, React.createElement(Text, null, 'GameResults'));
  };
});

// League Screens
jest.mock('@/screens/leagues/LeagueDetailScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'leaguedetail-screen' }, React.createElement(Text, null, 'LeagueDetail'));
  };
});
jest.mock('@/screens/leagues/CreateLeagueScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'createleague-screen' }, React.createElement(Text, null, 'CreateLeague'));
  };
});
jest.mock('@/screens/leagues/JoinLeagueScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'joinleague-screen' }, React.createElement(Text, null, 'JoinLeague'));
  };
});
jest.mock('@/screens/leagues/LeagueSettingsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'leaguesettings-screen' }, React.createElement(Text, null, 'LeagueSettings'));
  };
});
jest.mock('@/screens/leagues/TagRoundToLeagueScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'tagroundtoleague-screen' }, React.createElement(Text, null, 'TagRoundToLeague'));
  };
});
jest.mock('@/screens/leagues/ChallengeDetailScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockScreen() {
    return React.createElement(View, { testID: 'challengedetail-screen' }, React.createElement(Text, null, 'ChallengeDetail'));
  };
});

// Biometric Lock
jest.mock('@/hooks/useBiometricLock', () => ({
  useBiometricLock: () => ({
    isLocked: false,
    isAuthenticating: false,
    unlock: jest.fn(),
    error: null,
    biometricType: null,
  }),
}));
jest.mock('@/components/biometric', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BiometricLockScreen: function MockScreen() {
      return React.createElement(View, { testID: 'biometric-lock-screen' });
    },
  };
});

// Mock LoadingSpinner component
jest.mock('@/components/common', () => ({
  LoadingSpinner: ({ size: _size }: { size?: string }) => {
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
  handicap_updated_at: '2024-01-01T00:00:00Z',
  avatar_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// ============================================================================
// TESTS
// ============================================================================

describe('Deep Linking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('URL parsing', () => {
    it('parses competition invite link correctly', () => {
      const path = 'join/ABC123';
      const state = getStateFromPath(path, linkingConfig.config);

      expect(state).toBeDefined();
      expect(state?.routes[0].name).toBe('JoinCompetition');
      expect(state?.routes[0].params).toEqual({ code: 'ABC123' });
    });

    it('parses round scoring link correctly', () => {
      const path = 'round/round-456/score';
      const state = getStateFromPath(path, linkingConfig.config);

      expect(state).toBeDefined();
      expect(state?.routes[0].name).toBe('Scorecard');
      expect(state?.routes[0].params).toEqual({ roundId: 'round-456' });
    });

    it('parses competition detail link correctly', () => {
      const path = 'competition/comp-789';
      const state = getStateFromPath(path, linkingConfig.config);

      expect(state).toBeDefined();
      expect(state?.routes[0].name).toBe('CompetitionDetail');
      expect(state?.routes[0].params).toEqual({ id: 'comp-789' });
    });

    it('parses round view link correctly', () => {
      const path = 'round/round-456';
      const state = getStateFromPath(path, linkingConfig.config);

      expect(state).toBeDefined();
      expect(state?.routes[0].name).toBe('ViewRound');
      expect(state?.routes[0].params).toEqual({ roundId: 'round-456' });
    });

    it('returns undefined for invalid deep link', () => {
      const path = 'invalid/path/that/does/not/exist';
      const state = getStateFromPath(path, linkingConfig.config);

      // Unknown paths should not match any route
      expect(state).toBeUndefined();
    });
  });

  describe('path generation', () => {
    it('generates correct path for JoinCompetition', () => {
      const state = {
        routes: [
          {
            name: 'JoinCompetition',
            params: { code: 'XYZ789' },
          },
        ],
      };

      const path = getPathFromState(state as any, linkingConfig.config);
      expect(path).toBe('/join/XYZ789');
    });

    it('generates correct path for Scorecard', () => {
      const state = {
        routes: [
          {
            name: 'Scorecard',
            params: { roundId: 'round-123' },
          },
        ],
      };

      const path = getPathFromState(state as any, linkingConfig.config);
      expect(path).toBe('/round/round-123/score');
    });

    it('generates correct path for CompetitionDetail', () => {
      const state = {
        routes: [
          {
            name: 'CompetitionDetail',
            params: { id: 'comp-456' },
          },
        ],
      };

      const path = getPathFromState(state as any, linkingConfig.config);
      expect(path).toBe('/competition/comp-456');
    });
  });

  describe('authentication handling', () => {
    it('shows login screen when unauthenticated user opens deep link', async () => {
      // User is NOT authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isInitializing: false,
        isLoading: false,
        player: null,
      });

      renderRootNavigator();

      // Even with a deep link pending, unauthenticated users should see login
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });
    });

    it('shows main app when authenticated user opens protected deep link', async () => {
      // User IS authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        player: mockPlayer,
      });

      renderRootNavigator();

      // Authenticated users should see main app
      await waitFor(() => {
        expect(screen.getByTestId('main-tabs')).toBeTruthy();
      });
    });

    it('shows loading while checking auth before handling deep link', async () => {
      // Auth is still initializing
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isInitializing: true,
        isLoading: false,
        player: null,
      });

      renderRootNavigator();

      // Should show loading while auth is being checked
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeTruthy();
      });
    });
  });

  describe('link prefixes', () => {
    it('handles thenineteenth:// scheme prefix', () => {
      const url = 'thenineteenth://join/ABC123';
      const path = url.replace('thenineteenth://', '');
      const state = getStateFromPath(path, linkingConfig.config);

      expect(state?.routes[0].name).toBe('JoinCompetition');
      expect(state?.routes[0].params).toEqual({ code: 'ABC123' });
    });

    it('handles https://thenineteenth.golf prefix', () => {
      const url = 'https://thenineteenth.golf/competition/comp-123';
      const path = url.replace('https://thenineteenth.golf/', '');
      const state = getStateFromPath(path, linkingConfig.config);

      expect(state?.routes[0].name).toBe('CompetitionDetail');
      expect(state?.routes[0].params).toEqual({ id: 'comp-123' });
    });

    it('handles https://www.thenineteenth.golf prefix', () => {
      const url = 'https://www.thenineteenth.golf/round/round-456';
      const path = url.replace('https://www.thenineteenth.golf/', '');
      const state = getStateFromPath(path, linkingConfig.config);

      expect(state?.routes[0].name).toBe('ViewRound');
      expect(state?.routes[0].params).toEqual({ roundId: 'round-456' });
    });
  });

  describe('edge cases', () => {
    it('handles join link without invite code', () => {
      const path = 'join';
      const state = getStateFromPath(path, linkingConfig.config);

      expect(state).toBeDefined();
      expect(state?.routes[0].name).toBe('JoinCompetition');
      // Code should be undefined when not provided
      expect((state?.routes[0].params as Record<string, unknown> | undefined)?.code).toBeUndefined();
    });

    it('handles trailing slashes in URLs', () => {
      const path = 'competition/comp-123/';
      // Remove trailing slash for parsing
      const normalizedPath = path.replace(/\/$/, '');
      const state = getStateFromPath(normalizedPath, linkingConfig.config);

      expect(state?.routes[0].name).toBe('CompetitionDetail');
    });

    it('handles URL-encoded parameters', () => {
      const path = 'join/ABC%20123';
      const state = getStateFromPath(decodeURIComponent(path), linkingConfig.config);

      expect(state?.routes[0].name).toBe('JoinCompetition');
      expect(state?.routes[0].params).toEqual({ code: 'ABC 123' });
    });

    it('handles player profile deep link', () => {
      const path = 'player/player-xyz';
      const state = getStateFromPath(path, linkingConfig.config);

      expect(state?.routes[0].name).toBe('PlayerDetail');
      expect(state?.routes[0].params).toEqual({ id: 'player-xyz' });
    });

    it('handles course deep link', () => {
      const path = 'course/course-123';
      const state = getStateFromPath(path, linkingConfig.config);

      expect(state?.routes[0].name).toBe('Course');
      expect(state?.routes[0].params).toEqual({ courseId: 'course-123' });
    });

    it('handles club deep link', () => {
      const path = 'club/club-456';
      const state = getStateFromPath(path, linkingConfig.config);

      expect(state?.routes[0].name).toBe('Club');
      expect(state?.routes[0].params).toEqual({ clubId: 'club-456' });
    });
  });
});
