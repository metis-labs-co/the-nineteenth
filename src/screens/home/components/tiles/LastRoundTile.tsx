import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeTile } from '../HomeTile';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';

interface Props {
  round: RoundItem | null;
}

function daysAgo(dateLike: string | Date | null | undefined): number | null {
  if (!dateLike) return null;
  const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function LastRoundTile({ round }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const totalGross = round?.userScore?.totalGross;
  const headline = totalGross != null ? `${totalGross}` : null;
  const subtext = (() => {
    if (!round) return 'No completed rounds';
    const ago = daysAgo(round.date);
    const courseName = round.course?.name ?? '';
    const agoLabel = ago == null ? '' : `${ago}d ago`;
    return [courseName, agoLabel].filter(Boolean).join(' · ');
  })();

  return (
    <HomeTile
      testID="tile-last-round"
      icon="history"
      title="Last round"
      headline={headline}
      subtext={subtext}
      onPress={() => {
        if (round) navigation.navigate('ViewRound', { roundId: round.id });
      }}
    />
  );
}
