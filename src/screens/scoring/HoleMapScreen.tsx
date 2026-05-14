import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, View, StyleSheet } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type LongPressEvent,
  type MapPressEvent,
  type Region,
} from 'react-native-maps';
import { shadows, spacing, typography } from '@/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useThemeColors } from '@/context/ThemeContext';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useHasCoordinates } from '@/hooks/useHoleCoordinates';
import { useCoordinateBackfill } from '@/hooks/useCoordinateBackfill';
import { useHazardBackfill } from '@/hooks/hazards';
import { useMapTier } from '@/hooks/useMapTier';
import {
  useHoleMapMarkers,
  type LatLng,
  type GreenPoiType,
} from '@/hooks/useHoleMapMarkers';
import {
  useShotLog,
  useUpdateShot,
  useDeleteShot,
  useSetShotClub,
  useShotTrackingEligibility,
  useLogShot,
} from '@/hooks/shots';
import { useScorecardStore } from '@/store/scorecardStore';
import { useShotLoggingPrefStore } from '@/store/shotLoggingPrefStore';
import { useAuth } from '@/hooks/useAuth';
import { useBag } from '@/hooks/queries/useBag';
import { BagClubPickerSheet } from '@/components/features/bag/BagClubPickerSheet';
import type { ClubKey } from '@/constants/clubs';
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
  RecenterButton,
  MovePreviewBanner,
  TeeMarkerSet,
  AddTeePill,
  EditTeePill,
  CustomTeeActionSheet,
  LogShotPreviewBanner,
  buildTeeOptions,
  type TeeOption,
} from '@/components/scorecard/HoleMap';
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
import { recomputeAfterMove } from '@/utils/shotDistances';
import { calculateDistance } from '@/utils/gpsCalculations';
import { holeOrientedCamera } from '@/utils/holeOrientation';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HoleMap'>;

const DEFAULT_REGION_DELTA = 0.003;
const DEFAULT_TARGET: GreenPoiType = 'green_center';
// Long-press is detected on the MapView (react-native-maps Marker doesn't
// expose onLongPress reliably across iOS/Android). We snap the press to the
// nearest shot within this radius so the user doesn't have to land exactly
// on a marker — fingers are big and shots cluster around greens.
const LONG_PRESS_SNAP_RADIUS_METRES = 30;

// Hole-camera framing constants and helpers live in `@/utils/holeOrientation`
// so HoleMapScreen and ShotMapScreen can't drift on the visual treatment.

export default function HoleMapScreen({ route, navigation }: Props) {
  const {
    courseId,
    holeNumber,
    roundId,
    mode = 'live',
    strokesScoredAtNav = null,
    roundStatus = 'in-progress',
  } = route.params;
  const isLive = mode === 'live';
  const isLogShot = mode === 'log-shot';
  const colors = useThemeColors();
  const tier = useMapTier();
  // GPS for the user marker + distance-from-here-to-pin line. Each call to
  // `useUserLocation` is an isolated subscription, so we have to start
  // watching from this screen — being granted permission elsewhere (e.g.
  // DistanceToPin on the scorecard) doesn't carry the active subscription.
  const {
    location,
    permissionStatus,
    isLoading: isLoadingLocationPermission,
    isWatching,
    hasBeenAsked,
    requestPermission: requestLocationPermission,
    startWatching: startWatchingLocation,
    stopWatching: stopWatchingLocation,
  } = useUserLocation();
  const { data: hasCoordinates } = useHasCoordinates(courseId);
  const markers = useHoleMapMarkers(courseId, holeNumber, tier);
  const { triggerBackfill } = useCoordinateBackfill(courseId);
  // Only Premium+ tiers see hazard polygons (`useHoleMapMarkers` gates render
  // on `tier === 'premium'`), so free/social viewers shouldn't trigger
  // Overpass ingestion when they open the map. Passing undefined no-ops
  // the hook via its existing courseId-required check.
  useHazardBackfill(tier === 'premium' ? courseId : undefined);
  const { data: shots = [] } = useShotLog(roundId, holeNumber);
  const eligibility = useShotTrackingEligibility(roundId);
  const trackShots = useShotLoggingPrefStore((s) => s.byRound[roundId] === true);
  const updateShot = useUpdateShot();
  const deleteShot = useDeleteShot();
  const setShotClub = useSetShotClub();
  const logShot = useLogShot();
  const updateCustomTee = useUpdateCustomHoleTee();
  const deleteCustomTee = useDeleteCustomHoleTee();
  const { player } = useAuth();
  const { data: bag = [] } = useBag(player?.id);

  const [tap, setTap] = useState<LatLng | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<GreenPoiType>(DEFAULT_TARGET);
  const [activeShot, setActiveShot] = useState<ShotLogEntry | null>(null);
  const [movingShotId, setMovingShotId] = useState<string | null>(null);
  // Pending new position for the shot in `movingShotId`. While non-null,
  // the MovePreviewBanner is rendered showing before/after distances and
  // the user can confirm or cancel. Cleared on save success or cancel.
  const [previewCoord, setPreviewCoord] = useState<LatLng | null>(null);
  // Shot whose club is being edited via the picker. Distinct from `activeShot`
  // so the action sheet can close cleanly while the picker takes over.
  const [clubEditingShot, setClubEditingShot] = useState<ShotLogEntry | null>(null);
  // Place-custom-tee state. Declared up here (rather than alongside the
  // tee-override logic further down) because `onMapPress` / `onMapLongPress`
  // need to read it.
  const [isPlacingTee, setIsPlacingTee] = useState(false);
  const [placedTeeCoord, setPlacedTeeCoord] = useState<LatLng | null>(null);
  const [placedTeeColor, setPlacedTeeColor] = useState<CustomTeeColor>('white');

  // Edit-custom-tee state. `editingTeeSheet` opens the action sheet with
  // Move / Delete options. `movingTeeId` enters the same tap-to-confirm
  // flow as shot moves but for a custom tee row instead — `previewTeeCoord`
  // is the candidate new position.
  const [editingTeeSheet, setEditingTeeSheet] = useState<string | null>(null);
  const [movingTeeId, setMovingTeeId] = useState<string | null>(null);
  const [previewTeeCoord, setPreviewTeeCoord] = useState<LatLng | null>(null);

  // Log-shot mode state. `pendingLogPosition` is the candidate position the
  // user has tapped to place. While non-null, the LogShotPreviewBanner is
  // visible and the user can confirm or cancel. After confirm, the position
  // is held while the BagClubPickerSheet is open (in `logShotStaged`).
  const [pendingLogPosition, setPendingLogPosition] = useState<LatLng | null>(null);
  const [logShotStaged, setLogShotStaged] = useState<{
    position: LatLng;
    /** When true, saving will also bump the player's strokes for this hole. */
    bumpStrokesTo: number | null;
  } | null>(null);
  const [isLogShotSaving, setIsLogShotSaving] = useState(false);

  // First-open prompt: if permission has never been asked, request it as
  // soon as the initial check finishes. After this the system dialog won't
  // re-appear (iOS suppresses repeat prompts), so we only need to ask once.
  // Review mode never auto-prompts — reviewing past shots from anywhere
  // shouldn't trigger a location request.
  useEffect(() => {
    if (!isLive) return;
    if (
      !isLoadingLocationPermission &&
      !hasBeenAsked &&
      permissionStatus === 'undetermined'
    ) {
      requestLocationPermission();
    }
  }, [
    isLive,
    isLoadingLocationPermission,
    hasBeenAsked,
    permissionStatus,
    requestLocationPermission,
  ]);

  // Once permission is granted (now or previously), start the watch
  // subscription on this screen's hook instance. Skipped in review mode —
  // the user marker isn't relevant when looking at a finished round.
  useEffect(() => {
    if (!isLive) return;
    if (permissionStatus === 'granted' && !isWatching) {
      startWatchingLocation();
    }
  }, [isLive, permissionStatus, isWatching, startWatchingLocation]);

  // If location is denied, the OS won't re-show the system permission
  // dialog — we have to point the user at Settings ourselves. Show this
  // once per navigation to the screen so the player gets a fresh nudge
  // each time they open the map but isn't trapped in a re-prompt loop
  // mid-session.
  const deniedAlertShownRef = useRef(false);
  useEffect(() => {
    if (!isLive) return;
    if (
      permissionStatus === 'denied' &&
      !isLoadingLocationPermission &&
      !deniedAlertShownRef.current
    ) {
      deniedAlertShownRef.current = true;
      Alert.alert(
        'Location is off',
        'Enable location access in Settings to see your position on the course map.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  }, [isLive, permissionStatus, isLoadingLocationPermission]);

  const onGpsPress = useCallback(() => {
    if (permissionStatus === 'denied') {
      Linking.openSettings();
      return;
    }
    if (permissionStatus === 'undetermined') {
      requestLocationPermission();
      return;
    }
    // Granted — toggle the watch subscription so the user can pause
    // GPS without leaving the screen (battery / privacy preference).
    if (isWatching) {
      stopWatchingLocation();
    } else {
      startWatchingLocation();
    }
  }, [
    permissionStatus,
    isWatching,
    requestLocationPermission,
    startWatchingLocation,
    stopWatchingLocation,
  ]);

  const userCoord: LatLng | null = location
    ? { latitude: location.latitude, longitude: location.longitude }
    : null;

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

  // The user is standing on the tee box when the map is opened, so their
  // GPS position is the right "from" anchor for the live distance line to
  // the green. Tees are rendered via `TeeMarkerSet` further down — that
  // marker set is for *origin selection* (which tee shot 1 is measured
  // from), not for the distance-from-here-to-pin display.
  const startAnchor: LatLng | null = userCoord;

  const showShotTrail = eligibility.eligible && trackShots && shots.length > 0;
  // Read-only mode shows the trail if any shots exist on the round (regardless of toggle/eligibility).
  const showShotTrailReview = !isLive && shots.length > 0;
  const trailVisible = showShotTrail || showShotTrailReview;

  const onMapPress = useCallback(
    (e: MapPressEvent) => {
      // Place-custom-tee mode takes precedence: each tap repositions the
      // candidate tee marker until the user confirms via the picker banner.
      if (isPlacingTee) {
        setPlacedTeeCoord(e.nativeEvent.coordinate);
        return;
      }
      // Move-tee mode: tap stages a candidate new tee position; confirmed
      // via MovePreviewBanner before the DB write.
      if (movingTeeId) {
        setPreviewTeeCoord(e.nativeEvent.coordinate);
        return;
      }
      // In shot-move mode, taps stage a candidate new position. The user
      // confirms via the MovePreviewBanner before the DB write — first tap
      // drops the ghost pin, subsequent taps reposition it.
      if (movingShotId) {
        setPreviewCoord(e.nativeEvent.coordinate);
        return;
      }
      // Log-shot mode: tap stages a candidate new shot position. The user
      // confirms via the LogShotPreviewBanner before the insert.
      if (isLogShot) {
        setPendingLogPosition(e.nativeEvent.coordinate);
        return;
      }
      setTap(e.nativeEvent.coordinate);
    },
    [movingShotId, movingTeeId, isPlacingTee, isLogShot]
  );

  const onGreenPress = useCallback((type: GreenPoiType) => {
    setSelectedTarget(type);
  }, []);

  const onReset = useCallback(() => {
    setTap(null);
    setSelectedTarget(DEFAULT_TARGET);
    setMovingShotId(null);
    setPreviewCoord(null);
    setMovingTeeId(null);
    setPreviewTeeCoord(null);
  }, []);

  const onClose = useCallback(() => navigation.goBack(), [navigation]);

  // Tap on a shot marker → action sheet (Move / Change Club / Delete).
  // Available in both live and review mode so users can correct shots after
  // the round, not just during it.
  const onShotPress = useCallback(
    (shot: ShotLogEntry) => {
      setActiveShot(shot);
    },
    []
  );

  // Long-press fast path: skip the action sheet, drop straight into move mode.
  // Triggered by the map-level onLongPress handler below, which snaps the
  // press to the nearest shot within LONG_PRESS_SNAP_RADIUS_METRES.
  const onShotLongPress = useCallback((shot: ShotLogEntry) => {
    setActiveShot(null);
    setPreviewCoord(null);
    setTap(null);
    setMovingShotId(shot.id);
  }, []);

  // Long-press anywhere on the map: find the nearest shot within snap radius
  // and enter move mode for it. If already in move mode, ignore — taps stage
  // the new position; long-press would be an accidental gesture mid-drag.
  const onMapLongPress = useCallback(
    (e: LongPressEvent) => {
      if (movingShotId || movingTeeId || isPlacingTee || isLogShot) return;
      if (shots.length === 0) return;

      const press = e.nativeEvent.coordinate;
      let nearestShot: ShotLogEntry | null = null;
      let nearestDistance = Infinity;
      // `<=` so that on a tie (e.g. shot N moved onto shot N+1 — same coord),
      // the higher-sequence shot wins. That matches the visual stacking
      // order — later shots render on top, so the user is targeting the one
      // they can see.
      for (const shot of shots) {
        const d = calculateDistance(
          press.latitude,
          press.longitude,
          shot.latitude,
          shot.longitude
        );
        if (d <= nearestDistance) {
          nearestDistance = d;
          nearestShot = shot;
        }
      }

      if (!nearestShot || nearestDistance > LONG_PRESS_SNAP_RADIUS_METRES) {
        return;
      }
      onShotLongPress(nearestShot);
    },
    [movingShotId, movingTeeId, isPlacingTee, isLogShot, shots, onShotLongPress]
  );

  const closeActionSheet = useCallback(() => setActiveShot(null), []);

  const onActionDelete = useCallback(
    (shot: ShotLogEntry) => {
      deleteShot.mutate(
        { shotId: shot.id, roundId, holeNumber },
        {
          onError: (err: unknown) => {
            console.error('[HoleMap] deleteShot failed:', err);
            Alert.alert(
              "Couldn't delete shot",
              "We couldn't delete the shot. Try again."
            );
          },
        }
      );
      setActiveShot(null);
    },
    [deleteShot, roundId, holeNumber]
  );

  const onActionMove = useCallback((shot: ShotLogEntry) => {
    setMovingShotId(shot.id);
    setPreviewCoord(null);
    setTap(null);
    setActiveShot(null);
  }, []);

  const onSavePreview = useCallback(() => {
    if (!movingShotId || !previewCoord) return;
    updateShot.mutate(
      {
        shotId: movingShotId,
        roundId,
        holeNumber,
        latitude: previewCoord.latitude,
        longitude: previewCoord.longitude,
      },
      {
        onError: (err: unknown) => {
          console.error('[HoleMap] move shot failed:', err);
          Alert.alert(
            "Couldn't move shot",
            "We couldn't save the new position. Try again."
          );
        },
        onSettled: () => {
          setMovingShotId(null);
          setPreviewCoord(null);
        },
      }
    );
  }, [movingShotId, previewCoord, updateShot, roundId, holeNumber]);

  const onCancelPreview = useCallback(() => {
    setMovingShotId(null);
    setPreviewCoord(null);
  }, []);

  // ─────────────── Log-shot mode ───────────────
  // Cap behaviour around `strokesScoredAtNav` (the strokes the player has
  // entered for this hole at the time the map was opened):
  //   • completed round: strict — never exceed strokes. (Button hidden upstream.)
  //   • in-progress: if shots+1 > strokes, prompt and bump strokes on confirm.
  //   • unknown strokes: no cap, no prompt.

  const promptForBump = useCallback(
    (currentShots: number, currentStrokes: number): Promise<boolean> => {
      return new Promise((resolve) => {
        Alert.alert(
          'Add an extra shot?',
          `You scored ${currentStrokes} on this hole. Logging this shot will bump your score to ${currentShots + 1}.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Log shot', onPress: () => resolve(true) },
          ]
        );
      });
    },
    []
  );

  const onLogShotConfirm = useCallback(async () => {
    if (!pendingLogPosition) return;
    const n = shots.length;
    const s = strokesScoredAtNav;

    // Defensive: completed-round + over cap should never reach here (the
    // upstream button is hidden), but if it does, refuse and surface the
    // reason rather than silently logging.
    if (roundStatus === 'completed' && s != null && n >= s) {
      Alert.alert(
        'Cannot exceed score',
        `You scored ${s} on this hole and the round is finished. Update your scorecard first if you took more shots.`
      );
      return;
    }

    // In-progress overflow → prompt to bump.
    let bumpStrokesTo: number | null = null;
    if (roundStatus === 'in-progress' && s != null && n + 1 > s) {
      const ok = await promptForBump(n, s);
      if (!ok) return;
      bumpStrokesTo = n + 1;
    }

    // Stage the shot — actual insert runs after the user picks a club, so we
    // don't write a clubless row that needs back-filling.
    setLogShotStaged({ position: pendingLogPosition, bumpStrokesTo });
  }, [
    pendingLogPosition,
    shots.length,
    strokesScoredAtNav,
    roundStatus,
    promptForBump,
  ]);

  const onLogShotCancel = useCallback(() => {
    setPendingLogPosition(null);
  }, []);

  /** Hydrate the scorecard store from SQLite if it isn't already set up for
   *  this round. Returns true when the store is ready for `setPlayerScore`. */
  const ensureScorecardStoreHydrated = useCallback(async (): Promise<boolean> => {
    const state = useScorecardStore.getState();
    if (state.currentRoundId === roundId && state.groupScorecards.size > 0) {
      return true;
    }
    try {
      return await state.loadFromOffline(roundId);
    } catch (err) {
      console.error('[HoleMap log-shot] loadFromOffline failed:', err);
      return false;
    }
  }, [roundId]);

  const onLogShotClubPicked = useCallback(
    async (clubKey: ClubKey) => {
      if (!logShotStaged || !player) return;
      // Re-entry guard: ignore further taps while a save is already running
      // — `BagClubPickerSheet` doesn't expose a `saving` prop so we have to
      // gate at the handler level.
      if (isLogShotSaving) return;
      const { position, bumpStrokesTo } = logShotStaged;
      setIsLogShotSaving(true);
      try {
        // Step 1: bump strokes if needed. Done before the shot insert so a
        // failed insert doesn't leave the score bumped without a shot — but
        // a failed bump short-circuits before any DB writes happen.
        if (bumpStrokesTo != null) {
          const ready = await ensureScorecardStoreHydrated();
          if (!ready) {
            Alert.alert(
              "Couldn't update score",
              "Open Continue Scoring once before adding a shot above your stroke count, so your scorecard is loaded on this device."
            );
            return;
          }
          try {
            await useScorecardStore
              .getState()
              .setPlayerScore(player.id, holeNumber, bumpStrokesTo, player.id);
          } catch (err) {
            console.error('[HoleMap log-shot] setPlayerScore failed:', err);
            Alert.alert(
              "Couldn't update score",
              "We couldn't bump your score for this hole. Try again, or update your scorecard manually."
            );
            return;
          }
        }

        // Step 2: insert the shot. Pass the local tee override so it
        // gets persisted onto shot 1 — only meaningful for the first
        // shot, ignored on later shots by the mutation.
        try {
          await logShot.mutateAsync({
            roundId,
            holeNumber,
            latitude: position.latitude,
            longitude: position.longitude,
            clubKey,
            accuracyMeters: null,
            teeOverride:
              useTeeOverrideStore.getState().getOverride(roundId, holeNumber),
          });
        } catch (err) {
          console.error('[HoleMap log-shot] logShot failed:', err);
          Alert.alert(
            "Couldn't save shot",
            bumpStrokesTo != null
              ? "Your score bumped but the shot couldn't be saved. Try again."
              : "We couldn't save the shot. Try again."
          );
          return;
        }

        // Success — clear staging + pending position.
        setLogShotStaged(null);
        setPendingLogPosition(null);
      } finally {
        setIsLogShotSaving(false);
      }
    },
    [
      logShotStaged,
      player,
      isLogShotSaving,
      ensureScorecardStoreHydrated,
      logShot,
      roundId,
      holeNumber,
    ]
  );

  const onLogShotPickerCancel = useCallback(() => {
    // Cancelling the club picker aborts the whole staged add — no shot,
    // no bump. Atomic on intent.
    setLogShotStaged(null);
  }, []);

  const onActionChangeClub = useCallback((shot: ShotLogEntry) => {
    setClubEditingShot(shot);
    setActiveShot(null);
  }, []);

  const onClubPickedForEdit = useCallback(
    (clubKey: ClubKey) => {
      if (!clubEditingShot) return;
      const target = clubEditingShot;
      setClubEditingShot(null);
      setShotClub.mutate(
        {
          shotId: target.id,
          roundId: target.round_id,
          holeNumber: target.hole_number,
          clubKey,
        },
        {
          onError: (err: unknown) => {
            console.error('[HoleMap] setShotClub failed:', err);
            Alert.alert(
              "Couldn't change club",
              "We couldn't update the club. Try again."
            );
          },
        }
      );
    },
    [clubEditingShot, setShotClub]
  );

  // Track the imperative MapView so we can animate the camera once we have
  // real coordinates to focus on. Without this, `initialRegion` is the only
  // chance to position the map — and it's evaluated once at mount, before
  // markers.pin / userCoord have resolved, so the map opens at (0,0)
  // (Atlantic Ocean → solid navy in satellite view) and stays there.
  const mapRef = useRef<MapView | null>(null);

  // Recenter on the user's current GPS without disturbing zoom or heading,
  // so the player can return to themselves after panning around the hole.
  const onRecenterPress = useCallback(() => {
    if (!userCoord) return;
    mapRef.current?.animateCamera({ center: userCoord }, { duration: 400 });
  }, [userCoord]);

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

    // Best case: both ends of the hole are known — frame the hole with
    // green at top, tee at bottom, camera near the green.
    const oriented = holeOrientedCamera(teeAnchor, greenAnchor);
    if (oriented) {
      focusedHoleRef.current = holeNumber;
      mapRef.current?.animateCamera(oriented, { duration: 400 });
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

  // Memoise the moved-shot index, the chosen tee anchor, and the recompute
  // result so the banner re-renders only when something actually changes.
  const sortedShots = useMemo(
    () => [...shots].sort((a, b) => a.sequence - b.sequence),
    [shots]
  );
  const movedIndex = useMemo(
    () =>
      movingShotId
        ? sortedShots.findIndex((s) => s.id === movingShotId)
        : -1,
    [movingShotId, sortedShots]
  );
  const teeOverride = useTeeOverrideStore((s) =>
    s.byRoundHole[`${roundId}::${holeNumber}`] ?? null
  );
  const setTeeOverride = useTeeOverrideStore((s) => s.setOverride);
  const clearTeeOverride = useTeeOverrideStore((s) => s.clearOverride);

  const backTeeCoord = useMemo<LatLng | null>(
    () => markers.tees.find((t) => t.type === 'tee_back')?.coordinate ?? null,
    [markers.tees]
  );
  const frontTeeCoord = useMemo<LatLng | null>(
    () => markers.tees.find((t) => t.type === 'tee_front')?.coordinate ?? null,
    [markers.tees]
  );

  // User-defined custom tees for this hole.
  const { data: customTees = [] } = useCustomHoleTees(courseId, holeNumber);
  const selectedCustomTee = useMemo(
    () =>
      teeOverride
        ? customTees.find((t) => t.id === teeOverride) ?? null
        : null,
    [teeOverride, customTees]
  );
  const createCustomTee = useCreateCustomHoleTee();

  // Effective tee anchor: explicit override wins (when its coord exists),
  // otherwise default to back, then front, then null. Custom tee overrides
  // are honoured here too — `customTees` is loaded by id so the anchor
  // updates as soon as the user picks one.
  const teeAnchor = useMemo<LatLng | null>(() => {
    if (selectedCustomTee) {
      return {
        latitude: selectedCustomTee.latitude,
        longitude: selectedCustomTee.longitude,
      };
    }
    if (teeOverride === 'front' && frontTeeCoord) return frontTeeCoord;
    if (teeOverride === 'back' && backTeeCoord) return backTeeCoord;
    return backTeeCoord ?? frontTeeCoord ?? null;
  }, [selectedCustomTee, teeOverride, backTeeCoord, frontTeeCoord]);

  // Which tee is *currently* in effect (after fallback) — drives the
  // selected indicator inside the chooser sheet.
  const currentSelection: TeeOverride | null = useMemo(() => {
    if (selectedCustomTee) return selectedCustomTee.id;
    if (teeOverride === 'front' && frontTeeCoord) return 'front';
    if (teeOverride === 'back' && backTeeCoord) return 'back';
    if (backTeeCoord) return 'back';
    if (frontTeeCoord) return 'front';
    return null;
  }, [selectedCustomTee, teeOverride, backTeeCoord, frontTeeCoord]);

  // Map back/front POIs to the course's longest/shortest TeeBoxes so the
  // tee markers render in the actual tee colour.
  const courseTeeColors = useCourseTeeColors(courseId);

  // All tees for this hole, ready to render via TeeMarkerSet. Tap any of
  // them and the host store records the choice as this round/hole's
  // origin. Available in both live and review modes — players want to
  // set the correct tee at the start of a round (so shot 1 distances are
  // right) and to fix it retrospectively after a round.
  const teeOptions = useMemo<TeeOption[]>(
    () =>
      buildTeeOptions({
        backTeeCoord,
        frontTeeCoord,
        customTees,
        backColor: courseTeeColors.back,
        frontColor: courseTeeColors.front,
      }),
    [backTeeCoord, frontTeeCoord, customTees, courseTeeColors]
  );
  // Shot 1 row, when it exists. The tee_override column lives on this
  // row so it follows the user across devices — every tee selection /
  // clear funnels through `updateShot.mutate({ teeOverride })`.
  const shotOne = useMemo(
    () => shots.find((s) => s.sequence === 1) ?? null,
    [shots]
  );
  const handleSelectTee = useCallback(
    (tee: TeeOverride) => {
      // Local store first for instant UI feedback; DB write follows so
      // the choice persists across devices. When shot 1 doesn't exist
      // yet, the local value rides along on `useLogShot` (see the
      // log-shot mutation call site).
      const previousTee = useTeeOverrideStore
        .getState()
        .getOverride(roundId, holeNumber);
      setTeeOverride(roundId, holeNumber, tee);
      if (shotOne) {
        updateShot.mutate(
          {
            shotId: shotOne.id,
            roundId,
            holeNumber,
            teeOverride: tee,
          },
          {
            onError: (err: unknown) => {
              console.error('[HoleMap] setTeeOverride failed:', err);
              // Roll the local store back so it doesn't drift from the DB.
              if (previousTee) {
                setTeeOverride(roundId, holeNumber, previousTee);
              } else {
                clearTeeOverride(roundId, holeNumber);
              }
              Alert.alert(
                "Couldn't change tee",
                "We couldn't save the tee selection. Try again."
              );
            },
          }
        );
      }
    },
    [setTeeOverride, clearTeeOverride, roundId, holeNumber, shotOne, updateShot]
  );

  // Hydrate from DB and back-fill any local-only legacy data.
  // Two-way sync runs when shot 1 first becomes available:
  //   1. DB has a tee_override → seed/correct the local store.
  //   2. Local store has a value but DB doesn't → push to DB so it
  //      follows the user (auto-migration of pre-DB local data).
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

  // Edit-custom-tee handlers — the action sheet, the in-flight move, and
  // the delete-with-confirmation flow. Only relevant when a custom tee is
  // currently selected (system back/front tees are read-only course data).
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
    setMovingShotId(null);
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
                      // Also clear the DB-side reference so shot 1's
                      // tee_override doesn't dangle at a deleted custom tee.
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

  const handleAddCustomTee = useCallback(() => {
    if (!courseId) {
      Alert.alert(
        'No course linked',
        "This round isn't linked to a course, so a custom tee can't be saved against it.",
        [{ text: 'OK' }]
      );
      return;
    }
    // Cancel any in-flight shot or tee move before entering place-tee mode.
    setMovingShotId(null);
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
          setTeeOverride(roundId, holeNumber, created.id);
          setIsPlacingTee(false);
          setPlacedTeeCoord(null);
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : typeof err === 'object' && err && 'message' in err
                ? String((err as { message: unknown }).message)
                : 'Unknown error';
          Alert.alert(
            "Couldn't save tee box",
            `${message}\n\nIf you haven't already, run the 20260508000000_create_custom_hole_tees.sql migration against your Supabase project.`,
            [{ text: 'OK' }]
          );
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
  const movePreview = useMemo(() => {
    if (movedIndex < 0 || !previewCoord) return null;
    return recomputeAfterMove(sortedShots, movedIndex, previewCoord, teeAnchor);
  }, [movedIndex, previewCoord, sortedShots, teeAnchor]);

  // Distance pair for the tee-move preview banner. Anchor preference:
  // shot 1 if any shots are logged, else the green pin so the player has
  // *some* reference point. Falls back to nulls when neither is available.
  const teeMovePreview = useMemo(() => {
    if (!movingTeeId || !previewTeeCoord || !teeAnchor) return null;
    const anchor =
      sortedShots[0]
        ? {
            latitude: sortedShots[0].latitude,
            longitude: sortedShots[0].longitude,
          }
        : markers.pin;
    if (!anchor) return null;
    return {
      label: sortedShots[0] ? 'Shot 1' : 'To pin',
      original: calculateDistance(
        teeAnchor.latitude,
        teeAnchor.longitude,
        anchor.latitude,
        anchor.longitude
      ),
      next: calculateDistance(
        previewTeeCoord.latitude,
        previewTeeCoord.longitude,
        anchor.latitude,
        anchor.longitude
      ),
    };
  }, [movingTeeId, previewTeeCoord, teeAnchor, sortedShots, markers.pin]);

  // Prior anchor for the log-shot preview: last shot if any, else the tee.
  const logShotPriorAnchor: LatLng | null = useMemo(() => {
    if (sortedShots.length > 0) {
      const last = sortedShots[sortedShots.length - 1];
      return { latitude: last.latitude, longitude: last.longitude };
    }
    return teeAnchor;
  }, [sortedShots, teeAnchor]);

  const logShotPreviewDistance = useMemo<number | null>(() => {
    if (!pendingLogPosition || !logShotPriorAnchor) return null;
    return calculateDistance(
      logShotPriorAnchor.latitude,
      logShotPriorAnchor.longitude,
      pendingLogPosition.latitude,
      pendingLogPosition.longitude
    );
  }, [pendingLogPosition, logShotPriorAnchor]);

  const logShotIsAboveCap =
    isLogShot &&
    strokesScoredAtNav != null &&
    shots.length + 1 > strokesScoredAtNav;

  const canReset =
    tap !== null ||
    selectedTarget !== DEFAULT_TARGET ||
    movingShotId !== null ||
    previewCoord !== null ||
    movingTeeId !== null ||
    previewTeeCoord !== null;
  // Show the "no coordinates" overlay when the course has none at all OR
  // when this specific hole has no pin and we have no user GPS to fall back
  // to. Without the second case, the map opens on a coordinate-less hole
  // showing only featureless ocean (the bug we just fixed for navy-screen).
  const showFallback = hasCoordinates === false || focusCoord === null;

  return (
    <SafeAreaView
      // surfaceElevated (not background) so the safe-area inset above the
      // header stays opaque. `colors.background` is transparent when the
      // image backdrop is enabled, which on a modal screen exposes the
      // default white modal backdrop and looks like a white status-bar strip.
      style={[styles.flex, { backgroundColor: colors.surfaceElevated }]}
      edges={['top']}
    >
      <MapHeader
        holeNumber={holeNumber}
        canReset={canReset}
        onClose={onClose}
        onReset={onReset}
        gpsPermission={isLoadingLocationPermission ? 'loading' : permissionStatus}
        gpsActive={isWatching}
        onGpsPress={onGpsPress}
      />

      <View style={styles.flex}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          mapType="satellite"
          initialRegion={initialRegion}
          onPress={onMapPress}
          onLongPress={onMapLongPress}
          showsUserLocation={false}
          // Default is 20 — this caps pinch-zoom at "city block" scale,
          // which is too coarse for putt-tracking. Bump to the satellite
          // imagery cap so users can zoom in to ~1m detail when needed.
          maxZoomLevel={22}
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
            selectedGreen={tier === 'free' ? null : selectedTarget}
            onGreenPress={onGreenPress}
          />

          {trailVisible && (
            <ShotTrail
              shots={shots}
              target={targetCoord}
              origin={teeAnchor}
              onShotPress={isLogShot ? undefined : onShotPress}
              movingShotId={movingShotId}
            />
          )}

          {/* Tappable tee markers — every available tee for this hole.
              Tapping switches the round/hole's origin via teeOverrideStore. */}
          <TeeMarkerSet
            tees={teeOptions}
            selected={currentSelection}
            onSelect={handleSelectTee}
          />

          {/* Ghost pin — candidate new position while move-and-confirm is open. */}
          {movingShotId && previewCoord && (
            <TapMarker coordinate={previewCoord} />
          )}

          {/* Ghost pin for the candidate new tee position during a tee move. */}
          {movingTeeId && previewTeeCoord && (
            <TapMarker coordinate={previewTeeCoord} />
          )}

          {/* Log-shot candidate position — same TapMarker visual as move mode. */}
          {isLogShot && pendingLogPosition && (
            <TapMarker coordinate={pendingLogPosition} />
          )}
        </MapView>

        {showFallback && (
          <NoCoordinatesFallback onRequestBackfill={triggerBackfill} />
        )}

        <RecenterButton visible={!!userCoord} onPress={onRecenterPress} />

        <ShotMarkerActionSheet
          visible={activeShot !== null}
          shot={activeShot}
          onClose={closeActionSheet}
          onDelete={onActionDelete}
          onMoveOnMap={onActionMove}
          onChangeClub={onActionChangeClub}
        />

        {/* Hide the move-preview banner while the action sheet is open so the
            two surfaces don't visually collide at the bottom of the screen. */}
        {movingShotId && previewCoord && movedIndex >= 0 && movePreview && !activeShot && (
          <MovePreviewBanner
            shotNumber={sortedShots[movedIndex].sequence}
            movedOriginal={movePreview.movedOriginal}
            movedNew={movePreview.movedNew}
            nextShotNumber={
              movedIndex + 1 < sortedShots.length
                ? sortedShots[movedIndex + 1].sequence
                : null
            }
            nextOriginal={movePreview.nextOriginal}
            nextNew={movePreview.nextNew}
            onSave={onSavePreview}
            onCancel={onCancelPreview}
            isSaving={updateShot.isPending}
          />
        )}

        {/* Tee-move preview banner — same visual treatment as the shot one
            so users recognise the pattern. Reuses MovePreviewBanner with a
            "Tee" label and the shot 1 (or to-pin) distance shift. */}
        {movingTeeId && previewTeeCoord && teeMovePreview && (
          <MovePreviewBanner
            shotNumber={1}
            shotLabel={teeMovePreview.label}
            movedOriginal={teeMovePreview.original}
            movedNew={teeMovePreview.next}
            nextShotNumber={null}
            nextOriginal={null}
            nextNew={null}
            onSave={handleSaveTeePreview}
            onCancel={handleCancelTeePreview}
            isSaving={updateCustomTee.isPending}
          />
        )}

        {isLogShot && pendingLogPosition && logShotStaged === null && (
          <LogShotPreviewBanner
            shotNumber={shots.length + 1}
            distanceMeters={logShotPreviewDistance}
            isAboveCap={logShotIsAboveCap}
            isSaving={false}
            onCancel={onLogShotCancel}
            onSave={onLogShotConfirm}
          />
        )}

        <BagClubPickerSheet
          visible={clubEditingShot !== null}
          bag={bag}
          title="Change club"
          onPick={onClubPickedForEdit}
          onCancel={() => setClubEditingShot(null)}
        />

        <BagClubPickerSheet
          visible={logShotStaged !== null}
          bag={bag}
          title="Pick club used"
          onPick={onLogShotClubPicked}
          onCancel={onLogShotPickerCancel}
        />

        {/* Floating "+ Add tee" pill — top-left of the map, opens the
            existing place-custom-tee flow. Hidden when the map is in a
            modal-ish state (placing a tee, logging a shot, moving a shot
            or tee) so it doesn't compete with the in-flight banner. */}
        <AddTeePill
          visible={
            !!courseId &&
            !isPlacingTee &&
            !isLogShot &&
            !movingShotId &&
            !movingTeeId
          }
          onPress={handleAddCustomTee}
        />

        {/* Edit-tee pill — only visible when a user-created custom tee is
            currently selected as origin. Tapping opens the action sheet
            with Move / Delete options. */}
        <EditTeePill
          visible={
            !!selectedCustomTee &&
            !isPlacingTee &&
            !isLogShot &&
            !movingShotId &&
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

        {isPlacingTee && !placedTeeCoord && (
          <View
            style={[
              styles.placeTeeHint,
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
                <Text style={[typography.body, { color: colors.white, fontWeight: '600' }]}>
                  {createCustomTee.isPending ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  placedTeeDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
  },
  placeTeeHint: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  placeTeeBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  placeTeeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  placeTeeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 9999,
    paddingHorizontal: 24,
  },
  placeTeeCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  placeTeeButtonDisabled: {
    opacity: 0.5,
  },
});
