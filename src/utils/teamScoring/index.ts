/**
 * Team Scoring Utilities
 *
 * Contains best ball, scramble, team handicap, and match play scoring.
 * Split into focused modules for maintainability.
 */

// Types
export type {
  TeamMemberScore,
  BestBallHoleResult,
  MatchPlayHoleResult,
  MatchStatus,
  MatchPlayMatchResult,
  TeamMember,
} from './types';

// Score calculations (best ball, scramble)
export {
  calculateBestBallHole,
  calculateScrambleHole,
  getBestBallTeamPoints,
  getBestBallHoleContribution,
  buildLiveTeamEntries,
} from './calculations';
export type {
  BestBallTeamPointsResult,
  BestBallHoleContribution,
} from './calculations';

// Team handicap calculation
export { calculateTeamHandicap } from './handicap';

// Match play functions
export {
  calculateMatchPlayHoleResult,
  calculateMatchPlayMatchResult,
  calculateMatchPlayHoleResultWithHandicaps,
  formatMatchPlayScore,
} from './matchPlay';

// Scramble shot slot configuration
export type { ShotSlot, ShotSlotColorKey, ShotSlotConfig } from './shotSlots';
export { getShotSlotsForPar } from './shotSlots';

// Alt-shot derived contributions
export { altShotTeePlayer, deriveAltShotShotCounts } from './altShotContributions';
export type { AltShotHoleBreakdown } from './altShotContributions';
