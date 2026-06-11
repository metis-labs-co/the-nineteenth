/**
 * RootNavigator - Main navigation structure
 *
 * Handles authentication state and routing between:
 * - Auth Stack (Login, Signup)
 * - Main Tabs (Home, Competitions, Profile)
 * - Detail Screens (Competition, Scorecard, etc.)
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { LoadingSpinner } from '@/components/common';
import { NavigationContainer, Theme } from '@react-navigation/native';
import { navigationRef, navigate } from './navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useAuth } from '@/hooks/useAuth';
import { useHasSeenWelcome } from '@/hooks/useHasSeenWelcome';
import { useThemeColors } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { BiometricLockScreen, BiometricEnrollPrompt } from '@/components/biometric';
import { supabase } from '@/services/supabase/client';
import { activeRoundSession } from '@/services/activeRoundSession';
import { pushDiagnostic } from '@/services/diagnostics';

// Auth Screens
import LoginScreen from '@/screens/auth/LoginScreen';
import SignupScreen from '@/screens/auth/SignupScreen';
import OTPVerificationScreen from '@/screens/auth/OTPVerificationScreen';
import WelcomeCarouselScreen from '@/screens/auth/WelcomeCarouselScreen';

// Main Tab Navigator
import MainTabNavigator from './MainTabNavigator';

// Admin Screens
import CreateCompetitionScreen from '@/screens/admin/CreateCompetitionScreen';
import AICompetitionScreen from '@/screens/admin/AICompetitionScreen';
import AddRoundScreen from '@/screens/admin/AddRoundScreen';
import EditRoundScreen from '@/screens/admin/EditRoundScreen';
import ScoringPairsScreen from '@/screens/admin/ScoringPairsScreen';
import LinkPlaceholderScreen from '@/screens/admin/LinkPlaceholderScreen';

// Competition Detail Screen (moved from admin)
import CompetitionDetailScreen from '@/screens/competitions/CompetitionDetailScreen';
import CompetitionSettingsScreen from '@/screens/competitions/CompetitionSettingsScreen';

// Competition Screens (Player View)
import ViewRoundScreen from '@/screens/rounds/ViewRoundScreen';
import RoundSettingsScreen from '@/screens/rounds/RoundSettingsScreen';
import SubMatchDetailScreen from '@/screens/rounds/SubMatchDetailScreen';
import { RoundListScreen } from '@/screens/rounds';
import LeaderboardScreen from '@/screens/competitions/LeaderboardScreen';
import JoinCompetitionScreen from '@/screens/competitions/JoinCompetitionScreen';

// Scoring Screens
import ScorecardEntryScreen from '@/screens/scoring/ScorecardEntryScreen';
import HoleMapScreen from '@/screens/scoring/HoleMapScreen';
import ReviewScorecardScreen from '@/screens/scoring/ReviewScorecardScreen';
import PlayerScorecardScreen from '@/screens/scoring/PlayerScorecardScreen';
import MatchPlayScoringScreen from '@/screens/scoring/MatchPlayScoringScreen';
import TeamMatchPlayScoringScreen from '@/screens/scoring/TeamMatchPlayScoringScreen';
import { MatchPlayScorecardScreen } from '@/screens/scoring';
import QuickScoreEntryScreen from '@/screens/scoring/QuickScoreEntryScreen';
import LeagueQuickAddRoundScreen from '@/screens/leagues/LeagueQuickAddRoundScreen';

// Profile Screens
import EditProfileScreen from '@/screens/profile/EditProfileScreen';
import MyStatisticsScreen from '@/screens/profile/MyStatisticsScreen';
import CourseStatisticsScreen from '@/screens/profile/CourseStatisticsScreen';
import HandicapHistoryScreen from '@/screens/profile/HandicapHistoryScreen';
import AppearanceScreen from '@/screens/profile/AppearanceScreen';
import GameSettingsScreen from '@/screens/profile/GameSettingsScreen';
import WhatsInTheBagScreen from '@/screens/profile/WhatsInTheBagScreen';
import ClubDistanceDetailScreen from '@/screens/profile/ClubDistanceDetailScreen';
import ShotMapScreen from '@/screens/profile/ShotMapScreen';
import SecurityScreen from '@/screens/profile/SecurityScreen';
import DeveloperScreen from '@/screens/profile/DeveloperScreen';
import NotificationSettingsScreen from '@/screens/profile/NotificationSettingsScreen';
import HelpAndSupportScreen from '@/screens/profile/HelpAndSupportScreen';
import PrivacyDataScreen from '@/screens/profile/PrivacyDataScreen';
import CountryRegionScreen from '@/screens/profile/CountryRegionScreen';

// Onboarding Screen
import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';

// Social Screens
import FriendsScreen from '@/screens/social/FriendsScreen';
import PlayerDetailScreen from '@/screens/social/PlayerDetailScreen';
import CompareStatsScreen from '@/screens/social/CompareStatsScreen';

// Activity Feed Screens
import { RoundActivityScreen, RoundPhotosScreen } from '@/screens/activity';

// Course & Club Screens
import ClubScreen from '@/screens/courses/ClubScreen';
import CourseDetailScreen from '@/screens/courses/CourseDetailScreen';

// Notifications
import NotificationsScreen from '@/screens/notifications/NotificationsScreen';

// Subscription
import SubscriptionScreen from '@/screens/subscription/SubscriptionScreen';

// Achievements
import AchievementsScreen from '@/screens/profile/AchievementsScreen';
import AchievementLeaderboardScreen from '@/screens/profile/AchievementLeaderboardScreen';

// Game Results (Side Games)
import GameResultsScreen from '@/screens/profile/GameResultsScreen';

// League Screens
import LeagueDetailScreen from '@/screens/leagues/LeagueDetailScreen';
import CreateLeagueScreen from '@/screens/leagues/CreateLeagueScreen';
import JoinLeagueScreen from '@/screens/leagues/JoinLeagueScreen';
import LeagueSettingsScreen from '@/screens/leagues/LeagueSettingsScreen';
import TagRoundToLeagueScreen from '@/screens/leagues/TagRoundToLeagueScreen';
import ChallengeDetailScreen from '@/screens/leagues/ChallengeDetailScreen';
import PartnershipSetupScreen from '@/screens/leagues/PartnershipSetupScreen';
import TagPartnershipRoundScreen from '@/screens/leagues/TagPartnershipRoundScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  theme: Theme;
}

export default function RootNavigator({ theme }: RootNavigatorProps) {
  const { isAuthenticated, isInitializing, isLoading, player, user } = useAuth();
  const colors = useThemeColors();
  const { hasSeenWelcome } = useHasSeenWelcome();
  const { isLocked, isAuthenticating: isBioAuthenticating, unlock, error: bioError, biometricType } = useBiometricLock(isAuthenticated);

  const handleSignOut = useCallback(() => {
    supabase.auth.signOut();
  }, []);

  // Check if onboarding is needed:
  // 1. Player record doesn't exist (trigger failed to create it)
  // 2. Player exists but hasn't completed onboarding (handicap_updated_at is null)
  // Only check after loading completes (isLoading is handled above)
  const needsOnboarding = isAuthenticated && (!player || player.handicap_updated_at === null);

  // Resume the score-entry screen on cold start if a session was persisted.
  // Runs once per app launch — only for the matching signed-in user, and only
  // once we're past auth loading, biometric lock, and onboarding.
  const hasAttemptedRestoreRef = useRef(false);
  useEffect(() => {
    if (hasAttemptedRestoreRef.current) return;
    if (isInitializing || (isAuthenticated && isLoading)) return;
    if (!isAuthenticated || !user?.id) return;
    if (needsOnboarding) return;
    if (isLocked) return; // wait for biometric unlock; NavigationContainer isn't mounted yet

    hasAttemptedRestoreRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const session = await activeRoundSession.get();
        pushDiagnostic('root_nav.session_check', {
          hasSession: !!session,
          userMatches: session ? session.userId === user.id : false,
        });
        if (cancelled || !session || session.userId !== user.id) return;

        // Don't resume if the round has already been submitted. The session is
        // normally cleared on submit, but a stale entry (e.g. submitted on
        // another device, or from a prior bug) would otherwise drop the user
        // back on Score Entry every launch. Network errors fall through to
        // the resume path so users without signal on-course aren't blocked.
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          const { data: round, error: roundError } = await (supabase as any)
            .from('rounds')
            .select('status')
            .eq('id', session.roundId)
            .maybeSingle();
          if (cancelled) return;
          if (!roundError && (round === null || round?.status === 'completed')) {
            pushDiagnostic('root_nav.session_stale_clearing', {
              roundId: session.roundId,
              status: round?.status ?? 'not_found',
            });
            await activeRoundSession.clear();
            return;
          }
        } catch (err) {
          pushDiagnostic('root_nav.session_status_check_failed', {
            error: err instanceof Error ? err.message : String(err),
          }, 'warn');
          // Fall through and resume — offline / transient errors shouldn't
          // block users mid-round.
        }

        // Wait briefly for NavigationContainer to be ready (it usually is by now).
        const start = Date.now();
        while (!navigationRef.isReady() && Date.now() - start < 2000) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        if (cancelled || !navigationRef.isReady()) {
          pushDiagnostic('root_nav.navigation_not_ready', {
            cancelled,
            isReady: navigationRef.isReady(),
            waitedMs: Date.now() - start,
          }, 'warn');
          return;
        }

        pushDiagnostic('root_nav.navigating_to_scorecard', {
          roundId: session.roundId,
          competitionId: session.competitionId,
        });
        navigate('Scorecard', {
          roundId: session.roundId,
          competitionId: session.competitionId,
          isBuildAsYouPlay: session.isBuildAsYouPlay,
        });
      } catch (err) {
        pushDiagnostic('root_nav.restore_threw', {
          error: err instanceof Error ? err.message : String(err),
        }, 'error');
        if (__DEV__) {
          console.warn('[RootNavigator] Failed to restore active round session', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isInitializing, isAuthenticated, isLoading, user?.id, needsOnboarding, isLocked]);

  // Debug logging for onboarding flow (only in development)
  if (__DEV__) {
    console.log('[RootNavigator] Auth state:', {
      isAuthenticated,
      isInitializing,
      isLoading,
      playerExists: !!player,
      playerId: player?.id,
      handicap: player?.handicap,
      handicap_updated_at: player?.handicap_updated_at,
      needsOnboarding,
    });
  }

  // Show loading screen while:
  // 1. Auth is still initializing (waiting for first auth state)
  // 2. User is authenticated but player data is still loading
  // 3. Logged-out user whose welcome-seen flag has not yet hydrated from AsyncStorage
  //    (prevents a flash of Login before we know whether to show the welcome carousel)
  if (
    isInitializing ||
    (isAuthenticated && isLoading) ||
    (!isAuthenticated && hasSeenWelcome === null)
  ) {
    if (__DEV__) {
      console.log('[RootNavigator] Showing loading screen');
    }
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner size="lg" />
      </View>
    );
  }

  // Show biometric lock screen when app is locked
  if (isAuthenticated && isLocked) {
    return (
      <BiometricLockScreen
        onUnlock={unlock}
        onSignOut={handleSignOut}
        isAuthenticating={isBioAuthenticating}
        error={bioError}
        biometricType={biometricType}
      />
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <NotificationProvider>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
        {!isAuthenticated ? (
          // Auth screens - shown when user is NOT authenticated
          <>
            {!hasSeenWelcome && (
              <Stack.Screen
                name="WelcomeCarousel"
                component={WelcomeCarouselScreen}
                options={{
                  title: 'Welcome',
                  headerShown: false,
                  gestureEnabled: false,
                  animation: 'fade',
                }}
              />
            )}
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                title: 'Login',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{
                title: 'Sign Up',
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="OTPVerification"
              component={OTPVerificationScreen}
              options={{
                title: 'Verify Code',
                headerShown: false,
              }}
            />
          </>
        ) : needsOnboarding ? (
          // Onboarding screen - shown for users who haven't set handicap
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
        ) : (
          // Main app screens - shown when user IS authenticated
          <>
            {/* Main Tab Navigator - Contains Home, Competitions, Profile tabs */}
            <Stack.Screen
              name="MainTabs"
              component={MainTabNavigator}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />

            {/* Dev-only: preview the auth/onboarding screens from inside
                the authenticated app via the dev tools section on Home. */}
            {__DEV__ && (
              <>
                <Stack.Screen
                  name="WelcomeCarousel"
                  component={WelcomeCarouselScreen}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen
                  name="Onboarding"
                  component={OnboardingScreen}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
              </>
            )}

            {/* Competition Screens */}
            <Stack.Screen
              name="CreateCompetition"
              component={CreateCompetitionScreen}
              options={{
                title: 'Create Competition',
                headerShown: false,
                presentation: 'modal',
              }}
            />

            <Stack.Screen
              name="AICompetition"
              component={AICompetitionScreen}
              options={{
                title: 'Create with AI',
                headerShown: false,
                presentation: 'modal',
              }}
            />

            <Stack.Screen
              name="CompetitionDetail"
              component={CompetitionDetailScreen}
              options={{
                title: 'Competition',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="CompetitionSettings"
              component={CompetitionSettingsScreen}
              options={{
                title: 'Competition Settings',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="AddRound"
              component={AddRoundScreen}
              options={{
                title: 'Add Round',
                headerShown: false,
                presentation: 'modal',
              }}
            />

            <Stack.Screen
              name="EditRound"
              component={EditRoundScreen}
              options={{
                title: 'Edit Round',
                headerShown: false,
                presentation: 'modal',
              }}
            />

            <Stack.Screen
              name="ViewRound"
              component={ViewRoundScreen}
              options={{
                title: 'Round',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="AllRounds"
              component={RoundListScreen}
              options={{
                title: 'All Rounds',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="RoundSettings"
              component={RoundSettingsScreen}
              options={{
                title: 'Round Settings',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="SubMatchDetail"
              component={SubMatchDetailScreen}
              options={{
                title: 'Sub-match',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="ScoringPairs"
              component={ScoringPairsScreen}
              options={{
                title: 'Scoring Pairs',
                headerShown: false,
              }}
            />

            {/* Player Screens */}
            <Stack.Screen
              name="Leaderboard"
              component={LeaderboardScreen}
              options={{
                title: 'Leaderboard',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="JoinCompetition"
              component={JoinCompetitionScreen}
              options={{
                title: 'Join Competition',
                headerShown: false,
              }}
            />

            {/* Scorecard Screens */}
            <Stack.Screen
              name="Scorecard"
              component={ScorecardEntryScreen}
              options={{
                title: 'Scorecard',
                headerShown: false,
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="ReviewScorecard"
              component={ReviewScorecardScreen}
              options={{
                title: 'Review Scorecard',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="PlayerScorecard"
              component={PlayerScorecardScreen}
              options={{
                title: 'Player Scorecard',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="HoleMap"
              component={HoleMapScreen}
              options={{
                title: 'Hole Map',
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />

            <Stack.Screen
              name="MatchPlayScoring"
              component={MatchPlayScoringScreen}
              options={{
                title: 'Match Play',
                headerShown: false,
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              // @ts-expect-error TeamMatchPlayScoring is defined in RootStackParamList but TS inference fails
              name="TeamMatchPlayScoring"
              component={TeamMatchPlayScoringScreen}
              options={{
                title: 'Team Match Play',
                headerShown: false,
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="MatchPlayScorecard"
              component={MatchPlayScorecardScreen}
              options={{
                title: 'Match Scorecard',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="QuickScoreEntry"
              component={QuickScoreEntryScreen}
              options={{
                title: 'Quick Score Entry',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="LeagueQuickAddRound"
              component={LeagueQuickAddRoundScreen}
              options={{
                title: 'Add Round',
                headerShown: false,
              }}
            />

            {/* Profile Screens */}
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{
                title: 'Edit Profile',
                headerShown: false,
                presentation: 'transparentModal',
                animation: 'fade',
              }}
            />

            <Stack.Screen
              name="MyStatistics"
              component={MyStatisticsScreen}
              options={{
                title: 'My Statistics',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="CourseStatistics"
              component={CourseStatisticsScreen}
              options={{
                title: 'Course Statistics',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="HandicapHistory"
              component={HandicapHistoryScreen}
              options={{
                title: 'Handicap History',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="Appearance"
              component={AppearanceScreen}
              options={{
                title: 'Appearance',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="GameSettings"
              component={GameSettingsScreen}
              options={{
                title: 'Game Settings',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="WhatsInTheBag"
              component={WhatsInTheBagScreen}
              options={{
                title: "What's in the Bag",
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="ClubDistanceDetail"
              component={ClubDistanceDetailScreen}
              options={{
                title: 'Club Distance',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="ShotMap"
              component={ShotMapScreen}
              options={{
                title: 'Shot Map',
                headerShown: false,
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />

            <Stack.Screen
              name="Security"
              component={SecurityScreen}
              options={{
                title: 'Security',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="Developer"
              component={DeveloperScreen}
              options={{
                title: 'Developer',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{
                title: 'Push Notifications',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="HelpAndSupport"
              component={HelpAndSupportScreen}
              options={{
                title: 'Help & Support',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="PrivacyData"
              component={PrivacyDataScreen}
              options={{
                title: 'Privacy & Data',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="CountryRegion"
              component={CountryRegionScreen}
              options={{
                title: 'Country / Region',
                headerShown: false,
              }}
            />

            {/* Friends Screens */}
            <Stack.Screen
              name="Friends"
              component={FriendsScreen}
              options={{
                title: 'Friends',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="PlayerDetail"
              component={PlayerDetailScreen}
              options={{
                title: 'Player Profile',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="CompareStats"
              component={CompareStatsScreen}
              options={{
                title: 'Compare Stats',
                headerShown: false,
              }}
            />

            {/* Activity Feed Screens */}
            <Stack.Screen
              name="RoundActivity"
              component={RoundActivityScreen}
              options={{
                title: 'Round',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="RoundPhotos"
              component={RoundPhotosScreen}
              options={{
                title: 'Round Photos',
                headerShown: false,
              }}
            />

            {/* Club & Course Screens */}
            <Stack.Screen
              name="Club"
              component={ClubScreen}
              options={{
                title: 'Club',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="Course"
              component={CourseDetailScreen}
              options={{
                title: 'Course',
                headerShown: false,
              }}
            />

            {/* Notifications Screen */}
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{
                title: 'Notifications',
                headerShown: false,
              }}
            />

            {/* Subscription Screen */}
            <Stack.Screen
              name="Subscription"
              component={SubscriptionScreen}
              options={{
                title: 'Subscription',
                headerShown: false,
              }}
            />

            {/* Admin - Placeholder Players */}
            <Stack.Screen
              name="LinkPlaceholder"
              component={LinkPlaceholderScreen}
              options={{
                title: 'Manage Guest Players',
                headerShown: false,
              }}
            />

            {/* Achievements */}
            <Stack.Screen
              name="Achievements"
              component={AchievementsScreen}
              options={{
                title: 'My Achievements',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="AchievementLeaderboard"
              component={AchievementLeaderboardScreen}
              options={{
                title: 'Achievement Leaders',
                headerShown: false,
              }}
            />

            {/* Game Results (Side Games) */}
            <Stack.Screen
              name="GameResults"
              component={GameResultsScreen}
              options={{
                title: 'Game Results',
                headerShown: false,
              }}
            />

            {/* League Screens */}
            <Stack.Screen
              name="LeagueDetail"
              component={LeagueDetailScreen}
              options={{
                title: 'League',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="CreateLeague"
              component={CreateLeagueScreen}
              options={{
                title: 'Create League',
                headerShown: false,
                presentation: 'modal',
              }}
            />

            <Stack.Screen
              name="JoinLeague"
              component={JoinLeagueScreen}
              options={{
                title: 'Join League',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="LeagueSettings"
              component={LeagueSettingsScreen}
              options={{
                title: 'League Settings',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="TagRoundToLeague"
              component={TagRoundToLeagueScreen}
              options={{
                title: 'Tag Round',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="ChallengeDetail"
              component={ChallengeDetailScreen}
              options={{
                title: 'Challenge',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="PartnershipSetup"
              component={PartnershipSetupScreen}
              options={{
                title: 'Choose Partner',
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="TagPartnershipRound"
              component={TagPartnershipRoundScreen}
              options={{
                title: 'Tag Round',
                headerShown: false,
              }}
            />
          </>
        )}
        </Stack.Navigator>
        {/* Post-login one-time prompt to enable biometric unlock. Self-gates
            on availability and per-user "seen" flag — safe to always render. */}
        <BiometricEnrollPrompt />
      </NotificationProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
