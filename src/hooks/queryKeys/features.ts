/**
 * Feature Query Keys
 *
 * Skins, Wolf, Prize Pools, Achievements, Cosmetics, Leagues,
 * Subscriptions & AI Competition
 */

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
  // Statistics keys
  statistics: (playerId: string) => [...wolfKeys.all, 'stats', playerId] as const,
  history: (playerId: string) => [...wolfKeys.all, 'history', playerId] as const,
} as const;

// =====================================================
// PRIZE POOLS (Competition Prize Pools)
// =====================================================

export const prizePoolKeys = {
  all: ['prizePool'] as const,
  pool: (competitionId: string) => [...prizePoolKeys.all, competitionId] as const,
  placements: (poolId: string) => [...prizePoolKeys.all, 'placements', poolId] as const,
  transactions: (poolId: string) =>
    [...prizePoolKeys.all, 'transactions', poolId] as const,
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
// LEAGUES
// =====================================================

export const leagueKeys = {
  all: ['leagues'] as const,
  lists: () => [...leagueKeys.all, 'list'] as const,
  list: (filters?: { status?: string }) => [...leagueKeys.lists(), filters] as const,
  publicList: (search?: string) => [...leagueKeys.all, 'public', search] as const,
  details: () => [...leagueKeys.all, 'detail'] as const,
  detail: (id: string) => [...leagueKeys.details(), id] as const,
  leaderboardBase: (leagueId: string) => [...leagueKeys.all, 'leaderboard', leagueId] as const,
  leaderboard: (leagueId: string, sortMode?: string) =>
    [...leagueKeys.leaderboardBase(leagueId), sortMode ?? 'gross'] as const,
  players: (leagueId: string) => [...leagueKeys.all, 'players', leagueId] as const,
  rounds: (leagueId: string) => [...leagueKeys.all, 'rounds', leagueId] as const,
  eligibleScorecards: (leagueId: string) => [...leagueKeys.all, 'eligible', leagueId] as const,
  playerRounds: (leagueId: string, playerId: string) =>
    [...leagueKeys.all, 'playerRounds', leagueId, playerId] as const,
  scorecardTags: (scorecardId: string) =>
    [...leagueKeys.all, 'scorecardTags', scorecardId] as const,
  // Ladder
  ladderStandings: (leagueId: string) => [...leagueKeys.all, 'ladder', leagueId] as const,
  challenges: (leagueId: string) => [...leagueKeys.all, 'challenges', leagueId] as const,
  myChallenges: (leagueId: string) => [...leagueKeys.all, 'myChallenges', leagueId] as const,
  challenge: (challengeId: string) => [...leagueKeys.all, 'challenge', challengeId] as const,
  // Eclectic
  eclecticLeaderboard: (leagueId: string) => [...leagueKeys.all, 'eclecticLb', leagueId] as const,
  eclecticBestScores: (leagueId: string, playerId?: string) =>
    [...leagueKeys.all, 'eclecticScores', leagueId, playerId] as const,
  tagCount: (leagueId: string) => [...leagueKeys.all, 'tagCount', leagueId] as const,
  // Stats
  stats: (leagueId: string) => [...leagueKeys.all, 'stats', leagueId] as const,
  // Partnership
  partnerships: (leagueId: string) => [...leagueKeys.all, 'partnerships', leagueId] as const,
  myPartnership: (leagueId: string) => [...leagueKeys.all, 'myPartnership', leagueId] as const,
  partnershipLeaderboard: (leagueId: string) => [...leagueKeys.all, 'partnershipLb', leagueId] as const,
  partnershipCourseBests: (leagueId: string) => [...leagueKeys.all, 'partnershipCB', leagueId] as const,
  partnershipRounds: (partnershipId: string) => [...leagueKeys.all, 'partnershipRounds', partnershipId] as const,
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
