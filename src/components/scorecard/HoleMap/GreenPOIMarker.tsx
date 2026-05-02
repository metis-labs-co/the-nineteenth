import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { useThemeColors } from '@/context/ThemeContext';
import type { LatLng, GreenPoiType } from '@/hooks/useHoleMapMarkers';

interface GreenPOIMarkerProps {
  type: GreenPoiType;
  coordinate: LatLng;
  selected?: boolean;
  onPress: (type: GreenPoiType) => void;
}

const LABEL: Record<GreenPoiType, string> = {
  green_front: 'Front of green',
  green_center: 'Centre of green',
  green_back: 'Back of green',
};

const LETTER: Record<GreenPoiType, string> = {
  green_front: 'F',
  green_center: 'C',
  green_back: 'B',
};

export const GreenPOIMarker = React.memo(function GreenPOIMarker({
  type,
  coordinate,
  selected,
  onPress,
}: GreenPOIMarkerProps) {
  const colors = useThemeColors();
  const handlePress = useCallback(() => onPress(type), [onPress, type]);
  const baseTestID = `green-poi-${type}`;
  const testID = selected ? `${baseTestID}-selected` : baseTestID;

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={LABEL[type]}
        onPress={handlePress}
        testID={testID}
        style={[
          styles.dot,
          { borderColor: 'white', backgroundColor: colors.success },
          selected && {
            borderColor: 'white',
            backgroundColor: colors.primary,
          },
        ]}
      >
        <Text style={styles.letter} allowFontScaling={false}>
          {LETTER[type]}
        </Text>
      </Pressable>
    </Marker>
  );
});

const styles = StyleSheet.create({
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
    color: 'white',
    includeFontPadding: false,
  },
});
