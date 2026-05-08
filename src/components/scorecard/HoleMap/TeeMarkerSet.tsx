/**
 * TeeMarkerSet — renders every tee for a hole as a tappable map marker.
 *
 * The selected tee renders larger with a white ring; unselected tees are
 * small coloured dots. Tap any marker to set it as the round/hole's tee
 * origin via the host's `onSelect` callback.
 *
 * `onPress` is bound to the `<Marker>` prop (not an inner Pressable)
 * because under `PROVIDER_GOOGLE` on iOS, custom Marker children are
 * rendered as bitmaps and don't propagate touches to inner Pressables.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type { LatLng } from '@/hooks/useHoleMapMarkers';
import type { TeeOverride } from '@/store/teeOverrideStore';
import {
  CUSTOM_TEE_COLORS,
  type CustomHoleTee,
} from '@/types/database/customHoleTees.types';
import type { TeeColorInfo } from '@/utils/teeColors';

const NEUTRAL_SWATCH = '#9E9E9E';

export interface TeeOption {
  /** 'back' | 'front' | customTee.id — what gets stored in teeOverrideStore. */
  key: TeeOverride;
  coordinate: LatLng;
  /** Hex swatch — back/front from `useCourseTeeColors`, customs from CUSTOM_TEE_COLORS. */
  swatch: string;
  /** Accessibility label, e.g. "Black tee (back)" or "White tee — custom". */
  label: string;
}

export interface TeeMarkerSetProps {
  tees: TeeOption[];
  selected: TeeOverride | null;
  onSelect: (key: TeeOverride) => void;
}

export const TeeMarkerSet = React.memo(function TeeMarkerSet({
  tees,
  selected,
  onSelect,
}: TeeMarkerSetProps) {
  if (tees.length === 0) return null;
  return (
    <>
      {tees.map((tee) => (
        <TeeMarker
          key={tee.key}
          tee={tee}
          isSelected={selected === tee.key}
          onSelect={onSelect}
        />
      ))}
    </>
  );
});

interface TeeMarkerProps {
  tee: TeeOption;
  isSelected: boolean;
  onSelect: (key: TeeOverride) => void;
}

const TeeMarker = React.memo(function TeeMarker({
  tee,
  isSelected,
  onSelect,
}: TeeMarkerProps) {
  const handlePress = useCallback(() => onSelect(tee.key), [onSelect, tee.key]);

  // react-native-maps renders custom Marker views as static bitmaps under
  // PROVIDER_GOOGLE; with `tracksViewChanges={false}` the bitmap is frozen.
  // Briefly re-track whenever the swatch or selection state changes so the
  // visual updates in place, then disable tracking again for scroll/zoom
  // performance — same dance as ShotNumberMarker uses.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(t);
  }, [tee.swatch, isSelected, tee.coordinate.latitude, tee.coordinate.longitude]);

  return (
    <Marker
      coordinate={tee.coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      onPress={handlePress}
      tappable
      accessibilityLabel={tee.label}
      testID={`tee-marker-${tee.key}`}
    >
      <View
        style={[
          isSelected ? styles.selectedDot : styles.unselectedDot,
          { backgroundColor: tee.swatch, borderColor: 'white' },
        ]}
      />
    </Marker>
  );
});

const styles = StyleSheet.create({
  unselectedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  selectedDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
  },
});

interface BuildTeeOptionsArgs {
  /** GolfAPI tee_back POI coordinate, or null when not in the course data. */
  backTeeCoord: LatLng | null;
  /** GolfAPI tee_front POI coordinate, or null when not in the course data. */
  frontTeeCoord: LatLng | null;
  /** User-defined custom tees for this hole. Empty array if none. */
  customTees: CustomHoleTee[];
  /** Resolved colour for the back POI (from the course's longest TeeBox). */
  backColor: TeeColorInfo;
  /** Resolved colour for the front POI (from the course's shortest TeeBox). */
  frontColor: TeeColorInfo;
}

/**
 * Compose the array of tee markers to render on the map. Returned in a
 * deterministic order: back, front, customs in `created_at` order. Tees
 * with no coordinate (i.e. not in the course data) are omitted.
 */
export function buildTeeOptions({
  backTeeCoord,
  frontTeeCoord,
  customTees,
  backColor,
  frontColor,
}: BuildTeeOptionsArgs): TeeOption[] {
  const out: TeeOption[] = [];
  if (backTeeCoord) {
    const colourName = backColor.label;
    out.push({
      key: 'back',
      coordinate: backTeeCoord,
      swatch: backColor.swatch ?? NEUTRAL_SWATCH,
      label: colourName ? `${colourName} tee (back)` : 'Back tee',
    });
  }
  if (frontTeeCoord) {
    const colourName = frontColor.label;
    out.push({
      key: 'front',
      coordinate: frontTeeCoord,
      swatch: frontColor.swatch ?? NEUTRAL_SWATCH,
      label: colourName ? `${colourName} tee (front)` : 'Front tee',
    });
  }
  for (const tee of customTees) {
    const meta = CUSTOM_TEE_COLORS.find((c) => c.key === tee.color);
    out.push({
      key: tee.id,
      coordinate: { latitude: tee.latitude, longitude: tee.longitude },
      swatch: meta?.swatch ?? NEUTRAL_SWATCH,
      label: meta?.label ? `${meta.label} tee — custom` : 'Custom tee',
    });
  }
  return out;
}
