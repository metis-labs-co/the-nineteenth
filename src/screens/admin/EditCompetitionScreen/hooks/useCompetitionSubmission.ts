/**
 * Hook for handling competition submission and mutations
 *
 * Handles:
 * - Competition details update (name, description, type, team mode, dates)
 *
 * Note: Prize pool create/update/delete is handled separately via
 * EditPrizePoolBottomSheet from the CompetitionDetailScreen.
 */

import { useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import type { DialogConfig } from '@/hooks/useConfirmationDialog';
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
  /** Dialog config for error display - parent should render ConfirmationDialog */
  dialogConfig: DialogConfig;
  /** Dismiss the error dialog */
  dismissDialog: () => void;
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
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (formData: EditCompetitionFormData) => {
      // Update competition details
      const startDateParsed = parseAustralianDate(formData.startDate);
      const endDateParsed = formData.endDate ? parseAustralianDate(formData.endDate) : null;

      const competition = await updateCompetition(competitionId, {
        name: formData.name,
        description: formData.description || null,
        competition_type: formData.competitionType,
        team_mode: formData.teamMode,
        start_date: startDateParsed ? startDateParsed.toISOString().split('T')[0] : undefined,
        end_date: endDateParsed ? endDateParsed.toISOString().split('T')[0] : null,
      });

      return competition;
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'details'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      onSuccess();
    },
    onError: (error: Error) => {
      showAlert('Error', error.message || 'Failed to update competition');
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
    dialogConfig,
    dismissDialog,
  };
}
