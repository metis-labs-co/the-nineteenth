import React from 'react';
import { render } from '@testing-library/react-native';
import { MapMarkerSet } from '@/components/scorecard/HoleMap/MapMarkerSet';
import type { HoleMapMarkers } from '@/hooks/useHoleMapMarkers';

const markers: HoleMapMarkers = {
  pin: null,
  tees: [{ latitude: 1, longitude: 2 }],
  greens: [],
  hazards: [],
};

describe('MapMarkerSet (Phase A)', () => {
  it('renders nothing on free tier', () => {
    const { queryByTestId } = render(<MapMarkerSet markers={markers} tier="free" />);
    expect(queryByTestId('marker-set')).toBeNull();
  });

  it('renders nothing on social tier in Phase A (will change in Phase B)', () => {
    const { queryByTestId } = render(<MapMarkerSet markers={markers} tier="social" />);
    expect(queryByTestId('marker-set')).toBeNull();
  });

  it('renders nothing on premium tier in Phase A (will change in Phase B/C)', () => {
    const { queryByTestId } = render(<MapMarkerSet markers={markers} tier="premium" />);
    expect(queryByTestId('marker-set')).toBeNull();
  });
});
