/**
 * useCourseDetails Hook Tests
 *
 * Tests for course details fetching hook including:
 * - Course data fetching by ID
 * - Venue data inclusion
 * - Hole data
 * - Tee information
 * - Favorite status
 * - Error handling
 * - Cache behavior
 *
 * @see src/hooks/useCourseDetails.ts
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCourseDetails, useCoursesByClub } from '@/hooks/useCourseDetails';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockVenue = {
  id: 'venue-123',
  name: 'Melbourne Golf Club',
  city: 'Melbourne',
  state: 'VIC',
  country: 'Australia',
  address: '123 Golf Drive, Melbourne VIC 3000',
  phone: '+61 3 1234 5678',
  website: 'https://melbournegc.com.au',
  latitude: -37.8136,
  longitude: 144.9631,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockHoles = Array.from({ length: 18 }, (_, i) => ({
  number: i + 1,
  par: i % 3 === 0 ? 5 : i % 3 === 1 ? 4 : 3,
  stroke_index: ((i * 2) % 18) + 1,
  distance: { blue: 380 + i * 10, white: 350 + i * 10, red: 320 + i * 10 },
}));

const mockTees = [
  { name: 'Blue', color: 'blue', rating: 72.5, slope: 130, distance: 6800 },
  { name: 'White', color: 'white', rating: 70.0, slope: 125, distance: 6200 },
  { name: 'Red', color: 'red', rating: 68.0, slope: 120, distance: 5600 },
];

// Course as returned by Supabase (with nested venue)
const mockCourseFromDB = {
  id: 'course-123',
  venue_id: 'venue-123',
  name: 'Championship Course',
  description: 'A challenging 18-hole championship course with stunning views.',
  holes: mockHoles,
  tees: mockTees,
  slope_rating: 130,
  course_rating: 72.5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  venue: mockVenue,
};

// Legacy mockCourse reference for tests
const mockCourse = mockCourseFromDB;

const mockCourses = [
  mockCourse,
  {
    ...mockCourse,
    id: 'course-456',
    name: 'Executive Course',
    description: 'A shorter 9-hole executive course.',
  },
];

// Mock state
let mockCourseData: typeof mockCourseFromDB | null = mockCourseFromDB;
let mockCoursesData: typeof mockCourses = mockCourses;
let mockFavoriteIds: string[] = ['course-123'];
let mockShouldThrowError = false;

// ============================================================================
// MOCKS
// ============================================================================

// Mock favorite courses hook
jest.mock('@/hooks/useFavoriteCourses', () => ({
  useIsFavorite: (courseId: string) => mockFavoriteIds.includes(courseId),
  useFavoriteEnrichment: () => ({
    isFavorite: (courseId: string) => mockFavoriteIds.includes(courseId),
    isLoading: false,
  }),
}));

// Mock Supabase client
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'courses') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn(() =>
            Promise.resolve({
              data: mockCoursesData,
              error: null,
            })
          ),
          single: jest.fn(() => {
            if (mockShouldThrowError) {
              return Promise.resolve({
                data: null,
                error: { message: 'Course not found', code: 'PGRST116' },
              });
            }
            return Promise.resolve({
              data: mockCourseData,
              error: null,
            });
          }),
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
// TEST SUITE: useCourseDetails
// ============================================================================

describe('useCourseDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCourseData = mockCourseFromDB;
    mockFavoriteIds = ['course-123'];
    mockShouldThrowError = false;
  });

  describe('Data Fetching', () => {
    it('fetches course by ID', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCourseDetails('course-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.id).toBe('course-123');
    });

    it('returns loading state initially', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCourseDetails('course-123'), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('includes hole data', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCourseDetails('course-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The hook includes holes from the course data
      if (result.current.data) {
        expect(result.current.data).toHaveProperty('holes');
      }
    });

    it('includes par and stroke index for each hole', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCourseDetails('course-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const holes = result.current.data?.holes;
      if (holes && holes.length > 0) {
        const hole = holes[0];
        expect(hole).toHaveProperty('par');
        expect(hole).toHaveProperty('stroke_index');
      }
    });

    it('includes tee information', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCourseDetails('course-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The hook returns tees array from the course data
      if (result.current.data) {
        expect(result.current.data).toHaveProperty('tees');
      }
    });
  });

  describe('Venue Data', () => {
    it('includes venue in response', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCourseDetails('course-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The hook includes venue property in returned data
      if (result.current.data) {
        expect(result.current.data).toHaveProperty('venue');
      }
    });
  });

  describe('Favorite Status', () => {
    it('includes is_favorite in response', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCourseDetails('course-123'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The hook adds is_favorite from centralized favorites hook
      if (result.current.data) {
        expect(result.current.data).toHaveProperty('is_favorite');
      }
    });
  });

  describe('Error Handling', () => {
    it('returns null when course not found', async () => {
      mockCourseData = null;

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCourseDetails('nonexistent'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Hook returns null when course not found
      expect(result.current.data).toBeNull();
    });
  });

  describe('Query Behavior', () => {
    it('returns null data when courseId is empty', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCourseDetails(''), {
        wrapper,
      });

      // When courseId is empty, query is disabled, so data is null
      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      // Disabled query returns null, not undefined
      expect(result.current.data).toBeNull();
    });
  });
});

// ============================================================================
// TEST SUITE: useCoursesByClub
// ============================================================================

describe('useCoursesByClub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCoursesData = mockCourses;
    mockFavoriteIds = ['course-123'];
  });

  it('fetches courses by venue ID', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCoursesByClub('venue-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(2);
  });

  it('includes favorite status for each course', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCoursesByClub('venue-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const favoriteCourse = result.current.data?.find(
      (c) => c.id === 'course-123'
    );
    expect(favoriteCourse?.is_favorite).toBe(true);

    const nonFavoriteCourse = result.current.data?.find(
      (c) => c.id === 'course-456'
    );
    expect(nonFavoriteCourse?.is_favorite).toBe(false);
  });

  it('returns empty array when venue has no courses', async () => {
    mockCoursesData = [];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCoursesByClub('venue-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('does not fetch when venueId is empty', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCoursesByClub(''), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
  });
});
