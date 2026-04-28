/**
 * useScorecardNavigation Hook
 *
 * Manages hole navigation and back button handling:
 * - Previous/Next hole navigation
 * - Jump to specific hole
 * - Android back button handling
 */

import { useEffect, useCallback } from 'react';
import { BackHandler } from 'react-native';
import { scoringLogger } from '@/utils/debugLogger';
import { activeRoundSession } from '@/services/activeRoundSession';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { Hole } from '@/types';

export interface UseScorecardNavigationParams {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Scorecard'>;
  currentHole: number;
  setCurrentHole: (hole: number) => void;
  holes: Hole[];
  roundId: string;
  competitionId: string;
  isStandaloneRound: boolean;
}

export interface UseScorecardNavigationReturn {
  handleBackPress: () => void;
  handlePreviousHole: () => void;
  handleNextHole: () => void;
  handleHolePress: (holeNumber: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function useScorecardNavigation({
  navigation,
  currentHole,
  setCurrentHole,
  holes,
  roundId,
  competitionId,
  isStandaloneRound,
}: UseScorecardNavigationParams): UseScorecardNavigationReturn {
  const firstHole = holes[0]?.number ?? 1;
  const lastHole = holes[holes.length - 1]?.number ?? 18;

  // Handle back button press (both header and Android). Scores are auto-persisted
  // to SQLite on each entry, so there's nothing to save on exit. For competition
  // rounds, route back to ViewRound regardless of how the user reached scoring
  // (deep link, cold-start resume, etc.) — navigate() pops to an existing
  // ViewRound instance if one is in the stack, otherwise pushes a fresh one.
  const handleBackPress = useCallback(() => {
    void activeRoundSession.clear();
    if (!isStandaloneRound) {
      navigation.navigate('ViewRound', { roundId, competitionId });
      return;
    }
    navigation.goBack();
  }, [navigation, isStandaloneRound, roundId, competitionId]);

  // Navigate to previous hole
  const handlePreviousHole = useCallback(() => {
    if (currentHole > firstHole) {
      scoringLogger.info('Navigation: Previous hole', {
        from: currentHole,
        to: currentHole - 1,
      });
      setCurrentHole(currentHole - 1);
    }
  }, [currentHole, setCurrentHole, firstHole]);

  // Navigate to next hole
  const handleNextHole = useCallback(() => {
    if (currentHole < lastHole) {
      scoringLogger.info('Navigation: Next hole', {
        from: currentHole,
        to: currentHole + 1,
      });
      setCurrentHole(currentHole + 1);
    }
  }, [currentHole, setCurrentHole, lastHole]);

  // Jump to a specific hole
  const handleHolePress = useCallback(
    (holeNumber: number) => {
      scoringLogger.info('Navigation: Jump to hole', {
        from: currentHole,
        to: holeNumber,
      });
      setCurrentHole(holeNumber);
    },
    [setCurrentHole, currentHole]
  );

  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true;
    });
    return () => backHandler.remove();
  }, [handleBackPress]);

  return {
    handleBackPress,
    handlePreviousHole,
    handleNextHole,
    handleHolePress,
    canGoPrevious: currentHole > firstHole,
    canGoNext: currentHole < lastHole,
  };
}
