/**
 * TeamMatchPlayScoreView Component Stories
 *
 * Storybook stories for visualizing the team match play scoring view
 * in various states and configurations.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { TeamMatchPlayScoreView } from './TeamMatchPlayScoreView';
import type { TeamWithMembers, Hole, HoleScore } from '@/types/database.types';

// ===========================================================================
// HELPERS
// ===========================================================================

function createTestTeam(
  id: string,
  name: string,
  playerNames: string[]
): TeamWithMembers {
  return {
    id,
    competition_id: 'comp-1',
    name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    members: playerNames.map((playerName, i) => ({
      team_id: id,
      player_id: `${id}-player-${i + 1}`,
      joined_at: new Date().toISOString(),
      player: {
        id: `${id}-player-${i + 1}`,
        name: playerName,
        email: `${playerName.toLowerCase()}@example.com`,
        phone: null,
        handicap: 15 + i * 5,
        golf_id: null,
        handicap_updated_at: null,
        photo_url: null,
        home_venue_id: null,
        push_enabled: true,
        push_competition_updates: true,
        push_friend_requests: true,
        push_scorecard_updates: true,
        equipped_badge_id: null,
        equipped_frame_id: null,
        equipped_title_id: null,
        is_placeholder: false,
        created_by: null,
        linked_player_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })),
  };
}

const defaultTeam1 = createTestTeam('team-1', 'Team Eagles', ['John Smith', 'Jane Doe']);
const defaultTeam2 = createTestTeam('team-2', 'Team Birdies', ['Bob Wilson', 'Alice Brown']);

const par4Hole: Hole = {
  number: 1,
  par: 4,
  strokeIndex: 7,
  yardages: { blue: 420, white: 400, red: 380 },
};

const par3Hole: Hole = {
  number: 2,
  par: 3,
  strokeIndex: 15,
  yardages: { blue: 185, white: 165, red: 145 },
};

const par5Hole: Hole = {
  number: 3,
  par: 5,
  strokeIndex: 1,
  yardages: { blue: 545, white: 520, red: 480 },
};

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof TeamMatchPlayScoreView> = {
  title: 'Scorecard/TeamMatchPlayScoreView',
  component: TeamMatchPlayScoreView,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TeamMatchPlayScoreView>;

// ===========================================================================
// BASIC STATES
// ===========================================================================

export const Default: Story = {
  args: {
    team1: defaultTeam1,
    team2: defaultTeam2,
    currentHole: par4Hole,
    team1Score: undefined,
    team2Score: undefined,
    onTeam1ScoreSelect: () => {},
    onTeam2ScoreSelect: () => {},
    holeResults: new Map(),
    disabled: false,
  },
};

export const NoScoresEntered: Story = {
  args: {
    ...Default.args,
    holeResults: new Map(),
  },
};

export const Team1ScoreOnly: Story = {
  args: {
    ...Default.args,
    team1Score: { strokes: 4 },
  },
};

export const Team2ScoreOnly: Story = {
  args: {
    ...Default.args,
    team2Score: { strokes: 5 },
  },
};

export const BothScoresEntered: Story = {
  args: {
    ...Default.args,
    team1Score: { strokes: 4 },
    team2Score: { strokes: 5 },
  },
};

// ===========================================================================
// HOLE RESULT STATES
// ===========================================================================

export const Team1WinsHole: Story = {
  args: {
    ...Default.args,
    team1Score: { strokes: 3 },
    team2Score: { strokes: 5 },
  },
};

export const Team2WinsHole: Story = {
  args: {
    ...Default.args,
    team1Score: { strokes: 6 },
    team2Score: { strokes: 4 },
  },
};

export const HoleHalved: Story = {
  args: {
    ...Default.args,
    team1Score: { strokes: 4 },
    team2Score: { strokes: 4 },
  },
};

// ===========================================================================
// PICKUP STATES
// ===========================================================================

export const Team1PickedUp: Story = {
  args: {
    ...Default.args,
    team1Score: { strokes: 10 }, // PICKUP_SCORE
    team2Score: { strokes: 4 },
  },
};

export const Team2PickedUp: Story = {
  args: {
    ...Default.args,
    team1Score: { strokes: 5 },
    team2Score: { strokes: 10 }, // PICKUP_SCORE
  },
};

export const BothTeamsPickedUp: Story = {
  args: {
    ...Default.args,
    team1Score: { strokes: 10 },
    team2Score: { strokes: 10 },
  },
};

// ===========================================================================
// MATCH STATUS STATES
// ===========================================================================

export const AllSquare: Story = {
  args: {
    ...Default.args,
    holeResults: new Map([
      [1, 'team1'],
      [2, 'team2'],
    ] as [number, 'team1' | 'team2' | 'halved'][]),
  },
};

export const Team1OneUp: Story = {
  args: {
    ...Default.args,
    holeResults: new Map([
      [1, 'team1'],
    ] as [number, 'team1' | 'team2' | 'halved'][]),
  },
};

export const Team1TwoUp: Story = {
  args: {
    ...Default.args,
    holeResults: new Map([
      [1, 'team1'],
      [2, 'team1'],
    ] as [number, 'team1' | 'team2' | 'halved'][]),
  },
};

export const Team1ThreeUp: Story = {
  args: {
    ...Default.args,
    holeResults: new Map([
      [1, 'team1'],
      [2, 'team1'],
      [3, 'team1'],
    ] as [number, 'team1' | 'team2' | 'halved'][]),
  },
};

export const Team2OneUp: Story = {
  args: {
    ...Default.args,
    holeResults: new Map([
      [1, 'team2'],
    ] as [number, 'team1' | 'team2' | 'halved'][]),
  },
};

export const Team2TwoUp: Story = {
  args: {
    ...Default.args,
    holeResults: new Map([
      [1, 'team2'],
      [2, 'team2'],
    ] as [number, 'team1' | 'team2' | 'halved'][]),
  },
};

export const Team2ThreeUp: Story = {
  args: {
    ...Default.args,
    holeResults: new Map([
      [1, 'team2'],
      [2, 'team2'],
      [3, 'team2'],
    ] as [number, 'team1' | 'team2' | 'halved'][]),
  },
};

// ===========================================================================
// MATCH STATUS - ADVANCED
// ===========================================================================

function createHoleResultsMap(results: { hole: number; result: 'team1' | 'team2' | 'halved' }[]) {
  return new Map(results.map(r => [r.hole, r.result]));
}

export const Dormie: Story = {
  args: {
    ...Default.args,
    holeResults: createHoleResultsMap([
      // 16 holes played, team1 won 9, team2 won 7 = 2 UP with 2 remaining (Dormie)
      ...Array.from({ length: 9 }, (_, i) => ({ hole: i + 1, result: 'team1' as const })),
      ...Array.from({ length: 7 }, (_, i) => ({ hole: i + 10, result: 'team2' as const })),
    ]),
  },
};

export const MatchWon: Story = {
  args: {
    ...Default.args,
    holeResults: createHoleResultsMap([
      // After 15 holes: team1 wins 12, team2 wins 3 = 9&3 win
      ...Array.from({ length: 12 }, (_, i) => ({ hole: i + 1, result: 'team1' as const })),
      ...Array.from({ length: 3 }, (_, i) => ({ hole: i + 13, result: 'team2' as const })),
    ]),
  },
};

export const ManyHolesHalved: Story = {
  args: {
    ...Default.args,
    holeResults: createHoleResultsMap([
      { hole: 1, result: 'halved' },
      { hole: 2, result: 'halved' },
      { hole: 3, result: 'halved' },
      { hole: 4, result: 'team1' },
      { hole: 5, result: 'halved' },
      { hole: 6, result: 'halved' },
    ]),
  },
};

export const CloseMatch: Story = {
  args: {
    ...Default.args,
    holeResults: createHoleResultsMap([
      { hole: 1, result: 'team1' },
      { hole: 2, result: 'team2' },
      { hole: 3, result: 'halved' },
      { hole: 4, result: 'team1' },
      { hole: 5, result: 'team2' },
      { hole: 6, result: 'halved' },
      { hole: 7, result: 'team1' },
      { hole: 8, result: 'team2' },
      { hole: 9, result: 'halved' },
    ]),
  },
};

// ===========================================================================
// DIFFERENT HOLE PARS
// ===========================================================================

export const Par3Hole: Story = {
  args: {
    ...Default.args,
    currentHole: par3Hole,
  },
};

export const Par5Hole: Story = {
  args: {
    ...Default.args,
    currentHole: par5Hole,
  },
};

export const Par3WithScores: Story = {
  args: {
    ...Default.args,
    currentHole: par3Hole,
    team1Score: { strokes: 2 },
    team2Score: { strokes: 3 },
  },
};

export const Par5WithScores: Story = {
  args: {
    ...Default.args,
    currentHole: par5Hole,
    team1Score: { strokes: 5 },
    team2Score: { strokes: 6 },
  },
};

// ===========================================================================
// DISABLED STATE
// ===========================================================================

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};

export const DisabledWithScores: Story = {
  args: {
    ...Default.args,
    team1Score: { strokes: 4 },
    team2Score: { strokes: 5 },
    disabled: true,
  },
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongTeamNames: Story = {
  args: {
    ...Default.args,
    team1: createTestTeam('team-1', 'The Magnificent Eagles of Victory', ['John', 'Jane']),
    team2: createTestTeam('team-2', 'Championship Birdies United', ['Bob', 'Alice']),
  },
};

export const ShortTeamNames: Story = {
  args: {
    ...Default.args,
    team1: createTestTeam('team-1', 'A', ['John']),
    team2: createTestTeam('team-2', 'B', ['Jane']),
  },
};

export const SinglePlayerTeams: Story = {
  args: {
    ...Default.args,
    team1: createTestTeam('team-1', 'Solo Eagles', ['John Smith']),
    team2: createTestTeam('team-2', 'Solo Birdies', ['Jane Doe']),
  },
};

export const FourPlayerTeams: Story = {
  args: {
    ...Default.args,
    team1: createTestTeam('team-1', 'Team Eagles', ['John', 'Jane', 'Bob', 'Alice']),
    team2: createTestTeam('team-2', 'Team Birdies', ['Tom', 'Mary', 'Sam', 'Lisa']),
  },
};

export const ExtremeScores: Story = {
  args: {
    ...Default.args,
    team1Score: { strokes: 1 }, // MIN_SCORE
    team2Score: { strokes: 12 }, // MAX_SCORE
  },
};

export const AllEighteenHolesPlayed: Story = {
  args: {
    ...Default.args,
    holeResults: createHoleResultsMap([
      ...Array.from({ length: 10 }, (_, i) => ({ hole: i + 1, result: 'team1' as const })),
      ...Array.from({ length: 5 }, (_, i) => ({ hole: i + 11, result: 'team2' as const })),
      ...Array.from({ length: 3 }, (_, i) => ({ hole: i + 16, result: 'halved' as const })),
    ]),
  },
};

// ===========================================================================
// INTERACTIVE STORY
// ===========================================================================

const InteractiveStory = () => {
  const [team1Score, setTeam1Score] = useState<HoleScore | undefined>(undefined);
  const [team2Score, setTeam2Score] = useState<HoleScore | undefined>(undefined);
  const [holeResults, _setHoleResults] = useState<Map<number, 'team1' | 'team2' | 'halved'>>(
    new Map()
  );

  const handleTeam1Score = (strokes: number) => {
    setTeam1Score({ strokes });
  };

  const handleTeam2Score = (strokes: number) => {
    setTeam2Score({ strokes });
  };

  return (
    <TeamMatchPlayScoreView
      team1={defaultTeam1}
      team2={defaultTeam2}
      currentHole={par4Hole}
      team1Score={team1Score}
      team2Score={team2Score}
      onTeam1ScoreSelect={handleTeam1Score}
      onTeam2ScoreSelect={handleTeam2Score}
      holeResults={holeResults}
      disabled={false}
    />
  );
};

export const Interactive: Story = {
  render: () => <InteractiveStory />,
};

// ===========================================================================
// MATCH PROGRESSION STORY
// ===========================================================================

const MatchProgressionStory = () => {
  const [currentHoleIndex, _setCurrentHoleIndex] = useState(0);
  const [team1Score, setTeam1Score] = useState<HoleScore | undefined>(undefined);
  const [team2Score, setTeam2Score] = useState<HoleScore | undefined>(undefined);
  const [holeResults, _setHoleResults] = useState<Map<number, 'team1' | 'team2' | 'halved'>>(
    new Map()
  );

  const holes: Hole[] = [
    { number: 1, par: 4, strokeIndex: 7, yardages: { blue: 420, white: 400, red: 380 } },
    { number: 2, par: 3, strokeIndex: 15, yardages: { blue: 185, white: 165, red: 145 } },
    { number: 3, par: 5, strokeIndex: 1, yardages: { blue: 545, white: 520, red: 480 } },
    { number: 4, par: 4, strokeIndex: 11, yardages: { blue: 410, white: 390, red: 370 } },
    { number: 5, par: 4, strokeIndex: 5, yardages: { blue: 435, white: 415, red: 395 } },
  ];

  const currentHole = holes[currentHoleIndex];

  return (
    <View style={styles.progressionContainer}>
      <TeamMatchPlayScoreView
        team1={defaultTeam1}
        team2={defaultTeam2}
        currentHole={currentHole}
        team1Score={team1Score}
        team2Score={team2Score}
        onTeam1ScoreSelect={(strokes) => setTeam1Score({ strokes })}
        onTeam2ScoreSelect={(strokes) => setTeam2Score({ strokes })}
        holeResults={holeResults}
        disabled={false}
      />
    </View>
  );
};

export const MatchProgression: Story = {
  render: () => <MatchProgressionStory />,
};

// ===========================================================================
// DARK MODE (handled by Storybook decorator)
// ===========================================================================

export const DarkMode: Story = {
  args: {
    ...Default.args,
    team1Score: { strokes: 4 },
    team2Score: { strokes: 5 },
    holeResults: createHoleResultsMap([
      { hole: 1, result: 'team1' },
      { hole: 2, result: 'halved' },
      { hole: 3, result: 'team2' },
    ]),
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

// ===========================================================================
// STYLES
// ===========================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  progressionContainer: {
    flex: 1,
  },
});
