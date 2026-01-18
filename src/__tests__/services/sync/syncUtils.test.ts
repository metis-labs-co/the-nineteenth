/**
 * Sync Service Utilities Tests
 *
 * Tests for sync utilities that handle staleness detection
 * and API quota checking for GolfAPI.io course data sync.
 *
 * Key test areas:
 * - isClubStale: Detecting clubs that need refresh
 * - isCourseStale: Detecting courses that need refresh
 * - hasApiQuota: Checking remaining API quota
 * - getClubSyncAgeDays/getCourseSyncAgeDays: Age calculation utilities
 * - canSyncClub: Checking if club can be synced
 */

import {
  isClubStale,
  isCourseStale,
  hasApiQuota,
  getClubSyncAgeDays,
  getCourseSyncAgeDays,
  canSyncClub,
  STALE_DAYS,
} from '@/services/sync';
import { golfApiClient } from '@/services/api/golfApiClient';
import type { Club, Course } from '@/types/database.types';

// Mock the golfApiClient
jest.mock('@/services/api/golfApiClient', () => ({
  golfApiClient: {
    apiRequestsLeft: null,
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock Club for testing
 */
function createMockClub(overrides?: Partial<Club>): Club {
  return {
    id: 'club-uuid-123',
    source: 'api',
    golfapi_club_id: '141520610397251566',
    name: 'Royal Melbourne Golf Club',
    address: '450 Golf Links Rd',
    city: 'Sandringham',
    postal_code: '3191',
    state: 'VIC',
    country: 'Australia',
    continent: 'Oceania',
    phone: '+61 3 9598 0001',
    email: null,
    website: 'https://royalmelbourne.com.au',
    latitude: -37.9201,
    longitude: 145.0059,
    location: { type: 'Point', coordinates: [145.0059, -37.9201] },
    total_holes: 36,
    last_synced: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock Course for testing
 */
function createMockCourse(overrides?: Partial<Course>): Course {
  return {
    id: 'course-uuid-123',
    club_id: 'club-uuid-123',
    golfapi_course_id: '012141520658891108829',
    golfapi_long_course_id: null,
    name: 'West Course',
    description: null,
    num_holes: 18,
    measure_unit: 'y',
    holes: Array.from({ length: 18 }, (_, i) => ({
      number: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18,
      par: 4 as 3 | 4 | 5,
      strokeIndex: i + 1,
    })),
    holes_women: null,
    match_play_indexes: null,
    tees: null,
    tees_migrated: true,
    course_rating: 73.5,
    slope_rating: 135,
    golfapi_updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Course;
}

/**
 * Create a date X days in the past
 */
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// ============================================================================
// Tests
// ============================================================================

describe('Sync Service Utilities', () => {
  // ==========================================================================
  // STALE_DAYS constant
  // ==========================================================================
  describe('STALE_DAYS', () => {
    it('should be 30 days', () => {
      expect(STALE_DAYS).toBe(30);
    });
  });

  // ==========================================================================
  // isClubStale
  // ==========================================================================
  describe('isClubStale', () => {
    describe('clubs without golfapi_club_id', () => {
      it('returns false for club without golfapi_club_id (null)', () => {
        const club = createMockClub({ golfapi_club_id: null });
        expect(isClubStale(club)).toBe(false);
      });

      it('returns false for manual club without golfapi_club_id', () => {
        const club = createMockClub({
          golfapi_club_id: null,
          source: 'manual',
          last_synced: null,
        });
        expect(isClubStale(club)).toBe(false);
      });
    });

    describe('clubs never synced', () => {
      it('returns true for club with null last_synced', () => {
        const club = createMockClub({
          golfapi_club_id: '123456789',
          last_synced: null,
        });
        expect(isClubStale(club)).toBe(true);
      });
    });

    describe('clubs with old last_synced', () => {
      it('returns true for club synced 31 days ago', () => {
        const club = createMockClub({
          golfapi_club_id: '123456789',
          last_synced: daysAgo(31),
        });
        expect(isClubStale(club)).toBe(true);
      });

      it('returns true for club synced 60 days ago', () => {
        const club = createMockClub({
          golfapi_club_id: '123456789',
          last_synced: daysAgo(60),
        });
        expect(isClubStale(club)).toBe(true);
      });

      it('returns true for club synced exactly STALE_DAYS + 1 days ago', () => {
        const club = createMockClub({
          golfapi_club_id: '123456789',
          last_synced: daysAgo(STALE_DAYS + 1),
        });
        expect(isClubStale(club)).toBe(true);
      });
    });

    describe('clubs recently synced', () => {
      it('returns false for club synced today', () => {
        const club = createMockClub({
          golfapi_club_id: '123456789',
          last_synced: new Date().toISOString(),
        });
        expect(isClubStale(club)).toBe(false);
      });

      it('returns false for club synced 1 day ago', () => {
        const club = createMockClub({
          golfapi_club_id: '123456789',
          last_synced: daysAgo(1),
        });
        expect(isClubStale(club)).toBe(false);
      });

      it('returns false for club synced 29 days ago', () => {
        const club = createMockClub({
          golfapi_club_id: '123456789',
          last_synced: daysAgo(29),
        });
        expect(isClubStale(club)).toBe(false);
      });

      it('returns false for club synced exactly STALE_DAYS days ago', () => {
        // Exactly at threshold should not be stale (needs to be > STALE_DAYS)
        const club = createMockClub({
          golfapi_club_id: '123456789',
          last_synced: daysAgo(STALE_DAYS),
        });
        // Note: Due to time calculation, this might be slightly over/under
        // The function checks if elapsed time > STALE_MS, so exactly at threshold is NOT stale
        expect(isClubStale(club)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // isCourseStale
  // ==========================================================================
  describe('isCourseStale', () => {
    describe('courses never synced', () => {
      it('returns true for course with null golfapi_updated_at', () => {
        const course = createMockCourse({ golfapi_updated_at: null });
        expect(isCourseStale(course)).toBe(true);
      });
    });

    describe('courses with old golfapi_updated_at', () => {
      it('returns true for course updated 31 days ago', () => {
        const course = createMockCourse({
          golfapi_updated_at: daysAgo(31),
        });
        expect(isCourseStale(course)).toBe(true);
      });

      it('returns true for course updated 90 days ago', () => {
        const course = createMockCourse({
          golfapi_updated_at: daysAgo(90),
        });
        expect(isCourseStale(course)).toBe(true);
      });
    });

    describe('courses recently updated', () => {
      it('returns false for course updated today', () => {
        const course = createMockCourse({
          golfapi_updated_at: new Date().toISOString(),
        });
        expect(isCourseStale(course)).toBe(false);
      });

      it('returns false for course updated 15 days ago', () => {
        const course = createMockCourse({
          golfapi_updated_at: daysAgo(15),
        });
        expect(isCourseStale(course)).toBe(false);
      });

      it('returns false for course updated 29 days ago', () => {
        const course = createMockCourse({
          golfapi_updated_at: daysAgo(29),
        });
        expect(isCourseStale(course)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // hasApiQuota
  // ==========================================================================
  describe('hasApiQuota', () => {
    // Reset mock before each test
    beforeEach(() => {
      (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = null;
    });

    describe('when quota is unknown (null)', () => {
      it('returns true with default required amount', () => {
        (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = null;
        expect(hasApiQuota()).toBe(true);
      });

      it('returns true with specific required amount', () => {
        (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = null;
        expect(hasApiQuota(10)).toBe(true);
      });
    });

    describe('when quota is sufficient', () => {
      it('returns true when quota is 100 and required is 1', () => {
        (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = 100;
        expect(hasApiQuota(1)).toBe(true);
      });

      it('returns true when quota equals required', () => {
        (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = 5;
        expect(hasApiQuota(5)).toBe(true);
      });

      it('returns true when quota is greater than required', () => {
        (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = 50;
        expect(hasApiQuota(10)).toBe(true);
      });

      it('returns true with default required (1) when quota is positive', () => {
        (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = 1;
        expect(hasApiQuota()).toBe(true);
      });
    });

    describe('when quota is insufficient', () => {
      it('returns false when quota is 0', () => {
        (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = 0;
        expect(hasApiQuota()).toBe(false);
      });

      it('returns false when quota is less than required', () => {
        (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = 3;
        expect(hasApiQuota(5)).toBe(false);
      });

      it('returns false when quota is 0 and required is 1', () => {
        (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = 0;
        expect(hasApiQuota(1)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // getClubSyncAgeDays
  // ==========================================================================
  describe('getClubSyncAgeDays', () => {
    it('returns null for club with null last_synced', () => {
      const club = createMockClub({ last_synced: null });
      expect(getClubSyncAgeDays(club)).toBe(null);
    });

    it('returns 0 for club synced today', () => {
      const club = createMockClub({ last_synced: new Date().toISOString() });
      expect(getClubSyncAgeDays(club)).toBe(0);
    });

    it('returns correct days for club synced 10 days ago', () => {
      const club = createMockClub({ last_synced: daysAgo(10) });
      expect(getClubSyncAgeDays(club)).toBe(10);
    });

    it('returns correct days for club synced 30 days ago', () => {
      const club = createMockClub({ last_synced: daysAgo(30) });
      expect(getClubSyncAgeDays(club)).toBe(30);
    });

    it('floors the result to whole days', () => {
      // Create a timestamp 1.5 days ago
      const date = new Date();
      date.setTime(date.getTime() - 1.5 * 24 * 60 * 60 * 1000);
      const club = createMockClub({ last_synced: date.toISOString() });
      expect(getClubSyncAgeDays(club)).toBe(1); // Should floor to 1
    });
  });

  // ==========================================================================
  // getCourseSyncAgeDays
  // ==========================================================================
  describe('getCourseSyncAgeDays', () => {
    it('returns null for course with null golfapi_updated_at', () => {
      const course = createMockCourse({ golfapi_updated_at: null });
      expect(getCourseSyncAgeDays(course)).toBe(null);
    });

    it('returns 0 for course updated today', () => {
      const course = createMockCourse({
        golfapi_updated_at: new Date().toISOString(),
      });
      expect(getCourseSyncAgeDays(course)).toBe(0);
    });

    it('returns correct days for course updated 15 days ago', () => {
      const course = createMockCourse({
        golfapi_updated_at: daysAgo(15),
      });
      expect(getCourseSyncAgeDays(course)).toBe(15);
    });

    it('returns correct days for course updated 45 days ago', () => {
      const course = createMockCourse({
        golfapi_updated_at: daysAgo(45),
      });
      expect(getCourseSyncAgeDays(course)).toBe(45);
    });
  });

  // ==========================================================================
  // canSyncClub
  // ==========================================================================
  describe('canSyncClub', () => {
    it('returns true for club with golfapi_club_id', () => {
      const club = createMockClub({ golfapi_club_id: '123456789' });
      expect(canSyncClub(club)).toBe(true);
    });

    it('returns false for club with null golfapi_club_id', () => {
      const club = createMockClub({ golfapi_club_id: null });
      expect(canSyncClub(club)).toBe(false);
    });

    it('returns false for club with empty string golfapi_club_id', () => {
      // Empty string is falsy in Boolean check
      // Based on implementation: Boolean(club.golfapi_club_id)
      const club = createMockClub({ golfapi_club_id: '' });
      expect(canSyncClub(club)).toBe(false);
    });

    it('returns true for manual club with golfapi_club_id', () => {
      const club = createMockClub({
        source: 'manual',
        golfapi_club_id: '123456789',
      });
      expect(canSyncClub(club)).toBe(true);
    });
  });

  // ==========================================================================
  // Integration: Combined staleness and quota checks
  // ==========================================================================
  describe('Integration: Staleness and quota combined', () => {
    beforeEach(() => {
      (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = 100;
    });

    it('club with stale data and available quota should be synced', () => {
      const club = createMockClub({
        golfapi_club_id: '123456789',
        last_synced: daysAgo(45),
      });

      const shouldSync = isClubStale(club) && hasApiQuota();
      expect(shouldSync).toBe(true);
    });

    it('club with fresh data should not be synced even with quota', () => {
      const club = createMockClub({
        golfapi_club_id: '123456789',
        last_synced: daysAgo(5),
      });

      const shouldSync = isClubStale(club) && hasApiQuota();
      expect(shouldSync).toBe(false);
    });

    it('stale club should not sync when quota is exhausted', () => {
      (golfApiClient as { apiRequestsLeft: number | null }).apiRequestsLeft = 0;

      const club = createMockClub({
        golfapi_club_id: '123456789',
        last_synced: daysAgo(45),
      });

      const shouldSync = isClubStale(club) && hasApiQuota();
      expect(shouldSync).toBe(false);
    });

    it('manual club should never be synced regardless of quota', () => {
      const club = createMockClub({
        golfapi_club_id: null,
        source: 'manual',
        last_synced: null,
      });

      const shouldSync = canSyncClub(club) && isClubStale(club) && hasApiQuota();
      expect(shouldSync).toBe(false);
    });
  });
});
