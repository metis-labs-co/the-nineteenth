import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { useThemeColors } from '@/context/ThemeContext';
import type { LatLng } from '@/hooks/useHoleMapMarkers';

interface TapMarkerProps {
  coordinate: LatLng | null;
}

export const TapMarker = React.memo(function TapMarker({ coordinate }: TapMarkerProps) {
  const colors = useThemeColors();
  if (!coordinate) return null;
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} testID="tap-marker">
      <View style={[styles.dot, { backgroundColor: colors.warning }]} />
    </Marker>
  );
});

const styles = StyleSheet.create({
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'white',
  },
});
