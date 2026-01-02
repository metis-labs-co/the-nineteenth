/**
 * CoverageIndicator - Shows pairing coverage status with visual feedback
 *
 * Displays how many players are covered and provides appropriate color-coded
 * feedback (green for complete, yellow for partial, red for low coverage).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  borderRadius,
  layout,
  type ColorPalette,
} from '@/constants/theme';
import type { CoverageQuality } from '../types';

interface CoverageIndicatorProps {
  coveredPlayersCount: number;
  totalPlayersCount: number;
  coverageQuality: CoverageQuality;
  selectedPlayer: string | null;
  colors: ColorPalette;
}

export const CoverageIndicator = React.memo(function CoverageIndicator({
  coveredPlayersCount,
  totalPlayersCount,
  coverageQuality,
  selectedPlayer,
  colors,
}: CoverageIndicatorProps) {
  const getBackgroundColor = () => {
    switch (coverageQuality) {
      case 'good':
        return `${colors.success}15`;
      case 'warning':
        return `${colors.warning}15`;
      case 'error':
        return `${colors.error}15`;
      default:
        return colors.surfaceVariant;
    }
  };

  const getBorderColor = () => {
    switch (coverageQuality) {
      case 'good':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      default:
        return 'transparent';
    }
  };

  const getTextColor = () => {
    switch (coverageQuality) {
      case 'good':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (coverageQuality) {
      case 'good':
        return 'All players covered';
      case 'warning':
        return 'Some players missing';
      case 'error':
        return 'Many players missing';
      default:
        return '';
    }
  };

  const Icon = coverageQuality === 'good' ? IconCheck : IconAlertCircle;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderLeftColor: getBorderColor(),
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          <Icon size={20} color={getTextColor()} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Coverage:
          </Text>
        </View>
        <Text style={[styles.value, { color: getTextColor() }]}>
          {coveredPlayersCount}/{totalPlayersCount}
        </Text>
        <Text style={[styles.status, { color: colors.textTertiary }]}>
          {getStatusText()}
        </Text>
      </View>
      {selectedPlayer && (
        <Text style={[styles.hint, { color: colors.primary }]}>
          Tap another player to create pair
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: layout.screenPadding,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    ...typography.small,
  },
  value: {
    ...typography.smallBold,
  },
  status: {
    ...typography.caption,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});

export default CoverageIndicator;
