/**
 * GameHistoryRow - Individual game result row
 *
 * Shows game type badge, course/date info, and net result.
 * Uses App Store safe terminology.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { CombinedGameHistoryEntry } from '@/hooks/useGameResults';

interface GameHistoryRowProps {
  entry: CombinedGameHistoryEntry;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatCurrency(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}$${Math.abs(value).toFixed(2)}`;
}

export const GameHistoryRow = React.memo(function GameHistoryRow({
  entry,
}: GameHistoryRowProps) {
  const colors = useThemeColors();

  const isSkins = entry.gameType === 'skins';
  const badgeColor = isSkins ? colors.primary : colors.warning;
  const badgeLabel = isSkins ? 'Skins' : 'Wolf';
  const badgeIcon = isSkins ? 'cards-playing-outline' : 'paw';

  const resultColor = entry.netResult > 0
    ? colors.success
    : entry.netResult < 0
    ? colors.error
    : colors.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Game type badge */}
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Icon source={badgeIcon} size={14} color={colors.white} />
        <Text style={[styles.badgeText, { color: colors.white }]}>
          {badgeLabel}
        </Text>
      </View>

      {/* Course and date info */}
      <View style={styles.center}>
        <Text
          style={[styles.courseName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {entry.courseName ?? 'Unknown Course'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {formatDate(entry.date)}
          </Text>
          {entry.competitionName && (
            <Text
              style={[styles.meta, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {' \u00B7 '}{entry.competitionName}
            </Text>
          )}
        </View>
      </View>

      {/* Net result */}
      <Text style={[styles.result, { color: resultColor }]}>
        {formatCurrency(entry.netResult)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 64,
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  center: {
    flex: 1,
  },
  courseName: {
    ...typography.bodyBold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  meta: {
    ...typography.caption,
    flexShrink: 1,
  },
  result: {
    ...typography.bodyBold,
    minWidth: 70,
    textAlign: 'right',
  },
});
