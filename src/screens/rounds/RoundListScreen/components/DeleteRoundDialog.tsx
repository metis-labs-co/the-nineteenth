/**
 * DeleteRoundDialog - confirm step for useRoundActions' delete flow.
 *
 * Scheduled rounds with invitees are cancelled (invitees notified, no undo);
 * everything else is a soft delete.
 */

import React from 'react';
import { ConfirmationDialog } from '@/components/common';
import type { RoundItem } from '../types';

interface DeleteRoundDialogProps {
  visible: boolean;
  round: RoundItem | null;
  isCancel: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteRoundDialog({
  visible,
  round,
  isCancel,
  loading,
  onConfirm,
  onCancel,
}: DeleteRoundDialogProps) {
  const courseName = round?.course.name ?? 'this course';

  return (
    <ConfirmationDialog
      visible={visible}
      title={isCancel ? 'Cancel Round' : 'Delete Round'}
      message={
        isCancel
          ? `Cancel this round at ${courseName}? All invited players will be notified and it will be removed for everyone. This can't be undone.`
          : `Are you sure you want to delete this round at ${courseName}? This action cannot be undone.`
      }
      confirmLabel={isCancel ? 'Cancel Round' : 'Delete'}
      cancelLabel={isCancel ? 'Keep Round' : 'Cancel'}
      confirmVariant="destructive"
      onConfirm={onConfirm}
      onCancel={onCancel}
      loading={loading}
      icon="delete"
    />
  );
}
