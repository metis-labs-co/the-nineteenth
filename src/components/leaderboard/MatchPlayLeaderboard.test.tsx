/**
 * MatchPlayLeaderboard — in-progress status text is judged against the
 * round's planned hole count (`totalHoles`), not a hard-coded 18.
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { MatchPlayLeaderboard } from './MatchPlayLeaderboard';
import type {
  RoundLeaderboardEntry,
  PlayerLeaderboardEntry,
  FormatSpecificScoreData,
} from '@/utils/roundLeaderboardFormatters';

// The '@/hooks/useRoundLeaderboard' barrel pulls in Supabase; the component
// (and leaderboardUtils) only need the two type guards.
jest.mock('@/hooks/useRoundLeaderboard', () => ({
  isTeamEntry: (entry: RoundLeaderboardEntry) => entry.isTeamResult,
  isMatchPlayScore: (data: FormatSpecificScoreData) => data.type === 'match-play',
}));

jest.mock('@tabler/icons-react-native', () => {
  const { Text } = require('react-native');
  return {
    IconTrophy: () => <Text>TrophyIcon</Text>,
    IconSwords: () => <Text>SwordsIcon</Text>,
    IconClock: () => <Text>ClockIcon</Text>,
    IconCheck: () => <Text>CheckIcon</Text>,
  };
});

jest.mock('@/components/common/ScaledText', () => {
  const { Text } = require('react-native');
  return {
    ScaledText: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>{children}</Text>
    ),
  };
});

/** Sam 2 up after 5 holes (won 2, halved 3), no result yet. */
const inProgress: PlayerLeaderboardEntry = {
  isTeamResult: false,
  position: 0,
  competitionPoints: 0,
  bypassed: false,
  playerId: 'p1',
  playerName: 'Sam',
  handicap: 0,
  scoreData: {
    type: 'match-play',
    matchResult: undefined,
    holesUpDown: '2 UP',
    opponentId: 'p2',
    opponentName: 'Dave',
    holesWon: 2,
    holesLost: 0,
    holesHalved: 3,
  },
};

describe('MatchPlayLeaderboard — planned hole count', () => {
  it('counts holes to play against the totalHoles prop (9-hole match)', () => {
    render(<MatchPlayLeaderboard entries={[inProgress]} totalHoles={9} />);
    expect(screen.getByText('2 UP with 4 to play')).toBeTruthy();
  });

  it('defaults to 18 holes when totalHoles is omitted (characterization)', () => {
    render(<MatchPlayLeaderboard entries={[inProgress]} />);
    expect(screen.getByText('2 UP with 13 to play')).toBeTruthy();
  });
});
