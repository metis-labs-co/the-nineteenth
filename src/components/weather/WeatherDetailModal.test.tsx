import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { WeatherDetailModal } from './WeatherDetailModal';
import * as hookModule from '@/hooks/weather/useDetailedDayForecast';
import * as geocodeModule from '@/hooks/weather/useReverseGeocode';

jest.mock('@/hooks/weather/useDetailedDayForecast');
jest.mock('@/hooks/weather/useReverseGeocode', () => {
  const actual = jest.requireActual('@/hooks/weather/useReverseGeocode');
  return {
    ...actual,
    useReverseGeocode: jest.fn(),
  };
});

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

const tomorrowSummary = {
  ...baseSummary,
  dateIso: '2026-05-07',
  tempHighC: 19,
  tempLowC: 9,
  precipProbabilityMax: 30,
  sunriseIso: '2026-05-07T06:43',
  sunsetIso: '2026-05-07T17:30',
};

const dayAfterSummary = {
  ...baseSummary,
  dateIso: '2026-05-08',
  tempHighC: 17,
  tempLowC: 8,
  precipProbabilityMax: 60,
  sunriseIso: '2026-05-08T06:44',
  sunsetIso: '2026-05-08T17:29',
};

const successData = {
  locationIso: 'Australia/Melbourne',
  today: {
    morning: baseStats,
    afternoon: { ...baseStats, tempHighC: 21, windGustKphMax: 35, uvIndexMax: 7 },
    summary: baseSummary,
  },
  tomorrow: {
    morning: { ...baseStats, tempHighC: 18 },
    afternoon: { ...baseStats, tempHighC: 19, uvIndexMax: 5 },
    summary: tomorrowSummary,
  },
  dayAfter: dayAfterSummary,
  eveningMode: false,
  fetchedAt: '2026-05-06T08:00:00Z',
};

function mockHook(overrides: Partial<{ data: unknown; isLoading: boolean; refetch: jest.Mock }>) {
  (hookModule.useDetailedDayForecast as jest.Mock).mockReturnValue({
    data: overrides.data ?? null,
    isLoading: overrides.isLoading ?? false,
    refetch: overrides.refetch ?? jest.fn(),
  });
}

function mockGeocode(result: { primary: string; secondary: string | null } | null) {
  (geocodeModule.useReverseGeocode as jest.Mock).mockReturnValue({ data: result });
}

describe('WeatherDetailModal', () => {
  beforeEach(() => mockGeocode({ primary: 'Melbourne', secondary: 'VIC' }));
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

  it('renders location header inline with suburb and state', () => {
    mockHook({ data: successData });
    const { getByText, getByTestId } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByTestId('weather-location-header')).toBeTruthy();
    expect(getByText('Melbourne, VIC')).toBeTruthy();
  });

  it('falls back to timezone city when reverse-geocode returns null', () => {
    mockGeocode(null);
    mockHook({ data: successData });
    const { getByText } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByText('Melbourne')).toBeTruthy();
  });

  it('renders location header even while data is loading', () => {
    mockHook({ data: undefined, isLoading: true });
    const { getByTestId, getByText } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByTestId('weather-location-header')).toBeTruthy();
    expect(getByText('Melbourne, VIC')).toBeTruthy();
  });

  it('renders today buckets and next-day rows in day mode', () => {
    mockHook({ data: successData });
    const { getByTestId, getByText } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByTestId('weather-detail-modal')).toBeTruthy();
    expect(getByTestId('bucket-today-morning')).toBeTruthy();
    expect(getByTestId('bucket-today-afternoon')).toBeTruthy();
    expect(getByText('TODAY')).toBeTruthy();
    expect(getByText('NEXT DAYS')).toBeTruthy();
    expect(getByTestId('forecast-row-2026-05-07')).toBeTruthy();
    expect(getByTestId('forecast-row-2026-05-08')).toBeTruthy();
  });

  it('keeps morning/afternoon buckets visible (no "Already passed")', () => {
    mockHook({ data: successData });
    const { queryByText, getByTestId } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(queryByText(/Already passed/i)).toBeNull();
    expect(getByTestId('bucket-today-morning')).toBeTruthy();
  });

  it('renders evening layout with today as compact row + tomorrow buckets', () => {
    mockHook({ data: { ...successData, eveningMode: true } });
    const { getByTestId, getByText, queryByTestId } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByTestId('today-compact-row')).toBeTruthy();
    expect(getByTestId('bucket-tomorrow-morning')).toBeTruthy();
    expect(getByTestId('bucket-tomorrow-afternoon')).toBeTruthy();
    expect(getByText('TOMORROW')).toBeTruthy();
    expect(getByText('NEXT DAY')).toBeTruthy();
    // Day-after still rendered as a row; tomorrow promoted into the split.
    expect(getByTestId('forecast-row-2026-05-08')).toBeTruthy();
    expect(queryByTestId('bucket-today-morning')).toBeNull();
    expect(queryByTestId('forecast-row-2026-05-07')).toBeNull();
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
    const morning = getByTestId('bucket-today-morning');
    const label = morning.props.accessibilityLabel as string;
    expect(label).toMatch(/Morning/);
    expect(label).toMatch(/14/); // low
    expect(label).toMatch(/19/); // high
  });
});
