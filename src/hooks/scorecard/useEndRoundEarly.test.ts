/** Real hook/store/coordinator/math; only device persistence, auth and transport are mocked. */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useScorecardStore } from '@/store/scorecardStore';
import { createTestPlayer, create18Holes } from '@/__tests__/utils/testFixtures';
import { getSyncAuthUserId } from '@/services/offline/sync/networkState';
import {
  persistRoundEarlyEnd,
  persistAuthoritativeRoundShape,
  getPendingSyncByEntityKey,
  saveScorecard,
  getScorecardsByRound,
  removePendingSync,
} from '@/services/offline/database';
import { requestSyncDrain } from '@/services/offline/sync/drain';
import { checkIsOnline } from '@/hooks/useOnlineStatus';
import {
  captureRoundPersistenceSource,
  isRoundPersistenceSourceCurrent,
  withRoundPersistence,
  withRoundPersistenceTransition,
} from '@/services/offline/roundPersistenceBarrier';
import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import { planEndRoundEarly } from '@/utils/endRoundEarly';
import { shapeHoleNumbers } from '@/services/rounds/roundScoringWrite';
import type { PendingSync, Scorecard, TeeBox } from '@/types';
import { useEndRoundEarly, type UseEndRoundEarlyArgs } from './useEndRoundEarly';

jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));
jest.mock('@/services/offline/dao/HoleScoreDAO', () => ({
  getHoleScores: jest.fn(),
  bulkSaveHoleScores: jest.fn(),
  deleteHoleScores: jest.fn(),
}));

jest.mock('@/services/offline/sync/drain', () => ({ requestSyncDrain: jest.fn() }));
jest.mock('@/services/offline/sync/networkState', () => ({
  getSyncAuthUserId: jest.fn(() => 'owner'),
}));

jest.mock('@/services/offline/database', () => ({
  getPendingSyncByEntityKey: jest.fn(async () => null),
  saveScorecard: jest.fn(() => Promise.resolve()),
  saveHoleScore: jest.fn(() => Promise.resolve()),
  getScorecardsByRound: jest.fn(() => Promise.resolve([])),
  saveHoles: jest.fn(() => Promise.resolve()),
  getHoles: jest.fn(() => Promise.resolve([])),
  persistRoundEarlyEnd: jest.fn(() => Promise.resolve()),
  persistAuthoritativeRoundShape: jest.fn(),
  getPendingSyncs: jest.fn(async () => []),
  getFailedSyncs: jest.fn(async () => []),
  deleteHoleScoresForCards: jest.fn(() => Promise.resolve()),
  markScorecardsAsSynced: jest.fn(() => Promise.resolve()),
  markScorecardAsSynced: jest.fn(() => Promise.resolve()),
  removePendingSync: jest.fn(async () => false),
  getFailedSyncCountForRound: jest.fn(() => Promise.resolve(0)),
}));

jest.mock('@/services/offline/sync', () => {
  class ScorecardConflictError extends Error {
    readonly serverRevision = 0;
  }
  return {
    queueScorecardSync: jest.fn(() => Promise.resolve()),
    syncScorecard: jest.fn(() => Promise.resolve({ serverRevision: 1 })),
    subscribeSyncState: jest.fn(() => jest.fn()),
    subscribeScorecardSynced: jest.fn(() => jest.fn()),
    getIsOnline: jest.fn(() => true),
    ScorecardConflictError,
  };
});

jest.mock('@/store/scorecardSyncDebounce', () => ({
  debouncedQueueScorecardSync: jest.fn(),
  flushPendingScorecardSyncs: jest.fn(),
}));

// `rounds` row for loadFromOffline's metadata read. `{ __reject: true }`
// makes the query throw (no network).
jest.mock('@/services/supabase/client', () => {
  const DEFAULT_ROUNDS_RESULT = {
    data: {
      game_type: 'stableford',
      handicap_source: 'profile',
      nine_type: 'full',
      holes_played: null,
      selected_tee: null,
      course_id: null,
    },
    error: null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock state
  let roundsResult: any = DEFAULT_ROUNDS_RESULT;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock chain
  const makeChain = (getResult: () => any) => {
    const settle = () => {
      const result = getResult();
      return result && result.__reject
        ? Promise.reject(new Error('Network request failed'))
        : Promise.resolve(result);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-referential chain
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      in: jest.fn(settle),
      maybeSingle: jest.fn(settle),
      single: jest.fn(settle),
    };
    return chain;
  };
  return {
    supabase: {
      from: jest.fn((table: string) =>
        makeChain(() => (table === 'rounds' ? roundsResult : { data: null, error: null }))
      ),
    },
    getCurrentUser: jest.fn(() => Promise.resolve({ id: 'test-user-id' })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper
    __setRoundsResult: (result: any) => {
      roundsResult = result;
    },
    __resetRoundsResult: () => {
      roundsResult = DEFAULT_ROUNDS_RESULT;
    },
  };
});

jest.mock('@/utils/debugLogger', () => {
  const makeLogger = () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  });
  return {
    storeLogger: makeLogger(),
    scoringLogger: makeLogger(),
    submitLogger: makeLogger(),
    syncLogger: makeLogger(),
    createModuleLogger: jest.fn(() => makeLogger()),
    logScorecardSummary: jest.fn((sc) => ({ id: sc?.id })),
  };
});

let mockSessionOwner: string | null = 'owner';
jest.mock('@/hooks/auth/useAuthSession', () => ({
  useAuthSession: () => ({
    session: mockSessionOwner ? { user: { id: mockSessionOwner } } : null,
    isLoading: false,
  }),
}));
jest.mock('@/hooks/useOnlineStatus', () => ({ checkIsOnline: jest.fn(async () => true) }));
const mockErrorToast = jest.fn();
const mockToast = jest.fn();
jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({ showErrorToast: mockErrorToast, showToast: mockToast }),
}));
const mockInvalidate = jest.fn();
jest.mock('@/services/queryClient', () => ({
  queryClient: { invalidateQueries: (...args: unknown[]) => mockInvalidate(...args) },
}));

const ROUND_ID = '123e4567-e89b-42d3-a456-426614174000';
const players = [
  createTestPlayer({ id: 'p1', name: 'Alice', handicap: 0 }),
  createTestPlayer({ id: 'p2', name: 'Bob', handicap: 0 }),
];
const tee: TeeBox = { name: 'White', color: 'white', slopeRating: 113, courseRating: 72 };
const store = () => useScorecardStore.getState();
let pending: PendingSync | null;
let rpc: jest.Mock;
let shapeRead: jest.Mock;
let serial = 0;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function endIntent(n = 6, owner = 'owner'): PendingSync {
  const data = { id: ROUND_ID, action: 'end_early', holesPlayed: n, userId: owner };
  return {
    id: 17,
    revision: 3,
    type: 'round',
    action: 'update',
    entityKey: `round:${ROUND_ID}:end_early`,
    data,
    timestamp: new Date('2026-10-07'),
    retryCount: 2,
    status: 'failed',
    lastError: 'prior failure',
    endIntentRead: { decode: 'decoded', rawData: JSON.stringify(data) },
  };
}
async function setup(n = 6, nineType: 'full' | 'back9' = 'full', handicap = 0) {
  const ps = players.map((p) => ({ ...p, handicap }));
  await store().initializeRound(
    ROUND_ID,
    ps,
    create18Holes(),
    'stroke',
    false,
    [],
    tee,
    handicap ? 'profile' : 'none',
    new Map(),
    nineType
  );
  const cards = new Map(store().groupScorecards);
  for (const [id, card] of cards) {
    const scores: Scorecard['scores'] = {};
    for (const hole of store().holes.slice(0, n))
      scores[hole.number] = { strokes: hole.par + (id === 'p2' ? 1 : 0) };
    cards.set(id, { ...card, scores });
  }
  useScorecardStore.setState({ groupScorecards: cards });
  jest.clearAllMocks();
}
beforeEach(async () => {
  store().resetRound();
  serial += 1;
  (removePendingSync as jest.Mock).mockReset().mockResolvedValue(false);
  pending = null;
  mockSessionOwner = 'owner';
  (getSyncAuthUserId as jest.Mock).mockReturnValue('owner');
  (checkIsOnline as jest.Mock).mockResolvedValue(true);
  (saveScorecard as jest.Mock).mockReset().mockResolvedValue(undefined);
  (getPendingSyncByEntityKey as jest.Mock).mockImplementation(async () => pending);
  (getScorecardsByRound as jest.Mock).mockResolvedValue([]);
  (persistRoundEarlyEnd as jest.Mock)
    .mockReset()
    .mockImplementation(async (_id, n, _nine, _played, _cards, options) => {
      if (options?.intent && !pending)
        pending = {
          ...endIntent(n, options.intent.userId),
          status: 'pending',
          retryCount: 0,
          revision: 1,
          lastError: null,
        };
    });
  (persistAuthoritativeRoundShape as jest.Mock).mockImplementation(
    async (_id, target, { rebuild }) => {
      const cards = store().captureRoundScoringSession(ROUND_ID)?.getCards() ?? [];
      return {
        cards: cards.map((card) => rebuild(card, shapeHoleNumbers(target), target)),
        priorLocalShapes: new Map(
          cards.map((card) => [
            card.id,
            { nine_type: card.syncNineType ?? 'full', holes_played: card.holesPlayed ?? null },
          ])
        ),
      };
    }
  );
  rpc = jest.fn(async () => ({ error: null }));
  shapeRead = jest.fn(async () => ({ data: { nine_type: 'full', holes_played: 4 }, error: null }));
  const transport = jest.requireMock('@/services/supabase/client').supabase;
  transport.rpc = jest.fn(() => ({ abortSignal: () => rpc() }));
  transport.from.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    for (const key of ['select', 'eq', 'is', 'abortSignal']) chain[key] = () => chain;
    chain.maybeSingle = () => shapeRead();
    return chain;
  });
  await setup();
});

// Preproduction characterization locks actual planned math, store action and coordinator.
describe('B6c-1 existing boundaries characterization', () => {
  it('plans six leading holes and leaves original planned metadata intact after public local end', async () => {
    expect(
      planEndRoundEarly({
        holes: store().holes,
        nineType: store().nineType,
        players,
        scorecards: store().groupScorecards,
      })
    ).toMatchObject({ holesPlayed: 6, plannedHoles: 18, lastHoleNumber: 6 });
    await store().endRoundEarly(6);
    expect(store().holes).toHaveLength(18);
    expect(jest.requireMock('@/utils/debugLogger').scoringLogger.error.mock.calls).toEqual([]);
    expect(store().holesPlayed).toBe(6);
    expect(pending?.data.userId).toBe('owner');
    expect(requestSyncDrain).toHaveBeenCalledWith('round-end-early');
  });
  it('serializes a round while another round continues', async () => {
    const held = deferred<void>();
    const order: string[] = [];
    const first = withRoundScoringWrite(ROUND_ID, async () => {
      order.push('first');
      await held.promise;
    });
    const second = withRoundScoringWrite(ROUND_ID, async () => {
      order.push('second');
    });
    await withRoundScoringWrite(`other-${serial}`, async () => {
      order.push('other');
    });
    expect(order).toEqual(['first', 'other']);
    held.resolve();
    await Promise.all([first, second]);
    expect(order).toEqual(['first', 'other', 'second']);
  });
});

function opened(overrides: Partial<UseEndRoundEarlyArgs> = {}) {
  const onEnded = jest.fn();
  const args = {
    roundId: ROUND_ID,
    isStandalone: true,
    gameType: 'stroke' as const,
    scoringPairsEnabled: false,
    onEnded,
    ...overrides,
  };
  const rendered = renderHook((props: UseEndRoundEarlyArgs) => useEndRoundEarly(props), {
    initialProps: args,
  });
  act(() => rendered.result.current.open());
  return { ...rendered, onEnded, args };
}
async function confirm(result: { current: ReturnType<typeof useEndRoundEarly> }) {
  act(() => result.current.sheetProps.onConfirm());
  await waitFor(() => expect(result.current.sheetProps.loading).toBe(false));
}
describe('useEndRoundEarly', () => {
  it('offers the complete six-hole preview and completes one owned online end', async () => {
    const { result, onEnded } = opened();
    expect(result.current.canEndRoundEarly).toBe(true);
    expect(result.current.sheetProps.visible).toBe(true);
    expect(result.current.sheetProps.plan).toMatchObject({ holesPlayed: 6, plannedHoles: 18 });
    expect(result.current.sheetProps.resultPreview).toBe('Alice leads on net 23');
    await confirm(result);
    expect(jest.requireMock('@/utils/debugLogger').scoringLogger.error.mock.calls).toEqual([]);
    expect(store().holesPlayed).toBe(6);
    expect(pending?.data.userId).toBe('owner');
    expect(onEnded).toHaveBeenCalledWith(6);
    expect(mockInvalidate).toHaveBeenCalledTimes(2);
  });
});

describe('useEndRoundEarly eligibility and previews', () => {
  it.each([
    ['competition', { isStandalone: false }, {}],
    ['scoring pairs', { scoringPairsEnabled: true }, {}],
    ['loading', {}, { isLoading: true }],
    ['incomplete initialization', {}, { isInitialized: false }],
    ['different round', {}, { currentRoundId: 'other' }],
    ['partial scope', {}, { allowedPlayerIds: ['p1'] }],
    ['ended', {}, { holesPlayed: 6 }],
  ])('hides the action for %s', (_label, args, state) => {
    useScorecardStore.setState(state);
    const { result } = opened(args);
    expect(result.current.canEndRoundEarly).toBe(false);
    expect(result.current.sheetProps.visible).toBe(false);
  });
  it('allows an explicit all-player scope and rejects an extra card outside it', () => {
    useScorecardStore.setState({ allowedPlayerIds: ['p1', 'p2'] });
    const { result } = opened();
    expect(result.current.canEndRoundEarly).toBe(true);
    act(() =>
      useScorecardStore.setState({
        groupScorecards: new Map([
          ...store().groupScorecards,
          ['p3', { ...store().groupScorecards.get('p1')!, playerId: 'p3' }],
        ]),
      })
    );
    expect(result.current.canEndRoundEarly).toBe(false);
  });
  it.each(['completed', 'confirmed', 'submittedAt', 'submittedBy'])(
    'rejects submission evidence %s',
    (field) => {
      const cards = new Map(store().groupScorecards);
      const card = cards.get('p1')!;
      cards.set(
        'p1',
        field === 'completed' || field === 'confirmed'
          ? { ...card, status: field }
          : { ...card, [field]: field === 'submittedAt' ? new Date() : 'owner' }
      );
      useScorecardStore.setState({ groupScorecards: cards });
      expect(opened().result.current.canEndRoundEarly).toBe(false);
    }
  );
  it('requires authenticated ownership', () => {
    (getSyncAuthUserId as jest.Mock).mockReturnValue(null);
    expect(opened().result.current.canEndRoundEarly).toBe(false);
  });
  it.each([0, 18])('refuses an empty or complete prefix (%i)', async (n) => {
    await setup(n);
    expect(opened().result.current.canEndRoundEarly).toBe(false);
  });
  it('retains planned handicap math with nonzero handicap and per-player tees', async () => {
    await setup(6, 'full', 18);
    useScorecardStore.setState({ playerTeeMap: new Map([['p2', { ...tee, slopeRating: 226 }]]) });
    const { result } = opened();
    // Alice DH17 receives one on every retained hole. Bob DH33 receives two on five and one on hole6: 29-11=18.
    expect(result.current.sheetProps.resultPreview).toBe('Alice leads on net 17');
    expect(result.current.sheetProps.handicapRound).toBe(true);
  });
  it('uses actual back-nine numbers and all planned back-nine pars for handicap preview', async () => {
    await setup(6, 'back9', 18);
    const { result } = opened();
    // Existing live calculator: DH50 from full tee rating72 minus planned back9 par36; six holes receive16 strokes.
    expect(result.current.sheetProps.plan).toMatchObject({
      holesPlayed: 6,
      plannedHoles: 9,
      lastHoleNumber: 15,
    });
    expect(result.current.sheetProps.resultPreview).toBe('Alice leads on net 7');
  });
  it.each(['stableford', 'par'] as const)('uses real %s preview math', (gameType) => {
    expect(opened({ gameType }).result.current.sheetProps.resultPreview).toBe(
      gameType === 'stableford' ? 'Alice leads on 12 pts' : 'Alice leads on 0'
    );
  });
  it.each([{ teamFormat: 'scramble' as const }, { gameType: 'match-play' as const }])(
    'omits unsupported individual preview %o',
    (args) => {
      expect(opened(args).result.current.sheetProps.resultPreview).toBeNull();
    }
  );
  it('omits multi-ball preview', () => {
    useScorecardStore.setState({ isMultiBall: true });
    expect(opened().result.current.sheetProps.resultPreview).toBeNull();
  });
});

describe('captured auth session', () => {
  it('does not offer a confirmation while React auth and sync ownership disagree', () => {
    mockSessionOwner = 'other';
    const { result } = opened();
    expect(result.current.canEndRoundEarly).toBe(false);
    expect(result.current.sheetProps.visible).toBe(false);
  });
});

describe('held confirmation schedules', () => {
  it.each(['offline', 'network', 'online'] as const)(
    'commits the same owned basis once for %s without reviving a failed end',
    async (mode) => {
      pending = endIntent();
      const retained = JSON.stringify(pending);
      if (mode === 'offline') (checkIsOnline as jest.Mock).mockResolvedValue(false);
      if (mode === 'network')
        rpc.mockResolvedValue({ error: { code: '57014', message: 'timeout' } });
      const { result, onEnded } = opened();
      await confirm(result);
      expect(store().holesPlayed).toBe(6);
      expect(onEnded).toHaveBeenCalledWith(6);
      expect(JSON.stringify(pending)).toBe(retained);
      expect(persistRoundEarlyEnd).toHaveBeenCalledTimes(1);
      expect((persistRoundEarlyEnd as jest.Mock).mock.calls[0][5]).toEqual({
        intent: { userId: 'owner' },
      });
      const basis = (persistRoundEarlyEnd as jest.Mock).mock.calls[0][4];
      expect(basis[0]).toMatchObject({
        coursePar: 72,
        syncGameType: 'stroke',
        syncHandicapSource: 'none',
      });
      expect(basis[0].syncHoles).toHaveLength(18);
      expect(removePendingSync).not.toHaveBeenCalled();
      expect(requestSyncDrain).toHaveBeenCalledWith('round-end-early');
    }
  );
  it.each(['forbidden', 'invalid', 'busy'] as const)(
    'keeps the local card and intent unchanged on %s',
    async (code) => {
      rpc.mockResolvedValue({
        error: {
          code: code === 'forbidden' ? '42501' : '22023',
          hint: code === 'busy' ? 'round_scorecards_busy' : 'invalid_holes_played',
          message: code,
        },
      });
      const { result, onEnded } = opened();
      await confirm(result);
      expect(store().holesPlayed).toBeNull();
      expect(pending).toBeNull();
      expect(onEnded).not.toHaveBeenCalled();
      expect(mockErrorToast).toHaveBeenCalled();
    }
  );
  it('holds local end through metadata saves before another same-round writer enters', async () => {
    const metadata = deferred<void>();
    (saveScorecard as jest.Mock).mockImplementationOnce(() => metadata.promise);
    const { result, onEnded } = opened();
    act(() => {
      result.current.sheetProps.onConfirm();
      result.current.sheetProps.onConfirm();
    });
    await waitFor(() => expect(store().holesPlayed).toBe(6));
    const entered = jest.fn();
    const waiting = withRoundScoringWrite(ROUND_ID, async () => {
      entered();
    });
    await act(async () => {
      await withRoundScoringWrite(`other-${serial}`, async () => {});
    });
    expect(entered).not.toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
    await act(async () => {
      metadata.resolve();
      await waiting;
    });
    expect(entered).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it.each(['connectivity', 'RPC', 'local drain'] as const)(
    'rejects same-ID reset during %s',
    async (phase) => {
      const pause = deferred<void>();
      let held: Promise<unknown> | undefined;
      if (phase === 'connectivity')
        (checkIsOnline as jest.Mock).mockImplementationOnce(async () => {
          await pause.promise;
          return true;
        });
      if (phase === 'RPC')
        rpc.mockImplementationOnce(async () => {
          await pause.promise;
          return { error: null };
        });
      if (phase === 'local drain')
        held = withRoundPersistence(
          captureRoundPersistenceSource(ROUND_ID),
          async () => pause.promise
        );
      const { result, onEnded } = opened();
      act(() => result.current.sheetProps.onConfirm());
      await waitFor(() =>
        expect(phase === 'connectivity' ? checkIsOnline : rpc).toHaveBeenCalled()
      );
      await act(async () => {
        store().resetRound();
        pause.resolve();
        await held;
        await setup();
      });
      await waitFor(() => expect(result.current.sheetProps.loading).toBe(false));
      expect(store().holesPlayed).toBeNull();
      expect(pending).toBeNull();
      expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
      expect(onEnded).not.toHaveBeenCalled();
      expect(result.current.sheetProps.visible).toBe(false);
    }
  );
  it.each(['owner', 'React owner', 'scope', 'submission', 'plan', 'route'] as const)(
    'rejects changed %s while RPC is awaiting',
    async (change) => {
      const remote = deferred<{ error: null }>();
      rpc.mockReturnValueOnce(remote.promise);
      const { result, onEnded, rerender, args } = opened();
      act(() => result.current.sheetProps.onConfirm());
      await waitFor(() => expect(rpc).toHaveBeenCalled());
      act(() => {
        if (change === 'owner') (getSyncAuthUserId as jest.Mock).mockReturnValue('replacement');
        if (change === 'React owner') {
          mockSessionOwner = 'replacement';
          rerender(args);
        }
        if (change === 'scope') useScorecardStore.setState({ allowedPlayerIds: ['p1'] });
        if (change === 'route') rerender({ ...args, roundId: 'other' });
        if (change === 'submission' || change === 'plan') {
          const cards = new Map(store().groupScorecards);
          const card = cards.get('p1')!;
          cards.set(
            'p1',
            change === 'submission' ? { ...card, status: 'completed' } : { ...card, scores: {} }
          );
          useScorecardStore.setState({ groupScorecards: cards });
        }
      });
      await act(async () => {
        remote.resolve({ error: null });
      });
      await waitFor(() => expect(result.current.sheetProps.loading).toBe(false));
      expect(store().holesPlayed).toBeNull();
      expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
      expect(onEnded).not.toHaveBeenCalled();
    }
  );
  it('rejects the original source after an independent transition during RPC', async () => {
    const remote = deferred<{ error: null }>();
    rpc.mockReturnValueOnce(remote.promise);
    const { result, onEnded } = opened();
    act(() => result.current.sheetProps.onConfirm());
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    const source = captureRoundPersistenceSource(ROUND_ID);
    await act(async () => {
      await withRoundPersistenceTransition(
        ROUND_ID,
        { nine_type: 'full', holes_played: 8 },
        async () => {},
        () => {}
      );
      remote.resolve({ error: null });
    });
    await waitFor(() => expect(result.current.sheetProps.loading).toBe(false));
    expect(captureRoundPersistenceSource(ROUND_ID).epoch).toBe(source.epoch + 1);
    expect(store().holesPlayed).toBeNull();
    expect(onEnded).not.toHaveBeenCalled();
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
  });
  it('refuses opening against an already closed independent transition', async () => {
    const pause = deferred<void>();
    const held = withRoundPersistence(
      captureRoundPersistenceSource(ROUND_ID),
      async () => pause.promise
    );
    const source = captureRoundPersistenceSource(ROUND_ID);
    const independent = withRoundPersistenceTransition(
      ROUND_ID,
      { nine_type: 'full', holes_played: 8 },
      async () => {},
      () => {}
    );
    const { result, onEnded } = opened();
    act(() => result.current.sheetProps.onConfirm());
    await act(async () => {
      pause.resolve();
      await held;
      await independent;
    });
    await waitFor(() => expect(result.current.sheetProps.loading).toBe(false));
    expect(captureRoundPersistenceSource(ROUND_ID).epoch).toBe(source.epoch + 1);
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
  });
  it('requests drain before rejecting a postcommit account replacement and preserves durable work', async () => {
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(
      async (_id, n, _nine, _holes, _cards, options) => {
        pending = endIntent(n, options.intent.userId);
        (getSyncAuthUserId as jest.Mock).mockReturnValue('replacement');
      }
    );
    const { result, onEnded } = opened();
    const source = captureRoundPersistenceSource(ROUND_ID);
    await confirm(result);
    expect(requestSyncDrain).toHaveBeenCalledWith('round-end-early');
    expect(pending?.data.userId).toBe('owner');
    expect(store().holesPlayed).toBeNull();
    expect(onEnded).not.toHaveBeenCalled();
    expect(captureRoundPersistenceSource(ROUND_ID).epoch).toBe(source.epoch + 1);
  });
  it('does not reopen an old sheet/open callback after reset and does not reuse it after replacement eligibility returns', async () => {
    const { result } = opened();
    const oldOpen = result.current.open;
    await act(async () => {
      store().resetRound();
      await setup();
    });
    act(() => oldOpen());
    expect(result.current.sheetProps.visible).toBe(false);
    act(() => result.current.open());
    expect(result.current.sheetProps.visible).toBe(true);
  });
  it('keeps cancel blocked while pending and suppresses unmounted navigation', async () => {
    const remote = deferred<{ error: null }>();
    rpc.mockReturnValueOnce(remote.promise);
    const { result, onEnded, unmount } = opened();
    act(() => result.current.sheetProps.onConfirm());
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    act(() => result.current.sheetProps.onCancel());
    expect(result.current.sheetProps.visible).toBe(true);
    unmount();
    await act(async () => {
      remote.resolve({ error: null });
    });
    expect(onEnded).not.toHaveBeenCalled();
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });
});

describe('actual missing RPC and native queue-only acknowledgment', () => {
  function nativeQueueCAS() {
    const native = jest.requireActual<typeof import('@/services/offline/dao/SyncQueueDAO')>(
      '@/services/offline/dao/SyncQueueDAO'
    );
    (removePendingSync as jest.Mock).mockImplementation(native.removePendingSync);
    const txn = {
      getFirstAsync: jest.fn(async () =>
        pending
          ? {
              id: pending.id,
              type: pending.type,
              action: pending.action,
              entity_key: pending.entityKey,
              revision: pending.revision,
              data: pending.endIntentRead?.rawData,
              timestamp: pending.timestamp.toISOString(),
              retry_count: pending.retryCount,
              status: pending.status,
              last_error: pending.lastError,
              last_attempt_at: pending.lastAttemptAt?.toISOString() ?? null,
            }
          : null
      ),
      runAsync: jest.fn(async () => {
        pending = null;
        return { changes: 1 };
      }),
    };
    jest
      .requireMock('@/services/offline/DatabaseManager')
      .getDb.mockResolvedValue({
        withExclusiveTransactionAsync: async (work: (transaction: typeof txn) => Promise<void>) =>
          work(txn),
      });
    return txn;
  }
  beforeEach(() => {
    rpc.mockResolvedValue({ error: { code: 'P0002', message: 'missing' } });
  });
  it('finishes without a new intent and removes only the original matching failed owned raw snapshot', async () => {
    pending = endIntent();
    const original = pending;
    const txn = nativeQueueCAS();
    const { result, onEnded } = opened();
    await confirm(result);
    expect(store().holesPlayed).toBe(6);
    expect(pending).toBeNull();
    expect(onEnded).toHaveBeenCalledWith(6);
    expect((persistRoundEarlyEnd as jest.Mock).mock.calls[0]).toHaveLength(5);
    expect(removePendingSync).toHaveBeenCalledWith(
      original.id,
      original.revision,
      expect.any(Function),
      undefined,
      {
        expectedRecovery: expect.objectContaining({
          endIntentRead: original.endIntentRead,
          status: 'failed',
          retryCount: 2,
        }),
      }
    );
    expect(txn.runAsync).toHaveBeenCalledTimes(1);
    expect(requestSyncDrain).not.toHaveBeenCalled();
    expect(shapeRead).not.toHaveBeenCalled();
  });
  it('does not select a newly appeared row when the original snapshot was absent', async () => {
    const remote = deferred<{ error: { code: string; message: string } }>();
    rpc.mockReturnValueOnce(remote.promise);
    nativeQueueCAS();
    const { result, onEnded } = opened();
    act(() => result.current.sheetProps.onConfirm());
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    const replacement = endIntent();
    pending = replacement;
    await act(async () => {
      remote.resolve({ error: { code: 'P0002', message: 'missing' } });
    });
    await waitFor(() => expect(result.current.sheetProps.loading).toBe(false));
    expect(pending).toBe(replacement);
    expect(removePendingSync).not.toHaveBeenCalled();
    expect(onEnded).toHaveBeenCalledWith(6);
  });
  it.each(['raw', 'revision', 'recovery', 'entity', 'id'] as const)(
    'preserves an original end row replaced by %s before missing RPC settles',
    async (replacementKind) => {
      pending = endIntent();
      const original = pending;
      const remote = deferred<{ error: { code: string; message: string } }>();
      rpc.mockReturnValueOnce(remote.promise);
      const txn = nativeQueueCAS();
      const { result, onEnded } = opened();
      act(() => result.current.sheetProps.onConfirm());
      await waitFor(() => expect(rpc).toHaveBeenCalled());
      const replacement = {
        ...original,
        ...(replacementKind === 'raw'
          ? {
              endIntentRead: {
                ...original.endIntentRead!,
                rawData: original.endIntentRead!.rawData + ' ',
              },
            }
          : {}),
        ...(replacementKind === 'revision' ? { revision: 4 } : {}),
        ...(replacementKind === 'recovery'
          ? { status: 'pending' as const, lastError: null, retryCount: 0 }
          : {}),
        ...(replacementKind === 'entity' ? { entityKey: 'round:other:end_early' } : {}),
        ...(replacementKind === 'id' ? { id: 18 } : {}),
      };
      pending = replacement;
      await act(async () => {
        remote.resolve({ error: { code: 'P0002', message: 'missing' } });
      });
      await waitFor(() => expect(result.current.sheetProps.loading).toBe(false));
      expect(pending).toBe(replacement);
      expect(txn.runAsync).not.toHaveBeenCalled();
      expect(onEnded).toHaveBeenCalledWith(6);
    }
  );
  it.each(['foreign', 'malformed', 'wrong N', 'no raw proof', 'invalid identity'] as const)(
    'never sends or cleans an incompatible %s prerequisite',
    async (collision) => {
      pending = endIntent(
        collision === 'wrong N' ? 8 : 6,
        collision === 'foreign' ? 'other' : 'owner'
      );
      if (collision === 'malformed')
        pending = { ...pending, endIntentRead: { decode: 'invalid_json', rawData: '{' } };
      if (collision === 'no raw proof') pending = { ...pending, endIntentRead: undefined };
      if (collision === 'invalid identity') pending = { ...pending, id: undefined };
      const original = pending;
      nativeQueueCAS();
      const { result, onEnded } = opened();
      await confirm(result);
      expect(rpc).not.toHaveBeenCalled();
      expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
      expect(pending).toBe(original);
      expect(removePendingSync).not.toHaveBeenCalled();
      expect(onEnded).not.toHaveBeenCalled();
    }
  );
});

describe('authoritative conflict and deadline', () => {
  beforeEach(() => {
    rpc.mockResolvedValue({
      error: { code: '22023', hint: 'round_already_ended', details: '4', message: 'already ended' },
    });
  });
  it('adopts the complete current shape using held shared repair, including submitted frozen cards', async () => {
    const remote = deferred<{
      error: { code: string; hint: string; details: string; message: string };
    }>();
    rpc.mockReturnValueOnce(remote.promise);
    const { result, onEnded } = opened();
    act(() => result.current.sheetProps.onConfirm());
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    act(() => {
      const cards = new Map(
        [...store().groupScorecards].map(([id, card]) => [
          id,
          {
            ...card,
            status: 'completed' as const,
            submittedBy: 'owner',
            submittedAt: new Date(),
            syncHoles: store().holes,
            syncNineType: 'full' as const,
            syncGameType: 'stroke' as const,
            syncHandicapSource: 'none' as const,
            coursePar: 72,
            teeData: tee,
          },
        ])
      );
      useScorecardStore.setState({ groupScorecards: cards });
      (getScorecardsByRound as jest.Mock).mockResolvedValue([...cards.values()]);
    });
    const source = captureRoundPersistenceSource(ROUND_ID);
    await act(async () => {
      remote.resolve({
        error: {
          code: '22023',
          hint: 'round_already_ended',
          details: '4',
          message: 'already ended',
        },
      });
    });
    await waitFor(() => expect(result.current.sheetProps.loading).toBe(false));
    expect(store().holesPlayed).toBe(4);
    expect(store().groupScorecards.get('p1')?.status).toBe('completed');
    expect(Object.keys(store().groupScorecards.get('p1')!.scores)).toEqual(['1', '2', '3', '4']);
    expect(onEnded).toHaveBeenCalledWith(4);
    expect(persistAuthoritativeRoundShape).toHaveBeenCalledTimes(1);
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
    expect(pending).toBeNull();
    expect(requestSyncDrain).not.toHaveBeenCalled();
    expect(captureRoundPersistenceSource(ROUND_ID).epoch).toBe(source.epoch + 1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'This round was already ended after 4 holes on another device.',
      })
    );
  });
  it.each(['unavailable', 'unended', 'invalid shape', 'repair failure'] as const)(
    'blocks conflict when %s',
    async (failure) => {
      if (failure === 'unavailable') shapeRead.mockRejectedValueOnce(new Error('unavailable'));
      if (failure === 'unended')
        shapeRead.mockResolvedValueOnce({
          data: { nine_type: 'full', holes_played: null },
          error: null,
        });
      if (failure === 'invalid shape')
        shapeRead.mockResolvedValueOnce({
          data: { nine_type: 'bogus', holes_played: 4 },
          error: null,
        });
      if (failure === 'repair failure')
        (persistAuthoritativeRoundShape as jest.Mock).mockRejectedValueOnce(
          new Error('repair failed')
        );
      const { result, onEnded } = opened();
      await confirm(result);
      expect(onEnded).not.toHaveBeenCalled();
      expect(store().holesPlayed).toBeNull();
      expect(pending).toBeNull();
      expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
      expect(removePendingSync).not.toHaveBeenCalled();
      expect(mockErrorToast).toHaveBeenCalled();
    }
  );
  it('keeps the original source while authorized conflict shape is awaiting', async () => {
    const remoteShape = deferred<{
      data: { nine_type: string; holes_played: number };
      error: null;
    }>();
    shapeRead.mockReturnValueOnce(remoteShape.promise);
    const { result, onEnded } = opened();
    act(() => result.current.sheetProps.onConfirm());
    await waitFor(() => expect(shapeRead).toHaveBeenCalled());
    await act(async () => {
      await withRoundPersistenceTransition(
        ROUND_ID,
        { nine_type: 'full', holes_played: 8 },
        async () => {},
        () => {}
      );
      remoteShape.resolve({ data: { nine_type: 'full', holes_played: 4 }, error: null });
    });
    await waitFor(() => expect(result.current.sheetProps.loading).toBe(false));
    expect(persistAuthoritativeRoundShape).not.toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
  });
  it('expires the actual eight-second RPC deadline, commits once, and ignores late settlement', async () => {
    jest.useFakeTimers();
    try {
      const remote = deferred<{ error: null }>();
      rpc.mockReturnValueOnce(remote.promise);
      const { result, onEnded } = opened();
      await act(async () => {
        result.current.sheetProps.onConfirm();
      });
      expect(rpc).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(7999);
      });
      expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(store().holesPlayed).toBe(6);
      expect(pending?.data.userId).toBe('owner');
      expect(onEnded).toHaveBeenCalledTimes(1);
      await act(async () => {
        remote.resolve({ error: null });
      });
      expect(persistRoundEarlyEnd).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledTimes(1);
      expect(removePendingSync).not.toHaveBeenCalled();
      expect(mockInvalidate).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('own drained local transition', () => {
  it.each(['none', 'scope', 'submission', 'plan', 'owner'] as const)(
    'checks original eligibility after local drain (%s)',
    async (change) => {
      const pause = deferred<void>();
      const source = captureRoundPersistenceSource(ROUND_ID);
      const held = withRoundPersistence(source, async () => pause.promise);
      const { result, onEnded } = opened();
      act(() => result.current.sheetProps.onConfirm());
      await waitFor(() => expect(rpc).toHaveBeenCalled());
      await waitFor(() => expect(isRoundPersistenceSourceCurrent(source)).toBe(false));
      act(() => {
        if (change === 'scope') useScorecardStore.setState({ allowedPlayerIds: ['p1'] });
        if (change === 'owner') (getSyncAuthUserId as jest.Mock).mockReturnValue('replacement');
        if (change === 'submission' || change === 'plan') {
          const cards = new Map(store().groupScorecards);
          const card = cards.get('p1')!;
          cards.set(
            'p1',
            change === 'submission' ? { ...card, status: 'completed' } : { ...card, scores: {} }
          );
          useScorecardStore.setState({ groupScorecards: cards });
        }
      });
      await act(async () => {
        pause.resolve();
        await held;
      });
      await waitFor(() => expect(result.current.sheetProps.loading).toBe(false));
      if (change === 'none') {
        expect(store().holesPlayed).toBe(6);
        expect(onEnded).toHaveBeenCalledWith(6);
        expect(captureRoundPersistenceSource(ROUND_ID).epoch).toBe(source.epoch + 1);
      } else {
        expect(store().holesPlayed).toBeNull();
        expect(onEnded).not.toHaveBeenCalled();
        expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
        expect(captureRoundPersistenceSource(ROUND_ID).epoch).toBe(source.epoch);
      }
    }
  );
  it('suppresses navigation after a route changes during committed metadata work', async () => {
    const metadata = deferred<void>();
    (saveScorecard as jest.Mock).mockImplementationOnce(() => metadata.promise);
    const { result, onEnded, rerender, args } = opened();
    act(() => result.current.sheetProps.onConfirm());
    await waitFor(() => expect(store().holesPlayed).toBe(6));
    act(() => rerender({ ...args, roundId: 'other' }));
    await act(async () => {
      metadata.resolve();
    });
    await waitFor(() => expect(result.current.sheetProps.loading).toBe(false));
    expect(pending?.data.userId).toBe('owner');
    expect(onEnded).not.toHaveBeenCalled();
    expect(result.current.sheetProps.visible).toBe(false);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });
  it('prevents an old open callback after account replacement', () => {
    const { result, rerender, args } = opened();
    const oldOpen = result.current.open;
    act(() => {
      (getSyncAuthUserId as jest.Mock).mockReturnValue('replacement');
      mockSessionOwner = 'replacement';
      rerender(args);
    });
    act(() => oldOpen());
    expect(result.current.sheetProps.visible).toBe(false);
    act(() => result.current.open());
    expect(result.current.sheetProps.visible).toBe(true);
  });
});

describe('match preview at the hook boundary', () => {
  function singles(first = 1) {
    return Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [
        first + i,
        {
          player1Score: 4,
          player2Score: 5,
          player1PickedUp: false,
          player2PickedUp: false,
          winner:
            i < 5 ? ('player1' as const) : i === 5 ? ('halved' as const) : ('player2' as const),
        },
      ])
    );
  }
  it('keeps nominal full denominator18 but actual physical-nine closeout5&4', () => {
    useScorecardStore.setState({ holes: store().holes.slice(0, 9) });
    const { result } = opened({
      gameType: 'match-play',
      getMatchContext: () => ({ kind: 'singles', names: ['Alice', 'Bob'], holeResults: singles() }),
    });
    expect(result.current.sheetProps.plan?.plannedHoles).toBe(18);
    expect(result.current.sheetProps.resultPreview).toBe('Alice wins 5&4');
  });
  it('uses actual back9 match numbers and excludes removed results', async () => {
    await setup(6, 'back9');
    const { result } = opened({
      gameType: 'match-play',
      getMatchContext: () => ({
        kind: 'singles',
        names: ['Alice', 'Bob'],
        holeResults: singles(10),
      }),
    });
    expect(result.current.sheetProps.resultPreview).toBe('Alice wins 5&4');
  });
  it('uses team match results through the same played mask', () => {
    const results = Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [
        i + 1,
        {
          team1Score: 4,
          team2Score: 5,
          team1PlayerScores: {},
          team2PlayerScores: {},
          winner: i < 2 ? ('team1' as const) : i < 6 ? ('halved' as const) : ('team2' as const),
        },
      ])
    );
    expect(
      opened({
        gameType: 'match-play',
        teamFormat: 'match-play-team',
        getMatchContext: () => ({
          kind: 'team',
          names: ['Team A', 'Team B'],
          holeResults: results,
        }),
      }).result.current.sheetProps.resultPreview
    ).toBe('Team A wins 2 UP');
  });
});

describe('confirmation callback ownership', () => {
  it('an old confirm/cancel cannot claim or dismiss a later opening', async () => {
    const { result, onEnded } = opened();
    const oldConfirm = result.current.sheetProps.onConfirm;
    const oldCancel = result.current.sheetProps.onCancel;
    act(() => result.current.sheetProps.onCancel());
    act(() => result.current.open());
    act(() => {
      oldCancel();
      oldConfirm();
    });
    await act(async () => {});
    expect(result.current.sheetProps.visible).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
    await confirm(result);
    expect(onEnded).toHaveBeenCalledWith(6);
  });
});

it('an old route opening stays obsolete after leaving and returning to the same round ID', () => {
  const { result, rerender, args } = opened();
  const oldOpen = result.current.open;
  act(() => rerender({ ...args, roundId: 'other' }));
  act(() => rerender(args));
  act(() => oldOpen());
  expect(result.current.sheetProps.visible).toBe(false);
  act(() => result.current.open());
  expect(result.current.sheetProps.visible).toBe(true);
});
