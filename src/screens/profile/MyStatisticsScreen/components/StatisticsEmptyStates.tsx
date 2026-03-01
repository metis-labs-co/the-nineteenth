/**
 * StatisticsEmptyStates - Loading, error, and empty states for statistics screen
 *
 * Provides consistent empty state displays:
 * - Loading: Spinner with message
 * - Error: Error icon with retry button
 * - Empty: No data message with helpful guidance
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LoadingSpinner, EmptyState, ErrorState } from '@/components/common';
import { spacing } from '@/constants/theme';

// =====================================================
// LOADING STATE
// =====================================================

export const StatisticsLoadingState = React.memo(function StatisticsLoadingState() {
  return (
    <View style={styles.centeredContainer}>
      <LoadingSpinner size="lg" message="Loading your statistics..." />
    </View>
  );
});

// =====================================================
// ERROR STATE
// =====================================================

interface StatisticsErrorStateProps {
  error: Error | unknown;
  onRetry: () => void;
}

export const StatisticsErrorState = React.memo(function StatisticsErrorState({
  error,
  onRetry,
}: StatisticsErrorStateProps) {
  return (
    <View style={styles.centeredContainer}>
      <ErrorState error={error instanceof Error ? error.message : 'An error occurred'} onRetry={onRetry} title="Unable to load statistics" />
    </View>
  );
});

// =====================================================
// EMPTY STATE
// =====================================================

export const StatisticsEmptyState = React.memo(function StatisticsEmptyState() {
  return (
    <View style={styles.centeredContainer}>
      <EmptyState title="No statistics yet" message="Complete some rounds to see your statistics here. Your performance data will be tracked automatically." icon="chart-bar" />
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
});
