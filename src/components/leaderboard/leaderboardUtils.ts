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

/**
 * Check if a match is complete based on available data
 */
export function isMatchComplete(
  matchResult: 'win' | 'loss' | 'halved' | undefined,
  holesWon: number,
  holesLost: number,
  holesHalved: number,
  totalHoles: number = 18
): boolean {
  // If match result is set, the match is complete
  if (matchResult) return true;

  // Check if all holes have been played
  const holesPlayed = holesWon + holesLost + holesHalved;
  if (holesPlayed >= totalHoles) return true;

  // Check for early finish (dormie situation - lead exceeds remaining holes)
  const holesRemaining = totalHoles - holesPlayed;
  const lead = Math.abs(holesWon - holesLost);
  if (lead > holesRemaining) return true;

  return false;
}

/**
 * Format match status for display
 * @returns "Won 3&2", "2 UP with 5 to play", "All Square", etc.
 */
export function formatMatchStatusText(
  matchResult: 'win' | 'loss' | 'halved' | undefined,
  margin: string,
  holesWon: number,
  holesLost: number,
  holesHalved: number,
  totalHoles: number = 18
): string {
  // If match is complete, show final result
  if (matchResult) {
    if (matchResult === 'halved') {
      return 'Halved';
    }
    // margin is already formatted like "3&2", "1 UP", "A/S"
    return matchResult === 'win' ? `Won ${margin}` : `Lost ${margin}`;
  }

  // Calculate in-progress status
  const holesPlayed = holesWon + holesLost + holesHalved;
  const holesRemaining = totalHoles - holesPlayed;
  const lead = holesWon - holesLost;

  if (holesRemaining <= 0) {
    // All holes played but no result set yet - should be halved
    return 'All Square';
  }

  if (lead === 0) {
    return `All Square with ${holesRemaining} to play`;
  }

  const leadText = Math.abs(lead) === 1 ? '1 UP' : `${Math.abs(lead)} UP`;
  if (lead > 0) {
    return `${leadText} with ${holesRemaining} to play`;
  } else {
    return `${Math.abs(lead)} DN with ${holesRemaining} to play`;
  }
}

/**
 * Calculate team aggregate from individual match results
 */
export interface TeamAggregateResult {
  team1Id: string;
  team1Name: string;
  team1Wins: number;
  team2Id: string;
  team2Name: string;
  team2Wins: number;
  halvedMatches: number;
  matchesInProgress: number;
  totalMatches: number;
  isComplete: boolean;
}

export function calculateTeamAggregate(
  entries: RoundLeaderboardEntry[],
  roundStatus: string
): TeamAggregateResult | null {
  // Filter to team entries with match play data
  const teamMatches = entries.filter(
    (e) => e.isTeamResult && e.scoreData.type === 'match-play'
  );

  if (teamMatches.length < 2) return null;

  // Get unique teams (each match has 2 teams)
  const seenTeams = new Map<string, { name: string; wins: number }>();
  let halvedMatches = 0;
  let matchesInProgress = 0;
  const totalMatches = teamMatches.length / 2; // Each match has 2 entries

  teamMatches.forEach((entry) => {
    if (!entry.isTeamResult) return;
    const scoreData = entry.scoreData as MatchPlayScoreData;

    const teamId = entry.teamId;
    const teamName = entry.teamName;

    if (!seenTeams.has(teamId)) {
      seenTeams.set(teamId, { name: teamName, wins: 0 });
    }

    const team = seenTeams.get(teamId)!;
    if (scoreData.matchResult === 'win') {
      team.wins += 1;
    } else if (scoreData.matchResult === 'halved') {
      halvedMatches += 0.5; // Each halved match is counted twice (once per team)
    } else if (!scoreData.matchResult) {
      matchesInProgress += 0.5; // Each in-progress match is counted twice
    }
  });

  // Need exactly 2 teams for aggregate
  const teams = Array.from(seenTeams.entries());
  if (teams.length !== 2) return null;

  const [team1Entry, team2Entry] = teams;
  const [team1Id, team1Data] = team1Entry;
  const [team2Id, team2Data] = team2Entry;

  return {
    team1Id,
    team1Name: team1Data.name,
    team1Wins: team1Data.wins,
    team2Id,
    team2Name: team2Data.name,
    team2Wins: team2Data.wins,
    halvedMatches: Math.round(halvedMatches),
    matchesInProgress: Math.round(matchesInProgress),
    totalMatches,
    isComplete: matchesInProgress === 0 && roundStatus === 'completed',
  };
}
