/**
 * Tees Service Types
 *
 * Type definitions for the tees service.
 */

import type { Tee } from '@/types/database.types';
import type { Database } from '@/types/supabase';

/**
 * Supabase database types for tees table
 */
type TeesTable = Database['public']['Tables']['tees'];
type _TeeRow = TeesTable['Row'];
export type TeeInsertDb = TeesTable['Insert'];
export type TeeUpdateDb = TeesTable['Update'];

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
