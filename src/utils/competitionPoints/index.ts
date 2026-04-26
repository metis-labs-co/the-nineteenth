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

// Decay models for the competition rules quick-setup editor.
export {
  DECAY_MODELS,
  applyDecayModel,
  scaledStandard,
  linearToOne,
  linearMinusTwo,
  halvingPairs,
} from './decay';
export type { DecayModelId, DecayModel } from './decay';
