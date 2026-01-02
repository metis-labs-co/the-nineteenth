/**
 * Leaderboard Utilities
 *
 * Functions for sorting scores and calculating positions with tiebreakers.
 */

import type { LeaderboardEntry, ScoringResult } from '../types';

/**
 * Options for sorting leaderboard entries
 */
export interface SortOptions {
  /** Whether higher scores are better (true for Stableford, false for Stroke) */
  higherIsBetter: boolean;
  /** Apply tiebreakers for identical scores */
  useTiebreakers?: boolean;
}

/**
 * Sort leaderboard entries by score
 *
 * @param entries - Array of leaderboard entries to sort
 * @param options - Sorting options
 * @returns Sorted entries (original array is not mutated)
 */
export function sortByScore<T extends { rawScore: number }>(
  entries: T[],
  options: SortOptions
): T[] {
  const sorted = [...entries];

  sorted.sort((a, b) => {
    if (options.higherIsBetter) {
      return b.rawScore - a.rawScore;
    }
    return a.rawScore - b.rawScore;
  });

  return sorted;
}

/**
 * Assign positions to sorted entries, handling ties
 *
 * When entries tie, they receive the same position.
 * The next entry gets position = previous + number of tied entries.
 *
 * @param sortedEntries - Entries sorted by score
 * @returns Entries with position and tied properties set
 */
export function assignPositions<
  T extends { rawScore: number; position?: number; tied?: boolean }
>(sortedEntries: T[]): (T & { position: number; tied: boolean })[] {
  if (sortedEntries.length === 0) {
    return [];
  }

  const result: (T & { position: number; tied: boolean })[] = [];
  let currentPosition = 1;
  let i = 0;

  while (i < sortedEntries.length) {
    // Find all entries with the same score
    const currentScore = sortedEntries[i].rawScore;
    const tiedEntries: T[] = [];

    while (
      i < sortedEntries.length &&
      sortedEntries[i].rawScore === currentScore
    ) {
      tiedEntries.push(sortedEntries[i]);
      i++;
    }

    const isTied = tiedEntries.length > 1;

    // Assign same position to all tied entries
    for (const entry of tiedEntries) {
      result.push({
        ...entry,
        position: currentPosition,
        tied: isTied,
      });
    }

    // Next position skips tied entries
    currentPosition += tiedEntries.length;
  }

  return result;
}

/**
 * Apply back nine tiebreaker
 *
 * In golf, when players tie on total score, the back 9 holes
 * are used as a tiebreaker, then back 6, then back 3.
 *
 * @param entries - Tied entries with hole-by-hole scores
 * @param holeScores - Map of participant ID to hole scores
 * @param higherIsBetter - Whether higher scores win ties
 * @returns Sorted entries after tiebreaker
 */
export function applyBackNineTiebreaker<
  T extends { participantId: string; rawScore: number }
>(
  entries: T[],
  holeScores: Map<string, number[]>,
  higherIsBetter: boolean
): T[] {
  if (entries.length <= 1) {
    return entries;
  }

  // Calculate back 9, back 6, and back 3 totals
  const getBackNineScores = (id: string) => {
    const scores = holeScores.get(id) || [];
    const back9 = scores.slice(9).reduce((sum, s) => sum + (s || 0), 0);
    const back6 = scores.slice(12).reduce((sum, s) => sum + (s || 0), 0);
    const back3 = scores.slice(15).reduce((sum, s) => sum + (s || 0), 0);
    return { back9, back6, back3 };
  };

  const sorted = [...entries].sort((a, b) => {
    const scoresA = getBackNineScores(a.participantId);
    const scoresB = getBackNineScores(b.participantId);

    // Compare back 9
    let diff = higherIsBetter
      ? scoresB.back9 - scoresA.back9
      : scoresA.back9 - scoresB.back9;
    if (diff !== 0) return diff;

    // Compare back 6
    diff = higherIsBetter
      ? scoresB.back6 - scoresA.back6
      : scoresA.back6 - scoresB.back6;
    if (diff !== 0) return diff;

    // Compare back 3
    diff = higherIsBetter
      ? scoresB.back3 - scoresA.back3
      : scoresA.back3 - scoresB.back3;
    return diff;
  });

  return sorted;
}

/**
 * Apply handicap tiebreaker (lower handicap wins)
 *
 * @param entries - Tied entries
 * @param handicaps - Map of participant ID to handicap
 * @returns Sorted entries after tiebreaker
 */
export function applyHandicapTiebreaker<
  T extends { participantId: string; rawScore: number }
>(entries: T[], handicaps: Map<string, number>): T[] {
  if (entries.length <= 1) {
    return entries;
  }

  return [...entries].sort((a, b) => {
    const handicapA = handicaps.get(a.participantId) ?? 36;
    const handicapB = handicaps.get(b.participantId) ?? 36;
    return handicapA - handicapB; // Lower handicap wins
  });
}

/**
 * Create a leaderboard entry from scoring result
 *
 * @param participantId - Player or team ID
 * @param result - Scoring result
 * @param isTeamResult - Whether this is a team result
 * @returns Leaderboard entry (position and competitionPoints to be set later)
 */
export function createLeaderboardEntry(
  participantId: string,
  result: ScoringResult,
  isTeamResult: boolean
): LeaderboardEntry {
  return {
    participantId,
    playerId: isTeamResult ? undefined : participantId,
    teamId: isTeamResult ? participantId : undefined,
    rawScore: result.rawScore,
    position: 0, // To be assigned
    tied: false, // To be assigned
    competitionPoints: 0, // To be assigned
    resultData: result.resultData,
    isTeamResult,
  };
}

/**
 * Calculate competition points based on position
 *
 * @param position - Player's position (1 = first)
 * @param positionPoints - Array of points by position (index 0 = 1st)
 * @param defaultPoints - Points for positions beyond the array
 * @returns Competition points earned
 */
export function getCompetitionPoints(
  position: number,
  positionPoints: number[],
  defaultPoints = 1
): number {
  const index = position - 1;
  if (index < positionPoints.length) {
    return positionPoints[index];
  }
  return defaultPoints;
}

/**
 * Calculate average points for tied positions
 *
 * @param startPosition - First tied position
 * @param tiedCount - Number of tied entries
 * @param positionPoints - Array of points by position
 * @param defaultPoints - Points for positions beyond the array
 * @returns Average points for the tied group
 */
export function getAverageTiedPoints(
  startPosition: number,
  tiedCount: number,
  positionPoints: number[],
  defaultPoints = 1
): number {
  let total = 0;
  for (let i = 0; i < tiedCount; i++) {
    total += getCompetitionPoints(startPosition + i, positionPoints, defaultPoints);
  }
  return Math.round(total / tiedCount);
}
