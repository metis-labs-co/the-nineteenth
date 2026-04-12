/**
 * RoundGameSetupTab - Game configuration tab for ViewRoundScreen
 *
 * Houses configuration sections for optional game features:
 * - Player Groups (Pairings with tee times)
 * - Scoring Pairs (Premium feature for competitive rounds)
 * - Skins Game (Side betting game)
 *
 * Visible to organizers always (to configure), and to players
 * when features are already configured (read-only).
 *
 * Note: Wolf game results are displayed on the dedicated Wolf tab of
 * ViewRoundScreen, not here. The settings screen intentionally omits
 * wolf scorecard/standings to keep it focused on configuration.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import {
  PairingsSection,
  ScoringPairsSection,
  SkinsGameSection,
} from './RoundDetailsTab/components';
import type { RoundWithCourse } from '@/hooks/useRoundDetails';
import type { RoundStatus } from '@/types/database/enums';
import type { Player } from '@/types';

export interface RoundGameSetupTabProps {
  round: RoundWithCourse;
  isOrganizer: boolean;
  /** Players available for grouping */
  players?: Player[];
  onScoringPairsEditPress?: () => void;
  onSkinsEditPress?: () => void;
}

export const RoundGameSetupTab = React.memo(function RoundGameSetupTab({
  round,
  isOrganizer,
  players = [],
  onScoringPairsEditPress,
  onSkinsEditPress,
}: RoundGameSetupTabProps) {
  const colors = useThemeColors();

  // Only show pairings for rounds with more than 4 players
  const showPairings = players.length > 4;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <Text style={[styles.headerText, { color: colors.textSecondary }]}>
        Configure optional game features for this round
      </Text>

      {/* Player Groups Section - For rounds with >4 players */}
      {showPairings && (
        <PairingsSection
          roundId={round.id}
          players={players}
          defaultTeeTime={round.tee_time}
          canEdit={isOrganizer}
        />
      )}

      {/* Scoring Pairs Section - Premium Feature */}
      <ScoringPairsSection
        roundId={round.id}
        scoringPairsRequired={round.scoring_pairs_required}
        cardBackground={colors.surface}
        roundStatus={round.status as RoundStatus}
        onEditPress={isOrganizer ? onScoringPairsEditPress : undefined}
      />

      {/* Skins Game Section */}
      <SkinsGameSection
        roundId={round.id}
        roundStatus={round.status as RoundStatus}
        cardBackground={colors.surface}
        onEditPress={isOrganizer ? onSkinsEditPress : undefined}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  headerText: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
});

export default RoundGameSetupTab;
