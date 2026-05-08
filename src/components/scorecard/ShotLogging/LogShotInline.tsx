import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useUserLocation } from '@/hooks/useUserLocation';
import {
  useLogShot,
  useShotTrackingEligibility,
  useShouldPromptBunker,
  useShotLog,
  useShotDwellPrompt,
} from '@/hooks/shots';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { useRoundDetails } from '@/hooks/rounds/queries';
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
  /**
   * Fired the moment the user picks a club, before the network round-trip.
   * The parent card uses this to optimistically bump the hole's stroke count.
   */
  onShotLogged?: () => void;
  /**
   * Fired when an own-shot disappears from the cache for this hole — i.e.
   * the user undid a shot via the toast (or it was deleted elsewhere). The
   * parent card uses this to keep strokes in sync.
   */
  onShotUndone?: () => void;
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
  onShotLogged,
  onShotUndone,
}: LogShotInlineProps) {
  const colors = useThemeColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const eligibility = useShotTrackingEligibility(roundId);
  const enableHoleMap = useSettingsStore((s) => s.enableHoleMap);
  const trackShotsAutomatically = useSettingsStore((s) => s.trackShotsAutomatically);
  const shotPromptingEnabled = useSettingsStore((s) => s.shotPromptingEnabled);
  const isSuperAdmin = useIsSuperAdmin();
  const { player } = useAuth();
  const { data: bag = [] } = useBag(player?.id);

  const {
    location,
    accuracy,
    permissionStatus,
    isWatching,
    requestPermission,
    startWatching,
  } = useUserLocation();
  const logShot = useLogShot();
  const showToast = useShotLoggingUiStore((s) => s.showToast);
  const showErrorToast = useShotLoggingUiStore((s) => s.showErrorToast);
  const showWarningToast = useShotLoggingUiStore((s) => s.showWarningToast);
  const showBunkerPrompt = useShotLoggingUiStore((s) => s.showBunkerPrompt);
  const showShotPrompt = useShotLoggingUiStore((s) => s.showShotPrompt);
  const toastVariant = useShotLoggingUiStore((s) => s.variant);
  const toastDismissAt = useShotLoggingUiStore((s) => s.dismissAt);
  const confirmedDwellPosition = useShotLoggingUiStore(
    (s) => s.confirmedDwellPosition
  );
  const consumeConfirmedDwellPosition = useShotLoggingUiStore(
    (s) => s.consumeConfirmedDwellPosition
  );

  const { data: roundDetails } = useRoundDetails(roundId);
  const courseId = roundDetails?.course_id ?? undefined;

  const { data: shotsForHole } = useShotLog(roundId, holeNumber);
  const { latestShot, priorShot } = useMemo(() => {
    const list = shotsForHole ?? [];
    // Filter to current player's shots only — useShotLog returns all players on the round.
    const own = player ? list.filter((s) => s.player_id === player.id) : list;
    return {
      latestShot: own.length > 0 ? own[own.length - 1] : null,
      priorShot: own.length > 1 ? own[own.length - 2] : null,
    };
  }, [shotsForHole, player]);

  const promptEligible = useShouldPromptBunker(
    latestShot,
    priorShot,
    courseId,
    holeNumber
  );

  const lastDispatchedShotIdRef = useRef<string | null>(null);

  // Track own-shot count so we can detect undo (count decreases) and fire
  // onShotUndone for each removal. Increases are handled synchronously in
  // handleClubPicked, so we deliberately ignore them here to avoid double-
  // counting once the optimistic cache update lands.
  const ownShotCountRef = useRef<number | null>(null);
  const ownShotCount = useMemo(() => {
    const list = shotsForHole ?? [];
    return player ? list.filter((s) => s.player_id === player.id).length : 0;
  }, [shotsForHole, player]);

  // Reset baseline whenever the (round, hole) being observed changes so that
  // navigating between holes doesn't look like a flurry of undos.
  useEffect(() => {
    ownShotCountRef.current = null;
  }, [roundId, holeNumber]);

  useEffect(() => {
    const prev = ownShotCountRef.current;
    ownShotCountRef.current = ownShotCount;
    // Skip the very first observation so initial cache load (or hole change)
    // doesn't fire spurious undo events.
    if (prev === null) return;
    if (ownShotCount < prev && onShotUndone) {
      const drop = prev - ownShotCount;
      for (let i = 0; i < drop; i += 1) onShotUndone();
    }
  }, [ownShotCount, onShotUndone]);

  // When a NEW shot id appears in the cache for this player on this hole,
  // decide whether to dispatch the bunker prompt. The regular post-shot
  // success toast is already dispatched from useLogShot.onSuccess; the
  // prompt overwrites it within the same render commit when eligible.
  useEffect(() => {
    if (!eligibility.eligible) return;
    if (!latestShot) return;
    if (latestShot.id === lastDispatchedShotIdRef.current) return;
    lastDispatchedShotIdRef.current = latestShot.id;

    if (promptEligible) {
      showBunkerPrompt({
        shotId: latestShot.id,
        sequence: latestShot.sequence,
        roundId,
        holeNumber,
      });
    }
  }, [eligibility.eligible, latestShot, promptEligible, showBunkerPrompt, roundId, holeNumber]);

  // Position captured at tap-time, awaiting the user's club pick. The picker
  // is mounted only while this is non-null. Set to null on cancel/log/error.
  const [pendingPosition, setPendingPosition] = useState<{
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
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
    (latitude: number, longitude: number, accuracyMeters: number | null) => {
      setPendingPosition({ latitude, longitude, accuracyMeters });
    },
    []
  );

  const handleClubPicked = useCallback(
    (clubKey: ClubKey) => {
      if (!pendingPosition) return;
      const { latitude, longitude, accuracyMeters } = pendingPosition;
      setPendingPosition(null);
      // Optimistic stroke bump — fires before the DB round-trip. If the
      // mutation later fails, the error toast surfaces it; the bumped stroke
      // stays so the user doesn't lose their place.
      onShotLogged?.();
      logShot.mutate(
        { roundId, holeNumber, latitude, longitude, clubKey, accuracyMeters },
        {
          onSuccess: (shot) => {
            // Below 10m accuracy is treated as trustworthy — show the normal
            // success toast. Above that, swap to the warning variant so the
            // user knows to revisit on the map. Null accuracy is treated as
            // trustworthy too (legacy / no GPS metadata).
            const isWeak =
              accuracyMeters !== null && accuracyMeters > 10;
            const dispatch = isWeak ? showWarningToast : showToast;
            dispatch({
              shotId: shot.id,
              sequence: shot.sequence,
              roundId,
              holeNumber,
              fromBunker: shot.from_bunker,
            });
          },
          onError: (err: unknown) => {
            showErrorToast({ message: friendlyShotError(err) });
          },
        }
      );
    },
    [pendingPosition, logShot, roundId, holeNumber, showToast, showWarningToast, showErrorToast, onShotLogged]
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
        queueShotForClub(
          fix.coords.latitude,
          fix.coords.longitude,
          fix.coords.accuracy ?? null
        );
      } catch {
        showErrorToast({
          message: "Couldn't get your location. Move to an open area and try again.",
        });
      } finally {
        setIsFetchingPosition(false);
      }
      return;
    }

    queueShotForClub(location.latitude, location.longitude, accuracy);
  }, [
    permissionStatus,
    requestPermission,
    startWatching,
    location,
    accuracy,
    isFetchingPosition,
    queueShotForClub,
    showErrorToast,
  ]);

  // Dwell-based shot prompt (super admin only while in test phase). Detect
  // when the user has been stationary for ~45s and ask "Did you just take a
  // shot?". Tapping Yes routes through the same club-picker → log flow as
  // the manual button below.
  const dwellEnabled =
    !disabled &&
    eligibility.eligible &&
    enableHoleMap &&
    trackShotsAutomatically &&
    shotPromptingEnabled &&
    isSuperAdmin &&
    permissionStatus === 'granted' &&
    pendingPosition === null;

  const isPromptOnScreen =
    (toastVariant === 'shotPrompt' || toastVariant === 'bunkerPrompt') &&
    toastDismissAt !== null;

  const handleDwellPrompt = useCallback(
    (position: { latitude: number; longitude: number; accuracyMeters: number | null }) => {
      showShotPrompt({ position });
    },
    [showShotPrompt]
  );

  useShotDwellPrompt({
    enabled: dwellEnabled,
    location,
    accuracy,
    onPrompt: handleDwellPrompt,
    isPromptActive: isPromptOnScreen || pendingPosition !== null,
  });

  // When the user taps Yes on the dwell prompt, the toast writes a
  // captured position into `confirmedDwellPosition`. We consume it here and
  // open the club picker exactly as if they had tapped the manual button.
  useEffect(() => {
    if (!confirmedDwellPosition) return;
    const pos = consumeConfirmedDwellPosition();
    if (pos) {
      queueShotForClub(pos.latitude, pos.longitude, pos.accuracyMeters);
    }
  }, [confirmedDwellPosition, consumeConfirmedDwellPosition, queueShotForClub]);

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
