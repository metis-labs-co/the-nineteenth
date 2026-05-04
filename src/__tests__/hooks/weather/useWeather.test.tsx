import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useWeather, type WeatherInput } from '@/hooks/weather/useWeather';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useWeather', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('is disabled when input is null', () => {
    const { result } = renderHook(() => useWeather(null), { wrapper });
    expect(result.current.isFetching).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches current conditions and maps the response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: 18.4,
          weather_code: 1,
          wind_speed_10m: 12.3,
          wind_direction_10m: 220,
          precipitation: 0,
        },
      }),
    });

    const input: WeatherInput = { kind: 'current', lat: -37.8136, lng: 144.9631 };
    const { result } = renderHook(() => useWeather(input), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(
      expect.objectContaining({
        tempC: 18.4,
        weatherCode: 1,
        windKph: 12.3,
        windDirDeg: 220,
        precipProbability: 0,
      }),
    );
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('latitude=-37.81');
  });

  it('fetches at-time forecast and picks the matching hour', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        hourly: {
          time: ['2026-05-04T07:00', '2026-05-04T08:00', '2026-05-04T09:00'],
          temperature_2m: [12.0, 14.5, 16.0],
          weather_code: [3, 1, 0],
          wind_speed_10m: [8, 10, 11],
          wind_direction_10m: [180, 200, 210],
          precipitation_probability: [40, 20, 10],
        },
      }),
    });

    const input: WeatherInput = {
      kind: 'at-time',
      lat: -37.8136,
      lng: 144.9631,
      isoDateTime: '2026-05-04T08:00',
    };
    const { result } = renderHook(() => useWeather(input), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(
      expect.objectContaining({
        tempC: 14.5,
        weatherCode: 1,
        windKph: 10,
        windDirDeg: 200,
        precipProbability: 20,
      }),
    );
  });

  it('resolves to null when the API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    const input: WeatherInput = { kind: 'current', lat: 0, lng: 0 };

    const { result } = renderHook(() => useWeather(input), { wrapper });

    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('resolves to null when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network'));
    const input: WeatherInput = { kind: 'current', lat: 0, lng: 0 };

    const { result } = renderHook(() => useWeather(input), { wrapper });

    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
