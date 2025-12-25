/**
 * Database Schema Types
 * Complete database schema type for Supabase client
 */

import type {
  HandicapSystem,
  CompetitionVisibility,
  CompetitionStatus,
  GameType,
  RoundStatus,
  InvitationStatus,
  ScorecardStatus,
  AustralianState,
  CourseSource,
  FriendshipStatus,
  TeamMode,
  TeamFormat,
  NotificationType,
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionSource,
  TierFeature,
} from './enums';

import type { Player, Friendship } from './player.types';
import type { Competition, CompetitionPlayer } from './competition.types';
import type { Venue, Course, FavoriteCourse } from './course.types';
import type { Round, Pairing, RoundPlayer } from './round.types';
import type { Scorecard, LeaderboardEntry, ScoringPair, ScoringPairsValidation } from './scorecard.types';
import type { Team, TeamMember, RoundResult, TeamStandingsEntry } from './team.types';
import type { Notification, NotificationData } from './notification.types';
import type { UserSubscription, TierLimits } from './subscription.types';
import type { PushToken } from './push-token.types';

/**
 * Complete database schema type for Supabase client
 * Use with: supabase.from<Database['public']['Tables']['table_name']['Row']>()
 */
export interface Database {
  public: {
    Tables: {
      players: {
        Row: Player;
        Insert: Omit<Player, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Player, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      competitions: {
        Row: Competition;
        Insert: Omit<Competition, 'id' | 'invite_code' | 'status' | 'created_at' | 'updated_at' | 'deleted_at'>;
        Update: Partial<Omit<Competition, 'id' | 'invite_code' | 'organizer_id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'competitions_organizer_id_fkey';
            columns: ['organizer_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          }
        ];
      };
      venues: {
        Row: Venue;
        Insert: Omit<Venue, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Venue, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      courses: {
        Row: Course;
        Insert: Omit<Course, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Course, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'courses_venue_id_fkey';
            columns: ['venue_id'];
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          }
        ];
      };
      rounds: {
        Row: Round;
        Insert: Omit<Round, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Round, 'id' | 'competition_id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'rounds_competition_id_fkey';
            columns: ['competition_id'];
            referencedRelation: 'competitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rounds_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          }
        ];
      };
      competition_players: {
        Row: CompetitionPlayer;
        Insert: Omit<CompetitionPlayer, 'created_at'>;
        Update: Partial<Omit<CompetitionPlayer, 'competition_id' | 'player_id' | 'invited_at' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: 'competition_players_competition_id_fkey';
            columns: ['competition_id'];
            referencedRelation: 'competitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'competition_players_player_id_fkey';
            columns: ['player_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          }
        ];
      };
      pairings: {
        Row: Pairing;
        Insert: Omit<Pairing, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Pairing, 'id' | 'round_id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'pairings_round_id_fkey';
            columns: ['round_id'];
            referencedRelation: 'rounds';
            referencedColumns: ['id'];
          }
        ];
      };
      scorecards: {
        Row: Scorecard;
        Insert: Omit<Scorecard, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Scorecard, 'id' | 'round_id' | 'player_id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'scorecards_round_id_fkey';
            columns: ['round_id'];
            referencedRelation: 'rounds';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scorecards_player_id_fkey';
            columns: ['player_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          }
        ];
      };
      favorite_courses: {
        Row: FavoriteCourse;
        Insert: Omit<FavoriteCourse, 'id' | 'created_at'>;
        Update: never; // Favorites are only inserted or deleted, not updated
        Relationships: [
          {
            foreignKeyName: 'favorite_courses_player_id_fkey';
            columns: ['player_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorite_courses_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          }
        ];
      };
      friendships: {
        Row: Friendship;
        Insert: Omit<Friendship, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Friendship, 'id' | 'requester_id' | 'addressee_id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'friendships_requester_id_fkey';
            columns: ['requester_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_addressee_id_fkey';
            columns: ['addressee_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          }
        ];
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Team, 'id' | 'competition_id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'teams_competition_id_fkey';
            columns: ['competition_id'];
            referencedRelation: 'competitions';
            referencedColumns: ['id'];
          }
        ];
      };
      team_members: {
        Row: TeamMember;
        Insert: Omit<TeamMember, 'joined_at'>;
        Update: never; // Team members are only inserted or deleted, not updated
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey';
            columns: ['team_id'];
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_members_player_id_fkey';
            columns: ['player_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          }
        ];
      };
      round_results: {
        Row: RoundResult;
        Insert: Omit<RoundResult, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<RoundResult, 'id' | 'round_id' | 'player_id' | 'team_id' | 'is_team_result' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'round_results_round_id_fkey';
            columns: ['round_id'];
            referencedRelation: 'rounds';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'round_results_player_id_fkey';
            columns: ['player_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'round_results_team_id_fkey';
            columns: ['team_id'];
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          }
        ];
      };
      scoring_pairs: {
        Row: ScoringPair;
        Insert: Omit<ScoringPair, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ScoringPair, 'id' | 'round_id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'scoring_pairs_round_id_fkey';
            columns: ['round_id'];
            referencedRelation: 'rounds';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scoring_pairs_scorer_id_fkey';
            columns: ['scorer_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scoring_pairs_player_id_fkey';
            columns: ['player_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          }
        ];
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'is_read' | 'read_at' | 'created_at'>;
        Update: Partial<Pick<Notification, 'is_read' | 'read_at'>>;
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_competition_id_fkey';
            columns: ['competition_id'];
            referencedRelation: 'competitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_round_id_fkey';
            columns: ['round_id'];
            referencedRelation: 'rounds';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_player_id_fkey';
            columns: ['player_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_friendship_id_fkey';
            columns: ['friendship_id'];
            referencedRelation: 'friendships';
            referencedColumns: ['id'];
          }
        ];
      };
      round_players: {
        Row: RoundPlayer;
        Insert: Omit<RoundPlayer, 'id' | 'created_at'>;
        Update: never; // Round players are only inserted or deleted, not updated
        Relationships: [
          {
            foreignKeyName: 'round_players_round_id_fkey';
            columns: ['round_id'];
            referencedRelation: 'rounds';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'round_players_player_id_fkey';
            columns: ['player_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'round_players_added_by_fkey';
            columns: ['added_by'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          }
        ];
      };
      user_subscriptions: {
        Row: UserSubscription;
        Insert: Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserSubscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      tier_limits: {
        Row: TierLimits;
        Insert: Omit<TierLimits, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TierLimits, 'id' | 'tier' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      push_tokens: {
        Row: PushToken;
        Insert: Omit<PushToken, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PushToken, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      calculate_stableford_points: {
        Args: {
          gross_score: number;
          par: number;
          player_handicap: number;
          stroke_index: number;
        };
        Returns: number;
      };
      get_competition_leaderboard: {
        Args: {
          comp_id: string; // UUID
        };
        Returns: LeaderboardEntry[];
      };
      get_team_with_members: {
        Args: {
          team_uuid: string; // UUID
        };
        Returns: {
          team_id: string;
          team_name: string;
          competition_id: string;
          player_id: string;
          player_name: string;
          player_handicap: number;
          joined_at: string;
        }[];
      };
      get_competition_team_standings: {
        Args: {
          comp_id: string; // UUID
        };
        Returns: TeamStandingsEntry[];
      };
      get_competition_individual_standings: {
        Args: {
          comp_id: string; // UUID
        };
        Returns: {
          rank: number;
          player_id: string;
          player_name: string;
          handicap: number;
          total_points: number;
          rounds_played: number;
        }[];
      };
      get_player_scoring_assignment: {
        Args: {
          p_round_id: string; // UUID
          p_scorer_id: string; // UUID
        };
        Returns: string | null; // UUID of player being scored, or null
      };
      get_player_scorer: {
        Args: {
          p_round_id: string; // UUID
          p_player_id: string; // UUID
        };
        Returns: string | null; // UUID of scorer, or null
      };
      validate_scoring_pairs: {
        Args: {
          p_round_id: string; // UUID
        };
        Returns: ScoringPairsValidation[];
      };
      generate_reciprocal_scoring_pairs: {
        Args: {
          p_round_id: string; // UUID
        };
        Returns: number; // Number of pairs created
      };
      get_unread_notification_count: {
        Args: {
          p_user_id: string; // UUID
        };
        Returns: number;
      };
      mark_all_notifications_read: {
        Args: {
          p_user_id: string; // UUID
        };
        Returns: number; // Number of notifications marked as read
      };
      create_notification: {
        Args: {
          p_user_id: string; // UUID
          p_type: NotificationType;
          p_data?: NotificationData;
          p_competition_id?: string | null;
          p_round_id?: string | null;
          p_player_id?: string | null;
          p_friendship_id?: string | null;
        };
        Returns: string; // UUID of created notification
      };
      get_user_subscription_tier: {
        Args: {
          p_user_id: string; // UUID
        };
        Returns: SubscriptionTier;
      };
      user_has_tier_or_higher: {
        Args: {
          p_user_id: string; // UUID
          p_required_tier: SubscriptionTier;
        };
        Returns: boolean;
      };
      upsert_user_subscription: {
        Args: {
          p_user_id: string; // UUID
          p_tier: SubscriptionTier;
          p_status: SubscriptionStatus;
          p_source: SubscriptionSource;
          p_external_id?: string | null;
          p_product_id?: string | null;
          p_expires_at?: string | null; // ISO timestamp
          p_trial_ends_at?: string | null; // ISO timestamp
        };
        Returns: string; // UUID of subscription
      };
      // Tier limits functions
      get_tier_limits: {
        Args: {
          p_tier: SubscriptionTier;
        };
        Returns: TierLimits;
      };
      get_user_tier_limits: {
        Args: {
          p_user_id: string; // UUID
        };
        Returns: TierLimits;
      };
      user_can_create_competition: {
        Args: {
          p_user_id: string; // UUID
        };
        Returns: boolean;
      };
      competition_can_add_round: {
        Args: {
          p_competition_id: string; // UUID
        };
        Returns: boolean;
      };
      competition_can_add_player: {
        Args: {
          p_competition_id: string; // UUID
        };
        Returns: boolean;
      };
      user_can_add_friend: {
        Args: {
          p_user_id: string; // UUID
        };
        Returns: boolean;
      };
      user_can_use_game_type: {
        Args: {
          p_user_id: string; // UUID
          p_game_type: string;
        };
        Returns: boolean;
      };
      user_has_feature: {
        Args: {
          p_user_id: string; // UUID
          p_feature: TierFeature;
        };
        Returns: boolean;
      };
      is_super_admin: {
        Args: {
          p_user_id: string; // UUID
        };
        Returns: boolean;
      };
      // Push token functions
      get_user_push_tokens: {
        Args: {
          p_user_id: string; // UUID
        };
        Returns: {
          expo_token: string;
          platform: string | null;
        }[];
      };
      upsert_push_token: {
        Args: {
          p_user_id: string; // UUID
          p_token: string;
          p_device_id?: string | null;
          p_platform?: string | null;
          p_device_name?: string | null;
          p_app_version?: string | null;
        };
        Returns: string; // UUID of token
      };
      disable_push_token: {
        Args: {
          p_token: string;
        };
        Returns: boolean;
      };
      get_users_with_push_enabled: {
        Args: {
          p_user_ids: string[]; // UUID[]
        };
        Returns: {
          user_id: string;
        }[];
      };
    };
    Enums: {
      handicap_system: HandicapSystem;
      competition_visibility: CompetitionVisibility;
      competition_status: CompetitionStatus;
      game_type: GameType;
      round_status: RoundStatus;
      invitation_status: InvitationStatus;
      scorecard_status: ScorecardStatus;
      australian_state: AustralianState;
      course_source: CourseSource;
      friendship_status: FriendshipStatus;
      team_mode: TeamMode;
      team_format: TeamFormat;
      notification_type: NotificationType;
      subscription_tier: SubscriptionTier;
      subscription_status: SubscriptionStatus;
      subscription_source: SubscriptionSource;
    };
    CompositeTypes: Record<string, never>;
  };
}
