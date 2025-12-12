/**
 * RecentRoundRow - Row displaying a recent round summary
 *
 * Shows date, course name, competition name, and scores.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

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
  /** Whether this is the last row (removes bottom border) */
  isLast?: boolean;
  /** Whether this is a practice round (shows badge) */
  isPracticeRound?: boolean;
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
  isLast = false,
  isPracticeRound = false,
}: RecentRoundRowProps) {
  const colors = useThemeColors();

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
          {isPracticeRound && (
            <View style={[styles.practiceBadge, { backgroundColor: colors.infoLight }]}>
              <Text style={[styles.practiceBadgeText, { color: colors.info }]}>Practice</Text>
            </View>
          )}
        </View>
        <Text style={[styles.competition, { color: colors.textSecondary }]} numberOfLines={1}>
          {competitionName}
        </Text>
      </View>
      <View style={styles.scores}>
        <Text style={[styles.gross, { color: colors.textPrimary }]}>{totalGross}</Text>
        <Text style={[styles.points, { color: colors.primary }]}>{totalPoints} pts</Text>
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
  practiceBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  practiceBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  competition: {
    ...typography.caption,
    marginTop: 2,
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
