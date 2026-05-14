/**
 * WHS Daily Handicap Types
 *
 * Types for the WHS Daily Handicap calculation system.
 * Formula: Daily HC = ((WHS Handicap Index × Slope ÷ 113) + (Course Rating − Par)) × 0.93 × Consistency Factor
 */

/**
 * Input parameters for daily handicap calculation
 */
export interface DailyHandicapParams {
  /** Player's WHS Handicap Index */
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
  /** Intermediate value: WHS HC × Slope ÷ 113 (1 decimal) */
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
  /** Scorecard ID (UUID) — for combined rounds this is the combined record's ID */
  scorecardId: string;
  /** Round ID (UUID) — for combined rounds this is the front-9 source round ID */
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
  /** True if this entry is a combination of two 9-hole rounds */
  isCombined?: boolean;
  /** Combined-only: source 9-hole scorecard IDs */
  combinedFrontScorecardId?: string;
  combinedBackScorecardId?: string;
}

/**
 * A candidate pair of 9-hole rounds (one front9 and one back9 from the same
 * course) that the user can combine into a single 18-hole handicap round.
 */
export interface CombinableNinePair {
  /** Stable key for list rendering: `${frontScorecardId}_${backScorecardId}` */
  id: string;
  courseId: string;
  courseName: string;
  clubName: string;
  /** Tee name (e.g. "White"). Both scorecards must share the same tee. */
  teeName: string | null;
  /** Front-9 scorecard summary */
  front: NinePieceSummary;
  /** Back-9 scorecard summary */
  back: NinePieceSummary;
  /** Projected combined-18 differential if the pair is combined */
  projectedDifferential: number;
  /** Projected combined gross */
  projectedCombinedGross: number;
}

/**
 * Summary fields for one 9-hole scorecard inside a combinable pair.
 */
export interface NinePieceSummary {
  scorecardId: string;
  roundId: string;
  roundDate: string;
  totalGross: number;
  dailyHandicapUsed: number | null;
  handicapDifferential: number | null;
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
  /** Unmatched 9-hole scorecards eligible to be paired into 18-hole rounds */
  combinablePairs: CombinableNinePair[];
}
