import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeTile } from '../HomeTile';
import type { RootStackParamList } from '@/navigation/types';
import type { AchievementSummaryStats } from '@/hooks/home/useHomeData';

interface Props {
  summary: AchievementSummaryStats | null;
  inProgressCount: number;
}

export function AchievementsTile({ summary, inProgressCount }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const headline = summary ? `${summary.totalEarned}` : null;
  const subtext = inProgressCount > 0 ? `${inProgressCount} close to unlocking` : 'Earn your first';

  return (
    <HomeTile
      testID="tile-achievements"
      icon="trophy"
      title="Achievements"
      headline={headline}
      subtext={subtext}
      onPress={() => navigation.navigate('Achievements')}
    />
  );
}
