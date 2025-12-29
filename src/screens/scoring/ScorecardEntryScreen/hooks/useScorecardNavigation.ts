/**
 * useScorecardNavigation Hook
 *
 * Manages hole navigation and back button handling:
 * - Previous/Next hole navigation
 * - Jump to specific hole
 * - Android back button handling
 * - Leave confirmation when unsaved changes exist
 */

import { useEffect, useCallback } from 'react';
import { BackHandler } from 'react-native';
import { scoringLogger } from '@/utils/debugLogger';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

export interface UseScorecardNavigationParams {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Scorecard'>;
  currentHole: number;
  setCurrentHole: (hole: number) => void;
  pendingSyncCount: number;
  onLeaveAttempt: () => void;
  triggerSync: () => void;
}

export interface UseScorecardNavigationReturn {
  handleBackPress: () => void;
  handleLeaveConfirm: () => void;
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
  pendingSyncCount,
  onLeaveAttempt,
  triggerSync,
}: UseScorecardNavigationParams): UseScorecardNavigationReturn {
  // Handle back button press (both header and Android)
  const handleBackPress = useCallback(() => {
    if (pendingSyncCount > 0) {
      onLeaveAttempt();
    } else {
      navigation.goBack();
    }
  }, [pendingSyncCount, navigation, onLeaveAttempt]);

  // Confirm leaving with unsaved changes
  const handleLeaveConfirm = useCallback(() => {
    triggerSync();
    navigation.goBack();
  }, [triggerSync, navigation]);

  // Navigate to previous hole
  const handlePreviousHole = useCallback(() => {
    if (currentHole > 1) {
      scoringLogger.info('Navigation: Previous hole', {
        from: currentHole,
        to: currentHole - 1,
      });
      setCurrentHole(currentHole - 1);
    }
  }, [currentHole, setCurrentHole]);

  // Navigate to next hole
  const handleNextHole = useCallback(() => {
    if (currentHole < 18) {
      scoringLogger.info('Navigation: Next hole', {
        from: currentHole,
        to: currentHole + 1,
      });
      setCurrentHole(currentHole + 1);
    }
  }, [currentHole, setCurrentHole]);

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
    handleLeaveConfirm,
    handlePreviousHole,
    handleNextHole,
    handleHolePress,
    canGoPrevious: currentHole > 1,
    canGoNext: currentHole < 18,
  };
}
