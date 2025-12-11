/**
 * RoundLeaderboardTab - Leaderboard tab for ViewRoundScreen
 *
 * Displays a table-style leaderboard with:
 * - Position (with trophy icon for first place)
 * - Player name
 * - Handicap
 * - Stableford points
 * - Tie indicators
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconTrophy } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { EmptyState } from '@/components/common/EmptyState';
import type { ScorecardWithPlayer } from '@/hooks/useRoundDetails';

// =====================================================
// TYPES
// =====================================================

interface RoundLeaderboardTabProps {
  scorecards: ScorecardWithPlayer[];
}

interface LeaderboardEntry extends ScorecardWithPlayer {
  position: number;
  isTied: boolean;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function calculatePositions(scorecards: ScorecardWithPlayer[]): LeaderboardEntry[] {
  const sorted = [...scorecards].sort(
    (a, b) => (b.total_points || 0) - (a.total_points || 0)
  );

  let currentPosition = 1;
  let lastPoints: number | null = null;

  return sorted.map((scorecard, index) => {
    const points = scorecard.total_points || 0;
    if (lastPoints === null || points !== lastPoints) {
      currentPosition = index + 1;
    }
    lastPoints = points;

    // Check if tied with next or previous
    const isTied =
      (index > 0 && sorted[index - 1]?.total_points === points) ||
      (index < sorted.length - 1 && sorted[index + 1]?.total_points === points);

    return {
      ...scorecard,
      position: currentPosition,
      isTied,
    };
  });
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface TableHeaderProps {
  colors: ReturnType<typeof useThemeColors>;
}

const TableHeader = React.memo(function TableHeader({ colors }: TableHeaderProps) {
  return (
    <View style={[styles.tableHeader, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}>
      <Text style={[styles.headerCell, styles.positionCol, { color: colors.textSecondary }]}>#</Text>
      <Text style={[styles.headerCell, styles.playerCol, { color: colors.textSecondary }]}>Player</Text>
      <Text style={[styles.headerCell, styles.handicapCol, { color: colors.textSecondary }]}>HC</Text>
      <Text style={[styles.headerCell, styles.pointsCol, { color: colors.textSecondary }]}>Pts</Text>
    </View>
  );
});

interface TableRowProps {
  entry: LeaderboardEntry;
  colors: ReturnType<typeof useThemeColors>;
}

const TableRow = React.memo(function TableRow({ entry, colors }: TableRowProps) {
  const isFirstPlace = entry.position === 1;
  const points = entry.total_points || 0;

  const accessibilityLabel = `Position ${entry.position}${entry.isTied ? ' tied' : ''}: ${
    entry.player?.name || 'Unknown'
  }, Handicap ${entry.player?.handicap || 0}, ${points} points`;

  return (
    <View
      style={[
        styles.tableRow,
        { backgroundColor: colors.surface, borderBottomColor: colors.borderLight },
        isFirstPlace && { backgroundColor: `${colors.warning}20` },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      {/* Position */}
      <View style={[styles.cell, styles.positionCol]}>
        {isFirstPlace ? (
          <IconTrophy size={24} color={colors.warning} />
        ) : (
          <Text style={[styles.positionText, { color: colors.textSecondary }]}>
            {entry.position}
            {entry.isTied && <Text style={[styles.tiedIndicator, { color: colors.textDisabled }]}>T</Text>}
          </Text>
        )}
      </View>

      {/* Player Name */}
      <View style={[styles.cell, styles.playerCol]}>
        <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
          {entry.player?.name || 'Unknown'}
        </Text>
      </View>

      {/* Handicap */}
      <View style={[styles.cell, styles.handicapCol]}>
        <Text style={[styles.handicapText, { color: colors.textSecondary }]}>
          {entry.player?.handicap || 0}
        </Text>
      </View>

      {/* Points */}
      <View style={[styles.cell, styles.pointsCol]}>
        <Text
          style={[
            styles.pointsText,
            { color: colors.textPrimary },
            isFirstPlace && { color: colors.warningDark },
          ]}
        >
          {points}
        </Text>
      </View>
    </View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const RoundLeaderboardTab = React.memo(function RoundLeaderboardTab({
  scorecards,
}: RoundLeaderboardTabProps) {
  const colors = useThemeColors();

  const leaderboardEntries = useMemo(() => calculatePositions(scorecards), [scorecards]);

  if (scorecards.length === 0) {
    return (
      <EmptyState
        icon="chart-bar"
        title="No scores yet"
        message="The leaderboard will update as players complete holes."
        compact
      />
    );
  }

  return (
    <View style={styles.container}>
      <TableHeader colors={colors} />

      {leaderboardEntries.map((entry) => (
        <TableRow key={entry.id} entry={entry} colors={colors} />
      ))}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textDisabled }]}>
          Pull down to refresh
        </Text>
      </View>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },

  // Table Header
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    marginHorizontal: -spacing.lg,
  },
  headerCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },

  // Table Row
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    minHeight: 64,
    alignItems: 'center',
    marginHorizontal: -spacing.lg,
  },
  cell: {
    justifyContent: 'center',
  },

  // Column Widths
  positionCol: {
    width: 48,
    alignItems: 'center',
  },
  playerCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  handicapCol: {
    width: 48,
    alignItems: 'center',
  },
  pointsCol: {
    width: 56,
    alignItems: 'flex-end',
  },

  // Text Styles
  positionText: {
    ...typography.bodyBold,
  },
  tiedIndicator: {
    ...typography.caption,
  },
  playerName: {
    ...typography.body,
  },
  handicapText: {
    ...typography.small,
  },
  pointsText: {
    ...typography.h4,
  },

  // Footer
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    marginHorizontal: -spacing.lg,
  },
  footerText: {
    ...typography.caption,
  },
});

export default RoundLeaderboardTab;
