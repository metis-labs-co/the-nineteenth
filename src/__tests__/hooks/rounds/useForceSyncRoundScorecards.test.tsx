import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForceSyncRoundScorecards } from '@/hooks/rounds/mutations';
import { useScorecardStore } from '@/store/scorecardStore';
import { supabase } from '@/services/supabase/client';
import { setSyncAuthUser } from '@/services/offline/sync/networkState';
import * as database from '@/services/offline/database';
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import type { Scorecard, Hole } from '@/types';

jest.mock('@/services/supabase/client', () => ({
  supabase: { rpc: jest.fn(), from: jest.fn() },
  getCurrentUser: jest.fn(async () => ({ id: 'owner' })),
}));
jest.mock('@/services/queryClient', () => ({ invalidateHandicapCache: jest.fn() }));
jest.mock('@/services/handicap/updatePlayerHandicapIndex', () => ({
  updatePlayerHandicapIndex: jest.fn(async () => {}),
}));
jest.mock('@/services/rounds/refinalizeRoundResults', () => ({
  refinalizeRoundResults: jest.fn(async () => {}),
}));
jest.mock('@/services/scoreMismatch', () => ({ saveScoreEntries: jest.fn(async () => {}) }));
jest.mock('@/services/offline/database', () => ({
  getScorecardsByRound: jest.fn(),
  getPendingSyncByEntityKey: jest.fn(async () => null),
  markScorecardAsSynced: jest.fn(async () => true),
  recordAcceptedScorecardWrite: jest.fn(async () => {}),
  saveScorecard: jest.fn(async () => {}),
  getFailedSyncCountForRound: jest.fn(async () => 0),
}));
const roundId = '550e8400-e29b-41d4-a716-446655440001';
const playerId = '550e8400-e29b-41d4-a716-446655440002';
const holes: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: 4,
  strokeIndex: i + 1,
}));
const tee = { name: 'White', color: 'white', courseRating: 72, slopeRating: 113 };
let disk: Scorecard;
const accepted = { data: [{ applied: true, conflict: false, server_revision: 7 }], error: null };
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);
beforeEach(() => {
  jest.clearAllMocks();
  setSyncAuthUser('owner');
  useScorecardStore.getState().resetRound();
  disk = {
    id: 'LOCAL-card',
    roundId,
    playerId,
    scores: { 1: { strokes: 5 } },
    status: 'completed',
    totalGross: 5,
    totalNet: 5,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  (database.getScorecardsByRound as jest.Mock).mockImplementation(async () => [disk]);
  (database.getPendingSyncByEntityKey as jest.Mock).mockResolvedValue(null);
  (supabase.rpc as jest.Mock).mockResolvedValue(accepted);
});
it('force-syncs a normal completed card through the common payload and guarded acknowledgment', async () => {
  const { result } = renderHook(useForceSyncRoundScorecards, { wrapper });
  await expect(result.current.mutateAsync({ roundId })).resolves.toMatchObject({
    pushed: 1,
    failed: 0,
  });
  expect((supabase.rpc as jest.Mock).mock.calls[0][1].p_snapshot).toMatchObject({
    scores: { 1: { strokes: 5 } },
    expected_round_shape: { nine_type: 'full', holes_played: null },
  });
  expect(database.markScorecardAsSynced).toHaveBeenCalledWith(
    'LOCAL-card',
    7,
    expect.objectContaining({ expected: disk, isCurrent: expect.any(Function) })
  );
  expect(refinalizeRoundResults).toHaveBeenCalledWith(roundId);
});
it('captures force-sync ownership before reading the local round', async () => {
  (database.getScorecardsByRound as jest.Mock).mockImplementationOnce(async () => {
    setSyncAuthUser('other');
    return [disk];
  });
  const { result } = renderHook(useForceSyncRoundScorecards, { wrapper });
  await expect(result.current.mutateAsync({ roundId })).resolves.toMatchObject({
    pushed: 0,
    failed: 1,
  });
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
  expect(refinalizeRoundResults).not.toHaveBeenCalled();
});
it('explicit force-sync admits a CURRENT retained failed row with its captured recovery proof', async () => {
  const queued = {
    id: 12,
    revision: 4,
    type: 'scorecard',
    action: 'update',
    timestamp: new Date(0),
    retryCount: 3,
    status: 'failed',
    lastError: 'retained failure',
    data: { ...disk, scores: { 1: { strokes: 8 } }, totalGross: 8, totalNet: 8 },
  };
  (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key) =>
    key.startsWith('scorecard:') ? queued : null
  );
  const { result } = renderHook(useForceSyncRoundScorecards, { wrapper });
  await expect(result.current.mutateAsync({ roundId })).resolves.toMatchObject({
    pushed: 1,
    failed: 0,
  });
  expect((supabase.rpc as jest.Mock).mock.calls[0][1].p_snapshot.scores[1]).toMatchObject({
    strokes: 8,
  });
  expect(database.markScorecardAsSynced).toHaveBeenCalledWith(
    'LOCAL-card',
    7,
    expect.objectContaining({
      queued: expect.objectContaining({
        id: 12,
        revision: 4,
        expectedRecovery: expect.objectContaining({ status: 'failed', retryCount: 3 }),
      }),
    })
  );
});

it('force conflict retry freshly prepares the current disk scores inside one coordinator', async () => {
  (supabase.rpc as jest.Mock).mockResolvedValueOnce({
    data: [
      {
        applied: false,
        conflict: true,
        server_revision: 6,
        server_status: 'completed',
        server_scores: {},
      },
    ],
    error: null,
  });
  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => {
      disk = { ...disk, scores: { 1: { strokes: 8 } }, totalGross: 8, totalNet: 8 };
      return { data: { nine_type: 'full', holes_played: null }, error: null };
    }),
  };
  (supabase.from as jest.Mock).mockReturnValue(builder);
  const { result } = renderHook(useForceSyncRoundScorecards, { wrapper });
  await expect(result.current.mutateAsync({ roundId })).resolves.toMatchObject({
    pushed: 1,
    failed: 0,
  });
  expect((supabase.rpc as jest.Mock).mock.calls[1][1]).toMatchObject({
    p_expected_revision: 6,
    p_snapshot: { scores: { 1: { strokes: 8 } }, total_gross: 8, total_net: 8 },
  });
});
it('actual store submission acknowledges identical durable scores despite repreparation timestamps', async () => {
  disk = {
    ...disk,
    status: 'in-progress',
    player: {
      id: playerId,
      name: 'Player',
      email: '',
      handicap: 18,
      gender: 'male',
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
  };
  (database.saveScorecard as jest.Mock).mockImplementation(async (card) => {
    disk = card;
  });
  useScorecardStore.setState({
    currentRoundId: roundId,
    isLoading: false,
    isOnline: true,
    holes,
    nineType: 'full',
    holesPlayed: null,
    handicapSource: 'profile',
    selectedTeeData: tee,
    gameType: 'stroke',
    groupScorecards: new Map([[playerId, disk]]),
  });
  await useScorecardStore.getState().submitScorecards();
  expect((supabase.rpc as jest.Mock).mock.calls[0][1].p_snapshot).toMatchObject({
    status: 'completed',
    expected_round_shape: { nine_type: 'full', holes_played: null },
    total_gross: 5,
    daily_handicap_used: 17,
  });
  expect(database.markScorecardAsSynced).toHaveBeenCalledWith(
    'LOCAL-card',
    7,
    expect.objectContaining({ expected: disk })
  );
  expect(useScorecardStore.getState().groupScorecards.get(playerId)).toMatchObject({
    status: 'completed',
    serverRevision: 7,
  });
});
it.each([[false, 'pending'], [true, 'pending'], [false, 'failed'], [true, 'failed']] as const)(
  'actual submit uploads CURRENT completion over an older in-progress queue (wait=%s, status=%s)',
  async (wait, status) => {
    const old = { ...disk, status: 'in-progress' as const, serverRevision: 2 };
    const queued = { id: 11, revision: 2, type: 'scorecard', action: 'update', data: old, status, timestamp: new Date(0), retryCount: status === 'failed' ? 3 : 0 };
    disk = {
      ...old,
      scores: { 1: { strokes: 8 } },
      totalGross: 8,
      totalNet: 8,
      serverRevision: 4,
      player: {
        id: playerId,
        name: 'Player',
        email: '',
        handicap: 18,
        gender: 'male',
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
    };
    (database.saveScorecard as jest.Mock).mockImplementation(async (card) => {
      disk = card;
    });
    (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key) =>
      key.startsWith('scorecard:') ? queued : null
    );
    useScorecardStore.setState({
      currentRoundId: roundId,
      isLoading: false,
      isOnline: true,
      holes,
      nineType: 'full',
      holesPlayed: null,
      handicapSource: 'profile',
      selectedTeeData: tee,
      gameType: 'stroke',
      groupScorecards: new Map([[playerId, disk]]),
    });
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const held = wait
      ? withRoundScoringWrite(roundId, async () => {
          entered();
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        })
      : Promise.resolve();
    if (wait) await started;
    const submission = useScorecardStore.getState().submitScorecards();
    if (wait) {
      while (useScorecardStore.getState().groupScorecards.get(playerId)?.status !== 'completed')
        await Promise.resolve();
      expect(supabase.rpc).not.toHaveBeenCalled();
      const current = useScorecardStore.getState().groupScorecards.get(playerId)!;
      useScorecardStore.setState({
        groupScorecards: new Map([
          [playerId, { ...current, scores: { 1: { strokes: 9 } }, totalGross: 9, totalNet: 9 }],
        ]),
      });
      release();
      await held;
    }
    await submission;
    expect((supabase.rpc as jest.Mock).mock.calls[0][1]).toMatchObject({
      p_expected_revision: 4,
      p_snapshot: {
        status: 'completed',
        total_gross: wait ? 9 : 8,
        scores: { 1: { strokes: wait ? 9 : 8 } },
      },
    });
    expect(database.markScorecardAsSynced).toHaveBeenCalledWith(
      'LOCAL-card',
      7,
      expect.objectContaining({ expected: disk, queued: expect.objectContaining({ id: 11, revision: 2, expectedRecovery: expect.objectContaining({ id: 11 }) }) })
    );
    expect(useScorecardStore.getState().groupScorecards.get(playerId)).toMatchObject({
      status: 'completed',
      serverRevision: 7,
      scores: { 1: { strokes: wait ? 9 : 8 } },
    });
  }
);
it('actual store submission preserves a newer retained edit and accepted revision without acknowledgment', async () => {
  disk = {
    ...disk,
    status: 'in-progress',
    player: {
      id: playerId,
      name: 'Player',
      email: '',
      handicap: 18,
      gender: 'male',
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
  };
  (database.saveScorecard as jest.Mock).mockImplementation(async (card) => {
    disk = card;
  });
  useScorecardStore.setState({
    currentRoundId: roundId,
    isLoading: false,
    isOnline: true,
    holes,
    nineType: 'full',
    holesPlayed: null,
    handicapSource: 'profile',
    selectedTeeData: tee,
    gameType: 'stroke',
    groupScorecards: new Map([[playerId, disk]]),
  });
  let release!: (value: typeof accepted) => void;
  (supabase.rpc as jest.Mock).mockReturnValueOnce(
    new Promise((resolve) => {
      release = resolve;
    })
  );
  const submission = useScorecardStore.getState().submitScorecards();
  while (!(supabase.rpc as jest.Mock).mock.calls.length) await Promise.resolve();
  const current = useScorecardStore.getState().groupScorecards.get(playerId)!;
  useScorecardStore.setState({
    groupScorecards: new Map([
      [playerId, { ...current, scores: { 1: { strokes: 8 } }, totalGross: 8, totalNet: 8 }],
    ]),
  });
  release(accepted);
  await expect(submission).rejects.toThrow('Failed to submit 1 scorecard');
  expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
  expect(database.recordAcceptedScorecardWrite).toHaveBeenCalledWith(roundId, playerId, {
    scorecardId: 'LOCAL-card',
    serverRevision: 7,
  });
  expect(useScorecardStore.getState().groupScorecards.get(playerId)).toMatchObject({
    status: 'completed',
    scores: { 1: { strokes: 8 } },
    totalGross: 8,
    serverRevision: 7,
  });
});
it('actual force-sync defers a failed end prerequisite without network or acknowledgment', async () => {
  (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key) =>
    key.startsWith('round:') ? { type: 'round', status: 'failed', data: { userId: 'owner' } } : null
  );
  const { result } = renderHook(useForceSyncRoundScorecards, { wrapper });
  await expect(result.current.mutateAsync({ roundId })).resolves.toMatchObject({
    pushed: 0,
    failed: 1,
  });
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
  expect(refinalizeRoundResults).not.toHaveBeenCalled();
});
it('actual force-sync refuses a late accepted RPC after a private session replacement', async () => {
  useScorecardStore.setState({
    currentRoundId: roundId,
    holes,
    groupScorecards: new Map([[playerId, disk]]),
  });
  let release!: (value: typeof accepted) => void;
  (supabase.rpc as jest.Mock).mockReturnValueOnce(
    new Promise((resolve) => {
      release = resolve;
    })
  );
  const { result } = renderHook(useForceSyncRoundScorecards, { wrapper });
  const upload = result.current.mutateAsync({ roundId });
  while (!(supabase.rpc as jest.Mock).mock.calls.length) await Promise.resolve();
  useScorecardStore.getState().resetRound();
  release(accepted);
  await expect(upload).resolves.toMatchObject({ pushed: 0, failed: 1 });
  expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
  expect(refinalizeRoundResults).not.toHaveBeenCalled();
  expect(database.recordAcceptedScorecardWrite).toHaveBeenCalledWith(roundId, playerId, {
    scorecardId: 'LOCAL-card',
    serverRevision: 7,
  });
});
