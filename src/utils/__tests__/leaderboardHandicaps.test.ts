import { buildDailyHandicapMap } from '../leaderboardHandicaps';
import { calculateGADailyHandicap } from '../dailyHandicap';
import type { Hole, TeeBox } from '@/types';

// 18 holes, par 72, stroke indexes 1..18
const HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  id: `h${i + 1}`,
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
})) as unknown as Hole[];

const TEE: TeeBox = {
  slopeRating: 125,
  courseRating: 72.5,
} as unknown as TeeBox;

describe('buildDailyHandicapMap', () => {
  it('prefers the stored daily_handicap_used over any computed/raw value', () => {
    const map = buildDailyHandicapMap(
      [{ playerId: 'p1', gaHandicap: 18, storedDailyHandicap: 15, gender: 'male' }],
      HOLES,
      TEE,
      'profile'
    );
    expect(map.p1).toBe(15);
  });

  it('computes GA -> daily from tee slope/course rating when no stored DHC', () => {
    const expected = calculateGADailyHandicap({
      gaHandicap: 18,
      slopeRating: 125,
      courseRating: 72.5,
      par: 72,
      gender: 'male',
    }).dailyHandicap;

    const map = buildDailyHandicapMap(
      [{ playerId: 'p1', gaHandicap: 18, gender: 'male' }],
      HOLES,
      TEE,
      'profile'
    );
    expect(map.p1).toBe(expected);
    // Sanity: daily HC differs from the raw index, which is the whole bug.
    expect(map.p1).not.toBe(18);
  });

  it('applies the female consistency factor when computing from tee', () => {
    const expected = calculateGADailyHandicap({
      gaHandicap: 18,
      slopeRating: 125,
      courseRating: 72.5,
      par: 72,
      gender: 'female',
    }).dailyHandicap;

    const map = buildDailyHandicapMap(
      [{ playerId: 'p1', gaHandicap: 18, gender: 'female' }],
      HOLES,
      TEE,
      'profile'
    );
    expect(map.p1).toBe(expected);
  });

  it('falls back to the raw GA index when there is no tee data', () => {
    const map = buildDailyHandicapMap(
      [{ playerId: 'p1', gaHandicap: 18 }],
      HOLES,
      null,
      'profile'
    );
    expect(map.p1).toBe(18);
  });

  it('uses the raw GA index unchanged when handicapSource is none', () => {
    const map = buildDailyHandicapMap(
      [{ playerId: 'p1', gaHandicap: 18, gender: 'male' }],
      HOLES,
      TEE,
      'none'
    );
    expect(map.p1).toBe(18);
  });

  it('treats null/undefined GA handicap as 0', () => {
    const map = buildDailyHandicapMap(
      [
        { playerId: 'p1', gaHandicap: null },
        { playerId: 'p2', gaHandicap: undefined },
      ],
      HOLES,
      null,
      'profile'
    );
    expect(map.p1).toBe(0);
    expect(map.p2).toBe(0);
  });
});
