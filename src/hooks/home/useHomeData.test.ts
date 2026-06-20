import { renderHook } from '@testing-library/react-native';
import { useHomeData } from './useHomeData';

// --- Mock every composed hook so useHomeData runs in isolation. ---
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, player: { id: 'p1', name: 'Sam Kay' } }),
}));
jest.mock('@/screens/rounds/RoundListScreen/hooks/useRoundList', () => ({
  useRoundList: () => ({ rounds: { active: [], history: [] }, isLoading: false, isRefetching: false, refetch: jest.fn() }),
}));
jest.mock('@/hooks/competitions/queries', () => ({ useCompetitions: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/leagues/queries', () => ({ useLeagues: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/hooks/player/queries', () => ({ usePlayer: () => ({ data: { handicap: 12 }, refetch: jest.fn() }) }));
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
jest.mock('./usePendingActions', () => ({ usePendingActions: () => ({ actions: [], refetch: jest.fn() }) }));
jest.mock('./useInProgressRounds', () => ({ useInProgressRounds: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('./useUpcomingRounds', () => ({ useUpcomingRounds: () => ({ data: [], refetch: jest.fn() }) }));
jest.mock('@/store/devFlagsStore', () => ({ useDevFlagsStore: () => false }));

const mockHandicap = { handicapIndex: 9.1, totalRounds: 15, qualifyingRoundsCount: 6, rounds: [], combinablePairs: [], lastUpdated: null };
jest.mock('@/hooks/player', () => ({
  useHandicapHistory: () => ({ data: mockHandicap, refetch: jest.fn() }),
  useCombineHandicapRounds: () => ({ mutate: jest.fn(), isPending: false }),
  useUncombineHandicapRound: () => ({ mutate: jest.fn(), isPending: false }),
}));

describe('useHomeData', () => {
  it('exposes handicapSummary from useHandicapHistory', () => {
    const { result } = renderHook(() => useHomeData());
    expect(result.current.handicapSummary).toEqual(mockHandicap);
  });
});
