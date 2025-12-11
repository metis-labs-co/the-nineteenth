/**
 * Round Results Service
 *
 * Handles CRUD operations for round results in competitions.
 * Features:
 * - Save round results (player and team)
 * - Get round results with player/team data
 * - Get all competition results across rounds
 * - Finalize round by calculating scores and positions
 *
 * Supports multiple game types:
 * - Stableford: Sum of Stableford points (higher is better)
 * - Stroke: Sum of gross/net strokes (lower is better)
 * - Match Play: Win/loss/draw result
 */

import { supabase } from '@/services/supabase/client';
import {
  calculateCompetitionPoints,
  calculateMatchPlayPoints,
  type PointSystemRules,
  type RoundResult as CompetitionPointsRoundResult,
  type ScoredResult,
  type MatchResult,
  STANDARD_POINT_SYSTEM,
} from '@/utils/competitionPoints';
import type {
  RoundResult,
  RoundResultData,
  Round,
  Scorecard,
  GameType,
  Player,
  TeamWithMembers,
  PointSystemConfig,
} from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Input for saving a single round result
 */
export interface SaveRoundResultInput {
  roundId: string;
  playerId?: string;
  teamId?: string;
  rawScore: number | null;
  rawResultData: RoundResultData;
  position: number | null;
  competitionPoints: number;
  isTeamResult: boolean;
}

/**
 * Round result with player/team data populated
 */
export interface RoundResultWithParticipant extends RoundResult {
  player?: Player;
  team?: TeamWithMembers;
}

/**
 * Competition results grouped by round
 */
export interface CompetitionResults {
  rounds: {
    roundId: string;
    roundNumber: number;
    gameType: GameType;
    results: RoundResultWithParticipant[];
  }[];
}

/**
 * Service error with typed code
 */
export interface RoundResultsServiceError extends Error {
  code: 'NOT_FOUND' | 'VALIDATION' | 'DATABASE' | 'CALCULATION' | 'UNKNOWN';
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Creates a typed RoundResultsServiceError
 */
function createError(
  message: string,
  code: RoundResultsServiceError['code']
): RoundResultsServiceError {
  const error = new Error(message) as RoundResultsServiceError;
  error.code = code;
  return error;
}

/**
 * Convert PointSystemConfig to PointSystemRules
 */
function configToRules(config: PointSystemConfig): PointSystemRules {
  const positionPoints: number[] = [];

  // Extract position points from rules (keys 1, 2, 3, etc.)
  for (let i = 1; i <= 20; i++) {
    const points = config.rules[i.toString()];
    if (points !== undefined) {
      positionPoints.push(points);
    } else {
      break;
    }
  }

  return {
    positionPoints,
    defaultPoints: config.rules['default'] ?? 0,
    matchPlay: config.matchPlay,
  };
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Save round results to the database
 *
 * Inserts round_result records for players or teams. Handles both
 * individual and team results based on the isTeamResult flag.
 *
 * @param roundId - The round UUID
 * @param results - Array of result inputs to save
 * @returns Array of saved round results
 * @throws RoundResultsServiceError if save fails
 *
 * @example
 * ```typescript
 * const savedResults = await saveRoundResults('round-123', [
 *   {
 *     roundId: 'round-123',
 *     playerId: 'player-1',
 *     rawScore: 38,
 *     rawResultData: { stableford_points: 38 },
 *     position: 1,
 *     competitionPoints: 10,
 *     isTeamResult: false,
 *   },
 *   {
 *     roundId: 'round-123',
 *     playerId: 'player-2',
 *     rawScore: 36,
 *     rawResultData: { stableford_points: 36 },
 *     position: 2,
 *     competitionPoints: 8,
 *     isTeamResult: false,
 *   },
 * ]);
 * ```
 */
export async function saveRoundResults(
  roundId: string,
  results: SaveRoundResultInput[]
): Promise<RoundResult[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }
  if (!results || results.length === 0) {
    throw createError('At least one result is required', 'VALIDATION');
  }

  // Validate each result has either playerId or teamId
  for (const result of results) {
    if (!result.playerId && !result.teamId) {
      throw createError(
        'Each result must have either a playerId or teamId',
        'VALIDATION'
      );
    }
    if (result.playerId && result.teamId) {
      throw createError(
        'Each result must have only one of playerId or teamId, not both',
        'VALIDATION'
      );
    }
  }

  // Delete existing results for this round (for re-finalization)
  const { error: deleteError } = await supabase
    .from('round_results')
    .delete()
    .eq('round_id', roundId);

  if (deleteError) {
    console.error('[RoundResultsService] Failed to delete existing results:', deleteError);
    throw createError(
      `Failed to clear existing results: ${deleteError.message}`,
      'DATABASE'
    );
  }

  // Insert new results
  const insertData = results.map((result) => ({
    round_id: roundId,
    player_id: result.playerId ?? null,
    team_id: result.teamId ?? null,
    raw_score: result.rawScore,
    raw_result_data: result.rawResultData,
    position: result.position,
    competition_points: result.competitionPoints,
    is_team_result: result.isTeamResult,
  }));

  const { data: savedResults, error: insertError } = await supabase
    .from('round_results')
    .insert(insertData as unknown as never)
    .select();

  if (insertError) {
    console.error('[RoundResultsService] Failed to save results:', insertError);
    throw createError(
      `Failed to save round results: ${insertError.message}`,
      'DATABASE'
    );
  }

  return (savedResults as unknown as RoundResult[]) || [];
}

/**
 * Get round results with player and team data
 *
 * Fetches all results for a round, ordered by position, with full
 * player or team information populated.
 *
 * @param roundId - The round UUID
 * @returns Array of round results with participant data
 * @throws RoundResultsServiceError if fetch fails
 *
 * @example
 * ```typescript
 * const results = await getRoundResults('round-123');
 * results.forEach(result => {
 *   if (result.player) {
 *     console.log(`${result.player.name}: ${result.competition_points} points`);
 *   } else if (result.team) {
 *     console.log(`${result.team.name}: ${result.competition_points} points`);
 *   }
 * });
 * ```
 */
export async function getRoundResults(
  roundId: string
): Promise<RoundResultWithParticipant[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }

  const { data: results, error } = await supabase
    .from('round_results')
    .select(
      `
      *,
      player:players (*),
      team:teams (
        *,
        team_members (
          team_id,
          player_id,
          joined_at,
          player:players (*)
        )
      )
    `
    )
    .eq('round_id', roundId)
    .order('position', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[RoundResultsService] Failed to fetch round results:', error);
    throw createError(
      `Failed to fetch round results: ${error.message}`,
      'DATABASE'
    );
  }

  // Transform to proper types
  return ((results as any[]) || []).map((result) => ({
    id: result.id,
    round_id: result.round_id,
    player_id: result.player_id,
    team_id: result.team_id,
    raw_score: result.raw_score,
    raw_result_data: result.raw_result_data,
    position: result.position,
    competition_points: result.competition_points,
    is_team_result: result.is_team_result,
    created_at: result.created_at,
    updated_at: result.updated_at,
    player: result.player as Player | undefined,
    team: result.team
      ? {
          id: result.team.id,
          competition_id: result.team.competition_id,
          name: result.team.name,
          created_at: result.team.created_at,
          updated_at: result.team.updated_at,
          members: (result.team.team_members || []).map((member: any) => ({
            team_id: member.team_id,
            player_id: member.player_id,
            joined_at: member.joined_at,
            player: member.player as Player | undefined,
          })),
        }
      : undefined,
  }));
}

/**
 * Get all competition results across all rounds
 *
 * Fetches results for all rounds in a competition, including round
 * metadata (round_number, game_type). Results are grouped by round
 * and ordered by round number, then by position within each round.
 *
 * @param competitionId - The competition UUID
 * @returns Competition results grouped by round
 * @throws RoundResultsServiceError if fetch fails
 *
 * @example
 * ```typescript
 * const competitionResults = await getCompetitionResults('comp-123');
 * competitionResults.rounds.forEach(round => {
 *   console.log(`Round ${round.roundNumber} (${round.gameType}):`);
 *   round.results.forEach(result => {
 *     const name = result.player?.name || result.team?.name || 'Unknown';
 *     console.log(`  ${result.position}. ${name}: ${result.competition_points} pts`);
 *   });
 * });
 * ```
 */
export async function getCompetitionResults(
  competitionId: string
): Promise<CompetitionResults> {
  if (!competitionId) {
    throw createError('Competition ID is required', 'VALIDATION');
  }

  // First, get all rounds for the competition
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('id, round_number, game_type')
    .eq('competition_id', competitionId)
    .order('round_number', { ascending: true });

  if (roundsError) {
    console.error('[RoundResultsService] Failed to fetch rounds:', roundsError);
    throw createError(
      `Failed to fetch competition rounds: ${roundsError.message}`,
      'DATABASE'
    );
  }

  // Type assertion for rounds data
  const typedRounds = rounds as { id: string; round_number: number; game_type: GameType }[] | null;

  if (!typedRounds || typedRounds.length === 0) {
    return { rounds: [] };
  }

  // Fetch all results for these rounds
  const roundIds = typedRounds.map((r) => r.id);

  const { data: allResults, error: resultsError } = await supabase
    .from('round_results')
    .select(
      `
      *,
      player:players (*),
      team:teams (
        *,
        team_members (
          team_id,
          player_id,
          joined_at,
          player:players (*)
        )
      )
    `
    )
    .in('round_id', roundIds)
    .order('position', { ascending: true, nullsFirst: false });

  if (resultsError) {
    console.error('[RoundResultsService] Failed to fetch results:', resultsError);
    throw createError(
      `Failed to fetch competition results: ${resultsError.message}`,
      'DATABASE'
    );
  }

  // Group results by round
  const resultsByRound = new Map<string, RoundResultWithParticipant[]>();

  for (const result of (allResults as any[]) || []) {
    const roundId = result.round_id;
    if (!resultsByRound.has(roundId)) {
      resultsByRound.set(roundId, []);
    }

    resultsByRound.get(roundId)!.push({
      id: result.id,
      round_id: result.round_id,
      player_id: result.player_id,
      team_id: result.team_id,
      raw_score: result.raw_score,
      raw_result_data: result.raw_result_data,
      position: result.position,
      competition_points: result.competition_points,
      is_team_result: result.is_team_result,
      created_at: result.created_at,
      updated_at: result.updated_at,
      player: result.player as Player | undefined,
      team: result.team
        ? {
            id: result.team.id,
            competition_id: result.team.competition_id,
            name: result.team.name,
            created_at: result.team.created_at,
            updated_at: result.team.updated_at,
            members: (result.team.team_members || []).map((member: any) => ({
              team_id: member.team_id,
              player_id: member.player_id,
              joined_at: member.joined_at,
              player: member.player as Player | undefined,
            })),
          }
        : undefined,
    });
  }

  // Build response grouped by round
  return {
    rounds: typedRounds.map((round) => ({
      roundId: round.id,
      roundNumber: round.round_number,
      gameType: round.game_type,
      results: resultsByRound.get(round.id) || [],
    })),
  };
}

/**
 * Finalize a round by calculating scores and competition points
 *
 * Takes all scorecards for a round, calculates raw scores based on game type,
 * determines positions, assigns competition points, and saves the results.
 *
 * Supported game types:
 * - Stableford: Sum of Stableford points from scorecard (higher is better)
 * - Stroke: Uses net score from scorecard (lower is better)
 * - Match Play: Extracts win/loss/draw from scorecard match data
 *
 * @param roundId - The round UUID
 * @param scorecards - Array of completed scorecards for the round
 * @param gameType - The game type for score calculation
 * @param pointSystem - The point system configuration for competition points
 * @returns Array of finalized round results
 * @throws RoundResultsServiceError if finalization fails
 *
 * @example
 * ```typescript
 * // Finalize a Stableford round
 * const results = await finalizeRound(
 *   'round-123',
 *   scorecards,
 *   'stableford',
 *   { type: 'position', rules: { '1': 10, '2': 8, 'default': 1 } }
 * );
 *
 * // Results are now saved with positions and competition points
 * ```
 *
 * @example
 * ```typescript
 * // Finalize a Match Play round
 * const matchResults = await finalizeRound(
 *   'round-456',
 *   scorecards, // Must have raw_result_data with match_result
 *   'match-play',
 *   { type: 'position', rules: {}, matchPlay: { win: 3, draw: 1, loss: 0 } }
 * );
 * ```
 */
export async function finalizeRound(
  roundId: string,
  scorecards: Scorecard[],
  gameType: GameType,
  pointSystem: PointSystemConfig
): Promise<RoundResult[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }
  if (!scorecards || scorecards.length === 0) {
    throw createError('At least one scorecard is required', 'VALIDATION');
  }
  if (!gameType) {
    throw createError('Game type is required', 'VALIDATION');
  }
  if (!pointSystem) {
    throw createError('Point system is required', 'VALIDATION');
  }

  // Convert point system config to rules
  const pointSystemRules = configToRules(pointSystem);

  let resultsToSave: SaveRoundResultInput[];

  if (gameType === 'match-play') {
    // Handle Match Play separately - uses win/loss/draw
    resultsToSave = calculateMatchPlayResults(
      roundId,
      scorecards,
      pointSystemRules
    );
  } else {
    // Handle Stableford, Stroke, and team formats
    resultsToSave = calculateStandardResults(
      roundId,
      scorecards,
      gameType,
      pointSystemRules
    );
  }

  // Save and return results
  return saveRoundResults(roundId, resultsToSave);
}

/**
 * Calculate results for standard game types (Stableford, Stroke, team formats)
 */
function calculateStandardResults(
  roundId: string,
  scorecards: Scorecard[],
  gameType: GameType,
  pointSystemRules: PointSystemRules
): SaveRoundResultInput[] {
  // Calculate raw scores from scorecards
  const roundResults: CompetitionPointsRoundResult[] = scorecards.map((scorecard) => {
    let rawScore: number;
    let rawResultData: RoundResultData;

    switch (gameType) {
      case 'stableford':
        // Sum Stableford points (higher is better)
        rawScore = scorecard.total_points;
        rawResultData = { stableford_points: scorecard.total_points };
        break;

      case 'stroke':
        // Use net score (lower is better)
        rawScore = scorecard.total_net;
        rawResultData = {
          gross_score: scorecard.total_gross,
          net_score: scorecard.total_net,
        };
        break;

      case 'best-ball':
      case 'ambrose':
        // Team formats - use the scorecard's stored points/scores
        rawScore = scorecard.total_points || scorecard.total_net;
        rawResultData = {
          team_score: rawScore,
          gross_score: scorecard.total_gross,
          net_score: scorecard.total_net,
        };
        break;

      default:
        // Default to Stableford logic
        rawScore = scorecard.total_points;
        rawResultData = { stableford_points: scorecard.total_points };
    }

    return {
      participantId: scorecard.player_id,
      rawScore,
      // Store result data for later use
      _resultData: rawResultData,
    } as CompetitionPointsRoundResult & { _resultData: RoundResultData };
  });

  // Calculate competition points with position assignment
  const scoredResults = calculateCompetitionPoints(
    roundResults,
    gameType,
    pointSystemRules
  );

  // Convert to save input format
  return scoredResults.map((scored) => {
    const originalResult = roundResults.find(
      (r) => r.participantId === scored.participantId
    ) as CompetitionPointsRoundResult & { _resultData: RoundResultData };

    return {
      roundId,
      playerId: scored.participantId as string,
      teamId: undefined,
      rawScore: scored.rawScore,
      rawResultData: originalResult?._resultData || {},
      position: scored.position,
      competitionPoints: scored.competitionPoints,
      isTeamResult: false,
    };
  });
}

/**
 * Calculate results for Match Play
 */
function calculateMatchPlayResults(
  roundId: string,
  scorecards: Scorecard[],
  pointSystemRules: PointSystemRules
): SaveRoundResultInput[] {
  const results: SaveRoundResultInput[] = [];

  // Each scorecard should have match_result in raw_result_data
  // For match play, we don't assign positions, just win/loss/draw points
  for (const scorecard of scorecards) {
    // Extract match result from scorecard
    // The scorecard scores object may contain match play data
    // or we may need to look at a custom field
    const matchData = extractMatchPlayData(scorecard);

    if (!matchData) {
      console.warn(
        `[RoundResultsService] No match play data found for scorecard ${scorecard.id}`
      );
      continue;
    }

    // Calculate points based on match result
    const matchResult: MatchResult = {
      participantId: scorecard.player_id,
      opponentId: matchData.opponentId,
      result: matchData.result,
      margin: matchData.margin,
    };

    const competitionPoints = calculateMatchPlayPoints(matchResult, pointSystemRules);

    const rawResultData: RoundResultData = {
      opponent_id: matchData.opponentId,
      match_result: matchData.dbResult, // Use dbResult for database storage ('halved' not 'draw')
      final_margin: matchData.margin,
      holes_won: matchData.holesWon,
      holes_lost: matchData.holesLost,
      holes_halved: matchData.holesHalved,
    };

    results.push({
      roundId,
      playerId: scorecard.player_id,
      teamId: undefined,
      rawScore: null, // Match play doesn't use raw scores
      rawResultData,
      position: null, // Match play doesn't assign positions
      competitionPoints,
      isTeamResult: false,
    });
  }

  return results;
}

/**
 * Extract match play data from a scorecard
 */
function extractMatchPlayData(scorecard: Scorecard): {
  opponentId: string;
  result: 'win' | 'draw' | 'loss';
  dbResult: 'win' | 'loss' | 'halved';
  margin?: string;
  holesWon?: number;
  holesLost?: number;
  holesHalved?: number;
} | null {
  // Match play data might be stored in a custom field or computed from hole scores
  // This is a placeholder implementation - actual implementation depends on
  // how match play scores are stored in the scorecard

  // For now, assume we'll have a convention where match data is stored
  // We'll check for a special key in the scores object
  const scores = scorecard.scores;

  // Check if there's match play result data
  if (scores && typeof scores === 'object') {
    // Look for match play specific keys (convention: 'match' key)
    const matchKey = 'match';
    const matchScoreData = (scores as Record<string, any>)[matchKey];

    if (matchScoreData && typeof matchScoreData === 'object') {
      // Database uses 'halved', competitionPoints uses 'draw'
      const dbResult = (matchScoreData.result || 'halved') as 'win' | 'loss' | 'halved';
      const result: 'win' | 'draw' | 'loss' = dbResult === 'halved' ? 'draw' : dbResult;

      return {
        opponentId: matchScoreData.opponent_id || '',
        result,
        dbResult,
        margin: matchScoreData.margin,
        holesWon: matchScoreData.holes_won,
        holesLost: matchScoreData.holes_lost,
        holesHalved: matchScoreData.holes_halved,
      };
    }
  }

  // No match play data found
  return null;
}

// =====================================================
// TEAM RESULT FUNCTIONS
// =====================================================

/**
 * Finalize a team round by calculating team scores and competition points
 *
 * Similar to finalizeRound but for team results. Aggregates team scores
 * based on team format and assigns positions/points.
 *
 * @param roundId - The round UUID
 * @param teamScores - Array of team scores with team IDs
 * @param gameType - The game type for score calculation
 * @param pointSystem - The point system configuration
 * @returns Array of finalized team round results
 */
export async function finalizeTeamRound(
  roundId: string,
  teamScores: { teamId: string; rawScore: number; rawResultData: RoundResultData }[],
  gameType: GameType,
  pointSystem: PointSystemConfig
): Promise<RoundResult[]> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }
  if (!teamScores || teamScores.length === 0) {
    throw createError('At least one team score is required', 'VALIDATION');
  }

  // Convert point system config to rules
  const pointSystemRules = configToRules(pointSystem);

  // Create round results for competition points calculation
  const roundResults: CompetitionPointsRoundResult[] = teamScores.map((ts) => ({
    participantId: ts.teamId,
    rawScore: ts.rawScore,
    teamId: ts.teamId,
  }));

  // Calculate competition points
  const scoredResults = calculateCompetitionPoints(
    roundResults,
    gameType,
    pointSystemRules
  );

  // Map back to save input format
  const resultsToSave: SaveRoundResultInput[] = scoredResults.map((scored) => {
    const originalScore = teamScores.find((ts) => ts.teamId === scored.participantId);

    return {
      roundId,
      playerId: undefined,
      teamId: scored.participantId as string,
      rawScore: scored.rawScore,
      rawResultData: originalScore?.rawResultData || {},
      position: scored.position,
      competitionPoints: scored.competitionPoints,
      isTeamResult: true,
    };
  });

  // Save and return results
  return saveRoundResults(roundId, resultsToSave);
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Delete all results for a round
 *
 * Useful for re-finalizing a round or correcting errors.
 *
 * @param roundId - The round UUID
 */
export async function deleteRoundResults(roundId: string): Promise<void> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }

  const { error } = await supabase
    .from('round_results')
    .delete()
    .eq('round_id', roundId);

  if (error) {
    console.error('[RoundResultsService] Failed to delete results:', error);
    throw createError(
      `Failed to delete round results: ${error.message}`,
      'DATABASE'
    );
  }
}

/**
 * Check if a round has been finalized (has results)
 *
 * @param roundId - The round UUID
 * @returns True if the round has results
 */
export async function isRoundFinalized(roundId: string): Promise<boolean> {
  if (!roundId) {
    throw createError('Round ID is required', 'VALIDATION');
  }

  const { count, error } = await supabase
    .from('round_results')
    .select('*', { count: 'exact', head: true })
    .eq('round_id', roundId);

  if (error) {
    console.error('[RoundResultsService] Failed to check finalization:', error);
    throw createError(
      `Failed to check round finalization: ${error.message}`,
      'DATABASE'
    );
  }

  return (count || 0) > 0;
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Round results service with all CRUD operations
 */
export const roundResultsService = {
  saveRoundResults,
  getRoundResults,
  getCompetitionResults,
  finalizeRound,
  finalizeTeamRound,
  deleteRoundResults,
  isRoundFinalized,
};

export default roundResultsService;
