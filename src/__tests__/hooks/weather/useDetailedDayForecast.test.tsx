import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDetailedDayForecast } from '@/hooks/weather/useDetailedDayForecast';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

function mockResponse(opts?: { todayIso?: string }) {
  const todayIso = opts?.todayIso ?? '2026-05-06';
  const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
                 '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const time = hours.map((h) => `${todayIso}T${h}`);
  const fill = (v: number) => hours.map(() => v);
  return {
    timezone: 'Australia/Melbourne',
    hourly: {
      time,
      temperature_2m: fill(15),
      apparent_temperature: fill(14),
      weather_code: fill(1),
      wind_speed_10m: fill(10),
      wind_gusts_10m: fill(20),
      wind_direction_10m: fill(180),
      precipitation_probability: fill(0),
      precipitation: fill(0),
      uv_index: fill(3),
    },
    daily: {
      time: [todayIso, '2026-05-07', '2026-05-08'],
      weather_code: [1, 2, 3],
      temperature_2m_max: [21, 19, 17],
      temperature_2m_min: [11, 9, 8],
      precipitation_probability_max: [10, 30, 60],
      precipitation_sum: [0, 0.5, 5.0],
      wind_gusts_10m_max: [22, 28, 35],
      uv_index_max: [6, 5, 4],
      sunrise: [`${todayIso}T06:42`, '2026-05-07T06:43', '2026-05-08T06:44'],
      sunset: [`${todayIso}T17:31`, '2026-05-07T17:30', '2026-05-08T17:29'],
    },
  };
}

describe('useDetailedDayForecast', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  it('is disabled when coords is null', () => {
    const { result } = renderHook(() => useDetailedDayForecast(null), { wrapper });
    expect(result.current.isFetching).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rounds coords to 2 decimals in the URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse(),
    });
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: -37.81367, lng: 144.96321 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('latitude=-37.81');
    expect(url).toContain('longitude=144.96');
    expect(url).toContain('forecast_days=3');
    expect(url).toContain('timezone=auto');
  });

  it('returns morning, afternoon, today summary, and 2-day forecast', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-06T08:00:00'));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse(),
    });
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: -37.81, lng: 144.96 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data;
    expect(data).not.toBeNull();
    if (!data) throw new Error('data null');
    expect(data.today.morning).not.toBeNull();
    expect(data.today.afternoon).not.toBeNull();
    expect(data.today.summary.dateIso).toBe('2026-05-06');
    expect(data.today.summary.tempHighC).toBe(21);
    expect(data.today.summary.sunriseIso).toBe('2026-05-06T06:42');
    expect(data.forecast).toHaveLength(2);
    expect(data.forecast[0].dateIso).toBe('2026-05-07');
    expect(data.forecast[1].dateIso).toBe('2026-05-08');
    expect(data.locationIso).toBe('Australia/Melbourne');
  });

  it('marks morning as null when "now" is past noon on todays date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-06T14:00:00'));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse(),
    });
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: 0, lng: 0 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data;
    if (!data) throw new Error('data null');
    expect(data.today.morning).toBeNull();
    expect(data.today.afternoon).not.toBeNull();
  });

  it('marks both buckets as null when "now" is past 6pm', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-06T19:00:00'));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse(),
    });
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: 0, lng: 0 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data;
    if (!data) throw new Error('data null');
    expect(data.today.morning).toBeNull();
    expect(data.today.afternoon).toBeNull();
  });

  it('resolves to null when the API returns a non-OK status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: 0, lng: 0 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('resolves to null when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network'));
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: 0, lng: 0 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
