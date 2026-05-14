/**
 * Mutation hooks for combining / uncombining 9-hole handicap rounds.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  combineHandicapRounds,
  uncombineHandicapRound,
} from '@/services/handicap/combineHandicapRounds';
import { handicapKeys } from './handicapHistory';

interface CombineArgs {
  frontScorecardId: string;
  backScorecardId: string;
  playerId: string;
}

export function useCombineHandicapRounds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ frontScorecardId, backScorecardId }: CombineArgs) =>
      combineHandicapRounds(frontScorecardId, backScorecardId),
    onSuccess: (_data, { playerId }) => {
      queryClient.invalidateQueries({ queryKey: handicapKeys.history(playerId) });
    },
  });
}

interface UncombineArgs {
  combinedRoundId: string;
  playerId: string;
}

export function useUncombineHandicapRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ combinedRoundId }: UncombineArgs) =>
      uncombineHandicapRound(combinedRoundId),
    onSuccess: (_data, { playerId }) => {
      queryClient.invalidateQueries({ queryKey: handicapKeys.history(playerId) });
    },
  });
}
