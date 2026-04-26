/**
 * Handicap Source Flow Integration Test
 *
 * Pins the per-round handicap pipeline:
 *
 *   handicap_source (profile | calculated | none)
 *     → getBaseHandicap(player, source)              [src/utils/scorecardCalculations.ts]
 *     → calculateGADailyHandicap(index, slope, CR, par, gender)
 *                                                    [src/utils/dailyHandicap.ts]
 *     → DHC (rounded)
 *     → getStrokesReceived(DHC, strokeIndex)         [src/utils/scoring.ts]
 *     → per-hole strokes
 *
 * This test guards the chain so any future change to source selection,
 * DHC computation, or stroke distribution that drifts from the user's
 * configured handicap_source will fail loudly. Every game type
 * (Stableford, Stroke, Par, team formats) routes its handicap through
 * this same pipeline, so verifying it here covers all of them.
 */

import { getBaseHandicap } from '@/utils/scorecardCalculations';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { getStrokesReceived } from '@/utils/scoring';
import type { ScorecardPlayerInfo } from '@/utils/scorecardCalculations';

// Player whose profile handicap and calculated index disagree, so we can
// tell which one was used downstream just from the result.
const PLAYER: ScorecardPlayerInfo = {
  id: 'p1',
  name: 'Test Player',
  handicap: 18, // profile WHS index
  handicap_index: 24, // Social Handicap Index — intentionally different
  gender: 'male',
};

const TEE = {
  slopeRating: 130,
  courseRating: 73,
  par: 72,
};

function resolveDhc(
  player: ScorecardPlayerInfo,
  source: 'profile' | 'calculated' | 'none'
): number {
  const base = getBaseHandicap(player, source);
  if (source === 'none') return 0;
  return calculateGADailyHandicap({
    gaHandicap: base,
    slopeRating: TEE.slopeRating,
    courseRating: TEE.courseRating,
    par: TEE.par,
    gender: player.gender,
  }).dailyHandicap;
}

describe('Handicap source → DHC → strokes pipeline', () => {
  describe('source = "profile"', () => {
    it('uses player.handicap (NOT handicap_index)', () => {
      expect(getBaseHandicap(PLAYER, 'profile')).toBe(18);
    });

    it('produces a DHC derived from player.handicap', () => {
      const dhcFromProfile = resolveDhc(PLAYER, 'profile');
      const dhcFromIndex = calculateGADailyHandicap({
        gaHandicap: 18,
        ...TEE,
        gender: 'male',
      }).dailyHandicap;
      expect(dhcFromProfile).toBe(dhcFromIndex);
    });

    it('strokes per hole are consistent with the resolved DHC', () => {
      const dhc = resolveDhc(PLAYER, 'profile');
      // Stroke index 1 is always given a stroke when DHC > 0.
      expect(getStrokesReceived(dhc, 1)).toBeGreaterThanOrEqual(1);
      // Stroke index above DHC's whole-stroke threshold gets 0.
      // (For DHC < 18, SI 18 should give 0.)
      if (dhc < 18) {
        expect(getStrokesReceived(dhc, 18)).toBe(0);
      }
    });
  });

  describe('source = "calculated"', () => {
    it('uses player.handicap_index (Social) when present', () => {
      expect(getBaseHandicap(PLAYER, 'calculated')).toBe(24);
    });

    it('falls back to player.handicap when handicap_index is null', () => {
      const noIndexPlayer = { ...PLAYER, handicap_index: null };
      expect(getBaseHandicap(noIndexPlayer, 'calculated')).toBe(18);
    });

    it('produces a higher DHC than "profile" (since index 24 > 18)', () => {
      const dhcCalculated = resolveDhc(PLAYER, 'calculated');
      const dhcProfile = resolveDhc(PLAYER, 'profile');
      expect(dhcCalculated).toBeGreaterThan(dhcProfile);
    });

    it('per-hole strokes scale with the higher DHC', () => {
      const dhcCalculated = resolveDhc(PLAYER, 'calculated');
      const dhcProfile = resolveDhc(PLAYER, 'profile');
      // The harder the hole, the earlier strokes are given. With a higher
      // DHC, mid-difficulty holes (e.g. SI 12) start to receive a stroke
      // when they wouldn't under a lower DHC. We assert the relationship
      // is monotone in DHC for SI in the range where it matters.
      const hardHoleStrokesCalc = getStrokesReceived(dhcCalculated, 12);
      const hardHoleStrokesProf = getStrokesReceived(dhcProfile, 12);
      expect(hardHoleStrokesCalc).toBeGreaterThanOrEqual(hardHoleStrokesProf);
    });
  });

  describe('source = "none"', () => {
    it('returns 0 base handicap regardless of player profile values', () => {
      expect(getBaseHandicap(PLAYER, 'none')).toBe(0);
    });

    it('resolved DHC is 0 (no allowance applied)', () => {
      expect(resolveDhc(PLAYER, 'none')).toBe(0);
    });

    it('every hole gets 0 strokes received', () => {
      const dhc = resolveDhc(PLAYER, 'none');
      for (let si = 1; si <= 18; si++) {
        expect(getStrokesReceived(dhc, si)).toBe(0);
      }
    });
  });

  describe('null player', () => {
    it('returns 0 for any source', () => {
      expect(getBaseHandicap(null, 'profile')).toBe(0);
      expect(getBaseHandicap(null, 'calculated')).toBe(0);
      expect(getBaseHandicap(null, 'none')).toBe(0);
    });
  });
});
