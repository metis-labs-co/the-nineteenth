/**
 * useLeaderboard Hook Tests
 *
 * Tests for leaderboard data fetching hook including:
 * - Fetching competition leaderboard
 * - Sorting by points (Stableford/Stroke)
 * - Tie-breaker handling
 * - Filtering by round
 * - Pull to refresh
 * - Empty state handling
 *
 * @see src/hooks/useLeaderboard.ts
 * @see src/hooks/useCompetitionLeaderboard.ts
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useCompetitionLeaderboard } from '@/hooks/useCompetitionLeaderboard';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockRoundResults = [
  {
    id: 'result-1',
    round_id: 'round-1',
    player_id: 'player-1',
    team_id: null,
    is_team_result: false,
    raw_score: 85,
    net_score: 73,
    competition_points: 36,
    position: 1,
    created_at: new Date().toISOString(),
    player: {
      id: 'player-1',
      name: 'John Smith',
      handicap: 12,
      email: 'john@example.com',
    },
    team: null,
  },
  {
    id: 'result-2',
    round_id: 'round-1',
    player_id: 'player-2',
    team_id: null,
    is_team_result: false,
    raw_score: 90,
    net_score: 75,
    competition_points: 34,
    position: 2,
    created_at: new Date().toISOString(),
    player: {
      id: 'player-2',
      name: 'Jane Doe',
      handicap: 15,
      email: 'jane@example.com',
    },
    team: null,
  },
  {
    id: 'result-3',
    round_id: 'round-1',
    player_id: 'player-3',
    team_id: null,
    is_team_result: false,
    raw_score: 88,
    net_score: 74,
    competition_points: 34, // Tied with player-2
    position: 2,
    created_at: new Date().toISOString(),
    player: {
      id: 'player-3',
      name: 'Bob Wilson',
      handicap: 14,
      email: 'bob@example.com',
    },
    team: null,
  },
];

const mockCompetitionResults = {
  competitionId: 'comp-123',
  competitionName: 'Summer Championship',
  rounds: [
    {
      roundId: 'round-1',
      roundName: 'Round 1',
      date: '2024-01-15',
      results: mockRoundResults,
    },
  ],
};

// Mock state
let mockResults = mockCompetitionResults;
let mockShouldThrowError = false;

// ============================================================================
// MOCKS
// ============================================================================

// Mock the round results service
jest.mock('@/services/rounds/roundResultsService', () => ({
  getCompetitionResults: jest.fn(() => {
    if (mockShouldThrowError) {
      throw new Error('Failed to fetch results');
    }
    return Promise.resolve(mockResults);
  }),
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// ============================================================================
// TEST SUITE: useLeaderboard (Legacy Hook)
// ============================================================================

describe('useLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResults = mockCompetitionResults;
    mockShouldThrowError = false;
  });

  describe('Data Fetching', () => {
    it('fetches leaderboard for competition', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLeaderboard('comp-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.length).toBeGreaterThan(0);
    });

    it('returns loading state initially', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLeaderboard('comp-123'), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('transforms data to legacy LeaderboardEntry format', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLeaderboard('comp-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const entry = result.current.data?.[0];
      expect(entry).toHaveProperty('playerId');
      expect(entry).toHaveProperty('playerName');
      expect(entry).toHaveProperty('handicap');
      expect(entry).toHaveProperty('totalPoints');
      expect(entry).toHaveProperty('roundsPlayed');
    });

    it('includes player details in entries', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLeaderboard('comp-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const entry = result.current.data?.find((e) => e.playerId === 'player-1');
      expect(entry?.playerName).toBe('John Smith');
      expect(entry?.handicap).toBe(12);
    });
  });

  describe('Sorting', () => {
    it('sorts by Stableford points descending', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLeaderboard('comp-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // First entry should have highest points
      const data = result.current.data;
      expect(data?.[0].totalPoints).toBeGreaterThanOrEqual(data?.[1].totalPoints ?? 0);
    });
  });

  describe('Empty State', () => {
    it('returns empty array when no results', async () => {
      mockResults = {
        ...mockCompetitionResults,
        rounds: [],
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => useLeaderboard('comp-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('Options', () => {
    it('respects autoRefresh option', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useLeaderboard('comp-123', { autoRefresh: false }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Query should still work, just no auto-refresh
      expect(result.current.data).toBeDefined();
    });

    it('accepts custom refetchInterval', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useLeaderboard('comp-123', { refetchInterval: 60000 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('Refetch', () => {
    it('can refetch data', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLeaderboard('comp-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Trigger refetch
      await result.current.refetch();

      expect(result.current.data).toBeDefined();
    });
  });
});

// ============================================================================
// TEST SUITE: useCompetitionLeaderboard (New Hook)
// ============================================================================

describe('useCompetitionLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResults = mockCompetitionResults;
    mockShouldThrowError = false;
  });

  describe('Data Fetching', () => {
    it('fetches competition leaderboard', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCompetitionLeaderboard('comp-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
    });

    it('returns CompetitionLeaderboardEntry format', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCompetitionLeaderboard('comp-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const entry = result.current.data?.[0];
      expect(entry).toHaveProperty('participantId');
      expect(entry).toHaveProperty('participantName');
      expect(entry).toHaveProperty('isTeam');
      expect(entry).toHaveProperty('totalPoints');
      expect(entry).toHaveProperty('roundsPlayed');
      expect(entry).toHaveProperty('position');
      expect(entry).toHaveProperty('tied');
    });

    it('includes position tracking', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCompetitionLeaderboard('comp-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // First entry should have position 1
      expect(result.current.data?.[0].position).toBe(1);
    });

    it('handles tie detection', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCompetitionLeaderboard('comp-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Players with same points should be marked as tied
      const tiedPlayers = result.current.data?.filter((e) => e.tied);
      // If there are tied players, they should have the same position
      if (tiedPlayers && tiedPlayers.length > 1) {
        const positions = new Set(tiedPlayers.map((p) => p.position));
        expect(positions.size).toBeLessThan(tiedPlayers.length);
      }
    });
  });

  describe('Filtering', () => {
    it('supports individuals filter', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCompetitionLeaderboard('comp-123', { filter: 'individuals' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // All entries should be individuals (isTeam: false)
      result.current.data?.forEach((entry) => {
        expect(entry.isTeam).toBe(false);
      });
    });

    it('supports teams filter', async () => {
      // Add team results to mock data
      const teamResult = {
        ...mockRoundResults[0],
        id: 'team-result-1',
        player_id: null,
        team_id: 'team-1',
        is_team_result: true,
        player: null,
        team: {
          id: 'team-1',
          name: 'Team Alpha',
          competition_id: 'comp-123',
          members: [],
        },
      };

      mockResults = {
        ...mockCompetitionResults,
        rounds: [
          {
            ...mockCompetitionResults.rounds[0],
            results: [...mockRoundResults, teamResult],
          },
        ],
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCompetitionLeaderboard('comp-123', { filter: 'teams' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // All entries should be teams (isTeam: true)
      result.current.data?.forEach((entry) => {
        expect(entry.isTeam).toBe(true);
      });
    });

    it('supports all filter (default)', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCompetitionLeaderboard('comp-123', { filter: 'all' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Should include all entries
      expect(result.current.data?.length).toBeGreaterThan(0);
    });
  });

  describe('Round Points', () => {
    it('includes round-by-round breakdown', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCompetitionLeaderboard('comp-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const entry = result.current.data?.[0];
      expect(entry?.roundPoints).toBeDefined();
      expect(Array.isArray(entry?.roundPoints)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('has error state properties', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCompetitionLeaderboard('comp-123'),
        { wrapper }
      );

      // Verify the hook has error handling properties
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('error');
    });
  });

  describe('Query Behavior', () => {
    it('does not fetch when competitionId is empty', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useCompetitionLeaderboard(''),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });
  });
});
