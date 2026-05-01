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
import { useHoleMapMarkers, type LatLng } from '@/hooks/useHoleMapMarkers';
import {
  UserMarker,
  PinMarker,
  TapMarker,
  DistanceLine,
  MapMarkerSet,
  MapHeader,
  NoCoordinatesFallback,
} from '@/components/scorecard/HoleMap';

import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HoleMap'>;

const DEFAULT_REGION_DELTA = 0.003;

export default function HoleMapScreen({ route, navigation }: Props) {
  const { courseId, holeNumber } = route.params;
  const colors = useThemeColors();
  const tier = useMapTier();
  const { location } = useUserLocation();
  const { data: hasCoordinates } = useHasCoordinates(courseId);
  const markers = useHoleMapMarkers(courseId, holeNumber, tier);
  const { triggerBackfill } = useCoordinateBackfill(courseId);

  const [tap, setTap] = useState<LatLng | null>(null);

  const userCoord: LatLng | null = location
    ? { latitude: location.latitude, longitude: location.longitude }
    : null;

  const onMapPress = useCallback((e: MapPressEvent) => {
    setTap(e.nativeEvent.coordinate);
  }, []);

  const onReset = useCallback(() => setTap(null), []);
  const onClose = useCallback(() => navigation.goBack(), [navigation]);

  const initialRegion = useMemo(() => {
    const focus =
      markers.pin ?? userCoord ?? { latitude: 0, longitude: 0 };
    return {
      ...focus,
      latitudeDelta: DEFAULT_REGION_DELTA,
      longitudeDelta: DEFAULT_REGION_DELTA,
    };
  }, [markers.pin, userCoord]);

  const showFallback = hasCoordinates === false;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <MapHeader
        holeNumber={holeNumber}
        canReset={tap !== null}
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
          {markers.pin && <PinMarker coordinate={markers.pin} />}
          <TapMarker coordinate={tap} />

          {tap === null && userCoord && markers.pin && (
            <DistanceLine from={userCoord} to={markers.pin} variant="gps-to-pin" />
          )}
          {tap !== null && userCoord && (
            <DistanceLine from={userCoord} to={tap} variant="gps-to-tap" />
          )}
          {tap !== null && markers.pin && (
            <DistanceLine from={tap} to={markers.pin} variant="tap-to-pin" />
          )}

          <MapMarkerSet markers={markers} tier={tier} />
        </MapView>

        {showFallback && (
          <NoCoordinatesFallback onRequestBackfill={triggerBackfill} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
