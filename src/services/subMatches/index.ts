/**
 * Sub-Match Service
 *
 * CRUD for the `sub_matches` table — the unit of scoring for a
 * Ryder-Cup-style split team round. Each sub-match is an independent
 * head-to-head that aggregates into a team point total at the round
 * level (1 per win, 0.5 halved, 0 loss).
 *
 * `combined` rounds do not use this table; their legacy best-ball
 * team match is computed directly from scorecards.
 */

import { supabase } from '@/services/supabase/client';
import { createModuleLogger } from '@/utils/debugLogger';
import type { SubMatch, SubMatchResult, SubMatchStatus } from '@/types';

const logger = createModuleLogger('SubMatchService');

export class SubMatchServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'VALIDATION' | 'DATABASE' | 'NOT_FOUND'
  ) {
    super(message);
    this.name = 'SubMatchServiceError';
  }
}

export interface SubMatchInput {
  sortOrder: number;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  teeTime: string | null;
  pairingId?: string | null;
}

export interface ReplaceSubMatchesInput {
  roundId: string;
  subMatches: SubMatchInput[];
}

export interface UpdateSubMatchResultInput {
  subMatchId: string;
  status: SubMatchStatus;
  result?: SubMatchResult | null;
  finalDifferential?: number | null;
  teamANetTotal?: number | null;
  teamBNetTotal?: number | null;
}

type Row = {
  id: string;
  round_id: string;
  sort_order: number;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  tee_time: string | null;
  pairing_id: string | null;
  status: SubMatchStatus;
  result: SubMatchResult | null;
  final_differential: number | null;
  team_a_net_total: number | null;
  team_b_net_total: number | null;
  created_at: string;
  updated_at: string;
};

const rowToSubMatch = (r: Row): SubMatch => ({
  id: r.id,
  round_id: r.round_id,
  sort_order: r.sort_order,
  team_a_player_ids: r.team_a_player_ids,
  team_b_player_ids: r.team_b_player_ids,
  tee_time: r.tee_time,
  pairing_id: r.pairing_id,
  status: r.status,
  result: r.result,
  final_differential: r.final_differential,
  team_a_net_total: r.team_a_net_total,
  team_b_net_total: r.team_b_net_total,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

/**
 * Fetch all sub-matches for a round, ordered by sort_order.
 */
export async function listSubMatchesForRound(roundId: string): Promise<SubMatch[]> {
  if (!roundId) {
    throw new SubMatchServiceError('Round ID is required', 'VALIDATION');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase.ts not regenerated for sub_matches yet
  const { data, error } = await (supabase.from('sub_matches') as any)
    .select('*')
    .eq('round_id', roundId)
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error('Failed to fetch sub-matches', error);
    throw new SubMatchServiceError(`Failed to fetch sub-matches: ${error.message}`, 'DATABASE');
  }

  return ((data as Row[]) || []).map(rowToSubMatch);
}

/**
 * Replace all sub-matches for a round in a single atomic operation.
 *
 * Deletes existing sub-matches then inserts the new set. Intended for
 * the "regenerate" flow from the round format sheet.
 */
export async function replaceSubMatches(input: ReplaceSubMatchesInput): Promise<SubMatch[]> {
  const { roundId, subMatches } = input;
  if (!roundId) {
    throw new SubMatchServiceError('Round ID is required', 'VALIDATION');
  }
  if (!subMatches || subMatches.length === 0) {
    throw new SubMatchServiceError('At least one sub-match is required', 'VALIDATION');
  }
  // Validate sub-team sizes. Kept in sync with the DB check constraint on
  // sub_matches.team_a/b_player_ids (1..10).
  subMatches.forEach((sm, i) => {
    if (sm.teamAPlayerIds.length < 1 || sm.teamAPlayerIds.length > 10) {
      throw new SubMatchServiceError(
        `Sub-match ${i + 1} team A must have 1–10 players`,
        'VALIDATION'
      );
    }
    if (sm.teamBPlayerIds.length < 1 || sm.teamBPlayerIds.length > 10) {
      throw new SubMatchServiceError(
        `Sub-match ${i + 1} team B must have 1–10 players`,
        'VALIDATION'
      );
    }
  });

  // Delete existing first — the table has ON DELETE CASCADE to pairings
  // only via nullable FK, so this is a simple delete.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delError } = await (supabase.from('sub_matches') as any)
    .delete()
    .eq('round_id', roundId);

  if (delError) {
    logger.error('Failed to clear existing sub-matches', delError);
    throw new SubMatchServiceError(
      `Failed to clear sub-matches: ${delError.message}`,
      'DATABASE'
    );
  }

  const insertRows = subMatches.map((sm) => ({
    round_id: roundId,
    sort_order: sm.sortOrder,
    team_a_player_ids: sm.teamAPlayerIds,
    team_b_player_ids: sm.teamBPlayerIds,
    tee_time: sm.teeTime,
    pairing_id: sm.pairingId ?? null,
    status: 'upcoming' as const,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('sub_matches') as any)
    .insert(insertRows)
    .select();

  if (error) {
    logger.error('Failed to insert sub-matches', error);
    throw new SubMatchServiceError(`Failed to insert sub-matches: ${error.message}`, 'DATABASE');
  }

  return ((data as Row[]) || []).map(rowToSubMatch);
}

/**
 * Update the result of a completed sub-match.
 */
export async function updateSubMatchResult(
  input: UpdateSubMatchResultInput
): Promise<SubMatch> {
  const {
    subMatchId,
    status,
    result,
    finalDifferential,
    teamANetTotal,
    teamBNetTotal,
  } = input;

  if (!subMatchId) {
    throw new SubMatchServiceError('Sub-match ID is required', 'VALIDATION');
  }

  const patch: Record<string, unknown> = { status };
  if (result !== undefined) patch.result = result;
  if (finalDifferential !== undefined) patch.final_differential = finalDifferential;
  if (teamANetTotal !== undefined) patch.team_a_net_total = teamANetTotal;
  if (teamBNetTotal !== undefined) patch.team_b_net_total = teamBNetTotal;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('sub_matches') as any)
    .update(patch)
    .eq('id', subMatchId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new SubMatchServiceError(`Sub-match not found: ${subMatchId}`, 'NOT_FOUND');
    }
    logger.error('Failed to update sub-match result', error);
    throw new SubMatchServiceError(`Failed to update sub-match: ${error.message}`, 'DATABASE');
  }

  return rowToSubMatch(data as Row);
}

export interface UpdateSubMatchTeeTimeInput {
  subMatchId: string;
  /** HH:MM or HH:MM:SS. Pass `null` to clear. */
  teeTime: string | null;
}

/**
 * Update the tee time of a single sub-match.
 *
 * Used by the inline tee-time editor on SubMatchesTab so organizers can
 * override the auto-generated staggered tee times when the pro shop hands
 * them a different tee sheet.
 */
export async function updateSubMatchTeeTime(
  input: UpdateSubMatchTeeTimeInput
): Promise<SubMatch> {
  const { subMatchId, teeTime } = input;
  if (!subMatchId) {
    throw new SubMatchServiceError('Sub-match ID is required', 'VALIDATION');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase.ts not regenerated for sub_matches yet
  const { data, error } = await (supabase.from('sub_matches') as any)
    .update({ tee_time: teeTime })
    .eq('id', subMatchId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new SubMatchServiceError(`Sub-match not found: ${subMatchId}`, 'NOT_FOUND');
    }
    logger.error('Failed to update sub-match tee time', error);
    throw new SubMatchServiceError(
      `Failed to update sub-match tee time: ${error.message}`,
      'DATABASE'
    );
  }

  return rowToSubMatch(data as Row);
}

/**
 * Delete all sub-matches for a round. Called when switching a round
 * from 'split' back to 'combined'.
 */
export async function deleteAllSubMatchesForRound(roundId: string): Promise<void> {
  if (!roundId) {
    throw new SubMatchServiceError('Round ID is required', 'VALIDATION');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('sub_matches') as any)
    .delete()
    .eq('round_id', roundId);

  if (error) {
    logger.error('Failed to delete sub-matches', error);
    throw new SubMatchServiceError(
      `Failed to delete sub-matches: ${error.message}`,
      'DATABASE'
    );
  }
}
