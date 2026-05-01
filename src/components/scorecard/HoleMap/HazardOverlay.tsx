import React from 'react';
import { Polygon } from 'react-native-maps';
import type { HazardPolygon } from '@/types/database/holeHazards.types';

interface HazardOverlayProps {
  hazard: HazardPolygon;
}

const FILL: Record<HazardPolygon['type'], string> = {
  bunker: 'rgba(252, 211, 77, 0.45)', // sand-tan
  water: 'rgba(59, 130, 246, 0.4)', // water-blue
};

const STROKE: Record<HazardPolygon['type'], string> = {
  bunker: 'rgba(180, 130, 30, 0.85)',
  water: 'rgba(37, 99, 235, 0.85)',
};

export const HazardOverlay = React.memo(function HazardOverlay({
  hazard,
}: HazardOverlayProps) {
  if (hazard.polygon.length < 3) return null;

  return (
    <Polygon
      coordinates={hazard.polygon}
      fillColor={FILL[hazard.type]}
      strokeColor={STROKE[hazard.type]}
      strokeWidth={1.5}
      tappable={false}
      testID={`hazard-overlay-${hazard.type}`}
    />
  );
});
