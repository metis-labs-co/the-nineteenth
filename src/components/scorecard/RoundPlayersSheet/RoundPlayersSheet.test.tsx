import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RoundPlayersSheet } from './RoundPlayersSheet';
import { removePlayerFromRound, RoundRosterError } from '@/services/rounds/roundRoster';

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
jest.mock('@/components/common/AddPlaceholderModal', () => ({ AddPlaceholderModal: () => null }));
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
