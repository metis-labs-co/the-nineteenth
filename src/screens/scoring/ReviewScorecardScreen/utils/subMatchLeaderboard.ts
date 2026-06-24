import type { GameType, TeamFormat } from '@/types';

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
