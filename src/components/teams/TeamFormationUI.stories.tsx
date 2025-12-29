/**
 * TeamFormationUI Storybook Stories
 *
 * Stories demonstrating the various configurations of the TeamFormationUI component.
 * Shows different player counts, team sizes, balance states, and existing team scenarios.
 */

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { TeamFormationUI } from './TeamFormationUI';
import type { Player, TeamWithMembers } from '@/types/database.types';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof TeamFormationUI> = {
  title: 'Teams/TeamFormationUI',
  component: TeamFormationUI,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof TeamFormationUI>;

// ===========================================================================
// FIXTURES
// ===========================================================================

function createPlayer(id: string, name: string, handicap: number = 15): Player {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(/\s/g, '.')}@test.com`,
    phone: null,
    handicap,
    golf_id: null,
    handicap_updated_at: null,
    photo_url: null,
    home_venue_id: null,
    push_enabled: true,
    push_competition_updates: true,
    push_friend_requests: true,
    push_scorecard_updates: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };
}

function createTeamWithMembers(
  id: string,
  name: string,
  players: Player[]
): TeamWithMembers {
  return {
    id,
    name,
    competition_id: 'comp-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    members: players.map((player) => ({
      team_id: id,
      player_id: player.id,
      joined_at: '2025-01-01T00:00:00Z',
      player,
    })),
  };
}

const fourPlayers = [
  createPlayer('player-1', 'John Smith', 15),
  createPlayer('player-2', 'Jane Doe', 20),
  createPlayer('player-3', 'Bob Wilson', 10),
  createPlayer('player-4', 'Alice Brown', 25),
];

const sixPlayers = [
  createPlayer('player-1', 'John Smith', 15),
  createPlayer('player-2', 'Jane Doe', 20),
  createPlayer('player-3', 'Bob Wilson', 10),
  createPlayer('player-4', 'Alice Brown', 25),
  createPlayer('player-5', 'Charlie Davis', 18),
  createPlayer('player-6', 'Diana Evans', 22),
];

const eightPlayers = [
  createPlayer('player-1', 'John Smith', 10),
  createPlayer('player-2', 'Jane Doe', 15),
  createPlayer('player-3', 'Bob Wilson', 20),
  createPlayer('player-4', 'Alice Brown', 25),
  createPlayer('player-5', 'Charlie Davis', 12),
  createPlayer('player-6', 'Diana Evans', 18),
  createPlayer('player-7', 'Frank Green', 22),
  createPlayer('player-8', 'Grace Hall', 28),
];

const twelvePlayers = [
  createPlayer('player-1', 'Player 1', 5),
  createPlayer('player-2', 'Player 2', 8),
  createPlayer('player-3', 'Player 3', 12),
  createPlayer('player-4', 'Player 4', 15),
  createPlayer('player-5', 'Player 5', 18),
  createPlayer('player-6', 'Player 6', 20),
  createPlayer('player-7', 'Player 7', 22),
  createPlayer('player-8', 'Player 8', 25),
  createPlayer('player-9', 'Player 9', 10),
  createPlayer('player-10', 'Player 10', 14),
  createPlayer('player-11', 'Player 11', 19),
  createPlayer('player-12', 'Player 12', 24),
];

// Teams with good balance (small handicap spread)
const balancedTeams: TeamWithMembers[] = [
  createTeamWithMembers('team-1', 'Team Alpha', [fourPlayers[0], fourPlayers[3]]), // 15 + 25 = 40, avg 20
  createTeamWithMembers('team-2', 'Team Beta', [fourPlayers[1], fourPlayers[2]]),   // 20 + 10 = 30, avg 15
];

// Teams with poor balance (large handicap spread)
const unbalancedTeams: TeamWithMembers[] = [
  createTeamWithMembers('team-1', 'Team Alpha', [
    createPlayer('p1', 'Low HC Player', 5),
    createPlayer('p2', 'Another Low HC', 5),
  ]),
  createTeamWithMembers('team-2', 'Team Beta', [
    createPlayer('p3', 'High HC Player', 30),
    createPlayer('p4', 'Another High HC', 30),
  ]),
];

// Partial teams (not all players assigned)
const partialTeams: TeamWithMembers[] = [
  createTeamWithMembers('team-1', 'Team Alpha', [fourPlayers[0], fourPlayers[1]]),
];

const defaultHandlers = {
  onSave: (teams: TeamWithMembers[]) => {
    Alert.alert('Teams Saved', `${teams.length} teams saved with ${teams.reduce((sum, t) => sum + t.members.length, 0)} players`);
  },
  onCancel: () => {
    Alert.alert('Cancelled', 'Operation cancelled');
  },
};

// ===========================================================================
// WRAPPER
// ===========================================================================

const StoryWrapper = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.wrapper}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});

// ===========================================================================
// STORIES
// ===========================================================================

/**
 * Default state - 4 players, team size 2, no existing teams
 * User needs to tap Auto-Generate to create teams
 */
export const Default: Story = {
  render: () => (
    <StoryWrapper>
      <TeamFormationUI
        competitionId="comp-123"
        players={fourPlayers}
        teamSize={2}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Empty state - no players available
 * Shows message to add players first
 */
export const EmptyState: Story = {
  render: () => (
    <StoryWrapper>
      <TeamFormationUI
        competitionId="comp-123"
        players={[]}
        teamSize={2}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * With existing balanced teams
 * Shows green "Good" balance indicator
 */
export const WithBalancedTeams: Story = {
  render: () => (
    <StoryWrapper>
      <TeamFormationUI
        competitionId="comp-123"
        players={fourPlayers}
        existingTeams={balancedTeams}
        teamSize={2}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * With existing unbalanced teams
 * Shows red "Poor" balance indicator
 */
export const WithUnbalancedTeams: Story = {
  render: () => (
    <StoryWrapper>
      <TeamFormationUI
        competitionId="comp-123"
        players={[
          createPlayer('p1', 'Low HC Player', 5),
          createPlayer('p2', 'Another Low HC', 5),
          createPlayer('p3', 'High HC Player', 30),
          createPlayer('p4', 'Another High HC', 30),
        ]}
        existingTeams={unbalancedTeams}
        teamSize={2}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Partial teams - validation warning shown
 * Not all players are assigned to teams
 */
export const PartialTeams: Story = {
  render: () => (
    <StoryWrapper>
      <TeamFormationUI
        competitionId="comp-123"
        players={fourPlayers}
        existingTeams={partialTeams}
        teamSize={2}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Six players with team size 2
 * Creates 3 teams
 */
export const SixPlayersTeamOf2: Story = {
  render: () => (
    <StoryWrapper>
      <TeamFormationUI
        competitionId="comp-123"
        players={sixPlayers}
        teamSize={2}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Six players with team size 3
 * Creates 2 teams
 */
export const SixPlayersTeamOf3: Story = {
  render: () => (
    <StoryWrapper>
      <TeamFormationUI
        competitionId="comp-123"
        players={sixPlayers}
        teamSize={3}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Eight players with team size 4
 * Creates 2 teams of 4
 */
export const EightPlayersTeamOf4: Story = {
  render: () => (
    <StoryWrapper>
      <TeamFormationUI
        competitionId="comp-123"
        players={eightPlayers}
        teamSize={4}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Large group - 12 players with team size 2
 * Creates 6 teams
 */
export const LargeGroupTeamOf2: Story = {
  render: () => (
    <StoryWrapper>
      <TeamFormationUI
        competitionId="comp-123"
        players={twelvePlayers}
        teamSize={2}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Large group - 12 players with team size 4
 * Creates 3 teams of 4
 */
export const LargeGroupTeamOf4: Story = {
  render: () => (
    <StoryWrapper>
      <TeamFormationUI
        competitionId="comp-123"
        players={twelvePlayers}
        teamSize={4}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * With testID for automated testing
 */
export const WithTestID: Story = {
  render: () => (
    <StoryWrapper>
      <TeamFormationUI
        competitionId="comp-123"
        players={fourPlayers}
        teamSize={2}
        testID="team-formation-ui"
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Players with photos
 * Shows avatar images instead of initials
 */
export const PlayersWithPhotos: Story = {
  render: () => {
    const playersWithPhotos = fourPlayers.map((player, index) => ({
      ...player,
      photo_url: `https://i.pravatar.cc/150?u=${player.id}`,
    }));

    const teamsWithPhotos: TeamWithMembers[] = [
      createTeamWithMembers('team-1', 'Team Alpha', [playersWithPhotos[0], playersWithPhotos[1]]),
      createTeamWithMembers('team-2', 'Team Beta', [playersWithPhotos[2], playersWithPhotos[3]]),
    ];

    return (
      <StoryWrapper>
        <TeamFormationUI
          competitionId="comp-123"
          players={playersWithPhotos}
          existingTeams={teamsWithPhotos}
          teamSize={2}
          {...defaultHandlers}
        />
      </StoryWrapper>
    );
  },
};

/**
 * Players with null handicaps
 * Shows "N/A" for handicap display
 */
export const PlayersWithNullHandicaps: Story = {
  render: () => {
    const playersWithNullHandicaps = [
      createPlayer('player-1', 'John Smith', 15),
      { ...createPlayer('player-2', 'Jane Doe', 0), handicap: null },
      createPlayer('player-3', 'Bob Wilson', 10),
      { ...createPlayer('player-4', 'New Player', 0), handicap: null },
    ] as Player[];

    const teamsWithNullHandicaps: TeamWithMembers[] = [
      createTeamWithMembers('team-1', 'Team Alpha', [playersWithNullHandicaps[0], playersWithNullHandicaps[1]]),
      createTeamWithMembers('team-2', 'Team Beta', [playersWithNullHandicaps[2], playersWithNullHandicaps[3]]),
    ];

    return (
      <StoryWrapper>
        <TeamFormationUI
          competitionId="comp-123"
          players={playersWithNullHandicaps}
          existingTeams={teamsWithNullHandicaps}
          teamSize={2}
          {...defaultHandlers}
        />
      </StoryWrapper>
    );
  },
};
