/**
 * Course Sync Service
 *
 * Utilities for detecting stale club/course data and managing
 * opportunistic sync with GolfAPI.io.
 *
 * Strategy:
 * - Stale data detection based on 30-day TTL
 * - Quota-aware sync (check before making API calls)
 * - Only syncs clubs with golfapi_club_id (API-sourced)
 *
 * Usage:
 * - isClubStale(club) - Check if club needs refresh
 * - isCourseStale(course) - Check if course needs refresh
 * - hasApiQuota(required) - Check if we have API quota for sync
 *
 * Created January 2026 for GolfAPI.io integration
 */

import { golfApiClient } from '@/services/api/golfApiClient';
import type { Club, Course } from '@/types/database.types';

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Number of days before data is considered stale
 * Matches CACHE_TTL_DAYS in cacheService.ts
 */
export const STALE_DAYS = 30;

/**
 * Stale threshold in milliseconds
 */
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

// =====================================================
// STALENESS DETECTION
// =====================================================

/**
 * Check if a club's data is stale and needs refresh
 *
 * A club is stale if:
 * - It has a golfapi_club_id (can be synced from API)
 * - AND either:
 *   - last_synced is null (never synced)
 *   - last_synced is older than STALE_DAYS
 *
 * @param club - Club to check
 * @returns true if club is stale and can be refreshed, false otherwise
 */
export function isClubStale(club: Club): boolean {
  // Can't sync clubs without GolfAPI ID
  if (!club.golfapi_club_id) {
    return false;
  }

  // Never synced = stale
  if (!club.last_synced) {
    return true;
  }

  // Check if sync timestamp is older than threshold
  const lastSyncedTime = new Date(club.last_synced).getTime();
  const now = Date.now();

  return now - lastSyncedTime > STALE_MS;
}

/**
 * Check if a course's data is stale and needs refresh
 *
 * A course is stale if:
 * - golfapi_updated_at is null (never synced from API)
 * - OR golfapi_updated_at is older than STALE_DAYS
 *
 * Note: Courses without golfapi_course_id can still be stale
 * if they were partially imported. The parent club's sync
 * will refresh all its courses.
 *
 * @param course - Course to check
 * @returns true if course is stale, false otherwise
 */
export function isCourseStale(course: Course): boolean {
  // Never synced from API = stale
  if (!course.golfapi_updated_at) {
    return true;
  }

  // Check if sync timestamp is older than threshold
  const updatedAtTime = new Date(course.golfapi_updated_at).getTime();
  const now = Date.now();

  return now - updatedAtTime > STALE_MS;
}

// =====================================================
// QUOTA MANAGEMENT
// =====================================================

/**
 * Check if we have sufficient API quota for sync operations
 *
 * Uses golfApiClient.apiRequestsLeft to check remaining quota.
 * Returns true if:
 * - Quota is unknown (null) - assume we have quota
 * - Quota >= required amount
 *
 * @param required - Number of API requests needed (default: 1)
 * @returns true if sufficient quota available, false otherwise
 */
export function hasApiQuota(required: number = 1): boolean {
  const remaining = golfApiClient.apiRequestsLeft;

  // If we don't know quota, assume we have it
  // (will be updated after first API call)
  if (remaining === null) {
    return true;
  }

  return remaining >= required;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get the age of a club's sync in days
 *
 * @param club - Club to check
 * @returns Number of days since last sync, or null if never synced
 */
export function getClubSyncAgeDays(club: Club): number | null {
  if (!club.last_synced) {
    return null;
  }

  const lastSyncedTime = new Date(club.last_synced).getTime();
  const now = Date.now();
  const ageDays = (now - lastSyncedTime) / (24 * 60 * 60 * 1000);

  return Math.floor(ageDays);
}

/**
 * Get the age of a course's sync in days
 *
 * @param course - Course to check
 * @returns Number of days since last sync, or null if never synced
 */
export function getCourseSyncAgeDays(course: Course): number | null {
  if (!course.golfapi_updated_at) {
    return null;
  }

  const updatedAtTime = new Date(course.golfapi_updated_at).getTime();
  const now = Date.now();
  const ageDays = (now - updatedAtTime) / (24 * 60 * 60 * 1000);

  return Math.floor(ageDays);
}

/**
 * Check if a club can be synced (has GolfAPI ID)
 *
 * @param club - Club to check
 * @returns true if club has golfapi_club_id, false otherwise
 */
export function canSyncClub(club: Club): boolean {
  return Boolean(club.golfapi_club_id);
}
