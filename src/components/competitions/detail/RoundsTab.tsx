/**
 * RoundsTab - List of all rounds in a competition
 *
 * Uses CompetitionRoundCard for individual round display.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Surface } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { ColorPalette } from '@/context/ThemeContext';
import type { RoundWithCourse } from './types';
import { CompetitionRoundCard } from './CompetitionRoundCard';

export interface RoundsTabProps {
  rounds: RoundWithCourse[];
  isOrganizer: boolean;
  onAddRound: () => void;
  onScoreRound: (roundId: string) => void;
  onViewRound: (roundId: string) => void;
  onManageScoringPairs?: (roundId: string) => void;
  /** Map of roundId to whether scoring pairs exist */
  scoringPairsStatus?: Record<string, boolean>;
  colors: ColorPalette;
}

export const RoundsTab = React.memo(function RoundsTab({
  rounds,
  isOrganizer,
  onAddRound,
  onScoreRound,
  onViewRound,
  onManageScoringPairs,
  scoringPairsStatus,
  colors,
}: RoundsTabProps) {
  return (
    <View>
      {rounds.length === 0 ? (
        <Surface style={[styles.card, { backgroundColor: colors.white }]} elevation={1}>
          <View style={styles.emptyState}>
            <Icon source="golf" size={48} color={colors.gray300} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No rounds yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              {isOrganizer
                ? 'Add a round to get started with your competition.'
                : "The organizer hasn't added any rounds yet."}
            </Text>
          </View>
        </Surface>
      ) : (
        <View style={styles.roundsList}>
          {rounds.map((round) => (
            <CompetitionRoundCard
              key={round.id}
              round={round}
              roundNumber={round.round_number}
              isOrganizer={isOrganizer}
              onScoreRound={onScoreRound}
              onViewRound={onViewRound}
              onManageScoringPairs={onManageScoringPairs}
              hasScoringPairs={scoringPairsStatus?.[round.id]}
              colors={colors}
            />
          ))}
        </View>
      )}

      {/* Add Round Button */}
      {isOrganizer && (
        <TouchableOpacity
          style={[styles.addRoundButton, { borderColor: colors.primary }]}
          onPress={onAddRound}
          accessibilityLabel="Add another round"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Icon source="plus" size={20} color={colors.primary} />
          <Text style={[styles.addRoundButtonText, { color: colors.primary }]}>Add another round</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  roundsList: {
    gap: spacing.md,
  },
  addRoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
  addRoundButtonText: {
    ...typography.bodyBold,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.bodyBold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default RoundsTab;
