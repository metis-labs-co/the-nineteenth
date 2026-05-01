import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { useThemeColors } from '@/context/ThemeContext';
import type { LatLng } from '@/hooks/useHoleMapMarkers';

interface UserMarkerProps {
  coordinate: LatLng | null;
}

export const UserMarker = React.memo(function UserMarker({ coordinate }: UserMarkerProps) {
  const colors = useThemeColors();
  if (!coordinate) return null;
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} testID="user-marker">
      <View style={styles.outer}>
        <View style={[styles.inner, { backgroundColor: colors.info }]} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  outer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
});
