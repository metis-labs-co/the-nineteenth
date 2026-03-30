/**
 * LeagueLeaderboardRow - Table-style row matching competition LeaderboardTable
 *
 * Columns: # | Player (with rounds counting subtitle) | Avg | Best
 * Features: Trophy for 1st, current user highlighting, tied indicator, pressable rows
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { IconTrophy, IconChevronRight } from '@tabler/icons-react-native';
import { ScaledText } from '@/components/common/ScaledText';
import { useThemeColors } from '@/context/ThemeContext';
import { withOpacity } from '@/constants/colors';
import { spacing, typography } from '@/constants/theme';
import type { LeagueLeaderboardEntry } from '@/types/database';

interface Props {
  entry: LeagueLeaderboardEntry;
  /** Current user ID for "You" highlighting */
  currentUserId?: string;
  /** Whether this entry is tied with adjacent entries */
  isTied?: boolean;
  /** Callback when row is pressed */
  onPress?: (entry: LeagueLeaderboardEntry) => void;
  /** Whether this is the last row (no bottom border) */
  isLast?: boolean;
}

export default React.memo(function LeagueLeaderboardRow({
  entry,
  currentUserId,
  isTied = false,
  onPress,
  isLast = false,
}: Props) {
  const colors = useThemeColors();

  const isCurrentUser = entry.player_id === currentUserId;
  const isFirstPlace = entry.rank === 1;
  const isPressable = !!onPress;

  const rowContent = (
    <>
      {/* Position */}
      <View style={[styles.cell, styles.positionCol]}>
        {isFirstPlace ? (
          <IconTrophy size={20} color={colors.warning} />
        ) : (
          <ScaledText
            category="caption"
            style={[
              styles.positionText,
              { color: colors.textSecondary },
              isCurrentUser && { color: colors.primary },
            ]}
          >
            {entry.rank}
            {isTied && (
              <ScaledText category="caption" style={[styles.tiedIndicator, { color: colors.textDisabled }]}>
                T
              </ScaledText>
            )}
          </ScaledText>
        )}
      </View>

      {/* Player Name */}
      <View style={[styles.cell, styles.playerCol]}>
        <ScaledText
          category="body"
          style={[
            styles.playerName,
            { color: colors.textPrimary },
            isCurrentUser && [styles.playerNameHighlighted, { color: colors.primary }],
          ]}
          numberOfLines={1}
        >
          {isCurrentUser ? 'You' : entry.name}
        </ScaledText>
        <ScaledText category="caption" style={[styles.roundsText, { color: colors.textSecondary }]}>
          {entry.rounds_counting}/{entry.rounds_played} counting
        </ScaledText>
      </View>

      {/* Handicap */}
      <View style={[styles.cell, styles.hcCol]}>
        <ScaledText
          category="caption"
          style={[styles.hcText, { color: colors.textSecondary }]}
        >
          {entry.avg_handicap != null ? entry.avg_handicap.toFixed(1) : '-'}
        </ScaledText>
      </View>

      {/* Avg Differential */}
      <View style={[styles.cell, styles.avgCol]}>
        <ScaledText
          category="caption"
          style={[
            styles.avgText,
            { color: colors.textPrimary },
            isCurrentUser && { color: colors.primary },
            isFirstPlace && { color: colors.warningDark },
          ]}
        >
          {entry.avg_differential != null ? entry.avg_differential.toFixed(1) : '-'}
        </ScaledText>
      </View>

      {/* Best Differential */}
      <View style={[styles.cell, styles.bestCol]}>
        <ScaledText
          category="caption"
          style={[
            styles.bestText,
            { color: colors.textSecondary },
            isCurrentUser && { color: colors.primary },
          ]}
        >
          {entry.best_differential != null ? entry.best_differential.toFixed(1) : '-'}
        </ScaledText>
      </View>

      {/* Chevron when pressable */}
      {isPressable && (
        <View style={[styles.cell, styles.chevronCol]}>
          <IconChevronRight size={16} color={colors.textTertiary} />
        </View>
      )}
    </>
  );

  const rowStyle = [
    styles.row,
    !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    isCurrentUser && [styles.rowHighlighted, { backgroundColor: withOpacity(colors.primaryLighter, 0.19) }],
    isFirstPlace && [styles.rowFirst, { backgroundColor: withOpacity(colors.warningLight, 0.13) }],
  ];

  const accessibilityLabel = `Position ${entry.rank}${isTied ? ' tied' : ''}: ${isCurrentUser ? 'You' : entry.name}, Handicap ${entry.avg_handicap?.toFixed(1) ?? 'none'}, Average ${entry.avg_differential?.toFixed(1) ?? 'none'}, Best ${entry.best_differential?.toFixed(1) ?? 'none'}, ${entry.rounds_counting} of ${entry.rounds_played} rounds counting`;

  if (isPressable) {
    return (
      <TouchableOpacity
        style={rowStyle}
        onPress={() => onPress(entry)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Tap to view tagged rounds"
      >
        {rowContent}
      </TouchableOpacity>
    );
  }

  return (
    <View style={rowStyle} accessibilityRole="text" accessibilityLabel={accessibilityLabel}>
      {rowContent}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  rowHighlighted: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  rowFirst: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  cell: {
    justifyContent: 'center',
  },
  // Column widths matching LeaderboardTable pattern
  positionCol: {
    minWidth: 32,
    alignItems: 'center',
  },
  playerCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  hcCol: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  avgCol: {
    minWidth: 46,
    alignItems: 'flex-end',
  },
  bestCol: {
    minWidth: 46,
    alignItems: 'flex-end',
  },
  chevronCol: {
    width: 20,
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  // Text styles
  positionText: {
    ...typography.bodyBold,
  },
  tiedIndicator: {
    ...typography.caption,
  },
  playerName: {
    ...typography.body,
  },
  playerNameHighlighted: {
    ...typography.bodyBold,
  },
  roundsText: {
    ...typography.caption,
    marginTop: 2,
  },
  hcText: {
    ...typography.small,
  },
  avgText: {
    ...typography.h4,
  },
  bestText: {
    ...typography.small,
  },
});
