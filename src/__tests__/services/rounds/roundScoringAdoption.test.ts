import {
  adoptAuthoritativeRoundShape,
  adoptRoundShapeWithinScoringWrite,
} from '@/services/rounds/roundScoringAdoption';
import { useScorecardStore } from '@/store/scorecardStore';
import {
  getHoles,
  getScorecardsByRound,
  getPendingSyncs,
  getFailedSyncs,
  persistAuthoritativeRoundShape,
} from '@/services/offline/database';
import {
  captureRoundPersistenceSource,
  isRoundPersistenceSourceCurrent,
  withRoundPersistence,
} from '@/services/offline/roundPersistenceBarrier';
import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import { getSyncAuthUserId } from '@/services/offline/sync/networkState';
import { create18Holes, createTestPlayer } from '../../utils/testFixtures';
import type { Scorecard } from '@/types';

jest.mock('@/services/offline/database', () => ({
  getHoles: jest.fn(),
  getScorecardsByRound: jest.fn(),
  getPendingSyncs: jest.fn(),
  getFailedSyncs: jest.fn(),
  persistAuthoritativeRoundShape: jest.fn(),
  getPendingSyncByEntityKey: jest.fn(),
}));
jest.mock('@/services/offline/sync/networkState', () => ({
  getSyncAuthUserId: jest.fn(() => 'owner'),
}));
jest.mock('@/services/offline/sync', () => ({
  subscribeSyncState: jest.fn(),
  subscribeScorecardSynced: jest.fn(),
}));
jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn() } }));
const holes = create18Holes();
const tee = { name: 'White', color: 'white', slopeRating: 113, courseRating: 72 };
const player = {
  ...createTestPlayer({ id: 'p', handicap: 24, gender: 'male' }),
  handicapIndex: 20,
};
let sequence = 0;
let roundId: string;
const shape = { nine_type: 'full' as const, holes_played: 8 };
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
const card = (overrides: Partial<Scorecard> = {}): Scorecard => ({
  id: `c-${roundId}`,
  roundId,
  playerId: 'p',
  player,
  scores: { 1: { strokes: 4 }, 6: { strokes: 5 }, 7: { strokes: 6 } },
  totalGross: 15,
  totalNet: 10,
  status: 'in-progress',
  createdAt: new Date(),
  updatedAt: new Date(),
  holesPlayed: 6,
  syncNineType: 'full',
  syncHandicapSource: 'calculated',
  playerHandicap: 12,
  playerGender: 'male',
  teeData: tee,
  syncHoles: holes,
  coursePar: 72,
  syncGameType: 'stroke',
  ...overrides,
});
beforeEach(() => {
  jest.clearAllMocks();
  roundId = `adoption-${++sequence}`;
  (getSyncAuthUserId as jest.Mock).mockReturnValue('owner');
  (getHoles as jest.Mock).mockResolvedValue(holes);
  (getScorecardsByRound as jest.Mock).mockImplementation(async () => [card()]);
  (getPendingSyncs as jest.Mock).mockResolvedValue([]);
  (getFailedSyncs as jest.Mock).mockResolvedValue([]);
  (persistAuthoritativeRoundShape as jest.Mock).mockImplementation(
    async (_id, target, { rebuild }) => ({
      cards: [rebuild(card(), new Set([1, 2, 3, 4, 5, 6]), target)],
      priorLocalShapes: new Map([[card().id, { nine_type: 'full', holes_played: 6 }]]),
    })
  );
  useScorecardStore.getState().resetRound();
  useScorecardStore.setState({
    currentRoundId: roundId,
    isInitialized: true,
    isLoading: false,
    holes,
    nineType: 'full',
    holesPlayed: 6,
    gameType: 'stroke',
    handicapSource: 'calculated',
    selectedTeeData: tee,
    currentPlayers: [player],
    groupScorecards: new Map([['p', card()]]),
  });
});
it('uses one current-source adapter, frozen HI12, local accepted identity and both queues', async () => {
  await adoptAuthoritativeRoundShape(roundId, shape, {
    ownerId: 'owner',
    acceptedWrite: { scorecardId: card().id, serverRevision: 9 },
  });
  expect(getPendingSyncs).toHaveBeenCalled();
  expect(getFailedSyncs).toHaveBeenCalled();
  expect(persistAuthoritativeRoundShape).toHaveBeenCalledWith(
    roundId,
    shape,
    expect.objectContaining({
      ownerId: 'owner',
      acceptedWrite: { scorecardId: card().id, serverRevision: 9 },
    })
  );
  const current = useScorecardStore.getState().groupScorecards.get('p')!;
  expect(current).toMatchObject({
    playerHandicap: 12,
    holesPlayed: 8,
    serverRevision: 9,
    scores: { 1: { strokes: 4 }, 6: { strokes: 5 } },
  });
  expect(current.scores[7]).toBeUndefined();
  expect(current.player).toBe(player);
});
it('drains the entire admitted hole/full chain before transaction; unrelated round proceeds', async () => {
  const hole = deferred();
  const events: string[] = [];
  const old = captureRoundPersistenceSource(roundId);
  const chain = withRoundPersistence(old, async () => {
    events.push('hole');
    await hole.promise;
    events.push('full');
  });
  (persistAuthoritativeRoundShape as jest.Mock).mockImplementation(async () => {
    events.push('transaction');
    return { cards: [], priorLocalShapes: new Map() };
  });
  const adoption = adoptAuthoritativeRoundShape(roundId, shape, { ownerId: 'owner' });
  await flush();
  await withRoundPersistence(captureRoundPersistenceSource('other'), async () => {
    events.push('other');
  });
  expect(events).toEqual(['hole', 'other']);
  hole.resolve();
  await chain;
  await adoption;
  expect(events).toEqual(['hole', 'other', 'full', 'transaction']);
  expect(isRoundPersistenceSourceCurrent(old)).toBe(false);
});
it('rebuilds CURRENT retained edits twice and keeps newer terminal metadata during the native await', async () => {
  const native = deferred();
  const entered = deferred();
  (persistAuthoritativeRoundShape as jest.Mock).mockImplementation(async () => {
    entered.resolve();
    await native.promise;
    return {
      cards: [],
      priorLocalShapes: new Map([[card().id, { nine_type: 'full', holes_played: 6 }]]),
    };
  });
  const adoption = adoptAuthoritativeRoundShape(roundId, shape, { ownerId: 'owner' });
  await entered.promise;
  for (const strokes of [5, 7])
    useScorecardStore.setState({
      groupScorecards: new Map([
        [
          'p',
          card({
            scores: { 1: { strokes }, 7: { strokes: 9 } },
            status: 'confirmed',
            submittedBy: 'new',
            submittedAt: new Date('2026-10-09'),
          }),
        ],
      ]),
    });
  native.resolve();
  await adoption;
  expect(useScorecardStore.getState().groupScorecards.get('p')).toMatchObject({
    scores: { 1: { strokes: 7 } },
    status: 'confirmed',
    submittedBy: 'new',
    playerHandicap: 12,
  });
});
it('rollback keeps epoch; committed application failure still invalidates it', async () => {
  const old = captureRoundPersistenceSource(roundId);
  (persistAuthoritativeRoundShape as jest.Mock).mockRejectedValueOnce(new Error('rollback'));
  await expect(adoptAuthoritativeRoundShape(roundId, shape, { ownerId: 'owner' })).rejects.toThrow(
    'rollback'
  );
  expect(isRoundPersistenceSourceCurrent(old)).toBe(true);
  (persistAuthoritativeRoundShape as jest.Mock).mockImplementationOnce(async () => {
    useScorecardStore.setState({ groupScorecards: new Map([['p', card({ coursePar: 99 })]]) });
    return { cards: [], priorLocalShapes: new Map() };
  });
  await expect(
    adoptAuthoritativeRoundShape(roundId, shape, { ownerId: 'owner' })
  ).rejects.toThrow();
  expect(isRoundPersistenceSourceCurrent(old)).toBe(false);
});
it('captured session cannot apply after same-round replacement, but committed epoch advances', async () => {
  const native = deferred();
  const entered = deferred();
  const old = captureRoundPersistenceSource(roundId);
  (persistAuthoritativeRoundShape as jest.Mock).mockImplementationOnce(async () => {
    entered.resolve();
    await native.promise;
    return { cards: [], priorLocalShapes: new Map() };
  });
  const adoption = adoptAuthoritativeRoundShape(roundId, shape, { ownerId: 'owner' });
  await entered.promise;
  useScorecardStore.getState().resetRound();
  useScorecardStore.setState({ currentRoundId: roundId, holesPlayed: null });
  native.resolve();
  await expect(adoption).rejects.toThrow();
  expect(useScorecardStore.getState().holesPlayed).toBeNull();
  expect(isRoundPersistenceSourceCurrent(old)).toBe(false);
});
it('refuses account replacement before transaction', async () => {
  const read = deferred();
  (getHoles as jest.Mock).mockImplementationOnce(async () => {
    await read.promise;
    return holes;
  });
  const adoption = adoptAuthoritativeRoundShape(roundId, shape, { ownerId: 'owner' });
  (getSyncAuthUserId as jest.Mock).mockReturnValue('other');
  read.resolve();
  await expect(adoption).rejects.toThrow();
  expect(persistAuthoritativeRoundShape).not.toHaveBeenCalled();
});
it('explicit already-owned entry never reacquires the coordinator', async () => {
  await withRoundScoringWrite(roundId, () =>
    adoptRoundShapeWithinScoringWrite(roundId, shape, { ownerId: 'owner' })
  );
  expect(persistAuthoritativeRoundShape).toHaveBeenCalledTimes(1);
});
it('NULL refuses a live final marker before durable mutation', async () => {
  await expect(
    adoptAuthoritativeRoundShape(
      roundId,
      { nine_type: 'full', holes_played: null },
      { ownerId: 'owner' }
    )
  ).rejects.toMatchObject({ kind: 'local_end_pending' });
  expect(persistAuthoritativeRoundShape).not.toHaveBeenCalled();
});
it('transaction callback resolves changed CURRENT input instead of installing prepared score maps', async () => {
  (persistAuthoritativeRoundShape as jest.Mock).mockImplementationOnce(
    async (_id, target, { rebuild }) => {
      const changed = card({
        scores: { 2: { strokes: 8 } },
        status: 'confirmed',
        submittedBy: 'changed',
        playerHandicap: 0,
      });
      expect(rebuild(changed, new Set([2]), target)).toMatchObject({
        scores: { 2: { strokes: 8 } },
        playerHandicap: 0,
        submittedBy: 'changed',
        totalNet: 8,
      });
      return { cards: [], priorLocalShapes: new Map() };
    }
  );
  await adoptAuthoritativeRoundShape(roundId, shape, { ownerId: 'owner' });
});

it('new authorized metadata reads time out as unavailable without certifying deletion or committing', async () => {
  const { supabase } = require('@/services/supabase/client');
  jest.useFakeTimers();
  (getHoles as jest.Mock).mockResolvedValue([]);
  (getScorecardsByRound as jest.Mock).mockResolvedValue([
    card({ syncHoles: undefined, syncGameType: undefined }),
  ]);
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    abortSignal: () => chain,
    maybeSingle: () => new Promise(() => {}),
  };
  (supabase.from as jest.Mock).mockReturnValue(chain);
  try {
    const adoption = adoptAuthoritativeRoundShape(roundId, shape, { ownerId: 'owner' });
    const refusal = expect(adoption).rejects.toMatchObject({ kind: 'unavailable' });
    await flush();
    await jest.advanceTimersByTimeAsync(8000);
    await refusal;
    expect(persistAuthoritativeRoundShape).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});
it('closed frozen cards and failed queue-only cards reconstruct independently without live-profile borrowing', async () => {
  const closed = card({ status: 'confirmed', submittedBy: 'historical' });
  const queued = card({
    id: 'queue-only',
    playerId: 'other',
    status: 'completed',
    submittedBy: 'queued',
    playerHandicap: 0,
    scores: { 2: { strokes: 9 } },
  });
  (getScorecardsByRound as jest.Mock).mockResolvedValue([closed]);
  (getFailedSyncs as jest.Mock).mockResolvedValue([
    { type: 'scorecard', action: 'update', data: queued, status: 'failed' },
  ]);
  (persistAuthoritativeRoundShape as jest.Mock).mockImplementationOnce(
    async (_id, target, { rebuild }) => {
      expect(rebuild(closed, new Set([1]), target)).toMatchObject({
        playerHandicap: 12,
        submittedBy: 'historical',
        scores: { 1: { strokes: 4 } },
      });
      expect(rebuild(queued, new Set([2]), target)).toMatchObject({
        playerHandicap: 0,
        submittedBy: 'queued',
        scores: { 2: { strokes: 9 } },
        totalNet: 9,
      });
      return { cards: [], priorLocalShapes: new Map() };
    }
  );
  await adoptAuthoritativeRoundShape(roundId, shape, { ownerId: 'owner' });
});
it('a newly incompatible transaction source rolls back instead of borrowing earlier prepared inputs', async () => {
  const old = captureRoundPersistenceSource(roundId);
  (persistAuthoritativeRoundShape as jest.Mock).mockImplementationOnce(
    async (_id, target, { rebuild }) => {
      rebuild(
        card({
          status: 'confirmed',
          playerHandicap: undefined,
          teeData: { ...tee, slopeRating: 130 },
        }),
        new Set([1]),
        target
      );
      throw new Error('unreachable');
    }
  );
  await expect(
    adoptAuthoritativeRoundShape(roundId, shape, { ownerId: 'owner' })
  ).rejects.toMatchObject({ kind: 'context_missing' });
  expect(isRoundPersistenceSourceCurrent(old)).toBe(true);
});
it('NULL refuses a live round-only final marker even when every card remains unmarked', async () => {
  (getScorecardsByRound as jest.Mock).mockResolvedValue([card({ holesPlayed: null })]);
  useScorecardStore.setState({
    holesPlayed: 6,
    groupScorecards: new Map([['p', card({ holesPlayed: null })]]),
  });
  await expect(
    adoptAuthoritativeRoundShape(
      roundId,
      { nine_type: 'full', holes_played: null },
      { ownerId: 'owner' }
    )
  ).rejects.toMatchObject({ kind: 'local_end_pending' });
  expect(persistAuthoritativeRoundShape).not.toHaveBeenCalled();
});
