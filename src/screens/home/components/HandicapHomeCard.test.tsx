import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HandicapHomeCard } from './HandicapHomeCard';
import type { HandicapSummary } from '@/types/handicap.types';

// Isolate from the charting lib.
jest.mock(
  '@/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart',
  () => ({ HandicapTrendChart: () => null }),
);

function makeSummary(overrides: Partial<HandicapSummary> = {}): HandicapSummary {
  return {
    handicapIndex: 12.4,
    totalRounds: 20,
    qualifyingRoundsCount: 8,
    rounds: [],
    combinablePairs: [],
    lastUpdated: null,
    ...overrides,
  } as unknown as HandicapSummary;
}

describe('HandicapHomeCard', () => {
  it('renders the formatted index and subtitle when data exists', () => {
    const { getByText } = render(
      <HandicapHomeCard summary={makeSummary()} onPress={jest.fn()} />,
    );
    expect(getByText('Social Handicap Index')).toBeTruthy();
    expect(getByText('12.4')).toBeTruthy();
    expect(getByText('Best 8 of 20')).toBeTruthy();
  });

  it('renders the empty prompt when summary is null', () => {
    const { getByText } = render(
      <HandicapHomeCard summary={null} onPress={jest.fn()} />,
    );
    expect(getByText('—')).toBeTruthy();
    expect(getByText('Play rounds to establish your index')).toBeTruthy();
  });

  it('renders the empty prompt when there are zero rounds', () => {
    const { getByText } = render(
      <HandicapHomeCard
        summary={makeSummary({ handicapIndex: null, totalRounds: 0, qualifyingRoundsCount: 0 })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('—')).toBeTruthy();
    expect(getByText('Play rounds to establish your index')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HandicapHomeCard summary={makeSummary()} onPress={onPress} testID="hcap-card" />,
    );
    fireEvent.press(getByTestId('hcap-card'));
    expect(onPress).toHaveBeenCalled();
  });
});
