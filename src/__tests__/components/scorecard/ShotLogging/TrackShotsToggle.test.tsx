import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TrackShotsToggle } from '@/components/scorecard/ShotLogging/TrackShotsToggle';
import { useShotTrackingEligibility } from '@/hooks/shots';
import { useShotLoggingPrefStore } from '@/store/shotLoggingPrefStore';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#fff',
    border: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
  }),
}));

jest.mock('@/hooks/shots', () => ({
  useShotTrackingEligibility: jest.fn(),
}));

const mockedEligibility = useShotTrackingEligibility as jest.MockedFunction<
  typeof useShotTrackingEligibility
>;

describe('TrackShotsToggle', () => {
  beforeEach(() => {
    useShotLoggingPrefStore.setState({ byRound: {} });
    mockedEligibility.mockReset();
  });

  it('renders nothing when ineligible', () => {
    mockedEligibility.mockReturnValue({ eligible: false, reason: 'not-premium' });
    const { queryByTestId } = render(<TrackShotsToggle roundId="r1" />);
    expect(queryByTestId('track-shots-toggle-row')).toBeNull();
  });

  it('renders the row when eligible', () => {
    mockedEligibility.mockReturnValue({ eligible: true });
    const { getByTestId, getByText } = render(<TrackShotsToggle roundId="r1" />);
    expect(getByTestId('track-shots-toggle-row')).toBeTruthy();
    expect(getByText('Track my shots')).toBeTruthy();
  });

  it('toggling flips the per-round flag', () => {
    mockedEligibility.mockReturnValue({ eligible: true });
    const { getByTestId } = render(<TrackShotsToggle roundId="r1" />);
    fireEvent(getByTestId('track-shots-toggle-switch'), 'valueChange', true);
    expect(useShotLoggingPrefStore.getState().byRound.r1).toBe(true);
  });
});
