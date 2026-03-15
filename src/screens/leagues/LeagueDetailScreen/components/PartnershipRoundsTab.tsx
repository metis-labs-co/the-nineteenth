/**
 * PartnershipRoundsTab - Shows tagged rounds for the current user's partnership
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { EmptyState } from '@/components/common';
import { PartnershipRoundCard } from '@/components/leagues/PartnershipRoundCard';
import type { PartnershipRound, LeaguePartnership } from '@/types/database';

interface PartnershipRoundsTabProps {
  rounds: PartnershipRound[];
  partnership: LeaguePartnership | null;
  isArchived: boolean;
  onTagRound: () => void;
  onUntagRound?: (roundId: string) => void;
}

export default function PartnershipRoundsTab({
  rounds,
  partnership,
  isArchived,
  onTagRound,
  onUntagRound,
}: PartnershipRoundsTabProps) {
  const colors = useThemeColors();

  const handleUntag = (roundId: string) => {
    Alert.alert(
      'Remove Round',
      'Remove this round from the league?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onUntagRound?.(roundId) },
      ]
    );
  };

  if (!partnership) {
    return (
      <EmptyState
        icon="handshake"
        title="No Partnership"
        message="Form a partnership first to start tagging rounds."
        actionLabel="Form Partnership"
        onAction={onTagRound}
      />
    );
  }

  return (
    <View style={styles.container}>
      {!isArchived && (
        <TouchableOpacity
          onPress={onTagRound}
          style={[styles.tagButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
          accessibilityLabel="Tag a round"
        >
          <Icon source="plus" size={20} color={colors.white} />
          <Text style={[styles.tagButtonText, { color: colors.white }]}>Tag Round</Text>
        </TouchableOpacity>
      )}

      {!rounds.length ? (
        <EmptyState
          icon="golf"
          title="No Rounds Tagged"
          message="Tag your first round together to get on the leaderboard."
        />
      ) : (
        <View style={styles.roundsList}>
          {rounds.map((round) => (
            <PartnershipRoundCard
              key={round.id}
              round={round}
              onUntag={!isArchived ? handleUntag : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  tagButtonText: {
    ...typography.bodyBold,
  },
  roundsList: {
    gap: spacing.sm,
  },
});
