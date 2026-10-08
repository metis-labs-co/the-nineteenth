/**
 * buildSinglesSubMatchResult — the sub-match write MatchPlayScoringScreen
 * makes on submit for a split singles round, so the round can complete.
 *
 * @see src/screens/scoring/MatchPlayScoringScreen/utils/subMatchResult.ts
 */
import { buildSinglesSubMatchResult } from './subMatchResult';
import type { HoleResult, MatchStatus } from '../types';

type SubMatchRow = { id: string; team_a_player_ids: string[]; team_b_player_ids: string[]; manual_result: boolean };

function subMatch(id: string, a: string, b: string, manual = false): SubMatchRow {
  return { id, team_a_player_ids: [a], team_b_player_ids: [b], manual_result: manual };
}

const SUB_MATCHES = [subMatch('sm-1', 'ann', 'bob'), subMatch('sm-2', 'cat', 'dan')];

/** Holes won by each player, in order: 'p1' / 'p2' / 'h' (halved). */
function holes(results: ('p1' | 'p2' | 'h')[]): Record<number, HoleResult> {
  const out: Record<number, HoleResult> = {};
  results.forEach((r, i) => {
    out[i + 1] = {
      player1Score: 4,
      player2Score: 4,
      player1PickedUp: false,
      player2PickedUp: false,
      winner: r === 'p1' ? 'player1' : r === 'p2' ? 'player2' : 'halved',
    };
  });
  return out;
}

const P1_WINS_3_AND_2: MatchStatus = { status: 'complete', winner: 'player1', margin: '3 & 2' };

describe('buildSinglesSubMatchResult', () => {
  it("records a win for team A when player 1 is on team A, with the hole lead", () => {
    const result = buildSinglesSubMatchResult(
      SUB_MATCHES,
      'cat',
      'dan',
      P1_WINS_3_AND_2,
      holes(['p1', 'p1', 'h', 'p2', 'p1', 'p1'])
    );

    expect(result).toEqual({ subMatchId: 'sm-2', result: 'a-wins', finalDifferential: 3 });
  });

  it('records a win for team B when player 1 is on team B', () => {
    const result = buildSinglesSubMatchResult(
      SUB_MATCHES,
      'bob',
      'ann',
      P1_WINS_3_AND_2,
      holes(['p1', 'p1', 'p1'])
    );

    expect(result).toEqual({ subMatchId: 'sm-1', result: 'b-wins', finalDifferential: 3 });
  });

  it('records a halved match with no differential', () => {
    const result = buildSinglesSubMatchResult(
      SUB_MATCHES,
      'ann',
      'bob',
      { status: 'complete', winner: 'halved', margin: 'All Square' },
      holes(['p1', 'p2'])
    );

    expect(result).toEqual({ subMatchId: 'sm-1', result: 'halved', finalDifferential: 0 });
  });

  it('writes nothing while the match is still in progress', () => {
    const inProgress: MatchStatus = { status: 'in_progress', leader: 'player1', holesUp: 1, holesRemaining: 5 };

    expect(buildSinglesSubMatchResult(SUB_MATCHES, 'ann', 'bob', inProgress, holes(['p1']))).toBeNull();
  });

  it("never overwrites an organiser's manual result", () => {
    const manual = [subMatch('sm-1', 'ann', 'bob', true)];

    expect(buildSinglesSubMatchResult(manual, 'ann', 'bob', P1_WINS_3_AND_2, holes(['p1']))).toBeNull();
  });

  it('writes nothing for a round without a matching sub-match (not split, or another pairing)', () => {
    expect(buildSinglesSubMatchResult(undefined, 'ann', 'bob', P1_WINS_3_AND_2, holes(['p1']))).toBeNull();
    expect(buildSinglesSubMatchResult([], 'ann', 'bob', P1_WINS_3_AND_2, holes(['p1']))).toBeNull();
    expect(buildSinglesSubMatchResult(SUB_MATCHES, 'ann', 'dan', P1_WINS_3_AND_2, holes(['p1']))).toBeNull();
  });
});
