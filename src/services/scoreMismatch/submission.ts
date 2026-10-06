/**
 * Submission Readiness & Bypass Handling
 *
 * Checks whether a player can submit their scorecard and manages
 * the 30-minute bypass timer for unresponsive partners.
 */

import { supabase } from '@/services/supabase/client';
import { createModuleLogger } from '@/utils/debugLogger';
import { fromTable } from './types';
import { createError } from '@/services/errors';
import type {
  ScoreSubmissionStatus,
  SubmissionReadiness,
  PartnerProgress,
  IncompleteScorer,
  ScoreMismatch,
} from './types';
import { getRoundScoreEntries, getScorerEntries } from './entries';
import { createMismatchRecords, getPendingMismatches } from './detection';
import { applyResolvedScoreToScorecard } from './resolution';

const logger = createModuleLogger('ScoreMismatchService');

// ============================================================================
// SUBMISSION READINESS
// ============================================================================

/**
 * Check if user can submit. Dispatches based on scoring mode:
 *  - Scoring pairs enabled → checkPairsReadiness (self vs assigned partner)
 *  - Otherwise → checkMultiScorerReadiness (auto-detected: only kicks in
 *    when 2+ distinct scorers have written entries for the round)
 */
export async function checkSubmissionReadiness(
  roundId: string,
  userId: string,
  scoringPairsEnabled: boolean,
  holeCount: number = 18,
  groupPlayerIds?: string[]
): Promise<SubmissionReadiness> {
  if (!roundId || !userId) {
    throw createError('Round ID and User ID are required', 'VALIDATION');
  }

  return scoringPairsEnabled
    ? checkPairsReadiness(roundId, userId, holeCount, groupPlayerIds)
    : checkMultiScorerReadiness(roundId, userId, holeCount, groupPlayerIds);
}

/**
 * Restrict mismatches to the players the submitting device is responsible for
 * (its on-course group). When no group is supplied, returns them unchanged
 * (legacy round-wide behaviour).
 */
function filterMismatchesToPlayers(
  mismatches: ScoreMismatch[],
  groupPlayerIds?: string[]
): ScoreMismatch[] {
  if (!groupPlayerIds || groupPlayerIds.length === 0) return mismatches;
  const groupSet = new Set(groupPlayerIds);
  return mismatches.filter((m) => groupSet.has(m.player_id));
}

async function checkPairsReadiness(
  roundId: string,
  userId: string,
  holeCount: number,
  groupPlayerIds?: string[]
): Promise<SubmissionReadiness> {
  // Check for pending mismatches first — scoped to this pair's players so a
  // different pair's unresolved mismatch can't block us.
  const pendingMismatches = filterMismatchesToPlayers(
    await getPendingMismatches(roundId),
    groupPlayerIds
  );
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
 * Multi-scorer readiness — for rounds without scoring pairs configured.
 *
 * Auto-detects whether the verification gate applies: only kicks in if 2+
 * distinct users have written score_entries for THIS group's players. Solo-scorer
 * rounds (e.g. one keeper for a scramble) submit normally with no extra friction.
 *
 * When triggered:
 *  1. Detect/persist mismatches across all scorers (N-way).
 *  2. Block on any pending mismatches for THIS group's players.
 *  3. Block until every other scorer has filled in every hole for every
 *     player they've already scored at least one hole for.
 */
async function checkMultiScorerReadiness(
  roundId: string,
  userId: string,
  holeCount: number,
  groupPlayerIds?: string[]
): Promise<SubmissionReadiness> {
  const allEntries = await getRoundScoreEntries(roundId);

  // Scope to the players this device is submitting (its group). With no group
  // supplied, fall back to round-wide (legacy behaviour).
  const groupSet =
    groupPlayerIds && groupPlayerIds.length > 0 ? new Set(groupPlayerIds) : null;
  const entries = groupSet
    ? allEntries.filter((e) => groupSet.has(e.player_id))
    : allEntries;

  const distinctScorers = new Set(entries.map((e) => e.scorer_id));

  // Only one scorer (or none) has touched THIS group's players → no gate.
  // A different group's scorers never appear here, so they can't block us.
  if (distinctScorers.size <= 1) {
    return { canSubmit: true };
  }

  // Detection stays round-wide (it only ever finds same-player conflicts), but
  // the BLOCK is scoped to this group's players.
  await createMismatchRecords(roundId);
  const pendingMismatches = filterMismatchesToPlayers(
    await getPendingMismatches(roundId),
    groupPlayerIds
  );
  if (pendingMismatches.length > 0) {
    return {
      canSubmit: false,
      reason: 'unresolved_mismatches',
      mismatchCount: pendingMismatches.length,
    };
  }

  // For each other scorer who touched this group, expected entries =
  // holeCount × distinct group-players they've started scoring.
  const otherScorerIds = [...distinctScorers].filter((id) => id !== userId);
  const incompleteScorers: IncompleteScorer[] = [];

  for (const scorerId of otherScorerIds) {
    const scorerEntries = entries.filter((e) => e.scorer_id === scorerId);
    const distinctPlayers = new Set(scorerEntries.map((e) => e.player_id));
    const expected = distinctPlayers.size * holeCount;

    if (scorerEntries.length < expected) {
      incompleteScorers.push({
        scorerId,
        scorerName: await fetchPlayerName(scorerId),
        progress: { completed: scorerEntries.length, total: expected },
      });
    }
  }

  if (incompleteScorers.length > 0) {
    return {
      canSubmit: false,
      reason: 'waiting_for_other_scorers',
      incompleteScorers,
    };
  }

  return { canSubmit: true };
}

async function fetchPlayerName(playerId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('name')
      .eq('id', playerId)
      .single() as { data: { name: string } | null; error: { message: string } | null };

    if (error || !data) return 'Another scorer';
    return data.name ?? 'Another scorer';
  } catch {
    return 'Another scorer';
  }
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
 * Start bypass timer (called when submit attempted with complete data but
 * other scorers haven't finished). 30-minute window before unverified
 * submission becomes available.
 *
 * @param partnerId - The scoring partner (pairs flow) or null for multi-scorer
 *                    rounds where the wait spans multiple distinct scorers.
 * @returns The bypass_available_at timestamp
 */
export async function startBypassTimer(
  roundId: string,
  playerId: string,
  partnerId: string | null
): Promise<{ bypass_available_at: string }> {
  if (!roundId || !playerId) {
    throw createError('Round ID and Player ID are required', 'VALIDATION');
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
