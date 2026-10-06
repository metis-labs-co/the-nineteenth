/**
 * Competition Hooks - Module Index
 *
 * TanStack Query hooks for competition data, leaderboards, knockout brackets, and AI generation.
 */

// Re-export query hooks
export { useCompetitions, useCompetitionDetailsData, fetchCompetitionDetails, getCurrentPlayerStanding, useCompetitionInfo } from './queries';
export type { UseCompetitionDetailsDataOptions, CompetitionInfo, UseCompetitionInfoOptions } from './queries';

// Re-export mutation hooks
export { useCreateCompetition, useRemoveCompetitionPlayer } from './mutations';
export type { RemovePlayerState, UseRemoveCompetitionPlayerOptions, UseRemoveCompetitionPlayerResult } from './mutations';

// Re-export leaderboard hooks
export { useCompetitionLeaderboard } from './leaderboard';
export type { LeaderboardFilter, LeaderboardEntry, TeamMemberInfo, CompetitionLeaderboardEntry, UseCompetitionLeaderboardOptions } from './leaderboard';

// Re-export knockout hooks
export { useKnockoutBracket, useKnockoutMatch, useGenerateBracket, useCompleteKnockoutMatch, useResetBracket } from './knockout';

// Re-export AI generation hooks
export { useGenerateAICompetition, parseAIDate, formatToAIDate, getAIErrorMessage } from './generateAI';
export type { GeneratedRound, GeneratedPlayer, GeneratedTeam, GeneratedCompetition, AICompetitionSuccessResponse, AICompetitionErrorResponse, AICompetitionResponse } from './generateAI';
