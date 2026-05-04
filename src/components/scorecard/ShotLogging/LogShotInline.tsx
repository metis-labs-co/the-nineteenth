import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useLogShot, useShotTrackingEligibility } from '@/hooks/shots';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuth } from '@/hooks/useAuth';
import { useBag } from '@/hooks/queries/useBag';
import { BagClubPickerSheet } from '@/components/features/bag/BagClubPickerSheet';
import type { ClubKey } from '@/constants/clubs';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Map raw supabase / Postgres errors to short, user-facing copy.
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

interface LogShotInlineProps {
  roundId: string;
  holeNumber: number;
  /** Disable while the parent card is in a non-editable state. */
  disabled?: boolean;
}

/**
 * Inline shot-logging pill. Rendered next to the per-player "Add Additional
 * Stats" button on the score-entry card. Self-gates on tier + settings, so the
 * parent can mount it unconditionally.
 */
export const LogShotInline = React.memo(function LogShotInline({
  roundId,
  holeNumber,
  disabled = false,
}: LogShotInlineProps) {
  const colors = useThemeColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const eligibility = useShotTrackingEligibility(roundId);
  const enableHoleMap = useSettingsStore((s) => s.enableHoleMap);
  const trackShotsAutomatically = useSettingsStore((s) => s.trackShotsAutomatically);
  const { player } = useAuth();
  const { data: bag = [] } = useBag(player?.id);

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

  // Position captured at tap-time, awaiting the user's club pick. The picker
  // is mounted only while this is non-null. Set to null on cancel/log/error.
  const [pendingPosition, setPendingPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Bootstrap GPS — this button may be the only entry point on courses without
  // hole_coordinates (where DistanceToPin never mounts).
  useEffect(() => {
    if (permissionStatus === 'granted' && !isWatching) {
      startWatching();
    }
  }, [permissionStatus, isWatching, startWatching]);

  // Local "fetching an immediate fix" state. Distinct from `logShot.isPending`
  // (the DB write) and `isWatching` (the long-lived subscription). Lets a
  // user tap the button while watchPositionAsync hasn't yet fired its first
  // callback and get a one-shot getCurrentPositionAsync.
  const [isFetchingPosition, setIsFetchingPosition] = useState(false);

  // Position is captured immediately on tap; the actual write happens once
  // the user picks a club. This separates "where I hit it from" (a
  // time-sensitive GPS capture) from "what I hit" (a deliberate choice the
  // user can take their time on without GPS drift mattering).
  const queueShotForClub = useCallback(
    (latitude: number, longitude: number) => {
      setPendingPosition({ latitude, longitude });
    },
    []
  );

  const handleClubPicked = useCallback(
    (clubKey: ClubKey) => {
      if (!pendingPosition) return;
      const { latitude, longitude } = pendingPosition;
      setPendingPosition(null);
      logShot.mutate(
        { roundId, holeNumber, latitude, longitude, clubKey },
        {
          onSuccess: (shot) => {
            showToast({
              shotId: shot.id,
              sequence: shot.sequence,
              roundId,
              holeNumber,
            });
          },
          onError: (err: unknown) => {
            showErrorToast({ message: friendlyShotError(err) });
          },
        }
      );
    },
    [pendingPosition, logShot, roundId, holeNumber, showToast, showErrorToast]
  );

  const handlePickerCancel = useCallback(() => {
    setPendingPosition(null);
  }, []);

  const handleSetupBag = useCallback(() => {
    setPendingPosition(null);
    navigation.navigate('WhatsInTheBag');
  }, [navigation]);

  const handlePress = useCallback(async () => {
    // Permission denied previously — iOS won't show another prompt. Direct
    // the user to system settings via a toast with an "Open Settings" hint.
    if (permissionStatus === 'denied') {
      showErrorToast({
        message: 'Location is off for this app. Enable it in iOS Settings → The Nineteenth → Location.',
        durationMs: 6000,
      });
      // Best-effort: try to deep-link to the app's settings page.
      void Linking.openSettings().catch(() => undefined);
      return;
    }

    // Permission undetermined — ask for it. Native dialog handles the rest.
    if (permissionStatus === 'undetermined') {
      const granted = await requestPermission();
      if (granted) startWatching();
      return;
    }

    // Permission granted. If the long-lived watch hasn't produced a fix yet,
    // request a one-shot position with high accuracy so the button feels
    // responsive instead of silently no-ing on first taps.
    if (!location) {
      if (isFetchingPosition) return;
      setIsFetchingPosition(true);
      try {
        const fix = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        queueShotForClub(fix.coords.latitude, fix.coords.longitude);
      } catch {
        showErrorToast({
          message: "Couldn't get your location. Move to an open area and try again.",
        });
      } finally {
        setIsFetchingPosition(false);
      }
      return;
    }

    queueShotForClub(location.latitude, location.longitude);
  }, [
    permissionStatus,
    requestPermission,
    startWatching,
    location,
    isFetchingPosition,
    queueShotForClub,
    showErrorToast,
  ]);

  if (!eligibility.eligible || !enableHoleMap || !trackShotsAutomatically) {
    return null;
  }

  const isAwaitingPermission =
    permissionStatus === 'undetermined' || permissionStatus === 'denied';
  // Spinner only while we're actively doing something: writing to the DB or
  // running a one-shot getCurrentPositionAsync. Don't spin just because the
  // background watch hasn't produced a fix — that made the button look hung.
  const showSpinner = logShot.isPending || isFetchingPosition;
  // Always allow the press unless mid-mutation. Each branch in handlePress
  // handles its own state — the previous "gray and unpressable when no fix"
  // behavior felt broken because nothing happened on tap.
  const pressable = !disabled && !logShot.isPending && !isFetchingPosition;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isAwaitingPermission
            ? 'Enable GPS to log shots'
            : isFetchingPosition
            ? 'Acquiring GPS — log shot when ready'
            : 'Log shot at current GPS'
        }
        accessibilityState={{ disabled: !pressable }}
        onPress={handlePress}
        disabled={!pressable}
        testID="log-shot-inline"
        style={[
          styles.button,
          { backgroundColor: pressable ? colors.primary : colors.gray400 },
        ]}
      >
        {showSpinner ? (
          <ActivityIndicator color={colors.white} size="small" testID="log-shot-inline-spinner" />
        ) : (
          <View style={styles.iconRow}>
            <Icon source="golf-tee" size={16} color={colors.white} />
            <Icon source="plus" size={12} color={colors.white} />
          </View>
        )}
        <Text style={[styles.label, { color: colors.white }]}>Log Shot</Text>
      </Pressable>

      <BagClubPickerSheet
        visible={pendingPosition !== null}
        bag={bag}
        title="Which club did you hit?"
        onPick={handleClubPicked}
        onCancel={handlePickerCancel}
        onSetupBag={handleSetupBag}
      />
    </>
  );
});
LogShotInline.displayName = 'LogShotInline';

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    minHeight: 32,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
