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
 * For each (player_id, hole_number) with 2+ entries that disagree on strokes,
 * emits a single mismatch. Handles both:
 *  - 2-way (scoring pairs): self + partner. Legacy self/partner columns populated.
 *  - N-way (multi-scorer free-for-all): any number of distinct scorers.
 *    `entries[]` carries the full conflict list; legacy columns are populated
 *    with a representative pair (self if present, plus first other) for back-compat.
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

  for (const [, group] of grouped) {
    if (group.length < 2) continue;

    const distinctStrokes = new Set(group.map((e) => e.strokes));
    if (distinctStrokes.size < 2) continue; // all scorers agree

    const selfEntry = group.find((e) => e.scorer_id === e.player_id) ?? group[0];
    const otherEntry = group.find((e) => e !== selfEntry) ?? null;

    mismatches.push({
      round_id: roundId,
      player_id: selfEntry.player_id,
      hole_number: selfEntry.hole_number,
      // Legacy 2-way representation (preserved for the existing pairs UI)
      self_score: selfEntry.strokes,
      partner_score: otherEntry?.strokes ?? null,
      self_scorer_id: selfEntry.scorer_id,
      partner_scorer_id: otherEntry?.scorer_id ?? null,
      // Full N-way list (consumed by the multi-scorer resolution UI)
      entries: group.map((e) => ({ scorer_id: e.scorer_id, strokes: e.strokes })),
      status: 'pending',
      resolved_score: null,
      resolved_by: null,
      resolved_at: null,
    });
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
