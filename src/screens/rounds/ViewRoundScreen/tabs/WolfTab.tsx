/**
 * WolfTab - Wolf game results tab content
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconDog } from '@tabler/icons-react-native';
import { WolfResultsCard, WolfStandingsCard, WolfSettlementCard } from '@/components/wolf';
import { EmptyState } from '@/components/common/EmptyState';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, wolfColor } from '@/constants/theme';
import type { WolfGameSummary } from '@/types/database/wolf.types';

interface WolfTabProps {
  wolfSummary: WolfGameSummary | null | undefined;
  hasWolfGame: boolean;
}

export function WolfTab({ wolfSummary, hasWolfGame }: WolfTabProps) {
  const colors = useThemeColors();

  if (hasWolfGame && !wolfSummary) {
    return (
      <EmptyState
        icon="paw"
        title="No Wolf Results Yet"
        message="Wolf results will appear here as you complete each hole."
      />
    );
  }

  if (!wolfSummary) return null;

  return (
    <View style={styles.wolfTabContent}>
      {/* Wolf Results Table - Hole by hole breakdown */}
      <WolfResultsCard
        wolfGame={wolfSummary.game}
        decisions={wolfSummary.decisions}
        testID="wolf-results-card"
      />

      {/* Wolf Standings Card */}
      {wolfSummary.standings.length > 0 && (
        <WolfStandingsCard
          standings={wolfSummary.standings}
          potEnabled={wolfSummary.game.pot_enabled}
          testID="wolf-standings-card"
        />
      )}

      {/* Settlement Card (show when game is complete and pot is enabled) */}
      {wolfSummary.game.pot_enabled &&
        (wolfSummary.game.status === 'completed' || wolfSummary.payouts.length > 0) &&
        wolfSummary.game.pot_value_per_point && (
          <WolfSettlementCard
            payouts={wolfSummary.payouts}
            potValue={wolfSummary.game.pot_value_per_point}
            currency={wolfSummary.game.currency}
            testID="wolf-settlement-card"
          />
        )}

      {/* In-Progress Info */}
      {wolfSummary.game.status === 'active' && wolfSummary.holes_completed < 18 && (
        <View style={[styles.wolfInProgressCard, { backgroundColor: colors.surface }]}>
          <View style={styles.wolfInProgressHeader}>
            <IconDog size={20} color={wolfColor} />
            <Text style={[typography.bodyBold, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
              Game In Progress
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            {wolfSummary.holes_completed} of 18 holes completed
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wolfTabContent: {
    gap: spacing.md,
  },
  wolfInProgressCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  wolfInProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
