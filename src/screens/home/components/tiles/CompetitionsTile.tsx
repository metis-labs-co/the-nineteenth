import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeTile } from '../HomeTile';
import type { RootStackParamList } from '@/navigation/types';
import type { Competition } from '@/types';
import type { League } from '@/types/database/league.types';

interface Props {
  competitions: Competition[];
  leagues: League[];
}

export function CompetitionsTile({ competitions, leagues }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const total = competitions.length + leagues.length;

  const headline = total > 0 ? `${total}` : null;
  const subtext = total > 0
    ? `${competitions.length} comps · ${leagues.length} leagues`
    : 'No active comps';

  return (
    <HomeTile
      testID="tile-competitions"
      icon="flag-checkered"
      title="Competitions"
      headline={headline}
      subtext={subtext}
      onPress={() => navigation.navigate('MainTabs', { screen: 'CompeteTab' })}
    />
  );
}
