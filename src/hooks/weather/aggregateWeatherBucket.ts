/**
 * aggregateWeatherBucket — pure util that partitions an Open-Meteo hourly
 * response into a single time-of-day bucket and computes summary stats.
 *
 * Window semantics: [startHour, endHour) — start inclusive, end exclusive.
 * Only hours whose ISO time begins with `dateIso` are considered.
 * Returns `null` when no hours fall in the window.
 */

export interface HourlySlice {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  weather_code: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
  wind_direction_10m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  uv_index: number[];
}

export interface BucketStats {
  tempHighC: number;
  tempLowC: number;
  feelsLikeAvgC: number;
  dominantCode: number;
  windKphAvg: number;
  windGustKphMax: number;
  windDirDegAvg: number;
  precipProbabilityMax: number;
  precipMm: number;
  uvIndexMax: number;
}

export function aggregateWeatherBucket(
  hourly: HourlySlice,
  startHour: number,
  endHour: number,
  dateIso: string,
): BucketStats | null {
  const indices: number[] = [];
  for (let i = 0; i < hourly.time.length; i++) {
    const t = hourly.time[i];
    if (!t.startsWith(dateIso)) continue;
    const hour = parseInt(t.slice(11, 13), 10);
    if (hour >= startHour && hour < endHour) indices.push(i);
  }
  if (indices.length === 0) return null;

  const pick = (arr: number[]): number[] => indices.map((i) => arr[i]);
  const max = (arr: number[]): number => Math.max(...arr);
  const min = (arr: number[]): number => Math.min(...arr);
  const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
  const mean = (arr: number[]): number => sum(arr) / arr.length;

  const codes = pick(hourly.weather_code);
  const codeCounts = new Map<number, number>();
  for (const c of codes) codeCounts.set(c, (codeCounts.get(c) ?? 0) + 1);
  let dominantCode = codes[0];
  let maxCount = 0;
  for (const [code, count] of codeCounts) {
    if (count > maxCount || (count === maxCount && code > dominantCode)) {
      dominantCode = code;
      maxCount = count;
    }
  }

  const dirs = pick(hourly.wind_direction_10m);
  const sinSum = dirs.reduce((a, d) => a + Math.sin((d * Math.PI) / 180), 0);
  const cosSum = dirs.reduce((a, d) => a + Math.cos((d * Math.PI) / 180), 0);
  const dirRad = Math.atan2(sinSum / dirs.length, cosSum / dirs.length);
  let dirDeg = (dirRad * 180) / Math.PI;
  if (dirDeg < 0) dirDeg += 360;

  return {
    tempHighC: max(pick(hourly.temperature_2m)),
    tempLowC: min(pick(hourly.temperature_2m)),
    feelsLikeAvgC: mean(pick(hourly.apparent_temperature)),
    dominantCode,
    windKphAvg: mean(pick(hourly.wind_speed_10m)),
    windGustKphMax: max(pick(hourly.wind_gusts_10m)),
    windDirDegAvg: dirDeg,
    precipProbabilityMax: max(pick(hourly.precipitation_probability)),
    precipMm: sum(pick(hourly.precipitation)),
    uvIndexMax: max(pick(hourly.uv_index)),
  };
}
