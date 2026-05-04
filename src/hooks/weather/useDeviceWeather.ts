/**
 * useDeviceWeather — current conditions at the user's device location.
 * Uses a one-shot GPS read (no continuous watching) to keep battery usage
 * minimal for an ambient weather chip. Returns nothing (the underlying hook
 * is disabled) until permission is granted *and* a position has been acquired.
 */

import { useOneShotLocation } from '@/hooks/useOneShotLocation';
import { useWeather, type WeatherInput } from './useWeather';

export function useDeviceWeather() {
  const { location } = useOneShotLocation();
  const input: WeatherInput | null = location
    ? { kind: 'current', lat: location.latitude, lng: location.longitude }
    : null;
  return useWeather(input);
}
