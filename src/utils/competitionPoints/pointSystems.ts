// ============================================================================
// Types
// ============================================================================

/**
 * Point allocation rules for competition standings
 */
export interface PointSystemRules {
  /** Points awarded by position (index 0 = 1st place, etc.) */
  positionPoints: number[];
  /** Default points for positions beyond the defined array */
  defaultPoints?: number;
  /** Match play specific point allocation */
  matchPlay?: {
    win: number;
    draw: number;
    loss: number;
  };
}

/**
 * Result from a single round that can be scored
 */
export interface RoundResult<TParticipant = string> {
  participantId: TParticipant;
  rawScore: number;
  /** Optional identifier for team-based results */
  teamId?: string;
}

/**
 * Result with position and competition points assigned
 */
export interface ScoredResult<TParticipant = string> extends RoundResult<TParticipant> {
  position: number;
  /** True if this position is tied with others */
  tied: boolean;
  competitionPoints: number;
}

/**
 * Match result for match play scoring
 */
export interface MatchResult<TParticipant = string> {
  participantId: TParticipant;
  opponentId: TParticipant;
  result: 'win' | 'draw' | 'loss';
  /** Optional margin of victory (e.g., "3&2") */
  margin?: string;
}

/**
 * Round results for aggregation
 */
export interface RoundResultsForAggregation<TParticipant = string> {
  roundId: string;
  results: ScoredResult<TParticipant>[];
}

/**
 * Aggregated standings entry
 */
export interface StandingsEntry<TParticipant = string> {
  participantId: TParticipant;
  totalPoints: number;
  roundsPlayed: number;
  /** Points breakdown by round */
  roundPoints: {
    roundId: string;
    points: number;
    position: number;
  }[];
  /** Current position in standings */
  position: number;
  /** True if tied with others at this position */
  tied: boolean;
}

// ============================================================================
// Default Point Systems
// ============================================================================

/**
 * Standard competition point system (1st = 10, 2nd = 8, etc.)
 */
export const STANDARD_POINT_SYSTEM: PointSystemRules = {
  positionPoints: [10, 8, 6, 5, 4, 3, 2, 1],
  defaultPoints: 1,
  matchPlay: {
    win: 2,
    draw: 1,
    loss: 0,
  },
};

/**
 * Golf league point system (rewards participation)
 */
export const LEAGUE_POINT_SYSTEM: PointSystemRules = {
  positionPoints: [25, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  defaultPoints: 1,
  matchPlay: {
    win: 3,
    draw: 1,
    loss: 0,
  },
};
