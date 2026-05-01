import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapMarkerSet } from '@/components/scorecard/HoleMap/MapMarkerSet';
import type { HoleMapMarkers } from '@/hooks/useHoleMapMarkers';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#16a34a',
    success: '#22c55e',
    textSecondary: '#6b7280',
  }),
}));

const fullMarkers: HoleMapMarkers = {
  pin: { latitude: -37.821, longitude: 144.971 },
  tees: [
    { type: 'tee_back', coordinate: { latitude: -37.81, longitude: 144.96 } },
    { type: 'tee_front', coordinate: { latitude: -37.811, longitude: 144.961 } },
  ],
  greens: [
    { type: 'green_front', coordinate: { latitude: -37.82, longitude: 144.97 } },
    { type: 'green_center', coordinate: { latitude: -37.821, longitude: 144.971 } },
    { type: 'green_back', coordinate: { latitude: -37.822, longitude: 144.972 } },
  ],
  hazards: [],
};

const noop = () => {};

describe('MapMarkerSet — Free tier', () => {
  it('renders no POI markers on free tier even when present in markers', () => {
    const { queryByTestId } = render(
      <MapMarkerSet markers={fullMarkers} tier="free" onTeePress={noop} onGreenPress={noop} />
    );
    expect(queryByTestId('tee-poi-tee_back')).toBeNull();
    expect(queryByTestId('green-poi-green_center')).toBeNull();
  });
});

describe('MapMarkerSet — Social/Premium tier', () => {
  it('renders all tees and greens on social tier', () => {
    const { getByTestId } = render(
      <MapMarkerSet markers={fullMarkers} tier="social" onTeePress={noop} onGreenPress={noop} />
    );
    expect(getByTestId('tee-poi-tee_back')).toBeTruthy();
    expect(getByTestId('tee-poi-tee_front')).toBeTruthy();
    expect(getByTestId('green-poi-green_front')).toBeTruthy();
    expect(getByTestId('green-poi-green_center')).toBeTruthy();
    expect(getByTestId('green-poi-green_back')).toBeTruthy();
  });

  it('invokes onTeePress with the tapped type', () => {
    const onTeePress = jest.fn();
    const { getByTestId } = render(
      <MapMarkerSet
        markers={fullMarkers}
        tier="social"
        onTeePress={onTeePress}
        onGreenPress={noop}
      />
    );
    fireEvent.press(getByTestId('tee-poi-tee_front'));
    expect(onTeePress).toHaveBeenCalledWith('tee_front');
  });

  it('invokes onGreenPress with the tapped type', () => {
    const onGreenPress = jest.fn();
    const { getByTestId } = render(
      <MapMarkerSet
        markers={fullMarkers}
        tier="premium"
        onTeePress={noop}
        onGreenPress={onGreenPress}
      />
    );
    fireEvent.press(getByTestId('green-poi-green_back'));
    expect(onGreenPress).toHaveBeenCalledWith('green_back');
  });

  it('shows selected styling for selectedTee and selectedGreen', () => {
    const { getByTestId } = render(
      <MapMarkerSet
        markers={fullMarkers}
        tier="social"
        selectedTee="tee_back"
        selectedGreen="green_front"
        onTeePress={noop}
        onGreenPress={noop}
      />
    );
    expect(getByTestId('tee-poi-tee_back-selected')).toBeTruthy();
    expect(getByTestId('green-poi-green_front-selected')).toBeTruthy();
  });
});
