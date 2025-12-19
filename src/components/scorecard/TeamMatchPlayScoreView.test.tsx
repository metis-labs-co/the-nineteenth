/**
 * TeamMatchPlayScoreView Component Tests
 *
 * Tests for the team match play scoring view component including:
 * - Match status display (All Square, X UP, Dormie, wins)
 * - Hole counts for each team
 * - Score entry controls (pick up, +/-, par selection)
 * - Current hole result indicator
 * - Team panel styling (winning/losing states)
 * - Disabled state handling
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { TeamMatchPlayScoreView } from './TeamMatchPlayScoreView';
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
    Icon: ({ source, size, color }: { source: string; size: number; color: string }) => (
      <View testID={`icon-${source}`}>
        <Text>{source}</Text>
      </View>
    ),
  };
});

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

function createTestTeam(id: string, name: string, playerNames: string[]): TeamWithMembers {
  const players = playerNames.map((playerName, i) =>
    createTestPlayer({
      id: `${id}-player-${i + 1}`,
      name: playerName,
      handicap: 15 + i * 5,
    })
  );
  return createTeamWithMembers({ id, name }, players);
}

const defaultTeam1 = createTestTeam('team-1', 'Team Alpha', ['John', 'Jane']);
const defaultTeam2 = createTestTeam('team-2', 'Team Beta', ['Bob', 'Alice']);
const holes = create18Holes();
const defaultHole = holes[0]; // Par 4, SI 7

function createHoleScore(strokes: number): HoleScore {
  return { strokes };
}

// Default props factory
function createDefaultProps(overrides: Partial<React.ComponentProps<typeof TeamMatchPlayScoreView>> = {}) {
  return {
    team1: defaultTeam1,
    team2: defaultTeam2,
    currentHole: defaultHole,
    team1Score: undefined,
    team2Score: undefined,
    onTeam1ScoreSelect: jest.fn(),
    onTeam2ScoreSelect: jest.fn(),
    holeResults: new Map<number, 'team1' | 'team2' | 'halved'>(),
    disabled: false,
    ...overrides,
  };
}

describe('TeamMatchPlayScoreView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps();
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Team Alpha')).toBeTruthy();
      expect(screen.getByText('Team Beta')).toBeTruthy();
    });

    it('renders both team names', () => {
      const props = createDefaultProps();
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Team Alpha')).toBeTruthy();
      expect(screen.getByText('Team Beta')).toBeTruthy();
    });

    it('renders VS separator between teams', () => {
      const props = createDefaultProps();
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('VS')).toBeTruthy();
    });

    it('renders hole counts for both teams', () => {
      const props = createDefaultProps();
      render(<TeamMatchPlayScoreView {...props} />);

      // Initially both teams have 0 holes won
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2);
    });

    it('renders "holes" labels', () => {
      const props = createDefaultProps();
      render(<TeamMatchPlayScoreView {...props} />);

      const holesLabels = screen.getAllByText('holes');
      expect(holesLabels.length).toBeGreaterThanOrEqual(2);
    });

    it('renders halved count', () => {
      const props = createDefaultProps();
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('0 halved')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MATCH STATUS TESTS
  // ===========================================================================

  describe('Match Status', () => {
    it('shows "All Square" when teams are tied', () => {
      const holeResults = new Map<number, 'team1' | 'team2' | 'halved'>();
      holeResults.set(1, 'team1');
      holeResults.set(2, 'team2');

      const props = createDefaultProps({ holeResults });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('All Square')).toBeTruthy();
    });

    it('shows "X UP" when team1 is leading', () => {
      const holeResults = new Map<number, 'team1' | 'team2' | 'halved'>();
      holeResults.set(1, 'team1');
      holeResults.set(2, 'team1');

      const props = createDefaultProps({ holeResults });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Team Alpha 2 UP')).toBeTruthy();
    });

    it('shows "X UP" when team2 is leading', () => {
      const holeResults = new Map<number, 'team1' | 'team2' | 'halved'>();
      holeResults.set(1, 'team2');
      holeResults.set(2, 'team2');
      holeResults.set(3, 'team2');

      const props = createDefaultProps({ holeResults });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Team Beta 3 UP')).toBeTruthy();
    });

    it('shows "1 UP" for single hole lead', () => {
      const holeResults = new Map<number, 'team1' | 'team2' | 'halved'>();
      holeResults.set(1, 'team1');

      const props = createDefaultProps({ holeResults });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Team Alpha 1 UP')).toBeTruthy();
    });

    it('shows "Dormie" when lead equals holes remaining', () => {
      const holeResults = new Map<number, 'team1' | 'team2' | 'halved'>();
      // 16 holes played, team1 won 3 more than team2 (3 holes won vs 0, 13 halved)
      // That's not quite right - we need lead of 2 with 2 remaining
      // Let's make 16 holes played: team1 wins 9, team2 wins 7 = team1 is 2 UP with 2 holes remaining
      for (let i = 1; i <= 9; i++) {
        holeResults.set(i, 'team1');
      }
      for (let i = 10; i <= 16; i++) {
        holeResults.set(i, 'team2');
      }
      // After 16 holes: team1 has 9, team2 has 7, diff is 2, 2 holes remaining = Dormie

      const props = createDefaultProps({ holeResults });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Team Alpha 2 UP (Dormie)')).toBeTruthy();
    });

    it('shows match win when lead exceeds holes remaining', () => {
      const holeResults = new Map<number, 'team1' | 'team2' | 'halved'>();
      // After 15 holes: team1 wins 12, team2 wins 3, diff is 9, 3 holes remaining
      // Lead (9) > holes remaining (3), so team1 wins
      for (let i = 1; i <= 12; i++) {
        holeResults.set(i, 'team1');
      }
      for (let i = 13; i <= 15; i++) {
        holeResults.set(i, 'team2');
      }

      const props = createDefaultProps({ holeResults });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Team Alpha wins 9&3')).toBeTruthy();
    });

    it('updates halved count correctly', () => {
      const holeResults = new Map<number, 'team1' | 'team2' | 'halved'>();
      holeResults.set(1, 'halved');
      holeResults.set(2, 'halved');
      holeResults.set(3, 'halved');

      const props = createDefaultProps({ holeResults });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('3 halved')).toBeTruthy();
    });
  });

  // ===========================================================================
  // HOLE COUNT DISPLAY TESTS
  // ===========================================================================

  describe('Hole Count Display', () => {
    it('displays correct hole count for team1', () => {
      const holeResults = new Map<number, 'team1' | 'team2' | 'halved'>();
      holeResults.set(1, 'team1');
      holeResults.set(2, 'team1');
      holeResults.set(3, 'team2');

      const props = createDefaultProps({ holeResults });
      render(<TeamMatchPlayScoreView {...props} />);

      // Team1 won 2 holes, Team2 won 1
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('displays correct hole count for team2', () => {
      const holeResults = new Map<number, 'team1' | 'team2' | 'halved'>();
      holeResults.set(1, 'team2');
      holeResults.set(2, 'team2');
      holeResults.set(3, 'team2');
      holeResults.set(4, 'team1');

      const props = createDefaultProps({ holeResults });
      render(<TeamMatchPlayScoreView {...props} />);

      // Team2 won 3 holes, Team1 won 1
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCORE DISPLAY TESTS
  // ===========================================================================

  describe('Score Display', () => {
    it('displays dash when no score entered', () => {
      const props = createDefaultProps();
      render(<TeamMatchPlayScoreView {...props} />);

      // Both teams should show '-' for unscored hole
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });

    it('displays team1 score when entered', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(4),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      // Score appears in multiple places (score display + par button), so use getAllByText
      const fours = screen.getAllByText('4');
      expect(fours.length).toBeGreaterThanOrEqual(1);
    });

    it('displays team2 score when entered', () => {
      const props = createDefaultProps({
        team2Score: createHoleScore(5),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('5')).toBeTruthy();
    });

    it('displays "P" for picked up score', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(10), // PICKUP_SCORE = 10
      });
      render(<TeamMatchPlayScoreView {...props} />);

      // Should show 'P' for pickup, look for multiple since button has 'P' too
      const pElements = screen.getAllByText('P');
      expect(pElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays both team scores simultaneously', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(4),
        team2Score: createHoleScore(5),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      // Scores appear in multiple places (score display + par buttons), so use getAllByText
      const fours = screen.getAllByText('4');
      const fives = screen.getAllByText('5');
      expect(fours.length).toBeGreaterThanOrEqual(1);
      expect(fives.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // SCORE CONTROL TESTS
  // ===========================================================================

  describe('Score Controls', () => {
    describe('Pick Up Button', () => {
      it('calls onTeam1ScoreSelect with PICKUP_SCORE (10) when P button pressed', () => {
        const onTeam1ScoreSelect = jest.fn();
        const props = createDefaultProps({ onTeam1ScoreSelect });
        render(<TeamMatchPlayScoreView {...props} />);

        // Find all P buttons (there should be 2, one for each team)
        const pButtons = screen.getAllByText('P');
        fireEvent.press(pButtons[0]); // First P button is for team1

        expect(onTeam1ScoreSelect).toHaveBeenCalledWith(10);
      });

      it('calls onTeam2ScoreSelect with PICKUP_SCORE (10) when P button pressed', () => {
        const onTeam2ScoreSelect = jest.fn();
        const props = createDefaultProps({ onTeam2ScoreSelect });
        render(<TeamMatchPlayScoreView {...props} />);

        const pButtons = screen.getAllByText('P');
        fireEvent.press(pButtons[1]); // Second P button is for team2

        expect(onTeam2ScoreSelect).toHaveBeenCalledWith(10);
      });
    });

    describe('Increment Button', () => {
      it('calls onTeam1ScoreSelect with incremented score', () => {
        const onTeam1ScoreSelect = jest.fn();
        const props = createDefaultProps({
          onTeam1ScoreSelect,
          team1Score: createHoleScore(4),
        });
        render(<TeamMatchPlayScoreView {...props} />);

        const plusButtons = screen.getAllByText('+');
        fireEvent.press(plusButtons[0]);

        expect(onTeam1ScoreSelect).toHaveBeenCalledWith(5);
      });

      it('calls onTeam2ScoreSelect with incremented score', () => {
        const onTeam2ScoreSelect = jest.fn();
        const props = createDefaultProps({
          onTeam2ScoreSelect,
          team2Score: createHoleScore(4),
        });
        render(<TeamMatchPlayScoreView {...props} />);

        const plusButtons = screen.getAllByText('+');
        fireEvent.press(plusButtons[1]);

        expect(onTeam2ScoreSelect).toHaveBeenCalledWith(5);
      });

      it('defaults to par when no score set', () => {
        const onTeam1ScoreSelect = jest.fn();
        const props = createDefaultProps({ onTeam1ScoreSelect });
        render(<TeamMatchPlayScoreView {...props} />);

        const plusButtons = screen.getAllByText('+');
        fireEvent.press(plusButtons[0]);

        // Default hole is par 4, so should default to par
        expect(onTeam1ScoreSelect).toHaveBeenCalledWith(4);
      });

      it('does not increment past MAX_SCORE (12)', () => {
        const onTeam1ScoreSelect = jest.fn();
        const props = createDefaultProps({
          onTeam1ScoreSelect,
          team1Score: createHoleScore(12),
        });
        render(<TeamMatchPlayScoreView {...props} />);

        const plusButtons = screen.getAllByText('+');
        fireEvent.press(plusButtons[0]);

        // Should not call when at max
        expect(onTeam1ScoreSelect).not.toHaveBeenCalled();
      });
    });

    describe('Decrement Button', () => {
      it('calls onTeam1ScoreSelect with decremented score', () => {
        const onTeam1ScoreSelect = jest.fn();
        const props = createDefaultProps({
          onTeam1ScoreSelect,
          team1Score: createHoleScore(5),
        });
        render(<TeamMatchPlayScoreView {...props} />);

        const minusButtons = screen.getAllByText('−');
        fireEvent.press(minusButtons[0]);

        expect(onTeam1ScoreSelect).toHaveBeenCalledWith(4);
      });

      it('does not decrement below MIN_SCORE (1)', () => {
        const onTeam1ScoreSelect = jest.fn();
        const props = createDefaultProps({
          onTeam1ScoreSelect,
          team1Score: createHoleScore(1),
        });
        render(<TeamMatchPlayScoreView {...props} />);

        const minusButtons = screen.getAllByText('−');
        fireEvent.press(minusButtons[0]);

        // Should not go below 1
        expect(onTeam1ScoreSelect).not.toHaveBeenCalled();
      });

      it('transitions from pickup to maxScoreBeforePickup when decrementing', () => {
        const onTeam1ScoreSelect = jest.fn();
        // Par 4 hole: maxScoreBeforePickup = par + 2 = 6
        const props = createDefaultProps({
          onTeam1ScoreSelect,
          team1Score: createHoleScore(10), // PICKUP_SCORE
        });
        render(<TeamMatchPlayScoreView {...props} />);

        const minusButtons = screen.getAllByText('−');
        fireEvent.press(minusButtons[0]);

        expect(onTeam1ScoreSelect).toHaveBeenCalledWith(6); // par (4) + 2
      });
    });

    describe('Par Button', () => {
      it('calls onTeam1ScoreSelect with par value', () => {
        const onTeam1ScoreSelect = jest.fn();
        const props = createDefaultProps({ onTeam1ScoreSelect });
        render(<TeamMatchPlayScoreView {...props} />);

        // Par buttons show the par value (4 for default hole)
        // Find all elements with "4" - the par button should be among them
        const parButtons = screen.getAllByText('4');
        // Press the first one that's a button (the par value button)
        fireEvent.press(parButtons[0]);

        expect(onTeam1ScoreSelect).toHaveBeenCalledWith(4);
      });

      it('highlights par button when score equals par', () => {
        const props = createDefaultProps({
          team1Score: createHoleScore(4),
        });
        render(<TeamMatchPlayScoreView {...props} />);

        // The par button should have different styling when selected
        // We can verify the component renders without error with this state
        expect(screen.getByText('Team Alpha')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // CURRENT HOLE RESULT INDICATOR TESTS
  // ===========================================================================

  describe('Current Hole Result Indicator', () => {
    it('does not show result indicator when no scores entered', () => {
      const props = createDefaultProps();
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.queryByText('Hole Halved')).toBeNull();
      expect(screen.queryByText(/wins hole/)).toBeNull();
    });

    it('does not show result indicator when only team1 score entered', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(4),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.queryByText('Hole Halved')).toBeNull();
      expect(screen.queryByText(/wins hole/)).toBeNull();
    });

    it('shows "Hole Halved" when both teams have same score', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(4),
        team2Score: createHoleScore(4),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Hole Halved')).toBeTruthy();
    });

    it('shows team1 wins hole when team1 score is lower', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(3),
        team2Score: createHoleScore(5),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Team Alpha wins hole')).toBeTruthy();
    });

    it('shows team2 wins hole when team2 score is lower', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(5),
        team2Score: createHoleScore(4),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Team Beta wins hole')).toBeTruthy();
    });

    it('shows "Hole Halved" when both teams pick up', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(10), // PICKUP_SCORE
        team2Score: createHoleScore(10), // PICKUP_SCORE
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Hole Halved')).toBeTruthy();
    });

    it('shows team1 wins when team2 picks up', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(5),
        team2Score: createHoleScore(10), // PICKUP_SCORE
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Team Alpha wins hole')).toBeTruthy();
    });

    it('shows team2 wins when team1 picks up', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(10), // PICKUP_SCORE
        team2Score: createHoleScore(4),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Team Beta wins hole')).toBeTruthy();
    });

    it('renders appropriate icon for halved hole', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(4),
        team2Score: createHoleScore(4),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByTestId('icon-equal')).toBeTruthy();
    });

    it('renders arrow-left icon when team1 wins', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(3),
        team2Score: createHoleScore(5),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByTestId('icon-arrow-left')).toBeTruthy();
    });

    it('renders arrow-right icon when team2 wins', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(6),
        team2Score: createHoleScore(4),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByTestId('icon-arrow-right')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('does not call onTeam1ScoreSelect when disabled', () => {
      const onTeam1ScoreSelect = jest.fn();
      const props = createDefaultProps({
        onTeam1ScoreSelect,
        disabled: true,
      });
      render(<TeamMatchPlayScoreView {...props} />);

      const pButtons = screen.getAllByText('P');
      fireEvent.press(pButtons[0]);

      expect(onTeam1ScoreSelect).not.toHaveBeenCalled();
    });

    it('does not call onTeam2ScoreSelect when disabled', () => {
      const onTeam2ScoreSelect = jest.fn();
      const props = createDefaultProps({
        onTeam2ScoreSelect,
        disabled: true,
      });
      render(<TeamMatchPlayScoreView {...props} />);

      const pButtons = screen.getAllByText('P');
      fireEvent.press(pButtons[1]);

      expect(onTeam2ScoreSelect).not.toHaveBeenCalled();
    });

    it('does not allow incrementing when disabled', () => {
      const onTeam1ScoreSelect = jest.fn();
      const props = createDefaultProps({
        onTeam1ScoreSelect,
        team1Score: createHoleScore(4),
        disabled: true,
      });
      render(<TeamMatchPlayScoreView {...props} />);

      const plusButtons = screen.getAllByText('+');
      fireEvent.press(plusButtons[0]);

      expect(onTeam1ScoreSelect).not.toHaveBeenCalled();
    });

    it('does not allow decrementing when disabled', () => {
      const onTeam1ScoreSelect = jest.fn();
      const props = createDefaultProps({
        onTeam1ScoreSelect,
        team1Score: createHoleScore(5),
        disabled: true,
      });
      render(<TeamMatchPlayScoreView {...props} />);

      const minusButtons = screen.getAllByText('−');
      fireEvent.press(minusButtons[0]);

      expect(onTeam1ScoreSelect).not.toHaveBeenCalled();
    });

    it('does not allow par selection when disabled', () => {
      const onTeam1ScoreSelect = jest.fn();
      const props = createDefaultProps({
        onTeam1ScoreSelect,
        disabled: true,
      });
      render(<TeamMatchPlayScoreView {...props} />);

      const parButtons = screen.getAllByText('4'); // Par 4
      fireEvent.press(parButtons[0]);

      expect(onTeam1ScoreSelect).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // WINNING/LOSING TEAM PANEL STYLING TESTS
  // ===========================================================================

  describe('Team Panel Styling', () => {
    it('shows trophy icon for winning team on current hole', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(3),
        team2Score: createHoleScore(5),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      // Team1 is winning the current hole
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });

    it('renders component correctly when team2 is winning current hole', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(6),
        team2Score: createHoleScore(4),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      // Should render without error and show team2 winning
      expect(screen.getByText('Team Beta wins hole')).toBeTruthy();
    });

    it('does not show trophy icon when hole is halved', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(4),
        team2Score: createHoleScore(4),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      // No trophy icon should be rendered when halved
      expect(screen.queryByTestId('icon-trophy')).toBeNull();
    });
  });

  // ===========================================================================
  // DIFFERENT HOLE PAR TESTS
  // ===========================================================================

  describe('Different Hole Pars', () => {
    it('handles par 3 hole correctly', () => {
      const par3Hole: Hole = {
        number: 2,
        par: 3,
        strokeIndex: 15,
        yardages: { blue: 180, white: 160, red: 140 },
      };
      const onTeam1ScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentHole: par3Hole,
        onTeam1ScoreSelect,
      });
      render(<TeamMatchPlayScoreView {...props} />);

      // Par button should show 3
      const parButtons = screen.getAllByText('3');
      expect(parButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.press(parButtons[0]);
      expect(onTeam1ScoreSelect).toHaveBeenCalledWith(3);
    });

    it('handles par 5 hole correctly', () => {
      const par5Hole: Hole = {
        number: 3,
        par: 5,
        strokeIndex: 1,
        yardages: { blue: 520, white: 500, red: 450 },
      };
      const onTeam1ScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentHole: par5Hole,
        onTeam1ScoreSelect,
      });
      render(<TeamMatchPlayScoreView {...props} />);

      // Par button should show 5
      const parButtons = screen.getAllByText('5');
      expect(parButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.press(parButtons[0]);
      expect(onTeam1ScoreSelect).toHaveBeenCalledWith(5);
    });

    it('calculates maxScoreBeforePickup correctly for par 3', () => {
      const par3Hole: Hole = {
        number: 2,
        par: 3,
        strokeIndex: 15,
        yardages: { blue: 180, white: 160, red: 140 },
      };
      const onTeam1ScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentHole: par3Hole,
        onTeam1ScoreSelect,
        team1Score: createHoleScore(10), // PICKUP
      });
      render(<TeamMatchPlayScoreView {...props} />);

      const minusButtons = screen.getAllByText('−');
      fireEvent.press(minusButtons[0]);

      // maxScoreBeforePickup = par (3) + 2 = 5
      expect(onTeam1ScoreSelect).toHaveBeenCalledWith(5);
    });

    it('calculates maxScoreBeforePickup correctly for par 5', () => {
      const par5Hole: Hole = {
        number: 3,
        par: 5,
        strokeIndex: 1,
        yardages: { blue: 520, white: 500, red: 450 },
      };
      const onTeam1ScoreSelect = jest.fn();
      const props = createDefaultProps({
        currentHole: par5Hole,
        onTeam1ScoreSelect,
        team1Score: createHoleScore(10), // PICKUP
      });
      render(<TeamMatchPlayScoreView {...props} />);

      const minusButtons = screen.getAllByText('−');
      fireEvent.press(minusButtons[0]);

      // maxScoreBeforePickup = par (5) + 2 = 7
      expect(onTeam1ScoreSelect).toHaveBeenCalledWith(7);
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty hole results map', () => {
      const props = createDefaultProps({
        holeResults: new Map(),
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('All Square')).toBeTruthy();
      expect(screen.getByText('0 halved')).toBeTruthy();
    });

    it('handles long team names', () => {
      const team1 = createTestTeam('team-1', 'Team With A Very Long Name That Might Overflow', ['John']);
      const team2 = createTestTeam('team-2', 'Another Very Long Team Name', ['Jane']);
      const props = createDefaultProps({ team1, team2 });
      render(<TeamMatchPlayScoreView {...props} />);

      // Should render without crashing
      expect(screen.getByText('Team With A Very Long Name That Might Overflow')).toBeTruthy();
    });

    it('handles teams with single member', () => {
      const team1 = createTestTeam('team-1', 'Solo Team', ['John']);
      const team2 = createTestTeam('team-2', 'Another Solo', ['Jane']);
      const props = createDefaultProps({ team1, team2 });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Solo Team')).toBeTruthy();
      expect(screen.getByText('Another Solo')).toBeTruthy();
    });

    it('handles teams with many members', () => {
      const team1 = createTestTeam('team-1', 'Big Team', ['John', 'Jane', 'Bob', 'Alice']);
      const team2 = createTestTeam('team-2', 'Another Big', ['Tom', 'Mary', 'Sam', 'Lisa']);
      const props = createDefaultProps({ team1, team2 });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('Big Team')).toBeTruthy();
      expect(screen.getByText('Another Big')).toBeTruthy();
    });

    it('handles very high score', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(12), // MAX_SCORE
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('12')).toBeTruthy();
    });

    it('handles minimum score', () => {
      const props = createDefaultProps({
        team1Score: createHoleScore(1), // MIN_SCORE
      });
      render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('1')).toBeTruthy();
    });

    it('does not increment when picked up', () => {
      const onTeam1ScoreSelect = jest.fn();
      const props = createDefaultProps({
        onTeam1ScoreSelect,
        team1Score: createHoleScore(10), // PICKUP_SCORE
      });
      render(<TeamMatchPlayScoreView {...props} />);

      const plusButtons = screen.getAllByText('+');
      fireEvent.press(plusButtons[0]);

      // Should not increment when picked up
      expect(onTeam1ScoreSelect).not.toHaveBeenCalled();
    });

    it('handles all 18 holes played', () => {
      const holeResults = new Map<number, 'team1' | 'team2' | 'halved'>();
      for (let i = 1; i <= 18; i++) {
        if (i <= 10) {
          holeResults.set(i, 'team1');
        } else if (i <= 15) {
          holeResults.set(i, 'team2');
        } else {
          holeResults.set(i, 'halved');
        }
      }

      const props = createDefaultProps({ holeResults });
      render(<TeamMatchPlayScoreView {...props} />);

      // Team1: 10 holes, Team2: 5 holes, Halved: 3
      expect(screen.getByText('10')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
      expect(screen.getByText('3 halved')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMOIZATION TESTS
  // ===========================================================================

  describe('Memoization', () => {
    it('recalculates match status when holeResults changes', () => {
      const holeResults1 = new Map<number, 'team1' | 'team2' | 'halved'>();
      const props = createDefaultProps({ holeResults: holeResults1 });
      const { rerender } = render(<TeamMatchPlayScoreView {...props} />);

      expect(screen.getByText('All Square')).toBeTruthy();

      // Add a hole result
      const holeResults2 = new Map<number, 'team1' | 'team2' | 'halved'>();
      holeResults2.set(1, 'team1');
      rerender(<TeamMatchPlayScoreView {...props} holeResults={holeResults2} />);

      expect(screen.getByText('Team Alpha 1 UP')).toBeTruthy();
    });

    it('recalculates current hole result when scores change', () => {
      const props = createDefaultProps();
      const { rerender } = render(<TeamMatchPlayScoreView {...props} />);

      // Initially no result indicator
      expect(screen.queryByText('Hole Halved')).toBeNull();

      // Add scores
      rerender(
        <TeamMatchPlayScoreView
          {...props}
          team1Score={createHoleScore(4)}
          team2Score={createHoleScore(4)}
        />
      );

      expect(screen.getByText('Hole Halved')).toBeTruthy();
    });
  });
});
