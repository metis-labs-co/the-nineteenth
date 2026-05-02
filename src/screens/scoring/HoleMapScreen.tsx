import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_DEFAULT, type MapPressEvent, type Region } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useThemeColors } from '@/context/ThemeContext';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useHasCoordinates } from '@/hooks/useHoleCoordinates';
import { useCoordinateBackfill } from '@/hooks/useCoordinateBackfill';
import { useMapTier } from '@/hooks/useMapTier';
import {
  useHoleMapMarkers,
  type LatLng,
  type TeePoiType,
  type GreenPoiType,
} from '@/hooks/useHoleMapMarkers';
import {
  useShotLog,
  useUpdateShot,
  useDeleteShot,
  useShotTrackingEligibility,
} from '@/hooks/shots';
import { useShotLoggingPrefStore } from '@/store/shotLoggingPrefStore';
import {
  UserMarker,
  PinMarker,
  TapMarker,
  DistanceLine,
  MapMarkerSet,
  MapHeader,
  NoCoordinatesFallback,
  ShotTrail,
  ShotMarkerActionSheet,
} from '@/components/scorecard/HoleMap';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HoleMap'>;

const DEFAULT_REGION_DELTA = 0.003;
const DEFAULT_TARGET: GreenPoiType = 'green_center';

/**
 * Initial bearing from `from` to `to` in degrees clockwise from north.
 * Used to rotate the map so the tee→green axis runs vertically up the
 * screen (green at top, tee at bottom).
 */
function bearingDegrees(from: LatLng, to: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const phi1 = toRad(from.latitude);
  const phi2 = toRad(to.latitude);
  const dLambda = toRad(to.longitude - from.longitude);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Linearly interpolate between two coordinates. Good enough at hole-scale
 * (~hundreds of metres) — no need for great-circle interpolation here.
 */
function lerpCoord(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

// Camera center bias — fraction of the green→tee segment, measured from
// the green toward the tee. 0 = camera right on the green, 0.5 = midpoint,
// 1 = camera on the tee. 0.35 keeps the camera near the green while pushing
// the green toward the top of the screen so the approach is visible below.
const GREEN_AT_TOP_BIAS = 0.35;
// Camera altitude (iOS) and zoom (Android) for the oriented hole view.
// ~800m altitude / zoom 17 fits an average par-4/5 with margin.
const HOLE_CAMERA_ALTITUDE = 800;
const HOLE_CAMERA_ZOOM = 17;

export default function HoleMapScreen({ route, navigation }: Props) {
  const { courseId, holeNumber, roundId, mode = 'live' } = route.params;
  const colors = useThemeColors();
  const tier = useMapTier();
  const { location } = useUserLocation();
  const { data: hasCoordinates } = useHasCoordinates(courseId);
  const markers = useHoleMapMarkers(courseId, holeNumber, tier);
  const { triggerBackfill } = useCoordinateBackfill(courseId);
  const { data: shots = [] } = useShotLog(roundId, holeNumber);
  const eligibility = useShotTrackingEligibility(roundId);
  const trackShots = useShotLoggingPrefStore((s) => s.byRound[roundId] === true);
  const updateShot = useUpdateShot();
  const deleteShot = useDeleteShot();

  const [tap, setTap] = useState<LatLng | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<GreenPoiType>(DEFAULT_TARGET);
  const [selectedTee, setSelectedTee] = useState<TeePoiType | null>(null);
  const [activeShot, setActiveShot] = useState<ShotLogEntry | null>(null);
  const [movingShotId, setMovingShotId] = useState<string | null>(null);

  const userCoord: LatLng | null = location
    ? { latitude: location.latitude, longitude: location.longitude }
    : null;

  const teeCoord = useMemo<LatLng | null>(() => {
    if (!selectedTee) return null;
    return markers.tees.find((m) => m.type === selectedTee)?.coordinate ?? null;
  }, [selectedTee, markers.tees]);

  const targetCoord = useMemo<LatLng | null>(() => {
    if (tier !== 'free') {
      const fromGreens = markers.greens.find((m) => m.type === selectedTarget)?.coordinate;
      if (fromGreens) return fromGreens;
    }
    return markers.pin;
  }, [tier, markers.greens, markers.pin, selectedTarget]);

  const greenLabelTargets = useMemo<LatLng[] | undefined>(() => {
    if (tier === 'free') return undefined;
    const front = markers.greens.find((m) => m.type === 'green_front')?.coordinate;
    const center = markers.greens.find((m) => m.type === 'green_center')?.coordinate;
    const back = markers.greens.find((m) => m.type === 'green_back')?.coordinate;
    const triple = [front, center, back].filter((c): c is LatLng => !!c);
    return triple.length > 1 ? triple : undefined;
  }, [tier, markers.greens]);

  const startAnchor: LatLng | null = teeCoord ?? userCoord;

  const isLive = mode === 'live';
  const showShotTrail = eligibility.eligible && trackShots && shots.length > 0;
  // Read-only mode shows the trail if any shots exist on the round (regardless of toggle/eligibility).
  const showShotTrailReview = !isLive && shots.length > 0;
  const trailVisible = showShotTrail || showShotTrailReview;

  const onMapPress = useCallback(
    (e: MapPressEvent) => {
      // If currently in shot-move mode, treat the press as the new position.
      if (movingShotId) {
        const coord = e.nativeEvent.coordinate;
        updateShot.mutate(
          {
            shotId: movingShotId,
            roundId,
            holeNumber,
            latitude: coord.latitude,
            longitude: coord.longitude,
          },
          { onSettled: () => setMovingShotId(null) }
        );
        return;
      }
      setTap(e.nativeEvent.coordinate);
    },
    [movingShotId, updateShot, roundId, holeNumber]
  );

  const onTeePress = useCallback((type: TeePoiType) => {
    setSelectedTee((prev) => (prev === type ? null : type));
  }, []);

  const onGreenPress = useCallback((type: GreenPoiType) => {
    setSelectedTarget(type);
  }, []);

  const onReset = useCallback(() => {
    setTap(null);
    setSelectedTee(null);
    setSelectedTarget(DEFAULT_TARGET);
    setMovingShotId(null);
  }, []);

  const onClose = useCallback(() => navigation.goBack(), [navigation]);

  const onShotPress = useCallback(
    (shot: ShotLogEntry) => {
      if (!isLive) return;
      setActiveShot(shot);
    },
    [isLive]
  );

  const closeActionSheet = useCallback(() => setActiveShot(null), []);

  const onActionDelete = useCallback(
    (shot: ShotLogEntry) => {
      deleteShot.mutate({ shotId: shot.id, roundId, holeNumber });
      setActiveShot(null);
    },
    [deleteShot, roundId, holeNumber]
  );

  const onActionMove = useCallback((shot: ShotLogEntry) => {
    setMovingShotId(shot.id);
    setActiveShot(null);
  }, []);

  // Track the imperative MapView so we can animate the camera once we have
  // real coordinates to focus on. Without this, `initialRegion` is the only
  // chance to position the map — and it's evaluated once at mount, before
  // markers.pin / userCoord have resolved, so the map opens at (0,0)
  // (Atlantic Ocean → solid navy in satellite view) and stays there.
  const mapRef = useRef<MapView | null>(null);

  // The first available focus point, in priority order:
  //   1. The hole pin (green centre / front) — best for orienting on a hole
  //   2. The user's current location — useful before coordinates load
  const focusCoord: LatLng | null = markers.pin ?? userCoord ?? null;

  // Keep `initialRegion` defined so the MapView can mount, but don't open
  // at (0,0) — fall back to a global view that lets the user see SOMETHING
  // while data loads, instead of a featureless ocean tile. Once focusCoord
  // resolves, the effect below animates to it at a tight zoom.
  const initialRegion = useMemo<Region>(() => {
    if (focusCoord) {
      return {
        latitude: focusCoord.latitude,
        longitude: focusCoord.longitude,
        latitudeDelta: DEFAULT_REGION_DELTA,
        longitudeDelta: DEFAULT_REGION_DELTA,
      };
    }
    return {
      latitude: -27.0,
      longitude: 133.0,
      latitudeDelta: 60,
      longitudeDelta: 60,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only used at mount
  }, []);

  // Snap the camera to the right place once data resolves, then leave it
  // alone (lets the user pan/zoom freely without the map fighting them).
  // We re-focus only when the hole number changes.
  const focusedHoleRef = useRef<number | null>(null);
  useEffect(() => {
    if (focusedHoleRef.current === holeNumber) return;

    const teeAnchor =
      markers.tees.find((t) => t.type === 'tee_back')?.coordinate ??
      markers.tees[0]?.coordinate ??
      null;
    const greenAnchor = markers.pin;

    // Best case: both ends of the hole are known. Orient the camera so the
    // hole runs vertically up the screen with the green at top, biased so
    // the camera sits near the green.
    if (teeAnchor && greenAnchor) {
      focusedHoleRef.current = holeNumber;
      const heading = bearingDegrees(greenAnchor, teeAnchor);
      const center = lerpCoord(teeAnchor, greenAnchor, GREEN_AT_TOP_BIAS);
      mapRef.current?.animateCamera(
        {
          center,
          heading,
          pitch: 0,
          altitude: HOLE_CAMERA_ALTITUDE,
          zoom: HOLE_CAMERA_ZOOM,
        },
        { duration: 400 }
      );
      return;
    }

    // Only the green is known (tee data missing). Centre on it, no rotation.
    if (greenAnchor) {
      focusedHoleRef.current = holeNumber;
      mapRef.current?.animateToRegion(
        {
          latitude: greenAnchor.latitude,
          longitude: greenAnchor.longitude,
          latitudeDelta: DEFAULT_REGION_DELTA,
          longitudeDelta: DEFAULT_REGION_DELTA,
        },
        400
      );
      return;
    }

    // No course data yet — centre on the user as a transient placeholder.
    // Don't mark the hole focused, so we'll re-orient when the pin arrives.
    if (userCoord) {
      mapRef.current?.animateToRegion(
        {
          latitude: userCoord.latitude,
          longitude: userCoord.longitude,
          latitudeDelta: DEFAULT_REGION_DELTA,
          longitudeDelta: DEFAULT_REGION_DELTA,
        },
        400
      );
    }
  }, [holeNumber, markers.pin, markers.tees, userCoord]);

  const canReset =
    tap !== null ||
    selectedTee !== null ||
    selectedTarget !== DEFAULT_TARGET ||
    movingShotId !== null;
  // Show the "no coordinates" overlay when the course has none at all OR
  // when this specific hole has no pin and we have no user GPS to fall back
  // to. Without the second case, the map opens on a coordinate-less hole
  // showing only featureless ocean (the bug we just fixed for navy-screen).
  const showFallback = hasCoordinates === false || focusCoord === null;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <MapHeader
        holeNumber={holeNumber}
        canReset={canReset}
        onClose={onClose}
        onReset={onReset}
      />

      <View style={styles.flex}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          mapType="satellite"
          initialRegion={initialRegion}
          onPress={onMapPress}
          showsUserLocation={false}
          testID="hole-map-view"
        >
          <UserMarker coordinate={userCoord} />
          {markers.pin && tier === 'free' && <PinMarker coordinate={markers.pin} />}
          <TapMarker coordinate={tap} />

          {tap === null && startAnchor && targetCoord && (
            <DistanceLine
              from={startAnchor}
              to={targetCoord}
              variant="gps-to-pin"
              labelTargets={greenLabelTargets}
            />
          )}
          {tap !== null && startAnchor && (
            <DistanceLine from={startAnchor} to={tap} variant="gps-to-tap" />
          )}
          {tap !== null && targetCoord && (
            <DistanceLine
              from={tap}
              to={targetCoord}
              variant="tap-to-pin"
              labelTargets={greenLabelTargets}
            />
          )}

          <MapMarkerSet
            markers={markers}
            tier={tier}
            selectedTee={selectedTee}
            selectedGreen={tier === 'free' ? null : selectedTarget}
            onTeePress={onTeePress}
            onGreenPress={onGreenPress}
          />

          {trailVisible && (
            <ShotTrail
              shots={shots}
              target={targetCoord}
              onShotPress={isLive ? onShotPress : undefined}
            />
          )}
        </MapView>

        {showFallback && (
          <NoCoordinatesFallback onRequestBackfill={triggerBackfill} />
        )}

        <ShotMarkerActionSheet
          visible={activeShot !== null}
          shot={activeShot}
          onClose={closeActionSheet}
          onDelete={onActionDelete}
          onMoveOnMap={onActionMove}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
