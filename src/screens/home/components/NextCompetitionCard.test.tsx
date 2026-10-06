import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NextCompetitionCard } from './NextCompetitionCard';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#fff',
    borderLight: '#eee',
    textPrimary: '#000',
    textSecondary: '#666',
    textTertiary: '#999',
    primary: '#080',
  }),
}));
jest.mock('./dateLabels', () => ({ formatDayLabel: () => 'This Friday' }));
jest.mock('@/utils/locale', () => ({ formatDisplayDate: () => '26 Jun' }));

const mockUseCompetitionWeather = jest.fn();
jest.mock('@/hooks/weather', () => ({
  useCompetitionWeather: (...args: unknown[]) => mockUseCompetitionWeather(...args),
  weatherCodeToIcon: () => ({ icon: 'weather-sunny', label: 'Clear sky' }),
}));

const round = {
  id: 'r-fri',
  date: '2026-06-26',
  tee_time: '08:30:00',
  competition: { id: 'comp-1', name: 'Saturday Medal' },
} as unknown as RoundWithCourse;

beforeEach(() => {
  mockNavigate.mockClear();
  mockUseCompetitionWeather.mockReturnValue({ data: {} });
});

describe('NextCompetitionCard', () => {
  it('shows the competition name', () => {
    const { getByText } = render(<NextCompetitionCard round={round} />);
    expect(getByText('Saturday Medal')).toBeTruthy();
  });

  it('navigates to CompetitionDetail on press', () => {
    const { getByTestId } = render(<NextCompetitionCard round={round} />);
    fireEvent.press(getByTestId('next-competition-card'));
    expect(mockNavigate).toHaveBeenCalledWith('CompetitionDetail', { id: 'comp-1' });
  });

  it('renders the day-label and date subtitle', () => {
    const { getByText } = render(<NextCompetitionCard round={round} />);
    expect(getByText('This Friday · 26 Jun')).toBeTruthy();
  });

  it('shows the competition description when present', () => {
    const withDesc = {
      ...round,
      competition: { ...round.competition, description: 'Winter knockout series' },
    } as unknown as RoundWithCourse;
    const { getByText } = render(<NextCompetitionCard round={withDesc} />);
    expect(getByText('Winter knockout series')).toBeTruthy();
  });

  it('omits the description block when there is none', () => {
    const { queryByText } = render(<NextCompetitionCard round={round} />);
    expect(queryByText('Winter knockout series')).toBeNull();
  });

  it('renders a weather row per forecastable day', () => {
    const days = [
      { dateIso: '2026-06-26', lat: -37.81, lng: 144.96 },
      { dateIso: '2026-06-27', lat: -37.81, lng: 144.96 },
    ];
    mockUseCompetitionWeather.mockReturnValue({
      data: {
        '2026-06-26': { weatherCode: 0, tempMaxC: 18, tempMinC: 9, precipProbabilityMax: 20 },
        '2026-06-27': { weatherCode: 0, tempMaxC: 16, tempMinC: 8, precipProbabilityMax: 0 },
      },
    });
    const { getByTestId, getAllByTestId } = render(
      <NextCompetitionCard round={round} days={days} />,
    );
    expect(getByTestId('competition-weather')).toBeTruthy();
    expect(getAllByTestId('competition-weather-row')).toHaveLength(2);
  });

  it('renders no weather section when no day has a forecast', () => {
    const days = [{ dateIso: '2026-07-30', lat: -37.81, lng: 144.96 }];
    mockUseCompetitionWeather.mockReturnValue({ data: {} });
    const { queryByTestId } = render(
      <NextCompetitionCard round={round} days={days} />,
    );
    expect(queryByTestId('competition-weather')).toBeNull();
  });
});
