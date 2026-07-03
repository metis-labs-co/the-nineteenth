/**
 * Combined Team Match Play Finalization
 *
 * For combined rounds (`round_format='combined'`) with `game_type='match-play'`
 * and `team_format='match-play-team'`: two teams play one head-to-head match.
 * Each hole, the team with the lowest net score wins; halve when equal. The
 * match status from cumulative hole results determines the round winner.
 *
 * This path writes one `round_results` team row per side, with `competition_points`
 * allocated from the override's `team_points` (1/0.5/0 by default) when set.
 * Unlike split rounds (handled by `finalizePairResults`) there is no
 * `sub_matches` table to aggregate from — the match outcome must be derived
 * from raw scorecards + course hole data at finalization time.
 *
 * Net scores per hole come from each player's `daily_handicap_used` snapshot
 * on the scorecard combined with the course's per-hole stroke index. Both are
 * already available without re-running the handicap pipeline.
 */

import { supabase } from '@/services/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

import { getCompetitionTeams } from '@/services/teams/teamQueries';
import { saveRoundResults } from './roundResultsService';
import { getFourBallStrokes } from '@/utils/scoring';
import {
  calculateTeamMatchStatus,
  countHolesWon,
} from '@/screens/scoring/TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations';
import type { TeamHoleResult } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';
import type {
  Hole,
  Scorecard,
  HoleScore,
  MultiBallHoleScore,
  TeamWithMembers,
} from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

export interface FinalizeTeamMatchPlayRoundInput {
  roundId: string;
  competitionId: string;
  scorecards: Scorecard[];
  rulesOverride: RoundRulesOverride | null | undefined;
  /**
   * Mode flag from `competitions.per_round_rules_enabled`. When explicitly
   * `false`, `rules_override` is ignored — team_points falls back to the
   * default 1/0.5/0 allocation so the team competition leaderboard still
   * reflects the round result.
   */
  perRoundRulesEnabled?: boolean;
  /** Optional preset team IDs from the round. Required for multi-team competitions. */
  team1Id: string | null;
  team2Id: string | null;
  /**
   * Optional pre-fetched competition teams with member IDs. When omitted,
   * fetched via `getCompetitionTeams`. Tests typically pass these directly.
   */
  teams?: TeamWithMembers[];
  /**
   * Optional pre-fetched course holes. When omitted, fetched via the round's
   * course_id. Tests typically pass these directly.
   */
  courseHoles?: Hole[];
}

/**
 * Should this round be handled by finalizeTeamMatchPlayRound? The dispatcher
 * uses this to keep wiring readable.
 */
export function isCombinedTeamMatchPlay(
  gameType: string,
  teamFormat: string | null | undefined,
  roundFormat: string | null | undefined
): boolean {
  return (
    gameType === 'match-play' &&
    teamFormat === 'match-play-team' &&
    roundFormat === 'combined'
  );
}

/**
 * Default team_points allocation when none is configured on the round's
 * `rules_override`. Mirrors the Ryder-Cup convention used by the split-round
 * pair-points presets so combined and split team match play feel consistent.
 */
const DEFAULT_TEAM_POINTS = { win: 1, tie: 0.5, loss: 0 };

/** Pull a hole's gross strokes out of a scorecard's `scores` JSON. */
function getHoleGross(
  scores: Record<string, HoleScore | MultiBallHoleScore> | null | undefined,
  holeNumber: number
): number | null {
  if (!scores) return null;
  const entry = scores[String(holeNumber)];
  if (!entry) return null;
  // Multi-ball: take ball 1's strokes (combined team match play uses single-ball).
  if ('balls' in entry && Array.isArray(entry.balls)) {
    const first = entry.balls[0];
    return typeof first?.strokes === 'number' ? first.strokes : null;
  }
  return typeof (entry as HoleScore).strokes === 'number'
    ? (entry as HoleScore).strokes
    : null;
}

/**
 * Resolve the two team IDs for the match. Prefers the round's explicit
 * team1_id/team2_id, falling back to the first two competition teams when
 * the competition has exactly two teams (legacy compat — same fallback the
 * scoring screen uses when route params aren't supplied).
 */
function resolveMatchTeamIds(
  team1Id: string | null,
  team2Id: string | null,
  allTeamIds: string[]
): [string, string] | null {
  if (team1Id && team2Id) return [team1Id, team2Id];
  if (allTeamIds.length === 2) return [allTeamIds[0], allTeamIds[1]];
  return null;
}

/**
 * Orchestrate combined team match-play finalization.
 *
 * Returns the number of team rows written. Returns 0 when the round can't
 * be resolved into a clean two-team match (missing teams, missing course
 * holes, no completed scorecards on one side).
 */
export async function finalizeTeamMatchPlayRound(
  input: FinalizeTeamMatchPlayRoundInput
): Promise<number> {
  const {
    roundId,
    competitionId,
    scorecards,
    rulesOverride,
    perRoundRulesEnabled,
    team1Id,
    team2Id,
  } = input;

  if (scorecards.length === 0) return 0;

  const teams = input.teams ?? (await getCompetitionTeams(competitionId));
  if (teams.length < 2) return 0;

  const ids = resolveMatchTeamIds(
    team1Id,
    team2Id,
    teams.map((t) => t.id)
  );
  if (!ids) return 0;
  const [resolvedTeam1Id, resolvedTeam2Id] = ids;

  const team1 = teams.find((t) => t.id === resolvedTeam1Id);
  const team2 = teams.find((t) => t.id === resolvedTeam2Id);
  if (!team1 || !team2) return 0;

  const team1PlayerIds = new Set(team1.members.map((m) => m.player_id));
  const team2PlayerIds = new Set(team2.members.map((m) => m.player_id));

  const team1Scorecards = scorecards.filter((sc) =>
    team1PlayerIds.has(sc.player_id)
  );
  const team2Scorecards = scorecards.filter((sc) =>
    team2PlayerIds.has(sc.player_id)
  );
  if (team1Scorecards.length === 0 || team2Scorecards.length === 0) return 0;

  // Course holes for stroke index + par. Stored as JSONB on the courses table
  // — fetched via the round's course_id rather than a separate course_holes
  // query.
  let holes: Hole[];
  if (input.courseHoles) {
    holes = input.courseHoles;
  } else {
    const { data: round, error: roundError } = (await supabase
      .from('rounds')
      .select('course_id')
      .eq('id', roundId)
      .single()) as unknown as {
      data: { course_id: string | null } | null;
      error: PostgrestError | null;
    };
    if (roundError || !round?.course_id) return 0;

    const { data: course, error: courseError } = (await supabase
      .from('courses')
      .select('holes')
      .eq('id', round.course_id)
      .single()) as unknown as {
      data: { holes: Hole[] | null } | null;
      error: PostgrestError | null;
    };
    if (courseError || !course?.holes || course.holes.length === 0) return 0;
    holes = course.holes;
  }

  if (holes.length === 0) return 0;

  // Hole-by-hole best-ball net comparison.
  const holeResults: Record<number, TeamHoleResult> = {};

  // All players in the match (both teams) with their stored daily handicaps,
  // for relative-to-lowest stroke allocation.
  const allMatchPlayers = [...team1Scorecards, ...team2Scorecards].map((sc) => ({
    playerId: sc.player_id,
    handicap: sc.daily_handicap_used ?? 0,
  }));

  // Iterate the round's actual holes — back-9 / combo rounds carry numbers
  // 10..18 (or 10..27), not 1..18.
  for (const hole of holes) {
    const h = hole.number;

    const team1Nets: number[] = [];
    const team2Nets: number[] = [];

    // Relative-to-lowest: strokes are each player's difference from the lowest
    // handicap in the match (both teams), allocated by stroke index.
    const strokesForHole = getFourBallStrokes(allMatchPlayers, hole.strokeIndex);

    for (const sc of team1Scorecards) {
      const gross = getHoleGross(sc.scores, h);
      if (gross == null) continue;
      team1Nets.push(gross - (strokesForHole.get(sc.player_id) ?? 0));
    }
    for (const sc of team2Scorecards) {
      const gross = getHoleGross(sc.scores, h);
      if (gross == null) continue;
      team2Nets.push(gross - (strokesForHole.get(sc.player_id) ?? 0));
    }

    if (team1Nets.length === 0 || team2Nets.length === 0) continue;

    const team1Best = Math.min(...team1Nets);
    const team2Best = Math.min(...team2Nets);

    let winner: TeamHoleResult['winner'];
    if (team1Best < team2Best) winner = 'team1';
    else if (team2Best < team1Best) winner = 'team2';
    else winner = 'halved';

    // The downstream helpers (`calculateTeamMatchStatus`, `countHolesWon`)
    // only read `winner`. Empty `*PlayerScores` maps satisfy the shared
    // type without re-mapping per-player nets that aren't needed here.
    holeResults[h] = {
      winner,
      team1Score: team1Best,
      team2Score: team2Best,
      team1PlayerScores: {},
      team2PlayerScores: {},
    };
  }

  if (Object.keys(holeResults).length === 0) return 0;

  const matchStatus = calculateTeamMatchStatus(holeResults, holes.length);
  const wins = countHolesWon(holeResults);

  // Mode gate: in general-rules mode the override is dropped entirely. The
  // default win/tie/loss allocation still applies so the team leaderboard
  // reflects the match outcome.
  const effectiveOverride =
    perRoundRulesEnabled === false ? null : rulesOverride ?? null;

  const teamPoints = effectiveOverride?.team_points ?? DEFAULT_TEAM_POINTS;
  const contributesTeam =
    effectiveOverride?.contributes_to_team_leaderboard ?? true;

  // Determine winner. If the match is still in_progress (rare at finalize
  // time — would mean fewer than 18 holes scored on a non-dormie path), fall
  // back to the leader's perspective.
  let team1IsWinner = false;
  let team2IsWinner = false;
  let isTied = false;

  if (matchStatus.status === 'complete') {
    team1IsWinner = matchStatus.winner === 'team1';
    team2IsWinner = matchStatus.winner === 'team2';
    isTied = matchStatus.winner === 'halved';
  } else if (matchStatus.leader === 'team1') {
    team1IsWinner = true;
  } else if (matchStatus.leader === 'team2') {
    team2IsWinner = true;
  } else {
    isTied = true;
  }

  const team1CompPoints = !contributesTeam
    ? 0
    : isTied
      ? teamPoints.tie
      : team1IsWinner
        ? teamPoints.win
        : teamPoints.loss;

  const team2CompPoints = !contributesTeam
    ? 0
    : isTied
      ? teamPoints.tie
      : team2IsWinner
        ? teamPoints.win
        : teamPoints.loss;

  // Position: tied → both 1, otherwise winner=1 / loser=2. Mirrors the
  // pair-points convention from finalizePairResults.
  const team1Position = isTied ? 1 : team1IsWinner ? 1 : 2;
  const team2Position = isTied ? 1 : team2IsWinner ? 1 : 2;

  const finalMargin =
    matchStatus.status === 'complete' ? matchStatus.margin : undefined;

  await saveRoundResults(roundId, [
    {
      roundId,
      teamId: resolvedTeam1Id,
      // raw_score = holes won — informational, also gives a stable secondary
      // sort key for the leaderboard view if a future reader filters by raw_score.
      rawScore: wins.team1,
      rawResultData: {
        team_score: wins.team1,
        match_result: team1IsWinner ? 'win' : isTied ? 'halved' : 'loss',
        ...(finalMargin !== undefined ? { final_margin: finalMargin } : {}),
        holes_won: wins.team1,
        holes_lost: wins.team2,
        holes_halved: wins.halved,
      },
      position: team1Position,
      competitionPoints: team1CompPoints,
      isTeamResult: true,
    },
    {
      roundId,
      teamId: resolvedTeam2Id,
      rawScore: wins.team2,
      rawResultData: {
        team_score: wins.team2,
        match_result: team2IsWinner ? 'win' : isTied ? 'halved' : 'loss',
        ...(finalMargin !== undefined ? { final_margin: finalMargin } : {}),
        holes_won: wins.team2,
        holes_lost: wins.team1,
        holes_halved: wins.halved,
      },
      position: team2Position,
      competitionPoints: team2CompPoints,
      isTeamResult: true,
    },
  ]);

  return 2;
}
