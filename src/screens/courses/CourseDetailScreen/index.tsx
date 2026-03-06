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
import { LoadingSpinner, GolfBallLoader, ConfirmationDialog } from '@/components/common';
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
import { useUpdateCourseHoles, useCoordinateSummary } from '@/hooks';
import CreateRoundBottomSheet from '@/screens/rounds/CreateRoundBottomSheet';
import { useAuth } from '@/hooks/useAuth';
import { useScorecardStore } from '@/store/scorecardStore';
import { useFormattedDistance } from '@/store/settingsStore';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { useDeleteCourse } from '@/hooks/useDeleteCourse';
import { EditHoleBottomSheet } from '@/components/courses';
import { supabase } from '@/services/supabase/client';
import { courseService } from '@/services/courses/courseService';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { TeeBox, GameType, Club, Hole } from '@/types/database.types';
import type { Player } from '@/types';
import { hydrateHolesWithTeeYardages, resolveTeeYardageKey } from '@/utils/holeTransformers';
import { teeToTeeBox } from '@/utils/teeTransformers';

import { HoleTable } from './components';
import { TeeSelector, getTeeColor } from '@/components/common';
import { DEFAULT_HOLES } from './utils';
import type { PlayingPartner } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'Course'>;

export default function CourseScreen({ route, navigation }: Props) {
  const { courseId } = route.params;
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const cardBackground = colors.surface;
  const { formatDistance } = useFormattedDistance();

  // Dialog state
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // Delete course mutation (manual courses only, super admin only)
  const deleteCourseMutation = useDeleteCourse();

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

  // Round creation state
  const { user, player } = useAuth();
  const { initializeRound } = useScorecardStore();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [isStartingRound, setIsStartingRound] = useState(false);

  // Super admin hole editing
  const isSuperAdmin = useIsSuperAdmin();
  const [editingHole, setEditingHole] = useState<Hole | null>(null);
  const updateCourseHolesMutation = useUpdateCourseHoles();

  // API refresh state (re-imports course from Golf API)
  const [isRefreshingFromApi, setIsRefreshingFromApi] = useState(false);

  // GPS coordinates summary
  const { data: coordSummary, refetch: refetchCoords } = useCoordinateSummary(courseId);

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

  // Handle refresh from Golf API (re-imports course data including tees and GPS coordinates)
  const handleRefreshFromApi = useCallback(async () => {
    if (isRefreshingFromApi) return; // Prevent double-clicks

    if (!course?.golfapi_course_id) {
      showAlert('Cannot Refresh', 'This course was not imported from the Golf API.');
      return;
    }

    setIsRefreshingFromApi(true);
    try {
      const result = await courseService.importCourse(course.golfapi_course_id);
      await refetch();
      await refetchCoords();

      // Build success message with details
      const messages = ['Course data refreshed from Golf API.'];
      if (result.coordinatesImported > 0) {
        messages.push(`GPS coordinates imported: ${result.coordinatesImported} points`);
      }

      showAlert('Success', messages.join('\n'));
    } catch (error) {
      console.error('[CourseScreen] Failed to refresh from API:', error);
      showAlert('Error', 'Failed to refresh course data. Please try again.');
    } finally {
      setIsRefreshingFromApi(false);
    }
  }, [course?.golfapi_course_id, refetch, refetchCoords, isRefreshingFromApi, showAlert]);

  // Navigate to club
  const handleClubPress = useCallback(() => {
    if (course?.club) {
      navigation.navigate('Club', { clubId: course.club.id });
    }
  }, [course?.club, navigation]);

  // Handle delete course (manual courses only, super admin only)
  const handleDeleteCourse = useCallback(() => {
    if (!course || course.golfapi_course_id) return;

    showDialog({
      title: 'Delete Course',
      message:
        'This course and its hole data will be permanently removed. Rounds that used this course will keep their scores but lose the course reference.',
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      icon: 'trash-can-outline',
      onConfirm: () => {
        dismissDialog();
        deleteCourseMutation.mutate(
          { courseId: course.id, clubId: course.club?.id },
          {
            onSuccess: () => {
              navigation.goBack();
            },
            onError: (error) => {
              showAlert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete course'
              );
            },
          }
        );
      },
    });
  }, [course, showDialog, dismissDialog, deleteCourseMutation, navigation, showAlert]);

  // Get selected tee box info (alias for compatibility)
  const selectedTeeBox = selectedTee;

  // Handle opening social round bottom sheet
  const handleOpenSocialRound = useCallback(() => {
    setIsBottomSheetVisible(true);
  }, []);

  // Super admin hole editing handlers
  const handleHolePress = useCallback(
    (hole: Hole) => {
      if (isSuperAdmin) {
        setEditingHole(hole);
      }
    },
    [isSuperAdmin]
  );

  const handleSaveHole = useCallback(
    async (updatedHole: Hole) => {
      if (!course?.holes) return;

      // Update the holes array with the edited hole
      const updatedHoles = course.holes.map((h) =>
        h.number === updatedHole.number ? updatedHole : h
      );

      try {
        // Update in database
        await updateCourseHolesMutation.mutateAsync({
          courseId: course.id,
          holes: updatedHoles,
        });

        // Refetch to get updated data
        refetch();

        // Close the modal
        setEditingHole(null);
      } catch {
        showAlert('Error', 'Failed to save hole data. Please try again.');
      }
    },
    [course, updateCourseHolesMutation, refetch, showAlert]
  );

  const handleCloseBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  // Handle starting a new round from the bottom sheet
  const handleStartRound = useCallback(
    async (
      _courseId: string,
      _courseName: string,
      partners: PlayingPartner[],
      roundSelectedTee?: TeeBox,
      gameType: GameType = 'stableford'
    ) => {
      if (isStartingRound || !course) return;

      setIsStartingRound(true);
      setIsBottomSheetVisible(false);

      try {
        // Use hydrated holes (with yardages) or default holes (fallback if empty array)
        const holes: Hole[] = holesWithYardages && holesWithYardages.length > 0 ? holesWithYardages : DEFAULT_HOLES;

        // Create the round in Supabase
        const { data: roundData, error: roundError } = await (supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          .from('rounds') as any)
          .insert({
            course_id: course.id,
            user_id: user?.id,
            competition_id: null,
            round_number: 1,
            date: new Date().toISOString().split('T')[0],
            game_type: gameType,
            status: 'in-progress',
            selected_tee: roundSelectedTee ?? null,
          })
          .select('id')
          .single();

        if (roundError) {
          throw new Error(`Failed to create round: ${roundError.message}`);
        }

        const roundId = roundData.id;

        // Create player objects
        const players: Player[] = [];

        if (player) {
          players.push({
            id: player.id,
            name: player.name,
            email: player.email || '',
            phone: player.phone || undefined,
            handicap: player.handicap ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else if (user) {
          players.push({
            id: user.id,
            name: user.email?.split('@')[0] || 'Player 1',
            email: user.email || '',
            handicap: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        for (const partner of partners) {
          players.push({
            id: partner.id,
            name: partner.name,
            email: '',
            handicap: partner.handicap ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Create round_players records
        if (user?.id) {
          const roundPlayersToInsert = [
            { round_id: roundId, player_id: user.id, added_by: null },
            ...partners.map(partner => ({
              round_id: roundId,
              player_id: partner.id,
              added_by: user.id,
            })),
          ];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          await (supabase.from('round_players') as any).insert(roundPlayersToInsert);
        }

        // Initialize the scorecard store
        await initializeRound(roundId, players, holes, gameType, false);

        // Navigate to appropriate scoring screen based on game type
        if (gameType === 'match-play') {
          navigation.navigate('MatchPlayScoring', {
            roundId,
            player1Id: players[0]?.id,
            player2Id: players[1]?.id,
          });
        } else {
          navigation.navigate('Scorecard', {
            roundId,
            competitionId: 'standalone',
          });
        }
      } catch (err) {
        console.error('[CourseScreen] Error starting round:', err);
        showAlert('Error', 'Failed to start the round. Please try again.');
      } finally {
        setIsStartingRound(false);
      }
    },
    [course, holesWithYardages, user, player, initializeRound, navigation, isStartingRound, showAlert]
  );

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
        <View style={styles.centered}>
          <Icon source="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Unable to load course</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error instanceof Error ? error.message : 'An error occurred'}
          </Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} activeOpacity={0.7} onPress={() => refetch()}>
            <Text style={[styles.retryButtonText, { color: colors.white }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Not found state
  if (!course) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader variant="centered" title="Course" showBack onBack={handleBack} />
        <View style={styles.centered}>
          <Icon source="golf" size={48} color={colors.gray400} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Course not found</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>This course may have been removed</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} activeOpacity={0.7} onPress={() => navigation.goBack()}>
            <Text style={[styles.retryButtonText, { color: colors.white }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate totals (using hydrated holes)
  const totalPar = holesWithYardages?.reduce((sum, h) => sum + h.par, 0) || 0;
  const holeCount = holesWithYardages?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        variant="centered"
        title={course.name}
        showBack
        onBack={handleBack}
        rightActions={(() => {
          const actions = [
            ...(course.golfapi_course_id
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
        })()}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.textPrimary} colors={[colors.textPrimary]} />
        }
      >
        {/* Course Header Card */}
        <View style={[styles.headerCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
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
          {selectedTeeBox && (
            <View style={[styles.selectedTeeInfo, { backgroundColor: colors.surfaceVariant }]}>
              <View
                style={[styles.teeColorIndicator, { backgroundColor: getTeeColor(selectedTeeBox.color, colors.gray400) }]}
              />
              <View style={styles.selectedTeeDetails}>
                <Text style={[styles.selectedTeeName, { color: colors.textPrimary }]}>{selectedTeeBox.name} Tees</Text>
                <Text style={[styles.selectedTeeYardage, { color: colors.textSecondary }]}>
                  {selectedTeeBox.totalYardage ? formatDistance(selectedTeeBox.totalYardage) : ''}
                  {selectedTeeBox.courseRating && ` · CR: ${selectedTeeBox.courseRating}`}
                  {selectedTeeBox.slopeRating && ` · Slope: ${selectedTeeBox.slopeRating}`}
                </Text>
              </View>
            </View>
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
            <View style={[styles.emptyHolesCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
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
  errorTitle: {
    ...typography.h4,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    ...typography.bodyBold,
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
