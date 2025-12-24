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
  isSuperAdmin: boolean;
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
  isSuperAdmin,
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

    // Determine message based on context and permissions
    const getMessage = () => {
      if (showFavoritesOnly) {
        return 'Star courses to add them to your favorites';
      }
      if (isSearchActive) {
        if (isApiAvailable) {
          return `No venues match "${searchQuery}". Try searching the online database.`;
        }
        return `No venues match "${searchQuery}". Try a different search.`;
      }
      if (isApiAvailable) {
        return 'Search the online database to find courses';
      }
      return 'No venues available';
    };

    const icon = showFavoritesOnly ? 'star-outline' : 'golf';

    // Determine action button - only show "Add Venue" for Super Admin
    const showApiSearch = isApiAvailable && !showFavoritesOnly;
    const showAddVenue = !showApiSearch && isSuperAdmin && !showFavoritesOnly;

    const actionLabel = showApiSearch
      ? 'Search Online'
      : showAddVenue
        ? 'Add Venue'
        : undefined;
    const onAction = showApiSearch
      ? onShowApiSearchModal
      : showAddVenue
        ? onShowAddModal
        : undefined;

    return (
      <EmptyState
        title={title}
        message={getMessage()}
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
