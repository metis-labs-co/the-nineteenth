/** Nine-type edits preserve scores and clear caches only after a successful change. */
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@/__tests__/utils/renderHelpers';
import { roundKeys, leaderboardKeys } from '@/hooks/queryKeys';
import { EditNineTypeSheet } from './EditNineTypeSheet';

const mockUpdateRound = jest.fn();
jest.mock('@/screens/admin/EditRoundScreen/hooks/useEditRoundData', () => ({
  updateRound: (...args: unknown[]) => mockUpdateRound(...args),
}));

const mockDeleteHoles = jest.fn();
jest.mock('@/services/offline/database', () => ({
  deleteHoles: (...args: unknown[]) => mockDeleteHoles(...args),
}));

let mockScorecards: { scores: Record<string, unknown> | null }[] = [];
jest.mock('@/hooks/rounds', () => ({
  useRoundScorecards: () => ({ data: mockScorecards }),
}));

const mockResetRound = jest.fn();
let mockCurrentRoundId = 'round-1';
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: {
    getState: () => ({ currentRoundId: mockCurrentRoundId, resetRound: mockResetRound }),
  },
}));

jest.mock('@/components/common/BottomSheet', () => {
  const { View } = require('react-native');
  return {
    BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? <View testID="bottom-sheet">{children}</View> : null,
  };
});

type ConfirmationProps = {
  visible: boolean;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};
const mockConfirmation = jest.fn();
jest.mock('@/components/common/ConfirmationDialog', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    ConfirmationDialog: (props: ConfirmationProps) => {
      mockConfirmation(props);
      return props.visible ? (
        <View testID="hide-scores-confirmation">
          <Text>{props.message}</Text>
          <TouchableOpacity onPress={props.onConfirm}><Text>{props.confirmLabel}</Text></TouchableOpacity>
          <TouchableOpacity onPress={props.onCancel}><Text>Cancel</Text></TouchableOpacity>
        </View>
      ) : null;
    },
  };
});

type SheetProps = React.ComponentProps<typeof EditNineTypeSheet>;
function renderSheet(overrides: Partial<SheetProps> = {}) {
  const props: SheetProps = {
    visible: true,
    onDismiss: jest.fn(),
    roundId: 'round-1',
    currentNineType: 'full',
    ...overrides,
  };
  const result = render(<EditNineTypeSheet {...props} />);
  const invalidate = jest.spyOn(result.queryClient, 'invalidateQueries');
  return { ...result, props, invalidate };
}

function expectNoChange(invalidate: ReturnType<typeof renderSheet>['invalidate']) {
  expect(mockUpdateRound).not.toHaveBeenCalled();
  expect(mockResetRound).not.toHaveBeenCalled();
  expect(mockDeleteHoles).not.toHaveBeenCalled();
  expect(invalidate).not.toHaveBeenCalled();
}

describe('EditNineTypeSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScorecards = [];
    mockCurrentRoundId = 'round-1';
    mockUpdateRound.mockResolvedValue(undefined);
    mockDeleteHoles.mockResolvedValue(undefined);
  });

  it('switches to Front 9 and invalidates detail, lists and leaderboards (characterization)', async () => {
    const { props, invalidate } = renderSheet();
    fireEvent.press(screen.getByTestId('edit-nine-type-option-front9'));
    await waitFor(() => expect(props.onDismiss).toHaveBeenCalledTimes(1));
    expect(mockUpdateRound).toHaveBeenCalledWith('round-1', { nine_type: 'front9' });
    expect(invalidate.mock.calls).toEqual([
      [{ queryKey: roundKeys.detail('round-1') }],
      [{ queryKey: roundKeys.lists() }],
      [{ queryKey: leaderboardKeys.all }],
    ]);
    expect(mockResetRound).toHaveBeenCalledTimes(1);
    expect(mockDeleteHoles).toHaveBeenCalledWith('round-1');
  });

  it('preserves another round in the scoring store (characterization)', async () => {
    mockCurrentRoundId = 'round-2';
    const { props } = renderSheet();
    fireEvent.press(screen.getByTestId('edit-nine-type-option-back9'));
    await waitFor(() => expect(props.onDismiss).toHaveBeenCalled());
    expect(mockUpdateRound).toHaveBeenCalledWith('round-1', { nine_type: 'back9' });
    expect(mockResetRound).not.toHaveBeenCalled();
    expect(mockDeleteHoles).toHaveBeenCalledWith('round-1');
  });

  it.each([null, undefined])('allows edits with marker %s (characterization)', async (holesPlayed) => {
    const { props } = renderSheet({ holesPlayed });
    fireEvent.press(screen.getByTestId('edit-nine-type-option-front9'));
    await waitFor(() => expect(props.onDismiss).toHaveBeenCalled());
    expect(mockUpdateRound).toHaveBeenCalledWith('round-1', { nine_type: 'front9' });
  });

  it('dismisses the selected nine without changing it (characterization)', () => {
    const { props, invalidate } = renderSheet();
    fireEvent.press(screen.getByTestId('edit-nine-type-option-full'));
    expect(props.onDismiss).toHaveBeenCalled();
    expectNoChange(invalidate);
  });

  it('allows cancelling a change that would hide scored holes (characterization)', () => {
    mockScorecards = [{ scores: { '10': { strokes: 5 }, '11': { strokes: 4 } } }];
    const { props, invalidate } = renderSheet();
    fireEvent.press(screen.getByTestId('edit-nine-type-option-front9'));
    expect(screen.getByText(/Holes 10–11 have scores entered/)).toBeTruthy();
    expectNoChange(invalidate);
    fireEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByTestId('hide-scores-confirmation')).toBeNull();
    expect(props.onDismiss).not.toHaveBeenCalled();
    expectNoChange(invalidate);
  });

  it('changes the nine only after confirming hidden multi-ball scores (characterization)', async () => {
    mockScorecards = [{ scores: { '10': { balls: [{ strokes: 5 }] } } }];
    const { props } = renderSheet();
    fireEvent.press(screen.getByTestId('edit-nine-type-option-front9'));
    expect(screen.getByText(/Hole 10 has scores entered/)).toBeTruthy();
    expect(mockUpdateRound).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Switch to Front 9'));
    await waitFor(() => expect(props.onDismiss).toHaveBeenCalled());
    expect(mockUpdateRound).toHaveBeenCalledWith('round-1', { nine_type: 'front9' });
    expect(mockResetRound).toHaveBeenCalledTimes(1);
    expect(mockDeleteHoles).toHaveBeenCalledWith('round-1');
    expect(screen.queryByTestId('hide-scores-confirmation')).toBeNull();
  });

  it('keeps the sheet and caches intact when updating fails (characterization)', async () => {
    mockUpdateRound.mockRejectedValue(new Error('Update refused'));
    const { props, invalidate } = renderSheet();
    fireEvent.press(screen.getByTestId('edit-nine-type-option-front9'));
    await waitFor(() => expect(mockUpdateRound).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('edit-nine-type-option-front9').props.accessibilityState.disabled).toBe(false));
    expect(props.onDismiss).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(mockResetRound).not.toHaveBeenCalled();
    expect(mockDeleteHoles).not.toHaveBeenCalled();
  });

  it('dismisses after a successful edit even if cache deletion fails (characterization)', async () => {
    mockDeleteHoles.mockRejectedValue(new Error('Cache unavailable'));
    const { props } = renderSheet();
    fireEvent.press(screen.getByTestId('edit-nine-type-option-front9'));
    await waitFor(() => expect(props.onDismiss).toHaveBeenCalled());
    expect(mockUpdateRound).toHaveBeenCalledWith('round-1', { nine_type: 'front9' });
    expect(mockResetRound).toHaveBeenCalledTimes(1);
    expect(mockDeleteHoles).toHaveBeenCalledWith('round-1');
  });

  it.each([6, 0, -3, 2.5, NaN])('disables every option with non-null marker %s', (holesPlayed) => {
    const { invalidate } = renderSheet({ holesPlayed });
    expect(screen.getByText(`This round was ended after ${holesPlayed} holes, so its holes can't be changed.`)).toBeTruthy();
    for (const nineType of ['full', 'front9', 'back9']) {
      const option = screen.getByTestId(`edit-nine-type-option-${nineType}`);
      expect(option.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
      fireEvent.press(option);
    }
    expectNoChange(invalidate);
  });

  it('refuses selection even if the disabled option callback is invoked directly', async () => {
    const { invalidate } = renderSheet({ holesPlayed: 6 });
    const option = screen.UNSAFE_getAllByType(TouchableOpacity).find(
      (element) => element.props.testID === 'edit-nine-type-option-front9'
    )!;
    await act(async () => {
      option.props.onPress();
    });
    expectNoChange(invalidate);
  });

  it('blocks a pending hide-scores confirmation after the marker arrives', async () => {
    mockScorecards = [{ scores: { '10': { strokes: 5 } } }];
    const { props, rerender, invalidate } = renderSheet({ holesPlayed: null });
    fireEvent.press(screen.getByTestId('edit-nine-type-option-front9'));
    expect(screen.getByTestId('hide-scores-confirmation')).toBeTruthy();
    rerender(<EditNineTypeSheet {...props} holesPlayed={6} />);
    await act(async () => {
      fireEvent.press(screen.getByText('Switch to Front 9'));
    });
    expectNoChange(invalidate);
  });

  it('blocks a captured stale confirmation callback using the current ended state', async () => {
    mockScorecards = [{ scores: { '10': { strokes: 5 } } }];
    const { props, rerender, invalidate } = renderSheet({ holesPlayed: null });
    fireEvent.press(screen.getByTestId('edit-nine-type-option-front9'));
    const staleConfirm: () => void = mockConfirmation.mock.calls.at(-1)![0].onConfirm;
    rerender(<EditNineTypeSheet {...props} holesPlayed={6} />);
    await act(async () => { staleConfirm(); });
    expectNoChange(invalidate);
  });
});
