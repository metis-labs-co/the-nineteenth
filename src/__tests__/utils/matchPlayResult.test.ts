/**
 * computeStandaloneMatchResult — the round-list match pill.
 */

import {
  computeStandaloneMatchResult,
  standaloneMatchHoles,
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
