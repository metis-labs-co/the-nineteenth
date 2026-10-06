// src/utils/scoring.golden.test.ts
//
// Characterization ("golden value") tests for INVARIANTS I1-I3 documented in
// docs/guides/SCORING_ARCHITECTURE.md. These lock CURRENT behaviour of the
// shared scoring math so future edits fail loudly on drift. They are expected
// to PASS immediately against existing code — see Step 3 of the brief for the
// mutation check that proves the net actually catches a regression.
import {
  getMatchPlayStrokes,
  getFourBallStrokes,
  getEffectiveGrossStrokes,
} from './scoring';

// I1 — singles match play, difference method
describe('INVARIANT I1: singles match-play difference method', () => {
  it('only the higher handicap gets strokes, equal to the difference', () => {
    // diff 6, SI 1 -> higher player gets 1 stroke
    expect(getMatchPlayStrokes(18, 12, 1)).toEqual({ a: 1, b: 0 });
    // reversed
    expect(getMatchPlayStrokes(12, 18, 1)).toEqual({ a: 0, b: 1 });
    // equal handicaps -> no strokes
    expect(getMatchPlayStrokes(12, 12, 1)).toEqual({ a: 0, b: 0 });
    // diff 20, SI 3 -> 20 gives 1 stroke to SI<=18 plus extra to SI<=2; SI 3 -> 1
    expect(getMatchPlayStrokes(20, 0, 3)).toEqual({ a: 1, b: 0 });
  });
});

// I2 — four-ball, relative to lowest in match
describe('INVARIANT I2: four-ball relative-to-lowest', () => {
  it('lowest plays off scratch; others get the difference by SI', () => {
    const players = [
      { playerId: 'p1', handicap: 5 },
      { playerId: 'p2', handicap: 12 },
      { playerId: 'p3', handicap: 5 },
      { playerId: 'p4', handicap: 24 },
    ];
    const si1 = getFourBallStrokes(players, 1);
    expect(si1.get('p1')).toBe(0); // tied lowest
    expect(si1.get('p3')).toBe(0); // tied lowest
    expect(si1.get('p2')).toBe(1); // diff 7 -> floor(7/18)=0 + (SI1<=7) = 1
    expect(si1.get('p4')).toBe(2); // diff 19 -> floor(19/18)=1 + (SI1<=19%18=1) = 2
    expect(getFourBallStrokes([], 1).size).toBe(0);
  });
});

// I3 — pickup = net double bogey
describe('INVARIANT I3: pickup counts as net double bogey', () => {
  it('caps a pickup at par + 2 + strokesReceived', () => {
    expect(getEffectiveGrossStrokes(10, 5, 1)).toBe(8); // 5+2+1
    expect(getEffectiveGrossStrokes(10, 4, 0)).toBe(6); // 4+2+0
    expect(getEffectiveGrossStrokes(10, 3, 1)).toBe(6); // 3+2+1
  });
  it('leaves a real score untouched', () => {
    expect(getEffectiveGrossStrokes(5, 4, 1)).toBe(5);
  });
});
