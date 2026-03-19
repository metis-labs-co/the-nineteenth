/**
 * League Database Types
 * Leagues for cross-course competition using WHS handicap differentials
 */

// =====================================================
// ENUMS
// =====================================================

export type LeagueStatus = 'active' | 'archived';

export type LeagueType = 'ongoing' | 'season' | 'round_limit' | 'ladder' | 'eclectic' | 'partnership';

export type LeaguePlayerStatus = 'invited' | 'accepted' | 'declined' | 'removed';

export type LadderChallengeStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'expired' | 'cancelled';

export type LadderSeeding = 'join_order' | 'handicap' | 'random';

export type EclecticScoring = 'gross' | 'net';

export type PartnershipFormat = 'combined_stroke' | 'scramble' | 'shamble' | 'best_ball';

export type DifficultyLevel = 'easy' | 'standard' | 'challenge' | 'heroic';

export type PartnershipStatus = 'active' | 'dissolved';

// =====================================================
// TABLES
// =====================================================

/**
 * League - cross-course competition group
 */
export interface League {
  id: string; // UUID
  name: string;
  description: string | null;
  created_by: string; // UUID, references players(id)
  invite_code: string; // Unique, LGE-XXXXX format
  league_type: LeagueType;
  status: LeagueStatus;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp

  // Season fields
  start_date: string | null; // DATE (ISO)
  end_date: string | null; // DATE (ISO)

  // Round Limit fields
  max_rounds: number | null;
  counting_rounds: number | null;

  // Ladder fields
  challenge_range: number | null; // Default 3
  ladder_seeding: LadderSeeding | null;

  // Eclectic fields
  course_id: string | null; // UUID, references courses(id)
  tee_id: string | null; // UUID, references tees(id)
  eclectic_scoring: EclecticScoring | null;

  // Partnership fields
  partnership_format: PartnershipFormat | null;
}

/**
 * League player membership
 */
export interface LeaguePlayer {
  league_id: string; // UUID
  player_id: string; // UUID
  status: LeaguePlayerStatus;
  joined_at: string; // ISO timestamp
  created_at: string; // ISO timestamp
  ladder_position: number | null;
}

/**
 * Scorecard tagged to a league with handicap differential
 */
export interface LeagueRound {
  id: string; // UUID
  league_id: string; // UUID
  scorecard_id: string; // UUID
  player_id: string; // UUID
  handicap_differential: number; // WHS differential, -10 to 80, 1 decimal
  tagged_at: string; // ISO timestamp
  created_at: string; // ISO timestamp
}

/**
 * League round with full scorecard and round details (for bottom sheet)
 */
export interface LeagueRoundDetail {
  id: string;                          // league_rounds.id
  scorecard_id: string;
  round_id: string;                    // from scorecards → rounds
  handicap_differential: number;
  tagged_at: string;
  total_gross: number;                 // from scorecards
  course_rating_used: number | null;   // from scorecards
  slope_rating_used: number | null;    // from scorecards
  daily_handicap_used: number | null;  // from scorecards
  course_name: string;                 // from rounds → courses
  date_played: string | null;          // from rounds
}

/**
 * Ladder challenge between two players
 */
export interface LadderChallenge {
  id: string; // UUID
  league_id: string; // UUID
  challenger_id: string; // UUID
  challenged_id: string; // UUID
  status: LadderChallengeStatus;
  challenger_scorecard_id: string | null; // UUID
  challenged_scorecard_id: string | null; // UUID
  challenger_differential: number | null;
  challenged_differential: number | null;
  winner_id: string | null; // UUID
  challenger_position: number;
  challenged_position: number;
  created_at: string; // ISO timestamp
  accepted_at: string | null; // ISO timestamp
  deadline: string | null; // ISO timestamp
  completed_at: string | null; // ISO timestamp
}

/**
 * Eclectic best score per hole for a player
 */
export interface EclecticBestScore {
  id: string; // UUID
  league_id: string; // UUID
  player_id: string; // UUID
  hole_number: number; // 1-18
  best_gross: number;
  best_net: number | null;
  source_scorecard_id: string; // UUID
  achieved_at: string; // ISO timestamp
}

// =====================================================
// COMPOSITE / VIEW TYPES
// =====================================================

/**
 * League leaderboard entry returned by get_league_leaderboard()
 */
export interface LeagueLeaderboardEntry {
  player_id: string;
  name: string;
  photo_url: string | null;
  rounds_played: number;
  rounds_counting: number; // Best N of last 20
  avg_differential: number; // Avg of counting rounds (lower = better)
  best_differential: number;
  rank: number;
}

/**
 * Ladder standings entry returned by get_ladder_standings()
 */
export interface LadderStandingsEntry {
  player_id: string;
  name: string;
  photo_url: string | null;
  ladder_position: number;
  wins: number;
  losses: number;
  active_challenge_id: string | null;
  active_challenge_status: LadderChallengeStatus | null;
}

/**
 * Ladder challenge with player names for display
 */
export interface LadderChallengeWithPlayers extends LadderChallenge {
  challenger_name: string;
  challenged_name: string;
  challenger_photo_url: string | null;
  challenged_photo_url: string | null;
}

/**
 * Eclectic leaderboard entry returned by get_eclectic_leaderboard()
 */
export interface EclecticLeaderboardEntry {
  player_id: string;
  name: string;
  photo_url: string | null;
  total_best_gross: number;
  total_best_net: number | null;
  holes_completed: number;
  rounds_played: number;
  rank: number;
}

/**
 * League with player count for list views
 */
export interface LeagueWithPlayerCount extends League {
  player_count: number;
}

/**
 * League with the current user's rank for list cards
 */
export interface LeagueWithUserRank extends LeagueWithPlayerCount {
  user_rank: number | null;
  user_rounds_played: number;
}

// =====================================================
// LEAGUE STATS
// =====================================================

/**
 * Response from get_league_stats() RPC
 */
export interface LeagueStatsResponse {
  total_rounds: number;
  active_players: number;
  league_avg_differential: number | null;
  league_best_differential: number | null;
  courses_played: number;
  my_rounds_count: number;
  my_avg_differential: number | null;
  my_best_differential: number | null;
  my_avg_gross: number | null;
  my_differentials: { differential: number; date_played: string; course_name: string }[];
  course_stats: { course_name: string; times_played: number; avg_gross: number; best_gross: number }[];
  records: {
    best_differential: { value: number; player_name: string; date: string } | null;
    lowest_gross: { value: number; player_name: string; date: string; course: string } | null;
    most_rounds: { count: number; player_name: string } | null;
    most_improved: { improvement: number; player_name: string } | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  score_data: { scores: Record<string, any>[]; holes: { number: number; par: number }[] }[] | null;
}

// =====================================================
// PARTNERSHIP TYPES
// =====================================================

/**
 * Partnership within a partnership league (always 2 players)
 */
export interface LeaguePartnership {
  id: string; // UUID
  league_id: string; // UUID
  player_1_id: string; // UUID, always < player_2_id
  player_2_id: string; // UUID
  name: string | null; // Display name, e.g. "Sam & Mike"
  status: PartnershipStatus;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Tagged round for a partnership with target tracking
 */
export interface PartnershipRound {
  id: string; // UUID
  league_id: string; // UUID
  partnership_id: string; // UUID
  scorecard_1_id: string; // UUID
  scorecard_2_id: string | null; // UUID, NULL for scramble
  player_1_id: string; // UUID
  player_2_id: string; // UUID
  course_id: string | null; // UUID
  course_name: string;
  course_rating: number | null;
  slope_rating: number | null;
  par: number | null;
  combined_gross: number;
  target_score: number;
  difficulty_level: DifficultyLevel;
  target_differential: number; // combined_gross - target_score
  player_1_handicap: number | null;
  player_2_handicap: number | null;
  played_at: string | null; // DATE
  tagged_at: string; // ISO timestamp
}

/**
 * Partnership leaderboard entry returned by get_partnership_leaderboard()
 */
export interface PartnershipLeaderboardEntry {
  partnership_id: string;
  partnership_name: string | null;
  player_1_id: string;
  player_1_name: string;
  player_1_photo_url: string | null;
  player_2_id: string;
  player_2_name: string;
  player_2_photo_url: string | null;
  rounds_played: number;
  avg_target_differential: number | null;
  best_differential: number | null;
  times_under_target: number;
  rank: number;
}

/**
 * Course best for a partnership returned by get_partnership_course_bests()
 */
export interface PartnershipCourseBest {
  partnership_id: string;
  partnership_name: string | null;
  course_id: string | null;
  course_name: string;
  best_combined_gross: number;
  best_differential: number;
  times_played: number;
}
