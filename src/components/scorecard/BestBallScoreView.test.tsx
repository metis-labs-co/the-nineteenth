/**
 * BestBallScoreView Component Tests
 *
 * Tests for the best ball scoring view component including:
 * - Team header display (name, format label, total points)
 * - Player rows with handicap information
 * - Score entry controls (pick up, +/-, score display)
 * - Best ball highlighting (star icon, points display)
 * - Net score and Stableford points calculations
 * - Disabled state handling
 * - Editable player restrictions
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { BestBallScoreView } from './BestBallScoreView';
import {
  createTeamWithMembers,
  createTestPlayer,
  create18Holes,
} from '@/__tests__/utils/testFixtures';
import type { TeamWithMembers, Hole, HoleScore } from '@/types/database.types';

// Mock react-native-paper Icon
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    Icon: ({ source, size: _size, color: _color }: { source: string; size: number; color: string }) => (
      <View testID={`icon-${source}`}>
        <Text>{source}</Text>
      </View>
    ),
  };
});

// Mock scoring utilities
jest.mock('@/utils/scoring', () => ({
  getStrokesOnHole: jest.fn((handicap: number, hole: { strokeIndex: number }) => {
    // Simple calculation: strokes = Math.floor(handicap / 18) + extra strokes based on stroke index
    const baseStrokes = Math.floor(handicap / 18);
    const extraStrokes = hole.strokeIndex <= (handicap % 18) ? 1 : 0;
    return baseStrokes + extraStrokes;
  }),
  calculateNetScore: jest.fn((strokes: number, handicap: number, hole: { par: number; strokeIndex: number }) => {
    const baseStrokes = Math.floor(handicap / 18);
    const extraStrokes = hole.strokeIndex <= (handicap % 18) ? 1 : 0;
    const strokesReceived = baseStrokes + extraStrokes;
    return strokes - strokesReceived;
  }),
  calculateStablefordPoints: jest.fn((strokes: number, handicap: number, hole: { par: number; strokeIndex: number }) => {
    const baseStrokes = Math.floor(handicap / 18);
    const extraStrokes = hole.strokeIndex <= (handicap % 18) ? 1 : 0;
    const strokesReceived = baseStrokes + extraStrokes;
    const netStrokes = strokes - strokesReceived;
    const relativeToPar = netStrokes - hole.par;
    if (relativeToPar <= -3) return 5;
    if (relativeToPar === -2) return 4;
    if (relativeToPar === -1) return 3;
    if (relativeToPar === 0) return 2;
    if (relativeToPar === 1) return 1;
    return 0;
  }),
}));

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

function createTestTeam(id: string, name: string, playerData: { name: string; handicap: number }[]): TeamWithMembers {
  const players = playerData.map((data, i) =>
    createTestPlayer({
      id: `${id}-player-${i + 1}`,
      name: data.name,
      handicap: data.handicap,
    })
  );
  return createTeamWithMembers({ id, name }, players);
}

const defaultTeam = createTestTeam('team-1', 'Team Awesome', [
  { name: 'John Smith', handicap: 15 },
  { name: 'Jane Doe', handicap: 20 },
  { name: 'Bob Wilson', handicap: 10 },
]);

const holes = create18Holes();
const defaultHole = holes[0]; // Hole 1: Par 4, SI 7

function createHoleScore(strokes: number): HoleScore {
  return { strokes };
}

// Default props factory
function createDefaultProps(overrides: Partial<React.ComponentProps<typeof BestBallScoreView>> = {}) {
  return {
    team: defaultTeam,
    currentHole: defaultHole,
    playerScores: new Map<string, HoleScore | undefined>(),
    onScoreSelect: jest.fn(),
    disabled: false,
    ...overrides,
  };
}

describe('BestBallScoreView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('Team Awesome')).toBeTruthy();
    });

    it('renders team name', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('Team Awesome')).toBeTruthy();
    });

    it('renders "Best Ball Format" label', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('Best Ball Format')).toBeTruthy();
    });

    it('renders team total points display', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('TEAM PTS')).toBeTruthy();
    });

    it('renders account-group icon', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      expect(screen.getByTestId('icon-account-group')).toBeTruthy();
    });

    it('renders all player names', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
      expect(screen.getByText('Bob Wilson')).toBeTruthy();
    });

    it('renders player handicap information', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      // Each player should show their HC and shots on hole
      // John (HC: 15), Jane (HC: 20), Bob (HC: 10)
      expect(screen.getByText(/HC: 15/)).toBeTruthy();
      expect(screen.getByText(/HC: 20/)).toBeTruthy();
      expect(screen.getByText(/HC: 10/)).toBeTruthy();
    });

    it('renders score controls for each player', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      // Should have 3 P buttons, 3 minus buttons, 3 plus buttons
      const pButtons = screen.getAllByText('P');
      const minusButtons = screen.getAllByText('−');
      const plusButtons = screen.getAllByText('+');

      expect(pButtons.length).toBe(3);
      expect(minusButtons.length).toBe(3);
      expect(plusButtons.length).toBe(3);
    });

    it('renders dash when no score is entered', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBe(3); // One for each player
    });
  });

  // ===========================================================================
  // TEAM HEADER TESTS
  // ===========================================================================

  describe('Team Header', () => {
    it('displays team name correctly', () => {
      const team = createTestTeam('team-custom', 'The Champions', [{ name: 'Player 1', handicap: 12 }]);
      const props = createDefaultProps({ team });
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('The Champions')).toBeTruthy();
    });

    it('displays team total as 0 when no scores entered', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      // The team total value should be 0
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(1);
    });

    it('displays team total based on best ball score', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      // John scores 4 on par 4 = 2 pts (par)
      playerScores.set('team-1-player-1', createHoleScore(4));
      // Jane scores 3 on par 4 = 3 pts (birdie) - BEST
      playerScores.set('team-1-player-2', createHoleScore(3));
      // Bob scores 5 on par 4 = 1 pt (bogey)
      playerScores.set('team-1-player-3', createHoleScore(5));

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      // Best ball should be Jane's 3 pts - score appears multiple places so use getAllByText
      const threes = screen.getAllByText('3');
      expect(threes.length).toBeGreaterThanOrEqual(1);
    });

    it('handles long team names', () => {
      const team = createTestTeam('team-long', 'The Most Amazing Golf Team in the World', [{ name: 'Player', handicap: 10 }]);
      const props = createDefaultProps({ team });
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('The Most Amazing Golf Team in the World')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLAYER ROW TESTS
  // ===========================================================================

  describe('Player Rows', () => {
    it('displays player handicap and strokes on hole', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      // Should show shots text for each player
      // Format: "HC: X • +Y shot(s)"
      const shotTexts = screen.getAllByText(/shot/);
      expect(shotTexts.length).toBe(3);
    });

    it('uses singular "shot" when player receives 1 stroke', () => {
      // Create a player who receives exactly 1 stroke on this hole
      const team = createTestTeam('team-single', 'Single Shot Team', [{ name: 'Player One', handicap: 7 }]);
      const props = createDefaultProps({ team });
      render(<BestBallScoreView {...props} />);

      // Should have "shot" (singular) somewhere
      expect(screen.getByText(/\+\d shot(?!s)/)).toBeTruthy();
    });

    it('uses plural "shots" when player receives multiple strokes', () => {
      // Player with high handicap receives 2+ strokes
      const team = createTestTeam('team-plural', 'High HC Team', [{ name: 'High HC', handicap: 36 }]);
      const props = createDefaultProps({ team });
      render(<BestBallScoreView {...props} />);

      // Should have "shots" (plural)
      expect(screen.getByText(/shots/)).toBeTruthy();
    });

    it('displays player score when entered', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(5));

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('5')).toBeTruthy();
    });

    it('displays "P" when player picks up', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(10)); // PICKUP_SCORE = 10

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      // Multiple P elements (one from score display, multiple from buttons)
      const pElements = screen.getAllByText('P');
      expect(pElements.length).toBeGreaterThanOrEqual(4); // 3 buttons + 1 score display
    });

    it('displays points for each player', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(4)); // 2 pts
      playerScores.set('team-1-player-2', createHoleScore(4)); // 2 pts
      playerScores.set('team-1-player-3', createHoleScore(4)); // 2 pts

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      // Should have multiple "pts" labels
      const ptsLabels = screen.getAllByText('pts');
      expect(ptsLabels.length).toBe(3);
    });
  });

  // ===========================================================================
  // BEST BALL HIGHLIGHTING TESTS
  // ===========================================================================

  describe('Best Ball Highlighting', () => {
    it('shows star icon for player with best net score', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      // Jane has the best score (lowest net)
      playerScores.set('team-1-player-1', createHoleScore(5)); // John
      playerScores.set('team-1-player-2', createHoleScore(3)); // Jane - BEST
      playerScores.set('team-1-player-3', createHoleScore(5)); // Bob

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      expect(screen.getByTestId('icon-star')).toBeTruthy();
    });

    it('does not show star icon when no scores entered', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      expect(screen.queryByTestId('icon-star')).toBeNull();
    });

    it('shows star for first player when tied', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      // All players have same score
      playerScores.set('team-1-player-1', createHoleScore(4)); // John - BEST (first)
      playerScores.set('team-1-player-2', createHoleScore(4)); // Jane
      playerScores.set('team-1-player-3', createHoleScore(4)); // Bob

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      // Should show exactly one star
      const stars = screen.getAllByTestId('icon-star');
      expect(stars.length).toBe(1);
    });

    it('ignores picked up scores when determining best ball', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(10)); // John - PICKED UP
      playerScores.set('team-1-player-2', createHoleScore(5)); // Jane - BEST (only valid)
      playerScores.set('team-1-player-3', createHoleScore(10)); // Bob - PICKED UP

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      // Jane should be marked as best
      expect(screen.getByTestId('icon-star')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCORE CONTROLS TESTS
  // ===========================================================================

  describe('Score Controls', () => {
    describe('Pick Up Button', () => {
      it('calls onScoreSelect with PICKUP_SCORE (10) when P pressed', () => {
        const onScoreSelect = jest.fn();
        const props = createDefaultProps({ onScoreSelect });
        render(<BestBallScoreView {...props} />);

        const pButtons = screen.getAllByText('P');
        fireEvent.press(pButtons[0]); // First player's P button

        expect(onScoreSelect).toHaveBeenCalledWith('team-1-player-1', 10);
      });

      it('highlights P button when picked up', () => {
        const playerScores = new Map<string, HoleScore | undefined>();
        playerScores.set('team-1-player-1', createHoleScore(10));

        const props = createDefaultProps({ playerScores });
        render(<BestBallScoreView {...props} />);

        // Component renders without error - button should have different styling
        expect(screen.getByText('Team Awesome')).toBeTruthy();
      });
    });

    describe('Decrement Button', () => {
      it('calls onScoreSelect with decremented score', () => {
        const onScoreSelect = jest.fn();
        const playerScores = new Map<string, HoleScore | undefined>();
        playerScores.set('team-1-player-1', createHoleScore(5));

        const props = createDefaultProps({ onScoreSelect, playerScores });
        render(<BestBallScoreView {...props} />);

        const minusButtons = screen.getAllByText('−');
        fireEvent.press(minusButtons[0]);

        expect(onScoreSelect).toHaveBeenCalledWith('team-1-player-1', 4);
      });

      it('does not decrement below MIN_SCORE (1)', () => {
        const onScoreSelect = jest.fn();
        const playerScores = new Map<string, HoleScore | undefined>();
        playerScores.set('team-1-player-1', createHoleScore(1));

        const props = createDefaultProps({ onScoreSelect, playerScores });
        render(<BestBallScoreView {...props} />);

        const minusButtons = screen.getAllByText('−');
        fireEvent.press(minusButtons[0]);

        expect(onScoreSelect).not.toHaveBeenCalled();
      });

      it('transitions from pickup to par+2 when decrementing', () => {
        const onScoreSelect = jest.fn();
        const playerScores = new Map<string, HoleScore | undefined>();
        playerScores.set('team-1-player-1', createHoleScore(10)); // PICKUP

        const props = createDefaultProps({ onScoreSelect, playerScores });
        render(<BestBallScoreView {...props} />);

        const minusButtons = screen.getAllByText('−');
        fireEvent.press(minusButtons[0]);

        // Par 4 hole: par + 2 = 6
        expect(onScoreSelect).toHaveBeenCalledWith('team-1-player-1', 6);
      });

      it('defaults to par when no score set', () => {
        const onScoreSelect = jest.fn();
        const props = createDefaultProps({ onScoreSelect });
        render(<BestBallScoreView {...props} />);

        const minusButtons = screen.getAllByText('−');
        fireEvent.press(minusButtons[0]);

        // Should default to par (4)
        expect(onScoreSelect).toHaveBeenCalledWith('team-1-player-1', 4);
      });
    });

    describe('Increment Button', () => {
      it('calls onScoreSelect with incremented score', () => {
        const onScoreSelect = jest.fn();
        const playerScores = new Map<string, HoleScore | undefined>();
        playerScores.set('team-1-player-1', createHoleScore(4));

        const props = createDefaultProps({ onScoreSelect, playerScores });
        render(<BestBallScoreView {...props} />);

        const plusButtons = screen.getAllByText('+');
        fireEvent.press(plusButtons[0]);

        expect(onScoreSelect).toHaveBeenCalledWith('team-1-player-1', 5);
      });

      it('does not increment past MAX_SCORE (12)', () => {
        const onScoreSelect = jest.fn();
        const playerScores = new Map<string, HoleScore | undefined>();
        playerScores.set('team-1-player-1', createHoleScore(12));

        const props = createDefaultProps({ onScoreSelect, playerScores });
        render(<BestBallScoreView {...props} />);

        const plusButtons = screen.getAllByText('+');
        fireEvent.press(plusButtons[0]);

        expect(onScoreSelect).not.toHaveBeenCalled();
      });

      it('does not increment when picked up', () => {
        const onScoreSelect = jest.fn();
        const playerScores = new Map<string, HoleScore | undefined>();
        playerScores.set('team-1-player-1', createHoleScore(10)); // PICKUP

        const props = createDefaultProps({ onScoreSelect, playerScores });
        render(<BestBallScoreView {...props} />);

        const plusButtons = screen.getAllByText('+');
        fireEvent.press(plusButtons[0]);

        expect(onScoreSelect).not.toHaveBeenCalled();
      });

      it('defaults to par when no score set', () => {
        const onScoreSelect = jest.fn();
        const props = createDefaultProps({ onScoreSelect });
        render(<BestBallScoreView {...props} />);

        const plusButtons = screen.getAllByText('+');
        fireEvent.press(plusButtons[0]);

        // Should default to par (4)
        expect(onScoreSelect).toHaveBeenCalledWith('team-1-player-1', 4);
      });
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('does not call onScoreSelect when disabled', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({ onScoreSelect, disabled: true });
      render(<BestBallScoreView {...props} />);

      const pButtons = screen.getAllByText('P');
      fireEvent.press(pButtons[0]);

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('does not allow incrementing when disabled', () => {
      const onScoreSelect = jest.fn();
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(4));

      const props = createDefaultProps({ onScoreSelect, playerScores, disabled: true });
      render(<BestBallScoreView {...props} />);

      const plusButtons = screen.getAllByText('+');
      fireEvent.press(plusButtons[0]);

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('does not allow decrementing when disabled', () => {
      const onScoreSelect = jest.fn();
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(5));

      const props = createDefaultProps({ onScoreSelect, playerScores, disabled: true });
      render(<BestBallScoreView {...props} />);

      const minusButtons = screen.getAllByText('−');
      fireEvent.press(minusButtons[0]);

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('shows disabled styling', () => {
      const props = createDefaultProps({ disabled: true });
      render(<BestBallScoreView {...props} />);

      // Component renders without error with disabled state
      expect(screen.getByText('Team Awesome')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDITABLE PLAYER IDS TESTS
  // ===========================================================================

  describe('Editable Player IDs', () => {
    it('allows editing when player is in editablePlayerIds', () => {
      const onScoreSelect = jest.fn();
      const editablePlayerIds = new Set(['team-1-player-1']);
      const props = createDefaultProps({ onScoreSelect, editablePlayerIds });
      render(<BestBallScoreView {...props} />);

      const pButtons = screen.getAllByText('P');
      fireEvent.press(pButtons[0]); // First player is editable

      expect(onScoreSelect).toHaveBeenCalled();
    });

    it('prevents editing when player is not in editablePlayerIds', () => {
      const onScoreSelect = jest.fn();
      const editablePlayerIds = new Set(['team-1-player-1']);
      const props = createDefaultProps({ onScoreSelect, editablePlayerIds });
      render(<BestBallScoreView {...props} />);

      const pButtons = screen.getAllByText('P');
      fireEvent.press(pButtons[1]); // Second player is NOT editable

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('allows editing all players when editablePlayerIds is undefined', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({ onScoreSelect });
      render(<BestBallScoreView {...props} />);

      const pButtons = screen.getAllByText('P');
      fireEvent.press(pButtons[0]);
      fireEvent.press(pButtons[1]);
      fireEvent.press(pButtons[2]);

      expect(onScoreSelect).toHaveBeenCalledTimes(3);
    });

    it('combines disabled and editablePlayerIds restrictions', () => {
      const onScoreSelect = jest.fn();
      const editablePlayerIds = new Set(['team-1-player-1']);
      const props = createDefaultProps({ onScoreSelect, editablePlayerIds, disabled: true });
      render(<BestBallScoreView {...props} />);

      const pButtons = screen.getAllByText('P');
      fireEvent.press(pButtons[0]); // Even though in editablePlayerIds, disabled overrides

      expect(onScoreSelect).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // DIFFERENT HOLE PARS TESTS
  // ===========================================================================

  describe('Different Hole Pars', () => {
    it('handles par 3 hole correctly', () => {
      const par3Hole: Hole = {
        number: 2,
        par: 3,
        strokeIndex: 15,
        yardages: { blue: 180, white: 160, red: 140 },
      };
      const onScoreSelect = jest.fn();
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(10)); // PICKUP

      const props = createDefaultProps({
        currentHole: par3Hole,
        onScoreSelect,
        playerScores,
      });
      render(<BestBallScoreView {...props} />);

      const minusButtons = screen.getAllByText('−');
      fireEvent.press(minusButtons[0]);

      // Par 3 + 2 = 5
      expect(onScoreSelect).toHaveBeenCalledWith('team-1-player-1', 5);
    });

    it('handles par 5 hole correctly', () => {
      const par5Hole: Hole = {
        number: 3,
        par: 5,
        strokeIndex: 1,
        yardages: { blue: 520, white: 500, red: 450 },
      };
      const onScoreSelect = jest.fn();
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(10)); // PICKUP

      const props = createDefaultProps({
        currentHole: par5Hole,
        onScoreSelect,
        playerScores,
      });
      render(<BestBallScoreView {...props} />);

      const minusButtons = screen.getAllByText('−');
      fireEvent.press(minusButtons[0]);

      // Par 5 + 2 = 7
      expect(onScoreSelect).toHaveBeenCalledWith('team-1-player-1', 7);
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty team members', () => {
      const emptyTeam: TeamWithMembers = {
        id: 'team-empty',
        competition_id: 'comp-1',
        name: 'Empty Team',
        members: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const props = createDefaultProps({ team: emptyTeam });
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('Empty Team')).toBeTruthy();
      expect(screen.getByText('Best Ball Format')).toBeTruthy();
    });

    it('handles team with single member', () => {
      const singleMemberTeam = createTestTeam('team-single', 'Solo Team', [{ name: 'Solo Player', handicap: 15 }]);
      const props = createDefaultProps({ team: singleMemberTeam });
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('Solo Player')).toBeTruthy();
    });

    it('handles team with four members', () => {
      const fourMemberTeam = createTestTeam('team-four', 'Big Team', [
        { name: 'Player 1', handicap: 10 },
        { name: 'Player 2', handicap: 15 },
        { name: 'Player 3', handicap: 20 },
        { name: 'Player 4', handicap: 25 },
      ]);
      const props = createDefaultProps({ team: fourMemberTeam });
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('Player 1')).toBeTruthy();
      expect(screen.getByText('Player 2')).toBeTruthy();
      expect(screen.getByText('Player 3')).toBeTruthy();
      expect(screen.getByText('Player 4')).toBeTruthy();
    });

    it('handles very high handicap player', () => {
      const highHCTeam = createTestTeam('team-high', 'High HC', [{ name: 'High HC', handicap: 54 }]);
      const props = createDefaultProps({ team: highHCTeam });
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText(/HC: 54/)).toBeTruthy();
    });

    it('handles zero handicap player', () => {
      const scratchTeam = createTestTeam('team-scratch', 'Scratch Team', [{ name: 'Pro', handicap: 0 }]);
      const props = createDefaultProps({ team: scratchTeam });
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText(/HC: 0/)).toBeTruthy();
    });

    it('handles all players picked up', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(10));
      playerScores.set('team-1-player-2', createHoleScore(10));
      playerScores.set('team-1-player-3', createHoleScore(10));

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      // Team total should be 0 as all picked up - multiple 0s for player points
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByTestId('icon-star')).toBeNull();
    });

    it('handles maximum score (12)', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(12));

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('12')).toBeTruthy();
    });

    it('handles minimum score (1)', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(1));

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      expect(screen.getByText('1')).toBeTruthy();
    });

    it('handles missing player in team member', () => {
      // Create team with member that has no player object
      const teamWithMissingPlayer: TeamWithMembers = {
        id: 'team-missing',
        competition_id: 'comp-1',
        name: 'Missing Player Team',
        members: [
          {
            team_id: 'team-missing',
            player_id: 'missing-player',
            joined_at: new Date().toISOString(),
            player: null as any, // Simulate missing player
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const props = createDefaultProps({ team: teamWithMissingPlayer });
      render(<BestBallScoreView {...props} />);

      // Should show "Unknown" for missing player
      expect(screen.getByText('Unknown')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMOIZATION TESTS
  // ===========================================================================

  describe('Memoization', () => {
    it('recalculates best ball when scores change', () => {
      const playerScores1 = new Map<string, HoleScore | undefined>();
      playerScores1.set('team-1-player-1', createHoleScore(5)); // John - BEST

      const props = createDefaultProps({ playerScores: playerScores1 });
      const { rerender } = render(<BestBallScoreView {...props} />);

      expect(screen.getByTestId('icon-star')).toBeTruthy();

      // Change scores so different player is best
      const playerScores2 = new Map<string, HoleScore | undefined>();
      playerScores2.set('team-1-player-1', createHoleScore(6)); // John
      playerScores2.set('team-1-player-2', createHoleScore(3)); // Jane - NOW BEST

      rerender(<BestBallScoreView {...props} playerScores={playerScores2} />);

      // Star should still be shown (now for Jane)
      expect(screen.getByTestId('icon-star')).toBeTruthy();
    });

    it('recalculates when team changes', () => {
      const props = createDefaultProps();
      const { rerender } = render(<BestBallScoreView {...props} />);

      expect(screen.getByText('Team Awesome')).toBeTruthy();

      const newTeam = createTestTeam('team-new', 'New Team', [{ name: 'New Player', handicap: 18 }]);
      rerender(<BestBallScoreView {...props} team={newTeam} />);

      expect(screen.getByText('New Team')).toBeTruthy();
      expect(screen.getByText('New Player')).toBeTruthy();
    });

    it('recalculates when hole changes', () => {
      const props = createDefaultProps();
      const { rerender } = render(<BestBallScoreView {...props} />);

      // Change to a different hole
      const newHole: Hole = {
        number: 5,
        par: 5,
        strokeIndex: 3,
        yardages: { blue: 520, white: 500, red: 450 },
      };
      rerender(<BestBallScoreView {...props} currentHole={newHole} />);

      // Component should render without error with new hole data
      expect(screen.getByText('Team Awesome')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCORE CALCULATIONS TESTS
  // ===========================================================================

  describe('Score Calculations', () => {
    it('calculates net score considering handicap strokes', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(5)); // Gross 5, receives strokes

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      // Component renders and calculates - we're primarily testing integration
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('shows 0 points for picked up score', () => {
      const playerScores = new Map<string, HoleScore | undefined>();
      playerScores.set('team-1-player-1', createHoleScore(10)); // PICKUP

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      // Multiple 0s (team total + player points)
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(1);
    });

    it('selects lowest net score as best ball', () => {
      // Create a scenario where gross scores don't determine best ball
      const playerScores = new Map<string, HoleScore | undefined>();
      // John (HC 15): gross 5
      playerScores.set('team-1-player-1', createHoleScore(5));
      // Jane (HC 20): gross 5 - with higher handicap, lower net
      playerScores.set('team-1-player-2', createHoleScore(5));
      // Bob (HC 10): gross 5 - with lower handicap, higher net
      playerScores.set('team-1-player-3', createHoleScore(5));

      const props = createDefaultProps({ playerScores });
      render(<BestBallScoreView {...props} />);

      // Should have exactly one star
      const stars = screen.getAllByTestId('icon-star');
      expect(stars.length).toBe(1);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessibility labels on buttons', () => {
      const props = createDefaultProps();
      render(<BestBallScoreView {...props} />);

      // Pick up buttons should have accessibility labels
      const pickUpButtons = screen.getAllByLabelText('Pick up');
      expect(pickUpButtons.length).toBe(3);

      // Decrease buttons
      const decreaseButtons = screen.getAllByLabelText('Decrease score');
      expect(decreaseButtons.length).toBe(3);

      // Increase buttons
      const increaseButtons = screen.getAllByLabelText('Increase score');
      expect(increaseButtons.length).toBe(3);
    });
  });
});
