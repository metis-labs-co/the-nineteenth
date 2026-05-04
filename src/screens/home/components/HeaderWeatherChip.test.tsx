import React from 'react';
import { render } from '@testing-library/react-native';
import { HeaderWeatherChip } from './HeaderWeatherChip';
import * as useDeviceWeatherModule from '@/hooks/weather/useDeviceWeather';

jest.mock('@/hooks/weather/useDeviceWeather');

describe('HeaderWeatherChip', () => {
  it('renders nothing when no snapshot', () => {
    (useDeviceWeatherModule.useDeviceWeather as jest.Mock).mockReturnValue({
      data: null,
    });
    const { queryByTestId } = render(<HeaderWeatherChip />);
    expect(queryByTestId('header-weather-chip')).toBeNull();
  });

  it('renders temp + icon when a snapshot is available', () => {
    (useDeviceWeatherModule.useDeviceWeather as jest.Mock).mockReturnValue({
      data: {
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
});
