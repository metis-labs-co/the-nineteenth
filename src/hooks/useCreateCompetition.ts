import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { competitionKeys } from '@/hooks/queryKeys';
import type { CompetitionCreateInput, PlayerCreateInput } from '@/types';
import type { RoundCreateInput } from '@/services/api/types';

interface CreateCompetitionInput extends CompetitionCreateInput {
  // Support both single round and multiple rounds for backwards compatibility
  round?: RoundCreateInput;
  rounds?: RoundCreateInput[];
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
      console.log('[useCreateCompetition] mutationFn called');
      console.log('[useCreateCompetition] Input name:', input.name);
      console.log('[useCreateCompetition] Input handicapSystem:', input.handicapSystem);
      console.log('[useCreateCompetition] Input startDate:', input.startDate);
      console.log('[useCreateCompetition] Input rounds count:', input.rounds?.length ?? (input.round ? 1 : 0));
      console.log('[useCreateCompetition] Input players count:', input.players?.length ?? 0);
      // Normalize rounds - support both single 'round' and multiple 'rounds'
      const rounds = input.rounds || (input.round ? [input.round] : []);
      console.log('[useCreateCompetition] Normalized rounds count:', rounds.length);
      try {
        const result = await apiClient.createCompetition({ ...input, rounds });
        console.log('[useCreateCompetition] API call succeeded, competition id:', result.competition.id);
        return result;
      } catch (err) {
        console.error('[useCreateCompetition] API call failed:', err);
        throw err;
      }
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
