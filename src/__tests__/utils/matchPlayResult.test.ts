/**
 * computeStandaloneMatchResult — the round-list match pill.
 */

import {
  computeStandaloneMatchResult,
  standaloneMatchHoles,
  resolveEndedAfter,
  type ScorecardForMatchPlay,
} from '@/utils/matchPlayResult';
import { create18Holes } from '@/__tests__/utils/testFixtures';

const HOLES = create18Holes();
const FRONT_NINE = HOLES.filter((h) => h.number <= 9);

/** A scorecard with `strokes` keyed by hole number (as the DB stores them). */
function card(
  playerId: string,
  name: string | null,
  strokesByHole: Record<number, number>,
  dailyHandicap: number | null = 0
): ScorecardForMatchPlay {
  const scores: NonNullable<ScorecardForMatchPlay['scores']> = {};
  for (const [hole, strokes] of Object.entries(strokesByHole)) {
    scores[hole] = { strokes };
  }
  return {
    player_id: playerId,
    scores,
    daily_handicap_used: dailyHandicap,
    player: name ? { id: playerId, name } : null,
  };
}

/** The same stroke count on holes `from`..`to` inclusive. */
function range(from: number, to: number, strokes: number): Record<number, number> {
  const out: Record<number, number> = {};
  for (let h = from; h <= to; h++) out[h] = strokes;
  return out;
}

describe('computeStandaloneMatchResult — current behaviour (characterization)', () => {
  it('returns null when no hole has a score from both players', () => {
    const sam = card('p1', 'Sam', range(1, 3, 4));
    const dave = card('p2', 'Dave', {});
    expect(computeStandaloneMatchResult(sam, dave, HOLES)).toBeNull();
  });

  it('halves a level match as "A/S"', () => {
    const sam = card('p1', 'Sam', range(1, 18, 4));
    const dave = card('p2', 'Dave', range(1, 18, 4));
    expect(computeStandaloneMatchResult(sam, dave, HOLES)).toEqual({
      winnerId: null,
      winnerName: 'Halved',
      margin: 'A/S',
    });
  });

  it('stops at the first close-out even if later holes swing back', () => {
    // Sam wins 1-10 (10 up with 8 to play); Dave wins 11-18.
    const sam = card('p1', 'Sam', { ...range(1, 10, 3), ...range(11, 18, 5) });
    const dave = card('p2', 'Dave', { ...range(1, 10, 5), ...range(11, 18, 3) });
    expect(computeStandaloneMatchResult(sam, dave, HOLES)).toEqual({
      winnerId: 'p1',
      winnerName: 'Sam',
      margin: '10&8',
    });
  });

  it('reports an incomplete card with no close-out against the unplayed holes', () => {
    // Legacy data: 6 of 18 scored, Sam 2 up (wins 1-2), nothing ended early.
    const sam = card('p1', 'Sam', { ...range(1, 2, 3), ...range(3, 6, 4) });
    const dave = card('p2', 'Dave', range(1, 6, 4));
    expect(computeStandaloneMatchResult(sam, dave, HOLES)?.margin).toBe('2&12');
  });

  it('skips holes either player has not scored', () => {
    const sam = card('p1', 'Sam', { 1: 3, 2: 3, 3: 4 });
    const dave = card('p2', 'Dave', { 1: 4, 3: 4 }); // no score on hole 2
    // Only holes 1 and 3 count: Sam 1 up with 16 to play.
    expect(computeStandaloneMatchResult(sam, dave, HOLES)?.margin).toBe('1&16');
  });

  it('allocates strokes by the difference method on stored daily handicaps (I1)', () => {
    // Hole 3 is stroke index 1. Sam (DHC 10) receives a stroke; equal gross 5.
    const sam = card('p1', 'Sam', { 3: 5 }, 10);
    const dave = card('p2', 'Dave', { 3: 5 }, 0);
    expect(computeStandaloneMatchResult(sam, dave, HOLES)).toEqual({
      winnerId: 'p1',
      winnerName: 'Sam',
      margin: '1&17',
    });
  });

  it("falls back to 'Unknown' when the winner has no player row", () => {
    const sam = card('p1', null, range(1, 10, 3));
    const dave = card('p2', 'Dave', range(1, 10, 5));
    expect(computeStandaloneMatchResult(sam, dave, HOLES)?.winnerName).toBe('Unknown');
  });

  it('judges a front-9 match against the full 18-hole card (the bug this task fixes)', () => {
    // Both score holes 1-9 only; Dave wins the 9th. Against 18 holes it reads "1&9".
    const sam = card('p1', 'Sam', range(1, 9, 4));
    const dave = card('p2', 'Dave', { ...range(1, 8, 4), 9: 3 });
    expect(computeStandaloneMatchResult(sam, dave, HOLES)?.margin).toBe('1&9');
  });
});

describe('standaloneMatchHoles', () => {
  it("narrows the course card to the round's nine", () => {
    expect(standaloneMatchHoles(HOLES, 'front9').map((h) => h.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(standaloneMatchHoles(HOLES, 'back9').map((h) => h.number)).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18,
    ]);
  });

  it('keeps all 18 for full, absent or unrecognised nine types', () => {
    expect(standaloneMatchHoles(HOLES, 'full')).toHaveLength(18);
    expect(standaloneMatchHoles(HOLES, null)).toHaveLength(18);
    expect(standaloneMatchHoles(HOLES, undefined)).toHaveLength(18);
    expect(standaloneMatchHoles(HOLES, 'front-nine')).toHaveLength(18);
  });
});

describe('computeStandaloneMatchResult — I10: no holes remaining', () => {
  it('reports a match won on the last hole as "N UP", never "N&0"', () => {
    // Level through 16; Sam wins 17 and 18.
    const sam = card('p1', 'Sam', { ...range(1, 16, 4), ...range(17, 18, 3) });
    const dave = card('p2', 'Dave', range(1, 18, 4));
    expect(computeStandaloneMatchResult(sam, dave, HOLES)).toEqual({
      winnerId: 'p1',
      winnerName: 'Sam',
      margin: '2 UP',
    });
  });

  it('reports a 9-hole match decided on the 9th as "1 UP"', () => {
    const sam = card('p1', 'Sam', range(1, 9, 4));
    const dave = card('p2', 'Dave', { ...range(1, 8, 4), 9: 3 });
    expect(computeStandaloneMatchResult(sam, dave, FRONT_NINE)).toEqual({
      winnerId: 'p2',
      winnerName: 'Dave',
      margin: '1 UP',
    });
  });

  it('reads a front-9 round as "1 UP" through the round-list composition', () => {
    // useRoundList: computeStandaloneMatchResult(a, b, standaloneMatchHoles(courseHoles, round.nineType))
    const sam = card('p1', 'Sam', range(1, 9, 4));
    const dave = card('p2', 'Dave', { ...range(1, 8, 4), 9: 3 });
    expect(computeStandaloneMatchResult(sam, dave, standaloneMatchHoles(HOLES, 'front9'))?.margin).toBe(
      '1 UP'
    );
  });
});

const BACK_NINE = HOLES.filter((h) => h.number >= 10);

describe('resolveEndedAfter', () => {
  it('honours a positive whole count below the planned holes', () => {
    expect(resolveEndedAfter(18, 6)).toBe(6);
    expect(resolveEndedAfter(9, 8)).toBe(8);
  });

  it('treats null, undefined, 0, negatives, fractions and ≥ planned as played-as-planned', () => {
    expect(resolveEndedAfter(18, null)).toBeNull();
    expect(resolveEndedAfter(18, undefined)).toBeNull();
    expect(resolveEndedAfter(18, 0)).toBeNull();
    expect(resolveEndedAfter(18, -3)).toBeNull();
    expect(resolveEndedAfter(18, 6.5)).toBeNull();
    expect(resolveEndedAfter(18, 18)).toBeNull();
    expect(resolveEndedAfter(9, 12)).toBeNull();
  });
});

describe('computeStandaloneMatchResult — ended early (holesPlayed)', () => {
  const samTwoUp = card('p1', 'Sam', { ...range(1, 2, 3), ...range(3, 6, 4) });
  const daveLevel = card('p2', 'Dave', range(1, 6, 4));

  it('18 planned, ended after 6 with Sam 2 up → "2 UP", not "2&12"', () => {
    expect(computeStandaloneMatchResult(samTwoUp, daveLevel, HOLES, 6)).toEqual({
      winnerId: 'p1',
      winnerName: 'Sam',
      margin: '2 UP',
    });
  });

  it('ended level → halved "A/S"', () => {
    const sam = card('p1', 'Sam', range(1, 6, 4));
    expect(computeStandaloneMatchResult(sam, daveLevel, HOLES, 6)).toEqual({
      winnerId: null,
      winnerName: 'Halved',
      margin: 'A/S',
    });
  });

  it('keeps a real close-out against the planned holes: 9 planned, 5 up after 5, ended at 6 → "5&4"', () => {
    const sam = card('p1', 'Sam', { ...range(1, 5, 3), 6: 4 });
    expect(computeStandaloneMatchResult(sam, daveLevel, FRONT_NINE, 6)?.margin).toBe('5&4');
  });

  it('9 planned, 4 up after 5, 6th halved → closed out on the 6th "4&3"', () => {
    const sam = card('p1', 'Sam', { ...range(1, 4, 3), ...range(5, 6, 4) });
    expect(computeStandaloneMatchResult(sam, daveLevel, FRONT_NINE, 6)?.margin).toBe('4&3');
  });

  it('9 planned, 4 up after 5, 6th lost → "3 UP"', () => {
    const sam = card('p1', 'Sam', { ...range(1, 4, 3), 5: 4, 6: 5 });
    expect(computeStandaloneMatchResult(sam, daveLevel, FRONT_NINE, 6)?.margin).toBe('3 UP');
  });

  it('ignores scores after the ended-after hole', () => {
    // Sam wins the 1st; a stale 7th-hole score (Dave wins) must not count.
    const sam = card('p1', 'Sam', { 1: 3, ...range(2, 6, 4), 7: 6 });
    const dave = card('p2', 'Dave', range(1, 7, 4));
    expect(computeStandaloneMatchResult(sam, dave, HOLES, 6)?.margin).toBe('1 UP');
  });

  it('walks holes 10–15 for a back-9 round ended after 6 → "2 UP", never "2&3"', () => {
    const sam = card('p1', 'Sam', { ...range(10, 11, 3), ...range(12, 15, 4) });
    const dave = card('p2', 'Dave', range(10, 15, 4));
    expect(computeStandaloneMatchResult(sam, dave, BACK_NINE, 6)?.margin).toBe('2 UP');
  });

  it('applies handicap strokes on the walked holes: DHC 10 v 0, ended after 6 → "3 UP"', () => {
    // create18Holes stroke indexes for holes 1-6: 7, 15, 1, 11, 5, 17.
    // getMatchPlayStrokes(10, 0, si) gives Sam 1 stroke where si ≤ 10 — holes 1, 3, 5.
    // Everyone cards 4: Sam nets 3 on 1, 3, 5 (wins) and halves 2, 4, 6.
    // 3 up after 6, never closed out against 18 planned.
    const sam = card('p1', 'Sam', range(1, 6, 4), 10);
    const dave = card('p2', 'Dave', range(1, 6, 4), 0);
    expect(computeStandaloneMatchResult(sam, dave, HOLES, 6)).toEqual({
      winnerId: 'p1',
      winnerName: 'Sam',
      margin: '3 UP',
    });
  });

  it('holesPlayed null behaves as played-as-planned (characterization)', () => {
    expect(computeStandaloneMatchResult(samTwoUp, daveLevel, HOLES, null)?.margin).toBe('2&12');
  });
});


describe('computeStandaloneMatchResult — physical ended cutoff regressions', () => {
  it.each([[HOLES], [BACK_NINE]])('returns no final pill when a retained hole is missing despite a scored N+1', (holes) => {
    const first = holes[0].number;
    const sam = card('p1', 'Sam', { [first]: 3, ...range(first + 2, first + 5, 4), [first + 6]: 6 });
    const dave = card('p2', 'Dave', range(first, first + 6, 4));
    expect(computeStandaloneMatchResult(sam, dave, holes, 6)).toBeNull();
  });

  it('returns no final pill for a partial ended prefix or empty cards', () => {
    const sam = card('p1', 'Sam', { 1: 3, 2: 4 });
    const dave = card('p2', 'Dave', { 1: 4, 2: 4 });
    expect(computeStandaloneMatchResult(sam, dave, HOLES, 6)).toBeNull();
    expect(computeStandaloneMatchResult(card('p1', 'Sam', {}), dave, HOLES, 6)).toBeNull();
    expect(computeStandaloneMatchResult(sam, dave, [], 6)).toBeNull();
  });

  it('preserves an earlier real planned close-out before an undecided retained hole', () => {
    const sam = card('p1', 'Sam', range(1, 5, 3));
    const dave = card('p2', 'Dave', range(1, 6, 4));
    expect(computeStandaloneMatchResult(sam, dave, FRONT_NINE, 6)?.margin).toBe('5&4');
  });

  it('sorts planned physical holes before cutting, leaving the input unchanged', () => {
    const holes = [...BACK_NINE].reverse();
    const sam = card('p1', 'Sam', { ...range(10, 11, 3), ...range(12, 15, 4), ...range(16, 18, 6) });
    const dave = card('p2', 'Dave', range(10, 18, 4));
    expect(computeStandaloneMatchResult(sam, dave, holes, 6)?.margin).toBe('2 UP');
    expect(holes.map((hole) => hole.number)).toEqual([18, 17, 16, 15, 14, 13, 12, 11, 10]);
  });

  it.each([undefined, null, 0, -2, 6.5, 18, 19, NaN, Infinity])(
    'retains legacy partial-card result for invalid cutoff %s', (cutoff) => {
      const sam = card('p1', 'Sam', { 1: 3, 2: 4 });
      const dave = card('p2', 'Dave', { 1: 4, 2: 4 });
      expect(computeStandaloneMatchResult(sam, dave, HOLES, cutoff)?.margin).toBe('1&16');
    }
  );
});
