/**
 * WolfStandingsCard - Wolf game standings display
 *
 * Displays a ranked list of players by total points from the Wolf game.
 * Top 3 players get medal icons. Shows net result when pot is enabled.
 *
 * @example
 * ```tsx
 * <WolfStandingsCard
 *   standings={standings}
 *   potEnabled={wolfGame.pot_enabled}
 *   netResults={netResults}
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet, FlatList, ListRenderItem } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, wolfColor, medalColors } from '@/constants/theme';
import { formatWolfNetResult } from '@/utils/wolf';
import type { WolfStandingEntry } from '@/types/database/wolf.types';

// ============================================================================
// TYPES
// ============================================================================

export interface WolfStandingsCardProps {
  /** Array of standings entries, already ranked */
  standings: WolfStandingEntry[];
  /** Whether pot is enabled (shows net results) */
  potEnabled: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MEDAL_COLORS = {
  1: medalColors.gold,
  2: medalColors.silver,
  3: medalColors.bronze,
};

const MEDAL_ICONS = {
  1: 'medal',
  2: 'medal-outline',
  3: 'medal-outline',
} as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StandingRowProps {
  entry: WolfStandingEntry;
  potEnabled: boolean;
  index: number;
}

/**
 * Individual standings row
 */
const StandingRow = React.memo(function StandingRow({
  entry,
  potEnabled,
  index,
}: StandingRowProps) {
  const colors = useThemeColors();

  const rank = entry.rank;
  const isTopThree = rank >= 1 && rank <= 3;
  const medalColor = MEDAL_COLORS[rank as keyof typeof MEDAL_COLORS];

  const netResult = entry.net_result ?? 0;
  const netResultColor = netResult > 0 ? colors.success : netResult < 0 ? colors.error : colors.textSecondary;

  // Get first initial for leader indicator
  const initial = entry.name.charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: index % 2 === 0 ? colors.surface : colors.background,
          borderBottomColor: colors.border,
        },
      ]}
      accessibilityRole="none"
      accessibilityLabel={`Rank ${rank}, ${entry.name}, ${entry.total_points} points${potEnabled ? `, ${formatWolfNetResult(netResult)}` : ''}`}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {isTopThree ? (
          <Icon
            source={MEDAL_ICONS[rank as keyof typeof MEDAL_ICONS]}
            size={24}
            color={medalColor}
          />
        ) : (
          <Text style={[styles.rankText, { color: colors.textSecondary }]}>
            {rank}
          </Text>
        )}
      </View>

      {/* Player Initial Badge */}
      <View
        style={[
          styles.initialBadge,
          {
            backgroundColor: isTopThree
              ? `${medalColor}20`
              : colors.surfaceVariant,
          },
        ]}
      >
        <Text
          style={[
            styles.initialText,
            {
              color: isTopThree ? medalColor : colors.textSecondary,
            },
          ]}
        >
          {initial}
        </Text>
      </View>

      {/* Player Name */}
      <View style={styles.nameContainer}>
        <Text
          style={[
            styles.playerName,
            { color: colors.textPrimary },
            rank === 1 && styles.leaderName,
          ]}
          numberOfLines={1}
        >
          {entry.name}
        </Text>
      </View>

      {/* Points */}
      <View style={styles.pointsContainer}>
        <Text
          style={[
            styles.pointsText,
            { color: colors.textPrimary },
            rank === 1 && styles.leaderPoints,
          ]}
        >
          {entry.total_points}
        </Text>
        <Text style={[styles.pointsLabel, { color: colors.textTertiary }]}>
          pts
        </Text>
      </View>

      {/* Net Result (if pot enabled) */}
      {potEnabled && (
        <View style={styles.netResultContainer}>
          <Text style={[styles.netResultText, { color: netResultColor }]}>
            {formatWolfNetResult(netResult)}
          </Text>
        </View>
      )}
    </View>
  );
});

/**
 * Empty state when no standings
 */
function EmptyState() {
  const colors = useThemeColors();

  return (
    <View style={styles.emptyState}>
      <Icon source="podium-gold" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
        No Standings Yet
      </Text>
      <Text style={[styles.emptyDescription, { color: colors.textTertiary }]}>
        Play some holes to see the standings
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const WolfStandingsCard = React.memo(function WolfStandingsCard({
  standings,
  potEnabled,
  testID,
}: WolfStandingsCardProps) {
  const colors = useThemeColors();

  // Render item
  const renderItem: ListRenderItem<WolfStandingEntry> = ({ item, index }) => (
    <StandingRow
      entry={item}
      potEnabled={potEnabled}
      index={index}
    />
  );

  // Key extractor
  const keyExtractor = (item: WolfStandingEntry) => item.player_id;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
      testID={testID}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Icon source="podium-gold" size={24} color={wolfColor} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            STANDINGS
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Ranked by total points{potEnabled ? ' • Net result shown' : ''}
        </Text>
      </View>

      {/* Column Headers */}
      {standings.length > 0 && (
        <View style={[styles.columnHeaders, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.columnHeader, styles.rankColumn, { color: colors.textSecondary }]}>
            #
          </Text>
          <Text style={[styles.columnHeader, styles.nameColumn, { color: colors.textSecondary }]}>
            Player
          </Text>
          <Text style={[styles.columnHeader, styles.pointsColumn, { color: colors.textSecondary }]}>
            Points
          </Text>
          {potEnabled && (
            <Text style={[styles.columnHeader, styles.netColumn, { color: colors.textSecondary }]}>
              Net
            </Text>
          )}
        </View>
      )}

      {/* List */}
      <FlatList
        data={standings}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={EmptyState}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h4,
  },
  subtitle: {
    ...typography.small,
    marginLeft: 32, // Align with title text (icon width + gap)
  },

  // Column headers
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  columnHeader: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  rankColumn: {
    width: 40,
    textAlign: 'center',
  },
  nameColumn: {
    flex: 1,
    marginLeft: spacing.sm + 32, // Account for initial badge
  },
  pointsColumn: {
    width: 60,
    textAlign: 'right',
  },
  netColumn: {
    width: 80,
    textAlign: 'right',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.bodyBold,
  },
  initialBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  initialText: {
    ...typography.captionBold,
  },
  nameContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  playerName: {
    ...typography.body,
  },
  leaderName: {
    fontWeight: '600',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    width: 60,
    justifyContent: 'flex-end',
  },
  pointsText: {
    ...typography.bodyBold,
  },
  leaderPoints: {
    fontWeight: '700',
  },
  pointsLabel: {
    ...typography.caption,
    marginLeft: 2,
  },
  netResultContainer: {
    width: 80,
    alignItems: 'flex-end',
  },
  netResultText: {
    ...typography.bodyBold,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.bodyBold,
  },
  emptyDescription: {
    ...typography.small,
    textAlign: 'center',
  },
});

export default WolfStandingsCard;
