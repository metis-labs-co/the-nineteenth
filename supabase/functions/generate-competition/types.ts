/**
 * Types for AI Competition Generation Edge Function
 */

// Game type enum matching the app's database enums
export type GameType =
  | 'stroke'
  | 'stableford'
  | 'match-play'
  | 'ambrose'
  | 'best-ball'
  | 'scramble';

// Team mode enum
export type TeamMode = 'none' | 'fixed' | 'per-round';

// Handicap system enum
export type HandicapSystem = 'honor' | 'golf-australia' | 'gross-only';

// Competition type enum
export type CompetitionType = 'league' | 'event';

/**
 * Friend data passed from mobile app
 */
export interface FriendInput {
  id: string;
  name: string;
  handicap: number | null;
}

/**
 * Existing placeholder player data passed from mobile app
 */
export interface PlaceholderInput {
  id: string;
  name: string;
  handicap: number | null;
}

/**
 * Organizer (current user) data passed from mobile app
 */
export interface OrganizerInput {
  id: string;
  name: string;
  handicap: number | null;
}

/**
 * Tier limits passed from mobile app
 */
export interface TierLimitsInput {
  maxRounds: number;
  maxPlayers: number;
  allowedGameTypes: GameType[];
}

/**
 * Request body from mobile app
 */
export interface GenerateCompetitionRequest {
  prompt: string;
  friends: FriendInput[];
  tierLimits: TierLimitsInput;
  favoriteCourses?: FavoriteCourseInput[];
  placeholderPlayers?: PlaceholderInput[];
  organizer: OrganizerInput;
}

/**
 * Course search result from database
 */
export interface CourseSearchResult {
  id: string;
  name: string;
  club_id: string;
  club_name: string;
  state: string;
  city: string | null;
}

/**
 * Favorite course passed from mobile app
 */
export interface FavoriteCourseInput {
  id: string;
  name: string;
  club_id: string;
  club_name: string;
  state: string;
  city: string | null;
}

/**
 * Generated round from Claude
 */
export interface GeneratedRound {
  roundNumber: number;
  courseId: string | null;
  courseName: string;
  venueName: string;
  date: string; // DD/MM/YYYY format
  teeTime: string | null; // HH:MM format
  gameType: GameType;
  courseNotFound?: boolean;
}

/**
 * Generated player selection from Claude
 */
export interface GeneratedPlayer {
  id: string;
  name: string;
  handicap: number | null;
  isPlaceholder?: boolean; // True if this is a new placeholder to be created
}

/**
 * Generated team from Claude
 */
export interface GeneratedTeam {
  name: string;
  playerIds: string[];
}

/**
 * Complete generated competition from Claude
 */
export interface GeneratedCompetition {
  name: string;
  description: string | null;
  competitionType: CompetitionType;
  startDate: string; // DD/MM/YYYY format
  endDate: string | null; // DD/MM/YYYY format
  handicapSystem: HandicapSystem;
  teamMode: TeamMode;
  teamSize: number | null;
  rounds: GeneratedRound[];
  players: GeneratedPlayer[];
  teams?: GeneratedTeam[];
  assumptions?: string[];
  validationErrors?: string[];
}

/**
 * Success response to mobile app
 */
export interface GenerateCompetitionSuccessResponse {
  success: true;
  competition: GeneratedCompetition;
}

/**
 * Error response to mobile app
 */
export interface GenerateCompetitionErrorResponse {
  success: false;
  error: string;
  code:
    | 'INVALID_REQUEST'
    | 'AUTH_ERROR'
    | 'CLAUDE_ERROR'
    | 'PARSE_ERROR'
    | 'VALIDATION_ERROR'
    | 'INTERNAL_ERROR';
  details?: string;
}

export type GenerateCompetitionResponse =
  | GenerateCompetitionSuccessResponse
  | GenerateCompetitionErrorResponse;
