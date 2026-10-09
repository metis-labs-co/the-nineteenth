/**
 * Scorecard store — end round early (B3b; B3c appends the init-path tests)
 *
 * Own mock setup (vs scorecardStore.test.ts): the `rounds` row is mutable so
 * init paths can see a server holes_played, and the debounce module is a spy
 * so "snapshot sync scheduled" is assertable without 2 s timers.
 *
 * @see docs/superpowers/specs/2026-10-07-end-round-early-design.md (R14–R17)
 */

import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import { adoptAuthoritativeRoundShape } from '@/services/rounds/roundScoringAdoption';
import { endRoundEarly as endWithIntent } from '@/store/endRoundEarlySlice';
import { requestSyncDrain } from '@/services/offline/sync/drain';
import { getSyncAuthUserId } from '@/services/offline/sync/networkState';
import { useScorecardStore } from '@/store/scorecardStore';
import { debouncedQueueScorecardSync } from '@/store/scorecardSyncDebounce';
import { createTestPlayer, create18Holes } from '../utils/testFixtures';
import type { Player, Scorecard, TeeBox } from '@/types';
import {
  saveScorecard,
  saveHoleScore,
  saveHoles,
  persistRoundEarlyEnd,
  persistAuthoritativeRoundShape,
  getHoles,
  getScorecardsByRound,
  deleteHoleScoresForCards,
  getPendingSyncByEntityKey,
} from '@/services/offline/database';
import { syncScorecard, queueScorecardSync } from '@/services/offline/sync';
import { supabase } from '@/services/supabase/client';
import { createRoundScoringContext } from '@/services/rounds/roundScoringContext';
import { calculateHandicapData } from '@/services/offline/sync/scorecardSync';
import { shapeHoleNumbers } from '@/services/rounds/roundScoringWrite';
import { withRoundPersistenceTransition } from '@/services/offline/roundPersistenceBarrier';
import { Platform } from 'react-native';
import { persistRoundEarlyEnd as persistNativeEarlyEnd, getScorecardsByRound as decodeNativeScorecards } from '@/services/offline/dao/ScorecardDAO';
import { getDb } from '@/services/offline/DatabaseManager';
import { getHoleScores } from '@/services/offline/dao/HoleScoreDAO';
import type { ScorecardRow } from '@/services/offline/types';

jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));
jest.mock('@/services/offline/dao/HoleScoreDAO', () => ({
  getHoleScores: jest.fn(), bulkSaveHoleScores: jest.fn(), deleteHoleScores: jest.fn(),
}));

jest.mock('@/services/offline/sync/drain', () => ({ requestSyncDrain: jest.fn() }));
jest.mock('@/services/offline/sync/networkState', () => ({ getSyncAuthUserId: jest.fn(() => 'owner') }));

jest.mock('@/services/offline/database', () => ({
  getPendingSyncByEntityKey: jest.fn(async () => null),
  saveScorecard: jest.fn(() => Promise.resolve()),
  saveHoleScore: jest.fn(() => Promise.resolve()),
  getScorecardsByRound: jest.fn(() => Promise.resolve([])),
  saveHoles: jest.fn(() => Promise.resolve()),
  getHoles: jest.fn(() => Promise.resolve([])),
  persistRoundEarlyEnd: jest.fn(() => Promise.resolve()),
  persistAuthoritativeRoundShape: jest.fn(), getPendingSyncs: jest.fn(async () => []), getFailedSyncs: jest.fn(async () => []),
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

let mockOwnedIntent: unknown = null;
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
  mockOwnedIntent = null;
  (getPendingSyncByEntityKey as jest.Mock).mockReset().mockImplementation(async () => mockOwnedIntent);
  (persistRoundEarlyEnd as jest.Mock).mockReset().mockImplementation(async (id, n, _nine, _holes, _cards, options) => {
    if (options?.intent) mockOwnedIntent = { type: 'round', action: 'update', data: { id, action: 'end_early', holesPlayed: n, userId: options.intent.userId } };
  });
  (persistAuthoritativeRoundShape as jest.Mock).mockReset().mockImplementation(async (id, target, { rebuild }) => {
    const cards = await getScorecardsByRound(id);
    const prior = new Map(cards.map(card => [card.id, { nine_type: card.syncNineType ?? target.nine_type, holes_played: card.holesPlayed ?? null }]));
    let keep = shapeHoleNumbers(target);
    for (const card of cards) if (card.holesPlayed != null) keep = new Set([...keep].filter(h => shapeHoleNumbers({ nine_type: card.syncNineType ?? target.nine_type, holes_played: card.holesPlayed! }).has(h)));
    return { cards: cards.map(card => rebuild(card, keep, target)), priorLocalShapes: prior };
  });
  (saveScorecard as jest.Mock).mockReset().mockResolvedValue(undefined);
  (deleteHoleScoresForCards as jest.Mock).mockReset().mockResolvedValue(undefined);
});

describe('characterization (pre end-round-early)', () => {
  it('submitScorecards stamps the planned coursePar 72, 18 syncHoles, syncNineType full and no holesPlayed', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
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
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE, 'profile', new Map(), 'front9');
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
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);

    expect(getStore().holesPlayed).toBeNull();
    expect(getStore().getPlayedHoles()).toHaveLength(18);

    useScorecardStore.setState({ holesPlayed: 6 });
    expect(getStore().getPlayedHoles().map((h) => h.number)).toEqual(range(1, 6));
    expect(getStore().holes).toHaveLength(18);
  });

  it('a back-9 round ended after 6 plays holes 10–15 (Review Focus #2)', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE, 'profile', new Map(), 'back9');
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
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
    await score(P1.id, range(1, 6));
    await score(P2.id, range(1, 6));
    await getStore().endRoundEarly(6);

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
      expect.objectContaining({ scorecardId: cardId(P1.id), teeData: TEE_WHITE, syncHandicapSource: 'profile' }),
      expect.objectContaining({ scorecardId: cardId(P2.id), teeData: TEE_RED, syncHandicapSource: 'profile' }),
    ], { intent: { userId: 'owner' } });
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
      expect.objectContaining({ id: cardId(P1.id), holesPlayed: 6, teeData: TEE_WHITE, totalGross: 24 }),
      expect.objectContaining({ lease: expect.any(Object) })
    );
    expect(saveScorecard).toHaveBeenCalledWith(
      expect.objectContaining({ id: cardId(P2.id), holesPlayed: 6, teeData: TEE_RED, totalGross: 24 }),
      expect.objectContaining({ lease: expect.any(Object) })
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

  it('idempotently ensures the same owned intent when ending again at the same N', async () => {
    await getStore().endRoundEarly(6);
    jest.clearAllMocks();

    await getStore().endRoundEarly(6);

    expect(persistRoundEarlyEnd).toHaveBeenCalledTimes(1);
    expect((persistRoundEarlyEnd as jest.Mock).mock.calls[0][5]).toEqual({ intent: { userId: 'owner' }, requireExistingIntent: true });
    expect(getStore().holesPlayed).toBe(6);
  });

  it('adopts a smaller N (another device ended first, 22023 conflict — Review Focus #3)', async () => {
    await getStore().endRoundEarly(6);
    jest.clearAllMocks();

    await adoptAuthoritativeRoundShape(ROUND_ID, { nine_type: 'full', holes_played: 4 }, { ownerId: 'owner' });

    expect(persistAuthoritativeRoundShape).toHaveBeenCalledWith(ROUND_ID, { nine_type: 'full', holes_played: 4 }, expect.any(Object));
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
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
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE, 'profile', new Map(), 'back9');
    await score(P1.id, range(10, 16));
    await score(P2.id, range(10, 15));
    jest.clearAllMocks();

    await getStore().endRoundEarly(6);

    expect(persistRoundEarlyEnd).toHaveBeenCalledWith(ROUND_ID, 6, 'back9', range(10, 15), [
      expect.objectContaining({ scorecardId: cardId(P1.id), teeData: TEE_WHITE, syncHandicapSource: 'profile' }),
      expect.objectContaining({ scorecardId: cardId(P2.id), teeData: TEE_WHITE, syncHandicapSource: 'profile' }),
    ], { intent: { userId: 'owner' } });
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
      expect.objectContaining({ scorecardId: cardId(P1.id), teeData: TEE_WHITE, syncHandicapSource: 'profile' }),
      expect.objectContaining({ scorecardId: cardId(P2.id), teeData: TEE_WHITE, syncHandicapSource: 'profile' }),
    ], { intent: { userId: 'owner' } });
    expect(getStore().holesPlayed).toBe(6);
    expect(getStore().groupScorecards.get(P2.id)?.holesPlayed).toBe(6);
  });

  it.each([false, true])('aborts an older end after changed-nine initialization of the SAME round (reset first: %s)', async (resetFirst) => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
    let initializing!: Promise<void>;
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(async () => {
      if (resetFirst) getStore().resetRound();
      initializing = getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_RED, 'profile', new Map(), 'back9');
    });

    await expect(getStore().endRoundEarly(6)).rejects.toMatchObject({ name: 'EndRoundEarlyRoundChangedError', roundId: ROUND_ID });
    await expect(initializing).rejects.toThrow(/source changed/);
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_RED, 'profile', new Map(), 'back9');
    jest.clearAllMocks();
    expect(getStore().nineType).toBe('back9');
    expect(getStore().holesPlayed).toBeNull();
    expect(getStore().getPlayedHoles().map((h) => h.number)).toEqual(range(10, 18));
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
  });

  it('supports adopting a larger authoritative N as well as a smaller N', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
    await getStore().endRoundEarly(4);
    await adoptAuthoritativeRoundShape(ROUND_ID, { nine_type: 'full', holes_played: 6 }, { ownerId: 'owner' });
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
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
    jest.clearAllMocks();
    (saveScorecard as jest.Mock).mockImplementationOnce(async () => { getStore().resetRound(); });

    await expect(getStore().endRoundEarly(6)).rejects.toMatchObject({ name: 'EndRoundEarlyRoundChangedError', roundId: ROUND_ID });

    expect(persistRoundEarlyEnd).toHaveBeenCalledTimes(1);
    expect(saveScorecard).toHaveBeenCalledTimes(1);
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
    expect(getStore().groupScorecards.size).toBe(0);
  });

  it('does not let a pending sync getter read a later session of the same round', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
    await getStore().endRoundEarly(6);
    const getPendingCard = (debouncedQueueScorecardSync as jest.Mock).mock.calls[0][1] as () => Scorecard | undefined;
    expect(getPendingCard()?.holesPlayed).toBe(6);
    getStore().resetRound();
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
    expect(getPendingCard()).toBeUndefined();
  });

  it('allows the existing setPlayerTee action to save a matching-marker tee correction', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE);
    await getStore().endRoundEarly(6);
    jest.clearAllMocks();

    await getStore().setPlayerTee(P1.id, TEE_RED);

    expect(saveScorecard).toHaveBeenCalledWith(expect.objectContaining({ holesPlayed: 6, teeData: TEE_RED }), expect.objectContaining({ lease: expect.any(Object) }));
    expect(getStore().groupScorecards.get(P1.id)?.teeData).toEqual(TEE_RED);
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });

  it('does not schedule standalone scorecard snapshots and refuses an unloaded round', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', true, [], TEE_WHITE);
    jest.clearAllMocks();
    await getStore().endRoundEarly(6);
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
    getStore().resetRound();
    await expect(getStore().endRoundEarly(6)).rejects.toThrow('No round ID');
  });
});


describe('endRoundEarly while initialization is pending', () => {
  it('rejects when changed-nine init starts BEFORE ending, before the durable DAO is called', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
    await score(P1.id, range(1, 7));
    let releaseHoles!: () => void;
    let holesStarted!: () => void;
    const savingHoles = new Promise<void>((resolve) => { holesStarted = resolve; });
    (saveHoles as jest.Mock).mockImplementationOnce(() => { holesStarted(); return new Promise<void>((resolve) => { releaseHoles = resolve; }); });
    const initializing = getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_RED, 'profile', new Map(), 'back9');
    expect(getStore().isLoading).toBe(true);
    expect(getStore().nineType).toBe('full'); // old shape remains during init
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(async () => { await initializing; });
    jest.clearAllMocks();

    const ending = expect(getStore().endRoundEarly(6)).rejects.toThrow(/initializ|loading/i);
    await savingHoles;
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
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
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
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
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
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE, 'profile', new Map(), 'front9');
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
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE, 'profile', new Map(), 'back9');
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

// A scorecard as SQLite returns it after an app restart.
const cachedCard = (player: Player, holeNumbers: number[], holesPlayed?: number | null): Scorecard => ({
  id: cardId(player.id),
  roundId: ROUND_ID,
  playerId: player.id,
  player,
  playerHandicap: player.handicap ?? 0, playerGender: player.gender ?? null, teeData: TEE_WHITE,
  syncHoles: create18Holes(), syncGameType: 'stroke', syncHandicapSource: 'profile',
  syncNineType: holeNumbers[0] >= 10 ? 'back9' : 'full',
  coursePar: holeNumbers[0] >= 10 ? 36 : 72,
  scores: Object.fromEntries(holeNumbers.map((h) => [h, { strokes: 4 }])),
  totalGross: holeNumbers.length * 4,
  totalNet: 0,
  status: 'in-progress',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...(holesPlayed != null && { holesPlayed }),
});

const roundsRow = (overrides: Record<string, unknown> = {}) => ({
  data: {
    game_type: 'stroke',
    handicap_source: 'profile',
    nine_type: 'full',
    holes_played: null,
    selected_tee: null,
    course_id: null,
    ...overrides,
  },
  error: null,
});

describe('characterization (pre round-shape init)', () => {
  beforeEach(() => {
    (getHoles as jest.Mock).mockResolvedValue(create18Holes());
  });

  it('loadFromOffline filters a back-9 round to holes 10–18 and resumes on the first incomplete hole', async () => {
    supabaseMock.__setRoundsResult(roundsRow({ nine_type: 'back9' }));
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cachedCard(P1, [10, 11]), cachedCard(P2, [10, 11])]);

    const loaded = await getStore().loadFromOffline(ROUND_ID);

    expect(loaded).toBe(true);
    expect(getStore().nineType).toBe('back9');
    expect(getStore().holes.map((h) => h.number)).toEqual(range(10, 18));
    expect(getStore().currentHole).toBe(12);
  });

  it('loadFromOffline loads a cached round that was not ended without touching its cards', async () => {
    supabaseMock.__setRoundsResult(roundsRow());
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cachedCard(P1, range(1, 3)), cachedCard(P2, range(1, 3))]);

    await getStore().loadFromOffline(ROUND_ID);

    expect(getStore().holesPlayed).toBeNull();
    expect(getStore().getPlayedHoles()).toHaveLength(18);
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
    expect(saveScorecard).not.toHaveBeenCalled();
  });

  it('loadFromOffline still bails when the round row cannot be fetched (offline cold start is out of scope, R15)', async () => {
    supabaseMock.__setRoundsResult({ __reject: true });
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cachedCard(P1, range(1, 6), 6), cachedCard(P2, range(1, 6), 6)]);

    const loaded = await getStore().loadFromOffline(ROUND_ID);

    expect(loaded).toBe(false);
    expect(getStore().isInitialized).toBe(false);
  });
});

describe('C2b resumed unended live provenance', () => {
  it.each([
    ['profile', 'male'], ['profile', 'female'],
    ['calculated', 'male'], ['calculated', 'female'],
    ['none', 'male'], ['none', 'female'],
  ] as const)('decodes uncaptured native gender then resumes %s with refreshed %s context through scoring/end', async (source, gender) => {
    const row: ScorecardRow = {
      id: cardId(P1.id), round_id: ROUND_ID, player_id: P1.id, player_name: P1.name,
      player_handicap: 24, total_gross: 5, total_net: 5, total_points: 0,
      status: 'in-progress', submitted_at: null, submitted_by: null,
      created_at: '2020-01-01', updated_at: '2020-01-02', is_synced: 0, is_standalone: 0,
      // A tee/source/revision can precede captured scoring metadata in ordinary live saves.
      tee_data: JSON.stringify(TEE_WHITE), server_revision: 3, sync_handicap_source: source,
      player_gender: null, player_handicap_used: null, course_par: null,
      sync_holes: null, sync_nine_type: null, sync_game_type: null, holes_played: null,
    };
    (getDb as jest.Mock).mockResolvedValue({ getAllAsync: jest.fn(async () => [row]) });
    (getHoleScores as jest.Mock).mockResolvedValue({ 1: { strokes: 5 } });
    const [decoded] = await decodeNativeScorecards(ROUND_ID);
    (getHoles as jest.Mock).mockResolvedValue(create18Holes());
    (getScorecardsByRound as jest.Mock).mockResolvedValue([decoded]);
    supabaseMock.__setRoundsResult(roundsRow({ handicap_source: source, selected_tee: TEE_WHITE }));
    const originalFrom = (supabase.from as jest.Mock).getMockImplementation()!;
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table !== 'players') return originalFrom(table);
      return { select: () => ({ in: async () => ({ data: [{ id: P1.id,
        handicap: 14, handicap_index: 12, gender }] }) }) };
    });
    try {
      expect(await getStore().loadFromOffline(ROUND_ID)).toBe(true);
    } finally {
      (supabase.from as jest.Mock).mockImplementation(originalFrom);
    }
    expect(getStore().groupScorecards.get(P1.id)?.player).toMatchObject({ handicap: 14, handicapIndex: 12, gender });
    await getStore().setPlayerScore(P1.id, 2, 6);
    await getStore().endRoundEarly(6);
    const expectedHI = source === 'none' ? null : source === 'calculated' ? 12 : 14;
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject({
      holesPlayed: 6, playerGender: gender, playerHandicap: expectedHI,
      syncHandicapSource: source, teeData: TEE_WHITE, syncHoles: create18Holes(), syncGameType: 'stroke',
      scores: { 1: { strokes: 5 }, 2: { strokes: 6 } }, totalGross: 11,
      totalNet: source === 'none' ? 11 : 10,
    });
    expect(persistRoundEarlyEnd).toHaveBeenCalledWith(ROUND_ID, 6, 'full', range(1, 6),
      [expect.objectContaining({ playerGender: gender, playerHandicap: expectedHI })], { intent: { userId: 'owner' } });
  });

  it.each(['profile', 'calculated', 'none'] as const)('resumes a source-only active %s card, scores locally and ends with real current context', async (source) => {
    const player = { ...P1, handicap: source === 'none' ? undefined : 24, handicapIndex: source === 'none' ? undefined : 20 };
    const cached: Scorecard = {
      id: cardId(P1.id), roundId: ROUND_ID, playerId: P1.id, player,
      scores: { 1: { strokes: 5 } }, totalGross: 5, totalNet: 5,
      status: 'in-progress', syncHandicapSource: source,
      createdAt: new Date('2020-01-01'), updatedAt: new Date('2020-01-02'),
    };
    (getHoles as jest.Mock).mockResolvedValue(create18Holes());
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cached]);
    supabaseMock.__setRoundsResult(roundsRow({ handicap_source: source, selected_tee: TEE_WHITE }));
    const originalFrom = (supabase.from as jest.Mock).getMockImplementation()!;
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table !== 'players') return originalFrom(table);
      return { select: () => ({ in: async () => ({ data: [{ id: P1.id,
        handicap: source === 'none' ? null : 14,
        handicap_index: source === 'none' ? null : 12, gender: null }] }) }) };
    });
    const loaded = await getStore().loadFromOffline(ROUND_ID);
    (supabase.from as jest.Mock).mockImplementation(originalFrom);
    expect(loaded).toBe(true);
    expect(getStore().groupScorecards.get(P1.id)?.playerHandicap).toBeUndefined();
    expect(getStore().groupScorecards.get(P1.id)?.player?.handicap).toBe(source === 'none' ? undefined : 14);
    await getStore().setPlayerScore(P1.id, 2, 6);
    await getStore().endRoundEarly(6);
    const expectedHI = source === 'none' ? undefined : source === 'calculated' ? 12 : 14;
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject({
      holesPlayed: 6, syncHandicapSource: source, playerHandicap: expectedHI,
      teeData: TEE_WHITE, syncHoles: create18Holes(), syncGameType: 'stroke',
      scores: { 1: { strokes: 5 }, 2: { strokes: 6 } }, totalGross: 11,
      totalNet: source === 'none' ? 11 : 10,
    });
    const historicalQueueSource = { ...cached, createdAt: new Date('2019-01-01') };
    expect(getStore().captureRoundScoringSession(ROUND_ID)?.getLiveContext(historicalQueueSource)).toBeUndefined();
  });

  it.each([
    { status: 'in-progress' as const, holesPlayed: 6 },
    { status: 'confirmed' as const, holesPlayed: null },
    { status: 'in-progress' as const, holesPlayed: null, submittedBy: 'historical' },
  ])('loaded historical/terminal card remains ineligible: %j', async (fields) => {
    const cached = { ...cachedCard(P1, [1], fields.holesPlayed), ...fields,
      playerHandicap: undefined, playerGender: undefined, teeData: undefined,
      syncHoles: undefined, syncGameType: undefined, syncNineType: undefined, coursePar: undefined };
    (getHoles as jest.Mock).mockResolvedValue(create18Holes());
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cached]);
    supabaseMock.__setRoundsResult(roundsRow({ holes_played: fields.holesPlayed }));
    const loaded = await getStore().loadFromOffline(ROUND_ID);
    if (fields.holesPlayed != null) {
      expect(loaded).toBe(false);
      expect(getStore().captureRoundScoringSession(ROUND_ID)).toBeNull();
      expect(getStore().isInitialized).toBe(false);
      return;
    }
    expect(loaded).toBe(true);
    const current = getStore().groupScorecards.get(P1.id)!;
    const session = getStore().captureRoundScoringSession(ROUND_ID);
    expect(session?.getLiveContext(current)).toBeUndefined();
    expect(() => createRoundScoringContext(ROUND_ID, { holes: create18Holes(), gameType: 'stroke', getLiveContext: session?.getLiveContext })(
      current, new Set(range(1, 6)), { nine_type: 'full', holes_played: 6 })).toThrow(expect.objectContaining({ kind: 'context_missing' }));
    await expect(getStore().endRoundEarly(6)).rejects.toThrow('submitted');
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });
});

describe('init paths resolve the round shape and reconcile', () => {
  beforeEach(() => {
    (getHoles as jest.Mock).mockResolvedValue(create18Holes());
  });

  // Relaunch ONLINE before the queued end_early drains (the server row is
  // still NULL). A true offline cold start is out of scope (R15): see the
  // characterization test that loadFromOffline bails without the round row.
  it('relaunched online before the queued end_early drains: still ended, tee and net intact (Review Focus #1)', async () => {
    const SAM18: Player = createTestPlayer({ id: P1.id, name: 'Sam', handicap: 18 });
    const TEE_SHORT: TeeBox = { name: 'Short', color: 'yellow', slopeRating: 70, courseRating: 72 };
    // The queued end_early item has not reached the server yet.
    supabaseMock.__setRoundsResult(roundsRow({ holes_played: null }));
    await getStore().initializeRound(ROUND_ID, [SAM18, P2], create18Holes(), 'stroke', false, [], TEE_SHORT);
    await score(SAM18.id, range(1, 7));
    await score(P2.id, range(1, 6));
    await getStore().endRoundEarly(6);
    const before = getStore().getPlayerTotals(SAM18.id);

    // App killed: memory is gone; SQLite holds each card as last saved.
    const saved = new Map<string, Scorecard>();
    for (const [card] of (saveScorecard as jest.Mock).mock.calls as [Scorecard][]) saved.set(card.id, card);
    getStore().resetRound();
    jest.clearAllMocks();
    (getScorecardsByRound as jest.Mock).mockResolvedValue([...saved.values()]);

    const loaded = await getStore().loadFromOffline(ROUND_ID);

    expect(loaded).toBe(true);
    const state = getStore();
    expect(state.holesPlayed).toBe(6);
    expect(state.holes).toHaveLength(18); // planned holes: the DHC is unchanged
    expect(state.getPlayedHoles().map((h) => h.number)).toEqual(range(1, 6));
    expect(scoredHoles(SAM18.id)).toEqual(range(1, 6)); // removed hole 7 stays gone
    expect(state.currentHole).toBe(6);
    expect(state.selectedTeeData).toEqual(TEE_SHORT);
    expect(state.playerTeeMap.get(SAM18.id)).toEqual(TEE_SHORT);
    // DHC = round((18 × 70 / 113 + (72 − 72)) × 0.93 × 0.9986) = round(10.36) = 10.
    // Holes 1–6 have SI 7, 15, 1, 11, 5, 17 → strokes on SI ≤ 10 = 3 → net 24 − 3 = 21.
    // A lost tee would fall back to HC 18 (one stroke a hole) → 18.
    expect(before).toMatchObject({ gross: 24, net: 21 });
    expect(state.getPlayerTotals(SAM18.id)).toMatchObject({ gross: 24, net: 21 });
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled(); // nothing to reconcile

    await state.setPlayerScore(SAM18.id, 7, 5);
    expect(scoredHoles(SAM18.id)).toEqual(range(1, 6)); // holes after N stay closed
  });

  it('another device ended the round: loads holes_played from the server and removes later scores', async () => {
    supabaseMock.__setRoundsResult(roundsRow({ holes_played: 6 }));
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cachedCard(P1, range(1, 8)), cachedCard(P2, range(1, 7))]);

    const loaded = await getStore().loadFromOffline(ROUND_ID);

    expect(loaded).toBe(true);
    expect(getStore().holesPlayed).toBe(6);
    expect(persistAuthoritativeRoundShape).toHaveBeenCalledTimes(1);
    expect(persistAuthoritativeRoundShape).toHaveBeenCalledWith(ROUND_ID, { nine_type: 'full', holes_played: 6 }, expect.any(Object));
    expect(scoredHoles(P1.id)).toEqual(range(1, 6));
    expect(scoredHoles(P2.id)).toEqual(range(1, 6));
    expect(getStore().groupScorecards.get(P2.id)?.scores[7]).toBeUndefined();

    const fromMock = supabase.from as jest.Mock;
    const roundsSelects = fromMock.mock.calls
      .map(([table], i) => [table, fromMock.mock.results[i]?.value] as const)
      .filter(([table]) => table === 'rounds')
      .map(([, chain]) => String((chain as { select: jest.Mock }).select.mock.calls[0]?.[0] ?? ''));
    expect(roundsSelects.some((columns) => /\bholes_played\b/.test(columns))).toBe(true);
  });

  it('reconcile syncs only the cards that lost scores; a re-stamp alone stays local', async () => {
    supabaseMock.__setRoundsResult(roundsRow({ holes_played: 6 }));
    // P1: holes 1–6 and no marker yet (re-stamp only). P2: a stray hole 7.
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cachedCard(P1, range(1, 6)), cachedCard(P2, range(1, 7))]);

    await getStore().loadFromOffline(ROUND_ID);

    expect(persistAuthoritativeRoundShape).toHaveBeenCalledWith(ROUND_ID, { nine_type: 'full', holes_played: 6 }, expect.any(Object));
    expect(scoredHoles(P2.id)).toEqual(range(1, 6));
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
    expect(getStore().groupScorecards.get(P2.id)?.scores[7]).toBeUndefined();
  });

  it('the server N wins over a different local N (first device to end wins — Review Focus #3)', async () => {
    supabaseMock.__setRoundsResult(roundsRow({ holes_played: 4 }));
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cachedCard(P1, range(1, 6), 6), cachedCard(P2, range(1, 6), 6)]);

    await getStore().loadFromOffline(ROUND_ID);

    expect(getStore().holesPlayed).toBe(4);
    expect(getStore().currentHole).toBe(4);
    expect(persistAuthoritativeRoundShape).toHaveBeenCalledWith(ROUND_ID, { nine_type: 'full', holes_played: 4 }, expect.any(Object));
    expect(scoredHoles(P1.id)).toEqual(range(1, 4));
    expect(scoredHoles(P2.id)).toEqual(range(1, 4));
    expect(getStore().groupScorecards.get(P1.id)?.holesPlayed).toBe(4);
  });

  it('a back-9 round ended after 6 reopens on holes 10–15 (Review Focus #1, #2)', async () => {
    supabaseMock.__setRoundsResult(roundsRow({ nine_type: 'back9' }));
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cachedCard(P1, range(10, 15), 6), cachedCard(P2, range(10, 15), 6)]);

    await getStore().loadFromOffline(ROUND_ID);

    expect(getStore().nineType).toBe('back9');
    expect(getStore().holesPlayed).toBe(6);
    expect(getStore().getPlayedHoles().map((h) => h.number)).toEqual(range(10, 15));
    expect(getStore().currentHole).toBe(15);
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });

  it('initializeRound takes the server holes_played and stamps the new cards', async () => {
    await getStore().initializeRound(
      ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE, 'profile', new Map(), 'full', 1, 6
    );

    expect(getStore().holesPlayed).toBe(6);
    expect(getStore().holes).toHaveLength(18);
    expect(saveScorecard).toHaveBeenCalledWith(expect.objectContaining({ id: cardId(P1.id), holesPlayed: 6 }), expect.objectContaining({ lease: expect.any(Object) }));
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });

  it("initializeRound keeps a local end recorded on this device's SQLite cards", async () => {
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cachedCard(P1, range(1, 6), 6), cachedCard(P2, range(1, 6), 6)]);

    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);

    expect(getStore().holesPlayed).toBe(6);
  });
});

describe('init paths durability corrections', () => {
  beforeEach(() => { (getHoles as jest.Mock).mockResolvedValue(create18Holes()); });

  it('fallback init preserves cached populated scores, effective tee and server revision with server NULL', async () => {
    const sam = { ...P1, handicap: 18 };
    const tee: TeeBox = { name: 'Short', color: 'yellow', slopeRating: 70, courseRating: 72 };
    const cards = [
      { ...cachedCard(sam, range(1, 7), 6), teeData: tee, serverRevision: 13 },
      { ...cachedCard(P2, range(1, 6), 6), teeData: TEE_RED, serverRevision: 8 },
    ];
    (getScorecardsByRound as jest.Mock).mockResolvedValue(cards);

    await getStore().initializeRound(ROUND_ID, [sam, P2], create18Holes(), 'stroke', false, [], TEE_WHITE);

    expect(scoredHoles(P1.id)).toEqual(range(1, 6));
    expect(getStore().holesPlayed).toBe(6);
    expect(getStore().selectedTeeData).toEqual(tee);
    expect(getStore().playerTeeMap.get(P1.id)).toEqual(tee);
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject({ teeData: tee, serverRevision: 13, totalGross: 24, totalNet: 21 });
    expect(getStore().groupScorecards.get(P2.id)?.serverRevision).toBe(8);
    (syncScorecard as jest.Mock).mockImplementationOnce(async (card: Scorecard) => {
      expect(card.serverRevision).toBe(13);
      return { serverRevision: 14 };
    });
    await getStore().submitScorecards();
    expect(submittedPayload(P1.id)).toMatchObject({ totalGross: 24, totalNet: 21, teeData: tee });
    expect(Object.keys(submittedPayload(P1.id).scores).map(Number)).toEqual(range(1, 6));
  });

  it('failed durable repair blocks installation and a fresh load retries current sources', async () => {
    const cards = [cachedCard(P1, range(1, 8)), cachedCard(P2, range(1, 7))];
    supabaseMock.__setRoundsResult(roundsRow({ holes_played: 6 }));
    (getScorecardsByRound as jest.Mock).mockResolvedValue(cards);
    (persistAuthoritativeRoundShape as jest.Mock).mockRejectedValueOnce(new Error('disk cleanup failed'));
    expect(await getStore().loadFromOffline(ROUND_ID)).toBe(false);
    expect(getStore().isInitialized).toBe(false);
    expect(getStore().groupScorecards.size).toBe(0);
    expect(await getStore().loadFromOffline(ROUND_ID)).toBe(true);
    expect(scoredHoles(P1.id)).toEqual(range(1, 6));
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject({ totalGross: 24, totalNet: 24 });
  });

  it('adopts a larger server N as well as a smaller N without inventing lost scores', async () => {
    supabaseMock.__setRoundsResult(roundsRow({ holes_played: 8 }));
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cachedCard(P1, range(1, 6), 6), cachedCard(P2, range(1, 6), 6)]);
    await getStore().loadFromOffline(ROUND_ID);
    expect(getStore().holesPlayed).toBe(8);
    expect(getStore().currentHole).toBe(7);
    expect(scoredHoles(P1.id)).toEqual(range(1, 6));
    expect(persistAuthoritativeRoundShape).toHaveBeenCalledWith(ROUND_ID, { nine_type: 'full', holes_played: 8 }, expect.any(Object));
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject({ holesPlayed: 8, totalGross: 24 });
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
  });

  it('sets loading before awaiting cached cards and refuses an end during that await', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
    let release!: (cards: Scorecard[]) => void;
    (getScorecardsByRound as jest.Mock).mockImplementationOnce(() => new Promise<Scorecard[]>((resolve) => { release = resolve; }));
    const initializing = getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stableford', false, [], TEE_WHITE);
    expect(getStore().isLoading).toBe(true);
    await expect(getStore().endRoundEarly(6)).rejects.toThrow(/initializ|loading/i);
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
    release([]);
    await initializing;
  });

  it('does not apply failed repair to a replacement same-round session', async () => {
    supabaseMock.__setRoundsResult(roundsRow({ holes_played: 6 }));
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cachedCard(P1, range(1, 8))]);
    let rejectCleanup!: (error: Error) => void;
    let started!: () => void;
    const entered = new Promise<void>(r => { started = r; });
    (persistAuthoritativeRoundShape as jest.Mock).mockImplementationOnce(() => { started(); return new Promise((_, reject) => { rejectCleanup = reject; }); });
    const loading = getStore().loadFromOffline(ROUND_ID); await entered;
    getStore().resetRound();
    (getScorecardsByRound as jest.Mock).mockResolvedValue([]);
    const initializing = getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_WHITE, 'profile', new Map(), 'back9');
    rejectCleanup(new Error('rollback')); await loading; await initializing;
    expect(getStore().nineType).toBe('back9'); expect(getStore().holesPlayed).toBeNull();
    expect(scoredHoles(P1.id)).toEqual([]);
  });
});

describe('init paths session isolation', () => {
  it.each(['initializeRound', 'loadFromOffline'] as const)('%s cannot clear a newer init loading flag after an old cache read rejects', async (action) => {
    let rejectOld!: (error: Error) => void;
    let releaseNew!: (cards: Scorecard[]) => void;
    (getScorecardsByRound as jest.Mock)
      .mockImplementationOnce(() => new Promise<Scorecard[]>((_, reject) => { rejectOld = reject; }))
      .mockImplementationOnce(() => new Promise<Scorecard[]>((resolve) => { releaseNew = resolve; }));
    const old = action === 'initializeRound'
      ? getStore().initializeRound(ROUND_ID, [P1], create18Holes())
      : getStore().loadFromOffline(ROUND_ID);
    const newer = getStore().initializeRound(ROUND_ID, [P2], create18Holes(), 'stroke', false, [], TEE_WHITE, 'profile', new Map(), 'back9');
    rejectOld(new Error('stale cache read failed'));
    await old;
    expect(getStore().isLoading).toBe(true);
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
    releaseNew([]);
    await newer;
    expect(getStore().isLoading).toBe(false);
    expect(getStore().nineType).toBe('back9');
    expect(getStore().currentPlayers.map((player) => player.id)).toEqual([P2.id]);
  });
});

describe('init paths repair stale ended totals without cleanup', () => {
  it.each([
    ['loadFromOffline', 'memory'],
    ['loadFromOffline', 'submission'],
    ['initializeRound', 'memory'],
    ['initializeRound', 'submission'],
  ] as const)('%s repairs stale totals in %s when markers and score keys already agree', async (action, target) => {
    const player = { ...P1, handicap: 18 };
    const tee: TeeBox = { name: 'Short', color: 'yellow', slopeRating: 70, courseRating: 72 };
    // The exclusive end transaction committed N and trimmed rows, but the
    // later best-effort metadata save failed or the app died before it ran.
    const cached = {
      ...cachedCard(player, range(1, 6), 6),
      teeData: tee,
      serverRevision: 13,
      totalGross: 32,
      totalNet: 28,
      total_par_score: 99,
    };
    (getHoles as jest.Mock).mockResolvedValue(create18Holes());
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cached]);
    supabaseMock.__setRoundsResult(roundsRow());
    if (action === 'loadFromOffline') {
      expect(await getStore().loadFromOffline(ROUND_ID)).toBe(true);
    } else {
      await getStore().initializeRound(ROUND_ID, [player], create18Holes(), 'stroke', false, [], TEE_WHITE);
    }

    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
    expect(debouncedQueueScorecardSync).not.toHaveBeenCalled();
    expect(getStore().holes).toHaveLength(18);
    expect(scoredHoles(P1.id)).toEqual(range(1, 6));
    expect(getStore().groupScorecards.get(P1.id)?.serverRevision).toBe(13);
    if (target === 'submission') {
      await getStore().submitScorecards();
      expect(submittedPayload(P1.id)).toMatchObject({ totalGross: 24, totalNet: 21, total_par_score: 0, teeData: tee });
    } else {
      expect(getStore().groupScorecards.get(P1.id)).toMatchObject({ totalGross: 24, totalNet: 21, total_par_score: 0, teeData: tee });
    }
  });
});

describe('passive current scoring session bridge', () => {
  it('rebuilds current retained edits and newer submitted metadata after an asynchronous repair', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stableford', false, [], TEE_WHITE);
    await score(P1.id, [1, 6, 7]);
    const session = getStore().captureRoundScoringSession(ROUND_ID)!;
    const prior = new Map([[cardId(P1.id), { nine_type: 'full' as const, holes_played: 6 }]]);
    let release!: () => void;
    const durableRepair = new Promise<void>((resolve) => {
      release = resolve;
    });
    const adoption = durableRepair.then(() =>
      session.applyShape({ nine_type: 'full', holes_played: 8 }, prior, {
        scorecardId: cardId(P1.id),
        serverRevision: 10,
      })
    );
    // Edits and submission occur while the durable repair is awaiting SQLite.
    await score(P1.id, [1], 3);
    const current = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({
      groupScorecards: new Map([
        [
          P1.id,
          {
            ...current,
            status: 'completed',
            submittedBy: 'new-submitter',
            submittedAt: new Date('2026-10-09'),
            serverRevision: 12,
          },
        ],
      ]),
      currentHole: 9,
    });
    const beforeSaves = (saveScorecard as jest.Mock).mock.calls.length;
    release();
    expect(await adoption).toBe(true);
    const repaired = getStore().groupScorecards.get(P1.id)!;
    expect(repaired.scores[1]).toMatchObject({ strokes: 3 });
    expect(repaired.scores[7]).toBeUndefined();
    expect(repaired).toMatchObject({
      status: 'completed',
      submittedBy: 'new-submitter',
      serverRevision: 12,
      holesPlayed: 8,
      totalGross: 7,
    });
    expect(getStore().currentHole).toBe(8);
    expect(getStore().holes).toHaveLength(18);
    expect((saveScorecard as jest.Mock).mock.calls).toHaveLength(beforeSaves);
  });
  it('does not mutate a reset/reinitialized session for the same round', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stableford', false, [], TEE_WHITE);
    const session = getStore().captureRoundScoringSession(ROUND_ID)!;
    getStore().resetRound();
    await getStore().initializeRound(
      ROUND_ID,
      [P1],
      create18Holes(),
      'stableford',
      false,
      [],
      null,
      'profile',
      new Map(),
      'back9'
    );
    expect(session.isCurrent()).toBe(false);
    expect(session.applyShape({ nine_type: 'full', holes_played: 6 }, new Map())).toBe(false);
    expect(getStore().holesPlayed).toBeNull();
    expect(getStore().nineType).toBe('back9');
  });
  it('returns null for closed, different or loading rounds', async () => {
    expect(getStore().captureRoundScoringSession(ROUND_ID)).toBeNull();
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stableford', false, [], TEE_WHITE);
    expect(getStore().captureRoundScoringSession('other')).toBeNull();
    useScorecardStore.setState({ isLoading: true });
    expect(getStore().captureRoundScoringSession(ROUND_ID)).toBeNull();
  });
  it('intersects every earlier durable marker and current card cutoff on a changed nine', async () => {
    await getStore().initializeRound(
      ROUND_ID,
      [P1, P2],
      create18Holes(),
      'stroke',
      false,
      [],
      null,
      'profile',
      new Map(),
      'back9'
    );
    await score(P1.id, [10, 13, 15, 16]);
    const session = getStore().captureRoundScoringSession(ROUND_ID)!;
    const prior = new Map([
      [cardId(P1.id), { nine_type: 'back9' as const, holes_played: 6 }],
      [cardId(P2.id), { nine_type: 'back9' as const, holes_played: 4 }],
    ]);
    expect(session.applyShape({ nine_type: 'back9', holes_played: 8 }, prior)).toBe(true);
    expect(scoredHoles(P1.id)).toEqual([10, 13]);
    expect(getStore().holes).toHaveLength(9);
  });
});

describe('passive captured owned-intent option', () => {
  const endOwned = () =>
    endWithIntent(getStore, (partial) => useScorecardStore.setState(partial), 6, {
      intent: { userId: 'owner' },
    });
  beforeEach(() => {
    (getSyncAuthUserId as jest.Mock).mockReturnValue('owner');
  });
  it('ensures an intent even when the local end is already a no-op', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stableford', false, [], TEE_WHITE);
    await getStore().endRoundEarly(6);
    (persistRoundEarlyEnd as jest.Mock).mockClear();
    await endOwned();
    expect(persistRoundEarlyEnd).toHaveBeenCalledWith(
      ROUND_ID,
      6,
      'full',
      [1, 2, 3, 4, 5, 6],
      expect.any(Array),
      { intent: { userId: 'owner' }, requireExistingIntent: true }
    );
    expect(requestSyncDrain).toHaveBeenCalled();
  });
  it('requests the original durable work before a postcommit account change rejects memory application', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stableford', false, [], TEE_WHITE);
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(async () => {
      (getSyncAuthUserId as jest.Mock).mockReturnValue('other');
    });
    await expect(endOwned()).rejects.toThrow(/owner|account|changed/i);
    expect(requestSyncDrain).toHaveBeenCalled();
    expect(getStore().holesPlayed).toBeNull();
    expect(persistRoundEarlyEnd).toHaveBeenCalledWith(
      ROUND_ID,
      6,
      'full',
      expect.any(Array),
      expect.any(Array),
      { intent: { userId: 'owner' } }
    );
  });
  it('rejects a captured owner that disagrees with the account before persistence', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stableford', false, [], TEE_WHITE);
    (getSyncAuthUserId as jest.Mock).mockReturnValue(null);
    await expect(endOwned()).rejects.toThrow(/owner|account/i);
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });
  it('requests drain before detecting a postcommit reset and leaves the new session untouched', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stableford', false, [], TEE_WHITE);
    let generation = 1;
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(async () => {
      generation++;
      getStore().resetRound();
    });
    await expect(
      endWithIntent(getStore, (partial) => useScorecardStore.setState(partial), 6, {
        intent: { userId: 'owner' },
        getSessionGeneration: () => generation,
      })
    ).rejects.toThrow(/unloaded/);
    expect(requestSyncDrain).toHaveBeenCalled();
    expect(getStore().currentRoundId).toBeNull();
  });
});

it('refuses authoritative bridge math when current planned context cannot reconstruct the server nine', async () => {
  await getStore().initializeRound(
    ROUND_ID,
    [P1],
    create18Holes(),
    'stroke',
    false,
    [],
    null,
    'profile',
    new Map(),
    'front9'
  );
  const session = getStore().captureRoundScoringSession(ROUND_ID)!;
  expect(() => session.applyShape({ nine_type: 'back9', holes_played: 6 }, new Map())).toThrow(
    /planned|context/i
  );
  expect(getStore().nineType).toBe('front9');
  expect(getStore().holesPlayed).toBeNull();
});

it('adopts N6 on a physical nine-hole course retaining its full-nine label and planned handicap context', async () => {
  const physicalNine = create18Holes().slice(0, 9);
  await getStore().initializeRound(
    ROUND_ID,
    [P1],
    physicalNine,
    'stroke',
    false,
    [],
    TEE_WHITE,
    'profile',
    new Map(),
    'full'
  );
  await score(P1.id, [1, 6, 7]);
  const session = getStore().captureRoundScoringSession(ROUND_ID)!;
  expect(session.applyShape({ nine_type: 'full', holes_played: 6 }, new Map())).toBe(true);
  expect(getStore().holes).toHaveLength(9);
  expect(getStore().nineType).toBe('full');
  expect(getStore().holesPlayed).toBe(6);
  expect(scoredHoles(P1.id)).toEqual([1, 6]);
  expect(getStore().groupScorecards.get(P1.id)?.totalGross).toBe(8);
});


describe('C2a passive nullable current-source bridge', () => {
  async function prepareNullableCorrection() {
    const holes = create18Holes().map((h) => ({ ...h, par: 4 as const }));
    await getStore().initializeRound(ROUND_ID, [P1], holes, 'stroke', false, [], TEE_WHITE, 'none');
    const card = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({
      currentHole: 15,
      groupScorecards: new Map([
        [
          P1.id,
          {
            ...card,
            scores: { 1: { strokes: 4 }, 10: { strokes: 5 } },
            totalGross: 9,
            totalNet: 9,
            coursePar: 72,
            syncHoles: holes,
            syncGameType: 'stroke',
            syncNineType: 'full',
            syncHandicapSource: 'none',
            serverRevision: 3,
          },
        ],
      ]),
    });
    return getStore().captureRoundScoringSession(ROUND_ID)!;
  }
  it('refuses nullable default repair before state or accepted-revision mutation', async () => {
    const session = await prepareNullableCorrection();
    const before = getStore();
    expect(() =>
      session.applyShape({ nine_type: 'front9', holes_played: null }, new Map(), {
        scorecardId: cardId(P1.id),
        serverRevision: 7,
      })
    ).toThrow(expect.objectContaining({ kind: 'context_missing' }));
    expect(getStore()).toBe(before);
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject({
      coursePar: 72,
      syncNineType: 'full',
      serverRevision: 3,
      totalNet: 9,
    });
  });
  it('nullable shared-context repair updates real planned metadata and accepted revision', async () => {
    const session = await prepareNullableCorrection();
    expect(
      session.applyShape(
        { nine_type: 'front9', holes_played: null },
        new Map(),
        {
          scorecardId: cardId(P1.id),
          serverRevision: 7,
        },
        createRoundScoringContext(ROUND_ID, {})
      )
    ).toBe(true);
    const card = getStore().groupScorecards.get(P1.id)!;
    expect(card).toMatchObject({
      coursePar: 36,
      syncNineType: 'front9',
      serverRevision: 7,
      totalGross: 4,
      totalNet: 4,
      scores: { 1: { strokes: 4 } },
    });
    expect(card.syncHoles?.map((h) => h.number)).toEqual(range(1, 9));
    expect(getStore()).toMatchObject({ nineType: 'front9', holesPlayed: null, currentHole: 1 });
  });

  it('refuses live-only final N while server is NULL, preserving memory', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stableford', false, [], TEE_WHITE);
    const source = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({ groupScorecards: new Map([[P1.id, { ...source, holesPlayed: 3 }]]) });
    const current = getStore().groupScorecards;
    const session = getStore().captureRoundScoringSession(ROUND_ID)!;
    expect(() => session.applyShape({ nine_type: 'front9', holes_played: null }, new Map())).toThrow(expect.objectContaining({ kind: 'local_end_pending' }));
    expect(getStore().groupScorecards).toBe(current);
  });
  it('supplies original source and separate nullable target to the pure callback', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stableford', false, [], TEE_WHITE);
    const source = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({ currentHole: 15, groupScorecards: new Map([[P1.id, { ...source, syncNineType: 'full', scores: { 1: { strokes: 4 }, 10: { strokes: 5 } } }]]) });
    const rebuild = jest.fn((card: Scorecard, keep: ReadonlySet<number>) => ({ ...card,
      scores: Object.fromEntries(Object.entries(card.scores).filter(([n]) => keep.has(Number(n)))),
      totalGross: 4, totalNet: 4, coursePar: 36, syncHandicapSource: 'none' as const }));
    const session = getStore().captureRoundScoringSession(ROUND_ID)!;
    expect(session.applyShape({ nine_type: 'front9', holes_played: null }, new Map(), undefined, rebuild)).toBe(true);
    expect(rebuild).toHaveBeenCalledWith(expect.objectContaining({ syncNineType: 'full' }), expect.any(Set), { nine_type: 'front9', holes_played: null });
    expect(getStore().currentHole).toBe(1);
    expect(getStore().groupScorecards.get(P1.id)?.scores).toEqual({ 1: { strokes: 4 } });
  });
  it('new cards and atomic end descriptors capture current none while submission retains repaired frozen HI0', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_RED, 'none');
    expect(getStore().groupScorecards.get(P1.id)?.syncHandicapSource).toBe('none');
    await getStore().endRoundEarly(2);
    expect((persistRoundEarlyEnd as jest.Mock).mock.calls.at(-1)[4][0].syncHandicapSource).toBe('none');
    const source = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({ groupScorecards: new Map([[P1.id, { ...source, player: { ...P1, handicap: 44 },
      playerHandicap: 0, playerGender: 'female', coursePar: 72, teeData: TEE_RED,
      syncHoles: create18Holes(), syncGameType: 'stroke', syncNineType: 'full', syncHandicapSource: 'none' }]]) });
    await getStore().submitScorecards();
    expect((syncScorecard as jest.Mock).mock.calls.at(-1)[0]).toMatchObject({ playerHandicap: 0, playerGender: 'female', teeData: TEE_RED, syncHandicapSource: 'none' });
  });
  it('does not stamp the current source onto a fresh authoritative-ended historical placeholder', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_RED, 'none', new Map(), 'full', 1, 2);
    expect(getStore().groupScorecards.get(P1.id)?.syncHandicapSource).toBeUndefined();
  });

  it.each([0, -2, 12, null])('ended construction preserves recorded input %s and incomplete metadata rather than today’s profile', async hi => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_WHITE, 'calculated');
    const source = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({ holesPlayed: 2, handicapSource: 'profile', groupScorecards: new Map([[P1.id, { ...source,
      holesPlayed: 2, player: { ...P1, handicap: 44 }, playerHandicap: hi, playerGender: null,
      syncHandicapSource: 'calculated', teeData: TEE_RED, coursePar: undefined, syncHoles: undefined }]]) });
    await expect(getStore().submitScorecards()).rejects.toThrow('Failed to submit');
    expect(syncScorecard).not.toHaveBeenCalled();
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject({ playerHandicap: hi, syncHandicapSource: 'calculated', teeData: TEE_RED });
  });
  it('ordinary unended calculated submission retains legacy profile input selection', async () => {
    const player = { ...P1, handicap: 24, handicapIndex: 12 };
    await getStore().initializeRound(ROUND_ID, [player], create18Holes(), 'stroke', false, [], TEE_WHITE, 'calculated');
    await getStore().submitScorecards();
    expect((syncScorecard as jest.Mock).mock.calls.at(-1)[0]).toMatchObject({ playerHandicap: 24, syncHandicapSource: 'calculated' });
  });

  it('round-ended construction preserves an unmarked card’s source rather than stamping today’s setting', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_WHITE, 'calculated');
    const card = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({ holesPlayed: 2, handicapSource: 'profile', groupScorecards: new Map([[P1.id, { ...card, playerHandicap: 12, playerGender: null, syncHoles: create18Holes(), syncGameType: 'stroke', syncNineType: 'full', coursePar: 72, teeData: TEE_WHITE }]]) });
    await getStore().submitScorecards();
    expect((syncScorecard as jest.Mock).mock.calls.at(-1)[0].syncHandicapSource).toBe('calculated');
  });

});


describe('web blank-card source compatibility', () => {
  const originalOS = Platform.OS;
  beforeEach(() => Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' }));
  afterEach(() => Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS }));
  it('omits provisional source from new web memory and initial saved payload', async () => {
    await getStore().initializeRound(
      ROUND_ID,
      [P1],
      create18Holes(),
      'stroke',
      false,
      [],
      TEE_RED,
      'none'
    );
    const card = getStore().groupScorecards.get(P1.id)!;
    expect(card).not.toHaveProperty('syncHandicapSource');
    expect((saveScorecard as jest.Mock).mock.calls[0][0]).not.toHaveProperty('syncHandicapSource');
  });
  it('omits source from new web team-backfill cards and keeps existing entries', async () => {
    await getStore().initializeRound(
      ROUND_ID,
      [P1],
      create18Holes(),
      'stroke',
      false,
      [],
      TEE_RED,
      'none'
    );
    const recorded = {
      ...getStore().groupScorecards.get(P1.id)!,
      syncHandicapSource: 'calculated' as const,
    };
    useScorecardStore.setState({ groupScorecards: new Map([[P1.id, recorded]]) });
    (saveScorecard as jest.Mock).mockClear();
    await getStore().ensureTeamMemberScorecards([P1, P2]);
    expect(getStore().groupScorecards.get(P1.id)).toBe(recorded);
    expect(getStore().groupScorecards.get(P2.id)).not.toHaveProperty('syncHandicapSource');
    expect((saveScorecard as jest.Mock).mock.calls[0][0]).not.toHaveProperty('syncHandicapSource');
  });
  it('preserves a reused cached ended source on web', async () => {
    const cached = { ...cachedCard(P1, [1], 2), syncHandicapSource: 'calculated' as const };
    (getScorecardsByRound as jest.Mock).mockResolvedValue([cached]);
    await getStore().initializeRound(
      ROUND_ID,
      [P1],
      create18Holes(),
      'stroke',
      false,
      [],
      TEE_RED,
      'none'
    );
    expect(getStore().groupScorecards.get(P1.id)?.syncHandicapSource).toBe('calculated');
  });
  it('web none submission captures source and produces DHC0 with CR different from par', async () => {
    const player = { ...P1, handicap: 17 };
    const holes = create18Holes().map((h) => ({ ...h, par: 4 as const }));
    await getStore().initializeRound(
      ROUND_ID,
      [player],
      holes,
      'stroke',
      false,
      [],
      TEE_RED,
      'none'
    );
    await score(player.id, [1]);
    await getStore().submitScorecards();
    const payload = submittedPayload(player.id);
    expect(payload).toMatchObject({
      syncHandicapSource: 'none',
      playerHandicap: 17,
      coursePar: 72,
      totalNet: 4,
    });
    expect(calculateHandicapData(payload)).toMatchObject({
      dailyHandicapUsed: 0,
      gaHandicapUsed: 17,
      courseRatingUsed: 70,
    });
  });
});

describe('C2b atomic user end and current submission', () => {
  const start = async (source: 'calculated' | 'none' = 'calculated') => {
    await getStore().initializeRound(ROUND_ID, [{ ...P1, handicap: 24, handicapIndex: 12 }], create18Holes(), 'stroke', false, [], TEE_WHITE, source);
    await getStore().setPlayerScore(P1.id, 1, 4);
  };
  it('commits the complete calculated HI12 basis before postcommit save, not embedded profile24', async () => {
    await start();
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(async (...args) => {
      expect(args[4][0]).toMatchObject({ playerHandicap: 12, playerGender: null, coursePar: 72, syncGameType: 'stroke', syncHoles: create18Holes(), syncHandicapSource: 'calculated' });
    });
    await getStore().endRoundEarly(6);
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject({ playerHandicap: 12, player: { handicap: 24 } });
  });
  it('known-none atomic descriptor keeps absent HI and real context', async () => {
    await start('none');
    useScorecardStore.setState({ groupScorecards: new Map([[P1.id, { ...getStore().groupScorecards.get(P1.id)!, player: { ...P1, handicap: undefined }, playerHandicap: undefined }]]) });
    await getStore().endRoundEarly(6);
    expect((persistRoundEarlyEnd as jest.Mock).mock.calls[0][4][0]).toMatchObject({ syncHandicapSource: 'none', coursePar: 72, syncGameType: 'stroke', teeData: TEE_WHITE });
    expect((persistRoundEarlyEnd as jest.Mock).mock.calls[0][4][0].playerHandicap).toBeUndefined();
  });
  it('rejects missing real user-end context before committing marker', async () => {
    await start(); getStore().setSelectedTeeData(null);
    await expect(getStore().endRoundEarly(6)).rejects.toMatchObject({ kind: 'context_missing' });
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });
  it('ended retained edits, totals, submit and deliberate tee change keep recorded HI12', async () => {
    await start(); await getStore().endRoundEarly(6);
    useScorecardStore.setState({ handicapSource: 'profile' });
    await getStore().setPlayerScore(P1.id, 1, 5);
    const recorded = getStore().groupScorecards.get(P1.id)!;
    const expected = createRoundScoringContext(ROUND_ID, {})(recorded, new Set([1,2,3,4,5,6]), { nine_type: 'full', holes_played: 6 });
    expect(getStore().getPlayerTotals(P1.id).net).toBe(expected.totalNet);
    expect(recorded.totalNet).toBe(expected.totalNet);
    await getStore().setPlayerTee(P1.id, TEE_RED);
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject({ playerHandicap: 12, syncHandicapSource: 'calculated', teeData: TEE_RED });
    await getStore().submitScorecards();
    expect(submittedPayload(P1.id)).toMatchObject({ playerHandicap: 12, syncHandicapSource: 'calculated', teeData: TEE_RED });
  });
  it('submission refuses an unexplained incomplete terminal replacement while preserving CURRENT fields', async () => {
    await start();
    let release!: () => void;
    (saveScorecard as jest.Mock).mockImplementationOnce(() => new Promise<void>(r => { release = r; }));
    const submit = getStore().submitScorecards();
    for (let i=0;i<10;i++) await Promise.resolve();
    const current = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({ groupScorecards: new Map([[P1.id, { ...current, scores: { 1: { strokes: 8 } }, status: 'confirmed', submittedBy: 'newer' }]]) });
    const rejected = expect(submit).rejects.toThrow('Failed to submit');
    release(); await rejected;
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject({ scores: { 1: { strokes: 8 } }, status: 'confirmed', submittedBy: 'newer' });
    expect(syncScorecard).not.toHaveBeenCalled();
  });
  it('submission preserves a complete CURRENT terminal basis and newer metadata after a local save await', async () => {
    await start();
    let release!: () => void;
    (saveScorecard as jest.Mock).mockImplementationOnce(() => new Promise<void>(r => { release = r; }));
    const submit = getStore().submitScorecards();
    for (let i=0;i<10;i++) await Promise.resolve();
    const submittedAt = new Date('2026-10-01');
    const current = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({ groupScorecards: new Map([[P1.id, { ...current,
      scores: { 1: { strokes: 8 } }, status: 'confirmed', submittedAt, submittedBy: 'newer', serverRevision: 7,
      playerHandicap: 12, playerGender: null, teeData: TEE_WHITE, coursePar: 72,
      syncHoles: create18Holes(), syncNineType: 'full', syncGameType: 'stroke', syncHandicapSource: 'calculated',
    }]]) });
    release(); await submit;
    const expected = { scores: { 1: { strokes: 8 } }, totalGross: 8, status: 'confirmed', submittedAt,
      submittedBy: 'newer', playerHandicap: 12, syncHandicapSource: 'calculated', syncNineType: 'full' };
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject({ ...expected, serverRevision: 7 });
    expect(submittedPayload(P1.id)).toMatchObject({ ...expected, serverRevision: 7 });
  });
  it('ordinary online submission captures the CURRENT edited nine-hole card basis before completing it', async () => {
    await getStore().initializeRound(ROUND_ID, [{ ...P1, handicap: 14, gender: 'female' }], create18Holes(), 'stroke', false, [], TEE_WHITE, 'profile', new Map(), 'back9');
    await getStore().setPlayerScore(P1.id, 10, 4);
    let release!: () => void;
    (saveScorecard as jest.Mock).mockImplementationOnce(() => new Promise<void>(r => { release = r; }));
    const submit = getStore().submitScorecards();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    await getStore().setPlayerScore(P1.id, 10, 8);
    release(); await submit;
    const basis = {
      status: 'completed', scores: { 10: { strokes: 8 } }, totalGross: 8,
      teeData: TEE_WHITE, playerHandicap: 14, playerGender: 'female', coursePar: 36,
      syncHoles: create18Holes().filter(h => h.number >= 10), syncGameType: 'stroke', syncNineType: 'back9', syncHandicapSource: 'profile',
    };
    expect(getStore().groupScorecards.get(P1.id)).toMatchObject(basis);
    expect(submittedPayload(P1.id)).toMatchObject(basis);
  });
  it('offline submission queues current retained scores and terminal metadata after its save wait', async () => {
    const { getIsOnline } = require('@/services/offline/sync');
    await start(); await getStore().endRoundEarly(6);
    (getIsOnline as jest.Mock).mockReturnValue(false);
    let release!: () => void;
    (saveScorecard as jest.Mock).mockImplementationOnce(() => new Promise<void>(r => { release = r; }));
    const submit = getStore().submitScorecards();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    const current = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({ groupScorecards: new Map([[P1.id, { ...current, scores: { 1: { strokes: 8 } }, status: 'confirmed', submittedBy: 'newer' }]]) });
    release(); await submit;
    expect((queueScorecardSync as jest.Mock).mock.calls.at(-1)[0]).toMatchObject({ scores: { 1: { strokes: 8 } }, status: 'confirmed', submittedBy: 'newer', playerHandicap: 12 });
    (getIsOnline as jest.Mock).mockReturnValue(true);
  });
});

describe('C2b prepared writer provenance', () => {
  it('backfill cancelled by a closed gate restarts from current ended context after reopening', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_WHITE);
    let release!: () => void;
    let entered!: () => void;
    const ready = new Promise<void>(r => { entered = r; });
    const transition = withRoundPersistenceTransition(ROUND_ID, { nine_type: 'full', holes_played: 6 }, async () => {
      entered(); await new Promise<void>(r => { release = r; });
    }, () => { useScorecardStore.setState({ holesPlayed: 6 }); });
    await ready;
    const backfill = getStore().ensureTeamMemberScorecards([P2]);
    await Promise.resolve();
    expect(getStore().groupScorecards.has(P2.id)).toBe(false);
    release(); await transition; await backfill;
    expect(getStore().groupScorecards.get(P2.id)).toMatchObject({ holesPlayed: 6, syncHoles: create18Holes(), teeData: TEE_WHITE });
  });
  it('initialization captures before cached read and refuses late saveHoles/install after a transition', async () => {
    let release!: (cards: Scorecard[]) => void;
    (getScorecardsByRound as jest.Mock).mockImplementationOnce(() => new Promise<Scorecard[]>(r => { release = r; }));
    const init = getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_WHITE);
    await withRoundPersistenceTransition(ROUND_ID, { nine_type: 'full', holes_played: 6 }, async () => undefined, () => undefined);
    release([]);
    await expect(init).rejects.toThrow(/source changed|source.*changed/i);
    expect(saveHoles).not.toHaveBeenCalled(); expect(getStore().isInitialized).toBe(false);
  });
  it('late backfill never replaces current cards after a session reset', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_WHITE);
    let release!: () => void;
    (saveScorecard as jest.Mock).mockImplementationOnce(() => new Promise<void>(r => { release = r; }));
    const backfill = getStore().ensureTeamMemberScorecards([P2]);
    for (let i=0;i<10;i++) await Promise.resolve();
    getStore().resetRound(); release(); await backfill;
    expect(getStore().currentRoundId).toBeNull(); expect(getStore().groupScorecards.size).toBe(0);
  });
});

it('C2b submission waiting through transition retains completion intent and reparses current ended scores/context', async () => {
  await getStore().initializeRound(ROUND_ID, [{ ...P1, handicap: 24, handicapIndex: 12 }], create18Holes(), 'stroke', false, [], TEE_WHITE, 'calculated');
  let release!: () => void; let entered!: () => void;
  const ready = new Promise<void>(r => { entered = r; });
  const transition = withRoundPersistenceTransition(ROUND_ID, { nine_type: 'full', holes_played: 6 }, async () => { entered(); await new Promise<void>(r => { release = r; }); }, () => {
    const current = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({ holesPlayed: 6, groupScorecards: new Map([[P1.id, { ...current, holesPlayed: 6,
      scores: { 1: { strokes: 7 } }, playerHandicap: 12, playerGender: null, teeData: TEE_WHITE,
      syncHoles: create18Holes(), coursePar: 72, syncGameType: 'stroke', syncNineType: 'full', syncHandicapSource: 'calculated' }]]) });
  });
  await ready;
  const submit = getStore().submitScorecards(); release(); await transition; await submit;
  expect(submittedPayload(P1.id)).toMatchObject({ status: 'completed', playerHandicap: 12, holesPlayed: 6, scores: { 1: { strokes: 7 } } });
  expect(getStore().groupScorecards.get(P1.id)).toMatchObject({ status: 'completed', playerHandicap: 12, holesPlayed: 6, scores: { 1: { strokes: 7 } } });
});

it('C2b user end rechecks CURRENT submission eligibility after admitted writers drain', async () => {
  const { withRoundPersistence, captureRoundPersistenceSource } = require('@/services/offline/roundPersistenceBarrier');
  await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_WHITE);
  let release!: () => void;
  const submission = withRoundPersistence(captureRoundPersistenceSource(ROUND_ID), async () => {
    await new Promise<void>(r => { release = r; });
    const current = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({ groupScorecards: new Map([[P1.id, { ...current, status: 'completed', submittedAt: new Date() }]]) });
  });
  const ending = getStore().endRoundEarly(6);
  release(); await submission;
  await expect(ending).rejects.toThrow(/submitted|completed/);
  expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  expect(getStore().holesPlayed).toBeNull();
});


describe('B6b-2 public owned producer', () => {
  beforeEach(() => {
    (getSyncAuthUserId as jest.Mock).mockReturnValue('owner');
  });
  it.each(['owner', 'session'])(
    'refuses %s replacement while public end waits for coordinator',
    async (change) => {
      await getStore().initializeRound(
        ROUND_ID,
        [P1],
        create18Holes(),
        'stroke',
        false,
        [],
        TEE_WHITE,
        'none'
      );
      let entered!: () => void;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const ready = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const held = withRoundScoringWrite(ROUND_ID, async () => {
        entered();
        await gate;
      });
      await ready;
      const ending = getStore().endRoundEarly(2);
      const refusal = expect(ending).rejects.toThrow(/account|changed|unloaded/i);
      if (change === 'owner') (getSyncAuthUserId as jest.Mock).mockReturnValue('replacement');
      else getStore().resetRound();
      release();
      await held;
      await refusal;
      expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
      expect(requestSyncDrain).not.toHaveBeenCalled();
    }
  );
  it.each(['owner', 'session'])(
    'requests committed owned work before postcommit %s refusal',
    async (change) => {
      await getStore().initializeRound(
        ROUND_ID,
        [P1],
        create18Holes(),
        'stroke',
        false,
        [],
        TEE_WHITE,
        'none'
      );
      (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(async () => {
        if (change === 'owner') (getSyncAuthUserId as jest.Mock).mockReturnValue('replacement');
        else getStore().resetRound();
      });
      await expect(getStore().endRoundEarly(2)).rejects.toThrow(/account|changed|unloaded/i);
      expect(requestSyncDrain).toHaveBeenCalledWith('round-end-early');
      expect(getStore().holesPlayed).toBeNull();
      expect((persistRoundEarlyEnd as jest.Mock).mock.calls[0][5]).toEqual({
        intent: { userId: 'owner' },
      });
    }
  );
  it('leaves state unchanged and requests no drain on atomic rollback', async () => {
    await getStore().initializeRound(
      ROUND_ID,
      [P1],
      create18Holes(),
      'stroke',
      false,
      [],
      TEE_WHITE,
      'none'
    );
    (persistRoundEarlyEnd as jest.Mock).mockRejectedValueOnce(
      new Error('intent collision rollback')
    );
    await expect(getStore().endRoundEarly(2)).rejects.toThrow('intent collision rollback');
    expect(getStore().holesPlayed).toBeNull();
    expect(requestSyncDrain).not.toHaveBeenCalled();
  });
  it('keeps local-only ends intent-free and refuses missing auth for server-backed cards', async () => {
    await getStore().initializeRound(
      ROUND_ID,
      [P1],
      create18Holes(),
      'stroke',
      true,
      [],
      TEE_WHITE,
      'none'
    );
    await getStore().endRoundEarly(2);
    expect((persistRoundEarlyEnd as jest.Mock).mock.calls[0]).toHaveLength(5);
    getStore().resetRound();
    (persistRoundEarlyEnd as jest.Mock).mockClear();
    await getStore().initializeRound(
      ROUND_ID,
      [P1],
      create18Holes(),
      'stroke',
      false,
      [],
      TEE_WHITE,
      'none'
    );
    (getSyncAuthUserId as jest.Mock).mockReturnValue(null);
    await expect(getStore().endRoundEarly(2)).rejects.toThrow(/owner/i);
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });
  it('refuses JS precheck then discard during native transaction acquisition without reinserting ownership', async () => {
    await getStore().initializeRound(
      ROUND_ID,
      [P1],
      create18Holes(),
      'stroke',
      false,
      [],
      TEE_WHITE,
      'none'
    );
    await getStore().endRoundEarly(2);
    const existing = {
      type: 'round',
      action: 'update',
      data: { id: ROUND_ID, action: 'end_early', holesPlayed: 2, userId: 'owner' },
    };
    (getPendingSyncByEntityKey as jest.Mock).mockResolvedValue(existing);
    let entered!: () => void;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const txn = {
      getFirstAsync: jest.fn(async () => null),
      runAsync: jest.fn(async () => ({ changes: 1 })),
    };
    (getDb as jest.Mock).mockImplementationOnce(async () => {
      entered();
      await gate;
      return {
        withExclusiveTransactionAsync: async (work: (transaction: typeof txn) => Promise<void>) =>
          work(txn),
      };
    });
    (persistRoundEarlyEnd as jest.Mock).mockImplementationOnce(persistNativeEarlyEnd);
    const ending = getStore().endRoundEarly(2);
    const refusal = expect(ending).rejects.toThrow(/owned.*intent/i);
    await ready; // Native queue is now absent, despite the earlier successful JS precheck.
    release();
    await refusal;
    expect(txn.runAsync).not.toHaveBeenCalled();
    expect(getStore().holesPlayed).toBe(2);
  });
  it('preserves a matching same-owner same-N retained intent instead of creating new ownership', async () => {
    await getStore().initializeRound(
      ROUND_ID,
      [P1],
      create18Holes(),
      'stroke',
      false,
      [],
      TEE_WHITE,
      'none'
    );
    await getStore().endRoundEarly(2);
    const retained = {
      type: 'round',
      action: 'update',
      status: 'failed',
      retryCount: 2,
      revision: 4,
      data: { id: ROUND_ID, action: 'end_early', holesPlayed: 2, userId: 'owner' },
    };
    (getPendingSyncByEntityKey as jest.Mock).mockResolvedValue(retained);
    await getStore().endRoundEarly(2);
    expect(retained).toMatchObject({ status: 'failed', retryCount: 2, revision: 4 });
    expect((persistRoundEarlyEnd as jest.Mock).mock.calls.at(-1)[5]).toEqual({
      intent: { userId: 'owner' },
      requireExistingIntent: true,
    });
  });
  it('refuses marker-only ownership adoption by a later account', async () => {
    await getStore().initializeRound(
      ROUND_ID,
      [P1],
      create18Holes(),
      'stroke',
      false,
      [],
      TEE_WHITE,
      'none'
    );
    await score(P1.id, [1, 2]);
    const card = getStore().groupScorecards.get(P1.id)!;
    useScorecardStore.setState({
      holesPlayed: 2,
      groupScorecards: new Map([[P1.id, { ...card, holesPlayed: 2 }]]),
    });
    (getPendingSyncByEntityKey as jest.Mock).mockResolvedValue(null);
    await expect(getStore().endRoundEarly(2)).rejects.toThrow(/owned.*intent/i);
    expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  });
  it('commits captured owner together with marker, trim and complete basis, then requests drain', async () => {
    await getStore().initializeRound(
      ROUND_ID,
      [P1],
      create18Holes(),
      'stroke',
      false,
      [],
      TEE_WHITE,
      'none'
    );
    await score(P1.id, [1, 2]);
    await getStore().endRoundEarly(2);
    expect(persistRoundEarlyEnd).toHaveBeenCalledWith(
      ROUND_ID,
      2,
      'full',
      [1, 2],
      [
        expect.objectContaining({
          syncHandicapSource: 'none',
          syncHoles: expect.any(Array),
          coursePar: 72,
          syncGameType: 'stroke',
        }),
      ],
      { intent: { userId: 'owner' } }
    );
    expect(requestSyncDrain).toHaveBeenCalledWith('round-end-early');
    expect((persistRoundEarlyEnd as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (requestSyncDrain as jest.Mock).mock.invocationCallOrder[0]
    );
  });
});
