/**
 * Team Score Calculations
 *
 * Best ball (four ball) and scramble (Ambrose) scoring functions.
 */

import type { Hole, HoleScore, MultiBallHoleScore, GameType, TeamFormat } from '@/types';
import type { TeamWithMembers } from '@/types/database/team.types';
import type { SubMatch } from '@/types/database/round.types';
import type { TeamLeaderboardEntry } from '@/utils/roundLeaderboardFormatters';
import { isSingleBallScore } from '@/types/database/base';
import {
  calculateNetScore,
  calculateParScore,
  calculateStablefordPointsNet,
  getStrokesReceived,
  getEffectiveGrossStrokes,
} from '../scoring';
import type { TeamMemberScore, BestBallHoleResult } from './types';

/**
 * Calculate the best ball (four ball) result for a single hole.
 *
 * In best ball format, each team member plays their own ball and the team
 * takes the best (lowest) net score among all team members for each hole.
 *
 * @param teamScores - Array of team member scores with their handicaps
 * @param hole - The hole being scored (includes par and stroke index)
 * @returns Best net score and the contributing player's ID
 *
 * @example
 * ```typescript
 * const teamScores: TeamMemberScore[] = [
 *   { playerId: 'player1', grossScore: 5, handicap: 18 },
 *   { playerId: 'player2', grossScore: 4, handicap: 10 },
 * ];
 * const hole: Hole = { number: 1, par: 4, strokeIndex: 5, yardages: {} };
 *
 * const result = calculateBestBallHole(teamScores, hole);
 * // result.bestNetScore = 4 (player2's net score: 4 - 0 strokes on SI 5)
 * // result.contributingPlayerId = 'player2'
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('calculateBestBallHole', () => {
 *   it('returns best net score among team members', () => {
 *     const teamScores: TeamMemberScore[] = [
 *       { playerId: 'p1', grossScore: 6, handicap: 20 }, // gets 2 strokes, net = 4
 *       { playerId: 'p2', grossScore: 5, handicap: 8 },  // gets 0 strokes, net = 5
 *     ];
 *     const hole: Hole = { number: 1, par: 4, strokeIndex: 2, yardages: {} };
 *
 *     const result = calculateBestBallHole(teamScores, hole);
 *
 *     expect(result.bestNetScore).toBe(4);
 *     expect(result.contributingPlayerId).toBe('p1');
 *   });
 *
 *   it('handles ties by returning first player', () => {
 *     const teamScores: TeamMemberScore[] = [
 *       { playerId: 'p1', grossScore: 4, handicap: 0 },
 *       { playerId: 'p2', grossScore: 4, handicap: 0 },
 *     ];
 *     const hole: Hole = { number: 1, par: 4, strokeIndex: 1, yardages: {} };
 *
 *     const result = calculateBestBallHole(teamScores, hole);
 *
 *     expect(result.bestNetScore).toBe(4);
 *     expect(result.contributingPlayerId).toBe('p1');
 *   });
 * });
 * ```
 */
export function calculateBestBallHole(
  teamScores: TeamMemberScore[],
  hole: Hole
): BestBallHoleResult {
  if (teamScores.length === 0) {
    throw new Error('Team must have at least one player');
  }

  const netScores = teamScores.map((member) => ({
    playerId: member.playerId,
    netScore: calculateNetScore(member.grossScore, member.handicap, hole),
  }));

  // Sort by net score (ascending) to find best
  const sorted = [...netScores].sort((a, b) => a.netScore - b.netScore);
  const best = sorted[0];

  return {
    bestNetScore: best.netScore,
    contributingPlayerId: best.playerId,
    allNetScores: netScores,
  };
}

/**
 * Calculate the scramble result for a single hole.
 *
 * In scramble format, the team plays one ball and selects the best shot
 * each time. The team handicap is applied to the single team score.
 *
 * @param teamScore - The team's gross score on the hole
 * @param teamHandicap - The calculated team handicap
 * @param hole - The hole being scored (includes par and stroke index)
 * @returns The team's net score for the hole
 *
 * @example
 * ```typescript
 * const hole: Hole = { number: 1, par: 4, strokeIndex: 3, yardages: {} };
 *
 * // Team with handicap 12 scores 5 on stroke index 3 hole
 * // Strokes received: floor(12/18) + (3 <= 12%18 ? 1 : 0) = 0 + 1 = 1
 * const netScore = calculateScrambleHole(5, 12, hole);
 * // netScore = 5 - 1 = 4
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('calculateScrambleHole', () => {
 *   it('applies team handicap to team score', () => {
 *     const hole: Hole = { number: 1, par: 4, strokeIndex: 1, yardages: {} };
 *
 *     const netScore = calculateScrambleHole(5, 18, hole);
 *
 *     // Handicap 18 gets 1 stroke on every hole
 *     expect(netScore).toBe(4);
 *   });
 *
 *   it('handles high team handicap correctly', () => {
 *     const hole: Hole = { number: 1, par: 4, strokeIndex: 1, yardages: {} };
 *
 *     const netScore = calculateScrambleHole(6, 36, hole);
 *
 *     // Handicap 36 gets 2 strokes on every hole
 *     expect(netScore).toBe(4);
 *   });
 * });
 * ```
 */
export function calculateScrambleHole(
  teamScore: number,
  teamHandicap: number,
  hole: Hole
): number {
  return calculateNetScore(teamScore, teamHandicap, hole);
}

/**
 * Result of computing the team's best ball stableford points across the round so far.
 */
export interface BestBallTeamPointsResult {
  /** Sum of best-of-team stableford points across every fully scored hole. */
  totalPoints: number;
  /** Number of holes that contributed (i.e. had at least one valid score). */
  holesScored: number;
}

function getStrokesFromScore(
  score: HoleScore | MultiBallHoleScore | undefined
): number | undefined {
  if (!score) return undefined;
  if (!isSingleBallScore(score)) return undefined;
  return score.strokes;
}

/**
 * Compute the running best-ball stableford total for a team.
 *
 * For each hole, calculates each member's stableford points (treating pickups
 * as zero) and adds the team's best (max) score to the running total. Holes
 * with no scored members are skipped — they remain "in progress".
 */
export function getBestBallTeamPoints(
  team: TeamWithMembers,
  holes: Hole[],
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined,
  dailyHandicaps?: Record<string, number>
): BestBallTeamPointsResult {
  let totalPoints = 0;
  let holesScored = 0;
  const members = team.members ?? [];

  for (const hole of holes) {
    let bestForHole: number | null = null;
    for (const member of members) {
      const player = member.player;
      if (!player) continue;
      const rawStrokes = getStrokesFromScore(getPlayerScore(player.id, hole.number));
      if (!rawStrokes) continue;
      // Score off the round's daily (playing) handicap — matching the scorecard
      // and the team leaderboard — falling back to the raw index when unknown.
      const handicap = dailyHandicaps?.[player.id] ?? player.handicap ?? 0;
      const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
      const effectiveStrokes = getEffectiveGrossStrokes(rawStrokes, hole.par, strokesReceived);
      if (effectiveStrokes === null) continue;
      const points = calculateStablefordPointsNet(effectiveStrokes, hole.par, strokesReceived);
      if (bestForHole === null || points > bestForHole) {
        bestForHole = points;
      }
    }
    if (bestForHole !== null) {
      totalPoints += bestForHole;
      holesScored += 1;
    }
  }

  return { totalPoints, holesScored };
}

/**
 * Result of identifying the contributing player on a single best-ball hole.
 */
export interface BestBallHoleContribution {
  playerId: string;
  playerName: string;
  points: number;
}

/**
 * Identify which team member contributes the team's best-ball points on a
 * specific hole. Returns null when no member has a scored result yet (or
 * everyone picked up).
 *
 * Ties resolve to the first member encountered, matching the BestBallScoreView
 * "first equal score wins" rule.
 */
export function getBestBallHoleContribution(
  team: TeamWithMembers,
  hole: Hole,
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined,
  dailyHandicaps?: Record<string, number>
): BestBallHoleContribution | null {
  let best: BestBallHoleContribution | null = null;
  for (const member of team.members ?? []) {
    const player = member.player;
    if (!player) continue;
    const rawStrokes = getStrokesFromScore(getPlayerScore(player.id, hole.number));
    if (!rawStrokes) continue;
    const handicap = dailyHandicaps?.[player.id] ?? player.handicap ?? 0;
    const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
    const effectiveStrokes = getEffectiveGrossStrokes(rawStrokes, hole.par, strokesReceived);
    if (effectiveStrokes === null) continue;
    const points = calculateStablefordPointsNet(effectiveStrokes, hole.par, strokesReceived);
    if (!best || points > best.points) {
      best = { playerId: player.id, playerName: player.name, points };
    }
  }
  return best;
}

/**
 * Convention for how a given (teamFormat, gameType) combination ranks teams.
 * - 'desc' → higher value wins (stableford points; par-game points)
 * - 'asc'  → lower value wins (stroke-play net strokes)
 */
function getTeamSortDirection(gameType: GameType): 'asc' | 'desc' {
  return gameType === 'stableford' || gameType === 'par' ? 'desc' : 'asc';
}

/**
 * Compute the per-hole contribution of a single sub-group of players (a
 * sub-match side, or the full team if there are no sub-matches).
 *
 * Returns the team-side hole total (best-ball: best player's value;
 * aggregate: sum of all members) plus a per-player attribution map so the
 * caller can build per-member running totals — i.e. how many points each
 * player contributed to the team net via best-ball.
 *
 * - Best-ball: only the contributing player gets points on this hole;
 *   ties resolve to the first member encountered (matching the
 *   BestBallScoreView "first-equal wins" convention).
 * - Aggregate: every player gets credited for their own per-hole value.
 *
 * Returns null when no player in the group has a usable score for this hole.
 */
function getGroupHoleScore(
  playerIds: string[],
  team: TeamWithMembers,
  hole: Hole,
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined,
  gameType: GameType,
  teamFormat: TeamFormat,
  dailyHandicaps?: Record<string, number>
): { holeTotal: number; contributors: Map<string, number> } | null {
  const memberById = new Map<string, TeamWithMembers['members'][number]>();
  for (const member of team.members ?? []) {
    memberById.set(member.player_id, member);
  }

  const memberValues: { playerId: string; value: number }[] = [];
  for (const playerId of playerIds) {
    const member = memberById.get(playerId);
    const player = member?.player;
    if (!player) continue;
    const rawStrokes = getStrokesFromScore(getPlayerScore(player.id, hole.number));
    if (!rawStrokes) continue;
    // Score off the round's daily (playing) handicap — matching the scorecard
    // and the individual leaderboards — falling back to the raw index only when
    // no daily handicap is known.
    const handicap = dailyHandicaps?.[player.id] ?? player.handicap ?? 0;
    const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
    // Pickups (>= PICKUP_SCORE) resolve to WHS net double bogey rather than
    // being dropped, matching how the scorecard and individual boards count them.
    const effectiveStrokes = getEffectiveGrossStrokes(rawStrokes, hole.par, strokesReceived);
    if (effectiveStrokes === null) continue;
    let value: number;
    if (gameType === 'stableford') {
      value = calculateStablefordPointsNet(effectiveStrokes, hole.par, strokesReceived);
    } else if (gameType === 'par') {
      value = calculateParScore(effectiveStrokes, hole.par, strokesReceived);
    } else {
      // stroke (and any other stroke-based variant): net strokes for the hole.
      value = effectiveStrokes - strokesReceived;
    }
    memberValues.push({ playerId: player.id, value });
  }

  if (memberValues.length === 0) return null;

  if (teamFormat === 'best-ball') {
    // Higher-is-better → max; lower-is-better → min. Find the first member
    // that ties or beats the running best (matches the "first-equal wins"
    // convention used elsewhere in the best-ball UI).
    const better = getTeamSortDirection(gameType) === 'desc'
      ? (a: number, b: number) => a > b
      : (a: number, b: number) => a < b;
    let best = memberValues[0];
    for (let i = 1; i < memberValues.length; i++) {
      if (better(memberValues[i].value, best.value)) best = memberValues[i];
    }
    const contributors = new Map<string, number>();
    contributors.set(best.playerId, best.value);
    return { holeTotal: best.value, contributors };
  }

  // Aggregate: sum every member's contribution and credit each individually.
  let total = 0;
  const contributors = new Map<string, number>();
  for (const { playerId, value } of memberValues) {
    total += value;
    contributors.set(playerId, (contributors.get(playerId) ?? 0) + value);
  }
  return { holeTotal: total, contributors };
}

/**
 * Build the list of player-id groups that contribute to a team's score on a
 * given hole.
 *
 * - Without sub-matches: a single group containing every team member. This
 *   is the default for non-split rounds where the team and the playing
 *   group are the same.
 * - With sub-matches (split rounds): one group per sub-match side that the
 *   team is on. A 4v4 split into two 2v2 sub-matches yields two groups,
 *   each with the two members on that sub-match. Best-ball is computed
 *   independently within each group, then the per-hole results are summed
 *   into the team total.
 */
function getTeamGroupsForRound(
  team: TeamWithMembers,
  subMatches: SubMatch[] | undefined
): string[][] {
  const allMemberIds = (team.members ?? []).map((m) => m.player_id);
  if (!subMatches || subMatches.length === 0) {
    return [allMemberIds];
  }

  const memberSet = new Set(allMemberIds);
  const groups: string[][] = [];
  for (const sm of subMatches) {
    const aOnTeam = sm.team_a_player_ids.filter((id) => memberSet.has(id));
    const bOnTeam = sm.team_b_player_ids.filter((id) => memberSet.has(id));
    // A sub-match is cross-team — at most one side will overlap with this
    // team. Whichever side does, becomes a group.
    if (aOnTeam.length > 0) groups.push(aOnTeam);
    if (bOnTeam.length > 0) groups.push(bOnTeam);
  }

  // Defensive: if the team's members aren't referenced by any sub-match
  // (mis-configured round), fall back to whole-team aggregation rather than
  // returning a zero score.
  if (groups.length === 0) return [allMemberIds];
  return groups;
}

interface BuildLiveTeamEntriesParams {
  teams: TeamWithMembers[];
  holes: Hole[];
  gameType: GameType;
  teamFormat: TeamFormat;
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  /** Optional sub-matches for split team rounds. When provided, each team's
   *  score is summed across its sub-match contributions: best-ball is
   *  computed independently per sub-match (max of that sub-match's two
   *  members), not across the whole team. Omit (or pass empty) for plain
   *  team rounds where the team and the playing group are the same. */
  subMatches?: SubMatch[];
  /** Map of playerId → daily (playing) handicap so per-member scoring matches
   *  the scorecard. Prefer the round's `daily_handicap_used`; falls back to the
   *  raw profile index per player when absent. */
  dailyHandicaps?: Record<string, number>;
}

/**
 * Build live team leaderboard entries from in-progress scorecards.
 *
 * The server-side leaderboard (`round_results`) only populates on
 * finalization, so during a round in progress we compute teams' running
 * scores client-side from `getPlayerScore`. The output shape matches the
 * server's `TeamLeaderboardEntry` so consumers (TeamLeaderboardView) don't
 * need to know which source produced the entries.
 *
 * - `teamScore` is summed across every hole that has at least one usable
 *   member score. Empty holes are skipped, not zeroed.
 * - For split rounds, sub-match contributions are computed independently
 *   then summed — best-ball means "best within each sub-match", not "best
 *   across the whole team".
 * - Position is assigned 1..N after sorting by `gameType` direction.
 */
export function buildLiveTeamEntries({
  teams,
  holes,
  gameType,
  teamFormat,
  getPlayerScore,
  subMatches,
  dailyHandicaps,
}: BuildLiveTeamEntriesParams): TeamLeaderboardEntry[] {
  const entries = teams.map((team) => {
    const groups = getTeamGroupsForRound(team, subMatches);
    const contributedByPlayer = new Map<string, number>();
    let total = 0;
    for (const hole of holes) {
      let holeTotal = 0;
      let anyContribution = false;
      for (const group of groups) {
        const result = getGroupHoleScore(group, team, hole, getPlayerScore, gameType, teamFormat, dailyHandicaps);
        if (result !== null) {
          holeTotal += result.holeTotal;
          anyContribution = true;
          for (const [playerId, value] of result.contributors) {
            contributedByPlayer.set(
              playerId,
              (contributedByPlayer.get(playerId) ?? 0) + value
            );
          }
        }
      }
      if (anyContribution) total += holeTotal;
    }
    return {
      isTeamResult: true as const,
      position: 0, // assigned below after sorting
      competitionPoints: 0,
      bypassed: false,
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color ?? null,
      members: (team.members ?? []).map((m) => ({
        playerId: m.player_id,
        playerName: m.player?.name ?? 'Unknown',
        handicap: dailyHandicaps?.[m.player_id] ?? m.player?.handicap ?? 0,
        contributedScore: contributedByPlayer.get(m.player_id) ?? 0,
      })),
      scoreData: {
        type: 'team' as const,
        teamScore: total,
        teamFormat,
      },
    } satisfies TeamLeaderboardEntry;
  });

  const direction = getTeamSortDirection(gameType);
  entries.sort((a, b) => {
    const aScore = a.scoreData.type === 'team' ? a.scoreData.teamScore : 0;
    const bScore = b.scoreData.type === 'team' ? b.scoreData.teamScore : 0;
    return direction === 'asc' ? aScore - bScore : bScore - aScore;
  });

  entries.forEach((entry, i) => {
    entry.position = i + 1;
  });

  return entries;
}
