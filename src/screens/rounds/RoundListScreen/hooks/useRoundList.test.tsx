import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRoundList } from './useRoundList';
import { useHomeData } from '@/hooks/home/useHomeData';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { HoleScore, TeeBox } from '@/types/database/base';

// Approved seams: real round-list query/output and its real Home consumer.
// Only the database and unrelated Home data sources are replaced.
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (table: string) => mockQuery(table) },
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'sam' }, player: { id: 'sam', name: 'Sam' } }),
}));
jest.mock('@/context/SubscriptionContext', () => ({
  useSubscriptionContext: () => ({ limits: { maxRoundsPlayed: 20 } }),
}));
jest.mock('@/services/offline/dao/ScorecardDAO', () => ({
  getHolesCompletedByRounds: async () => new Map(),
}));
jest.mock('@/hooks/competitions/queries', () => ({ useCompetitions: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/leagues/queries', () => ({ useLeagues: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/player/queries', () => ({ usePlayer: () => ({ data: { handicap: 20 }, refetch: jest.fn() }) }));
jest.mock('@/hooks/player', () => ({ useHandicapHistory: () => ({ data: null, refetch: jest.fn() }) }));
jest.mock('@/hooks/playerStatistics/queries', () => ({ usePlayerStatistics: () => ({ data: null, refetch: jest.fn() }) }));
jest.mock('@/hooks/achievements/queries', () => ({
  useAchievementProgress: () => ({ data: [], refetch: jest.fn() }),
  useAchievementDefinitions: () => ({ data: [] }),
  useAchievementSummary: () => ({ data: null }),
}));
jest.mock('@/hooks/friends', () => ({ useFriends: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/notifications/queries', () => ({ useUnreadNotificationCount: () => ({ data: 0, refetch: jest.fn() }) }));
jest.mock('@/hooks/queries/useBag', () => ({ useBag: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/queries/useHasCreatedRound', () => ({ useHasCreatedRound: () => ({ data: false, refetch: jest.fn() }) }));
jest.mock('@/hooks/home/usePendingActions', () => ({ usePendingActions: () => ({ actions: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/home/useInProgressRounds', () => ({ useInProgressRounds: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/home/useUpcomingRounds', () => ({ useUpcomingRounds: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/store/devFlagsStore', () => ({ useDevFlagsStore: () => false }));

const TEE: TeeBox = { name: 'White', color: 'white', courseRating: 72, slopeRating: 125 };
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const scores = (holes: number[], strokes: number): Record<string, HoleScore> =>
  Object.fromEntries(holes.map((n) => [String(n), { strokes }]));

function round(id: string, overrides = {}) {
  return {
    id, round_number: 1, game_type: 'stableford', is_team_round: false,
    status: 'completed', date: '2026-10-07', tee_time: null, nine_type: 'full',
    holes_played: null, handicap_source: 'profile', selected_tee: TEE,
    courses: { id: 'course', name: 'Course', holes: create18Holes(), club: null },
    ...overrides,
  };
}
function card(roundId: string, playerId = 'sam', overrides = {}) {
  return {
    id: `${roundId}-${playerId}`, round_id: roundId, player_id: playerId,
    scores: scores(range(1, 18), 5), total_gross: 90, total_net: 81,
    total_points: 13, ga_handicap_used: 10, daily_handicap_used: 9,
    handicap_differential: null, status: 'completed',
    player: { id: playerId, name: playerId === 'sam' ? 'Sam' : 'Bob', photo_url: null,
      handicap: 20, handicap_index: null, gender: null },
    ...overrides,
  };
}
type RoundRow = ReturnType<typeof round>;
let mockOwned: RoundRow[];
let mockInvited: RoundRow[];
let mockCompetition: RoundRow[];
let mockCards: ReturnType<typeof card>[];

function mockQuery(table: string) {
  let selection = '';
  let head = false;
  const filters = new Map<string, unknown>();
  const project = (row: RoundRow) => {
    // Model PostgREST projection: an unselected marker never reaches the hook.
    const { holes_played, ...rest } = row;
    return selection.includes('holes_played') ? { ...rest, holes_played } : rest;
  };
  const response = () => {
    if (head) return { count: 3, data: null, error: null };
    let data: unknown[] = [];
    if (table === 'rounds') data = (filters.has('competition_id') ? mockCompetition : mockOwned).map(project);
    if (table === 'round_players' && selection.includes('round:rounds')) data = mockInvited.map((r) => ({ round: project(r) }));
    if (table === 'competition_players') data = [{ competition_id: 'competition' }];
    if (table === 'scorecards') data = mockCards;
    return { data, error: null };
  };
  const builder = {
    select(value: string, options?: { head?: boolean }) { selection = value; head = !!options?.head; return builder; },
    eq(key: string, value: unknown) { filters.set(key, value); return builder; },
    neq() { return builder; },
    is() { return builder; },
    in(key: string, value: unknown) { filters.set(key, value); return builder; },
    order() { return builder; },
    then(resolve: (value: ReturnType<typeof response>) => unknown) { return Promise.resolve(response()).then(resolve); },
  };
  return builder;
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  mockOwned = [round('owner')];
  mockInvited = [round('participant')];
  mockCompetition = [round('competition', { competition_id: 'competition', competition: { id: 'competition', name: 'Medal' } })];
  mockCards = ['owner', 'participant', 'competition'].map((id) => card(id));
});

describe('useRoundList query branches — characterization', () => {
  it('includes owned, invited and accepted competition rounds with ordinary stored snapshots', async () => {
    const { result } = renderHook(useRoundList, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rounds?.history).toHaveLength(3));
    expect(result.current.roundsPlayedCount).toBe(3);
    for (const row of result.current.rounds!.history) {
      expect(row.totalHoles).toBe(18);
      expect(row.userScore).toMatchObject({ totalGross: 90, totalNet: 81, totalPoints: 13, dailyHandicap: 9, hasScorecard: true });
    }
    expect(result.current.rounds!.history.find((r) => r.id === 'competition')).toMatchObject({ isStandalone: false, competition: { name: 'Medal' }, players: [{ id: 'sam', name: 'Sam' }] });
  });

  it('keeps stored-total fallback when course data is missing', async () => {
    mockOwned = [round('owner', { courses: null })];
    const { result } = renderHook(useRoundList, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rounds?.history).toHaveLength(3));
    expect(result.current.rounds!.history.find((r) => r.id === 'owner')?.userScore).toMatchObject({ totalGross: 90, totalNet: 81, totalPoints: 13, dailyHandicap: 9 });
  });

  it('settles an ordinary front-nine match from the winner and user perspectives', async () => {
    mockOwned = [round('owner', { nine_type: 'front9', game_type: 'match-play' })];
    mockCards = [
      card('owner', 'sam', { scores: scores(range(1, 9), 4), daily_handicap_used: 0 }),
      card('owner', 'bob', { scores: { ...scores(range(1, 9), 4), '8': { strokes: 5 }, '9': { strokes: 5 } }, daily_handicap_used: 0 }),
    ];
    const { result } = renderHook(useRoundList, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rounds?.history).toHaveLength(3));
    expect(result.current.rounds!.history.find((r) => r.id === 'owner')).toMatchObject({ winner: { name: 'Sam', margin: '2 UP' }, userScore: { matchResult: { won: true, margin: '2 UP' } } });
  });

  it('Home receives the most recent ordinary round through the real list hook', async () => {
    mockOwned = [round('owner', { date: '2026-10-09' })];
    const { result } = renderHook(useHomeData, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.lastRound?.id).toBe('owner'));
    expect(result.current.lastRound?.userScore).toMatchObject({ totalGross: 90, totalNet: 81, totalPoints: 13 });
  });
});

describe('useRoundList planned and retained data', () => {
  it('forwards markers and planned nine totals from every select and computes retained user/winner totals', async () => {
    mockOwned = [round('owner', { nine_type: 'front9', holes_played: 6 })];
    mockInvited = [round('participant', { nine_type: 'back9', holes_played: 6, game_type: 'stroke', handicap_source: 'none' })];
    mockCompetition = [round('competition', { nine_type: 'front9', competition_id: 'competition', competition: { id: 'competition', name: 'Medal' } })];
    mockCards = [
      card('owner', 'sam', { scores: scores(range(1, 7), 5) }),
      card('owner', 'bob', { scores: scores(range(1, 7), 6) }),
      card('participant', 'sam', { scores: scores(range(10, 16), 4), ga_handicap_used: 0, daily_handicap_used: 0 }),
      card('participant', 'bob', { scores: scores(range(10, 16), 5), ga_handicap_used: 0, daily_handicap_used: 0 }),
      card('competition', 'sam', { scores: scores(range(1, 9), 5) }),
    ];
    const { result } = renderHook(useRoundList, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rounds?.history).toHaveLength(3));
    const rows = result.current.rounds!.history;
    expect(rows.find((r) => r.id === 'owner')).toMatchObject({
      totalHoles: 9, holesPlayed: 6,
      userScore: { totalGross: 30, totalNet: 27, totalPoints: 8, dailyHandicap: 9 },
      winner: { name: 'Sam', points: 8 },
    });
    expect(rows.find((r) => r.id === 'participant')).toMatchObject({
      totalHoles: 9, holesPlayed: 6, userScore: { totalGross: 24, totalNet: 24 }, winner: { name: 'Sam', points: 24 },
    });
    expect(rows.find((r) => r.id === 'competition')).toMatchObject({
      totalHoles: 9, holesPlayed: null, userScore: { totalGross: 45, totalNet: 36, totalPoints: 13 },
    });
  });

  it.each(['owner', 'participant'])('settles an ended back-nine %s match over holes 10–15 for winner and user', async (branch) => {
    const ended = round(branch, { nine_type: 'back9', holes_played: 6, game_type: 'match-play' });
    if (branch === 'owner') mockOwned = [ended];
    else mockInvited = [ended];
    mockCards = [
      card(branch, 'sam', { scores: { ...scores(range(10, 15), 4), ...scores(range(16, 18), 5) }, daily_handicap_used: 0 }),
      card(branch, 'bob', { scores: { ...scores(range(10, 18), 4), '10': { strokes: 5 }, '11': { strokes: 5 } }, daily_handicap_used: 0 }),
    ];
    const { result } = renderHook(useRoundList, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rounds?.history).toHaveLength(3));
    expect(result.current.rounds!.history.find((r) => r.id === branch)).toMatchObject({
      totalHoles: 9, holesPlayed: 6, winner: { name: 'Sam', margin: '2 UP' },
      userScore: { matchResult: { won: true, margin: '2 UP' } },
    });
  });

  it.each([null, undefined, 0, -1, 2.5, NaN])('keeps ordinary front-nine fallback handicap math with marker %s', async (marker) => {
    mockOwned = [round('owner', { nine_type: 'front9', holes_played: marker })];
    mockCards = [card('owner', 'sam', {
      scores: scores(range(1, 9), 5), ga_handicap_used: null,
      daily_handicap_used: null, total_points: null,
    })];
    const { result } = renderHook(useRoundList, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rounds?.history).toHaveLength(3));
    const row = result.current.rounds!.history.find((r) => r.id === 'owner');
    // Ordinary raw course par is 72: DH rounds to 21; 45 - 21 = 24.
    expect(row?.userScore).toMatchObject({ totalGross: 45, totalNet: 24 });
    expect(row?.holesPlayed).toBe(marker ?? null);
  });

  it.each([
    { outcome: 'loss', samLoses: [10, 11], bobLoses: [], name: 'Bob', margin: '2 UP', user: { won: false, margin: '2 UP' } },
    { outcome: 'tie', samLoses: [], bobLoses: [], name: 'Halved', margin: 'A/S', user: null },
    { outcome: 'close-out', samLoses: [], bobLoses: [10, 11, 12, 13], name: 'Sam', margin: '4&3', user: { won: true, margin: '4&3' } },
  ])('preserves ended match $outcome semantics', async ({ samLoses, bobLoses, name, margin, user }) => {
    mockOwned = [round('owner', { nine_type: 'back9', holes_played: 6, game_type: 'match-play' })];
    const matchScores = (lost: number[]) => Object.fromEntries(range(10, 15).map((n) => [String(n), { strokes: lost.includes(n) ? 5 : 4 }]));
    mockCards = [
      card('owner', 'sam', { scores: matchScores(samLoses), daily_handicap_used: 0 }),
      card('owner', 'bob', { scores: matchScores(bobLoses), daily_handicap_used: 0 }),
    ];
    const { result } = renderHook(useRoundList, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rounds?.history).toHaveLength(3));
    const row = result.current.rounds!.history.find((r) => r.id === 'owner');
    expect(row?.winner).toMatchObject({ name, margin });
    expect(row?.userScore?.matchResult).toEqual(user);
  });

  it('keeps missing-course stored totals for an ended row too', async () => {
    mockOwned = [round('owner', { courses: null, holes_played: 6 })];
    const { result } = renderHook(useRoundList, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rounds?.history).toHaveLength(3));
    expect(result.current.rounds!.history.find((r) => r.id === 'owner')).toMatchObject({
      holesPlayed: 6, userScore: { totalGross: 90, totalNet: 81, totalPoints: 13, dailyHandicap: 9 },
    });
  });

  it('Home receives the ended marker and retained totals through the real list hook', async () => {
    mockOwned = [round('owner', { date: '2026-10-09', nine_type: 'front9', holes_played: 6 })];
    mockCards = [card('owner', 'sam', { scores: scores(range(1, 7), 5) })];
    const { result } = renderHook(useHomeData, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.lastRound?.id).toBe('owner'));
    expect(result.current.lastRound).toMatchObject({
      totalHoles: 9, holesPlayed: 6, userScore: { totalGross: 30, totalNet: 27, totalPoints: 8 },
    });
  });
});
