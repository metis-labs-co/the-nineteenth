/**
 * useDeleteCompetition
 *
 * Manages delete competition dialog state, mutation, and confirm handler.
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';

interface UseDeleteCompetitionParams {
  id: string;
  onDeleted: () => void;
  showAlert: (title: string, message: string) => void;
}

export function useDeleteCompetition({ id, onDeleted, showAlert }: UseDeleteCompetitionParams) {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCompetition = useCallback(async () => {
    setIsDeleting(true);
    try {
      // Use the soft_delete_competition database function
      const { error } = await supabase.rpc(
        'soft_delete_competition' as never,
        { p_competition_id: id } as never
      );

      if (error) {
        throw error;
      }

      // Invalidate competitions list cache
      queryClient.invalidateQueries({ queryKey: ['myCompetitions'] });
      queryClient.invalidateQueries({ queryKey: ['joinedCompetitions'] });

      // Close dialog and navigate back
      setShowDeleteDialog(false);
      onDeleted();
    } catch (error: unknown) {
      setIsDeleting(false);
      showAlert(
        'Error',
        error instanceof Error ? error.message : 'Failed to delete competition. Please try again.'
      );
    }
  }, [id, onDeleted, queryClient, showAlert]);

  return {
    showDeleteDialog,
    setShowDeleteDialog,
    isDeleting,
    handleDeleteCompetition,
  };
}
