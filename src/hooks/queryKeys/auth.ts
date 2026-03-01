/**
 * Authentication Query Keys
 */

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  player: (userId: string) => [...authKeys.all, 'player', userId] as const,
} as const;
