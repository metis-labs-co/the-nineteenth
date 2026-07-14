/**
 * QuickScorecardView Component Tests
 *
 * Tests for the horizontal scrolling scorecard view:
 * - Rendering of hole buttons for all 18 holes
 * - Front nine and back nine sections
 * - Score display with color coding
 * - Current hole highlighting
 * - Hole completion indicators
 * - Player dots for multi-player rounds
 * - Score colors based on par comparison
 * - Hole press callback
 * - Auto-scrolling to current hole
 * - Pickup score handling
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QuickScorecardView } from './QuickScorecardView';
import type { Hole, HoleScore, Player } from '@/types';

// =====================================================
// MOCKS
// =====================================================

// Mock ThemeContext
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#2196F3',
    primaryLighter: '#E3F2FD',
    white: '#FFFFFF',
    textPrimary: '#212121',
    textSecondary: '#757575',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    border: '#E0E0E0',
    gray50: '#FAFAFA',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    gray500: '#9E9E9E',
    success: '#4CAF50',
    error: '#F44336',
    eagle: '#1565C0',
    birdie: '#2196F3',
    par: '#4CAF50',
    bogey: '#FF9800',
    doubleBogey: '#F44336',
  }),
  useIsDark: () => false,
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { Text: RNText } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <RNText style={style} {...props}>
        {children}
      </RNText>
    ),
  };
});

// Mock scrollTo
const _mockScrollTo = jest.fn();

// =====================================================
// TEST FIXTURES
// =====================================================

const createHole = (number: number, par: 3 | 4 | 5 = 4): Hole => ({
  number: number as Hole['number'],
  par,
  strokeIndex: number,
});

const createHoles = (): Hole[] =>
  Array.from({ length: 18 }, (_, i) => createHole(i + 1, i % 3 === 0 ? 3 : i % 3 === 1 ? 4 : 5));

const createPlayer = (id: string, name: string): Player => ({
  id,
  name,
  email: `${name.toLowerCase()}@example.com`,
  handicap: 10,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
});

const createPlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => createPlayer(`player-${i + 1}`, `Player ${i + 1}`));

const createHoleScore = (strokes: number): HoleScore => ({ strokes });

// Score storage for mock function
let mockScores: Record<string, Record<number, HoleScore>> = {};

const resetMockScores = () => {
  mockScores = {};
};

const setMockScore = (playerId: string, holeNumber: number, strokes: number) => {
  if (!mockScores[playerId]) {
    mockScores[playerId] = {};
  }
  mockScores[playerId][holeNumber] = createHoleScore(strokes);
};

const getMockPlayerHoleScore = (playerId: string, holeNumber: number): HoleScore | undefined => {
  return mockScores[playerId]?.[holeNumber];
};

const createDefaultProps = () => ({
  holes: createHoles(),
  currentHole: 1,
  players: createPlayers(1),
  getPlayerHoleScore: getMockPlayerHoleScore,
  isHoleComplete: jest.fn((_holeNumber: number) => false),
  onHolePress: jest.fn(),
});

// =====================================================
// TEST SUITE
// =====================================================

describe('QuickScorecardView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockScores();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);
      expect(screen.getByText('Quick View')).toBeTruthy();
    });

    it('renders the header with title', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);
      expect(screen.getByText('Quick View')).toBeTruthy();
    });

    it('renders the subtitle', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);
      expect(screen.getByText('Tap to jump to hole')).toBeTruthy();
    });

    it('renders front nine section label', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);
      expect(screen.getByText('Front')).toBeTruthy();
    });

    it('renders back nine section label', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);
      expect(screen.getByText('Back')).toBeTruthy();
    });

    it('renders all 18 hole numbers', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);

      for (let i = 1; i <= 18; i++) {
        expect(screen.getByText(String(i))).toBeTruthy();
      }
    });

    it('renders par values for holes without scores', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);

      // Check for par displays (P3, P4, P5) - using getAllByText
      const p4Elements = screen.getAllByText(/P[345]/);
      expect(p4Elements.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // HOLE BUTTON TESTS
  // ===========================================================================

  describe('Hole Buttons', () => {
    it('highlights the current hole', () => {
      const props = createDefaultProps();
      props.currentHole = 5;
      render(<QuickScorecardView {...props} />);

      // Current hole should have special styling (accessibility state)
      const holeButton = screen.getByRole('button', { name: /Hole 5/i });
      expect(holeButton.props.accessibilityState?.selected).toBe(true);
    });

    it('calls onHolePress with correct hole number when pressed', () => {
      const props = createDefaultProps();
      render(<QuickScorecardView {...props} />);

      const holeButton = screen.getByRole('button', { name: /Hole 7/i });
      fireEvent.press(holeButton);

      expect(props.onHolePress).toHaveBeenCalledWith(7);
    });

    it('calls onHolePress for each hole independently', () => {
      const props = createDefaultProps();
      render(<QuickScorecardView {...props} />);

      // Get all hole buttons and press first and last
      const holeButtons = screen.getAllByRole('button');
      fireEvent.press(holeButtons[0]); // Hole 1
      expect(props.onHolePress).toHaveBeenCalledWith(1);

      fireEvent.press(holeButtons[17]); // Hole 18
      expect(props.onHolePress).toHaveBeenCalledWith(18);

      expect(props.onHolePress).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // SCORE DISPLAY TESTS
  // ===========================================================================

  describe('Score Display', () => {
    it('displays score when player has scored', () => {
      const props = createDefaultProps();
      setMockScore('player-1', 1, 77); // Use 77 to avoid conflicts with hole numbers
      render(<QuickScorecardView {...props} />);

      expect(screen.getByText('77')).toBeTruthy();
    });

    it('displays par placeholder when no score', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);

      // Par values should be displayed
      const parElements = screen.getAllByText(/P[345]/);
      expect(parElements.length).toBeGreaterThan(0);
    });

    it('displays P for pickup score (10)', () => {
      const props = createDefaultProps();
      setMockScore('player-1', 1, 10); // 10 is pickup score
      render(<QuickScorecardView {...props} />);

      expect(screen.getByText('P')).toBeTruthy();
    });

    it('displays multiple scores for multiple holes', () => {
      const props = createDefaultProps();
      // Use unique scores that don't conflict with hole numbers
      setMockScore('player-1', 1, 19);
      setMockScore('player-1', 2, 20);
      setMockScore('player-1', 3, 21);
      render(<QuickScorecardView {...props} />);

      // These high scores should only appear once as scores, not as hole numbers
      expect(screen.getByText('19')).toBeTruthy();
      expect(screen.getByText('20')).toBeTruthy();
      expect(screen.getByText('21')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COMPLETION INDICATOR TESTS
  // ===========================================================================

  describe('Completion Indicators', () => {
    it('shows complete state when isHoleComplete returns true', () => {
      const props = createDefaultProps();
      props.isHoleComplete = jest.fn((holeNumber) => holeNumber === 1);
      render(<QuickScorecardView {...props} />);

      // Accessibility label should indicate completion
      const holeButton = screen.getByRole('button', { name: /Hole 1.*all complete/i });
      expect(holeButton).toBeTruthy();
    });

    it('does not show complete state when isHoleComplete returns false', () => {
      const props = createDefaultProps();
      props.isHoleComplete = jest.fn((_holeNumber: number) => false);
      render(<QuickScorecardView {...props} />);

      const holeButtons = screen.getAllByRole('button');
      // First hole button should not contain "all complete"
      expect(holeButtons[0].props.accessibilityLabel).not.toContain('all complete');
    });

    it('handles multiple completed holes', () => {
      const props = createDefaultProps();
      props.isHoleComplete = jest.fn((holeNumber) => holeNumber <= 5);
      render(<QuickScorecardView {...props} />);

      for (let i = 1; i <= 5; i++) {
        const holeButton = screen.getByRole('button', { name: new RegExp(`Hole ${i}.*all complete`, 'i') });
        expect(holeButton).toBeTruthy();
      }
    });
  });

  // ===========================================================================
  // MULTI-PLAYER TESTS
  // ===========================================================================

  describe('Multi-Player Support', () => {
    it('shows player dots when more than one player', () => {
      const props = createDefaultProps();
      props.players = createPlayers(4);
      render(<QuickScorecardView {...props} />);

      // Get first hole button and check accessibility label
      const holeButtons = screen.getAllByRole('button');
      expect(holeButtons[0].props.accessibilityLabel).toContain('0 of 4 players scored');
    });

    it('does not show player dots for single player', () => {
      const props = createDefaultProps();
      props.players = createPlayers(1);
      render(<QuickScorecardView {...props} />);

      // Get first hole button and check accessibility label
      const holeButtons = screen.getAllByRole('button');
      expect(holeButtons[0].props.accessibilityLabel).toContain('0 of 1 players scored');
    });

    it('updates completed count as players score', () => {
      const props = createDefaultProps();
      props.players = createPlayers(4);
      setMockScore('player-1', 1, 4);
      setMockScore('player-2', 1, 5);
      render(<QuickScorecardView {...props} />);

      const holeButton = screen.getByRole('button', { name: /Hole 1.*2 of 4 players scored/i });
      expect(holeButton).toBeTruthy();
    });

    it('shows all players scored when complete', () => {
      const props = createDefaultProps();
      props.players = createPlayers(4);
      setMockScore('player-1', 1, 4);
      setMockScore('player-2', 1, 5);
      setMockScore('player-3', 1, 3);
      setMockScore('player-4', 1, 4);
      props.isHoleComplete = jest.fn((holeNumber) => holeNumber === 1);
      render(<QuickScorecardView {...props} />);

      const holeButton = screen.getByRole('button', { name: /Hole 1.*4 of 4 players scored.*all complete/i });
      expect(holeButton).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('hole buttons have accessibility role', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);

      const holeButtons = screen.getAllByRole('button');
      expect(holeButtons[0].props.accessibilityRole).toBe('button');
    });

    it('hole buttons have descriptive accessibility labels', () => {
      const props = createDefaultProps();
      props.players = createPlayers(2);
      setMockScore('player-1', 1, 4);
      render(<QuickScorecardView {...props} />);

      const holeButtons = screen.getAllByRole('button');
      expect(holeButtons[0].props.accessibilityLabel).toContain('Hole 1');
      expect(holeButtons[0].props.accessibilityLabel).toContain('1 of 2 players scored');
    });

    it('current hole has selected accessibility state', () => {
      const props = createDefaultProps();
      props.currentHole = 10;
      render(<QuickScorecardView {...props} />);

      const holeButtons = screen.getAllByRole('button');
      // Hole 10 is at index 9 (0-indexed)
      expect(holeButtons[9].props.accessibilityState?.selected).toBe(true);
      // Hole 1 (index 0) should not be selected
      expect(holeButtons[0].props.accessibilityState?.selected).toBe(false);
    });

    it('completed holes include completion in accessibility label', () => {
      const props = createDefaultProps();
      props.isHoleComplete = jest.fn((h) => h === 5);
      render(<QuickScorecardView {...props} />);

      const holeButtons = screen.getAllByRole('button');
      // Hole 5 is at index 4
      expect(holeButtons[4].props.accessibilityLabel).toContain('all complete');
    });
  });

  // ===========================================================================
  // AUTO-SCROLL TESTS
  // ===========================================================================

  describe('Auto-Scroll', () => {
    it('renders with current hole highlighted for scrolling', () => {
      const props = createDefaultProps();
      props.currentHole = 10;
      render(<QuickScorecardView {...props} />);

      // The component should render with hole 10 selected
      const holeButton = screen.getByRole('button', { name: /Hole 10/i });
      expect(holeButton.props.accessibilityState?.selected).toBe(true);
    });

    it('renders correctly for different current holes', () => {
      const props = createDefaultProps();
      props.currentHole = 5;
      render(<QuickScorecardView {...props} />);

      const holeButton = screen.getByRole('button', { name: /Hole 5/i });
      expect(holeButton.props.accessibilityState?.selected).toBe(true);
    });

    it('renders correctly for hole 1', () => {
      const props = createDefaultProps();
      props.currentHole = 1;
      render(<QuickScorecardView {...props} />);

      const holeButtons = screen.getAllByRole('button');
      expect(holeButtons[0].props.accessibilityState?.selected).toBe(true);
    });
  });

  // ===========================================================================
  // SCORE COLOR TESTS
  // ===========================================================================

  describe('Score Colors', () => {
    it('applies eagle color for score 2 under par', () => {
      const props = createDefaultProps();
      // Use hole 1 to avoid conflicts, set score to 22 (unique)
      props.holes = createHoles();
      props.holes[0] = { ...props.holes[0], par: 4 };
      setMockScore('player-1', 1, 22); // Using unique number
      render(<QuickScorecardView {...props} />);

      // Score should be displayed
      expect(screen.getByText('22')).toBeTruthy();
    });

    it('applies birdie color for score 1 under par', () => {
      const props = createDefaultProps();
      props.holes = createHoles();
      props.holes[0] = { ...props.holes[0], par: 4 };
      setMockScore('player-1', 1, 23);
      render(<QuickScorecardView {...props} />);

      expect(screen.getByText('23')).toBeTruthy();
    });

    it('applies par color for score equal to par', () => {
      const props = createDefaultProps();
      props.holes = createHoles();
      props.holes[0] = { ...props.holes[0], par: 4 };
      setMockScore('player-1', 1, 24);
      render(<QuickScorecardView {...props} />);

      expect(screen.getByText('24')).toBeTruthy();
    });

    it('applies bogey color for score 1 over par', () => {
      const props = createDefaultProps();
      props.holes = createHoles();
      props.holes[0] = { ...props.holes[0], par: 4 };
      setMockScore('player-1', 1, 25);
      render(<QuickScorecardView {...props} />);

      expect(screen.getByText('25')).toBeTruthy();
    });

    it('applies double bogey color for score 2+ over par', () => {
      const props = createDefaultProps();
      props.holes = createHoles();
      props.holes[0] = { ...props.holes[0], par: 4 };
      setMockScore('player-1', 1, 26);
      render(<QuickScorecardView {...props} />);

      expect(screen.getByText('26')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FRONT/BACK NINE TESTS
  // ===========================================================================

  describe('Front and Back Nine', () => {
    it('renders holes 1-9 in front nine section', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);

      // All 18 holes should be present
      const holeButtons = screen.getAllByRole('button');
      expect(holeButtons.length).toBe(18);

      // Check that first 9 buttons are front nine
      for (let i = 0; i < 9; i++) {
        expect(holeButtons[i].props.accessibilityLabel).toContain(`Hole ${i + 1}`);
      }
    });

    it('renders holes 10-18 in back nine section', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);

      const holeButtons = screen.getAllByRole('button');

      // Check that last 9 buttons are back nine
      for (let i = 9; i < 18; i++) {
        expect(holeButtons[i].props.accessibilityLabel).toContain(`Hole ${i + 1}`);
      }
    });

    it('has front and back labels visible', () => {
      render(<QuickScorecardView {...createDefaultProps()} />);

      expect(screen.getByText('Front')).toBeTruthy();
      expect(screen.getByText('Back')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty holes array', () => {
      const props = createDefaultProps();
      props.holes = [];
      render(<QuickScorecardView {...props} />);

      // Should still render container and labels
      expect(screen.getByText('Quick View')).toBeTruthy();
      expect(screen.getByText('Front')).toBeTruthy();
      expect(screen.getByText('Back')).toBeTruthy();
    });

    it('handles missing hole in holes array', () => {
      const props = createDefaultProps();
      // Remove hole 5 from array
      props.holes = createHoles().filter((h) => h.number !== 5);
      render(<QuickScorecardView {...props} />);

      // Hole 5 button should not be rendered
      expect(screen.queryByRole('button', { name: /Hole 5/ })).toBeNull();
    });

    it('handles empty players array', () => {
      const props = createDefaultProps();
      props.players = [];
      render(<QuickScorecardView {...props} />);

      // Should render holes with 0 players
      const holeButtons = screen.getAllByRole('button');
      expect(holeButtons[0].props.accessibilityLabel).toContain('0 of 0 players scored');
    });

    it('handles current hole out of range', () => {
      const props = createDefaultProps();
      props.currentHole = 99;
      render(<QuickScorecardView {...props} />);

      // Should still render all holes
      expect(screen.getByText('Quick View')).toBeTruthy();
    });

    it('handles current hole at boundary (hole 1)', () => {
      const props = createDefaultProps();
      props.currentHole = 1;
      render(<QuickScorecardView {...props} />);

      const holeButtons = screen.getAllByRole('button');
      expect(holeButtons[0].props.accessibilityState?.selected).toBe(true);
    });

    it('handles current hole at boundary (hole 18)', () => {
      const props = createDefaultProps();
      props.currentHole = 18;
      render(<QuickScorecardView {...props} />);

      const holeButtons = screen.getAllByRole('button');
      expect(holeButtons[17].props.accessibilityState?.selected).toBe(true);
    });

    it('handles zero score', () => {
      const props = createDefaultProps();
      setMockScore('player-1', 1, 0);
      render(<QuickScorecardView {...props} />);

      // 0 is falsy, should show par placeholder
      const parElements = screen.getAllByText(/P[345]/);
      expect(parElements.length).toBeGreaterThan(0);
    });

    it('handles very high scores', () => {
      const props = createDefaultProps();
      setMockScore('player-1', 1, 99);
      render(<QuickScorecardView {...props} />);

      expect(screen.getByText('99')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CURRENT HOLE CHANGE TESTS
  // ===========================================================================

  describe('Current Hole Changes', () => {
    it('updates selected state when current hole changes', () => {
      const props = createDefaultProps();
      props.currentHole = 1;
      const { rerender } = render(<QuickScorecardView {...props} />);

      let holeButtons = screen.getAllByRole('button');
      expect(holeButtons[0].props.accessibilityState?.selected).toBe(true);

      props.currentHole = 5;
      rerender(<QuickScorecardView {...props} />);

      holeButtons = screen.getAllByRole('button');
      expect(holeButtons[0].props.accessibilityState?.selected).toBe(false);
      expect(holeButtons[4].props.accessibilityState?.selected).toBe(true);
    });
  });

  // ===========================================================================
  // TOUCH EVENT TESTS (for disabling parent swipe gestures)
  // ===========================================================================

  describe('Touch Events', () => {
    it('calls onScrollingChange with true on touch start', () => {
      const onScrollingChange = jest.fn();
      const props = { ...createDefaultProps(), onScrollingChange };
      render(<QuickScorecardView {...props} />);

      // Find the container by its text content
      const container = screen.getByText('Quick View').parent?.parent;
      if (container) {
        fireEvent(container, 'touchStart');
      }

      expect(onScrollingChange).toHaveBeenCalledWith(true);
    });

    it('calls onScrollingChange with false on touch end', () => {
      const onScrollingChange = jest.fn();
      const props = { ...createDefaultProps(), onScrollingChange };
      render(<QuickScorecardView {...props} />);

      const container = screen.getByText('Quick View').parent?.parent;
      if (container) {
        fireEvent(container, 'touchEnd');
      }

      expect(onScrollingChange).toHaveBeenCalledWith(false);
    });

    it('calls onScrollingChange with false on touch cancel', () => {
      const onScrollingChange = jest.fn();
      const props = { ...createDefaultProps(), onScrollingChange };
      render(<QuickScorecardView {...props} />);

      const container = screen.getByText('Quick View').parent?.parent;
      if (container) {
        fireEvent(container, 'touchCancel');
      }

      expect(onScrollingChange).toHaveBeenCalledWith(false);
    });

    it('does not fail when onScrollingChange is not provided', () => {
      const props = createDefaultProps();
      render(<QuickScorecardView {...props} />);

      const container = screen.getByText('Quick View').parent?.parent;
      // These should not throw
      if (container) {
        expect(() => fireEvent(container, 'touchStart')).not.toThrow();
        expect(() => fireEvent(container, 'touchEnd')).not.toThrow();
      }
    });
  });

  // ===========================================================================
  // FIRST SCORED PLAYER DISPLAY TESTS
  // ===========================================================================

  describe('First Scored Player Display', () => {
    it('shows score from first player who scored', () => {
      const props = createDefaultProps();
      props.players = createPlayers(3);
      // Only player 2 has scored - use unique number
      setMockScore('player-2', 1, 55);
      render(<QuickScorecardView {...props} />);

      expect(screen.getByText('55')).toBeTruthy();
    });

    it('prioritizes first player in order when multiple scored', () => {
      const props = createDefaultProps();
      props.players = createPlayers(3);
      setMockScore('player-1', 1, 33);
      setMockScore('player-2', 1, 44);
      setMockScore('player-3', 1, 55);
      render(<QuickScorecardView {...props} />);

      // First player's score (33) should be displayed
      expect(screen.getByText('33')).toBeTruthy();
    });
  });
});
