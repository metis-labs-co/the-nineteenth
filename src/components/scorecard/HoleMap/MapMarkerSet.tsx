import React from 'react';
import type {
  HoleMapMarkers,
  TeePoiType,
  GreenPoiType,
} from '@/hooks/useHoleMapMarkers';
import type { MapTier } from '@/hooks/useMapTier';
import { TeePOIMarker } from './TeePOIMarker';
import { GreenPOIMarker } from './GreenPOIMarker';
import { HazardOverlay } from './HazardOverlay';

interface MapMarkerSetProps {
  markers: HoleMapMarkers;
  tier: MapTier;
  selectedTee?: TeePoiType | null;
  selectedGreen?: GreenPoiType | null;
  onTeePress: (type: TeePoiType) => void;
  onGreenPress: (type: GreenPoiType) => void;
}

// Phase A: free tier renders nothing.
// Phase B: social/premium render tee + green POI markers.
// Phase C1: premium also renders hazard polygons (rendered before
// POI markers so the markers appear on top).
export const MapMarkerSet = React.memo(function MapMarkerSet({
  markers,
  tier,
  selectedTee,
  selectedGreen,
  onTeePress,
  onGreenPress,
}: MapMarkerSetProps) {
  if (tier === 'free') return null;

  return (
    <>
      {/* Hazards first so POI markers paint above them. */}
      {tier === 'premium' &&
        markers.hazards.map((hazard) => (
          <HazardOverlay key={hazard.externalId ?? hazard.type} hazard={hazard} />
        ))}
      {markers.tees.map((m) => (
        <TeePOIMarker
          key={m.type}
          type={m.type}
          coordinate={m.coordinate}
          selected={selectedTee === m.type}
          onPress={onTeePress}
        />
      ))}
      {markers.greens.map((m) => (
        <GreenPOIMarker
          key={m.type}
          type={m.type}
          coordinate={m.coordinate}
          selected={selectedGreen === m.type}
          onPress={onGreenPress}
        />
      ))}
    </>
  );
});
