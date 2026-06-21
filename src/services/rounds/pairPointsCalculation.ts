/**
 * Pair-Points Calculation Helpers (pure)
 *
 * Supports R2 pair-points finalization for split (Ryder-Cup-style) rounds —
 * e.g. "Pairs Better Ball" where two competition teams each split into 2-player
 * pairs that play head-to-head sub-matches.
 *
 * These helpers let `finalizePairResults` derive a sub-match's outcome from the
 * players' scorecards (best-ball within each pair) when the sub-match's result
 * wasn't explicitly persisted, and map each sub-match side back to the owning
 * competition team. They mirror the live round-leaderboard computation in
 * `src/utils/teamScoring/calculations.ts` so the competition leaderboard agrees
 * with what players see on the round screen.
 *
 * Pure: no IO, no DB. The DB-facing wrapper lives in `finalizePairResults`.
 */

import type { Hole } from '@/types/database.types';
import { calculateAltShotTeamHandicap } from '@/utils/teamScoring/altShot';

export type SideOutcome = 'a-wins' | 'b-wins' | 'halved';

/**
 * Best-ball total for one side (pair) of a sub-match across the supplied holes.
 *
 * For each hole, takes the single best per-hole value among the side's players
 * (max when higher-is-better — stableford/par; min when lower-is-better —
 * stroke). Holes where no player has a usable value are skipped. Returns null
 * when the side has no usable scores on any hole at all (so the caller can
 * treat the sub-match as not-yet-playable rather than a 0).
 */
export function sideBestBallTotal(
  playerIds: string[],
  holes: Hole[],
  getHoleValue: (playerId: string, hole: Hole) => number | null,
  higherIsBetter: boolean
): number | null {
  let total = 0;
  let anyHole = false;
  for (const hole of holes) {
    let best: number | null = null;
    for (const playerId of playerIds) {
      const value = getHoleValue(playerId, hole);
      if (value === null) continue;
      if (best === null || (higherIsBetter ? value > best : value < best)) {
        best = value;
      }
    }
    if (best !== null) {
      total += best;
      anyHole = true;
    }
  }
  return anyHole ? total : null;
}

/**
 * Decide a sub-match outcome by comparing each side's best-ball total computed
 * from scorecards. Returns null when either side has no usable scores yet —
 * the sub-match can't be decided and should be skipped by the caller.
 */
export function resolveSubMatchOutcomeFromScores(params: {
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  holes: Hole[];
  getHoleValue: (playerId: string, hole: Hole) => number | null;
  higherIsBetter: boolean;
}): SideOutcome | null {
  const { teamAPlayerIds, teamBPlayerIds, holes, getHoleValue, higherIsBetter } =
    params;
  const aTotal = sideBestBallTotal(teamAPlayerIds, holes, getHoleValue, higherIsBetter);
  const bTotal = sideBestBallTotal(teamBPlayerIds, holes, getHoleValue, higherIsBetter);
  if (aTotal === null || bTotal === null) return null;
  if (aTotal === bTotal) return 'halved';
  const aBeatsB = higherIsBetter ? aTotal > bTotal : aTotal < bTotal;
  return aBeatsB ? 'a-wins' : 'b-wins';
}

/**
 * Map a sub-match's two sides to the competition teams that own them, by member
 * lookup. Returns null when a side can't be resolved to exactly one team, or
 * when both sides resolve to the same team (mis-configured sub-match).
 */
export function deriveSideTeamIds(params: {
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  teams: { id: string; memberIds: string[] }[];
}): { sideATeamId: string; sideBTeamId: string } | null {
  const { teamAPlayerIds, teamBPlayerIds, teams } = params;

  const playerToTeam = new Map<string, string>();
  for (const team of teams) {
    for (const memberId of team.memberIds) {
      playerToTeam.set(memberId, team.id);
    }
  }

  // Resolve a set of players to the single team that owns all of them. null
  // when any player is unknown or the players span more than one team.
  const resolveSide = (playerIds: string[]): string | null => {
    if (playerIds.length === 0) return null;
    let teamId: string | null = null;
    for (const playerId of playerIds) {
      const owner = playerToTeam.get(playerId);
      if (!owner) return null;
      if (teamId === null) teamId = owner;
      else if (teamId !== owner) return null;
    }
    return teamId;
  };

  const sideATeamId = resolveSide(teamAPlayerIds);
  const sideBTeamId = resolveSide(teamBPlayerIds);
  if (!sideATeamId || !sideBTeamId) return null;
  if (sideATeamId === sideBTeamId) return null;
  return { sideATeamId, sideBTeamId };
}

/**
 * One side's single-ball gross total. Both partners record the same ball, so
 * for each hole take the first partner who has a recorded gross. Returns null
 * when the side has no usable scores on any hole.
 */
function sideOneBallGross(
  playerIds: string[],
  holes: Hole[],
  getGross: (playerId: string, hole: Hole) => number | null
): number | null {
  let total = 0;
  let anyHole = false;
  for (const hole of holes) {
    let holeGross: number | null = null;
    for (const playerId of playerIds) {
      const g = getGross(playerId, hole);
      if (g != null) {
        holeGross = g;
        break;
      }
    }
    if (holeGross != null) {
      total += holeGross;
      anyHole = true;
    }
  }
  return anyHole ? total : null;
}

/** 50%-combined team handicap for one side from the daily-handicap map. */
function sideTeamHandicap(
  playerIds: string[],
  dailyHandicaps: Map<string, number>
): number {
  return calculateAltShotTeamHandicap(
    playerIds.map((id) => ({ handicap: dailyHandicaps.get(id) ?? 0 }))
  );
}

/**
 * Decide an Alt Shot (foursomes) sub-match. Each side plays one ball off its
 * 50%-combined handicap; the higher-handicap side receives the rounded
 * difference in strokes (allocation is immaterial to a total comparison), and
 * the lower net total wins. Returns null when either side has no usable scores.
 */
export function resolveAltShotSubMatchOutcome(params: {
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  holes: Hole[];
  getGross: (playerId: string, hole: Hole) => number | null;
  dailyHandicaps: Map<string, number>;
}): SideOutcome | null {
  const { teamAPlayerIds, teamBPlayerIds, holes, getGross, dailyHandicaps } = params;

  const aGross = sideOneBallGross(teamAPlayerIds, holes, getGross);
  const bGross = sideOneBallGross(teamBPlayerIds, holes, getGross);
  if (aGross === null || bGross === null) return null;

  const aHc = sideTeamHandicap(teamAPlayerIds, dailyHandicaps);
  const bHc = sideTeamHandicap(teamBPlayerIds, dailyHandicaps);
  const diff = Math.round(Math.abs(aHc - bHc)); // nearest; .5 rounds up

  // Higher-handicap side receives `diff` strokes off its total.
  const aNet = aGross - (aHc > bHc ? diff : 0);
  const bNet = bGross - (bHc > aHc ? diff : 0);

  if (aNet === bNet) return 'halved';
  return aNet < bNet ? 'a-wins' : 'b-wins';
}
