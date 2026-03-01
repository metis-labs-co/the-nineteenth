/**
 * LadderTab - Shows ladder positions with challenge buttons
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import LadderRow from '@/components/leagues/LadderRow';
import type { LadderStandingsEntry } from '@/types/database';

interface LadderTabProps {
  standings: LadderStandingsEntry[];
  currentUserId: string | undefined;
  currentUserPosition: number | null;
  challengeRange: number;
  hasActiveChallenge: boolean;
  onChallenge: (playerId: string) => void;
}

export default function LadderTab({
  standings,
  currentUserId,
  currentUserPosition,
  challengeRange,
  hasActiveChallenge,
  onChallenge,
}: LadderTabProps) {
  const colors = useThemeColors();

  if (standings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon source="ladder" size={48} color={colors.gray300} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No players on the ladder yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {standings.map((entry) => {
        const isCurrentUser = entry.player_id === currentUserId;
        const canChallenge =
          !isCurrentUser &&
          !hasActiveChallenge &&
          currentUserPosition != null &&
          currentUserPosition > entry.ladder_position &&
          currentUserPosition - entry.ladder_position <= challengeRange &&
          !entry.active_challenge_id;

        return (
          <LadderRow
            key={entry.player_id}
            entry={entry}
            isCurrentUser={isCurrentUser}
            canChallenge={canChallenge}
            hasActiveChallenge={hasActiveChallenge}
            onChallenge={() => onChallenge(entry.player_id)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
  },
});
