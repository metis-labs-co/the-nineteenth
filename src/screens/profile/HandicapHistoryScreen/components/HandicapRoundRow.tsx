/**
 * HandicapRoundRow - Displays a single round in the handicap history
 *
 * Shows course name, date, gross score, and differential.
 * Qualifying rounds are highlighted with a primary-colored left border.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { formatHandicapIndex } from '@/utils/displayHelpers';
import { formatDateDisplay } from '@/utils/formatting';
import type { HandicapRound } from '@/types';

interface HandicapRoundRowProps {
  round: HandicapRound;
  /** Called when the user taps the unlink button on a combined entry */
  onUncombine?: (round: HandicapRound) => void;
  /** When true, the unlink button is disabled (in-flight) */
  isUncombining?: boolean;
}

/**
 * Format a date string for display using device locale
 */
function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    return formatDateDisplay(dateString, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function HandicapRoundRow({
  round,
  onUncombine,
  isUncombining,
}: HandicapRoundRowProps) {
  const colors = useThemeColors();

  const handleUncombinePress = useCallback(() => {
    if (!onUncombine) return;
    Alert.alert(
      'Unlink combined round?',
      'This restores both 9-hole rounds as separate scorecards. They will no longer count toward your handicap index.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => onUncombine(round),
        },
      ],
    );
  }, [onUncombine, round]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        round.isQualifying && styles.qualifyingContainer,
        round.isQualifying && { borderLeftColor: colors.primary },
      ]}
    >
      {/* Left Section: Course & Date */}
      <View style={styles.leftSection}>
        <Text
          style={[styles.courseName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {round.courseName}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {formatDate(round.roundDate)}
        </Text>
        {round.isCombined && (
          <View style={styles.combinedBadgeRow}>
            <View style={[styles.combinedBadge, { backgroundColor: colors.primaryLighter }]}>
              <Icon source="link-variant" size={11} color={colors.primaryDark} />
              <Text style={[styles.combinedBadgeText, { color: colors.primaryDark }]}>
                Combined 9+9
              </Text>
            </View>
            {onUncombine && (
              <TouchableOpacity
                onPress={handleUncombinePress}
                disabled={isUncombining}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Unlink combined round"
              >
                <Text style={[styles.unlinkText, { color: colors.textTertiary }]}>
                  Unlink
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Center Section: Gross Score */}
      <View style={styles.centerSection}>
        <Text style={[styles.scoreValue, { color: colors.textPrimary }]}>
          {round.totalGross}
        </Text>
        <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
          Gross
        </Text>
        {round.dailyHandicapUsed !== 0 && (
          <Text style={[styles.handicapUsed, { color: colors.textTertiary }]}>
            HC: {formatHandicapIndex(round.dailyHandicapUsed, 0)}
          </Text>
        )}
      </View>

      {/* Right Section: Differential */}
      <View style={styles.rightSection}>
        <View style={styles.differentialRow}>
          <Text style={[styles.differentialValue, { color: colors.textPrimary }]}>
            {round.handicapDifferential.toFixed(1)}
          </Text>
          {round.isQualifying && (
            <Icon source="check-circle" size={16} color={colors.primary} />
          )}
        </View>
        <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
          Differential
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  qualifyingContainer: {
    borderLeftWidth: 3,
  },
  leftSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  courseName: {
    ...typography.bodyBold,
    marginBottom: spacing.xxs,
  },
  date: {
    ...typography.caption,
  },
  centerSection: {
    alignItems: 'center',
    minWidth: 60,
    marginRight: spacing.md,
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  scoreValue: {
    ...typography.h4,
  },
  scoreLabel: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  handicapUsed: {
    ...typography.caption,
    fontSize: 10,
    marginTop: spacing.xxs,
  },
  differentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  differentialValue: {
    ...typography.h4,
  },
  combinedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  combinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  combinedBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  unlinkText: {
    ...typography.caption,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
