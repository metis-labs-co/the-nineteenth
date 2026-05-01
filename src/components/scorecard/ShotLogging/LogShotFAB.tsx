import React, { useCallback, useEffect } from 'react';
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

/** Default bottom offset clears the scorecard footer (~80px) plus breathing room. */
const DEFAULT_BOTTOM = 96;

export const LogShotFAB = React.memo(function LogShotFAB({
  roundId,
  holeNumber,
  bottomInset = 0,
}: LogShotFABProps) {
  const colors = useThemeColors();
  const {
    location,
    permissionStatus,
    isWatching,
    requestPermission,
    startWatching,
  } = useUserLocation();
  const logShot = useLogShot();
  const showToast = useShotLoggingUiStore((s) => s.showToast);
  const showErrorToast = useShotLoggingUiStore((s) => s.showErrorToast);

  // Bootstrap GPS — the FAB is the only entry point in some flows
  // (e.g. courses without hole_coordinates where DistanceToPin never
  // mounts), so the FAB itself has to kick off GPS watching.
  useEffect(() => {
    if (permissionStatus === 'granted' && !isWatching) {
      startWatching();
    }
  }, [permissionStatus, isWatching, startWatching]);

  const disabled = !location || logShot.isPending;

  const handlePress = useCallback(async () => {
    // If permission isn't granted yet, request it on first press.
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (granted) startWatching();
      return;
    }
    if (!location) return;
    // eslint-disable-next-line no-console
    console.log('[LogShotFAB] mutating', {
      roundId,
      holeNumber,
      lat: location.latitude,
      lng: location.longitude,
    });
    logShot.mutate(
      {
        roundId,
        holeNumber,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      {
        onSuccess: (shot) => {
          // eslint-disable-next-line no-console
          console.log('[LogShotFAB] success', shot);
          showToast({
            shotId: shot.id,
            sequence: shot.sequence,
            roundId,
            holeNumber,
          });
        },
        onError: (err: unknown) => {
          // eslint-disable-next-line no-console
          console.warn('[LogShotFAB] failed', err);
          const message =
            err instanceof Error
              ? err.message
              : typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'Could not log shot';
          showErrorToast({ message: `Shot log failed: ${message}` });
        },
      }
    );
  }, [
    permissionStatus,
    requestPermission,
    startWatching,
    location,
    logShot,
    roundId,
    holeNumber,
    showToast,
    showErrorToast,
  ]);

  // Distinguish three visual states:
  //   - active: GPS lock acquired, ready to log
  //   - awaiting permission: hasn't been asked or denied — pressable to prompt
  //   - acquiring: permission granted but no fix yet — show a spinner
  const isAwaitingPermission =
    permissionStatus === 'undetermined' || permissionStatus === 'denied';
  const isAcquiring = permissionStatus === 'granted' && !location;
  const showSpinner = logShot.isPending || isAcquiring;

  // Allow press when we need to prompt permission, even though location is null.
  const pressable = !logShot.isPending && (location !== null || isAwaitingPermission);
  const looksDisabled = !pressable;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        isAwaitingPermission
          ? 'Enable GPS to log shots'
          : isAcquiring
          ? 'Acquiring GPS — log shot when ready'
          : 'Log shot at current GPS'
      }
      accessibilityState={{ disabled: !pressable }}
      onPress={handlePress}
      disabled={!pressable}
      testID="log-shot-fab"
      style={[
        styles.fab,
        shadows.lg,
        {
          backgroundColor: looksDisabled ? colors.gray400 : colors.primary,
          bottom: DEFAULT_BOTTOM + bottomInset,
        },
      ]}
    >
      {showSpinner ? (
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
