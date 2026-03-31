/**
 * LeagueQuickAddRoundScreen - Superadmin wizard to add a round to a league
 *
 * Steps: Player → Course → Tee → Scores → Review
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmationDialog, DatePicker } from '@/components/common';
import { CourseSelectionStep } from '@/screens/rounds/CreateRoundBottomSheet/steps/CourseSelectionStep';
import {
  useSearchClubs,
  useClubsWithCourses,
  useFavoriteCoursesWithClubs,
  toClubCourseDisplayItem,
  sortHomeClubFirst,
} from '@/hooks/useClubs';
import type { CourseWithFavoriteStatus } from '@/hooks/useClubs';
import { TeeSelector } from '@/components/common';
import type { Club, TeeBox, Hole } from '@/types/database.types';

import { useLeagueQuickAddRound, type WizardStep } from './useLeagueQuickAddRound';
import QuickScoreHoleRow from '@/screens/scoring/QuickScoreEntryScreen/QuickScoreHoleRow';
import QuickScoreTotalsBar from '@/screens/scoring/QuickScoreEntryScreen/QuickScoreTotalsBar';
import QuickScoreReviewModal from '@/screens/scoring/QuickScoreEntryScreen/QuickScoreReviewModal';

type Props = NativeStackScreenProps<RootStackParamList, 'LeagueQuickAddRound'>;

export default function LeagueQuickAddRoundScreen({ route, navigation: nav }: Props) {
  const { leagueId } = route.params;
  const colors = useThemeColors();
  const vm = useLeagueQuickAddRound({ leagueId });

  // Course search state
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isLoading: searchLoading } = useSearchClubs(searchQuery.trim(), undefined);
  const { data: allClubs, isLoading: clubsLoading } = useClubsWithCourses();
  const { data: favoriteCourses } = useFavoriteCoursesWithClubs();

  const displayItems = useMemo(
    () =>
      sortHomeClubFirst(
        searchQuery.trim().length >= 2
          ? (searchResults ?? []).map(toClubCourseDisplayItem)
          : (allClubs ?? []).map(toClubCourseDisplayItem)
      ),
    [searchQuery, searchResults, allClubs]
  );
  const coursesLoading = searchQuery.trim().length >= 2 ? searchLoading : clubsLoading;

  const stepTitles: Record<WizardStep, string> = {
    player: 'Select Player',
    course: 'Select Course',
    tee: 'Select Tee',
    scores: 'Enter Scores',
    review: 'Review',
  };

  const handleBack = () => {
    const order: WizardStep[] = ['player', 'course', 'tee', 'scores', 'review'];
    const idx = order.indexOf(vm.step);
    if (idx <= 0) {
      // On first step, navigate back to league detail
      nav.goBack();
    } else {
      vm.goToStep(order[idx - 1]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={`Add Round — ${stepTitles[vm.step]}`}
        showBack
        onBack={handleBack}
      />

      {/* Step 1: Player Selection */}
      {vm.step === 'player' && (
        <FlatList
          data={vm.players ?? []}
          keyExtractor={(item) => item.player_id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- League player join type includes nested player
            const p = (item as any).player;
            return (
              <TouchableOpacity
                style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() =>
                  vm.handleSelectPlayer({
                    id: item.player_id,
                    name: p?.name ?? 'Unknown',
                    handicap: p?.handicap ?? null,
                    handicap_index: p?.handicap_index ?? null,
                    gender: p?.gender ?? null,
                  })
                }
              >
                <Text style={[styles.listItemName, { color: colors.textPrimary }]}>
                  {p?.name ?? 'Unknown'}
                </Text>
                <Text style={[styles.listItemMeta, { color: colors.textSecondary }]}>
                  HC: {p?.handicap ?? 'N/A'}
                </Text>
                <Icon source="chevron-right" size={20} color={colors.gray400} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No league members found
            </Text>
          }
        />
      )}

      {/* Step 2: Course Selection (uses same club search as round wizard) */}
      {vm.step === 'course' && (
        <View style={styles.flex}>
          {/* Date picker */}
          <View style={{ paddingHorizontal: spacing.lg }}>
            <DatePicker
              label="Round Date"
              value={vm.roundDateDisplay}
              onChange={vm.setRoundDateFromDisplay}
              mode="date"
              maximumDate={new Date()}
            />
          </View>

          <CourseSelectionStep
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            displayItems={displayItems}
            isLoading={coursesLoading}
            favoriteCourses={favoriteCourses}
            onSelectCourse={(course: CourseWithFavoriteStatus, club: Club) => {
              setSearchQuery('');
              vm.handleSelectCourse({
                courseId: course.id,
                courseName: course.name,
                clubName: club.name,
                holes: (course.holes as Hole[]) ?? [],
                tees: (course.tees as TeeBox[]) ?? [],
              });
            }}
            onSelectFavoriteCourse={(course) => {
              setSearchQuery('');
              vm.handleSelectCourse({
                courseId: course.id,
                courseName: course.name,
                clubName: course.club?.name ?? '',
                holes: (course.holes as Hole[]) ?? [],
                tees: (course.tees as TeeBox[]) ?? [],
              });
            }}
          />
        </View>
      )}

      {/* Step 3: Tee Selection (uses same TeeSelector as round wizard) */}
      {vm.step === 'tee' && (
        <TeeSelector
          tees={vm.tees}
          selectedTee={vm.selectedTee}
          onSelectTee={vm.handleSelectTee}
          variant="list"
          showBanner
          courseInfo={{
            courseName: vm.selectedCourse?.courseName ?? '',
            venue: vm.selectedCourse?.clubName ? { name: vm.selectedCourse.clubName } as Club : undefined,
          }}
        />
      )}

      {/* Step 4: Score Entry */}
      {vm.step === 'scores' && (
        <>
          <QuickScoreTotalsBar
            totalGross={vm.totals.totalGross}
            totalNet={vm.totals.totalNet}
            totalPoints={vm.totals.totalPoints}
            holesEntered={vm.totals.holesEntered}
            totalHoles={vm.holes.length}
          />
          <FlatList
            data={vm.holes}
            keyExtractor={(hole) => String(hole.number)}
            contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
            renderItem={({ item: hole }) => (
              <QuickScoreHoleRow
                holeNumber={hole.number}
                par={hole.par}
                strokeIndex={hole.strokeIndex}
                score={vm.scores[String(hole.number)]}
                stablefordPoints={vm.holePoints[String(hole.number)] ?? 0}
                onIncrement={() => vm.incrementScore(hole.number)}
                onDecrement={() => vm.decrementScore(hole.number)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          <View style={[styles.saveButtonContainer, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={vm.handleGoToReview}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveButtonText, { color: colors.white }]}>Review & Save</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Step 5: Review */}
      {vm.step === 'review' && (
        <QuickScoreReviewModal
          visible={true}
          playerName={vm.selectedPlayer?.name ?? 'Player'}
          courseName={vm.selectedCourse?.courseName ?? 'Course'}
          totalGross={vm.totals.totalGross}
          totalNet={vm.totals.totalNet}
          totalPoints={vm.totals.totalPoints}
          holesEntered={vm.totals.holesEntered}
          totalHoles={vm.holes.length}
          handicapDifferential={vm.handicapDifferential}
          isSaving={vm.isSaving}
          onConfirm={vm.handleConfirmSave}
          onCancel={() => vm.goToStep('scores')}
        />
      )}

      {/* Confirmation dialog (replaces Alert.alert) */}
      <ConfirmationDialog {...vm.dialogConfig} onCancel={vm.dismissDialog} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  listItemName: {
    ...typography.bodyBold,
    flex: 1,
  },
  listItemMeta: {
    ...typography.small,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    padding: spacing.xl,
  },
  separator: {
    height: spacing.xs,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadows.md,
  },
  saveButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});
