import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { RoundPlayersSheet } from './RoundPlayersSheet';
import { addPlayerToRound, removePlayerFromRound, RoundRosterError } from '@/services/rounds/roundRoster';

jest.mock('@/services/rounds/roundRoster', () => {
  class RoundRosterError extends Error {
    hint: string | null;
    constructor(m: string, hint: string | null = null) {
      super(m);
      this.hint = hint;
    }
  }
  return { addPlayerToRound: jest.fn(), removePlayerFromRound: jest.fn(), RoundRosterError };
});
jest.mock('./useAddablePlayers', () => ({
  useAddablePlayers: () => ({
    friends: [],
    friendsLoading: false,
    placeholders: [],
    searchQuery: '',
    setSearchQuery: jest.fn(),
  }),
}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockPicker: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockGuestModal: any;
jest.mock('@/screens/rounds/CreateRoundBottomSheet/steps/FriendSelectorBottomSheet', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FriendSelectorBottomSheet: (p: any) => {
    mockPicker = p;
    return null;
  },
}));
jest.mock('@/components/common/AddPlaceholderModal', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AddPlaceholderModal: (p: any) => {
    mockGuestModal = p;
    return null;
  },
}));
const mockShowToast = jest.fn();
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const players = [
  { id: 'owner', name: 'Owner' },
  { id: 'b', name: 'Ben' },
] as never[];
const props = {
  visible: true,
  onClose: jest.fn(),
  roundId: 'r',
  ownerId: 'owner',
  gameType: 'stableford' as const,
  players,
  playerTeeNames: new Map([
    ['owner', 'White'],
    ['b', 'Red'],
  ]),
  onRosterChanged: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('lists players with tees and no remove for the owner', () => {
  render(<RoundPlayersSheet {...props} />);
  expect(screen.getByText('Ben')).toBeTruthy();
  expect(screen.getByText('Red')).toBeTruthy();
  expect(screen.queryByLabelText('Remove Owner')).toBeNull();
  expect(screen.getByLabelText('Remove Ben')).toBeTruthy();
});

it('confirms then removes', async () => {
  (removePlayerFromRound as jest.Mock).mockResolvedValue(undefined);
  render(<RoundPlayersSheet {...props} />);
  fireEvent.press(screen.getByLabelText('Remove Ben'));
  expect(screen.getByText('Remove Ben? Their scores for this round will be deleted.')).toBeTruthy();
  fireEvent.press(screen.getByText('Remove'));
  await waitFor(() => expect(removePlayerFromRound).toHaveBeenCalledWith('r', 'b'));
  expect(props.onRosterChanged).toHaveBeenCalled();
});

it('shows the server error and keeps the player when removal fails', async () => {
  (removePlayerFromRound as jest.Mock).mockRejectedValue(
    new RoundRosterError('Scores have been submitted', 'round_has_submitted_scorecards'),
  );
  render(<RoundPlayersSheet {...props} />);
  fireEvent.press(screen.getByLabelText('Remove Ben'));
  fireEvent.press(screen.getByText('Remove'));
  await waitFor(() =>
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error', message: 'Scores have been submitted' }),
    ),
  );
  expect(props.onRosterChanged).not.toHaveBeenCalled();
});

it('hides Add player when the round is full', () => {
  const four = ['owner', 'b', 'c', 'd'].map((id) => ({ id, name: id })) as never[];
  render(<RoundPlayersSheet {...props} players={four} />);
  expect(screen.queryByText('Add player')).toBeNull();
});

describe('add flow', () => {
  const alice = { id: 'a', name: 'Alice' };
  const cara = { id: 'c', name: 'Cara' };

  beforeEach(() => {
    (addPlayerToRound as jest.Mock).mockResolvedValue({});
  });

  it('adds each selected player when the picker closes, notifying once', async () => {
    render(<RoundPlayersSheet {...props} />);
    act(() => mockPicker.onSelectionChange([alice, cara]));
    await act(async () => mockPicker.onClose());
    expect(addPlayerToRound).toHaveBeenCalledTimes(2);
    expect(addPlayerToRound).toHaveBeenCalledWith('r', 'a');
    expect(addPlayerToRound).toHaveBeenCalledWith('r', 'c');
    expect(props.onRosterChanged).toHaveBeenCalledTimes(1);
  });

  it('makes no add call when closed with an empty selection', async () => {
    render(<RoundPlayersSheet {...props} />);
    await act(async () => mockPicker.onClose());
    expect(addPlayerToRound).not.toHaveBeenCalled();
    expect(props.onRosterChanged).not.toHaveBeenCalled();
  });

  it('toasts the failed player and still reports the successful add', async () => {
    (addPlayerToRound as jest.Mock)
      .mockRejectedValueOnce(new RoundRosterError('Round is full'))
      .mockResolvedValueOnce({});
    render(<RoundPlayersSheet {...props} />);
    act(() => mockPicker.onSelectionChange([alice, cara]));
    await act(async () => mockPicker.onClose());
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error', title: "Couldn't add Alice", message: 'Round is full' }),
    );
    expect(props.onRosterChanged).toHaveBeenCalledTimes(1);
  });

  it('adds a newly created guest exactly once', async () => {
    render(<RoundPlayersSheet {...props} />);
    act(() => mockPicker.onAddPlaceholderPress());
    act(() => mockGuestModal.onPlayerCreated({ id: 'g', name: 'Guest', handicap: 20 }));
    await act(async () => mockPicker.onClose());
    expect(addPlayerToRound).toHaveBeenCalledTimes(1);
    expect(addPlayerToRound).toHaveBeenCalledWith('r', 'g');
  });

  it('ignores a second close while the first commit is in flight', async () => {
    render(<RoundPlayersSheet {...props} />);
    act(() => mockPicker.onSelectionChange([alice, cara]));
    const closePicker = mockPicker.onClose;
    await act(async () => {
      closePicker();
      closePicker();
    });
    expect(addPlayerToRound).toHaveBeenCalledTimes(2);
    expect(props.onRosterChanged).toHaveBeenCalledTimes(1);
  });
});
