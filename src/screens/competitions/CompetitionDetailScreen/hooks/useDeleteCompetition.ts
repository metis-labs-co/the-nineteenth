/**
 * useDeleteCompetition
 *
 * Manages delete competition dialog state, mutation, and confirm handler.
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useToast } from '@/context/ToastContext';

interface UseDeleteCompetitionParams {
  id: string;
  onDeleted: () => void;
  showAlert: (title: string, message: string) => void;
}

export function useDeleteCompetition({ id, onDeleted, showAlert }: UseDeleteCompetitionParams) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
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

      showToast({
        variant: 'success',
        title: 'Competition deleted',
        autoDismissMs: 6000,
        action: {
          label: 'Undo',
          onPress: async () => {
            const { error: restoreError } = await supabase.rpc('restore_competition' as never, {
              p_competition_id: id,
            } as never);
            if (restoreError) {
              console.error('Error restoring competition:', restoreError);
              showToast({ variant: 'error', title: "Couldn't undo", message: 'Please try again.' });
              return;
            }
            queryClient.invalidateQueries({ queryKey: ['myCompetitions'] });
            queryClient.invalidateQueries({ queryKey: ['joinedCompetitions'] });
          },
        },
      });

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
  }, [id, onDeleted, queryClient, showAlert, showToast]);

  return {
    showDeleteDialog,
    setShowDeleteDialog,
    isDeleting,
    handleDeleteCompetition,
  };
}
