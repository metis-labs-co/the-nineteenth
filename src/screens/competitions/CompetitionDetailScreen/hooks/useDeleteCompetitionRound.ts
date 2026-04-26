/**
 * useDeleteCompetitionRound
 *
 * Manages swipe-to-delete dialog state and confirmation for rounds on the
 * Competition Detail screen. Wraps the shared useDeleteRound mutation.
 */

import { useCallback, useState } from 'react';
import { useDeleteRound } from '@/hooks/rounds/mutations';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

interface UseDeleteCompetitionRoundParams {
  competitionId: string;
  onDeleted?: () => void;
  onError?: (title: string, message: string) => void;
}

export function useDeleteCompetitionRound({
  competitionId,
  onDeleted,
  onError,
}: UseDeleteCompetitionRoundParams) {
  const { mutate: deleteRound, isPending: isDeleting } = useDeleteRound();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<RoundWithCourse | null>(null);

  const handleDeleteRound = useCallback((round: RoundWithCourse) => {
    setRoundToDelete(round);
    setDeleteDialogVisible(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogVisible(false);
    setRoundToDelete(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!roundToDelete) return;
    deleteRound(
      { roundId: roundToDelete.id, competitionId },
      {
        onSuccess: () => {
          setDeleteDialogVisible(false);
          setRoundToDelete(null);
          onDeleted?.();
        },
        onError: (error) => {
          setDeleteDialogVisible(false);
          setRoundToDelete(null);
          onError?.(
            'Error',
            error instanceof Error
              ? error.message
              : 'Failed to delete round. Please try again.'
          );
        },
      }
    );
  }, [roundToDelete, competitionId, deleteRound, onDeleted, onError]);

  return {
    deleteDialogVisible,
    roundToDelete,
    isDeleting,
    handleDeleteRound,
    handleCancelDelete,
    handleConfirmDelete,
  };
}
