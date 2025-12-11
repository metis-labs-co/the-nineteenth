/**
 * Database Helper Types
 * Type utilities for working with database tables
 */

import type { Database } from './schema';

/**
 * Type-safe table names
 */
export type TableName = keyof Database['public']['Tables'];

/**
 * Get row type for a table
 */
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

/**
 * Get insert type for a table
 */
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];

/**
 * Get update type for a table
 */
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];
