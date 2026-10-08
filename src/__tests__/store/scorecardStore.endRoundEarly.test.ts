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
import { createTestPlayer, create18Holes } from '../utils/testFixtures';
import type { Player, Scorecard } from '@/types';
import {
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

const getStore = () => useScorecardStore.getState();
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

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
