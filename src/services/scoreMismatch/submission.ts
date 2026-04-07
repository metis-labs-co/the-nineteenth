/**
 * Submission Readiness & Bypass Handling
 *
 * Checks whether a player can submit their scorecard and manages
 * the 30-minute bypass timer for unresponsive partners.
 */

import { supabase } from '@/services/supabase/client';
import { createModuleLogger } from '@/utils/debugLogger';
import { fromTable, createError } from './types';
import type { ScoreSubmissionStatus, SubmissionReadiness, PartnerProgress } from './types';
import { getScorerEntries } from './entries';
import { getPendingMismatches } from './detection';
import { applyResolvedScoreToScorecard } from './resolution';

const logger = createModuleLogger('ScoreMismatchService');

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
    .single() as { data: { scorer_id: string; scorer: { id: string; name: string } | null } | null; error: { message: string; code?: string } | null };

  if (pairError) {
    if (pairError.code === 'PGRST116') {
      // No scorer assigned - treat as complete
      return {
        complete: true,
        partnerName: 'Partner',
        progress: { completed: holeCount * 2, total: holeCount * 2 },
      };
    }
    logger.error('Failed to fetch partner', pairError);
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
  )) as { error: { message: string } | null };

  if (error) {
    logger.error('Failed to start bypass timer', error);
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
    logger.error('Failed to fetch submission status', error);
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
    logger.error('Failed to mark submission bypassed', error);
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
