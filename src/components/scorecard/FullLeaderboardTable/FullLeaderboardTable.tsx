/**
 * FullLeaderboardTable - shared presentational table for the single-score-column
 * full-tab leaderboards (Par, Stableford). Callers compute the rows (the scoring
 * lives in the format-specific component) and pass them in with a score-cell
 * formatter; this component owns only the rendering (header, table header,
 * position badges, rows, empty state, styles).
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { EmptyState } from '@/components/common';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface FullLeaderboardRow {
  playerId: string;
  playerName: string;
  handicap: number;
  position: number;
  holesCompleted: number;
  isCurrentUser: boolean;
  /** The numeric value shown in the score column (points). */
  scoreValue: number;
}

export interface FullLeaderboardTableProps {
  rows: FullLeaderboardRow[];
  /** Highest hole number any player has completed (for the "thru N" label). */
  maxCompletedHole: number;
  /** Whether there are any players at all (drives the empty state with rows). */
  hasPlayers: boolean;
  /** Column header for the score column, e.g. 'Pts'. */
  scoreHeaderLabel: string;
  /** Render the score-cell text for a row (e.g. '+2'/'E' for Par, '9' for Stableford). */
  formatScore: (row: FullLeaderboardRow) => string;
  /** Spoken score for the row's accessibility label (e.g. '+2' or '9 points'). */
  scoreAccessibility: (row: FullLeaderboardRow) => string;
  onPlayerPress?: (playerId: string) => void;
  testID?: string;
}

const MEDAL_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

export const FullLeaderboardTable = React.memo(function FullLeaderboardTable({
  rows,
  maxCompletedHole,
  hasPlayers,
  scoreHeaderLabel,
  formatScore,
  scoreAccessibility,
  onPlayerPress,
  testID,
}: FullLeaderboardTableProps) {
  const colors = useThemeColors();

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return MEDAL_COLORS.gold;
      case 2:
        return MEDAL_COLORS.silver;
      case 3:
        return MEDAL_COLORS.bronze;
      default:
        return colors.textSecondary;
    }
  };

  if (maxCompletedHole === 0 || !hasPlayers) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]} testID={testID}>
        <EmptyState
          title="No Scores Yet"
          message="Leaderboard standings will appear here as you complete each hole."
          icon="trophy-outline"
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Icon source="trophy" size={24} color={colors.primary} />
          <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
            Leaderboard
          </Text>
          <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
            (thru {maxCompletedHole})
          </Text>
        </View>
      </View>

      {/* Table header */}
      <View style={[styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.positionCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Pos</Text>
        </View>
        <View style={styles.playerCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Player</Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{scoreHeaderLabel}</Text>
        </View>
        <View style={styles.thruCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Thru</Text>
        </View>
      </View>

      {/* Rows */}
      {rows.map((row, index) => {
        const rowStyle = [
          styles.row,
          { backgroundColor: row.isCurrentUser ? colors.primaryBackground : colors.surface },
          index < rows.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
        ];
        const accessibilityLabel = `${row.position} place: ${row.playerName}, ${scoreAccessibility(row)}`;
        const rowContent = (
          <>
          <View style={styles.positionCol}>
            <View
              style={[
                styles.positionBadge,
                row.position <= 3 && { backgroundColor: getPositionColor(row.position) + '20' },
              ]}
            >
              <Text
                style={[
                  row.position <= 3 ? typography.bodyBold : typography.body,
                  { color: row.position <= 3 ? getPositionColor(row.position) : colors.textPrimary },
                ]}
              >
                {row.position}
              </Text>
            </View>
          </View>

          <View style={styles.playerCol}>
            <Text
              style={[
                typography.body,
                row.isCurrentUser && typography.bodyBold,
                { color: row.isCurrentUser ? colors.primary : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {row.playerName}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              HC {row.handicap}
            </Text>
          </View>

          <View style={styles.scoreCol}>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {formatScore(row)}
            </Text>
          </View>

          <View style={styles.thruCol}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {row.holesCompleted}
            </Text>
          </View>
          </>
        );

        if (onPlayerPress) {
          return (
            <TouchableOpacity
              key={row.playerId}
              style={rowStyle}
              onPress={() => onPlayerPress(row.playerId)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              accessibilityHint="Tap to view scorecard"
            >
              {rowContent}
            </TouchableOpacity>
          );
        }

        return (
          <View key={row.playerId} style={rowStyle} accessibilityLabel={accessibilityLabel}>
            {rowContent}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  positionCol: {
    width: 40,
    alignItems: 'center',
  },
  playerCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  scoreCol: {
    width: 60,
    alignItems: 'center',
  },
  thruCol: {
    width: 50,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
});

export default FullLeaderboardTable;
