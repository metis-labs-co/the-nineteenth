/**
 * SkinsStatsCard - Player skins statistics display card
 *
 * Displays a player's skins game statistics including games played,
 * holes won percentage, total net result, win rate, and streaks.
 *
 * @example
 * ```tsx
 * const { data: stats } = useSkinsStatistics(playerId);
 *
 * <SkinsStatsCard statistics={stats} />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, skinsColor } from '@/constants/theme';
import { formatCurrency } from '@/utils/skinsCalculations';
import type { SkinsPlayerStatistics } from '@/hooks/useSkins';

// ============================================================================
// TYPES
// ============================================================================

export interface SkinsStatsCardProps {
  /** Player statistics data */
  statistics: SkinsPlayerStatistics;
  /** Show compact version (fewer stats) */
  compact?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: string;
  iconColor?: string;
  valueColor?: string;
  large?: boolean;
}

/**
 * Individual statistic display item
 */
function StatItem({
  label,
  value,
  subValue,
  icon,
  iconColor,
  valueColor,
  large = false,
}: StatItemProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.statItem}>
      <View style={styles.statLabelRow}>
        {icon && (
          <Icon
            source={icon}
            size={14}
            color={iconColor ?? colors.textSecondary}
          />
        )}
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
      </View>
      <Text
        style={[
          large ? styles.statValueLarge : styles.statValue,
          { color: valueColor ?? colors.textPrimary },
        ]}
      >
        {value}
      </Text>
      {subValue && (
        <Text style={[styles.statSubValue, { color: colors.textTertiary }]}>
          {subValue}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SkinsStatsCard = React.memo(function SkinsStatsCard({
  statistics,
  compact = false,
  testID,
}: SkinsStatsCardProps) {
  const colors = useThemeColors();

  // Format values
  const netResult = statistics.total_net_result;
  const netResultFormatted = formatCurrency(Math.abs(netResult));
  const netResultPrefix = netResult >= 0 ? '+' : '-';
  const netResultColor = netResult >= 0 ? colors.success : colors.error;

  const winRate = statistics.win_rate;
  const winRateFormatted = winRate !== null ? `${winRate.toFixed(1)}%` : '--';

  const holeWinRate = statistics.hole_win_rate;
  const holeWinRateFormatted = holeWinRate !== null ? `${holeWinRate.toFixed(1)}%` : '--';

  // Calculate win/loss ratio display
  const gamesWon = statistics.games_won;
  const gamesLost = statistics.games_played - gamesWon;
  const gamesRecord = `${gamesWon}W - ${gamesLost}L`;

  // Streak display
  const currentStreak = statistics.current_win_streak;
  const longestStreak = statistics.longest_win_streak;
  const streakText = currentStreak > 0 ? `${currentStreak} 🔥` : `${currentStreak}`;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
      testID={testID}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Icon source="chart-bar" size={24} color={skinsColor} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            SKINS STATISTICS
          </Text>
        </View>
        <Text style={[styles.gamesPlayed, { color: colors.textSecondary }]}>
          {statistics.games_played} game{statistics.games_played !== 1 ? 's' : ''} played
        </Text>
      </View>

      {/* Main Stats */}
      <View style={styles.content}>
        {/* Net Result - Featured */}
        <View style={[styles.featuredStat, { backgroundColor: `${netResultColor}10` }]}>
          <View style={styles.featuredStatRow}>
            <View style={styles.featuredStatLabel}>
              <Icon source="cash" size={20} color={netResultColor} />
              <Text style={[styles.featuredLabelText, { color: colors.textSecondary }]}>
                Net Result
              </Text>
            </View>
            <Text style={[styles.featuredValue, { color: netResultColor }]}>
              {netResultPrefix}{netResultFormatted}
            </Text>
          </View>
          <View style={styles.featuredSubRow}>
            <Text style={[styles.featuredSubText, { color: colors.textTertiary }]}>
              Buy-ins: {formatCurrency(statistics.total_buy_ins)} • Winnings: {formatCurrency(statistics.total_winnings)}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Row 1: Games & Win Rate */}
          <View style={styles.statsRow}>
            <StatItem
              label="Record"
              value={gamesRecord}
              icon="trophy"
              iconColor={colors.warning}
            />
            <StatItem
              label="Win Rate"
              value={winRateFormatted}
              icon="percent"
              iconColor={skinsColor}
            />
          </View>

          {/* Row 2: Holes Stats */}
          <View style={styles.statsRow}>
            <StatItem
              label="Holes Won"
              value={statistics.total_holes_won}
              subValue={`of ${statistics.total_holes_played} played`}
              icon="golf"
              iconColor={colors.success}
            />
            <StatItem
              label="Hole Win Rate"
              value={holeWinRateFormatted}
              subValue={`${statistics.total_holes_tied} tied`}
              icon="chart-line"
              iconColor={skinsColor}
            />
          </View>

          {/* Row 3: Streaks (only in full mode) */}
          {!compact && (
            <View style={styles.statsRow}>
              <StatItem
                label="Current Streak"
                value={streakText}
                icon="fire"
                iconColor={currentStreak > 0 ? colors.warning : colors.textTertiary}
              />
              <StatItem
                label="Best Streak"
                value={longestStreak}
                icon="star"
                iconColor={colors.warning}
              />
            </View>
          )}
        </View>
      </View>
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
  gamesPlayed: {
    ...typography.small,
    marginLeft: 32, // Align with title text
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },

  // Featured stat
  featuredStat: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  featuredStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredStatLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featuredLabelText: {
    ...typography.smallBold,
  },
  featuredValue: {
    ...typography.h2,
  },
  featuredSubRow: {
    marginTop: spacing.xs,
  },
  featuredSubText: {
    ...typography.caption,
  },

  // Stats grid
  statsGrid: {
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  // Stat item
  statItem: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  statValue: {
    ...typography.h4,
  },
  statValueLarge: {
    ...typography.h2,
  },
  statSubValue: {
    ...typography.caption,
  },
});

export default SkinsStatsCard;
