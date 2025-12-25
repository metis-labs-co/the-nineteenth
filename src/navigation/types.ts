/**
 * Navigation Types for The Nineteenth
 *
 * Type-safe navigation for React Navigation v6
 * Defines all routes and their parameters for the app
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

/**
 * Root Stack - Top-level navigation
 * Contains auth screens and main app screens
 */
export type RootStackParamList = {
  // Auth Flow
  Login: undefined;
  Signup: undefined;

  // Onboarding (shown for users who haven't set handicap)
  Onboarding: undefined;

  // Main Tabs Navigator
  MainTabs: undefined;

  // Competitions
  Competitions: undefined;
  CompetitionDetail: { id: string };
  CreateCompetition: { initialState?: import('@/utils/aiToWizardState').WizardState } | undefined;
  AICompetition: undefined;
  EditCompetition: { id: string };

  // Rounds
  Rounds: { competitionId: string };
  RoundDetail: { id: string };
  AddRound: { competitionId: string };
  EditRound: { roundId: string; competitionId?: string }; // Edit round details (organizers only)
  ViewRound: { roundId: string; competitionId?: string }; // For standalone or competition rounds

  // Scorecard
  Scorecard: { roundId: string; competitionId: string };
  ReviewScorecard: {
    roundId?: string;
    competitionId?: string;
    holes?: import('@/types/index').Hole[];
  };
  PlayerScorecard: {
    playerId: string;
    roundId: string;
  };

  // Leaderboard
  Leaderboard: { competitionId: string };

  // Players
  AddPlayers: { competitionId: string };
  PlayerDetail: { id: string };

  // Teams
  TeamManagement: { competitionId: string };

  // Scoring Pairs
  ScoringPairs: { roundId: string; competitionId: string };

  // Join Competition
  JoinCompetition: undefined;

  // Profile
  EditProfile: undefined;
  MyStatistics: undefined;
  Settings: undefined;
  NotificationSettings: undefined;

  // Friends
  Friends: { fromProfile?: boolean } | undefined;
  FriendProfile: { friendId: string };

  // Stats Comparison
  CompareStats: { playerId1: string; playerId2: string };

  // Subscription
  Subscription: undefined;

  // Match Play Scoring
  MatchPlayScoring: {
    roundId: string;
    player1Id?: string;
    player2Id?: string;
    team1Id?: string;
    team2Id?: string;
  };

  // Venues & Courses
  Venue: { venueId: string };
  Course: { courseId: string; venueId?: string };

  // Notifications
  Notifications: undefined;

  // Help & Support
  HelpAndSupport: undefined;
};

/**
 * Bottom Tab Navigation - Main app tabs
 */
export type TabParamList = {
  RoundsTab: undefined;
  CompetitionsTab: undefined;
  CoursesTab: undefined;
  FriendsTab: undefined;
  ProfileTab: undefined;
};

/**
 * Screen Props Types
 * Use these types in your screen components
 *
 * @example
 * type Props = RootStackScreenProps<'Login'>;
 * export default function LoginScreen({ navigation, route }: Props) { ... }
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

/**
 * Global navigation type augmentation
 * Enables type-safe navigation.navigate() throughout the app
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
