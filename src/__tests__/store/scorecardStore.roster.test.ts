/**
 * Scorecard store — roster edits (round options menu).
 * Mock block copied from scorecardStore.endRoundEarly.test.ts.
 * @see docs/superpowers/specs/2026-10-12-round-options-menu-design.md §2
 */

import { useScorecardStore } from '@/store/scorecardStore';
import { createTestPlayer, create18Holes } from '../utils/testFixtures';
import type { Player, TeeBox } from '@/types';
import {
  saveScorecard,
  persistRoundEarlyEnd,
  persistAuthoritativeRoundShape,
  getHoles,
  getScorecardsByRound,
  deleteHoleScoresForCards,
  getPendingSyncByEntityKey,
  deleteScorecard,
} from '@/services/offline/database';
import { shapeHoleNumbers } from '@/services/rounds/roundScoringWrite';

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
  deleteScorecard: jest.fn(() => Promise.resolve()),
  markScorecardsAsSynced: jest.fn(() => Promise.resolve()),
  markScorecardAsSynced: jest.fn(() => Promise.resolve()),
  getFailedSyncCountForRound: jest.fn(() => Promise.resolve(0)),
}));

jest.mock('@/services/offline/sync', () => {
  class ScorecardConflictError extends Error {
    readonly serverRevision = 0;
  }
  return {
    setScorecardConflictResolver: jest.fn(),
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

const TEE_WHITE: TeeBox = { name: 'White', color: 'white', slopeRating: 113, courseRating: 72 };

let mockOwnedIntent: unknown = null;
const getStore = () => useScorecardStore.getState();
const cardId = (playerId: string) => `scorecard-${ROUND_ID}-${playerId}`;
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

describe('characterization: ensureTeamMemberScorecards on a standalone round', () => {
  it('adds a blank in-progress card for a non-team player and persists it', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_WHITE);
    (saveScorecard as jest.Mock).mockClear();

    await getStore().ensureTeamMemberScorecards([P2]);

    const card = getStore().groupScorecards.get(P2.id);
    expect(card).toMatchObject({ id: cardId(P2.id), playerId: P2.id, scores: {}, status: 'in-progress' });
    expect(getStore().currentPlayers.map((p) => p.id)).toEqual([P1.id, P2.id]);
    expect(saveScorecard).toHaveBeenCalledWith(expect.objectContaining({ id: cardId(P2.id) }), expect.anything());
  });

  it('is idempotent for a player who already has a card', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE);
    const before = getStore().groupScorecards.get(P2.id);
    await getStore().ensureTeamMemberScorecards([P2]);
    expect(getStore().groupScorecards.get(P2.id)).toBe(before);
  });

  it('gives the added card the same isStandalone as the existing group card (inference lock)', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', true, [], TEE_WHITE);
    expect(getStore().groupScorecards.get(P1.id)?.isStandalone).toBe(true);

    await getStore().ensureTeamMemberScorecards([P2]);

    expect(getStore().groupScorecards.get(P2.id)?.isStandalone).toBe(true);
  });
});

describe('removePlayerFromRound', () => {
  it('deletes the local card and drops the player from the store', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE);
    useScorecardStore.setState({ allowedPlayerIds: [P1.id, P2.id] });

    await getStore().removePlayerFromRound(P2.id);

    expect(deleteScorecard).toHaveBeenCalledWith(cardId(P2.id));
    expect(getStore().groupScorecards.has(P2.id)).toBe(false);
    expect(getStore().currentPlayers.map((p) => p.id)).toEqual([P1.id]);
    expect(getStore().allowedPlayerIds).toEqual([P1.id]);
  });

  it('re-adding after removal creates a fresh blank card (Review Focus #2)', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE);
    await getStore().setPlayerScore(P2.id, 1, 5);
    await getStore().removePlayerFromRound(P2.id);
    (getScorecardsByRound as jest.Mock).mockResolvedValue([]); // SQLite card is gone

    await getStore().ensureTeamMemberScorecards([P2]);

    expect(getStore().groupScorecards.get(P2.id)?.scores).toEqual({});
  });

  it('is a no-op for an unknown player', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_WHITE);
    await getStore().removePlayerFromRound('nobody');
    expect(deleteScorecard).not.toHaveBeenCalled();
    expect(getStore().currentPlayers).toHaveLength(1);
  });

  it('removing a scored player with one other left keeps that card and the roster views consistent', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE);
    useScorecardStore.setState({ allowedPlayerIds: [P1.id, P2.id] });
    await getStore().setPlayerScore(P1.id, 1, 4);
    await getStore().setPlayerScore(P2.id, 1, 5);
    const remaining = getStore().groupScorecards.get(P1.id);

    await getStore().removePlayerFromRound(P2.id);

    const { currentPlayers, groupScorecards, allowedPlayerIds } = getStore();
    expect(groupScorecards.get(P1.id)).toBe(remaining);
    expect(currentPlayers.map((p) => p.id)).toEqual([P1.id]);
    expect([...groupScorecards.keys()]).toEqual([P1.id]);
    expect(allowedPlayerIds).toEqual([P1.id]);
    expect(getStore().isHoleComplete(1)).toBe(true);
    expect(getStore().isHoleComplete(2)).toBe(false);
  });
});
