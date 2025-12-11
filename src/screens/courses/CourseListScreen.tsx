/**
 * CourseListScreen - Browse and manage golf courses
 *
 * Features:
 * - Hybrid display: Single-course venues show directly, multi-course venues are expandable
 * - Search venues/courses by name
 * - Filter by Australian state
 * - Add/remove favorite courses
 * - Add new venue/course manually if not found
 * - Pull-to-refresh
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useIsDark, useThemeColors } from '@/context/ThemeContext';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import {
  useVenuesWithCourses,
  useSearchVenues,
  useFavoriteCoursesWithVenues,
  useAddCourseFavorite,
  useRemoveCourseFavorite,
  type CourseWithFavoriteStatus,
  type VenueCourseDisplayItem,
} from '@/hooks/useVenues';
import { useIsApiAvailable } from '@/hooks/useApiCourses';
import { AddCourseModal } from '@/components/courses/AddCourseModal';
import { ApiSearchModal } from '@/components/courses/ApiSearchModal';
import { VenueCard } from '@/components/courses/VenueCard';
import { FilterPill } from '@/components/common/FilterPill';
import type { AustralianState, Course, LegacyCourse, Venue } from '@/types/database.types';

// Australian states for filter
const AUSTRALIAN_STATES: { value: AustralianState; label: string }[] = [
  { value: 'NSW', label: 'NSW' },
  { value: 'VIC', label: 'VIC' },
  { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' },
  { value: 'WA', label: 'WA' },
  { value: 'TAS', label: 'TAS' },
  { value: 'NT', label: 'NT' },
  { value: 'ACT', label: 'ACT' },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CourseListScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const isApiAvailable = useIsApiAvailable();
  const isDark = useIsDark();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<AustralianState | undefined>();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showApiSearchModal, setShowApiSearchModal] = useState(false);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);

  // Data fetching - venues with courses for hybrid display
  const {
    data: allVenues,
    isLoading: isLoadingAll,
    error: allError,
    refetch: refetchAll,
    isRefetching: isRefetchingAll,
  } = useVenuesWithCourses(selectedState);

  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useSearchVenues(searchQuery, selectedState);

  const {
    data: favoriteCourses,
    isLoading: isLoadingFavorites,
    refetch: refetchFavorites,
    isRefetching: isRefetchingFavorites,
  } = useFavoriteCoursesWithVenues();

  // Mutations
  const addFavorite = useAddCourseFavorite();
  const removeFavorite = useRemoveCourseFavorite();

  // Computed values
  const isSearchActive = searchQuery.length >= 2;
  const isLoading = isLoadingAll || isLoadingFavorites;
  const isRefreshing = isRefetchingAll || isRefetchingFavorites;
  const error = allError || searchError;

  // Transform venues to display items
  const displayItems: VenueCourseDisplayItem[] = React.useMemo(() => {
    // For favorites view, create items from favorite courses grouped by venue
    if (showFavoritesOnly && favoriteCourses) {
      // Group favorites by venue
      const venueMap = new Map<string, { venue: Venue; courses: CourseWithFavoriteStatus[] }>();
      for (const course of favoriteCourses) {
        const venue = course.venue;
        if (!venueMap.has(venue.id)) {
          venueMap.set(venue.id, { venue, courses: [] });
        }
        venueMap.get(venue.id)!.courses.push({
          ...course,
          is_favorite: true,
        });
      }

      return Array.from(venueMap.values()).map(({ venue, courses }) => ({
        type: courses.length > 1 ? 'multi-course-venue' : 'single-course',
        venue,
        courses,
      }));
    }

    // For search or all venues view
    const venues = isSearchActive ? searchResults : allVenues;
    return (venues ?? []).map((venue) => ({
      type: venue.is_multi_course ? 'multi-course-venue' : 'single-course',
      venue: {
        id: venue.id,
        source: venue.source,
        api_id: venue.api_id,
        name: venue.name,
        state: venue.state,
        city: venue.city,
        address: venue.address,
        phone: venue.phone,
        email: venue.email,
        website: venue.website,
        location: venue.location,
        total_holes: venue.total_holes,
        last_synced: venue.last_synced,
        created_at: venue.created_at,
        updated_at: venue.updated_at,
      },
      courses: venue.courses,
    }));
  }, [showFavoritesOnly, favoriteCourses, isSearchActive, searchResults, allVenues]);

  // Handlers
  const handleRefresh = useCallback(() => {
    refetchAll();
    refetchFavorites();
  }, [refetchAll, refetchFavorites]);

  const handleToggleFavorite = useCallback(
    async (course: CourseWithFavoriteStatus) => {
      setTogglingFavoriteId(course.id);
      try {
        if (course.is_favorite) {
          await removeFavorite.mutateAsync(course.id);
        } else {
          await addFavorite.mutateAsync(course.id);
        }
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
      } finally {
        setTogglingFavoriteId(null);
      }
    },
    [addFavorite, removeFavorite]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedState(undefined);
  }, []);

  const handleVenueCreated = useCallback((_venue: Venue, _course: Course) => {
    // The query will be invalidated by the mutation
    // Optionally scroll to the new venue or show a success message
  }, []);

  const handleApiCourseImported = useCallback((_course: LegacyCourse) => {
    // The query will be invalidated by the mutation
    // Close the API search modal on successful import
    // Optionally show a success message
  }, []);

  // Navigate to venue details
  const handleVenuePress = useCallback(
    (venue: Venue) => {
      navigation.navigate('Venue', { venueId: venue.id });
    },
    [navigation]
  );

  // Navigate to course details
  const handleCourseSelect = useCallback(
    (course: CourseWithFavoriteStatus, venue: Venue) => {
      navigation.navigate('Course', { courseId: course.id, venueId: venue.id });
    },
    [navigation]
  );

  // Build right actions for PageHeader
  const headerRightActions = React.useMemo(() => {
    const actions = [];
    if (isApiAvailable) {
      actions.push({
        icon: 'cloud-search',
        onPress: () => setShowApiSearchModal(true),
        accessibilityLabel: 'Search online database',
      });
    }
    actions.push({
      icon: 'plus',
      onPress: () => setShowAddModal(true),
      accessibilityLabel: 'Add new course manually',
    });
    return actions;
  }, [isApiAvailable]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Courses" rightActions={headerRightActions} />
        <View style={[styles.centerContent, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // Error state
  if (error && !displayItems.length) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Courses" rightActions={headerRightActions} />
        <ErrorState
          error={error}
          onRetry={handleRefresh}
          title="Couldn't load courses"
        />
      </View>
    );
  }

  const renderVenueItem = ({ item }: { item: VenueCourseDisplayItem }) => (
    <VenueCard
      item={item}
      onCourseSelect={handleCourseSelect}
      onVenuePress={handleVenuePress}
      onToggleFavorite={handleToggleFavorite}
      isTogglingFavorite={togglingFavoriteId}
      showFavoriteButton
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader title="Courses" rightActions={headerRightActions} />

      {/* Search Bar */}
      <View style={[styles.searchSection, { backgroundColor: isDark ? colors.gray100 : colors.white, borderBottomColor: colors.gray100 }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.gray50 }]}>
          <Icon source="magnify" size={20} color={colors.gray400} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search courses..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search courses by name"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon source="close-circle" size={20} color={colors.gray400} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={[styles.filterSection, { backgroundColor: isDark ? colors.gray100 : colors.white, borderBottomColor: colors.gray100 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {/* Favorites toggle */}
          <FilterPill
            label="Favorites"
            selected={showFavoritesOnly}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
            accessibilityLabel="Show favorites only"
          />

          {/* State filters */}
          {AUSTRALIAN_STATES.map((state) => (
            <FilterPill
              key={state.value}
              label={state.label}
              selected={selectedState === state.value}
              onPress={() =>
                setSelectedState(
                  selectedState === state.value ? undefined : state.value
                )
              }
              accessibilityLabel={`Filter by ${state.label}`}
            />
          ))}
        </ScrollView>

        {/* Clear filters button */}
        {(isSearchActive || showFavoritesOnly) && (
          <Pressable
            style={styles.clearFiltersButton}
            onPress={() => {
              handleClearSearch();
              setShowFavoritesOnly(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
          >
            <Text style={[styles.clearFiltersText, { color: colors.primary }]}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Venue/Course List */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Searching...</Text>
        </View>
      ) : displayItems.length === 0 ? (
        <EmptyState
          title={
            showFavoritesOnly
              ? 'No favorite courses'
              : isSearchActive
              ? 'No venues found'
              : 'No venues yet'
          }
          message={
            showFavoritesOnly
              ? 'Star courses to add them to your favorites'
              : isSearchActive
              ? `No venues match "${searchQuery}". ${isApiAvailable ? 'Try searching the online database or add a new venue.' : 'Try a different search or add a new venue.'}`
              : isApiAvailable
              ? 'Search the online database or add a venue manually to get started'
              : 'Add a venue to get started'
          }
          icon={showFavoritesOnly ? 'star-outline' : 'golf'}
          actionLabel={isApiAvailable && !showFavoritesOnly ? 'Search Online' : 'Add Venue'}
          onAction={() => isApiAvailable && !showFavoritesOnly ? setShowApiSearchModal(true) : setShowAddModal(true)}
        />
      ) : (
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
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
        />
      )}

      {/* Add Venue Modal */}
      <AddCourseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onVenueCreated={handleVenueCreated}
      />

      {/* API Search Modal */}
      <ApiSearchModal
        visible={showApiSearchModal}
        onClose={() => setShowApiSearchModal(false)}
        onCourseImported={handleApiCourseImported}
      />
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search section
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },

  // Filter section
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  filterScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  clearFiltersButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.lg,
  },
  clearFiltersText: {
    ...typography.small,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingTop: spacing.md,
  },
  listSeparator: {
    height: spacing.sm,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
});
