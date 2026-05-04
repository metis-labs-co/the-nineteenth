import React from 'react';
import { render } from '@testing-library/react-native';
import { WeatherStrip } from './WeatherStrip';

describe('WeatherStrip', () => {
  it('renders nothing when snapshot is null', () => {
    const { queryByTestId } = render(<WeatherStrip snapshot={null} />);
    expect(queryByTestId('weather-strip')).toBeNull();
  });

  it('renders temp, wind, and precip when probability >= 10', () => {
    const { getByTestId, getByText } = render(
      <WeatherStrip
        snapshot={{
          tempC: 18.4,
          weatherCode: 1,
          windKph: 12,
          windDirDeg: 225,
          precipProbability: 30,
          fetchedAt: '2026-05-04T08:00:00Z',
        }}
      />,
    );
    expect(getByTestId('weather-strip')).toBeTruthy();
    expect(getByText(/18°/)).toBeTruthy();
    expect(getByText(/12 km\/h SW/)).toBeTruthy();
    expect(getByText(/30%/)).toBeTruthy();
  });

  it('omits precipitation when probability < 10', () => {
    const { queryByText } = render(
      <WeatherStrip
        snapshot={{
          tempC: 22,
          weatherCode: 0,
          windKph: 5,
          windDirDeg: 0,
          precipProbability: 5,
          fetchedAt: '2026-05-04T08:00:00Z',
        }}
      />,
    );
    expect(queryByText(/%/)).toBeNull();
  });
});
