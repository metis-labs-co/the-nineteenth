/**
 * PlayerSelector Storybook Stories
 *
 * Visual documentation for the unified player selection component:
 * - Default state (single select)
 * - Multi-select mode
 * - With selected players
 * - Loading state
 * - Empty states
 * - With limits
 * - With locked players
 * - Search functionality
 * - Various configurations
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { PlayerSelector } from './PlayerSelector';
import type { PlayerSelectorProps, SelectablePlayer } from './PlayerSelector.types';

// ============================================================================
// TEST DATA
// ============================================================================

const mockPlayers: SelectablePlayer[] = [
  { id: 'player-1', name: 'John Smith', email: 'john.smith@example.com', handicap: 12, photo_url: 'https://i.pravatar.cc/150?u=john' },
  { id: 'player-2', name: 'Jane Doe', email: 'jane.doe@example.com', handicap: 18, photo_url: 'https://i.pravatar.cc/150?u=jane' },
  { id: 'player-3', name: 'Bob Wilson', email: 'bob.wilson@example.com', handicap: 8, photo_url: 'https://i.pravatar.cc/150?u=bob' },
  { id: 'player-4', name: 'Alice Brown', email: 'alice.brown@example.com', handicap: 22, photo_url: 'https://i.pravatar.cc/150?u=alice' },
  { id: 'player-5', name: 'Charlie Davis', email: 'charlie.davis@example.com', handicap: 15, photo_url: 'https://i.pravatar.cc/150?u=charlie' },
  { id: 'player-6', name: 'Diana Evans', email: 'diana.evans@example.com', handicap: 20, photo_url: 'https://i.pravatar.cc/150?u=diana' },
];

const mockPlayersWithoutDetails: SelectablePlayer[] = [
  { id: 'player-no-email', name: 'No Email Player', email: null, handicap: 12, photo_url: null },
  { id: 'player-no-handicap', name: 'No Handicap Player', email: 'player@example.com', handicap: null, photo_url: null },
  { id: 'player-minimal', name: 'Minimal Player', email: null, handicap: null, photo_url: null },
];

// ============================================================================
// WRAPPER COMPONENT
// ============================================================================

interface InteractiveWrapperProps extends Omit<PlayerSelectorProps, 'selectedIds' | 'onSelect'> {
  initialSelected?: string[];
}

const InteractiveWrapper = ({
  initialSelected = [],
  ...props
}: InteractiveWrapperProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <PlayerSelector
        {...props}
        selectedIds={selectedIds}
        onSelect={setSelectedIds}
      />
    </View>
  );
};

// ============================================================================
// META
// ============================================================================

const meta: Meta<typeof PlayerSelector> = {
  title: 'Common/PlayerSelector',
  component: PlayerSelector,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    multiSelect: { control: 'boolean' },
    searchable: { control: 'boolean' },
    showHandicap: { control: 'boolean' },
    loading: { control: 'boolean' },
    showReadyBadge: { control: 'boolean' },
    showLimitIndicator: { control: 'boolean' },
    maxSelections: { control: 'number' },
    selectedTitle: { control: 'text' },
    listTitle: { control: 'text' },
    emptyMessage: { control: 'text' },
    emptySearchMessage: { control: 'text' },
    searchPlaceholder: { control: 'text' },
    limitIndicatorLabel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof PlayerSelector>;

// ============================================================================
// BASIC STORIES - SINGLE SELECT
// ============================================================================

export const Default: Story = {
  render: () => (
    <InteractiveWrapper players={mockPlayers} />
  ),
};

export const SingleSelectWithSelection: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      initialSelected={['player-1']}
    />
  ),
};

export const SingleSelectNoSearch: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      searchable={false}
    />
  ),
};

export const SingleSelectHideHandicap: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      showHandicap={false}
    />
  ),
};

// ============================================================================
// MULTI-SELECT STORIES
// ============================================================================

export const MultiSelectDefault: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
    />
  ),
};

export const MultiSelectWithSelection: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      initialSelected={['player-1', 'player-2']}
    />
  ),
};

export const MultiSelectManySelected: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      initialSelected={['player-1', 'player-2', 'player-3', 'player-4']}
    />
  ),
};

// ============================================================================
// LOADING STATE
// ============================================================================

export const Loading: Story = {
  render: () => (
    <InteractiveWrapper players={[]} loading />
  ),
};

// ============================================================================
// EMPTY STATES
// ============================================================================

export const EmptyNoPlayers: Story = {
  render: () => (
    <InteractiveWrapper players={[]} />
  ),
};

export const EmptyWithCustomMessage: Story = {
  render: () => (
    <InteractiveWrapper
      players={[]}
      emptyMessage="No golfers available"
    />
  ),
};

export const MultiSelectEmptySelection: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
    />
  ),
};

// ============================================================================
// LIMIT STORIES
// ============================================================================

export const WithMaxSelections: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      maxSelections={4}
      showLimitIndicator
    />
  ),
};

export const WithCustomLimitLabel: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      maxSelections={4}
      showLimitIndicator
      limitIndicatorLabel="Players"
    />
  ),
};

export const ApproachingLimit: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      initialSelected={['player-1', 'player-2', 'player-3']}
      maxSelections={4}
      showLimitIndicator
    />
  ),
};

export const AtLimit: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      initialSelected={['player-1', 'player-2', 'player-3', 'player-4']}
      maxSelections={4}
      showLimitIndicator
    />
  ),
};

export const WithLimitsMinMax: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      limits={{ min: 2, max: 4 }}
      showLimitIndicator
      showReadyBadge
    />
  ),
};

export const MinimumMet: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      initialSelected={['player-1', 'player-2']}
      limits={{ min: 2, max: 4 }}
      showLimitIndicator
      showReadyBadge
    />
  ),
};

// ============================================================================
// LOCKED PLAYER STORIES
// ============================================================================

export const WithLockedPlayer: Story = {
  render: () => (
    <InteractiveWrapper
      players={[
        { id: 'current-user', name: 'You (Current User)', email: 'you@example.com', handicap: 15, photo_url: 'https://i.pravatar.cc/150?u=current' },
        ...mockPlayers,
      ]}
      multiSelect
      initialSelected={['current-user']}
      lockedPlayerIds={['current-user']}
      maxSelections={4}
      showLimitIndicator
    />
  ),
};

export const LockedPlayerWithOthersSelected: Story = {
  render: () => (
    <InteractiveWrapper
      players={[
        { id: 'current-user', name: 'You (Current User)', email: 'you@example.com', handicap: 15, photo_url: 'https://i.pravatar.cc/150?u=current' },
        ...mockPlayers,
      ]}
      multiSelect
      initialSelected={['current-user', 'player-1', 'player-2']}
      lockedPlayerIds={['current-user']}
      limits={{ min: 2, max: 4 }}
      showLimitIndicator
      showReadyBadge
    />
  ),
};

// ============================================================================
// CUSTOM TITLES STORIES
// ============================================================================

export const WithCustomTitles: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      selectedTitle="PARTNERS"
      listTitle="Select your golf partners"
    />
  ),
};

export const WithListTitle: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      listTitle="Choose up to 3 partners to join your group"
      maxSelections={3}
      showLimitIndicator
    />
  ),
};

// ============================================================================
// SEARCH STORIES
// ============================================================================

export const SearchByName: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      searchPlaceholder="Search by name..."
    />
  ),
};

export const SearchWithCustomPlaceholder: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      searchPlaceholder="Find golfers..."
    />
  ),
};

export const NoSearchBar: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      searchable={false}
    />
  ),
};

// ============================================================================
// EDGE CASE STORIES
// ============================================================================

export const PlayersWithoutDetails: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayersWithoutDetails}
    />
  ),
};

export const SinglePlayer: Story = {
  render: () => (
    <InteractiveWrapper
      players={[mockPlayers[0]]}
    />
  ),
};

export const ManyPlayers: Story = {
  render: () => {
    const manyPlayers = Array.from({ length: 20 }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      email: `player${i + 1}@example.com`,
      handicap: 5 + i,
      photo_url: `https://i.pravatar.cc/150?u=player${i + 1}`,
    }));
    return (
      <InteractiveWrapper players={manyPlayers} />
    );
  },
};

// ============================================================================
// USE CASE SCENARIOS
// ============================================================================

export const RoundCreationScenario: Story = {
  render: () => (
    <InteractiveWrapper
      players={[
        { id: 'current-user', name: 'You', email: 'you@example.com', handicap: 15, photo_url: 'https://i.pravatar.cc/150?u=current' },
        ...mockPlayers,
      ]}
      multiSelect
      initialSelected={['current-user']}
      lockedPlayerIds={['current-user']}
      limits={{ min: 2, max: 4 }}
      showLimitIndicator
      showReadyBadge
      selectedTitle="YOUR GROUP"
      listTitle="Add partners (2-4 players total)"
      limitIndicatorLabel="Partners"
    />
  ),
};

export const ScoringPairSelection: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers.slice(0, 4)}
      selectedTitle="SCORER"
      listTitle="Select who will keep score for this player"
      emptyMessage="No players available"
    />
  ),
};

export const TeamFormationScenario: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      initialSelected={['player-1']}
      limits={{ min: 2, max: 2 }}
      showLimitIndicator
      showReadyBadge
      selectedTitle="TEAM MEMBERS"
      listTitle="Select exactly 2 players for Team A"
      limitIndicatorLabel="Team members"
    />
  ),
};

export const CompetitionPlayerSelection: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      multiSelect
      limits={{ min: 4, max: 16 }}
      showLimitIndicator
      showReadyBadge
      selectedTitle="PARTICIPANTS"
      listTitle="Add at least 4 players to your competition"
      limitIndicatorLabel="Players"
    />
  ),
};

export const MatchPlayOpponentSelection: Story = {
  render: () => (
    <InteractiveWrapper
      players={mockPlayers}
      selectedTitle="OPPONENT"
      listTitle="Select your opponent for this match"
      searchPlaceholder="Find opponent..."
    />
  ),
};

// ============================================================================
// FULL CONFIGURATION STORY
// ============================================================================

export const FullConfiguration: Story = {
  render: () => (
    <InteractiveWrapper
      players={[
        { id: 'current-user', name: 'You (Current User)', email: 'you@example.com', handicap: 15, photo_url: 'https://i.pravatar.cc/150?u=current' },
        ...mockPlayers,
      ]}
      multiSelect
      initialSelected={['current-user', 'player-1']}
      lockedPlayerIds={['current-user']}
      limits={{ min: 2, max: 4 }}
      showLimitIndicator
      showReadyBadge
      showHandicap
      searchable
      selectedTitle="YOUR GROUP"
      listTitle="Select your playing partners"
      searchPlaceholder="Search players..."
      limitIndicatorLabel="Players"
      emptyMessage="No players available"
      emptySearchMessage="No matching players"
      testID="full-config-player-selector"
    />
  ),
};

// ============================================================================
// COMPARISON: SINGLE VS MULTI SELECT
// ============================================================================

export const ComparisonSingleVsMulti: Story = {
  render: () => (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#E0E0E0' }}>
        <InteractiveWrapper
          players={mockPlayers.slice(0, 3)}
          listTitle="Single Select"
        />
      </View>
      <View style={{ flex: 1 }}>
        <InteractiveWrapper
          players={mockPlayers.slice(0, 3)}
          multiSelect
          listTitle="Multi Select"
        />
      </View>
    </View>
  ),
};
