/**
 * ScoringPairsSection Stories
 *
 * Visual testing for the scoring pairs section component.
 * Shows different states including:
 * - Locked (non-premium) state
 * - Premium enabled/disabled states
 * - Loading state
 * - Reciprocal pairs display
 * - Circular chain display
 * - Empty state
 * - With/without manage button
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { ScoringPairsSection } from './ScoringPairsSection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Player, ScoringPairWithPlayers } from '@/types/database.types';

// Create a QueryClient for the stories
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: () => {},
    goBack: () => {},
  }),
}));

const meta: Meta<typeof ScoringPairsSection> = {
  title: 'Rounds/ViewRound/ScoringPairsSection',
  component: ScoringPairsSection,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <View style={{ padding: 16, backgroundColor: '#f5f5f5' }}>
          <Story />
        </View>
      </QueryClientProvider>
    ),
  ],
  args: {
    roundId: 'round-1',
    scoringPairsRequired: false,
    cardBackground: '#ffffff',
    roundStatus: 'upcoming',
  },
};

export default meta;
type Story = StoryObj<typeof ScoringPairsSection>;

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: overrides.id || 'player-1',
    name: overrides.name || 'Test Player',
    email: overrides.email || 'test@test.com',
    phone: null,
    handicap: overrides.handicap ?? 15,
    golf_id: null,
    handicap_updated_at: null,
    photo_url: overrides.photo_url ?? null,
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createMockScoringPair(overrides: Partial<ScoringPairWithPlayers> = {}): ScoringPairWithPlayers {
  return {
    id: overrides.id || 'pair-1',
    round_id: overrides.round_id || 'round-1',
    scorer_id: overrides.scorer_id || 'scorer-1',
    player_id: overrides.player_id || 'player-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    scorer: overrides.scorer || createMockPlayer({ id: 'scorer-1', name: 'Scorer One' }),
    player: overrides.player || createMockPlayer({ id: 'player-1', name: 'Player One' }),
  };
}

// ===========================================================================
// LOCKED STATE STORIES
// ===========================================================================

export const LockedNonPremium: Story = {
  args: {

    scoringPairsRequired: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Locked state for non-premium users. Shows upgrade prompt.',
      },
    },
  },
};

export const LockedWithRequiredEnabled: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Locked state even when scoring pairs would be required. Premium check takes precedence.',
      },
    },
  },
};

// ===========================================================================
// DISABLED STATE STORIES
// ===========================================================================

export const DisabledState: Story = {
  args: {

    scoringPairsRequired: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Premium user with scoring pairs disabled. Shows "Optional" pill.',
      },
    },
  },
};

export const DisabledWithManageButton: Story = {
  args: {

    scoringPairsRequired: false,
    onEditPress: () => console.log('Edit pressed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state with manage button for organizers.',
      },
    },
  },
};

// ===========================================================================
// ENABLED STATE STORIES
// ===========================================================================

export const EnabledEmpty: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Enabled state with no pairs assigned yet. Shows empty state message.',
      },
    },
  },
};

export const EnabledEmptyWithManageButton: Story = {
  args: {

    scoringPairsRequired: true,
    onEditPress: () => console.log('Edit pressed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Enabled empty state with manage button for organizers.',
      },
    },
  },
};

// ===========================================================================
// LOADING STATE STORIES
// ===========================================================================

export const Loading: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching scoring pairs.',
      },
    },
    mockData: {
      isLoading: true,
    },
  },
};

// ===========================================================================
// RECIPROCAL PAIRS STORIES
// ===========================================================================

export const ReciprocalPairsTwoPairs: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Two reciprocal pairs (A↔B, C↔D). Shows swap icon between players.',
      },
    },
    mockData: {
      pairs: [
        // A <-> B
        createMockScoringPair({
          id: 'pair-1',
          scorer_id: 'player-a',
          player_id: 'player-b',
          scorer: createMockPlayer({ id: 'player-a', name: 'Tiger Woods' }),
          player: createMockPlayer({ id: 'player-b', name: 'Rory McIlroy' }),
        }),
        createMockScoringPair({
          id: 'pair-2',
          scorer_id: 'player-b',
          player_id: 'player-a',
          scorer: createMockPlayer({ id: 'player-b', name: 'Rory McIlroy' }),
          player: createMockPlayer({ id: 'player-a', name: 'Tiger Woods' }),
        }),
        // C <-> D
        createMockScoringPair({
          id: 'pair-3',
          scorer_id: 'player-c',
          player_id: 'player-d',
          scorer: createMockPlayer({ id: 'player-c', name: 'Phil Mickelson' }),
          player: createMockPlayer({ id: 'player-d', name: 'Bryson DeChambeau' }),
        }),
        createMockScoringPair({
          id: 'pair-4',
          scorer_id: 'player-d',
          player_id: 'player-c',
          scorer: createMockPlayer({ id: 'player-d', name: 'Bryson DeChambeau' }),
          player: createMockPlayer({ id: 'player-c', name: 'Phil Mickelson' }),
        }),
      ],
    },
  },
};

export const ReciprocalPairsThreePairs: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Three reciprocal pairs (6 players total).',
      },
    },
    mockData: {
      pairs: [
        // A <-> B
        createMockScoringPair({
          id: 'pair-1',
          scorer: createMockPlayer({ id: 'a', name: 'Adam Scott' }),
          player: createMockPlayer({ id: 'b', name: 'Brooks Koepka' }),
        }),
        createMockScoringPair({
          id: 'pair-2',
          scorer: createMockPlayer({ id: 'b', name: 'Brooks Koepka' }),
          player: createMockPlayer({ id: 'a', name: 'Adam Scott' }),
        }),
        // C <-> D
        createMockScoringPair({
          id: 'pair-3',
          scorer: createMockPlayer({ id: 'c', name: 'Cameron Smith' }),
          player: createMockPlayer({ id: 'd', name: 'Dustin Johnson' }),
        }),
        createMockScoringPair({
          id: 'pair-4',
          scorer: createMockPlayer({ id: 'd', name: 'Dustin Johnson' }),
          player: createMockPlayer({ id: 'c', name: 'Cameron Smith' }),
        }),
        // E <-> F
        createMockScoringPair({
          id: 'pair-5',
          scorer: createMockPlayer({ id: 'e', name: 'Eric Koepka' }),
          player: createMockPlayer({ id: 'f', name: 'Fred Couples' }),
        }),
        createMockScoringPair({
          id: 'pair-6',
          scorer: createMockPlayer({ id: 'f', name: 'Fred Couples' }),
          player: createMockPlayer({ id: 'e', name: 'Eric Koepka' }),
        }),
      ],
    },
  },
};

export const ReciprocalPairsWithManage: Story = {
  args: {

    scoringPairsRequired: true,
    onEditPress: () => console.log('Edit pressed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Reciprocal pairs with manage button for organizers.',
      },
    },
  },
};

// ===========================================================================
// CIRCULAR CHAIN STORIES
// ===========================================================================

export const CircularChainThreePlayers: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Circular chain with 3 players (A→B→C→A). Shows arrow icon.',
      },
    },
    mockData: {
      pairs: [
        createMockScoringPair({
          id: 'pair-1',
          scorer: createMockPlayer({ id: 'a', name: 'Alex Smith' }),
          player: createMockPlayer({ id: 'b', name: 'Bob Jones' }),
        }),
        createMockScoringPair({
          id: 'pair-2',
          scorer: createMockPlayer({ id: 'b', name: 'Bob Jones' }),
          player: createMockPlayer({ id: 'c', name: 'Charlie Brown' }),
        }),
        createMockScoringPair({
          id: 'pair-3',
          scorer: createMockPlayer({ id: 'c', name: 'Charlie Brown' }),
          player: createMockPlayer({ id: 'a', name: 'Alex Smith' }),
        }),
      ],
    },
  },
};

export const CircularChainFivePlayers: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Circular chain with 5 players (A→B→C→D→E→A).',
      },
    },
    mockData: {
      pairs: [
        createMockScoringPair({
          id: 'pair-1',
          scorer: createMockPlayer({ id: 'a', name: 'Alice' }),
          player: createMockPlayer({ id: 'b', name: 'Bob' }),
        }),
        createMockScoringPair({
          id: 'pair-2',
          scorer: createMockPlayer({ id: 'b', name: 'Bob' }),
          player: createMockPlayer({ id: 'c', name: 'Charlie' }),
        }),
        createMockScoringPair({
          id: 'pair-3',
          scorer: createMockPlayer({ id: 'c', name: 'Charlie' }),
          player: createMockPlayer({ id: 'd', name: 'Diana' }),
        }),
        createMockScoringPair({
          id: 'pair-4',
          scorer: createMockPlayer({ id: 'd', name: 'Diana' }),
          player: createMockPlayer({ id: 'e', name: 'Edward' }),
        }),
        createMockScoringPair({
          id: 'pair-5',
          scorer: createMockPlayer({ id: 'e', name: 'Edward' }),
          player: createMockPlayer({ id: 'a', name: 'Alice' }),
        }),
      ],
    },
  },
};

export const CircularChainWithManage: Story = {
  args: {

    scoringPairsRequired: true,
    onEditPress: () => console.log('Edit pressed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Circular chain with manage button for organizers.',
      },
    },
  },
};

// ===========================================================================
// SINGLE PAIR STORIES
// ===========================================================================

export const SinglePair: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Single pair (shows "1 pair" singular text).',
      },
    },
    mockData: {
      pairs: [
        createMockScoringPair({
          id: 'pair-1',
          scorer: createMockPlayer({ id: 'a', name: 'Player A' }),
          player: createMockPlayer({ id: 'b', name: 'Player B' }),
        }),
      ],
    },
  },
};

// ===========================================================================
// AVATAR VARIATIONS STORIES
// ===========================================================================

export const WithAvatarImages: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Players with profile photos display avatar images.',
      },
    },
    mockData: {
      pairs: [
        createMockScoringPair({
          id: 'pair-1',
          scorer: createMockPlayer({
            id: 'a',
            name: 'Tiger Woods',
            photo_url: 'https://via.placeholder.com/32',
          }),
          player: createMockPlayer({
            id: 'b',
            name: 'Rory McIlroy',
            photo_url: 'https://via.placeholder.com/32',
          }),
        }),
        createMockScoringPair({
          id: 'pair-2',
          scorer: createMockPlayer({
            id: 'b',
            name: 'Rory McIlroy',
            photo_url: 'https://via.placeholder.com/32',
          }),
          player: createMockPlayer({
            id: 'a',
            name: 'Tiger Woods',
            photo_url: 'https://via.placeholder.com/32',
          }),
        }),
      ],
    },
  },
};

export const WithMixedAvatars: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Mix of players with and without profile photos.',
      },
    },
    mockData: {
      pairs: [
        createMockScoringPair({
          id: 'pair-1',
          scorer: createMockPlayer({
            id: 'a',
            name: 'Tiger Woods',
            photo_url: 'https://via.placeholder.com/32',
          }),
          player: createMockPlayer({
            id: 'b',
            name: 'Rory McIlroy',
            photo_url: null,
          }),
        }),
        createMockScoringPair({
          id: 'pair-2',
          scorer: createMockPlayer({
            id: 'b',
            name: 'Rory McIlroy',
            photo_url: null,
          }),
          player: createMockPlayer({
            id: 'a',
            name: 'Tiger Woods',
            photo_url: 'https://via.placeholder.com/32',
          }),
        }),
      ],
    },
  },
};

export const WithInitialsOnly: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'All players without photos show initials in avatars.',
      },
    },
    mockData: {
      pairs: [
        createMockScoringPair({
          id: 'pair-1',
          scorer: createMockPlayer({ id: 'a', name: 'John Smith', photo_url: null }),
          player: createMockPlayer({ id: 'b', name: 'Jane Doe', photo_url: null }),
        }),
        createMockScoringPair({
          id: 'pair-2',
          scorer: createMockPlayer({ id: 'b', name: 'Jane Doe', photo_url: null }),
          player: createMockPlayer({ id: 'a', name: 'John Smith', photo_url: null }),
        }),
      ],
    },
  },
};

// ===========================================================================
// EDGE CASES STORIES
// ===========================================================================

export const LongPlayerNames: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Very long player names should truncate properly.',
      },
    },
    mockData: {
      pairs: [
        createMockScoringPair({
          id: 'pair-1',
          scorer: createMockPlayer({ id: 'a', name: 'Alexander Bartholomew Christopher Davidson III' }),
          player: createMockPlayer({ id: 'b', name: 'Elizabeth Montgomery Wellington-Smythe' }),
        }),
        createMockScoringPair({
          id: 'pair-2',
          scorer: createMockPlayer({ id: 'b', name: 'Elizabeth Montgomery Wellington-Smythe' }),
          player: createMockPlayer({ id: 'a', name: 'Alexander Bartholomew Christopher Davidson III' }),
        }),
      ],
    },
  },
};

export const SpecialCharactersInNames: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Names with special characters and international characters.',
      },
    },
    mockData: {
      pairs: [
        createMockScoringPair({
          id: 'pair-1',
          scorer: createMockPlayer({ id: 'a', name: "O'Brien & Co." }),
          player: createMockPlayer({ id: 'b', name: 'José García' }),
        }),
        createMockScoringPair({
          id: 'pair-2',
          scorer: createMockPlayer({ id: 'b', name: 'José García' }),
          player: createMockPlayer({ id: 'a', name: "O'Brien & Co." }),
        }),
        createMockScoringPair({
          id: 'pair-3',
          scorer: createMockPlayer({ id: 'c', name: 'François Müller' }),
          player: createMockPlayer({ id: 'd', name: '田中太郎' }),
        }),
        createMockScoringPair({
          id: 'pair-4',
          scorer: createMockPlayer({ id: 'd', name: '田中太郎' }),
          player: createMockPlayer({ id: 'c', name: 'François Müller' }),
        }),
      ],
    },
  },
};

export const SingleWordNames: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Players with single-word names (common in some cultures).',
      },
    },
    mockData: {
      pairs: [
        createMockScoringPair({
          id: 'pair-1',
          scorer: createMockPlayer({ id: 'a', name: 'Tiger' }),
          player: createMockPlayer({ id: 'b', name: 'Rory' }),
        }),
        createMockScoringPair({
          id: 'pair-2',
          scorer: createMockPlayer({ id: 'b', name: 'Rory' }),
          player: createMockPlayer({ id: 'a', name: 'Tiger' }),
        }),
      ],
    },
  },
};

export const MissingPlayerData: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Handles missing player data gracefully (shows "Unknown").',
      },
    },
    mockData: {
      pairs: [
        createMockScoringPair({
          id: 'pair-1',
          scorer: undefined,
          player: createMockPlayer({ id: 'b', name: 'Jane Doe' }),
        }),
        createMockScoringPair({
          id: 'pair-2',
          scorer: createMockPlayer({ id: 'a', name: 'John Smith' }),
          player: undefined,
        }),
      ],
    },
  },
};

// ===========================================================================
// DARK MODE STORIES
// ===========================================================================

export const DarkModeLockedState: Story = {
  args: {

    cardBackground: '#1e1e1e',
  },
  parameters: {
    docs: {
      description: {
        story: 'Locked state in dark mode.',
      },
    },
    backgrounds: { default: 'dark' },
  },
};

export const DarkModeDisabled: Story = {
  args: {

    scoringPairsRequired: false,
    cardBackground: '#1e1e1e',
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state in dark mode.',
      },
    },
    backgrounds: { default: 'dark' },
  },
};

export const DarkModeEnabled: Story = {
  args: {

    scoringPairsRequired: true,
    cardBackground: '#1e1e1e',
  },
  parameters: {
    docs: {
      description: {
        story: 'Enabled state with pairs in dark mode.',
      },
    },
    backgrounds: { default: 'dark' },
  },
};

// ===========================================================================
// LARGE GROUPS STORIES
// ===========================================================================

export const LargeGroupReciprocalPairs: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Large group of 8 players (4 reciprocal pairs).',
      },
    },
    mockData: {
      pairs: (() => {
        const players = [
          'Adam', 'Bob', 'Charlie', 'David',
          'Eve', 'Frank', 'Grace', 'Henry',
        ].map((name, i) => createMockPlayer({ id: `player-${i}`, name }));

        const pairs: ScoringPairWithPlayers[] = [];
        for (let i = 0; i < players.length; i += 2) {
          pairs.push(
            createMockScoringPair({
              id: `pair-${i}`,
              scorer: players[i],
              player: players[i + 1],
            }),
            createMockScoringPair({
              id: `pair-${i + 1}`,
              scorer: players[i + 1],
              player: players[i],
            })
          );
        }
        return pairs;
      })(),
    },
  },
};

export const LargeGroupCircularChain: Story = {
  args: {

    scoringPairsRequired: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Large group of 7 players in circular chain.',
      },
    },
    mockData: {
      pairs: (() => {
        const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George'];
        const players = names.map((name, i) => createMockPlayer({ id: `player-${i}`, name }));

        return players.map((scorer, i) =>
          createMockScoringPair({
            id: `pair-${i}`,
            scorer,
            player: players[(i + 1) % players.length],
          })
        );
      })(),
    },
  },
};
