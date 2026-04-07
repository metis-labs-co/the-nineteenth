/**
 * Score Entry Operations
 *
 * CRUD operations for score entries: save, retrieve, and check completion.
 */

import type { HoleScore } from '@/types';
import { createModuleLogger } from '@/utils/debugLogger';
import { fromTable, createError } from './types';
import type { ScoreEntry } from './types';

const logger = createModuleLogger('ScoreMismatchService');

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
    .single()) as { data: ScoreEntry | null; error: { message: string } | null };

  if (error) {
    logger.error('Failed to save score entry', error);
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
    logger.error('Failed to fetch score entries', error);
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
    logger.error('Failed to fetch scorer entries', error);
    throw createError(`Failed to fetch scorer entries: ${error.message}`, 'DATABASE');
  }

  return (data as ScoreEntry[]) || [];
}

/**
 * Check if scorer has completed all entries
 *
 * Expected entries = holeCount x 2 (self + 1 partner)
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
