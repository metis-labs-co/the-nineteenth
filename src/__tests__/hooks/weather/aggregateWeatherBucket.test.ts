import {
  aggregateWeatherBucket,
  type HourlySlice,
} from '@/hooks/weather/aggregateWeatherBucket';

type Row = [string, number, number, number, number, number, number, number, number, number];

function build(rows: Row[]): HourlySlice {
  return {
    time: rows.map((r) => r[0]),
    temperature_2m: rows.map((r) => r[1]),
    apparent_temperature: rows.map((r) => r[2]),
    weather_code: rows.map((r) => r[3]),
    wind_speed_10m: rows.map((r) => r[4]),
    wind_gusts_10m: rows.map((r) => r[5]),
    wind_direction_10m: rows.map((r) => r[6]),
    precipitation_probability: rows.map((r) => r[7]),
    precipitation: rows.map((r) => r[8]),
    uv_index: rows.map((r) => r[9]),
  };
}

describe('aggregateWeatherBucket', () => {
  const date = '2026-05-06';

  it('returns null when no hours fall in the window', () => {
    const slice = build([
      ['2026-05-06T04:00', 10, 9, 1, 5, 8, 180, 0, 0, 1],
      ['2026-05-06T05:00', 11, 10, 1, 5, 8, 180, 0, 0, 1],
    ]);
    expect(aggregateWeatherBucket(slice, 6, 12, date)).toBeNull();
  });

  it('returns null when the hourly arrays are empty', () => {
    const empty = build([]);
    expect(aggregateWeatherBucket(empty, 6, 12, date)).toBeNull();
  });

  it('aggregates a 6-hour morning window with the documented rules', () => {
    const slice = build([
      ['2026-05-06T06:00', 12, 11, 1, 10, 18, 180, 10, 0.0, 2],
      ['2026-05-06T07:00', 14, 13, 1, 12, 22, 190, 20, 0.0, 3],
      ['2026-05-06T08:00', 16, 15, 2, 14, 25, 200, 30, 0.5, 4],
      ['2026-05-06T09:00', 18, 17, 2, 14, 26, 210, 40, 0.5, 5],
      ['2026-05-06T10:00', 19, 18, 3, 15, 28, 220, 50, 1.0, 6],
      ['2026-05-06T11:00', 19, 19, 3, 15, 30, 230, 50, 0.0, 6],
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    expect(result).not.toBeNull();
    if (!result) throw new Error('result null');
    expect(result.tempHighC).toBe(19);
    expect(result.tempLowC).toBe(12);
    expect(result.feelsLikeAvgC).toBeCloseTo((11 + 13 + 15 + 17 + 18 + 19) / 6);
    expect(result.windKphAvg).toBeCloseTo((10 + 12 + 14 + 14 + 15 + 15) / 6);
    expect(result.windGustKphMax).toBe(30);
    expect(result.precipProbabilityMax).toBe(50);
    expect(result.precipMm).toBeCloseTo(2.0);
    expect(result.uvIndexMax).toBe(6);
  });

  it('window is half-open: includes start hour, excludes end hour', () => {
    const slice = build([
      ['2026-05-06T05:00', 10, 10, 0, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T06:00', 20, 20, 0, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T11:00', 30, 30, 0, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T12:00', 40, 40, 0, 0, 0, 0, 0, 0, 0],
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    if (!result) throw new Error('result null');
    expect(result.tempHighC).toBe(30);
    expect(result.tempLowC).toBe(20);
  });

  it('only aggregates rows on the requested date', () => {
    const slice = build([
      ['2026-05-06T08:00', 10, 10, 0, 0, 0, 0, 0, 0, 0],
      ['2026-05-07T08:00', 99, 99, 0, 0, 0, 0, 0, 0, 0],
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    if (!result) throw new Error('result null');
    expect(result.tempHighC).toBe(10);
  });

  it('dominant weather code uses the mode, ties resolved by highest WMO number', () => {
    const slice = build([
      ['2026-05-06T06:00', 0, 0, 1, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T07:00', 0, 0, 1, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T08:00', 0, 0, 3, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T09:00', 0, 0, 3, 0, 0, 0, 0, 0, 0],
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    if (!result) throw new Error('result null');
    expect(result.dominantCode).toBe(3);
  });

  it('wind direction uses circular mean (350 + 10 → ~0, not 180)', () => {
    const slice = build([
      ['2026-05-06T06:00', 0, 0, 0, 0, 0, 350, 0, 0, 0],
      ['2026-05-06T07:00', 0, 0, 0, 0, 0, 10,  0, 0, 0],
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    if (!result) throw new Error('result null');
    const distFromZero = Math.min(result.windDirDegAvg, 360 - result.windDirDegAvg);
    expect(distFromZero).toBeLessThan(1);
  });

  it('all-zero precipitation returns 0 (not NaN)', () => {
    const slice = build([
      ['2026-05-06T06:00', 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T07:00', 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    if (!result) throw new Error('result null');
    expect(result.precipMm).toBe(0);
    expect(Number.isNaN(result.precipMm)).toBe(false);
  });
});
