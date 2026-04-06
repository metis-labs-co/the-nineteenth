/**
 * RecentRoundRow - Row displaying a recent round summary
 *
 * Shows date, course name, competition name, game type pill, and scores
 * formatted appropriately for the game type.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Pill } from '@/components/common';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { getGameTypeLabel } from '@/constants/statusConfig';
import type { GameType } from '@/types/database/enums';

// =====================================================
// TYPES
// =====================================================

export interface RecentRoundRowProps {
  /** Formatted date string */
  date: string;
  /** Course name */
  courseName: string;
  /** Competition name */
  competitionName: string;
  /** Total gross score */
  totalGross: number;
  /** Total stableford points */
  totalPoints: number;
  /** Game type for this round */
  gameType: GameType;
  /** Whether this is the last row (removes bottom border) */
  isLast?: boolean;
  /** Whether this is a practice round (shows badge) */
  isPracticeRound?: boolean;
}

// =====================================================
// HELPERS
// =====================================================

function formatSecondaryScore(gameType: GameType, totalPoints: number): string | null {
  switch (gameType) {
    case 'stableford':
      return `${totalPoints} pts`;
    case 'par':
      if (totalPoints === 0) return 'E';
      return totalPoints > 0 ? `+${totalPoints}` : `${totalPoints}`;
    case 'stroke':
    case 'match-play':
    case 'best-ball':
    case 'scramble':
    case 'shamble':
      return null;
    default:
      return null;
  }
}

// =====================================================
// COMPONENT
// =====================================================

export const RecentRoundRow = React.memo(function RecentRoundRow({
  date,
  courseName,
  competitionName,
  totalGross,
  totalPoints,
  gameType,
  isLast = false,
  isPracticeRound = false,
}: RecentRoundRowProps) {
  const colors = useThemeColors();
  const secondaryScore = formatSecondaryScore(gameType, totalPoints);

  return (
    <View
      style={[styles.row, { borderBottomColor: colors.borderLight }, isLast && styles.rowLast]}
    >
      <View style={styles.date}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{date}</Text>
      </View>
      <View style={styles.details}>
        <View style={styles.courseRow}>
          <Text style={[styles.course, { color: colors.textPrimary }]} numberOfLines={1}>
            {courseName}
          </Text>
        </View>
        <Text style={[styles.competition, { color: colors.textSecondary }]} numberOfLines={1}>
          {competitionName}
        </Text>
        <View style={styles.pillRow}>
          <Pill label={getGameTypeLabel(gameType)} variant="default" size="sm" />
          {isPracticeRound && (
            <Pill label="Practice" variant="info" size="sm" />
          )}
        </View>
      </View>
      <View style={styles.scores}>
        <Text style={[styles.gross, { color: colors.textPrimary }]}>{totalGross}</Text>
        {secondaryScore && (
          <Text style={[styles.points, { color: colors.primary }]}>{secondaryScore}</Text>
        )}
      </View>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  date: {
    width: 80,
  },
  dateText: {
    ...typography.small,
  },
  details: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  course: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  competition: {
    ...typography.caption,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  scores: {
    alignItems: 'flex-end',
  },
  gross: {
    ...typography.h4,
  },
  points: {
    ...typography.caption,
    marginTop: 2,
  },
});

export default RecentRoundRow;
