/**
 * RoundDetailsStep - Step for adding round details in competition wizard
 *
 * Features:
 * - Add multiple rounds (limited by subscription tier)
 * - Course selection via full-screen modal
 * - Tee box selection
 * - Date and time pickers
 * - Match type (game format) selection
 * - Scoring pairs toggle (Premium feature)
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Button, Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { useRoundDetailsForm } from './hooks/useRoundDetailsForm';
import { RoundCard } from './components/RoundCard';
import { MatchTypeModal } from './components/MatchTypeModal';
import { CourseSelectionModal } from './components/CourseSelectionModal';
import { TeeSelectionModal } from './components/TeeSelectionModal';
import type { RoundDetailsStepProps } from './types';

export default function RoundDetailsStep({
  initialData,
  onComplete,
  onBack,
  allowedGameTypes,
  maxRoundsPerCompetition,
}: RoundDetailsStepProps) {
  const colors = useThemeColors();
  const isPremium = useIsPremium();
  const insets = useSafeAreaInsets();

  const form = useRoundDetailsForm({
    initialData,
    allowedGameTypes,
    maxRoundsPerCompetition,
    onComplete,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Step Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Add rounds to your competition. Each round can have a different course and date.
        </Text>

        {/* Rounds List */}
        {form.rounds.map((round, index) => (
          <RoundCard
            key={index}
            round={round}
            index={index}
            errors={form.errors[index] || {}}
            isRemovable={form.rounds.length > 1}
            availableTees={form.getAvailableTeesForRound(round)}
            isPremium={isPremium}
            onUpdate={(updates) => form.updateRound(index, updates)}
            onRemove={() => form.removeRound(index)}
            onOpenCourseModal={() => form.openCourseModal(index)}
            onOpenTeeModal={() => form.openTeeModal(index)}
            onOpenMatchTypeModal={() => form.openMatchTypeModal(index)}
          />
        ))}

        {/* Add Round Button */}
        {form.canAddRound && (
          <TouchableOpacity onPress={form.addRound} style={styles.addRoundButton} activeOpacity={0.7}>
            <View
              style={[
                styles.addRoundCard,
                { borderColor: colors.primary, backgroundColor: colors.primaryLighter },
              ]}
            >
              <Icon source="plus-circle-outline" size={24} color={colors.primary} />
              <Text style={[styles.addRoundText, { color: colors.primary }]}>
                Add Another Round
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Show limit reached message */}
        {!form.canAddRound && form.effectiveMaxRounds < 10 && (
          <View
            style={[styles.limitReachedBox, { backgroundColor: colors.warningLight }]}
          >
            <Icon source="information" size={20} color={colors.warning} />
            <Text style={[styles.limitReachedText, { color: colors.warning }]}>
              Maximum {form.effectiveMaxRounds} round
              {form.effectiveMaxRounds === 1 ? '' : 's'} on your plan. Upgrade for more rounds.
            </Text>
          </View>
        )}

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            You can add up to 10 rounds per competition. Players will be able to enter scores for
            each round separately.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons - Sticky Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            backgroundColor: colors.surface,
            borderTopColor: colors.gray200,
          },
        ]}
      >
        <Button
          mode="outlined"
          onPress={onBack}
          style={[styles.backButton, { borderColor: colors.gray300 }]}
          contentStyle={styles.buttonContent}
          textColor={colors.textSecondary}
          theme={{ colors: { outline: colors.gray300 } }}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={form.handleSubmit}
          style={styles.nextButton}
          contentStyle={styles.buttonContent}
          buttonColor={colors.primary}
          textColor={colors.white}
        >
          Next: Add Players
        </Button>
      </View>

      {/* Modals */}
      <MatchTypeModal
        visible={form.showMatchTypeModal}
        selectedMatchType={
          form.editingMatchTypeRoundIndex !== null
            ? form.rounds[form.editingMatchTypeRoundIndex]?.matchType || 'stableford'
            : 'stableford'
        }
        availableGameTypes={form.availableGameTypes}
        onSelect={form.handleMatchTypeSelect}
        onClose={form.handleCloseMatchTypeModal}
      />

      <CourseSelectionModal
        visible={form.showCourseModal}
        displayItems={form.displayItems}
        favoriteCourses={form.favoriteCourses}
        courseSearchQuery={form.courseSearchQuery}
        isLoading={form.isLoadingCourses}
        isSearching={form.isSearching}
        onCourseSelect={form.handleCourseSelect}
        onSearchChange={form.setCourseSearchQuery}
        onClose={form.handleCloseCourseModal}
      />

      <TeeSelectionModal
        visible={form.showTeeModal}
        availableTees={
          form.editingTeeRoundIndex !== null
            ? form.getAvailableTeesForRound(form.rounds[form.editingTeeRoundIndex])
            : []
        }
        selectedTeeName={
          form.editingTeeRoundIndex !== null
            ? form.rounds[form.editingTeeRoundIndex]?.selectedTee?.name
            : undefined
        }
        onSelect={form.handleTeeSelect}
        onClose={form.handleCloseTeeModal}
      />
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  addRoundButton: {
    marginBottom: spacing.lg,
  },
  addRoundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  addRoundText: {
    ...typography.bodyBold,
  },
  limitReachedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  limitReachedText: {
    ...typography.small,
    flex: 1,
  },
  infoBox: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  infoText: {
    ...typography.small,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  backButton: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  nextButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    height: 48,
  },
});

export type { RoundDetailsStepProps };
