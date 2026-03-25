/**
 * useTeamMatchPlayNavigation
 *
 * Manages hole navigation and back press handling for team match play:
 * - Previous/next hole navigation
 * - Direct hole selection
 * - Hardware back press handling with unsaved changes warning
 * - Delete round handler (super admin)
 */

import { useCallback, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { teamMatchPlayLogger } from '@/utils/debugLogger';
import type { TeamHoleResult } from '../types';

interface UseTeamMatchPlayNavigationParams {
  currentHole: number;
  setCurrentHole: (hole: number) => void;
  isMatchComplete: boolean;
  holeResults: Record<number, TeamHoleResult>;
  roundId: string;
  navigation: { goBack: () => void };
  showDialog: (config: {
    title: string;
    message: string;
    confirmLabel: string;
    confirmVariant?: 'destructive';
    cancelLabel?: string;
    icon: string;
    onConfirm: () => void;
  }) => void;
  dismissDialog: () => void;
}

export function useTeamMatchPlayNavigation({
  currentHole,
  setCurrentHole,
  isMatchComplete,
  holeResults,
  roundId,
  navigation,
  showDialog,
  dismissDialog,
}: UseTeamMatchPlayNavigationParams) {
  // Navigation handlers
  const handlePreviousHole = useCallback(() => {
    if (currentHole > 1) {
      setCurrentHole(currentHole - 1);
    }
  }, [currentHole, setCurrentHole]);

  const handleNextHole = useCallback(() => {
    if (currentHole < 18 && !isMatchComplete) {
      setCurrentHole(currentHole + 1);
    }
  }, [currentHole, setCurrentHole, isMatchComplete]);

  const handleHolePress = useCallback(
    (holeNumber: number) => {
      setCurrentHole(holeNumber);
    },
    [setCurrentHole]
  );

  const handleBackPress = useCallback(() => {
    const holesWithScores = Object.keys(holeResults).length;
    if (holesWithScores > 0 && !isMatchComplete) {
      showDialog({
        title: 'Unsaved Match',
        message: 'Are you sure you want to leave? Your match progress will be lost.',
        confirmLabel: 'Leave',
        confirmVariant: 'destructive',
        icon: 'alert-outline',
        onConfirm: () => {
          dismissDialog();
          navigation.goBack();
        },
      });
    } else {
      navigation.goBack();
    }
  }, [holeResults, isMatchComplete, navigation, showDialog, dismissDialog]);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true;
    });
    return () => backHandler.remove();
  }, [handleBackPress]);

  // Delete round handler (super admin only)
  const handleDeleteRound = useCallback(() => {
    showDialog({
      title: 'Delete Match',
      message: 'Are you sure you want to delete this match? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      icon: 'trash-can-outline',
      onConfirm: () => {
        dismissDialog();
        // TODO: Implement actual deletion
        teamMatchPlayLogger.info('TEAM MATCH PLAY: Delete requested', { roundId });
        navigation.goBack();
      },
    });
  }, [navigation, roundId, showDialog, dismissDialog]);

  return {
    handlePreviousHole,
    handleNextHole,
    handleHolePress,
    handleBackPress,
    handleDeleteRound,
  };
}
