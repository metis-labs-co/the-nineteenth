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
// CLUBS (renamed from VENUES)
// =====================================================

export const clubKeys = {
  all: ['clubs'] as const,
  lists: () => [...clubKeys.all, 'list'] as const,
  list: (filters?: { state?: string; search?: string }) =>
    [...clubKeys.lists(), filters] as const,
  withCourses: () => [...clubKeys.all, 'with-courses'] as const,
  withCoursesFiltered: (filters?: { state?: string; search?: string; featured?: boolean }) =>
    [...clubKeys.withCourses(), filters] as const,
  details: () => [...clubKeys.all, 'detail'] as const,
  detail: (id: string) => [...clubKeys.details(), id] as const,
  homeClub: (playerId: string) => [...clubKeys.all, 'home', playerId] as const,
} as const;

/**
 * @deprecated Use clubKeys instead
 */
export const venueKeys = clubKeys;

// =====================================================
// FAVORITE COURSES
// =====================================================

export const favoriteKeys = {
  all: ['favorites'] as const,
  lists: () => [...favoriteKeys.all, 'list'] as const,
  list: (userId?: string) => [...favoriteKeys.lists(), userId] as const,
} as const;

// =====================================================
// HOLE COORDINATES
// =====================================================

export const coordinateKeys = {
  all: ['coordinates'] as const,
  lists: () => [...coordinateKeys.all, 'list'] as const,
  byCourse: (courseId: string) => [...coordinateKeys.all, 'course', courseId] as const,
  byHole: (courseId: string, holeNumber: number) =>
    [...coordinateKeys.byCourse(courseId), 'hole', holeNumber] as const,
  greenCenter: (courseId: string, holeNumber: number) =>
    [...coordinateKeys.byHole(courseId, holeNumber), 'green-center'] as const,
  teeBack: (courseId: string, holeNumber: number) =>
    [...coordinateKeys.byHole(courseId, holeNumber), 'tee-back'] as const,
  summary: (courseId: string) => [...coordinateKeys.byCourse(courseId), 'summary'] as const,
} as const;

// =====================================================
// TEES
// =====================================================

export const teeKeys = {
  all: ['tees'] as const,
  lists: () => [...teeKeys.all, 'list'] as const,
  byCourse: (courseId: string) => [...teeKeys.all, 'course', courseId] as const,
  details: () => [...teeKeys.all, 'detail'] as const,
  detail: (id: string) => [...teeKeys.details(), id] as const,
  withCourse: (courseId: string) => [...teeKeys.all, 'with-course', courseId] as const,
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
    clubId?: string;
  }) => [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
  search: (query: string) => [...courseKeys.all, 'search', query] as const,
  favorites: () => [...courseKeys.all, 'favorites'] as const,
  byClub: (clubId: string) => [...courseKeys.all, 'club', clubId] as const,
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
  listWithPendingSent: (userId?: string) =>
    [...friendsKeys.lists(), 'with-pending-sent', userId] as const,
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
// AI COMPETITION
// =====================================================

export const aiKeys = {
  all: ['ai'] as const,
  generation: () => [...aiKeys.all, 'generation'] as const,
} as const;

// =====================================================
// PUSH NOTIFICATIONS
// =====================================================

export const pushKeys = {
  all: ['push'] as const,
  tokens: (userId: string) => [...pushKeys.all, 'tokens', userId] as const,
  preferences: (userId: string) => [...pushKeys.all, 'preferences', userId] as const,
  permissionStatus: () => [...pushKeys.all, 'permission'] as const,
} as const;

// =====================================================
// PLACEHOLDER PLAYERS
// =====================================================

export const placeholderPlayersKeys = {
  all: ['placeholderPlayers'] as const,
  lists: () => [...placeholderPlayersKeys.all, 'list'] as const,
  list: (userId: string) => [...placeholderPlayersKeys.lists(), userId] as const,
  details: () => [...placeholderPlayersKeys.all, 'detail'] as const,
  detail: (id: string) => [...placeholderPlayersKeys.details(), id] as const,
} as const;

// =====================================================
// ACHIEVEMENTS
// =====================================================

export const achievementKeys = {
  all: ['achievements'] as const,
  definitions: () => [...achievementKeys.all, 'definitions'] as const,
  playerAchievements: (playerId: string) =>
    [...achievementKeys.all, 'player', playerId] as const,
  progress: (playerId: string) =>
    [...achievementKeys.all, 'progress', playerId] as const,
  summary: (playerId: string) =>
    [...achievementKeys.all, 'summary', playerId] as const,
  leaderboard: (
    scope: 'global' | 'friends' | 'competition',
    userId?: string,
    competitionId?: string
  ) => [...achievementKeys.all, 'leaderboard', scope, userId, competitionId] as const,
} as const;

// =====================================================
// COSMETICS
// =====================================================

export const cosmeticKeys = {
  all: ['cosmetics'] as const,
  definitions: () => [...cosmeticKeys.all, 'definitions'] as const,
  playerCosmetics: (playerId: string) =>
    [...cosmeticKeys.all, 'player', playerId] as const,
  equipped: (playerId: string) =>
    [...cosmeticKeys.all, 'equipped', playerId] as const,
} as const;

// =====================================================
// PRIZE POOLS (Competition Prize Pools)
// =====================================================

export const prizePoolKeys = {
  all: ['prizePool'] as const,
  pool: (competitionId: string) => [...prizePoolKeys.all, competitionId] as const,
  transactions: (poolId: string) =>
    [...prizePoolKeys.all, 'transactions', poolId] as const,
  balance: (poolId: string) => [...prizePoolKeys.all, 'balance', poolId] as const,
  summary: (competitionId: string) =>
    [...prizePoolKeys.all, 'summary', competitionId] as const,
} as const;

// =====================================================
// SKINS (Gambling Side-Game)
// =====================================================

export const skinsKeys = {
  all: ['skins'] as const,
  games: () => [...skinsKeys.all, 'games'] as const,
  game: (id: string) => [...skinsKeys.games(), id] as const,
  gamesByRound: (roundId: string) => [...skinsKeys.games(), 'round', roundId] as const,
  gamesByPlayer: (playerId: string) => [...skinsKeys.games(), 'player', playerId] as const,
  results: (gameId: string) => [...skinsKeys.all, 'results', gameId] as const,
  payouts: (gameId: string) => [...skinsKeys.all, 'payouts', gameId] as const,
  summary: (gameId: string) => [...skinsKeys.all, 'summary', gameId] as const,
  canUseSkins: (userId: string) => [...skinsKeys.all, 'can-use', userId] as const,
  // Statistics & Leaderboard keys
  statistics: (playerId: string) => [...skinsKeys.all, 'stats', playerId] as const,
  leaderboard: (options?: { friendsOnly?: boolean; minGames?: number }) =>
    [...skinsKeys.all, 'leaderboard', options] as const,
  history: (playerId: string) => [...skinsKeys.all, 'history', playerId] as const,
  rank: (playerId: string) => [...skinsKeys.all, 'rank', playerId] as const,
} as const;

// =====================================================
// WOLF (Strategic Partner Selection Side-Game)
// =====================================================

export const wolfKeys = {
  all: ['wolf'] as const,
  games: () => [...wolfKeys.all, 'games'] as const,
  game: (id: string) => [...wolfKeys.games(), id] as const,
  gameByRound: (roundId: string) => [...wolfKeys.games(), 'round', roundId] as const,
  decisions: (gameId: string) => [...wolfKeys.all, 'decisions', gameId] as const,
  decision: (gameId: string, holeNumber: number) =>
    [...wolfKeys.decisions(gameId), holeNumber] as const,
  standings: (gameId: string) => [...wolfKeys.all, 'standings', gameId] as const,
  payouts: (gameId: string) => [...wolfKeys.all, 'payouts', gameId] as const,
  summary: (gameId: string) => [...wolfKeys.all, 'summary', gameId] as const,
  canUseWolf: (userId: string) => [...wolfKeys.all, 'can-use', userId] as const,
} as const;

// =====================================================
// SCORE MISMATCHES
// =====================================================

export const scoreMismatchKeys = {
  all: ['scoreMismatch'] as const,
  mismatches: (roundId: string) => [...scoreMismatchKeys.all, 'mismatches', roundId] as const,
  readiness: (roundId: string, userId: string) =>
    [...scoreMismatchKeys.all, 'readiness', roundId, userId] as const,
  partnerStatus: (roundId: string, userId: string) =>
    [...scoreMismatchKeys.all, 'partner', roundId, userId] as const,
  submissionStatus: (roundId: string, playerId: string) =>
    [...scoreMismatchKeys.all, 'submission', roundId, playerId] as const,
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
export type QueryKey<T extends (...args: unknown[]) => readonly unknown[]> = ReturnType<T>;

/**
 * All query keys (for invalidating everything)
 */
export const allQueryKeys = [
  authKeys.all,
  competitionKeys.all,
  roundKeys.all,
  clubKeys.all,
  favoriteKeys.all,
  coordinateKeys.all,
  teeKeys.all,
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
  aiKeys.all,
  pushKeys.all,
  placeholderPlayersKeys.all,
  achievementKeys.all,
  cosmeticKeys.all,
  prizePoolKeys.all,
  skinsKeys.all,
  wolfKeys.all,
  scoreMismatchKeys.all,
] as const;
