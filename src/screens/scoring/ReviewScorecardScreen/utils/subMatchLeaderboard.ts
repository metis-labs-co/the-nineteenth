import type { GameType, TeamFormat, Hole } from '@/types';
import { calculateTeamMatchData } from '@/components/scorecard/TeamMatchPlayScorecardTable/utils';
import { calculateMatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations';
import type { MatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';
import { getStrokesReceived, calculateStablefordPoints } from '@/utils/scoring';
import { computeAltShotTeamRoundScore } from '@/utils/teamScoring/altShot';
import type { AltShotTeamMember } from '@/utils/teamScoring/altShot';
import type { Scorecard } from '@/types/database/scorecard.types';

/** Which scoring model a sub-match round uses for its per-match display. */
export type SubMatchModel = 'match-play' | 'alt-shot' | 'aggregate' | 'best-ball';

/** A player on one side of a sub-match, with their *playing* handicap. */
export interface SubMatchPlayer {
  id: string;
  name: string;
  handicap: number;
}

/** The two sides of a sub-match. `a` = team_a_player_ids, `b` = team_b_player_ids. */
export interface SubMatchSides {
  a: SubMatchPlayer[];
  b: SubMatchPlayer[];
}

/** Reads a player's gross strokes for a hole from the in-progress store. */
export type GetStrokes = (playerId: string, holeNumber: number) => number | undefined;

/**
 * Resolve the per-sub-match scoring model from the round's game type and team
 * format. Match play wins regardless of team_format (covers singles and
 * Ryder-Cup singles). Otherwise team_format selects net vs. points.
 */
export function resolveSubMatchModel(
  gameType: GameType,
  teamFormat: TeamFormat | null | undefined
): SubMatchModel {
  if (gameType === 'match-play') return 'match-play';
  if (teamFormat === 'alt-shot') return 'alt-shot';
  if (teamFormat === 'best-ball') return 'best-ball';
  return 'aggregate';
}

export interface MatchPlayRowData {
  /** Centered status: 'A/S' | '2 UP' | '3&2'. */
  statusText: string;
  /** Side currently ahead (colours the status); null when level. */
  leaderSide: 'a' | 'b' | null;
  isComplete: boolean;
  /** True once at least one hole has been decided. */
  hasScores: boolean;
}

function toMatchSide(players: SubMatchPlayer[], id: string): MatchTeam {
  return {
    id,
    name: id,
    handicap: 0,
    members: players.map((p) => ({
      id: p.id,
      name: p.name,
      handicap: p.handicap,
      score: null,
      pickedUp: false,
    })),
  };
}

/** Normalise the engine's margin string to the compact display form. */
function normaliseMargin(margin: string): string {
  if (margin === 'All Square') return 'A/S';
  if (margin.includes('&')) return margin.replace(/\s+/g, ''); // '3 & 2' -> '3&2'
  if (margin.toLowerCase().endsWith('up')) return `${margin.split(' ')[0]} UP`; // '2 up' -> '2 UP'
  return margin;
}

export function computeMatchPlaySubMatch(
  sides: SubMatchSides,
  holes: Hole[],
  getStrokes: GetStrokes
): MatchPlayRowData {
  const team1 = toMatchSide(sides.a, 'a');
  const team2 = toMatchSide(sides.b, 'b');
  const calc = calculateTeamMatchData(holes, team1, team2, getStrokes);
  // Pass holes.length as totalHoles so dormie/close-out is detected for the
  // round's actual hole count (the engine otherwise defaults to 18).
  const status = calculateMatchStatus(calc.holeResults, holes.length);
  const hasScores = Object.values(calc.holeResults).some((r) => r.winner !== null);

  if (status.status === 'complete') {
    if (status.winner === 'halved') {
      return { statusText: 'A/S', leaderSide: null, isComplete: true, hasScores };
    }
    return {
      statusText: normaliseMargin(status.margin),
      leaderSide: status.winner === 'player1' ? 'a' : 'b',
      isComplete: true,
      hasScores,
    };
  }

  if (status.leader === null) {
    return { statusText: 'A/S', leaderSide: null, isComplete: false, hasScores };
  }
  return {
    statusText: `${status.holesUp} UP`,
    leaderSide: status.leader === 'player1' ? 'a' : 'b',
    isComplete: false,
    hasScores,
  };
}

export interface NetCardData {
  /** Side A's net (alt-shot/aggregate) or points (best-ball); null if unscored. */
  valueA: number | null;
  valueB: number | null;
  /** '' for net strokes, ' pts' for best-ball stableford. */
  unit: '' | ' pts';
  leaderSide: 'a' | 'b' | null;
  /** Absolute lead magnitude (0 until both sides have scores). */
  diff: number;
  hasScores: boolean;
}

interface SideValue {
  value: number;
  hasScores: boolean;
}

/** Alt-shot pair net via the canonical engine (synthetic in-progress cards). */
function altShotSideNet(players: SubMatchPlayer[], holes: Hole[], getStrokes: GetStrokes): SideValue {
  const scores: Record<string, { strokes: number }> = {};
  let holesScored = 0;
  // Both partners share one ball; read from the first member.
  const ballPlayerId = players[0]?.id;
  for (const h of holes) {
    const s = ballPlayerId ? getStrokes(ballPlayerId, h.number) : undefined;
    if (typeof s === 'number' && s > 0) {
      scores[String(h.number)] = { strokes: s };
      holesScored++;
    }
  }
  const synthetic = players.map(
    (p) =>
      ({ player_id: p.id, daily_handicap_used: p.handicap, scores, total_gross: 0 } as unknown as Scorecard)
  );
  const members: AltShotTeamMember[] = players.map((p) => ({ player_id: p.id, handicap: p.handicap }));
  const result = computeAltShotTeamRoundScore(synthetic, members);
  return { value: result.teamNet, hasScores: holesScored > 0 };
}

/** Aggregate net: sum of each member's per-hole net across scored holes. */
function aggregateSideNet(players: SubMatchPlayer[], holes: Hole[], getStrokes: GetStrokes): SideValue {
  let total = 0;
  let scored = false;
  for (const p of players) {
    for (const h of holes) {
      const s = getStrokes(p.id, h.number);
      if (typeof s === 'number' && s > 0) {
        total += s - getStrokesReceived(p.handicap, h.strokeIndex);
        scored = true;
      }
    }
  }
  return { value: total, hasScores: scored };
}

/** Best-ball: sum of the best stableford points among the side per hole. */
function bestBallSidePoints(players: SubMatchPlayer[], holes: Hole[], getStrokes: GetStrokes): SideValue {
  let total = 0;
  let scored = false;
  for (const h of holes) {
    let best: number | null = null;
    for (const p of players) {
      const s = getStrokes(p.id, h.number);
      if (typeof s === 'number' && s > 0) {
        const pts = calculateStablefordPoints(s, p.handicap, h);
        if (best === null || pts > best) best = pts;
      }
    }
    if (best !== null) {
      total += best;
      scored = true;
    }
  }
  return { value: total, hasScores: scored };
}

function finalise(a: SideValue, b: SideValue, higherWins: boolean, unit: '' | ' pts'): NetCardData {
  let leaderSide: 'a' | 'b' | null = null;
  let diff = 0;
  if (a.hasScores && b.hasScores && a.value !== b.value) {
    const aLeads = higherWins ? a.value > b.value : a.value < b.value;
    leaderSide = aLeads ? 'a' : 'b';
    diff = Math.abs(a.value - b.value);
  }
  return {
    valueA: a.hasScores ? a.value : null,
    valueB: b.hasScores ? b.value : null,
    unit,
    leaderSide,
    diff,
    hasScores: a.hasScores || b.hasScores,
  };
}

export function computeNetSubMatch(
  model: Exclude<SubMatchModel, 'match-play'>,
  sides: SubMatchSides,
  holes: Hole[],
  getStrokes: GetStrokes
): NetCardData {
  if (model === 'best-ball') {
    return finalise(
      bestBallSidePoints(sides.a, holes, getStrokes),
      bestBallSidePoints(sides.b, holes, getStrokes),
      true,
      ' pts'
    );
  }
  const sideNet = model === 'alt-shot' ? altShotSideNet : aggregateSideNet;
  return finalise(sideNet(sides.a, holes, getStrokes), sideNet(sides.b, holes, getStrokes), false, '');
}

export interface SubMatchLeader {
  leaderSide: 'a' | 'b' | null;
  hasScores: boolean;
}

/**
 * Live projected Team A vs Team B tally: the side currently ahead in a
 * sub-match earns 1 point, a level-but-started sub-match splits 0.5/0.5, and an
 * unstarted sub-match contributes nothing.
 */
export function tallyOverall(results: SubMatchLeader[]): { pointsA: number; pointsB: number } {
  let pointsA = 0;
  let pointsB = 0;
  for (const r of results) {
    if (!r.hasScores) continue;
    if (r.leaderSide === 'a') pointsA += 1;
    else if (r.leaderSide === 'b') pointsB += 1;
    else {
      pointsA += 0.5;
      pointsB += 0.5;
    }
  }
  return { pointsA, pointsB };
}
