import { applyRemoteScorecard } from '@/store/remoteScorecardMerge';
import type { Scorecard } from '@/types';

const T1 = '2026-10-07T01:00:00.000Z';
const T2 = '2026-10-07T02:00:00.000Z';
const card = (over: Partial<Scorecard> = {}): Scorecard => ({
  id: 'sc-1', roundId: 'r-1', playerId: 'p-1', scores: {}, totalGross: 0, totalNet: 0,
  status: 'in-progress', createdAt: new Date(0), updatedAt: new Date(0), serverRevision: 3, ...over,
});
const row = (over: object) => ({ player_id: 'p-1', scores: {}, revision: 5, status: 'in-progress', ...over });

describe('applyRemoteScorecard', () => {
  it('merges newer server holes and adopts the server revision', () => {
    const r = applyRemoteScorecard(card({ scores: { 1: { strokes: 4, editedAt: T1 } } }), row({ scores: { '1': { strokes: 6, editedAt: T2 } } }));
    expect(r.scorecard.scores[1]).toEqual({ strokes: 6, editedAt: T2 });
    expect(r.scorecard.serverRevision).toBe(5);
    expect(r).toMatchObject({ changed: true, needsUpload: false, becameFinal: false });
  });

  it("is a no-op for an echo of this phone's own upload", () => {
    const local = card({ scores: { 1: { strokes: 4, editedAt: T1, scoredBy: 'me' } }, serverRevision: 5 });
    const r = applyRemoteScorecard(local, row({ scores: { '1': { editedAt: T1, strokes: 4 } } }));
    expect(r).toMatchObject({ changed: false, needsUpload: false, becameFinal: false });
    expect(r.scorecard).toBe(local);
  });

  it('never lowers the revision for an out-of-order older row', () => {
    const local = card({ scores: { 1: { strokes: 4, editedAt: T2 } }, serverRevision: 7 });
    const r = applyRemoteScorecard(local, row({ scores: { '1': { strokes: 6, editedAt: T1 } }, revision: 5 }));
    expect(r.scorecard).toBe(local);
    expect(r.changed).toBe(false);
  });

  it('flags an upload when local holes are ahead', () => {
    const r = applyRemoteScorecard(card({ scores: { 2: { strokes: 5, editedAt: T2 } } }), row({ scores: { '1': { strokes: 6, editedAt: T1 } } }));
    expect(r).toMatchObject({ changed: true, needsUpload: true });
  });

  it('adopts a completed server card wholesale', () => {
    const r = applyRemoteScorecard(card({ scores: { 1: { strokes: 3, editedAt: T2 } } }), row({ scores: { '1': { strokes: 6, editedAt: T1 } }, revision: 9, status: 'completed' }));
    expect(r.scorecard).toMatchObject({ status: 'completed', serverRevision: 9 });
    expect(r.scorecard.scores[1]).toEqual({ strokes: 6, editedAt: T1 });
    expect(r).toMatchObject({ changed: true, needsUpload: false, becameFinal: true });
  });

  it("is a no-op for the echo of this phone's own submit", () => {
    const local = card({ status: 'completed', serverRevision: 9, scores: { 1: { strokes: 4, editedAt: T1 } } });
    const r = applyRemoteScorecard(local, row({ status: 'completed', revision: 9, scores: { '1': { strokes: 4, editedAt: T1 } } }));
    expect(r).toMatchObject({ changed: false, becameFinal: false });
  });

  it('merges into a locally-completed card that never reached the server (failed submit)', () => {
    const local = card({ status: 'completed', serverRevision: 3, scores: { 1: { strokes: 4, editedAt: T1 } } });
    const r = applyRemoteScorecard(local, row({ revision: 5, scores: { '2': { strokes: 5, editedAt: T2 } } }));
    expect(r.scorecard.status).toBe('completed');
    expect(r.scorecard.scores[2]).toEqual({ strokes: 5, editedAt: T2 });
    expect(r).toMatchObject({ changed: true, becameFinal: false });
  });
});
