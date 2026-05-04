import React from 'react';
import type {
  HoleMapMarkers,
  GreenPoiType,
} from '@/hooks/useHoleMapMarkers';
import type { MapTier } from '@/hooks/useMapTier';
import { GreenPOIMarker } from './GreenPOIMarker';
import { HazardOverlay } from './HazardOverlay';

interface MapMarkerSetProps {
  markers: HoleMapMarkers;
  tier: MapTier;
  selectedGreen?: GreenPoiType | null;
  onGreenPress: (type: GreenPoiType) => void;
}

// Phase A: free tier renders nothing.
// Phase B: social/premium render green POI markers.
// Phase C1: premium also renders hazard polygons (rendered before
// POI markers so the markers appear on top).
//
// Tee POI markers are intentionally NOT rendered: the player is
// standing on the tee box when the map is opened, so a tee marker
// adds no information and previously misled users by suggesting the
// rendered tee position matched the tee they selected for the round
// (which the upstream coordinate data can't actually represent —
// only `tee_back` and `tee_front` GPS points exist per hole).
export const MapMarkerSet = React.memo(function MapMarkerSet({
  markers,
  tier,
  selectedGreen,
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
