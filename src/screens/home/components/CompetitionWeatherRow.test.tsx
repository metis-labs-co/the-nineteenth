import React from 'react';
import { render } from '@testing-library/react-native';
import { CompetitionWeatherRow } from './CompetitionWeatherRow';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({ textSecondary: '#666', textTertiary: '#999' }),
}));
jest.mock('./dateLabels', () => ({ formatDayLabel: () => 'Friday' }));
jest.mock('@/utils/locale', () => ({ formatDisplayDate: () => '26 Jun' }));

describe('CompetitionWeatherRow', () => {
  it('renders the rounded high/low temperatures and the day label', () => {
    const { getByText } = render(
      <CompetitionWeatherRow
        dateIso="2026-06-26"
        weather={{ weatherCode: 0, tempMaxC: 18.6, tempMinC: 8.4, precipProbabilityMax: 30 }}
      />,
    );
    expect(getByText('Friday · 26 Jun')).toBeTruthy();
    expect(getByText('19°/8°')).toBeTruthy();
    expect(getByText('30%')).toBeTruthy();
  });

  it('hides precipitation below the 10% threshold', () => {
    const { queryByText } = render(
      <CompetitionWeatherRow
        dateIso="2026-06-26"
        weather={{ weatherCode: 0, tempMaxC: 20, tempMinC: 11, precipProbabilityMax: 5 }}
      />,
    );
    expect(queryByText('5%')).toBeNull();
  });
});
