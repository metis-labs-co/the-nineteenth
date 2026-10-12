import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { LineChart } from 'react-native-gifted-charts';
import { PerformanceChart, type RoundDataPoint } from './PerformanceChart';

// Stub the chart so jest never renders the native SVG; capture its props.
jest.mock('react-native-gifted-charts', () => ({
  LineChart: jest.fn(() => null),
}));

const mockOpenRound = jest.fn();
jest.mock('@/navigation/openRound', () => ({
  useOpenRound: () => mockOpenRound,
}));

const lineChartMock = LineChart as unknown as jest.Mock;
const lastLineChartProps = () => lineChartMock.mock.calls[lineChartMock.mock.calls.length - 1][0];

// Newest-first, as callers pass them; the chart draws oldest → newest.
const ROUNDS: RoundDataPoint[] = [
  { date: '2026-03-10', totalGross: 82, totalPoints: 38, roundId: 'r-new', competitionId: 'c-1' },
  { date: '2026-03-01', totalGross: 90, totalPoints: 30, roundId: 'r-old', competitionId: null },
];

beforeEach(() => {
  lineChartMock.mockClear();
  mockOpenRound.mockClear();
});

describe('PerformanceChart', () => {
  it('shows no round chip until a point is focused', () => {
    const { queryByLabelText, getByText } = render(<PerformanceChart rounds={ROUNDS} />);
    expect(getByText('Tap a point to see that round')).toBeTruthy();
    expect(queryByLabelText(/View round/)).toBeNull();
    expect(lastLineChartProps().focusEnabled).toBe(true);
  });

  it('opens the focused point\'s round, mapping chart order back to the round', () => {
    const { getByLabelText, getByText } = render(<PerformanceChart rounds={ROUNDS} />);
    // Chart index 1 is the newest round (rounds are reversed for display).
    act(() => lastLineChartProps().onFocus({}, 1));
    expect(getByText('10/3 · 82 strokes · 38 pts')).toBeTruthy();

    fireEvent.press(getByLabelText('View round from 10/3, 82 strokes'));
    expect(mockOpenRound).toHaveBeenCalledWith({ roundId: 'r-new', competitionId: 'c-1' });
  });

  it('shows the summary without a View round action when the point has no round id', () => {
    const { queryByLabelText, getByText } = render(
      <PerformanceChart rounds={ROUNDS.map(({ roundId: _r, ...rest }) => rest)} />,
    );
    act(() => lastLineChartProps().onFocus({}, 0));
    expect(getByText('1/3 · 90 strokes · 30 pts')).toBeTruthy();
    expect(queryByLabelText(/View round/)).toBeNull();
  });
});
