import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HeaderWeatherChip } from './HeaderWeatherChip';
import * as useDeviceWeatherModule from '@/hooks/weather/useDeviceWeather';

jest.mock('@/hooks/weather/useDeviceWeather');

// The chip embeds WeatherDetailModal. Stub it so this test stays unit-scoped.
jest.mock('./WeatherDetailModal', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    WeatherDetailModal: ({ visible }: { visible: boolean }) =>
      visible ? <Text testID="weather-detail-modal-stub">modal</Text> : null,
  };
});

function mockHook({
  snapshot,
  location = { latitude: -37.81, longitude: 144.96 },
}: {
  snapshot: unknown;
  location?: { latitude: number; longitude: number } | null;
}) {
  (useDeviceWeatherModule.useDeviceWeather as jest.Mock).mockReturnValue({
    data: snapshot,
    location,
  });
}

describe('HeaderWeatherChip', () => {
  it('renders nothing when no snapshot', () => {
    mockHook({ snapshot: null });
    const { queryByTestId } = render(<HeaderWeatherChip />);
    expect(queryByTestId('header-weather-chip')).toBeNull();
  });

  it('renders temp + icon when a snapshot is available', () => {
    mockHook({
      snapshot: {
        tempC: 17.8,
        weatherCode: 2,
        windKph: 5,
        windDirDeg: 90,
        precipProbability: 0,
        fetchedAt: '2026-05-04T08:00:00Z',
      },
    });
    const { getByTestId, getByText } = render(<HeaderWeatherChip />);
    expect(getByTestId('header-weather-chip')).toBeTruthy();
    expect(getByText(/18°/)).toBeTruthy();
  });

  it('exposes an accessibility hint pointing at the modal', () => {
    mockHook({
      snapshot: {
        tempC: 17.8,
        weatherCode: 2,
        windKph: 5,
        windDirDeg: 90,
        precipProbability: 0,
        fetchedAt: '2026-05-04T08:00:00Z',
      },
    });
    const { getByTestId } = render(<HeaderWeatherChip />);
    const chip = getByTestId('header-weather-chip');
    expect(chip.props.accessibilityRole).toBe('button');
    expect(chip.props.accessibilityHint).toMatch(/detailed forecast/i);
  });

  it('opens the modal when tapped', () => {
    mockHook({
      snapshot: {
        tempC: 17.8,
        weatherCode: 2,
        windKph: 5,
        windDirDeg: 90,
        precipProbability: 0,
        fetchedAt: '2026-05-04T08:00:00Z',
      },
    });
    const { getByTestId, queryByTestId } = render(<HeaderWeatherChip />);
    const chip = getByTestId('header-weather-chip');
    expect(chip.props.accessibilityState?.expanded).toBe(false);
    expect(queryByTestId('weather-detail-modal-stub')).toBeNull();
    fireEvent.press(chip);
    expect(chip.props.accessibilityState?.expanded).toBe(true);
    expect(getByTestId('weather-detail-modal-stub')).toBeTruthy();
  });
});
