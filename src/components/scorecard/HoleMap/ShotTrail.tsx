import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import { useThemeColors } from '@/context/ThemeContext';
import { typography } from '@/constants/theme';
import type { LatLng } from '@/hooks/useHoleMapMarkers';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

interface ShotTrailProps {
  shots: ShotLogEntry[];
  /** Optional pin/target — when present, draws a final dashed segment from last shot to target. */
  target?: LatLng | null;
  /** Tap callback for individual shot markers (live mode). Omit for read-only. */
  onShotPress?: (shot: ShotLogEntry) => void;
}

export const ShotTrail = React.memo(function ShotTrail({
  shots,
  target,
  onShotPress,
}: ShotTrailProps) {
  const colors = useThemeColors();

  const sorted = useMemo(
    () => [...shots].sort((a, b) => a.sequence - b.sequence),
    [shots]
  );

  if (sorted.length === 0) return null;

  const trailCoords = sorted.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
  const targetSegment = target ? [trailCoords[trailCoords.length - 1], target] : null;

  return (
    <>
      {/* Solid trail line connecting shot positions */}
      {trailCoords.length > 1 && (
        <Polyline
          coordinates={trailCoords}
          strokeColor={colors.primary}
          strokeWidth={3}
          testID="shot-trail-line"
        />
      )}
      {/* Dashed final segment to target */}
      {targetSegment && (
        <Polyline
          coordinates={targetSegment}
          strokeColor={colors.primary}
          strokeWidth={3}
          lineDashPattern={[6, 4]}
          testID="shot-trail-target-segment"
        />
      )}
      {/* Numbered marker per shot */}
      {sorted.map((shot) => (
        <ShotNumberMarker
          key={shot.id}
          shot={shot}
          color={colors.primary}
          onPress={onShotPress}
        />
      ))}
    </>
  );
});

interface ShotNumberMarkerProps {
  shot: ShotLogEntry;
  color: string;
  onPress?: (shot: ShotLogEntry) => void;
}

const ShotNumberMarker = React.memo(function ShotNumberMarker({
  shot,
  color,
  onPress,
}: ShotNumberMarkerProps) {
  const handlePress = useCallback(() => onPress?.(shot), [onPress, shot]);
  const testID = `shot-marker-${shot.sequence}`;
  return (
    <Marker
      coordinate={{ latitude: shot.latitude, longitude: shot.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
    >
      <Pressable
        onPress={onPress ? handlePress : undefined}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`Shot ${shot.sequence}`}
        testID={testID}
        style={[styles.bubble, { backgroundColor: color }]}
        hitSlop={8}
      >
        <View style={styles.bubbleInner}>
          <Text style={[styles.numberText, { color: 'white' }]}>{shot.sequence}</Text>
        </View>
      </Pressable>
    </Marker>
  );
});

const styles = StyleSheet.create({
  bubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 12,
  },
});
