/**
 * CourseListScreen - Browse and manage golf courses
 *
 * Features:
 * - Hybrid display: Single-course clubs show directly, multi-course clubs are expandable
 * - Search clubs/courses by name
 * - Filter by Australian state
 * - Add/remove favorite courses
 * - Add new club/course manually if not found
 * - Pull-to-refresh
 */

import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { LoadingSpinner, SearchBar, PageHeader } from '@/components/common';
import { ErrorState } from '@/components/common/ErrorState';
import {
  AddCourseModal,
  StateFilterList,
  CourseListContent,
} from '@/components/courses';
import type { ClubCardItem } from '@/components/courses/ClubCard';
import {
  useClubsWithCourses,
  useSearchClubs,
  useFavoriteCoursesWithClubs,
  useAddCourseFavorite,
  useRemoveCourseFavorite,
  type CourseWithFavoriteStatus,
  type ClubCourseDisplayItem,
} from '@/hooks/useClubs';
import { useImportClub } from '@/hooks/useImportClub';
import type { GolfApiSearchResultItem } from '@/hooks/useGolfApiSearch';
import { useSubscription } from '@/hooks/useSubscription';
import type { AustralianState, Course, Club } from '@/types/database.types';

/**
 * Type guard to check if item is from GolfAPI.io (not yet imported)
 */
function isApiResult(item: ClubCardItem | Club): item is GolfApiSearchResultItem {
  return 'source' in item && item.source === 'golfapi';
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CourseListScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const { isSuperAdmin } = useSubscription();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<AustralianState | undefined>();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);
  const [importingClubId, setImportingClubId] = useState<string | null>(null);

  // Data fetching - clubs with courses for hybrid display
  const {
    data: allClubs,
    isLoading: isLoadingAll,
    error: allError,
    refetch: refetchAll,
    isRefetching: isRefetchingAll,
  } = useClubsWithCourses(selectedState);

  const {
    data: searchResults,
    isLoading: isSearching,
    isSearchingApi,
    error: searchError,
  } = useSearchClubs(searchQuery, selectedState);

  // Import hook for API results
  const importClub = useImportClub();

  const {
    data: favoriteCourses,
    isLoading: isLoadingFavorites,
    refetch: refetchFavorites,
    isRefetching: isRefetchingFavorites,
  } = useFavoriteCoursesWithClubs();

  // Mutations
  const addFavorite = useAddCourseFavorite();
  const removeFavorite = useRemoveCourseFavorite();

  // Computed values
  const isSearchActive = searchQuery.length >= 2;
  const isLoading = isLoadingAll || isLoadingFavorites;
  const isRefreshing = isRefetchingAll || isRefetchingFavorites;
  const error = allError || searchError;

  // Transform clubs to display items and sort (home club first)
  // Note: searchResults can include GolfApiSearchResultItem which are passed through as-is
  const displayItems: ClubCardItem[] = useMemo(() => {
    let items: ClubCardItem[];

    // For favorites view, create items from favorite courses grouped by club
    if (showFavoritesOnly && favoriteCourses) {
      // Group favorites by club
      const clubMap = new Map<string, { club: Club; courses: CourseWithFavoriteStatus[]; is_home: boolean }>();
      for (const course of favoriteCourses) {
        const club = course.club;
        if (!clubMap.has(club.id)) {
          // Check if this club is home (need to get from allClubs data)
          const clubData = allClubs?.find(c => c.id === club.id);
          clubMap.set(club.id, { club, courses: [], is_home: clubData?.is_home ?? false });
        }
        clubMap.get(club.id)!.courses.push({
          ...course,
          is_favorite: true,
        });
      }

      items = Array.from(clubMap.values()).map(({ club, courses, is_home }) => ({
        type: courses.length > 1 ? 'multi-course-club' : 'single-course',
        club,
        venue: club, // deprecated, kept for backwards compatibility
        courses,
        is_home,
      }));
    } else {
      // For search or all clubs view
      // searchResults may include GolfApiSearchResultItem (API results not yet imported)
      const results = isSearchActive ? searchResults : allClubs;
      items = (results ?? []).map((item) => {
        // API results are passed through as-is (already in ClubCardItem shape)
        if (isApiResult(item)) {
          return item;
        }

        // Local DB results need transformation to ClubCourseDisplayItem
        return {
          type: item.is_multi_course ? 'multi-course-club' : 'single-course',
          club: {
            id: item.id,
            source: item.source,
            golfapi_club_id: item.golfapi_club_id ?? null,
            name: item.name,
            state: item.state,
            city: item.city,
            address: item.address,
            postal_code: item.postal_code ?? null,
            country: item.country ?? 'Australia',
            continent: item.continent ?? null,
            phone: item.phone,
            email: item.email,
            website: item.website,
            latitude: item.latitude ?? null,
            longitude: item.longitude ?? null,
            location: item.location,
            total_holes: item.total_holes,
            last_synced: item.last_synced,
            created_at: item.created_at,
            updated_at: item.updated_at,
          },
          venue: {
            id: item.id,
            source: item.source,
            golfapi_club_id: item.golfapi_club_id ?? null,
            name: item.name,
            state: item.state,
            city: item.city,
            address: item.address,
            postal_code: item.postal_code ?? null,
            country: item.country ?? 'Australia',
            continent: item.continent ?? null,
            phone: item.phone,
            email: item.email,
            website: item.website,
            latitude: item.latitude ?? null,
            longitude: item.longitude ?? null,
            location: item.location,
            total_holes: item.total_holes,
            last_synced: item.last_synced,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }, // deprecated, kept for backwards compatibility
          courses: item.courses,
          is_home: item.is_home,
        } as ClubCourseDisplayItem;
      });
    }

    // Sort: home club first, then alphabetically by name
    // API results (GolfApiSearchResultItem) have is_home: false so they sort after local home club
    return items.sort((a, b) => {
      const aIsHome = 'is_home' in a ? a.is_home : false;
      const bIsHome = 'is_home' in b ? b.is_home : false;
      if (aIsHome && !bIsHome) return -1;
      if (!aIsHome && bIsHome) return 1;

      const aName = isApiResult(a) ? a.name : a.club.name;
      const bName = isApiResult(b) ? b.name : b.club.name;
      return aName.localeCompare(bName);
    });
  }, [showFavoritesOnly, favoriteCourses, isSearchActive, searchResults, allClubs]);

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

  const handleClubCreated = useCallback((_club: Club, _course: Course) => {
    // The query will be invalidated by the mutation
  }, []);

  // Navigate to club details (or import first if API result)
  // Note: ClubCard passes GolfApiSearchResultItem cast to Club for API results
  const handleClubPress = useCallback(
    async (item: Club | GolfApiSearchResultItem) => {
      // Check if this is an API result (not yet imported)
      if (isApiResult(item)) {
        setImportingClubId(item.golfapi_club_id);
        try {
          const result = await importClub.mutateAsync(item.golfapi_club_id);
          // Navigate to the newly imported club
          navigation.navigate('Club', { clubId: result.club.id });
        } catch (error) {
          console.error('Failed to import club:', error);
          Alert.alert(
            'Import Failed',
            'Failed to import course. Please try again.',
            [{ text: 'OK' }]
          );
        } finally {
          setImportingClubId(null);
        }
      } else {
        // Already in DB - navigate directly
        navigation.navigate('Club', { clubId: item.id });
      }
    },
    [importClub, navigation]
  );

  // Navigate to course details
  const handleCourseSelect = useCallback(
    (course: CourseWithFavoriteStatus, club: Club) => {
      navigation.navigate('Course', { courseId: course.id, clubId: club.id });
    },
    [navigation]
  );

  // Build right actions for PageHeader
  // AddCourseModal is only available for Super Admin users
  const headerRightActions = useMemo(() => {
    const actions = [];
    // Only Super Admin can add courses manually
    if (isSuperAdmin) {
      actions.push({
        icon: 'plus',
        onPress: () => setShowAddModal(true),
        accessibilityLabel: 'Add new course manually',
      });
    }
    return actions;
  }, [isSuperAdmin]);

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
        isSuperAdmin={isSuperAdmin}
        onRefresh={handleRefresh}
        onCourseSelect={handleCourseSelect}
        onClubPress={handleClubPress}
        onToggleFavorite={handleToggleFavorite}
        togglingFavoriteId={togglingFavoriteId}
        onShowAddModal={() => setShowAddModal(true)}
        isSearchingApi={isSearchingApi}
        importingClubId={importingClubId}
      />

      {/* Add Club Modal - Super Admin only */}
      {isSuperAdmin && (
        <AddCourseModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onClubCreated={handleClubCreated}
        />
      )}
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
