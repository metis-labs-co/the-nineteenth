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
import type { TeeBox } from '@/types/database/base';

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
