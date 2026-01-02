/**
 * Hook for handling competition submission and mutations
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { Competition } from '@/types/database.types';
import type { CompetitionUpdateInput } from '../types';
import type { EditCompetitionFormData } from './useCompetitionValidation';
import { parseAustralianDate } from '@/utils/formatting';

interface UseCompetitionSubmissionOptions {
  competitionId: string;
  onSuccess: () => void;
}

interface UseCompetitionSubmissionReturn {
  updateMutation: ReturnType<typeof useMutation<Competition, Error, EditCompetitionFormData>>;
  handleSubmit: (data: EditCompetitionFormData) => void;
  isSubmitting: boolean;
}

/**
 * Update competition in database
 */
async function updateCompetition(
  competitionId: string,
  updates: CompetitionUpdateInput
): Promise<Competition> {
  const { data, error } = await supabase
    .from('competitions')
    // @ts-expect-error - Supabase types don't properly handle partial updates
    .update(updates)
    .eq('id', competitionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update competition: ${error.message}`);
  }

  return data as Competition;
}

/**
 * Handles competition update mutations
 */
export function useCompetitionSubmission({
  competitionId,
  onSuccess,
}: UseCompetitionSubmissionOptions): UseCompetitionSubmissionReturn {
  const queryClient = useQueryClient();

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: EditCompetitionFormData) => {
      const startDateParsed = parseAustralianDate(data.startDate);
      const endDateParsed = data.endDate ? parseAustralianDate(data.endDate) : null;

      return updateCompetition(competitionId, {
        name: data.name,
        description: data.description || null,
        competition_type: data.competitionType,
        team_mode: data.teamMode,
        start_date: startDateParsed ? startDateParsed.toISOString().split('T')[0] : undefined,
        end_date: endDateParsed ? endDateParsed.toISOString().split('T')[0] : null,
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'details'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      onSuccess();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update competition');
    },
  });

  const handleSubmit = useCallback(
    (data: EditCompetitionFormData) => {
      updateMutation.mutate(data);
    },
    [updateMutation]
  );

  return {
    updateMutation,
    handleSubmit,
    isSubmitting: updateMutation.isPending,
  };
}
