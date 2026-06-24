import { altShotTeePlayer, deriveAltShotShotCounts } from './altShotContributions';

const A = 'player-a';
const B = 'player-b';

describe('altShotTeePlayer', () => {
  it('first-tee player tees odd holes, partner tees even holes', () => {
    expect(altShotTeePlayer(A, B, 1)).toBe(A);
    expect(altShotTeePlayer(A, B, 2)).toBe(B);
    expect(altShotTeePlayer(A, B, 17)).toBe(A);
    expect(altShotTeePlayer(A, B, 18)).toBe(B);
  });
});

describe('deriveAltShotShotCounts', () => {
  it('returns all-zero when strokes is missing, zero, or a pickup', () => {
    for (const strokes of [undefined, 0, 99]) {
      const r = deriveAltShotShotCounts(A, B, 1, strokes);
      expect(r[A]).toEqual({ drives: 0, approaches: 0, putts: 0, total: 0 });
      expect(r[B]).toEqual({ drives: 0, approaches: 0, putts: 0, total: 0 });
    }
  });

  it('odd hole, 4 strokes: tee player drives+approach, partner approach+putt', () => {
    // hole 1 -> A tees. strokes: 1=A(drive) 2=B(appr) 3=A(appr) 4=B(putt)
    const r = deriveAltShotShotCounts(A, B, 1, 4);
    expect(r[A]).toEqual({ drives: 1, approaches: 1, putts: 0, total: 2 });
    expect(r[B]).toEqual({ drives: 0, approaches: 1, putts: 1, total: 2 });
  });

  it('odd hole, 3 strokes: tee player takes the putt (odd final stroke)', () => {
    // hole 3 -> A tees. 1=A(drive) 2=B(appr) 3=A(putt)
    const r = deriveAltShotShotCounts(A, B, 3, 3);
    expect(r[A]).toEqual({ drives: 1, approaches: 0, putts: 1, total: 2 });
    expect(r[B]).toEqual({ drives: 0, approaches: 1, putts: 0, total: 1 });
  });

  it('even hole, 4 strokes: partner is the tee player', () => {
    // hole 2 -> B tees. 1=B(drive) 2=A(appr) 3=B(appr) 4=A(putt)
    const r = deriveAltShotShotCounts(A, B, 2, 4);
    expect(r[B]).toEqual({ drives: 1, approaches: 1, putts: 0, total: 2 });
    expect(r[A]).toEqual({ drives: 0, approaches: 1, putts: 1, total: 2 });
  });

  it('ace (1 stroke): tee player gets a drive only, no putt', () => {
    const r = deriveAltShotShotCounts(A, B, 1, 1);
    expect(r[A]).toEqual({ drives: 1, approaches: 0, putts: 0, total: 1 });
    expect(r[B]).toEqual({ drives: 0, approaches: 0, putts: 0, total: 0 });
  });

  it('2 strokes: tee drive then partner putt', () => {
    const r = deriveAltShotShotCounts(A, B, 1, 2);
    expect(r[A]).toEqual({ drives: 1, approaches: 0, putts: 0, total: 1 });
    expect(r[B]).toEqual({ drives: 0, approaches: 0, putts: 1, total: 1 });
  });

  it('per-player total equals ceil/floor of strokes', () => {
    const r = deriveAltShotShotCounts(A, B, 1, 7); // A tees: A=4, B=3
    expect(r[A].total).toBe(4);
    expect(r[B].total).toBe(3);
  });
});
