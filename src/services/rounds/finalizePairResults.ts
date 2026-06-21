/**
 * Pair Result Finalization (R2 — Pairs Better Ball)
 *
 * For split rounds (`round_format='split'`) with a `pair_points` override,
 * accumulates win/tie/loss points per competition team from each sub-match
 * outcome, then writes one `round_results` team row per participating team.
 *
 * A sub-match's outcome is resolved in this order:
 *   1. The persisted `sub_matches.result` (set on forfeit, or by the team
 *      match-play scoring screen). `forfeit-b` counts as side A winning;
 *      `forfeit-a` counts as side B winning (matches the MatchTab aggregation).
 *   2. If no result is persisted (e.g. a stableford Pairs Better Ball round
 *      scored via ordinary scorecards never records a sub-match result),
 *      it's computed live from the players' scorecards — best-ball within
 *      each pair, the same comparison the round-screen leaderboard shows
 *      (`buildLiveTeamEntries` in src/utils/teamScoring/calculations.ts).
 *
 * Each sub-match awards `pair_points.win` / `.tie` / `.loss` to the two sides.
 * Points across all decided sub-matches sum to each team's round total, which
 * is also its `competition_points` contribution for the round.
 *
 * Team identity for each side is taken from the round's `team1_id` / `team2_id`
 * when set, otherwise derived from competition team membership of the sub-match
 * rosters — so a round that never had its matchup explicitly assigned still
 * finalizes correctly.
 *
 * This persists team rows independently of `finalizeTeamResults` (which handles
 * round-total aggregations). The two are mutually exclusive on any given
 * override because `isSupportedTeamAggregation` skips `pairs_better_ball`.
 */

import { supabase } from '@/services/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

import { saveRoundResults } from './roundResultsService';
import { getCompetitionTeams } from '@/services/teams/teamQueries';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
  calculateParScore,
} from '@/utils/scoring';
import { PICKUP_SCORE } from '@/constants/scoring';
import {
  resolveSubMatchOutcomeFromScores,
  resolveAltShotSubMatchOutcome,
  deriveSideTeamIds,
  type SideOutcome,
} from './pairPointsCalculation';
import type {
  GameType,
  Hole,
  HoleScore,
  MultiBallHoleScore,
  Scorecard,
  SubMatch,
  TeamWithMembers,
} from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

export interface FinalizePairResultsInput {
  roundId: string;
  /**
   * Competition team IDs for the two sides of the split round. When both are
   * set they map directly to sub-match side A / side B. When omitted, sides
   * are derived from competition team membership of the sub-match rosters.
   */
  team1Id?: string | null;
  team2Id?: string | null;
  /** Must include `pair_points`. The `pairs_better_ball` aggregation is implied. */
  rulesOverride: RoundRulesOverride | null | undefined;
  /**
   * Mode flag from `competitions.per_round_rules_enabled`. When explicitly
   * `false`, pair persistence is disabled — the competition is running under
   * general rules so the override is ignored.
   */
  perRoundRulesEnabled?: boolean;
  /**
   * Optional pre-fetched sub-matches. When omitted the service fetches
   * them from the `sub_matches` table. Tests typically pass these directly.
   */
  subMatches?: SubMatch[];
  /**
   * Competition ID — used to fetch competition teams when `teams` isn't
   * supplied and team IDs need deriving. Optional for callers that pass
   * explicit team1Id/team2Id and persisted sub-match results.
   */
  competitionId?: string;
  /**
   * Game type — required to compute sub-match outcomes from scorecards.
   * Determines per-hole scoring (stableford / par points, or stroke net).
   */
  gameType?: GameType;
  /**
   * Completed scorecards for the round. When supplied (with `gameType` and
   * resolvable holes), sub-matches without a persisted result are decided
   * live via best-ball.
   */
  scorecards?: Scorecard[];
  /** Optional pre-fetched course holes; fetched via the round's course when omitted. */
  courseHoles?: Hole[];
  /** Optional pre-fetched competition teams; fetched via competitionId when omitted. */
  teams?: TeamWithMembers[];
}

/**
 * Should this input be handled by finalizePairResults? Keeps the wiring in
 * useRoundFinalization readable.
 */
export function isPairPointsOverride(
  roundFormat: string | null | undefined,
  override: RoundRulesOverride | null | undefined
): boolean {
  if (roundFormat !== 'split') return false;
  return !!override?.pair_points;
}

async function fetchSubMatchesForRound(roundId: string): Promise<SubMatch[]> {
  // Sub-matches aren't in the generated Supabase types yet — same pattern as
  // src/services/subMatches/index.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from('sub_matches') as any)
    .select('*')
    .eq('round_id', roundId)) as { data: SubMatch[] | null; error: PostgrestError | null };

  if (error) {
    throw new Error(`Failed to fetch sub-matches for pair finalization: ${error.message}`);
  }
  return data ?? [];
}

async function fetchCourseHolesForRound(roundId: string): Promise<Hole[]> {
  const { data: round, error: roundError } = (await supabase
    .from('rounds')
    .select('course_id')
    .eq('id', roundId)
    .single()) as unknown as {
    data: { course_id: string | null } | null;
    error: PostgrestError | null;
  };
  if (roundError || !round?.course_id) return [];

  const { data: course, error: courseError } = (await supabase
    .from('courses')
    .select('holes')
    .eq('id', round.course_id)
    .single()) as unknown as {
    data: { holes: Hole[] | null } | null;
    error: PostgrestError | null;
  };
  if (courseError || !course?.holes) return [];
  return course.holes;
}

/** Pull a hole's gross strokes out of a scorecard's `scores` JSON. */
function getHoleGross(
  scores: Record<string, HoleScore | MultiBallHoleScore> | null | undefined,
  holeNumber: number
): number | null {
  if (!scores) return null;
  const entry = scores[String(holeNumber)];
  if (!entry) return null;
  if ('balls' in entry && Array.isArray(entry.balls)) {
    const first = entry.balls[0];
    return typeof first?.strokes === 'number' ? first.strokes : null;
  }
  return typeof (entry as HoleScore).strokes === 'number'
    ? (entry as HoleScore).strokes
    : null;
}

/** Higher-is-better for the given game type? Stableford / Par → yes; Stroke → no. */
function higherIsBetter(gameType: GameType): boolean {
  return gameType === 'stableford' || gameType === 'par';
}

/**
 * Build a per-hole, per-player value lookup from scorecards, using each card's
 * `daily_handicap_used` snapshot (the canonical strokes-received basis at
 * finalization time — same source as finalizeTeamMatchPlayRound). Pickups are
 * treated as no-score so they don't pollute a pair's best-ball, matching the
 * live round leaderboard.
 */
function buildHoleValueLookup(
  scorecards: Scorecard[],
  gameType: GameType
): (playerId: string, hole: Hole) => number | null {
  const byPlayer = new Map<string, Scorecard>();
  for (const sc of scorecards) byPlayer.set(sc.player_id, sc);

  return (playerId, hole) => {
    const sc = byPlayer.get(playerId);
    if (!sc) return null;
    const strokes = getHoleGross(sc.scores, hole.number);
    if (strokes == null || strokes === PICKUP_SCORE) return null;
    const strokesReceived = getStrokesReceived(
      sc.daily_handicap_used ?? 0,
      hole.strokeIndex
    );
    if (gameType === 'stableford') {
      return calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
    }
    if (gameType === 'par') {
      return calculateParScore(strokes, hole.par, strokesReceived);
    }
    // stroke (and any other stroke-based variant): net strokes, lower better.
    return strokes - strokesReceived;
  };
}

/** Map a persisted sub-match result to a side outcome. null if undecided. */
function persistedOutcome(sm: SubMatch): SideOutcome | null {
  if (sm.status !== 'completed' && sm.status !== 'forfeited') return null;
  switch (sm.result) {
    case 'a-wins':
    case 'forfeit-b':
      return 'a-wins';
    case 'b-wins':
    case 'forfeit-a':
      return 'b-wins';
    case 'halved':
      return 'halved';
    default:
      return null;
  }
}

/**
 * Orchestrate pair-points persistence for a split round.
 *
 * Returns the number of team rows written. Returns 0 when the override doesn't
 * request pair points, when no sub-match can be decided, or when the two sides
 * can't be resolved to competition teams.
 */
export async function finalizePairResults(
  input: FinalizePairResultsInput
): Promise<number> {
  const {
    roundId,
    team1Id,
    team2Id,
    rulesOverride,
    perRoundRulesEnabled,
    gameType,
  } = input;

  // General-rules mode disables pair-point persistence. Saved overrides stay
  // on disk; they simply aren't applied while mode is off.
  if (perRoundRulesEnabled === false) return 0;

  const pairPoints = rulesOverride?.pair_points;
  if (!pairPoints) return 0;

  const subMatches = input.subMatches ?? (await fetchSubMatchesForRound(roundId));
  if (subMatches.length === 0) return 0;

  // Teams: needed to derive side identity when team1Id/team2Id aren't set.
  let teams = input.teams;
  if (!teams && !(team1Id && team2Id) && input.competitionId) {
    teams = await getCompetitionTeams(input.competitionId);
  }
  const teamsForDerive = (teams ?? []).map((t) => ({
    id: t.id,
    memberIds: t.members.map((m) => m.player_id),
  }));

  // Live-score lookup, built only when we have scorecards + a game type to
  // interpret them. Holes are needed too; fetch them lazily if absent.
  let getHoleValue: ((playerId: string, hole: Hole) => number | null) | null = null;
  let holes: Hole[] = input.courseHoles ?? [];
  if (input.scorecards && input.scorecards.length > 0 && gameType) {
    if (holes.length === 0) holes = await fetchCourseHolesForRound(roundId);
    if (holes.length > 0) {
      getHoleValue = buildHoleValueLookup(input.scorecards, gameType);
    }
  }

  // Daily-handicap snapshot for alt-shot's differential allowance.
  const dhcByPlayer = new Map<string, number>();
  if (input.scorecards) {
    for (const sc of input.scorecards) {
      if (typeof sc.daily_handicap_used === 'number') {
        dhcByPlayer.set(sc.player_id, sc.daily_handicap_used);
      }
    }
  }

  // One-ball gross lookup for alt-shot (reuses getHoleGross over scores JSON).
  const getGross = (playerId: string, hole: Hole): number | null => {
    const sc = input.scorecards?.find((c) => c.player_id === playerId);
    return sc ? getHoleGross(sc.scores, hole.number) : null;
  };

  // Accumulate per-team points. Both sides of every decided sub-match are added
  // (loss = 0) so a team that only ever loses still gets a row.
  const teamPoints = new Map<string, number>();
  const addPoints = (teamId: string, points: number) => {
    teamPoints.set(teamId, (teamPoints.get(teamId) ?? 0) + points);
  };

  let decidedCount = 0;
  for (const sm of subMatches) {
    // Resolve which competition team is on each side.
    const sideIds =
      team1Id && team2Id
        ? { sideATeamId: team1Id, sideBTeamId: team2Id }
        : teamsForDerive.length > 0
          ? deriveSideTeamIds({
              teamAPlayerIds: sm.team_a_player_ids,
              teamBPlayerIds: sm.team_b_player_ids,
              teams: teamsForDerive,
            })
          : null;
    if (!sideIds) continue;

    // Persisted result wins; otherwise compute from scorecards.
    let outcome = persistedOutcome(sm);
    if (!outcome && gameType === 'alt-shot' && holes.length > 0) {
      outcome = resolveAltShotSubMatchOutcome({
        teamAPlayerIds: sm.team_a_player_ids,
        teamBPlayerIds: sm.team_b_player_ids,
        holes,
        getGross,
        dailyHandicaps: dhcByPlayer,
      });
    } else if (!outcome && getHoleValue && gameType) {
      outcome = resolveSubMatchOutcomeFromScores({
        teamAPlayerIds: sm.team_a_player_ids,
        teamBPlayerIds: sm.team_b_player_ids,
        holes,
        getHoleValue,
        higherIsBetter: higherIsBetter(gameType),
      });
    }
    if (!outcome) continue;

    decidedCount += 1;
    if (outcome === 'a-wins') {
      addPoints(sideIds.sideATeamId, pairPoints.win);
      addPoints(sideIds.sideBTeamId, pairPoints.loss);
    } else if (outcome === 'b-wins') {
      addPoints(sideIds.sideATeamId, pairPoints.loss);
      addPoints(sideIds.sideBTeamId, pairPoints.win);
    } else {
      addPoints(sideIds.sideATeamId, pairPoints.tie);
      addPoints(sideIds.sideBTeamId, pairPoints.tie);
    }
  }

  if (decidedCount === 0 || teamPoints.size === 0) return 0;

  // Rank by points (higher better — win > loss). Ties share a position, and
  // each team's pair-points total is also its competition_points for the round.
  const ranked = [...teamPoints.entries()].sort((a, b) => b[1] - a[1]);
  let position = 0;
  let prevPoints: number | null = null;
  const rows = ranked.map(([teamId, points], index) => {
    if (prevPoints === null || points < prevPoints) {
      position = index + 1;
      prevPoints = points;
    }
    return {
      roundId,
      teamId,
      rawScore: points,
      rawResultData: { team_score: points },
      position,
      competitionPoints: points,
      isTeamResult: true,
    };
  });

  await saveRoundResults(roundId, rows);

  return rows.length;
}
