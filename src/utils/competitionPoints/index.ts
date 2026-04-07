/**
 * Competition Points Module
 *
 * Point calculation, aggregation, and standings for competitions.
 */

// Point system types and constants
export type {
  PointSystemRules,
  RoundResult,
  ScoredResult,
  MatchResult,
  RoundResultsForAggregation,
  StandingsEntry,
} from './pointSystems';
export { STANDARD_POINT_SYSTEM, LEAGUE_POINT_SYSTEM } from './pointSystems';

// Calculation functions
export { calculateCompetitionPoints, calculateMatchPlayPoints } from './calculations';

// Aggregation functions
export { aggregateCompetitionStandings } from './aggregation';
