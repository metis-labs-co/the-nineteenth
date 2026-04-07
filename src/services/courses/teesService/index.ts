/**
 * Tees Service - Index Barrel
 *
 * Re-exports all tees service modules and provides the same class-based
 * singleton API for backward compatibility.
 *
 * Modules:
 * - types: Type definitions
 * - helpers: Pure utility functions (color mapping, length calculations)
 * - queries: Query operations (get, count, delete tees)
 * - sync: Cache/upsert operations (import from API)
 */

// Re-export types
export type { TeeInsert, TeeInsertDb, TeeUpdateDb } from './types';

// Re-export helpers
export {
  TEE_COLORS,
  DEFAULT_TEE_COLOR,
  calculateTotalLength,
  calculateFront9Length,
  calculateBack9Length,
  getTeeColor,
  normalizeTeeColor,
} from './helpers';

// Re-export query functions
export {
  getTeesByCourse,
  getTeeById,
  getTeeByGolfApiId,
  getTeesByGolfApiIds,
  countTeesByCourse,
  getCompleteTees,
  getDefaultTee,
  deleteTeesByCourse,
  deleteTee,
} from './queries';

// Re-export sync functions
export { cacheTees, upsertTees } from './sync';

// Import all functions for the class wrapper
import {
  getTeesByCourse,
  getTeeById,
  getTeeByGolfApiId,
  getTeesByGolfApiIds,
  countTeesByCourse,
  getCompleteTees,
  getDefaultTee,
  deleteTeesByCourse,
  deleteTee,
} from './queries';
import { cacheTees, upsertTees } from './sync';
import { normalizeTeeColor } from './helpers';

import type { Tee } from '@/types/database.types';
import type { TeeInsert, TeeInsertDb } from './types';

// =====================================================
// CLASS WRAPPER (backward compatibility)
// =====================================================

/**
 * Tees Service
 * Manages tee data from the normalized tees table
 *
 * This class delegates to the focused module functions.
 * New code can import functions directly from the submodules.
 */
class TeesService {
  async getTeesByCourse(courseId: string): Promise<Tee[]> {
    return getTeesByCourse(courseId);
  }

  async getTeeById(teeId: string): Promise<Tee | null> {
    return getTeeById(teeId);
  }

  async getTeeByGolfApiId(golfapiTeeId: string): Promise<Tee | null> {
    return getTeeByGolfApiId(golfapiTeeId);
  }

  async getTeesByGolfApiIds(golfapiTeeIds: string[]): Promise<Map<string, Tee>> {
    return getTeesByGolfApiIds(golfapiTeeIds);
  }

  async cacheTees(courseId: string, tees: TeeInsert[]): Promise<Tee[]> {
    return cacheTees(courseId, tees);
  }

  /**
   * Convert TeeInsert to Supabase insert format
   * @deprecated Use the toInsertData function from sync module directly
   */
  private toInsertData(teeData: TeeInsert, courseId: string, color: string): TeeInsertDb {
    // This is kept for backward compatibility - the actual logic is in sync.ts
    return {
      name: teeData.name,
      course_id: courseId,
      color,
      golfapi_tee_id: teeData.golfapi_tee_id,
      slope: teeData.slope,
      slope_front9: teeData.slope_front9,
      slope_back9: teeData.slope_back9,
      course_rating: teeData.course_rating,
      course_rating_front9: teeData.course_rating_front9,
      course_rating_back9: teeData.course_rating_back9,
      slope_women: teeData.slope_women,
      slope_women_front9: teeData.slope_women_front9,
      slope_women_back9: teeData.slope_women_back9,
      course_rating_women: teeData.course_rating_women,
      course_rating_women_front9: teeData.course_rating_women_front9,
      course_rating_women_back9: teeData.course_rating_women_back9,
      measure_unit: teeData.measure_unit,
      length_hole_1: teeData.length_hole_1,
      length_hole_2: teeData.length_hole_2,
      length_hole_3: teeData.length_hole_3,
      length_hole_4: teeData.length_hole_4,
      length_hole_5: teeData.length_hole_5,
      length_hole_6: teeData.length_hole_6,
      length_hole_7: teeData.length_hole_7,
      length_hole_8: teeData.length_hole_8,
      length_hole_9: teeData.length_hole_9,
      length_hole_10: teeData.length_hole_10,
      length_hole_11: teeData.length_hole_11,
      length_hole_12: teeData.length_hole_12,
      length_hole_13: teeData.length_hole_13,
      length_hole_14: teeData.length_hole_14,
      length_hole_15: teeData.length_hole_15,
      length_hole_16: teeData.length_hole_16,
      length_hole_17: teeData.length_hole_17,
      length_hole_18: teeData.length_hole_18,
    };
  }

  async upsertTees(courseId: string, tees: TeeInsert[]): Promise<Tee[]> {
    return upsertTees(courseId, tees);
  }

  async deleteTeesByCourse(courseId: string): Promise<void> {
    return deleteTeesByCourse(courseId);
  }

  async deleteTee(teeId: string): Promise<void> {
    return deleteTee(teeId);
  }

  async countTeesByCourse(courseId: string): Promise<number> {
    return countTeesByCourse(courseId);
  }

  async getCompleteTees(courseId: string): Promise<Tee[]> {
    return getCompleteTees(courseId);
  }

  async getDefaultTee(courseId: string): Promise<Tee | null> {
    return getDefaultTee(courseId);
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Singleton tees service instance
 */
export const teesService = new TeesService();

/**
 * Export class for testing
 */
export { TeesService };
