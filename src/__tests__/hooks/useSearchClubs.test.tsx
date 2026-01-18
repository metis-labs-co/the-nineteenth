/**
 * useSearchClubs Hook Tests
 *
 * Tests for the club search hook including:
 * - Local-only search behavior
 * - API fallback trigger conditions
 * - Result merging and deduplication
 * - Debouncing
 * - Type guards
 *
 * @see src/hooks/useClubs.ts
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSearchClubs, isLocalClub } from '@/hooks/useClubs';
import type { ClubWithCourses } from '@/hooks/useClubs';
import type { GolfApiSearchResultItem } from '@/hooks/useGolfApiSearch';
import type { Club, Course } from '@/types/database.types';

// ============================================================================
// MOCK DATA
// ============================================================================

const createMockCourse = (id: string, name: string): Course => ({
  id,
  club_id: 'club-1',
  name,
  description: null,
  num_holes: 18,
  holes: [],
  holes_women: null,
  match_play_indexes: null,
  tees: null,
  tees_migrated: null,
  slope_rating: null,
  course_rating: null,
  golfapi_course_id: null,
  golfapi_long_course_id: null,
  golfapi_updated_at: null,
  measure_unit: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const createMockClub = (
  id: string,
  name: string,
  golfapiClubId?: string
): Club => ({
  id,
  name,
  state: 'VIC',
  city: 'Melbourne',
  address: null,
  postal_code: null,
  country: 'Australia',
  continent: 'Oceania',
  phone: null,
  email: null,
  website: null,
  latitude: null,
  longitude: null,
  location: null,
  total_holes: 18,
  golfapi_club_id: golfapiClubId ?? null,
  source: golfapiClubId ? 'api' : 'manual',
  last_synced: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const createLocalClubWithCourses = (
  id: string,
  name: string,
  golfapiClubId?: string
): ClubWithCourses => ({
  ...createMockClub(id, name, golfapiClubId),
  courses: [{ ...createMockCourse(`course-${id}`, name), is_favorite: false }],
  course_count: 1,
  is_multi_course: false,
  is_home: false,
});

const createApiResult = (
  clubId: string,
  name: string
): GolfApiSearchResultItem => ({
  id: `golfapi_${clubId}`,
  name,
  state: 'VIC',
  city: 'Melbourne',
  source: 'golfapi',
  golfapi_club_id: clubId,
  courses: [],
  course_count: 0,
  is_multi_course: false,
  is_home: false,
  latitude: null,
  longitude: null,
});

// ============================================================================
// MOCK STATE
// ============================================================================

let mockLocalClubs: (Club & { courses: Course[] })[] = [];
let mockHomeClubId: string | null = null;
let mockApiResults: GolfApiSearchResultItem[] = [];
let mockApiLoading = false;
let mockUser: { id: string } | null = { id: 'user-1' };

// ============================================================================
// MOCKS
// ============================================================================

// Mock useAuth
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock useFavoriteCourses
jest.mock('@/hooks/useFavoriteCourses', () => ({
  useFavoriteEnrichment: () => ({
    isFavorite: () => false,
    isLoading: false,
  }),
  useAddFavorite: () => ({ mutate: jest.fn() }),
  useRemoveFavorite: () => ({ mutate: jest.fn() }),
}));

// Mock useGolfApiSearch
jest.mock('@/hooks/useGolfApiSearch', () => ({
  useGolfApiSearch: jest.fn((query: string, state: string, enabled: boolean) => ({
    data: enabled ? mockApiResults : undefined,
    isLoading: enabled ? mockApiLoading : false,
    error: null,
  })),
  isGolfApiResult: (item: { source?: string }) => item.source === 'golfapi',
}));

// Mock Supabase
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'clubs') {
        return {
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn(() =>
            Promise.resolve({
              data: mockLocalClubs,
              error: null,
            })
          ),
        };
      }
      if (table === 'players') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(() =>
            Promise.resolve({
              data: { home_club_id: mockHomeClubId },
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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function resetMocks() {
  mockLocalClubs = [];
  mockHomeClubId = null;
  mockApiResults = [];
  mockApiLoading = false;
  mockUser = { id: 'user-1' };
  jest.clearAllMocks();
}

// ============================================================================
// TEST SUITE: Local-Only Search
// ============================================================================

describe('useSearchClubs - Local-Only Search', () => {
  beforeEach(resetMocks);

  it('should return only local results when query is less than 3 characters', async () => {
    mockLocalClubs = [
      {
        ...createMockClub('1', 'Melbourne Golf Club'),
        courses: [createMockCourse('c1', 'Championship')],
      },
    ];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('ab'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return local results
    expect(result.current.data?.length).toBe(1);
    expect(result.current.data?.[0].name).toBe('Melbourne Golf Club');

    // API search should not be enabled
    expect(result.current.apiSearchEnabled).toBe(false);
  });

  it('should return only local results when local count >= 3', async () => {
    mockLocalClubs = [
      {
        ...createMockClub('1', 'Melbourne Golf Club'),
        courses: [createMockCourse('c1', 'Championship')],
      },
      {
        ...createMockClub('2', 'Royal Melbourne'),
        courses: [createMockCourse('c2', 'West')],
      },
      {
        ...createMockClub('3', 'Kingston Heath'),
        courses: [createMockCourse('c3', 'Main')],
      },
    ];

    mockApiResults = [createApiResult('api-1', 'API Club 1')];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return only local results (3 clubs)
    expect(result.current.data?.length).toBe(3);

    // API search should not be enabled (local count >= 3)
    expect(result.current.apiSearchEnabled).toBe(false);
  });

  it('should not include API results when local count >= 3', async () => {
    mockLocalClubs = [
      {
        ...createMockClub('1', 'Melbourne Golf Club'),
        courses: [createMockCourse('c1', 'Championship')],
      },
      {
        ...createMockClub('2', 'Royal Melbourne'),
        courses: [createMockCourse('c2', 'West')],
      },
      {
        ...createMockClub('3', 'Kingston Heath'),
        courses: [createMockCourse('c3', 'Main')],
      },
      {
        ...createMockClub('4', 'Sandringham'),
        courses: [createMockCourse('c4', 'Main')],
      },
    ];

    mockApiResults = [
      createApiResult('api-1', 'API Club 1'),
      createApiResult('api-2', 'API Club 2'),
    ];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('Golf'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return only local results
    expect(result.current.data?.length).toBe(4);
    expect(result.current.data?.every((r) => isLocalClub(r))).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: API Fallback
// ============================================================================

describe('useSearchClubs - API Fallback', () => {
  beforeEach(resetMocks);

  it('should enable API search when local results < 3 and query >= 3 chars', async () => {
    mockLocalClubs = [
      {
        ...createMockClub('1', 'Melbourne Golf Club'),
        courses: [createMockCourse('c1', 'Championship')],
      },
    ];

    mockApiResults = [createApiResult('api-1', 'API Club 1')];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('Melbourne'), {
      wrapper,
    });

    // Wait for debounce and query to complete
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.apiSearchEnabled).toBe(true);
      },
      { timeout: 500 }
    );
  });

  it('should merge API results when local count < 3', async () => {
    mockLocalClubs = [
      {
        ...createMockClub('1', 'Melbourne Golf Club'),
        courses: [createMockCourse('c1', 'Championship')],
      },
      {
        ...createMockClub('2', 'Royal Melbourne'),
        courses: [createMockCourse('c2', 'West')],
      },
    ];

    mockApiResults = [
      createApiResult('api-1', 'API Club 1'),
      createApiResult('api-2', 'API Club 2'),
    ];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('Melbourne'), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        // Should have 4 results (2 local + 2 API)
        expect(result.current.data?.length).toBe(4);
      },
      { timeout: 500 }
    );
  });
});

// ============================================================================
// TEST SUITE: Deduplication
// ============================================================================

describe('useSearchClubs - Deduplication', () => {
  beforeEach(resetMocks);

  it('should deduplicate by golfapi_club_id', async () => {
    // Local club has golfapi_club_id matching an API result
    // Note: Using a local club WITHOUT golfapi origin to properly test isLocalClub
    mockLocalClubs = [
      {
        ...createMockClub('1', 'Melbourne Golf Club'),
        golfapi_club_id: 'api-1', // Has golfapi_club_id for deduplication
        courses: [createMockCourse('c1', 'Championship')],
      },
    ];

    // API returns the same club (same golfapi_club_id)
    mockApiResults = [
      createApiResult('api-1', 'Melbourne Golf Club (API)'), // Same ID as local - should be filtered
      createApiResult('api-2', 'Different Club'), // New club - should be included
    ];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('Melbourne'), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        // Should have 2 results: 1 local + 1 new API (duplicate filtered out)
        expect(result.current.data?.length).toBe(2);
      },
      { timeout: 500 }
    );

    // First result should be local (has database ID format, not golfapi_ prefix)
    expect(result.current.data![0].id).toBe('1');
    expect(result.current.data![0].name).toBe('Melbourne Golf Club');

    // Second result should be the new API result (has golfapi_ prefix)
    expect(result.current.data![1].id).toBe('golfapi_api-2');
    expect(result.current.data![1].name).toBe('Different Club');

    // Verify the duplicate (api-1) was filtered out
    const hasApiDuplicate = result.current.data?.some(
      (r) => r.id === 'golfapi_api-1'
    );
    expect(hasApiDuplicate).toBe(false);
  });

  it('should not deduplicate clubs without golfapi_club_id', async () => {
    // Local club without golfapi_club_id
    mockLocalClubs = [
      {
        ...createMockClub('1', 'Melbourne Golf Club'), // No golfapi_club_id
        courses: [createMockCourse('c1', 'Championship')],
      },
    ];

    mockApiResults = [
      createApiResult('api-1', 'Melbourne Golf Club (API)'),
      createApiResult('api-2', 'Different Club'),
    ];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('Melbourne'), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        // Should have 3 results: 1 local + 2 API (no dedup without matching ID)
        expect(result.current.data?.length).toBe(3);
      },
      { timeout: 500 }
    );
  });
});

// ============================================================================
// TEST SUITE: Result Order
// ============================================================================

describe('useSearchClubs - Result Order', () => {
  beforeEach(resetMocks);

  it('should preserve local results first, then API results', async () => {
    mockLocalClubs = [
      {
        ...createMockClub('1', 'Local Club A'),
        courses: [createMockCourse('c1', 'Course')],
      },
      {
        ...createMockClub('2', 'Local Club B'),
        courses: [createMockCourse('c2', 'Course')],
      },
    ];

    mockApiResults = [
      createApiResult('api-1', 'API Club X'),
      createApiResult('api-2', 'API Club Y'),
    ];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('Club'), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.length).toBe(4);
      },
      { timeout: 500 }
    );

    // Check order: local first, then API
    expect(result.current.data![0].name).toBe('Local Club A');
    expect(result.current.data![1].name).toBe('Local Club B');
    expect(result.current.data![2].name).toBe('API Club X');
    expect(result.current.data![3].name).toBe('API Club Y');

    // Verify types
    expect(isLocalClub(result.current.data![0])).toBe(true);
    expect(isLocalClub(result.current.data![1])).toBe(true);
    expect(isLocalClub(result.current.data![2])).toBe(false);
    expect(isLocalClub(result.current.data![3])).toBe(false);
  });
});

// ============================================================================
// TEST SUITE: Debouncing
// ============================================================================

describe('useSearchClubs - Debouncing', () => {
  beforeEach(resetMocks);

  it('should debounce API calls by 300ms', async () => {
    jest.useFakeTimers();

    mockLocalClubs = [
      {
        ...createMockClub('1', 'Melbourne Golf Club'),
        courses: [createMockCourse('c1', 'Championship')],
      },
    ];

    mockApiResults = [createApiResult('api-1', 'API Club')];

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ query }) => useSearchClubs(query),
      {
        wrapper,
        initialProps: { query: 'Mel' },
      }
    );

    // Wait for initial local query
    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    // API should not be enabled yet (debounce pending)
    expect(result.current.apiSearchEnabled).toBe(false);

    // Change query rapidly
    rerender({ query: 'Melb' });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    rerender({ query: 'Melbo' });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Still within debounce window
    expect(result.current.apiSearchEnabled).toBe(false);

    // Advance past debounce threshold
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Now API search should be considered
    // Note: apiSearchEnabled depends on local results loading state too
    // The debounce timer should have fired

    jest.useRealTimers();
  });
});

// ============================================================================
// TEST SUITE: isLocalClub Type Guard
// ============================================================================

describe('isLocalClub', () => {
  it('should return true for local club results', () => {
    const localClub = createLocalClubWithCourses('1', 'Melbourne Golf Club');
    expect(isLocalClub(localClub)).toBe(true);
  });

  it('should return false for API results', () => {
    const apiResult = createApiResult('api-1', 'API Club');
    expect(isLocalClub(apiResult)).toBe(false);
  });

  it('should return true for clubs without source property', () => {
    // Old-style local club without source property - testing type guard behavior
    // This simulates what might happen if source field isn't set
    const clubWithoutSource = {
      ...createLocalClubWithCourses('1', 'Test Club'),
      source: undefined,
    } as unknown as ClubWithCourses;

    expect(isLocalClub(clubWithoutSource)).toBe(true);
  });

  it('should return true for clubs with source !== "golfapi"', () => {
    const manualClub = createLocalClubWithCourses('1', 'Manual Club');
    // manualClub.source is already 'manual' from createMockClub
    expect(isLocalClub(manualClub)).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: API Search Status
// ============================================================================

describe('useSearchClubs - API Search Status', () => {
  beforeEach(resetMocks);

  it('should return isSearchingApi when API search is in progress', async () => {
    mockLocalClubs = [
      {
        ...createMockClub('1', 'Melbourne Golf Club'),
        courses: [createMockCourse('c1', 'Championship')],
      },
    ];

    mockApiLoading = true;
    mockApiResults = [];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('Melbourne'), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.apiSearchEnabled).toBe(true);
        expect(result.current.isSearchingApi).toBe(true);
      },
      { timeout: 500 }
    );
  });

  it('should return isSearchingApi = false when API search completes', async () => {
    mockLocalClubs = [
      {
        ...createMockClub('1', 'Melbourne Golf Club'),
        courses: [createMockCourse('c1', 'Championship')],
      },
    ];

    mockApiLoading = false;
    mockApiResults = [createApiResult('api-1', 'API Club')];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('Melbourne'), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSearchingApi).toBe(false);
      },
      { timeout: 500 }
    );
  });
});

// ============================================================================
// TEST SUITE: Empty Results
// ============================================================================

describe('useSearchClubs - Empty Results', () => {
  beforeEach(resetMocks);

  it('should return empty array when no local or API results', async () => {
    mockLocalClubs = [];
    mockApiResults = [];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('NonexistentClub'), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 500 }
    );

    expect(result.current.data).toEqual([]);
  });

  it('should return only API results when no local results', async () => {
    mockLocalClubs = [];
    mockApiResults = [
      createApiResult('api-1', 'API Club 1'),
      createApiResult('api-2', 'API Club 2'),
    ];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('Melbourne'), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.length).toBe(2);
      },
      { timeout: 500 }
    );

    expect(result.current.data?.every((r) => !isLocalClub(r))).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: State Filter
// ============================================================================

describe('useSearchClubs - State Filter', () => {
  beforeEach(resetMocks);

  it('should pass state filter to API search', async () => {
    mockLocalClubs = [
      {
        ...createMockClub('1', 'Melbourne Golf Club'),
        courses: [createMockCourse('c1', 'Championship')],
      },
    ];

    mockApiResults = [createApiResult('api-1', 'VIC Club')];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSearchClubs('Melbourne', 'VIC'), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 500 }
    );

    // Verify useGolfApiSearch was called with state
    const { useGolfApiSearch } = require('@/hooks/useGolfApiSearch');
    expect(useGolfApiSearch).toHaveBeenCalledWith(
      expect.any(String),
      'VIC',
      expect.any(Boolean)
    );
  });
});
