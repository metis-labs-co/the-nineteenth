/**
 * LadderTab - Shows ladder positions with challenge buttons
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { EmptyState } from '@/components/common/EmptyState';
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
      <EmptyState
        title="No players on the ladder yet"
        message="Players will appear here once they join the league"
        icon="ladder"
        compact
      />
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
});
