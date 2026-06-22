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
    primary: '#080',
  }),
}));

const round = {
  id: 'r-fri',
  date: '2026-06-26',
  tee_time: '08:30:00',
  competition: { id: 'comp-1', name: 'Saturday Medal' },
} as unknown as RoundWithCourse;

beforeEach(() => mockNavigate.mockClear());

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
});
