export { useWeather } from './useWeather';
export type { WeatherInput, WeatherSnapshot } from './useWeather';
export { useDeviceWeather } from './useDeviceWeather';
export { useUpcomingRoundWeather } from './useUpcomingRoundWeather';
export {
  useCompetitionWeather,
  buildDailyUrl,
  mapDailyResponse,
  selectDaysWeather,
} from './useCompetitionWeather';
export type { DailyWeather, CompetitionWeather } from './useCompetitionWeather';
export { useFallbackCourseCoords } from './useFallbackCourseCoords';
export { weatherCodeToIcon } from './weatherCodeToIcon';
export type { WeatherIcon } from './weatherCodeToIcon';
export { useDetailedDayForecast, EVENING_MODE_HOUR } from './useDetailedDayForecast';
export type { Coords, DayBuckets, DaySummary, DetailedForecast } from './useDetailedDayForecast';
export { useReverseGeocode, timezoneToPlace } from './useReverseGeocode';
export type { ReverseGeocodeResult } from './useReverseGeocode';
export type { BucketStats } from './aggregateWeatherBucket';
