/**
 * SimplifiedRoundDetailsStep - Simplified rounds step for the new wizard flow
 *
 * Features:
 * - Round count selector (how many rounds?)
 * - Simplified round cards showing configured/unconfigured state
 * - Bottom sheet for optional round configuration
 * - All fields optional - allows creating "blank" placeholder rounds
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { createBlankRound } from '@/schemas/competition';
import type { SimplifiedRoundFormData } from '@/schemas/competition';
import type { SimplifiedRoundDetailsStepProps } from './types';
import { RoundCountSelector } from './components/RoundCountSelector';
import { SimplifiedRoundCard } from './components/SimplifiedRoundCard';
import { EditRoundBottomSheet } from './components/EditRoundBottomSheet';

export function SimplifiedRoundDetailsStep({
  initialData,
  onComplete,
  onBack,
  allowedGameTypes,
  maxRoundsPerCompetition,
  competitionStartDate,
}: SimplifiedRoundDetailsStepProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Calculate effective max rounds
  const effectiveMax =
    maxRoundsPerCompetition && maxRoundsPerCompetition > 0 ? maxRoundsPerCompetition : 10;

  // Initialize rounds from initial data or create one blank round
  const [rounds, setRounds] = useState<SimplifiedRoundFormData[]>(() => {
    if (initialData && initialData.length > 0) {
      return initialData;
    }
    return [createBlankRound(competitionStartDate)];
  });

  // Track which round is being edited
  const [editingRoundIndex, setEditingRoundIndex] = useState<number | null>(null);

  // Round count
  const roundCount = rounds.length;

  // Handle count change - add or remove rounds
  const handleCountChange = useCallback(
    (newCount: number) => {
      if (newCount === roundCount) return;

      if (newCount > roundCount) {
        // Add blank rounds
        const newRounds = [...rounds];
        for (let i = roundCount; i < newCount; i++) {
          newRounds.push(createBlankRound(competitionStartDate));
        }
        setRounds(newRounds);
      } else {
        // Remove rounds from end
        setRounds(rounds.slice(0, newCount));
      }
    },
    [roundCount, rounds, competitionStartDate]
  );

  // Handle saving a round from bottom sheet
  const handleSaveRound = useCallback(
    (updatedRound: SimplifiedRoundFormData) => {
      if (editingRoundIndex === null) return;

      const newRounds = [...rounds];
      newRounds[editingRoundIndex] = updatedRound;
      setRounds(newRounds);
      setEditingRoundIndex(null);
    },
    [editingRoundIndex, rounds]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    onComplete(rounds);
  }, [onComplete, rounds]);

  // Count configured rounds
  const configuredCount = rounds.filter((r) => r.isConfigured || !!r.courseId).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Set up your competition rounds. You can configure details now or leave them to fill in
          later.
        </Text>

        {/* Round Count Selector */}
        <RoundCountSelector
          count={roundCount}
          maxCount={effectiveMax}
          onChange={handleCountChange}
        />

        {/* Rounds List */}
        <View style={styles.roundsList}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Rounds ({configuredCount}/{roundCount} configured)
          </Text>
          {rounds.map((round, index) => (
            <SimplifiedRoundCard
              key={index}
              round={round}
              roundNumber={index + 1}
              onPress={() => setEditingRoundIndex(index)}
            />
          ))}
        </View>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Rounds without a course will need to be configured before players can enter scores. You
            can do this from the competition details screen after creation.
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
          onPress={handleSubmit}
          style={styles.nextButton}
          contentStyle={styles.buttonContent}
          buttonColor={colors.primary}
          textColor={colors.white}
        >
          Next: Review
        </Button>
      </View>

      {/* Edit Round Bottom Sheet */}
      <EditRoundBottomSheet
        visible={editingRoundIndex !== null}
        round={editingRoundIndex !== null ? rounds[editingRoundIndex] : createBlankRound()}
        roundNumber={(editingRoundIndex ?? 0) + 1}
        onClose={() => setEditingRoundIndex(null)}
        onSave={handleSaveRound}
        allowedGameTypes={allowedGameTypes}
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
  roundsList: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
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

export default SimplifiedRoundDetailsStep;
