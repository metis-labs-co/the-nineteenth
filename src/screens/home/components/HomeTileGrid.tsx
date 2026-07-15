import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';
import { StatsTile } from './tiles/StatsTile';
import { AchievementsTile } from './tiles/AchievementsTile';
import { CompetitionsTile } from './tiles/CompetitionsTile';
import { LastRoundTile } from './tiles/LastRoundTile';
import type { StatsHighlights } from '@/types/home';
import type { AchievementSummaryStats } from '@/hooks/home/useHomeData';
import type { Competition } from '@/types';
import type { League } from '@/types/database/league.types';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';

interface HomeTileGridProps {
  stats: StatsHighlights | null;
  achievementSummary: AchievementSummaryStats | null;
  achievementsInProgressCount: number;
  competitions: Competition[];
  leagues: League[];
  lastRound: RoundItem | null;
}

export function HomeTileGrid({
  stats,
  achievementSummary,
  achievementsInProgressCount,
  competitions,
  leagues,
  lastRound,
}: HomeTileGridProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <StatsTile stats={stats} />
        <AchievementsTile summary={achievementSummary} inProgressCount={achievementsInProgressCount} />
      </View>
      <View style={styles.row}>
        <CompetitionsTile competitions={competitions} leagues={leagues} />
        <LastRoundTile round={lastRound} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
