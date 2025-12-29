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
  Alert,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner, GolfBallLoader, ConfirmationDialog } from '@/components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconGolf } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { FeatureButton } from '@/components/common/FeatureButton';
import { useCourseDetails } from '@/hooks/useCourseDetails';
import { useAddCourseFavorite, useRemoveCourseFavorite } from '@/hooks/useVenues';
import { useHomeVenue, useSetHomeVenue } from '@/hooks/useHomeVenue';
import { useUpdateCourseHoles } from '@/hooks';
import CreateRoundBottomSheet from '@/screens/rounds/CreateRoundBottomSheet';
import { useAuth } from '@/hooks/useAuth';
import { useScorecardStore } from '@/store/scorecardStore';
import { useFormattedDistance } from '@/store/settingsStore';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { EditHoleBottomSheet } from '@/components/courses';
import { supabase } from '@/services/supabase/client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { TeeBox, GameType, Venue, Hole } from '@/types/database.types';
import type { Player } from '@/types';

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

  // Fetch course details
  const {
    data: course,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCourseDetails(courseId);

  // Selected tee for yardage display
  const [selectedTee, setSelectedTee] = useState<TeeBox | null>(null);

  // Initialize selected tee when course loads
  React.useEffect(() => {
    if (course?.tees && course.tees.length > 0 && !selectedTee) {
      setSelectedTee(course.tees[0]);
    }
  }, [course?.tees, selectedTee]);

  // Get selected tee color for HoleTable and EditHoleBottomSheet (yardages are keyed by color)
  const selectedTeeColor = selectedTee?.color?.toLowerCase() ?? null;

  // Favorite mutations
  const addFavorite = useAddCourseFavorite();
  const removeFavorite = useRemoveCourseFavorite();
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  // Home venue state
  const { data: currentHomeVenue } = useHomeVenue();
  const setHomeVenue = useSetHomeVenue();
  const [showHomeConfirmDialog, setShowHomeConfirmDialog] = useState(false);
  const [isSettingHome, setIsSettingHome] = useState(false);

  // Check if this course's venue is the home venue
  const isHomeVenue = course?.venue?.id === currentHomeVenue?.id;

  // Round creation state
  const { user, player } = useAuth();
  const { initializeRound } = useScorecardStore();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [isStartingRound, setIsStartingRound] = useState(false);

  // Super admin hole editing
  const isSuperAdmin = useIsSuperAdmin();
  const [editingHole, setEditingHole] = useState<Hole | null>(null);
  const updateCourseHolesMutation = useUpdateCourseHoles();

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
      Alert.alert('Error', 'Failed to update favorite status');
    } finally {
      setTogglingFavorite(false);
    }
  }, [course, addFavorite, removeFavorite, refetch]);

  // Handle set as home venue
  const handleSetAsHome = useCallback(() => {
    if (!course?.venue) return;

    // If already home venue, do nothing
    if (isHomeVenue) return;

    // If there's a different home venue, show confirmation
    if (currentHomeVenue && currentHomeVenue.id !== course.venue.id) {
      setShowHomeConfirmDialog(true);
      return;
    }

    // Otherwise, set directly
    performSetAsHome();
  }, [course, currentHomeVenue, isHomeVenue]);

  const performSetAsHome = useCallback(async () => {
    if (!course?.venue) return;
    setIsSettingHome(true);
    try {
      await setHomeVenue.mutateAsync(course.venue.id);
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to set home venue');
    } finally {
      setIsSettingHome(false);
      setShowHomeConfirmDialog(false);
    }
  }, [course, setHomeVenue, refetch]);

  // Navigate to venue
  const handleVenuePress = useCallback(() => {
    if (course?.venue) {
      navigation.navigate('Venue', { venueId: course.venue.id });
    }
  }, [course?.venue, navigation]);

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
        Alert.alert('Error', 'Failed to save hole data. Please try again.');
      }
    },
    [course, updateCourseHolesMutation, refetch]
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
        // Use course holes or default holes (fallback if empty array)
        const holes: Hole[] = course.holes && course.holes.length > 0 ? course.holes : DEFAULT_HOLES;

        // Create the round in Supabase
        const { data: roundData, error: roundError } = await (supabase
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

          await (supabase.from('round_players') as any).insert(roundPlayersToInsert);
        }

        // Initialize the scorecard store
        await initializeRound(roundId, players, holes, gameType, false);

        // Navigate to scorecard
        navigation.navigate('Scorecard', {
          roundId,
          competitionId: 'standalone',
        });
      } catch (err) {
        console.error('[CourseScreen] Error starting round:', err);
        Alert.alert('Error', 'Failed to start the round. Please try again.');
      } finally {
        setIsStartingRound(false);
      }
    },
    [course, user, player, initializeRound, navigation, isStartingRound]
  );

  // Prepare initial course data for bottom sheet
  const initialCourseData = useMemo(() => {
    if (!course?.venue) return undefined;
    return {
      courseId: course.id,
      courseName: course.name,
      venue: course.venue as Venue,
      tees: course.tees,
    };
  }, [course]);

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

  // Calculate totals
  const totalPar = course.holes?.reduce((sum, h) => sum + h.par, 0) || 0;
  const holeCount = course.holes?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader variant="centered" title={course.name} showBack onBack={handleBack} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.textPrimary} />
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

              {/* Venue Link */}
              {course.venue && (
                <TouchableOpacity style={styles.venueLink} activeOpacity={0.7} onPress={handleVenuePress}>
                  <Icon source="home-city" size={16} color={colors.primary} />
                  <Text style={[styles.venueLinkText, { color: colors.primary }]}>{course.venue.name}</Text>
                  <Icon source="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.headerActions}>
              {/* Home Venue Button */}
              <TouchableOpacity
                style={[
                  styles.actionButtonLarge,
                  isHomeVenue && { backgroundColor: colors.primaryLighter },
                ]}
                activeOpacity={0.7}
                onPress={handleSetAsHome}
                disabled={isSettingHome || isHomeVenue}
                accessibilityRole="button"
                accessibilityLabel={isHomeVenue ? 'This is your home venue' : 'Set venue as home'}
              >
                {isSettingHome ? (
                  <GolfBallLoader size="sm" />
                ) : (
                  <Icon
                    source={isHomeVenue ? 'home' : 'home-outline'}
                    size={24}
                    color={isHomeVenue ? colors.primary : colors.gray400}
                  />
                )}
              </TouchableOpacity>

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
        {course.tees && course.tees.length > 0 && (
          <TeeSelector
            tees={course.tees}
            selectedTee={selectedTee}
            onSelectTee={setSelectedTee}
            variant="pills"
          />
        )}

        {/* Hole Breakdown Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Hole Breakdown</Text>

          {!course.holes || course.holes.length === 0 ? (
            <View style={[styles.emptyHolesCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
              <Icon source="flag" size={32} color={colors.gray400} />
              <Text style={[styles.emptyHolesText, { color: colors.textSecondary }]}>
                No hole information available for this course
              </Text>
            </View>
          ) : (
            <HoleTable
              holes={course.holes}
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

      {/* Home Venue Confirmation Dialog */}
      <ConfirmationDialog
        visible={showHomeConfirmDialog}
        title="Change Home Venue?"
        message={`You already have "${currentHomeVenue?.name}" set as your home venue. Would you like to replace it with "${course?.venue?.name}"?`}
        confirmLabel="Replace"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={performSetAsHome}
        onCancel={() => setShowHomeConfirmDialog(false)}
        loading={isSettingHome}
        icon="home-switch"
      />

      {/* Super admin hole editing modal */}
      {editingHole && course?.holes && (
        <EditHoleBottomSheet
          visible={!!editingHole}
          onClose={() => setEditingHole(null)}
          hole={editingHole}
          allHoles={course.holes}
          courseTees={course.tees ?? []}
          selectedTee={selectedTeeColor}
          onSave={handleSaveHole}
          loading={updateCourseHolesMutation.isPending}
        />
      )}
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
  venueLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  venueLinkText: {
    ...typography.small,
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
