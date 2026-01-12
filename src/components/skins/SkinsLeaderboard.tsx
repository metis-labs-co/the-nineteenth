/**
 * SkinsLeaderboard - Skins game leaderboard display
 *
 * Displays a ranked list of players by net result from skins games.
 * Top 3 players get medal icons. Current user is highlighted.
 *
 * @example
 * ```tsx
 * const { data: entries } = useSkinsLeaderboard({ limit: 20 });
 *
 * <SkinsLeaderboard
 *   entries={entries}
 *   currentUserId={session?.user?.id}
 *   onPlayerPress={(playerId) => navigateToProfile(playerId)}
 * />
 * ```
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
  RefreshControl,
} from 'react-native';
import { Text, Icon, Avatar, ActivityIndicator } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, skinsColor } from '@/constants/theme';
import { formatCurrency } from '@/utils/skinsCalculations';
import type { SkinsLeaderboardEntry } from '@/hooks/useSkins';

// ============================================================================
// TYPES
// ============================================================================

export interface SkinsLeaderboardProps {
  /** Array of leaderboard entries */
  entries: SkinsLeaderboardEntry[];
  /** Current user's ID for highlighting */
  currentUserId?: string;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether data is refreshing */
  isRefreshing?: boolean;
  /** Callback when refresh is triggered */
  onRefresh?: () => void;
  /** Callback when a player row is pressed */
  onPlayerPress?: (playerId: string) => void;
  /** Callback when end of list is reached (for pagination) */
  onEndReached?: () => void;
  /** Whether more data is being loaded */
  isLoadingMore?: boolean;
  /** Show compact version */
  compact?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MEDAL_COLORS = {
  1: '#FFD700', // Gold
  2: '#C0C0C0', // Silver
  3: '#CD7F32', // Bronze
};

const MEDAL_ICONS = {
  1: 'medal',
  2: 'medal-outline',
  3: 'medal-outline',
} as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface LeaderboardRowProps {
  entry: SkinsLeaderboardEntry;
  isCurrentUser: boolean;
  compact: boolean;
  onPress?: () => void;
}

/**
 * Individual leaderboard row
 */
const LeaderboardRow = React.memo(function LeaderboardRow({
  entry,
  isCurrentUser,
  compact,
  onPress,
}: LeaderboardRowProps) {
  const colors = useThemeColors();

  const rank = entry.rank;
  const isTopThree = rank >= 1 && rank <= 3;
  const medalColor = MEDAL_COLORS[rank as keyof typeof MEDAL_COLORS];

  const netResult = entry.total_net_result;
  const netResultFormatted = formatCurrency(Math.abs(netResult));
  const netResultPrefix = netResult >= 0 ? '+' : '-';
  const netResultColor = netResult >= 0 ? colors.success : colors.error;

  const winRate = entry.win_rate;
  const winRateFormatted = winRate !== null ? `${winRate.toFixed(0)}%` : '--';

  const playerName = entry.player?.name ?? 'Unknown Player';
  const avatarUrl = entry.player?.avatar_url;
  const initials = playerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const rowStyle = [
    styles.row,
    {
      backgroundColor: isCurrentUser
        ? `${skinsColor}15`
        : colors.surface,
      borderLeftColor: isCurrentUser ? skinsColor : 'transparent',
    },
  ];

  return (
    <TouchableOpacity
      style={rowStyle}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
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

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Avatar.Image size={36} source={{ uri: avatarUrl }} />
        ) : (
          <Avatar.Text
            size={36}
            label={initials}
            style={{ backgroundColor: isCurrentUser ? skinsColor : colors.surfaceVariant }}
            labelStyle={{ color: isCurrentUser ? colors.white : colors.textPrimary }}
          />
        )}
      </View>

      {/* Player Info */}
      <View style={styles.playerInfo}>
        <Text
          style={[
            styles.playerName,
            { color: colors.textPrimary },
            isCurrentUser && styles.currentUserName,
          ]}
          numberOfLines={1}
        >
          {playerName}
          {isCurrentUser && ' (You)'}
        </Text>
        {!compact && (
          <Text style={[styles.playerStats, { color: colors.textSecondary }]}>
            {entry.games_played} game{entry.games_played !== 1 ? 's' : ''} • {winRateFormatted} win
          </Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text
          style={[
            styles.netResult,
            { color: netResultColor },
          ]}
        >
          {netResultPrefix}{netResultFormatted}
        </Text>
        {!compact && (
          <Text style={[styles.holesWon, { color: colors.textTertiary }]}>
            {entry.total_holes_won} holes
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

/**
 * Empty state when no entries
 */
function EmptyState() {
  const colors = useThemeColors();

  return (
    <View style={styles.emptyState}>
      <Icon source="trophy-outline" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
        No Leaderboard Yet
      </Text>
      <Text style={[styles.emptyDescription, { color: colors.textTertiary }]}>
        Complete some skins games to see rankings
      </Text>
    </View>
  );
}

/**
 * Loading more indicator
 */
function LoadingMoreIndicator() {
  return (
    <View style={styles.loadingMore}>
      <ActivityIndicator size="small" />
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SkinsLeaderboard = React.memo(function SkinsLeaderboard({
  entries,
  currentUserId,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onPlayerPress,
  onEndReached,
  isLoadingMore = false,
  compact = false,
  testID,
}: SkinsLeaderboardProps) {
  const colors = useThemeColors();

  // Render item
  const renderItem: ListRenderItem<SkinsLeaderboardEntry> = useCallback(
    ({ item }) => (
      <LeaderboardRow
        entry={item}
        isCurrentUser={item.player_id === currentUserId}
        compact={compact}
        onPress={onPlayerPress ? () => onPlayerPress(item.player_id) : undefined}
      />
    ),
    [currentUserId, compact, onPlayerPress]
  );

  // Key extractor
  const keyExtractor = useCallback(
    (item: SkinsLeaderboardEntry) => item.player_id,
    []
  );

  // Separator
  const ItemSeparator = useCallback(
    () => <View style={[styles.separator, { backgroundColor: colors.border }]} />,
    [colors.border]
  );

  // Footer
  const ListFooter = useCallback(
    () => (isLoadingMore ? <LoadingMoreIndicator /> : null),
    [isLoadingMore]
  );

  // Loading state
  if (isLoading && entries.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }, shadows.md]} testID={testID}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.titleRow}>
            <Icon source="trophy" size={24} color={skinsColor} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              LEADERBOARD
            </Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={skinsColor} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
      testID={testID}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Icon source="trophy" size={24} color={skinsColor} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            LEADERBOARD
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Ranked by net result
        </Text>
      </View>

      {/* Column Headers */}
      {entries.length > 0 && (
        <View style={[styles.columnHeaders, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.columnHeader, styles.rankColumn, { color: colors.textSecondary }]}>
            #
          </Text>
          <Text style={[styles.columnHeader, styles.playerColumn, { color: colors.textSecondary }]}>
            Player
          </Text>
          <Text style={[styles.columnHeader, styles.netColumn, { color: colors.textSecondary }]}>
            Net
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={EmptyState}
        ListFooterComponent={ListFooter}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={skinsColor}
              colors={[skinsColor]}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={entries.length === 0 ? styles.emptyContent : undefined}
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
    flex: 1,
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
    marginLeft: 32, // Align with title text
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
  playerColumn: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  netColumn: {
    width: 80,
    textAlign: 'right',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderLeftWidth: 3,
    minHeight: 60,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.bodyBold,
  },
  avatarContainer: {
    marginLeft: spacing.sm,
  },
  playerInfo: {
    flex: 1,
    marginLeft: spacing.md,
    gap: 2,
  },
  playerName: {
    ...typography.body,
  },
  currentUserName: {
    fontWeight: '600',
  },
  playerStats: {
    ...typography.caption,
  },
  statsContainer: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  netResult: {
    ...typography.bodyBold,
  },
  holesWon: {
    ...typography.caption,
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
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
  emptyContent: {
    flexGrow: 1,
  },

  // Loading
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMore: {
    padding: spacing.lg,
    alignItems: 'center',
  },
});

export default SkinsLeaderboard;
