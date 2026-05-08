import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import { useThemeColors } from '@/context/ThemeContext';
import { typography } from '@/constants/theme';
import { calculateDistance } from '@/utils/gpsCalculations';
import type { LatLng } from '@/hooks/useHoleMapMarkers';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

/**
 * Two shots within this many metres are treated as visually overlapping —
 * their markers will be fanned out around the cluster centre so neither
 * obscures the other. The polylines/coords themselves are unchanged.
 */
const CLUSTER_THRESHOLD_METRES = 3;
/** Pixel radius for the fan offset applied to each marker in a cluster. */
const CLUSTER_FAN_RADIUS_PX = 22;

interface MarkerOffset {
  x: number;
  y: number;
}

/**
 * For each shot, return a screen-space offset that visually separates it
 * from any other shots within `CLUSTER_THRESHOLD_METRES`. Singletons get
 * `{x: 0, y: 0}`. Clusters of N spread evenly around a circle so each
 * marker is independently tappable even if the underlying coords coincide.
 */
function computeMarkerOffsets(
  shots: readonly ShotLogEntry[]
): Map<string, MarkerOffset> {
  const clusters: ShotLogEntry[][] = [];
  for (const shot of shots) {
    const cluster = clusters.find((c) =>
      c.some(
        (other) =>
          calculateDistance(
            other.latitude,
            other.longitude,
            shot.latitude,
            shot.longitude
          ) <= CLUSTER_THRESHOLD_METRES
      )
    );
    if (cluster) {
      cluster.push(shot);
    } else {
      clusters.push([shot]);
    }
  }

  const offsets = new Map<string, MarkerOffset>();
  for (const cluster of clusters) {
    if (cluster.length === 1) {
      offsets.set(cluster[0].id, { x: 0, y: 0 });
      continue;
    }
    const n = cluster.length;
    cluster.forEach((shot, i) => {
      // Start the fan at the top of the circle then walk clockwise so the
      // lowest-sequence shot sits above and the rest spread predictably.
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      offsets.set(shot.id, {
        x: CLUSTER_FAN_RADIUS_PX * Math.cos(angle),
        y: CLUSTER_FAN_RADIUS_PX * Math.sin(angle),
      });
    });
  }
  return offsets;
}

interface ShotTrailProps {
  shots: ShotLogEntry[];
  /** Optional pin/target — when present, draws a final dashed segment from last shot to target. */
  target?: LatLng | null;
  /**
   * Optional origin (typically the hole's tee) — when present, prepends a
   * trail segment from origin → shot 1 and renders a small marker at the
   * origin so the first shot's start point is visible. Used in review mode.
   */
  origin?: LatLng | null;
  /**
   * Optional fill colour for the origin marker (e.g. the back-tee colour
   * resolved from `Course.tees`). Defaults to the theme primary colour.
   */
  originSwatch?: string | null;
  /**
   * Tap callback for the origin marker (review mode). When provided, the
   * origin marker becomes interactive and the user can swap between
   * back/front tee positions.
   */
  onOriginPress?: () => void;
  /** Tap callback for individual shot markers (live mode). Omit for read-only. */
  onShotPress?: (shot: ShotLogEntry) => void;
  /** Long-press callback — fast path into move mode. Omit to disable long-press. */
  onShotLongPress?: (shot: ShotLogEntry) => void;
  /** Shot id currently being moved — its marker is dimmed as a visual reference. */
  movingShotId?: string | null;
}

/** Threshold (metres) above which a shot's GPS reading is treated as low-confidence. */
const LOW_ACCURACY_THRESHOLD_METRES = 10;

export const ShotTrail = React.memo(function ShotTrail({
  shots,
  target,
  origin,
  originSwatch,
  onOriginPress,
  onShotPress,
  onShotLongPress,
  movingShotId,
}: ShotTrailProps) {
  const colors = useThemeColors();

  const sorted = useMemo(
    () => [...shots].sort((a, b) => a.sequence - b.sequence),
    [shots]
  );

  const markerOffsets = useMemo(() => computeMarkerOffsets(sorted), [sorted]);

  if (sorted.length === 0) return null;

  const shotCoords = sorted.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
  const trailCoords = origin ? [origin, ...shotCoords] : shotCoords;
  const targetSegment = target ? [shotCoords[shotCoords.length - 1], target] : null;

  return (
    <>
      {/* Solid trail line connecting shot positions (and origin/tee if provided) */}
      {trailCoords.length > 1 && (
        <Polyline
          coordinates={trailCoords}
          strokeColor={colors.primary}
          strokeWidth={3}
          testID="shot-trail-line"
        />
      )}
      {/* Origin (tee) marker — small subdued dot anchoring shot 1's start.
          Tappable when an `onOriginPress` callback is supplied (review mode). */}
      {origin && (
        <Marker
          coordinate={origin}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          testID="shot-trail-origin"
        >
          <Pressable
            onPress={onOriginPress}
            disabled={!onOriginPress}
            accessibilityRole={onOriginPress ? 'button' : undefined}
            accessibilityLabel={
              onOriginPress
                ? 'Change tee origin'
                : 'Tee origin'
            }
            accessibilityHint={
              onOriginPress ? 'Opens a chooser to swap between back and front tee.' : undefined
            }
            hitSlop={10}
            style={styles.originHitArea}
          >
            <View
              style={[
                styles.originDot,
                {
                  backgroundColor: originSwatch ?? colors.primary,
                  borderColor: 'white',
                },
              ]}
            />
          </Pressable>
        </Marker>
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
          warningColor={colors.warning}
          onPress={onShotPress}
          onLongPress={onShotLongPress}
          dimmed={movingShotId === shot.id}
          isLowAccuracy={
            shot.accuracy_meters !== null &&
            shot.accuracy_meters > LOW_ACCURACY_THRESHOLD_METRES
          }
          offset={markerOffsets.get(shot.id) ?? null}
        />
      ))}
    </>
  );
});

interface ShotNumberMarkerProps {
  shot: ShotLogEntry;
  color: string;
  warningColor: string;
  onPress?: (shot: ShotLogEntry) => void;
  onLongPress?: (shot: ShotLogEntry) => void;
  dimmed: boolean;
  isLowAccuracy: boolean;
  /**
   * Screen-space offset (in pixels) used to fan this marker out from any
   * sibling shots that share its coordinate. `null` or `{0,0}` = no offset.
   */
  offset: MarkerOffset | null;
}

const ShotNumberMarker = React.memo(function ShotNumberMarker({
  shot,
  color,
  warningColor,
  onPress,
  onLongPress,
  dimmed,
  isLowAccuracy,
  offset,
}: ShotNumberMarkerProps) {
  const handlePress = useCallback(() => onPress?.(shot), [onPress, shot]);
  const handleLongPress = useCallback(
    () => onLongPress?.(shot),
    [onLongPress, shot]
  );
  const testID = `shot-marker-${shot.sequence}`;

  // react-native-maps Markers with tracksViewChanges={false} don't repaint
  // when their coordinate prop changes — the native view freezes at its
  // initial position. Briefly re-enable tracking whenever the coord, dim,
  // accuracy, or fan-offset changes so the marker repaints in its new
  // position/state, then disable tracking again for normal scroll/zoom
  // performance.
  const [tracks, setTracks] = useState(true);
  const offsetX = offset?.x ?? 0;
  const offsetY = offset?.y ?? 0;
  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(t);
  }, [shot.latitude, shot.longitude, dimmed, isLowAccuracy, offsetX, offsetY]);

  const transformStyle =
    offsetX !== 0 || offsetY !== 0
      ? { transform: [{ translateX: offsetX }, { translateY: offsetY }] }
      : null;

  return (
    <Marker
      coordinate={{ latitude: shot.latitude, longitude: shot.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
    >
      <Pressable
        onPress={onPress ? handlePress : undefined}
        onLongPress={onLongPress ? handleLongPress : undefined}
        delayLongPress={350}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={
          isLowAccuracy
            ? `Shot ${shot.sequence}, weak GPS signal — long-press to reposition`
            : `Shot ${shot.sequence}`
        }
        testID={testID}
        style={[
          styles.wrapper,
          dimmed && styles.dimmed,
          isLowAccuracy && {
            borderWidth: 2,
            borderColor: warningColor,
            borderStyle: 'dashed',
          },
          transformStyle,
        ]}
        hitSlop={8}
      >
        <View style={[styles.bubble, { backgroundColor: color }]}>
          <Text style={[styles.numberText, { color: 'white' }]}>{shot.sequence}</Text>
        </View>
      </Pressable>
    </Marker>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.4,
  },
  bubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 12,
  },
  originDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  originHitArea: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
