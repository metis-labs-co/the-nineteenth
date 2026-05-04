/**
 * useDeviceWeather — current conditions at the user's device location.
 * Returns nothing (the underlying hook is disabled) until permission is
 * granted *and* a position has been acquired.
 */

import { useUserLocation } from '@/hooks/location/userLocation';
import { useWeather, type WeatherInput } from './useWeather';

export function useDeviceWeather() {
  const { location } = useUserLocation();
  const input: WeatherInput | null = location
    ? { kind: 'current', lat: location.latitude, lng: location.longitude }
    : null;
  return useWeather(input);
}
