/**
 * RecentRoundRow - Row displaying a recent round summary
 *
 * Vertically stacks date, club + course, competition name, and pills on the
 * left so the row can accommodate a long date format (e.g. "Fri, 23rd April,
 * 2026") without crowding the scores column on the right.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
  /** Club name (parent club for the course). Omitted from display when empty. */
  clubName?: string | null;
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
  /** Standalone round NOT counted toward handicap (shows "Practice" badge). */
  isPracticeRound?: boolean;
  /** Standalone round counted toward handicap (shows "Handicap" badge). */
  isHandicapRound?: boolean;
  /** Optional press handler */
  onPress?: () => void;
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
  clubName,
  competitionName,
  totalGross,
  totalPoints,
  gameType,
  isLast = false,
  isPracticeRound = false,
  isHandicapRound = false,
  onPress,
}: RecentRoundRowProps) {
  const colors = useThemeColors();
  const secondaryScore = formatSecondaryScore(gameType, totalPoints);
  const showClub = !!clubName && clubName.trim() !== '' && clubName !== courseName;

  const content = (
    <>
      <View style={styles.details}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]} numberOfLines={2}>
          {date}
        </Text>
        <Text style={[styles.course, { color: colors.textPrimary }]} numberOfLines={2}>
          {courseName}
        </Text>
        {showClub && (
          <Text style={[styles.club, { color: colors.textSecondary }]} numberOfLines={2}>
            {clubName}
          </Text>
        )}
        <Text style={[styles.competition, { color: colors.textSecondary }]} numberOfLines={1}>
          {competitionName}
        </Text>
        <View style={styles.pillRow}>
          <Pill label={getGameTypeLabel(gameType)} variant="default" size="sm" />
          {isHandicapRound && <Pill label="Handicap" variant="success" size="sm" />}
          {isPracticeRound && <Pill label="Practice" variant="info" size="sm" />}
        </View>
      </View>
      <View style={styles.scores}>
        <Text style={[styles.gross, { color: colors.textPrimary }]}>{totalGross}</Text>
        {secondaryScore && (
          <Text style={[styles.points, { color: colors.primary }]}>{secondaryScore}</Text>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.borderLight }, isLast && styles.rowLast]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.row, { borderBottomColor: colors.borderLight }, isLast && styles.rowLast]}
    >
      {content}
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  details: {
    flex: 1,
    marginRight: spacing.md,
  },
  dateText: {
    ...typography.small,
    marginBottom: 2,
  },
  course: {
    ...typography.bodyBold,
  },
  club: {
    ...typography.caption,
    marginTop: 2,
  },
  competition: {
    ...typography.caption,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
