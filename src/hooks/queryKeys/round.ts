/**
 * Round Query Keys
 */

export const roundKeys = {
  all: ['rounds'] as const,
  lists: () => [...roundKeys.all, 'list'] as const,
  list: (competitionId: string) => [...roundKeys.lists(), competitionId] as const,
  details: () => [...roundKeys.all, 'detail'] as const,
  detail: (id: string) => [...roundKeys.details(), id] as const,
} as const;
