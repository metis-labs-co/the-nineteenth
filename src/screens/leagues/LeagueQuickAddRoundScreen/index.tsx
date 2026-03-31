/**
 * LeagueQuickAddRoundScreen - Superadmin wizard to add a round to a league
 *
 * Steps: Player → Course → Tee → Scores → Review
 */

import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Icon, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { CourseSelectionModal } from '@/screens/admin/AddRoundScreen/components';
import type { TeeBox } from '@/types/database.types';

import { useLeagueQuickAddRound, type WizardStep } from './useLeagueQuickAddRound';
import QuickScoreHoleRow from '@/screens/scoring/QuickScoreEntryScreen/QuickScoreHoleRow';
import QuickScoreTotalsBar from '@/screens/scoring/QuickScoreEntryScreen/QuickScoreTotalsBar';
import QuickScoreReviewModal from '@/screens/scoring/QuickScoreEntryScreen/QuickScoreReviewModal';

type Props = NativeStackScreenProps<RootStackParamList, 'LeagueQuickAddRound'>;

export default function LeagueQuickAddRoundScreen({ route }: Props) {
  const { leagueId } = route.params;
  const colors = useThemeColors();
  const vm = useLeagueQuickAddRound({ leagueId });
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showCourseModal, setShowCourseModal] = useState(false);

  const stepTitles: Record<WizardStep, string> = {
    player: 'Select Player',
    course: 'Select Course',
    tee: 'Select Tee',
    scores: 'Enter Scores',
    review: 'Review',
  };

  const canGoBack = vm.step !== 'player';
  const handleBack = () => {
    const order: WizardStep[] = ['player', 'course', 'tee', 'scores', 'review'];
    const idx = order.indexOf(vm.step);
    if (idx > 0) vm.goToStep(order[idx - 1]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={`Add Round — ${stepTitles[vm.step]}`}
        showBack
        onBack={canGoBack ? handleBack : undefined}
      />

      {/* Step 1: Player Selection */}
      {vm.step === 'player' && (
        <FlatList
          data={vm.players ?? []}
          keyExtractor={(item) => item.player_id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() =>
                vm.handleSelectPlayer({
                  id: item.player_id,
                  name: (item as any).player?.name ?? 'Unknown',
                  handicap: (item as any).player?.handicap ?? null,
                  handicap_index: (item as any).player?.handicap_index ?? null,
                  gender: (item as any).player?.gender ?? null,
                })
              }
            >
              <Text style={[styles.listItemName, { color: colors.textPrimary }]}>
                {(item as any).player?.name ?? 'Unknown'}
              </Text>
              <Text style={[styles.listItemMeta, { color: colors.textSecondary }]}>
                HC: {(item as any).player?.handicap ?? 'N/A'}
              </Text>
              <Icon source="chevron-right" size={20} color={colors.gray400} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No league members found
            </Text>
          }
        />
      )}

      {/* Step 2: Course Selection */}
      {vm.step === 'course' && (
        <View style={styles.stepContent}>
          {/* Date picker */}
          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Round Date</Text>
            <TextInput
              mode="outlined"
              value={vm.roundDate}
              onChangeText={vm.setRoundDate}
              placeholder="YYYY-MM-DD"
              style={styles.dateInput}
              dense
            />
          </View>

          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowCourseModal(true)}
          >
            <Icon source="golf" size={24} color={colors.primary} />
            <Text style={[styles.selectButtonText, { color: colors.textPrimary }]}>
              {vm.courseDetails ? vm.courseDetails.name : 'Search for a course...'}
            </Text>
            <Icon source="magnify" size={20} color={colors.gray400} />
          </TouchableOpacity>

          <CourseSelectionModal
            visible={showCourseModal}
            onClose={() => setShowCourseModal(false)}
            onSelect={(course) => {
              setShowCourseModal(false);
              vm.handleSelectCourse(course.id);
            }}
            searchQuery={courseSearchQuery}
            onSearchQueryChange={setCourseSearchQuery}
          />
        </View>
      )}

      {/* Step 3: Tee Selection */}
      {vm.step === 'tee' && (
        <FlatList
          data={vm.tees}
          keyExtractor={(item) => item.tee_id ?? item.name}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => vm.handleSelectTee(item)}
            >
              <View style={[styles.teeColor, { backgroundColor: item.color ?? colors.gray400 }]} />
              <View style={styles.teeInfo}>
                <Text style={[styles.listItemName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.listItemMeta, { color: colors.textSecondary }]}>
                  CR: {item.courseRating ?? '–'} · SR: {item.slopeRating ?? '–'}
                </Text>
              </View>
              <Icon source="chevron-right" size={20} color={colors.gray400} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No tees available for this course
            </Text>
          }
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
          courseName={vm.courseDetails?.name ?? 'Course'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: spacing.lg,
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
  teeColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  teeInfo: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dateLabel: {
    ...typography.bodyBold,
  },
  dateInput: {
    flex: 1,
    maxWidth: 160,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  selectButtonText: {
    ...typography.body,
    flex: 1,
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
