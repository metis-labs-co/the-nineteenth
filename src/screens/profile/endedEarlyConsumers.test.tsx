/** Real statistics callers; only the chart boundary and unrelated profile services are stubbed. */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, cleanup } from '@/__tests__/utils/renderHelpers';
import { usePlayerStatistics } from '@/hooks/playerStatistics/queries';
import { useCourseStatistics } from '@/hooks/playerStatistics/courseQueries';
import type { PlayerStatistics, CourseStatisticsData } from '@/hooks/playerStatistics/types';
import { ScoringTab } from './MyStatisticsScreen/components/ScoringTab';
import { AdvancedAnalytics } from './MyStatisticsScreen/components/AdvancedAnalytics';
import { OverviewStats } from './MyStatisticsScreen/components/OverviewStats';
import { CourseOverviewTab } from './CourseStatisticsScreen/components/CourseOverviewTab';
import PlayerDetailScreen from '../social/PlayerDetailScreen';
import { COURSE_ID, PLAYER_ID, STATS_CARDS, resolvingQuery } from '@/__tests__/hooks/playerStatistics/statsFixtures';
import { createMockNavigation, createMockRoute } from '@/__tests__/utils/renderHelpers';

const mockFrom = jest.fn();
const mockChart = jest.fn();
let mockStats: PlayerStatistics;
let courseStats: CourseStatisticsData;
jest.mock('@/services/supabase/client', () => ({ supabase: { from: (...args: unknown[]) => mockFrom(...args) } }));
jest.mock('@/components/statistics/PerformanceChart', () => ({
  PerformanceChart: (props: unknown) => { mockChart(props); return null; },
}));
jest.mock('@/components/subscription', () => ({
  FeatureLock: ({ children }: { children: React.ReactNode }) => children,
  UpgradePrompt: () => null,
}));
jest.mock('@/components/subscription/FeatureLockButton', () => ({ FeatureLockButton: () => null }));
jest.mock('@/hooks/usePlayerStatistics', () => ({
  usePlayerStatistics: () => ({ data: mockStats, isLoading: false, isRefetching: false, refetch: jest.fn() }),
}));
jest.mock('@/hooks/usePlayer', () => ({
  usePlayer: () => ({ data: { id: 'player-1', name: 'Test Player', handicap: 10 }, refetch: jest.fn() }),
}));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'player-1' } }) }));
jest.mock('@/hooks/achievements', () => ({ useAchievementSummary: () => ({ data: null }) }));
jest.mock('@/hooks/cosmetics', () => ({ useEquippedCosmetics: () => ({ data: null }) }));
jest.mock('@/components/cosmetics', () => ({
  ProfileFrame: ({ children }: { children: React.ReactNode }) => children,
  ProfileBadge: () => null, ProfileTitle: () => null,
}));
jest.mock('@/hooks/friends', () => ({
  useFriendsWithPendingSent: () => ({ data: [] }), useFriendRequests: () => ({ data: [] }),
  useCheckCanAddFriend: () => ({ allowed: true }), useAddFriend: () => ({}), useAcceptFriendRequest: () => ({}),
}));
jest.mock('@/hooks', () => ({
  useConfirmationDialog: () => ({ dialogConfig: {}, showDialog: jest.fn(), showAlert: jest.fn(), dismissDialog: jest.fn() }),
}));
jest.mock('@/hooks/moderation', () => ({ useBlockUser: () => ({}), useReportContent: () => ({}) }));
jest.mock('@/components/moderation/ReportSheet', () => ({ ReportSheet: () => null }));
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({ showSuccessToast: jest.fn() }) }));
jest.mock('@/context/SubscriptionContext', () => ({ useSubscriptionContext: () => ({ tier: 'premium' }) }));

async function loadStats() {
  mockFrom.mockImplementation((table: string) => resolvingQuery({ data: table === 'scorecards' ? STATS_CARDS : [], error: null }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => ({
    player: usePlayerStatistics(PLAYER_ID), course: useCourseStatistics(PLAYER_ID, COURSE_ID),
  }), { wrapper });
  await waitFor(() => {
    expect(result.current.player.isSuccess).toBe(true);
    expect(result.current.course.isSuccess).toBe(true);
  });
  mockStats = result.current.player.data!;
  courseStats = result.current.course.data!;
}

function renderPlayerDetail() {
  // Only the navigation methods and id route are used by the profile in these read-only renders.
  render(<PlayerDetailScreen navigation={createMockNavigation() as never} route={createMockRoute({ id: PLAYER_ID }) as never} />);
}

describe('statistics recent activity and chart callers', () => {
  beforeEach(async () => { mockChart.mockClear(); await loadStats(); });

  it.each([
    ['ScoringTab (live MyStatistics renderer)', ScoringTab],
    ['AdvancedAnalytics (standalone barrel-exported component)', AdvancedAnalytics],
  ])('%s excludes ended rounds from chart props while preserving query data', (_name, Component) => {
    const original = [...mockStats.recentRounds];
    render(<Component stats={mockStats} onUpgradePress={jest.fn()} />);
    expect(mockChart).toHaveBeenLastCalledWith({ rounds: mockStats.recentRounds.slice(1) });
    expect(mockStats.recentRounds).toEqual(original);
    expect(mockStats.recentRounds.map((r) => r.roundId)).toEqual(['round-ended', 'round-nine', 'round-full']);
  });

  it('CourseOverview filters then orders chart data while retaining labelled recent rows', () => {
    const original = [...courseStats.recentRounds];
    render(<CourseOverviewTab stats={courseStats} />);
    expect(mockChart).toHaveBeenLastCalledWith({ rounds: [
      { date: '2026-09-01', totalGross: 90, totalPoints: 30 },
      { date: '2026-09-05', totalGross: 45, totalPoints: 15 },
    ] });
    expect(courseStats.recentRounds).toEqual(original);
    expect(screen.getByText('24')).toBeTruthy();
    expect(screen.getByText('Ended after 6 of 18')).toBeTruthy();
  });

  it('OverviewStats and PlayerDetail retain ended activity and append its label', () => {
    render(<OverviewStats stats={mockStats} />);
    expect(screen.getByText('24')).toBeTruthy();
    expect(screen.getAllByText('Handicap Round')).toHaveLength(3);
    expect(screen.getByText('Ended after 6 of 18')).toBeTruthy();
    cleanup();
    renderPlayerDetail();
    expect(screen.getByText('24')).toBeTruthy();
    expect(screen.getAllByText('Handicap Round')).toHaveLength(2);
    expect(screen.getByText('Handicap Round · Ended after 6 of 18')).toBeTruthy();
  });

  it('all chart callers keep invalid and missing markers, and all row callers label only a valid back nine', () => {
    const recentRounds = [null, undefined, 0, -1, 1.5, NaN, 6].map((roundHolesPlayed, index) => ({
      ...mockStats.recentRounds[1], roundId: `marker-${index}`, competitionName: `Round ${index}`,
      roundHolesPlayed, nineType: 'back9' as const,
    }));
    Object.freeze(recentRounds);
    mockStats = { ...mockStats, recentRounds };
    courseStats = { ...courseStats, recentRounds };
    for (const Component of [ScoringTab, AdvancedAnalytics]) {
      render(<Component stats={mockStats} onUpgradePress={jest.fn()} />);
      expect(mockChart).toHaveBeenLastCalledWith({ rounds: recentRounds.slice(0, 6) });
      cleanup();
    }
    render(<CourseOverviewTab stats={courseStats} />);
    expect(mockChart.mock.calls.at(-1)?.[0].rounds).toHaveLength(6);
    expect(screen.getAllByTestId('recent-round-ended-early')).toHaveLength(1);
    expect(screen.getByText('Ended after 6 of 9')).toBeTruthy();
    cleanup();
    render(<OverviewStats stats={mockStats} />);
    expect(screen.getAllByTestId('recent-round-ended-early')).toHaveLength(1);
    expect(screen.getByText('Ended after 6 of 9')).toBeTruthy();
    cleanup();
    renderPlayerDetail();
    expect(screen.getByText('Round 6 · Ended after 6 of 9')).toBeTruthy();
    for (let index = 0; index < 6; index++) expect(screen.getByText(`Round ${index}`)).toBeTruthy();
    expect(mockStats.recentRounds).toEqual(recentRounds);
  });

  it('passes no points to player charts when every recent round is ended and retains the course activity row', () => {
    mockStats = { ...mockStats, recentRounds: [mockStats.recentRounds[0]] };
    courseStats = { ...courseStats, recentRounds: mockStats.recentRounds };
    for (const Component of [ScoringTab, AdvancedAnalytics]) {
      render(<Component stats={mockStats} onUpgradePress={jest.fn()} />);
      expect(mockChart).toHaveBeenLastCalledWith({ rounds: [] });
      cleanup();
    }
    mockChart.mockClear();
    render(<CourseOverviewTab stats={courseStats} />);
    expect(mockChart).not.toHaveBeenCalled();
    expect(screen.getByText('Ended after 6 of 18')).toBeTruthy();
    expect(screen.getByText('24')).toBeTruthy();
  });
});
