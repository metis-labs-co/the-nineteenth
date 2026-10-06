/**
 * Scoring Query Keys
 *
 * Scorecards, Leaderboards, Scoring Pairs, Statistics & Score Mismatches
 */

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
  playerFiltered: (playerId: string, filters: { leagueId?: string; competitionId?: string }) =>
    [...statisticsKeys.all, 'player', playerId, 'filtered', filters] as const,
  competition: (competitionId: string) =>
    [...statisticsKeys.all, 'competition', competitionId] as const,
  course: (playerId: string, courseId: string) =>
    [...statisticsKeys.all, 'course', playerId, courseId] as const,
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
// RINGER BOARD
// =====================================================

export const ringerKeys = {
  all: ['ringer'] as const,
  competition: (competitionId: string) => [...ringerKeys.all, 'competition', competitionId] as const,
  roundHoles: (roundId: string) => [...ringerKeys.all, 'roundHoles', roundId] as const,
  scorecards: (roundId: string) => [...ringerKeys.all, 'scorecards', roundId] as const,
  teams: (competitionId: string) => [...ringerKeys.all, 'teams', competitionId] as const,
} as const;

// =====================================================
// CONTRIBUTIONS BOARD
// =====================================================

export const contributionKeys = {
  all: ['contributions'] as const,
  competition: (competitionId: string) =>
    [...contributionKeys.all, 'competition', competitionId] as const,
  roundHoles: (roundId: string) => [...contributionKeys.all, 'roundHoles', roundId] as const,
  scorecards: (roundId: string) => [...contributionKeys.all, 'scorecards', roundId] as const,
  teams: (competitionId: string) => [...contributionKeys.all, 'teams', competitionId] as const,
  subMatches: (roundId: string) => [...contributionKeys.all, 'subMatches', roundId] as const,
} as const;
