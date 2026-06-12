/**
 * Rounds Service Module
 *
 * Exports all round-related services for managing rounds and results.
 */

export {
  roundResultsService,
  type SaveRoundResultInput,
  type RoundResultWithParticipant,
  type CompetitionResults,
} from './roundResultsService';

export { updateRound, type UpdateRoundFields } from './updateRound';

export {
  reseedRoundPairings,
  type ReseedRoundPairingsInput,
} from './reseedRoundPairings';

export {
  DEFAULT_HOLES,
  createPlaceholderHoles,
  fetchRoundHoles,
  createRoundSideGames,
  buildPlayerTeeMap,
  navigateToScoring,
  type FetchRoundHolesResult,
  type CreateRoundSideGamesArgs,
  type BuildPlayerTeeMapArgs,
  type NavigateToScoringArgs,
} from './roundSession';
