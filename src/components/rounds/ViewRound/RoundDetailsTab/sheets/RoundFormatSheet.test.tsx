/**
 * RoundFormatSheet — tier gate tests
 *
 * Verifies that the "Split into sub-matches" format option is gated behind
 * Social+ tier. Free users see it locked and get routed to the Subscription
 * screen on tap. Social+ users unlock the option and can configure split
 * rounds normally.
 *
 * Other sheet behaviour (team fetching, mutation flow, sub-match preview)
 * is integration-level and out of scope here.
 */

import React from 'react';
import { fireEvent, render, screen } from '@/__tests__/utils/renderHelpers';
import { RoundFormatSheet } from './RoundFormatSheet';

const mockNavigate = jest.fn();
const mockUseIsSocial = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('@/context/SubscriptionContext', () => ({
  useIsSocial: () => mockUseIsSocial(),
}));

// The split-format preview depends on team data and the generator. Neither
// is relevant to the tier-gate tests, so stub the teams hook to return
// nothing and let the in-component logic render the "not enough players"
// path without side effects.
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({
    teams: [],
    isLoading: false,
    error: null,
    getPlayerTeam: () => undefined,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/hooks/rounds', () => ({
  useSubMatches: () => ({ data: [], isLoading: false }),
}));

// BottomSheet renders its children only when visible. Keep behaviour close
// to production so queries work normally.
jest.mock('@/components/common/BottomSheet', () => {
  const { View } = require('react-native');
  return {
    BottomSheet: ({
      visible,
      children,
    }: {
      visible: boolean;
      children: React.ReactNode;
      title: string;
    }) => (visible ? <View testID="bottom-sheet">{children}</View> : null),
  };
});

const defaultProps = {
  visible: true,
  onDismiss: jest.fn(),
  roundId: 'round-1',
  competitionId: 'comp-1',
  isTeamRound: true,
  currentFormat: 'combined' as const,
  currentSubMatchSize: null,
  roundTeeTime: '08:00:00',
};

describe('RoundFormatSheet — Split format tier gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Free tier', () => {
    beforeEach(() => {
      mockUseIsSocial.mockReturnValue(false);
    });

    it('renders the Split option with a tier pill label', () => {
      render(<RoundFormatSheet {...defaultProps} />);

      expect(screen.getByText('Split into sub-matches')).toBeTruthy();
      expect(screen.getByText('Social tier')).toBeTruthy();
    });

    it('tapping Split routes to the Subscription screen and dismisses the sheet', () => {
      const onDismiss = jest.fn();
      render(<RoundFormatSheet {...defaultProps} onDismiss={onDismiss} />);

      fireEvent.press(screen.getByRole('radio', { name: 'Split into sub-matches' }));

      expect(mockNavigate).toHaveBeenCalledWith('Subscription');
      expect(onDismiss).toHaveBeenCalled();
    });

    it('does not reveal the sub-match size chips when Split is tapped', () => {
      render(<RoundFormatSheet {...defaultProps} />);

      fireEvent.press(screen.getByTestId('round-format-split'));

      // Chips are only mounted when format === 'split'. Free-tier tap should
      // not toggle format, so the chips stay absent.
      expect(screen.queryByText('1v1')).toBeNull();
      expect(screen.queryByText('2v2')).toBeNull();
      expect(screen.queryByText('3v3')).toBeNull();
    });
  });

  describe('Social tier', () => {
    beforeEach(() => {
      mockUseIsSocial.mockReturnValue(true);
    });

    it('does not render the tier pill on the Split option', () => {
      render(<RoundFormatSheet {...defaultProps} />);

      expect(screen.getByText('Split into sub-matches')).toBeTruthy();
      expect(screen.queryByText('Social tier')).toBeNull();
    });

    it('tapping Split reveals the sub-match size chips', () => {
      render(<RoundFormatSheet {...defaultProps} />);

      fireEvent.press(screen.getByTestId('round-format-split'));

      expect(screen.getByText('1v1')).toBeTruthy();
      expect(screen.getByText('2v2')).toBeTruthy();
      expect(screen.getByText('3v3')).toBeTruthy();
    });

    it('tapping Split does not navigate to the Subscription screen', () => {
      render(<RoundFormatSheet {...defaultProps} />);

      fireEvent.press(screen.getByTestId('round-format-split'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
