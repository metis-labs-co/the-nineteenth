/**
 * StatisticsEmptyStates - Loading, error, and empty states for statistics screen
 *
 * Provides consistent empty state displays:
 * - Loading: Spinner with message
 * - Error: Error icon with retry button
 * - Empty: No data message with helpful guidance
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { IconAlertTriangle, IconChartBar } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

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
  const colors = useThemeColors();

  return (
    <View style={styles.centeredContainer}>
      <View style={[styles.iconContainer, { backgroundColor: colors.errorLight }]}>
        <IconAlertTriangle size={48} color={colors.error} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Unable to load statistics
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {error instanceof Error ? error.message : 'An error occurred'}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading statistics"
      >
        <Text style={[styles.retryButtonText, { color: colors.white }]}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
});

// =====================================================
// EMPTY STATE
// =====================================================

export const StatisticsEmptyState = React.memo(function StatisticsEmptyState() {
  const colors = useThemeColors();

  return (
    <View style={styles.centeredContainer}>
      <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
        <IconChartBar size={48} color={colors.gray400} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>No statistics yet</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        Complete some rounds to see your statistics here. Your performance data will be tracked
        automatically.
      </Text>
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    ...typography.bodyBold,
  },
});
