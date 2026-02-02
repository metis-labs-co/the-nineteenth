/**
 * Cache Service Types
 *
 * Shared types and constants for club and course caching.
 */

import type { Club, Course } from '@/types/database.types';
import type { AustralianState } from '@/types/database/enums';
import type { Database } from '@/types/supabase';

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Cache TTL in days
 */
export const CACHE_TTL_DAYS = 30;

/**
 * Cache TTL in milliseconds
 */
export const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

// =====================================================
// DATABASE TYPES
// =====================================================

/**
 * Supabase database types
 */
export type ClubsTable = Database['public']['Tables']['clubs'];
export type ClubRow = ClubsTable['Row'];
export type ClubInsertDb = ClubsTable['Insert'];
export type ClubUpdateDb = ClubsTable['Update'];

export type CoursesTable = Database['public']['Tables']['courses'];
export type CourseRow = CoursesTable['Row'];
export type CourseInsertDb = CoursesTable['Insert'];
export type CourseUpdateDb = CoursesTable['Update'];

// =====================================================
// PUBLIC TYPES
// =====================================================

/**
 * Search parameters for clubs
 */
export interface CacheSearchParams {
  query?: string;
  state?: AustralianState;
  city?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search result for clubs
 */
export interface CacheSearchResult {
  clubs: Club[];
  total: number;
  hasMore: boolean;
}

/**
 * Partial club data for caching
 */
export type ClubInsert = Omit<Partial<Club>, 'id' | 'created_at' | 'updated_at'> & {
  name: string;
};

/**
 * Partial course data for caching
 */
export type CourseInsert = Omit<Partial<Course>, 'id' | 'created_at' | 'updated_at'> & {
  club_id: string;
  name: string;
};

/**
 * Cache statistics
 */
export interface CacheStats {
  totalClubs: number;
  apiClubs: number;
  manualClubs: number;
  staleClubs: number;
  freshClubs: number;
  totalCourses: number;
}
