import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { competitionKeys } from '@/hooks/queryKeys';
import type { CompetitionCreateInput, PlayerCreateInput } from '@/types';

interface RoundInput {
  courseName: string;
  courseId?: string;
  date: Date;
  teeTime?: string;
  matchType?: string;
}

interface CreateCompetitionInput extends CompetitionCreateInput {
  // Support both single round and multiple rounds for backwards compatibility
  round?: RoundInput;
  rounds?: RoundInput[];
  players: PlayerCreateInput[];
}

/**
 * Hook to create a new competition with rounds and players
 *
 * Usage:
 * ```tsx
 * const createCompetition = useCreateCompetition();
 *
 * createCompetition.mutate({
 *   name: 'Summer Classic',
 *   startDate: new Date(),
 *   handicapSystem: 'honor',
 *   rounds: [
 *     { courseName: 'Royal Melbourne', date: new Date(), matchType: 'stableford' }
 *   ],
 *   players: [{ name: 'John', email: 'john@example.com' }],
 * });
 * ```
 */
export function useCreateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompetitionInput) => {
      // Normalize rounds - support both single 'round' and multiple 'rounds'
      const rounds = input.rounds || (input.round ? [input.round] : []);
      return await apiClient.createCompetition({ ...input, rounds });
    },

    onSuccess: (data) => {
      // Invalidate competitions list to refetch
      queryClient.invalidateQueries({ queryKey: competitionKeys.all });

      // Optionally set the new competition in cache
      queryClient.setQueryData(
        competitionKeys.detail(data.competition.id),
        data.competition
      );

      console.log('[useCreateCompetition] Competition created:', data);
    },

    onError: (error) => {
      console.error('[useCreateCompetition] Error creating competition:', error);
    },
  });
}
