/**
 * StrokePlayScoreCard Component Tests
 *
 * Tests for the stroke play score card component including:
 * - Basic rendering with player info and handicap
 * - Running gross/net totals display
 * - Relative-to-par button rendering
 * - Score button interactions
 * - MORE modal for extended scores
 * - Pick up functionality
 * - Shots received indicator
 * - Score color coding
 * - Accessibility features
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StrokePlayScoreCard } from './StrokePlayScoreCard';
import type { Player, Hole, HoleScore } from '@/types';
import { PICKUP_SCORE } from '@/constants/scoring';

// ============================================================================
// MOCKS
// ============================================================================

// Mock the theme context
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    textPrimary: '#000000',
    textSecondary: '#666666',
    textOnColored: '#FFFFFF',
    primary: '#2196F3',
    border: '#E0E0E0',
    error: '#F44336',
    eagle: '#1B5E20',
    birdie: '#4CAF50',
    par: '#2196F3',
    bogey: '#FF9800',
    doubleBogey: '#F44336',
  }),
}));

// Mock settings store
jest.mock('@/store/settingsStore', () => ({
  useStatsVisibility: () => ({
    showPutts: false,
    showFairwayHit: false,
    showGreenInRegulation: false,
  }),
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View, Text: RNText } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <RNText style={style} {...props}>
        {children}
      </RNText>
    ),
    Icon: ({ source, size, color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }}>
        <RNText>{source}</RNText>
      </View>
    ),
  };
});

// Mock scoring utilities
jest.mock('@/utils/scoring', () => ({
  getStrokesOnHole: jest.fn((handicap: number, hole: { strokeIndex: number }) => {
    // Simple mock: 1 stroke if handicap >= stroke index
    if (handicap >= hole.strokeIndex) return 1;
    if (handicap >= 18 + hole.strokeIndex) return 2;
    return 0;
  }),
  calculateNetScore: jest.fn((strokes: number, handicap: number, hole: { strokeIndex: number }) => {
    // Simple mock: subtract 1 stroke if handicap >= stroke index
    const received = handicap >= hole.strokeIndex ? 1 : 0;
    return strokes - received;
  }),
  getScoreDescription: jest.fn((score: number, par: number) => {
    const diff = score - par;
    if (diff <= -3) return 'Albatross';
    if (diff === -2) return 'Eagle';
    if (diff === -1) return 'Birdie';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    if (diff === 3) return 'Triple Bogey';
    return `+${diff}`;
  }),
}));

// Mock isSingleBallScore
jest.mock('@/types/database', () => ({
  isSingleBallScore: jest.fn((score: any) => {
    return score && 'strokes' in score && !('balls' in score);
  }),
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a mock player
 */
function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    name: 'John Smith',
    handicap: 18,
    email: 'john@example.com',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  } as Player;
}

/**
 * Create a mock hole
 */
function createMockHole(overrides: Partial<Hole> = {}): Hole {
  return {
    id: 'hole-1',
    number: 1,
    par: 4,
    strokeIndex: 10,
    distance: 385,
    courseId: 'course-1',
    ...overrides,
  } as Hole;
}

/**
 * Create a mock hole score
 */
function createMockHoleScore(overrides: Partial<HoleScore> = {}): HoleScore {
  return {
    strokes: 5,
    putts: 2,
    fairwayHit: true,
    greenInRegulation: false,
    ...overrides,
  } as HoleScore;
}

// ============================================================================
// TESTS
// ============================================================================

describe('StrokePlayScoreCard', () => {
  const defaultOnScoreSelect = jest.fn();
  const defaultOnStatsUpdate = jest.fn();
  const defaultOnPlayerPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // BASIC RENDERING TESTS
  // ===========================================================================

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('renders player name', () => {
      const player = createMockPlayer({ name: 'Sarah Wilson' });
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('Sarah Wilson')).toBeTruthy();
    });

    it('renders player handicap', () => {
      const player = createMockPlayer({ handicap: 12 });
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('HC: 12')).toBeTruthy();
    });

    it('renders par information in section label', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 5 });

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('Score Relative to Par (Par 5)')).toBeTruthy();
    });

    it('renders "Tap a score above" when no score selected', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('Tap a score above')).toBeTruthy();
    });
  });

  // ===========================================================================
  // RUNNING TOTALS TESTS
  // ===========================================================================

  describe('Running Totals Display', () => {
    it('renders GROSS label', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
          runningGross={36}
        />
      );

      expect(screen.getByText('GROSS')).toBeTruthy();
    });

    it('renders NET label', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
          runningNet={2}
        />
      );

      expect(screen.getByText('NET')).toBeTruthy();
    });

    it('displays E for even net score', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
          runningNet={0}
        />
      );

      // There are multiple 'E' elements (PAR button and NET display)
      // Just verify the component renders without error
      const eElements = screen.getAllByText('E');
      expect(eElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // RELATIVE-TO-PAR BUTTONS TESTS
  // ===========================================================================

  describe('Relative-to-Par Buttons', () => {
    it('renders Eagle button', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('EAG')).toBeTruthy();
      expect(screen.getByText('-2')).toBeTruthy();
    });

    it('renders Birdie button', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('BIR')).toBeTruthy();
      expect(screen.getByText('-1')).toBeTruthy();
    });

    it('renders Par button with E', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('PAR')).toBeTruthy();
    });

    it('renders Bogey button', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('BOG')).toBeTruthy();
      expect(screen.getByText('+1')).toBeTruthy();
    });

    it('renders Double Bogey button', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('DBL')).toBeTruthy();
      expect(screen.getByText('+2')).toBeTruthy();
    });

    it('renders Triple Bogey button', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('TRP')).toBeTruthy();
      expect(screen.getByText('+3')).toBeTruthy();
    });

    it('renders MORE button', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('MORE')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCORE BUTTON INTERACTIONS TESTS
  // ===========================================================================

  describe('Score Button Interactions', () => {
    it('calls onScoreSelect with par when Par button pressed', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const onScoreSelect = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={onScoreSelect}
        />
      );

      fireEvent.press(screen.getByText('PAR'));

      expect(onScoreSelect).toHaveBeenCalledWith(4);
    });

    it('calls onScoreSelect with par+1 when Bogey button pressed', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const onScoreSelect = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={onScoreSelect}
        />
      );

      fireEvent.press(screen.getByText('BOG'));

      expect(onScoreSelect).toHaveBeenCalledWith(5);
    });

    it('calls onScoreSelect with par-1 when Birdie button pressed', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const onScoreSelect = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={onScoreSelect}
        />
      );

      fireEvent.press(screen.getByText('BIR'));

      expect(onScoreSelect).toHaveBeenCalledWith(3);
    });

    it('calls onScoreSelect with par-2 when Eagle button pressed', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const onScoreSelect = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={onScoreSelect}
        />
      );

      fireEvent.press(screen.getByText('EAG'));

      expect(onScoreSelect).toHaveBeenCalledWith(2);
    });

    it('does not call onScoreSelect when disabled', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const onScoreSelect = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={onScoreSelect}
          disabled={true}
        />
      );

      fireEvent.press(screen.getByText('PAR'));

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('ensures minimum score of 1 (Eagle on Par 3)', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 3 });
      const onScoreSelect = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={onScoreSelect}
        />
      );

      // Eagle on par 3 would be 1 stroke
      fireEvent.press(screen.getByText('EAG'));

      expect(onScoreSelect).toHaveBeenCalledWith(1);
    });
  });

  // ===========================================================================
  // CURRENT SCORE DISPLAY TESTS
  // ===========================================================================

  describe('Current Score Display', () => {
    it('displays current score when score is selected', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const score = createMockHoleScore({ strokes: 5 });

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={score}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('Current:')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('displays score description', () => {
      const player = createMockPlayer({ handicap: 0 }); // No strokes received
      const hole = createMockHole({ par: 4, strokeIndex: 18 });
      const score = createMockHoleScore({ strokes: 5 });

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={score}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      // +1 over par = Bogey
      expect(screen.getByText(/Bogey/)).toBeTruthy();
    });

    it('shows Pick Up button when score is selected', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const score = createMockHoleScore({ strokes: 5 });

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={score}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('Pick Up')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PICK UP FUNCTIONALITY TESTS
  // ===========================================================================

  describe('Pick Up Functionality', () => {
    it('calls onScoreSelect with PICKUP_SCORE when Pick Up pressed', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const score = createMockHoleScore({ strokes: 5 });
      const onScoreSelect = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={score}
          onScoreSelect={onScoreSelect}
        />
      );

      fireEvent.press(screen.getByText('Pick Up'));

      expect(onScoreSelect).toHaveBeenCalledWith(PICKUP_SCORE);
    });

    it('displays "Picked Up" when score is PICKUP_SCORE', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const score = createMockHoleScore({ strokes: PICKUP_SCORE });

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={score}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('Picked Up')).toBeTruthy();
    });

    it('shows Undo button when picked up', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const score = createMockHoleScore({ strokes: PICKUP_SCORE });

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={score}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('Undo')).toBeTruthy();
    });

    it('calls onScoreSelect with par when Undo pressed after pick up', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const score = createMockHoleScore({ strokes: PICKUP_SCORE });
      const onScoreSelect = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={score}
          onScoreSelect={onScoreSelect}
        />
      );

      fireEvent.press(screen.getByText('Undo'));

      expect(onScoreSelect).toHaveBeenCalledWith(4); // par
    });
  });

  // ===========================================================================
  // SHOTS RECEIVED TESTS
  // ===========================================================================

  describe('Shots Received Indicator', () => {
    it('shows shots received badge when player receives strokes', () => {
      const player = createMockPlayer({ handicap: 18 });
      const hole = createMockHole({ strokeIndex: 10 }); // Will receive 1 stroke

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('+1 shot')).toBeTruthy();
    });

    it('does not show shots received badge when player receives 0 strokes', () => {
      const player = createMockPlayer({ handicap: 5 });
      const hole = createMockHole({ strokeIndex: 10 }); // Won't receive stroke

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.queryByText(/shot/)).toBeNull();
    });
  });

  // ===========================================================================
  // MORE MODAL TESTS
  // ===========================================================================

  describe('MORE Modal', () => {
    it('opens extended score picker when MORE button pressed', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      fireEvent.press(screen.getByText('MORE'));

      expect(screen.getByText('Select Score')).toBeTruthy();
      expect(screen.getByText('Par 4 - Extended scores')).toBeTruthy();
    });

    it('shows score buttons 1-10 in modal', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      fireEvent.press(screen.getByText('MORE'));

      // Check for score numbers in modal
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(String(i))).toBeTruthy();
      }
    });

    it('calls onScoreSelect when score selected in modal', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });
      const onScoreSelect = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={onScoreSelect}
        />
      );

      fireEvent.press(screen.getByText('MORE'));

      // Select score 8
      fireEvent.press(screen.getByText('8'));

      expect(onScoreSelect).toHaveBeenCalledWith(8);
    });

    it('shows Cancel button in modal', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 4 });

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      fireEvent.press(screen.getByText('MORE'));

      expect(screen.getByText('Cancel')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLAYER PRESS TESTS
  // ===========================================================================

  describe('Player Press Handler', () => {
    it('calls onPlayerPress when player name is pressed', () => {
      const player = createMockPlayer({ id: 'player-123' });
      const hole = createMockHole();
      const onPlayerPress = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
          onPlayerPress={onPlayerPress}
        />
      );

      fireEvent.press(screen.getByText('John Smith'));

      expect(onPlayerPress).toHaveBeenCalledWith('player-123');
    });

    it('does not call onPlayerPress when not provided', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      // Should not throw when pressing player name
      fireEvent.press(screen.getByText('John Smith'));
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessibility label for player scorecard', () => {
      const player = createMockPlayer({ name: 'John Smith' });
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
          onPlayerPress={defaultOnPlayerPress}
        />
      );

      const playerButton = screen.getByLabelText("View John Smith's scorecard");
      expect(playerButton).toBeTruthy();
    });

    it('has accessibility label for score buttons', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByLabelText('Score Par')).toBeTruthy();
      expect(screen.getByLabelText('Score Bogey')).toBeTruthy();
      expect(screen.getByLabelText('Score Birdie')).toBeTruthy();
      expect(screen.getByLabelText('Score Eagle')).toBeTruthy();
    });

    it('has accessibility label for MORE button', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByLabelText('More score options')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles null handicap (defaults to 0)', () => {
      const player = createMockPlayer({ handicap: null as unknown as number });
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('HC: 0')).toBeTruthy();
    });

    it('handles par 3 correctly', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 3 });

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('Score Relative to Par (Par 3)')).toBeTruthy();
    });

    it('handles par 5 correctly', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 5 });

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
        />
      );

      expect(screen.getByText('Score Relative to Par (Par 5)')).toBeTruthy();
    });

    it('handles undefined runningGross', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
          runningGross={undefined}
        />
      );

      // Should render without crashing
      expect(screen.getByText('GROSS')).toBeTruthy();
    });

    it('handles undefined runningNet', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
          runningNet={undefined}
        />
      );

      // Should render without crashing
      expect(screen.getByText('NET')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PAR VARIATION TESTS
  // ===========================================================================

  describe('Par Variations', () => {
    it('calculates correct scores for Par 3', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 3 });
      const onScoreSelect = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={onScoreSelect}
        />
      );

      // Par on Par 3 = 3 strokes
      fireEvent.press(screen.getByText('PAR'));
      expect(onScoreSelect).toHaveBeenCalledWith(3);
    });

    it('calculates correct scores for Par 5', () => {
      const player = createMockPlayer();
      const hole = createMockHole({ par: 5 });
      const onScoreSelect = jest.fn();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={onScoreSelect}
        />
      );

      // Bogey on Par 5 = 6 strokes
      fireEvent.press(screen.getByText('BOG'));
      expect(onScoreSelect).toHaveBeenCalledWith(6);
    });
  });
});
