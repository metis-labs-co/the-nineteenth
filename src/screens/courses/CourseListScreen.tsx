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

import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { LoadingSpinner, SearchBar, PageHeader } from '@/components/common';
import { ErrorState } from '@/components/common/ErrorState';
import {
  AddCourseModal,
  ApiSearchModal,
  StateFilterList,
  CourseListContent,
} from '@/components/courses';
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
import { useSubscription } from '@/hooks/useSubscription';
import type { AustralianState, Course, LegacyCourse, Venue } from '@/types/database.types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CourseListScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const isApiAvailable = useIsApiAvailable();
  const { isSuperAdmin } = useSubscription();

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
  const displayItems: VenueCourseDisplayItem[] = useMemo(() => {
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
      } catch (err) {
        console.error('Failed to toggle favorite:', err);
      } finally {
        setTogglingFavoriteId(null);
      }
    },
    [addFavorite, removeFavorite]
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedState(undefined);
    setShowFavoritesOnly(false);
  }, []);

  const handleVenueCreated = useCallback((_venue: Venue, _course: Course) => {
    // The query will be invalidated by the mutation
  }, []);

  const handleApiCourseImported = useCallback((_course: LegacyCourse) => {
    // The query will be invalidated by the mutation
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
  // AddCourseModal is only available for Super Admin users
  const headerRightActions = useMemo(() => {
    const actions = [];
    if (isApiAvailable) {
      actions.push({
        icon: 'cloud-search',
        onPress: () => setShowApiSearchModal(true),
        accessibilityLabel: 'Search online database',
      });
    }
    // Only Super Admin can add courses manually
    if (isSuperAdmin) {
      actions.push({
        icon: 'plus',
        onPress: () => setShowAddModal(true),
        accessibilityLabel: 'Add new course manually',
      });
    }
    return actions;
  }, [isApiAvailable, isSuperAdmin]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Courses" rightActions={headerRightActions} />
        <View style={[styles.centerContent, { flex: 1 }]}>
          <LoadingSpinner size="lg" />
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader title="Courses" rightActions={headerRightActions} />

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search courses..."
        accessibilityLabel="Search courses by name"
      />

      {/* State Filters */}
      <StateFilterList
        selectedState={selectedState}
        onStateChange={setSelectedState}
        showFavoritesOnly={showFavoritesOnly}
        onFavoritesToggle={() => setShowFavoritesOnly(!showFavoritesOnly)}
        showClearButton={isSearchActive || showFavoritesOnly}
        onClear={handleClearFilters}
      />

      {/* Course List Content */}
      <CourseListContent
        displayItems={displayItems}
        isSearching={isSearching}
        isRefreshing={isRefreshing}
        showFavoritesOnly={showFavoritesOnly}
        isSearchActive={isSearchActive}
        searchQuery={searchQuery}
        isApiAvailable={isApiAvailable}
        isSuperAdmin={isSuperAdmin}
        onRefresh={handleRefresh}
        onCourseSelect={handleCourseSelect}
        onVenuePress={handleVenuePress}
        onToggleFavorite={handleToggleFavorite}
        togglingFavoriteId={togglingFavoriteId}
        onShowApiSearchModal={() => setShowApiSearchModal(true)}
        onShowAddModal={() => setShowAddModal(true)}
      />

      {/* Add Venue Modal - Super Admin only */}
      {isSuperAdmin && (
        <AddCourseModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onVenueCreated={handleVenueCreated}
        />
      )}

      {/* API Search Modal */}
      <ApiSearchModal
        visible={showApiSearchModal}
        onClose={() => setShowApiSearchModal(false)}
        onCourseImported={handleApiCourseImported}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
