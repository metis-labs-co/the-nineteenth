// src/utils/ringer/types.ts
import type { Hole, DBScorecard } from '@/types';

/** One qualifying round's data, pre-fetched and ready to score. */
export interface RingerRoundInput {
  roundId: string;
  /** Display label, e.g. 'R1' (position among the competition's rounds). */
  roundLabel: string;
  /** Par + stroke index for this round's course. */
  holes: Hole[];
  /** Individual scorecards for this round (one per player who scored). */
  scorecards: DBScorecard[];
}

export interface RingerPlayerMeta {
  playerId: string;
  name: string;
}

export interface RingerTeamInput {
  teamId: string;
  name: string;
  color: string | null;
  memberPlayerIds: string[];
}

/** A single hole of a composite ringer round. */
export interface RingerHole {
  hole: number; // 1..18
  /**
   * Best Stableford points for this hole (0 if the participant has no score).
   * Check `sourceRoundLabel === null` to distinguish a genuine 0 net points
   * from a hole where no score was recorded.
   */
  points: number;
  /** Par of the hole in the source round; null when no score was recorded. */
  par: number | null;
  /** The contributing player's gross strokes on the hole; null when no score. */
  strokes: number | null;
  /** Which round the best came from, e.g. 'R2'; null when no score exists. */
  sourceRoundLabel: string | null;
  /** Contributing player (the player themselves for individuals; the best member for teams). */
  sourcePlayerId: string | null;
}

export interface RingerEntry {
  participantId: string;
  participantName: string;
  isTeam: boolean;
  /** Team colour token (e.g. 'avatar-green'); null for individuals. */
  color: string | null;
  /** One entry per covered hole, in ascending hole order. */
  holes: RingerHole[];
  total: number;
  /** 1-indexed standing; ties share a position. */
  position: number;
  tied: boolean;
}

export interface RingerBoardResult {
  individuals: RingerEntry[];
  teams: RingerEntry[];
  /** Labels of the rounds that fed the board, e.g. ['R1','R2','R3']. */
  includedRoundLabels: string[];
  /** Ordered hole numbers covered (usually [1..18]). */
  holeNumbers: number[];
}

/**
 * Input for building individual and team ringer boards.
 *
 * Note: rounds are expected to cover the same set of holes; `holeNumbers` in
 * the result is their union, so a participant with no score on a hole gets
 * 0 points and a null `sourceRoundLabel`.
 */
export interface ComputeRingerBoardInput {
  rounds: RingerRoundInput[];
  players: RingerPlayerMeta[];
  teams: RingerTeamInput[];
}
