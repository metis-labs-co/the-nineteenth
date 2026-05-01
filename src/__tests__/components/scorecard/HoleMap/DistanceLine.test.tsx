import React from 'react';
import { render } from '@testing-library/react-native';
import { DistanceLine } from '@/components/scorecard/HoleMap/DistanceLine';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    info: '#3b82f6',
    warning: '#f59e0b',
    success: '#22c55e',
    error: '#ef4444',
    surface: '#ffffff',
    textPrimary: '#111827',
  }),
}));

jest.mock('@/store/settingsStore', () => ({
  useFormattedDistance: () => ({
    formatDistance: (yards: number) => `${Math.round(yards)}yd`,
    unit: 'yards' as const,
    unitLabel: 'yd',
  }),
}));

const start = { latitude: -37.81, longitude: 144.96 };
const end = { latitude: -37.82, longitude: 144.97 };

describe('DistanceLine', () => {
  it('renders polyline and a callout with the formatted distance', () => {
    const { getByTestId, getByText } = render(
      <DistanceLine from={start} to={end} variant="gps-to-pin" testID="line-1" />
    );
    expect(getByTestId('line-1')).toBeTruthy();
    expect(getByText(/yd$/)).toBeTruthy();
  });

  it('renders nothing when from is null', () => {
    const { queryByTestId } = render(<DistanceLine from={null} to={end} testID="line-2" />);
    expect(queryByTestId('line-2')).toBeNull();
  });

  it('renders nothing when to is null', () => {
    const { queryByTestId } = render(<DistanceLine from={start} to={null} testID="line-3" />);
    expect(queryByTestId('line-3')).toBeNull();
  });

  it('renders triple-distance callout when labelTargets is provided', () => {
    // Three close-by points so the distances are predictably ordered.
    const targets = [
      { latitude: -37.82, longitude: 144.97 }, // ~1374 yd
      { latitude: -37.821, longitude: 144.971 }, // slightly further
      { latitude: -37.822, longitude: 144.972 }, // even further
    ];
    const { getByText } = render(
      <DistanceLine from={start} to={targets[1]} labelTargets={targets} testID="triple" />
    );
    // Expect a label like "Xyd · Yyd · Zyd" — three numbers separated by "·".
    const matches = getByText(/^\d+yd · \d+yd · \d+yd$/);
    expect(matches).toBeTruthy();
  });

  it('falls back to single-distance label when labelTargets is empty array', () => {
    const { getByText } = render(
      <DistanceLine from={start} to={end} labelTargets={[]} testID="single" />
    );
    expect(getByText(/^\d+yd$/)).toBeTruthy();
  });
});
