/**
 * Navigation Types for The Nineteenth
 *
 * Type-safe navigation for React Navigation v6
 * Defines all routes and their parameters for the app
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';

/**
 * Root Stack - Top-level navigation
 * Contains auth screens and main app screens
 */
export type RootStackParamList = {
  // First-launch welcome/intro carousel (pre-auth)
  WelcomeCarousel: undefined;

  // Auth Flow
  Login: undefined;
  Signup: undefined;
  OTPVerification: { email: string };

  // Onboarding (shown for users who haven't set handicap)
  Onboarding: undefined;

  // Main Tabs Navigator
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;

  // Competitions
  Competitions: undefined;
  CompetitionDetail: { id: string };
  CreateCompetition: { initialState?: import('@/utils/aiToWizardState').WizardState } | undefined;
  AICompetition: undefined;
  CompetitionSettings: { competitionId: string };

  // Rounds
  Rounds: { competitionId: string };
  RoundDetail: { id: string };
  AllRounds: undefined; // Full standalone-rounds list (formerly the Rounds tab)
  AddRound: { competitionId: string };
  EditRound: { roundId: string; competitionId?: string }; // Edit round details (organizers only)
  ViewRound: {
    roundId: string;
    competitionId?: string;
    /**
     * Optional initial tab focus on mount. Used by deep-links such as the
     * competition Skins tab cards which open the round on its skins
     * sub-tab. Falls back to 'details' when omitted.
     */
    initialTab?:
      | 'details'
      | 'scorecard'
      | 'stats'
      | 'match'
      | 'subMatches'
      | 'skins'
      | 'wolf'
      | 'payouts'
      | 'teamScores'
      | 'scrambleTeamScore'
      | 'scrambleLeaderboard'
      | 'scrambleContributions'
      | 'leaderboard';
  }; // For standalone or competition rounds
  RoundSettings: { roundId: string; competitionId?: string }; // Round settings (organizers only)
  SubMatchDetail: { subMatchId: string; roundId: string; competitionId?: string }; // Sub-match details + skins setup

  // Scorecard
  Scorecard: { roundId: string; competitionId: string; isBuildAsYouPlay?: boolean };
  ReviewScorecard: {
    roundId?: string;
    competitionId?: string;
    holes?: import('@/types/index').Hole[];
  };
  PlayerScorecard: {
    playerId: string;
    roundId: string;
  };

  // Hole Map (modal — Phase A; mode added in Phase C2; 'log-shot' added 2026-05-08)
  HoleMap: {
    courseId: string;
    holeNumber: number;
    roundId: string;
    /**
     * - 'live' (default): full shot-logging affordances during scoring
     * - 'review': read-only post-round review
     * - 'log-shot': retroactive single-shot tap-to-place flow from the Shots tab
     */
    mode?: 'live' | 'review' | 'log-shot';
    /** Strokes scored for this hole at navigation time. Used for cap behaviour
     *  in 'log-shot' mode. `null` when unknown (treat as no cap). */
    strokesScoredAtNav?: number | null;
    /** Round status snapshot at navigation time. Used for cap behaviour. */
    roundStatus?: 'upcoming' | 'in-progress' | 'completed';
  };

  // Quick Score Entry (admin/organizer backfill)
  QuickScoreEntry: {
    roundId: string;
    playerId: string;
    competitionId?: string;
  };

  // League Quick Add Round (superadmin)
  LeagueQuickAddRound: {
    leagueId: string;
  };

  // Leaderboard
  Leaderboard: { competitionId: string };

  // Players
  AddPlayers: { competitionId: string };
  PlayerDetail: { id: string };

  // Scoring Pairs
  ScoringPairs: { roundId: string; competitionId: string };

  // Join Competition
  JoinCompetition: undefined;

  // Profile
  EditProfile: undefined;
  MyStatistics: undefined;
  CourseStatistics: { courseId: string; courseName: string };
  HandicapHistory: undefined;
  Appearance: undefined;
  GameSettings: undefined;
  Security: undefined;
  Developer: undefined;
  NotificationSettings: undefined;

  // What's in the Bag
  WhatsInTheBag: undefined;
  ClubDistanceDetail: { clubKey: import('@/constants/clubs').ClubKey };
  ShotMap: {
    /** Shot row id — required for the move-on-map edit flow. */
    shotId: string;
    /** Round id — required so the cache can be patched correctly after a move. */
    roundId: string;
    /** Course id — used to fetch tee coordinates for the shot-1 tee override.
     *  `null` when the round has no linked course (standalone manual rounds). */
    courseId: string | null;
    /** Shot sequence within the hole (1-based). Tee-origin override is only
     *  meaningful for shot 1. */
    sequence: number;
    /** Landing position of the shot. */
    shotLatitude: number;
    shotLongitude: number;
    /** Position the shot was struck from (tee or prior shot). `null` when unknown. */
    originLatitude: number | null;
    originLongitude: number | null;
    /** Distance the shot travelled, in metres. `null` when origin is unknown. */
    distanceMeters: number | null;
    clubKey: import('@/constants/clubs').ClubKey;
    holeNumber: number;
    courseName: string | null;
    /** Round date (ISO) for the header. */
    roundPlayedAt: string | null;
  };

  // Friends
  Friends: { fromProfile?: boolean } | undefined;

  // Activity Feed
  Activity: undefined;
  RoundActivity: { roundId: string }; // Likes/comments/photos for a single round
  RoundPhotos: { roundId: string }; // Shared photo album for a single round

  // Leagues
  LeagueDetail: { id: string };
  CreateLeague: undefined;
  JoinLeague: undefined;
  LeagueSettings: { leagueId: string };
  TagRoundToLeague: { leagueId: string };
  ChallengeDetail: { challengeId: string; leagueId: string };
  PartnershipSetup: { leagueId: string };
  TagPartnershipRound: { leagueId: string; partnershipId: string };
  FriendProfile: { friendId: string };

  // Stats Comparison
  CompareStats: {
    playerId1: string;
    playerId2: string;
    leagueId?: string;
    competitionId?: string;
    filterLabel?: string;
  };

  // Subscription
  Subscription: undefined;

  // Match Play Scoring
  MatchPlayScoring: {
    roundId: string;
    player1Id?: string;
    player2Id?: string;
    team1Id?: string;
    team2Id?: string;
    initialHole?: number; // Starting hole number (1-18)
    competitionId?: string;
  };

  // Team Match Play Scoring
  TeamMatchPlayScoring: {
    roundId: string;
    team1Id?: string;
    team2Id?: string;
  };

  // Match Play Scorecard (full 18-hole view)
  MatchPlayScorecard: {
    roundId: string;
    player1Id: string;
    player2Id: string;
    competitionId?: string;
  };

  // Clubs & Courses
  Club: { clubId: string };
  Course: { courseId: string; clubId?: string };

  // Notifications
  Notifications: undefined;

  // Help & Support
  HelpAndSupport: undefined;

  // Privacy & Data
  PrivacyData: undefined;

  // Country / Region
  CountryRegion: undefined;

  // Admin - Placeholder Players
  LinkPlaceholder: undefined;

  // Achievements
  Achievements: { playerId?: string } | undefined;
  AchievementLeaderboard: { competitionId?: string } | undefined;

  // Game Results (Side Games)
  GameResults: undefined;
};

/**
 * Bottom Tab Navigation - Main app tabs
 */
export type TabParamList = {
  HomeTab: undefined;
  CompetitionsTab: undefined;
  CoursesTab: undefined;
  LeaguesTab: undefined;
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
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Required for React Navigation type augmentation
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
