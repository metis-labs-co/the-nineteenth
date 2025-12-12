/**
 * CourseListContent - Main content area for course list
 *
 * Handles:
 * - Loading state during search
 * - Empty states (no favorites, no search results, no venues)
 * - Venue/Course FlatList with pull-to-refresh
 */

import React from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { VenueCard } from '@/components/courses/VenueCard';
import type {
  VenueCourseDisplayItem,
  CourseWithFavoriteStatus,
} from '@/hooks/useVenues';
import type { Venue } from '@/types/database.types';

interface CourseListContentProps {
  displayItems: VenueCourseDisplayItem[];
  isSearching: boolean;
  isRefreshing: boolean;
  showFavoritesOnly: boolean;
  isSearchActive: boolean;
  searchQuery: string;
  isApiAvailable: boolean;
  onRefresh: () => void;
  onCourseSelect: (course: CourseWithFavoriteStatus, venue: Venue) => void;
  onVenuePress: (venue: Venue) => void;
  onToggleFavorite: (course: CourseWithFavoriteStatus) => void;
  togglingFavoriteId: string | null;
  onShowApiSearchModal: () => void;
  onShowAddModal: () => void;
}

export function CourseListContent({
  displayItems,
  isSearching,
  isRefreshing,
  showFavoritesOnly,
  isSearchActive,
  searchQuery,
  isApiAvailable,
  onRefresh,
  onCourseSelect,
  onVenuePress,
  onToggleFavorite,
  togglingFavoriteId,
  onShowApiSearchModal,
  onShowAddModal,
}: CourseListContentProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

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
      ? 'No favorite courses'
      : isSearchActive
        ? 'No venues found'
        : 'No venues yet';

    const message = showFavoritesOnly
      ? 'Star courses to add them to your favorites'
      : isSearchActive
        ? `No venues match "${searchQuery}". ${isApiAvailable ? 'Try searching the online database or add a new venue.' : 'Try a different search or add a new venue.'}`
        : isApiAvailable
          ? 'Search the online database or add a venue manually to get started'
          : 'Add a venue to get started';

    const icon = showFavoritesOnly ? 'star-outline' : 'golf';
    const actionLabel =
      isApiAvailable && !showFavoritesOnly ? 'Search Online' : 'Add Venue';
    const onAction =
      isApiAvailable && !showFavoritesOnly ? onShowApiSearchModal : onShowAddModal;

    return (
      <EmptyState
        title={title}
        message={message}
        icon={icon}
        actionLabel={actionLabel}
        onAction={onAction}
      />
    );
  }

  // Venue/Course list
  const renderVenueItem = ({ item }: { item: VenueCourseDisplayItem }) => (
    <VenueCard
      item={item}
      onCourseSelect={onCourseSelect}
      onVenuePress={onVenuePress}
      onToggleFavorite={onToggleFavorite}
      isTogglingFavorite={togglingFavoriteId}
      showFavoriteButton
    />
  );

  return (
    <FlatList
      data={displayItems}
      keyExtractor={(item) => item.venue.id}
      renderItem={renderVenueItem}
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
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: spacing.md,
  },
  listSeparator: {
    height: spacing.sm,
  },
});
