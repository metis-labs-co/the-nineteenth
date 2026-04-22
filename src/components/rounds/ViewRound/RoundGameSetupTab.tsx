/**
 * RoundGameSetupTab - Game configuration tab for ViewRoundScreen
 *
 * Houses configuration sections for optional game features:
 * - Scoring Pairs (Premium feature for competitive rounds)
 * - Skins Game (Side betting game)
 *
 * Visible to organizers always (to configure), and to players
 * when features are already configured (read-only).
 *
 * Player groups / tee-group pairings live on the dedicated Groups tab
 * (alongside the shuffle + scoring-pairs quick link) and are no longer
 * surfaced here to avoid two places to edit the same data.
 *
 * Note: Wolf game results are displayed on the dedicated Wolf tab of
 * ViewRoundScreen, not here. The settings screen intentionally omits
 * wolf scorecard/standings to keep it focused on configuration.
 */

import React, { useCallback } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { updateRound } from '@/screens/admin/EditRoundScreen/hooks/useEditRoundData';
import { roundKeys } from '@/hooks/queryKeys';
import {
  ScoringPairsSection,
  SkinsGameSection,
} from './RoundDetailsTab/components';
import type { RoundWithCourse } from '@/hooks/useRoundDetails';
import type { RoundStatus } from '@/types/database/enums';
import type { Player } from '@/types';

export interface RoundGameSetupTabProps {
  round: RoundWithCourse;
  isOrganizer: boolean;
  /** Players on the round — used to decide whether to show the scoring
   *  pairs section (requires at least 2 players) and whether pair
   *  management happens here (≤4) or on the Groups tab (>4). */
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
  const queryClient = useQueryClient();

  // Scoring pairs only applies to individual, multi-player rounds.
  // Team rounds have their own natural scoring flow (teammates score each
  // other) and Scramble has no per-player cards at all, so the designated-
  // marker concept doesn't translate. Solo rounds are also excluded since
  // there's nobody to pair with.
  const showScoringPairs = players.length > 1 && !round.is_team_round;

  // Flip round.scoring_pairs_required. For >4-player rounds this just
  // gates the Groups-tab "Scoring pairs" button; for ≤4-player rounds
  // it also drives whether the pair-management card below is visible.
  const handleToggleScoringPairs = useCallback(
    async (enabled: boolean) => {
      try {
        await updateRound(round.id, { scoring_pairs_required: enabled });
        queryClient.invalidateQueries({ queryKey: roundKeys.detail(round.id) });
      } catch (err) {
        Alert.alert(
          'Unable to update scoring pairs',
          err instanceof Error ? err.message : 'Please try again.'
        );
      }
    },
    [round.id, queryClient]
  );

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <Text style={[styles.headerText, { color: colors.textSecondary }]}>
        Configure optional game features for this round
      </Text>

      {/* Scoring Pairs Section - Premium Feature, multi-player only */}
      {showScoringPairs && (
        <ScoringPairsSection
          roundId={round.id}
          scoringPairsRequired={round.scoring_pairs_required}
          cardBackground={colors.surface}
          roundStatus={round.status as RoundStatus}
          onEditPress={isOrganizer ? onScoringPairsEditPress : undefined}
          playerCount={players.length}
          onToggleEnabled={isOrganizer ? handleToggleScoringPairs : undefined}
        />
      )}

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
