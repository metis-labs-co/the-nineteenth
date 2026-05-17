/**
 * Query key factory for the player_bag domain (What's in the Bag).
 */
export const bagKeys = {
  all: ['bag'] as const,
  byPlayer: (playerId: string) => [...bagKeys.all, 'player', playerId] as const,
  detailsByPlayer: (playerId: string) =>
    [...bagKeys.all, 'details', playerId] as const,
  perClubStats: (playerId: string) =>
    [...bagKeys.all, 'perClubStats', playerId] as const,
} as const;
