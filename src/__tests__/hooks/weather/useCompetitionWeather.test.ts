import {
  buildDailyUrl,
  mapDailyResponse,
  selectDaysWeather,
  type CompetitionWeather,
} from '@/hooks/weather/useCompetitionWeather';
import type { CompetitionDay } from '@/hooks/home/useHomeData';

describe('buildDailyUrl', () => {
  it('rounds coordinates to 2dp and requests the daily window', () => {
    const url = buildDailyUrl(-37.812345, 144.96789);
    expect(url).toContain('latitude=-37.81');
    expect(url).toContain('longitude=144.97');
    expect(url).toContain('timezone=auto');
    expect(url).toContain('forecast_days=16');
    expect(url).toContain('temperature_2m_max');
    expect(url).toContain('precipitation_probability_max');
  });
});

describe('mapDailyResponse', () => {
  it('maps the daily arrays into a date-keyed record', () => {
    const json = {
      daily: {
        time: ['2026-06-26', '2026-06-27'],
        weather_code: [3, 61],
        temperature_2m_max: [18.4, 15.1],
        temperature_2m_min: [9.2, 8.0],
        precipitation_probability_max: [20, 80],
      },
    };
    const out = mapDailyResponse(json);
    expect(out['2026-06-26']).toEqual({
      weatherCode: 3,
      tempMaxC: 18.4,
      tempMinC: 9.2,
      precipProbabilityMax: 20,
    });
    expect(out['2026-06-27'].precipProbabilityMax).toBe(80);
  });

  it('returns {} for a malformed payload', () => {
    expect(mapDailyResponse(null)).toEqual({});
    expect(mapDailyResponse({})).toEqual({});
    expect(mapDailyResponse({ daily: {} })).toEqual({});
  });

  it('defaults missing precipitation probability to 0', () => {
    const out = mapDailyResponse({
      daily: {
        time: ['2026-06-26'],
        weather_code: [0],
        temperature_2m_max: [22],
        temperature_2m_min: [11],
        // precipitation_probability_max omitted
      },
    });
    expect(out['2026-06-26'].precipProbabilityMax).toBe(0);
  });
});

describe('selectDaysWeather', () => {
  const day = (over: Partial<CompetitionDay>): CompetitionDay => ({
    dateIso: '2026-06-26',
    lat: -37.81,
    lng: 144.96,
    ...over,
  });

  it('selects each day from its own coordinate map', () => {
    const melbourne: CompetitionWeather = {
      '2026-06-26': { weatherCode: 3, tempMaxC: 18, tempMinC: 9, precipProbabilityMax: 20 },
    };
    const sydney: CompetitionWeather = {
      '2026-06-27': { weatherCode: 0, tempMaxC: 23, tempMinC: 14, precipProbabilityMax: 5 },
    };
    const byCoord = new Map<string, CompetitionWeather>([
      ['-37.81,144.96', melbourne],
      ['-33.86,151.2', sydney],
    ]);
    const days = [
      day({ dateIso: '2026-06-26', lat: -37.81, lng: 144.96 }),
      day({ dateIso: '2026-06-27', lat: -33.86, lng: 151.2 }),
    ];
    const out = selectDaysWeather(days, byCoord);
    expect(Object.keys(out)).toEqual(['2026-06-26', '2026-06-27']);
    expect(out['2026-06-27'].tempMaxC).toBe(23);
  });

  it('omits days whose date is outside the forecast window', () => {
    const byCoord = new Map<string, CompetitionWeather>([
      ['-37.81,144.96', { '2026-06-26': { weatherCode: 1, tempMaxC: 18, tempMinC: 9, precipProbabilityMax: 0 } }],
    ]);
    const days = [
      day({ dateIso: '2026-06-26' }),
      day({ dateIso: '2026-07-30' }), // too far out — not in the map
    ];
    const out = selectDaysWeather(days, byCoord);
    expect(Object.keys(out)).toEqual(['2026-06-26']);
  });

  it('omits days whose coordinate has no map (e.g. fetch failed)', () => {
    const byCoord = new Map<string, CompetitionWeather>();
    const out = selectDaysWeather([day({})], byCoord);
    expect(out).toEqual({});
  });
});
