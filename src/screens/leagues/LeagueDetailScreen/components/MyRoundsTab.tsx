/**
 * MyRoundsTab - Current user's tagged rounds with "Tag Round" button
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { EmptyState } from '@/components/common/EmptyState';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { LeagueRound } from '@/types/database';
import { LeagueRoundCard } from '@/components/leagues';

interface Props {
  rounds: LeagueRound[] | undefined;
  leagueId: string;
  isArchived: boolean;
  onTagRound: () => void;
}

export default React.memo(function MyRoundsTab({
  rounds,
  leagueId,
  isArchived,
  onTagRound,
}: Props) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      {!isArchived && (
        <TouchableOpacity
          onPress={onTagRound}
          style={[styles.tagButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
          accessibilityLabel="Tag a round to this league"
        >
          <Icon source="plus" size={20} color={colors.white} />
          <Text style={[styles.tagButtonText, { color: colors.white }]}>Tag Round</Text>
        </TouchableOpacity>
      )}

      {rounds && rounds.length > 0 ? (
        rounds.map((round) => (
          <LeagueRoundCard key={round.id} round={round} leagueId={leagueId} />
        ))
      ) : (
        <EmptyState
          icon="golf"
          title="No rounds tagged"
          message="You haven't tagged any rounds to this league yet."
          compact
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  tagButtonText: {
    ...typography.bodyBold,
  },
});
