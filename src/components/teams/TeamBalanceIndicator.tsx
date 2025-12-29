// src/components/teams/TeamBalanceIndicator.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  borderRadius,
  type ColorPalette,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { BalanceQuality } from './teamAlgorithms';

interface TeamBalanceIndicatorProps {
  balanceQuality: BalanceQuality;
  handicapSpread: number;
  showSwapHint?: boolean;
}

/**
 * TeamBalanceIndicator - Displays the balance quality of teams
 *
 * Shows:
 * - Good/Fair/Poor indicator with appropriate icon
 * - Handicap spread value
 * - Optional swap hint when a player is selected
 */
export const TeamBalanceIndicator = React.memo(function TeamBalanceIndicator({
  balanceQuality,
  handicapSpread,
  showSwapHint = false,
}: TeamBalanceIndicatorProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const getQualityColor = () => {
    switch (balanceQuality) {
      case 'good':
        return colors.success;
      case 'fair':
        return colors.warning;
      case 'poor':
        return colors.error;
    }
  };

  const getQualityLabel = () => {
    switch (balanceQuality) {
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
    }
  };

  const qualityColor = getQualityColor();

  return (
    <View style={[styles.container, styles[`balance_${balanceQuality}`]]}>
      <View style={styles.content}>
        <View style={styles.left}>
          {balanceQuality === 'good' && (
            <IconCheck size={20} color={colors.success} />
          )}
          {balanceQuality === 'fair' && (
            <IconAlertCircle size={20} color={colors.warning} />
          )}
          {balanceQuality === 'poor' && (
            <IconAlertCircle size={20} color={colors.error} />
          )}
          <Text style={styles.label}>Handicap Balance:</Text>
        </View>
        <Text style={[styles.value, { color: qualityColor }]}>
          {getQualityLabel()}
        </Text>
        <Text style={styles.spreadValue}>
          ({handicapSpread.toFixed(1)} spread)
        </Text>
      </View>
      {showSwapHint && (
        <Text style={styles.swapHint}>
          Tap another player to swap
        </Text>
      )}
    </View>
  );
});

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceVariant,
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
      color: colors.textSecondary,
    },
    value: {
      ...typography.smallBold,
    },
    spreadValue: {
      ...typography.caption,
      color: colors.textTertiary,
    },
    swapHint: {
      ...typography.caption,
      color: colors.primary,
      marginTop: spacing.xs,
      fontStyle: 'italic',
    },
    balance_good: {
      backgroundColor: `${colors.success}15`,
      borderLeftWidth: 3,
      borderLeftColor: colors.success,
    },
    balance_fair: {
      backgroundColor: `${colors.warning}15`,
      borderLeftWidth: 3,
      borderLeftColor: colors.warning,
    },
    balance_poor: {
      backgroundColor: `${colors.error}15`,
      borderLeftWidth: 3,
      borderLeftColor: colors.error,
    },
  });

export default TeamBalanceIndicator;
