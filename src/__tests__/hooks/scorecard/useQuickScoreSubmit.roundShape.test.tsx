import React from 'react';
import { Platform } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useQuickScoreSubmit,
  type QuickScoreSubmitInput,
} from '@/hooks/scorecard/useQuickScoreSubmit';
import { supabase, getCurrentUser } from '@/services/supabase/client';
import { getDb } from '@/services/offline/DatabaseManager';
import { setSyncAuthUser } from '@/services/offline/sync/networkState';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import { roundKeys, scorecardKeys } from '@/hooks/queryKeys';
import { useQuickScoreEntry } from '@/screens/scoring/QuickScoreEntryScreen/useQuickScoreEntry';
import { useScorecardStore } from '@/store/scorecardStore';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
  getCurrentUser: jest.fn(async () => ({ id: 'owner' })),
}));
// Native connection only: the coordinator, DAOs, context and uploader remain real.
jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));

const roundId = '550e8400-e29b-41d4-a716-446655440050';
const playerId = '550e8400-e29b-41d4-a716-446655440051';
const holes = create18Holes();
const tee = { name: 'Blue', color: 'blue', courseRating: 72.5, slopeRating: 125 };
const db = {
  getFirstAsync: jest.fn(async () => null),
  getAllAsync: jest.fn(async () => []),
  runAsync: jest.fn(async () => ({ changes: 1 })),
  withExclusiveTransactionAsync: jest.fn(),
};
let writes: { table: string; payload: unknown }[] = [];
let currentShape = { nine_type: 'full', holes_played: 2 as number | null };
let upsertError: { code: string; hint: string; message: string } | null = null;
let remoteRow: Record<string, unknown> | null;
let remoteScores = { 1: { strokes: 5 }, 7: { strokes: 12 } };
let onUpsert: (() => void) | undefined;
let playerCount = 2;
let completedCount = 1;
let completionError: { message: string } | null = null;
let onCompletionRead: (() => void) | undefined;
function query(table: string) {
  let selection = '';
  let writing = false;
  const settle = () => {
    if (table === 'scorecards' && selection === '*') onCompletionRead?.();
    return {
      data:
        table === 'rounds'
          ? {
              id: roundId,
              status: 'in-progress',
              competition_id: null,
              game_type: 'stableford',
              selected_tee: tee,
              handicap_source: 'profile',
              courses: { holes },
              competitions: null,
              ...currentShape,
            }
          : writing
            ? { id: 'remote-card' }
            : selection.includes('revision')
              ? remoteRow
              : selection.includes('players!player_id')
                ? [
                    {
                      id: 'remote-card',
                      player_id: playerId,
                      scores: remoteScores,
                      players: { id: playerId, name: 'Sam', handicap: 18, gender: 'male' },
                    },
                  ]
                : table === 'players'
                  ? [{ id: playerId, name: 'Sam', handicap: 18, gender: 'male' }]
                  : selection === 'player_id' && table === 'round_players'
                    ? [{ player_id: playerId }]
                    : [],
      error:
        writing && table === 'scorecards'
          ? upsertError
          : table === 'round_players' && selection === '*'
            ? completionError
            : null,
      count:
        selection === '*' ? (table === 'round_players' ? playerCount : completedCount) : undefined,
    };
  };
  const chain = {
    select: (columns: string) => {
      selection = columns;
      return chain;
    },
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    is: () => chain,
    abortSignal: () => chain,
    upsert: (payload: unknown) => {
      writing = true;
      writes.push({ table, payload });
      onUpsert?.();
      return chain;
    },
    update: (payload: unknown) => {
      writing = true;
      writes.push({ table, payload });
      return chain;
    },
    single: async () => settle(),
    maybeSingle: async () => settle(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(settle()).then(resolve),
  };
  return chain;
}
function input(overrides: Partial<QuickScoreSubmitInput> = {}): QuickScoreSubmitInput {
  return {
    roundId,
    playerId,
    scores: { 1: { strokes: 5 }, 2: { strokes: 4 } },
    totalGross: 9,
    totalNet: -10,
    totalPoints: 5,
    holes,
    nineType: 'full',
    selectedTee: tee,
    handicapSource: 'profile',
    player: { id: playerId, name: 'Sam', handicap: 18, gender: 'male' },
    ...overrides,
  };
}
function renderSubmit() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useQuickScoreSubmit(), { wrapper }), client };
}
beforeEach(() => {
  jest.clearAllMocks();
  writes = [];
  upsertError = null;
  onUpsert = undefined;
  playerCount = 2;
  completedCount = 1;
  completionError = null;
  onCompletionRead = undefined;
  currentShape = { nine_type: 'full', holes_played: 2 };
  remoteScores = { 1: { strokes: 5 }, 7: { strokes: 12 } };
  remoteRow = {
    id: 'remote-card',
    revision: 4,
    status: 'in-progress',
    round_id: roundId,
    player_id: playerId,
  };
  setSyncAuthUser('owner');
  (supabase.from as jest.Mock).mockImplementation(query);
  (supabase.rpc as jest.Mock)
    .mockReset()
    .mockResolvedValue({
      data: [
        {
          applied: true,
          conflict: false,
          server_revision: 5,
          server_status: 'completed',
          server_scores: {},
        },
      ],
      error: null,
    });
  (getDb as jest.Mock).mockResolvedValue(db);
  db.withExclusiveTransactionAsync.mockImplementation(async (work) => work(db));
});

it.each([false, true])(
  'preserves ordinary remote web success without opening SQLite (ended=%s)',
  async (ended) => {
    const previous = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    (getDb as jest.Mock).mockRejectedValue(new Error('native SQLite unavailable on web'));
    try {
      const { result } = renderSubmit();
      await act(async () => {
        await expect(
          result.current.mutateAsync(
            input(
              ended
                ? {
                    expectedRoundShape: { nine_type: 'full', holes_played: 2 },
                    gameType: 'stableford',
                  }
                : {}
            )
          )
        ).resolves.toMatchObject({ success: true });
      });
      expect(getDb).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: previous, configurable: true });
    }
  }
);

it.each([false, true])(
  'surfaces unsupported web recovery and refreshes actual queries (ended=%s)',
  async (ended) => {
    const previous = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    (getDb as jest.Mock).mockRejectedValue(new Error('native SQLite unavailable on web'));
    const sqlError = { code: '22023', hint: 'round_shape_changed', message: 'shape changed' };
    upsertError = sqlError;
    (supabase.rpc as jest.Mock).mockImplementationOnce(async () => {
      currentShape.holes_played = 1;
      return { data: null, error: sqlError };
    });
    try {
      const { result, client } = renderSubmit();
      client.setQueryData(roundKeys.detail(roundId), {});
      client.setQueryData(scorecardKeys.list({ roundId }), []);
      await act(async () => {
        await expect(
          result.current.mutateAsync(
            input({
              expectedRoundShape: { nine_type: 'full', holes_played: ended ? 2 : null },
              gameType: 'stableford',
            })
          )
        ).rejects.toMatchObject({
          kind: 'unavailable',
          message: 'native SQLite unavailable on web',
        });
      });
      expect(client.getQueryState(roundKeys.detail(roundId))?.isInvalidated).toBe(true);
      expect(client.getQueryState(scorecardKeys.list({ roundId }))?.isInvalidated).toBe(true);
      expect(db.withExclusiveTransactionAsync).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: previous, configurable: true });
    }
  }
);

it('completes an ended social round when the last player submits through the accepted snapshot', async () => {
  completedCount = 2;
  const { result } = renderSubmit();
  await act(async () => {
    await result.current.mutateAsync(
      input({
        expectedRoundShape: { nine_type: 'full', holes_played: 2 },
        gameType: 'stableford',
      })
    );
  });
  expect(writes).toEqual([{ table: 'rounds', payload: { status: 'completed' } }]);
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
  expect(db.runAsync).not.toHaveBeenCalled();
});

it('preserves accepted remote identity when the social completion read fails', async () => {
  completionError = { message: 'player count unavailable' };
  const { result } = renderSubmit();
  await act(async () => {
    await expect(
      result.current.mutateAsync(
        input({
          expectedRoundShape: { nine_type: 'full', holes_played: 2 },
          gameType: 'stableford',
        })
      )
    ).rejects.toMatchObject({
      acceptedRemoteSnapshot: {
        roundId,
        playerId,
        serverRevision: 5,
        serverScorecardId: 'remote-card',
      },
    });
  });
  expect(writes).toEqual([]);
});

it.each(['owner', 'session', 'draft'])(
  'refuses a late %s replacement before the ended round status write and retains acceptance',
  async (replacement) => {
    completedCount = 2;
    let draft = input({
      expectedRoundShape: { nine_type: 'full', holes_played: 2 },
      gameType: 'stableford',
    });
    onCompletionRead = () => {
      if (replacement === 'owner') setSyncAuthUser('new-owner');
      else if (replacement === 'session') useScorecardStore.getState().resetRound();
      else draft = { ...draft, scores: { 1: { strokes: 6 } } };
    };
    const { result } = renderSubmit();
    await act(async () => {
      await expect(
        result.current.mutateAsync({ ...draft, readCurrent: () => draft })
      ).rejects.toMatchObject({
        kind: 'context_changed',
        acceptedRemoteSnapshot: { roundId, playerId, serverRevision: 5 },
      });
    });
    expect(writes).toEqual([]);
  }
);

it('prepares retained-only stale totals on an ended back nine with planned nonzero DHC', async () => {
  currentShape = { nine_type: 'back9', holes_played: 2 };
  const { result } = renderSubmit();
  await act(async () => {
    await result.current.mutateAsync(
      input({
        nineType: 'back9',
        expectedRoundShape: { nine_type: 'back9', holes_played: 2 },
        gameType: 'stableford',
        scores: { 10: { strokes: 5 }, 11: { strokes: 4 } },
        totalGross: 999,
        totalNet: 999,
        totalPoints: 999,
      })
    );
  });
  expect((supabase.rpc as jest.Mock).mock.calls[0][1]).toMatchObject({
    p_expected_revision: 4,
    p_snapshot: {
      expected_round_shape: { nine_type: 'back9', holes_played: 2 },
      total_gross: 9,
      total_net: 8,
      total_points: 3,
      daily_handicap_used: 9,
      handicap_differential: null,
    },
  });
});

it('captures the original owner before authentication waits and refuses its replacement without writes', async () => {
  let finish!: (value: { id: string }) => void;
  let entered!: () => void;
  const authenticating = new Promise<void>(resolve => { entered = resolve; });
  (getCurrentUser as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
        entered();
      })
  );
  const { result } = renderSubmit();
  await act(async () => {
    const submitting = result.current.mutateAsync(
      input({ expectedRoundShape: { nine_type: 'full', holes_played: 2 }, gameType: 'stableford' })
    );
    await authenticating;
    setSyncAuthUser('new-owner');
    finish({ id: 'owner' });
    await expect(submitting).rejects.toMatchObject({ kind: 'context_changed' });
  });
  expect(writes).toEqual([]);
  expect(supabase.rpc).not.toHaveBeenCalled();
});

it('refreshes the actual queries after an ordinary ended revision conflict without adopting or replaying', async () => {
  (supabase.rpc as jest.Mock).mockResolvedValueOnce({
    data: [
      {
        applied: false,
        conflict: true,
        server_revision: 6,
        server_status: 'in-progress',
        server_scores: { 1: { strokes: 3 } },
      },
    ],
    error: null,
  });
  const { result, client } = renderSubmit();
  client.setQueryData(roundKeys.detail(roundId), { holes_played: 2 });
  client.setQueryData(scorecardKeys.list({ roundId }), [{ scores: { 1: { strokes: 5 } } }]);
  await act(async () => {
    await expect(
      result.current.mutateAsync(
        input({
          expectedRoundShape: { nine_type: 'full', holes_played: 2 },
          gameType: 'stableford',
        })
      )
    ).rejects.toMatchObject({ name: 'ScorecardConflictError', serverRevision: 6 });
  });
  expect(client.getQueryState(roundKeys.detail(roundId))?.isInvalidated).toBe(true);
  expect(client.getQueryState(scorecardKeys.list({ roundId }))?.isInvalidated).toBe(true);
  expect(db.withExclusiveTransactionAsync).not.toHaveBeenCalled();
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
});

it('refreshes active real queries and reinitializes the actual entry draft before a new ended submit', async () => {
  currentShape.holes_played = null;
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useQuickScoreEntry({ roundId, playerId }), { wrapper });
  await waitFor(() => expect(result.current.scores['1']).toBe(5));
  act(() => result.current.incrementScore(1));
  upsertError = {
    code: '22023',
    hint: 'round_shape_changed',
    message: 'stale direct scoring write',
  };
  onUpsert = () => {
    currentShape.holes_played = 2;
    remoteScores = { 1: { strokes: 4 }, 7: { strokes: 12 } };
  };
  await act(async () => {
    await result.current.handleConfirmSave();
  });
  await waitFor(() => expect(result.current.scores).toEqual({ 1: 4 }));
  expect(result.current.holes.map((h) => h.number)).toEqual([1, 2]);
  expect(supabase.rpc).not.toHaveBeenCalled();
  upsertError = null;
  onUpsert = undefined;
  await act(async () => {
    await result.current.handleConfirmSave();
  });
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
  expect((supabase.rpc as jest.Mock).mock.calls[0][1]).toMatchObject({
    p_expected_revision: 4,
    p_snapshot: {
      scores: { 1: expect.objectContaining({ strokes: 4 }) },
      total_gross: 4,
      total_net: 3,
      handicap_differential: null,
      expected_round_shape: { nine_type: 'full', holes_played: 2 },
    },
  });
});

it.each(['confirmed', 'invalid revision', 'missing revision'])(
  'refuses ended %s state without any write',
  async (state) => {
    remoteRow = {
      ...remoteRow,
      ...(state === 'confirmed'
        ? { status: 'confirmed' }
        : { revision: state === 'invalid revision' ? -1 : undefined }),
    };
    const { result } = renderSubmit();
    await act(async () => {
      await expect(
        result.current.mutateAsync(
          input({
            expectedRoundShape: { nine_type: 'full', holes_played: 2 },
            gameType: 'stableford',
          })
        )
      ).rejects.toMatchObject({ kind: 'unavailable' });
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  }
);
it('creates an ended card with zero revision only after an authorized missing-row read and omits an ID', async () => {
  remoteRow = null;
  const { result } = renderSubmit();
  await act(async () => {
    await expect(
      result.current.mutateAsync(
        input({
          expectedRoundShape: { nine_type: 'full', holes_played: 2 },
          gameType: 'stableford',
        })
      )
    ).resolves.toMatchObject({ success: true });
  });
  expect(result.current.data?.scorecardId).toBeUndefined();
  expect((supabase.rpc as jest.Mock).mock.calls[0][1].p_expected_revision).toBe(0);
});

it('rejects a direct unended draft overtaken by end and refreshes real queries for fresh preparation', async () => {
  upsertError = {
    code: '22023',
    hint: 'round_shape_changed',
    message: 'stale direct scoring write',
  };
  currentShape = { nine_type: 'full', holes_played: 2 };
  const { result, client } = renderSubmit();
  client.setQueryData(roundKeys.detail(roundId), { holes_played: null });
  client.setQueryData(scorecardKeys.list({ roundId }), [{ total_net: 999 }]);
  await act(async () => {
    await expect(
      result.current.mutateAsync(
        input({
          expectedRoundShape: { nine_type: 'full', holes_played: null },
          totalGross: 999,
          totalNet: 999,
          totalPoints: 999,
        })
      )
    ).rejects.toMatchObject({
      kind: 'shape_changed',
      sqlCode: '22023',
      sqlHint: 'round_shape_changed',
    });
  });
  expect(writes.filter((w) => w.table === 'scorecards')).toHaveLength(1);
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  expect(client.getQueryState(roundKeys.detail(roundId))?.isInvalidated).toBe(true);
  expect(client.getQueryState(scorecardKeys.list({ roundId }))?.isInvalidated).toBe(true);
});
it('submits ended Quick Score through the real common snapshot boundary with current revision', async () => {
  const { result } = renderSubmit();
  let saved: unknown;
  await act(async () => {
    saved = await result.current.mutateAsync(
      input({
        expectedRoundShape: { nine_type: 'full', holes_played: 2 },
        gameType: 'stableford',
        totalGross: 999,
        totalNet: 999,
        totalPoints: 999,
        scores: { 1: { strokes: 5 }, 2: { strokes: 4 }, 7: { strokes: 12 } },
      })
    );
  });
  expect(saved).toMatchObject({ success: true, scorecardId: 'remote-card' });
  expect(supabase.rpc).toHaveBeenCalledWith(
    'write_scorecard_snapshot',
    expect.objectContaining({
      p_expected_revision: 4,
      p_snapshot: expect.objectContaining({
        expected_round_shape: { nine_type: 'full', holes_played: 2 },
        scores: {
          1: expect.objectContaining({ strokes: 5 }),
          2: expect.objectContaining({ strokes: 4 }),
        },
        total_gross: 9,
        total_net: 7,
        total_points: 4,
        daily_handicap_used: 19,
        handicap_differential: null,
        status: 'completed',
        submitted_by: 'owner',
      }),
    })
  );
  expect(writes).toEqual([]);
  expect(db.runAsync).not.toHaveBeenCalled();
});
it('characterizes ordinary Quick Score through its real mutation and preserves direct upsert', async () => {
  const { result } = renderSubmit();
  let saved: unknown;
  await act(async () => {
    saved = await result.current.mutateAsync(input());
  });
  expect(saved).toEqual({ success: true, scorecardId: 'remote-card' });
  expect(writes).toEqual([
    {
      table: 'scorecards',
      payload: expect.objectContaining({
        scores: { 1: { strokes: 5 }, 2: { strokes: 4 } },
        total_gross: 9,
        total_net: -10,
        total_points: 5,
        daily_handicap_used: 19,
        status: 'completed',
      }),
    },
  ]);
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(db.runAsync).not.toHaveBeenCalled();
});

it.each(['pending', 'failed', 'foreign', 'malformed'])(
  'defers direct Quick Score behind a same-round %s end intent',
  async (state) => {
    db.getFirstAsync.mockResolvedValueOnce({
      id: 8,
      entity_key: `round:${roundId}:end_early`,
      type: 'round',
      action: 'update',
      status: state === 'failed' ? 'failed' : 'pending',
      revision: 1,
      data:
        state === 'malformed'
          ? '{broken'
          : JSON.stringify({
              action: 'end_early',
              roundId,
              holesPlayed: 2,
              userId: state === 'foreign' ? 'someone-else' : 'owner',
            }),
    } as never);
    const { result } = renderSubmit();
    await act(async () => {
      await expect(result.current.mutateAsync(input())).rejects.toMatchObject({
        kind: 'local_end_pending',
      });
    });
    expect(writes).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  }
);

it('keeps an unrelated round end intent independent from the ordinary direct write', async () => {
  db.getFirstAsync.mockImplementationOnce(async (...args: unknown[]) => {
    expect(args[1]).toEqual([`round:${roundId}:end_early`]);
    return null;
  });
  const { result } = renderSubmit();
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  expect(writes.filter((w) => w.table === 'scorecards')).toHaveLength(1);
});
