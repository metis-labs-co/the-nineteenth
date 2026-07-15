/**
 * BracketStageView - Vertical list of match cards for one stage
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { SectionLabel } from '@/components/common';
import { KnockoutMatchCard } from './KnockoutMatchCard';
import type { BracketStage, KnockoutMatchWithPlayers } from '@/types/database';

export interface BracketStageViewProps {
  stage: BracketStage;
  currentUserId?: string;
  onMatchPress?: (match: KnockoutMatchWithPlayers) => void;
}

export const BracketStageView = React.memo(function BracketStageView({
  stage,
  currentUserId,
  onMatchPress,
}: BracketStageViewProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <SectionLabel style={styles.stageTitle}>{stage.stageName}</SectionLabel>
      <Text style={[styles.matchCount, { color: colors.textTertiary }]}>
        {stage.matches.length} {stage.matches.length === 1 ? 'match' : 'matches'}
      </Text>
      <View style={styles.matchList}>
        {stage.matches.map((match) => (
          <KnockoutMatchCard
            key={match.id}
            match={match}
            currentUserId={currentUserId}
            onPress={onMatchPress}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.lg,
  },
  stageTitle: {
    marginBottom: spacing.xs,
  },
  matchCount: {
    fontSize: 11.5,
    marginHorizontal: 2,
    marginBottom: spacing.md,
  },
  matchList: {
    gap: spacing.md,
  },
});
