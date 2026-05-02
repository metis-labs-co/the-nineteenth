import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { useThemeColors } from '@/context/ThemeContext';
import type { LatLng, TeePoiType } from '@/hooks/useHoleMapMarkers';

interface TeePOIMarkerProps {
  type: TeePoiType;
  coordinate: LatLng;
  selected?: boolean;
  onPress: (type: TeePoiType) => void;
}

const LETTER: Record<TeePoiType, string> = {
  tee_back: 'B',
  tee_front: 'F',
};

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
          { borderColor: colors.textSecondary, backgroundColor: 'rgba(255,255,255,0.92)' },
          selected && {
            borderColor: colors.primary,
            backgroundColor: colors.primary,
          },
        ]}
      >
        <Text
          style={[
            styles.letter,
            { color: selected ? 'white' : colors.textPrimary },
          ]}
          allowFontScaling={false}
        >
          {LETTER[type]}
        </Text>
      </Pressable>
    </Marker>
  );
});

const styles = StyleSheet.create({
  peg: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
    includeFontPadding: false,
  },
});
