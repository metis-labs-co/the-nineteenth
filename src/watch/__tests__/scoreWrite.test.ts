import { applyWatchScoreWrite, ScoreWriteContext } from '../scoreWrite';
import type { WatchScoreWrite } from '../types';
import { PICKUP_SCORE } from '@/constants/scoring';

function makeCtx(over: Partial<ScoreWriteContext> = {}) {
  const applied: any[] = [];
  let rev = 100;
  const ctx: ScoreWriteContext = {
    currentUserId: 'me',
    allowedPlayerIds: new Set(['me', 'p2']),
    isPremium: true,
    getExisting: () => undefined,
    getLastEditedRev: () => -1,
    seen: new Set<string>(),
    applyHoleScore: async (playerId, hole, holeScore) => { applied.push({ playerId, hole, holeScore }); },
    markEdited: () => {},
    nextRev: () => ++rev,
    ...over,
  };
  return Object.assign(ctx, { _applied: applied });
}

const write = (over: Partial<WatchScoreWrite> = {}): WatchScoreWrite => ({
  clientWriteId: 'w1', ts: 1, baseRev: 7, roundId: 'r1', hole: 7, playerId: 'me', strokes: 4, ...over,
});

describe('applyWatchScoreWrite', () => {
  it('applies a gross score with scoredBy set', async () => {
    const ctx = makeCtx();
    const res = await applyWatchScoreWrite(write(), ctx);
    expect(res.status).toBe('applied');
    expect((ctx as any)._applied[0]).toEqual({ playerId: 'me', hole: 7, holeScore: { strokes: 4, scoredBy: 'me' } });
  });
  it('maps a pickup intent to PICKUP_SCORE', async () => {
    const ctx = makeCtx();
    await applyWatchScoreWrite(write({ strokes: 'pickup' }), ctx);
    expect((ctx as any)._applied[0].holeScore.strokes).toBe(PICKUP_SCORE);
  });
});

describe('applyWatchScoreWrite — guards', () => {
  it('dedups a clientWriteId already seen', async () => {
    const ctx = makeCtx({ seen: new Set(['w1']) });
    const res = await applyWatchScoreWrite(write(), ctx);
    expect(res.status).toBe('duplicate');
    expect((ctx as any)._applied).toHaveLength(0);
  });
  it('rejects a player the user is not assigned to score', async () => {
    const res = await applyWatchScoreWrite(write({ playerId: 'stranger' }), makeCtx());
    expect(res.status).toBe('unauthorized');
  });
  it('rejects a stale write whose baseRev predates the last phone edit', async () => {
    const ctx = makeCtx({ getLastEditedRev: () => 9 }); // 9 > baseRev 7
    const res = await applyWatchScoreWrite(write(), ctx);
    expect(res.status).toBe('superseded');
    expect((ctx as any)._applied).toHaveLength(0);
  });
  it('merges stat fields onto the existing HoleScore when premium', async () => {
    const ctx = makeCtx({ getExisting: () => ({ strokes: 9, putts: 9 }) });
    await applyWatchScoreWrite(write({ stat: { putts: 2, bunkerShots: 1, hazards: [{ type: 'water' }] } }), ctx);
    expect((ctx as any)._applied[0].holeScore).toEqual({
      strokes: 4, putts: 2, bunkerShots: 1, hazards: [{ type: 'water' }], scoredBy: 'me',
    });
  });
  it('drops stat fields entirely when not premium', async () => {
    const ctx = makeCtx({ isPremium: false });
    await applyWatchScoreWrite(write({ stat: { putts: 2 } }), ctx);
    expect((ctx as any)._applied[0].holeScore).toEqual({ strokes: 4, scoredBy: 'me' });
  });
  it('treats a re-sent write as a duplicate after the first apply succeeds (idempotency round-trip)', async () => {
    const ctx = makeCtx();
    const first = await applyWatchScoreWrite(write(), ctx);
    const second = await applyWatchScoreWrite(write(), ctx);
    expect(first.status).toBe('applied');
    expect(second.status).toBe('duplicate');
    expect((ctx as any)._applied).toHaveLength(1);
  });
});
