/**
 * CourseListContent - Main content area for course list
 *
 * Handles:
 * - Loading state during search
 * - Empty states (no favorites, no search results, no clubs)
 * - Club/Course FlatList with pull-to-refresh
 */

import React from 'react';
import { StyleSheet, View, FlatList, RefreshControl, Keyboard, Pressable } from 'react-native';
import { Text, ActivityIndicator, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ClubCard } from '@/components/courses/ClubCard';
import type { ClubCardItem } from '@/components/courses/ClubCard';
import type { CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { GolfApiSearchResultItem } from '@/hooks/useGolfApiSearch';
import type { Club } from '@/types/database.types';

/**
 * Type guard to check if item is from GolfAPI.io (not yet imported to local DB)
 */
function isApiResult(item: ClubCardItem): item is GolfApiSearchResultItem {
  return 'source' in item && item.source === 'golfapi';
}

interface CourseListContentProps {
  /** Mixed results from local DB and/or GolfAPI.io */
  displayItems: ClubCardItem[];
  isSearching: boolean;
  isRefreshing: boolean;
  showFavoritesOnly: boolean;
  isSearchActive: boolean;
  searchQuery: string;
  onRefresh: () => void;
  onCourseSelect: (course: CourseWithFavoriteStatus, club: Club) => void;
  onClubPress: (club: Club) => void;
  onToggleFavorite: (course: CourseWithFavoriteStatus) => void;
  togglingFavoriteId: string | null;
  /** True when GolfAPI.io search is in progress */
  isSearchingApi?: boolean;
  /** GolfAPI club ID currently being imported (shows loading on that card) */
  importingClubId?: string | null;
}

export function CourseListContent({
  displayItems,
  isSearching,
  isRefreshing,
  showFavoritesOnly,
  isSearchActive,
  searchQuery,
  onRefresh,
  onCourseSelect,
  onClubPress,
  onToggleFavorite,
  togglingFavoriteId,
  isSearchingApi = false,
  importingClubId = null,
}: CourseListContentProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  /**
   * Get unique key for list item (handles both local and API results)
   */
  const getItemKey = (item: ClubCardItem): string => {
    if (isApiResult(item)) {
      return item.id; // e.g., "golfapi_12345"
    }
    return item.club.id;
  };

  /**
   * Check if a specific item is being imported
   */
  const isItemImporting = (item: ClubCardItem): boolean => {
    if (!importingClubId || !isApiResult(item)) return false;
    return item.golfapi_club_id === importingClubId;
  };

  // Loading state during search
  if (isSearching) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="lg" message="Searching..." />
      </View>
    );
  }

  // Empty states
  if (displayItems.length === 0) {
    const title = showFavoritesOnly
      ? 'No favourite courses'
      : isSearchActive
        ? 'No clubs found'
        : 'No courses in this state';

    // Determine message based on context and permissions
    const getMessage = () => {
      if (showFavoritesOnly) {
        return 'Star courses to add them to your favourites';
      }
      if (isSearchActive) {
        return `No clubs match "${searchQuery}". Try a different search.`;
      }
      return 'Try a different state or search for a specific club above';
    };

    const icon = showFavoritesOnly ? 'star-outline' : 'magnify';

    return (
      <Pressable style={styles.emptyStateWrapper} onPress={Keyboard.dismiss}>
        <EmptyState
          title={title}
          message={getMessage()}
          icon={icon}
        />
      </Pressable>
    );
  }

  // Club/Course list
  const renderClubItem = ({ item }: { item: ClubCardItem }) => (
    <ClubCard
      item={item}
      onCourseSelect={onCourseSelect}
      onClubPress={onClubPress}
      onToggleFavorite={onToggleFavorite}
      isTogglingFavorite={togglingFavoriteId}
      showFavoriteButton
      isImporting={isItemImporting(item)}
    />
  );

  // Footer component showing API search progress or "search for more" prompt
  const renderListFooter = () => {
    if (isSearchingApi) {
      return (
        <View style={styles.apiSearchingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.apiSearchingText, { color: colors.textSecondary }]}>
            Searching more courses...
          </Text>
        </View>
      );
    }

    // Show "search for more" on default featured view
    if (!isSearchActive && !showFavoritesOnly && displayItems.length > 0) {
      return (
        <View style={styles.searchPromptContainer}>
          <Icon source="magnify" size={20} color={colors.textSecondary} />
          <Text style={[styles.searchPromptText, { color: colors.textSecondary }]}>
            Can't find your course? Search above
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <FlatList
      data={displayItems}
      keyExtractor={getItemKey}
      renderItem={renderClubItem}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[colors.textPrimary]}
          tintColor={colors.textPrimary}
        />
      }
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
      ListFooterComponent={renderListFooter}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateWrapper: {
    flex: 1,
  },
  listContent: {
    paddingTop: spacing.md,
  },
  listSeparator: {
    height: spacing.sm,
  },
  apiSearchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  apiSearchingText: {
    ...typography.small,
  },
  searchPromptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  searchPromptText: {
    ...typography.small,
  },
});
