import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { WeatherDetailModal } from './WeatherDetailModal';
import * as hookModule from '@/hooks/weather/useDetailedDayForecast';

jest.mock('@/hooks/weather/useDetailedDayForecast');

const baseStats = {
  tempHighC: 19,
  tempLowC: 14,
  feelsLikeAvgC: 16,
  dominantCode: 1,
  windKphAvg: 12,
  windGustKphMax: 22,
  windDirDegAvg: 0, // N
  precipProbabilityMax: 10,
  precipMm: 0,
  uvIndexMax: 3,
};

const baseSummary = {
  dateIso: '2026-05-06',
  weatherCode: 1,
  tempHighC: 21,
  tempLowC: 11,
  precipProbabilityMax: 10,
  precipMm: 0,
  windGustKphMax: 22,
  uvIndexMax: 6,
  sunriseIso: '2026-05-06T06:42',
  sunsetIso: '2026-05-06T17:31',
};

const successData = {
  locationIso: 'Australia/Melbourne',
  today: {
    morning: baseStats,
    afternoon: { ...baseStats, tempHighC: 21, windGustKphMax: 35, uvIndexMax: 7 },
    summary: baseSummary,
  },
  forecast: [
    { ...baseSummary, dateIso: '2026-05-07', tempHighC: 19, tempLowC: 9, precipProbabilityMax: 30 },
    { ...baseSummary, dateIso: '2026-05-08', tempHighC: 17, tempLowC: 8, precipProbabilityMax: 60 },
  ],
  fetchedAt: '2026-05-06T08:00:00Z',
};

function mockHook(overrides: Partial<{ data: unknown; isLoading: boolean; refetch: jest.Mock }>) {
  (hookModule.useDetailedDayForecast as jest.Mock).mockReturnValue({
    data: overrides.data ?? null,
    isLoading: overrides.isLoading ?? false,
    refetch: overrides.refetch ?? jest.fn(),
  });
}

describe('WeatherDetailModal', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders nothing when visible is false', () => {
    mockHook({ data: successData });
    const { queryByTestId } = render(
      <WeatherDetailModal visible={false} onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(queryByTestId('weather-detail-modal')).toBeNull();
  });

  it('renders skeletons when loading', () => {
    mockHook({ data: undefined, isLoading: true });
    const { getByTestId } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByTestId('weather-detail-modal-skeleton')).toBeTruthy();
  });

  it('renders header, both bucket cards, and both forecast rows on success', () => {
    mockHook({ data: successData });
    const { getByText, getByTestId } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByTestId('weather-detail-modal')).toBeTruthy();
    expect(getByText(/Morning/)).toBeTruthy();
    expect(getByText(/Afternoon/)).toBeTruthy();
    expect(getByTestId('forecast-row-2026-05-07')).toBeTruthy();
    expect(getByTestId('forecast-row-2026-05-08')).toBeTruthy();
  });

  it('renders "already passed" placeholder for null morning bucket', () => {
    mockHook({
      data: { ...successData, today: { ...successData.today, morning: null } },
    });
    const { getByTestId } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByTestId('bucket-morning-passed')).toBeTruthy();
  });

  it('renders error state with retry when forecast is null', () => {
    const refetch = jest.fn();
    mockHook({ data: null, refetch });
    const { getByText } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByText(/Couldn't load weather/i)).toBeTruthy();
    fireEvent.press(getByText(/Retry/i));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the close button is pressed', () => {
    mockHook({ data: successData });
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <WeatherDetailModal visible onDismiss={onDismiss} coords={{ lat: 0, lng: 0 }} />,
    );
    fireEvent.press(getByTestId('weather-detail-modal-close'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the backdrop is pressed', () => {
    mockHook({ data: successData });
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <WeatherDetailModal visible onDismiss={onDismiss} coords={{ lat: 0, lng: 0 }} />,
    );
    fireEvent.press(getByTestId('weather-detail-modal-backdrop'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('bucket card has a combined accessibility label', () => {
    mockHook({ data: successData });
    const { getByTestId } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    const morning = getByTestId('bucket-morning');
    const label = morning.props.accessibilityLabel as string;
    expect(label).toMatch(/Morning/);
    expect(label).toMatch(/14/); // low
    expect(label).toMatch(/19/); // high
  });
});
