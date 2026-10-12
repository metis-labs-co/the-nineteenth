/**
 * Scorecard store — roster edits (round options menu).
 * Mock block copied from scorecardStore.endRoundEarly.test.ts.
 * @see docs/superpowers/specs/2026-10-12-round-options-menu-design.md §2
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
  deleteScorecard,
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

// deleteScorecard is imported for Task 5 (removal tests); referenced so lint stays quiet.
void deleteScorecard;

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
