import { render, screen } from '@testing-library/react-native';
import { ActivityRoundCard } from './ActivityRoundCard';
import type { ActivityFeedCard, FeedParticipant } from '@/hooks/activity';

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
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('./RoundPhotoBanner', () => ({ RoundPhotoBanner: () => null }));
jest.mock('@/components/common', () => {
  const { Text } = require('react-native');
  return {
    PlayerAvatar: ({ name }: { name?: string }) => <Text>{`avatar:${name}`}</Text>,
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
  it('headlines the viewer with YOU pill, score, and subtitle', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    expect(screen.getByText('Sam Kay')).toBeTruthy();
    expect(screen.getByText('YOU')).toBeTruthy();
    expect(screen.getByText('34 pts')).toBeTruthy();
    expect(screen.getByText(/played a round/)).toBeTruthy();
  });

  it('headlines the first participant without YOU pill when viewer is not in the round', () => {
    const card = makeCard({ participants: [participant('p2', 'Alex Smith', 28)] });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    expect(screen.getByText('Alex Smith')).toBeTruthy();
    expect(screen.queryByText('YOU')).toBeNull();
    expect(screen.getByText('28 pts')).toBeTruthy();
  });

  it('hides the header score when the headline participant has no score', () => {
    const card = makeCard({
      participants: [{ ...participant('viewer-1', 'Sam Kay'), total_points: null }],
    });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    expect(screen.queryByText('–')).toBeNull();
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
  });

  it('renders no footer avatar stack for a solo round', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    expect(screen.queryByTestId('footer-avatar-stack')).toBeNull();
  });
});
