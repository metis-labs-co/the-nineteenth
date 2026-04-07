/**
 * Scoring Pairs Utilities
 *
 * Functions for generating and validating scoring pairs in golf competitions.
 * Split into focused modules for maintainability.
 */

// Types
export type {
  CrossTeamPairingStrategy,
  UnevenTeamMetadata,
  CrossTeamPairResult,
  ScoringPairsCoverageResult,
} from './types';

// Pair generation (reciprocal, circular, auto, cross-team, shuffle)
export {
  generateReciprocalPairs,
  generateCircularChain,
  autoGenerateScoringPairs,
  generateCrossTeamPairs,
  shuffleForPairing,
} from './generation';

// Coverage validation
export { validateScoringPairsCoverage } from './validation';
