import React from 'react';
import type {
  HoleMapMarkers,
  TeePoiType,
  GreenPoiType,
} from '@/hooks/useHoleMapMarkers';
import type { MapTier } from '@/hooks/useMapTier';
import { TeePOIMarker } from './TeePOIMarker';
import { GreenPOIMarker } from './GreenPOIMarker';

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
// Phase C will additionally render hazard polygons.
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
