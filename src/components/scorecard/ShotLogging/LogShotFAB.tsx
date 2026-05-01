import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows } from '@/constants/theme';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useLogShot } from '@/hooks/shots';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import {
  TOAST_BASE_BOTTOM,
  TOAST_HEIGHT,
  TOAST_FAB_GAP,
} from './LogShotUndoToast';

/**
 * Map raw supabase / Postgres errors to short, user-facing copy.
 * Falls back to a generic message — never surface DB internals.
 */
function friendlyShotError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code ?? '')
      : '';
  switch (code) {
    case '23505':
      return 'Couldn’t save that shot. Try again.';
    case '42501':
      return 'You don’t have permission to log shots on this round.';
    case 'PGRST116':
      return 'Round not found. Try reopening the scorecard.';
    case 'PGRST301':
    case '401':
      return 'Sign in expired. Reopen the app to continue logging.';
    default:
      return 'Couldn’t log that shot. Check your connection and try again.';
  }
}

interface LogShotFABProps {
  roundId: string;
  holeNumber: number;
  /** Bottom inset (e.g. tab bar height) so the FAB doesn't sit under chrome. */
  bottomInset?: number;
}

/**
 * Resting bottom offset (no toast visible). Clears the ~120dp scorecard
 * footer plus 16dp breathing room. When a toast is visible the FAB
 * shifts up further to clear the toast strip.
 */
const FAB_RESTING_BOTTOM = 136;

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
  // When a toast is visible the FAB shifts up so it clears the toast strip.
  const toastVisible = useShotLoggingUiStore((s) => s.dismissAt !== null);

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
          showErrorToast({ message: friendlyShotError(err) });
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

  // FAB resting position; lifts above the toast strip when toast visible.
  const restingBottom = FAB_RESTING_BOTTOM + bottomInset;
  const liftedBottom =
    TOAST_BASE_BOTTOM + TOAST_HEIGHT + TOAST_FAB_GAP + bottomInset;
  const fabBottom = toastVisible ? liftedBottom : restingBottom;

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
          bottom: fabBottom,
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
