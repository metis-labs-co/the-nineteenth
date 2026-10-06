import { determineTeamHoleWinner } from './teamWinner';
import { getTeamScoreForFormat, prepareTeamHoleScores } from './teamScores';
import type { SkinsTeamHoleScores } from '@/types/database';

describe('team skins settlement', () => {
  it('uses handicap-adjusted best ball and identifies the sole winner', () => {
    const scores = prepareTeamHoleScores(
      [
        { id: 'red', member_ids: ['r1', 'r2'], members: [{ id: 'r1', handicap: 18 }, { id: 'r2', handicap: 0 }] },
        { id: 'blue', member_ids: ['b1'], members: [{ id: 'b1', handicap: 0 }] },
      ],
      {
        r1: { '1': { strokes: 5 } },
        r2: { '1': { strokes: 6 } },
        b1: { '1': { strokes: 5 } },
      },
      { par: 4, strokeIndex: 1 },
      1,
      'best-ball'
    );

    expect(scores.red.team_score).toBe(4);
    expect(scores.red.contributing_player_id).toBe('r1');
    expect(determineTeamHoleWinner(scores, 'best-ball', 'net')).toEqual({
      winnerTeamId: 'red',
      isCarryover: false,
      minScore: 4,
      tiedTeamIds: ['red'],
    });
  });

  it('carries the skin when teams tie', () => {
    const scores = {
      red: { team_score: 4, member_scores: { r1: { gross: 4, net: 4, strokes_received: 0 } } },
      blue: { team_score: 4, member_scores: { b1: { gross: 4, net: 4, strokes_received: 0 } } },
    } as SkinsTeamHoleScores;

    expect(determineTeamHoleWinner(scores, 'scramble', 'gross')).toEqual({
      winnerTeamId: null,
      isCarryover: true,
      minScore: 4,
      tiedTeamIds: ['red', 'blue'],
    });
  });

  it('uses gross or net member scores according to the scoring mode', () => {
    const team = {
      team_score: 3,
      member_scores: {
        p1: { gross: 4, net: 4, strokes_received: 0 },
        p2: { gross: 5, net: 3, strokes_received: 2 },
      },
    };

    expect(getTeamScoreForFormat(team, 'best-ball', 'gross')).toBe(4);
    expect(getTeamScoreForFormat(team, 'best-ball', 'net')).toBe(3);
  });
});
