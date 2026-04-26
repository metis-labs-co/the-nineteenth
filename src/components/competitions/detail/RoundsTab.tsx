/**
 * RoundsTab - List of all rounds in a competition
 *
 * Uses CompetitionRoundCard for individual round display.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { ColorPalette } from '@/context/ThemeContext';
import type { RoundWithCourse } from './types';
import type { GameType } from '@/types';
import { CompetitionRoundCard } from './CompetitionRoundCard';
import { EmptyState, SwipeableRow } from '@/components/common';

export interface RoundsTabProps {
  rounds: RoundWithCourse[];
  isOrganizer: boolean;
  /** Number of players in the competition (used to validate scoring requirements) */
  playerCount: number;
  onAddRound: () => void;
  onScoreRound: (roundId: string, gameType: GameType, isTeamRound: boolean) => void;
  onViewRound: (roundId: string) => void;
  onQuickScore?: (roundId: string) => void;
  onManageScoringPairs?: (roundId: string) => void;
  /** Called when the organizer triggers swipe-to-delete on a round */
  onDeleteRound?: (round: RoundWithCourse) => void;
  /** Map of roundId to whether scoring pairs exist */
  scoringPairsStatus?: Record<string, boolean>;
  /** Map of roundId to whether all players have completed scorecards */
  allScoredStatus?: Record<string, boolean>;
  colors: ColorPalette;
}

export const RoundsTab = React.memo(function RoundsTab({
  rounds,
  isOrganizer,
  playerCount,
  onAddRound,
  onScoreRound,
  onViewRound,
  onQuickScore,
  onManageScoringPairs,
  onDeleteRound,
  scoringPairsStatus,
  allScoredStatus,
  colors,
}: RoundsTabProps) {
  const canSwipeDelete = isOrganizer && !!onDeleteRound;

  return (
    <View>
      {rounds.length === 0 ? (
        <EmptyState
          title="No rounds yet"
          message={isOrganizer ? 'Add a round to get started with your competition.' : "The organiser hasn't added any rounds yet."}
          icon="golf"
          compact
        />
      ) : (
        <View style={styles.roundsList}>
          {rounds.map((round, index) => {
            // Display number is derived from position so gaps left by deleted
            // rounds don't surface to users. The stored `round.round_number`
            // remains authoritative for IDs, ordering, and server references.
            const displayNumber = index + 1;
            const card = (
              <CompetitionRoundCard
                round={round}
                roundNumber={displayNumber}
                isOrganizer={isOrganizer}
                playerCount={playerCount}
                onScoreRound={onScoreRound}
                onViewRound={onViewRound}
                onQuickScore={onQuickScore}
                onManageScoringPairs={onManageScoringPairs}
                hasScoringPairs={scoringPairsStatus?.[round.id]}
                allPlayersScored={allScoredStatus?.[round.id]}
                colors={colors}
              />
            );

            if (!canSwipeDelete) {
              return <View key={round.id}>{card}</View>;
            }

            return (
              <SwipeableRow
                key={round.id}
                onDelete={() => onDeleteRound?.(round)}
                deleteAccessibilityLabel={`Delete round ${displayNumber}`}
              >
                {card}
              </SwipeableRow>
            );
          })}
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
});

export default RoundsTab;
