import { renderHook, act } from '@testing-library/react-native';
import { useScorecardSubmission } from './useScorecardSubmission';
import { syncRoundNow } from '@/services/rounds/syncRoundNow';
import { sendRoundEvent } from '@/services/rounds/roundRosterChannel';

const mockShowDialog = jest.fn();
const mockMutateAsync = jest.fn();

jest.mock('@/hooks/useConfirmationDialog', () => ({
  useConfirmationDialog: () => ({
    dialogConfig: {},
    showDialog: mockShowDialog,
    showAlert: jest.fn(),
    dismissDialog: jest.fn(),
  }),
}));
jest.mock('@/hooks/rounds/mutations', () => ({ useDeleteRound: () => ({ mutateAsync: mockMutateAsync }) }));
jest.mock('@/services/activeRoundSession', () => ({ activeRoundSession: { clear: jest.fn() } }));
jest.mock('@/services/rounds/syncRoundNow', () => ({ syncRoundNow: jest.fn() }));
jest.mock('@/services/rounds/roundRosterChannel', () => ({ sendRoundEvent: jest.fn() }));
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: { getState: () => ({ groupScorecards: new Map(), allowedPlayerIds: null }) },
}));

const goBack = jest.fn();
const lastDialog = () => mockShowDialog.mock.calls[mockShowDialog.mock.calls.length - 1][0];

function setup() {
  return renderHook(() =>
    useScorecardSubmission({
      navigation: { goBack } as never,
      roundId: 'r',
      competitionId: 'c',
      holes: [],
      playerCount: 1,
      getCompletedHolesCount: () => 0,
      submitScorecards: jest.fn(),
      resetRound: jest.fn(),
      onIncompleteRound: jest.fn(),
      onSubmitError: jest.fn(),
      onCloseIncompleteDialog: jest.fn(),
    })
  );
}

beforeEach(() => jest.clearAllMocks());

it('uses the undo-friendly confirmation copy', () => {
  const { result } = setup();
  result.current.handleDeleteRound();
  expect(mockShowDialog).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'Delete this round? You can undo for a few seconds afterwards.' })
  );
});

it('syncs, deletes, broadcasts and leaves', async () => {
  (syncRoundNow as jest.Mock).mockResolvedValue(true);
  const { result } = setup();
  result.current.handleDeleteRound();
  await act(async () => lastDialog().onConfirm());
  expect(syncRoundNow).toHaveBeenCalled();
  expect(mockMutateAsync).toHaveBeenCalledWith({ roundId: 'r' });
  expect(sendRoundEvent).toHaveBeenCalledWith('r', 'round_deleted');
  expect(goBack).toHaveBeenCalled();
});

it('asks before deleting when the sync times out, and cancelling keeps the round', async () => {
  (syncRoundNow as jest.Mock).mockResolvedValue(false);
  const { result } = setup();
  result.current.handleDeleteRound();
  await act(async () => lastDialog().onConfirm());
  expect(lastDialog()).toMatchObject({ message: "Some scores haven't uploaded. Delete anyway?" });
  act(() => lastDialog().onCancel?.());
  expect(mockMutateAsync).not.toHaveBeenCalled();
});
