/**
 * Golf Australia Daily Handicap Types
 *
 * Types for the GA 2025 Daily Handicap calculation system.
 * Formula: Daily HC = ((GA Handicap × Slope ÷ 113) + (Course Rating − Par)) × 0.93 × Consistency Factor
 */

/**
 * Input parameters for daily handicap calculation
 */
export interface DailyHandicapParams {
  /** Player's GA Handicap Index */
  gaHandicap: number;
  /** Course/tee slope rating (default 113 - neutral slope) */
  slopeRating?: number;
  /** Course/tee scratch rating (default par) */
  courseRating?: number;
  /** Course par (sum of hole pars) */
  par: number;
  /** Player gender for consistency factor (null defaults to male) */
  gender?: 'male' | 'female' | null;
}

/**
 * Result of daily handicap calculation
 */
export interface DailyHandicapResult {
  /** Final rounded value for strokes received */
  dailyHandicap: number;
  /** Intermediate value: GA HC × Slope ÷ 113 (1 decimal) */
  courseHandicap: number;
  /** Applied consistency factor: 0.9986 (male) or 1.0483 (female) */
  consistencyFactor: number;
}

// ============================================
// Social Handicap Index Types (WHS)
// ============================================

/**
 * Input parameters for WHS score differential calculation
 */
export interface ScoreDifferentialParams {
  /** Adjusted gross score for the round */
  adjustedGrossScore: number;
  /** Course rating for the tee played */
  courseRating: number;
  /** Slope rating for the tee played */
  slopeRating: number;
}

/**
 * A round in the handicap history
 * Used to display rounds in the Handicap History screen
 */
export interface HandicapRound {
  /** Scorecard ID (UUID) */
  scorecardId: string;
  /** Round ID (UUID) */
  roundId: string;
  /** Date of the round (ISO string) */
  roundDate: string;
  /** Name of the course played */
  courseName: string;
  /** Name of the club/facility */
  clubName: string;
  /** Total gross score for the round */
  totalGross: number;
  /** Strokes received for this round (daily handicap snapshot) */
  dailyHandicapUsed: number;
  /** WHS score differential for this round */
  handicapDifferential: number;
  /** Course rating at time of round (snapshot) */
  courseRatingUsed: number;
  /** Slope rating at time of round (snapshot) */
  slopeRatingUsed: number;
  /** True if this round counts toward the handicap index */
  isQualifying: boolean;
  /** Position in history (1 = most recent, 20 = oldest) */
  roundNumber: number;
}

/**
 * Full handicap calculation result with history
 * Returned by useHandicapHistory hook
 */
export interface HandicapSummary {
  /** Calculated WHS handicap index, or null if no rounds */
  handicapIndex: number | null;
  /** Total number of rounds with differentials */
  totalRounds: number;
  /** Number of rounds that count toward index (1-8 based on WHS table) */
  qualifyingRoundsCount: number;
  /** Array of rounds with handicap data */
  rounds: HandicapRound[];
  /** ISO timestamp when index was last calculated */
  lastUpdated: string | null;
}
