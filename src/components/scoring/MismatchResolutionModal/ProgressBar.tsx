/**
 * ProgressBar - Progress indicator for mismatch resolution
 *
 * Shows resolved count, "All done!" badge, and a visual progress track.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface ProgressBarProps {
  /** Number of resolved mismatches */
  resolvedCount: number;
  /** Total number of mismatches */
  totalCount: number;
  /** Whether all mismatches are resolved */
  allResolved: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ProgressBar = React.memo(function ProgressBar({
  resolvedCount,
  totalCount,
  allResolved,
}: ProgressBarProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
      <View style={styles.progressContent}>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {resolvedCount} of {totalCount} resolved
        </Text>
        {allResolved && (
          <View style={styles.allResolvedBadge}>
            <Icon source="check" size={14} color={colors.success} />
            <Text style={[styles.allResolvedText, { color: colors.success }]}>
              All done!
            </Text>
          </View>
        )}
      </View>
      {/* Progress bar visual */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: allResolved ? colors.success : colors.primary,
              width: totalCount > 0 ? `${(resolvedCount / totalCount) * 100}%` : '0%',
            },
          ]}
        />
      </View>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  progressBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  progressContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressText: {
    ...typography.small,
  },
  allResolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  allResolvedText: {
    ...typography.smallBold,
  },
  progressTrack: {
    height: 4,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
