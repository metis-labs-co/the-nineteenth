import React from 'react';
import { render } from '@testing-library/react-native';
import { UserMarker, PinMarker, TapMarker } from '@/components/scorecard/HoleMap';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    info: '#3b82f6',
    warning: '#f59e0b',
    error: '#ef4444',
    onPrimary: '#ffffff',
  }),
}));

const coord = { latitude: -37.81, longitude: 144.96 };

describe('HoleMap markers', () => {
  it('renders UserMarker when coordinate provided', () => {
    const { getByTestId } = render(<UserMarker coordinate={coord} />);
    expect(getByTestId('user-marker')).toBeTruthy();
  });

  it('renders nothing when UserMarker has no coordinate', () => {
    const { queryByTestId } = render(<UserMarker coordinate={null} />);
    expect(queryByTestId('user-marker')).toBeNull();
  });

  it('renders PinMarker', () => {
    const { getByTestId } = render(<PinMarker coordinate={coord} />);
    expect(getByTestId('pin-marker')).toBeTruthy();
  });

  it('renders TapMarker only when coordinate present', () => {
    const { queryByTestId, rerender } = render(<TapMarker coordinate={null} />);
    expect(queryByTestId('tap-marker')).toBeNull();
    rerender(<TapMarker coordinate={coord} />);
    expect(queryByTestId('tap-marker')).toBeTruthy();
  });
});
