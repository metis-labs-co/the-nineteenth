/**
 * Tees Service - Sync/Import Operations
 *
 * Cache and upsert tee data from GolfAPI.io.
 */

import { supabase } from '@/services/supabase/client';
import type { Tee } from '@/types/database.types';
import { createModuleLogger } from '@/utils/debugLogger';
import type { TeeInsert, TeeInsertDb, TeeUpdateDb } from './types';
import { normalizeTeeColor } from './helpers';
import { getTeesByGolfApiIds } from './queries';

const logger = createModuleLogger('TeesService');

/**
 * Convert TeeInsert to Supabase insert format
 */
function toInsertData(teeData: TeeInsert, courseId: string, color: string): TeeInsertDb {
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
 * Cache (upsert) tees for a course
 * Matches by golfapi_tee_id if present, otherwise inserts new
 *
 * @param courseId - UUID of the course
 * @param tees - Array of partial tee data to cache
 * @returns Array of cached Tee objects with IDs
 */
export async function cacheTees(courseId: string, tees: TeeInsert[]): Promise<Tee[]> {
  if (tees.length === 0) {
    return [];
  }

  const results: Tee[] = [];

  // Get existing tees by GolfAPI IDs for upsert logic
  const golfapiIds = tees
    .map((t) => t.golfapi_tee_id)
    .filter((id): id is string => id != null);
  const existingTees = await getTeesByGolfApiIds(golfapiIds);

  for (const teeData of tees) {
    try {
      // Check if tee already exists by golfapi_tee_id
      const existingTee = teeData.golfapi_tee_id
        ? existingTees.get(teeData.golfapi_tee_id)
        : null;

      // Normalize color
      const color = normalizeTeeColor(teeData.color || null, teeData.name);

      if (existingTee) {
        // Update existing tee using shared field mapping
        const updateData: TeeUpdateDb = {
          ...toInsertData(teeData, courseId, color),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('tees')
          .update(updateData as unknown as never)
          .eq('id', existingTee.id)
          .select()
          .single();

        if (error) {
          logger.warn('Failed to update tee', { name: teeData.name, error: error.message });
          continue;
        }

        results.push(data as Tee);
      } else {
        // Insert new tee using shared field mapping
        const insertData = toInsertData(teeData, courseId, color);

        const { data, error } = await supabase
          .from('tees')
          .insert(insertData as unknown as never)
          .select()
          .single();

        if (error) {
          logger.warn('Failed to insert tee', { name: teeData.name, error: error.message });
          continue;
        }

        results.push(data as Tee);
      }
    } catch (error) {
      logger.warn('Exception caching tee', { name: teeData.name, error: error instanceof Error ? error.message : String(error) });
      // Continue with other tees
    }
  }

  return results;
}

/**
 * Bulk upsert tees using ON CONFLICT
 * More efficient than individual upserts for large datasets
 *
 * @param courseId - UUID of the course
 * @param tees - Array of tee data to upsert
 * @returns Array of upserted Tee objects
 */
export async function upsertTees(courseId: string, tees: TeeInsert[]): Promise<Tee[]> {
  if (tees.length === 0) {
    return [];
  }

  try {
    // Prepare tees with course_id and normalized color using explicit type conversion
    const teesToUpsert: TeeInsertDb[] = tees.map((tee) =>
      toInsertData(tee, courseId, normalizeTeeColor(tee.color || null, tee.name))
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
        logger.error('Error upserting tees with GolfAPI ID', error.message);
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
        logger.error('Error inserting tees without GolfAPI ID', error.message);
      } else if (data) {
        results.push(...(data as Tee[]));
      }
    }

    return results;
  } catch (error) {
    logger.error('Exception in upsertTees', error);
    return [];
  }
}
