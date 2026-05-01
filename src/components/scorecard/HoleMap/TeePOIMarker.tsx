import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { useThemeColors } from '@/context/ThemeContext';
import type { LatLng, TeePoiType } from '@/hooks/useHoleMapMarkers';

interface TeePOIMarkerProps {
  type: TeePoiType;
  coordinate: LatLng;
  selected?: boolean;
  onPress: (type: TeePoiType) => void;
}

export const TeePOIMarker = React.memo(function TeePOIMarker({
  type,
  coordinate,
  selected,
  onPress,
}: TeePOIMarkerProps) {
  const colors = useThemeColors();
  const handlePress = useCallback(() => onPress(type), [onPress, type]);
  const baseTestID = `tee-poi-${type}`;
  const testID = selected ? `${baseTestID}-selected` : baseTestID;

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          type === 'tee_back' ? 'Back tee marker' : 'Front tee marker'
        }
        onPress={handlePress}
        testID={testID}
        style={[
          styles.peg,
          { borderColor: colors.textSecondary, backgroundColor: 'rgba(255,255,255,0.85)' },
          selected && {
            borderColor: colors.primary,
            backgroundColor: colors.primary,
          },
        ]}
      >
        <View />
      </Pressable>
    </Marker>
  );
});

const styles = StyleSheet.create({
  peg: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 2,
  },
});
