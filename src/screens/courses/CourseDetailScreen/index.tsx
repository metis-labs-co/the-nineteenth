/**
 * CourseScreen - Display course details with hole-by-hole breakdown
 *
 * Shows:
 * - Course information (name, description, ratings)
 * - Tee box information
 * - Hole-by-hole table (SI, length, par)
 * - Out/In/Total summaries
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner, GolfBallLoader, ConfirmationDialog, ErrorState } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconGolf } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { FeatureButton } from '@/components/common/FeatureButton';
import { useCourseDetails } from '@/hooks/useCourseDetails';
import { useAddCourseFavorite, useRemoveCourseFavorite } from '@/hooks/useClubs';
import { useHomeClub } from '@/hooks/useHomeClub';
import { useCoordinateSummary } from '@/hooks';
import { useCoordinateBackfill } from '@/hooks/useCoordinateBackfill';
import CreateRoundBottomSheet from '@/screens/rounds/CreateRoundBottomSheet';
import { useFormattedDistance } from '@/store/settingsStore';
import { useIsSocial } from '@/store/subscriptionStore';
import { EditHoleBottomSheet, EditCourseBottomSheet, EditTeeBottomSheet } from '@/components/courses';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { TeeBox, Club } from '@/types/database.types';
import { hydrateHolesWithTeeYardages, resolveTeeYardageKey } from '@/utils/holeTransformers';
import { teeToTeeBox } from '@/utils/teeTransformers';

import { useStartSocialRound } from './hooks/useStartSocialRound';
import { useCourseAdminActions } from './hooks/useCourseAdminActions';
import { HoleTable } from './components';
import { TeeSelector, getTeeColor } from '@/components/common';

type Props = NativeStackScreenProps<RootStackParamList, 'Course'>;

export default function CourseScreen({ route, navigation }: Props) {
  const { courseId } = route.params;
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const { formatDistance } = useFormattedDistance();
  const isSocialOrHigher = useIsSocial();

  // Dialog state
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // Fetch course details with tees from the normalized tees table
  const {
    data: course,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCourseDetails(courseId, { includeTees: true });

  // Get tees - prefer tees from normalized table, fallback to legacy JSONB
  const courseTees = useMemo(() => {
    if (course?.teesFromTable && course.teesFromTable.length > 0) {
      return course.teesFromTable.map(teeToTeeBox);
    }
    return course?.tees ?? [];
  }, [course?.teesFromTable, course?.tees]);

  // Hydrate holes with yardages from the tees table
  // The tees table stores per-hole lengths (length_hole_1, etc.) which need to be
  // merged into holes as yardages: { blue: 425, white: 400, ... }
  const holesWithYardages = useMemo(() => {
    return hydrateHolesWithTeeYardages(course?.holes, course?.teesFromTable);
  }, [course?.holes, course?.teesFromTable]);

  // Selected tee for yardage display
  const [selectedTee, setSelectedTee] = useState<TeeBox | null>(null);

  // Initialize selected tee when course loads
  React.useEffect(() => {
    if (courseTees.length > 0 && !selectedTee) {
      setSelectedTee(courseTees[0]);
    }
  }, [courseTees, selectedTee]);

  // Get selected tee color for HoleTable and EditHoleBottomSheet (yardages are keyed by color name)
  // Use resolveTeeYardageKey to ensure consistency with how holes are hydrated with yardages
  const selectedTeeColor = selectedTee ? resolveTeeYardageKey(selectedTee.color, selectedTee.name) : null;

  // Favorite mutations
  const addFavorite = useAddCourseFavorite();
  const removeFavorite = useRemoveCourseFavorite();
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  // Home club check (for indicator display)
  const { data: currentHomeClub } = useHomeClub();
  const isHomeClub = course?.club?.id === currentHomeClub?.id;

  // GPS coordinates summary
  const { data: coordSummary, refetch: refetchCoords } = useCoordinateSummary(courseId);

  // Auto-backfill GPS coordinates from GolfAPI.io if missing
  useCoordinateBackfill(courseId);

  // Round creation
  const {
    isBottomSheetVisible,
    isStartingRound,
    openBottomSheet,
    closeBottomSheet,
    startRound: handleStartRound,
  } = useStartSocialRound({
    courseId: course?.id ?? courseId,
    holesWithYardages,
    navigation,
    onError: showAlert,
  });

  // Super admin actions
  const {
    isSuperAdmin,
    editingHole,
    setEditingHole,
    handleHolePress,
    handleSaveHole,
    updateCourseHolesMutation,
    isEditingCourse,
    setIsEditingCourse,
    handleSaveCourse,
    updateCourseMutation,
    editingTee,
    setEditingTee,
    handleSaveTee,
    handleTeeEditPress,
    updateTeeMutation,
    isRefreshingFromApi,
    handleRefreshFromApi,
    handleDeleteCourse,
  } = useCourseAdminActions({
    course,
    selectedTee,
    refetch,
    refetchCoords,
    navigation,
    showAlert,
    showDialog,
    dismissDialog,
  });

  // Hide React Navigation header (we use PageHeader)
  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(async () => {
    if (!course) return;
    setTogglingFavorite(true);
    try {
      if (course.is_favorite) {
        await removeFavorite.mutateAsync(course.id);
      } else {
        await addFavorite.mutateAsync(course.id);
      }
      refetch();
    } catch {
      showAlert('Error', 'Failed to update favorite status');
    } finally {
      setTogglingFavorite(false);
    }
  }, [course, addFavorite, removeFavorite, refetch, showAlert]);

  // Navigate to club
  const handleClubPress = useCallback(() => {
    if (course?.club) {
      navigation.navigate('Club', { clubId: course.club.id });
    }
  }, [course?.club, navigation]);

  // Handle opening social round bottom sheet
  const handleOpenSocialRound = openBottomSheet;

  const handleCloseBottomSheet = closeBottomSheet;

  // Prepare initial course data for bottom sheet
  const initialCourseData = useMemo(() => {
    if (!course?.club) return undefined;
    return {
      courseId: course.id,
      courseName: course.name,
      club: course.club as Club,
      venue: course.club as Club, // Deprecated alias for backward compatibility
      tees: courseTees, // Use merged tees from table + legacy
    };
  }, [course, courseTees]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader variant="centered" title="Course" showBack onBack={handleBack} />
        <View style={styles.centered}>
          <LoadingSpinner size="lg" message="Loading course..." />
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader variant="centered" title="Course" showBack onBack={handleBack} />
        <ErrorState
          error={error}
          title="Unable to load course"
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  // Not found state
  if (!course) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader variant="centered" title="Course" showBack onBack={handleBack} />
        <ErrorState
          error="This course may have been removed"
          title="Course not found"
          onRetry={() => navigation.goBack()}
          retryLabel="Go Back"
        />
      </View>
    );
  }

  // Calculate totals (using hydrated holes)
  const totalPar = holesWithYardages?.reduce((sum, h) => sum + h.par, 0) || 0;
  const holeCount = holesWithYardages?.length || 0;

  // Build header right actions
  const headerRightActions = (() => {
    const actions = [
      {
        icon: 'chart-box-outline',
        onPress: () => navigation.navigate('CourseStatistics', {
          courseId,
          courseName: course.name,
        }),
        accessibilityLabel: 'View my statistics at this course',
      },
      ...(isSocialOrHigher && course.golfapi_course_id
        ? [{
            icon: isRefreshingFromApi ? 'loading' : 'refresh',
            onPress: handleRefreshFromApi,
            accessibilityLabel: 'Refresh course data from Golf API',
          }]
        : []),
      ...(!course.golfapi_course_id && isSuperAdmin
        ? [{
            icon: 'trash-can-outline',
            onPress: handleDeleteCourse,
            accessibilityLabel: 'Delete course',
            color: colors.error,
          }]
        : []),
    ];
    return actions.length > 0 ? actions : undefined;
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        variant="centered"
        title={course.name}
        showBack
        onBack={handleBack}
        rightActions={headerRightActions}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.textPrimary} colors={[colors.textPrimary]} />
        }
      >
        {/* Course Header Card */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View style={[styles.courseIconLarge, { backgroundColor: colors.primaryLighter }]}>
              <Icon source="golf" size={32} color={colors.primary} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.courseName, { color: colors.textPrimary }]}>{course.name}</Text>

              {/* Club Link */}
              {course.club && (
                <TouchableOpacity style={styles.clubLink} activeOpacity={0.7} onPress={handleClubPress}>
                  <Icon source="home-city" size={16} color={colors.primary} />
                  <Text style={[styles.clubLinkText, { color: colors.primary }]}>{course.club.name}</Text>
                  <Icon source="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}

              {/* Home Club Badge */}
              {isHomeClub && (
                <View style={[styles.homeVenueBadge, { backgroundColor: colors.primaryLighter }]}>
                  <Icon source="home" size={14} color={colors.primary} />
                  <Text style={[styles.homeVenueBadgeText, { color: colors.primary }]}>Home Club</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.headerActions}>
              {/* Super Admin Edit Button */}
              {isSuperAdmin && (
                <TouchableOpacity
                  style={styles.actionButtonLarge}
                  activeOpacity={0.7}
                  onPress={() => setIsEditingCourse(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit course details"
                >
                  <Icon source="pencil" size={22} color={colors.primary} />
                </TouchableOpacity>
              )}
              {/* Favorite Button */}
              <TouchableOpacity
                style={[
                  styles.actionButtonLarge,
                  course.is_favorite && { backgroundColor: colors.warningLight + '30' },
                ]}
                activeOpacity={0.7}
                onPress={handleToggleFavorite}
                disabled={togglingFavorite}
                accessibilityRole="button"
                accessibilityLabel={course.is_favorite ? 'Remove from favourites' : 'Add to favourites'}
              >
                {togglingFavorite ? (
                  <GolfBallLoader size="sm" />
                ) : (
                  <Icon
                    source={course.is_favorite ? 'star' : 'star-outline'}
                    size={24}
                    color={course.is_favorite ? colors.warning : colors.gray400}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          {course.description && (
            <Text style={[styles.courseDescription, { color: colors.textSecondary }]}>{course.description}</Text>
          )}

          {/* Quick Stats */}
          <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{holeCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Holes</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{totalPar || '-'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Par</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{course.slope_rating || '-'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Slope</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{course.course_rating || '-'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>CR</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Icon
                source={(coordSummary && coordSummary.length > 0) ? 'crosshairs-gps' : 'crosshairs-off'}
                size={20}
                color={(coordSummary && coordSummary.length > 0) ? colors.success : colors.gray400}
              />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GPS</Text>
            </View>
          </View>

          {/* Selected Tee Info */}
          {selectedTee && (
            <TouchableOpacity
              disabled={!isSuperAdmin}
              activeOpacity={isSuperAdmin ? 0.7 : 1}
              onPress={handleTeeEditPress}
              accessibilityLabel={isSuperAdmin ? `Edit ${selectedTee.name} tee ratings` : undefined}
            >
              <View style={[styles.selectedTeeInfo, { backgroundColor: colors.surfaceVariant }]}>
                <View
                  style={[styles.teeColorIndicator, { backgroundColor: getTeeColor(selectedTee.color, colors.gray400) }]}
                />
                <View style={styles.selectedTeeDetails}>
                  <Text style={[styles.selectedTeeName, { color: colors.textPrimary }]}>{selectedTee.name} Tees</Text>
                  <Text style={[styles.selectedTeeYardage, { color: colors.textSecondary }]}>
                    {selectedTee.totalYardage ? formatDistance(selectedTee.totalYardage) : ''}
                    {selectedTee.courseRating && ` · CR: ${selectedTee.courseRating}`}
                    {selectedTee.slopeRating && ` · Slope: ${selectedTee.slopeRating}`}
                  </Text>
                </View>
                {isSuperAdmin && (
                  <Icon source="pencil" size={16} color={colors.textSecondary} />
                )}
              </View>
            </TouchableOpacity>
          )}

        </View>

        {/* Tee Selector */}
        {courseTees.length > 0 && (
          <TeeSelector
            tees={courseTees}
            selectedTee={selectedTee}
            onSelectTee={setSelectedTee}
            variant="pills"
          />
        )}

        {/* Hole Breakdown Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Hole Breakdown</Text>

          {!holesWithYardages || holesWithYardages.length === 0 ? (
            <View style={[styles.emptyHolesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon source="flag" size={32} color={colors.gray400} />
              <Text style={[styles.emptyHolesText, { color: colors.textSecondary }]}>
                No hole information available for this course
              </Text>
            </View>
          ) : (
            <HoleTable
              holes={holesWithYardages}
              selectedTee={selectedTeeColor}
              isSuperAdmin={isSuperAdmin}
              onHolePress={handleHolePress}
            />
          )}
        </View>
      </ScrollView>

      {/* Score Social Round Feature Button */}
      <View style={styles.featureButtonContainer}>
        <FeatureButton
          title="Score a Social Round"
          subtitle={`Start scoring at ${course.name}`}
          icon={<IconGolf size={24} color={colors.white} strokeWidth={2} />}
          onPress={handleOpenSocialRound}
          disabled={isStartingRound}
          accessibilityLabel="Score a social round at this course"
        />
      </View>

      {/* Create Round Bottom Sheet */}
      <CreateRoundBottomSheet
        visible={isBottomSheetVisible}
        onClose={handleCloseBottomSheet}
        onStartRound={handleStartRound}
        initialCourse={initialCourseData}
      />

      {/* Super admin hole editing modal */}
      {editingHole && holesWithYardages && holesWithYardages.length > 0 && (
        <EditHoleBottomSheet
          visible={!!editingHole}
          onClose={() => setEditingHole(null)}
          hole={editingHole}
          allHoles={holesWithYardages}
          courseTees={courseTees}
          selectedTee={selectedTeeColor}
          onSave={handleSaveHole}
          loading={updateCourseHolesMutation.isPending}
        />
      )}

      {/* Super admin course editing modal */}
      {isEditingCourse && course && (
        <EditCourseBottomSheet
          visible={isEditingCourse}
          onClose={() => setIsEditingCourse(false)}
          course={course}
          onSave={handleSaveCourse}
          loading={updateCourseMutation.isPending}
        />
      )}

      {/* Super admin tee editing modal */}
      {editingTee && (
        <EditTeeBottomSheet
          visible={!!editingTee}
          onClose={() => setEditingTee(null)}
          tee={editingTee}
          onSave={handleSaveTee}
          loading={updateTeeMutation.isPending}
        />
      )}

      {/* Confirmation/Alert Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  // Header Card
  headerCard: {
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  courseIconLarge: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  courseName: {
    ...typography.h3,
  },
  clubLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  clubLinkText: {
    ...typography.small,
  },
  homeVenueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  homeVenueBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButtonLarge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseDescription: {
    ...typography.body,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
  },

  // Selected Tee Info
  selectedTeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    margin: spacing.md,
    marginTop: 0,
    borderRadius: borderRadius.md,
  },
  teeColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  selectedTeeDetails: {
    flex: 1,
  },
  selectedTeeName: {
    ...typography.smallBold,
  },
  selectedTeeYardage: {
    ...typography.caption,
    marginTop: 2,
  },

  // Section
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },

  // Empty States
  emptyHolesCard: {
    padding: spacing.xxl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyHolesText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // Feature Button
  featureButtonContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});
