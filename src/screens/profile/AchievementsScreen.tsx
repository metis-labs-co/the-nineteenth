/**
 * AchievementsScreen - Main achievements display
 *
 * Shows player's achievements with filtering by category,
 * summary stats, and progress tracking. Accessed from Profile.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { usePlayer } from '@/hooks/usePlayer';
import { useAchievementSummary, useAchievementDefinitions } from '@/hooks/achievements';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { AchievementCard } from '@/components/achievements/AchievementCard';
import type {
  AchievementCategory,
  AchievementWithProgress,
  AchievementDefinition,
  PlayerAchievementWithDefinition,
  AchievementProgress,
} from '@/types/database/achievement.types';
import { CATEGORY_DISPLAY_NAMES, CATEGORY_ICONS } from '@/types/database/achievement.types';

// ============================================================================
// TYPES
// ============================================================================

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = NativeStackScreenProps<RootStackParamList, 'Achievements'>['route'];

interface CategoryTab {
  key: 'all' | AchievementCategory;
  label: string;
  icon: string;
}

interface StatCardProps {
  value: string | number;
  label: string;
  icon: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_TABS: CategoryTab[] = [
  { key: 'all', label: 'All', icon: 'view-grid' },
  { key: 'rounds', label: 'Rounds', icon: CATEGORY_ICONS.rounds },
  { key: 'scoring', label: 'Scoring', icon: CATEGORY_ICONS.scoring },
  { key: 'social', label: 'Social', icon: CATEGORY_ICONS.social },
  { key: 'competitions', label: 'Competitions', icon: CATEGORY_ICONS.competitions },
  { key: 'courses', label: 'Courses', icon: CATEGORY_ICONS.courses },
];

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * StatCard - Summary statistic card
 */
const StatCard = React.memo(function StatCard({ value, label, icon }: StatCardProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
      <Icon source={icon} size={20} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
});

/**
 * CategoryTabItem - Individual category tab
 */
const CategoryTabItem = React.memo(function CategoryTabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: CategoryTab;
  isActive: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        { backgroundColor: isActive ? colors.primary : colors.surface },
      ]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${tab.label} category`}
    >
      <Icon source={tab.icon} size={16} color={isActive ? colors.white : colors.textSecondary} />
      <Text
        style={[
          styles.categoryTabText,
          { color: isActive ? colors.white : colors.textSecondary },
        ]}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create achievement with progress data for display
 */
function createAchievementWithProgress(
  definition: AchievementDefinition,
  earnedAchievements: PlayerAchievementWithDefinition[],
  progressRecords: AchievementProgress[],
  definitions: AchievementDefinition[]
): AchievementWithProgress {
  const earned = earnedAchievements.find((e) => e.achievement_id === definition.id);
  const progress = progressRecords.find(
    (p) => p.achievement_code === definition.base_achievement || p.achievement_code === definition.code
  );

  // Find next tier achievement if exists
  let nextTier: AchievementDefinition | null = null;
  if (definition.base_achievement) {
    const sameTierAchievements = definitions.filter(
      (d) => d.base_achievement === definition.base_achievement && d.tier > definition.tier
    );
    if (sameTierAchievements.length > 0) {
      nextTier = sameTierAchievements.sort((a, b) => a.tier - b.tier)[0];
    }
  }

  return {
    ...definition,
    earned: !!earned,
    earned_at: earned?.earned_at ?? null,
    current_progress: progress?.current_value ?? 0,
    next_tier: nextTier,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AchievementsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Determine if viewing own or another player's achievements
  const viewingPlayerId = route.params?.playerId;
  const isViewingOther = !!viewingPlayerId && viewingPlayerId !== user?.id;
  const playerId = viewingPlayerId ?? user?.id ?? '';

  // Fetch player info if viewing another player
  const { data: viewingPlayer } = usePlayer(isViewingOther ? playerId : '');

  // Screen title based on context
  const screenTitle = isViewingOther
    ? `${viewingPlayer?.name ?? 'Player'}'s Achievements`
    : 'My Achievements';

  // Navigation to leaderboard
  const handleNavigateToLeaderboard = useCallback(() => {
    navigation.navigate('AchievementLeaderboard');
  }, [navigation]);

  // Go back handler
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // State
  const [selectedCategory, setSelectedCategory] = useState<'all' | AchievementCategory>('all');

  // Data fetching
  const {
    data: summary,
    isLoading: isLoadingSummary,
    definitions,
    earned,
    progress,
  } = useAchievementSummary(playerId);

  const { refetch, isRefetching } = useAchievementDefinitions();

  // Memoized filtered and sorted achievements
  const achievements = useMemo((): AchievementWithProgress[] => {
    if (!definitions || !earned) return [];

    // Filter by category if not 'all'
    let filtered = definitions.filter((d) => !d.is_hidden);
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((d) => d.category === selectedCategory);
    }

    // Create achievement with progress objects
    const withProgress = filtered.map((d) =>
      createAchievementWithProgress(d, earned, progress ?? [], definitions)
    );

    // Sort: earned first (by earned_at desc), then by tier
    return withProgress.sort((a, b) => {
      if (a.earned && !b.earned) return -1;
      if (!a.earned && b.earned) return 1;
      if (a.earned && b.earned) {
        // Both earned - sort by earned_at descending
        return new Date(b.earned_at!).getTime() - new Date(a.earned_at!).getTime();
      }
      // Neither earned - sort by tier
      return a.tier - b.tier;
    });
  }, [definitions, earned, progress, selectedCategory]);

  // Handlers
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCategoryChange = useCallback((category: 'all' | AchievementCategory) => {
    setSelectedCategory(category);
  }, []);

  // Render functions
  const renderAchievementItem = useCallback(
    ({ item }: { item: AchievementWithProgress }) => (
      <View style={styles.achievementItemContainer}>
        <AchievementCard achievement={item} testID={`achievement-${item.code}`} />
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: AchievementWithProgress) => item.id, []);

  // Right action for leaderboard navigation
  const rightActions = [
    {
      icon: 'podium',
      onPress: handleNavigateToLeaderboard,
      accessibilityLabel: 'View achievement leaderboard',
    },
  ];

  // Loading state
  if (isLoadingSummary && !summary) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title={screenTitle}
          showBack
          onBack={handleGoBack}
          rightActions={isViewingOther ? undefined : rightActions}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading achievements...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={screenTitle}
        showBack
        onBack={handleGoBack}
        rightActions={isViewingOther ? undefined : rightActions}
      />

      <FlatList
        data={achievements}
        keyExtractor={keyExtractor}
        renderItem={renderAchievementItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xl },
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
          <>
            {/* Summary Stats */}
            <View style={styles.summaryContainer}>
              <StatCard
                value={summary?.total_earned ?? 0}
                label="Earned"
                icon="trophy"
              />
              <StatCard
                value={summary?.total_points ?? 0}
                label="Points"
                icon="star"
              />
              <StatCard
                value={`${Math.round(summary?.completion_percentage ?? 0)}%`}
                label="Complete"
                icon="check-circle"
              />
            </View>

            {/* Category Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryTabsContainer}
              contentContainerStyle={styles.categoryTabsContent}
            >
              {CATEGORY_TABS.map((tab) => (
                <CategoryTabItem
                  key={tab.key}
                  tab={tab}
                  isActive={selectedCategory === tab.key}
                  onPress={() => handleCategoryChange(tab.key)}
                />
              ))}
            </ScrollView>

            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {selectedCategory === 'all'
                  ? 'All Achievements'
                  : CATEGORY_DISPLAY_NAMES[selectedCategory]}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                {achievements.filter((a) => a.earned).length}/{achievements.length}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title="No achievements"
            message={
              selectedCategory === 'all'
                ? 'Complete rounds and competitions to earn achievements!'
                : `No ${CATEGORY_DISPLAY_NAMES[selectedCategory].toLowerCase()} achievements yet.`
            }
            icon="trophy-outline"
          />
        }
        showsVerticalScrollIndicator={false}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  listContent: {
    paddingTop: spacing.lg,
  },

  // Summary section
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    gap: spacing.xs,
  },
  statValue: {
    ...typography.h3,
  },
  statLabel: {
    ...typography.caption,
  },

  // Category tabs
  categoryTabsContainer: {
    marginBottom: spacing.lg,
  },
  categoryTabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  categoryTabText: {
    ...typography.small,
    fontWeight: '500',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
  },
  sectionCount: {
    ...typography.small,
  },

  // Achievement items
  achievementItemContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
