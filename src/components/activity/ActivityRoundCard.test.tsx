import { render, screen, fireEvent } from '@testing-library/react-native';
import { ActivityRoundCard } from './ActivityRoundCard';
import type { ActivityFeedCard, FeedParticipant } from '@/hooks/activity';

const mockNavigate = jest.fn();

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => new Proxy({}, { get: () => '#008000' }),
  useIsDark: () => false,
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'viewer-1' } }),
}));
jest.mock('@/hooks/activity', () => ({
  useLikeRound: () => ({ mutate: jest.fn() }),
  useUnlikeRound: () => ({ mutate: jest.fn() }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('./RoundPhotoBanner', () => ({ RoundPhotoBanner: () => null }));
jest.mock('@/components/common', () => {
  const { Text } = require('react-native');
  return {
    PlayerAvatar: ({ name }: { name?: string }) => <Text>{`avatar:${name}`}</Text>,
    SystemModalTheme: ({ children }: { children: React.ReactNode }) => children,
  };
});

function participant(id: string, name: string, points = 30): FeedParticipant {
  return {
    player_id: id,
    name,
    photo_url: null,
    total_gross: null,
    total_net: null,
    total_points: points,
  };
}

function makeCard(overrides: Partial<ActivityFeedCard> = {}): ActivityFeedCard {
  return {
    round_id: 'r1',
    competition_id: null,
    course_id: 'course-1',
    club_id: 'club-1',
    course_name: 'Hepburn Springs',
    club_name: 'Hepburn Springs Golf Club',
    club_location: 'Hepburn Springs · VIC',
    round_date: '2026-06-08',
    game_type: 'stableford',
    is_team_round: false,
    activity_at: '2026-06-10T01:00:00Z',
    participants: [participant('viewer-1', 'Sam Kay', 34)],
    photos: [],
    like_count: 0,
    comment_count: 0,
    viewer_has_liked: false,
    ...overrides,
  };
}

describe('ActivityRoundCard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('headlines the viewer with YOU pill, score, and subtitle', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    expect(screen.getByText('Sam Kay')).toBeTruthy();
    expect(screen.getByText('YOU')).toBeTruthy();
    expect(screen.getByText('34 pts')).toBeTruthy();
    expect(screen.getByText(/played a round/)).toBeTruthy();
  });

  it('promotes the viewer to headline when they are not the first participant', () => {
    const card = makeCard({
      participants: [participant('p2', 'Alex Smith', 28), participant('viewer-1', 'Sam Kay', 34)],
    });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    expect(screen.getByText('YOU')).toBeTruthy();
    expect(screen.getByText('34 pts')).toBeTruthy();
  });

  it('headlines the first participant without YOU pill when viewer is not in the round', () => {
    const card = makeCard({ participants: [participant('p2', 'Alex Smith', 28)] });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    expect(screen.getByText('Alex Smith')).toBeTruthy();
    expect(screen.queryByText('YOU')).toBeNull();
    expect(screen.getByText('28 pts')).toBeTruthy();
  });

  it('labels the parenthesised value as net for stroke-play rounds', () => {
    const card = makeCard({
      game_type: 'stroke',
      participants: [
        { ...participant('viewer-1', 'Sam Kay'), total_points: null, total_gross: 52, total_net: 48 },
      ],
    });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    expect(screen.getByText('52 (48 net)')).toBeTruthy();
  });

  it('shows gross only when there is no net score', () => {
    const card = makeCard({
      game_type: 'stroke',
      participants: [
        { ...participant('viewer-1', 'Sam Kay'), total_points: null, total_gross: 52, total_net: null },
      ],
    });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    expect(screen.getByText('52')).toBeTruthy();
  });

  it('hides the header score when the headline participant has no score', () => {
    const card = makeCard({
      participants: [{ ...participant('viewer-1', 'Sam Kay'), total_points: null }],
    });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    expect(screen.queryByText(/pts/)).toBeNull();
  });

  it('shows the course row with club name', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    expect(screen.getByText('Hepburn Springs Golf Club')).toBeTruthy();
  });

  it('stacks remaining participants in the footer, capped at 4 with a +N chip', () => {
    const card = makeCard({
      participants: [
        participant('viewer-1', 'Sam Kay', 34),
        participant('p2', 'A'),
        participant('p3', 'B'),
        participant('p4', 'C'),
        participant('p5', 'D'),
        participant('p6', 'E'),
      ],
    });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    expect(screen.getByTestId('footer-avatar-stack')).toBeTruthy();
    // 1 header avatar + 4 stacked footer avatars (5th other is overflow)
    expect(screen.getAllByText(/^avatar:/)).toHaveLength(5);
    expect(screen.getByText('+1')).toBeTruthy();
    expect(screen.getByText('avatar:D')).toBeTruthy();
    expect(screen.queryByText('avatar:E')).toBeNull();
  });

  it('renders no footer avatar stack for a solo round', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    expect(screen.queryByTestId('footer-avatar-stack')).toBeNull();
  });

  it('opens the headline player scorecard when the score is tapped', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    fireEvent.press(screen.getByLabelText("View Sam Kay's scorecard"));
    expect(mockNavigate).toHaveBeenCalledWith('PlayerScorecard', {
      playerId: 'viewer-1',
      roundId: 'r1',
    });
  });

  it('opens the course detail screen when the course row is tapped', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('View Hepburn Springs Golf Club details'));
    expect(mockNavigate).toHaveBeenCalledWith('Course', {
      courseId: 'course-1',
      clubId: 'club-1',
    });
  });

  it('opens the headline player profile when their name is tapped', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    fireEvent.press(screen.getByLabelText("View Sam Kay's profile"));
    expect(mockNavigate).toHaveBeenCalledWith('PlayerDetail', { id: 'viewer-1' });
  });

  it('does not navigate from the course row when course_id is missing', () => {
    const card = makeCard({ course_id: null, club_id: null });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    // No accessible course button is exposed when the id is absent.
    expect(screen.queryByLabelText(/details$/)).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

const groupParticipants: ActivityFeedCard['participants'] = [
  { player_id: 'viewer-1', name: 'Me', photo_url: null, total_gross: 80, total_net: 70, total_points: null },
  { player_id: 'p2', name: 'Sam', photo_url: null, total_gross: 90, total_net: 78, total_points: null },
];

describe('ActivityRoundCard players sheet', () => {
  it('opens the players sheet when the footer avatar stack is pressed', () => {
    render(<ActivityRoundCard card={makeCard({ participants: groupParticipants, game_type: 'stroke' })} onOpen={jest.fn()} />);
    expect(screen.queryByText('Players')).toBeNull();
    fireEvent.press(screen.getByLabelText('View players in this round'));
    expect(screen.getByText('Players')).toBeTruthy();
    // Sheet lists everyone, including the headline player.
    // Note: "View Me's profile" exists both on the headline row and the sheet row.
    expect(screen.getAllByLabelText("View Me's profile").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText("View Sam's profile")).toBeTruthy();
  });

  it('does not render a pressable stack for a solo round', () => {
    const solo: ActivityFeedCard['participants'] = [
      { player_id: 'viewer-1', name: 'Me', photo_url: null, total_gross: 80, total_net: 70, total_points: null },
    ];
    render(<ActivityRoundCard card={makeCard({ participants: solo })} onOpen={jest.fn()} />);
    expect(screen.queryByLabelText('View players in this round')).toBeNull();
  });
});
