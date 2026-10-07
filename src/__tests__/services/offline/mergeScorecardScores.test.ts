import { mergeScorecardScores } from '@/services/offline/sync/mergeScorecardScores';
import type { HoleScore } from '@/types';

const T1 = '2026-10-07T01:00:00.000Z';
const T2 = '2026-10-07T02:00:00.000Z';
const h = (strokes: number, editedAt?: string, extra: Partial<HoleScore> = {}): HoleScore =>
  ({ strokes, ...(editedAt && { editedAt }), ...extra });

describe('mergeScorecardScores', () => {
  it.each([
    // name, local, server, expected strokes per hole, localChanged, localAhead
    ['takes a hole only the server has', { 1: h(4, T1) }, { 2: h(5, T1) }, { 1: 4, 2: 5 }, true, true],
    ['keeps a hole only local has', { 1: h(4, T1) }, {}, { 1: 4 }, false, true],
    ['local newer wins', { 1: h(4, T2) }, { 1: h(6, T1) }, { 1: 4 }, false, true],
    ['server newer wins', { 1: h(4, T1) }, { 1: h(6, T2) }, { 1: 6 }, true, false],
    ['stamped beats unstamped (1.14.0) server', { 1: h(4, T1) }, { 1: h(6) }, { 1: 4 }, false, true],
    ['stamped server beats unstamped local', { 1: h(4) }, { 1: h(6, T1) }, { 1: 6 }, true, false],
    ['both unstamped, strokes differ: server wins', { 1: h(4) }, { 1: h(6) }, { 1: 6 }, true, false],
    ['both unstamped, strokes equal: same edit', { 1: h(4) }, { 1: h(4) }, { 1: 4 }, false, false],
    ['same editedAt: same edit, nothing changes', { 1: h(4, T1) }, { 1: h(4, T1) }, { 1: 4 }, false, false],
  ])('%s', (_name, local, server, expected, changed, ahead) => {
    const result = mergeScorecardScores(local, server);
    const strokes = Object.fromEntries(Object.entries(result.scores).map(([k, v]) => [Number(k), (v as HoleScore).strokes]));
    expect(strokes).toEqual(expected);
    expect(result.localChanged).toBe(changed);
    expect(result.localAhead).toBe(ahead);
  });

  it('an echo with reordered keys and missing local-only fields keeps the local hole intact', () => {
    const local = { 1: h(10, T1, { scoredBy: 'me', pickedUp: true, putts: 3 }) };
    const echo = { '1': { editedAt: T1, putts: 3, strokes: 10 } as HoleScore }; // jsonb order, no scoredBy/pickedUp
    const result = mergeScorecardScores(local, echo);
    expect(result.scores[1]).toBe(local[1]);
    expect(result).toMatchObject({ localChanged: false, localAhead: false });
  });

  it('moves a hole as one unit (putts travel with strokes)', () => {
    const result = mergeScorecardScores({ 1: h(4, T1, { putts: 1 }) }, { 1: h(6, T2, { putts: 3 }) });
    expect(result.scores[1]).toEqual({ strokes: 6, editedAt: T2, putts: 3 });
  });

  it('accepts string hole keys from the server JSON', () => {
    const result = mergeScorecardScores({}, { '3': h(5, T1) } as Record<string, HoleScore>);
    expect((result.scores[3] as HoleScore).strokes).toBe(5);
  });

  it('keeps a local multi-ball hole untouched', () => {
    const balls = { balls: [h(4, T1), h(5, T1)] };
    const result = mergeScorecardScores({ 1: balls }, null);
    expect(result.scores[1]).toBe(balls);
    expect(result.localAhead).toBe(false);
  });
});
