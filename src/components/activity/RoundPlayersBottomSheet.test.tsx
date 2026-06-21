import { render, screen, fireEvent } from '@testing-library/react-native';
import { RoundPlayersBottomSheet } from './RoundPlayersBottomSheet';
import type { FeedParticipant } from '@/hooks/activity';

jest.mock('@/components/common', () => {
  const { Text } = require('react-native');
  return {
    SystemModalTheme: ({ children }: { children: React.ReactNode }) => children,
    PlayerAvatar: ({ name }: { name: string }) => <Text>{`avatar:${name}`}</Text>,
  };
});

const participants: FeedParticipant[] = [
  { player_id: 'p1', name: 'Alex', photo_url: null, total_gross: 85, total_net: 72, total_points: null },
  { player_id: 'p2', name: 'Sam', photo_url: null, total_gross: null, total_net: null, total_points: null },
];

function setup(overrides: Partial<React.ComponentProps<typeof RoundPlayersBottomSheet>> = {}) {
  const onClose = jest.fn();
  const onSelectPlayer = jest.fn();
  render(
    <RoundPlayersBottomSheet
      visible
      onClose={onClose}
      participants={participants}
      gameType="stroke"
      onSelectPlayer={onSelectPlayer}
      {...overrides}
    />,
  );
  return { onClose, onSelectPlayer };
}

describe('RoundPlayersBottomSheet', () => {
  it('renders a row for each participant', () => {
    setup();
    expect(screen.getByText('Alex')).toBeTruthy();
    expect(screen.getByText('Sam')).toBeTruthy();
  });

  it('shows the formatted score for a participant who has one', () => {
    setup();
    expect(screen.getByText('85 (72 net)')).toBeTruthy();
  });

  it('shows a dash for a participant with no score', () => {
    setup();
    expect(screen.getByText('–')).toBeTruthy();
  });

  it('calls onClose then onSelectPlayer with the player id when a row is pressed', () => {
    const { onClose, onSelectPlayer } = setup();
    fireEvent.press(screen.getByLabelText("View Alex's profile"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelectPlayer).toHaveBeenCalledWith('p1');
  });

  it('renders nothing visible when visible is false', () => {
    setup({ visible: false });
    expect(screen.queryByText('Alex')).toBeNull();
  });
});
