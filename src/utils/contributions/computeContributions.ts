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
  RoundContribution,
  TeamContribution,
} from './types';

const PICKUP_SCORE = 99; // sentinel used elsewhere in the app for picked-up holes

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
  if (!strokes || strokes === PICKUP_SCORE) return null;
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
  if (!strokes || strokes === PICKUP_SCORE) return null;
  return calculateStablefordPoints(strokes, handicap, hole);
}

const METRIC_LABEL: Record<ContributionFormat, string> = {
  'best-ball': 'holes won',
  scramble: 'shots used',
  shamble: 'drives + holes won',
  aggregate: 'points',
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

  // best-ball (scramble/shamble handled in a later task — fall through to best-ball for now)
  return {
    ...base,
    teams: round.teams.map((t) => computeBestBallTeam(t, round.holes, round.gameType)),
    dataMissing: false,
  };
}

export function computeContributions(input: ComputeContributionsInput): ContributionsBoard {
  const rounds = input.rounds.map(computeRound);
  return {
    rollup: [], // filled in a later task
    rounds,
    isEmpty: rounds.length === 0,
  };
}
