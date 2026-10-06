/**
 * DistanceToPin Component
 *
 * Displays live GPS distance to the green center during scoring.
 * Shows different states based on permission status and data availability.
 *
 * Display states:
 * 1. No coordinates for course: Shows crossed-out GPS icon (tappable for info modal)
 * 2. Permission undetermined + not asked: Shows "Enable GPS" prompt
 * 3. Permission undetermined + already asked: Hidden (don't nag)
 * 4. Permission denied: Hidden
 * 5. Loading/acquiring location: Shows pulsing GPS icon
 * 6. Active: Shows distance badge (e.g., "145m" or "158yd")
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { ConfirmationDialog } from '@/components/common';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useHasCoordinates, useDistanceToGreen } from '@/hooks/useHoleCoordinates';
import { useCoordinateBackfill } from '@/hooks/useCoordinateBackfill';
import { useFormattedDistance, useSettingsStore } from '@/store/settingsStore';
import type { RootStackParamList } from '@/navigation/types';

// Metres. Above this the distance reading isn't trustworthy for club selection,
// so we fall back to the "acquiring" state rather than show a misleading number.
const ACCURACY_THRESHOLD_M = 15;

// When iOS Precise Location is OFF, fixes come back with accuracy ~1500m+.
// If we're stuck above this for long enough, the user almost certainly has
// reduced-accuracy mode on (or terrible signal) — prompt them rather than
// pulsing forever.
const REDUCED_ACCURACY_THRESHOLD_M = 100;
const REDUCED_ACCURACY_TIMEOUT_MS = 15000;

// =====================================================
// TYPES
// =====================================================

export interface DistanceToPinProps {
  courseId: string;
  holeNumber: number;
  /**
   * When provided AND the `enableHoleMap` feature flag is on, the active
   * distance badge becomes pressable and navigates to the HoleMap modal.
   */
  roundId?: string;
}

// =====================================================
// LOADING INDICATOR (PULSING GPS ICON)
// =====================================================

const PulsingGpsIcon = React.memo(function PulsingGpsIcon() {
  const colors = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={{ opacity: pulseAnim }}>
      <Icon source="crosshairs-gps" size={18} color={colors.textSecondary} />
    </Animated.View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const DistanceToPin = React.memo(function DistanceToPin({
  courseId,
  holeNumber,
  roundId,
}: DistanceToPinProps) {
  const colors = useThemeColors();
  const showGpsDistance = useSettingsStore((state) => state.showGpsDistance);
  const enableHoleMap = useSettingsStore((state) => state.enableHoleMap);
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);
  const { formatDistance } = useFormattedDistance();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const canOpenMap = enableHoleMap && !!roundId;
  const handleOpenMap = useCallback(() => {
    if (!canOpenMap || !roundId) return;
    navigation.navigate('HoleMap', { courseId, holeNumber, roundId });
  }, [canOpenMap, navigation, courseId, holeNumber, roundId]);

  // Modal state for no-GPS info
  const [showNoGpsModal, setShowNoGpsModal] = useState(false);
  const [showPoorAccuracyHint, setShowPoorAccuracyHint] = useState(false);
  const [showPoorAccuracyModal, setShowPoorAccuracyModal] = useState(false);
  const poorAccuracyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNoGpsPress = useCallback(() => {
    setShowNoGpsModal(true);
  }, []);

  const handleCloseNoGpsModal = useCallback(() => {
    setShowNoGpsModal(false);
  }, []);

  // Check if course has GPS coordinates
  const { data: hasCoordinates, isLoading: isLoadingCoords } = useHasCoordinates(courseId);

  // Auto-backfill coordinates from GolfAPI.io if missing
  useCoordinateBackfill(courseId);

  // User location hook
  const {
    location,
    accuracy,
    permissionStatus,
    isLoading: isLoadingPermission,
    isWatching,
    hasBeenAsked,
    requestPermission,
    startWatching,
  } = useUserLocation();

  // Suppress the distance badge when the fix is too coarse to be useful.
  // expo-location may return null accuracy on some platforms — treat unknown
  // as acceptable rather than hiding indefinitely.
  const isAccuracyAcceptable = accuracy == null || accuracy <= ACCURACY_THRESHOLD_M;

  // Calculate distance to green
  const { data: distance, isLoading: isLoadingDistance } = useDistanceToGreen(
    courseId,
    holeNumber,
    location,
    { enabled: !!location && !!hasCoordinates }
  );

  // Start watching when permission is granted and we have coordinates
  useEffect(() => {
    if (permissionStatus === 'granted' && hasCoordinates && !isWatching) {
      startWatching();
    }
  }, [permissionStatus, hasCoordinates, isWatching, startWatching]);

  // If accuracy is poor for long enough, surface a hint instead of pulsing
  // forever. Clears immediately once the fix tightens up.
  useEffect(() => {
    const isPoor = accuracy != null && accuracy > REDUCED_ACCURACY_THRESHOLD_M;

    if (!isPoor) {
      setShowPoorAccuracyHint(false);
      if (poorAccuracyTimerRef.current) {
        clearTimeout(poorAccuracyTimerRef.current);
        poorAccuracyTimerRef.current = null;
      }
      return;
    }

    // Already running or already showing — don't restart.
    if (poorAccuracyTimerRef.current || showPoorAccuracyHint) return;

    poorAccuracyTimerRef.current = setTimeout(() => {
      setShowPoorAccuracyHint(true);
      poorAccuracyTimerRef.current = null;
    }, REDUCED_ACCURACY_TIMEOUT_MS);
  }, [accuracy, showPoorAccuracyHint]);

  useEffect(() => {
    return () => {
      if (poorAccuracyTimerRef.current) {
        clearTimeout(poorAccuracyTimerRef.current);
      }
    };
  }, []);

  // Handle enable GPS press
  const handleEnablePress = async () => {
    const granted = await requestPermission();
    if (granted) {
      startWatching();
    }
  };

  // =====================================================
  // RENDER LOGIC
  // =====================================================

  // Hide only when BOTH GPS distance and the hole map are off. The legacy
  // `showGpsDistance` setting has no user-facing toggle anymore (it's always
  // false on a fresh install), so the practical gate is `enableHoleMap` —
  // the new Game Settings toggle. Without this, turning on "Show hole map"
  // wouldn't actually surface the distance / map-open badge in the header.
  if (!showGpsDistance && !enableHoleMap) {
    return null;
  }

  // Still loading initial data
  if (isLoadingCoords || isLoadingPermission) {
    return null;
  }

  // State 1: No coordinates for course - show disabled GPS icon (tappable for info)
  if (!hasCoordinates) {
    return (
      <>
        <TouchableOpacity
          style={styles.noGpsContainer}
          onPress={handleNoGpsPress}
          activeOpacity={0.7}
          accessibilityLabel="GPS coordinates not available for this course"
          accessibilityHint="Tap for more information"
          accessibilityRole="button"
        >
          <Icon source="crosshairs-off" size={18} color={colors.gray400} />
        </TouchableOpacity>

        <ConfirmationDialog
          visible={showNoGpsModal}
          title="GPS Not Available"
          message="GPS distance tracking is not available for this course. Course coordinates have not been added yet."
          confirmLabel="OK"
          cancelLabel=""
          onConfirm={handleCloseNoGpsModal}
          onCancel={handleCloseNoGpsModal}
        />
      </>
    );
  }

  // State 4: Permission denied - hide completely
  if (permissionStatus === 'denied') {
    return null;
  }

  // State 3: Permission undetermined + already asked - hide (don't nag)
  if (permissionStatus === 'undetermined' && hasBeenAsked) {
    return null;
  }

  // State 2: Permission undetermined + not asked - show enable prompt
  if (permissionStatus === 'undetermined' && !hasBeenAsked) {
    return (
      <TouchableOpacity
        style={styles.enableContainer}
        onPress={handleEnablePress}
        accessibilityLabel="Enable GPS for distance to pin"
        accessibilityRole="button"
      >
        <Icon source="crosshairs-gps" size={16} color={colors.textSecondary} />
        <Text style={[styles.enableText, { color: colors.textSecondary }]}>
          Enable GPS
        </Text>
      </TouchableOpacity>
    );
  }

  // State 5a: Fix is stuck at poor accuracy — likely iOS Precise Location is
  // off, or the user has very poor signal. Surface an actionable hint rather
  // than pulsing indefinitely.
  if (location && showPoorAccuracyHint && !isAccuracyAcceptable) {
    const message = Platform.OS === 'ios'
      ? "GPS isn't precise enough to show distances. Enable Precise Location in Settings → Privacy & Security → Location Services → The Nineteenth."
      : "GPS isn't precise enough to show distances. Move to an area with a clearer view of the sky.";

    return (
      <>
        <TouchableOpacity
          style={styles.noGpsContainer}
          onPress={() => setShowPoorAccuracyModal(true)}
          activeOpacity={0.7}
          accessibilityLabel="GPS signal is weak"
          accessibilityHint="Tap for help improving GPS accuracy"
          accessibilityRole="button"
        >
          <Icon source="crosshairs-question" size={18} color={colors.warning} />
        </TouchableOpacity>

        <ConfirmationDialog
          visible={showPoorAccuracyModal}
          title="GPS Signal Weak"
          message={message}
          confirmLabel="OK"
          cancelLabel=""
          onConfirm={() => setShowPoorAccuracyModal(false)}
          onCancel={() => setShowPoorAccuracyModal(false)}
        />
      </>
    );
  }

  // State 5: Loading/acquiring location - show pulsing icon. Also covers the
  // case where we have a fix but it's still too coarse (e.g. cold start
  // before the GNSS lock tightens) — better to look like we're still working
  // than to show a number that could be off by 50m+.
  if (!location || isLoadingDistance || !isAccuracyAcceptable) {
    return (
      <View style={styles.container}>
        <PulsingGpsIcon />
      </View>
    );
  }

  // State 6: Active - show distance
  if (distance) {
    // Check if distance is "close" (< 150 in user's preferred unit)
    const isClose = distanceUnit === 'metres'
      ? distance.meters < 150
      : distance.yards < 150;

    const formattedValue = formatDistance(distance.yards);

    return (
      <TouchableOpacity
        style={styles.container}
        onPress={handleOpenMap}
        disabled={!canOpenMap}
        activeOpacity={canOpenMap ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={
          canOpenMap
            ? `Distance to pin ${formattedValue} — open map`
            : `Distance to pin ${formattedValue}`
        }
        accessibilityHint={canOpenMap ? 'Opens a map view of the hole' : undefined}
      >
        <Icon
          source="map-marker"
          size={16}
          color={isClose ? colors.success : colors.textSecondary}
        />
        <Text
          style={[
            styles.distanceText,
            { color: isClose ? colors.success : colors.textPrimary },
          ]}
        >
          {formattedValue}
        </Text>
      </TouchableOpacity>
    );
  }

  // GPS is working but the green coordinate for *this hole* is missing —
  // surface that explicitly. Falling through to `null` here is what was
  // causing the "badge flashes then disappears" behavior on holes where the
  // course has partial coordinate coverage. If the hole map is enabled, the
  // crossed-out icon stays tappable to open the map view (which can show
  // tee/fairway markers even without a green pin).
  return (
    <TouchableOpacity
      style={styles.noGpsContainer}
      onPress={canOpenMap ? handleOpenMap : handleNoGpsPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        canOpenMap
          ? 'Distance unavailable for this hole — open map'
          : 'Distance unavailable for this hole'
      }
    >
      <Icon source="crosshairs-off" size={18} color={colors.gray400} />
    </TouchableOpacity>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noGpsContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  enableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  enableText: {
    ...typography.small,
  },
  distanceText: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '700',
  },
});

export default DistanceToPin;
