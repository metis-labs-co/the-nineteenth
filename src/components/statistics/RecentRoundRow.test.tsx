import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { RecentRoundRow } from './RecentRoundRow';

const BASE = {
  date: 'Wed, 10th September, 2026', courseName: 'Test Course', clubName: 'Test Club',
  competitionName: 'Practice Round', totalGross: 24, totalPoints: 12,
  gameType: 'stroke' as const,
};

describe('RecentRoundRow', () => {
  it('renders the ended label alongside existing category and score pills', () => {
    render(<RecentRoundRow {...BASE} isPracticeRound endedEarlyLabel="Ended after 6 of 18" />);
    expect(screen.getByTestId('recent-round-ended-early')).toBeTruthy();
    expect(screen.getByText('Ended after 6 of 18')).toBeTruthy();
    expect(screen.getByText('Practice')).toBeTruthy();
    expect(screen.getByText('24')).toBeTruthy();
  });

  it.each([null, undefined])('omits the ended label when %s', (endedEarlyLabel) => {
    render(<RecentRoundRow {...BASE} endedEarlyLabel={endedEarlyLabel} />);
    expect(screen.queryByTestId('recent-round-ended-early')).toBeNull();
  });

  it('preserves details, scores, category pills and navigation (characterization)', () => {
    const onPress = jest.fn();
    render(<RecentRoundRow {...BASE} gameType="stableford" isHandicapRound onPress={onPress} />);
    expect(screen.getByText(BASE.date)).toBeTruthy();
    expect(screen.getByText('Test Club')).toBeTruthy();
    expect(screen.getByText('Handicap')).toBeTruthy();
    expect(screen.getByText('24')).toBeTruthy();
    expect(screen.getByText('12 pts')).toBeTruthy();
    expect(screen.queryByTestId('recent-round-ended-early')).toBeNull();
    fireEvent.press(screen.getByText('Test Course'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the ordinary practice pill without stroke secondary points (characterization)', () => {
    render(<RecentRoundRow {...BASE} isPracticeRound />);
    expect(screen.getByText('Practice')).toBeTruthy();
    expect(screen.queryByText('12 pts')).toBeNull();
  });
});
