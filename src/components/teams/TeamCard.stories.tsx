/**
 * TeamCard Storybook Stories
 *
 * Stories demonstrating the various configurations of the TeamCard component.
 * Shows different team sizes, handicaps, editable modes, and expansion states.
 */

import React from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { TeamCard } from './TeamCard';
import type { Player, TeamWithMembers } from '@/types/database.types';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof TeamCard> = {
  title: 'Teams/TeamCard',
  component: TeamCard,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof TeamCard>;

// ===========================================================================
// FIXTURES
// ===========================================================================

function createPlayer(
  id: string,
  name: string,
  handicap: number | null = 15,
  photoUrl: string | null = null
): Player {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(/\s/g, '.')}@test.com`,
    phone: null,
    handicap,
    golf_id: null,
    handicap_updated_at: null,
    photo_url: photoUrl,
    gender: null,
    handicap_index: null,
    handicap_index_updated_at: null,
    home_club_id: null,
    push_enabled: true,
    push_competition_updates: true,
    push_friend_requests: true,
    push_scorecard_updates: true,
    push_league_updates: true,
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

function createTeamWithMembers(
  id: string,
  name: string,
  players: Player[]
): TeamWithMembers {
  return {
    id,
    name,
    color: null,
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

// Basic teams
const twoPlayerTeam = createTeamWithMembers('team-1', 'Team Alpha', [
  createPlayer('p1', 'John Smith', 15),
  createPlayer('p2', 'Jane Doe', 25),
]);

const threePlayerTeam = createTeamWithMembers('team-2', 'Team Beta', [
  createPlayer('p1', 'John Smith', 10),
  createPlayer('p2', 'Jane Doe', 20),
  createPlayer('p3', 'Bob Wilson', 30),
]);

const fourPlayerTeam = createTeamWithMembers('team-3', 'Team Gamma', [
  createPlayer('p1', 'John Smith', 12),
  createPlayer('p2', 'Jane Doe', 18),
  createPlayer('p3', 'Bob Wilson', 24),
  createPlayer('p4', 'Alice Brown', 30),
]);

// Empty team
const emptyTeam: TeamWithMembers = {
  id: 'team-empty',
  name: 'Empty Team',
  color: null,
  competition_id: 'comp-1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  members: [],
};

// Single member team
const singleMemberTeam = createTeamWithMembers('team-single', 'Solo Warrior', [
  createPlayer('p1', 'Lonely Player', 18),
]);

// Team with null handicaps
const teamWithNullHandicaps = createTeamWithMembers('team-null', 'New Players Team', [
  createPlayer('p1', 'Experienced Player', 15),
  createPlayer('p2', 'New Player', null),
]);

// Team with photos
const teamWithPhotos = createTeamWithMembers('team-photos', 'Photo Team', [
  createPlayer('p1', 'John Smith', 15, 'https://i.pravatar.cc/150?u=john'),
  createPlayer('p2', 'Jane Doe', 20, 'https://i.pravatar.cc/150?u=jane'),
]);

// Team with scratch golfers
const scratchTeam = createTeamWithMembers('team-scratch', 'Scratch Team', [
  createPlayer('p1', 'Tiger Woods', 0),
  createPlayer('p2', 'Rory McIlroy', 0),
]);

// Team with plus handicaps
const plusHandicapTeam = createTeamWithMembers('team-plus', 'Pro Team', [
  createPlayer('p1', 'Pro Player 1', -2),
  createPlayer('p2', 'Pro Player 2', -4),
]);

// Team with high handicaps
const highHandicapTeam = createTeamWithMembers('team-high', 'Beginners', [
  createPlayer('p1', 'Beginner 1', 36),
  createPlayer('p2', 'Beginner 2', 40),
]);

// Team with long names
const longNameTeam = createTeamWithMembers(
  'team-long',
  'The Magnificent Golfers of Melbourne Victoria',
  [
    createPlayer('p1', 'Alexander Bartholomew Wellington III', 15),
    createPlayer('p2', 'Elizabeth Marie Johnson-Smithington', 20),
  ]
);

// Team with varied handicaps
const variedHandicapTeam = createTeamWithMembers('team-varied', 'Mixed Bag', [
  createPlayer('p1', 'Low HC', 5),
  createPlayer('p2', 'Mid-Low HC', 12),
  createPlayer('p3', 'Mid-High HC', 22),
  createPlayer('p4', 'High HC', 35),
]);

const defaultHandlers = {
  onEdit: (team: TeamWithMembers) => {
    Alert.alert('Edit', `Editing team: ${team.name}`);
  },
  onDelete: (team: TeamWithMembers) => {
    Alert.alert('Delete', `Deleting team: ${team.name}`);
  },
  onPress: () => {
    Alert.alert('Pressed', 'Team card pressed');
  },
};

// ===========================================================================
// WRAPPER
// ===========================================================================

const StoryWrapper = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.wrapper}>{children}</View>
);

const ScrollWrapper = ({ children }: { children: React.ReactNode }) => (
  <ScrollView style={styles.scrollWrapper} contentContainerStyle={styles.scrollContent}>
    {children}
  </ScrollView>
);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  scrollWrapper: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

/**
 * Default two-player team, collapsed
 */
export const Default: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={twoPlayerTeam} />
    </StoryWrapper>
  ),
};

/**
 * Two-player team, expanded to show members
 */
export const Expanded: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={twoPlayerTeam} />
    </StoryWrapper>
  ),
};

/**
 * Three-player team
 */
export const ThreeMembers: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={threePlayerTeam} />
    </StoryWrapper>
  ),
};

/**
 * Four-player team
 */
export const FourMembers: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={fourPlayerTeam} />
    </StoryWrapper>
  ),
};

/**
 * Single member team
 */
export const SingleMember: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={singleMemberTeam} />
    </StoryWrapper>
  ),
};

/**
 * Empty team with no members
 */
export const EmptyTeam: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={emptyTeam} />
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDITABLE STORIES
// ===========================================================================

/**
 * Editable team with edit button visible
 */
export const Editable: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard
        team={twoPlayerTeam}
        isEditable
        onEdit={defaultHandlers.onEdit}      />
    </StoryWrapper>
  ),
};

/**
 * Editable team with all action handlers
 */
export const EditableWithAllActions: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard
        team={fourPlayerTeam}
        isEditable
        onEdit={defaultHandlers.onEdit}
        onDelete={defaultHandlers.onDelete}      />
    </StoryWrapper>
  ),
};

/**
 * Non-editable (read-only) view
 */
export const ReadOnly: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={twoPlayerTeam} isEditable={false} />
    </StoryWrapper>
  ),
};

// ===========================================================================
// PRESSABLE STORIES
// ===========================================================================

/**
 * Pressable team card
 */
export const Pressable: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={twoPlayerTeam} onPress={defaultHandlers.onPress} />
    </StoryWrapper>
  ),
};

/**
 * Pressable and editable
 */
export const PressableAndEditable: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard
        team={twoPlayerTeam}
        isEditable
        onEdit={defaultHandlers.onEdit}
        onPress={defaultHandlers.onPress}      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// HANDICAP VARIATION STORIES
// ===========================================================================

/**
 * Team with scratch (0) handicaps
 */
export const ScratchGolfers: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={scratchTeam} />
    </StoryWrapper>
  ),
};

/**
 * Team with plus (negative) handicaps
 */
export const PlusHandicaps: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={plusHandicapTeam} />
    </StoryWrapper>
  ),
};

/**
 * Team with high handicaps
 */
export const HighHandicaps: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={highHandicapTeam} />
    </StoryWrapper>
  ),
};

/**
 * Team with varied handicaps showing spread
 */
export const VariedHandicaps: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={variedHandicapTeam} />
    </StoryWrapper>
  ),
};

/**
 * Team with null (unknown) handicaps
 */
export const NullHandicaps: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={teamWithNullHandicaps} />
    </StoryWrapper>
  ),
};

// ===========================================================================
// AVATAR STORIES
// ===========================================================================

/**
 * Team with player photos
 */
export const WithPhotos: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={teamWithPhotos} />
    </StoryWrapper>
  ),
};

/**
 * Team with initials (no photos)
 */
export const WithInitials: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={twoPlayerTeam} />
    </StoryWrapper>
  ),
};

/**
 * Mixed: some with photos, some with initials
 */
export const MixedAvatars: Story = {
  render: () => {
    const mixedTeam = createTeamWithMembers('team-mixed', 'Mixed Avatars', [
      createPlayer('p1', 'Photo Player', 15, 'https://i.pravatar.cc/150?u=photo'),
      createPlayer('p2', 'Initials Player', 20, null),
      createPlayer('p3', 'Another Photo', 25, 'https://i.pravatar.cc/150?u=another'),
    ]);
    return (
      <StoryWrapper>
        <TeamCard team={mixedTeam} />
      </StoryWrapper>
    );
  },
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

/**
 * Team with very long names
 */
export const LongNames: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={longNameTeam} />
    </StoryWrapper>
  ),
};

/**
 * Team with single-word player names
 */
export const SingleWordNames: Story = {
  render: () => {
    const singleWordTeam = createTeamWithMembers('team-single-words', 'Celebrities', [
      createPlayer('p1', 'Madonna', 20),
      createPlayer('p2', 'Prince', 15),
      createPlayer('p3', 'Cher', 25),
    ]);
    return (
      <StoryWrapper>
        <TeamCard team={singleWordTeam} />
      </StoryWrapper>
    );
  },
};

/**
 * Team with decimal handicaps
 */
export const DecimalHandicaps: Story = {
  render: () => {
    const decimalTeam = createTeamWithMembers('team-decimal', 'Precise Golfers', [
      createPlayer('p1', 'Player 1', 12.4),
      createPlayer('p2', 'Player 2', 15.6),
    ]);
    return (
      <StoryWrapper>
        <TeamCard team={decimalTeam} />
      </StoryWrapper>
    );
  },
};

// ===========================================================================
// TEST ID STORY
// ===========================================================================

/**
 * With testID for automated testing
 */
export const WithTestID: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={twoPlayerTeam} testID="team-card-test" />
    </StoryWrapper>
  ),
};

// ===========================================================================
// MULTIPLE CARDS STORIES
// ===========================================================================

/**
 * Multiple teams in a list
 */
export const MultipleTeams: Story = {
  render: () => (
    <ScrollWrapper>
      <TeamCard team={twoPlayerTeam} />
      <TeamCard team={threePlayerTeam} />
      <TeamCard team={fourPlayerTeam} />
    </ScrollWrapper>
  ),
};

/**
 * Multiple teams expanded
 */
export const MultipleTeamsExpanded: Story = {
  render: () => (
    <ScrollWrapper>
      <TeamCard team={twoPlayerTeam} />
      <TeamCard team={threePlayerTeam} />
      <TeamCard team={fourPlayerTeam} />
    </ScrollWrapper>
  ),
};

/**
 * Competition view: editable teams list
 */
export const CompetitionView: Story = {
  render: () => (
    <ScrollWrapper>
      <TeamCard
        team={twoPlayerTeam}
        isEditable
        onEdit={defaultHandlers.onEdit}
        onPress={defaultHandlers.onPress}
      />
      <TeamCard
        team={threePlayerTeam}
        isEditable
        onEdit={defaultHandlers.onEdit}
        onPress={defaultHandlers.onPress}
      />
      <TeamCard
        team={fourPlayerTeam}
        isEditable
        onEdit={defaultHandlers.onEdit}
        onPress={defaultHandlers.onPress}
      />
    </ScrollWrapper>
  ),
};

// ===========================================================================
// THEMED STORIES
// ===========================================================================

/**
 * In dark mode context
 * Note: Actual dark mode styling is handled by ThemeProvider
 */
export const DarkModeContext: Story = {
  render: () => (
    <View style={[styles.wrapper, { backgroundColor: '#121212' }]}>
      <TeamCard team={twoPlayerTeam} />
    </View>
  ),
};

// ===========================================================================
// INTERACTION STORIES
// ===========================================================================

/**
 * Members are always visible (no expand/collapse)
 */
export const Interactive: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard team={fourPlayerTeam} />
    </StoryWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The member list is always shown; tap the team name (when editable) to rename.',
      },
    },
  },
};

/**
 * All features enabled
 */
export const AllFeatures: Story = {
  render: () => (
    <StoryWrapper>
      <TeamCard
        team={teamWithPhotos}
        isEditable
        onEdit={defaultHandlers.onEdit}
        onDelete={defaultHandlers.onDelete}
        onPress={defaultHandlers.onPress}        testID="all-features-card"
      />
    </StoryWrapper>
  ),
};
