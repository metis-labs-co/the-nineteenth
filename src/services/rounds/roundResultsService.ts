/**
 * Round Results Service
 *
 * Handles CRUD operations for round results in competitions.
 * This is a thin wrapper around Supabase for data persistence.
 *
 * For scoring calculations, use the scoring engines in @/services/scoring
 */

import { supabase } from '@/services/supabase/client';
import {
  calculateCompetitionPoints,
  calculateMatchPlayPoints,
  type PointSystemRules,
  type RoundResult as CompetitionPointsRoundResult,
  type MatchResult,
} from '@/utils/competitionPoints';
import type {
  RoundResult,
  RoundResultData,
  Scorecard,
  GameType,
  Player,
  TeamWithMembers,
  PointSystemConfig,
  RoundRulesOverride,
} from '@/types/database.types';
import type { IndividualPointsRule } from '@/types/database/roundRules.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Raw team member from Supabase join query
 */
interface TeamMemberQueryRow {
  team_id: string;
  player_id: string;
  joined_at: string;
  player: Player | null;
}

/**
 * Raw team from Supabase query with nested team_members
 */
interface TeamQueryRow {
  id: string;
  competition_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
  team_members: TeamMemberQueryRow[];
}

/**
 * Raw round result from Supabase query with player and team data
 */
interface RoundResultQueryRow {
  id: string;
  round_id: string;
  player_id: string | null;
  team_id: string | null;
  raw_score: number | null;
  raw_result_data: RoundResultData;
  position: number | null;
  competition_points: number;
  is_team_result: boolean;
  created_at: string;
  updated_at: string;
  player: Player | null;
  team: TeamQueryRow | null;
}

/**
 * Match play score data structure
 */
interface MatchPlayScoreData {
  result?: 'win' | 'loss' | 'halved';
  opponent_id?: string;
  margin?: string;
  holes_won?: number;
  holes_lost?: number;
  holes_halved?: number;
}

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

function createError(
  message: string,
  code: RoundResultsServiceError['code']
): RoundResultsServiceError {
  const error = new Error(message) as RoundResultsServiceError;
  error.code = code;
  return error;
}

function configToRules(config: PointSystemConfig): PointSystemRules {
  return rulesFromPositionMap(config.rules, config.matchPlay);
}

/**
 * Build PointSystemRules from a raw position-to-points map.
 * Shared between competition.point_system.rules and rules_override.individual_points.
 */
function rulesFromPositionMap(
  map: Record<string, number>,
  matchPlay: PointSystemConfig['matchPlay'] | undefined
): PointSystemRules {
  const positionPoints: number[] = [];
  for (let i = 1; i <= 20; i++) {
    const points = map[i.toString()];
    if (points !== undefined) {
      positionPoints.push(points);
    } else {
      break;
    }
  }
  return {
    positionPoints,
    defaultPoints: map['default'] ?? 0,
    matchPlay,
  };
}

/**
 * Normalize the persisted `rules_override.individual_points` shape into a
 * clean discriminated union the engine can dispatch on. Tolerates both:
 *
 * - Discriminated union: `{ mode: 'positional' | 'raw_score' | 'win_tie_loss', … }`
 * - Legacy bare position-map: `{ '1': 10, '2': 8, default: 0 }`
 *
 * Returns `undefined` when the override doesn't supply any individual rule —
 * callers should treat that as "use the competition point_system positionally".
 */
function normalizeIndividualPointsRule(
  raw: RoundRulesOverride['individual_points']
): IndividualPointsRule | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object') return undefined;

  // Discriminated union has a string `mode` field.
  if ('mode' in raw && typeof (raw as { mode?: unknown }).mode === 'string') {
    return raw as IndividualPointsRule;
  }

  // Legacy bare map → positional with the map as `rules`.
  return { mode: 'positional', rules: raw as Record<string, number> };
}

/**
 * Effective rules resolved from competition + round override.
 *
 * `pointSystem` is the positional fallback used when no rule is set or when the
 * rule's mode is `positional` without its own `rules` map.
 *
 * `individualRule` (when present) tells the calculator how to translate
 * positions → competition_points (positional / raw_score / win_tie_loss).
 *
 * Match-play points always come from competition.point_system.matchPlay —
 * per-round match-play overrides are not supported.
 */
interface EffectiveRules {
  pointSystem: PointSystemRules;
  individualRule: IndividualPointsRule | undefined;
}

function resolveEffectiveRules(
  competitionConfig: PointSystemConfig,
  override: RoundRulesOverride | null | undefined
): EffectiveRules {
  const individualRule = normalizeIndividualPointsRule(override?.individual_points);

  // Positional fallback: prefer the rule's own map (for back-compat with the
  // legacy bare-map shape), else the competition default.
  let pointSystem: PointSystemRules;
  if (individualRule?.mode === 'positional' && individualRule.rules) {
    pointSystem = rulesFromPositionMap(individualRule.rules, competitionConfig.matchPlay);
  } else {
    pointSystem = configToRules(competitionConfig);
  }

  return { pointSystem, individualRule };
}

function transformResult(result: RoundResultQueryRow): RoundResultWithParticipant {
  return {
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
    player: result.player ?? undefined,
    team: result.team
      ? {
          id: result.team.id,
          competition_id: result.team.competition_id,
          name: result.team.name,
          color: result.team.color ?? null,
          created_at: result.team.created_at,
          updated_at: result.team.updated_at,
          members: (result.team.team_members || []).map((m) => ({
            team_id: m.team_id,
            player_id: m.player_id,
            joined_at: m.joined_at,
            player: m.player ?? undefined,
          })),
        }
      : undefined,
  };
}

// =====================================================
// DATA ACCESS FUNCTIONS
// =====================================================

/**
 * Save round results to the database.
 *
 * Only deletes existing rows whose `is_team_result` flag matches the incoming
 * batch. This lets individual finalization (isTeamResult=false) and team
 * finalization (isTeamResult=true) coexist on the same round without
 * overwriting each other. All callers pass a homogenous batch today, so
 * there's no call site that relies on "delete everything".
 */
export async function saveRoundResults(
  roundId: string,
  results: SaveRoundResultInput[]
): Promise<RoundResult[]> {
  if (!roundId) throw createError('Round ID is required', 'VALIDATION');
  if (!results?.length) throw createError('At least one result is required', 'VALIDATION');

  // Validate each result
  for (const result of results) {
    if (!result.playerId && !result.teamId) {
      throw createError('Each result must have either playerId or teamId', 'VALIDATION');
    }
    if (result.playerId && result.teamId) {
      throw createError('Each result must have only one of playerId or teamId', 'VALIDATION');
    }
  }

  // Enforce homogenous batch so the targeted delete below is unambiguous.
  const batchIsTeam = results[0].isTeamResult;
  if (results.some((r) => r.isTeamResult !== batchIsTeam)) {
    throw createError(
      'saveRoundResults expects a homogenous batch (all individual OR all team rows)',
      'VALIDATION'
    );
  }

  // Delete only the rows of the same type as the incoming batch. This keeps
  // team rows intact when re-finalizing individuals, and vice versa.
  const { error: deleteError } = await supabase
    .from('round_results')
    .delete()
    .match({ round_id: roundId, is_team_result: batchIsTeam });

  if (deleteError) {
    throw createError(`Failed to clear existing results: ${deleteError.message}`, 'DATABASE');
  }

  // Insert new results
  const insertData = results.map((r) => ({
    round_id: roundId,
    player_id: r.playerId ?? null,
    team_id: r.teamId ?? null,
    raw_score: r.rawScore,
    raw_result_data: r.rawResultData,
    position: r.position,
    competition_points: r.competitionPoints,
    is_team_result: r.isTeamResult,
  }));

  const { data, error } = await supabase
    .from('round_results')
    .insert(insertData as unknown as never)
    .select();

  if (error) {
    throw createError(`Failed to save round results: ${error.message}`, 'DATABASE');
  }

  return (data as unknown as RoundResult[]) || [];
}

/**
 * Delete only individual rows (`is_team_result = false`) for a round.
 *
 * Needed when finalizing a team-only round (Scramble / Best Ball / Shamble)
 * after a prior, broken finalization may have written stale individual rows
 * via the now-removed individual code path. saveRoundResults uses targeted
 * delete-by-`is_team_result`, so it would not clear those stale rows on its
 * own when the new batch is team rows.
 */
export async function deleteIndividualRoundResults(roundId: string): Promise<void> {
  if (!roundId) throw createError('Round ID is required', 'VALIDATION');

  const { error } = await supabase
    .from('round_results')
    .delete()
    .match({ round_id: roundId, is_team_result: false });

  if (error) {
    throw createError(
      `Failed to clear individual round results: ${error.message}`,
      'DATABASE'
    );
  }
}

/**
 * Get round results with player and team data
 */
export async function getRoundResults(roundId: string): Promise<RoundResultWithParticipant[]> {
  if (!roundId) throw createError('Round ID is required', 'VALIDATION');

  const { data, error } = await supabase
    .from('round_results')
    .select(`
      *,
      player:players (*),
      team:teams (*, team_members (team_id, player_id, joined_at, player:players (*)))
    `)
    .eq('round_id', roundId)
    .order('position', { ascending: true, nullsFirst: false });

  if (error) {
    throw createError(`Failed to fetch round results: ${error.message}`, 'DATABASE');
  }

  return ((data as RoundResultQueryRow[]) || []).map(transformResult);
}

/**
 * Get all competition results across all rounds
 */
export async function getCompetitionResults(competitionId: string): Promise<CompetitionResults> {
  if (!competitionId) throw createError('Competition ID is required', 'VALIDATION');

  // Get rounds
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('id, round_number, game_type')
    .eq('competition_id', competitionId)
    .order('round_number', { ascending: true });

  if (roundsError) {
    throw createError(`Failed to fetch rounds: ${roundsError.message}`, 'DATABASE');
  }

  const typedRounds = rounds as { id: string; round_number: number; game_type: GameType }[] | null;
  if (!typedRounds?.length) return { rounds: [] };

  // Get results for all rounds
  const { data: allResults, error: resultsError } = await supabase
    .from('round_results')
    .select(`
      *,
      player:players (*),
      team:teams (*, team_members (team_id, player_id, joined_at, player:players (*)))
    `)
    .in('round_id', typedRounds.map((r) => r.id))
    .order('position', { ascending: true, nullsFirst: false });

  if (resultsError) {
    throw createError(`Failed to fetch results: ${resultsError.message}`, 'DATABASE');
  }

  // Group by round
  const resultsByRound = new Map<string, RoundResultWithParticipant[]>();
  for (const result of (allResults as RoundResultQueryRow[]) || []) {
    if (!resultsByRound.has(result.round_id)) {
      resultsByRound.set(result.round_id, []);
    }
    resultsByRound.get(result.round_id)!.push(transformResult(result));
  }

  return {
    rounds: typedRounds.map((round) => ({
      roundId: round.id,
      roundNumber: round.round_number,
      gameType: round.game_type,
      results: resultsByRound.get(round.id) || [],
    })),
  };
}

// =====================================================
// FINALIZATION FUNCTIONS
// =====================================================

/**
 * Finalize a round by calculating scores and competition points
 *
 * @param rulesOverride Optional per-round rules override from `rounds.rules_override`.
 *   When present, `individual_points` takes precedence over competition.point_system.rules.
 *   When `contributes_to_individual_leaderboard === false`, all saved results receive
 *   `competition_points = 0` (round still finalizes so position/raw data is preserved
 *   for display, but it won't affect the individual competition leaderboard).
 *   The override is honored regardless of the user's current tier — saved overrides
 *   always apply (graceful degradation if the user downgrades).
 * @param perRoundRulesEnabled Explicit mode flag from `competitions.per_round_rules_enabled`.
 *   When explicitly `false`, the override is ignored entirely and the competition's
 *   `point_system` is used verbatim. When undefined (legacy callers) or `true`, the
 *   override is honored.
 */
export async function finalizeRound(
  roundId: string,
  scorecards: Scorecard[],
  gameType: GameType,
  pointSystem: PointSystemConfig,
  rulesOverride?: RoundRulesOverride | null,
  perRoundRulesEnabled?: boolean
): Promise<RoundResult[]> {
  if (!roundId) throw createError('Round ID is required', 'VALIDATION');
  if (!scorecards?.length) throw createError('At least one scorecard is required', 'VALIDATION');
  if (!gameType) throw createError('Game type is required', 'VALIDATION');
  if (!pointSystem) throw createError('Point system is required', 'VALIDATION');

  // Mode gate. When the competition is in general-rules mode we drop the
  // override entirely — saved rules_override rows stay on disk but have no
  // effect until mode flips back on. Undefined = legacy caller = honour
  // override (Phase 1 default) so existing tests + behaviour don't change.
  const effectiveOverride = perRoundRulesEnabled === false ? null : rulesOverride;

  const { pointSystem: rules, individualRule } = resolveEffectiveRules(
    pointSystem,
    effectiveOverride
  );
  const results =
    gameType === 'match-play'
      ? calculateMatchPlayResults(roundId, scorecards, rules)
      : calculateStandardResults(roundId, scorecards, gameType, rules, individualRule);

  // Per-round rules can disable individual-leaderboard contribution (e.g. a
  // scramble round that shouldn't feed qualifying standings). We still save
  // the rows for round-level display but zero the competition points so the
  // aggregator won't count them. Only consulted when the override is active.
  const contributesIndividual =
    effectiveOverride?.contributes_to_individual_leaderboard ?? true;
  const adjusted = contributesIndividual
    ? results
    : results.map((r) => ({ ...r, competitionPoints: 0 }));

  return saveRoundResults(roundId, adjusted);
}

/**
 * Finalize a team round
 *
 * @param rulesOverride Optional per-round override. When `team_points` is set,
 *   the two-team winner/tie/loser allocation overrides position-based points
 *   (use case: "2 pts winning team, 1 pt each on tie" from template
 *   team_stableford_best_n_of_m). When `contributes_to_team_leaderboard === false`,
 *   all saved rows get `competition_points = 0`.
 * @param perRoundRulesEnabled Mode flag. When explicitly `false`, the override
 *   is ignored entirely — team rows are still written, but via position-based
 *   points from competition.point_system with no win/tie/loss allocation.
 */
export async function finalizeTeamRound(
  roundId: string,
  teamScores: { teamId: string; rawScore: number; rawResultData: RoundResultData }[],
  gameType: GameType,
  pointSystem: PointSystemConfig,
  rulesOverride?: RoundRulesOverride | null,
  perRoundRulesEnabled?: boolean
): Promise<RoundResult[]> {
  if (!roundId) throw createError('Round ID is required', 'VALIDATION');
  if (!teamScores?.length) throw createError('At least one team score is required', 'VALIDATION');

  const effectiveOverride = perRoundRulesEnabled === false ? null : rulesOverride;

  // Team finalization uses the competition's positional point_system (or the
  // legacy `individual_points` bare-map override) for its base position →
  // points lookup. The new mode-based individualRule applies only to
  // individual leaderboard contributions, not team standings — `team_points`
  // override below is the team-level analogue.
  const { pointSystem: rules } = resolveEffectiveRules(pointSystem, effectiveOverride);
  const roundResults: CompetitionPointsRoundResult[] = teamScores.map((ts) => ({
    participantId: ts.teamId,
    rawScore: ts.rawScore,
    teamId: ts.teamId,
  }));

  const scored = calculateCompetitionPoints(roundResults, gameType, rules);

  // Per-round win/tie/loss team point allocation takes precedence over the
  // position-based point_system when `team_points` is set AND we have exactly
  // two teams (the "A vs B" case the allocation models). With more teams,
  // we fall back to the competition position-based rules.
  const teamPoints = effectiveOverride?.team_points;
  const useWinTieLoss = teamPoints && scored.length === 2;
  const contributesTeam = effectiveOverride?.contributes_to_team_leaderboard ?? true;

  const results: SaveRoundResultInput[] = scored.map((s) => {
    const original = teamScores.find((ts) => ts.teamId === s.participantId);
    let competitionPoints = s.competitionPoints;
    if (useWinTieLoss && teamPoints) {
      if (s.tied) competitionPoints = teamPoints.tie;
      else if (s.position === 1) competitionPoints = teamPoints.win;
      else competitionPoints = teamPoints.loss;
    }
    if (!contributesTeam) competitionPoints = 0;
    return {
      roundId,
      teamId: s.participantId as string,
      rawScore: s.rawScore,
      rawResultData: original?.rawResultData || {},
      position: s.position,
      competitionPoints,
      isTeamResult: true,
    };
  });

  return saveRoundResults(roundId, results);
}

// =====================================================
// CALCULATION HELPERS
// =====================================================

function calculateStandardResults(
  roundId: string,
  scorecards: Scorecard[],
  gameType: GameType,
  rules: PointSystemRules,
  individualRule?: IndividualPointsRule
): SaveRoundResultInput[] {
  const roundResults = scorecards.map((sc) => {
    let rawScore: number;
    let resultData: RoundResultData;

    switch (gameType) {
      case 'stableford':
        rawScore = sc.total_points;
        resultData = { stableford_points: sc.total_points };
        break;
      case 'stroke':
        rawScore = sc.total_net;
        resultData = { gross_score: sc.total_gross, net_score: sc.total_net };
        break;
      case 'par':
        rawScore = sc.total_par_score ?? 0;
        resultData = { par_score: sc.total_par_score, gross_score: sc.total_gross, net_score: sc.total_net };
        break;
      case 'best-ball':
      case 'scramble':
      case 'shamble':
        rawScore = sc.total_points || sc.total_net;
        resultData = { team_score: rawScore, gross_score: sc.total_gross, net_score: sc.total_net };
        break;
      default:
        rawScore = sc.total_points;
        resultData = { stableford_points: sc.total_points };
    }

    return { participantId: sc.player_id, rawScore, _resultData: resultData };
  });

  const scored = calculateCompetitionPoints(roundResults, gameType, rules, individualRule);

  return scored.map((s) => {
    const original = roundResults.find((r) => r.participantId === s.participantId);
    return {
      roundId,
      playerId: s.participantId as string,
      rawScore: s.rawScore,
      rawResultData: (original as { _resultData: RoundResultData })?._resultData || {},
      position: s.position,
      competitionPoints: s.competitionPoints,
      isTeamResult: false,
    };
  });
}

function calculateMatchPlayResults(
  roundId: string,
  scorecards: Scorecard[],
  rules: PointSystemRules
): SaveRoundResultInput[] {
  const results: SaveRoundResultInput[] = [];

  for (const sc of scorecards) {
    const matchData = extractMatchPlayData(sc.scores);
    if (!matchData) continue;

    const matchResult: MatchResult = {
      participantId: sc.player_id,
      opponentId: matchData.opponentId,
      result: matchData.result,
      margin: matchData.margin,
    };

    results.push({
      roundId,
      playerId: sc.player_id,
      rawScore: null,
      rawResultData: {
        opponent_id: matchData.opponentId,
        match_result: matchData.dbResult,
        final_margin: matchData.margin,
        holes_won: matchData.holesWon,
        holes_lost: matchData.holesLost,
        holes_halved: matchData.holesHalved,
      },
      position: null,
      competitionPoints: calculateMatchPlayPoints(matchResult, rules),
      isTeamResult: false,
    });
  }

  return results;
}

function extractMatchPlayData(scores: Record<string, unknown> | null) {
  if (!scores?.match || typeof scores.match !== 'object') return null;

  const data = scores.match as MatchPlayScoreData;
  if (!data.result) return null;

  const dbResult = data.result;
  const result: 'win' | 'draw' | 'loss' = dbResult === 'halved' ? 'draw' : dbResult;

  return {
    opponentId: data.opponent_id || '',
    result,
    dbResult,
    margin: data.margin,
    holesWon: data.holes_won,
    holesLost: data.holes_lost,
    holesHalved: data.holes_halved,
  };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Delete all results for a round
 */
export async function deleteRoundResults(roundId: string): Promise<void> {
  if (!roundId) throw createError('Round ID is required', 'VALIDATION');

  const { error } = await supabase.from('round_results').delete().eq('round_id', roundId);
  if (error) {
    throw createError(`Failed to delete results: ${error.message}`, 'DATABASE');
  }
}

/**
 * Check if a round has been finalized
 */
export async function isRoundFinalized(roundId: string): Promise<boolean> {
  if (!roundId) throw createError('Round ID is required', 'VALIDATION');

  const { count, error } = await supabase
    .from('round_results')
    .select('*', { count: 'exact', head: true })
    .eq('round_id', roundId);

  if (error) {
    throw createError(`Failed to check finalization: ${error.message}`, 'DATABASE');
  }

  return (count || 0) > 0;
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

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
