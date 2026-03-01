/**
 * SkinsTab - Skins game results tab content
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkinsResultsCard } from '@/components/skins';
import { spacing } from '@/constants/theme';
import type {
  SkinsResultWithWinner,
  SkinsResultWithTeamWinner,
  SkinsPotType,
  SkinsScoringType,
  SkinsParticipant,
  SkinsTeamParticipant,
} from '@/types/database/skins.types';

interface SkinsTabProps {
  results: SkinsResultWithWinner[] | SkinsResultWithTeamWinner[];
  potType: SkinsPotType;
  potValue: number;
  scoringType: SkinsScoringType;
  participants: SkinsParticipant[];
  isTeamSkins: boolean;
  teams?: SkinsTeamParticipant[];
  parValues: Record<number, number>;
}

export function SkinsTab({
  results,
  potType,
  potValue,
  scoringType,
  participants,
  isTeamSkins,
  teams,
  parValues,
}: SkinsTabProps) {
  return (
    <View style={styles.skinsTabContent}>
      <SkinsResultsCard
        results={results as SkinsResultWithWinner[]}
        potType={potType}
        potValue={potValue}
        scoringType={scoringType}
        participants={participants}
        isTeamSkins={isTeamSkins}
        teams={teams}
        parValues={parValues}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  skinsTabContent: {
    gap: spacing.md,
  },
});
