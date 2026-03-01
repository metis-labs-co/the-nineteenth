/**
 * Score Mismatch Service
 *
 * Handles score entries and mismatch detection for dual-scoring.
 * Features:
 * - Save/retrieve score entries with attribution
 * - Detect mismatches between self-entered and partner-entered scores
 * - Create and resolve mismatch records
 * - Check submission readiness (partner complete + no pending mismatches)
 * - 30-minute bypass timer for unresponsive partners
 */

import { supabase } from '@/services/supabase/client';
import type { HoleScore } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string): any => (supabase as any).from(table);

// ============================================================================
// TYPES
// ============================================================================

export interface ScoreEntry {
  id: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  scorer_id: string;
  strokes: number;
  putts?: number | null;
  penalties?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScoreMismatch {
  id: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  self_score: number;
  partner_score: number;
  self_scorer_id: string;
  partner_scorer_id: string;
  status: 'pending' | 'resolved';
  resolved_score?: number | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  // Joined data (optional, populated when fetching with player details)
  player?: { id: string; name: string } | null;
}

export interface ScoreSubmissionStatus {
  id: string;
  round_id: string;
  player_id: string;
  partner_id: string;
  bypass_available_at: string | null;
  bypassed_at: string | null;
  bypassed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubmissionReadiness {
  canSubmit: boolean;
  reason?: 'waiting_for_partner' | 'unresolved_mismatches' | 'incomplete_scores';
  partnerName?: string;
  mismatchCount?: number;
  partnerProgress?: { completed: number; total: number };
}

export interface PartnerProgress {
  complete: boolean;
  partnerName: string;
  progress: { completed: number; total: number };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface ScoreMismatchServiceError extends Error {
  code: 'NOT_FOUND' | 'VALIDATION' | 'DATABASE' | 'UNKNOWN';
}

function createError(
  message: string,
  code: ScoreMismatchServiceError['code']
): ScoreMismatchServiceError {
  const error = new Error(message) as ScoreMismatchServiceError;
  error.code = code;
  return error;
}

// ============================================================================
// SCORE ENTRIES
// ============================================================================

/**
 * Save or update a score entry (upsert)
 *
 * @param roundId - Round UUID
 * @param playerId - Player whose score this is FOR
 * @param holeNumber - Hole number (1-18)
 * @param scorerId - Player who ENTERED this score
 * @param score - The score data
 * @returns The created/updated score entry
 */
export async function saveScoreEntry(
  roundId: string,
  playerId: string,
  holeNumber: number,
  scorerId: string,
  score: HoleScore
): Promise<ScoreEntry> {
  if (!roundId || !playerId || !scorerId) {
    throw createError('Round ID, Player ID, and Scorer ID are required', 'VALIDATION');
  }
  if (holeNumber < 1 || holeNumber > 18) {
    throw createError('Hole number must be between 1 and 18', 'VALIDATION');
  }

  const { data, error } = await (fromTable('score_entries')
    .upsert(
      {
        round_id: roundId,
        player_id: playerId,
        hole_number: holeNumber,
        scorer_id: scorerId,
        strokes: score.strokes,
        putts: score.putts ?? null,
        penalties: score.penalties ?? 0,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'round_id,player_id,hole_number,scorer_id',
      }
    )
    .select()
    .single()) as { data: ScoreEntry | null; error: any };

  if (error) {
    console.error('[ScoreMismatchService] Failed to save score entry:', error);
    throw createError(`Failed to save score entry: ${error.message}`, 'DATABASE');
  }

  return data as ScoreEntry;
}

/**
 * Get all score entries for a round
 */
export async function getRoundScoreEntries(roundId: string): Promise<ScoreEntry[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }

  const { data, error } = await fromTable('score_entries')
    .select('*')
    .eq('round_id', roundId)
    .order('hole_number');

  if (error) {
    console.error('[ScoreMismatchService] Failed to fetch score entries:', error);
    throw createError(`Failed to fetch score entries: ${error.message}`, 'DATABASE');
  }

  return (data as ScoreEntry[]) || [];
}

/**
 * Get score entries by scorer (what this scorer has entered)
 */
export async function getScorerEntries(
  roundId: string,
  scorerId: string
): Promise<ScoreEntry[]> {
  if (!roundId || !scorerId) {
    throw createError('Round ID and Scorer ID are required', 'VALIDATION');
  }

  const { data, error } = await fromTable('score_entries')
    .select('*')
    .eq('round_id', roundId)
    .eq('scorer_id', scorerId)
    .order('hole_number');

  if (error) {
    console.error('[ScoreMismatchService] Failed to fetch scorer entries:', error);
    throw createError(`Failed to fetch scorer entries: ${error.message}`, 'DATABASE');
  }

  return (data as ScoreEntry[]) || [];
}

/**
 * Check if scorer has completed all entries
 *
 * Expected entries = holeCount × 2 (self + 1 partner)
 *
 * @param roundId - Round UUID
 * @param scorerId - Scorer UUID
 * @param holeCount - Number of holes (9 or 18, defaults to 18)
 */
export async function isScorerComplete(
  roundId: string,
  scorerId: string,
  holeCount: number = 18
): Promise<boolean> {
  const entries = await getScorerEntries(roundId, scorerId);
  const expectedEntries = holeCount * 2; // Self + 1 partner
  return entries.length >= expectedEntries;
}

// ============================================================================
// MISMATCH DETECTION
// ============================================================================

/**
 * Detect mismatches by comparing score_entries
 *
 * For each (player_id, hole_number), compares:
 * - Self-entered score (scorer_id = player_id)
 * - Partner-entered score (scorer_id != player_id)
 *
 * @returns Array of detected mismatches (not yet persisted)
 */
export async function detectMismatches(roundId: string): Promise<Omit<ScoreMismatch, 'id' | 'created_at'>[]> {
  const entries = await getRoundScoreEntries(roundId);

  // Group entries by (player_id, hole_number)
  const grouped = new Map<string, ScoreEntry[]>();
  for (const entry of entries) {
    const key = `${entry.player_id}-${entry.hole_number}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  const mismatches: Omit<ScoreMismatch, 'id' | 'created_at'>[] = [];

  for (const [, pair] of grouped) {
    // Only process if we have exactly 2 entries (self and partner)
    if (pair.length === 2) {
      const selfEntry = pair.find((e) => e.scorer_id === e.player_id);
      const partnerEntry = pair.find((e) => e.scorer_id !== e.player_id);

      // Only create mismatch if scores differ
      if (selfEntry && partnerEntry && selfEntry.strokes !== partnerEntry.strokes) {
        mismatches.push({
          round_id: roundId,
          player_id: selfEntry.player_id,
          hole_number: selfEntry.hole_number,
          self_score: selfEntry.strokes,
          partner_score: partnerEntry.strokes,
          self_scorer_id: selfEntry.scorer_id,
          partner_scorer_id: partnerEntry.scorer_id,
          status: 'pending',
          resolved_score: null,
          resolved_by: null,
          resolved_at: null,
        });
      }
    }
  }

  return mismatches;
}

/**
 * Create mismatch records in database
 *
 * Uses ON CONFLICT DO NOTHING to avoid duplicates.
 *
 * @returns Number of mismatches created
 */
export async function createMismatchRecords(roundId: string): Promise<number> {
  const mismatches = await detectMismatches(roundId);

  if (mismatches.length === 0) {
    return 0;
  }

  const { data, error } = await (fromTable('score_mismatches')
    .upsert(mismatches, {
      onConflict: 'round_id,player_id,hole_number',
      ignoreDuplicates: true,
    })
    .select()) as { data: ScoreMismatch[] | null; error: any };

  if (error) {
    console.error('[ScoreMismatchService] Failed to create mismatch records:', error);
    throw createError(`Failed to create mismatch records: ${error.message}`, 'DATABASE');
  }

  return data?.length ?? 0;
}

/**
 * Get pending mismatches for a round
 */
export async function getPendingMismatches(roundId: string): Promise<ScoreMismatch[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }

  const { data, error } = await fromTable('score_mismatches')
    .select(
      `
      *,
      player:players!score_mismatches_player_id_fkey (id, name)
    `
    )
    .eq('round_id', roundId)
    .eq('status', 'pending')
    .order('hole_number');

  if (error) {
    console.error('[ScoreMismatchService] Failed to fetch pending mismatches:', error);
    throw createError(`Failed to fetch pending mismatches: ${error.message}`, 'DATABASE');
  }

  return (data as ScoreMismatch[]) || [];
}

/**
 * Get a single mismatch by ID
 */
export async function getMismatch(mismatchId: string): Promise<ScoreMismatch | null> {
  if (!mismatchId) {
    throw createError('Mismatch ID is required', 'VALIDATION');
  }

  const { data, error } = await fromTable('score_mismatches')
    .select('*')
    .eq('id', mismatchId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[ScoreMismatchService] Failed to fetch mismatch:', error);
    throw createError(`Failed to fetch mismatch: ${error.message}`, 'DATABASE');
  }

  return data as ScoreMismatch;
}

// ============================================================================
// RESOLUTION
// ============================================================================

/**
 * Resolve a mismatch (first-write-wins)
 *
 * @param mismatchId - Mismatch UUID
 * @param resolvedScore - The agreed-upon score
 * @param resolvedBy - Player UUID who resolved it
 */
export async function resolveMismatch(
  mismatchId: string,
  resolvedScore: number,
  resolvedBy: string
): Promise<void> {
  if (!mismatchId || !resolvedBy) {
    throw createError('Mismatch ID and Resolver ID are required', 'VALIDATION');
  }

  const { error } = await (fromTable('score_mismatches')
    .update({
      status: 'resolved',
      resolved_score: resolvedScore,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', mismatchId)
    .eq('status', 'pending')) as { error: any }; // Only update if still pending (first-write-wins)

  if (error) {
    console.error('[ScoreMismatchService] Failed to resolve mismatch:', error);
    throw createError(`Failed to resolve mismatch: ${error.message}`, 'DATABASE');
  }
}

/**
 * Apply resolved score to the actual scorecard (hole_scores in scorecards table)
 *
 * This updates the final scorecard's JSONB scores field with the resolved value.
 */
export async function applyResolvedScoreToScorecard(
  roundId: string,
  playerId: string,
  holeNumber: number,
  resolvedScore: number
): Promise<void> {
  if (!roundId || !playerId) {
    throw createError('Round ID and Player ID are required', 'VALIDATION');
  }

  // Fetch the current scorecard
  const { data: scorecard, error: fetchError } = await supabase
    .from('scorecards')
    .select('id, scores')
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .single() as { data: { id: string; scores: Record<string, HoleScore> } | null; error: any };

  if (fetchError) {
    console.error('[ScoreMismatchService] Failed to fetch scorecard:', fetchError);
    throw createError(`Failed to fetch scorecard: ${fetchError.message}`, 'DATABASE');
  }

  if (!scorecard) {
    throw createError('Scorecard not found', 'NOT_FOUND');
  }

  // Update the specific hole score
  const scores = scorecard.scores || {};
  const holeKey = holeNumber.toString();

  if (scores[holeKey]) {
    scores[holeKey].strokes = resolvedScore;
  } else {
    scores[holeKey] = { strokes: resolvedScore };
  }

  // Save back to scorecard
  const { error: updateError } = await (supabase.from('scorecards') as any)
    .update({ scores, updated_at: new Date().toISOString() })
    .eq('id', scorecard.id);

  if (updateError) {
    console.error('[ScoreMismatchService] Failed to update scorecard:', updateError);
    throw createError(`Failed to update scorecard: ${updateError.message}`, 'DATABASE');
  }
}

// ============================================================================
// SUBMISSION READINESS
// ============================================================================

/**
 * Check if user can submit (partner complete + no pending mismatches)
 */
export async function checkSubmissionReadiness(
  roundId: string,
  userId: string,
  scoringPairsEnabled: boolean,
  holeCount: number = 18
): Promise<SubmissionReadiness> {
  if (!scoringPairsEnabled) {
    return { canSubmit: true };
  }

  if (!roundId || !userId) {
    throw createError('Round ID and User ID are required', 'VALIDATION');
  }

  // Check for pending mismatches first
  const pendingMismatches = await getPendingMismatches(roundId);
  if (pendingMismatches.length > 0) {
    return {
      canSubmit: false,
      reason: 'unresolved_mismatches',
      mismatchCount: pendingMismatches.length,
    };
  }

  // Check partner progress
  const partnerProgress = await getPartnerProgress(roundId, userId, holeCount);

  if (!partnerProgress.complete) {
    return {
      canSubmit: false,
      reason: 'waiting_for_partner',
      partnerName: partnerProgress.partnerName,
      partnerProgress: partnerProgress.progress,
    };
  }

  return { canSubmit: true };
}

/**
 * Get partner's scoring progress
 *
 * Finds who is scoring the current user (their partner) and checks
 * how many entries they've completed.
 */
export async function getPartnerProgress(
  roundId: string,
  userId: string,
  holeCount: number = 18
): Promise<PartnerProgress> {
  if (!roundId || !userId) {
    throw createError('Round ID and User ID are required', 'VALIDATION');
  }

  // Find who is scoring the current user
  const { data: pairData, error: pairError } = await supabase
    .from('scoring_pairs')
    .select(
      `
      scorer_id,
      scorer:players!scoring_pairs_scorer_id_fkey (id, name)
    `
    )
    .eq('round_id', roundId)
    .eq('player_id', userId)
    .single() as { data: { scorer_id: string; scorer: { id: string; name: string } | null } | null; error: any };

  if (pairError) {
    if (pairError.code === 'PGRST116') {
      // No scorer assigned - treat as complete
      return {
        complete: true,
        partnerName: 'Partner',
        progress: { completed: holeCount * 2, total: holeCount * 2 },
      };
    }
    console.error('[ScoreMismatchService] Failed to fetch partner:', pairError);
    throw createError(`Failed to fetch partner: ${pairError.message}`, 'DATABASE');
  }

  const scorerId = pairData!.scorer_id;
  const scorerName = pairData!.scorer?.name ?? 'Partner';

  // Get partner's entries
  const entries = await getScorerEntries(roundId, scorerId);
  const expectedEntries = holeCount * 2; // Self + 1 partner

  return {
    complete: entries.length >= expectedEntries,
    partnerName: scorerName,
    progress: { completed: entries.length, total: expectedEntries },
  };
}

// ============================================================================
// BYPASS HANDLING
// ============================================================================

/**
 * Start bypass timer (called when submit attempted with complete data but partner hasn't submitted)
 *
 * @returns The bypass_available_at timestamp
 */
export async function startBypassTimer(
  roundId: string,
  playerId: string,
  partnerId: string
): Promise<{ bypass_available_at: string }> {
  if (!roundId || !playerId || !partnerId) {
    throw createError('Round ID, Player ID, and Partner ID are required', 'VALIDATION');
  }

  const bypassAvailableAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins from now

  const { error } = await (fromTable('score_submission_status').upsert(
    {
      round_id: roundId,
      player_id: playerId,
      partner_id: partnerId,
      bypass_available_at: bypassAvailableAt,
      bypassed: false,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'round_id,player_id',
    }
  )) as { error: any };

  if (error) {
    console.error('[ScoreMismatchService] Failed to start bypass timer:', error);
    throw createError(`Failed to start bypass timer: ${error.message}`, 'DATABASE');
  }

  return { bypass_available_at: bypassAvailableAt };
}

/**
 * Get submission status (bypass timer info)
 */
export async function getSubmissionStatus(
  roundId: string,
  playerId: string
): Promise<ScoreSubmissionStatus | null> {
  if (!roundId || !playerId) {
    throw createError('Round ID and Player ID are required', 'VALIDATION');
  }

  const { data, error } = await fromTable('score_submission_status')
    .select('*')
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[ScoreMismatchService] Failed to fetch submission status:', error);
    throw createError(`Failed to fetch submission status: ${error.message}`, 'DATABASE');
  }

  return data as ScoreSubmissionStatus;
}

/**
 * Mark submission as bypassed
 */
export async function markSubmissionBypassed(
  roundId: string,
  playerId: string
): Promise<void> {
  if (!roundId || !playerId) {
    throw createError('Round ID and Player ID are required', 'VALIDATION');
  }

  const { error } = await fromTable('score_submission_status')
    .update({
      bypassed: true,
      bypassed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('round_id', roundId)
    .eq('player_id', playerId);

  if (error) {
    console.error('[ScoreMismatchService] Failed to mark submission bypassed:', error);
    throw createError(`Failed to mark submission bypassed: ${error.message}`, 'DATABASE');
  }
}

/**
 * Apply bypass scores (use submitting player's scores as source of truth)
 *
 * When bypassing, the bypassing player's score_entries become the final scores
 * for BOTH players' scorecards.
 */
export async function applyBypassScores(
  roundId: string,
  bypassingPlayerId: string
): Promise<void> {
  if (!roundId || !bypassingPlayerId) {
    throw createError('Round ID and Bypassing Player ID are required', 'VALIDATION');
  }

  // Get all score_entries where scorer_id = bypassingPlayerId
  const entries = await getScorerEntries(roundId, bypassingPlayerId);

  // Apply each entry to the respective scorecard
  for (const entry of entries) {
    await applyResolvedScoreToScorecard(
      roundId,
      entry.player_id,
      entry.hole_number,
      entry.strokes
    );
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const scoreMismatchService = {
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
};

export default scoreMismatchService;
