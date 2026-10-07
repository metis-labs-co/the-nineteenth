// src/store/utils/scorecardCalculations.test.ts
import { calculatePlayerTotals } from './scorecardCalculations';
import type { Scorecard, Hole, TeeBox } from '@/types';
import type { NineType } from '@/types/database/enums';
import { calculateHandicapData } from '@/services/offline/sync/scorecardSync';
import { getStrokesReceived } from '@/utils/scoring';

function hole(number: number, par: number, strokeIndex: number): Hole {
  return { number, par, strokeIndex } as Hole;
}

/** Minimal scorecard with a zero-handicap player so strokesReceived === 0. */
function card(scores: Record<number, { strokes: number }>): Scorecard {
  return {
    player: { id: 'p1', name: 'Test', handicap: 0, handicapIndex: 0, gender: null },
    scores,
  } as unknown as Scorecard;
}

describe('calculatePlayerTotals — pickup handling', () => {
  it('counts a pickup hole as net double bogey in gross instead of excluding it', () => {
    const holes = [hole(1, 4, 1), hole(2, 4, 2)];
    // Hole 2 is a pickup (strokes === PICKUP_SCORE === 10).
    const scorecard = card({ 1: { strokes: 5 }, 2: { strokes: 10 } });

    const totals = calculatePlayerTotals(scorecard, holes, 'stroke', {
      handicapSource: 'none',
    });

    // Hole 1 completed = 5; hole 2 pickup -> net double bogey = par 4 + 2 + 0 = 6.
    expect(totals.gross).toBe(11);
  });

  it('still awards 0 Stableford points for a picked-up hole', () => {
    const holes = [hole(1, 4, 1), hole(2, 4, 2)];
    const scorecard = card({ 1: { strokes: 4 }, 2: { strokes: 10 } });

    const totals = calculatePlayerTotals(scorecard, holes, 'stableford', {
      handicapSource: 'none',
    });

    // Hole 1: net par = 2 pts. Hole 2 pickup (net double bogey) = 0 pts.
    expect(totals.points).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Daily handicap used by the store's live totals (characterization).
//
// Player: HI 20, male. Tee: slope 120, CR 71 (no dedicated 9-hole ratings).
// Every hole is a bogey 5 on a par 4.
// ---------------------------------------------------------------------------

const DHC_TEE = { name: 'Members', color: 'white', slopeRating: 120, courseRating: 71 };

function hcCard(scores: Record<number, { strokes: number }>): Scorecard {
  return {
    player: { id: 'p1', name: 'Test', handicap: 20, handicapIndex: 20, gender: 'male' },
    scores,
  } as unknown as Scorecard;
}

/** Holes 1..18, par 4, stroke index = hole number. */
const EIGHTEEN = Array.from({ length: 18 }, (_, i) => hole(i + 1, 4, i + 1));
/** Front nine as filtered by the store: holes 1..9 with odd stroke indexes 1..17. */
const FRONT_NINE = Array.from({ length: 9 }, (_, i) => hole(i + 1, 4, i * 2 + 1));

function allBogeys(holes: Hole[]) {
  return Object.fromEntries(holes.map((h) => [h.number, { strokes: 5 }]));
}

describe('calculatePlayerTotals — daily handicap from the selected tee', () => {
  it('18 holes: uses the full WHS daily handicap (19) for strokes received', () => {
    const totals = calculatePlayerTotals(hcCard(allBogeys(EIGHTEEN)), EIGHTEEN, 'stroke', {
      selectedTee: DHC_TEE,
      handicapSource: 'profile',
    });
    // DHC = round(((20 × 120/113) + (71 − 72)) × 0.93 × 0.9986) = round(18.80) = 19
    // → 19 strokes over 18 holes. Gross 90, net 71.
    expect(totals.gross).toBe(90);
    expect(totals.net).toBe(71);
  });

  it('9 holes: uses the nine-aware DHC (9), not the inflated 18-CR-vs-9-par value (52)', () => {
    const totals = calculatePlayerTotals(hcCard(allBogeys(FRONT_NINE)), FRONT_NINE, 'stroke', {
      selectedTee: DHC_TEE,
      handicapSource: 'profile',
      nineType: 'front9',
    });
    // DHC = round(((20/2 × 120/113) + (71/2 − 36)) × 0.93 × 0.9986) = round(9.40) = 9
    // → 1 stroke on SI 1, 3, 5, 7, 9 = 5 strokes. Gross 45, net 40.
    // (Previously 52 → 26 strokes → net 19.)
    expect(totals.gross).toBe(45);
    expect(totals.net).toBe(40);
  });
});

describe('calculatePlayerTotals — store DHC == sync DHC on 9-hole rounds (I4 parity)', () => {
  const BACK_NINE = Array.from({ length: 9 }, (_, i) => hole(i + 10, 4, i * 2 + 2));

  const cases: { label: string; nineType: NineType; holes: Hole[]; tee: TeeBox }[] = [
    { label: 'front9, no 9-hole ratings', nineType: 'front9', holes: FRONT_NINE, tee: DHC_TEE },
    {
      label: 'front9, dedicated 9-hole ratings',
      nineType: 'front9',
      holes: FRONT_NINE,
      tee: { ...DHC_TEE, slopeRatingFront9: 118, courseRatingFront9: 35.2 },
    },
    {
      label: 'back9, dedicated 9-hole ratings',
      nineType: 'back9',
      holes: BACK_NINE,
      tee: { ...DHC_TEE, slopeRatingBack9: 131, courseRatingBack9: 36.4 },
    },
  ];

  it.each(cases)('$label', ({ nineType, holes, tee }) => {
    const scores = allBogeys(holes);
    const coursePar = holes.reduce((sum, h) => sum + h.par, 0);

    const { dailyHandicapUsed } = calculateHandicapData({
      id: 'sc-1',
      roundId: '550e8400-e29b-41d4-a716-446655440000',
      playerId: 'p1',
      scores,
      totalGross: 45,
      totalNet: 0,
      status: 'completed',
      teeData: tee,
      coursePar,
      playerGender: 'male',
      playerHandicap: 20,
      syncGameType: 'stroke',
      syncNineType: nineType,
      syncHoles: holes,
    } as unknown as Scorecard);
    expect(dailyHandicapUsed).not.toBeNull();

    const totals = calculatePlayerTotals(hcCard(scores), holes, 'stroke', {
      selectedTee: tee,
      handicapSource: 'profile',
      nineType,
    });

    const syncStrokes = holes.reduce(
      (sum, h) => sum + getStrokesReceived(dailyHandicapUsed as number, h.strokeIndex),
      0,
    );
    expect(totals.net).toBe(totals.gross - syncStrokes);
  });
});
