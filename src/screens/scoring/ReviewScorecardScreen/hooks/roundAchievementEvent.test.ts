// src/screens/scoring/ReviewScorecardScreen/hooks/roundAchievementEvent.test.ts
import { buildRoundAchievementEventData } from './roundAchievementEvent';
import { getProgressIncrement } from '@/services/achievements/progressCalculation';

const STATS = {
  birdies: 2,
  eagles: 1,
  pars: 10,
  bogeys: 4,
  doubleBogeys: 1,
  albatross: 0,
  holeInOne: false,
  totalGross: 84,
  holesPlayed: 18,
};

const BASE = {
  roundId: 'round-1',
  gameType: 'stroke',
  courseId: 'course-1',
  isCompetition: false,
  scoreStats: STATS,
  totalNet: 66,
};

describe('buildRoundAchievementEventData', () => {
  it('builds the event for a round played as planned (locks current behaviour)', () => {
    expect(buildRoundAchievementEventData(BASE)).toEqual({
      round_id: 'round-1',
      game_type: 'stroke',
      course_id: 'course-1',
      is_competition: false,
      hole_count: 18,
      gross_score: 84,
      net_score: 66,
      birdies: 2,
      eagles: 1,
      albatrosses: 0,
      pars: 10,
      bogeys: 4,
      double_bogeys: 1,
      hole_in_one: false,
    });
  });

  it('omits a zero net total (locks current behaviour)', () => {
    expect(buildRoundAchievementEventData({ ...BASE, totalNet: 0 }).net_score).toBeUndefined();
  });
  it('omits the score totals and the hole count for an early-ended round', () => {
    const event = buildRoundAchievementEventData({
      ...BASE,
      scoreStats: { ...STATS, totalGross: 26, holesPlayed: 6 },
      totalNet: 20,
      endedEarly: true,
    });

    // LOW_SCORER (gross) and NET_MASTER (net) must not see a 6-hole total.
    expect(event.gross_score).toBeUndefined();
    expect(event.net_score).toBeUndefined();
    // Neither the 18- nor the 9-hole round achievement may count it.
    expect(event.hole_count).toBeUndefined();
    expect(event.birdies).toBe(2);
    expect(getProgressIncrement('scorecard_submitted', event, 'LOW_SCORER_1')).toBe(0);
    expect(getProgressIncrement('scorecard_submitted', event, 'NET_MASTER_1')).toBe(0);
    expect(getProgressIncrement('round_completed', event, 'PRACTICE_MAKES_PERFECT_1')).toBe(1);
    expect(getProgressIncrement('round_completed', event, 'COURSE_EXPLORER_1')).toBe(1);
    expect(getProgressIncrement('round_completed', event, 'COURSE_CONQUEROR_1')).toBe(1);
    expect(
      getProgressIncrement('round_completed', { ...event, is_competition: true }, 'COMPETITOR_1')
    ).toBe(1);
  });

  it('an 18-hole round ended after exactly 9 does not advance NINE_HOLE_SPECIALIST', () => {
    const event = buildRoundAchievementEventData({
      ...BASE,
      scoreStats: { ...STATS, totalGross: 42, holesPlayed: 9 },
      totalNet: 35,
      endedEarly: true,
    });

    expect(event.hole_count).toBeUndefined();
    expect(getProgressIncrement('round_completed', event, 'NINE_HOLE_SPECIALIST_1')).toBe(0);
    expect(getProgressIncrement('round_completed', event, '18_HOLES_OF_GLORY_1')).toBe(0);
    // Still a round played.
    expect(getProgressIncrement('round_completed', event, 'ROUND_VETERAN_1')).toBe(1);
  });

  it('a 9-hole round played as planned still advances NINE_HOLE_SPECIALIST (locks current behaviour)', () => {
    const event = buildRoundAchievementEventData({
      ...BASE,
      scoreStats: { ...STATS, totalGross: 42, holesPlayed: 9 },
      totalNet: 35,
    });

    expect(event.hole_count).toBe(9);
    expect(getProgressIncrement('round_completed', event, 'NINE_HOLE_SPECIALIST_1')).toBe(1);
  });
});
