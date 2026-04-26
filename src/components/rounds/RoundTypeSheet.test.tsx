/**
 * RoundTypeSheet — behaviour tests
 *
 * Covers the critical UX behaviours of the preset picker:
 * - Locked (tier-gated) presets route to the Subscription screen on tap.
 * - Context-incompatible presets (team presets on a standalone round) are
 *   hidden entirely.
 * - In-progress sub-matches block any preset change.
 * - The currently-saved preset is pre-selected.
 * - Tapping Save wires applyPresetToRound with the expected preset id.
 *
 * Sub-match generation (generateSubMatches) is mocked to an empty result;
 * the preview pipeline is integration-level and out of scope.
 */

import React from 'react';
import { fireEvent, render, screen, waitForAsync } from '@/__tests__/utils/renderHelpers';
import { RoundTypeSheet } from './RoundTypeSheet';
import type { RoundShapeForPresets } from '@/constants/roundPresets';

const mockNavigate = jest.fn();
const mockUseTier = jest.fn();
const mockApplyPresetToRound = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('@/context/SubscriptionContext', () => ({
  useTier: () => mockUseTier(),
}));

jest.mock('@/services/rounds/applyPresetToRound', () => ({
  applyPresetToRound: (...args: unknown[]) => mockApplyPresetToRound(...args),
}));

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
  useSubMatches: jest.fn(() => ({ data: [], isLoading: false })),
}));

jest.mock('@/components/common/BottomSheet', () => {
  const { View } = require('react-native');
  return {
    BottomSheet: ({
      visible,
      children,
    }: {
      visible: boolean;
      children: React.ReactNode;
    }) => (visible ? <View testID="bottom-sheet">{children}</View> : null),
  };
});

jest.mock('@/utils/pairingAlgorithm', () => ({
  generateSubMatches: () => ({ subMatches: [], warnings: [] }),
  formatTeeTimeForDisplay: (t: string | null) => t ?? '',
}));

function makeRound(overrides: Partial<RoundShapeForPresets> = {}): RoundShapeForPresets {
  return {
    game_type: 'stableford',
    is_team_round: false,
    team_format: null,
    round_format: 'combined',
    sub_match_size: null,
    rules_override: null,
    ...overrides,
  };
}

const defaultProps = {
  visible: true,
  onDismiss: jest.fn(),
  roundId: 'round-1',
  competitionId: 'comp-1',
  round: makeRound(),
  perRoundRulesEnabled: true,
  roundTeeTime: '08:00:00',
};

describe('RoundTypeSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTier.mockReturnValue('free');
    mockApplyPresetToRound.mockResolvedValue(undefined);
  });

  it('pre-selects the currently-saved preset', () => {
    render(<RoundTypeSheet {...defaultProps} round={makeRound()} />);

    const card = screen.getByTestId('round-type-preset-individual_stableford');
    expect(card.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true })
    );
  });

  it('hides team presets on a standalone round', () => {
    render(<RoundTypeSheet {...defaultProps} competitionId={null} />);

    expect(screen.queryByTestId('round-type-preset-team_scramble')).toBeNull();
    expect(screen.queryByTestId('round-type-preset-pairs_better_ball_2v2')).toBeNull();
  });

  it('routes to the Subscription screen when a free user taps a premium preset', () => {
    mockUseTier.mockReturnValue('free');
    render(<RoundTypeSheet {...defaultProps} />);

    fireEvent.press(screen.getByTestId('round-type-preset-individual_match_play'));

    expect(mockNavigate).toHaveBeenCalledWith('Subscription');
  });

  it('disables Save when no pending selection differs from the current preset', () => {
    render(<RoundTypeSheet {...defaultProps} />);

    const save = screen.getByTestId('round-type-save');
    expect(save.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true })
    );
  });

  it('blocks selection when sub-matches are already in progress', () => {
    // Override the useSubMatches mock for this test only.
    const { useSubMatches } = jest.requireMock('@/hooks/rounds') as {
      useSubMatches: jest.Mock;
    };
    useSubMatches.mockReturnValueOnce({
      data: [{ status: 'in-progress' }],
      isLoading: false,
    });

    render(<RoundTypeSheet {...defaultProps} />);

    expect(
      screen.getByText(/Can't change the round type/i)
    ).toBeTruthy();
    const save = screen.getByTestId('round-type-save');
    expect(save.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true })
    );
  });

  it('calls applyPresetToRound with the selected preset id on Save (social user, non-split)', async () => {
    mockUseTier.mockReturnValue('social');
    render(
      <RoundTypeSheet
        {...defaultProps}
        round={makeRound({ game_type: 'stableford', is_team_round: false })}
      />
    );

    // Switch from individual_stableford (current) to individual_stroke.
    fireEvent.press(screen.getByTestId('round-type-preset-individual_stroke'));

    // Confirm the state update landed: the card is now selected AND Save
    // is no longer disabled. If this fails, the test below won't trigger
    // onPress and the mock expectation is misleading.
    expect(
      screen
        .getByTestId('round-type-preset-individual_stroke')
        .props.accessibilityState?.selected
    ).toBe(true);
    expect(
      screen.getByTestId('round-type-save').props.accessibilityState?.disabled
    ).toBe(false);

    fireEvent.press(screen.getByTestId('round-type-save'));
    // React Query's useMutation schedules the mutationFn on a microtask,
    // so `applyPresetToRound` hasn't been called yet when fireEvent.press
    // returns. A single tick flushes the Promise chain.
    await waitForAsync();

    expect(mockApplyPresetToRound).toHaveBeenCalledTimes(1);
    const call = mockApplyPresetToRound.mock.calls[0][0];
    expect(call.presetId).toBe('individual_stroke');
    expect(call.roundId).toBe('round-1');
    expect(call.subMatches).toBeUndefined(); // non-split target
  });
});
