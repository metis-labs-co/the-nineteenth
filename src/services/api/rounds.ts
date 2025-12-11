/**
 * API Round Functions
 * Functions for round and round result operations
 */

import { supabase } from '@/services/supabase/client';
import type { Round, GameType, RoundStatus } from '@/types';
import type {
  Round as DBRound,
  Course as DBCourse,
  RoundResult as DBRoundResult,
} from '@/types/database.types';
import type { RoundCreateInput, RoundResultInput, RoundResult } from './types';
import { formatDateForDB, formatTimeForDB, isValidUUID } from './helpers';

/**
 * Create a round within a competition
 * Supports all game types and team formats
 */
export async function createRound(
  competitionId: string,
  input: RoundCreateInput,
  roundNumber?: number
): Promise<Round> {
  console.log('[API] Creating round:', input);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('You must be logged in to create a round');
  }

  // Ensure course exists
  let courseId = input.courseId;

  if (!courseId || !isValidUUID(courseId)) {
    // Create a new course entry for this round
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        name: input.courseName,
        source: 'manual',
      } as unknown as never)
      .select()
      .single();

    if (courseError) {
      console.error('[API] Error creating course:', courseError);
      throw new Error(`Failed to create course: ${courseError.message}`);
    }
    courseId = (course as DBCourse).id;
  }

  // Determine round number if not provided
  let finalRoundNumber = roundNumber;
  if (!finalRoundNumber) {
    const { data: existingRounds } = await supabase
      .from('rounds')
      .select('round_number')
      .eq('competition_id', competitionId)
      .order('round_number', { ascending: false })
      .limit(1);

    finalRoundNumber = existingRounds && existingRounds.length > 0
      ? (existingRounds[0] as { round_number: number }).round_number + 1
      : 1;
  }

  // Determine game type
  const gameType = input.gameType || (input.matchType as GameType) || 'stableford';

  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .insert({
      competition_id: competitionId,
      round_number: finalRoundNumber,
      course_id: courseId,
      date: formatDateForDB(input.date),
      tee_time: formatTimeForDB(input.teeTime || ''),
      game_type: gameType as GameType,
      is_team_round: input.isTeamRound ?? false,
      team_format: input.teamFormat ?? null,
      status: 'upcoming' as RoundStatus,
    } as unknown as never)
    .select()
    .single();

  if (roundError) {
    console.error('[API] Error creating round:', roundError);
    throw new Error(`Failed to create round: ${roundError.message}`);
  }

  const dbRound = round as DBRound;
  return {
    id: dbRound.id,
    competitionId: dbRound.competition_id ?? '',
    roundNumber: dbRound.round_number,
    courseId: dbRound.course_id,
    date: dbRound.date ? new Date(dbRound.date) : undefined,
    teeTime: dbRound.tee_time ?? undefined,
    gameType: dbRound.game_type,
    status: dbRound.status,
    createdAt: new Date(dbRound.created_at),
    updatedAt: new Date(dbRound.updated_at),
  };
}

/**
 * Save round results (individual or team)
 */
export async function saveRoundResults(results: RoundResultInput[]): Promise<RoundResult[]> {
  console.log('[API] Saving round results:', results.length);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('You must be logged in to save round results');
  }

  const savedResults: RoundResult[] = [];

  for (const result of results) {
    // Check if result already exists
    let query = supabase
      .from('round_results')
      .select('*')
      .eq('round_id', result.roundId);

    if (result.playerId) {
      query = query.eq('player_id', result.playerId);
    }
    if (result.teamId) {
      query = query.eq('team_id', result.teamId);
    }

    const { data: existing } = await query.single();

    if (existing) {
      // Update existing result
      const { data: updated, error: updateError } = await supabase
        .from('round_results')
        .update({
          raw_score: result.rawScore ?? null,
          raw_result_data: result.rawResultData ?? {},
          position: result.position ?? null,
          competition_points: result.competitionPoints ?? 0,
        } as unknown as never)
        .eq('id', (existing as DBRoundResult).id)
        .select()
        .single();

      if (updateError) {
        console.error('[API] Error updating round result:', updateError);
        throw new Error(`Failed to update round result: ${updateError.message}`);
      }

      const dbResult = updated as DBRoundResult;
      savedResults.push({
        id: dbResult.id,
        roundId: dbResult.round_id,
        playerId: dbResult.player_id ?? undefined,
        teamId: dbResult.team_id ?? undefined,
        rawScore: dbResult.raw_score ?? undefined,
        rawResultData: dbResult.raw_result_data,
        position: dbResult.position ?? undefined,
        competitionPoints: dbResult.competition_points,
        isTeamResult: dbResult.is_team_result,
        createdAt: new Date(dbResult.created_at),
        updatedAt: new Date(dbResult.updated_at),
      });
    } else {
      // Create new result
      const { data: created, error: createError } = await supabase
        .from('round_results')
        .insert({
          round_id: result.roundId,
          player_id: result.playerId ?? null,
          team_id: result.teamId ?? null,
          raw_score: result.rawScore ?? null,
          raw_result_data: result.rawResultData ?? {},
          position: result.position ?? null,
          competition_points: result.competitionPoints ?? 0,
          is_team_result: result.isTeamResult ?? !!result.teamId,
        } as unknown as never)
        .select()
        .single();

      if (createError) {
        console.error('[API] Error creating round result:', createError);
        throw new Error(`Failed to create round result: ${createError.message}`);
      }

      const dbResult = created as DBRoundResult;
      savedResults.push({
        id: dbResult.id,
        roundId: dbResult.round_id,
        playerId: dbResult.player_id ?? undefined,
        teamId: dbResult.team_id ?? undefined,
        rawScore: dbResult.raw_score ?? undefined,
        rawResultData: dbResult.raw_result_data,
        position: dbResult.position ?? undefined,
        competitionPoints: dbResult.competition_points,
        isTeamResult: dbResult.is_team_result,
        createdAt: new Date(dbResult.created_at),
        updatedAt: new Date(dbResult.updated_at),
      });
    }
  }

  return savedResults;
}

/**
 * Get round results for a round
 */
export async function getRoundResults(roundId: string): Promise<RoundResult[]> {
  console.log('[API] Fetching round results:', roundId);

  const { data: results, error } = await supabase
    .from('round_results')
    .select('*')
    .eq('round_id', roundId)
    .order('position', { nullsFirst: false });

  if (error) {
    console.error('[API] Error fetching round results:', error);
    throw new Error(`Failed to fetch round results: ${error.message}`);
  }

  return (results || []).map((r: DBRoundResult) => ({
    id: r.id,
    roundId: r.round_id,
    playerId: r.player_id ?? undefined,
    teamId: r.team_id ?? undefined,
    rawScore: r.raw_score ?? undefined,
    rawResultData: r.raw_result_data,
    position: r.position ?? undefined,
    competitionPoints: r.competition_points,
    isTeamResult: r.is_team_result,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }));
}

/**
 * Get all round results for a competition
 */
export async function getCompetitionResults(competitionId: string): Promise<RoundResult[]> {
  console.log('[API] Fetching competition results:', competitionId);

  // First get all round IDs for the competition
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('id')
    .eq('competition_id', competitionId);

  if (roundsError) {
    console.error('[API] Error fetching competition rounds:', roundsError);
    throw new Error(`Failed to fetch competition rounds: ${roundsError.message}`);
  }

  if (!rounds || rounds.length === 0) {
    return [];
  }

  const roundIds = rounds.map((r: { id: string }) => r.id);

  const { data: results, error } = await supabase
    .from('round_results')
    .select('*')
    .in('round_id', roundIds)
    .order('round_id')
    .order('position', { nullsFirst: false });

  if (error) {
    console.error('[API] Error fetching competition results:', error);
    throw new Error(`Failed to fetch competition results: ${error.message}`);
  }

  return (results || []).map((r: DBRoundResult) => ({
    id: r.id,
    roundId: r.round_id,
    playerId: r.player_id ?? undefined,
    teamId: r.team_id ?? undefined,
    rawScore: r.raw_score ?? undefined,
    rawResultData: r.raw_result_data,
    position: r.position ?? undefined,
    competitionPoints: r.competition_points,
    isTeamResult: r.is_team_result,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }));
}
