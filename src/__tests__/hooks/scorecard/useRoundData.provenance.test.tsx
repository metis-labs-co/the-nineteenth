import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useRoundData } from '@/hooks/scorecard/useRoundData';
import { useScorecardStore } from '@/store/scorecardStore';
import { saveScorecard, persistRoundEarlyEnd } from '@/services/offline/database';
import { syncScorecard } from '@/services/offline/sync';
import { create18Holes, createTestPlayer } from '../../utils/testFixtures';

jest.mock('@/services/offline/database', () => ({
  saveScorecard: jest.fn(async () => undefined),
  saveHoleScore: jest.fn(async () => undefined),
  saveHoles: jest.fn(async () => undefined),
  getScorecardsByRound: jest.fn(async () => []),
  getHoles: jest.fn(async () => []),
  getPendingSyncs: jest.fn(async () => []),
  getFailedSyncs: jest.fn(async () => []),
  getFailedSyncCountForRound: jest.fn(async () => 0),
  markScorecardAsSynced: jest.fn(async () => undefined),
  persistRoundEarlyEnd: jest.fn(async () => undefined),
  persistAuthoritativeRoundShape: jest.fn(async () => ({ cards: [], priorLocalShapes: new Map() })),
}));
jest.mock('@/services/offline/sync', () => ({
  setScorecardConflictResolver: jest.fn(),
  syncScorecard: jest.fn(async () => ({ serverRevision: 4 })),
  queueScorecardSync: jest.fn(async () => undefined),
  getIsOnline: jest.fn(() => true),
  subscribeSyncState: jest.fn(),
  subscribeScorecardSynced: jest.fn(),
}));
jest.mock('@/services/offline/sync/networkState', () => ({
  getSyncAuthUserId: jest.fn(() => 'owner'),
}));
jest.mock('@/services/offline/sync/drain', () => ({ requestSyncDrain: jest.fn() }));
jest.mock('@/store/scorecardSyncDebounce', () => ({
  debouncedQueueScorecardSync: jest.fn(),
  flushPendingScorecardSyncs: jest.fn(),
}));
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: async () => ({ data: mockRemote, error: null }),
      };
      return chain;
    }),
  },
}));
jest.mock('@/hooks/scorecard/useRoundMetadata', () => ({ useRoundMetadata: () => mockMetadata }));
jest.mock('@/hooks/scorecard/useRoundPlayers', () => ({ useRoundPlayers: () => mockPlayers }));
jest.mock('@/hooks/scorecard/useRoundCourse', () => ({ useRoundCourse: () => mockCourse }));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({ useRoundTeams: () => mockTeams }));
jest.mock('@/hooks/scorecard/useRoundScoringPairs', () => ({
  useRoundScoringPairs: () => mockPairs,
}));
jest.mock('@/services/diagnostics', () => ({ pushDiagnostic: jest.fn() }));
jest.mock('@/utils/debugLogger', () => {
  const logger = { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { storeLogger: logger, roundDataLogger: logger, createModuleLogger: () => logger };
});

const holes = create18Holes();
const player = {
  ...createTestPlayer({ id: '11111111-1111-4111-a111-111111111111', handicap: 24 }),
  handicapIndex: 12,
};
const tee = { name: 'White', color: 'white', slopeRating: 113, courseRating: 72 };
const ready = { isLoading: false, error: null, refetch: jest.fn() };
const mockMetadata = {
  ...ready,
  data: {
    nineType: 'full',
    holesPlayed: null as number | null,
    gameType: 'stroke',
    handicapSource: 'calculated',
    selectedTeeData: tee,
    playerTeeMap: new Map(),
    roundStatus: 'in-progress',
  },
};
const mockPlayers = { ...ready, players: [player] };
const mockCourse = { ...ready, holes, startHole: 1 };
const mockTeams = { ...ready, teams: [] };
const mockPairs = { ...ready, playersToScore: [], scoringPairsEnabled: false };
let mockRemote: unknown[] = [];
let sequence = 0;

beforeEach(() => {
  jest.clearAllMocks();
  useScorecardStore.getState().resetRound();
  mockRemote = [];
});

it.each([true, false])(
  'ended initialization then actual hydration (remote scores=%s) cannot acquire today’s HI for totals or submission',
  async (hasScores) => {
    const roundId = `historical-scaffold-${++sequence}`;
    mockMetadata.data.holesPlayed = 6;
    await useScorecardStore
      .getState()
      .initializeRound(
        roundId,
        [player],
        holes,
        'stroke',
        false,
        [],
        tee,
        'calculated',
        new Map(),
        'full',
        1,
        6
      );
    mockRemote = [
      {
        player_id: player.id,
        scores: hasScores ? { 1: { strokes: 5 } } : {},
        status: 'in-progress',
        revision: 3,
        total_gross: 5,
        total_net: 5,
      },
    ];
    renderHook(() => useRoundData({ roundId, competitionId: '' }));
    await waitFor(() =>
      expect(useScorecardStore.getState().groupScorecards.get(player.id)?.serverRevision).toBe(3)
    );
    expect(useScorecardStore.getState().groupScorecards.get(player.id)?.scores).toEqual(
      hasScores ? { 1: { strokes: 5 } } : {}
    );
    expect(() => useScorecardStore.getState().getPlayerTotals(player.id)).toThrow(
      expect.objectContaining({ kind: 'context_missing' })
    );
    const savesBeforeSubmit = (saveScorecard as jest.Mock).mock.calls.length;
    await act(async () => {
      await expect(useScorecardStore.getState().submitScorecards()).rejects.toThrow(
        'Failed to submit'
      );
    });
    expect(saveScorecard).toHaveBeenCalledTimes(savesBeforeSubmit);
    expect(syncScorecard).not.toHaveBeenCalled();
  }
);

it('fresh unended none remains live after an empty revision handshake, local scores and end', async () => {
  const roundId = `live-empty-handshake-${++sequence}`;
  mockMetadata.data.holesPlayed = null;
  await useScorecardStore
    .getState()
    .initializeRound(
      roundId,
      [{ ...player, handicap: undefined, handicapIndex: undefined }],
      holes,
      'stroke',
      false,
      [],
      tee,
      'none'
    );
  mockRemote = [{ player_id: player.id, scores: {}, status: 'in-progress', revision: 3 }];
  renderHook(() => useRoundData({ roundId, competitionId: '' }));
  await waitFor(() =>
    expect(useScorecardStore.getState().groupScorecards.get(player.id)?.serverRevision).toBe(3)
  );
  await act(async () => {
    await useScorecardStore.getState().setPlayerScore(player.id, 1, 5);
    await useScorecardStore.getState().endRoundEarly(6);
  });
  expect(useScorecardStore.getState().groupScorecards.get(player.id)).toMatchObject({
    holesPlayed: 6,
    syncHandicapSource: 'none',
    totalGross: 5,
    totalNet: 5,
  });
  expect(
    useScorecardStore.getState().groupScorecards.get(player.id)?.playerHandicap
  ).toBeUndefined();
});

it('ongoing unended remote resume preserves its proven live origin through local scoring and end', async () => {
  const roundId = `remote-history-${++sequence}`;
  mockMetadata.data.holesPlayed = null;
  await useScorecardStore
    .getState()
    .initializeRound(roundId, [player], holes, 'stroke', false, [], tee, 'calculated');
  mockRemote = [
    { player_id: player.id, scores: { 1: { strokes: 5 } }, status: 'in-progress', revision: 3 },
  ];
  renderHook(() => useRoundData({ roundId, competitionId: '' }));
  await waitFor(() =>
    expect(useScorecardStore.getState().groupScorecards.get(player.id)?.serverRevision).toBe(3)
  );
  const source = useScorecardStore.getState().groupScorecards.get(player.id)!;
  expect(
    useScorecardStore.getState().captureRoundScoringSession(roundId)?.getLiveContext(source)
  ).toMatchObject({ handicapSource: 'calculated', player, holes, teeData: tee });
  await act(async () => {
    await useScorecardStore.getState().setPlayerScore(player.id, 2, 6);
    await useScorecardStore.getState().endRoundEarly(6);
  });
  expect(useScorecardStore.getState().groupScorecards.get(player.id)).toMatchObject({
    holesPlayed: 6,
    playerHandicap: 12,
    syncHandicapSource: 'calculated',
    scores: { 1: { strokes: 5 }, 2: { strokes: 6 } },
    totalGross: 11,
    totalNet: 10,
  });
});

it('terminal remote scoring replacement revokes its prior live origin and refuses a new user end', async () => {
  const roundId = `remote-terminal-${++sequence}`;
  mockMetadata.data.holesPlayed = null;
  await useScorecardStore
    .getState()
    .initializeRound(roundId, [player], holes, 'stroke', false, [], tee, 'calculated');
  mockRemote = [
    { player_id: player.id, scores: { 1: { strokes: 5 } }, status: 'completed', revision: 3 },
  ];
  renderHook(() => useRoundData({ roundId, competitionId: '' }));
  await waitFor(() =>
    expect(useScorecardStore.getState().groupScorecards.get(player.id)?.serverRevision).toBe(3)
  );
  const source = useScorecardStore.getState().groupScorecards.get(player.id)!;
  expect(
    useScorecardStore.getState().captureRoundScoringSession(roundId)?.getLiveContext(source)
  ).toBeUndefined();
  await act(async () => {
    await expect(useScorecardStore.getState().endRoundEarly(6)).rejects.toThrow('submitted');
  });
  expect(persistRoundEarlyEnd).not.toHaveBeenCalled();
  expect(useScorecardStore.getState().holesPlayed).toBeNull();
});
