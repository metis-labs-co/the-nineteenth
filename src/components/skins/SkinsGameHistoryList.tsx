/**
 * SkinsGameHistoryList - Player's skins game history display
 *
 * Displays a list of past skins games with course, date, holes won,
 * and net result. Supports pagination and tap for details.
 *
 * @example
 * ```tsx
 * const { data: history } = useSkinsGameHistory(playerId, { limit: 20 });
 *
 * <SkinsGameHistoryList
 *   games={history}
 *   onGamePress={(gameId) => navigateToDetails(gameId)}
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
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, skinsColor } from '@/constants/theme';
import { formatCurrency } from '@/utils/skins';
import type { SkinsGameHistoryEntry } from '@/hooks/useSkins';

// ============================================================================
// TYPES
// ============================================================================

export interface SkinsGameHistoryListProps {
  /** Array of game history entries */
  games: SkinsGameHistoryEntry[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether data is refreshing */
  isRefreshing?: boolean;
  /** Callback when refresh is triggered */
  onRefresh?: () => void;
  /** Callback when a game row is pressed */
  onGamePress?: (gameId: string) => void;
  /** Callback when end of list is reached (for pagination) */
  onEndReached?: () => void;
  /** Whether more data is being loaded */
  isLoadingMore?: boolean;
  /** Show header */
  showHeader?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown date';

  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Get scoring type label
 */
function getScoringTypeLabel(scoringType: string): string {
  return scoringType === 'gross' ? 'Gross' : 'Net';
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface GameRowProps {
  game: SkinsGameHistoryEntry;
  onPress?: () => void;
}

/**
 * Individual game history row
 */
const GameRow = React.memo(function GameRow({ game, onPress }: GameRowProps) {
  const colors = useThemeColors();

  const courseName = game.round?.course?.name ?? 'Unknown Course';
  const competitionName = game.round?.competition?.name;
  const roundNumber = game.round?.round_number;
  const gameDate = game.round?.date ?? game.completed_at;

  const payout = game.payout;
  const netResult = payout?.net_result ?? 0;
  const netResultFormatted = formatCurrency(Math.abs(netResult));
  const netResultPrefix = netResult >= 0 ? '+' : '-';
  const netResultColor = netResult >= 0 ? colors.success : colors.error;

  const holesWon = payout?.holes_won ?? 0;
  const holesTied = payout?.holes_tied ?? 0;
  const holesLost = payout?.holes_lost ?? 0;
  const holesText = `${holesWon}W / ${holesTied}T / ${holesLost}L`;

  const potValue = formatCurrency(game.pot_value);
  const scoringType = getScoringTypeLabel(game.scoring_type);

  return (
    <TouchableOpacity
      style={[styles.gameRow, { backgroundColor: colors.surface }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      {/* Left: Game Info */}
      <View style={styles.gameInfo}>
        {/* Course & Competition */}
        <View style={styles.courseRow}>
          <Icon source="golf-tee" size={16} color={colors.textSecondary} />
          <Text
            style={[styles.courseName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {courseName}
          </Text>
        </View>

        {/* Competition & Round Info */}
        {competitionName && (
          <Text
            style={[styles.competitionName, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {competitionName}
            {roundNumber && ` • Round ${roundNumber}`}
          </Text>
        )}

        {/* Date & Config */}
        <View style={styles.metaRow}>
          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
            {formatDate(gameDate)}
          </Text>
          <Text style={[styles.configDot, { color: colors.textTertiary }]}>•</Text>
          <Text style={[styles.configText, { color: colors.textTertiary }]}>
            {potValue}/hole • {scoringType}
          </Text>
        </View>
      </View>

      {/* Right: Results */}
      <View style={styles.resultsContainer}>
        <Text style={[styles.netResult, { color: netResultColor }]}>
          {netResultPrefix}{netResultFormatted}
        </Text>
        <Text style={[styles.holesText, { color: colors.textSecondary }]}>
          {holesText}
        </Text>
      </View>

      {/* Chevron */}
      {onPress && (
        <Icon source="chevron-right" size={20} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
});

/**
 * Empty state when no games
 */
function EmptyState() {
  const colors = useThemeColors();

  return (
    <View style={styles.emptyState}>
      <Icon source="dice-multiple-outline" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
        No Games Yet
      </Text>
      <Text style={[styles.emptyDescription, { color: colors.textTertiary }]}>
        Completed skins games will appear here
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

export const SkinsGameHistoryList = React.memo(function SkinsGameHistoryList({
  games,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onGamePress,
  onEndReached,
  isLoadingMore = false,
  showHeader = true,
  testID,
}: SkinsGameHistoryListProps) {
  const colors = useThemeColors();

  // Render item
  const renderItem: ListRenderItem<SkinsGameHistoryEntry> = useCallback(
    ({ item }) => (
      <GameRow
        game={item}
        onPress={onGamePress ? () => onGamePress(item.id) : undefined}
      />
    ),
    [onGamePress]
  );

  // Key extractor
  const keyExtractor = useCallback(
    (item: SkinsGameHistoryEntry) => item.id,
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

  // Header
  const ListHeader = useCallback(() => {
    if (!showHeader) return null;

    return (
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Icon source="history" size={24} color={skinsColor} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            GAME HISTORY
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {games.length} completed game{games.length !== 1 ? 's' : ''}
        </Text>
      </View>
    );
  }, [showHeader, games.length, colors]);

  // Loading state
  if (isLoading && games.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }, shadows.md]} testID={testID}>
        {showHeader && (
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.titleRow}>
              <Icon source="history" size={24} color={skinsColor} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                GAME HISTORY
              </Text>
            </View>
          </View>
        )}
        <LoadingSpinner size="lg" />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
      testID={testID}
    >
      <FlatList
        data={games}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={ListHeader}
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
        stickyHeaderIndices={showHeader ? [0] : undefined}
        contentContainerStyle={games.length === 0 ? styles.emptyContent : undefined}
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

  // Game row
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingVertical: spacing.lg,
    minHeight: 72,
  },
  gameInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courseName: {
    ...typography.body,
    flex: 1,
  },
  competitionName: {
    ...typography.small,
    marginLeft: 24, // Align with course name
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24, // Align with course name
  },
  dateText: {
    ...typography.caption,
  },
  configDot: {
    ...typography.caption,
    marginHorizontal: spacing.xs,
  },
  configText: {
    ...typography.caption,
  },
  resultsContainer: {
    alignItems: 'flex-end',
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  netResult: {
    ...typography.bodyBold,
  },
  holesText: {
    ...typography.caption,
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
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
  loadingMore: {
    padding: spacing.lg,
    alignItems: 'center',
  },
});

export default SkinsGameHistoryList;
