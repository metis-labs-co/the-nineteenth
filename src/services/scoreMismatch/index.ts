/**
 * Score Mismatch Service
 *
 * Re-exports all functions and types from the score mismatch service.
 */

export {
  // Types
  type ScoreEntry,
  type ScoreMismatch,
  type ScoreSubmissionStatus,
  type SubmissionReadiness,
  type PartnerProgress,
  type ScoreMismatchServiceError,
  // Score Entries
  saveScoreEntry,
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
  // Singleton
  scoreMismatchService,
} from './scoreMismatchService';
