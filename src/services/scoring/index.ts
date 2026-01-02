/**
 * Scoring Service
 *
 * Modular scoring engine for golf competitions.
 *
 * Supports:
 * - Stableford scoring
 * - Stroke play (gross and net)
 * - Match play
 * - Team formats (Best Ball, Ambrose, Aggregate)
 */

// Types
export * from './types';

// Engines
export * from './engines';

// Utilities
export * from './utils';

// Orchestrator
export {
  ScoringOrchestrator,
  createScoringOrchestrator,
  scoringOrchestrator,
} from './ScoringOrchestrator';
