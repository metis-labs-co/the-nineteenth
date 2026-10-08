/**
 * Scorecard store — end round early (B3b; B3c appends the init-path tests)
 *
 * Own mock setup (vs scorecardStore.test.ts): the `rounds` row is mutable so
 * init paths can see a server holes_played, and the debounce module is a spy
 * so "snapshot sync scheduled" is assertable without 2 s timers.
 *
 * @see docs/superpowers/specs/2026-10-07-end-round-early-design.md (R14–R17)
 */

import { useScorecardStore } from '@/store/scorecardStore';
import { debouncedQueueScorecardSync } from '@/store/scorecardSyncDebounce';
import { createTestPlayer, create18Holes } from '../utils/testFixtures';
import type { Player, Scorecard, TeeBox } from '@/types';
import {
  saveScorecard,
  saveHoleScore,
  saveHoles,
  persistRoundEarlyEnd,
  getHoles,
  getScorecardsByRound,
  deleteHoleScoresForCards,
} from '@/services/offline/database';
import { syncScorecard } from '@/services/offline/sync';

jest.mock('@/services/offline/database', () => ({
  saveScorecard: jest.fn(() => Promise.resolve()),
  saveHoleScore: jest.fn(() => Promise.resolve()),
  getScorecardsByRound: jest.fn(() => Promise.resolve([])),
  saveHoles: jest.fn(() => Promise.resolve()),
  getHoles: jest.fn(() => Promise.resolve([])),
  persistRoundEarlyEnd: jest.fn(() => Promise.resolve()),
  deleteHoleScoresForCards: jest.fn(() => Promise.resolve()),
  markScorecardsAsSynced: jest.fn(() => Promise.resolve()),
  markScorecardAsSynced: jest.fn(() => Promise.resolve()),
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
  const makeLogger = () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() });
  return {
    storeLogger: makeLogger(),
    syncLogger: makeLogger(),
    createModuleLogger: jest.fn(() => makeLogger()),
    logScorecardSummary: jest.fn((sc) => ({ id: sc?.id })),
  };
});

const supabaseMock = jest.requireMock('@/services/supabase/client') as {
  __setRoundsResult: (result: unknown) => void;
  __resetRoundsResult: () => void;
};

// UUID v4 ids: loadFromOffline rejects non-UUID cached data.
const ROUND_ID = '123e4567-e89b-42d3-a456-426614174000';
const P1: Player = createTestPlayer({ id: '11111111-1111-4111-a111-111111111111', name: 'Sam', handicap: 0 });
const P2: Player = createTestPlayer({ id: '22222222-2222-4222-a222-222222222222', name: 'Dave', handicap: 0 });

const P3: Player = createTestPlayer({ id: '33333333-3333-4333-a333-333333333333', name: 'Ben', handicap: 0 });
const TEE_WHITE: TeeBox = { name: 'White', color: 'white', slopeRating: 113, courseRating: 72 };
const TEE_RED: TeeBox = { name: 'Red', color: 'red', slopeRating: 113, courseRating: 70 };

const getStore = () => useScorecardStore.getState();
const cardId = (playerId: string) => `scorecard-${ROUND_ID}-${playerId}`;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const scoredHoles = (playerId: string): number[] =>
  Object.keys(getStore().groupScorecards.get(playerId)?.scores ?? {})
    .map(Number)
    .sort((a, b) => a - b);

async function score(playerId: string, holeNumbers: number[], strokes = 4): Promise<void> {
  for (const holeNumber of holeNumbers) {
    await getStore().setPlayerScore(playerId, holeNumber, strokes);
  }
}

// The payload `syncScorecard` received for a player at submit.
const submittedPayload = (playerId: string): Scorecard => {
  const call = (syncScorecard as jest.Mock).mock.calls.find(
    (args) => (args[0] as Scorecard).playerId === playerId
  );
  if (!call) throw new Error(`no submit payload for ${playerId}`);
  return call[0] as Scorecard;
};

beforeEach(() => {
  getStore().resetRound();
  supabaseMock.__resetRoundsResult();
  jest.clearAllMocks();
  (getHoles as jest.Mock).mockReset().mockResolvedValue([]);
  (getScorecardsByRound as jest.Mock).mockReset().mockResolvedValue([]);
  (persistRoundEarlyEnd as jest.Mock).mockReset().mockResolvedValue(undefined);
  (saveScorecard as jest.Mock).mockReset().mockResolvedValue(undefined);
  (deleteHoleScoresForCards as jest.Mock).mockReset().mockResolvedValue(undefined);
});

describe('characterization (pre end-round-early)', () => {
  it('submitScorecards stamps the planned coursePar 72, 18 syncHoles, syncNineType full and no holesPlayed', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes());
    await score(P1.id, [1]);
    await score(P2.id, [1]);

    await getStore().submitScorecards();

    const payload = submittedPayload(P1.id);
    expect(payload.coursePar).toBe(72);
    expect(payload.syncHoles).toHaveLength(18);
    expect(payload.syncNineType).toBe('full');
    expect(payload).not.toHaveProperty('holesPlayed');
  });

  it('submitScorecards stamps coursePar 36 and 9 syncHoles for a front-9 round', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], null, 'profile', new Map(), 'front9');
    await score(P1.id, [1]);

    await getStore().submitScorecards();

    const payload = submittedPayload(P1.id);
    expect(payload.coursePar).toBe(36);
    expect(payload.syncHoles).toHaveLength(9);
    expect(payload.syncNineType).toBe('front9');
  });
});


describe('getPlayedHoles / resetRound', () => {
  it('returns the planned holes until the round is ended, then only the played ones', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes());

    expect(getStore().holesPlayed).toBeNull();
    expect(getStore().getPlayedHoles()).toHaveLength(18);

    useScorecardStore.setState({ holesPlayed: 6 });
    expect(getStore().getPlayedHoles().map((h) => h.number)).toEqual(range(1, 6));
    expect(getStore().holes).toHaveLength(18);
  });

  it('a back-9 round ended after 6 plays holes 10–15 (Review Focus #2)', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], null, 'profile', new Map(), 'back9');
    useScorecardStore.setState({ holesPlayed: 6 });

    expect(getStore().getPlayedHoles().map((h) => h.number)).toEqual(range(10, 15));
  });

  it('resetRound clears holesPlayed', () => {
    useScorecardStore.setState({ holesPlayed: 6 });
    getStore().resetRound();
    expect(getStore().holesPlayed).toBeNull();
  });
});

describe('submitScorecards on a round ended early', () => {
  it('keeps the PLANNED coursePar (72) and 18 syncHoles, and carries holesPlayed', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes());
    await score(P1.id, range(1, 6));
    await score(P2.id, range(1, 6));
    useScorecardStore.setState({ holesPlayed: 6 });

    await getStore().submitScorecards();

    const payload = submittedPayload(P1.id);
    expect(payload.coursePar).toBe(72);
    expect(payload.syncHoles).toHaveLength(18);
    expect(payload.syncNineType).toBe('full');
    expect(payload.holesPlayed).toBe(6);
  });
});

describe('endRoundEarly(n)', () => {
  beforeEach(async () => {
    await getStore().initializeRound(
      ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE, 'profile',
      new Map([[P2.id, TEE_RED]])
    );
    await score(P1.id, range(1, 7)); // half-scored hole 7
    await score(P2.id, [...range(1, 6), 8]); // skipped hole 7, stray hole 8
    getStore().setCurrentHole(8);
    jest.clearAllMocks();
  });

  it('commits every later-score removal in ONE durable SQLite call before changing state', async () => {
    let holesPlayedDuringDelete: number | null | undefined;
    let p1HolesDuringDelete: number[] = [];
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(async () => {
      holesPlayedDuringDelete = getStore().holesPlayed;
      p1HolesDuringDelete = scoredHoles(P1.id);
    });

    await getStore().endRoundEarly(6);

    expect(persistRoundEarlyEnd).toHaveBeenCalledTimes(1);
    expect(persistRoundEarlyEnd).toHaveBeenCalledWith(ROUND_ID, 6, 'full', range(1, 6), [
      { scorecardId: cardId(P1.id), teeData: TEE_WHITE },
      { scorecardId: cardId(P2.id), teeData: TEE_RED },
    ]);
    expect(holesPlayedDuringDelete).toBeNull();
    expect(p1HolesDuringDelete).toEqual(range(1, 7));
    expect(scoredHoles(P1.id)).toEqual(range(1, 6));
    expect(scoredHoles(P2.id)).toEqual(range(1, 6));
  });

  it('sets holesPlayed, keeps the 18 planned holes and clamps the current hole', async () => {
    await getStore().endRoundEarly(6);

    const state = getStore();
    expect(state.holesPlayed).toBe(6);
    expect(state.holes).toHaveLength(18);
    expect(state.nineType).toBe('full');
    expect(state.getPlayedHoles().map((h) => h.number)).toEqual(range(1, 6));
    expect(state.currentHole).toBe(6);
  });

  it("stamps holesPlayed and the player's tee on every card, recomputes totals, persists and schedules syncs", async () => {
    await getStore().endRoundEarly(6);

    // Handicap 0: White CR 72 = par → DHC 0; Red round((0 + 70 − 72) × 0.93 × 0.9986) = −2 → 0 strokes.
    // So net = gross = 6 holes × 4 = 24 for both.
    const p1 = getStore().groupScorecards.get(P1.id);
    const p2 = getStore().groupScorecards.get(P2.id);
    expect(p1).toMatchObject({ holesPlayed: 6, teeData: TEE_WHITE, totalGross: 24, totalNet: 24 });
    expect(p2).toMatchObject({ holesPlayed: 6, teeData: TEE_RED, totalGross: 24, totalNet: 24 });
    expect(saveScorecard).toHaveBeenCalledWith(
      expect.objectContaining({ id: cardId(P1.id), holesPlayed: 6, teeData: TEE_WHITE, totalGross: 24 })
    );
    expect(saveScorecard).toHaveBeenCalledWith(
      expect.objectContaining({ id: cardId(P2.id), holesPlayed: 6, teeData: TEE_RED, totalGross: 24 })
    );
    expect(debouncedQueueScorecardSync).toHaveBeenCalledWith(cardId(P1.id), expect.any(Function));
    expect(debouncedQueueScorecardSync).toHaveBeenCalledWith(cardId(P2.id), expect.any(Function));
  });

  it('works when allowedPlayerIds lists every player (ScorecardEntryScreen always fills it)', async () => {
    getStore().setAllowedPlayers([P1.id, P2.id]);

    await getStore().endRoundEarly(6);

    expect(getStore().holesPlayed).toBe(6);
  });

  it('rejects, changing nothing, when this device scores only some players', async () => {
    getStore().setAllowedPlayers([P1.id]);

    await expect(getStore().endRoundEarly(6)).rejects.toThrow(/every player/);

    expect(getStore().holesPlayed).toBeNull();
    expect(scoredHoles(P1.id)).toEqual(range(1, 7));
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
    expect(saveScorecard).not.toHaveBeenCalled();
  });

  it('rejects when a scorecard belongs to a player outside allowedPlayerIds', async () => {
    const groupScorecards = new Map(getStore().groupScorecards);
    groupScorecards.set(P3.id, {
      id: cardId(P3.id), roundId: ROUND_ID, playerId: P3.id, player: P3, scores: {},
      totalGross: 0, totalNet: 0, status: 'in-progress', createdAt: new Date(), updatedAt: new Date(),
    });
    useScorecardStore.setState({ groupScorecards, allowedPlayerIds: [P1.id, P2.id] });

    await expect(getStore().endRoundEarly(6)).rejects.toThrow(/every player/);

    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });

  it('changes nothing when the durable SQLite transaction fails', async () => {
    (persistRoundEarlyEnd as jest.Mock).mockRejectedValueOnce(new Error('disk I/O error'));

    await expect(getStore().endRoundEarly(6)).rejects.toThrow('disk I/O error');

    expect(getStore().holesPlayed).toBeNull();
    expect(scoredHoles(P1.id)).toEqual(range(1, 7));
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
  });

  it('aborts with EndRoundEarlyRoundChangedError when the store is reset during the durable transaction', async () => {
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(async () => {
      getStore().resetRound(); // e.g. the user left and opened another round
    });

    await expect(getStore().endRoundEarly(6)).rejects.toMatchObject({
      name: 'EndRoundEarlyRoundChangedError',
      roundId: ROUND_ID,
    });

    expect(getStore().currentRoundId).toBeNull();
    expect(getStore().holesPlayed).toBeNull();
    expect(getStore().groupScorecards.size).toBe(0);
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
  });

  it('is idempotent: ending again at the same N writes nothing', async () => {
    await getStore().endRoundEarly(6);
    jest.clearAllMocks();

    await getStore().endRoundEarly(6);

    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
    expect(getStore().holesPlayed).toBe(6);
  });

  it('adopts a smaller N (another device ended first, 22023 conflict — Review Focus #3)', async () => {
    await getStore().endRoundEarly(6);
    jest.clearAllMocks();

    await getStore().endRoundEarly(4);

    expect(persistRoundEarlyEnd).toHaveBeenCalledWith(ROUND_ID, 4, 'full', range(1, 4), expect.any(Array));
    expect(getStore().holesPlayed).toBe(4);
    expect(scoredHoles(P1.id)).toEqual(range(1, 4));
    expect(getStore().groupScorecards.get(P1.id)?.holesPlayed).toBe(4);
  });

  it('rejects an N outside 1…planned−1', async () => {
    await expect(getStore().endRoundEarly(0)).rejects.toThrow(/holes played/);
    await expect(getStore().endRoundEarly(18)).rejects.toThrow(/holes played/);
    await expect(getStore().endRoundEarly(2.5)).rejects.toThrow(/holes played/);

    expect(getStore().holesPlayed).toBeNull();
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });
});

describe('endRoundEarly — back 9 (Review Focus #2)', () => {
  it('removes scores after hole 15 only', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], null, 'profile', new Map(), 'back9');
    await score(P1.id, range(10, 16));
    await score(P2.id, range(10, 15));
    jest.clearAllMocks();

    await getStore().endRoundEarly(6);

    expect(persistRoundEarlyEnd).toHaveBeenCalledWith(ROUND_ID, 6, 'back9', range(10, 15), [
      { scorecardId: cardId(P1.id), teeData: null },
      { scorecardId: cardId(P2.id), teeData: null },
    ]);
    expect(getStore().getPlayedHoles().map((h) => h.number)).toEqual(range(10, 15));
    expect(scoredHoles(P1.id)).toEqual(range(10, 15));
    expect(getStore().currentHole).toBe(10); // init put it on hole 10, a played hole
  });
});
describe('endRoundEarly durable boundary', () => {
  it('durably stamps every card even when no later scores exist and metadata saves fail', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE);
    await score(P1.id, range(1, 6));
    jest.clearAllMocks();
    (saveScorecard as jest.Mock).mockRejectedValue(new Error('metadata save failed'));
    let resolved = false;
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(async () => {
      expect(getStore().holesPlayed).toBeNull();
      expect(resolved).toBe(false);
    });

    await getStore().endRoundEarly(6);
    resolved = true;

    expect(persistRoundEarlyEnd).toHaveBeenCalledWith(ROUND_ID, 6, 'full', range(1, 6), [
      { scorecardId: cardId(P1.id), teeData: TEE_WHITE },
      { scorecardId: cardId(P2.id), teeData: TEE_WHITE },
    ]);
    expect(getStore().holesPlayed).toBe(6);
    expect(getStore().groupScorecards.get(P2.id)?.holesPlayed).toBe(6);
  });

  it.each([false, true])('aborts an older end after changed-nine initialization of the SAME round (reset first: %s)', async (resetFirst) => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes());
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(async () => {
      if (resetFirst) getStore().resetRound();
      await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_RED, 'profile', new Map(), 'back9');
      jest.clearAllMocks();
    });

    await expect(getStore().endRoundEarly(6)).rejects.toMatchObject({ name: 'EndRoundEarlyRoundChangedError', roundId: ROUND_ID });

    expect(getStore().nineType).toBe('back9');
    expect(getStore().holesPlayed).toBeNull();
    expect(getStore().getPlayedHoles().map((h) => h.number)).toEqual(range(10, 18));
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
  });

  it('supports adopting a larger authoritative N as well as a smaller N', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes());
    await getStore().endRoundEarly(4);
    await getStore().endRoundEarly(6);
    expect(getStore().holesPlayed).toBe(6);
    expect(getStore().groupScorecards.get(P1.id)?.holesPlayed).toBe(6);
  });

  it.each([
    ['stroke', 19, 15, 0],
    ['stableford', 19, 9, 0],
    ['par', 19, 15, 2],
  ] as const)('retains planned DHC and a boundary pickup for %s', async (gameType, gross, net, parScore) => {
    // HI18, slope113/CR72/par72 => DHC17. Each retained SI1..4 gets one stroke.
    const player = createTestPlayer({ ...P1, handicap: 18 });
    await getStore().initializeRound(ROUND_ID, [player], create18Holes().map((h, i) => ({ ...h, par: 4, strokeIndex: i + 1 })), gameType, false, [], TEE_WHITE);
    await score(P1.id, [1, 2, 3], 4);
    await score(P1.id, [4], 10); // effective gross 7, net 6 (pickup)
    await score(P1.id, [5], 3); // removed

    await getStore().endRoundEarly(4);

    const card = getStore().groupScorecards.get(P1.id);
    expect(card).toMatchObject({ totalGross: gross, totalNet: net, total_par_score: parScore });
    expect(scoredHoles(P1.id)).toEqual([1, 2, 3, 4]);
    expect(getStore().holes).toHaveLength(18);
  });
});

describe('endRoundEarly post-commit session changes', () => {
  it('stops further metadata saves and syncs after a reset during the first metadata save', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes());
    jest.clearAllMocks();
    (saveScorecard as jest.Mock).mockImplementationOnce(async () => { getStore().resetRound(); });

    await expect(getStore().endRoundEarly(6)).rejects.toMatchObject({ name: 'EndRoundEarlyRoundChangedError', roundId: ROUND_ID });

    expect(persistRoundEarlyEnd).toHaveBeenCalledTimes(1);
    expect(saveScorecard).toHaveBeenCalledTimes(1);
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
    expect(getStore().groupScorecards.size).toBe(0);
  });

  it('does not let a pending sync getter read a later session of the same round', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes());
    await getStore().endRoundEarly(6);
    const getPendingCard = (debouncedQueueScorecardSync as jest.Mock).mock.calls[0][1] as () => Scorecard | undefined;
    expect(getPendingCard()?.holesPlayed).toBe(6);
    getStore().resetRound();
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes());
    expect(getPendingCard()).toBeUndefined();
  });

  it('allows the existing setPlayerTee action to save a matching-marker tee correction', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE);
    await getStore().endRoundEarly(6);
    jest.clearAllMocks();

    await getStore().setPlayerTee(P1.id, TEE_RED);

    expect(saveScorecard).toHaveBeenCalledWith(expect.objectContaining({ holesPlayed: 6, teeData: TEE_RED }));
    expect(getStore().groupScorecards.get(P1.id)?.teeData).toEqual(TEE_RED);
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });

  it('does not schedule standalone scorecard snapshots and refuses an unloaded round', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', true);
    jest.clearAllMocks();
    await getStore().endRoundEarly(6);
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
    getStore().resetRound();
    await expect(getStore().endRoundEarly(6)).rejects.toThrow('No round ID');
  });
});


describe('endRoundEarly while initialization is pending', () => {
  it('rejects when changed-nine init starts BEFORE ending, before the durable DAO is called', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes());
    await score(P1.id, range(1, 7));
    let releaseHoles!: () => void;
    (saveHoles as jest.Mock).mockImplementationOnce(() => new Promise<void>((resolve) => { releaseHoles = resolve; }));
    const initializing = getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_RED, 'profile', new Map(), 'back9');
    expect(getStore().isLoading).toBe(true);
    expect(getStore().nineType).toBe('full'); // old shape remains during init
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(async () => { await initializing; });
    jest.clearAllMocks();

    const ending = expect(getStore().endRoundEarly(6)).rejects.toThrow(/initializ|loading/i);
    releaseHoles();
    await initializing;
    await ending;

    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
    expect(getStore().nineType).toBe('back9');
    expect(getStore().holesPlayed).toBeNull();
    expect(getStore().getPlayedHoles().map((h) => h.number)).toEqual(range(10, 18));
  });

  it('rejects before the durable DAO while offline loading is pending', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes());
    let releaseCards!: () => void;
    (getScorecardsByRound as jest.Mock).mockImplementationOnce(() => new Promise<Scorecard[]>((resolve) => { releaseCards = () => resolve([]); }));
    const loading = getStore().loadFromOffline(ROUND_ID);
    expect(getStore().isLoading).toBe(true);
    jest.clearAllMocks();

    const ending = expect(getStore().endRoundEarly(6)).rejects.toThrow(/initializ|loading/i);
    releaseCards();
    await loading;
    await ending;

    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
    expect(getStore().holesPlayed).toBeNull();
  });
});

describe('closed holes after an early end', () => {
  beforeEach(async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes());
    await score(P1.id, range(1, 6));
    await score(P2.id, range(1, 6));
    await getStore().endRoundEarly(6);
    jest.clearAllMocks();
  });

  it('ignores every single-ball write after the last played hole', async () => {
    await getStore().setPlayerScore(P1.id, 8, 5);
    await getStore().updatePlayerHoleScore(P1.id, 7, { strokes: 5, putts: 2 });
    await getStore().updateShotContributions(P1.id, 9, { teeShot: P1.id });
    await getStore().updateLocalScore(ROUND_ID, P1.id, 10, 4);

    expect(scoredHoles(P1.id)).toEqual(range(1, 6));
    expect(saveHoleScore).not.toHaveBeenCalled();
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
  });

  it('ignores multi-ball writes after the last played hole', async () => {
    getStore().setMultiBallConfig(2);

    await getStore().setMultiBallScore(P1.id, 8, 0, 4);
    await getStore().updateMultiBallStats(P1.id, 8, 1, { putts: 2 });

    expect(scoredHoles(P1.id)).toEqual(range(1, 6));
    expect(saveHoleScore).not.toHaveBeenCalled();
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
  });

  it('still accepts a correction on a played hole', async () => {
    await getStore().setPlayerScore(P1.id, 6, 3);

    const hole6 = getStore().groupScorecards.get(P1.id)?.scores[6];
    expect(hole6 && 'strokes' in hole6 ? hole6.strokes : undefined).toBe(3);
    expect(saveHoleScore).toHaveBeenCalled();
  });
});

// Exercise each public setter independently, including a retained-hole write.
const holeWrites = [
  { name: 'setPlayerScore', apply: (hole: number) => getStore().setPlayerScore(P1.id, hole, 3), expected: { strokes: 3 }, multiBall: false },
  { name: 'updatePlayerHoleScore', apply: (hole: number) => getStore().updatePlayerHoleScore(P1.id, hole, { strokes: 3, putts: 1 }), expected: { strokes: 3, putts: 1 }, multiBall: false },
  { name: 'updateShotContributions', apply: (hole: number) => getStore().updateShotContributions(P1.id, hole, { teeShot: P1.id }), expected: { shotContributions: { teeShot: P1.id } }, multiBall: false },
  { name: 'updateLocalScore', apply: (hole: number) => getStore().updateLocalScore(ROUND_ID, P1.id, hole, 3), expected: { strokes: 3 }, multiBall: false },
  { name: 'setMultiBallScore', apply: (hole: number) => getStore().setMultiBallScore(P1.id, hole, 0, 3), expected: { strokes: 3 }, multiBall: true },
  { name: 'updateMultiBallStats', apply: (hole: number) => getStore().updateMultiBallStats(P1.id, hole, 0, { putts: 1 }), expected: { strokes: 4, putts: 1 }, multiBall: true },
];

describe('writes to a hole outside the planned list', () => {
  it.each(holeWrites)('$name ignores hole 12 of an open front nine', async ({ apply }) => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], null, 'profile', new Map(), 'front9');
    getStore().setMultiBallConfig(2);
    const before = getStore().groupScorecards;
    jest.clearAllMocks();

    await apply(12);

    expect(getStore().groupScorecards).toBe(before);
    expect(scoredHoles(P1.id)).toEqual([]);
    expect(saveHoleScore).not.toHaveBeenCalled();
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
  });
});

describe('closed holes on a back nine ended after six', () => {
  it.each(holeWrites)('$name accepts hole 15 corrections and refuses hole 16', async ({ apply, expected, multiBall }) => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], null, 'profile', new Map(), 'back9');
    if (multiBall) {
      getStore().setMultiBallConfig(2);
      for (const hole of range(10, 15)) {
        await getStore().setMultiBallScore(P1.id, hole, 0, 4);
        await getStore().setMultiBallScore(P2.id, hole, 0, 4);
      }
    } else {
      await score(P1.id, range(10, 15));
      await score(P2.id, range(10, 15));
    }
    await getStore().endRoundEarly(6);
    jest.clearAllMocks();

    await apply(15);

    const retained = getStore().groupScorecards.get(P1.id)?.scores[15];
    expect(retained && 'balls' in retained ? retained.balls[0] : retained).toMatchObject(expected);
    expect(saveScorecard).toHaveBeenCalledTimes(1);
    expect(getStore().getPlayedHoles().map((h) => h.number)).toEqual(range(10, 15));
    const before = getStore().groupScorecards;
    jest.clearAllMocks();

    await apply(16);
    await apply(5); // Before the back nine starts, even though it is below N.

    expect(getStore().groupScorecards).toBe(before);
    expect(scoredHoles(P1.id)).toEqual(range(10, 15));
    expect(saveHoleScore).not.toHaveBeenCalled();
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
  });
});
