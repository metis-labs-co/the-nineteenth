import { isHoleScored, planEndRoundEarly } from './endRoundEarly';
import type { Hole, Scorecard } from '@/types';
import type { NineType } from '@/types/database/enums';

type Scores = Scorecard['scores'];

const hole = (n: number): Hole => ({ number: n as Hole['number'], par: 4, strokeIndex: n });
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const EIGHTEEN: Hole[] = range(1, 18).map(hole);

const SAM = { id: 'p-sam', name: 'Sam' };
const DAVE = { id: 'p-dave', name: 'Dave' };
const PLAYERS = [SAM, DAVE];

const strokesOn = (holeNumbers: number[], strokes = 4): Scores =>
  Object.fromEntries(holeNumbers.map((h) => [h, { strokes }]));

const plan = (byPlayer: Record<string, Scores>, nineType: NineType = 'full', holes: Hole[] = EIGHTEEN) =>
  planEndRoundEarly({
    holes,
    nineType,
    players: PLAYERS,
    scorecards: new Map(
      Object.entries(byPlayer).map(([id, scores]): [string, { scores: Scores }] => [id, { scores }])
    ),
  });

describe('isHoleScored', () => {
  it('is false for a missing or zero-stroke score', () => {
    expect(isHoleScored(null)).toBe(false);
    expect(isHoleScored(undefined)).toBe(false);
    expect(isHoleScored({ strokes: 0 })).toBe(false);
    expect(isHoleScored({ strokes: 0, didNotAttempt: true })).toBe(false);
  });

  it('is true for strokes > 0, including a pickup', () => {
    expect(isHoleScored({ strokes: 4 })).toBe(true);
    expect(isHoleScored({ strokes: 10 })).toBe(true);
    expect(isHoleScored({ strokes: 10, pickedUp: true })).toBe(true);
  });

  it('is true for a multi-ball score when any ball has strokes', () => {
    expect(isHoleScored({ balls: [{ strokes: 0 }, { strokes: 5 }] })).toBe(true);
    expect(isHoleScored({ balls: [{ strokes: 0 }] })).toBe(false);
    expect(isHoleScored({ balls: [] })).toBe(false);
  });
});

describe('planEndRoundEarly', () => {
  it('returns null when no hole is complete for every player', () => {
    expect(plan({ [SAM.id]: strokesOn(range(1, 3)), [DAVE.id]: {} })).toBeNull();
  });

  it('returns null when a player has no scorecard at all', () => {
    expect(plan({ [SAM.id]: strokesOn(range(1, 3)) })).toBeNull();
  });

  it('returns null when every planned hole is complete (that is a normal submit)', () => {
    expect(plan({ [SAM.id]: strokesOn(range(1, 18)), [DAVE.id]: strokesOn(range(1, 18)) })).toBeNull();
    expect(plan({ [SAM.id]: strokesOn(range(1, 9)), [DAVE.id]: strokesOn(range(1, 9)) }, 'front9')).toBeNull();
  });

  it('ends after the last hole every player has scored and drops a half-scored hole', () => {
    expect(plan({ [SAM.id]: strokesOn(range(1, 7)), [DAVE.id]: strokesOn(range(1, 6)) })).toEqual({
      holesPlayed: 6,
      plannedHoles: 18,
      nineType: 'full',
      lastHoleNumber: 6,
      removedScores: [{ playerId: SAM.id, playerName: 'Sam', holeNumber: 7 }],
    });
  });

  it('stops at a skipped hole and removes every later score, hole by hole', () => {
    const both = strokesOn([...range(1, 5), 7, 8]);
    const result = plan({ [SAM.id]: both, [DAVE.id]: both });
    expect(result?.holesPlayed).toBe(5);
    expect(result?.lastHoleNumber).toBe(5);
    expect(result?.removedScores).toEqual([
      { playerId: SAM.id, playerName: 'Sam', holeNumber: 7 },
      { playerId: DAVE.id, playerName: 'Dave', holeNumber: 7 },
      { playerId: SAM.id, playerName: 'Sam', holeNumber: 8 },
      { playerId: DAVE.id, playerName: 'Dave', holeNumber: 8 },
    ]);
  });

  it('does not count a did-not-attempt hole (strokes 0) as scored', () => {
    const result = plan({
      [SAM.id]: strokesOn(range(1, 6)),
      [DAVE.id]: { ...strokesOn(range(1, 3)), 4: { strokes: 0, didNotAttempt: true }, ...strokesOn([5, 6]) },
    });
    expect(result?.holesPlayed).toBe(3);
    expect(result?.removedScores).toEqual([
      { playerId: SAM.id, playerName: 'Sam', holeNumber: 4 },
      { playerId: SAM.id, playerName: 'Sam', holeNumber: 5 },
      { playerId: DAVE.id, playerName: 'Dave', holeNumber: 5 },
      { playerId: SAM.id, playerName: 'Sam', holeNumber: 6 },
      { playerId: DAVE.id, playerName: 'Dave', holeNumber: 6 },
    ]);
  });

  it('counts a pickup on hole N as scored (Review Focus #4)', () => {
    const result = plan({
      [SAM.id]: strokesOn(range(1, 6)),
      [DAVE.id]: { ...strokesOn(range(1, 5)), 6: { strokes: 10 } },
    });
    expect(result?.holesPlayed).toBe(6);
    expect(result?.removedScores).toEqual([]);
  });

  it('removes a pickup alone on hole N+1 (Review Focus #4)', () => {
    const result = plan({
      [SAM.id]: { ...strokesOn(range(1, 6)), 7: { strokes: 10 } },
      [DAVE.id]: strokesOn(range(1, 6)),
    });
    expect(result?.holesPlayed).toBe(6);
    expect(result?.removedScores).toEqual([{ playerId: SAM.id, playerName: 'Sam', holeNumber: 7 }]);
  });

  it('numbers a back-9 round from hole 10 (Review Focus #2)', () => {
    const result = plan(
      { [SAM.id]: strokesOn(range(10, 16)), [DAVE.id]: strokesOn(range(10, 15)) },
      'back9'
    );
    expect(result).toEqual({
      holesPlayed: 6,
      plannedHoles: 9,
      nineType: 'back9',
      lastHoleNumber: 15,
      removedScores: [{ playerId: SAM.id, playerName: 'Sam', holeNumber: 16 }],
    });
  });

  it('ignores front-nine scores on a back-9 round', () => {
    const result = plan(
      {
        [SAM.id]: { ...strokesOn(range(1, 9)), ...strokesOn(range(10, 12)) },
        [DAVE.id]: strokesOn(range(10, 12)),
      },
      'back9'
    );
    expect(result?.holesPlayed).toBe(3);
    expect(result?.lastHoleNumber).toBe(12);
    expect(result?.removedScores).toEqual([]);
  });

  it('treats an 18-hole round ended after exactly 9 as an ordinary early end', () => {
    const result = plan({ [SAM.id]: strokesOn(range(1, 9)), [DAVE.id]: strokesOn(range(1, 10)) });
    expect(result).toEqual({
      holesPlayed: 9,
      plannedHoles: 18,
      nineType: 'full',
      lastHoleNumber: 9,
      removedScores: [{ playerId: DAVE.id, playerName: 'Dave', holeNumber: 10 }],
    });
  });

  it('handles holes passed in any order', () => {
    const shuffled = [...EIGHTEEN].reverse();
    const result = plan({ [SAM.id]: strokesOn(range(1, 7)), [DAVE.id]: strokesOn(range(1, 6)) }, 'full', shuffled);
    expect(result?.holesPlayed).toBe(6);
    expect(result?.lastHoleNumber).toBe(6);
  });

  it.each<{ nineType: NineType; first: number; last: number }>([
    { nineType: 'full', first: 1, last: 18 },
    { nineType: 'front9', first: 1, last: 9 },
    { nineType: 'back9', first: 10, last: 18 },
  ])('returns null when the first internal hole is missing for $nineType', ({ nineType, first, last }) => {
    const scores = strokesOn(range(first, first + 3));
    const holes = range(first + 1, last).map(hole);

    expect(plan({ [SAM.id]: scores, [DAVE.id]: scores }, nineType, holes)).toBeNull();
  });

  it.each<{ nineType: NineType; first: number; last: number; plannedHoles: number }>([
    { nineType: 'full', first: 1, last: 18, plannedHoles: 18 },
    { nineType: 'front9', first: 1, last: 9, plannedHoles: 9 },
    { nineType: 'back9', first: 10, last: 18, plannedHoles: 9 },
  ])('stops at an interior metadata gap for $nineType and removes later scores', ({ nineType, first, last, plannedHoles }) => {
    const holes = range(first, last).filter((n) => n !== first + 2).map(hole).reverse();
    const scores = strokesOn([first, first + 1, first + 3, first + 4]);

    expect(plan({ [SAM.id]: scores, [DAVE.id]: scores }, nineType, holes)).toEqual({
      holesPlayed: 2,
      plannedHoles,
      nineType,
      lastHoleNumber: first + 1,
      removedScores: [
        { playerId: SAM.id, playerName: 'Sam', holeNumber: first + 3 },
        { playerId: DAVE.id, playerName: 'Dave', holeNumber: first + 3 },
        { playerId: SAM.id, playerName: 'Sam', holeNumber: first + 4 },
        { playerId: DAVE.id, playerName: 'Dave', holeNumber: first + 4 },
      ],
    });
  });

  it('does not mutate the source hole array, scorecard map, or nested scores', () => {
    const holes = [hole(4), hole(2), hole(1), hole(3)];
    const originalHoles = holes.map((h) => ({ ...h }));
    holes.forEach(Object.freeze);
    Object.freeze(holes);
    const samScores: Scores = { 1: { strokes: 4 }, 2: { balls: [{ strokes: 0 }, { strokes: 5 }] }, 4: { strokes: 10 } };
    const daveScores = strokesOn([1, 2]);
    Object.values(samScores).forEach((score) => {
      if ('balls' in score) {
        score.balls.forEach(Object.freeze);
        Object.freeze(score.balls);
      }
      Object.freeze(score);
    });
    Object.values(daveScores).forEach(Object.freeze);
    Object.freeze(samScores);
    Object.freeze(daveScores);
    const samCard = Object.freeze({ scores: samScores });
    const daveCard = Object.freeze({ scores: daveScores });
    const scorecards = new Map([[SAM.id, samCard], [DAVE.id, daveCard]]);
    const originalEntries = JSON.parse(JSON.stringify([...scorecards]));

    expect(planEndRoundEarly({ holes, nineType: 'full', players: PLAYERS, scorecards })).toEqual({
      holesPlayed: 2,
      plannedHoles: 18,
      nineType: 'full',
      lastHoleNumber: 2,
      removedScores: [{ playerId: SAM.id, playerName: 'Sam', holeNumber: 4 }],
    });
    expect(holes).toEqual(originalHoles);
    expect([...scorecards]).toEqual(originalEntries);
    expect(scorecards.get(SAM.id)).toBe(samCard);
    expect(scorecards.get(DAVE.id)).toBe(daveCard);
    expect(samCard.scores).toBe(samScores);
    expect(daveCard.scores).toBe(daveScores);
  });

  it('treats a multi-ball card as scored when any ball has strokes', () => {
    const result = planEndRoundEarly({
      holes: EIGHTEEN,
      nineType: 'full',
      players: [SAM],
      scorecards: new Map<string, { scores: Scores }>([
        [SAM.id, { scores: { 1: { balls: [{ strokes: 4 }, { strokes: 5 }] }, 2: { balls: [{ strokes: 0 }, { strokes: 4 }] } } }],
      ]),
    });
    expect(result?.holesPlayed).toBe(2);
    expect(result?.removedScores).toEqual([]);
  });

  it('returns null when there are no players or no planned holes', () => {
    expect(planEndRoundEarly({ holes: EIGHTEEN, nineType: 'full', players: [], scorecards: new Map() })).toBeNull();
    expect(planEndRoundEarly({ holes: [], nineType: 'full', players: PLAYERS, scorecards: new Map() })).toBeNull();
  });
});
