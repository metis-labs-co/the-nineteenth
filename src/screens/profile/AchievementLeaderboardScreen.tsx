/**
 * AchievementLeaderboardScreen - Leaderboard for achievement points
 *
 * Shows ranked list of players by achievement points with:
 * - Scope tabs: Global, Friends, Competition (conditional)
 * - Player rows with rank, avatar with frame, name, points, achievement count
 * - Medal icons for top 3 (gold/silver/bronze)
 * - Current user highlighted
 * - Current user's rank at bottom if not visible
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAchievementLeaderboard } from '@/hooks/achievements';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState, LoadingSpinner } from '@/components/common';
import { FeatureLock } from '@/components/subscription';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { ProfileFrame } from '@/components/cosmetics/ProfileFrame';
import type {
  AchievementLeaderboardEntry,
  AchievementLeaderboardScope,
} from '@/types/database/achievement.types';

// ============================================================================
// TYPES
// ============================================================================

type Props = NativeStackScreenProps<RootStackParamList, 'AchievementLeaderboard'>;

interface ScopeTab {
  key: AchievementLeaderboardScope;
  label: string;
  icon: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MEDAL_COLORS = {
  1: '#FFD700', // Gold
  2: '#C0C0C0', // Silver
  3: '#CD7F32', // Bronze
} as const;

const MEDAL_ICONS = {
  1: 'medal',
  2: 'medal',
  3: 'medal',
} as const;

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * ScopeTabItem - Individual scope tab
 */
const ScopeTabItem = React.memo(function ScopeTabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: ScopeTab;
  isActive: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.scopeTab,
        {
          backgroundColor: isActive ? colors.primary : colors.surface,
          borderColor: isActive ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${tab.label} leaderboard`}
    >
      <Icon
        source={tab.icon}
        size={18}
        color={isActive ? colors.white : colors.textSecondary}
      />
      <Text
        style={[
          styles.scopeTabText,
          { color: isActive ? colors.white : colors.textSecondary },
        ]}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
});

/**
 * LeaderboardRow - Individual player row in leaderboard
 */
const LeaderboardRow = React.memo(function LeaderboardRow({
  entry,
  isCurrentUser,
  onPress,
}: {
  entry: AchievementLeaderboardEntry;
  isCurrentUser: boolean;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const isTopThree = entry.rank <= 3;
  const medalColor = MEDAL_COLORS[entry.rank as 1 | 2 | 3];

  return (
    <TouchableOpacity
      style={[
        styles.leaderboardRow,
        {
          backgroundColor: isCurrentUser ? colors.primaryLight : colors.surface,
          borderColor: isCurrentUser ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, rank ${entry.rank}, ${entry.total_points} points, ${entry.achievements_earned} achievements`}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {isTopThree ? (
          <View
            style={[
              styles.medalContainer,
              { backgroundColor: `${medalColor}20` },
            ]}
          >
            <Icon source={MEDAL_ICONS[entry.rank as 1 | 2 | 3]} size={24} color={medalColor} />
          </View>
        ) : (
          <Text style={[styles.rankText, { color: colors.textSecondary }]}>
            {entry.rank}
          </Text>
        )}
      </View>

      {/* Avatar with Frame */}
      <View style={styles.avatarContainer}>
        <ProfileFrame frame={null} size={48}>
          <PlayerAvatar
            photoUrl={entry.photo_url}
            name={entry.name}
            size={44}
          />
        </ProfileFrame>
      </View>

      {/* Player Info */}
      <View style={styles.playerInfo}>
        <Text
          style={[
            styles.playerName,
            { color: colors.textPrimary },
            isCurrentUser && styles.playerNameBold,
          ]}
          numberOfLines={1}
        >
          {entry.name}
          {isCurrentUser && ' (You)'}
        </Text>
        <Text style={[styles.achievementCount, { color: colors.textSecondary }]}>
          {entry.achievements_earned} achievement{entry.achievements_earned !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Points */}
      <View style={styles.pointsContainer}>
        <Text style={[styles.pointsValue, { color: colors.primary }]}>
          {entry.total_points.toLocaleString()}
        </Text>
        <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>
          pts
        </Text>
      </View>
    </TouchableOpacity>
  );
});

/**
 * CurrentUserFloatingRank - Shows current user's rank at bottom if not visible
 */
const CurrentUserFloatingRank = React.memo(function CurrentUserFloatingRank({
  entry,
}: {
  entry: AchievementLeaderboardEntry;
}) {
  const colors = useThemeColors();

  return (
    <View style={[styles.floatingRank, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <View style={styles.floatingRankContent}>
        <View style={styles.floatingRankLeft}>
          <Text style={[styles.floatingRankLabel, { color: colors.textSecondary }]}>
            Your Rank
          </Text>
          <View style={styles.floatingRankRow}>
            <Text style={[styles.floatingRankNumber, { color: colors.primary }]}>
              #{entry.rank}
            </Text>
            <Text style={[styles.floatingRankPoints, { color: colors.textPrimary }]}>
              {entry.total_points.toLocaleString()} pts
            </Text>
          </View>
        </View>
        <View style={styles.floatingRankRight}>
          <ProfileFrame frame={null} size={40}>
            <PlayerAvatar
              photoUrl={entry.photo_url}
              name={entry.name}
              size={36}
            />
          </ProfileFrame>
        </View>
      </View>
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AchievementLeaderboardScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Get competition ID from route params if provided
  const competitionId = route.params?.competitionId;
  const hasCompetitionContext = !!competitionId;

  // State
  const [selectedScope, setSelectedScope] = useState<AchievementLeaderboardScope>(
    hasCompetitionContext ? 'competition' : 'global'
  );

  // Build scope tabs based on context
  const scopeTabs = useMemo((): ScopeTab[] => {
    const tabs: ScopeTab[] = [
      { key: 'global', label: 'Global', icon: 'earth' },
      { key: 'friends', label: 'Friends', icon: 'account-group' },
    ];

    if (hasCompetitionContext) {
      tabs.push({ key: 'competition', label: 'Competition', icon: 'trophy' });
    }

    return tabs;
  }, [hasCompetitionContext]);

  // Data fetching
  const {
    data: leaderboard,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useAchievementLeaderboard(selectedScope, competitionId);

  // Find current user's entry
  const currentUserEntry = useMemo(() => {
    if (!leaderboard || !user?.id) return null;
    return leaderboard.find((entry) => entry.player_id === user.id);
  }, [leaderboard, user?.id]);

  // Check if current user is visible in top entries (assume showing top 50)
  const isCurrentUserVisible = useMemo(() => {
    if (!currentUserEntry || !leaderboard) return false;
    return leaderboard.some((entry) => entry.player_id === user?.id);
  }, [leaderboard, currentUserEntry, user?.id]);

  // Handlers
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleScopeChange = useCallback((scope: AchievementLeaderboardScope) => {
    setSelectedScope(scope);
  }, []);

  const handlePlayerPress = useCallback(
    (playerId: string) => {
      if (playerId !== user?.id) {
        navigation.navigate('PlayerDetail', { id: playerId });
      }
    },
    [navigation, user?.id]
  );

  // Render functions
  const renderLeaderboardItem = useCallback(
    ({ item }: { item: AchievementLeaderboardEntry }) => (
      <LeaderboardRow
        entry={item}
        isCurrentUser={item.player_id === user?.id}
        onPress={item.player_id !== user?.id ? () => handlePlayerPress(item.player_id) : undefined}
      />
    ),
    [user?.id, handlePlayerPress]
  );

  const keyExtractor = useCallback(
    (item: AchievementLeaderboardEntry) => item.player_id,
    []
  );

  // Loading state
  if (isLoading && !leaderboard) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Achievement Leaders"
          variant="centered"
          showBack
          onBack={handleGoBack}
        />
        <LoadingSpinner size="lg" message="Loading leaderboard..." />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Achievement Leaders"
          variant="centered"
          showBack
          onBack={handleGoBack}
        />
        <ErrorState
          error={error instanceof Error ? error.message : 'An error occurred'}
          onRetry={handleRefresh}
          title="Unable to load leaderboard"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Achievement Leaders"
        variant="centered"
        showBack
        onBack={handleGoBack}
      />

      <FeatureLock feature="achievement_leaderboard" onUpgradePress={() => navigation.navigate('Subscription')}>
        <FlatList
          data={leaderboard}
          keyExtractor={keyExtractor}
          renderItem={renderLeaderboardItem}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                !isCurrentUserVisible && currentUserEntry
                  ? 80 + insets.bottom
                  : insets.bottom + spacing.xl,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            /* Scope Tabs */
            <View style={styles.scopeTabsContainer}>
              {scopeTabs.map((tab) => (
                <ScopeTabItem
                  key={tab.key}
                  tab={tab}
                  isActive={selectedScope === tab.key}
                  onPress={() => handleScopeChange(tab.key)}
                />
              ))}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No rankings yet"
              message={
                selectedScope === 'friends'
                  ? 'Add friends to see how you compare!'
                  : selectedScope === 'competition'
                    ? 'No players have earned achievements in this competition yet.'
                    : 'Be the first to earn achievements!'
              }
              icon="trophy-outline"
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />

        {/* Floating current user rank */}
        {!isCurrentUserVisible && currentUserEntry && (
          <CurrentUserFloatingRank entry={currentUserEntry} />
        )}
      </FeatureLock>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // List
  listContent: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },

  // Scope tabs
  scopeTabsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  scopeTabText: {
    ...typography.smallBold,
  },

  // Leaderboard row
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.h3,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  playerInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  playerName: {
    ...typography.body,
  },
  playerNameBold: {
    fontWeight: '600',
  },
  achievementCount: {
    ...typography.caption,
  },
  pointsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pointsValue: {
    ...typography.h4,
    fontWeight: '700',
  },
  pointsLabel: {
    ...typography.caption,
  },

  // Floating rank
  floatingRank: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    ...shadows.lg,
  },
  floatingRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  floatingRankLeft: {
    flex: 1,
  },
  floatingRankLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  floatingRankRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  floatingRankNumber: {
    ...typography.h2,
    fontWeight: '700',
  },
  floatingRankPoints: {
    ...typography.body,
  },
  floatingRankRight: {
    marginLeft: spacing.md,
  },
});
