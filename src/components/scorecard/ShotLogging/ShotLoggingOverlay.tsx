import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useShotTrackingEligibility } from '@/hooks/shots';
import { useSettingsStore } from '@/store/settingsStore';
import { LogShotFAB } from './LogShotFAB';
import { LogShotUndoToast } from './LogShotUndoToast';

interface ShotLoggingOverlayProps {
  roundId: string;
  holeNumber: number;
  /**
   * Extra bottom inset for chrome above the screen bottom (e.g. a
   * persistent tab bar). The scorecard footer's own paddingBottom
   * already covers the home-indicator safe area, so don't add the
   * safe-area inset on top — that would double-count.
   */
  bottomInset?: number;
}

/**
 * Composite overlay for the score-entry screen. Renders the floating
 * shot-log button and the undo toast when ALL of:
 *   - User is eligible (premium tier + solo round + auth user is the player)
 *   - `enableHoleMap` setting is on (master Hole Map gate)
 *   - `trackShotsAutomatically` setting is on (Phase C2 master switch)
 *
 * Mount once near the screen root.
 */
export function ShotLoggingOverlay({
  roundId,
  holeNumber,
  bottomInset = 0,
}: ShotLoggingOverlayProps) {
  const eligibility = useShotTrackingEligibility(roundId);
  const enableHoleMap = useSettingsStore((s) => s.enableHoleMap);
  const trackShotsAutomatically = useSettingsStore((s) => s.trackShotsAutomatically);

  if (!eligibility.eligible || !enableHoleMap || !trackShotsAutomatically) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID="shot-logging-overlay">
      <LogShotFAB roundId={roundId} holeNumber={holeNumber} bottomInset={bottomInset} />
      <LogShotUndoToast bottomInset={bottomInset} />
    </View>
  );
}
