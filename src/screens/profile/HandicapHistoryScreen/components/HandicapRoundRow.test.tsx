import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HandicapRoundRow } from './HandicapRoundRow';
import type { HandicapRound } from '@/types/handicap.types';

function makeRound(overrides: Partial<HandicapRound> = {}): HandicapRound {
  return {
    scorecardId: 'sc-1',
    roundId: 'round-1',
    competitionId: null,
    roundDate: '2026-10-01',
    courseName: 'Settlers Run',
    clubName: 'Settlers Run Golf Club',
    totalGross: 88,
    dailyHandicapUsed: 14,
    handicapDifferential: 13.2,
    courseRatingUsed: 72.1,
    slopeRatingUsed: 131,
    isQualifying: true,
    roundNumber: 1,
    ...overrides,
  };
}

describe('HandicapRoundRow', () => {
  it('opens the round when tapped', () => {
    const onPress = jest.fn();
    const round = makeRound();
    const { getByRole } = render(<HandicapRoundRow round={round} onPress={onPress} />);

    fireEvent.press(getByRole('button', { name: /Settlers Run.*Opens scorecard/ }));

    expect(onPress).toHaveBeenCalledWith(round);
  });

  it('labels the daily handicap as DHC', () => {
    const { getByText } = render(<HandicapRoundRow round={makeRound()} onPress={jest.fn()} />);
    expect(getByText('DHC: 14')).toBeTruthy();
  });

  it('is not pressable without an onPress handler', () => {
    const { getByRole } = render(<HandicapRoundRow round={makeRound()} />);
    expect(getByRole('button', { name: /Opens scorecard/ }).props.accessibilityState?.disabled).toBe(true);
  });
});
