import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_DEFAULT, type MapPressEvent } from 'react-native-maps';
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

  const initialRegion = useMemo(() => {
    const focus = markers.pin ?? userCoord ?? { latitude: 0, longitude: 0 };
    return {
      ...focus,
      latitudeDelta: DEFAULT_REGION_DELTA,
      longitudeDelta: DEFAULT_REGION_DELTA,
    };
  }, [markers.pin, userCoord]);

  const canReset =
    tap !== null ||
    selectedTee !== null ||
    selectedTarget !== DEFAULT_TARGET ||
    movingShotId !== null;
  const showFallback = hasCoordinates === false;

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
