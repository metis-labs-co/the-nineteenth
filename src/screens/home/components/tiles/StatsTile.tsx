import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeTile } from '../HomeTile';
import type { RootStackParamList } from '@/navigation/types';
import type { StatsHighlights } from '@/types/home';

interface Props {
  stats: StatsHighlights | null;
}

export function StatsTile({ stats }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const headline = stats?.handicap != null ? stats.handicap.toFixed(1) : null;
  const subtext = (() => {
    if (!stats) return 'Play 3 rounds to unlock';
    const avg = stats.scoringAverage != null ? `avg ${Math.round(stats.scoringAverage)}` : null;
    const last5 = stats.last5Average != null ? `last 5: ${Math.round(stats.last5Average)}` : null;
    return [avg, last5].filter(Boolean).join(' · ') || 'No stats yet';
  })();

  return (
    <HomeTile
      testID="tile-stats"
      icon="chart-line"
      title="Stats"
      headline={headline}
      subtext={subtext}
      onPress={() => navigation.navigate('MyStatistics')}
    />
  );
}
