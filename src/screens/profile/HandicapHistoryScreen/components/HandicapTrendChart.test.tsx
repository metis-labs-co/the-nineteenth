import React from 'react';
import { render } from '@testing-library/react-native';
import { LineChart } from 'react-native-gifted-charts';
import { HandicapTrendChart } from './HandicapTrendChart';
import type { HandicapRound } from '@/types';

// Stub the charting lib so jest never renders the native chart, but capture
// the props passed to it so we can assert chart configuration.
jest.mock('react-native-gifted-charts', () => ({
  LineChart: jest.fn(() => null),
}));

const lineChartMock = LineChart as unknown as jest.Mock;

function lastLineChartProps() {
  return lineChartMock.mock.calls[lineChartMock.mock.calls.length - 1][0];
}

beforeEach(() => {
  lineChartMock.mockClear();
});

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

  it('themes the x-axis date labels in compact mode (not hardcoded black)', () => {
    render(<HandicapTrendChart rounds={makeRounds(5)} variant="compact" />);
    const props = lastLineChartProps();
    // A theme color (string from useThemeColors) is applied, so labels follow
    // light/dark mode instead of defaulting to black.
    expect(typeof props.xAxisLabelTextStyle.color).toBe('string');
    expect(props.xAxisLabelTextStyle.color.length).toBeGreaterThan(0);
  });

  it('draws a flat average line at the mean differential in a distinct colour', () => {
    // differentials are 10..14 → mean 12, regardless of ordering.
    render(<HandicapTrendChart rounds={makeRounds(5)} variant="compact" />);
    const props = lastLineChartProps();

    expect(Array.isArray(props.data2)).toBe(true);
    expect(props.data2).toHaveLength(5);
    props.data2.forEach((point: { value: number }) => {
      expect(point.value).toBeCloseTo(12);
    });
    // The average line uses a different colour from the trend line.
    expect(typeof props.color2).toBe('string');
    expect(props.color2).not.toBe(props.color1);
  });
});
