/**
 * useGolfApiSearch Hook Tests
 *
 * Tests for the GolfAPI.io search hook including:
 * - Query validation (minimum 3 characters)
 * - Enabled/disabled state
 * - Result transformation
 * - Graceful error handling
 * - API availability checks
 * - Quota checks
 * - Cache behavior
 *
 * @see src/hooks/useGolfApiSearch.ts
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useGolfApiSearch, isGolfApiResult } from '@/hooks/useGolfApiSearch';
import type { GolfApiClubSearchResult } from '@/services/api/golfApiTypes';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockApiResult: GolfApiClubSearchResult = {
  clubID: '141520610397251566',
  clubName: 'Royal Melbourne Golf Club',
  city: 'Black Rock',
  state: 'VIC',
  country: 'AUS',
  latitude: '-37.9789',
  longitude: '145.0129',
  courses: [
    { courseID: 'course1', courseName: 'West Course', numHoles: 18, timestampUpdated: '1234567890', hasGPS: 1 },
    { courseID: 'course2', courseName: 'East Course', numHoles: 18, timestampUpdated: '1234567890', hasGPS: 1 },
  ],
};

const mockApiResults: GolfApiClubSearchResult[] = [
  mockApiResult,
  {
    clubID: '141520610397251567',
    clubName: 'Kingston Heath Golf Club',
    city: 'Cheltenham',
    state: 'VIC',
    country: 'AUS',
    latitude: '-37.9567',
    longitude: '145.0456',
    courses: [{ courseID: 'course3', courseName: 'Championship Course', numHoles: 18, timestampUpdated: '1234567890', hasGPS: 1 }],
  },
];

// ============================================================================
// MOCK STATE
// ============================================================================

let mockApiAvailable = true;
let mockHasQuota = true;
let mockSearchResults: GolfApiClubSearchResult[] = mockApiResults;
let mockShouldThrowError = false;
let mockErrorMessage = 'API error';

// ============================================================================
// MOCKS
// ============================================================================

// Mock useUserCountry to avoid AuthProvider dependency
jest.mock('@/hooks/useUserCountry', () => ({
  useUserCountry: () => ({
    country: 'AUS',
    isLoading: false,
    effectiveCountry: 'AUS',
    gpsCountry: 'AUS',
  }),
}));

jest.mock('@/services/api/golfApiClient', () => ({
  golfApiClient: {
    isAvailable: jest.fn(() => mockApiAvailable),
    hasQuota: jest.fn((_required: number) => mockHasQuota),
    searchClubs: jest.fn(async () => {
      if (mockShouldThrowError) {
        throw new Error(mockErrorMessage);
      }
      return mockSearchResults;
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
  mockApiAvailable = true;
  mockHasQuota = true;
  mockSearchResults = mockApiResults;
  mockShouldThrowError = false;
  mockErrorMessage = 'API error';
  jest.clearAllMocks();
}

// ============================================================================
// TEST SUITE: Query Validation
// ============================================================================

describe('useGolfApiSearch - Query Validation', () => {
  beforeEach(resetMocks);

  it('should not fetch when query has less than 3 characters', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('ab'), { wrapper });

    // Query should be disabled
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();

    // Wait to ensure no fetch is triggered
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.data).toBeUndefined();
  });

  it('should not fetch when query is empty', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch(''), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch when query has exactly 3 characters', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('abc'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(2);
  });

  it('should fetch when query has more than 3 characters', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});

// ============================================================================
// TEST SUITE: Enabled State
// ============================================================================

describe('useGolfApiSearch - Enabled State', () => {
  beforeEach(resetMocks);

  it('should not fetch when enabled is false', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGolfApiSearch('Royal Melbourne', undefined, false),
      { wrapper }
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();

    // Wait to ensure no fetch is triggered
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch when enabled is true (default)', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should not fetch when enabled is true but query is too short', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGolfApiSearch('ab', undefined, true),
      { wrapper }
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});

// ============================================================================
// TEST SUITE: Result Transformation
// ============================================================================

describe('useGolfApiSearch - Result Transformation', () => {
  beforeEach(resetMocks);

  it('should transform API results to local format', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstResult = result.current.data?.[0];
    expect(firstResult).toBeDefined();

    // Check transformed fields
    expect(firstResult?.id).toBe('golfapi_141520610397251566');
    expect(firstResult?.name).toBe('Royal Melbourne Golf Club');
    expect(firstResult?.state).toBe('VIC');
    expect(firstResult?.city).toBe('Black Rock');
    expect(firstResult?.source).toBe('golfapi');
    expect(firstResult?.golfapi_club_id).toBe('141520610397251566');
  });

  it('should set courses to empty array', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const firstResult = result.current.data?.[0];
    expect(firstResult?.courses).toEqual([]);
  });

  it('should set is_home to false', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const firstResult = result.current.data?.[0];
    expect(firstResult?.is_home).toBe(false);
  });

  it('should detect multi-course clubs', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    // Royal Melbourne has 2 courses
    const royalMelbourne = result.current.data?.[0];
    expect(royalMelbourne?.is_multi_course).toBe(true);
    expect(royalMelbourne?.course_count).toBe(2);

    // Kingston Heath has 1 course
    const kingstonHeath = result.current.data?.[1];
    expect(kingstonHeath?.is_multi_course).toBe(false);
    expect(kingstonHeath?.course_count).toBe(1);
  });

  it('should parse latitude and longitude', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const firstResult = result.current.data?.[0];
    expect(firstResult?.latitude).toBe(-37.9789);
    expect(firstResult?.longitude).toBe(145.0129);
  });

  it('should handle null latitude/longitude gracefully', async () => {
    mockSearchResults = [
      {
        ...mockApiResult,
        latitude: null as unknown as string,
        longitude: null as unknown as string,
      },
    ];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const firstResult = result.current.data?.[0];
    expect(firstResult?.latitude).toBeNull();
    expect(firstResult?.longitude).toBeNull();
  });

  it('should handle invalid latitude/longitude strings', async () => {
    mockSearchResults = [
      {
        ...mockApiResult,
        latitude: 'invalid',
        longitude: 'not-a-number',
      },
    ];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const firstResult = result.current.data?.[0];
    expect(firstResult?.latitude).toBeNull();
    expect(firstResult?.longitude).toBeNull();
  });
});

// ============================================================================
// TEST SUITE: API Availability
// ============================================================================

describe('useGolfApiSearch - API Availability', () => {
  beforeEach(resetMocks);

  it('should return empty array when API is not available', async () => {
    mockApiAvailable = false;

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch when API is available', async () => {
    mockApiAvailable = true;

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.length).toBe(2);
  });
});

// ============================================================================
// TEST SUITE: Quota Checks
// ============================================================================

describe('useGolfApiSearch - Quota Checks', () => {
  beforeEach(resetMocks);

  it('should return empty array when quota is exhausted', async () => {
    mockHasQuota = false;

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch when quota is available', async () => {
    mockHasQuota = true;

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.length).toBe(2);
  });
});

// ============================================================================
// TEST SUITE: Error Handling
// ============================================================================

describe('useGolfApiSearch - Error Handling', () => {
  beforeEach(resetMocks);

  it('should return empty array on API error (graceful degradation)', async () => {
    mockShouldThrowError = true;
    mockErrorMessage = 'Network error';

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Hook catches errors and returns empty array
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should not retry on failure', async () => {
    mockShouldThrowError = true;

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Retry is disabled, so only one attempt
    const { golfApiClient } = require('@/services/api/golfApiClient');
    // searchClubs is called once since isAvailable and hasQuota pass
    expect(golfApiClient.searchClubs).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// TEST SUITE: State Filter
// ============================================================================

describe('useGolfApiSearch - State Filter', () => {
  beforeEach(resetMocks);

  it('should pass state parameter to API', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGolfApiSearch('Royal Melbourne', 'VIC'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { golfApiClient } = require('@/services/api/golfApiClient');
    expect(golfApiClient.searchClubs).toHaveBeenCalledWith({
      query: 'Royal Melbourne',
      country: 'AUS',
      state: 'VIC',
    });
  });

  it('should work without state parameter', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGolfApiSearch('Royal Melbourne'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { golfApiClient } = require('@/services/api/golfApiClient');
    expect(golfApiClient.searchClubs).toHaveBeenCalledWith({
      query: 'Royal Melbourne',
      country: 'AUS',
      state: undefined,
    });
  });
});

// ============================================================================
// TEST SUITE: isGolfApiResult Type Guard
// ============================================================================

describe('isGolfApiResult', () => {
  it('should return true for GolfAPI results', () => {
    const apiResult = { source: 'golfapi', name: 'Test' };
    expect(isGolfApiResult(apiResult)).toBe(true);
  });

  it('should return false for local results', () => {
    const localResult = { source: 'local', name: 'Test' };
    expect(isGolfApiResult(localResult)).toBe(false);
  });

  it('should return false for results without source', () => {
    const noSourceResult: { source?: string } = {};
    expect(isGolfApiResult(noSourceResult)).toBe(false);
  });

  it('should return false for undefined source', () => {
    const undefinedSource = { source: undefined, name: 'Test' };
    expect(isGolfApiResult(undefinedSource)).toBe(false);
  });
});

// ============================================================================
// TEST SUITE: Cache Behavior
// ============================================================================

describe('useGolfApiSearch - Cache Behavior', () => {
  beforeEach(resetMocks);

  it('should cache results for 5 minutes (staleTime)', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // First render
    const { result, rerender } = renderHook(
      () => useGolfApiSearch('Royal Melbourne'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { golfApiClient } = require('@/services/api/golfApiClient');
    expect(golfApiClient.searchClubs).toHaveBeenCalledTimes(1);

    // Rerender with same query - should use cache
    rerender({});

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Still only 1 call due to cache
    expect(golfApiClient.searchClubs).toHaveBeenCalledTimes(1);
  });

  it('should refetch for different queries', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // First query
    const { result, rerender } = renderHook(
      ({ query }) => useGolfApiSearch(query),
      {
        wrapper,
        initialProps: { query: 'Royal Melbourne' },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { golfApiClient } = require('@/services/api/golfApiClient');
    expect(golfApiClient.searchClubs).toHaveBeenCalledTimes(1);

    // Different query - should refetch
    rerender({ query: 'Kingston Heath' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Now 2 calls - one for each query
    expect(golfApiClient.searchClubs).toHaveBeenCalledTimes(2);
  });
});
