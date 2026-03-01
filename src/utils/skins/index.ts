/**
 * Skins Calculation Utilities
 *
 * Pure calculation functions for the skins gambling side-game feature.
 * All functions are side-effect free and can be used both client-side
 * and for offline calculations.
 */

// Re-export currency utilities for backward compatibility
export { formatCurrency, formatNetResult } from '../currency';

// Pot calculation functions
export { calculateHoleValue, calculateTotalPot, calculateBuyIn } from './pot';

// Score preparation functions
export type { SkinsParticipantInfo, SkinsScorecardData } from './scores';
export { prepareHoleScores } from './scores';

// Winner determination functions
export type { HoleWinnerResult } from './winner';
export { determineHoleWinner } from './winner';

// Team score preparation functions
export type { SkinsTeamInfo } from './teamScores';
export { prepareTeamHoleScores, getTeamScoreForFormat } from './teamScores';

// Team winner determination functions
export { determineTeamHoleWinner } from './teamWinner';

// Hole result processing functions
export type { ProcessedHoleResult, ProcessedTeamHoleResult } from './processing';
export {
  processHoleResult,
  processTeamHoleResult,
  calculateCurrentCarryover,
  calculateHole18Split,
} from './processing';

// Payout calculation functions
export type {
  PayoutParticipant,
  CalculatedPayout,
  FinalPayoutResult,
  FinalPayoutOptions,
  TeamPayoutParticipant,
  CalculatedTeamPayout,
  FinalTeamPayoutResult,
} from './payouts';
export {
  calculateFinalPayouts,
  calculateFinalPayoutsWithCarryover,
  calculateTeamFinalPayouts,
} from './payouts';

// Debt calculation functions
export type { PlayerNameMap, TeamNameMap } from './debt';
export {
  calculateNetPositions,
  simplifyDebts,
  formatDebtTransactions,
  calculateTeamNetPositions,
  simplifyTeamDebts,
  formatTeamDebtTransactions,
} from './debt';

// Validation functions
export type { ValidationResult, HoleScoresValidationResult } from './validation';
export {
  validateSkinsGame,
  validateHoleScores,
  isSkinsGameComplete,
  getNextHoleNumber,
} from './validation';
