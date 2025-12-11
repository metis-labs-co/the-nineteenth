/**
 * Competition Players Service
 *
 * Handles operations for managing players in competitions.
 */

export {
  competitionPlayersService,
  checkPlayerScoringPairs,
  removePlayerFromCompetition,
  getAffectedRoundIds,
} from './competitionPlayersService';

export type {
  CompetitionPlayersServiceError,
  PlayerScoringPairInfo,
  PlayerRemovalCheck,
} from './competitionPlayersService';
