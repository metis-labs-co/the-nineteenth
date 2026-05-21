import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type LongPressEvent,
  type MapPressEvent,
  type Region,
} from 'react-native-maps';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography, shadows } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { SystemModalTheme } from '@/components/common';
import {
  AddTeePill,
  CustomTeeActionSheet,
  DistanceLine,
  EditTeePill,
  MovePreviewBanner,
  TapMarker,
  TeeMarkerSet,
  buildTeeOptions,
  type TeeOption,
} from '@/components/scorecard/HoleMap';
import { CLUBS_BY_KEY } from '@/constants/clubs';
import { calculateDistance, metersToYards } from '@/utils/gpsCalculations';
import { holeOrientedCamera } from '@/utils/holeOrientation';
import { formatDisplayDate } from '@/utils/locale';
import { useSettingsStore } from '@/store/settingsStore';
import { useShotLog, useUpdateShot } from '@/hooks/shots';
import { useHoleCoordinatesByHole } from '@/hooks/coordinates';
import { useTeeOverrideStore, type TeeOverride } from '@/store/teeOverrideStore';
import { useCourseTeeColors } from '@/hooks/useCourseTeeColors';
import {
  useCustomHoleTees,
  useCreateCustomHoleTee,
  useUpdateCustomHoleTee,
  useDeleteCustomHoleTee,
} from '@/hooks/customTees';
import {
  CUSTOM_TEE_COLORS,
  type CustomTeeColor,
} from '@/types/database/customHoleTees.types';

type Props = NativeStackScreenProps<RootStackParamList, 'ShotMap'>;

type LatLng = { latitude: number; longitude: number };

const SOLO_DELTA = 0.0008;
const PADDING_FACTOR = 2.5;

function regionFor(shot: LatLng, origin: LatLng | null): Region {
  if (!origin) {
    return {
      latitude: shot.latitude,
      longitude: shot.longitude,
      latitudeDelta: SOLO_DELTA,
      longitudeDelta: SOLO_DELTA,
    };
  }
  const latDelta = Math.max(
    Math.abs(shot.latitude - origin.latitude) * PADDING_FACTOR,
    SOLO_DELTA
  );
  const lngDelta = Math.max(
    Math.abs(shot.longitude - origin.longitude) * PADDING_FACTOR,
    SOLO_DELTA
  );
  return {
    latitude: (shot.latitude + origin.latitude) / 2,
    longitude: (shot.longitude + origin.longitude) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

function formatPlayedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatDisplayDate(d, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ShotMapScreen(props: Props) {
  // Presented as a native-stack `presentation: 'modal'` — that's a system
  // UIWindow, so the app's photographic backdrop and translucent surface
  // treatment aren't visible behind it. Pin to solid surfaces for legibility
  // (preserves the user's light/dark preference).
  return (
    <SystemModalTheme>
      <ShotMapScreenContent {...props} />
    </SystemModalTheme>
  );
}

function ShotMapScreenContent({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const {
    shotId,
    roundId,
    courseId,
    sequence,
    shotLatitude,
    shotLongitude,
    originLatitude,
    originLongitude,
    clubKey,
    holeNumber,
    courseName,
    roundPlayedAt,
  } = route.params;

  // Live shot position. Initialised from route params and updated locally
  // after a successful "Move on map" save so the marker and distance line
  // reflect the new state immediately. (The TanStack cache is also patched
  // by useUpdateShot — its onSuccess will refresh the bag list when the
  // user navigates back.)
  const [currentLat, setCurrentLat] = useState(shotLatitude);
  const [currentLng, setCurrentLng] = useState(shotLongitude);

  // Reset local state if the screen is reused for a different shot.
  useEffect(() => {
    setCurrentLat(shotLatitude);
    setCurrentLng(shotLongitude);
  }, [shotId, shotLatitude, shotLongitude]);

  const shot = useMemo(
    () => ({ latitude: currentLat, longitude: currentLng }),
    [currentLat, currentLng]
  );

  // ----- Tee origin override (shot 1 only) -------------------------------
  // For shot 1 we let the user swap between back/front tees via the same
  // chooser used on HoleMapScreen. For shot 2+ the "origin" is the prior
  // shot's landing — overriding the tee doesn't apply, so the chooser is
  // hidden and we use the route-passed origin directly.
  const isTeeShot = sequence === 1;
  // Hole coordinates serve two purposes here:
  //   1. Tee origin override (back/front) — only meaningful for shot 1.
  //   2. Map orientation — every shot benefits from rotating the map so
  //      the hole's tee→green axis runs vertically up the screen.
  // Fetch whenever the round is linked to a course; gating on `isTeeShot`
  // would break orientation for shot 2+.
  const { data: holeCoords } = useHoleCoordinatesByHole(
    courseId ?? '',
    holeNumber,
    { enabled: !!courseId }
  );
  const backTeeCoord = useMemo(
    () =>
      holeCoords?.tee_back
        ? {
            latitude: holeCoords.tee_back.latitude,
            longitude: holeCoords.tee_back.longitude,
          }
        : null,
    [holeCoords]
  );
  const frontTeeCoord = useMemo(
    () =>
      holeCoords?.tee_front
        ? {
            latitude: holeCoords.tee_front.latitude,
            longitude: holeCoords.tee_front.longitude,
          }
        : null,
    [holeCoords]
  );

  const teeOverride = useTeeOverrideStore(
    (s) => s.byRoundHole[`${roundId}::${holeNumber}`] ?? null
  );
  const setTeeOverride = useTeeOverrideStore((s) => s.setOverride);
  const clearTeeOverride = useTeeOverrideStore((s) => s.clearOverride);

  // User-defined custom tees for this hole. Only fetched for shot 1 (the
  // only sequence where tee origin makes sense).
  const { data: customTees = [] } = useCustomHoleTees(courseId, holeNumber, {
    enabled: isTeeShot && !!courseId,
  });

  // Resolve the override into a concrete custom tee (if it points at one).
  const selectedCustomTee = useMemo(() => {
    if (!teeOverride) return null;
    return customTees.find((t) => t.id === teeOverride) ?? null;
  }, [teeOverride, customTees]);

  // Effective origin used for the marker, distance line, and distance
  // calculation. Tee override only applies for shot 1.
  const origin = useMemo(() => {
    if (isTeeShot) {
      if (selectedCustomTee) {
        return {
          latitude: selectedCustomTee.latitude,
          longitude: selectedCustomTee.longitude,
        };
      }
      if (teeOverride === 'front' && frontTeeCoord) return frontTeeCoord;
      if (teeOverride === 'back' && backTeeCoord) return backTeeCoord;
      // No override yet — prefer fresh tee coords (so an override change
      // applied elsewhere shows up here too) and fall back to the route
      // param when coords haven't loaded yet.
      if (backTeeCoord) return backTeeCoord;
      if (frontTeeCoord) return frontTeeCoord;
    }
    return originLatitude != null && originLongitude != null
      ? { latitude: originLatitude, longitude: originLongitude }
      : null;
  }, [
    isTeeShot,
    teeOverride,
    selectedCustomTee,
    backTeeCoord,
    frontTeeCoord,
    originLatitude,
    originLongitude,
  ]);

  // Currently effective tee — drives the chooser's selected indicator and
  // the footer label.
  const currentSelection: TeeOverride | null = useMemo(() => {
    if (!isTeeShot) return null;
    if (selectedCustomTee) return selectedCustomTee.id;
    if (teeOverride === 'front' && frontTeeCoord) return 'front';
    if (teeOverride === 'back' && backTeeCoord) return 'back';
    if (backTeeCoord) return 'back';
    if (frontTeeCoord) return 'front';
    return null;
  }, [isTeeShot, teeOverride, selectedCustomTee, backTeeCoord, frontTeeCoord]);

  // Map back/front POIs to the course's longest/shortest TeeBoxes for
  // colour-coded marker fills.
  const courseTeeColors = useCourseTeeColors(courseId);

  // All tees for this hole, ready to render via TeeMarkerSet. Only shot 1
  // has a tee origin (shot 2+ measures from the prior shot's landing), so
  // the array is empty for non-tee shots and TeeMarkerSet renders nothing.
  const teeOptions = useMemo<TeeOption[]>(() => {
    if (!isTeeShot) return [];
    return buildTeeOptions({
      backTeeCoord,
      frontTeeCoord,
      customTees,
      backColor: courseTeeColors.back,
      frontColor: courseTeeColors.front,
    });
  }, [isTeeShot, backTeeCoord, frontTeeCoord, customTees, courseTeeColors]);

  const updateShot = useUpdateShot();
  // Pull this hole's shot rows so we can read shot 1's persisted
  // tee_override and write changes back to the same row. Only fetched
  // when this screen is showing shot 1 — for shot 2+ the override is
  // irrelevant and the query is gated off.
  const { data: shotsForHole = [] } = useShotLog(roundId, holeNumber);
  const shotOne = useMemo(
    () => (isTeeShot ? shotsForHole.find((s) => s.sequence === 1) ?? null : null),
    [isTeeShot, shotsForHole]
  );

  const handleSelectTee = useCallback(
    (tee: TeeOverride) => {
      // Local store first for instant UI feedback; DB write follows so
      // the choice persists across devices.
      setTeeOverride(roundId, holeNumber, tee);
      if (shotOne) {
        updateShot.mutate({
          shotId: shotOne.id,
          roundId,
          holeNumber,
          teeOverride: tee,
        });
      }
    },
    [setTeeOverride, roundId, holeNumber, shotOne, updateShot]
  );

  // Hydrate from DB and back-fill any local-only legacy data — same
  // two-way sync as HoleMapScreen so the screens agree.
  const teeSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!shotOne) return;
    const syncKey = `${shotOne.id}::${shotOne.tee_override ?? ''}`;
    if (teeSyncedRef.current === syncKey) return;
    teeSyncedRef.current = syncKey;

    const local = useTeeOverrideStore.getState().getOverride(roundId, holeNumber);
    if (shotOne.tee_override) {
      if (local !== shotOne.tee_override) {
        setTeeOverride(roundId, holeNumber, shotOne.tee_override);
      }
    } else if (local) {
      updateShot.mutate({
        shotId: shotOne.id,
        roundId,
        holeNumber,
        teeOverride: local,
      });
    }
  }, [shotOne, roundId, holeNumber, setTeeOverride, updateShot]);

  // Distance is always derived — keeps the footer in sync with both move
  // edits and tee-origin changes, with no risk of stale state.
  const currentDistance = useMemo(() => {
    if (!origin) return null;
    return calculateDistance(
      origin.latitude,
      origin.longitude,
      currentLat,
      currentLng
    );
  }, [origin, currentLat, currentLng]);

  const initialRegion = useMemo(
    () => regionFor({ latitude: shotLatitude, longitude: shotLongitude }, origin),
    // Only used at mount — recentre logic uses the current shot position
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const mapRef = useRef<MapView | null>(null);
  // animateCamera fires no-ops if the native MapView isn't ready yet, so we
  // gate hole orientation on onMapReady — otherwise the rotation silently
  // drops and the map sits north-up (looks "sideways" for east-west holes).
  const [mapReady, setMapReady] = useState(false);

  // Hole framing: rotate so the hole's intrinsic tee→green axis runs
  // vertically up the screen with the green at the top, and zoom out to
  // fit the whole hole. Independent of `origin` (which can swap between
  // tees for the shot-1 override) — the framing reflects the hole's
  // geometry, not the shot's chosen origin.
  const holeOrientationTee = useMemo<LatLng | null>(() => {
    const back = holeCoords?.tee_back;
    if (back) return { latitude: back.latitude, longitude: back.longitude };
    const front = holeCoords?.tee_front;
    if (front) return { latitude: front.latitude, longitude: front.longitude };
    return null;
  }, [holeCoords]);

  const holeOrientationGreen = useMemo<LatLng | null>(() => {
    const center = holeCoords?.green_center;
    if (center) return { latitude: center.latitude, longitude: center.longitude };
    const front = holeCoords?.green_front;
    if (front) return { latitude: front.latitude, longitude: front.longitude };
    const back = holeCoords?.green_back;
    if (back) return { latitude: back.latitude, longitude: back.longitude };
    return null;
  }, [holeCoords]);

  const holeCamera = useMemo(
    () => holeOrientedCamera(holeOrientationTee, holeOrientationGreen),
    [holeOrientationTee, holeOrientationGreen]
  );

  // Apply hole framing once, after coordinates resolve. Subsequent pans/
  // rotations by the user are preserved — only the recenter button
  // restores this framing.
  const orientedRef = useRef(false);
  useEffect(() => {
    if (orientedRef.current) return;
    if (!mapReady || !holeCamera) return;
    orientedRef.current = true;
    mapRef.current?.animateCamera(holeCamera, { duration: 400 });
  }, [mapReady, holeCamera]);

  const handleRecenter = useCallback(() => {
    if (holeCamera) {
      mapRef.current?.animateCamera(holeCamera, { duration: 350 });
      return;
    }
    // Fallback when hole coords aren't available — frame the shot itself
    // so the recenter button always does *something* useful.
    mapRef.current?.animateToRegion(regionFor(shot, origin), 350);
  }, [holeCamera, shot, origin]);

  const formattedDistance = useMemo(() => {
    if (currentDistance == null) return null;
    if (distanceUnit === 'yards') {
      return `${Math.round(metersToYards(currentDistance))} yds`;
    }
    return `${Math.round(currentDistance)} m`;
  }, [currentDistance, distanceUnit]);

  // Move-on-map state — mirrors HoleMapScreen's flow but simpler since this
  // screen always has exactly one shot in scope.
  const [isMoving, setIsMoving] = useState(false);
  const [previewCoord, setPreviewCoord] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Place-custom-tee state. Mutually exclusive with move mode — entering
  // either clears the other so the screen never has two pending edits.
  const [isPlacingTee, setIsPlacingTee] = useState(false);
  const [placedTeeCoord, setPlacedTeeCoord] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [placedTeeColor, setPlacedTeeColor] = useState<CustomTeeColor>('white');
  const createCustomTee = useCreateCustomHoleTee();
  const updateCustomTee = useUpdateCustomHoleTee();
  const deleteCustomTee = useDeleteCustomHoleTee();

  // Edit-custom-tee state, mirroring the HoleMapScreen flow.
  const [editingTeeSheet, setEditingTeeSheet] = useState<string | null>(null);
  const [movingTeeId, setMovingTeeId] = useState<string | null>(null);
  const [previewTeeCoord, setPreviewTeeCoord] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const handleAddCustomTee = useCallback(() => {
    if (!courseId) {
      Alert.alert(
        'No course linked',
        "This shot's round isn't linked to a course, so a custom tee can't be saved against it. Custom tees attach to a (course, hole) pair so they're available on every future round on the same hole.",
        [{ text: 'OK' }]
      );
      return;
    }
    setIsMoving(false);
    setPreviewCoord(null);
    setMovingTeeId(null);
    setPreviewTeeCoord(null);
    setIsPlacingTee(true);
    setPlacedTeeCoord(null);
    setPlacedTeeColor('white');
  }, [courseId]);

  const cancelPlaceTee = useCallback(() => {
    setIsPlacingTee(false);
    setPlacedTeeCoord(null);
  }, []);

  const onMapLongPress = useCallback(
    (_e: LongPressEvent) => {
      if (isMoving || isPlacingTee || movingTeeId) return;
      setIsMoving(true);
      setPreviewCoord(null);
    },
    [isMoving, isPlacingTee, movingTeeId]
  );

  const onMapPress = useCallback(
    (e: MapPressEvent) => {
      if (isPlacingTee) {
        setPlacedTeeCoord(e.nativeEvent.coordinate);
        return;
      }
      if (movingTeeId) {
        setPreviewTeeCoord(e.nativeEvent.coordinate);
        return;
      }
      if (!isMoving) return;
      setPreviewCoord(e.nativeEvent.coordinate);
    },
    [isMoving, isPlacingTee, movingTeeId]
  );

  const onSavePlacedTee = useCallback(() => {
    if (!placedTeeCoord || !courseId) return;
    createCustomTee.mutate(
      {
        course_id: courseId,
        hole_number: holeNumber,
        latitude: placedTeeCoord.latitude,
        longitude: placedTeeCoord.longitude,
        color: placedTeeColor,
      },
      {
        onSuccess: (created) => {
          // Adopt the newly-created custom tee as this round/hole's origin.
          setTeeOverride(roundId, holeNumber, created.id);
          setIsPlacingTee(false);
          setPlacedTeeCoord(null);
        },
      }
    );
  }, [
    placedTeeCoord,
    placedTeeColor,
    courseId,
    holeNumber,
    roundId,
    createCustomTee,
    setTeeOverride,
  ]);

  const movedNew = useMemo(() => {
    if (!previewCoord || !origin) return null;
    return calculateDistance(
      origin.latitude,
      origin.longitude,
      previewCoord.latitude,
      previewCoord.longitude
    );
  }, [previewCoord, origin]);

  const onSavePreview = useCallback(() => {
    if (!previewCoord) return;
    updateShot.mutate(
      {
        shotId,
        roundId,
        holeNumber,
        latitude: previewCoord.latitude,
        longitude: previewCoord.longitude,
      },
      {
        onSuccess: () => {
          setCurrentLat(previewCoord.latitude);
          setCurrentLng(previewCoord.longitude);
          // Persist new values onto the route so going back/forward in the
          // stack doesn't re-render with the old position.
          navigation.setParams({
            shotLatitude: previewCoord.latitude,
            shotLongitude: previewCoord.longitude,
            distanceMeters: movedNew,
          });
        },
        onSettled: () => {
          setIsMoving(false);
          setPreviewCoord(null);
        },
      }
    );
  }, [previewCoord, updateShot, shotId, roundId, holeNumber, movedNew, navigation]);

  const onCancelPreview = useCallback(() => {
    setIsMoving(false);
    setPreviewCoord(null);
  }, []);

  // ----- Edit-custom-tee handlers ---------------------------------------
  const editingTeeRow = useMemo(
    () =>
      editingTeeSheet
        ? customTees.find((t) => t.id === editingTeeSheet) ?? null
        : null,
    [editingTeeSheet, customTees]
  );
  const editTeeSwatch = useMemo<string | null>(() => {
    if (!selectedCustomTee) return null;
    const meta = CUSTOM_TEE_COLORS.find((c) => c.key === selectedCustomTee.color);
    return meta?.swatch ?? null;
  }, [selectedCustomTee]);
  const handleOpenEditTee = useCallback(() => {
    if (!selectedCustomTee) return;
    setEditingTeeSheet(selectedCustomTee.id);
  }, [selectedCustomTee]);
  const handleCloseTeeSheet = useCallback(() => setEditingTeeSheet(null), []);
  const handleActionMoveTee = useCallback((tee: { id: string }) => {
    setEditingTeeSheet(null);
    setIsMoving(false);
    setPreviewCoord(null);
    setMovingTeeId(tee.id);
    setPreviewTeeCoord(null);
  }, []);
  const handleActionDeleteTee = useCallback(
    (tee: { id: string; course_id: string; hole_number: number }) => {
      Alert.alert(
        'Delete tee?',
        'This removes the custom tee from this hole. Any rounds using it as the origin will fall back to the default tee.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteCustomTee.mutate(
                {
                  id: tee.id,
                  course_id: tee.course_id,
                  hole_number: tee.hole_number,
                },
                {
                  onSuccess: () => {
                    if (teeOverride === tee.id) {
                      clearTeeOverride(roundId, holeNumber);
                      // Clear the DB-side reference so shot 1's
                      // tee_override doesn't dangle at a deleted tee.
                      if (shotOne && shotOne.tee_override === tee.id) {
                        updateShot.mutate({
                          shotId: shotOne.id,
                          roundId,
                          holeNumber,
                          teeOverride: null,
                        });
                      }
                    }
                    setEditingTeeSheet(null);
                  },
                  onError: (err: unknown) => {
                    const message =
                      err instanceof Error ? err.message : 'Unknown error';
                    Alert.alert("Couldn't delete tee", message);
                  },
                }
              );
            },
          },
        ]
      );
    },
    [
      deleteCustomTee,
      teeOverride,
      clearTeeOverride,
      roundId,
      holeNumber,
      shotOne,
      updateShot,
    ]
  );
  const teeMovedNew = useMemo(() => {
    if (!previewTeeCoord || !shot) return null;
    return calculateDistance(
      previewTeeCoord.latitude,
      previewTeeCoord.longitude,
      shot.latitude,
      shot.longitude
    );
  }, [previewTeeCoord, shot]);
  const handleSaveTeePreview = useCallback(() => {
    if (!movingTeeId || !previewTeeCoord) return;
    updateCustomTee.mutate(
      {
        id: movingTeeId,
        latitude: previewTeeCoord.latitude,
        longitude: previewTeeCoord.longitude,
      },
      {
        onSettled: () => {
          setMovingTeeId(null);
          setPreviewTeeCoord(null);
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Unknown error';
          Alert.alert("Couldn't move tee", message);
        },
      }
    );
  }, [movingTeeId, previewTeeCoord, updateCustomTee]);
  const handleCancelTeePreview = useCallback(() => {
    setMovingTeeId(null);
    setPreviewTeeCoord(null);
  }, []);

  const club = CLUBS_BY_KEY[clubKey];
  const playedAt = formatPlayedAt(roundPlayedAt);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={club?.label ?? 'Shot'}
        subtitle={
          courseName
            ? `${courseName} · Hole ${holeNumber}`
            : `Hole ${holeNumber}`
        }
        showBack
        onBack={() => navigation.goBack()}
        rightActions={
          isMoving
            ? [
                {
                  icon: 'close',
                  onPress: onCancelPreview,
                  accessibilityLabel: 'Cancel move',
                },
              ]
            : [
                {
                  icon: 'cursor-move',
                  onPress: () => {
                    setIsMoving(true);
                    setPreviewCoord(null);
                  },
                  accessibilityLabel: 'Move shot on map',
                },
              ]
        }
      />

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          mapType="hybrid"
          initialRegion={initialRegion}
          showsCompass={false}
          showsMyLocationButton={false}
          rotateEnabled
          pitchEnabled={false}
          onMapReady={() => setMapReady(true)}
          onLongPress={onMapLongPress}
          onPress={onMapPress}
          // Lift the platform default (20) so users can pinch-zoom to ~1m
          // detail — needed for tee placement and tracking short putts.
          maxZoomLevel={22}
        >
          {/* Tappable tee markers — only shot 1 has a selectable origin.
              For shot 2+ the origin is the prior shot's landing position
              (drawn separately below) and isn't user-selectable. */}
          {isTeeShot && (
            <TeeMarkerSet
              tees={teeOptions}
              selected={currentSelection}
              onSelect={handleSelectTee}
            />
          )}

          {/* For shot 2+, render a small dimmed origin dot so the user can
              still see where the prior shot landed. Shot 1's origin is
              represented by the selected tee marker above. */}
          {!isTeeShot && origin && (
            <Marker
              coordinate={origin}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.originDot,
                  {
                    backgroundColor: colors.textSecondary,
                    borderColor: colors.surface,
                  },
                ]}
              />
            </Marker>
          )}

          <Marker
            coordinate={shot}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={isMoving}
          >
            <View
              style={[
                styles.shotDot,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.surface,
                  opacity: isMoving ? 0.4 : 1,
                },
              ]}
            />
          </Marker>

          {origin && !isMoving && (
            <DistanceLine from={origin} to={shot} variant="gps-to-pin" />
          )}

          {/* Ghost pin during move-and-confirm. */}
          {previewCoord && <TapMarker coordinate={previewCoord} />}

          {/* Live preview line from origin to candidate position. */}
          {origin && previewCoord && (
            <DistanceLine from={origin} to={previewCoord} variant="gps-to-tap" />
          )}

          {/* Ghost pin for the candidate new tee position. */}
          {movingTeeId && previewTeeCoord && (
            <TapMarker coordinate={previewTeeCoord} />
          )}

          {/* Placed-tee marker during the "add custom tee" flow. */}
          {isPlacingTee && placedTeeCoord && (
            <Marker
              coordinate={placedTeeCoord}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges
              testID="placed-tee-marker"
            >
              <View
                style={[
                  styles.placedTeeDot,
                  {
                    backgroundColor:
                      CUSTOM_TEE_COLORS.find((c) => c.key === placedTeeColor)
                        ?.swatch ?? colors.primary,
                    borderColor: 'white',
                  },
                ]}
              />
            </Marker>
          )}
        </MapView>

        {isMoving && !previewCoord && (
          <View
            style={[
              styles.moveHint,
              shadows.md,
              { backgroundColor: colors.surfaceElevated },
            ]}
            pointerEvents="none"
          >
            <Icon source="gesture-tap" size={18} color={colors.textPrimary} />
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              Tap a new position for this shot
            </Text>
          </View>
        )}

        {isPlacingTee && !placedTeeCoord && (
          <View
            style={[
              styles.moveHint,
              shadows.md,
              { backgroundColor: colors.surfaceElevated },
            ]}
            pointerEvents="none"
          >
            <Icon source="golf-tee" size={18} color={colors.textPrimary} />
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              Tap to place the new tee box
            </Text>
          </View>
        )}

        {isPlacingTee && placedTeeCoord && (
          <View
            style={[
              styles.placeTeeBanner,
              shadows.lg,
              { backgroundColor: colors.surface },
            ]}
            testID="place-tee-banner"
          >
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              Tee colour
            </Text>
            <View style={styles.colorRow}>
              {CUSTOM_TEE_COLORS.map((c) => {
                const selected = placedTeeColor === c.key;
                return (
                  <Pressable
                    key={c.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.label} tee`}
                    accessibilityState={{ selected }}
                    onPress={() => setPlacedTeeColor(c.key)}
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: c.swatch,
                        borderColor: selected ? colors.primary : colors.borderLight,
                        borderWidth: selected ? 3 : 1,
                      },
                    ]}
                    testID={`color-swatch-${c.key}`}
                  />
                );
              })}
            </View>
            <View style={styles.placeTeeActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel adding tee"
                onPress={cancelPlaceTee}
                disabled={createCustomTee.isPending}
                style={[
                  styles.placeTeeButton,
                  styles.placeTeeCancel,
                  { borderColor: colors.border },
                  createCustomTee.isPending && styles.placeTeeButtonDisabled,
                ]}
                testID="place-tee-cancel"
              >
                <Icon source="close" size={18} color={colors.textPrimary} />
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save new tee box"
                onPress={onSavePlacedTee}
                disabled={createCustomTee.isPending}
                style={[
                  styles.placeTeeButton,
                  { backgroundColor: colors.primary },
                  createCustomTee.isPending && styles.placeTeeButtonDisabled,
                ]}
                testID="place-tee-save"
              >
                <Icon source="check" size={18} color={colors.white} />
                <Text style={[typography.body, { color: colors.white, fontWeight: '600' }]}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {!previewCoord && !isPlacingTee && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recenter on shot"
            accessibilityHint="Refits the map to show the shot"
            onPress={handleRecenter}
            style={({ pressed }) => [
              styles.recenter,
              shadows.md,
              {
                backgroundColor: colors.surfaceElevated,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Icon source="image-filter-center-focus" size={24} color={colors.textPrimary} />
          </Pressable>
        )}

        {previewCoord && (
          <MovePreviewBanner
            shotNumber={1}
            shotLabel="Distance"
            movedOriginal={currentDistance}
            movedNew={movedNew}
            nextShotNumber={null}
            nextOriginal={null}
            nextNew={null}
            onSave={onSavePreview}
            onCancel={onCancelPreview}
            isSaving={updateShot.isPending}
            distanceUnit={distanceUnit}
          />
        )}

        {movingTeeId && previewTeeCoord && (
          <MovePreviewBanner
            shotNumber={1}
            shotLabel="Distance"
            movedOriginal={currentDistance}
            movedNew={teeMovedNew}
            nextShotNumber={null}
            nextOriginal={null}
            nextNew={null}
            onSave={handleSaveTeePreview}
            onCancel={handleCancelTeePreview}
            isSaving={updateCustomTee.isPending}
            distanceUnit={distanceUnit}
          />
        )}

        {/* Floating "+ Add tee" pill — top-left of the map. Only relevant
            for shot 1 (where the origin is a tee, not a prior shot's
            landing) and only when the round is linked to a course. Hidden
            while another in-flight flow (move, place-tee, tee-move) is
            open so it doesn't compete with the in-flight banner. */}
        <AddTeePill
          visible={
            isTeeShot &&
            !!courseId &&
            !isMoving &&
            !isPlacingTee &&
            !movingTeeId
          }
          onPress={handleAddCustomTee}
        />

        {/* Edit-tee pill — surfaces when a custom tee is the current origin. */}
        <EditTeePill
          visible={
            isTeeShot &&
            !!selectedCustomTee &&
            !isMoving &&
            !isPlacingTee &&
            !movingTeeId &&
            editingTeeSheet === null
          }
          swatch={editTeeSwatch}
          onPress={handleOpenEditTee}
        />

        <CustomTeeActionSheet
          visible={editingTeeRow !== null}
          tee={editingTeeRow}
          onClose={handleCloseTeeSheet}
          onMoveOnMap={handleActionMoveTee}
          onDelete={handleActionDeleteTee}
        />
      </View>

      <View
        style={[
          styles.footer,
          shadows.md,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + spacing.lg,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {playedAt ?? 'Date unknown'}
            </Text>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              {club?.label ?? clubKey}
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Distance
            </Text>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              {formattedDistance ?? '—'}
            </Text>
          </View>
        </View>
        {!origin && (
          <Text
            style={[
              typography.caption,
              styles.note,
              { color: colors.textSecondary },
            ]}
          >
            Origin position isn&apos;t available for this shot, so the distance
            can&apos;t be shown.
          </Text>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapWrapper: { flex: 1 },
  originDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  shotDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  footerLeft: {
    gap: 2,
  },
  footerRight: {
    gap: 2,
    alignItems: 'flex-end',
  },
  note: {
    marginTop: spacing.sm,
  },
  recenter: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveHint: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  placedTeeDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
  },
  placeTeeBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  placeTeeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  placeTeeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
  },
  placeTeeCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  placeTeeButtonDisabled: {
    opacity: 0.5,
  },
});
