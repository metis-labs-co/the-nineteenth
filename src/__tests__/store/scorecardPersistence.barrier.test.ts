import {
  captureRoundPersistenceSource as capture,
  withRoundPersistenceTransition as transition,
  runRoundPersistence,
  roundPersistenceLeaseRoundId,
  type RoundPersistenceLease,
} from '@/services/offline/roundPersistenceBarrier';
import type { Scorecard } from '@/types';
import { persistScorecardUpdate } from '@/store/scorecardPersistence';
import {
  debouncedQueueScorecardSync,
  flushPendingScorecardSyncs,
} from '@/store/scorecardSyncDebounce';
import { saveScorecard, saveHoleScore } from '@/services/offline/database';
import { queueScorecardSync, getIsOnline, manualSync } from '@/services/offline/sync';

jest.mock('@/services/offline/database', () => ({
  saveScorecard: jest.fn(),
  saveHoleScore: jest.fn(),
}));
jest.mock('@/services/offline/sync', () => ({
  queueScorecardSync: jest.fn(),
  getIsOnline: jest.fn(() => false),
  manualSync: jest.fn(),
}));

const card = (roundId = 'ordinary-chain'): Scorecard => ({
  id: `card-${roundId}`,
  roundId,
  playerId: 'player',
  scores: { 3: { strokes: 4 } },
  totalGross: 4,
  totalNet: 4,
  status: 'in-progress',
  createdAt: new Date(),
  updatedAt: new Date(),
});

beforeEach(() => {
  jest.resetAllMocks();
});
afterEach(() => {
  flushPendingScorecardSyncs();
  jest.useRealTimers();
});

it('characterizes hole -> full card -> queue order and ordinary failure return', async () => {
  const order: string[] = [];
  (saveHoleScore as jest.Mock).mockImplementation(async () => {
    order.push('hole');
  });
  (saveScorecard as jest.Mock).mockImplementation(async () => {
    order.push('card');
  });
  (queueScorecardSync as jest.Mock).mockImplementation(async () => {
    order.push('queue');
  });
  const scorecard = card();
  const options = {
    holeScore: { scorecardId: scorecard.id, holeNumber: 3, score: { strokes: 4 } },
    scorecard: { scorecardId: scorecard.id, scorecard },
    sync: { scorecard },
  };
  await expect(persistScorecardUpdate(options)).resolves.toBe(true);
  expect(order).toEqual(['hole', 'card', 'queue']);
  (saveScorecard as jest.Mock).mockRejectedValueOnce(new Error('disk'));
  await expect(persistScorecardUpdate(options)).resolves.toBe(false);
  expect(order).toEqual(['hole', 'card', 'queue', 'hole']);
});

it('characterizes debounce coalescing, getter at fire, and completed skip', async () => {
  jest.useFakeTimers();
  let current = card('debounce-characterization');
  const getter = jest.fn(() => current);
  debouncedQueueScorecardSync(current.id, getter);
  debouncedQueueScorecardSync(current.id, getter);
  current = { ...current, scores: { 3: { strokes: 6 } } };
  await jest.advanceTimersByTimeAsync(2000);
  expect(getter).toHaveBeenCalledTimes(2);
  expect(queueScorecardSync).toHaveBeenCalledWith(current, 'update', expect.any(Object));
  current = { ...current, status: 'completed' };
  debouncedQueueScorecardSync(current.id, getter);
  await jest.advanceTimersByTimeAsync(2000);
  expect(queueScorecardSync).toHaveBeenCalledTimes(1);
});

// Controlled promises exercise admission without opening SQLite.
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const shape = { nine_type: 'full', holes_played: 6 } as const;

it('drains an admitted hole/full/queue chain before trimming', async () => {
  const scorecard = card('helper-drain');
  const hole = deferred();
  const queue = deferred();
  const order: string[] = [];
  (saveHoleScore as jest.Mock).mockImplementation(async () => {
    order.push('hole');
    await hole.promise;
  });
  (saveScorecard as jest.Mock).mockImplementation(async () => {
    order.push('card');
  });
  (queueScorecardSync as jest.Mock).mockImplementation(async () => {
    order.push('queue');
    await queue.promise;
  });
  const writing = persistScorecardUpdate({
    source: capture(scorecard.roundId),
    holeScore: { scorecardId: scorecard.id, holeNumber: 3, score: { strokes: 4 } },
    scorecard: { scorecardId: scorecard.id, scorecard },
    sync: { scorecard },
  });
  const ending = transition(
    scorecard.roundId,
    shape,
    async () => {
      order.push('trim');
    },
    () => {}
  );
  hole.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(order).not.toContain('trim');
  queue.resolve();
  await writing;
  await ending;
  expect(order).toEqual(['hole', 'card', 'queue', 'trim']);
});

it('rebases twice-edited current card after closing and omits the captured hole', async () => {
  const original = card('helper-rebase');
  let current = original;
  const commit = deferred();
  const ending = transition(
    original.roundId,
    shape,
    () => commit.promise,
    () => {
      current = { ...current, holesPlayed: 6 };
    }
  );
  const writing = persistScorecardUpdate({
    source: capture(original.roundId),
    resolveCurrentScorecard: () => current,
    holeScore: { scorecardId: original.id, holeNumber: 3, score: { strokes: 4 } },
    scorecard: { scorecardId: original.id, scorecard: original },
    sync: { scorecard: original },
  });
  current = { ...current, scores: { 3: { strokes: 5 } } };
  current = { ...current, scores: { 3: { strokes: 6 } } };
  commit.resolve();
  await ending;
  await expect(writing).resolves.toBe(true);
  expect(saveHoleScore).not.toHaveBeenCalled();
  expect(saveScorecard).toHaveBeenCalledWith(current, expect.any(Object));
  expect(queueScorecardSync).toHaveBeenCalledWith(current, 'update', expect.any(Object));
});

it('cancels changed-session continuation without claiming saved', async () => {
  const original = card('helper-session');
  const commit = deferred();
  let sameSession = true;
  const ending = transition(
    original.roundId,
    shape,
    () => commit.promise,
    () => {}
  );
  const writing = persistScorecardUpdate({
    source: capture(original.roundId),
    resolveCurrentScorecard: () => (sameSession ? original : undefined),
    scorecard: { scorecardId: original.id, scorecard: original },
  });
  sameSession = false;
  commit.resolve();
  await ending;
  await expect(writing).resolves.toBe(false);
  expect(saveScorecard).not.toHaveBeenCalled();
});

it('debounce rereads its guarded getter after stale queue admission', async () => {
  jest.useFakeTimers();
  let current: Scorecard | undefined = card('debounce-gap');
  const old = current;
  const commit = deferred();
  const getter = jest.fn(() => current);
  (queueScorecardSync as jest.Mock).mockImplementation((queued, _action, options) =>
    runRoundPersistence(queued.roundId, options, async () => {
      expect(queued).toBe(current);
    })
  );
  const ending = transition(
    old.roundId,
    shape,
    () => commit.promise,
    () => {
      current = { ...old, holesPlayed: 6, scores: { 3: { strokes: 7 } } };
    }
  );
  debouncedQueueScorecardSync(old.id, getter);
  await jest.advanceTimersByTimeAsync(2000);
  commit.resolve();
  await ending;
  await jest.advanceTimersByTimeAsync(0);
  expect(getter).toHaveBeenCalledTimes(3);
  expect(queueScorecardSync).toHaveBeenLastCalledWith(current, 'update', expect.any(Object));
});

it('stops an already admitted chain at its next step when the session is replaced', async () => {
  const scorecard = card('admitted-session');
  const paused = deferred();
  let current: Scorecard | undefined = scorecard;
  (saveHoleScore as jest.Mock).mockImplementation(() => paused.promise);
  const writing = persistScorecardUpdate({
    source: capture(scorecard.roundId),
    resolveCurrentScorecard: () => current,
    holeScore: { scorecardId: scorecard.id, holeNumber: 3, score: { strokes: 4 } },
    scorecard: { scorecardId: scorecard.id, scorecard },
    sync: { scorecard },
  });
  current = undefined;
  paused.resolve();
  await expect(writing).resolves.toBe(false);
  expect(saveScorecard).not.toHaveBeenCalled();
  expect(queueScorecardSync).not.toHaveBeenCalled();
});

it('refuses a fresh-token stale advertised card before writing its individual hole', async () => {
  const scorecard = card('helper-stale-shape');
  await transition(
    scorecard.roundId,
    shape,
    async () => {},
    () => {}
  );
  await expect(
    persistScorecardUpdate({
      source: capture(scorecard.roundId),
      holeScore: { scorecardId: scorecard.id, holeNumber: 3, score: { strokes: 4 } },
      scorecard: { scorecardId: scorecard.id, scorecard },
    })
  ).resolves.toBe(false);
  expect(saveHoleScore).not.toHaveBeenCalled();
  expect(saveScorecard).not.toHaveBeenCalled();
});

it('debounce queue reuses its admitted lease while closing and releases it before manual sync', async () => {
  jest.useFakeTimers();
  const current = card('debounce-nested-lease');
  const network = deferred();
  let lease: RoundPersistenceLease | undefined;
  let ending: Promise<void> | undefined;
  let leaseWasInactiveAtManualSync = false;
  (getIsOnline as jest.Mock).mockReturnValue(true);
  (queueScorecardSync as jest.Mock).mockImplementation((queued, _action, proof) => {
    lease = proof.lease;
    ending = transition(current.roundId, shape, async () => {}, () => {});
    return runRoundPersistence(queued.roundId, proof, async () => {
      expect(roundPersistenceLeaseRoundId(proof.lease)).toBe(current.roundId);
    });
  });
  (manualSync as jest.Mock).mockImplementation(() => {
    try {
      roundPersistenceLeaseRoundId(lease!);
    } catch {
      leaseWasInactiveAtManualSync = true;
    }
    return network.promise;
  });
  debouncedQueueScorecardSync(current.id, () => current);
  await jest.advanceTimersByTimeAsync(2000);
  expect(queueScorecardSync).toHaveBeenCalledTimes(1);
  expect(manualSync).toHaveBeenCalledTimes(1);
  expect(lease).toBeDefined();
  expect(leaseWasInactiveAtManualSync).toBe(true);
  expect(ending).toBeDefined();
  await ending;
  network.resolve();
});

it('persists a remote acknowledgment with the lease but never transfers it to a rebased card', async () => {
  const old = card('remote-ack-rebase');
  let current = old;
  await persistScorecardUpdate({ source: capture(old.roundId),
    scorecard: { scorecardId: old.id, scorecard: old, syncedAtRevision: 9 } });
  expect(saveScorecard).toHaveBeenLastCalledWith(old, expect.objectContaining({ lease: expect.any(Object), syncedAtRevision: 9 }));
  const source = capture(old.roundId);
  await transition(old.roundId, shape, async () => {}, () => {
    current = { ...old, holesPlayed: 6, scores: { 3: { strokes: 7 } } };
  });
  await persistScorecardUpdate({ source, resolveCurrentScorecard: () => current,
    scorecard: { scorecardId: old.id, scorecard: old, syncedAtRevision: 9 } });
  expect(saveScorecard).toHaveBeenLastCalledWith(current, expect.objectContaining({ lease: expect.any(Object) }));
  expect((saveScorecard as jest.Mock).mock.calls.at(-1)[1]).not.toHaveProperty('syncedAtRevision');
});
