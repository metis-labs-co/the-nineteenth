/**
 * Mismatch Detection
 *
 * Detects and persists score mismatches between self-entered and partner-entered scores.
 */

import { createModuleLogger } from '@/utils/debugLogger';
import { fromTable, createError } from './types';
import type { ScoreEntry, ScoreMismatch } from './types';
import { getRoundScoreEntries } from './entries';

const logger = createModuleLogger('ScoreMismatchService');

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
    .select()) as { data: ScoreMismatch[] | null; error: { message: string } | null };

  if (error) {
    logger.error('Failed to create mismatch records', error);
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
    logger.error('Failed to fetch pending mismatches', error);
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
    logger.error('Failed to fetch mismatch', error);
    throw createError(`Failed to fetch mismatch: ${error.message}`, 'DATABASE');
  }

  return data as ScoreMismatch;
}
