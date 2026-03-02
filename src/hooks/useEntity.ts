/**
 * Generic Entity Hook Factory
 *
 * Provides a generic hook for fetching single entities from Supabase tables.
 * Reduces boilerplate for common single-entity fetch patterns.
 *
 * @example
 * ```tsx
 * // Simple usage
 * const { data: player } = useEntity('players', playerId);
 *
 * // With join query
 * const { data: course } = useEntity('courses', courseId, {
 *   select: '*, club:clubs(*)',
 * });
 *
 * // With type assertion
 * const { data: player } = useEntity<Player>('players', playerId);
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { Database } from '@/types/supabase';

/**
 * Supabase table names for type-safe querying
 */
export type SupabaseTable = keyof Database['public']['Tables'];

/**
 * Row type for a given table
 */
export type TableRow<T extends SupabaseTable> = Database['public']['Tables'][T]['Row'];

/**
 * Options for useEntity hook
 */
export interface UseEntityOptions<_T> {
  /**
   * Supabase select query (default: '*')
   * Use this for joins, e.g., '*, club:clubs(*)'
   */
  select?: string;

  /**
   * Custom query key prefix (default: table name)
   * Useful for more specific cache invalidation
   */
  queryKeyPrefix?: string;

  /**
   * Whether the query is enabled (default: true when id is provided)
   */
  enabled?: boolean;

  /**
   * How long the data is considered fresh (default: 5 minutes)
   */
  staleTime?: number;

  /**
   * How long to cache data after component unmounts (default: 5 minutes)
   */
  gcTime?: number;

  /**
   * Retry configuration
   */
  retry?: boolean | number;

  /**
   * Refetch on window focus
   */
  refetchOnWindowFocus?: boolean;
}

/**
 * Default stale time for entity queries (5 minutes)
 */
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

/**
 * Generic hook for fetching a single entity by ID
 *
 * @param table - Supabase table name
 * @param id - Entity ID (UUID)
 * @param options - Query options (select, staleTime, etc.)
 * @returns React Query result with entity data
 *
 * @example
 * ```tsx
 * function PlayerCard({ playerId }: { playerId: string }) {
 *   const { data: player, isLoading, error } = useEntity('players', playerId);
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error.message} />;
 *   if (!player) return <NotFound />;
 *
 *   return <Text>{player.full_name}</Text>;
 * }
 * ```
 */
export function useEntity<T = unknown>(
  table: SupabaseTable,
  id: string | undefined | null,
  options?: UseEntityOptions<T>
) {
  const {
    select = '*',
    queryKeyPrefix,
    staleTime = DEFAULT_STALE_TIME,
    enabled,
    gcTime,
    retry,
    refetchOnWindowFocus,
  } = options ?? {};

  const queryKey = [queryKeyPrefix ?? table, 'detail', id];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<T | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from(table)
        .select(select)
        .eq('id', id)
        .single();

      // Not found is a valid state, not an error
      if (error && error.code === 'PGRST116') {
        return null;
      }

      if (error) {
        throw new Error(`Failed to fetch ${table}: ${error.message}`);
      }

      return data as T;
    },
    enabled: enabled ?? !!id,
    staleTime,
    gcTime,
    retry,
    refetchOnWindowFocus,
  });
}

/**
 * Create a typed entity hook for a specific table
 *
 * Useful for creating reusable hooks with proper type inference.
 *
 * @param table - Supabase table name
 * @returns A hook function for fetching entities from that table
 *
 * @example
 * ```tsx
 * // Create a typed hook
 * const usePlayerById = createEntityHook<Player>('players');
 *
 * // Use it
 * function PlayerProfile({ id }: { id: string }) {
 *   const { data: player } = usePlayerById(id);
 *   return <Text>{player?.full_name}</Text>;
 * }
 * ```
 */
export function createEntityHook<T>(table: SupabaseTable, defaultOptions?: UseEntityOptions<T>) {
  return function useTypedEntity(id: string | undefined | null, options?: UseEntityOptions<T>) {
    return useEntity<T>(table, id, { ...defaultOptions, ...options });
  };
}

/**
 * Hook for fetching multiple entities by IDs
 *
 * @param table - Supabase table name
 * @param ids - Array of entity IDs
 * @param options - Query options
 * @returns React Query result with array of entities
 *
 * @example
 * ```tsx
 * const { data: players } = useEntities('players', playerIds);
 * ```
 */
export function useEntities<T = unknown>(
  table: SupabaseTable,
  ids: string[] | undefined | null,
  options?: UseEntityOptions<T>
) {
  const {
    select = '*',
    queryKeyPrefix,
    staleTime = DEFAULT_STALE_TIME,
    enabled,
    gcTime,
    retry,
    refetchOnWindowFocus,
  } = options ?? {};

  const queryKey = [queryKeyPrefix ?? table, 'list', ids?.sort().join(',')];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<T[]> => {
      if (!ids || ids.length === 0) return [];

      const { data, error } = await supabase.from(table).select(select).in('id', ids);

      if (error) {
        throw new Error(`Failed to fetch ${table}: ${error.message}`);
      }

      return (data as T[]) ?? [];
    },
    enabled: enabled ?? (!!ids && ids.length > 0),
    staleTime,
    gcTime,
    retry,
    refetchOnWindowFocus,
  });
}
