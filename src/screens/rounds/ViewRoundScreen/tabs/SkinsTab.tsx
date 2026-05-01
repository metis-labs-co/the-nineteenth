/**
 * SkinsTab - Skins game results tab content
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { SkinsResultsCard } from '@/components/skins';
import { useSkinsGamesByRound } from '@/hooks/skins';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import type {
  SkinsResultWithWinner,
  SkinsResultWithTeamWinner,
  SkinsPotType,
  SkinsScoringType,
  SkinsParticipant,
  SkinsTeamParticipant,
} from '@/types/database/skins.types';

interface SkinsTabProps {
  /** Round id — drives the sub-match-skins-active banner. */
  roundId?: string;
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
  roundId,
  results,
  potType,
  potValue,
  scoringType,
  participants,
  isTeamSkins,
  teams,
  parValues,
}: SkinsTabProps) {
  const { data: allGames } = useSkinsGamesByRound(roundId);

  const subMatchActiveCount = useMemo(() => {
    if (!allGames) return 0;
    return allGames.filter((g) => g.sub_match_id && g.status === 'active').length;
  }, [allGames]);

  return (
    <View style={styles.skinsTabContent}>
      {subMatchActiveCount > 0 ? (
        <SubMatchActiveBanner count={subMatchActiveCount} />
      ) : null}
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

function SubMatchActiveBanner({ count }: { count: number }) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: `${colors.info}10`, borderColor: colors.info },
      ]}
    >
      <Icon source="information-outline" size={16} color={colors.info} />
      <Text style={[typography.small, { color: colors.textPrimary, flex: 1 }]}>
        {count === 1
          ? '1 sub-match skins game is also running on this round. Tap a sub-match for details.'
          : `${count} sub-match skins games are also running on this round. Tap a sub-match for details.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  skinsTabContent: {
    gap: spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
});
