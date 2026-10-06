import {
  buildMultiBallHoleData,
  buildMultiBallStats,
  detectBallCount,
  hasMultiBallScores,
} from '@/utils/multiBallScorecard';
import type { ScoresRecord } from '@/utils/scorecardCalculations';
import type { Hole } from '@/types';

// Par-4 SI 1 and par-3 SI 18 keep strokes-received easy to reason about.
const holes: Hole[] = [
  { number: 1, par: 4, strokeIndex: 1, yardages: { white: 380 } },
  { number: 2, par: 3, strokeIndex: 18, yardages: { white: 150 } },
] as Hole[];

const twoBallScores: ScoresRecord = {
  1: { balls: [{ strokes: 5 }, { strokes: 4 }] },
  2: { balls: [{ strokes: 3 }, { strokes: 6 }] },
};

describe('hasMultiBallScores', () => {
  it('detects a multi-ball scores record', () => {
    expect(hasMultiBallScores(twoBallScores)).toBe(true);
  });

  it('returns false for single-ball scores', () => {
    expect(hasMultiBallScores({ 1: { strokes: 4 } })).toBe(false);
  });

  it('returns false for empty or missing scores', () => {
    expect(hasMultiBallScores({})).toBe(false);
    expect(hasMultiBallScores(null)).toBe(false);
  });
});

describe('detectBallCount', () => {
  it('returns the widest ball array across holes', () => {
    expect(detectBallCount(twoBallScores)).toBe(2);
  });

  it('returns 1 for single-ball scores', () => {
    expect(detectBallCount({ 1: { strokes: 4 } })).toBe(1);
  });

  it('clamps to the maximum supported ball count', () => {
    const wide: ScoresRecord = {
      1: { balls: [{ strokes: 4 }, { strokes: 4 }, { strokes: 4 }, { strokes: 4 }, { strokes: 4 }] },
    };
    expect(detectBallCount(wide)).toBe(4);
  });
});

describe('buildMultiBallHoleData', () => {
  it('unwraps every ball for each hole', () => {
    const rows = buildMultiBallHoleData({
      holes,
      scores: twoBallScores,
      dailyHandicap: 0,
      ballCount: 2,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].balls.map((b) => b.strokes)).toEqual([5, 4]);
    expect(rows[1].balls.map((b) => b.strokes)).toEqual([3, 6]);
  });

  it('computes stableford points per ball off the daily handicap', () => {
    // Handicap 18 => 1 stroke on every hole.
    const rows = buildMultiBallHoleData({
      holes,
      scores: twoBallScores,
      dailyHandicap: 18,
      ballCount: 2,
    });

    // Hole 1, par 4, 1 stroke received: gross 5 -> net 4 -> 2pts; gross 4 -> net 3 -> 3pts
    expect(rows[0].strokesReceived).toBe(1);
    expect(rows[0].balls.map((b) => b.stablefordPoints)).toEqual([2, 3]);
  });

  it('flags pickups and awards them no points', () => {
    const rows = buildMultiBallHoleData({
      holes,
      scores: { 1: { balls: [{ strokes: 10 }, { strokes: 4 }] } },
      dailyHandicap: 0,
      ballCount: 2,
    });

    expect(rows[0].balls[0].isPickup).toBe(true);
    expect(rows[0].balls[0].stablefordPoints).toBe(0);
    expect(rows[0].balls[1].isPickup).toBe(false);
  });

  it('pads holes with no score into empty ball slots', () => {
    const rows = buildMultiBallHoleData({
      holes,
      scores: { 1: { balls: [{ strokes: 5 }, { strokes: 4 }] } },
      dailyHandicap: 0,
      ballCount: 2,
    });

    expect(rows[1].balls).toHaveLength(2);
    expect(rows[1].balls.every((b) => b.strokes === undefined)).toBe(true);
  });

  it('pads a single-ball score into empty ball slots rather than throwing', () => {
    const rows = buildMultiBallHoleData({
      holes,
      scores: { 1: { strokes: 5 } },
      dailyHandicap: 0,
      ballCount: 2,
    });

    expect(rows[0].balls).toHaveLength(2);
    expect(rows[0].balls.every((b) => b.strokes === undefined)).toBe(true);
  });
});

describe('buildMultiBallStats', () => {
  it('totals gross and stableford separately for each ball', () => {
    const rows = buildMultiBallHoleData({
      holes,
      scores: twoBallScores,
      dailyHandicap: 0,
      ballCount: 2,
    });
    const stats = buildMultiBallStats(rows, 2);

    expect(stats.ballStats[1].totalGross).toBe(8); // 5 + 3
    expect(stats.ballStats[2].totalGross).toBe(10); // 4 + 6
    expect(stats.front9Par).toBe(7);
    expect(stats.totalPar).toBe(7);
  });

  it('excludes pickups from gross totals', () => {
    const rows = buildMultiBallHoleData({
      holes,
      scores: { 1: { balls: [{ strokes: 10 }, { strokes: 4 }] } },
      dailyHandicap: 0,
      ballCount: 2,
    });
    const stats = buildMultiBallStats(rows, 2);

    expect(stats.ballStats[1].totalGross).toBe(0);
    expect(stats.ballStats[2].totalGross).toBe(4);
  });

  it('splits front nine and back nine totals', () => {
    const eighteen: Hole[] = Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: 4,
      strokeIndex: i + 1,
      yardages: { white: 380 },
    })) as Hole[];
    const scores: ScoresRecord = {};
    for (let h = 1; h <= 18; h++) {
      scores[h] = { balls: [{ strokes: 4 }, { strokes: 5 }] };
    }

    const stats = buildMultiBallStats(
      buildMultiBallHoleData({ holes: eighteen, scores, dailyHandicap: 0, ballCount: 2 }),
      2
    );

    expect(stats.ballStats[1].front9Gross).toBe(36);
    expect(stats.ballStats[1].back9Gross).toBe(36);
    expect(stats.ballStats[2].front9Gross).toBe(45);
    expect(stats.front9Par).toBe(36);
    expect(stats.back9Par).toBe(36);
  });
});
