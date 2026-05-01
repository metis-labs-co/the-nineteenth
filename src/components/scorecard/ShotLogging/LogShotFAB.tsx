import React, { useCallback } from 'react';
import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows } from '@/constants/theme';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useLogShot } from '@/hooks/shots';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';

interface LogShotFABProps {
  roundId: string;
  holeNumber: number;
  /** Bottom inset (e.g. tab bar height) so the FAB doesn't sit under chrome. */
  bottomInset?: number;
}

export const LogShotFAB = React.memo(function LogShotFAB({
  roundId,
  holeNumber,
  bottomInset = 0,
}: LogShotFABProps) {
  const colors = useThemeColors();
  const { location } = useUserLocation();
  const logShot = useLogShot();
  const showToast = useShotLoggingUiStore((s) => s.showToast);

  const disabled = !location || logShot.isPending;

  const handlePress = useCallback(() => {
    if (!location) return;
    logShot.mutate(
      {
        roundId,
        holeNumber,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      {
        onSuccess: (shot) => {
          showToast({
            shotId: shot.id,
            sequence: shot.sequence,
            roundId,
            holeNumber,
          });
        },
      }
    );
  }, [location, logShot, roundId, holeNumber, showToast]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log shot at current GPS"
      accessibilityState={{ disabled }}
      onPress={handlePress}
      disabled={disabled}
      testID="log-shot-fab"
      style={[
        styles.fab,
        shadows.lg,
        {
          backgroundColor: disabled ? colors.textMuted ?? '#9ca3af' : colors.primary,
          bottom: 16 + bottomInset,
        },
      ]}
    >
      {logShot.isPending ? (
        <ActivityIndicator color="white" testID="log-shot-fab-spinner" />
      ) : (
        <Icon source="plus" size={28} color="white" />
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
