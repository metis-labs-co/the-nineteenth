/**
 * ScoringPairFormationUI Storybook Stories
 *
 * Stories demonstrating the various configurations of the ScoringPairFormationUI component.
 * Shows different player counts, pairing types, and validation states.
 */

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text as _Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { ScoringPairFormationUI } from './index';
import { spacing, typography } from '@/constants/theme';
import type { Player } from '@/types/database.types';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof ScoringPairFormationUI> = {
  title: 'Scoring/ScoringPairFormationUI',
  component: ScoringPairFormationUI,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ScoringPairFormationUI>;

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
    equipped_badge_id: null,
    equipped_frame_id: null,
    equipped_title_id: null,
    is_placeholder: false,
    created_by: null,
    linked_player_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };
}

const twoPlayers = [
  createPlayer('player-1', 'John Smith', 15),
  createPlayer('player-2', 'Jane Doe', 20),
];

const threePlayers = [
  createPlayer('player-1', 'John Smith', 15),
  createPlayer('player-2', 'Jane Doe', 20),
  createPlayer('player-3', 'Bob Wilson', 10),
];

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

const defaultHandlers = {
  onSave: (pairs: unknown[]) => {
    Alert.alert('Pairs Saved', `${pairs.length} pairs saved`);
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
  infoCard: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: 12,
  },
  infoText: {
    ...typography.body,
    color: '#333333',
    textAlign: 'center',
  },
});

// ===========================================================================
// STORIES
// ===========================================================================

/**
 * Two players - simplest case
 */
export const TwoPlayers: Story = {
  render: () => (
    <StoryWrapper>
      <ScoringPairFormationUI
        roundId="round-123"
        players={twoPlayers}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Three players - creates circular pairing
 */
export const ThreePlayers: Story = {
  render: () => (
    <StoryWrapper>
      <ScoringPairFormationUI
        roundId="round-123"
        players={threePlayers}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Four players - typical group size
 */
export const FourPlayers: Story = {
  render: () => (
    <StoryWrapper>
      <ScoringPairFormationUI
        roundId="round-123"
        players={fourPlayers}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Six players - larger group
 */
export const SixPlayers: Story = {
  render: () => (
    <StoryWrapper>
      <ScoringPairFormationUI
        roundId="round-123"
        players={sixPlayers}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Empty state - no players
 */
export const EmptyState: Story = {
  render: () => (
    <StoryWrapper>
      <ScoringPairFormationUI
        roundId="round-123"
        players={[]}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Single player - not enough players state
 */
export const SinglePlayer: Story = {
  render: () => (
    <StoryWrapper>
      <ScoringPairFormationUI
        roundId="round-123"
        players={[createPlayer('1', 'Solo Player')]}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * With existing pairs - editing mode
 */
export const WithExistingPairs: Story = {
  render: () => (
    <StoryWrapper>
      <ScoringPairFormationUI
        roundId="round-123"
        players={fourPlayers}
        existingPairs={[
          {
            id: 'pair-1',
            round_id: 'round-123',
            scorer_id: 'player-1',
            player_id: 'player-2',
            created_at: '2025-01-01',
            updated_at: '2025-01-01',
            scorer: fourPlayers[0],
            player: fourPlayers[1],
          },
          {
            id: 'pair-2',
            round_id: 'round-123',
            scorer_id: 'player-2',
            player_id: 'player-1',
            created_at: '2025-01-01',
            updated_at: '2025-01-01',
            scorer: fourPlayers[1],
            player: fourPlayers[0],
          },
        ]}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * Team match play with cross-team pairing option
 */
export const TeamMatchPlay: Story = {
  render: () => (
    <StoryWrapper>
      <ScoringPairFormationUI
        roundId="round-123"
        players={fourPlayers}
        isTeamMatchPlay={true}
        teams={[
          {
            id: 'team-1',
            name: 'Team Alpha',
            competition_id: 'comp-1',
            members: [
              { player_id: 'player-1', team_id: 'team-1', joined_at: '2025-01-01T00:00:00Z', player: fourPlayers[0] },
              { player_id: 'player-2', team_id: 'team-1', joined_at: '2025-01-01T00:00:00Z', player: fourPlayers[1] },
            ],
            created_at: '2025-01-01',
            updated_at: '2025-01-01',
          },
          {
            id: 'team-2',
            name: 'Team Beta',
            competition_id: 'comp-1',
            members: [
              { player_id: 'player-3', team_id: 'team-2', joined_at: '2025-01-01T00:00:00Z', player: fourPlayers[2] },
              { player_id: 'player-4', team_id: 'team-2', joined_at: '2025-01-01T00:00:00Z', player: fourPlayers[3] },
            ],
            created_at: '2025-01-01',
            updated_at: '2025-01-01',
          },
        ]}
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};

/**
 * With test ID for automated testing
 */
export const WithTestID: Story = {
  render: () => (
    <StoryWrapper>
      <ScoringPairFormationUI
        roundId="round-123"
        players={fourPlayers}
        testID="scoring-pair-ui"
        {...defaultHandlers}
      />
    </StoryWrapper>
  ),
};
