/**
 * Team Result Finalization Orchestrator
 *
 * Runs after individual scorecards have been finalized via `finalizeRound`.
 * Reads the individual `round_results` rows, groups them by competition team
 * membership, applies the round's rule override (best-N-of-M, sum, or
 * best-ball from totals), and writes one `round_results` row per team with
 * `team_points` win/tie/loss allocation.
 *
 * Scope notes:
 *   - Supported `rules_override.team_aggregation` values: `best_n_of_m`,
 *     `sum`, `best_ball`, `scramble`. All four are round-total aggregations —
 *     they work on each player's finalized round total, no per-hole
 *     re-derivation. (`scramble` reads one member's total because every
 *     member records identical strokes in a scramble.)
 *   - `pairs_better_ball` is handled separately by `finalizePairResults`
 *     because it persists sub-match point accumulation rather than a
 *     round-total team score. This orchestrator skips it so the two paths
 *     don't double-write.
 *   - The engine applies whatever override is on disk regardless of the
 *     current user's tier (same invariant as Phase 1 individual finalization).
 */

import { getCompetitionTeams } from '@/services/teams/teamQueries';
import {
  finalizeTeamRound,
  getRoundResults,
  type RoundResultWithParticipant,
} from './roundResultsService';
import { aggregateTeamTotal, type PlayerTotal } from '@/utils/teamAggregation';
import { getEngine } from './resultsEngine';
import type {
  GameType,
  PointSystemConfig,
  Scorecard,
  TeamWithMembers,
} from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

export interface FinalizeTeamResultsInput {
  roundId: string;
  competitionId: string;
  gameType: GameType;
  pointSystem: PointSystemConfig;
  rulesOverride: RoundRulesOverride | null | undefined;
  /**
   * Mode flag from `competitions.per_round_rules_enabled`. When explicitly
   * `false`, this orchestrator is a no-op — team/pair rows are only written
   * when the competition is in per-round mode. Undefined = legacy caller
   * path = honour override.
   */
  perRoundRulesEnabled?: boolean;
  /**
   * Optional pre-fetched individual results. When omitted, the orchestrator
   * fetches them from `round_results` itself (useful from the post-
   * `finalizeRound` path).
   */
  individualResults?: RoundResultWithParticipant[];
  /**
   * Optional pre-fetched competition teams with member IDs. When omitted,
   * fetched via `getCompetitionTeams`.
   */
  teams?: TeamWithMembers[];
}

/**
 * Higher-is-better for the given game type? Mirrors the decision in
 * `calculateCompetitionPoints`: Stableford / Par → higher; Stroke → lower.
 * Match-play rounds aren't aggregated at the team level here.
 */
function higherIsBetter(gameType: GameType): boolean {
  return gameType === 'stableford' || gameType === 'par';
}

/**
 * Decide whether this override is one the orchestrator can persist today.
 * Returns false for `pairs_better_ball` — that path lives in
 * `finalizePairResults` to avoid double-writing team rows.
 */
function isSupportedTeamAggregation(
  override: RoundRulesOverride | null | undefined
): boolean {
  const method = override?.team_aggregation;
  if (!method) return false;
  return (
    method === 'best_n_of_m' ||
    method === 'sum' ||
    method === 'best_ball' ||
    method === 'scramble'
  );
}

/**
 * Compute team totals from individual round results, grouped by competition
 * team membership. Returns only teams that have at least one participating
 * member so we don't emit empty team rows.
 */
function computeTeamTotals(
  individualResults: RoundResultWithParticipant[],
  teams: TeamWithMembers[],
  override: RoundRulesOverride,
  higherBetter: boolean
): { teamId: string; total: number; contributorIds: string[]; droppedIds: string[] }[] {
  // Build lookup: player_id → raw_score
  const playerScore = new Map<string, number>();
  for (const r of individualResults) {
    if (r.is_team_result) continue;
    if (!r.player_id) continue;
    if (r.raw_score == null) continue;
    playerScore.set(r.player_id, r.raw_score);
  }

  return teams
    .map((team) => {
      const memberTotals: PlayerTotal[] = team.members
        .filter((m) => playerScore.has(m.player_id))
        .map((m) => ({ playerId: m.player_id, total: playerScore.get(m.player_id)! }));

      if (memberTotals.length === 0) return null;

      const agg = aggregateTeamTotal(
        override.team_aggregation ?? 'sum',
        memberTotals,
        override.team_aggregation_config,
        higherBetter
      );

      return {
        teamId: team.id,
        total: agg.teamTotal,
        contributorIds: agg.contributorIds,
        droppedIds: agg.droppedIds,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/**
 * Orchestrate team-result persistence for a finalized round.
 *
 * Returns the number of team rows written. Returns 0 (no-op) when the
 * override isn't supported here, when the competition has no teams, or
 * when no players have results yet.
 */
export async function finalizeTeamResults(
  input: FinalizeTeamResultsInput
): Promise<number> {
  const {
    roundId,
    competitionId,
    gameType,
    pointSystem,
    rulesOverride,
    perRoundRulesEnabled,
  } = input;

  // General-rules mode disables per-round team persistence entirely. The
  // override stays on disk (so flipping the mode back on restores behaviour)
  // but no team rows are written while mode is off.
  if (perRoundRulesEnabled === false) return 0;

  if (!isSupportedTeamAggregation(rulesOverride)) return 0;
  // team_points is required for the win/tie/loss allocation path in
  // finalizeTeamRound. Without it we'd fall back to position-based points,
  // which isn't what any of the built-in templates want. Better to skip
  // than to emit surprising rows.
  if (!rulesOverride!.team_points) return 0;

  const teams = input.teams ?? (await getCompetitionTeams(competitionId));
  if (teams.length < 2) return 0;

  const individualResults =
    input.individualResults ?? (await getRoundResults(roundId));
  if (individualResults.length === 0) return 0;

  const higherBetter = higherIsBetter(gameType);
  const teamTotals = computeTeamTotals(
    individualResults,
    teams,
    rulesOverride!,
    higherBetter
  );
  if (teamTotals.length < 2) return 0;

  const teamScores = teamTotals.map((t) => ({
    teamId: t.teamId,
    rawScore: t.total,
    rawResultData: {
      team_score: t.total,
      contributing_player_id: t.contributorIds[0], // best contributor, informational
    },
  }));

  await finalizeTeamRound(
    roundId,
    teamScores,
    gameType,
    pointSystem,
    rulesOverride,
    perRoundRulesEnabled
  );

  return teamScores.length;
}

// =====================================================
// TEAM-ONLY FORMAT FINALIZATION
// =====================================================
//
// Used by Scramble / Best Ball / Shamble — game types whose unit of
// competition is the team itself, not individual players. Unlike the
// individual + aggregated-team path above (driven by per-round-rules
// templates), this path NEVER writes individual round_results rows. The
// orchestrator calls deleteIndividualRoundResults beforehand to clear any
// stale rows from a prior (pre-fix) finalization.
//
// Points fallback: When `rules_override.team_points` is present (e.g. a
// Team Scramble template applies 2/1/0 win/tie/loss), finalizeTeamRound
// uses that. Otherwise it falls back to position-based points from the
// competition's point_system, so general-rules-mode and template-less
// Scramble rounds both produce a populated team leaderboard.

export interface FinalizeTeamOnlyRoundInput {
  roundId: string;
  competitionId: string;
  gameType: GameType;
  scorecards: Scorecard[];
  pointSystem: PointSystemConfig;
  rulesOverride: RoundRulesOverride | null | undefined;
  perRoundRulesEnabled?: boolean;
  /** Optional pre-fetched competition teams; fetched if omitted. */
  teams?: TeamWithMembers[];
}

/**
 * Group completed scorecards by their team via competition team membership.
 * Players whose team isn't found in `teams` (defensive: orphaned scorecards)
 * are silently skipped — they won't surface in the team leaderboard.
 */
function groupScorecardsByTeam(
  scorecards: Scorecard[],
  teams: TeamWithMembers[]
): Map<string, Scorecard[]> {
  const playerToTeam = new Map<string, string>();
  for (const team of teams) {
    for (const member of team.members) {
      playerToTeam.set(member.player_id, team.id);
    }
  }

  const grouped = new Map<string, Scorecard[]>();
  for (const sc of scorecards) {
    const teamId = playerToTeam.get(sc.player_id);
    if (!teamId) continue;
    if (!grouped.has(teamId)) grouped.set(teamId, []);
    grouped.get(teamId)!.push(sc);
  }
  return grouped;
}

/**
 * Finalize a team-only-format round (Scramble, Best Ball, Shamble).
 *
 * Returns the number of team rows written. Returns 0 when there aren't at
 * least 2 teams with completed scorecards (a single-team result isn't
 * meaningful for a head-to-head format).
 */
export async function finalizeTeamOnlyRound(
  input: FinalizeTeamOnlyRoundInput
): Promise<number> {
  const {
    roundId,
    competitionId,
    gameType,
    scorecards,
    pointSystem,
    rulesOverride,
    perRoundRulesEnabled,
  } = input;

  if (scorecards.length === 0) return 0;

  const engine = getEngine(gameType);
  if (engine.shape !== 'team-only') {
    // Defensive — the orchestrator should never route a non-team-only game
    // type here. Guard so future callers fail fast rather than silently
    // produce wrong rows.
    throw new Error(
      `finalizeTeamOnlyRound called for non-team-only game type: ${gameType}`
    );
  }

  const teams = input.teams ?? (await getCompetitionTeams(competitionId));
  if (teams.length < 2) return 0;

  const byTeam = groupScorecardsByTeam(scorecards, teams);
  if (byTeam.size < 2) return 0;

  // Build a per-team member list with handicaps so engine pickers (notably
  // Scramble) can compute team handicap. Source: the team's `members` from
  // the teams query, which carry the player record with handicap.
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  const teamScores = Array.from(byTeam.entries()).map(([teamId, teamScorecards]) => {
    const team = teamsById.get(teamId);
    const teamMembers =
      team?.members.map((m) => ({
        player_id: m.player_id,
        handicap: m.player?.handicap ?? null,
      })) ?? [];
    const { rawScore, rawResultData } = engine.pickTeamRawScore(
      teamScorecards,
      teamMembers
    );
    return { teamId, rawScore, rawResultData };
  });

  await finalizeTeamRound(
    roundId,
    teamScores,
    gameType,
    pointSystem,
    rulesOverride,
    perRoundRulesEnabled
  );

  return teamScores.length;
}
