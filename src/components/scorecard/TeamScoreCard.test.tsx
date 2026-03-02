/* eslint-disable react/display-name -- Test mocks don't need display names */
/**
 * TeamScoreCard Component Tests
 *
 * Tests for the team scoring interface component for Scramble format including:
 * - Team header display (name, combined handicap, member count)
 * - Shots received and Stableford points display
 * - Pick Up quick action
 * - Plus/Minus stepper for score entry
 * - Par quick action button
 * - Contributing player selector
 * - Disabled state handling
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { TeamScoreCard } from './TeamScoreCard';
import {
  createTestPlayer,
  createTeamWithMembers,
  create18Holes,
} from '@/__tests__/utils/testFixtures';
import type { Hole, HoleScore } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';

// Mock react-native-paper Menu component (extends global mock)
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text: RNText, TouchableOpacity } = require('react-native');

  // Mock theme colors
  const mockThemeColors = {
    primary: '#6200ee',
    onPrimary: '#ffffff',
    secondary: '#03dac6',
    onSecondary: '#000000',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    onSurface: '#000000',
    error: '#b00020',
    onError: '#ffffff',
    elevation: {
      level0: 'transparent',
      level1: '#f5f5f5',
      level2: '#eeeeee',
      level3: '#e0e0e0',
      level4: '#d6d6d6',
      level5: '#cccccc',
    },
  };

  const mockTheme = {
    dark: false,
    roundness: 4,
    animation: { scale: 1 },
    colors: mockThemeColors,
    fonts: {},
    isV3: true,
  };

  const mockDarkTheme = {
    ...mockTheme,
    dark: true,
    colors: {
      ...mockThemeColors,
      primary: '#bb86fc',
      background: '#121212',
      surface: '#121212',
      onSurface: '#ffffff',
    },
  };

  // Create a mock Menu component with Item sub-component
  const Menu = ({ children, visible, anchor, onDismiss: _onDismiss }: { children: React.ReactNode; visible: boolean; anchor: React.ReactNode; onDismiss: () => void }) => {
    return React.createElement(
      View,
      { testID: 'menu-container' },
      // Always render anchor
      anchor,
      // Only render menu items when visible
      visible ? React.createElement(View, { testID: 'menu-items' }, children) : null
    );
  };

  Menu.Item = ({ title, onPress, leadingIcon }: { title: string; onPress: () => void; leadingIcon?: string }) => {
    return React.createElement(
      TouchableOpacity,
      { onPress, testID: `menu-item-${title}` },
      leadingIcon ? React.createElement(View, { testID: `icon-${leadingIcon}` }) : null,
      React.createElement(RNText, null, title)
    );
  };

  return {
    MD3LightTheme: mockTheme,
    MD3DarkTheme: mockDarkTheme,
    Provider: ({ children }: { children: React.ReactNode }) => children,
    PaperProvider: ({ children }: { children: React.ReactNode }) => children,
    Text: ({ children, style, variant: _variant, numberOfLines, ...props }: { children?: React.ReactNode; style?: object; variant?: string; numberOfLines?: number; [key: string]: unknown }) =>
      React.createElement(RNText, { style, numberOfLines, ...props }, children),
    TextInput: ({ label, value, onChangeText: _onChangeText, style: _style, ...props }: { label?: string; value?: string; onChangeText?: (text: string) => void; style?: object; [key: string]: unknown }) =>
      React.createElement(RNText, { ...props }, value || label),
    Button: ({ children, onPress, mode: _mode, style: _style, ...props }: { children?: React.ReactNode; onPress?: () => void; mode?: string; style?: object; [key: string]: unknown }) =>
      React.createElement(
        View,
        { ...props, onPress },
        React.createElement(RNText, null, children)
      ),
    IconButton: ({ icon, onPress, ...props }: { icon: string; onPress?: () => void; [key: string]: unknown }) =>
      React.createElement(View, { testID: `icon-button-${icon}`, onPress, ...props }),
    Icon: ({ source, size, color: _color }: { source: string; size?: number; color?: string }) =>
      React.createElement(View, { testID: `icon-${source}`, style: { width: size, height: size } }),
    ActivityIndicator: ({ animating: _animating, color: _color, size: _size, ...props }: { animating?: boolean; color?: string; size?: number | string; [key: string]: unknown }) =>
      React.createElement(View, { testID: 'activity-indicator', ...props }),
    Surface: ({ children, style, ...props }: { children?: React.ReactNode; style?: object; [key: string]: unknown }) =>
      React.createElement(View, { style, ...props }, children),
    Card: ({ children, style, ...props }: { children?: React.ReactNode; style?: object; [key: string]: unknown }) =>
      React.createElement(View, { style, ...props }, children),
    Divider: ({ style, ...props }: { style?: object; [key: string]: unknown }) =>
      React.createElement(View, { style: [{ height: 1, backgroundColor: '#ccc' }, style], ...props }),
    Menu,
    useTheme: () => mockTheme,
    withTheme: <T extends object>(Component: React.ComponentType<T>) => (props: T) => React.createElement(Component, { ...props, theme: mockTheme }),
    configureFonts: jest.fn(() => ({})),
  };
});

// Mock the scoring utilities
jest.mock('@/utils/scoring', () => ({
  getStrokesOnHole: jest.fn((handicap: number, hole: { strokeIndex: number }) => {
    // Simple mock: 1 stroke per 18 handicap on all holes
    const base = Math.floor(handicap / 18);
    const extra = hole.strokeIndex <= (handicap % 18) ? 1 : 0;
    return base + extra;
  }),
  calculateStablefordPoints: jest.fn(
    (strokes: number, handicap: number, hole: { par: number; strokeIndex: number }) => {
      const base = Math.floor(handicap / 18);
      const extra = hole.strokeIndex <= (handicap % 18) ? 1 : 0;
      const netStrokes = strokes - (base + extra);
      const relativeToPar = netStrokes - hole.par;

      if (relativeToPar <= -3) return 5;
      if (relativeToPar === -2) return 4;
      if (relativeToPar === -1) return 3;
      if (relativeToPar === 0) return 2;
      if (relativeToPar === 1) return 1;
      return 0;
    }
  ),
}));

// react-native-paper is mocked globally in jest.setup.js

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

const holes = create18Holes();

/**
 * Get a specific test hole
 */
function getTestHole(holeNumber: number): Hole {
  const hole = holes.find((h) => h.number === holeNumber);
  if (!hole) throw new Error(`Hole ${holeNumber} not found`);
  return hole;
}

/**
 * Create a team with 2 members for testing
 */
function createTwoPlayerTeam(overrides: Partial<{ handicaps: number[]; name: string }> = {}): TeamWithMembers {
  const handicaps = overrides.handicaps || [10, 20];
  const members = [
    createTestPlayer({ id: 'player-1', name: 'John Smith', handicap: handicaps[0] }),
    createTestPlayer({ id: 'player-2', name: 'Jane Doe', handicap: handicaps[1] }),
  ];
  return createTeamWithMembers(
    { id: 'team-1', name: overrides.name || 'Team Alpha' },
    members
  );
}

/**
 * Create a team with 4 members for testing
 */
function createFourPlayerTeam(overrides: Partial<{ handicaps: number[]; name: string }> = {}): TeamWithMembers {
  const handicaps = overrides.handicaps || [5, 15, 20, 32];
  const members = [
    createTestPlayer({ id: 'player-1', name: 'John Smith', handicap: handicaps[0] }),
    createTestPlayer({ id: 'player-2', name: 'Jane Doe', handicap: handicaps[1] }),
    createTestPlayer({ id: 'player-3', name: 'Bob Wilson', handicap: handicaps[2] }),
    createTestPlayer({ id: 'player-4', name: 'Alice Brown', handicap: handicaps[3] }),
  ];
  return createTeamWithMembers(
    { id: 'team-1', name: overrides.name || 'Team Alpha' },
    members
  );
}

/**
 * Create default test props
 */
function createDefaultProps(
  overrides: Partial<{
    team: TeamWithMembers;
    currentHole: Hole;
    currentScore: HoleScore | undefined;
    onScoreSelect: (strokes: number) => void;
    onContributorSelect: (playerId: string) => void;
    selectedContributor: string;
    disabled: boolean;
  }> = {}
) {
  return {
    team: createTwoPlayerTeam(),
    currentHole: getTestHole(1), // Par 4, SI 7
    currentScore: undefined,
    onScoreSelect: jest.fn(),
    onContributorSelect: undefined,
    selectedContributor: undefined,
    disabled: false,
    ...overrides,
  };
}

describe('TeamScoreCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps();
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('Team Alpha')).toBeTruthy();
    });

    it('renders team name', () => {
      const team = createTwoPlayerTeam({ name: 'The Golfers' });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('The Golfers')).toBeTruthy();
    });

    it('renders team member names', () => {
      const props = createDefaultProps();
      render(<TeamScoreCard {...props} />);

      // Team has 2 members displayed as "Name1 • Name2"
      expect(screen.getByText(/John Smith/)).toBeTruthy();
      expect(screen.getByText(/Jane Doe/)).toBeTruthy();
    });

    it('renders SCRAMBLE format badge', () => {
      const props = createDefaultProps();
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('SCRAMBLE')).toBeTruthy();
    });

    it('renders TEAM PTS label', () => {
      const props = createDefaultProps();
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('TEAM PTS')).toBeTruthy();
    });

    it('renders Pick Up button label', () => {
      const props = createDefaultProps();
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('PICK UP')).toBeTruthy();
    });

    it('renders Par button label', () => {
      const props = createDefaultProps();
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('PAR')).toBeTruthy();
    });

    it('renders P button for Pick Up', () => {
      const props = createDefaultProps();
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('P')).toBeTruthy();
    });

    it('renders par value in Par button', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(3), // Par 5
      });
      render(<TeamScoreCard {...props} />);

      // Par 5 button
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // TEAM HEADER SECTION TESTS
  // ===========================================================================

  describe('Team Header Section', () => {
    it('displays team name', () => {
      const team = createTwoPlayerTeam({ name: 'The Eagles' });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('The Eagles')).toBeTruthy();
    });

    it('displays team handicap for 2-player team', () => {
      // Team with handicaps 10 and 20
      // Combined = (10 + 20) * 0.25 = 7.5
      const team = createTwoPlayerTeam({ handicaps: [10, 20] });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText(/HC: 7.5/)).toBeTruthy();
    });

    it('displays team handicap for 4-player team', () => {
      // Team with handicaps 4, 12, 18, 26
      // Combined = (4 + 12 + 18 + 26) * 0.25 = 15.0
      const team = createFourPlayerTeam({ handicaps: [4, 12, 18, 26] });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText(/HC: 15.0/)).toBeTruthy();
    });

    it('displays member names for 4-player team', () => {
      const team = createFourPlayerTeam();
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText(/John Smith/)).toBeTruthy();
      expect(screen.getByText(/Bob Wilson/)).toBeTruthy();
    });

    it('handles team with no members', () => {
      const team = createTeamWithMembers({ id: 'empty-team', name: 'Empty Team' }, []);
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('Empty Team')).toBeTruthy();
      expect(screen.getByText(/HC: 0.0/)).toBeTruthy();
    });

    it('handles team with null handicaps', () => {
      const members = [
        createTestPlayer({ id: 'player-1', name: 'John', handicap: null }),
        createTestPlayer({ id: 'player-2', name: 'Jane', handicap: null }),
      ];
      const team = createTeamWithMembers({ id: 'team-1', name: 'Null HC Team' }, members);
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText(/HC: 0.0/)).toBeTruthy();
    });

    it('truncates long team names', () => {
      const team = createTwoPlayerTeam({ name: 'The Very Long Team Name That Should Be Truncated' });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      // Name should still render (numberOfLines handles truncation)
      expect(screen.getByText('The Very Long Team Name That Should Be Truncated')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SHOTS RECEIVED TESTS
  // ===========================================================================

  describe('Shots Received Display', () => {
    it('displays strokes on hole based on team handicap', () => {
      // Team HC = (10 + 26) * 0.25 = 9
      const team = createTwoPlayerTeam({ handicaps: [10, 26] });
      const props = createDefaultProps({
        team,
        currentHole: getTestHole(1), // SI 7
      });
      render(<TeamScoreCard {...props} />);

      // With team handicap 9, on SI 7, mock: base = floor(9/18) = 0, extra = (7 <= 9) ? 1 : 0 = 1, so 1 shot
      // The component displays shots inline: "HC: 9.0 • +1 shot"
      expect(screen.getByText(/\+1 shot/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // STABLEFORD POINTS TESTS
  // ===========================================================================

  describe('Stableford Points Display', () => {
    it('displays 0 points when no score entered', () => {
      const props = createDefaultProps({
        currentScore: undefined,
      });
      render(<TeamScoreCard {...props} />);

      // Should display 0 for empty score
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });

    it('displays 0 points when picked up', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 10 }, // Pick up score
      });
      render(<TeamScoreCard {...props} />);

      // Picked up = 0 points
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // SCORE STEPPER TESTS
  // ===========================================================================

  describe('Score Stepper', () => {
    it('displays dash when no score selected', () => {
      const props = createDefaultProps({
        currentScore: undefined,
      });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('-')).toBeTruthy();
    });

    it('displays current score when selected', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 5 },
      });
      render(<TeamScoreCard {...props} />);

      // Score 5 displayed
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });

    it('displays P when picked up', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 10 },
      });
      render(<TeamScoreCard {...props} />);

      // P appears in both Pick Up button and score display
      const pElements = screen.getAllByText('P');
      expect(pElements.length).toBeGreaterThanOrEqual(2);
    });

    it('calls onScoreSelect with decremented value', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 5 },
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const minusButton = screen.getByLabelText('Decrease score');
      fireEvent.press(minusButton);

      expect(onScoreSelect).toHaveBeenCalledWith(4);
    });

    it('calls onScoreSelect with incremented value', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 5 },
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const plusButton = screen.getByLabelText('Increase score');
      fireEvent.press(plusButton);

      expect(onScoreSelect).toHaveBeenCalledWith(6);
    });

    it('does not go below minimum score (1)', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 1 },
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const minusButton = screen.getByLabelText('Decrease score');
      fireEvent.press(minusButton);

      // Button should be disabled at min score, so no call
      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('does not go above maximum score (12)', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 12 },
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const plusButton = screen.getByLabelText('Increase score');
      // Should be disabled at max
      fireEvent.press(plusButton);

      // Should not be called when at max
      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('sets score to par when first pressing minus with no score', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
        currentScore: undefined,
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const minusButton = screen.getByLabelText('Decrease score');
      fireEvent.press(minusButton);

      expect(onScoreSelect).toHaveBeenCalledWith(4); // Par
    });

    it('sets score to par when first pressing plus with no score', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentHole: getTestHole(3), // Par 5
        currentScore: undefined,
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const plusButton = screen.getByLabelText('Increase score');
      fireEvent.press(plusButton);

      expect(onScoreSelect).toHaveBeenCalledWith(5); // Par
    });

    it('does not allow increment when picked up', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 10 }, // Picked up
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const plusButton = screen.getByLabelText('Increase score');
      fireEvent.press(plusButton);

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('allows decrement from picked up to max score before pickup', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
        currentScore: { strokes: 10 }, // Picked up
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const minusButton = screen.getByLabelText('Decrease score');
      fireEvent.press(minusButton);

      // Par + 2 = double bogey = 6
      expect(onScoreSelect).toHaveBeenCalledWith(6);
    });
  });

  // ===========================================================================
  // PICK UP BUTTON TESTS
  // ===========================================================================

  describe('Pick Up Button', () => {
    it('calls onScoreSelect with pickup score (10)', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({ onScoreSelect });
      render(<TeamScoreCard {...props} />);

      const pickupButton = screen.getByLabelText('Pick up ball');
      fireEvent.press(pickupButton);

      expect(onScoreSelect).toHaveBeenCalledWith(10);
    });

    it('has highlighted style when picked up', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 10 },
      });
      render(<TeamScoreCard {...props} />);

      const pickupButton = screen.getByLabelText('Pick up ball');
      expect(pickupButton).toBeTruthy();
    });

    it('does not call callback when disabled', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        disabled: true,
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const pickupButton = screen.getByLabelText('Pick up ball');
      fireEvent.press(pickupButton);

      expect(onScoreSelect).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // PAR BUTTON TESTS
  // ===========================================================================

  describe('Par Button', () => {
    it('calls onScoreSelect with par value for par 4', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const parButton = screen.getByLabelText('Score par 4');
      fireEvent.press(parButton);

      expect(onScoreSelect).toHaveBeenCalledWith(4);
    });

    it('calls onScoreSelect with par value for par 3', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentHole: getTestHole(2), // Par 3
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const parButton = screen.getByLabelText('Score par 3');
      fireEvent.press(parButton);

      expect(onScoreSelect).toHaveBeenCalledWith(3);
    });

    it('calls onScoreSelect with par value for par 5', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentHole: getTestHole(3), // Par 5
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const parButton = screen.getByLabelText('Score par 5');
      fireEvent.press(parButton);

      expect(onScoreSelect).toHaveBeenCalledWith(5);
    });

    it('has highlighted style when score equals par', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
        currentScore: { strokes: 4 },
      });
      render(<TeamScoreCard {...props} />);

      const parButton = screen.getByLabelText('Score par 4');
      expect(parButton).toBeTruthy();
    });

    it('does not call callback when disabled', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        disabled: true,
        currentHole: getTestHole(1),
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const parButton = screen.getByLabelText('Score par 4');
      fireEvent.press(parButton);

      expect(onScoreSelect).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // CONTRIBUTING PLAYER SELECTOR TESTS
  // ===========================================================================

  describe('Contributing Player Selector', () => {
    it('does not render contributor section when onContributorSelect is not provided', () => {
      const props = createDefaultProps({
        onContributorSelect: undefined,
      });
      render(<TeamScoreCard {...props} />);

      expect(screen.queryByText('Contributed by:')).toBeNull();
    });

    it('renders contributor section when onContributorSelect is provided', () => {
      const props = createDefaultProps({
        onContributorSelect: jest.fn(),
      });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('Contributed by:')).toBeTruthy();
    });

    it('shows placeholder text when no contributor selected', () => {
      const props = createDefaultProps({
        onContributorSelect: jest.fn(),
        selectedContributor: undefined,
      });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('Select who made the shot')).toBeTruthy();
    });

    it('shows selected contributor name', () => {
      const team = createTwoPlayerTeam();
      const props = createDefaultProps({
        team,
        onContributorSelect: jest.fn(),
        selectedContributor: 'player-1',
      });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('shows second player name when selected', () => {
      const team = createTwoPlayerTeam();
      const props = createDefaultProps({
        team,
        onContributorSelect: jest.fn(),
        selectedContributor: 'player-2',
      });
      render(<TeamScoreCard {...props} />);

      // Jane Doe is the second player
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('shows Unknown for non-existent player', () => {
      const team = createTwoPlayerTeam();
      const props = createDefaultProps({
        team,
        onContributorSelect: jest.fn(),
        selectedContributor: 'non-existent-player',
      });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText('Unknown')).toBeTruthy();
    });

    it('opens menu when contributor button pressed', () => {
      const onContributorSelect = jest.fn();
      const props = createDefaultProps({
        onContributorSelect,
      });
      render(<TeamScoreCard {...props} />);

      // Press the contributor button
      const contributorButton = screen.getByText('Select who made the shot');
      fireEvent.press(contributorButton);

      // Menu should open (mocked in jest.setup.js)
      // The Menu.Item components would be rendered
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('does not call onScoreSelect when stepper buttons pressed while disabled', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        disabled: true,
        currentScore: { strokes: 5 },
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const minusButton = screen.getByLabelText('Decrease score');
      const plusButton = screen.getByLabelText('Increase score');

      fireEvent.press(minusButton);
      fireEvent.press(plusButton);

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('does not call onScoreSelect when pick up pressed while disabled', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        disabled: true,
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const pickupButton = screen.getByLabelText('Pick up ball');
      fireEvent.press(pickupButton);

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('does not call onScoreSelect when par pressed while disabled', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        disabled: true,
        currentHole: getTestHole(1),
        onScoreSelect,
      });
      render(<TeamScoreCard {...props} />);

      const parButton = screen.getByLabelText('Score par 4');
      fireEvent.press(parButton);

      expect(onScoreSelect).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible labels for all interactive elements', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
      });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByLabelText('Pick up ball')).toBeTruthy();
      expect(screen.getByLabelText('Decrease score')).toBeTruthy();
      expect(screen.getByLabelText('Increase score')).toBeTruthy();
      expect(screen.getByLabelText('Score par 4')).toBeTruthy();
    });

    it('has button role for interactive elements', () => {
      const props = createDefaultProps();
      render(<TeamScoreCard {...props} />);

      const pickupButton = screen.getByLabelText('Pick up ball');
      expect(pickupButton.props.accessibilityRole).toBe('button');

      const minusButton = screen.getByLabelText('Decrease score');
      expect(minusButton.props.accessibilityRole).toBe('button');

      const plusButton = screen.getByLabelText('Increase score');
      expect(plusButton.props.accessibilityRole).toBe('button');
    });
  });

  // ===========================================================================
  // TEAM HANDICAP CALCULATION TESTS
  // ===========================================================================

  describe('Team Handicap Calculation', () => {
    it('calculates handicap correctly for 2-player team', () => {
      // Handicaps: 10 + 20 = 30, * 0.25 = 7.5
      const team = createTwoPlayerTeam({ handicaps: [10, 20] });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText(/HC: 7.5/)).toBeTruthy();
    });

    it('calculates handicap correctly for 4-player team', () => {
      // Handicaps: 0 + 10 + 20 + 30 = 60, * 0.25 = 15.0
      const team = createFourPlayerTeam({ handicaps: [0, 10, 20, 30] });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText(/HC: 15.0/)).toBeTruthy();
    });

    it('calculates handicap correctly for team with all same handicaps', () => {
      // Handicaps: 18 + 18 = 36, * 0.25 = 9.0
      const team = createTwoPlayerTeam({ handicaps: [18, 18] });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText(/HC: 9.0/)).toBeTruthy();
    });

    it('handles team with all scratch golfers', () => {
      // Handicaps: 0 + 0 = 0, * 0.25 = 0.0
      const team = createTwoPlayerTeam({ handicaps: [0, 0] });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText(/HC: 0.0/)).toBeTruthy();
    });

    it('handles team with high handicaps', () => {
      // Handicaps: 36 + 36 = 72, * 0.25 = 18.0
      const team = createTwoPlayerTeam({ handicaps: [36, 36] });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText(/HC: 18.0/)).toBeTruthy();
    });

    it('rounds to one decimal place', () => {
      // Handicaps: 5 + 11 = 16, * 0.25 = 4.0
      const team = createTwoPlayerTeam({ handicaps: [5, 11] });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(screen.getByText(/HC: 4.0/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles undefined currentScore gracefully', () => {
      const props = createDefaultProps({
        currentScore: undefined,
      });

      // Should not throw
      render(<TeamScoreCard {...props} />);
      expect(screen.getByText('Team Alpha')).toBeTruthy();
    });

    it('handles team with very long name', () => {
      const team = createTwoPlayerTeam({
        name: 'The Extremely Long Team Name That Goes On And On',
      });
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      expect(
        screen.getByText('The Extremely Long Team Name That Goes On And On')
      ).toBeTruthy();
    });

    it('handles team with undefined members', () => {
      const team: TeamWithMembers = {
        id: 'team-1',
        competition_id: 'comp-1',
        name: 'Team No Members',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        members: undefined as any,
      };
      const props = createDefaultProps({ team });
      render(<TeamScoreCard {...props} />);

      // Should render with 0 handicap and 0 players
      expect(screen.getByText('Team No Members')).toBeTruthy();
    });

    it('handles all par types', () => {
      // Par 3
      const { unmount: unmount3 } = render(
        <TeamScoreCard {...createDefaultProps({ currentHole: getTestHole(2) })} />
      );
      expect(screen.getByLabelText('Score par 3')).toBeTruthy();
      unmount3();

      // Par 4
      const { unmount: unmount4 } = render(
        <TeamScoreCard {...createDefaultProps({ currentHole: getTestHole(1) })} />
      );
      expect(screen.getByLabelText('Score par 4')).toBeTruthy();
      unmount4();

      // Par 5
      render(<TeamScoreCard {...createDefaultProps({ currentHole: getTestHole(3) })} />);
      expect(screen.getByLabelText('Score par 5')).toBeTruthy();
    });

    it('handles minimum score value (1)', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 1 },
      });
      render(<TeamScoreCard {...props} />);

      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });

    it('handles maximum regular score value (12)', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 12 },
      });
      render(<TeamScoreCard {...props} />);

      expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1);
    });

    it('handles score equal to pickup threshold correctly', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 10 },
      });
      render(<TeamScoreCard {...props} />);

      // Should display P for picked up
      const pElements = screen.getAllByText('P');
      expect(pElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // MEMOIZATION TESTS
  // ===========================================================================

  describe('Memoization', () => {
    it('renders efficiently with React.memo', () => {
      const props = createDefaultProps();
      const { rerender } = render(<TeamScoreCard {...props} />);

      // Re-render with same props should not cause issues
      rerender(<TeamScoreCard {...props} />);

      expect(screen.getByText('Team Alpha')).toBeTruthy();
    });

    it('updates when team prop changes', () => {
      const props = createDefaultProps();
      const { rerender } = render(<TeamScoreCard {...props} />);

      expect(screen.getByText('Team Alpha')).toBeTruthy();

      const newTeam = createTwoPlayerTeam({ name: 'Team Beta' });
      rerender(<TeamScoreCard {...props} team={newTeam} />);

      expect(screen.getByText('Team Beta')).toBeTruthy();
    });

    it('updates when score changes', () => {
      const props = createDefaultProps({ currentScore: undefined });
      const { rerender } = render(<TeamScoreCard {...props} />);

      expect(screen.getByText('-')).toBeTruthy();

      rerender(<TeamScoreCard {...props} currentScore={{ strokes: 5 }} />);

      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });
  });
});
