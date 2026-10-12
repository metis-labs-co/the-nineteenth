/**
 * Spec assumption check (round options menu): when the owner changes a live
 * round's nine_type without ending it (holes_played stays NULL), a peer whose
 * queued write still declares the old shape must self-heal — the server's
 * round_shape_changed guard triggers adoption of { nine_type, holes_played: null },
 * the card is rebuilt to the new nine, and the write is re-sent against the new shape.
 *
 * Setup copied from the cross-device end case in scorecardSync.boundary.test.ts.
 */
import { syncScorecard } from '@/services/offline/sync/scorecardSync';
import { setSyncAuthUser } from '@/services/offline/sync/networkState';
import { shapeHoleNumbers } from '@/services/rounds/roundScoringWrite';
import { supabase } from '@/services/supabase/client';
import * as database from '@/services/offline/database';
import type { Scorecard } from '@/types';

jest.mock('@/services/supabase/client', () => ({
  supabase: { rpc: jest.fn(), from: jest.fn() },
  getCurrentUser: jest.fn(async () => ({ id: 'owner' })),
}));
jest.mock('@/services/queryClient', () => ({ invalidateHandicapCache: jest.fn() }));
jest.mock('@/services/handicap/updatePlayerHandicapIndex', () => ({
  updatePlayerHandicapIndex: jest.fn(async () => {}),
}));
jest.mock('@/services/scoreMismatch', () => ({ saveScoreEntries: jest.fn(async () => {}) }));
jest.mock('@/services/offline/database', () => ({
  getPendingSyncByEntityKey: jest.fn(async () => null),
  getScorecardsByRound: jest.fn(async () => []),
  recordAcceptedScorecardWrite: jest.fn(async () => {}),
  markScorecardAsSynced: jest.fn(async () => true),
  removePendingSync: jest.fn(async () => true),
  getPendingSyncs: jest.fn(async () => []),
  getFailedSyncs: jest.fn(async () => []),
  getHoles: jest.fn(async () => []),
  persistAuthoritativeRoundShape: jest.fn(),
}));
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: {
    getState: () => ({
      currentRoundId: undefined,
      captureRoundScoringSession: () => null,
    }),
  },
}));

const roundId = '550e8400-e29b-41d4-a716-446655440020';
const accepted = { data: [{ applied: true, conflict: false, server_revision: 7 }], error: null };

const card = (overrides: Partial<Scorecard> = {}): Scorecard => ({
  id: 'local-card',
  roundId,
  playerId: '550e8400-e29b-41d4-a716-446655440001',
  scores: {},
  totalGross: 0,
  totalNet: 0,
  status: 'in-progress',
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  setSyncAuthUser('owner');
  (supabase.rpc as jest.Mock).mockResolvedValue(accepted);
  (database.getPendingSyncByEntityKey as jest.Mock).mockResolvedValue(null);
  (database.recordAcceptedScorecardWrite as jest.Mock).mockResolvedValue(undefined);
});

it('peer self-heals a nine_type-only change (full → front9, holes_played NULL) and re-sends against the new shape', async () => {
  const serverShape = { nine_type: 'front9', holes_played: null } as const;
  let disk = card({
    syncNineType: 'full',
    holesPlayed: null,
    totalGross: 48,
    totalNet: 99,
    playerHandicap: 18,
    playerGender: 'male',
    teeData: { name: 'White', color: 'white', courseRating: 72, slopeRating: 113 },
    coursePar: 72,
    syncGameType: 'stroke',
    syncHandicapSource: 'calculated',
    syncHoles: Array.from({ length: 18 }, (_, i) => ({
      number: (i + 1) as 1,
      par: 4,
      strokeIndex: i + 1,
    })),
    // Holes 1–9 plus 10–12 scored on the old full-18 shape.
    scores: Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => [h, { strokes: 4 }])
    ),
  });
  (database.getScorecardsByRound as jest.Mock).mockImplementation(async () => [disk]);
  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => ({ data: serverShape, error: null })),
  };
  (supabase.from as jest.Mock).mockReturnValue(builder);
  (database.persistAuthoritativeRoundShape as jest.Mock).mockImplementation(
    async (_id, target, options) => {
      // Mirrors the DAO: with no prior end marker, the keep set is the target shape's holes.
      disk = options.rebuild(disk, shapeHoleNumbers(target), target);
      return { priorLocalShapes: new Map() };
    }
  );
  (supabase.rpc as jest.Mock).mockResolvedValueOnce({
    data: null,
    error: { code: '22023', hint: 'round_shape_changed', message: 'stale shape' },
  });

  await expect(syncScorecard(disk)).resolves.toMatchObject({ serverRevision: 7 });

  const rpcCalls = (supabase.rpc as jest.Mock).mock.calls;
  expect(rpcCalls[0][1].p_snapshot.expected_round_shape).toEqual({
    nine_type: 'full',
    holes_played: null,
  });
  expect(database.persistAuthoritativeRoundShape).toHaveBeenCalledWith(
    roundId,
    serverShape,
    expect.anything()
  );
  const resent = rpcCalls[1][1].p_snapshot;
  expect(resent.expected_round_shape).toEqual(serverShape);
  expect(resent.total_gross).toBe(36);
  expect(Object.keys(resent.scores)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  expect(disk).toMatchObject({ syncNineType: 'front9', holesPlayed: null, totalGross: 36 });
  expect(Object.keys(disk.scores).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
