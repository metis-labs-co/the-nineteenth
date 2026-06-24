import type { GameType, TeamFormat, Hole } from '@/types';
import { calculateTeamMatchData } from '@/components/scorecard/TeamMatchPlayScorecardTable/utils';
import { calculateMatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations';
import type { MatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';

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
