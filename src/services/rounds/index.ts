/**
 * Rounds Service Module
 *
 * Exports all round-related services for managing rounds and results.
 */

export {
  roundResultsService,
  type SaveRoundResultInput,
  type SavedRoundResult,
  type RoundResultWithPlayer,
  type RoundResultWithTeam,
  type GetRoundResultsOptions,
  type CompetitionResultsSummary,
  type FinalizeRoundOptions,
} from './roundResultsService';
