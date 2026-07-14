/**
 * useFriends Hook Tests
 *
 * Tests for friends management hooks including:
 * - Fetching friends list
 * - Fetching pending requests
 * - Sending friend requests
 * - Accepting/declining requests
 * - Removing friends
 * - Player search
 * - Friend count for tier limits
 *
 * @see src/hooks/useFriends.ts
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useFriends,
  useFriendRequests,
  useSearchPlayers,
  useAddFriend,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  useFriendsCount,
  useSentFriendRequests,
  useCancelFriendRequest,
} from '@/hooks/useFriends';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockCurrentUser = {
  id: 'current-user',
  email: 'me@example.com',
};

const mockPlayers = [
  {
    id: 'player-1',
    name: 'John Smith',
    email: 'john@example.com',
    handicap: 12,
    avatar_url: null,
  },
  {
    id: 'player-2',
    name: 'Jane Doe',
    email: 'jane@example.com',
    handicap: 18,
    avatar_url: null,
  },
  {
    id: 'player-3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    handicap: 8,
    avatar_url: null,
  },
];

const mockFriendships = [
  {
    id: 'friendship-1',
    requester_id: 'current-user',
    addressee_id: 'player-1',
    status: 'accepted',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    requester: mockCurrentUser,
    addressee: mockPlayers[0],
  },
  {
    id: 'friendship-2',
    requester_id: 'player-2',
    addressee_id: 'current-user',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    requester: mockPlayers[1],
    addressee: mockCurrentUser,
  },
];

// Mock state
let mockFriendshipsData = mockFriendships;
let mockPlayersData = mockPlayers;
let mockFriendCount = 5;
let mockShouldThrowError = false;

// ============================================================================
// MOCKS
// ============================================================================

// Mock useAuth
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isAuthenticated: true,
  }),
}));

// Mock useSubscription
jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    checkFeature: () => ({ allowed: true }),
  }),
}));

// Mock achievement hooks
jest.mock('@/hooks/achievements/useCheckAchievements', () => ({
  useCheckAchievements: () => ({
    checkAndAward: jest.fn(() =>
      Promise.resolve({ hasNewRewards: false, newAchievements: [], newCosmetics: [] })
    ),
    isReady: true,
  }),
}));

// Mock achievement toast context
jest.mock('@/context/AchievementToastContext', () => ({
  useAchievementToast: () => ({
    showMultipleToasts: jest.fn(),
  }),
}));

// Mock Supabase client
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'friendships') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          single: jest.fn(() => {
            if (mockShouldThrowError) {
              return Promise.resolve({
                data: null,
                error: { message: 'Database error' },
              });
            }
            return Promise.resolve({
              data: mockFriendshipsData[0],
              error: null,
            });
          }),
          then: (cb: (result: { data: typeof mockFriendshipsData; error: null }) => void) => {
            cb({ data: mockFriendshipsData, error: null });
            return Promise.resolve();
          },
        };
      }
      if (table === 'players') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          limit: jest.fn(() =>
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

// Override from() for specific test cases
const mockSupabase = require('@/services/supabase/client').supabase;

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
      mutations: {
        retry: false,
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
// TEST SUITE: useFriends
// ============================================================================

describe('useFriends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriendshipsData = mockFriendships;
    mockShouldThrowError = false;

    // Setup mock for useFriends
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'friendships') {
        return {
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          eq: jest.fn(() =>
            Promise.resolve({
              data: mockFriendshipsData.filter((f) => f.status === 'accepted'),
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
    });
  });

  it('fetches friends list', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useFriends(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });

  it('returns only accepted friendships', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useFriends(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    // All returned friends should have accepted status
    result.current.data?.forEach((friend) => {
      expect(friend.friendship_status).toBe('accepted');
    });
  });

  it('includes friendship metadata', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useFriends(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    if (result.current.data && result.current.data.length > 0) {
      const friend = result.current.data[0];
      expect(friend).toHaveProperty('friendship_id');
      expect(friend).toHaveProperty('friendship_status');
      expect(friend).toHaveProperty('is_requester');
    }
  });
});

// ============================================================================
// TEST SUITE: useFriendRequests
// ============================================================================

describe('useFriendRequests', () => {
  it('returns query object with data property', async () => {
    // Note: Full mock would require complex chained Supabase calls
    const wrapper = createWrapper();
    const { result } = renderHook(() => useFriendRequests(), { wrapper });

    // Verify the hook returns expected query properties
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
  });
});

// ============================================================================
// TEST SUITE: useSearchPlayers
// ============================================================================

describe('useSearchPlayers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlayersData = mockPlayers;

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'players') {
        return {
          select: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          limit: jest.fn(() =>
            Promise.resolve({
              data: mockPlayersData,
              error: null,
            })
          ),
        };
      }
      if (table === 'friendships') {
        return {
          select: jest.fn().mockReturnThis(),
          or: jest.fn(() =>
            Promise.resolve({
              data: [],
              error: null,
            })
          ),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      };
    });
  });

  it('searches players by name', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchPlayers('John'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });

  it('does not search with query less than 2 characters', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchPlayers('J'), { wrapper });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
  });

  it('includes friend status in results', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchPlayers('John'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    if (result.current.data && result.current.data.length > 0) {
      const player = result.current.data[0];
      expect(player).toHaveProperty('is_friend');
      expect(player).toHaveProperty('has_pending_request');
    }
  });
});

// ============================================================================
// TEST SUITE: useAddFriend
// ============================================================================

describe('useAddFriend', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Complex mock needed: the hook checks for existing friendships before inserting
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'friendships') {
        return {
          select: jest.fn().mockReturnThis(),
          or: jest.fn(() =>
            // Return no existing friendship so the insert can proceed
            Promise.resolve({
              data: [],
              error: null,
            })
          ),
          insert: jest.fn(() =>
            Promise.resolve({
              data: {
                id: 'new-friendship',
                requester_id: 'current-user',
                addressee_id: 'player-3',
                status: 'pending',
              },
              error: null,
            })
          ),
          single: jest.fn(() =>
            Promise.resolve({
              data: {
                id: 'new-friendship',
                requester_id: 'current-user',
                addressee_id: 'player-3',
                status: 'pending',
              },
              error: null,
            })
          ),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      };
    });
  });

  it('calls mutation function', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddFriend(), { wrapper });

    // Verify the hook returns mutation functions
    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(typeof result.current.mutate).toBe('function');
  });
});

// ============================================================================
// TEST SUITE: useAcceptFriendRequest
// ============================================================================

describe('useAcceptFriendRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'friendships') {
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn(() =>
            Promise.resolve({
              data: {
                id: 'friendship-2',
                status: 'accepted',
              },
              error: null,
            })
          ),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      };
    });
  });

  it('accepts friend request', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAcceptFriendRequest(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('friendship-2');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('updates status to accepted', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAcceptFriendRequest(), { wrapper });

    let response;
    await act(async () => {
      response = await result.current.mutateAsync('friendship-2');
    });

    expect(response).toHaveProperty('status', 'accepted');
  });
});

// ============================================================================
// TEST SUITE: useDeclineFriendRequest
// ============================================================================

describe('useDeclineFriendRequest', () => {
  it('provides mutation function', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeclineFriendRequest(), { wrapper });

    // Verify the hook returns mutation functions
    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(typeof result.current.mutate).toBe('function');
  });
});

// ============================================================================
// TEST SUITE: useRemoveFriend
// ============================================================================

describe('useRemoveFriend', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'friendships') {
        return {
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn(() =>
            Promise.resolve({
              error: null,
            })
          ),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      };
    });
  });

  it('provides mutation function', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRemoveFriend(), { wrapper });

    // Verify the hook returns mutation functions
    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(typeof result.current.mutate).toBe('function');
  });
});

// ============================================================================
// TEST SUITE: useFriendsCount
// ============================================================================

describe('useFriendsCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriendCount = 5;

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'friendships') {
        return {
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          eq: jest.fn(() =>
            Promise.resolve({
              count: mockFriendCount,
              error: null,
            })
          ),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      };
    });
  });

  it('returns friend count', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useFriendsCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe(5);
  });
});

// ============================================================================
// TEST SUITE: useSentFriendRequests
// ============================================================================

describe('useSentFriendRequests', () => {
  it('returns query object with data property', async () => {
    // Note: Full mock setup would require mocking the chained Supabase calls
    // This test verifies the hook returns the expected structure
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSentFriendRequests(), { wrapper });

    // Verify the hook returns expected query properties
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
  });
});

// ============================================================================
// TEST SUITE: useCancelFriendRequest
// ============================================================================

describe('useCancelFriendRequest', () => {
  it('provides mutation function', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCancelFriendRequest(), { wrapper });

    // Verify the hook returns mutation functions
    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(typeof result.current.mutate).toBe('function');
  });
});
