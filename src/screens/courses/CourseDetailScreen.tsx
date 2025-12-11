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
  Pressable,
  Alert,
} from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconGolf } from '@tabler/icons-react-native';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { FeatureButton } from '@/components/common/FeatureButton';
import { useCourseDetails } from '@/hooks/useCourseDetails';
import { useAddCourseFavorite, useRemoveCourseFavorite } from '@/hooks/useVenues';
import CreateRoundBottomSheet from '@/screens/rounds/CreateRoundBottomSheet';
import { useAuth } from '@/hooks/useAuth';
import { useScorecardStore } from '@/store/scorecardStore';
import { supabase } from '@/services/supabase/client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { Hole, TeeBox, GameType, Venue } from '@/types/database.types';
import type { Player } from '@/types';

// =====================================================
// TYPES
// =====================================================

type Props = NativeStackScreenProps<RootStackParamList, 'Course'>;

// =====================================================
// TEE SELECTOR COMPONENT
// =====================================================

interface TeeSelectorProps {
  tees: TeeBox[];
  selectedTee: string | null;
  onSelectTee: (teeName: string) => void;
}

function TeeSelector({ tees, selectedTee, onSelectTee }: TeeSelectorProps) {
  const colors = useThemeColors();

  if (tees.length === 0) return null;

  return (
    <View style={styles.teeSelectorContainer}>
      <Text style={[styles.teeSelectorLabel, { color: colors.textSecondary }]}>
        Select Tee:
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.teeChipsContainer}
      >
        {tees.map((tee) => {
          const isSelected = selectedTee === tee.name;
          return (
            <Pressable
              key={tee.name}
              style={[
                styles.teeChip,
                { borderColor: colors.border },
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => onSelectTee(tee.name)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${tee.name} tee, ${tee.totalYardage} yards`}
            >
              <View
                style={[
                  styles.teeColorDot,
                  { backgroundColor: getTeeColor(tee.color, colors.gray400) },
                ]}
              />
              <Text
                style={[
                  styles.teeChipText,
                  { color: isSelected ? colors.white : colors.textPrimary },
                ]}
              >
                {tee.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// =====================================================
// HOLE TABLE COMPONENT
// =====================================================

interface HoleTableProps {
  holes: Hole[];
  selectedTee: string | null;
}

function HoleTable({ holes, selectedTee }: HoleTableProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  const headerBg = isDark ? colors.gray200 : colors.gray100;
  const rowBg = isDark ? colors.gray100 : colors.white;
  const altRowBg = isDark ? colors.gray50 : colors.gray50;
  const totalRowBg = isDark ? colors.primary + '30' : colors.primaryLighter;

  // Sort holes by number
  const sortedHoles = useMemo(
    () => [...holes].sort((a, b) => a.number - b.number),
    [holes]
  );

  // Split into front 9 and back 9
  const frontNine = sortedHoles.filter((h) => h.number <= 9);
  const backNine = sortedHoles.filter((h) => h.number > 9);

  // Calculate totals
  const frontPar = frontNine.reduce((sum, h) => sum + h.par, 0);
  const backPar = backNine.reduce((sum, h) => sum + h.par, 0);
  const totalPar = frontPar + backPar;

  const frontYardage = frontNine.reduce(
    (sum, h) => sum + (selectedTee && h.yardages?.[selectedTee] ? h.yardages[selectedTee] : 0),
    0
  );
  const backYardage = backNine.reduce(
    (sum, h) => sum + (selectedTee && h.yardages?.[selectedTee] ? h.yardages[selectedTee] : 0),
    0
  );
  const totalYardage = frontYardage + backYardage;

  const renderHoleRow = (hole: Hole, index: number) => {
    const yardage = selectedTee && hole.yardages?.[selectedTee];
    const bgColor = index % 2 === 0 ? rowBg : altRowBg;

    return (
      <View key={hole.number} style={[styles.tableRow, { backgroundColor: bgColor }]}>
        <View style={[styles.tableCell, styles.holeCellWide]}>
          <Text style={[styles.holeNumber, { color: colors.textPrimary }]}>{hole.number}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.cellText, { color: colors.textPrimary }]}>{hole.par}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.cellText, { color: colors.textPrimary }]}>{hole.strokeIndex}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.cellText, { color: yardage ? colors.textPrimary : colors.textTertiary }]}>
            {yardage || '-'}
          </Text>
        </View>
      </View>
    );
  };

  const renderTotalRow = (label: string, par: number, yardage: number) => (
    <View style={[styles.tableRow, styles.totalRow, { backgroundColor: totalRowBg }]}>
      <View style={[styles.tableCell, styles.holeCellWide]}>
        <Text style={[styles.totalLabel, { color: colors.primary }]}>{label}</Text>
      </View>
      <View style={[styles.tableCell, styles.cellCenter]}>
        <Text style={[styles.totalValue, { color: colors.primary }]}>{par}</Text>
      </View>
      <View style={[styles.tableCell, styles.cellCenter]}>
        <Text style={[styles.totalValue, { color: colors.primary }]}>-</Text>
      </View>
      <View style={[styles.tableCell, styles.cellCenter]}>
        <Text style={[styles.totalValue, { color: yardage ? colors.primary : colors.textTertiary }]}>
          {yardage || '-'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.tableContainer, { borderColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.tableHeader, { backgroundColor: headerBg }]}>
        <View style={[styles.tableCell, styles.holeCellWide]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Hole</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Par</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>SI</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Yds</Text>
        </View>
      </View>

      {/* Front Nine */}
      {frontNine.map((hole, index) => renderHoleRow(hole, index))}
      {frontNine.length > 0 && renderTotalRow('OUT', frontPar, frontYardage)}

      {/* Back Nine */}
      {backNine.map((hole, index) => renderHoleRow(hole, index))}
      {backNine.length > 0 && renderTotalRow('IN', backPar, backYardage)}

      {/* Total */}
      {holes.length > 0 && (
        <View style={[styles.tableRow, styles.grandTotalRow, { backgroundColor: colors.primary }]}>
          <View style={[styles.tableCell, styles.holeCellWide]}>
            <Text style={[styles.grandTotalLabel, { color: colors.white }]}>TOTAL</Text>
          </View>
          <View style={[styles.tableCell, styles.cellCenter]}>
            <Text style={[styles.grandTotalValue, { color: colors.white }]}>{totalPar}</Text>
          </View>
          <View style={[styles.tableCell, styles.cellCenter]}>
            <Text style={[styles.grandTotalValue, { color: colors.white }]}>-</Text>
          </View>
          <View style={[styles.tableCell, styles.cellCenter]}>
            <Text style={[styles.grandTotalValue, { color: totalYardage ? colors.white : colors.gray300 }]}>
              {totalYardage || '-'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getTeeColor(color: string, fallback: string): string {
  const teeColors: Record<string, string> = {
    black: '#1f2937',
    blue: '#3b82f6',
    white: '#e5e7eb',
    yellow: '#fbbf24',
    gold: '#f59e0b',
    red: '#ef4444',
    green: '#22c55e',
  };
  return teeColors[color.toLowerCase()] || fallback;
}

// =====================================================
// COURSE SCREEN COMPONENT
// =====================================================

export default function CourseScreen({ route, navigation }: Props) {
  const { courseId, venueId } = route.params;
  const colors = useThemeColors();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();

  const cardBackground = isDark ? colors.gray100 : colors.white;

  // Fetch course details
  const {
    data: course,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCourseDetails(courseId);

  // Selected tee for yardage display
  const [selectedTee, setSelectedTee] = useState<string | null>(null);

  // Initialize selected tee when course loads
  React.useEffect(() => {
    if (course?.tees && course.tees.length > 0 && !selectedTee) {
      // Default to first tee (usually championship/blue)
      setSelectedTee(course.tees[0].name);
    }
  }, [course?.tees, selectedTee]);

  // Favorite mutations
  const addFavorite = useAddCourseFavorite();
  const removeFavorite = useRemoveCourseFavorite();
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  // Round creation state
  const { user, player } = useAuth();
  const { initializeRound } = useScorecardStore();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [isStartingRound, setIsStartingRound] = useState(false);

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
    } catch (err) {
      Alert.alert('Error', 'Failed to update favorite status');
    } finally {
      setTogglingFavorite(false);
    }
  }, [course, addFavorite, removeFavorite, refetch]);

  // Navigate to venue
  const handleVenuePress = useCallback(() => {
    if (course?.venue) {
      navigation.navigate('Venue', { venueId: course.venue.id });
    }
  }, [course?.venue, navigation]);

  // Get selected tee box info
  const selectedTeeBox = useMemo(
    () => course?.tees?.find((t) => t.name === selectedTee) || null,
    [course?.tees, selectedTee]
  );

  // Handle opening social round bottom sheet
  const handleOpenSocialRound = useCallback(() => {
    setIsBottomSheetVisible(true);
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  // Default holes for courses without hole data
  const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
    number: (i + 1) as Hole['number'],
    par: ([4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4][i] || 4) as Hole['par'],
    strokeIndex: [7, 15, 1, 11, 5, 17, 9, 3, 13, 8, 16, 2, 12, 6, 18, 10, 4, 14][i] || i + 1,
    yardages: { white: 350 + i * 15 },
  }));

  interface PlayingPartner {
    id: string;
    name: string;
    handicap?: number;
  }

  // Handle starting a new round from the bottom sheet
  const handleStartRound = useCallback(
    async (
      _courseId: string,
      courseName: string,
      partners: PlayingPartner[],
      roundSelectedTee?: TeeBox,
      gameType: GameType = 'stableford'
    ) => {
      if (isStartingRound || !course) return;

      setIsStartingRound(true);
      setIsBottomSheetVisible(false);

      try {
        // Use course holes or default holes
        const holes: Hole[] = course.holes || DEFAULT_HOLES;

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
      } catch (error) {
        console.error('[CourseScreen] Error starting round:', error);
        Alert.alert('Error', 'Failed to start the round. Please try again.');
      } finally {
        setIsStartingRound(false);
      }
    },
    [course, user, player, initializeRound, navigation, isStartingRound, DEFAULT_HOLES]
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
        <PageHeader
          variant="centered"
          title="Course"
          showBack
          onBack={handleBack}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading course...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          variant="centered"
          title="Course"
          showBack
          onBack={handleBack}
        />
        <View style={styles.centered}>
          <Icon source="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Unable to load course
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error instanceof Error ? error.message : 'An error occurred'}
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
          >
            <Text style={[styles.retryButtonText, { color: colors.white }]}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Not found state
  if (!course) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          variant="centered"
          title="Course"
          showBack
          onBack={handleBack}
        />
        <View style={styles.centered}>
          <Icon source="golf" size={48} color={colors.gray400} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Course not found
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            This course may have been removed
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.retryButtonText, { color: colors.white }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Calculate totals
  const totalPar = course.holes?.reduce((sum, h) => sum + h.par, 0) || 0;
  const holeCount = course.holes?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        variant="centered"
        title={course.name}
        showBack
        onBack={handleBack}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Course Header Card */}
      <View style={[styles.headerCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={[styles.courseIconLarge, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="golf" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.courseName, { color: colors.textPrimary }]}>
              {course.name}
            </Text>

            {/* Venue Link */}
            {course.venue && (
              <Pressable style={styles.venueLink} onPress={handleVenuePress}>
                <Icon source="home-city" size={16} color={colors.primary} />
                <Text style={[styles.venueLinkText, { color: colors.primary }]}>
                  {course.venue.name}
                </Text>
                <Icon source="chevron-right" size={16} color={colors.primary} />
              </Pressable>
            )}
          </View>

          {/* Favorite Button */}
          <Pressable
            style={[
              styles.favoriteButtonLarge,
              course.is_favorite && { backgroundColor: colors.warningLight + '30' },
            ]}
            onPress={handleToggleFavorite}
            disabled={togglingFavorite}
            accessibilityRole="button"
            accessibilityLabel={course.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {togglingFavorite ? (
              <ActivityIndicator size="small" color={colors.warning} />
            ) : (
              <Icon
                source={course.is_favorite ? 'star' : 'star-outline'}
                size={28}
                color={course.is_favorite ? colors.warning : colors.gray400}
              />
            )}
          </Pressable>
        </View>

        {/* Description */}
        {course.description && (
          <Text style={[styles.courseDescription, { color: colors.textSecondary }]}>
            {course.description}
          </Text>
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
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {course.slope_rating || '-'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Slope</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {course.course_rating || '-'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>CR</Text>
          </View>
        </View>

        {/* Selected Tee Info */}
        {selectedTeeBox && (
          <View style={[styles.selectedTeeInfo, { backgroundColor: colors.gray50 }]}>
            <View
              style={[
                styles.teeColorIndicator,
                { backgroundColor: getTeeColor(selectedTeeBox.color, colors.gray400) },
              ]}
            />
            <View style={styles.selectedTeeDetails}>
              <Text style={[styles.selectedTeeName, { color: colors.textPrimary }]}>
                {selectedTeeBox.name} Tees
              </Text>
              <Text style={[styles.selectedTeeYardage, { color: colors.textSecondary }]}>
                {selectedTeeBox.totalYardage?.toLocaleString()} yards
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
        />
      )}

      {/* Hole Breakdown Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Hole Breakdown
        </Text>

        {!course.holes || course.holes.length === 0 ? (
          <View style={[styles.emptyHolesCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
            <Icon source="flag" size={32} color={colors.gray400} />
            <Text style={[styles.emptyHolesText, { color: colors.textSecondary }]}>
              No hole information available for this course
            </Text>
          </View>
        ) : (
          <HoleTable holes={course.holes} selectedTee={selectedTee} />
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
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
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
  favoriteButtonLarge: {
    width: 52,
    height: 52,
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

  // Tee Selector
  teeSelectorContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  teeSelectorLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  teeChipsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  teeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  teeColorDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  teeChipText: {
    ...typography.small,
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

  // Hole Table
  tableContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  totalRow: {
    paddingVertical: spacing.sm,
  },
  grandTotalRow: {
    paddingVertical: spacing.md,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  holeCellWide: {
    flex: 1.5,
  },
  cellCenter: {
    alignItems: 'center',
  },
  headerText: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  holeNumber: {
    ...typography.bodyBold,
  },
  cellText: {
    ...typography.body,
  },
  totalLabel: {
    ...typography.smallBold,
  },
  totalValue: {
    ...typography.smallBold,
  },
  grandTotalLabel: {
    ...typography.bodyBold,
  },
  grandTotalValue: {
    ...typography.bodyBold,
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
