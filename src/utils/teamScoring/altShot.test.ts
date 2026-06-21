import {
  calculateAltShotTeamHandicap,
  computeAltShotTeamRoundScore,
} from './altShot';
import type { Scorecard } from '@/types/database/scorecard.types';

describe('calculateAltShotTeamHandicap', () => {
  it('is 50% of the combined member handicaps (pair average)', () => {
    expect(calculateAltShotTeamHandicap([{ handicap: 9 }, { handicap: 11 }])).toBe(10);
    expect(calculateAltShotTeamHandicap([{ handicap: 8 }, { handicap: 13 }])).toBe(10.5);
  });

  it('rounds to 1 decimal place and treats null/undefined as 0', () => {
    expect(calculateAltShotTeamHandicap([{ handicap: 7 }, { handicap: null }])).toBe(3.5);
    expect(calculateAltShotTeamHandicap([])).toBe(0);
  });
});

describe('computeAltShotTeamRoundScore', () => {
  const members = [
    { player_id: 'p1', handicap: 9 },
    { player_id: 'p2', handicap: 11 },
  ];

  const oneBallCard = (playerId: string): Scorecard =>
    ({
      player_id: playerId,
      daily_handicap_used: playerId === 'p1' ? 9 : 11,
      scores: { '1': { strokes: 4 }, '2': { strokes: 5 } },
      total_gross: 9,
      total_net: 0,
      total_points: 0,
    } as unknown as Scorecard);

  it('reads one ball, applies floor(50% combined) strokes for net', () => {
    const score = computeAltShotTeamRoundScore([oneBallCard('p1'), oneBallCard('p2')], members);
    expect(score.teamHandicap).toBe(10); // (9+11)/2
    expect(score.teamHandicapStrokes).toBe(10);
    expect(score.teamGross).toBe(9); // from total_gross
    expect(score.teamNet).toBe(9 - 10);
    expect(score.holesCompleted).toBe(2);
  });

  it('returns zeros when no card has data', () => {
    const score = computeAltShotTeamRoundScore([], []);
    expect(score).toEqual({
      teamGross: 0,
      teamHandicap: 0,
      teamHandicapStrokes: 0,
      teamNet: 0,
      holesCompleted: 0,
    });
  });

  it('returns the resolved handicap even when no scorecards are present', () => {
    const score = computeAltShotTeamRoundScore([], members);
    expect(score.teamHandicap).toBe(10);
    expect(score.teamHandicapStrokes).toBe(10);
    expect(score.teamGross).toBe(0);
    expect(score.teamNet).toBe(0);
    expect(score.holesCompleted).toBe(0);
  });
});
