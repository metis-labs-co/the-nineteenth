/**
 * Centralized cache time configurations for React Query
 *
 * Provides consistent cache timing across the application to ensure
 * predictable data freshness and reduce unnecessary API calls.
 */

/**
 * Standard cache times in milliseconds
 */
export const CACHE_TIMES = {
  /**
   * Very short cache - for rapidly changing data
   * Use for: Real-time scores, active round data
   */
  REALTIME: 10 * 1000, // 10 seconds

  /**
   * Short cache - for frequently changing data
   * Use for: Leaderboards, active competitions
   */
  SHORT: 30 * 1000, // 30 seconds

  /**
   * Frequent cache - for actively viewed data
   * Use for: Active challenges, live game state, prize pool status
   */
  FREQUENT: 60 * 1000, // 1 minute

  /**
   * Moderate cache - for semi-frequent updates
   * Use for: Search results, round details, knockout brackets
   */
  MODERATE: 2 * 60 * 1000, // 2 minutes

  /**
   * Standard cache - for moderately changing data
   * Use for: Competition lists, player profiles, course data
   */
  STANDARD: 5 * 60 * 1000, // 5 minutes

  /**
   * Long cache - for rarely changing data
   * Use for: Course details, historical data, completed competitions
   */
  LONG: 10 * 60 * 1000, // 10 minutes

  /**
   * Very long cache - for static/reference data
   * Use for: Course catalog, game type definitions
   */
  STATIC: 30 * 60 * 1000, // 30 minutes
} as const;

/**
 * Garbage collection times in milliseconds
 * These define how long unused data stays in cache
 */
export const GC_TIMES = {
  /**
   * Short GC - for frequently accessed data
   */
  SHORT: 5 * 60 * 1000, // 5 minutes

  /**
   * Standard GC - for most data
   */
  STANDARD: 10 * 60 * 1000, // 10 minutes

  /**
   * Long GC - for important/expensive queries
   */
  LONG: 30 * 60 * 1000, // 30 minutes
} as const;

/**
 * Default query options for common use cases
 */
export const QUERY_DEFAULTS = {
  /**
   * For real-time data like active scores
   */
  realtime: {
    staleTime: CACHE_TIMES.REALTIME,
    gcTime: GC_TIMES.SHORT,
    refetchInterval: CACHE_TIMES.REALTIME,
    retry: 2,
  },

  /**
   * For leaderboards and active competition data
   */
  leaderboard: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.STANDARD,
    refetchOnWindowFocus: true,
    retry: 2,
  },

  /**
   * For standard data like lists and profiles
   */
  standard: {
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  },

  /**
   * For static/reference data
   */
  static: {
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  },
} as const;
