import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';

describe('weatherCodeToIcon', () => {
  it('maps clear sky (0) to weather-sunny', () => {
    expect(weatherCodeToIcon(0)).toEqual({
      icon: 'weather-sunny',
      label: 'Clear sky',
    });
  });

  it('maps partly cloudy (1, 2) to weather-partly-cloudy', () => {
    expect(weatherCodeToIcon(1).icon).toBe('weather-partly-cloudy');
    expect(weatherCodeToIcon(2).icon).toBe('weather-partly-cloudy');
  });

  it('maps overcast (3) to weather-cloudy', () => {
    expect(weatherCodeToIcon(3).icon).toBe('weather-cloudy');
  });

  it('maps fog (45, 48) to weather-fog', () => {
    expect(weatherCodeToIcon(45).icon).toBe('weather-fog');
    expect(weatherCodeToIcon(48).icon).toBe('weather-fog');
  });

  it('maps drizzle range (51-57) to weather-rainy', () => {
    [51, 53, 55, 56, 57].forEach((c) =>
      expect(weatherCodeToIcon(c).icon).toBe('weather-rainy'),
    );
  });

  it('maps rain range (61-67) to weather-pouring', () => {
    [61, 63, 65, 66, 67].forEach((c) =>
      expect(weatherCodeToIcon(c).icon).toBe('weather-pouring'),
    );
  });

  it('maps snow range (71-77) to weather-snowy', () => {
    [71, 73, 75, 77].forEach((c) =>
      expect(weatherCodeToIcon(c).icon).toBe('weather-snowy'),
    );
  });

  it('maps snow showers (85, 86) to weather-snowy', () => {
    [85, 86].forEach((c) =>
      expect(weatherCodeToIcon(c).icon).toBe('weather-snowy'),
    );
  });

  it('maps showers (80-82) to weather-pouring', () => {
    [80, 81, 82].forEach((c) =>
      expect(weatherCodeToIcon(c).icon).toBe('weather-pouring'),
    );
  });

  it('maps thunderstorm range (95-99) to weather-lightning', () => {
    [95, 96, 99].forEach((c) =>
      expect(weatherCodeToIcon(c).icon).toBe('weather-lightning'),
    );
  });

  it('falls back to weather-cloudy for unknown codes', () => {
    expect(weatherCodeToIcon(404).icon).toBe('weather-cloudy');
    expect(weatherCodeToIcon(404).label).toBe('Unknown');
  });
});
