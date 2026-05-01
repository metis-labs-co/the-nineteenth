import React from 'react';
import type { HoleMapMarkers } from '@/hooks/useHoleMapMarkers';
import type { MapTier } from '@/hooks/useMapTier';

interface MapMarkerSetProps {
  markers: HoleMapMarkers;
  tier: MapTier;
}

// Phase A renders nothing — the contract is fixed so Phase B can
// render tee/green markers (tier !== 'free') and Phase C can render
// hazard polygons without changing this component's signature.
export const MapMarkerSet = React.memo(function MapMarkerSet(_: MapMarkerSetProps) {
  return null;
});
