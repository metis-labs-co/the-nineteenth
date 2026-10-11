/**
 * openRound - build ViewRound params for opening a played round.
 *
 * ViewRound treats a missing competitionId as a standalone round, so every
 * entry point that can show a competition round must pass it through. Null
 * and empty ids become undefined.
 */

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

export type ViewRoundTab = NonNullable<RootStackParamList['ViewRound']['initialTab']>;

export interface RoundLinkInput {
  roundId: string;
  competitionId?: string | null;
  initialTab?: ViewRoundTab;
}

export function viewRoundParams({
  roundId,
  competitionId,
  initialTab = 'scorecard',
}: RoundLinkInput): RootStackParamList['ViewRound'] {
  return {
    roundId,
    competitionId: competitionId || undefined,
    initialTab,
  };
}

/** Returns a callback that opens a played round (scorecard tab by default). */
export function useOpenRound() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return useCallback(
    (input: RoundLinkInput) => navigation.navigate('ViewRound', viewRoundParams(input)),
    [navigation],
  );
}
