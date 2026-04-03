/**
 * useQuickScoreFlow - Manages the QuickScore round → player selection flow
 *
 * Two-step picker: select an active round, then select a player from that round.
 * Navigates to QuickScoreEntry on player selection.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useRoundScorecards } from '@/hooks/useRoundDetails';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useQuickScoreFlow() {
  const navigation = useNavigation<NavigationProp>();

  const [showRoundPicker, setShowRoundPicker] = useState(false);
  const [quickScoreRoundId, setQuickScoreRoundId] = useState<string | null>(null);

  // Fetch scorecards for the selected round to show completion status
  const { data: scorecards } = useRoundScorecards(quickScoreRoundId ?? '');

  const completedPlayerIds = useMemo(() => {
    if (!scorecards) return new Set<string>();
    return new Set(
      scorecards
        .filter((sc) => sc.status === 'completed')
        .map((sc) => sc.player_id)
    );
  }, [scorecards]);

  const openRoundPicker = useCallback(() => {
    setShowRoundPicker(true);
  }, []);

  const closeRoundPicker = useCallback(() => {
    setShowRoundPicker(false);
  }, []);

  const handleRoundSelect = useCallback((roundId: string) => {
    setShowRoundPicker(false);
    setQuickScoreRoundId(roundId);
  }, []);

  const handlePlayerSelect = useCallback(
    (playerId: string) => {
      if (!quickScoreRoundId) return;
      navigation.navigate('QuickScoreEntry', {
        roundId: quickScoreRoundId,
        playerId,
      });
      setQuickScoreRoundId(null);
    },
    [navigation, quickScoreRoundId]
  );

  const handlePlayerPickerClose = useCallback(() => {
    setQuickScoreRoundId(null);
  }, []);

  return {
    showRoundPicker,
    openRoundPicker,
    closeRoundPicker,
    quickScoreRoundId,
    handleRoundSelect,
    handlePlayerSelect,
    handlePlayerPickerClose,
    completedPlayerIds,
  };
}
