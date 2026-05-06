import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HeaderWeatherChip } from './HeaderWeatherChip';
import * as useDeviceWeatherModule from '@/hooks/weather/useDeviceWeather';
import * as useOneShotLocationModule from '@/hooks/useOneShotLocation';

jest.mock('@/hooks/weather/useDeviceWeather');
jest.mock('@/hooks/useOneShotLocation');

// The chip embeds WeatherDetailModal. Stub it so this test stays unit-scoped.
jest.mock('./WeatherDetailModal', () => ({
  WeatherDetailModal: ({ visible }: { visible: boolean }) =>
    visible ? <></> : null,
}));

function mockSnapshot(snapshot: unknown) {
  (useDeviceWeatherModule.useDeviceWeather as jest.Mock).mockReturnValue({
    data: snapshot,
  });
}

function mockLocation(loc: { latitude: number; longitude: number } | null) {
  (useOneShotLocationModule.useOneShotLocation as jest.Mock).mockReturnValue({
    location: loc,
    isLoading: false,
  });
}

describe('HeaderWeatherChip', () => {
  beforeEach(() => {
    mockLocation({ latitude: -37.81, longitude: 144.96 });
  });

  it('renders nothing when no snapshot', () => {
    mockSnapshot(null);
    const { queryByTestId } = render(<HeaderWeatherChip />);
    expect(queryByTestId('header-weather-chip')).toBeNull();
  });

  it('renders temp + icon when a snapshot is available', () => {
    mockSnapshot({
      tempC: 17.8,
      weatherCode: 2,
      windKph: 5,
      windDirDeg: 90,
      precipProbability: 0,
      fetchedAt: '2026-05-04T08:00:00Z',
    });
    const { getByTestId, getByText } = render(<HeaderWeatherChip />);
    expect(getByTestId('header-weather-chip')).toBeTruthy();
    expect(getByText(/18°/)).toBeTruthy();
  });

  it('exposes an accessibility hint pointing at the modal', () => {
    mockSnapshot({
      tempC: 17.8,
      weatherCode: 2,
      windKph: 5,
      windDirDeg: 90,
      precipProbability: 0,
      fetchedAt: '2026-05-04T08:00:00Z',
    });
    const { getByTestId } = render(<HeaderWeatherChip />);
    const chip = getByTestId('header-weather-chip');
    expect(chip.props.accessibilityRole).toBe('button');
    expect(chip.props.accessibilityHint).toMatch(/detailed forecast/i);
  });

  it('opens the modal when tapped', () => {
    mockSnapshot({
      tempC: 17.8,
      weatherCode: 2,
      windKph: 5,
      windDirDeg: 90,
      precipProbability: 0,
      fetchedAt: '2026-05-04T08:00:00Z',
    });
    const { getByTestId } = render(<HeaderWeatherChip />);
    const chip = getByTestId('header-weather-chip');
    expect(chip.props.accessibilityState?.expanded).toBe(false);
    fireEvent.press(chip);
    expect(chip.props.accessibilityState?.expanded).toBe(true);
  });
});
