/**
 * Wolf Calculation Utilities
 *
 * Pure calculation functions for the Wolf strategic partner selection side-game.
 * All functions are side-effect free and can be used both client-side
 * and for offline calculations.
 *
 * Wolf is a game where one player (the "Wolf") on each hole decides to:
 * - Pick a partner from the other players
 * - Go "Lone Wolf" (play alone against the pack)
 * - Go "Blind Wolf" (declare lone wolf before anyone tees off, for double points)
 *
 * Points are awarded based on the outcome and the Wolf's decision.
 */

// Re-export currency utilities for backward compatibility
export { formatCurrency, formatNetResult } from '../currency';

// Rotation functions
export { determineWolfForHole, getWolfRotationForRound } from './rotation';

// Scoring functions
export { calculateNetScore, determineWolfHoleResult } from './scoring';

// Points calculation functions
export { DEFAULT_WOLF_POINT_VALUES, calculateWolfPoints } from './points';

// Standings functions
export { calculateWolfStandings, getSortedStandings } from './standings';

// Payout functions
export { calculateWolfPayouts, createPayoutRecords } from './payouts';

// Debt calculation functions
export type { WolfDebtTransaction } from './debt';
export { simplifyWolfDebts } from './debt';

// Validation functions
export type { WolfValidationResult } from './validation';
export {
  validateWolfParticipants,
  validateWolfDecision,
  canDeclareBlindWolf,
  isWolfGameComplete,
  getNextHoleForDecision,
  getNextHoleForCalculation,
} from './validation';

// Utility functions
export {
  formatWolfCurrency,
  formatWolfNetResult,
  getWolfDecisionDescription,
  getWolfResultDescription,
} from './utils';
