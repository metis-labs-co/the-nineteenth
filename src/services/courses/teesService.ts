/**
 * Tees Service
 *
 * Manages tee data from the normalized tees table.
 * Replaces the legacy embedded tees JSONB in courses table.
 *
 * Features:
 * - CRUD operations for tees
 * - Upsert support for caching from GolfAPI.io
 * - Helper methods for tee calculations
 *
 * Added January 2026 for GolfAPI.io integration
 */

import { supabase } from '@/services/supabase/client';
import type { Tee } from '@/types/database.types';
import type { Database } from '@/types/supabase';

// =====================================================
// TYPES
// =====================================================

/**
 * Supabase database types for tees table
 */
type TeesTable = Database['public']['Tables']['tees'];
type TeeRow = TeesTable['Row'];
type TeeInsertDb = TeesTable['Insert'];
type TeeUpdateDb = TeesTable['Update'];

/**
 * Partial tee data for caching/upserting
 * Omits computed columns (total_length, front9_length, back9_length)
 */
export type TeeInsert = Omit<
  Partial<Tee>,
  'id' | 'created_at' | 'updated_at' | 'total_length' | 'front9_length' | 'back9_length'
> & {
  course_id: string;
  name: string;
};

/**
 * Common tee colors mapped to hex values
 */
export const TEE_COLORS: Record<string, string> = {
  blue: '#0066CC',
  white: '#FFFFFF',
  red: '#CC0000',
  yellow: '#FFCC00',
  black: '#000000',
  gold: '#FFD700',
  green: '#228B22',
  silver: '#C0C0C0',
  orange: '#FF8C00',
  pink: '#FF69B4',
};

/**
 * Default tee color for unknown tees
 */
export const DEFAULT_TEE_COLOR = '#808080';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate total length from per-hole lengths
 * Sum of length_hole_1 through length_hole_18
 *
 * @param tee - Partial tee object with length fields
 * @returns Total length (0 if all holes are null)
 */
export function calculateTotalLength(tee: Partial<Tee>): number {
  let total = 0;
  for (let i = 1; i <= 18; i++) {
    const key = `length_hole_${i}` as keyof Tee;
    const length = tee[key];
    if (typeof length === 'number') {
      total += length;
    }
  }
  return total;
}

/**
 * Calculate front 9 length
 *
 * @param tee - Partial tee object with length fields
 * @returns Front 9 length (0 if all holes are null)
 */
export function calculateFront9Length(tee: Partial<Tee>): number {
  let total = 0;
  for (let i = 1; i <= 9; i++) {
    const key = `length_hole_${i}` as keyof Tee;
    const length = tee[key];
    if (typeof length === 'number') {
      total += length;
    }
  }
  return total;
}

/**
 * Calculate back 9 length
 *
 * @param tee - Partial tee object with length fields
 * @returns Back 9 length (0 if all holes are null)
 */
export function calculateBack9Length(tee: Partial<Tee>): number {
  let total = 0;
  for (let i = 10; i <= 18; i++) {
    const key = `length_hole_${i}` as keyof Tee;
    const length = tee[key];
    if (typeof length === 'number') {
      total += length;
    }
  }
  return total;
}

/**
 * Get hex color for a tee name
 * Maps common tee names to their standard colors
 *
 * @param teeName - Name of the tee (e.g., "Blue", "White", "Red")
 * @returns Hex color code (e.g., "#0066CC")
 */
export function getTeeColor(teeName: string): string {
  const normalized = teeName.toLowerCase().trim();

  // Check for exact match
  if (TEE_COLORS[normalized]) {
    return TEE_COLORS[normalized];
  }

  // Check if the name contains a known color
  for (const [colorName, hexColor] of Object.entries(TEE_COLORS)) {
    if (normalized.includes(colorName)) {
      return hexColor;
    }
  }

  return DEFAULT_TEE_COLOR;
}

/**
 * Normalize tee color - use provided color if hex, otherwise derive from name
 *
 * @param color - Provided hex color (may be null)
 * @param name - Tee name to derive color from if not provided
 * @returns Hex color code
 */
export function normalizeTeeColor(color: string | null, name: string): string {
  // If color is provided and looks like a hex color, use it
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color;
  }

  // Otherwise derive from name
  return getTeeColor(name);
}

// =====================================================
// TEES SERVICE
// =====================================================

/**
 * Tees Service
 * Manages tee data from the normalized tees table
 */
class TeesService {
  /**
   * Get all tees for a course
   * Ordered by slope descending (longer/harder tees first)
   *
   * @param courseId - UUID of the course
   * @returns Array of Tee objects
   */
  async getTeesByCourse(courseId: string): Promise<Tee[]> {
    try {
      const { data, error } = await supabase
        .from('tees')
        .select('*')
        .eq('course_id', courseId)
        .order('slope', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('[TeesService] Error fetching tees by course:', error.message);
        return [];
      }

      return (data as Tee[]) || [];
    } catch (error) {
      console.error('[TeesService] Exception fetching tees by course:', error);
      return [];
    }
  }

  /**
   * Get a single tee by ID
   *
   * @param teeId - UUID of the tee
   * @returns Tee object or null if not found
   */
  async getTeeById(teeId: string): Promise<Tee | null> {
    try {
      const { data, error } = await supabase
        .from('tees')
        .select('*')
        .eq('id', teeId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          // Not just "not found"
          console.error('[TeesService] Error fetching tee by ID:', error.message);
        }
        return null;
      }

      return data as Tee;
    } catch (error) {
      console.error('[TeesService] Exception fetching tee by ID:', error);
      return null;
    }
  }

  /**
   * Get a tee by GolfAPI.io tee ID
   * Used for deduplication during import
   *
   * @param golfapiTeeId - GolfAPI.io TeeID
   * @returns Tee object or null if not found
   */
  async getTeeByGolfApiId(golfapiTeeId: string): Promise<Tee | null> {
    try {
      const { data, error } = await supabase
        .from('tees')
        .select('*')
        .eq('golfapi_tee_id', golfapiTeeId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          // Not just "not found"
          console.error('[TeesService] Error fetching tee by GolfAPI ID:', error.message);
        }
        return null;
      }

      return data as Tee;
    } catch (error) {
      console.error('[TeesService] Exception fetching tee by GolfAPI ID:', error);
      return null;
    }
  }

  /**
   * Get multiple tees by GolfAPI.io tee IDs
   * Used for batch deduplication during import
   *
   * @param golfapiTeeIds - Array of GolfAPI.io TeeIDs
   * @returns Map of golfapi_tee_id -> Tee
   */
  async getTeesByGolfApiIds(golfapiTeeIds: string[]): Promise<Map<string, Tee>> {
    try {
      if (golfapiTeeIds.length === 0) {
        return new Map();
      }

      const { data, error } = await supabase
        .from('tees')
        .select('*')
        .in('golfapi_tee_id', golfapiTeeIds);

      if (error) {
        console.error('[TeesService] Error fetching tees by GolfAPI IDs:', error.message);
        return new Map();
      }

      const tees = (data as Tee[]) || [];
      const map = new Map<string, Tee>();
      for (const tee of tees) {
        if (tee.golfapi_tee_id) {
          map.set(tee.golfapi_tee_id, tee);
        }
      }
      return map;
    } catch (error) {
      console.error('[TeesService] Exception fetching tees by GolfAPI IDs:', error);
      return new Map();
    }
  }

  /**
   * Cache (upsert) tees for a course
   * Matches by golfapi_tee_id if present, otherwise inserts new
   *
   * @param courseId - UUID of the course
   * @param tees - Array of partial tee data to cache
   * @returns Array of cached Tee objects with IDs
   */
  async cacheTees(courseId: string, tees: TeeInsert[]): Promise<Tee[]> {
    if (tees.length === 0) {
      return [];
    }

    const results: Tee[] = [];

    // Get existing tees by GolfAPI IDs for upsert logic
    const golfapiIds = tees
      .map((t) => t.golfapi_tee_id)
      .filter((id): id is string => id != null);
    const existingTees = await this.getTeesByGolfApiIds(golfapiIds);

    for (const teeData of tees) {
      try {
        // Check if tee already exists by golfapi_tee_id
        const existingTee = teeData.golfapi_tee_id
          ? existingTees.get(teeData.golfapi_tee_id)
          : null;

        // Normalize color
        const color = normalizeTeeColor(teeData.color || null, teeData.name);

        if (existingTee) {
          // Update existing tee - build update object explicitly
          const updateData: TeeUpdateDb = {
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
            updated_at: new Date().toISOString(),
          };

          const { data, error } = await supabase
            .from('tees')
            .update(updateData as unknown as never)
            .eq('id', existingTee.id)
            .select()
            .single();

          if (error) {
            console.warn('[TeesService] Failed to update tee:', teeData.name, error.message);
            continue;
          }

          results.push(data as Tee);
        } else {
          // Insert new tee - build insert object explicitly
          const insertData: TeeInsertDb = {
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

          const { data, error } = await supabase
            .from('tees')
            .insert(insertData as unknown as never)
            .select()
            .single();

          if (error) {
            console.warn('[TeesService] Failed to insert tee:', teeData.name, error.message);
            continue;
          }

          results.push(data as Tee);
        }
      } catch (error) {
        console.warn('[TeesService] Exception caching tee:', teeData.name, error);
        // Continue with other tees
      }
    }

    return results;
  }

  /**
   * Convert TeeInsert to Supabase insert format
   */
  private toInsertData(teeData: TeeInsert, courseId: string, color: string): TeeInsertDb {
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

  /**
   * Bulk upsert tees using ON CONFLICT
   * More efficient than individual upserts for large datasets
   *
   * @param courseId - UUID of the course
   * @param tees - Array of tee data to upsert
   * @returns Array of upserted Tee objects
   */
  async upsertTees(courseId: string, tees: TeeInsert[]): Promise<Tee[]> {
    if (tees.length === 0) {
      return [];
    }

    try {
      // Prepare tees with course_id and normalized color using explicit type conversion
      const teesToUpsert: TeeInsertDb[] = tees.map((tee) =>
        this.toInsertData(tee, courseId, normalizeTeeColor(tee.color || null, tee.name))
      );

      // Supabase doesn't support ON CONFLICT for multiple columns directly,
      // so we use the golfapi_tee_id as the unique key when available
      // For tees without golfapi_tee_id, we insert normally

      const withGolfApiId = teesToUpsert.filter((t) => t.golfapi_tee_id);
      const withoutGolfApiId = teesToUpsert.filter((t) => !t.golfapi_tee_id);

      const results: Tee[] = [];

      // Upsert tees with golfapi_tee_id
      if (withGolfApiId.length > 0) {
        const { data, error } = await supabase
          .from('tees')
          .upsert(withGolfApiId as unknown as never, {
            onConflict: 'golfapi_tee_id',
            ignoreDuplicates: false,
          })
          .select();

        if (error) {
          console.error('[TeesService] Error upserting tees with GolfAPI ID:', error.message);
        } else if (data) {
          results.push(...(data as Tee[]));
        }
      }

      // Insert tees without golfapi_tee_id
      if (withoutGolfApiId.length > 0) {
        const { data, error } = await supabase
          .from('tees')
          .insert(withoutGolfApiId as unknown as never)
          .select();

        if (error) {
          console.error('[TeesService] Error inserting tees without GolfAPI ID:', error.message);
        } else if (data) {
          results.push(...(data as Tee[]));
        }
      }

      return results;
    } catch (error) {
      console.error('[TeesService] Exception in upsertTees:', error);
      return [];
    }
  }

  /**
   * Delete all tees for a course
   * Used when refreshing course data from API
   *
   * @param courseId - UUID of the course
   */
  async deleteTeesByCourse(courseId: string): Promise<void> {
    try {
      const { error } = await supabase.from('tees').delete().eq('course_id', courseId);

      if (error) {
        throw new Error(`Failed to delete tees for course: ${error.message}`);
      }
    } catch (error) {
      console.error('[TeesService] Error deleting tees by course:', error);
      throw error;
    }
  }

  /**
   * Delete a single tee by ID
   *
   * @param teeId - UUID of the tee
   */
  async deleteTee(teeId: string): Promise<void> {
    try {
      const { error } = await supabase.from('tees').delete().eq('id', teeId);

      if (error) {
        throw new Error(`Failed to delete tee: ${error.message}`);
      }
    } catch (error) {
      console.error('[TeesService] Error deleting tee:', error);
      throw error;
    }
  }

  /**
   * Count tees for a course
   *
   * @param courseId - UUID of the course
   * @returns Number of tees
   */
  async countTeesByCourse(courseId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('tees')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      if (error) {
        console.error('[TeesService] Error counting tees:', error.message);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[TeesService] Exception counting tees:', error);
      return 0;
    }
  }

  /**
   * Get tees with complete data (has ratings and lengths)
   *
   * @param courseId - UUID of the course
   * @returns Array of tees with complete data
   */
  async getCompleteTees(courseId: string): Promise<Tee[]> {
    try {
      const { data, error } = await supabase
        .from('tees')
        .select('*')
        .eq('course_id', courseId)
        .not('slope', 'is', null)
        .not('course_rating', 'is', null)
        .order('slope', { ascending: false });

      if (error) {
        console.error('[TeesService] Error fetching complete tees:', error.message);
        return [];
      }

      return (data as Tee[]) || [];
    } catch (error) {
      console.error('[TeesService] Exception fetching complete tees:', error);
      return [];
    }
  }

  /**
   * Get the default tee for a course (first by slope)
   *
   * @param courseId - UUID of the course
   * @returns Default tee or null
   */
  async getDefaultTee(courseId: string): Promise<Tee | null> {
    try {
      const { data, error } = await supabase
        .from('tees')
        .select('*')
        .eq('course_id', courseId)
        .order('slope', { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[TeesService] Error fetching default tee:', error.message);
        }
        return null;
      }

      return data as Tee;
    } catch (error) {
      console.error('[TeesService] Exception fetching default tee:', error);
      return null;
    }
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
