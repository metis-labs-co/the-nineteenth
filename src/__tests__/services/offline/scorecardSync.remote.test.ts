import { syncScorecard, captureRemoteScorecardUpload } from '@/services/offline/sync/scorecardSync';
import { setSyncAuthUser } from '@/services/offline/sync/networkState';
import { supabase } from '@/services/supabase/client';
import { getDb } from '@/services/offline/DatabaseManager';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import { Platform } from 'react-native';
import { RoundScoringWriteError } from '@/services/rounds/roundScoringErrors';
import { useScorecardStore } from '@/store/scorecardStore';
import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import { withRoundPersistenceTransition } from '@/services/offline/roundPersistenceBarrier';

jest.mock('@/services/supabase/client', () => ({
  supabase: { rpc: jest.fn(), from: jest.fn() },
  getCurrentUser: jest.fn(async () => ({ id: 'owner' })),
}));
jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));
const roundId = '550e8400-e29b-41d4-a716-446655440060';
const playerId = '550e8400-e29b-41d4-a716-446655440061';
const holes = create18Holes();
const db = {
  getFirstAsync: jest.fn(async () => null),
  getAllAsync: jest.fn(async () => []),
  runAsync: jest.fn(),
  withExclusiveTransactionAsync: jest.fn(),
};
let shape = { nine_type: 'full', holes_played: 2 };
function preparation() {
  return {
    roundId,
    playerId,
    scores: { 1: { strokes: 5 }, 2: { strokes: 4 } },
    totalGross: 999,
    totalNet: 999,
    status: 'completed' as const,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    serverRevision: 4,
    holesPlayed: 2,
    syncNineType: 'full' as const,
    syncHoles: holes,
    coursePar: 72,
    syncGameType: 'stroke' as const,
    syncHandicapSource: 'none' as const,
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  useScorecardStore.getState().resetRound();
  setSyncAuthUser('owner');
  (getDb as jest.Mock).mockResolvedValue(db);
  (supabase.rpc as jest.Mock).mockResolvedValue({
    data: [
      {
        applied: true,
        conflict: false,
        server_revision: 7,
        server_status: 'completed',
        server_scores: {},
      },
    ],
    error: null,
  });
  shape = { nine_type: 'full', holes_played: 2 };
  const reader = {
    select: () => reader,
    eq: () => reader,
    is: () => reader,
    abortSignal: () => reader,
    maybeSingle: async () => ({ data: shape, error: null }),
  };
  (supabase.from as jest.Mock).mockReturnValue(reader);
  db.withExclusiveTransactionAsync.mockImplementation(async (work) => work(db));
});

it('adopts a verified different shape once and requires new preparation without replaying the remote draft', async () => {
  const card = {
    roundId,
    playerId,
    scores: { 1: { strokes: 5 }, 2: { strokes: 4 } },
    totalGross: 999,
    totalNet: 999,
    status: 'completed' as const,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    holesPlayed: 2,
    syncNineType: 'full' as const,
    syncHoles: holes,
    coursePar: 72,
    syncGameType: 'stroke' as const,
    syncHandicapSource: 'none' as const,
  };
  (supabase.rpc as jest.Mock).mockImplementationOnce(async () => {
    shape = { nine_type: 'full', holes_played: 1 };
    return {
      data: null,
      error: { code: '22023', hint: 'round_shape_changed', message: 'ended after preparation' },
    };
  });
  await expect(
    syncScorecard(
      { roundId, playerId },
      {
        kind: 'remote',
        capture: captureRemoteScorecardUpload(roundId),
        assertOperationCurrent: () => {},
        prepareCurrent: async () => ({ card, assertDraftCurrent: () => {} }),
      }
    )
  ).rejects.toMatchObject({ kind: 'shape_changed', sqlHint: 'round_shape_changed' });
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
  expect(db.runAsync).not.toHaveBeenCalled();
});
it('uploads a remote ended preparation without selecting or acknowledging local state', async () => {
  const card = {
    roundId,
    playerId,
    scores: { 1: { strokes: 5 }, 2: { strokes: 4 }, 7: { strokes: 12 } },
    totalGross: 999,
    totalNet: 999,
    status: 'completed' as const,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    submittedAt: new Date(0),
    submittedBy: 'owner',
    serverRevision: 4,
    holesPlayed: 2,
    syncNineType: 'full' as const,
    syncHoles: holes,
    coursePar: 72,
    syncGameType: 'stableford' as const,
    syncHandicapSource: 'profile' as const,
    playerHandicap: 18,
    playerGender: 'male' as const,
    teeData: { name: 'Blue', color: 'blue', courseRating: 72.5, slopeRating: 125 },
  };
  const remote = {
    kind: 'remote' as const,
    capture: captureRemoteScorecardUpload(roundId),
    assertOperationCurrent: () => {},
    prepareCurrent: async () => ({
      card,
      serverScorecardId: 'authorized-server-id',
      assertDraftCurrent: () => {},
    }),
  };
  await expect(syncScorecard({ roundId, playerId }, remote)).resolves.toMatchObject({
    serverRevision: 7,
    serverScorecardId: 'authorized-server-id',
  });
  expect((supabase.rpc as jest.Mock).mock.calls[0][1]).toMatchObject({
    p_expected_revision: 4,
    p_snapshot: {
      expected_round_shape: { nine_type: 'full', holes_played: 2 },
      scores: { 1: { strokes: 5 }, 2: { strokes: 4 } },
      total_gross: 9,
      total_net: 7,
      total_points: 4,
      daily_handicap_used: 19,
      handicap_differential: null,
      status: 'completed',
    },
  });
  expect(db.getAllAsync).not.toHaveBeenCalled();
  expect(db.runAsync).not.toHaveBeenCalled();
});

it('preserves remote acceptance when the draft changes during the snapshot network wait', async () => {
  let current = true;
  const card = {
    roundId,
    playerId,
    scores: { 1: { strokes: 5 } },
    totalGross: 5,
    totalNet: 5,
    status: 'completed' as const,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    holesPlayed: 2,
    syncNineType: 'full' as const,
    syncHoles: holes,
    coursePar: 72,
    syncGameType: 'stroke' as const,
    syncHandicapSource: 'none' as const,
  };
  (supabase.rpc as jest.Mock).mockImplementationOnce(async () => {
    current = false;
    return {
      data: [
        {
          applied: true,
          conflict: false,
          server_revision: 7,
          server_status: 'completed',
          server_scores: {},
        },
      ],
      error: null,
    };
  });
  const remote = {
    kind: 'remote' as const,
    capture: captureRemoteScorecardUpload(roundId),
    assertOperationCurrent: () => {},
    prepareCurrent: async () => ({
      card,
      assertDraftCurrent: () => {
        if (!current) throw new RoundScoringWriteError('context_changed', roundId, 'new draft');
      },
    }),
  };
  await expect(syncScorecard({ roundId, playerId }, remote)).rejects.toMatchObject({
    kind: 'context_changed',
    acceptedRemoteSnapshot: { roundId, playerId, serverRevision: 7 },
  });
  expect(db.runAsync).not.toHaveBeenCalled();
});

it('selects current edited strokes after waiting on the sole coordinator', async () => {
  let release!: () => void;
  let entered!: () => void;
  const enteredGate = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = withRoundScoringWrite(roundId, async () => {
    entered();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  });
  await enteredGate;
  let draft = preparation();
  const prepareCurrent = jest.fn(async () => ({ card: draft, assertDraftCurrent: () => {} }));
  const upload = syncScorecard(
    { roundId, playerId },
    {
      kind: 'remote',
      capture: captureRemoteScorecardUpload(roundId),
      assertOperationCurrent: () => {},
      prepareCurrent,
    }
  );
  draft = { ...draft, scores: { 1: { strokes: 4 }, 2: { strokes: 4 } } };
  expect(prepareCurrent).not.toHaveBeenCalled();
  release();
  await held;
  await upload;
  expect((supabase.rpc as jest.Mock).mock.calls[0][1].p_snapshot.total_gross).toBe(8);
});

it('refuses an original source transition while waiting instead of selecting a new draft basis', async () => {
  let release!: () => void;
  let entered!: () => void;
  const enteredGate = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = withRoundScoringWrite(roundId, async () => {
    entered();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  });
  await enteredGate;
  const prepareCurrent = jest.fn(async () => ({
    card: preparation(),
    assertDraftCurrent: () => {},
  }));
  const upload = syncScorecard(
    { roundId, playerId },
    {
      kind: 'remote',
      capture: captureRemoteScorecardUpload(roundId),
      assertOperationCurrent: () => {},
      prepareCurrent,
    }
  );
  const refusal = expect(upload).rejects.toMatchObject({ kind: 'context_changed' });
  await withRoundPersistenceTransition(
    roundId,
    { nine_type: 'full', holes_played: 1 },
    async () => {},
    () => {}
  );
  release();
  await held;
  await refusal;
  expect(prepareCurrent).not.toHaveBeenCalled();
  expect(supabase.rpc).not.toHaveBeenCalled();
});

it('applies verified adoption to the original live session after its own epoch advance', async () => {
  useScorecardStore.setState({
    currentRoundId: roundId,
    holes,
    holesPlayed: 2,
    nineType: 'full',
    isLoading: false,
  });
  (supabase.rpc as jest.Mock).mockImplementationOnce(async () => {
    shape.holes_played = 1;
    return {
      data: null,
      error: { code: '22023', hint: 'round_shape_changed', message: 'changed' },
    };
  });
  await expect(
    syncScorecard(
      { roundId, playerId },
      {
        kind: 'remote',
        capture: captureRemoteScorecardUpload(roundId),
        assertOperationCurrent: () => {},
        prepareCurrent: async () => ({ card: preparation(), assertDraftCurrent: () => {} }),
      }
    )
  ).rejects.toMatchObject({ kind: 'shape_changed' });
  expect(useScorecardStore.getState().holesPlayed).toBe(1);
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
});

it('retains accepted remote revision when attributed entries fail a shape guard and adoption requires review', async () => {
  const reader = (supabase.from as jest.Mock).getMockImplementation();
  (supabase.from as jest.Mock).mockImplementation((table) =>
    table === 'score_entries'
      ? {
          upsert: async () => {
            shape.holes_played = 1;
            return {
              error: { code: '22023', hint: 'round_shape_changed', message: 'entries overtaken' },
            };
          },
        }
      : reader?.(table)
  );
  const card = {
    ...preparation(),
    scores: { 1: { strokes: 5, scoredBy: 'owner' }, 2: { strokes: 4, scoredBy: 'owner' } },
  };
  let error: unknown;
  try {
    await syncScorecard(
      { roundId, playerId },
      {
        kind: 'remote',
        capture: captureRemoteScorecardUpload(roundId),
        assertOperationCurrent: () => {},
        prepareCurrent: async () => ({ card, assertDraftCurrent: () => {} }),
      }
    );
  } catch (failure) {
    error = failure;
  }
  expect(error).toMatchObject({
    kind: 'shape_changed',
    sqlCode: '22023',
    sqlHint: 'round_shape_changed',
    acceptedRemoteSnapshot: { roundId, playerId, serverRevision: 7 },
  });
  expect((error as RoundScoringWriteError).acceptedWrite).toBeUndefined();
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  expect(db.runAsync).not.toHaveBeenCalled();
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
});

it('keeps the native adoption refusal visible on web instead of reporting a remote retry success', async () => {
  const previous = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  try {
    (supabase.rpc as jest.Mock).mockImplementationOnce(async () => {
      shape.holes_played = 1;
      return {
        data: null,
        error: { code: '22023', hint: 'round_shape_changed', message: 'changed' },
      };
    });
    await expect(
      syncScorecard(
        { roundId, playerId },
        {
          kind: 'remote',
          capture: captureRemoteScorecardUpload(roundId),
          assertOperationCurrent: () => {},
          prepareCurrent: async () => ({ card: preparation(), assertDraftCurrent: () => {} }),
        }
      )
    ).rejects.toThrow('Authoritative scoring repair requires native SQLite');
    expect(db.withExclusiveTransactionAsync).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  } finally {
    Object.defineProperty(Platform, 'OS', { value: previous, configurable: true });
  }
});

it('refuses an absent local session replaced and reset while the remote operation waits', async () => {
  let release!: () => void;
  let entered!: () => void;
  const waiting = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const hold = withRoundScoringWrite(roundId, async () => {
    entered();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  });
  await waiting;
  const prepareCurrent = jest.fn();
  const capture = captureRemoteScorecardUpload(roundId);
  const upload = syncScorecard(
    { roundId, playerId },
    { kind: 'remote', capture, assertOperationCurrent: () => {}, prepareCurrent }
  );
  const refusal = expect(upload).rejects.toMatchObject({ kind: 'context_changed' });
  useScorecardStore.getState().resetRound();
  release();
  await hold;
  await refusal;
  expect(prepareCurrent).not.toHaveBeenCalled();
  expect(supabase.rpc).not.toHaveBeenCalled();
});

it('retains the Supabase client receiver when invoking its snapshot RPC', async () => {
  (supabase.rpc as jest.Mock).mockImplementation(function (this: unknown) {
    // Installed SupabaseClient.rpc delegates through this.rest.rpc.
    if (this !== supabase) throw new TypeError('RPC requires its Supabase client receiver');
    return Promise.resolve({
      data: [
        {
          applied: true,
          conflict: false,
          server_revision: 7,
          server_status: 'completed',
          server_scores: {},
        },
      ],
      error: null,
    });
  });
  const card = {
    roundId,
    playerId,
    scores: { 1: { strokes: 5 } },
    totalGross: 5,
    totalNet: 5,
    status: 'completed' as const,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    holesPlayed: 2,
    syncNineType: 'full' as const,
    syncHoles: holes,
    coursePar: 72,
    syncGameType: 'stroke' as const,
    syncHandicapSource: 'none' as const,
  };
  await expect(
    syncScorecard(
      { roundId, playerId },
      {
        kind: 'remote',
        capture: captureRemoteScorecardUpload(roundId),
        assertOperationCurrent: () => {},
        prepareCurrent: async () => ({ card, assertDraftCurrent: () => {} }),
      }
    )
  ).resolves.toMatchObject({ serverRevision: 7 });
});
