// src/__tests__/hooks/playerStatistics/advancedHelpers.test.ts
import {
  calculateBunkerStats,
  calculateHazardStats,
  type EnrichedHoleScore,
} from '@/hooks/playerStatistics/advancedHelpers';

function hole(overrides: Partial<EnrichedHoleScore> = {}): EnrichedHoleScore {
  return {
    strokes: 4,
    par: 4,
    gir: null,
    putts: null,
    fairwayHit: null,
    fairwayMissDirection: undefined,
    greenMissDirection: undefined,
    bunkerShots: undefined,
    hazards: undefined,
    ...overrides,
  };
}

describe('calculateBunkerStats', () => {
  const holes = [hole({ bunkerShots: 2 }), hole({ bunkerShots: 0 }), hole({ bunkerShots: 1 })];

  it('averages bunker shots over every round by default (locks current behaviour)', () => {
    const stats = calculateBunkerStats(holes, 2);
    expect(stats.totalBunkerShots).toBe(3);
    expect(stats.averageBunkerShotsPerRound).toBe(1.5);
    expect(stats.holesWithBunkersPercentage).toBe(66.7);
  });

  it('takes the per-round numerator from the round-average holes only', () => {
    const stats = calculateBunkerStats(holes, 1, [holes[1]]);
    expect(stats.averageBunkerShotsPerRound).toBe(0);
    // Per-hole figures still span every hole.
    expect(stats.totalBunkerShots).toBe(3);
    expect(stats.holesWithBunkersPercentage).toBe(66.7);
  });

  it('returns a null per-round average when no round is eligible', () => {
    expect(calculateBunkerStats(holes, 0, []).averageBunkerShotsPerRound).toBeNull();
  });

  it('returns a null per-round average when only left-out rounds tracked bunkers', () => {
    // One eligible round that didn't track bunkers; the tracked holes are all left out.
    const stats = calculateBunkerStats(holes, 1, [hole()]);
    expect(stats.averageBunkerShotsPerRound).toBeNull();
    expect(stats.totalBunkerShots).toBe(3);
  });
});

describe('calculateHazardStats', () => {
  const holes = [
    hole({ hazards: [{ type: 'water' }, { type: 'ob' }] }),
    hole({ hazards: [] }),
    hole({ hazards: [{ type: 'lateral' }] }),
  ];

  it('averages hazards over every round by default (locks current behaviour)', () => {
    const stats = calculateHazardStats(holes, 2);
    expect(stats.totalHazards).toBe(3);
    expect(stats.averageHazardsPerRound).toBe(1.5);
  });

  it('takes the per-round numerator from the round-average holes only', () => {
    const stats = calculateHazardStats(holes, 1, [holes[1]]);
    expect(stats.averageHazardsPerRound).toBe(0);
    expect(stats.totalHazards).toBe(3);
    expect(stats.holesWithHazards).toBe(2);
  });

  it('returns a null per-round average when only left-out rounds tracked hazards', () => {
    const stats = calculateHazardStats(holes, 1, [hole()]);
    expect(stats.averageHazardsPerRound).toBeNull();
    expect(stats.totalHazards).toBe(3);
  });
});
