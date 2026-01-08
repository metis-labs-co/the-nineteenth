/**
 * Hook for handling round submission and mutations
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { roundKeys, scoringPairsKeys } from '@/hooks/queryKeys';
import type { RoundFormData } from '../types';
import { updateRound, shuffleScoringPairs } from './useEditRoundData';
import { parseAustralianDate } from '@/utils/formatting';

interface UseRoundSubmissionOptions {
  roundId: string;
  competitionId?: string;
  formData: RoundFormData;
  onSuccess: () => void;
}

interface UseRoundSubmissionReturn {
  updateMutation: ReturnType<typeof useMutation<void, Error, void>>;
  shuffleMutation: ReturnType<typeof useMutation<void, Error, void>>;
  handleSubmit: () => void;
  handleShuffleScoringPairs: () => void;
  isSubmitting: boolean;
  isShuffling: boolean;
}

/**
 * Handles round update and scoring pairs shuffle mutations
 */
export function useRoundSubmission({
  roundId,
  competitionId,
  formData,
  onSuccess,
}: UseRoundSubmissionOptions): UseRoundSubmissionReturn {
  const queryClient = useQueryClient();

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const parsedDate = parseAustralianDate(formData.date);
      if (!parsedDate) {
        throw new Error('Invalid date format');
      }

      await updateRound(roundId, {
        date: format(parsedDate, 'yyyy-MM-dd'),
        tee_time: formData.teeTime || null,
        game_type: formData.gameType,
        selected_tee: formData.selectedTee,
        scoring_pairs_required: formData.scoringPairsRequired,
        course_id: formData.courseId,
      });
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      if (competitionId) {
        queryClient.invalidateQueries({
          queryKey: ['competition', competitionId, 'details'],
        });
      }
      onSuccess();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update round');
    },
  });

  // Shuffle scoring pairs mutation
  const shuffleMutation = useMutation({
    mutationFn: () => shuffleScoringPairs(roundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scoringPairsKeys.list(roundId) });
      Alert.alert(
        'Scoring Pairs Shuffled',
        'Existing scoring pairs have been cleared. New pairs will be auto-generated when players view the round.',
        [{ text: 'OK' }]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to shuffle scoring pairs');
    },
  });

  const handleSubmit = useCallback(() => {
    if (!formData.date) {
      Alert.alert('Error', 'Please select a date');
      return;
    }
    updateMutation.mutate();
  }, [formData.date, updateMutation]);

  const handleShuffleScoringPairs = useCallback(() => {
    Alert.alert(
      'Shuffle Scoring Pairs',
      'This will clear all existing scoring pairs and generate new random ones. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Shuffle',
          style: 'destructive',
          onPress: () => shuffleMutation.mutate(),
        },
      ]
    );
  }, [shuffleMutation]);

  return {
    updateMutation,
    shuffleMutation,
    handleSubmit,
    handleShuffleScoringPairs,
    isSubmitting: updateMutation.isPending,
    isShuffling: shuffleMutation.isPending,
  };
}
