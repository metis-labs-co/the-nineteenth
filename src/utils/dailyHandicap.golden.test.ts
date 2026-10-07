// src/utils/dailyHandicap.golden.test.ts
//
// Characterization ("golden value") test for INVARIANT I4 documented in
// docs/guides/SCORING_ARCHITECTURE.md: a 9-hole daily handicap must be a
// nine-scaled value, not an inflated ~18-hole one. It follows the GA / WHS
// 9-hole formula (half the index; without dedicated 9-hole ratings the result
// is the UNROUNDED 18-hole daily handicap ÷ 2, rounded once) so a future change
// to the fallback path fails loudly.
//
// Params below mirror the real call site in
// src/hooks/player/playingHandicap.ts (calculatePlayingHandicap): a tee with
// only full 18-hole slope/course ratings (no dedicated 9-hole ratings, the
// common case for API-sourced courses), scored front9.
import {
  calculateNineAwareDailyHandicap,
  calculateGADailyHandicap,
} from './dailyHandicap';

const TEE = {
  slopeRating: 125,
  courseRating: 72.5,
};

describe('INVARIANT I4: nine-aware daily handicap', () => {
  it('produces a nine-scaled value, not an inflated 18-hole one', () => {
    // Observed: full 18-hole daily handicap for this player/tee.
    const eighteen = calculateGADailyHandicap({
      gaHandicap: 18,
      slopeRating: TEE.slopeRating,
      courseRating: TEE.courseRating,
      par: 72,
      gender: 'male',
    });
    expect(eighteen.dailyHandicap).toBe(19);

    // Nine-aware front9 result (no dedicated 9-hole ratings -> half the index,
    // 18-hole slope, half the 18-hole CR): raw 18.956 / 2 = 9.478 -> 9.
    // (Previously 10: round(19 / 2) double-rounded 9.5 up.)
    const nine = calculateNineAwareDailyHandicap({
      gaHandicap: 18,
      nineType: 'front9',
      par: 36,
      slopeRating: TEE.slopeRating,
      courseRating: TEE.courseRating,
      gender: 'male',
    });
    expect(nine.dailyHandicap).toBe(9);

    // Must be materially lower than the 18-hole value, never approaching it.
    expect(nine.dailyHandicap).toBeLessThan(eighteen.dailyHandicap);

    // Observed: the naive bug this invariant guards against — pairing the
    // 9-hole par (36) directly with the full 18-hole course rating (72.5)
    // inflates the course-rating adjustment and balloons the result.
    const naiveBuggy = calculateGADailyHandicap({
      gaHandicap: 18,
      slopeRating: TEE.slopeRating,
      courseRating: TEE.courseRating,
      par: 36,
      gender: 'male',
    });
    expect(naiveBuggy.dailyHandicap).toBe(52);
    expect(nine.dailyHandicap).toBeLessThan(naiveBuggy.dailyHandicap);
  });
});
