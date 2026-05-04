import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { RoundTodayCard } from './RoundTodayCard';
import * as upcomingWeather from '@/hooks/weather/useUpcomingRoundWeather';

jest.mock('@/hooks/weather/useUpcomingRoundWeather');

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: mockNavigate }) };
});

const round: any = {
  id: 'r-1',
  date: '2026-05-04',
  tee_time: '07:30:00',
  course: {
    id: 'c-1',
    name: 'Royal Melbourne',
    clubs: { latitude: -37.97, longitude: 145.04 },
  },
};

const wrap = (node: React.ReactNode) => (
  <NavigationContainer>{node}</NavigationContainer>
);

describe('RoundTodayCard', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    (upcomingWeather.useUpcomingRoundWeather as jest.Mock).mockReturnValue({ data: null });
  });

  it('renders course name and formatted tee time', () => {
    const { getByText } = render(wrap(<RoundTodayCard round={round} />));
    expect(getByText('Royal Melbourne')).toBeTruthy();
    expect(getByText(/7:30/)).toBeTruthy();
  });

  it('renders the WeatherStrip when weather data is available', () => {
    (upcomingWeather.useUpcomingRoundWeather as jest.Mock).mockReturnValue({
      data: {
        tempC: 14, weatherCode: 1, windKph: 10, windDirDeg: 200,
        precipProbability: 0, fetchedAt: '2026-05-04T07:00:00Z',
      },
    });
    const { getByTestId } = render(wrap(<RoundTodayCard round={round} />));
    expect(getByTestId('weather-strip')).toBeTruthy();
  });

  it('hides the WeatherStrip when weather is null (fail-soft)', () => {
    const { queryByTestId } = render(wrap(<RoundTodayCard round={round} />));
    expect(queryByTestId('weather-strip')).toBeNull();
  });

  it('navigates to ViewRound on press', () => {
    const { getByTestId } = render(wrap(<RoundTodayCard round={round} />));
    fireEvent.press(getByTestId('round-today-card'));
    expect(mockNavigate).toHaveBeenCalledWith('ViewRound', { roundId: 'r-1' });
  });
});
