/**
 * ReviewEmptyStates - Loading and empty state components for scorecard review
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

interface LoadingStateProps {}

export function ReviewLoadingState(_props: LoadingStateProps) {
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
  const colors = useThemeColors();

  return (
    <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Scores Recorded</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Go back to enter scores for each hole before reviewing.
      </Text>
      <Button mode="contained" onPress={onEnterScores} style={styles.emptyButton}>
        Enter Scores
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    minWidth: 160,
  },
});
