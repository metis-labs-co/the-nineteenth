/**
 * Leaderboard utility functions
 *
 * Helper functions for formatting and displaying leaderboard data
 */

import type { GameType } from '@/types';
import {
  type RoundLeaderboardEntry,
  type PlayerLeaderboardEntry,
  type MatchPlayScoreData,
  isTeamEntry,
} from '@/hooks/useRoundLeaderboard';

/**
 * Get the display label for a game type
 */
export function getGameTypeLabel(gameType: GameType): string {
  switch (gameType) {
    case 'stableford':
      return 'Stableford';
    case 'stroke':
      return 'Stroke Play';
    case 'match-play':
      return 'Match Play';
    case 'ambrose':
      return 'Ambrose';
    case 'best-ball':
      return 'Best Ball';
    default:
      return gameType;
  }
}

/**
 * Get the pill variant for a game type
 */
export function getGameTypeVariant(
  gameType: GameType
): 'primary' | 'success' | 'warning' | 'info' {
  switch (gameType) {
    case 'stableford':
      return 'primary';
    case 'stroke':
      return 'info';
    case 'match-play':
      return 'warning';
    case 'ambrose':
    case 'best-ball':
      return 'success';
    default:
      return 'primary';
  }
}

/**
 * Format match play result for display
 */
export function formatMatchResult(scoreData: MatchPlayScoreData): string {
  if (scoreData.matchResult === 'halved') {
    return 'Halved';
  }
  return scoreData.holesUpDown;
}

/**
 * Get match result description for accessibility
 */
export function getMatchResultDescription(
  entry: RoundLeaderboardEntry,
  scoreData: MatchPlayScoreData
): string {
  const name = isTeamEntry(entry)
    ? entry.teamName
    : (entry as PlayerLeaderboardEntry).playerName;

  if (scoreData.matchResult === 'halved') {
    return `${name} halved with ${scoreData.opponentName}`;
  } else if (scoreData.matchResult === 'win') {
    return `${name} def. ${scoreData.opponentName} ${scoreData.holesUpDown}`;
  } else {
    return `${name} lost to ${scoreData.opponentName} ${scoreData.holesUpDown}`;
  }
}

/**
 * Get the name from a leaderboard entry (handles both player and team entries)
 */
export function getEntryName(entry: RoundLeaderboardEntry): string {
  return isTeamEntry(entry)
    ? entry.teamName
    : (entry as PlayerLeaderboardEntry).playerName;
}

/**
 * Get the ID from a leaderboard entry (handles both player and team entries)
 */
export function getEntryId(entry: RoundLeaderboardEntry): string {
  return isTeamEntry(entry)
    ? entry.teamId
    : (entry as PlayerLeaderboardEntry).playerId;
}

/**
 * Get the handicap from a leaderboard entry
 * For team entries, returns the average handicap of all members
 */
export function getEntryHandicap(entry: RoundLeaderboardEntry): number {
  if (isTeamEntry(entry)) {
    if (entry.members.length === 0) return 0;
    return Math.round(
      entry.members.reduce((sum, m) => sum + m.handicap, 0) / entry.members.length
    );
  }
  return (entry as PlayerLeaderboardEntry).handicap;
}

/**
 * Check if entry belongs to current user
 */
export function isCurrentUserEntry(
  entry: RoundLeaderboardEntry,
  currentUserId?: string
): boolean {
  if (!currentUserId) return false;
  if (entry.isTeamResult) return false;
  return (entry as PlayerLeaderboardEntry).playerId === currentUserId;
}
