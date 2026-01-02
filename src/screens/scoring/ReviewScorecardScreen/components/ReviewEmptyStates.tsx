/**
 * ReviewEmptyStates - Loading and empty state components for scorecard review
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LoadingSpinner, EmptyState } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';

export function ReviewLoadingState() {
  const colors = useThemeColors();

  return (
    <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
      <LoadingSpinner size="lg" message="Loading scorecard..." />
    </View>
  );
}

interface EmptyStateProps {
  onEnterScores: () => void;
}

export function ReviewEmptyState({ onEnterScores }: EmptyStateProps) {
  return (
    <EmptyState
      title="No Scores Recorded"
      message="Go back to enter scores for each hole before reviewing."
      icon="clipboard-list-outline"
      actionLabel="Enter Scores"
      onAction={onEnterScores}
    />
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
});
