import {
  calculateStablefordPoints,
  calculateNetScore,
  calculateParScore,
  getStrokesOnHole,
} from '@/utils/scoring';
import type {
  ComputeContributionsInput,
  ContributionsBoard,
  ContributionRoundInput,
  ContributionTeamInput,
  ContributionFormat,
  GameType,
  Hole,
  PlayerContribution,
  RollupEntry,
  RoundContribution,
  ShotBreakdown,
  TeamContribution,
} from './types';
import { deriveAltShotShotCounts } from '@/utils/teamScoring';
import { PICKUP_SCORE } from '@/constants/scoring';
import type { AltShotPairInput } from './types';

/** Higher value wins for stableford/par; lower (net strokes) wins otherwise. */
function higherIsBetter(gameType: GameType): boolean {
  return gameType === 'stableford' || gameType === 'par';
}

/**
 * Per-player "goodness" value on a hole for the given game type.
 *
 * Signature notes (actual scoring.ts signatures):
 *   calculateNetScore(grossScore, playerHandicap, hole) — returns net strokes
 *   calculateStablefordPoints(grossScore, playerHandicap, hole) — returns points
 *   calculateParScore(strokes, par, strokesReceived) — takes pre-computed strokes,
 *     NOT a Hole; we must call getStrokesOnHole(handicap, hole) first.
 */
function holeValue(
  strokes: number | undefined,
  handicap: number,
  hole: Hole,
  gameType: GameType
): number | null {
  if (!strokes || strokes >= PICKUP_SCORE) return null;
  if (gameType === 'stableford') return calculateStablefordPoints(strokes, handicap, hole);
  if (gameType === 'par') {
    const strokesReceived = getStrokesOnHole(handicap, hole);
    return calculateParScore(strokes, hole.par, strokesReceived);
  }
  return calculateNetScore(strokes, handicap, hole);
}

/** Stableford points — used for aggregate share math regardless of round game type. */
function aggregateValue(
  strokes: number | undefined,
  handicap: number,
  hole: Hole
): number | null {
  if (!strokes || strokes >= PICKUP_SCORE) return null;
  return calculateStablefordPoints(strokes, handicap, hole);
}

const METRIC_LABEL: Record<ContributionFormat, string> = {
  'best-ball': 'holes won',
  scramble: 'shots used',
  shamble: 'drives + holes won',
  aggregate: 'points',
  'alt-shot': 'shots used',
};

function rank(players: PlayerContribution[]): PlayerContribution[] {
  const sorted = [...players].sort((a, b) => b.value - a.value);
  const top = sorted.length ? sorted[0].value : 0;
  let lastValue = Number.POSITIVE_INFINITY;
  let lastPos = 0;
  sorted.forEach((p, i) => {
    if (p.value < lastValue) {
      lastPos = i + 1;
      lastValue = p.value;
    }
    p.position = lastPos;
    p.isMvp = top > 0 && p.value === top;
  });
  return sorted;
}

/** Best-ball holes-won with 0.5 tie-splitting. */
function holesWonByPlayer(
  team: ContributionTeamInput,
  holes: Hole[],
  gameType: GameType
): { won: Map<string, number>; holesScored: number } {
  const won = new Map<string, number>();
  team.members.forEach((m) => won.set(m.playerId, 0));
  let holesScored = 0;

  for (const hole of holes) {
    const values: { playerId: string; value: number }[] = [];
    for (const m of team.members) {
      const v = holeValue(
        team.strokesByPlayerHole[m.playerId]?.[hole.number],
        m.handicap,
        hole,
        gameType
      );
      if (v !== null) values.push({ playerId: m.playerId, value: v });
    }
    if (values.length === 0) continue;
    holesScored += 1;

    const best = higherIsBetter(gameType)
      ? Math.max(...values.map((v) => v.value))
      : Math.min(...values.map((v) => v.value));
    const winners = values.filter((v) => v.value === best);
    const credit = 1 / winners.length;
    for (const w of winners) won.set(w.playerId, (won.get(w.playerId) ?? 0) + credit);
  }

  return { won, holesScored };
}

function computeBestBallTeam(
  team: ContributionTeamInput,
  holes: Hole[],
  gameType: GameType
): TeamContribution {
  const { won, holesScored } = holesWonByPlayer(team, holes, gameType);
  const players: PlayerContribution[] = team.members.map((m) => {
    const value = won.get(m.playerId) ?? 0;
    return {
      playerId: m.playerId,
      playerName: m.playerName,
      value,
      share: holesScored > 0 ? value / holesScored : 0,
      position: 0,
      isMvp: false,
    };
  });
  return {
    teamId: team.teamId,
    teamName: team.teamName,
    color: team.color,
    players: rank(players),
  };
}

function computeAggregateTeam(
  team: ContributionTeamInput,
  holes: Hole[]
): TeamContribution {
  const points = new Map<string, number>();
  team.members.forEach((m) => points.set(m.playerId, 0));
  for (const hole of holes) {
    for (const m of team.members) {
      const v = aggregateValue(
        team.strokesByPlayerHole[m.playerId]?.[hole.number],
        m.handicap,
        hole
      );
      if (v !== null) points.set(m.playerId, (points.get(m.playerId) ?? 0) + v);
    }
  }
  const teamTotal = [...points.values()].reduce((s, v) => s + v, 0);
  const players: PlayerContribution[] = team.members.map((m) => {
    const value = points.get(m.playerId) ?? 0;
    return {
      playerId: m.playerId,
      playerName: m.playerName,
      value,
      share: teamTotal > 0 ? value / teamTotal : 0,
      position: 0,
      isMvp: false,
    };
  });
  return {
    teamId: team.teamId,
    teamName: team.teamName,
    color: team.color,
    players: rank(players),
  };
}

const SHOT_KEYS = ['teeShot', 'secondShot', 'approach', 'putt'] as const;

function emptyBreakdown(): ShotBreakdown {
  return { drives: 0, approaches: 0, putts: 0 };
}

/** Count shot slots per player. Returns null when nothing was tracked. */
function countShots(
  team: ContributionTeamInput
): { byPlayer: Map<string, ShotBreakdown>; total: number } | null {
  const byPlayer = new Map<string, ShotBreakdown>();
  team.members.forEach((m) => byPlayer.set(m.playerId, emptyBreakdown()));
  let total = 0;
  const holes = team.shotContributionsByHole ?? {};
  for (const slots of Object.values(holes)) {
    for (const key of SHOT_KEYS) {
      const playerId = slots[key];
      if (!playerId) continue;
      const bd = byPlayer.get(playerId);
      if (!bd) continue;
      if (key === 'teeShot') bd.drives += 1;
      else if (key === 'putt') bd.putts += 1;
      else bd.approaches += 1; // secondShot + approach
      total += 1;
    }
  }
  return total === 0 ? null : { byPlayer, total };
}

function computeScrambleTeam(team: ContributionTeamInput): TeamContribution | null {
  const shots = countShots(team);
  if (!shots) return null; // signal data-missing to caller
  const players: PlayerContribution[] = team.members.map((m) => {
    const bd = shots.byPlayer.get(m.playerId) ?? emptyBreakdown();
    const value = bd.drives + bd.approaches + bd.putts;
    return {
      playerId: m.playerId,
      playerName: m.playerName,
      value,
      share: shots.total > 0 ? value / shots.total : 0,
      shotBreakdown: bd,
      position: 0,
      isMvp: false,
    };
  });
  return { teamId: team.teamId, teamName: team.teamName, color: team.color, players: rank(players) };
}

/** Drives-used share per player; null when no tee-shot data. */
function drivesShare(team: ContributionTeamInput): Map<string, number> | null {
  const holes = team.shotContributionsByHole ?? {};
  const counts = new Map<string, number>();
  team.members.forEach((m) => counts.set(m.playerId, 0));
  let total = 0;
  for (const slots of Object.values(holes)) {
    if (!slots.teeShot) continue;
    if (!counts.has(slots.teeShot)) continue;
    counts.set(slots.teeShot, (counts.get(slots.teeShot) ?? 0) + 1);
    total += 1;
  }
  if (total === 0) return null;
  const share = new Map<string, number>();
  counts.forEach((c, id) => share.set(id, c / total));
  return share;
}

function computeShambleTeam(
  team: ContributionTeamInput,
  holes: Hole[],
  gameType: GameType
): { team: TeamContribution; drivesMissing: boolean } {
  const { won, holesScored } = holesWonByPlayer(team, holes, gameType);
  const drives = drivesShare(team);
  const drivesMissing = drives === null;

  const players: PlayerContribution[] = team.members.map((m) => {
    const holesShare = holesScored > 0 ? (won.get(m.playerId) ?? 0) / holesScored : 0;
    const share = drives ? (holesShare + (drives.get(m.playerId) ?? 0)) / 2 : holesShare;
    return {
      playerId: m.playerId,
      playerName: m.playerName,
      value: won.get(m.playerId) ?? 0,
      share,
      position: 0,
      isMvp: false,
    };
  });
  return {
    team: { teamId: team.teamId, teamName: team.teamName, color: team.color, players: rank(players) },
    drivesMissing,
  };
}

/**
 * Alt-shot per-team contribution, derived from the team's 2-player pairs.
 * Each pair shares one ball; within a hole partners strictly alternate, so
 * per-player shot counts come from the first-tee player + the hole's strokes.
 */
function computeAltShotTeam(
  team: ContributionTeamInput,
  holes: Hole[],
  pairs: AltShotPairInput[]
): TeamContribution | null {
  const memberIds = new Set(team.members.map((m) => m.playerId));
  const teamPairs = pairs.filter(
    (p) => p.playerIds.length >= 2 && p.playerIds.every((id) => memberIds.has(id))
  );

  const byPlayer = new Map<string, ShotBreakdown>();
  team.members.forEach((m) => byPlayer.set(m.playerId, emptyBreakdown()));
  let total = 0;

  for (const pair of teamPairs) {
    const [p0, p1] = pair.playerIds;
    const firstTee = pair.firstTeePlayerId || p0;
    const partner = firstTee === p0 ? p1 : p0;
    for (const hole of holes) {
      const counts = deriveAltShotShotCounts(
        firstTee,
        partner,
        hole.number,
        pair.strokesByHole[hole.number]
      );
      for (const pid of pair.playerIds) {
        const c = counts[pid];
        const bd = byPlayer.get(pid);
        if (!c || !bd) continue;
        bd.drives += c.drives;
        bd.approaches += c.approaches;
        bd.putts += c.putts;
        total += c.total;
      }
    }
  }

  if (total === 0) return null;

  const players: PlayerContribution[] = team.members.map((m) => {
    const bd = byPlayer.get(m.playerId) ?? emptyBreakdown();
    const value = bd.drives + bd.approaches + bd.putts;
    return {
      playerId: m.playerId,
      playerName: m.playerName,
      value,
      share: total > 0 ? value / total : 0,
      shotBreakdown: bd,
      position: 0,
      isMvp: false,
    };
  });

  return { teamId: team.teamId, teamName: team.teamName, color: team.color, players: rank(players) };
}

function computeRound(round: ContributionRoundInput): RoundContribution {
  const base = {
    roundId: round.roundId,
    roundLabel: round.roundLabel,
    format: round.format,
    metricLabel: METRIC_LABEL[round.format],
  };

  if (round.format === 'aggregate') {
    return {
      ...base,
      teams: round.teams.map((t) => computeAggregateTeam(t, round.holes)),
      dataMissing: false,
    };
  }

  if (round.format === 'best-ball') {
    return {
      ...base,
      teams: round.teams.map((t) => computeBestBallTeam(t, round.holes, round.gameType)),
      dataMissing: false,
    };
  }

  if (round.format === 'scramble') {
    const teams = round.teams
      .map((t) => computeScrambleTeam(t))
      .filter((t): t is TeamContribution => t !== null);
    return { ...base, teams, dataMissing: teams.length === 0 };
  }

  if (round.format === 'alt-shot') {
    const pairs = round.altShotPairs ?? [];
    const teams = round.teams
      .map((t) => computeAltShotTeam(t, round.holes, pairs))
      .filter((t): t is TeamContribution => t !== null);
    return { ...base, teams, dataMissing: teams.length === 0 };
  }

  // shamble
  const results = round.teams.map((t) => computeShambleTeam(t, round.holes, round.gameType));
  return {
    ...base,
    teams: results.map((r) => r.team),
    dataMissing: false,
    drivesMissing: results.length > 0 && results.every((r) => r.drivesMissing),
  };
}

function buildRollup(rounds: RoundContribution[]): RollupEntry[] {
  // Average a "pull your weight" index per player across non-missing rounds.
  // Each round's within-team share is normalized by team size (× number of
  // players) so it is comparable across teams of different sizes: a player on
  // a 2-person team and one on a 4-person team are both measured against their
  // own team's equal split. The team's indices average to 1.0 by construction.
  const sum = new Map<string, { name: string; total: number; count: number }>();
  for (const round of rounds) {
    if (round.dataMissing) continue;
    for (const team of round.teams) {
      const teamSize = team.players.length;
      if (teamSize === 0) continue;
      for (const p of team.players) {
        const cur = sum.get(p.playerId) ?? { name: p.playerName, total: 0, count: 0 };
        cur.total += p.share * teamSize;
        cur.count += 1;
        cur.name = p.playerName;
        sum.set(p.playerId, cur);
      }
    }
  }

  const entries: RollupEntry[] = [...sum.entries()].map(([playerId, v]) => ({
    playerId,
    playerName: v.name,
    weightIndex: v.count > 0 ? v.total / v.count : 0,
    roundsCounted: v.count,
    position: 0,
    isMvp: false,
  }));

  entries.sort((a, b) => b.weightIndex - a.weightIndex);
  const top = entries.length ? entries[0].weightIndex : 0;
  let lastValue = Number.POSITIVE_INFINITY;
  let lastPos = 0;
  entries.forEach((e, i) => {
    if (e.weightIndex < lastValue) {
      lastPos = i + 1;
      lastValue = e.weightIndex;
    }
    e.position = lastPos;
    e.isMvp = top > 0 && e.weightIndex === top;
  });
  return entries;
}

export function computeContributions(input: ComputeContributionsInput): ContributionsBoard {
  const rounds = input.rounds.map(computeRound);
  const rollup = buildRollup(rounds);
  const isEmpty = rounds.every((r) => r.dataMissing);
  return { rollup, rounds, isEmpty };
}
