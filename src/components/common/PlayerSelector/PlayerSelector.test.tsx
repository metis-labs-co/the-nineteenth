/**
 * PlayerSelector Component Tests
 *
 * Tests for the unified player selection component:
 * - Rendering (selected players, players list, empty states)
 * - Search functionality
 * - Single and multi-select modes
 * - Selection/deselection
 * - Limit enforcement
 * - Locked player handling
 * - Ready badge display
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
} from '@/__tests__/utils/renderHelpers';
import { PlayerSelector } from './PlayerSelector';
import type { PlayerSelectorProps, SelectablePlayer } from './PlayerSelector.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconUsers: (props: any) => <View testID="icon-users" {...props} />,
    IconX: (props: any) => <View testID="icon-x" {...props} />,
    IconCheck: (props: any) => <View testID="icon-check" {...props} />,
    IconPlus: (props: any) => <View testID="icon-plus" {...props} />,
    IconLock: (props: any) => <View testID="icon-lock" {...props} />,
  };
});

// Mock useThemeColors
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#1B5E20',
    primaryLight: '#4CAF50',
    primaryLighter: '#E8F5E9',
    primaryDark: '#0D3B0F',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    background: '#F5F5F5',
    textPrimary: '#212121',
    textSecondary: '#757575',
    textDisabled: '#9E9E9E',
    white: '#FFFFFF',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    warning: '#FF9800',
    warningLight: '#FFF3E0',
    success: '#4CAF50',
    successLight: '#E8F5E9',
    error: '#F44336',
    errorLight: '#FFEBEE',
  }),
}));

// Mock subcomponents
jest.mock('./SelectedPlayerPill', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    SelectedPlayerPill: ({
      player,
      onRemove,
      isLocked,
    }: {
      player: { id: string; name: string };
      onRemove?: () => void;
      isLocked?: boolean;
    }) => (
      <View testID={`selected-pill-${player.id}`}>
        <Text testID={`selected-name-${player.id}`}>{player.name}</Text>
        {isLocked && <Text testID={`locked-indicator-${player.id}`}>(You)</Text>}
        {!isLocked && onRemove && (
          <TouchableOpacity
            testID={`remove-pill-${player.id}`}
            onPress={onRemove}
            accessibilityLabel={`Remove ${player.name}`}
          />
        )}
      </View>
    ),
  };
});

jest.mock('./PlayerListItem', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    PlayerListItem: ({
      player,
      isSelected,
      isDisabled,
      isLocked,
      showHandicap,
      onToggle,
      showDivider,
    }: {
      player: { id: string; name: string; handicap?: number | null };
      isSelected: boolean;
      isDisabled?: boolean;
      isLocked?: boolean;
      showHandicap?: boolean;
      onToggle: () => void;
      showDivider?: boolean;
    }) => (
      <TouchableOpacity
        testID={`player-item-${player.id}`}
        onPress={onToggle}
        disabled={isDisabled || isLocked}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected || isLocked, disabled: isDisabled || isLocked }}
      >
        <Text testID={`player-name-${player.id}`}>{player.name}</Text>
        {(isSelected || isLocked) && <Text testID={`player-selected-${player.id}`}>Selected</Text>}
        {isDisabled && <Text testID={`player-disabled-${player.id}`}>Disabled</Text>}
        {isLocked && <Text testID={`player-locked-${player.id}`}>Locked</Text>}
        {showHandicap && player.handicap !== null && (
          <Text testID={`player-handicap-${player.id}`}>HC: {player.handicap}</Text>
        )}
        {showDivider && <View testID={`player-divider-${player.id}`} />}
      </TouchableOpacity>
    ),
  };
});

jest.mock('@/components/common/SearchBar', () => {
  const { TextInput, View } = require('react-native');
  return {
    SearchBar: ({
      value,
      onChangeText,
      placeholder,
      accessibilityLabel,
    }: {
      value: string;
      onChangeText: (text: string) => void;
      placeholder?: string;
      accessibilityLabel?: string;
    }) => (
      <View testID="search-bar-container">
        <TextInput
          testID="search-bar"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    ),
  };
});

jest.mock('@/components/common/LoadingSpinner', () => {
  const { View, Text } = require('react-native');
  return {
    LoadingSpinner: ({ size }: { size?: string }) => (
      <View testID={`loading-spinner-${size || 'default'}`}>
        <Text>Loading...</Text>
      </View>
    ),
  };
});

jest.mock('@/components/subscription/LimitIndicator', () => {
  const { View, Text } = require('react-native');
  return {
    LimitIndicator: ({
      current,
      max,
      label,
      showBar,
    }: {
      current: number;
      max: number;
      label: string;
      showBar?: boolean;
    }) => (
      <View testID="limit-indicator">
        <Text testID="limit-indicator-text">
          {label}: {current}/{max}
        </Text>
        {showBar && <View testID="limit-indicator-bar" />}
      </View>
    ),
  };
});

// ============================================================================
// TEST DATA
// ============================================================================

const mockPlayers: SelectablePlayer[] = [
  { id: 'player-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: 'https://example.com/john.jpg' },
  { id: 'player-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
  { id: 'player-3', name: 'Bob Wilson', email: 'bob@example.com', handicap: 8, photo_url: null },
  { id: 'player-4', name: 'Alice Brown', email: 'alice@example.com', handicap: 22, photo_url: null },
];

const defaultProps: PlayerSelectorProps = {
  players: mockPlayers,
  selectedIds: [],
  onSelect: jest.fn(),
  testID: 'player-selector',
};

// ============================================================================
// TESTS
// ============================================================================

describe('PlayerSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Rendering Tests
  // --------------------------------------------------------------------------
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PlayerSelector {...defaultProps} />);
      expect(screen.getByTestId('player-selector')).toBeTruthy();
    });

    it('renders search bar by default', () => {
      render(<PlayerSelector {...defaultProps} />);
      expect(screen.getByTestId('search-bar')).toBeTruthy();
    });

    it('hides search bar when searchable is false', () => {
      render(<PlayerSelector {...defaultProps} searchable={false} />);
      expect(screen.queryByTestId('search-bar')).toBeNull();
    });

    it('renders players list', () => {
      render(<PlayerSelector {...defaultProps} />);
      mockPlayers.forEach((player) => {
        expect(screen.getByTestId(`player-item-${player.id}`)).toBeTruthy();
      });
    });

    it('renders selected players pills in multiSelect mode', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1']}
        />
      );
      expect(screen.getByTestId('selected-pill-player-1')).toBeTruthy();
      expect(screen.getByTestId('selected-name-player-1').children[0]).toBe('John Smith');
    });

    it('renders selected section even in single-select when player selected', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          selectedIds={['player-1']}
        />
      );
      expect(screen.getByTestId('selected-pill-player-1')).toBeTruthy();
    });

    it('does not render selected section when no selection in single-select', () => {
      render(<PlayerSelector {...defaultProps} />);
      expect(screen.queryByText('No players selected yet')).toBeNull();
    });

    it('renders empty selection message in multiSelect mode', () => {
      render(<PlayerSelector {...defaultProps} multiSelect />);
      expect(screen.getByText('No players selected yet')).toBeTruthy();
    });

    it('renders custom selected title', () => {
      render(<PlayerSelector {...defaultProps} multiSelect selectedTitle="PARTNERS" />);
      expect(screen.getByText('PARTNERS')).toBeTruthy();
    });

    it('renders list title when provided', () => {
      render(<PlayerSelector {...defaultProps} listTitle="Choose your partners" />);
      expect(screen.getByText('Choose your partners')).toBeTruthy();
    });

    it('shows handicap by default', () => {
      render(<PlayerSelector {...defaultProps} />);
      expect(screen.getByTestId('player-handicap-player-1')).toBeTruthy();
    });

    it('hides handicap when showHandicap is false', () => {
      render(<PlayerSelector {...defaultProps} showHandicap={false} />);
      expect(screen.queryByTestId('player-handicap-player-1')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Loading State Tests
  // --------------------------------------------------------------------------
  describe('Loading State', () => {
    it('shows loading spinner when loading is true', () => {
      render(<PlayerSelector {...defaultProps} loading />);
      expect(screen.getByTestId('loading-spinner-lg')).toBeTruthy();
    });

    it('does not show players list when loading', () => {
      render(<PlayerSelector {...defaultProps} loading />);
      expect(screen.queryByTestId('player-item-player-1')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Empty States Tests
  // --------------------------------------------------------------------------
  describe('Empty States', () => {
    it('shows empty message when no players', () => {
      render(<PlayerSelector {...defaultProps} players={[]} />);
      expect(screen.getByText('No players available')).toBeTruthy();
    });

    it('shows custom empty message', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          players={[]}
          emptyMessage="No golfers found"
        />
      );
      expect(screen.getByText('No golfers found')).toBeTruthy();
    });

    it('shows empty search message when search has no results', () => {
      // Simulate internal search by searching for something not in the list
      render(<PlayerSelector {...defaultProps} />);
      fireEvent.changeText(screen.getByTestId('search-bar'), 'xyz');
      expect(screen.getByText('No players found')).toBeTruthy();
    });

    it('shows custom empty search message', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          emptySearchMessage="No matches"
        />
      );
      fireEvent.changeText(screen.getByTestId('search-bar'), 'xyz');
      expect(screen.getByText('No matches')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Search Functionality Tests
  // --------------------------------------------------------------------------
  describe('Search Functionality', () => {
    it('filters players by name', () => {
      render(<PlayerSelector {...defaultProps} />);
      fireEvent.changeText(screen.getByTestId('search-bar'), 'john');
      expect(screen.getByTestId('player-item-player-1')).toBeTruthy();
      expect(screen.queryByTestId('player-item-player-2')).toBeNull();
    });

    it('filters players by email', () => {
      render(<PlayerSelector {...defaultProps} />);
      fireEvent.changeText(screen.getByTestId('search-bar'), 'jane@');
      expect(screen.getByTestId('player-item-player-2')).toBeTruthy();
      expect(screen.queryByTestId('player-item-player-1')).toBeNull();
    });

    it('search is case insensitive', () => {
      render(<PlayerSelector {...defaultProps} />);
      fireEvent.changeText(screen.getByTestId('search-bar'), 'JOHN');
      expect(screen.getByTestId('player-item-player-1')).toBeTruthy();
    });

    it('shows all players when search query is empty', () => {
      render(<PlayerSelector {...defaultProps} />);
      fireEvent.changeText(screen.getByTestId('search-bar'), '');
      mockPlayers.forEach((player) => {
        expect(screen.getByTestId(`player-item-${player.id}`)).toBeTruthy();
      });
    });

    it('shows all players when search query is whitespace', () => {
      render(<PlayerSelector {...defaultProps} />);
      fireEvent.changeText(screen.getByTestId('search-bar'), '   ');
      mockPlayers.forEach((player) => {
        expect(screen.getByTestId(`player-item-${player.id}`)).toBeTruthy();
      });
    });

    it('uses custom search placeholder', () => {
      render(<PlayerSelector {...defaultProps} searchPlaceholder="Find golfers..." />);
      expect(screen.getByPlaceholderText('Find golfers...')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Single Select Mode Tests
  // --------------------------------------------------------------------------
  describe('Single Select Mode', () => {
    it('selects a player', () => {
      const onSelect = jest.fn();
      render(<PlayerSelector {...defaultProps} onSelect={onSelect} />);
      fireEvent.press(screen.getByTestId('player-item-player-1'));
      expect(onSelect).toHaveBeenCalledWith(['player-1']);
    });

    it('replaces selection when selecting new player', () => {
      const onSelect = jest.fn();
      render(
        <PlayerSelector
          {...defaultProps}
          onSelect={onSelect}
          selectedIds={['player-1']}
        />
      );
      fireEvent.press(screen.getByTestId('player-item-player-2'));
      expect(onSelect).toHaveBeenCalledWith(['player-2']);
    });

    it('deselects player when clicking again', () => {
      const onSelect = jest.fn();
      render(
        <PlayerSelector
          {...defaultProps}
          onSelect={onSelect}
          selectedIds={['player-1']}
        />
      );
      fireEvent.press(screen.getByTestId('player-item-player-1'));
      expect(onSelect).toHaveBeenCalledWith([]);
    });

    it('marks selected player in the list', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          selectedIds={['player-1']}
        />
      );
      expect(screen.getByTestId('player-selected-player-1')).toBeTruthy();
      expect(screen.queryByTestId('player-selected-player-2')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Multi Select Mode Tests
  // --------------------------------------------------------------------------
  describe('Multi Select Mode', () => {
    it('adds player to selection', () => {
      const onSelect = jest.fn();
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          onSelect={onSelect}
        />
      );
      fireEvent.press(screen.getByTestId('player-item-player-1'));
      expect(onSelect).toHaveBeenCalledWith(['player-1']);
    });

    it('adds multiple players to selection', () => {
      const onSelect = jest.fn();
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1']}
          onSelect={onSelect}
        />
      );
      fireEvent.press(screen.getByTestId('player-item-player-2'));
      expect(onSelect).toHaveBeenCalledWith(['player-1', 'player-2']);
    });

    it('removes player from selection when clicking again', () => {
      const onSelect = jest.fn();
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          onSelect={onSelect}
        />
      );
      fireEvent.press(screen.getByTestId('player-item-player-1'));
      expect(onSelect).toHaveBeenCalledWith(['player-2']);
    });

    it('removes player via pill remove button', () => {
      const onSelect = jest.fn();
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          onSelect={onSelect}
        />
      );
      fireEvent.press(screen.getByTestId('remove-pill-player-1'));
      expect(onSelect).toHaveBeenCalledWith(['player-2']);
    });

    it('renders multiple selected pills', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
        />
      );
      expect(screen.getByTestId('selected-pill-player-1')).toBeTruthy();
      expect(screen.getByTestId('selected-pill-player-2')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Limit Enforcement Tests
  // --------------------------------------------------------------------------
  describe('Limit Enforcement', () => {
    it('shows limit indicator when configured', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          maxSelections={4}
          showLimitIndicator
        />
      );
      expect(screen.getByTestId('limit-indicator')).toBeTruthy();
      expect(screen.getByText('Selected: 0/4')).toBeTruthy();
    });

    it('shows correct count in limit indicator', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1']}
          maxSelections={4}
          showLimitIndicator
        />
      );
      expect(screen.getByText('Selected: 1/4')).toBeTruthy();
    });

    it('uses custom limit indicator label', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          maxSelections={4}
          showLimitIndicator
          limitIndicatorLabel="Players"
        />
      );
      expect(screen.getByText('Players: 0/4')).toBeTruthy();
    });

    it('disables unselected players when at limit', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          maxSelections={2}
        />
      );
      expect(screen.getByTestId('player-disabled-player-3')).toBeTruthy();
      expect(screen.getByTestId('player-disabled-player-4')).toBeTruthy();
    });

    it('does not disable selected players when at limit', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          maxSelections={2}
        />
      );
      expect(screen.queryByTestId('player-disabled-player-1')).toBeNull();
      expect(screen.queryByTestId('player-disabled-player-2')).toBeNull();
    });

    it('prevents adding new player when at limit', () => {
      const onSelect = jest.fn();
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          maxSelections={2}
          onSelect={onSelect}
        />
      );
      fireEvent.press(screen.getByTestId('player-item-player-3'));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('shows approaching limit warning', () => {
      // 4/5 = 80% which triggers the warning
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2', 'player-3', 'player-4']}
          maxSelections={5}
        />
      );
      expect(screen.getByText('Approaching limit (4/5)')).toBeTruthy();
    });

    it('shows at limit warning', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          maxSelections={2}
        />
      );
      expect(screen.getByText('Maximum selection reached (2)')).toBeTruthy();
    });

    it('does not show limit warnings when no limit set', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
        />
      );
      expect(screen.queryByText(/Maximum selection reached/)).toBeNull();
      expect(screen.queryByText(/Approaching limit/)).toBeNull();
    });

    it('respects limits prop for max', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          limits={{ max: 2 }}
          showLimitIndicator
        />
      );
      expect(screen.getByText('Selected: 2/2')).toBeTruthy();
      expect(screen.getByText('Maximum selection reached (2)')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Locked Player Tests
  // --------------------------------------------------------------------------
  describe('Locked Players', () => {
    it('shows locked indicator for locked players', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1']}
          lockedPlayerIds={['player-1']}
        />
      );
      expect(screen.getByTestId('player-locked-player-1')).toBeTruthy();
      expect(screen.getByTestId('locked-indicator-player-1')).toBeTruthy();
    });

    it('does not show remove button for locked pill', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1']}
          lockedPlayerIds={['player-1']}
        />
      );
      expect(screen.queryByTestId('remove-pill-player-1')).toBeNull();
    });

    it('prevents toggling locked player via list item', () => {
      const onSelect = jest.fn();
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1']}
          lockedPlayerIds={['player-1']}
          onSelect={onSelect}
        />
      );
      fireEvent.press(screen.getByTestId('player-item-player-1'));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('prevents removing locked player via chip', () => {
      const onSelect = jest.fn();
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          lockedPlayerIds={['player-1']}
          onSelect={onSelect}
        />
      );
      // locked player-1 won't have remove button, but try removing player-2
      fireEvent.press(screen.getByTestId('remove-pill-player-2'));
      expect(onSelect).toHaveBeenCalledWith(['player-1']);
    });
  });

  // --------------------------------------------------------------------------
  // Ready Badge Tests
  // --------------------------------------------------------------------------
  describe('Ready Badge', () => {
    it('shows ready badge when minimum is met and showReadyBadge is true', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          limits={{ min: 2, max: 4 }}
          showReadyBadge
        />
      );
      expect(screen.getByText('Ready')).toBeTruthy();
    });

    it('does not show ready badge when minimum is not met', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1']}
          limits={{ min: 2, max: 4 }}
          showReadyBadge
        />
      );
      expect(screen.queryByText('Ready')).toBeNull();
    });

    it('does not show ready badge when at limit', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          limits={{ min: 2, max: 2 }}
          showReadyBadge
        />
      );
      // At limit shows limit warning, not ready badge
      expect(screen.queryByText('Ready')).toBeNull();
    });

    it('does not show ready badge when showReadyBadge is false', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          limits={{ min: 2, max: 4 }}
          showReadyBadge={false}
        />
      );
      expect(screen.queryByText('Ready')).toBeNull();
    });

    it('does not show ready badge when min is 0', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={[]}
          limits={{ min: 0, max: 4 }}
          showReadyBadge
        />
      );
      // min: 0 means always meets minimum, but we only show badge when min > 0
      expect(screen.queryByText('Ready')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Divider Tests
  // --------------------------------------------------------------------------
  describe('Dividers', () => {
    it('shows dividers between players except last', () => {
      render(<PlayerSelector {...defaultProps} />);
      expect(screen.getByTestId('player-divider-player-1')).toBeTruthy();
      expect(screen.getByTestId('player-divider-player-2')).toBeTruthy();
      expect(screen.getByTestId('player-divider-player-3')).toBeTruthy();
      expect(screen.queryByTestId('player-divider-player-4')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases Tests
  // --------------------------------------------------------------------------
  describe('Edge Cases', () => {
    it('handles players without email', () => {
      const playersWithoutEmail: SelectablePlayer[] = [
        { id: 'player-no-email', name: 'No Email', email: null, handicap: 10, photo_url: null },
      ];
      render(<PlayerSelector {...defaultProps} players={playersWithoutEmail} />);
      expect(screen.getByTestId('player-item-player-no-email')).toBeTruthy();
    });

    it('handles players without handicap', () => {
      const playersWithoutHandicap: SelectablePlayer[] = [
        { id: 'player-no-hcp', name: 'No Handicap', email: 'test@test.com', handicap: null, photo_url: null },
      ];
      render(<PlayerSelector {...defaultProps} players={playersWithoutHandicap} showHandicap />);
      expect(screen.getByTestId('player-item-player-no-hcp')).toBeTruthy();
      expect(screen.queryByTestId('player-handicap-player-no-hcp')).toBeNull();
    });

    it('handles empty selected ids array', () => {
      render(<PlayerSelector {...defaultProps} multiSelect selectedIds={[]} />);
      expect(screen.getByText('No players selected yet')).toBeTruthy();
    });

    it('handles rapid selection/deselection', () => {
      const onSelect = jest.fn();
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          onSelect={onSelect}
        />
      );
      fireEvent.press(screen.getByTestId('player-item-player-1'));
      fireEvent.press(screen.getByTestId('player-item-player-2'));
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it('handles selected ids not in players list gracefully', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['non-existent-id']}
        />
      );
      // Should not crash, but also won't show the pill since player doesn't exist
      expect(screen.queryByTestId('selected-pill-non-existent-id')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------
  describe('Accessibility', () => {
    it('has accessible search bar', () => {
      render(<PlayerSelector {...defaultProps} />);
      expect(screen.getByLabelText('Search players')).toBeTruthy();
    });

    it('player items have checkbox role', () => {
      render(<PlayerSelector {...defaultProps} />);
      const playerItem = screen.getByTestId('player-item-player-1');
      expect(playerItem.props.accessibilityRole).toBe('checkbox');
    });

    it('player items have correct checked state', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          selectedIds={['player-1']}
        />
      );
      const selectedItem = screen.getByTestId('player-item-player-1');
      const unselectedItem = screen.getByTestId('player-item-player-2');

      expect(selectedItem.props.accessibilityState.checked).toBe(true);
      expect(unselectedItem.props.accessibilityState.checked).toBe(false);
    });

    it('player items have correct disabled state', () => {
      render(
        <PlayerSelector
          {...defaultProps}
          multiSelect
          selectedIds={['player-1', 'player-2']}
          maxSelections={2}
        />
      );
      const disabledItem = screen.getByTestId('player-item-player-3');
      expect(disabledItem.props.accessibilityState.disabled).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TestID Tests
  // --------------------------------------------------------------------------
  describe('Test IDs', () => {
    it('applies custom testID to container', () => {
      render(<PlayerSelector {...defaultProps} testID="custom-selector" />);
      expect(screen.getByTestId('custom-selector')).toBeTruthy();
    });

    it('renders without testID', () => {
      render(<PlayerSelector {...defaultProps} testID={undefined} />);
      // Component should still render - check for the player list
      expect(screen.getByTestId('player-item-player-1')).toBeTruthy();
    });
  });
});
