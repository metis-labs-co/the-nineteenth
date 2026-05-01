import React, { useCallback } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useShotLoggingPrefStore } from '@/store/shotLoggingPrefStore';
import { useShotTrackingEligibility } from '@/hooks/shots';

interface TrackShotsToggleProps {
  roundId: string;
}

export function TrackShotsToggle({ roundId }: TrackShotsToggleProps) {
  const colors = useThemeColors();
  const eligibility = useShotTrackingEligibility(roundId);
  const trackShots = useShotLoggingPrefStore((s) => s.byRound[roundId] === true);
  const setTrackShots = useShotLoggingPrefStore((s) => s.setTrackShots);

  const onToggle = useCallback(
    (next: boolean) => setTrackShots(roundId, next),
    [roundId, setTrackShots]
  );

  // Only render for eligible users (premium + solo + auth user matches).
  if (!eligibility.eligible) return null;

  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      testID="track-shots-toggle-row"
    >
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Track my shots</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Log shot positions and see them on the hole map.
        </Text>
      </View>
      <Switch
        value={trackShots}
        onValueChange={onToggle}
        accessibilityLabel="Track my shots"
        testID="track-shots-toggle-switch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.small,
    marginTop: 2,
  },
});
