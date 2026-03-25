/**
 * EditCompetitionStates - Loading and error states
 */

import React from 'react';
import { BottomSheet, LoadingSpinner, ErrorState as CommonErrorState } from '@/components/common';

interface LoadingStateProps {
  onClose: () => void;
}

export function LoadingState({ onClose }: LoadingStateProps) {
  return (
    <BottomSheet
      visible={true}
      onClose={onClose}
      height="full"
      title="Edit Competition"
      showHandle={false}
      safeAreaTop
      showCloseButton
      testID="edit-competition-bottom-sheet"
    >
      <LoadingSpinner size="lg" message="Loading competition..." fullScreen />
    </BottomSheet>
  );
}

interface ErrorStateProps {
  onClose: () => void;
  errorMessage?: string;
}

export function ErrorState({ onClose, errorMessage }: ErrorStateProps) {
  return (
    <BottomSheet
      visible={true}
      onClose={onClose}
      height="full"
      title="Edit Competition"
      showHandle={false}
      safeAreaTop
      showCloseButton
      testID="edit-competition-bottom-sheet"
    >
      <CommonErrorState
        error={errorMessage || 'Competition not found'}
        title="Unable to load competition"
        onRetry={onClose}
        retryLabel="Go Back"
      />
    </BottomSheet>
  );
}
