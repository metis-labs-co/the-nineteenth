import React from 'react';
import { render } from '@testing-library/react-native';
import { HazardOverlay } from '@/components/scorecard/HoleMap/HazardOverlay';
import type { HazardPolygon } from '@/types/database/holeHazards.types';

const triangle = [
  { latitude: 0, longitude: 0 },
  { latitude: 1, longitude: 0 },
  { latitude: 1, longitude: 1 },
  { latitude: 0, longitude: 0 },
];

const bunker: HazardPolygon = {
  type: 'bunker',
  source: 'osm',
  externalId: 'osm/way/1',
  polygon: triangle,
};

const water: HazardPolygon = {
  type: 'water',
  source: 'osm',
  externalId: 'osm/way/2',
  polygon: triangle,
};

describe('HazardOverlay', () => {
  it('renders bunker polygon', () => {
    const { getByTestId } = render(<HazardOverlay hazard={bunker} />);
    expect(getByTestId('hazard-overlay-bunker')).toBeTruthy();
  });

  it('renders water polygon', () => {
    const { getByTestId } = render(<HazardOverlay hazard={water} />);
    expect(getByTestId('hazard-overlay-water')).toBeTruthy();
  });

  it('renders nothing for malformed polygons (<3 points)', () => {
    const malformed: HazardPolygon = { ...bunker, polygon: triangle.slice(0, 2) };
    const { queryByTestId } = render(<HazardOverlay hazard={malformed} />);
    expect(queryByTestId('hazard-overlay-bunker')).toBeNull();
  });
});
