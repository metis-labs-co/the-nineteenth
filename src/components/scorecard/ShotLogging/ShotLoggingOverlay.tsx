import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useShotTrackingEligibility } from '@/hooks/shots';
import { useShotLoggingPrefStore } from '@/store/shotLoggingPrefStore';
import { LogShotFAB } from './LogShotFAB';
import { LogShotUndoToast } from './LogShotUndoToast';

interface ShotLoggingOverlayProps {
  roundId: string;
  holeNumber: number;
  /** Bottom inset for tab/safe area chrome. */
  bottomInset?: number;
}

/**
 * Composite overlay for the score-entry screen. Renders the floating
 * shot-log button and the undo toast when both:
 *   - The user is eligible (premium, solo round, auth user matches)
 *   - The user has flipped on `Track my shots` for this round
 *
 * Mount once near the screen root. The toggle itself is rendered
 * separately (`<TrackShotsToggle />`) since it lives in the scorecard
 * header / settings area where it's discoverable.
 */
export function ShotLoggingOverlay({
  roundId,
  holeNumber,
  bottomInset = 0,
}: ShotLoggingOverlayProps) {
  const eligibility = useShotTrackingEligibility(roundId);
  const trackShots = useShotLoggingPrefStore((s) => s.byRound[roundId] === true);

  if (!eligibility.eligible || !trackShots) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID="shot-logging-overlay">
      <LogShotFAB roundId={roundId} holeNumber={holeNumber} bottomInset={bottomInset} />
      <LogShotUndoToast bottomInset={bottomInset} />
    </View>
  );
}
