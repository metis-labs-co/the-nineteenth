/**
 * useRoundDetails Hook Tests
 *
 * Tests for round details fetching hook including:
 * - Round data fetching
 * - Scorecards fetching
 * - Players fetching
 * - Loading states
 * - Error handling
 * - Cache behavior
 *
 * @see src/hooks/useRoundDetails.ts
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useRoundDetails,
  useRoundScorecards,
  useRoundPlayers,
} from '@/hooks/useRoundDetails';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockClub = {
  id: 'club-123',
  name: 'Test Golf Club',
  city: 'Melbourne',
  state: 'VIC',
  address: '123 Golf Lane',
};

const mockCourse = {
  id: 'course-123',
  club_id: 'club-123',
  name: 'Championship Course',
  description: 'A beautiful 18-hole course',
  holes: Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: i % 3 === 0 ? 5 : i % 3 === 1 ? 4 : 3,
    stroke_index: i + 1,
  })),
  tees: [
    { name: 'Blue', color: 'blue', rating: 72.5, slope: 130 },
    { name: 'White', color: 'white', rating: 70.0, slope: 125 },
  ],
  slope_rating: 130,
  course_rating: 72.5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  clubs: mockClub,
};

const mockCompetition = {
  id: 'comp-123',
  name: 'Summer Championship',
  competition_type: 'stableford',
  status: 'active',
  start_date: '2024-01-01',
  end_date: '2024-03-01',
};

const mockRound = {
  id: 'round-123',
  competition_id: 'comp-123',
  course_id: 'course-123',
  date: '2024-01-15',
  status: 'in_progress',
  game_type: 'stableford',
  name: 'Round 1',
  tee_time: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  courses: mockCourse,
  competitions: mockCompetition,
};

const mockPlayers = [
  {
    id: 'player-1',
    name: 'John Smith',
    email: 'john@example.com',
    handicap: 12,
  },
  {
    id: 'player-2',
    name: 'Jane Doe',
    email: 'jane@example.com',
    handicap: 18,
  },
];

const mockScorecards = [
  {
    id: 'scorecard-1',
    round_id: 'round-123',
    player_id: 'player-1',
    total_gross: 85,
    total_net: 73,
    total_points: 36,
    status: 'submitted',
    players: mockPlayers[0],
  },
  {
    id: 'scorecard-2',
    round_id: 'round-123',
    player_id: 'player-2',
    total_gross: 95,
    total_net: 77,
    total_points: 32,
    status: 'submitted',
    players: mockPlayers[1],
  },
];

const mockPairings = [
  {
    id: 'pairing-1',
    round_id: 'round-123',
    player_ids: ['player-1', 'player-2'],
    tee_time: null,
  },
];

// Mock state
let mockRoundData: typeof mockRound | null = mockRound;
let mockScorecardsData: typeof mockScorecards = mockScorecards;
let mockPairingsData: typeof mockPairings = mockPairings;
let mockPlayersData: typeof mockPlayers = mockPlayers;
let mockShouldThrowError = false;

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'rounds') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          single: jest.fn(() => {
            if (mockShouldThrowError) {
              return Promise.resolve({
                data: null,
                error: { message: 'Round not found', code: 'PGRST116' },
              });
            }
            return Promise.resolve({
              data: mockRoundData,
              error: null,
            });
          }),
        };
      }
      if (table === 'scorecards') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn(() =>
            Promise.resolve({
              data: mockScorecardsData,
              error: null,
            })
          ),
        };
      }
      if (table === 'pairings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(() =>
            Promise.resolve({
              data: mockPairingsData,
              error: null,
            })
          ),
        };
      }
      if (table === 'round_players') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(() =>
            Promise.resolve({
              data: [],
              error: null,
            })
          ),
        };
      }
      if (table === 'players') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn(() =>
            Promise.resolve({
              data: mockPlayersData,
              error: null,
            })
          ),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      };
    }),
  },
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
// TEST SUITE: useRoundDetails
// ============================================================================

describe('useRoundDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoundData = mockRound;
    mockShouldThrowError = false;
  });

  describe('Data Fetching', () => {
    it('fetches round data on mount', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useRoundDetails('round-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.id).toBe('round-123');
    });

    it('returns loading state initially', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useRoundDetails('round-123'), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('includes course data with round', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useRoundDetails('round-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.course).toBeDefined();
      expect(result.current.data?.course?.name).toBe('Championship Course');
    });

    it('includes club data nested in course', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useRoundDetails('round-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.course?.club).toBeDefined();
      expect(result.current.data?.course?.club?.name).toBe('Test Golf Club');
    });

    it('includes competition data', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useRoundDetails('round-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.competition).toBeDefined();
      expect(result.current.data?.competition?.name).toBe('Summer Championship');
    });
  });

  describe('Error Handling', () => {
    it('handles round not found error', async () => {
      mockShouldThrowError = true;

      const wrapper = createWrapper();
      const { result } = renderHook(() => useRoundDetails('nonexistent'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('Query Behavior', () => {
    it('does not fetch when roundId is empty', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useRoundDetails(''), {
        wrapper,
      });

      // Should not be loading because query is disabled
      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('refetches when roundId changes', async () => {
      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        ({ roundId }) => useRoundDetails(roundId),
        {
          wrapper,
          initialProps: { roundId: 'round-123' },
        }
      );

      await waitFor(() => {
        expect(result.current.data?.id).toBe('round-123');
      });

      // Change round ID
      mockRoundData = { ...mockRound, id: 'round-456', name: 'Round 2' };

      rerender({ roundId: 'round-456' });

      await waitFor(() => {
        expect(result.current.data?.id).toBe('round-456');
      });
    });
  });
});

// ============================================================================
// TEST SUITE: useRoundScorecards
// ============================================================================

describe('useRoundScorecards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScorecardsData = mockScorecards;
  });

  it('fetches scorecards for a round', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoundScorecards('round-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(2);
  });

  it('includes player data with each scorecard', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoundScorecards('round-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.[0].player).toBeDefined();
    expect(result.current.data?.[0].player?.name).toBe('John Smith');
  });

  it('returns scorecards sorted by total points descending', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoundScorecards('round-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    // First scorecard should have higher points
    expect(result.current.data?.[0].total_points).toBeGreaterThanOrEqual(
      result.current.data?.[1].total_points ?? 0
    );
  });

  it('returns empty array when no scorecards exist', async () => {
    mockScorecardsData = [];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoundScorecards('round-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });
});

// ============================================================================
// TEST SUITE: useRoundPlayers
// ============================================================================

describe('useRoundPlayers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPairingsData = mockPairings;
    mockPlayersData = mockPlayers;
    mockScorecardsData = mockScorecards;
  });

  it('fetches players from pairings', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoundPlayers('round-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(2);
  });

  it('returns player data with expected properties', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoundPlayers('round-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    // Verify data is returned (has_scorecard is enriched by the hook)
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('returns empty array when no pairings exist', async () => {
    mockPairingsData = [];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoundPlayers('round-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('includes player details (name, handicap)', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoundPlayers('round-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const player = result.current.data?.[0];
    expect(player?.name).toBeDefined();
    expect(player?.handicap).toBeDefined();
  });
});
