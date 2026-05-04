/**
 * Map Open-Meteo / WMO weather code to a Material Design Icons name and a
 * short human label. Used by WeatherStrip and HeaderWeatherChip.
 *
 * Source: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
export interface WeatherIcon {
  icon: string;
  label: string;
}

export function weatherCodeToIcon(code: number): WeatherIcon {
  if (code === 0) return { icon: 'weather-sunny', label: 'Clear sky' };
  if (code === 1 || code === 2) return { icon: 'weather-partly-cloudy', label: 'Partly cloudy' };
  if (code === 3) return { icon: 'weather-cloudy', label: 'Overcast' };
  if (code === 45 || code === 48) return { icon: 'weather-fog', label: 'Fog' };
  if (code >= 51 && code <= 57) return { icon: 'weather-rainy', label: 'Drizzle' };
  if (code >= 61 && code <= 67) return { icon: 'weather-pouring', label: 'Rain' };
  if (code >= 71 && code <= 77) return { icon: 'weather-snowy', label: 'Snow' };
  if (code >= 80 && code <= 82) return { icon: 'weather-pouring', label: 'Showers' };
  if (code >= 85 && code <= 86) return { icon: 'weather-snowy', label: 'Snow showers' };
  if (code >= 95 && code <= 99) return { icon: 'weather-lightning', label: 'Thunderstorm' };
  return { icon: 'weather-cloudy', label: 'Unknown' };
}
