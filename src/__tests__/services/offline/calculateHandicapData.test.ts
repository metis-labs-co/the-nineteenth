/**
 * Characterization + regression tests for calculateHandicapData (sync path).
 *
 * Root cause of prod bug (user bcdc0215, Social Handicap Index shown as +63.2):
 * an empty / abandoned scorecard synced with total_gross = 0 still received a
 * WHS differential of (113 / slope) × (0 − courseRating) ≈ −65.8, which then
 * poisoned the player's handicap index (best-1-of-N picks the outlier).
 *
 * The differential must be null whenever the gross is not a positive number,
 * matching the guard already present in recalculateScorecardDifferential.ts and
 * three other differential call sites. A null differential is excluded from
 * both the WHS index and handicap history (both filter on a non-null value),
 * exactly like the shared-ball team-round skip.
 */

import { calculateHandicapData } from '@/services/offline/sync/scorecardSync';
import type { Scorecard } from '@/types';
import type { Hole, TeeBox } from '@/types/database/base';
import { PICKUP_SCORE } from '@/constants/scoring';

/** Flat par-72 course: 18 × par 4, stroke indexes 1..18 in hole order. */
const PAR_72_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: 4 as Hole['par'],
  strokeIndex: i + 1,
}));

/** Level-par card except one blow-up hole, for the net-double-bogey cap tests. */
function parCardWithBlowUp(blowUpHole: number, blowUpStrokes: number) {
  const scores: Record<number, { strokes: number }> = {};
  for (const hole of PAR_72_HOLES) {
    scores[hole.number] =
      hole.number === blowUpHole ? { strokes: blowUpStrokes } : { strokes: hole.par };
  }
  return scores;
}

const TEE: TeeBox = {
  name: 'Members',
  color: 'white',
  courseRating: 71,
  slopeRating: 122,
};

function makeScorecard(overrides: Partial<Scorecard> = {}): Scorecard {
  return {
    id: 'sc-1',
    roundId: '550e8400-e29b-41d4-a716-446655440000',
    playerId: '550e8400-e29b-41d4-a716-446655440001',
    scores: {},
    totalGross: 90,
    totalNet: 72,
    status: 'completed',
    submittedAt: new Date('2026-07-09T06:32:02Z'),
    createdAt: new Date('2026-07-09T06:32:02Z'),
    updatedAt: new Date('2026-07-09T06:32:02Z'),
    isStandalone: false,
    // Sync metadata that enables the differential branch:
    teeData: TEE,
    coursePar: 72,
    playerGender: 'male',
    playerHandicap: 23,
    syncGameType: 'stroke',
    syncNineType: 'full',
    ...overrides,
  } as Scorecard;
}

describe('calculateHandicapData — WHS differential guard', () => {
  it('computes a non-null differential for a real positive gross (locks current behaviour)', () => {
    const result = calculateHandicapData(makeScorecard({ totalGross: 90 }));
    // (113 / 122) × (90 − 71) = 17.6
    expect(result.handicapDifferential).toBeCloseTo(17.6, 1);
    expect(result.courseRatingUsed).toBe(71);
    expect(result.slopeRatingUsed).toBe(122);
  });

  it('returns a NULL differential for a zero-gross (empty) scorecard — the prod bug', () => {
    const result = calculateHandicapData(makeScorecard({ totalGross: 0 }));
    expect(result.handicapDifferential).toBeNull();
  });

  it('returns a NULL differential when gross is missing/undefined', () => {
    const result = calculateHandicapData(
      makeScorecard({ totalGross: undefined as unknown as number }),
    );
    expect(result.handicapDifferential).toBeNull();
  });

  it('still records course/slope ratings for a zero-gross card (only the differential is withheld)', () => {
    const result = calculateHandicapData(makeScorecard({ totalGross: 0 }));
    expect(result.courseRatingUsed).toBe(71);
    expect(result.slopeRatingUsed).toBe(122);
    expect(result.handicapDifferential).toBeNull();
  });

  it('still skips the differential for a shared-ball team round (existing behaviour preserved)', () => {
    const result = calculateHandicapData(
      makeScorecard({ totalGross: 64, syncGameType: 'scramble' }),
    );
    expect(result.handicapDifferential).toBeNull();
  });
});

describe('calculateHandicapData — WHS Adjusted Gross Score (net double bogey cap)', () => {
  // A scratch player on this tee has a NEGATIVE daily handicap
  // (((0 × 122/113) + (71 − 72)) × 0.93 × 0.9986 ≈ −0.93 → −1), so
  // getStrokesReceived returns 0 on every hole and each cap is par + 2 = 6.
  const scratchCard = (scores: Record<number, { strokes: number }>, totalGross: number) =>
    makeScorecard({
      playerHandicap: 0,
      totalGross,
      scores: scores as Scorecard['scores'],
      syncHoles: PAR_72_HOLES,
      coursePar: 72,
    });

  it('caps a blow-up hole at net double bogey before computing the differential', () => {
    // 17 pars + a 12 on the 5th. Raw gross 80; adjusted gross 74 (the 12 → 6).
    const result = calculateHandicapData(scratchCard(parCardWithBlowUp(5, 12), 80));

    // BEFORE this change the differential was computed on the RAW gross:
    //   (113 / 122) × (80 − 71) = 8.3
    // It is now computed on the ADJUSTED gross:
    //   (113 / 122) × (74 − 71) = 2.8
    expect(result.handicapDifferential).toBeCloseTo(2.8, 1);
  });

  it('leaves a card with no hole worse than net double bogey unchanged', () => {
    // 17 pars + a single double bogey (6) — already at the cap, nothing to trim.
    const result = calculateHandicapData(scratchCard(parCardWithBlowUp(5, 6), 74));
    expect(result.handicapDifferential).toBeCloseTo(2.8, 1);
  });

  it('falls back to raw gross when hole data is unavailable', () => {
    // Cards synced without syncHoles cannot be capped; they must keep working
    // exactly as before rather than silently producing a wrong differential.
    const result = calculateHandicapData(
      makeScorecard({ playerHandicap: 0, totalGross: 80, syncHoles: undefined }),
    );
    // (113 / 122) × (80 − 71) = 8.3 — the pre-change value.
    expect(result.handicapDifferential).toBeCloseTo(8.3, 1);
  });

  it('still returns null for a zero-gross card even with hole data present', () => {
    const result = calculateHandicapData(scratchCard({}, 0));
    expect(result.handicapDifferential).toBeNull();
  });
});

describe('calculateHandicapData — 9-hole daily_handicap_used', () => {
  const nineCard = (overrides: Partial<Scorecard> = {}) =>
    makeScorecard({ coursePar: 36, totalGross: 45, syncNineType: 'front9', ...overrides });

  it('front9, no dedicated 9-hole ratings: halving fallback', () => {
    // HI 23, slope 122, CR 71: raw 18-hole DHC 22.13
    const result = calculateHandicapData(nineCard());
    expect(result.dailyHandicapUsed).toBe(11);
  });

  it('front9, no dedicated 9-hole ratings, double-rounding case (HI 20 / 120 / 71)', () => {
    // raw 18-hole DHC 18.80 → round(18.80 / 2) = 9 (was round(round(18.80) / 2) = 10)
    const result = calculateHandicapData(
      nineCard({
        playerHandicap: 20,
        teeData: { ...TEE, slopeRating: 120, courseRating: 71 },
      }),
    );
    expect(result.dailyHandicapUsed).toBe(9);
  });

  it('front9 with dedicated 9-hole ratings: uses half the index (GA / WHS 9-hole formula)', () => {
    // ((23/2 × 118/113) + (35.2 − 36)) × 0.93 × 0.9986 = 10.41 → 10
    // (was 22 when the full index was paired with 9-hole ratings)
    const result = calculateHandicapData(
      nineCard({ teeData: { ...TEE, slopeRatingFront9: 118, courseRatingFront9: 35.2 } }),
    );
    expect(result.dailyHandicapUsed).toBe(10);
    expect(result.courseRatingUsed).toBe(35.2);
    expect(result.slopeRatingUsed).toBe(118);
  });
});

describe('calculateHandicapData — handicap completeness gate (I12)', () => {
  const range = (start: number, end: number): number[] =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  /** Level par on the listed holes only. */
  function parScoresOn(holeNumbers: number[]): Record<number, { strokes: number }> {
    const scores: Record<number, { strokes: number }> = {};
    for (const n of holeNumbers) scores[n] = { strokes: PAR_72_HOLES[n - 1].par };
    return scores;
  }

  // Scratch player, as in the cap block above: daily handicap −1, so no strokes
  // are received and every hole caps at par + 2 = 6.
  const scratchCard = (overrides: Partial<Scorecard>) =>
    makeScorecard({ playerHandicap: 0, syncHoles: PAR_72_HOLES, coursePar: 72, ...overrides });

  const BACK_NINE = PAR_72_HOLES.filter((h) => h.number >= 10);

  it('keeps the legacy gross-only rule for a card with no per-hole data (I12 lock)', () => {
    const result = calculateHandicapData(makeScorecard({ scores: {}, totalGross: 90 }));
    // (113 / 122) × (90 − 71) = 17.6
    expect(result.handicapDifferential).toBeCloseTo(17.6, 1);
  });

  it('computes a differential for a complete 18-hole card (I12 lock)', () => {
    const result = calculateHandicapData(
      scratchCard({ scores: parScoresOn(range(1, 18)), totalGross: 72 }),
    );
    // (113 / 122) × (72 − 71) = 0.9
    expect(result.handicapDifferential).toBeCloseTo(0.9, 1);
  });

  it('counts a pickup as a scored hole (I12 lock)', () => {
    const scores = parScoresOn(range(1, 18));
    scores[7] = { strokes: PICKUP_SCORE };
    // Gross 17 × 4 + 10 = 78; the pickup caps at net double bogey (6):
    // adjusted 68 + 6 = 74 → (113 / 122) × (74 − 71) = 2.8
    const result = calculateHandicapData(scratchCard({ scores, totalGross: 78 }));
    expect(result.handicapDifferential).toBeCloseTo(2.8, 1);
  });

  it('computes a differential for a complete back-9 card (I12 lock)', () => {
    const result = calculateHandicapData(
      scratchCard({
        syncNineType: 'back9',
        syncHoles: BACK_NINE,
        coursePar: 36,
        scores: parScoresOn(range(10, 18)),
        totalGross: 36,
      }),
    );
    expect(result.handicapDifferential).not.toBeNull();
  });

  it('returns a NULL differential for an 18-hole card scored on only 6 holes', () => {
    const result = calculateHandicapData(
      scratchCard({ scores: parScoresOn(range(1, 6)), totalGross: 24 }),
    );
    // Before the gate: (113 / 122) × (24 − 71) = −43.5, straight into the index.
    expect(result.handicapDifferential).toBeNull();
    // Only the differential is withheld — the snapshot is still recorded.
    expect(result.courseRatingUsed).toBe(71);
    expect(result.slopeRatingUsed).toBe(122);
    expect(result.dailyHandicapUsed).toBe(-1);
  });

  it('returns a NULL differential for a back-9 card scored on holes 10–15 only', () => {
    const result = calculateHandicapData(
      scratchCard({
        syncNineType: 'back9',
        syncHoles: BACK_NINE,
        coursePar: 36,
        scores: parScoresOn(range(10, 15)),
        totalGross: 24,
      }),
    );
    expect(result.handicapDifferential).toBeNull();
  });

  it('returns a NULL differential when completeness is judged from the nine type, not syncHoles', () => {
    // syncHoles lists only holes 1–6, but the round is a full 18.
    const result = calculateHandicapData(
      scratchCard({
        syncHoles: PAR_72_HOLES.slice(0, 6),
        scores: parScoresOn(range(1, 6)),
        totalGross: 24,
      }),
    );
    expect(result.handicapDifferential).toBeNull();
  });
});

describe('calculateHandicapData — ended-early belt', () => {
  it('never returns a differential for a card stamped as ended early, even a legacy card with no hole data', () => {
    // scores {} is the legacy gross-only shape the completeness gate (A3) lets
    // through. The holesPlayed stamp alone must keep it out of the index.
    const result = calculateHandicapData(makeScorecard({ totalGross: 30, holesPlayed: 6 }));

    expect(result.handicapDifferential).toBeNull();
    // The rest of the snapshot is still written.
    expect(result.courseRatingUsed).toBe(71);
    expect(result.slopeRatingUsed).toBe(122);
    expect(result.dailyHandicapUsed).not.toBeNull();
  });

  it('leaves a card with holesPlayed null unchanged', () => {
    const result = calculateHandicapData(makeScorecard({ totalGross: 90, holesPlayed: null }));
    expect(result.handicapDifferential).toBeCloseTo(17.6, 1);
  });
});

describe('calculateHandicapData — invalid ended markers', () => {
  it.each([null, 0, -1, 2.5, NaN])('treats %s as absent', (holesPlayed) => {
    expect(calculateHandicapData(makeScorecard({ holesPlayed })))
      .toEqual(calculateHandicapData(makeScorecard()));
  });
});


it('explicit none keeps differential eligibility gates and real scratch zero remains distinct', () => {
  const scratch = makeScorecard({ playerHandicap: 0, teeData: { ...TEE, courseRating: 76 }, coursePar: 72, scores: parCardWithBlowUp(1, 12), syncHoles: PAR_72_HOLES, totalGross: 80 });
  expect(calculateHandicapData(scratch).dailyHandicapUsed).toBe(4);
  const none = calculateHandicapData({ ...scratch, syncHandicapSource: 'none' });
  expect(none.dailyHandicapUsed).toBe(0); expect(none.gaHandicapUsed).toBe(0);
  expect(none.handicapDifferential).not.toBeNull();
  expect(calculateHandicapData({ ...scratch, syncHandicapSource: 'none', holesPlayed: 6 }).handicapDifferential).toBeNull();
  expect(calculateHandicapData({ ...scratch, syncHandicapSource: 'none', syncGameType: 'scramble' }).handicapDifferential).toBeNull();
});
