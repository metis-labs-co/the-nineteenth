import {
  captureRoundPersistenceSource as capture,
  isRoundPersistenceSourceCurrent as current,
  withRoundPersistence as write,
  withRoundPersistenceTransition as transition,
  runRoundPersistence,
  RoundPersistenceSourceChangedError,
} from '@/services/offline/roundPersistenceBarrier';

const shape = { nine_type: 'full', holes_played: 6 } as const;
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

it('registers the whole admitted chain synchronously and drains before each repair', async () => {
  const round = 'whole-chain';
  const source = capture(round);
  const hole = deferred();
  const full = deferred();
  const queue = deferred();
  const order: string[] = [];
  const writing = write(source, async () => {
    order.push('hole');
    await hole.promise;
    order.push('full');
    await full.promise;
    order.push('queue');
    await queue.promise;
  });
  expect(order).toEqual(['hole']);
  const ending = transition(
    round,
    shape,
    async () => {
      order.push('trim6');
    },
    () => {
      order.push('apply6');
    }
  );
  hole.resolve();
  await Promise.resolve();
  expect(order).toEqual(['hole', 'full']);
  full.resolve();
  await Promise.resolve();
  expect(order).toEqual(['hole', 'full', 'queue']);
  queue.resolve();
  await writing;
  await ending;
  await transition(
    round,
    { ...shape, holes_played: 8 },
    async () => {
      order.push('trim8');
    },
    () => {}
  );
  expect(order).toEqual(['hole', 'full', 'queue', 'trim6', 'apply6', 'trim8']);
});

it('revalidates the original source after waiting and never invokes stale work', async () => {
  const round = 'late-admission';
  const source = capture(round);
  const commit = deferred();
  const callback = jest.fn();
  const ending = transition(
    round,
    shape,
    () => commit.promise,
    () => {}
  );
  expect(current(source)).toBe(false);
  const writing = write(source, callback);
  const rejected = expect(writing).rejects.toBeInstanceOf(RoundPersistenceSourceChangedError);
  commit.resolve();
  await ending;
  await rejected;
  expect(callback).not.toHaveBeenCalled();
});

it('nested leases remain active while closing, reject wrong-round and inactive use', async () => {
  const round = 'nested';
  const paused = deferred();
  let retained: Parameters<typeof runRoundPersistence>[1];
  const writing = write(capture(round), async (lease) => {
    retained = { lease };
    await paused.promise;
    await runRoundPersistence(round, { lease }, async (child) => {
      expect(child).toBe(lease);
      await runRoundPersistence(round, { lease: child }, async () => {});
    });
    await expect(runRoundPersistence('wrong-round', { lease }, async () => {})).rejects.toThrow(
      'lease'
    );
  });
  const ending = transition(
    round,
    shape,
    async () => {},
    () => {}
  );
  paused.resolve();
  await writing;
  await ending;
  await expect(runRoundPersistence(round, retained!, async () => {})).rejects.toThrow('lease');
});

it('rollback preserves epoch; committed throwing apply invalidates and reopens', async () => {
  const round = 'failures';
  const old = capture(round);
  const failure = new Error('rollback');
  await expect(
    transition(
      round,
      shape,
      async () => {
        throw failure;
      },
      () => {}
    )
  ).rejects.toBe(failure);
  expect(current(old)).toBe(true);
  await write(old, async () => {});
  await expect(
    transition(
      round,
      shape,
      async () => {},
      () => {
        throw new Error('apply');
      }
    )
  ).rejects.toThrow('apply');
  expect(current(old)).toBe(false);
  await write(capture(round), async () => {});
});

it('serializes transitions but unrelated round work proceeds', async () => {
  const round = 'serialized';
  const paused = deferred();
  const order: number[] = [];
  const first = transition(
    round,
    shape,
    async () => {
      order.push(1);
      await paused.promise;
    },
    () => {
      order.push(2);
    }
  );
  const second = transition(
    round,
    shape,
    async () => {
      order.push(3);
    },
    () => {
      order.push(4);
    }
  );
  await write(capture('unrelated'), async () => {
    order.push(0);
  });
  expect(order).toEqual([1, 0]);
  paused.resolve();
  await first;
  await second;
  expect(order).toEqual([1, 0, 2, 3, 4]);
});

it('rejects missing provenance and stale advertised shape after a protected transition', async () => {
  const round = 'defensive-shape';
  await transition(
    round,
    shape,
    async () => {},
    () => {}
  );
  const work = jest.fn();
  await expect(runRoundPersistence(round, {}, work)).rejects.toBeInstanceOf(
    RoundPersistenceSourceChangedError
  );
  await expect(
    runRoundPersistence(round, { source: capture(round) }, work, { holesPlayed: null })
  ).rejects.toBeInstanceOf(RoundPersistenceSourceChangedError);
  await expect(
    runRoundPersistence(round, { source: capture(round) }, work, {
      holesPlayed: 6,
      syncNineType: 'back9',
    })
  ).rejects.toBeInstanceOf(RoundPersistenceSourceChangedError);
  await runRoundPersistence(round, { source: capture(round) }, work, {
    holesPlayed: 6,
    syncNineType: 'full',
  });
  expect(work).toHaveBeenCalledTimes(1);
});

it('a waiting old source stays eligible after rollback and after failed queued transitions', async () => {
  const round = 'rollback-waiter';
  const source = capture(round);
  const paused = deferred();
  const callback = jest.fn(async () => {});
  const ending = transition(
    round,
    shape,
    async () => {
      await paused.promise;
      throw new Error('rollback');
    },
    () => {}
  );
  const failed = expect(ending).rejects.toThrow('rollback');
  const writing = write(source, callback);
  expect(callback).not.toHaveBeenCalled();
  paused.resolve();
  await failed;
  await writing;
  expect(current(source)).toBe(true);
  expect(callback).toHaveBeenCalledTimes(1);
  await transition(
    round,
    shape,
    async () => {},
    () => {}
  );
  expect(current(source)).toBe(false);
});

it('waits for a closed gate even when the incoming token was already invalidated', async () => {
  const round = 'old-token-closed-again';
  const old = capture(round);
  await transition(
    round,
    shape,
    async () => {},
    () => {}
  );
  const paused = deferred();
  const ending = transition(
    round,
    { ...shape, holes_played: 8 },
    () => paused.promise,
    () => {}
  );
  let settled = false;
  const callback = jest.fn(async () => {});
  const result = write(old, callback).then(
    () => {
      settled = true;
      return undefined;
    },
    (error) => {
      settled = true;
      return error;
    }
  );
  await Promise.resolve();
  await Promise.resolve();
  expect(settled).toBe(false);
  paused.resolve();
  await ending;
  expect(await result).toBeInstanceOf(RoundPersistenceSourceChangedError);
  expect(callback).not.toHaveBeenCalled();
});
