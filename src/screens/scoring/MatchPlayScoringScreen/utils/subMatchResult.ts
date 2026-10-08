/**
 * buildSinglesSubMatchResult
 *
 * The sub-match row MatchPlayScoringScreen writes on submit for a split
 * singles round (one `sub_matches` row per 1v1 match). finalizeRoundStatus
 * completes a split round only once every sub-match is terminal, so without
 * this write a split singles competition round never completes. Mirrors
 * TeamMatchPlayScoringScreen's handlePersistSubMatchResult:
 *  - only once the match is decided (`matchStatus.status === 'complete'`);
 *  - never over an organiser's manual result;
 *  - `finalDifferential` is the hole lead at close (0 when halved).
 * Returns null when there is nothing to write (not a split round, no
 * sub-match pairs these two players, match not finished, manual result).
 */
import type { SubMatch } from '@/types/database';
import type { HoleResult, MatchStatus } from '../types';

export interface SinglesSubMatchResult {
  subMatchId: string;
  result: 'a-wins' | 'b-wins' | 'halved';
  finalDifferential: number;
}

type SubMatchSides = Pick<SubMatch, 'id' | 'team_a_player_ids' | 'team_b_player_ids' | 'manual_result'>;

export function buildSinglesSubMatchResult(
  subMatches: SubMatchSides[] | undefined,
  player1Id: string,
  player2Id: string,
  matchStatus: MatchStatus,
  holeResults: Record<number, HoleResult>
): SinglesSubMatchResult | null {
  if (matchStatus.status !== 'complete') return null;

  const subMatch = subMatches?.find(
    (sm) =>
      (sm.team_a_player_ids.includes(player1Id) && sm.team_b_player_ids.includes(player2Id)) ||
      (sm.team_a_player_ids.includes(player2Id) && sm.team_b_player_ids.includes(player1Id))
  );
  if (!subMatch || subMatch.manual_result) return null;

  if (matchStatus.winner === 'halved') {
    return { subMatchId: subMatch.id, result: 'halved', finalDifferential: 0 };
  }

  let player1Lead = 0;
  for (const hole of Object.values(holeResults)) {
    if (hole?.winner === 'player1') player1Lead++;
    else if (hole?.winner === 'player2') player1Lead--;
  }

  const player1IsTeamA = subMatch.team_a_player_ids.includes(player1Id);
  const teamAWon = (matchStatus.winner === 'player1') === player1IsTeamA;
  return {
    subMatchId: subMatch.id,
    result: teamAWon ? 'a-wins' : 'b-wins',
    finalDifferential: Math.abs(player1Lead),
  };
}
