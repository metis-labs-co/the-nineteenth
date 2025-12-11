/**
 * Submit Scorecard Mutation Hook
 *
 * Handles submitting completed scorecards with offline support.
 * Saves locally first, then syncs to server when online.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { saveScorecard } from '@/services/offline/database';
import { queueScorecardSync, getIsOnline, manualSync } from '@/services/offline/sync';
import { scorecardKeys } from './useScorecards';
import type { Scorecard } from '@/types';

interface SubmitScorecardInput {
  scorecards: Scorecard[];
  roundId: string;
}

interface SubmitScorecardResult {
  success: boolean;
  syncedImmediately: boolean;
  scorecardIds: string[];
}

/**
 * Submit scorecards for a round
 *
 * 1. Saves to local SQLite database
 * 2. Queues for sync to server
 * 3. Attempts immediate sync if online
 */
export function useSubmitScorecards() {
  const queryClient = useQueryClient();

  return useMutation<SubmitScorecardResult, Error, SubmitScorecardInput>({
    mutationFn: async ({ scorecards, roundId }): Promise<SubmitScorecardResult> => {
      const now = new Date();
      const scorecardIds: string[] = [];

      // Update and save each scorecard
      for (const scorecard of scorecards) {
        const updatedScorecard: Scorecard = {
          ...scorecard,
          status: 'completed',
          submittedAt: now,
          updatedAt: now,
        };

        // Save to local SQLite
        await saveScorecard(updatedScorecard);

        // Queue for sync
        await queueScorecardSync(updatedScorecard, 'update');

        scorecardIds.push(scorecard.id);
      }

      // Try to sync immediately if online
      let syncedImmediately = false;
      if (getIsOnline()) {
        try {
          await manualSync();
          syncedImmediately = true;
        } catch (error) {
          console.warn('[useSubmitScorecards] Immediate sync failed:', error);
        }
      }

      return {
        success: true,
        syncedImmediately,
        scorecardIds,
      };
    },

    onSuccess: (data, variables) => {
      // Invalidate scorecard queries to refetch updated data
      queryClient.invalidateQueries({
        queryKey: scorecardKeys.list({ roundId: variables.roundId }),
      });
    },

    onError: (error) => {
      console.error('[useSubmitScorecards] Error:', error);
    },
  });
}

interface UpdateScoreInput {
  scorecardId: string;
  roundId: string;
  holeNumber: number;
  strokes: number;
}

/**
 * Update a single hole score
 * Uses optimistic update for instant UI feedback
 */
export function useUpdateScore() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateScoreInput>({
    mutationFn: async ({ scorecardId, roundId, holeNumber, strokes }) => {
      // TODO: Implement when we need direct mutation
      // For now, score updates go through the Zustand store
      console.log('[useUpdateScore] Update:', { scorecardId, holeNumber, strokes });
    },

    onMutate: async ({ scorecardId, roundId, holeNumber, strokes }): Promise<{ previousScorecards: Scorecard[] | undefined }> => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: scorecardKeys.list({ roundId }),
      });

      // Get current data
      const previousScorecards = queryClient.getQueryData<Scorecard[]>(
        scorecardKeys.list({ roundId })
      );

      // Optimistically update
      if (previousScorecards) {
        const updated = previousScorecards.map((sc) => {
          if (sc.id === scorecardId) {
            return {
              ...sc,
              scores: {
                ...sc.scores,
                [holeNumber]: { strokes },
              },
              updatedAt: new Date(),
            };
          }
          return sc;
        });

        queryClient.setQueryData(scorecardKeys.list({ roundId }), updated);
      }

      return { previousScorecards };
    },

    onError: (err, variables, _onMutateResult, context) => {
      // Rollback on error - context from onMutate
      const ctx = context as unknown as { previousScorecards: Scorecard[] | undefined } | undefined;
      if (ctx?.previousScorecards) {
        queryClient.setQueryData(
          scorecardKeys.list({ roundId: variables.roundId }),
          ctx.previousScorecards
        );
      }
    },

    onSettled: (data, error, variables) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({
        queryKey: scorecardKeys.list({ roundId: variables.roundId }),
      });
    },
  });
}
