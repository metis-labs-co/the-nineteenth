/**
 * syncScorecard — total_net in the scorecard snapshot.
 *
 * A round ended early (Scorecard.holesPlayed, stamped by the store's
 * endRoundEarly) must not be netted as gross − the full daily handicap: that
 * credits strokes for holes never played. Net = Σ(gross − strokes received)
 * over the holes played; daily_handicap_used stays the planned round's.
 *
 * Fixture: par-4 holes with SI = hole number. Tee 72 / 113, index 18, male:
 * 18-hole DHC = round(18 × 0.93 × 0.9986) = round(16.72) = 17 ⇒ one stroke on SI 1–17.
 */

import { syncScorecard } from '@/services/offline/sync/scorecardSync';
import { supabase } from '@/services/supabase/client';
import { saveScoreEntries } from '@/services/scoreMismatch';
import type { Scorecard } from '@/types';
import type { Hole, TeeBox } from '@/types/database/base';

jest.mock('@/services/supabase/client', () => ({
  supabase: { rpc: jest.fn() },
  getCurrentUser: jest.fn(() => Promise.resolve({ id: 'test-user-id' })),
}));

jest.mock('@/services/queryClient', () => ({
  invalidateHandicapCache: jest.fn(),
}));

jest.mock('@/services/scoreMismatch', () => ({
  saveScoreEntries: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/services/handicap/updatePlayerHandicapIndex', () => ({
  updatePlayerHandicapIndex: jest.fn(() => Promise.resolve()),
}));

const PAR_4_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: 4 as Hole['par'],
  strokeIndex: i + 1,
}));

const TEE: TeeBox = { name: 'Members', color: 'white', courseRating: 72, slopeRating: 113 };

/** Fives on the given holes. */
function fives(holeNumbers: number[]): Scorecard['scores'] {
  const scores: Record<number, { strokes: number }> = {};
  for (const hole of holeNumbers) scores[hole] = { strokes: 5 };
  return scores as Scorecard['scores'];
}

/** Fives on holes 1–6 (gross 30) of a planned 18; holes 7–18 unscored. */
function sixHoleCard(overrides: Partial<Scorecard> = {}): Scorecard {
  return {
    id: 'sc-1',
    roundId: '550e8400-e29b-41d4-a716-446655440000',
    playerId: '550e8400-e29b-41d4-a716-446655440001',
    scores: fives([1, 2, 3, 4, 5, 6]),
    totalGross: 30,
    totalNet: 24,
    status: 'completed',
    submittedAt: new Date('2026-10-07T03:00:00Z'),
    createdAt: new Date('2026-10-07T01:00:00Z'),
    updatedAt: new Date('2026-10-07T03:00:00Z'),
    isStandalone: false,
    teeData: TEE,
    coursePar: 72,
    playerGender: 'male',
    playerHandicap: 18,
    syncHoles: PAR_4_HOLES,
    syncGameType: 'stroke',
    syncNineType: 'full',
    ...overrides,
  } as Scorecard;
}

function lastSnapshot(): Record<string, unknown> {
  const calls = (supabase.rpc as jest.Mock).mock.calls.filter(
    ([fn]) => fn === 'write_scorecard_snapshot'
  );
  const params = calls[calls.length - 1]?.[1] as { p_snapshot: Record<string, unknown> };
  return params.p_snapshot;
}

beforeEach(() => {
  (supabase.rpc as jest.Mock).mockResolvedValue({
    data: [
      {
        applied: true,
        conflict: false,
        server_revision: 1,
        server_status: 'completed',
        server_scores: {},
      },
    ],
    error: null,
  });
});

describe('syncScorecard — total_net snapshot', () => {
  describe('characterization (locks current behaviour)', () => {
    it.each(['stableford', 'par'] as const)(
      'preserves normal multi-ball %s transport and totals',
      async (syncGameType) => {
        await syncScorecard(
          sixHoleCard({ syncGameType, scores: { 1: { balls: [{ strokes: 5 }, { strokes: 7 }] } } })
        );
        expect(lastSnapshot()).toMatchObject({
          scores: {},
          total_gross: 30,
          total_net: 13,
          total_points: syncGameType === 'stableford' ? 0 : 24,
          total_par_score: syncGameType === 'par' ? 0 : null,
        });
      }
    );

    it('keeps cached gross and serializes all score keys on a normal card', async () => {
      await syncScorecard(sixHoleCard({ totalGross: 32, scores: fives([1, 2, 3, 4, 5, 6, 7]) }));
      expect(lastSnapshot().total_gross).toBe(32);
      expect(Object.keys(lastSnapshot().scores as object)).toHaveLength(7);
    });

    it('nets a card that was not ended early as gross − daily handicap', async () => {
      await syncScorecard(sixHoleCard());

      expect(lastSnapshot().daily_handicap_used).toBe(17);
      expect(lastSnapshot().total_net).toBe(13); // 30 − 17
    });

    it('falls back to gross − daily handicap when an ended card carries no hole data', async () => {
      await syncScorecard(sixHoleCard({ holesPlayed: 6, syncHoles: undefined }));

      expect(lastSnapshot().total_net).toBe(13);
    });
  });
  describe('rounds ended early', () => {
    it('nets an ended-early card over the holes played', async () => {
      await syncScorecard(sixHoleCard({ holesPlayed: 6 }));

      expect(lastSnapshot().daily_handicap_used).toBe(17); // still the planned 18-hole DHC
      expect(lastSnapshot().total_net).toBe(24); // Σ(5 − 1) over holes 1–6
    });

    it("computes stableford net explicitly instead of the store's overloaded totalNet", async () => {
      await syncScorecard(
        sixHoleCard({ holesPlayed: 6, syncGameType: 'stableford', totalNet: 12 })
      );

      expect(lastSnapshot().total_net).toBe(24);
      // A 5 on a par 4 with a stroke = net par = 2 pts × 6 holes.
      expect(lastSnapshot().total_points).toBe(12);
    });

    it("nets a multi-ball card from its first ball, as the store's totalGross is summed", async () => {
      // The store's calculatePlayerTotals sums balls[0] into totalGross (30
      // here), so net must read the same ball — skipping multi-ball holes
      // would sync total_net = 0.
      const scores: Record<number, { balls: { strokes: number }[] }> = {};
      for (const hole of [1, 2, 3, 4, 5, 6]) {
        scores[hole] = { balls: [{ strokes: 5 }, { strokes: 7 }] };
      }

      await syncScorecard(
        sixHoleCard({ holesPlayed: 6, scores: scores as unknown as Scorecard['scores'] })
      );

      expect(lastSnapshot().total_gross).toBe(30);
      expect(lastSnapshot().total_net).toBe(24); // Σ(5 − 1) over holes 1–6
    });

    it('slices a back-nine round from hole 10', async () => {
      // back9 with no 9-hole ratings: round((9 × 113/113 + (36 − 36)) × 0.93 × 0.9986)
      // = round(8.36) = 8 ⇒ SIs 10–12 get no stroke ⇒ net = gross 15.
      await syncScorecard(
        sixHoleCard({
          scores: fives([10, 11, 12]),
          totalGross: 15,
          totalNet: 7,
          coursePar: 36,
          syncHoles: PAR_4_HOLES.filter((h) => h.number >= 10),
          syncNineType: 'back9',
          holesPlayed: 3,
        })
      );

      expect(lastSnapshot().daily_handicap_used).toBe(8);
      expect(lastSnapshot().total_net).toBe(15); // not 15 − 8 = 7
    });
  });
});

describe('syncScorecard — ended snapshot consistency', () => {
  it.each([null, 0, -1, 2.5, NaN])('ignores invalid marker %s', async (holesPlayed) => {
    await syncScorecard(sixHoleCard());
    const baseline = lastSnapshot();
    await syncScorecard(sixHoleCard({ holesPlayed }));
    expect(lastSnapshot()).toEqual({ ...baseline, synced_at: expect.any(String) });
  });

  it('repairs stale gross after atomic end committed six fours but metadata save failed', async () => {
    const scores = Object.fromEntries([1, 2, 3, 4, 5, 6].map((hole) => [hole, { strokes: 4 }]));
    await syncScorecard(sixHoleCard({ holesPlayed: 6, scores, totalGross: 32 }));
    expect(lastSnapshot()).toMatchObject({
      total_gross: 24,
      total_net: 18,
      daily_handicap_used: 17,
    });
    expect(Object.keys(lastSnapshot().scores as object)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it.each(['stroke', 'stableford', 'par'] as const)(
    'filters stale post-N scores and score entries for %s',
    async (syncGameType) => {
      const scores = Object.fromEntries(
        [1, 2, 3, 4, 5, 6, 7, 18].map((hole) => [
          hole,
          { strokes: 4, scoredBy: 'test-user-id', putts: 2 },
        ])
      );
      const card = sixHoleCard({
        holesPlayed: 6,
        scores,
        totalGross: 32,
        totalNet: 24,
        total_par_score: 8,
        syncGameType,
      });
      await syncScorecard(card);
      expect(lastSnapshot()).toMatchObject({
        total_gross: 24,
        total_net: 18,
        total_points: syncGameType === 'stableford' ? 18 : 24,
        total_par_score: syncGameType === 'par' ? 6 : null,
      });
      expect(Object.keys(lastSnapshot().scores as object)).toEqual(['1', '2', '3', '4', '5', '6']);
      const entries = (saveScoreEntries as jest.Mock).mock.calls.at(-1)[0];
      expect(entries.map((entry: { holeNumber: number }) => entry.holeNumber)).toEqual([
        1, 2, 3, 4, 5, 6,
      ]);
      expect(Object.keys(card.scores)).toHaveLength(8); // caller's persisted state is not mutated
    }
  );

  it.each(['stableford', 'par'] as const)(
    'uses first ball consistently for ended %s totals',
    async (syncGameType) => {
      const scores = Object.fromEntries(
        [1, 2, 3, 4, 5, 6, 7].map((hole) => [hole, { balls: [{ strokes: 4 }, { strokes: 7 }] }])
      );
      await syncScorecard(
        sixHoleCard({
          holesPlayed: 6,
          syncGameType,
          scores: scores as unknown as Scorecard['scores'],
          totalGross: 32,
        })
      );
      expect(lastSnapshot()).toMatchObject({
        total_gross: 24,
        total_net: 18,
        total_points: syncGameType === 'stableford' ? 18 : 24,
        total_par_score: syncGameType === 'par' ? 6 : null,
      });
      expect(lastSnapshot().scores).toEqual({}); // established multi-ball transport uses gross only
    }
  );

  it('keeps missing-DHC fallback while filtering ended score keys', async () => {
    await syncScorecard(
      sixHoleCard({
        holesPlayed: 6,
        teeData: undefined,
        totalGross: 32,
        scores: fives([1, 2, 3, 4, 5, 6, 7]),
        totalNet: 99,
      })
    );
    expect(lastSnapshot()).toMatchObject({
      total_gross: 32,
      total_net: 99,
      daily_handicap_used: null,
    });
    expect(Object.keys(lastSnapshot().scores as object)).toHaveLength(6);
  });
});

describe('syncScorecard — ended pickup snapshot', () => {
  it.each(['stroke', 'stableford', 'par'] as const)(
    'counts a played pickup as net double bogey for %s',
    async (syncGameType) => {
      const scores = { ...fives([1, 2, 3, 4, 5, 6, 7]), 6: { strokes: 10 } };
      await syncScorecard(sixHoleCard({ holesPlayed: 6, scores, syncGameType, totalGross: 40 }));
      expect(lastSnapshot()).toMatchObject({
        total_gross: 32,
        total_net: 26,
        total_points: syncGameType === 'stableford' ? 10 : 24,
        total_par_score: syncGameType === 'par' ? -1 : null,
      });
      expect(Object.keys(lastSnapshot().scores as object)).toHaveLength(6);
    }
  );
});
