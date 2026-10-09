import React from 'react';
import { act, renderHook, render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSwitchPlayerTee, useUpdatePlayerTee } from '@/hooks/rounds/mutations';
import { supabase } from '@/services/supabase/client';
import { getDb } from '@/services/offline/DatabaseManager';
import { setSyncAuthUser } from '@/services/offline/sync/networkState';
import { useScorecardStore } from '@/store/scorecardStore';
import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import { recalculateScorecardDifferential } from '@/services/handicap/recalculateScorecardDifferential';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import { ThemeProvider } from '@/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EditTeesSheet } from '@/components/rounds/ViewRound/EditTeesSheet';
import { EditTeesSheetProps } from '@/components/rounds/ViewRound/EditTeesSheet';
import { ChangeTeesSheet } from '@/components/scorecard/ChangeTeesSheet';
import { adoptAuthoritativeRoundShape } from '@/services/rounds/roundScoringAdoption';
import { withRoundPersistenceTransition } from '@/services/offline/roundPersistenceBarrier';
import type { Scorecard, Player } from '@/types';

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));

let roundId = 'tee-round';
let roundSequence = 0;
const playerId = 'tee-player';
const tee = { tee_id: 'blue', name: 'Blue', color: 'blue', slopeRating: 125, courseRating: 72.5 };
const newTee = {
  ...tee,
  tee_id: 'red',
  name: 'Red',
  color: 'red',
  slopeRating: 113,
  courseRating: 74,
};
const holes = create18Holes();
let shape = { nine_type: 'full', holes_played: null as number | null };
let persistedTee = tee;
let serverCard: Record<string, unknown>;
let metadataError: { message: string } | null;
let onMetadata: (() => Promise<void>) | undefined;
let onCardRead: (() => Promise<void>) | undefined;
let onPatch: (() => Promise<void>) | undefined;
const writes: { table: string; payload: unknown }[] = [];
const db = {
  getFirstAsync: jest.fn(async (_sql: string) => null as unknown),
  getAllAsync: jest.fn(async () => []),
  runAsync: jest.fn(async (_sql: string, ..._args: unknown[]) => ({ changes: 1 })),
  withTransactionAsync: jest.fn(async (work: () => Promise<void>) => work()),
  withExclusiveTransactionAsync: jest.fn(),
};
function query(table: string) {
  let selection = '';
  let payload: { selected_tee?: typeof tee } | undefined;
  const settle = async () => {
    if (payload) {
      if (table === 'round_players') {
        await onMetadata?.();
        if (!metadataError) persistedTee = payload.selected_tee!;
      }
      return { data: null, error: metadataError };
    }
    if (table === 'scorecards' && !selection.includes('total_gross') && selection !== 'round_id')
      return { data: [], error: null };
    if (table === 'scorecards') await onCardRead?.();
    return {
      data:
        table === 'scorecards'
          ? { ...serverCard }
          : table === 'rounds'
            ? {
                id: roundId,
                course_id: 'course',
                game_type: 'stableford',
                team_format: null,
                selected_tee: tee,
                courses: { holes },
                ...shape,
              }
            : table === 'round_players'
              ? { selected_tee: persistedTee }
              : table === 'tees'
                ? {
                    id: persistedTee.tee_id,
                    name: persistedTee.name,
                    color: persistedTee.color,
                    slope: persistedTee.slopeRating,
                    course_rating: persistedTee.courseRating,
                    slope_women: 130,
                    course_rating_women: 76,
                  }
                : { id: playerId, gender: 'male', handicap: 24 },
      error: null,
    };
  };
  const chain = {
    select: (columns: string) => {
      selection = columns;
      return chain;
    },
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    not: () => chain,
    abortSignal: () => chain,
    update: (value: { selected_tee?: typeof tee }) => {
      payload = value;
      writes.push({ table, payload });
      return chain;
    },
    single: settle,
    maybeSingle: settle,
    then: (resolve: (value: unknown) => unknown) => settle().then(resolve),
  };
  return chain;
}
function renderTee(completed = false) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => (completed ? useUpdatePlayerTee() : useSwitchPlayerTee()), { wrapper });
}
function frozenCard(overrides: Partial<Scorecard> = {}): Scorecard {
  return {
    id: 'local-tee-card',
    roundId,
    playerId,
    scores: { 1: { strokes: 5 }, 2: { strokes: 4 } },
    totalGross: 9,
    totalNet: 9,
    status: 'in-progress',
    createdAt: new Date(0),
    updatedAt: new Date(0),
    playerHandicap: 12,
    playerGender: null,
    syncHandicapSource: 'calculated',
    teeData: tee,
    syncHoles: holes,
    coursePar: 72,
    syncGameType: 'stableford',
    syncNineType: 'full',
    ...overrides,
  };
}
function installCard(overrides: Partial<Scorecard> = {}) {
  const card = frozenCard(overrides);
  useScorecardStore.setState({
    currentRoundId: roundId,
    isLoading: false,
    holes,
    nineType: 'full',
    holesPlayed: card.holesPlayed ?? null,
    gameType: 'stableford',
    handicapSource: 'calculated',
    groupScorecards: new Map([[playerId, card]]),
    playerTeeMap: new Map([[playerId, tee]]),
  });
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
const input = () => ({ roundId, playerId, tee: newTee, scorecardId: 'server-card' });
beforeEach(() => {
  jest.clearAllMocks();
  roundId = `tee-round-${++roundSequence}`;
  useScorecardStore.getState().resetRound();
  setSyncAuthUser('owner');
  db.withExclusiveTransactionAsync.mockImplementation(async (run: (tx: unknown) => Promise<void>) =>
    run(db)
  );
  shape = { nine_type: 'full', holes_played: null };
  persistedTee = tee;
  writes.length = 0;
  metadataError = null;
  onMetadata = undefined;
  onCardRead = undefined;
  onPatch = undefined;
  serverCard = {
    id: 'server-card',
    round_id: roundId,
    player_id: playerId,
    total_gross: 9,
    ga_handicap_used: 12,
    scores: { 1: { strokes: 5 }, 2: { strokes: 4 } },
    status: 'completed',
    revision: 4,
  };
  db.getFirstAsync.mockImplementation(async (sql: string) =>
    sql.includes('SELECT round_id') ? { round_id: roundId } : null
  );
  jest.mocked(supabase.rpc).mockReset();
  jest.mocked(getDb).mockResolvedValue(db as never);
  jest.mocked(supabase.from).mockImplementation(query as never);
  jest.mocked(supabase.rpc).mockImplementation((async () => {
    await onPatch?.();
    return { data: true, error: null };
  }) as never);
});
afterEach(() => {
  useScorecardStore.getState().resetRound();
});

it('characterizes ordinary completed Edit Tees values and persisted override', async () => {
  const { result } = renderTee(true);
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  expect(persistedTee).toEqual(newTee);
  const recalculated = await recalculateScorecardDifferential('server-card');
  expect(recalculated.dailyHandicapUsed).toBe(13);
  expect(recalculated.handicapDifferential).toBeNull();
});

it('waits behind ending before tee metadata and holds the boundary through CURRENT local tee persistence', async () => {
  installCard();
  const ending = gate();
  const entered = gate();
  const held = withRoundScoringWrite(roundId, async () => {
    entered.release();
    await ending.promise;
  });
  await entered.promise;
  const { result } = renderTee();
  let mutation!: Promise<unknown>;
  act(() => {
    mutation = result.current.mutateAsync(input());
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(writes).toEqual([]);
  ending.release();
  await held;
  await act(async () => {
    await mutation;
  });
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(newTee);
});

it('freshly rereads persisted tee, current scores and shape after a shape rejection', async () => {
  const { result } = renderTee(true);
  jest.mocked(supabase.rpc).mockImplementationOnce((async () => {
    persistedTee = tee;
    shape = { nine_type: 'back9', holes_played: 2 };
    serverCard = {
      ...serverCard,
      scores: { 10: { strokes: 6 }, 11: { strokes: 5 } },
      total_gross: 11,
      ga_handicap_used: 18.5,
    };
    return {
      data: null,
      error: { code: '22023', hint: 'round_shape_changed', message: 'Shape changed' },
    };
  }) as never);
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  expect(supabase.rpc).toHaveBeenLastCalledWith('write_scorecard_handicap_patch', {
    p_scorecard_id: 'server-card',
    p_patch: {
      expected_round_shape: shape,
      daily_handicap_used: 10,
      ga_handicap_used: 18.5,
      handicap_differential: null,
      slope_rating_used: 125,
      course_rating_used: 72.5,
      total_points: 1,
    },
  });
  expect(writes.filter((write) => write.table === 'round_players')).toHaveLength(1);
});

it('preserves proven ended explicit-none with absent HI instead of borrowing current profile', async () => {
  shape.holes_played = 2;
  serverCard = { ...serverCard, ga_handicap_used: null };
  installCard({ holesPlayed: 2, syncHandicapSource: 'none', playerHandicap: undefined });
  const { result } = renderTee();
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  expect(supabase.rpc).toHaveBeenLastCalledWith(
    'write_scorecard_handicap_patch',
    expect.objectContaining({
      p_patch: expect.objectContaining({
        daily_handicap_used: 0,
        ga_handicap_used: null,
        total_points: 2,
        handicap_differential: null,
      }),
    })
  );
  const current = useScorecardStore.getState().groupScorecards.get(playerId)!;
  expect(current.playerHandicap).toBeUndefined();
  expect(current.playerGender).toBeNull();
  expect(current.syncHandicapSource).toBe('none');
});

it.each(['owner', 'session', 'new session from absence'])(
  'refuses %s replacement while tee metadata settles',
  async (replacement) => {
    if (replacement !== 'new session from absence') installCard();
    const entered = gate();
    const finished = gate();
    onMetadata = async () => {
      entered.release();
      await finished.promise;
    };
    const { result } = renderTee();
    let mutation!: Promise<unknown>;
    act(() => {
      mutation = result.current.mutateAsync(input());
    });
    const refusal = mutation.catch((error) => error);
    await entered.promise;
    if (replacement === 'owner') setSyncAuthUser('different-owner');
    else {
      useScorecardStore.getState().resetRound();
      installCard();
    }
    finished.release();
    const error = await act(async () => await refusal);
    expect(error).toMatchObject({
      kind: replacement === 'owner' ? 'unavailable' : 'context_changed',
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(tee);
  }
);

it('shows patch failure with persisted tee while keeping the local tee unchanged, then freshly retries', async () => {
  installCard();
  const { result } = renderTee();
  jest.mocked(supabase.rpc).mockImplementationOnce((async () => ({
    data: null,
    error: { message: 'patch denied' },
  })) as never);
  await act(async () => {
    await expect(result.current.mutateAsync(input())).rejects.toThrow('patch denied');
  });
  expect(persistedTee).toEqual(newTee);
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(tee);
  serverCard = { ...serverCard, scores: { 1: { strokes: 8 } }, total_gross: 8 };
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  expect(supabase.rpc).toHaveBeenLastCalledWith(
    'write_scorecard_handicap_patch',
    expect.objectContaining({
      p_patch: expect.objectContaining({ total_points: 0, daily_handicap_used: 13 }),
    })
  );
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(newTee);
});

it.each(['completed', 'confirmed'])(
  'keeps server-only %s tee recalculation supported with stored HI zero',
  async (status) => {
    shape.holes_played = 2;
    serverCard = { ...serverCard, status, ga_handicap_used: 0, scores: {} };
    const { result } = renderTee(true);
    await act(async () => {
      await result.current.mutateAsync(input());
    });
    expect(supabase.rpc).toHaveBeenCalledWith(
      'write_scorecard_handicap_patch',
      expect.objectContaining({
        p_patch: expect.objectContaining({
          ga_handicap_used: 0,
          daily_handicap_used: 2,
          handicap_differential: null,
          total_points: 0,
        }),
      })
    );
  }
);

it('preserves frozen recorded female inputs over the current server male profile', async () => {
  shape.holes_played = 2;
  installCard({ holesPlayed: 2, playerGender: 'female' });
  const { result } = renderTee();
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  expect(supabase.rpc).toHaveBeenCalledWith(
    'write_scorecard_handicap_patch',
    expect.objectContaining({
      p_patch: expect.objectContaining({
        ga_handicap_used: 12,
        course_rating_used: 76,
        slope_rating_used: 130,
        daily_handicap_used: 17,
      }),
    })
  );
  expect(useScorecardStore.getState().groupScorecards.get(playerId)).toMatchObject({
    playerHandicap: 12,
    playerGender: 'female',
    syncHandicapSource: 'calculated',
    totalNet: 4,
    teeData: { slopeRating: 130, courseRating: 76 },
  });
});

function renderSheet() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const player: Player = {
    id: playerId,
    name: 'Sam',
    email: 'sam@example.test',
    handicap: 24,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  const onClose = jest.fn();
  const view = render(
    <QueryClientProvider client={client}>
      <ThemeProvider forceMode="light">
        <SafeAreaProvider>
          <ChangeTeesSheet
            visible
            onClose={onClose}
            roundId={roundId}
            players={[player]}
            availableTees={[tee, newTee]}
          />
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return { ...view, onClose };
}

it('actual ChangeTeesSheet applies the selected tee once through the coordinated mutation', async () => {
  installCard({ id: 'server-card' });
  const view = renderSheet();
  fireEvent.press(view.getByLabelText('Sam Red tee'));
  fireEvent.press(view.getByText('Save'));
  await waitFor(() => expect(view.onClose).toHaveBeenCalledTimes(1));
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(newTee);
  expect(
    db.runAsync.mock.calls.filter(([sql]) =>
      String(sql).includes('INSERT OR REPLACE INTO scorecards')
    )
  ).toHaveLength(1);
});

it('actual ChangeTeesSheet shows a failed second server step and retains the local tee', async () => {
  installCard({ id: 'server-card' });
  const view = renderSheet();
  jest.mocked(supabase.rpc).mockImplementationOnce((async () => ({
    data: null,
    error: { message: 'patch denied' },
  })) as never);
  fireEvent.press(view.getByLabelText('Sam Red tee'));
  fireEvent.press(view.getByText('Save'));
  await waitFor(() =>
    expect(view.getByText('Failed to update scorecard: patch denied')).toBeTruthy()
  );
  expect(view.onClose).not.toHaveBeenCalled();
  expect(persistedTee).toEqual(newTee);
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(tee);
});

it('actual authoritative end wins first, refuses the captured tee operation, and supports a fresh attempt', async () => {
  installCard();
  const entered = gate();
  const finish = gate();
  db.withExclusiveTransactionAsync.mockImplementationOnce(
    async (run: (tx: unknown) => Promise<void>) => {
      entered.release();
      await finish.promise;
      await run(db);
    }
  );
  shape.holes_played = 2;
  const ending = adoptAuthoritativeRoundShape(roundId, shape as never, { ownerId: 'owner' });
  await entered.promise;
  const { result } = renderTee();
  let mutation!: Promise<unknown>;
  act(() => {
    mutation = result.current.mutateAsync(input());
  });
  const refusal = mutation.catch((error) => error);
  expect(writes).toEqual([]);
  finish.release();
  await ending;
  let error: unknown;
  await act(async () => {
    error = await refusal;
  });
  expect(error).toMatchObject({ kind: 'context_changed' });
  expect(writes).toEqual([]);
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  expect(useScorecardStore.getState().holesPlayed).toBe(2);
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(newTee);
});

it('tee wins first and ending waits through its local persistence', async () => {
  installCard();
  const patchEntered = gate();
  const patchFinished = gate();
  const diskEntered = gate();
  const diskFinished = gate();
  onPatch = async () => {
    patchEntered.release();
    await patchFinished.promise;
  };
  db.runAsync.mockImplementationOnce(async () => {
    diskEntered.release();
    await diskFinished.promise;
    return { changes: 1 };
  });
  const { result } = renderTee();
  let mutation!: Promise<unknown>;
  act(() => {
    mutation = result.current.mutateAsync(input());
  });
  await patchEntered.promise;
  shape.holes_played = 2;
  const ending = adoptAuthoritativeRoundShape(roundId, shape as never, { ownerId: 'owner' });
  expect(db.withExclusiveTransactionAsync).not.toHaveBeenCalled();
  patchFinished.release();
  await diskEntered.promise;
  expect(db.withExclusiveTransactionAsync).not.toHaveBeenCalled();
  diskFinished.release();
  await act(async () => {
    await mutation;
    await ending;
  });
  expect(useScorecardStore.getState().holesPlayed).toBe(2);
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(newTee);
});

it('actual completed EditTeesSheet keeps a confirmed server-only card supported', async () => {
  shape.holes_played = 2;
  serverCard = { ...serverCard, status: 'confirmed' };
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onClose = jest.fn();
  const scorecards = [
    { id: 'server-card', player_id: playerId, player: { name: 'Sam' } },
  ] as EditTeesSheetProps['scorecards'];
  const view = render(
    <QueryClientProvider client={client}>
      <ThemeProvider forceMode="light">
        <SafeAreaProvider>
          <EditTeesSheet
            visible
            onClose={onClose}
            roundId={roundId}
            scorecards={scorecards}
            currentTees={new Map()}
            roundDefaultTee={tee}
            availableTees={[tee, newTee]}
          />
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  fireEvent.press(view.getByLabelText('Sam Red tee'));
  fireEvent.press(view.getByText('Save & Recalculate'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(supabase.rpc).toHaveBeenCalledWith(
    'write_scorecard_handicap_patch',
    expect.objectContaining({ p_patch: expect.objectContaining({ handicap_differential: null }) })
  );
});

it('fresh retry repairs the original local session and preserves its newer retained scores', async () => {
  shape.holes_played = 2;
  installCard({ holesPlayed: 2 });
  const { result } = renderTee();
  jest.mocked(supabase.rpc).mockImplementationOnce((async () => {
    shape.holes_played = 1;
    useScorecardStore.getState().setPlayerScore(playerId, 1, 8);
    serverCard = { ...serverCard, scores: { 1: { strokes: 6 } }, total_gross: 6 };
    return {
      data: null,
      error: { code: '22023', hint: 'round_shape_changed', message: 'Shape changed' },
    };
  }) as never);
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  const current = useScorecardStore.getState().groupScorecards.get(playerId)!;
  expect(current.scores).toEqual({ 1: expect.objectContaining({ strokes: 8 }) });
  expect(current.holesPlayed).toBe(1);
  expect(current.playerHandicap).toBe(12);
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(newTee);
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
});

it('a second shape refusal is structured and does not make a third attempt', async () => {
  const { result } = renderTee(true);
  jest.mocked(supabase.rpc).mockImplementation((async () => {
    shape.holes_played = shape.holes_played == null ? 2 : 1;
    return {
      data: null,
      error: { code: '22023', hint: 'round_shape_changed', message: 'Shape changed' },
    };
  }) as never);
  await act(async () => {
    await expect(result.current.mutateAsync(input())).rejects.toMatchObject({
      kind: 'shape_changed',
      sqlCode: '22023',
      sqlHint: 'round_shape_changed',
    });
  });
  expect(supabase.rpc).toHaveBeenCalledTimes(2);
});

it.each([false, null])(
  'treats patch response %s as unavailable and preserves the local tee',
  async (data) => {
    installCard();
    const { result } = renderTee();
    jest
      .mocked(supabase.rpc)
      .mockImplementationOnce((async () => ({ data, error: null })) as never);
    await act(async () => {
      await expect(result.current.mutateAsync(input())).rejects.toMatchObject({
        kind: 'unavailable',
      });
    });
    expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(tee);
  }
);

it('standalone recalculation retains original account proof before its first card read', async () => {
  const entered = gate();
  const finish = gate();
  onCardRead = async () => {
    entered.release();
    await finish.promise;
  };
  const recalculation = recalculateScorecardDifferential('server-card');
  const refusal = recalculation.catch((error) => error);
  await entered.promise;
  setSyncAuthUser('another-owner');
  finish.release();
  expect(await refusal).toMatchObject({ kind: 'context_changed' });
  expect(supabase.rpc).not.toHaveBeenCalled();
});

it('captures an active unfrozen scoring basis before deliberately replacing its tee', async () => {
  const player: Player = {
    id: playerId,
    name: 'Sam',
    email: 'sam@example.test',
    handicap: 12,
    gender: 'male',
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  await useScorecardStore
    .getState()
    .initializeRound(roundId, [player], holes, 'stableford', true, [], tee, 'profile');
  useScorecardStore.getState().setPlayerScore(playerId, 1, 5);
  const { result } = renderTee();
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(newTee);
  expect(supabase.rpc).toHaveBeenCalledWith(
    'write_scorecard_handicap_patch',
    expect.objectContaining({
      p_patch: expect.objectContaining({ ga_handicap_used: 12, daily_handicap_used: 13 }),
    })
  );
});

it('preserves completed Edit Tees round_players routing when competitionId is only cache metadata', async () => {
  const { result } = renderTee(true);
  await act(async () => {
    await result.current.mutateAsync({ ...input(), competitionId: 'competition' });
  });
  expect(persistedTee).toEqual(newTee);
  expect(writes.find((write) => write.table === 'round_players')).toBeDefined();
  expect(writes.find((write) => write.table === 'competition_round_player_tees')).toBeUndefined();
});

it('keeps authentic server HI zero when proven local none records no HI', async () => {
  shape.holes_played = 2;
  serverCard = { ...serverCard, ga_handicap_used: 0 };
  installCard({ holesPlayed: 2, syncHandicapSource: 'none', playerHandicap: undefined });
  const { result } = renderTee();
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  expect(supabase.rpc).toHaveBeenCalledWith(
    'write_scorecard_handicap_patch',
    expect.objectContaining({
      p_patch: expect.objectContaining({ ga_handicap_used: 0, daily_handicap_used: 0 }),
    })
  );
  expect(
    useScorecardStore.getState().groupScorecards.get(playerId)!.playerHandicap
  ).toBeUndefined();
});

it('adopts an end visible on the first read before tee persistence and retains newer played edits', async () => {
  installCard({
    scores: { 1: { strokes: 5 }, 2: { strokes: 4 }, 3: { strokes: 6 } },
    totalGross: 15,
  });
  const readEntered = gate();
  const readFinished = gate();
  const patchEntered = gate();
  const patchFinished = gate();
  onCardRead = async () => {
    readEntered.release();
    await readFinished.promise;
  };
  onPatch = async () => {
    patchEntered.release();
    await patchFinished.promise;
  };
  const { result } = renderTee();
  let mutation!: Promise<unknown>;
  act(() => {
    mutation = result.current.mutateAsync(input());
  });
  await readEntered.promise;
  // Another device ends before the first authoritative shape read, so the
  // first patch is accepted. There is no shape_changed recovery to repair us.
  shape.holes_played = 2;
  expect(useScorecardStore.getState().holesPlayed).toBeNull();
  readFinished.release();
  await patchEntered.promise;
  await useScorecardStore.getState().setPlayerScore(playerId, 1, 8);
  db.runAsync.mockClear();
  patchFinished.release();
  await act(async () => {
    await mutation;
  });
  const current = useScorecardStore.getState().groupScorecards.get(playerId)!;
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
  expect(useScorecardStore.getState().holesPlayed).toBe(2);
  expect(current.scores).toEqual({
    1: expect.objectContaining({ strokes: 8 }),
    2: expect.objectContaining({ strokes: 4 }),
  });
  expect(current).toMatchObject({
    holesPlayed: 2,
    syncNineType: 'full',
    playerHandicap: 12,
    playerGender: null,
    syncHandicapSource: 'calculated',
    teeData: newTee,
  });
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  const saved = db.runAsync.mock.calls.find(([sql]) =>
    sql.includes('INSERT OR REPLACE INTO scorecards')
  )!;
  expect((saved[1] as unknown[])[20]).toBe('full');
  expect((saved[1] as unknown[])[23]).toBe(2);
  const savedHoles = db.runAsync.mock.calls
    .filter(([sql]) => sql.includes('INSERT OR REPLACE INTO hole_scores'))
    .map(([, args]) => (args as unknown[])[1]);
  expect(savedHoles).toEqual([1, 2]);
});

it('intersects a prior local cutoff on first-read adoption and keeps explicit none without a profile donor', async () => {
  shape.holes_played = 2;
  serverCard = { ...serverCard, ga_handicap_used: null };
  installCard({
    holesPlayed: 1,
    syncHandicapSource: 'none',
    playerHandicap: undefined,
    scores: { 1: { strokes: 5 }, 2: { strokes: 4 } },
  });
  const { result } = renderTee();
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  const current = useScorecardStore.getState().groupScorecards.get(playerId)!;
  expect(current.scores).toEqual({ 1: { strokes: 5 } });
  expect(current.holesPlayed).toBe(2);
  expect(current.syncHandicapSource).toBe('none');
  expect(current.playerHandicap).toBeUndefined();
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
  expect(supabase.rpc).toHaveBeenCalledWith(
    'write_scorecard_handicap_patch',
    expect.objectContaining({
      p_patch: expect.objectContaining({ ga_handicap_used: null, daily_handicap_used: 0 }),
    })
  );
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
});

it('refuses first-read unended authority instead of clearing a final local end', async () => {
  installCard({ holesPlayed: 2 });
  const { result } = renderTee();
  await act(async () => {
    await expect(result.current.mutateAsync(input())).rejects.toMatchObject({
      kind: 'local_end_pending',
    });
  });
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(useScorecardStore.getState().holesPlayed).toBe(2);
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(tee);
});

it('adopts a differing planned nine on the first read even when both cutoffs are null', async () => {
  installCard({ scores: { 1: { strokes: 5 }, 10: { strokes: 6 } } });
  shape.nine_type = 'front9';
  const { result } = renderTee();
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  const current = useScorecardStore.getState().groupScorecards.get(playerId)!;
  expect(useScorecardStore.getState().nineType).toBe('front9');
  expect(current.syncNineType).toBe('front9');
  expect(current.holesPlayed).toBeNull();
  expect(current.scores).toEqual({ 1: { strokes: 5 } });
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
});

it.each(['owner', 'session'])('retains original %s proof through first-read adoption', async (changed) => {
  installCard();
  shape.holes_played = 2;
  const entered = gate();
  const finish = gate();
  db.withExclusiveTransactionAsync.mockImplementationOnce(
    async (run: (tx: unknown) => Promise<void>) => {
      entered.release();
      await finish.promise;
      await run(db);
    }
  );
  const { result } = renderTee();
  let mutation!: Promise<unknown>;
  act(() => {
    mutation = result.current.mutateAsync(input());
  });
  const refusal = mutation.catch((error) => error);
  await entered.promise;
  if (changed === 'owner') setSyncAuthUser('another-owner');
  else {
    useScorecardStore.getState().resetRound();
    installCard();
  }
  finish.release();
  let error: unknown;
  await act(async () => {
    error = await refusal;
  });
  expect(error).toMatchObject({ kind: changed === 'owner' ? 'unavailable' : 'context_changed' });
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(useScorecardStore.getState().holesPlayed).toBeNull();
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(tee);
});

it('rejects an independent epoch advance after its own successful first-read adoption', async () => {
  installCard();
  shape.holes_played = 2;
  onPatch = async () => {
    await withRoundPersistenceTransition(roundId, shape as never, async () => undefined, () => {});
  };
  const { result } = renderTee();
  await act(async () => {
    await expect(result.current.mutateAsync(input())).rejects.toMatchObject({
      kind: 'context_changed',
    });
  });
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
  expect(useScorecardStore.getState().holesPlayed).toBe(2);
  expect(useScorecardStore.getState().getPlayerTee(playerId)).toEqual(tee);
});

it('keeps ordinary server-only first-read ended recalculation free of native database access', async () => {
  shape.holes_played = 2;
  const { result } = renderTee(true);
  await act(async () => {
    await result.current.mutateAsync(input());
  });
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
  expect(getDb).not.toHaveBeenCalled();
});
