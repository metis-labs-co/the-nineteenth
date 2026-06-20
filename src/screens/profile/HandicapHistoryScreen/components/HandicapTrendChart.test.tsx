import React from 'react';
import { render } from '@testing-library/react-native';
import { HandicapTrendChart } from './HandicapTrendChart';
import type { HandicapRound } from '@/types';

// Stub the charting lib so jest never renders the native chart.
jest.mock('react-native-gifted-charts', () => ({
  LineChart: () => null,
}));

function makeRounds(n: number): HandicapRound[] {
  return Array.from({ length: n }, (_, i) => ({
    scorecardId: `s${i}`,
    roundDate: `2026-01-0${(i % 9) + 1}`,
    handicapDifferential: 10 + i,
    isQualifying: i % 2 === 0,
    isCombined: false,
  })) as unknown as HandicapRound[];
}

describe('HandicapTrendChart', () => {
  it('renders title and legend in full mode', () => {
    const { getByText } = render(<HandicapTrendChart rounds={makeRounds(5)} />);
    expect(getByText('Differential Trend')).toBeTruthy();
    expect(getByText('Counts toward index')).toBeTruthy();
  });

  it('omits title and legend in compact mode', () => {
    const { queryByText } = render(
      <HandicapTrendChart rounds={makeRounds(5)} variant="compact" />,
    );
    expect(queryByText('Differential Trend')).toBeNull();
    expect(queryByText('Counts toward index')).toBeNull();
  });

  it('renders nothing in compact mode with fewer than 2 rounds', () => {
    const { toJSON } = render(
      <HandicapTrendChart rounds={makeRounds(1)} variant="compact" />,
    );
    expect(toJSON()).toBeNull();
  });
});
