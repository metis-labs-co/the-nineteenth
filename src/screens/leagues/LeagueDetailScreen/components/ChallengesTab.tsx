/**
 * ChallengesTab - Active and completed challenges for ladder leagues
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { EmptyState } from '@/components/common/EmptyState';
import ChallengeCard from '@/components/leagues/ChallengeCard';
import type { LadderChallengeWithPlayers } from '@/types/database';

interface ChallengesTabProps {
  challenges: LadderChallengeWithPlayers[];
  currentUserId: string | undefined;
  onChallengePress: (challengeId: string) => void;
  onAccept: (challengeId: string) => void;
  onDecline: (challengeId: string) => void;
}

export default function ChallengesTab({
  challenges,
  currentUserId,
  onChallengePress,
  onAccept,
  onDecline,
}: ChallengesTabProps) {
  const colors = useThemeColors();

  const activeChallenges = challenges.filter(
    (c) => c.status === 'pending' || c.status === 'accepted'
  );
  const completedChallenges = challenges.filter(
    (c) => c.status === 'completed' || c.status === 'declined' || c.status === 'expired' || c.status === 'cancelled'
  );

  if (challenges.length === 0) {
    return (
      <EmptyState
        title="No challenges yet"
        message="Challenge a player above you on the ladder to get started"
        icon="sword-cross"
        compact
      />
    );
  }

  return (
    <View style={styles.container}>
      {activeChallenges.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Active
          </Text>
          {activeChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              currentUserId={currentUserId}
              onPress={() => onChallengePress(challenge.id)}
              onAccept={() => onAccept(challenge.id)}
              onDecline={() => onDecline(challenge.id)}
            />
          ))}
        </>
      )}

      {completedChallenges.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
            History
          </Text>
          {completedChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              currentUserId={currentUserId}
              onPress={() => onChallengePress(challenge.id)}
            />
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
});
