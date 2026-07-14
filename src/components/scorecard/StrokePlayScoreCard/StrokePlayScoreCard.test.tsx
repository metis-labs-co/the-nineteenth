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
  useIsDark: () => false,
}));

// Mock settings store
jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: jest.fn(() => ({
    distanceUnit: 'yards',
  })),
  useFormattedDistance: () => ({
    formatDistance: (yards: number) => `${yards}y`,
    unit: 'yards',
    unitLabel: 'y',
  }),
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
    Icon: ({ source, size, color: _color }: any) => (
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
  calculateParScore: jest.fn((strokes: number, par: number, strokesReceived: number) => {
    // Mock par game scoring: +1 win, 0 square, -1 loss
    const netStrokes = strokes - strokesReceived;
    const relativeToPar = netStrokes - par;
    if (relativeToPar <= -1) return 1; // Win
    if (relativeToPar === 0) return 0; // Square
    return -1; // Loss
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

    it('does not render NET label (only GROSS shown)', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
          runningGross={36}
          cumulativePar={36}
        />
      );

      expect(screen.getByText('GROSS')).toBeTruthy();
      expect(screen.queryByText('NET')).toBeNull();
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

    it('handles undefined cumulativePar', () => {
      const player = createMockPlayer();
      const hole = createMockHole();

      render(
        <StrokePlayScoreCard
          player={player}
          currentHole={hole}
          currentScore={undefined}
          onScoreSelect={defaultOnScoreSelect}
          cumulativePar={undefined}
        />
      );

      // Should render without crashing
      expect(screen.getByText('GROSS')).toBeTruthy();
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

  // ===========================================================================
  // PAR DISPLAY MODE TESTS
  // ===========================================================================

  describe('Par Display Mode (displayMode="par")', () => {
    describe('Header Display', () => {
      it('renders "SCORE" header when displayMode="par"', () => {
        const player = createMockPlayer();
        const hole = createMockHole();

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={undefined}
            onScoreSelect={defaultOnScoreSelect}
            displayMode="par"
            runningParScore={2}
          />
        );

        expect(screen.getByText('SCORE')).toBeTruthy();
        // Should NOT show GROSS/NET in par mode
        expect(screen.queryByText('GROSS')).toBeNull();
        expect(screen.queryByText('NET')).toBeNull();
      });

      it('renders "GROSS" header when displayMode="stroke" (default)', () => {
        const player = createMockPlayer();
        const hole = createMockHole();

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={undefined}
            onScoreSelect={defaultOnScoreSelect}
            displayMode="stroke"
            runningGross={36}
            cumulativePar={36}
          />
        );

        expect(screen.getByText('GROSS')).toBeTruthy();
        expect(screen.queryByText('NET')).toBeNull();
        // Should NOT show SCORE in stroke mode
        expect(screen.queryByText('SCORE')).toBeNull();
      });

      it('defaults to stroke mode when displayMode not specified', () => {
        const player = createMockPlayer();
        const hole = createMockHole();

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={undefined}
            onScoreSelect={defaultOnScoreSelect}
            runningGross={36}
            cumulativePar={36}
          />
        );

        expect(screen.getByText('GROSS')).toBeTruthy();
        expect(screen.queryByText('NET')).toBeNull();
      });

      it('displays running par score with correct format', () => {
        const player = createMockPlayer();
        const hole = createMockHole();

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={undefined}
            onScoreSelect={defaultOnScoreSelect}
            displayMode="par"
            runningParScore={3}
          />
        );

        // +3 should be displayed (may appear in both header and score buttons)
        expect(screen.getAllByText('+3').length).toBeGreaterThanOrEqual(1);
      });

      it('displays "E" for even running par score', () => {
        const player = createMockPlayer();
        const hole = createMockHole();

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={undefined}
            onScoreSelect={defaultOnScoreSelect}
            displayMode="par"
            runningParScore={0}
          />
        );

        // Should show E for even
        const eElements = screen.getAllByText('E');
        expect(eElements.length).toBeGreaterThanOrEqual(1);
      });

      it('displays negative running par score correctly', () => {
        const player = createMockPlayer();
        const hole = createMockHole();

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={undefined}
            onScoreSelect={defaultOnScoreSelect}
            displayMode="par"
            runningParScore={-2}
          />
        );

        expect(screen.getAllByText('-2').length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Current Score Display in Par Mode', () => {
      it('shows "+1 (Win)" preview for net birdie in par mode', () => {
        const player = createMockPlayer({ handicap: 0 });
        const hole = createMockHole({ par: 4, strokeIndex: 18 });
        // Birdie: 3 strokes on par 4 with 0 strokes received = win
        const score = createMockHoleScore({ strokes: 3 });

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={score}
            onScoreSelect={defaultOnScoreSelect}
            displayMode="par"
          />
        );

        expect(screen.getAllByText(/\+1/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Win/)).toBeTruthy();
      });

      it('shows "0 (Square)" preview for net par in par mode', () => {
        const player = createMockPlayer({ handicap: 0 });
        const hole = createMockHole({ par: 4, strokeIndex: 18 });
        // Par: 4 strokes on par 4 with 0 strokes received = square
        const score = createMockHoleScore({ strokes: 4 });

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={score}
            onScoreSelect={defaultOnScoreSelect}
            displayMode="par"
          />
        );

        // Should show E for even (0) and Square
        expect(screen.getByText(/Square/)).toBeTruthy();
      });

      it('shows "-1 (Loss)" preview for net bogey in par mode', () => {
        const player = createMockPlayer({ handicap: 0 });
        const hole = createMockHole({ par: 4, strokeIndex: 18 });
        // Bogey: 5 strokes on par 4 with 0 strokes received = loss
        const score = createMockHoleScore({ strokes: 5 });

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={score}
            onScoreSelect={defaultOnScoreSelect}
            displayMode="par"
          />
        );

        expect(screen.getAllByText(/-1/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Loss/)).toBeTruthy();
      });

      it('shows stroke play format in default stroke mode', () => {
        const player = createMockPlayer({ handicap: 0 });
        const hole = createMockHole({ par: 4, strokeIndex: 18 });
        const score = createMockHoleScore({ strokes: 5 });

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={score}
            onScoreSelect={defaultOnScoreSelect}
            displayMode="stroke"
          />
        );

        // Should show Bogey description, not Win/Square/Loss
        expect(screen.getByText(/Bogey/)).toBeTruthy();
        expect(screen.queryByText(/Win/)).toBeNull();
        expect(screen.queryByText(/Square/)).toBeNull();
        expect(screen.queryByText(/Loss/)).toBeNull();
      });
    });

    describe('Par Mode with Strokes Received', () => {
      it('converts gross bogey to net par (Square) with strokes received', () => {
        const player = createMockPlayer({ handicap: 18 });
        const hole = createMockHole({ par: 4, strokeIndex: 10 }); // Will receive 1 stroke
        // Bogey: 5 strokes - 1 stroke received = net 4 = par = Square
        const score = createMockHoleScore({ strokes: 5 });

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={score}
            onScoreSelect={defaultOnScoreSelect}
            displayMode="par"
          />
        );

        expect(screen.getByText(/Square/)).toBeTruthy();
      });

      it('converts gross par to net birdie (Win) with strokes received', () => {
        const player = createMockPlayer({ handicap: 18 });
        const hole = createMockHole({ par: 4, strokeIndex: 10 }); // Will receive 1 stroke
        // Par: 4 strokes - 1 stroke received = net 3 = birdie = Win
        const score = createMockHoleScore({ strokes: 4 });

        render(
          <StrokePlayScoreCard
            player={player}
            currentHole={hole}
            currentScore={score}
            onScoreSelect={defaultOnScoreSelect}
            displayMode="par"
          />
        );

        expect(screen.getByText(/Win/)).toBeTruthy();
      });
    });
  });
});
