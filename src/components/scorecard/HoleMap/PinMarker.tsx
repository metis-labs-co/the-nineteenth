import React from 'react';
import { Marker } from 'react-native-maps';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import type { LatLng } from '@/hooks/useHoleMapMarkers';

interface PinMarkerProps {
  coordinate: LatLng;
}

export const PinMarker = React.memo(function PinMarker({ coordinate }: PinMarkerProps) {
  const colors = useThemeColors();
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 1 }} testID="pin-marker">
      <Icon source="flag" size={28} color={colors.error} />
    </Marker>
  );
});
