/**
 * Query key factory for the Phase C2 shot_log domain.
 */
export const shotLogKeys = {
  all: ['shotLog'] as const,
  byRound: (roundId: string) => [...shotLogKeys.all, 'round', roundId] as const,
  byHole: (roundId: string, holeNumber: number) =>
    [...shotLogKeys.byRound(roundId), 'hole', holeNumber] as const,
} as const;
