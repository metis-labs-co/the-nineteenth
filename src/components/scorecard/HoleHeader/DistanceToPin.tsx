/**
 * DistanceToPin Component
 *
 * Displays live GPS distance to the green center during scoring.
 * Shows different states based on permission status and data availability.
 *
 * Display states:
 * 1. No coordinates for course: Hidden
 * 2. Permission undetermined + not asked: Shows "Enable GPS" prompt
 * 3. Permission undetermined + already asked: Hidden (don't nag)
 * 4. Permission denied: Hidden
 * 5. Loading/acquiring location: Shows pulsing GPS icon
 * 6. Active: Shows distance badge (e.g., "145m" or "158yd")
 */

import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useHasCoordinates, useDistanceToGreen } from '@/hooks/useHoleCoordinates';
import { useFormattedDistance, useSettingsStore } from '@/store/settingsStore';

// =====================================================
// TYPES
// =====================================================

export interface DistanceToPinProps {
  courseId: string;
  holeNumber: number;
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
}: DistanceToPinProps) {
  const colors = useThemeColors();
  const showGpsDistance = useSettingsStore((state) => state.showGpsDistance);
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);
  const { formatDistance } = useFormattedDistance();

  // Check if course has GPS coordinates
  const { data: hasCoordinates, isLoading: isLoadingCoords } = useHasCoordinates(courseId);

  // User location hook
  const {
    location,
    permissionStatus,
    isLoading: isLoadingPermission,
    isWatching,
    hasBeenAsked,
    requestPermission,
    startWatching,
  } = useUserLocation();

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

  // Debug logging in development
  if (__DEV__) {
    console.log('[DistanceToPin] State:', {
      courseId,
      holeNumber,
      showGpsDistance,
      isLoadingCoords,
      isLoadingPermission,
      hasCoordinates,
      permissionStatus,
      hasBeenAsked,
      isWatching,
      hasLocation: !!location,
    });
  }

  // Feature disabled in settings - hide completely
  if (!showGpsDistance) {
    if (__DEV__) console.log('[DistanceToPin] Hidden: showGpsDistance is false');
    return null;
  }

  // Still loading initial data
  if (isLoadingCoords || isLoadingPermission) {
    if (__DEV__) console.log('[DistanceToPin] Hidden: still loading');
    return null;
  }

  // State 1: No coordinates for course - hide completely
  if (!hasCoordinates) {
    if (__DEV__) console.log('[DistanceToPin] Hidden: course has no GPS coordinates');
    return null;
  }

  // State 4: Permission denied - hide completely
  if (permissionStatus === 'denied') {
    if (__DEV__) console.log('[DistanceToPin] Hidden: permission denied');
    return null;
  }

  // State 3: Permission undetermined + already asked - hide (don't nag)
  if (permissionStatus === 'undetermined' && hasBeenAsked) {
    if (__DEV__) console.log('[DistanceToPin] Hidden: permission undetermined but already asked (user skipped)');
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

  // State 5: Loading/acquiring location - show pulsing icon
  if (!location || isLoadingDistance) {
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
      <View style={styles.container}>
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
      </View>
    );
  }

  // No distance available (green coordinates might be missing for this hole)
  return null;
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
    ...typography.bodySmall,
    fontWeight: '600',
  },
});

export default DistanceToPin;
