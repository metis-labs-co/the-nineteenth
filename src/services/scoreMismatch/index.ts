/**
 * Score Mismatch Service
 *
 * Re-exports all functions and types from focused score mismatch modules.
 *
 * Modules:
 * - types.ts      - Shared types and error handling
 * - entries.ts    - Score entry CRUD operations
 * - detection.ts  - Mismatch detection and persistence
 * - resolution.ts - Mismatch resolution and scorecard updates
 * - submission.ts - Submission readiness checks and bypass handling
 */

// Types
export type {
  ScoreEntry,
  ScoreMismatch,
  ScoreSubmissionStatus,
  SubmissionReadiness,
  PartnerProgress,
} from './types';

// Score Entries
export {
  saveScoreEntry,
  saveScoreEntries,
  getRoundScoreEntries,
  getScorerEntries,
  isScorerComplete,
} from './entries';

// Mismatch Detection
export {
  detectMismatches,
  createMismatchRecords,
  getPendingMismatches,
  getMismatch,
} from './detection';

// Resolution
export {
  resolveMismatch,
  applyResolvedScoreToScorecard,
} from './resolution';

// Submission Readiness & Bypass Handling
export {
  checkSubmissionReadiness,
  getPartnerProgress,
  startBypassTimer,
  getSubmissionStatus,
  markSubmissionBypassed,
  applyBypassScores,
} from './submission';

// Singleton (preserves backward compatibility)
import {
  saveScoreEntry,
  saveScoreEntries,
  getRoundScoreEntries,
  getScorerEntries,
  isScorerComplete,
} from './entries';
import { detectMismatches, createMismatchRecords, getPendingMismatches, getMismatch } from './detection';
import { resolveMismatch, applyResolvedScoreToScorecard } from './resolution';
import {
  checkSubmissionReadiness,
  getPartnerProgress,
  startBypassTimer,
  getSubmissionStatus,
  markSubmissionBypassed,
  applyBypassScores,
} from './submission';

export const scoreMismatchService = {
  // Score Entries
  saveScoreEntry,
  saveScoreEntries,
  getRoundScoreEntries,
  getScorerEntries,
  isScorerComplete,
  // Mismatch Detection
  detectMismatches,
  createMismatchRecords,
  getPendingMismatches,
  getMismatch,
  // Resolution
  resolveMismatch,
  applyResolvedScoreToScorecard,
  // Submission Readiness
  checkSubmissionReadiness,
  getPartnerProgress,
  // Bypass Handling
  startBypassTimer,
  getSubmissionStatus,
  markSubmissionBypassed,
  applyBypassScores,
};

export default scoreMismatchService;
