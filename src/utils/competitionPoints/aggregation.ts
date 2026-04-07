import type {
  RoundResultsForAggregation,
  StandingsEntry,
} from './pointSystems';

// ============================================================================
// Aggregation Functions
// ============================================================================

/**
 * Aggregate competition standings across multiple rounds.
 *
 * Groups results by participant (player or team), sums competition points
 * across all rounds, and returns sorted standings with total points and
 * rounds played.
 *
 * @param roundResults - Array of round results with scored entries
 * @returns Sorted standings with aggregated points
 */
export function aggregateCompetitionStandings<TParticipant = string>(
  roundResults: RoundResultsForAggregation<TParticipant>[]
): StandingsEntry<TParticipant>[] {
  if (roundResults.length === 0) {
    return [];
  }

  // Aggregate points by participant
  const participantMap = new Map<
    TParticipant,
    {
      totalPoints: number;
      roundsPlayed: number;
      roundPoints: { roundId: string; points: number; position: number }[];
    }
  >();

  for (const round of roundResults) {
    for (const result of round.results) {
      const existing = participantMap.get(result.participantId);

      if (existing) {
        existing.totalPoints += result.competitionPoints;
        existing.roundsPlayed += 1;
        existing.roundPoints.push({
          roundId: round.roundId,
          points: result.competitionPoints,
          position: result.position,
        });
      } else {
        participantMap.set(result.participantId, {
          totalPoints: result.competitionPoints,
          roundsPlayed: 1,
          roundPoints: [
            {
              roundId: round.roundId,
              points: result.competitionPoints,
              position: result.position,
            },
          ],
        });
      }
    }
  }

  // Convert to array and sort by total points descending
  const entries = Array.from(participantMap.entries()).map(
    ([participantId, data]) => ({
      participantId,
      ...data,
      position: 0,
      tied: false,
    })
  );

  entries.sort((a, b) => b.totalPoints - a.totalPoints);

  // Assign positions with tie handling
  const standingsWithPositions = assignPositions(entries, 'totalPoints');

  return standingsWithPositions;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Assign positions with tie handling to a sorted array
 */
function assignPositions<T extends { position: number; tied: boolean }>(
  sortedEntries: T[],
  scoreKey: keyof T
): T[] {
  if (sortedEntries.length === 0) {
    return [];
  }

  const result: T[] = [];
  let currentPosition = 1;
  let i = 0;

  while (i < sortedEntries.length) {
    // Find all entries with the same score
    const currentScore = sortedEntries[i][scoreKey];
    const tiedEntries: T[] = [];

    while (
      i < sortedEntries.length &&
      sortedEntries[i][scoreKey] === currentScore
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

    currentPosition += tiedEntries.length;
  }

  return result;
}
