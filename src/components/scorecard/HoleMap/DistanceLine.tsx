import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Polyline, Marker } from 'react-native-maps';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { calculateDistance, metersToYards } from '@/utils/gpsCalculations';
import { useFormattedDistance } from '@/store/settingsStore';
import type { LatLng } from '@/hooks/useHoleMapMarkers';

type DistanceLineVariant = 'gps-to-tap' | 'tap-to-pin' | 'gps-to-pin';

interface DistanceLineProps {
  from: LatLng | null;
  to: LatLng | null;
  variant?: DistanceLineVariant;
  testID?: string;
}

const VARIANT_COLOR_KEYS: Record<DistanceLineVariant, 'warning' | 'info' | 'success'> = {
  'gps-to-tap': 'warning',
  'tap-to-pin': 'info',
  'gps-to-pin': 'success',
};

export const DistanceLine = React.memo(function DistanceLine({
  from,
  to,
  variant = 'gps-to-pin',
  testID,
}: DistanceLineProps) {
  const colors = useThemeColors();
  const { formatDistance } = useFormattedDistance();

  const distanceYards = useMemo(() => {
    if (!from || !to) return 0;
    return metersToYards(
      calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude)
    );
  }, [from, to]);

  const midpoint = useMemo(() => {
    if (!from || !to) return null;
    return {
      latitude: (from.latitude + to.latitude) / 2,
      longitude: (from.longitude + to.longitude) / 2,
    };
  }, [from, to]);

  if (!from || !to || !midpoint) return null;

  const strokeColor = colors[VARIANT_COLOR_KEYS[variant]];

  return (
    <>
      <Polyline
        coordinates={[from, to]}
        strokeColor={strokeColor}
        strokeWidth={3}
        lineDashPattern={[6, 4]}
        testID={testID}
      />
      <Marker coordinate={midpoint} anchor={{ x: 0.5, y: 0.5 }}>
        <View
          style={[
            styles.label,
            { backgroundColor: colors.surface, borderColor: strokeColor },
          ]}
        >
          <Text style={[styles.text, { color: colors.textPrimary }]}>
            {formatDistance(distanceYards)}
          </Text>
        </View>
      </Marker>
    </>
  );
});

const styles = StyleSheet.create({
  label: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  text: {
    ...typography.small,
    fontWeight: '600',
  },
});
