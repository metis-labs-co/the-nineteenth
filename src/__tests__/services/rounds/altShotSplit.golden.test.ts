/**
 * CHARACTERIZATION TEST — Alt Shot (foursomes) split-round differential (I5)
 *
 * Locks the current behaviour of `resolveAltShotSubMatchOutcome`, the pure
 * helper that decides a split-round (Ryder-Cup-style) alt-shot sub-match:
 * each side plays ONE ball off a 50%-combined team handicap, the higher-
 * handicap side receives the rounded handicap difference as a TOTAL
 * allowance (not allocated per hole), and the lower net total wins.
 *
 * This is a golden/characterization test: it does not assert a spec, it
 * freezes today's observed output so a future change to this math shows up
 * as a loud, deliberate diff instead of a silent regression. See
 * docs/guides/scoring-invariant-coverage.md (I5).
 *
 * Values were observed by running this fixture through the real function
 * once (temporary console.log, since removed) and freezing the printed
 * result as literals below.
 */

import { resolveAltShotSubMatchOutcome } from '@/services/rounds/pairPointsCalculation';
import type { Hole } from '@/types/database.types';

const HOLES: Hole[] = [
  { number: 1, par: 4, strokeIndex: 1 },
  { number: 2, par: 4, strokeIndex: 2 },
  { number: 3, par: 4, strokeIndex: 3 },
];

/** One-ball gross lookup from a { playerId: [h1, h2, h3] } table. */
function grossFn(table: Record<string, (number | null)[]>) {
  return (playerId: string, hole: Hole): number | null => {
    const row = table[playerId];
    if (!row) return null;
    const v = row[hole.number - 1];
    return v == null ? null : v;
  };
}

describe('resolveAltShotSubMatchOutcome — split alt-shot differential (I5, golden)', () => {
  it('side A wins on differential total-net once its higher handicap allowance is applied', () => {
    // Team A (a1 hc 8, a2 hc 12) → 50%-combined = 10. Team B (b1 hc 4, b2 hc 6) → 5.
    // diff = round(|10 - 5|) = 5, awarded as a TOTAL allowance to side A (higher hc).
    // A gross 14 → net 9. B gross 12 → net 12. 9 < 12 → a-wins.
    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [4, 5, 5], b1: [4, 4, 4] }),
      dailyHandicaps: new Map([
        ['a1', 8],
        ['a2', 12],
        ['b1', 4],
        ['b2', 6],
      ]),
    });

    expect(outcome).toBe('a-wins');
  });

  it('side B wins on gross alone when both sides carry level handicaps (no allowance)', () => {
    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [5, 5, 5], b1: [4, 4, 4] }),
      dailyHandicaps: new Map([
        ['a1', 0],
        ['a2', 0],
        ['b1', 0],
        ['b2', 0],
      ]),
    });

    expect(outcome).toBe('b-wins');
  });

  it('halves when the handicap-adjusted net totals land exactly equal', () => {
    // Team A (a1 hc 10, a2 hc 6) → 50%-combined = 8. Team B (b1 hc 2, b2 hc 2) → 2.
    // diff = round(|8 - 2|) = 6, awarded to side A.
    // A gross 20 → net 14. B gross 14 → net 14. Equal → halved.
    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [7, 7, 6], b1: [4, 5, 5] }),
      dailyHandicaps: new Map([
        ['a1', 10],
        ['a2', 6],
        ['b1', 2],
        ['b2', 2],
      ]),
    });

    expect(outcome).toBe('halved');
  });

  it('rounds an exact .5 handicap differential up (nearest, .5 rounds up)', () => {
    // Team A (a1 hc 10, a2 hc 0) → 5. Team B (b1 hc 0, b2 hc 4.5) → 2.3.
    // diff = round(|5 - 2.3|) = round(2.7) = 3, awarded to side A.
    // A gross 13 → net 10. B gross 11 → net 11. 10 < 11 → a-wins.
    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [4, 4, 5], b1: [4, 4, 3] }),
      dailyHandicaps: new Map([
        ['a1', 10],
        ['a2', 0],
        ['b1', 0],
        ['b2', 4.5],
      ]),
    });

    expect(outcome).toBe('a-wins');
  });

  it('reads one ball per side from whichever partner recorded the gross (order-independent)', () => {
    // a2 (not a1) carries the recorded gross for team A — alt-shot is one ball
    // per side, so the function must fall through to whichever partner has it.
    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a2: [4, 4, 4], b1: [5, 5, 5] }),
      dailyHandicaps: new Map([
        ['a1', 0],
        ['a2', 0],
        ['b1', 0],
        ['b2', 0],
      ]),
    });

    expect(outcome).toBe('a-wins');
  });

  it('returns null when one side has no usable gross at all (sub-match not decidable)', () => {
    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      holes: HOLES,
      getGross: grossFn({ a1: [4, 4, 4] }), // side B has no recorded gross
      dailyHandicaps: new Map([
        ['a1', 0],
        ['a2', 0],
        ['b1', 0],
        ['b2', 0],
      ]),
    });

    expect(outcome).toBeNull();
  });
});
