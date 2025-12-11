/**
 * TanStack Query Key Definitions
 *
 * Centralized query key management for type-safe cache invalidation
 * and query organization.
 *
 * Pattern: Use functions that return const arrays for type inference
 * @see https://tanstack.com/query/latest/docs/react/guides/query-keys
 */

// =====================================================
// AUTHENTICATION
// =====================================================

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  player: (userId: string) => [...authKeys.all, 'player', userId] as const,
} as const;

// =====================================================
// COMPETITIONS
// =====================================================

export const competitionKeys = {
  all: ['competitions'] as const,
  lists: () => [...competitionKeys.all, 'list'] as const,
  list: (filters?: { status?: string; organizerId?: string }) =>
    [...competitionKeys.lists(), filters] as const,
  details: () => [...competitionKeys.all, 'detail'] as const,
  detail: (id: string) => [...competitionKeys.details(), id] as const,
} as const;

// =====================================================
// ROUNDS
// =====================================================

export const roundKeys = {
  all: ['rounds'] as const,
  lists: () => [...roundKeys.all, 'list'] as const,
  list: (competitionId: string) => [...roundKeys.lists(), competitionId] as const,
  details: () => [...roundKeys.all, 'detail'] as const,
  detail: (id: string) => [...roundKeys.details(), id] as const,
} as const;

// =====================================================
// VENUES
// =====================================================

export const venueKeys = {
  all: ['venues'] as const,
  lists: () => [...venueKeys.all, 'list'] as const,
  list: (filters?: { state?: string; search?: string }) =>
    [...venueKeys.lists(), filters] as const,
  withCourses: () => [...venueKeys.all, 'with-courses'] as const,
  withCoursesFiltered: (filters?: { state?: string; search?: string }) =>
    [...venueKeys.withCourses(), filters] as const,
  details: () => [...venueKeys.all, 'detail'] as const,
  detail: (id: string) => [...venueKeys.details(), id] as const,
} as const;

// =====================================================
// COURSES
// =====================================================

export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: (filters?: {
    state?: string;
    city?: string;
    search?: string;
    venueId?: string;
  }) => [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
  search: (query: string) => [...courseKeys.all, 'search', query] as const,
  favorites: () => [...courseKeys.all, 'favorites'] as const,
  byVenue: (venueId: string) => [...courseKeys.all, 'venue', venueId] as const,
  // API-specific keys (GolfAPI.io)
  apiSearch: (query: string, state?: string) =>
    [...courseKeys.all, 'api-search', query, state] as const,
  detailWithApi: (id: string) => [...courseKeys.details(), id, 'with-api'] as const,
  importStatus: (apiId: string) => [...courseKeys.all, 'import', apiId] as const,
  cacheStats: () => [...courseKeys.all, 'cache-stats'] as const,
} as const;

// =====================================================
// PLAYERS
// =====================================================

export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (competitionId?: string) =>
    [...playerKeys.lists(), competitionId] as const,
  details: () => [...playerKeys.all, 'detail'] as const,
  detail: (id: string) => [...playerKeys.details(), id] as const,
} as const;

// =====================================================
// SCORECARDS
// =====================================================

export const scorecardKeys = {
  all: ['scorecards'] as const,
  lists: () => [...scorecardKeys.all, 'list'] as const,
  list: (filters: { roundId?: string; competitionId?: string }) =>
    [...scorecardKeys.lists(), filters] as const,
  details: () => [...scorecardKeys.all, 'detail'] as const,
  detail: (id: string) => [...scorecardKeys.details(), id] as const,
  player: (roundId: string, playerId: string) =>
    [...scorecardKeys.all, 'player', roundId, playerId] as const,
} as const;

// =====================================================
// LEADERBOARD
// =====================================================

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  competition: (competitionId: string) =>
    [...leaderboardKeys.all, competitionId] as const,
  round: (roundId: string) =>
    [...leaderboardKeys.all, 'round', roundId] as const,
} as const;

// =====================================================
// TEAMS
// =====================================================

export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (competitionId: string) => [...teamKeys.lists(), competitionId] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamKeys.details(), id] as const,
} as const;

// =====================================================
// PAIRINGS
// =====================================================

export const pairingKeys = {
  all: ['pairings'] as const,
  lists: () => [...pairingKeys.all, 'list'] as const,
  list: (roundId: string) => [...pairingKeys.lists(), roundId] as const,
  details: () => [...pairingKeys.all, 'detail'] as const,
  detail: (id: string) => [...pairingKeys.details(), id] as const,
} as const;

// =====================================================
// SCORING PAIRS
// =====================================================

export const scoringPairsKeys = {
  all: ['scoringPairs'] as const,
  lists: () => [...scoringPairsKeys.all, 'list'] as const,
  list: (roundId: string) => [...scoringPairsKeys.lists(), roundId] as const,
  playersToScore: (roundId: string, scorerId: string) =>
    [...scoringPairsKeys.all, 'playersToScore', roundId, scorerId] as const,
} as const;

// =====================================================
// STATISTICS
// =====================================================

export const statisticsKeys = {
  all: ['statistics'] as const,
  player: (playerId: string) => [...statisticsKeys.all, 'player', playerId] as const,
  competition: (competitionId: string) =>
    [...statisticsKeys.all, 'competition', competitionId] as const,
} as const;

// =====================================================
// FRIENDS
// =====================================================

export const friendsKeys = {
  all: ['friends'] as const,
  lists: () => [...friendsKeys.all, 'list'] as const,
  list: (userId?: string, variant?: 'count') => [...friendsKeys.lists(), userId, variant] as const,
  count: (userId?: string) => [...friendsKeys.all, 'count', userId] as const,
  requests: () => [...friendsKeys.all, 'requests'] as const,
  pendingRequests: () => [...friendsKeys.requests(), 'pending'] as const,
  sentRequests: () => [...friendsKeys.requests(), 'sent'] as const,
  search: (query: string) => [...friendsKeys.all, 'search', query] as const,
  detail: (friendId: string) => [...friendsKeys.all, 'detail', friendId] as const,
} as const;

// =====================================================
// NOTIFICATIONS
// =====================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
} as const;

// =====================================================
// SUBSCRIPTIONS
// =====================================================

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  current: () => [...subscriptionKeys.all, 'current'] as const,
  limits: () => [...subscriptionKeys.all, 'limits'] as const,
  tierLimits: (tier: string) => [...subscriptionKeys.limits(), tier] as const,
  allTierLimits: () => [...subscriptionKeys.all, 'all-tiers'] as const,
  competitionCount: (userId: string) =>
    [...subscriptionKeys.all, 'comp-count', userId] as const,
} as const;

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Extract query key type from a key factory function
 *
 * Example:
 * type CompetitionDetailKey = QueryKey<typeof competitionKeys.detail>
 * // ['competitions', 'detail', string]
 */
export type QueryKey<T extends (...args: any[]) => readonly any[]> = ReturnType<T>;

/**
 * All query keys (for invalidating everything)
 */
export const allQueryKeys = [
  authKeys.all,
  competitionKeys.all,
  roundKeys.all,
  venueKeys.all,
  courseKeys.all,
  playerKeys.all,
  scorecardKeys.all,
  leaderboardKeys.all,
  teamKeys.all,
  pairingKeys.all,
  scoringPairsKeys.all,
  statisticsKeys.all,
  friendsKeys.all,
  notificationKeys.all,
  subscriptionKeys.all,
] as const;
