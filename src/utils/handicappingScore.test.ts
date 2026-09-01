// src/utils/handicappingScore.test.ts
//
// Tests for the GA CONNECT "Handicapping Score" (BRS §4H `stablefordScore`).
//
// These are written test-first: the module under test is new and additive, so
// nothing in the existing scoring path is locked or changed by this file.
import {
  stablefordPointsForHole,
  parScoreToStableford,
  calculateHandicappingScore,
  PAR_GAME_STABLEFORD_OFFSET,
  type HandicappingHole,
} from './handicappingScore';

// A simple par-72 front nine: pars 4,4,3,5,4,4,3,5,4 (=36), SI 1..9
const NINE: HandicappingHole[] = [
  { number: 1, par: 4, strokeIndex: 5 },
  { number: 2, par: 4, strokeIndex: 1 },
  { number: 3, par: 3, strokeIndex: 9 },
  { number: 4, par: 5, strokeIndex: 3 },
  { number: 5, par: 4, strokeIndex: 7 },
  { number: 6, par: 4, strokeIndex: 2 },
  { number: 7, par: 3, strokeIndex: 8 },
  { number: 8, par: 5, strokeIndex: 4 },
  { number: 9, par: 4, strokeIndex: 6 },
];

describe('stablefordPointsForHole', () => {
  it('awards the Rule 21.1 table around par', () => {
    expect(stablefordPointsForHole(1)).toBe(1); // net bogey
    expect(stablefordPointsForHole(0)).toBe(2); // net par
    expect(stablefordPointsForHole(-1)).toBe(3); // net birdie
    expect(stablefordPointsForHole(-2)).toBe(4); // net eagle
    expect(stablefordPointsForHole(-3)).toBe(5); // net albatross
  });

  it('is uncapped above albatross — a net 4-under scores 6', () => {
    // The app's display tables (getStablefordPoints / calculateStablefordPoints)
    // clamp at 5 and 4 respectively. GA's stablefordScore must be the true
    // Rules-of-Golf value, so this primitive deliberately does not clamp.
    expect(stablefordPointsForHole(-4)).toBe(6);
    expect(stablefordPointsForHole(-5)).toBe(7);
  });

  it('floors at zero for net double bogey or worse', () => {
    expect(stablefordPointsForHole(2)).toBe(0);
    expect(stablefordPointsForHole(3)).toBe(0);
    expect(stablefordPointsForHole(99)).toBe(0);
  });
});

describe('parScoreToStableford', () => {
  it('adds 36 to the Par result (BRS §4H worked example)', () => {
    // "a result of 4 down (i.e. -4) is converted to 32 points"
    expect(parScoreToStableford(-4)).toBe(32);
    expect(PAR_GAME_STABLEFORD_OFFSET).toBe(36);
  });

  it('maps square to 36 and up-results above 36', () => {
    expect(parScoreToStableford(0)).toBe(36);
    expect(parScoreToStableford(3)).toBe(39);
  });

  it('is nine-aware — a 9-hole Par result uses an offset of 18 (I4)', () => {
    expect(parScoreToStableford(0, 9)).toBe(18);
    expect(parScoreToStableford(-2, 9)).toBe(16);
  });

  it('is LOSSY relative to true Stableford — drift is locked here deliberately', () => {
    // A Par result only records win/square/loss, so the conversion cannot
    // recover the magnitude of a hole. These assertions pin the known drift so
    // nobody later mistakes `+2 per hole` for an exact identity. See the
    // doc comment on parScoreToStableford.
    const parGamePointsFor = (netToPar: number) =>
      netToPar <= -1 ? 1 : netToPar === 0 ? 0 : -1;

    const cases: { netToPar: number; trueStableford: number; drift: number }[] = [
      { netToPar: -3, trueStableford: 5, drift: -2 }, // albatross
      { netToPar: -2, trueStableford: 4, drift: -1 }, // eagle
      { netToPar: -1, trueStableford: 3, drift: 0 },
      { netToPar: 0, trueStableford: 2, drift: 0 },
      { netToPar: 1, trueStableford: 1, drift: 0 },
      { netToPar: 2, trueStableford: 0, drift: 1 }, // double bogey
    ];

    for (const { netToPar, trueStableford, drift } of cases) {
      const viaParGame = parScoreToStableford(parGamePointsFor(netToPar), 1);
      expect(stablefordPointsForHole(netToPar)).toBe(trueStableford);
      expect(viaParGame - trueStableford).toBe(drift);
    }
  });
});

describe('calculateHandicappingScore', () => {
  it('scores a level-par scratch round as 2 points per hole', () => {
    const scores = Object.fromEntries(
      NINE.map((h) => [h.number, { strokes: h.par }])
    );

    const result = calculateHandicappingScore({
      holes: NINE,
      scores,
      dailyHandicap: 0,
    });

    expect(result.stablefordScore).toBe(18); // 9 holes × 2
    expect(result.holesCounted).toBe(9);
    expect(result.allHolesAttempted).toBe(true);
  });

  it('applies strokes received off the daily handicap', () => {
    // Daily handicap 9 → one stroke on SI 1..9, i.e. every hole of this nine.
    // Gross par on every hole therefore becomes net birdie = 3 points.
    const scores = Object.fromEntries(
      NINE.map((h) => [h.number, { strokes: h.par }])
    );

    const result = calculateHandicappingScore({
      holes: NINE,
      scores,
      dailyHandicap: 9,
    });

    expect(result.stablefordScore).toBe(27); // 9 holes × 3
  });

  it('scores a didNotAttempt hole as zero and flags the round', () => {
    const scores: Record<string, { strokes?: number; didNotAttempt?: boolean }> =
      Object.fromEntries(NINE.map((h) => [h.number, { strokes: h.par }]));
    scores['3'] = { didNotAttempt: true };

    const result = calculateHandicappingScore({
      holes: NINE,
      scores,
      dailyHandicap: 0,
    });

    // BRS §4H: "must attribute a value of zero to any hole that is eligible to
    // receive an Expected Score (i.e. a 'Did Not Attempt' hole)".
    expect(result.stablefordScore).toBe(16); // 8 × 2, hole 3 scores 0
    expect(result.allHolesAttempted).toBe(false);
  });

  it('scores a pickedUp hole as zero but still counts it as attempted', () => {
    const scores: Record<string, { strokes?: number; pickedUp?: boolean }> =
      Object.fromEntries(NINE.map((h) => [h.number, { strokes: h.par }]));
    scores['4'] = { pickedUp: true };

    const result = calculateHandicappingScore({
      holes: NINE,
      scores,
      dailyHandicap: 0,
    });

    expect(result.stablefordScore).toBe(16); // 8 × 2, hole 4 scores 0
    // A pickup was attempted — only didNotAttempt clears this flag.
    expect(result.allHolesAttempted).toBe(true);
  });

  it('treats a missing hole score as not completed (zero points)', () => {
    // BRS §5B: where an app submits no gross value for a hole, the software
    // assumes the player commenced but failed to complete it.
    const scores: Record<string, { strokes?: number }> = Object.fromEntries(
      NINE.map((h) => [h.number, { strokes: h.par }])
    );
    delete scores['7'];

    const result = calculateHandicappingScore({
      holes: NINE,
      scores,
      dailyHandicap: 0,
    });

    expect(result.stablefordScore).toBe(16);
    expect(result.allHolesAttempted).toBe(true);
  });

  it('never returns negative points for a blow-up hole', () => {
    const scores = Object.fromEntries(
      NINE.map((h) => [h.number, { strokes: h.par + 6 }])
    );

    const result = calculateHandicappingScore({
      holes: NINE,
      scores,
      dailyHandicap: 0,
    });

    expect(result.stablefordScore).toBe(0);
  });

  it('scores only the holes it is given (9-hole rounds are not extended)', () => {
    // BRS §4H: "For 9-hole scores, this is ONLY the 9-hole Stableford points;
    // do not include any adjustment for holes 10-18."
    const scores = Object.fromEntries(
      NINE.map((h) => [h.number, { strokes: h.par }])
    );

    const result = calculateHandicappingScore({
      holes: NINE,
      scores,
      dailyHandicap: 0,
    });

    expect(result.stablefordScore).toBe(18);
    expect(result.holesCounted).toBe(9);
  });

  it('accepts a bare number as a hole score', () => {
    const scores = Object.fromEntries(NINE.map((h) => [h.number, h.par]));

    const result = calculateHandicappingScore({
      holes: NINE,
      scores,
      dailyHandicap: 0,
    });

    expect(result.stablefordScore).toBe(18);
  });

  it('returns a zero result for an empty card', () => {
    const result = calculateHandicappingScore({
      holes: NINE,
      scores: {},
      dailyHandicap: 0,
    });

    expect(result.stablefordScore).toBe(0);
    expect(result.holesCounted).toBe(0);
    expect(result.allHolesAttempted).toBe(true);
  });
});
