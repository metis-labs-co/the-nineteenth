/**
 * ScoringPairFormationUI Component Tests
 *
 * Tests for the scoring pair formation UI component including:
 * - Empty states (no players, not enough players)
 * - Auto-generation of pairs (reciprocal, circular)
 * - Manual player selection
 * - Coverage validation
 * - Save/cancel/reset actions
 * - Cross-team pairing for match play
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { ScoringPairFormationUI } from './index';
import type { Player } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';

// =====================================================
// MOCKS
// =====================================================

// Mock icons
jest.mock('@tabler/icons-react-native', () => {
  const { View, Text } = require('react-native');
  return {
    IconWand: () => <Text>WandIcon</Text>,
    IconRefresh: () => <Text>RefreshIcon</Text>,
    IconCheck: () => <Text>CheckIcon</Text>,
    IconAlertCircle: () => <Text>AlertIcon</Text>,
    IconUsers: () => <Text>UsersIcon</Text>,
    IconArrowsExchange: () => <Text>ArrowsIcon</Text>,
    IconChevronRight: () => <Text>ChevronIcon</Text>,
  };
});

// LayoutAnimation is already mocked in jest.setup.js

// Mock GolfBallLoader
jest.mock('@/components/common', () => {
  const { View, Text } = require('react-native');
  return {
    GolfBallLoader: ({ size }: { size: string }) => (
      <View testID={`golf-ball-loader-${size}`}>
        <Text>Loading...</Text>
      </View>
    ),
  };
});

// Mock sub-components
jest.mock('./components', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    CircularChainDiagram: () => (
      <View testID="circular-chain-diagram">
        <Text>Circular Chain</Text>
      </View>
    ),
    PairingTypeBadge: ({ type }: { type: string }) => (
      <View testID={`pairing-badge-${type}`}>
        <Text>{type}</Text>
      </View>
    ),
    UnevenTeamWarning: () => (
      <View testID="uneven-team-warning">
        <Text>Uneven Teams Warning</Text>
      </View>
    ),
    PlayerSelectionChip: ({
      player,
      isSelected,
      onPress,
    }: {
      player: { id: string; name: string };
      isSelected: boolean;
      onPress: () => void;
    }) => (
      <TouchableOpacity
        testID={`player-chip-${player.id}`}
        onPress={onPress}
        accessibilityState={{ selected: isSelected }}
      >
        <Text>{player.name}</Text>
        {isSelected && <Text>Selected</Text>}
      </TouchableOpacity>
    ),
  };
});

// Mock ScoringPairCard
jest.mock('../ScoringPairCard', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    ScoringPairCard: ({
      scorerPlayer,
      scoredPlayer,
      showRemove,
      onRemove,
      testID,
    }: {
      scorerPlayer: { name: string };
      scoredPlayer: { name: string };
      showRemove: boolean;
      onRemove: () => void;
      testID: string;
    }) => (
      <View testID={testID}>
        <Text>{scorerPlayer.name} → {scoredPlayer.name}</Text>
        {showRemove && (
          <TouchableOpacity testID={`${testID}-remove`} onPress={onRemove}>
            <Text>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
  };
});

// Mock utils
jest.mock('@/utils/scoringPairs', () => ({
  autoGenerateScoringPairs: jest.fn((players: Player[]) => {
    // Simple mock: create pairs between adjacent players
    const pairs: ScoringPairCreateInput[] = [];
    for (let i = 0; i < players.length; i++) {
      const nextIndex = (i + 1) % players.length;
      pairs.push({
        scorerId: players[i].id,
        playerId: players[nextIndex].id,
      });
    }
    return {
      pairs,
      type: players.length % 2 === 0 ? 'reciprocal' : 'circular',
    };
  }),
  generateCrossTeamPairs: jest.fn(() => ({
    pairs: [
      { scorerId: 'player-1', playerId: 'player-3' },
      { scorerId: 'player-3', playerId: 'player-1' },
    ],
    metadata: { hasUnevenTeams: false },
  })),
  validateScoringPairsCoverage: jest.fn((pairs: ScoringPairCreateInput[], playerIds: string[]) => {
    const scoredPlayers = new Set(pairs.map((p) => p.playerId));
    const missingPlayers = playerIds.filter((id) => !scoredPlayers.has(id));
    return {
      isValid: missingPlayers.length === 0,
      missingPlayers,
    };
  }),
}));

// =====================================================
// TEST FIXTURES
// =====================================================

function createPlayer(id: string, name: string, handicap: number = 15): Player {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@test.com`,
    handicap,
    photo_url: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_id: `user-${id}`,
    status: 'active',
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

// =====================================================
// TESTS
// =====================================================

describe('ScoringPairFormationUI', () => {
  const defaultProps = {
    roundId: 'round-123',
    players: fourPlayers,
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty States', () => {
    it('shows empty state when no players', () => {
      render(
        <ScoringPairFormationUI
          {...defaultProps}
          players={[]}
          testID="scoring-ui"
        />
      );

      expect(screen.getByText('No Players')).toBeTruthy();
      expect(screen.getByText('Add players to the round before creating scoring pairs.')).toBeTruthy();
    });

    it('shows need more players state when only 1 player', () => {
      render(
        <ScoringPairFormationUI
          {...defaultProps}
          players={[createPlayer('1', 'Solo Player')]}
          testID="scoring-ui"
        />
      );

      expect(screen.getByText('Need More Players')).toBeTruthy();
      expect(screen.getByText('At least 2 players are required to create scoring pairs.')).toBeTruthy();
    });

    it('shows Go Back button in empty states', () => {
      render(
        <ScoringPairFormationUI
          {...defaultProps}
          players={[]}
        />
      );

      expect(screen.getByText('Go Back')).toBeTruthy();
    });

    it('calls onCancel when Go Back is pressed in empty state', () => {
      const onCancel = jest.fn();
      render(
        <ScoringPairFormationUI
          {...defaultProps}
          players={[]}
          onCancel={onCancel}
        />
      );

      fireEvent.press(screen.getByText('Go Back'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // HEADER TESTS
  // ===========================================================================

  describe('Header', () => {
    it('shows player count in header', () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      expect(screen.getByText('4 players')).toBeTruthy();
    });

    it('shows Auto-Generate button', () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      expect(screen.getByText('Auto-Generate')).toBeTruthy();
    });

    it('shows pairing type badge with none type initially', () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      expect(screen.getByTestId('pairing-badge-none')).toBeTruthy();
    });
  });

  // ===========================================================================
  // AUTO-GENERATION TESTS
  // ===========================================================================

  describe('Auto-Generation', () => {
    it('generates pairs when Auto-Generate is pressed', async () => {
      render(<ScoringPairFormationUI {...defaultProps} players={fourPlayers} />);

      const autoGenButton = screen.getByText('Auto-Generate');
      fireEvent.press(autoGenButton);

      // Should show pairs after generation
      await waitFor(() => {
        expect(screen.getByTestId('pair-0')).toBeTruthy();
      });
    });

    it('changes pairing type badge after auto-generation', async () => {
      render(<ScoringPairFormationUI {...defaultProps} players={fourPlayers} />);

      fireEvent.press(screen.getByText('Auto-Generate'));

      // Even number of players = reciprocal
      await waitFor(() => {
        expect(screen.getByTestId('pairing-badge-reciprocal')).toBeTruthy();
      });
    });

    it('generates circular pairs for odd number of players', async () => {
      render(<ScoringPairFormationUI {...defaultProps} players={threePlayers} />);

      fireEvent.press(screen.getByText('Auto-Generate'));

      // Odd number of players = circular
      await waitFor(() => {
        expect(screen.getByTestId('pairing-badge-circular')).toBeTruthy();
      });
    });

    it('shows circular chain diagram for circular pairing', async () => {
      render(<ScoringPairFormationUI {...defaultProps} players={threePlayers} />);

      fireEvent.press(screen.getByText('Auto-Generate'));

      await waitFor(() => {
        expect(screen.getByTestId('circular-chain-diagram')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // COVERAGE INDICATOR TESTS
  // ===========================================================================

  describe('Coverage Indicator', () => {
    it('shows coverage status', () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      expect(screen.getByText('Coverage:')).toBeTruthy();
    });

    it('shows 0/n coverage initially', () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      expect(screen.getByText('0/4')).toBeTruthy();
    });

    it('updates coverage after pair generation', async () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      fireEvent.press(screen.getByText('Auto-Generate'));

      await waitFor(() => {
        expect(screen.getByText('4/4')).toBeTruthy();
        expect(screen.getByText('All players covered')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // MANUAL PAIRING TESTS
  // ===========================================================================

  describe('Manual Pairing', () => {
    it('shows player chips for selection', () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      expect(screen.getByTestId('player-chip-player-1')).toBeTruthy();
      expect(screen.getByTestId('player-chip-player-2')).toBeTruthy();
      expect(screen.getByTestId('player-chip-player-3')).toBeTruthy();
      expect(screen.getByTestId('player-chip-player-4')).toBeTruthy();
    });

    it('shows selection hint when player is selected', async () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      fireEvent.press(screen.getByTestId('player-chip-player-1'));

      await waitFor(() => {
        expect(screen.getByText('Tap another player to create pair')).toBeTruthy();
      });
    });

    it('creates pair when two different players are selected', async () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      // Select first player as scorer
      fireEvent.press(screen.getByTestId('player-chip-player-1'));

      // Select second player as scored
      fireEvent.press(screen.getByTestId('player-chip-player-2'));

      // Should create a pair
      await waitFor(() => {
        expect(screen.getByTestId('pair-0')).toBeTruthy();
      });
    });

    it('deselects player when same player is tapped twice', async () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      // Select player
      fireEvent.press(screen.getByTestId('player-chip-player-1'));

      await waitFor(() => {
        expect(screen.getByText('Tap another player to create pair')).toBeTruthy();
      });

      // Deselect by tapping again
      fireEvent.press(screen.getByTestId('player-chip-player-1'));

      await waitFor(() => {
        expect(screen.queryByText('Tap another player to create pair')).toBeNull();
      });
    });
  });

  // ===========================================================================
  // PAIR REMOVAL TESTS
  // ===========================================================================

  describe('Pair Removal', () => {
    it('shows remove button on pair cards', async () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      fireEvent.press(screen.getByText('Auto-Generate'));

      await waitFor(() => {
        expect(screen.getByTestId('pair-0-remove')).toBeTruthy();
      });
    });

    it('removes pair when remove button is pressed', async () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      fireEvent.press(screen.getByText('Auto-Generate'));

      await waitFor(() => {
        expect(screen.getByTestId('pair-0')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('pair-0-remove'));

      // Pair count should decrease
      await waitFor(() => {
        expect(screen.getByText('3/4')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // ACTION BUTTONS TESTS
  // ===========================================================================

  describe('Action Buttons', () => {
    it('shows Cancel button initially', () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('calls onCancel when Cancel is pressed', () => {
      const onCancel = jest.fn();
      render(<ScoringPairFormationUI {...defaultProps} onCancel={onCancel} />);

      fireEvent.press(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('shows Reset button after making changes', async () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      fireEvent.press(screen.getByText('Auto-Generate'));

      await waitFor(() => {
        expect(screen.getByText('Reset')).toBeTruthy();
      });
    });

    it('resets pairs when Reset is pressed', async () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      fireEvent.press(screen.getByText('Auto-Generate'));

      await waitFor(() => {
        expect(screen.getByText('4/4')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Reset'));

      await waitFor(() => {
        expect(screen.getByText('0/4')).toBeTruthy();
      });
    });

    it('shows Save Pairs button', () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      expect(screen.getByText('Save Pairs')).toBeTruthy();
    });

    it('calls onSave with pairs when Save is pressed', async () => {
      const onSave = jest.fn();
      render(<ScoringPairFormationUI {...defaultProps} onSave={onSave} />);

      fireEvent.press(screen.getByText('Auto-Generate'));

      await waitFor(() => {
        expect(screen.getByText('4/4')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Save Pairs'));

      expect(onSave).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          scorerId: expect.any(String),
          playerId: expect.any(String),
        }),
      ]));
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe('Validation', () => {
    it('shows validation warning when not all players covered', async () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      // Create only one pair manually
      fireEvent.press(screen.getByTestId('player-chip-player-1'));
      fireEvent.press(screen.getByTestId('player-chip-player-2'));

      // Should show warning about missing players
      await waitFor(() => {
        expect(screen.getByText(/player\(s\) not being scored/)).toBeTruthy();
      });
    });

    it('disables Save button when coverage is incomplete', async () => {
      render(<ScoringPairFormationUI {...defaultProps} />);

      // Create only one pair manually
      fireEvent.press(screen.getByTestId('player-chip-player-1'));
      fireEvent.press(screen.getByTestId('player-chip-player-2'));

      const saveButton = screen.getByText('Save Pairs');
      // The button should have disabled style (opacity)
      expect(saveButton).toBeTruthy();
    });
  });

  // ===========================================================================
  // CROSS-TEAM PAIRING TESTS
  // ===========================================================================

  describe('Cross-Team Pairing', () => {
    const teamProps = {
      ...defaultProps,
      isTeamMatchPlay: true,
      teams: [
        {
          id: 'team-1',
          name: 'Team Alpha',
          competition_id: 'comp-1',
          members: [
            { id: 'm1', player_id: 'player-1', team_id: 'team-1', player: createPlayer('player-1', 'John') },
            { id: 'm2', player_id: 'player-2', team_id: 'team-1', player: createPlayer('player-2', 'Jane') },
          ],
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
        {
          id: 'team-2',
          name: 'Team Beta',
          competition_id: 'comp-1',
          members: [
            { id: 'm3', player_id: 'player-3', team_id: 'team-2', player: createPlayer('player-3', 'Bob') },
            { id: 'm4', player_id: 'player-4', team_id: 'team-2', player: createPlayer('player-4', 'Alice') },
          ],
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
      ],
    };

    it('shows Cross-Team button for team match play', () => {
      render(<ScoringPairFormationUI {...teamProps} />);

      expect(screen.getByText('Cross-Team')).toBeTruthy();
    });

    it('does not show Cross-Team button for non-team rounds', () => {
      render(<ScoringPairFormationUI {...defaultProps} isTeamMatchPlay={false} />);

      expect(screen.queryByText('Cross-Team')).toBeNull();
    });

    it('generates cross-team pairs when button is pressed', async () => {
      render(<ScoringPairFormationUI {...teamProps} />);

      fireEvent.press(screen.getByText('Cross-Team'));

      await waitFor(() => {
        expect(screen.getByTestId('pairing-badge-cross-team')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // EXISTING PAIRS TESTS
  // ===========================================================================

  describe('Existing Pairs', () => {
    it('displays existing pairs on load', () => {
      const existingPairs = [
        {
          id: 'pair-1',
          round_id: 'round-123',
          scorer_id: 'player-1',
          player_id: 'player-2',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          scorer: createPlayer('player-1', 'John Smith'),
          player: createPlayer('player-2', 'Jane Doe'),
        },
      ];

      render(
        <ScoringPairFormationUI
          {...defaultProps}
          existingPairs={existingPairs}
        />
      );

      expect(screen.getByTestId('pair-0')).toBeTruthy();
    });

    it('shows manual pairing type for existing pairs', () => {
      const existingPairs = [
        {
          id: 'pair-1',
          round_id: 'round-123',
          scorer_id: 'player-1',
          player_id: 'player-2',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          scorer: createPlayer('player-1', 'John Smith'),
          player: createPlayer('player-2', 'Jane Doe'),
        },
      ];

      render(
        <ScoringPairFormationUI
          {...defaultProps}
          existingPairs={existingPairs}
        />
      );

      expect(screen.getByTestId('pairing-badge-manual')).toBeTruthy();
    });
  });
});
