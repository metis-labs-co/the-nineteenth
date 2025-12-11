/**
 * Scoring Pairs Service
 *
 * Re-exports for scoring pairs service module.
 */

export {
  scoringPairsService,
  default,
  getRoundScoringPairs,
  getPlayersToScore,
  createScoringPairs,
  autoGenerateAndSaveScoringPairs,
  generateTeamMatchPlayPairs,
  deleteScoringPairs,
  hasScoringPairs,
} from './scoringPairsService';

export type { ScoringPairsServiceError } from './scoringPairsService';
