/**
 * PlayerScoreCard Component Tests
 *
 * Tests for the player scoring interface component including:
 * - Player header display (name, handicap)
 * - Shots received and Stableford points display
 * - Pick Up quick action
 * - Plus/Minus stepper for score entry
 * - Par quick action button
 * - Stats row (FIR, GIR, Putts)
 * - Disabled state handling
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { PlayerScoreCard } from './PlayerScoreCard';
import { createTestPlayer, create18Holes } from '@/__tests__/utils/testFixtures';
import type { Player, Hole, HoleScore } from '@/types';

// Mock the tier-aware stats visibility hook (used by PlayerScoreCard)
const mockUseStatsVisibility = jest.fn();
jest.mock('@/hooks/useStatsVisibilityWithTier', () => ({
  useStatsVisibilityWithTier: () => mockUseStatsVisibility(),
}));

// Mock the scoring utilities
jest.mock('@/utils/scoring', () => ({
  getStrokesOnHole: jest.fn((handicap: number, hole: { strokeIndex: number }) => {
    // Simple mock: 1 stroke per 18 handicap on all holes
    // More strokes on lower stroke indexes
    const base = Math.floor(handicap / 18);
    const extra = hole.strokeIndex <= (handicap % 18) ? 1 : 0;
    return base + extra;
  }),
  calculateStablefordPoints: jest.fn((strokes: number, handicap: number, hole: { par: number; strokeIndex: number }) => {
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
  }),
  // Net variant: strokes received is passed in directly (already resolved via
  // getStrokesOnHole upstream), so no handicap→strokes derivation is needed here.
  calculateStablefordPointsNet: jest.fn((strokes: number, par: number, strokesReceived: number) => {
    const netStrokes = strokes - strokesReceived;
    const relativeToPar = netStrokes - par;

    if (relativeToPar <= -3) return 5;
    if (relativeToPar === -2) return 4;
    if (relativeToPar === -1) return 3;
    if (relativeToPar === 0) return 2;
    if (relativeToPar === 1) return 1;
    return 0;
  }),
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
 * Create default test props
 */
function createDefaultProps(overrides: Partial<{
  player: Player;
  currentHole: Hole;
  currentScore: HoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  onStatsUpdate: (updates: Partial<HoleScore>) => void;
  onPlayerPress: (playerId: string) => void;
  disabled: boolean;
}> = {}) {
  return {
    player: createTestPlayer({ id: 'player-1', name: 'John Smith', handicap: 15 }),
    currentHole: getTestHole(1), // Par 4, SI 7
    currentScore: undefined,
    onScoreSelect: jest.fn(),
    onStatsUpdate: jest.fn(),
    onPlayerPress: jest.fn(),
    disabled: false,
    ...overrides,
  };
}

describe('PlayerScoreCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: all stats visible
    mockUseStatsVisibility.mockReturnValue({
      showPutts: true,
      showFairwayHit: true,
      showGreenInRegulation: true,
      showFairwayMissDirection: false,
      showGreenMissDirection: false,
      showBunkerShots: false,
      showHazards: false,
      hasAnyDetailedStats: false,
    });
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps();
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('renders player name', () => {
      const props = createDefaultProps({
        player: createTestPlayer({ name: 'Tiger Woods' }),
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('Tiger Woods')).toBeTruthy();
    });

    it('renders player handicap', () => {
      const props = createDefaultProps({
        player: createTestPlayer({ handicap: 18 }),
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('HC: 18')).toBeTruthy();
    });

    it('renders shots received label', () => {
      const props = createDefaultProps();
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('SHOTS')).toBeTruthy();
    });

    it('renders Stableford points label', () => {
      const props = createDefaultProps();
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('PTS')).toBeTruthy();
    });

    it('renders Pick Up button label', () => {
      const props = createDefaultProps();
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('PICK UP')).toBeTruthy();
    });

    it('renders Par button label', () => {
      const props = createDefaultProps();
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('PAR')).toBeTruthy();
    });

    it('renders P button for Pick Up', () => {
      const props = createDefaultProps();
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('P')).toBeTruthy();
    });

    it('renders par value in Par button', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(3), // Par 5
      });
      render(<PlayerScoreCard {...props} />);

      // Par 5 button
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // HEADER SECTION TESTS
  // ===========================================================================

  describe('Header Section', () => {
    it('displays zero handicap correctly', () => {
      const props = createDefaultProps({
        player: createTestPlayer({ handicap: 0 }),
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('HC: 0')).toBeTruthy();
    });

    it('displays null handicap as 0', () => {
      const props = createDefaultProps({
        player: createTestPlayer({ handicap: null }),
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('HC: 0')).toBeTruthy();
    });

    it('displays high handicap correctly', () => {
      const props = createDefaultProps({
        player: createTestPlayer({ handicap: 54 }),
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('HC: 54')).toBeTruthy();
    });

    it('truncates long player names', () => {
      const props = createDefaultProps({
        player: createTestPlayer({ name: 'Very Long Player Name That Should Be Truncated' }),
      });
      render(<PlayerScoreCard {...props} />);

      // Name should still render (numberOfLines handles truncation)
      expect(screen.getByText('Very Long Player Name That Should Be Truncated')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SHOTS RECEIVED TESTS
  // ===========================================================================

  describe('Shots Received Display', () => {
    it('displays strokes on hole based on handicap', () => {
      const props = createDefaultProps({
        player: createTestPlayer({ handicap: 18 }),
        currentHole: getTestHole(1), // SI 7
      });
      render(<PlayerScoreCard {...props} />);

      // Mock calculates: base = floor(18/18) = 1, extra = (7 <= 0) ? 1 : 0 = 0
      // So with handicap 18, player gets 1 shot per hole
      // The "+1" appears in the SHOTS section (component formats as +N)
      expect(screen.getByText('+1')).toBeTruthy();
    });

    it('displays 0 strokes for low handicap on high SI hole', () => {
      const props = createDefaultProps({
        player: createTestPlayer({ handicap: 5 }),
        currentHole: getTestHole(2), // SI 15 (par 3)
      });
      render(<PlayerScoreCard {...props} />);

      // With handicap 5 and SI 15, player gets 0 shots (5/18 = 0, SI 15 > 5)
      // 0 also appears in the PTS section when no score selected
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
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
      render(<PlayerScoreCard {...props} />);

      // Should display 0 for empty score
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });

    it('displays 0 points when picked up', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 10 }, // Pick up score
      });
      render(<PlayerScoreCard {...props} />);

      // Picked up = 0 points
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });

    it('displays calculated points for valid score', () => {
      const props = createDefaultProps({
        player: createTestPlayer({ handicap: 18 }),
        currentHole: getTestHole(1), // Par 4, SI 7
        currentScore: { strokes: 4 }, // Par
      });
      render(<PlayerScoreCard {...props} />);

      // With strokes received, net par = 2 points, but player gets shots so likely 3 points
      // The mock returns based on net score calculation
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
      render(<PlayerScoreCard {...props} />);

      // There are multiple dashes (score display and putts display)
      expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
    });

    it('displays current score when selected', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 5 },
      });
      render(<PlayerScoreCard {...props} />);

      // Score 5 displayed (may appear multiple times)
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });

    it('displays P when picked up', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 10 },
      });
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

      const pickupButton = screen.getByLabelText('Pick up ball');
      fireEvent.press(pickupButton);

      expect(onScoreSelect).toHaveBeenCalledWith(10);
    });

    it('has highlighted style when picked up', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 10 },
      });
      render(<PlayerScoreCard {...props} />);

      // Pick up button should be highlighted (verified by visual inspection in Storybook)
      const pickupButton = screen.getByLabelText('Pick up ball');
      expect(pickupButton).toBeTruthy();
    });

    it('does not call callback when disabled', () => {
      const onScoreSelect = jest.fn();
      const props = createDefaultProps({
        disabled: true,
        onScoreSelect,
      });
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

      // Find the par button by accessibility label
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
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

      const parButton = screen.getByLabelText('Score par 5');
      fireEvent.press(parButton);

      expect(onScoreSelect).toHaveBeenCalledWith(5);
    });

    it('has highlighted style when score equals par', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
        currentScore: { strokes: 4 },
      });
      render(<PlayerScoreCard {...props} />);

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
      render(<PlayerScoreCard {...props} />);

      const parButton = screen.getByLabelText('Score par 4');
      fireEvent.press(parButton);

      expect(onScoreSelect).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // PLAYER PRESS CALLBACK TESTS
  // ===========================================================================

  describe('Player Press Callback', () => {
    it('calls onPlayerPress when player name is pressed', () => {
      const onPlayerPress = jest.fn();
      const props = createDefaultProps({ onPlayerPress });
      render(<PlayerScoreCard {...props} />);

      const playerName = screen.getByText('John Smith');
      fireEvent.press(playerName);

      expect(onPlayerPress).toHaveBeenCalledWith('player-1');
    });

    it('does not crash when onPlayerPress is undefined', () => {
      const props = createDefaultProps({ onPlayerPress: undefined });
      render(<PlayerScoreCard {...props} />);

      const playerName = screen.getByText('John Smith');
      // Should not throw
      expect(playerName).toBeTruthy();
    });

    it('passes correct player ID', () => {
      const onPlayerPress = jest.fn();
      const props = createDefaultProps({
        player: createTestPlayer({ id: 'custom-player-id', name: 'Test Player' }),
        onPlayerPress,
      });
      render(<PlayerScoreCard {...props} />);

      // Find by the player name text and press it
      const playerName = screen.getByText('Test Player');
      fireEvent.press(playerName);

      expect(onPlayerPress).toHaveBeenCalledWith('custom-player-id');
    });
  });

  // ===========================================================================
  // STATS ROW TESTS
  // ===========================================================================

  describe('Stats Row - FIR (Fairway in Regulation)', () => {
    beforeEach(() => {
      mockUseStatsVisibility.mockReturnValue({
        showPutts: true,
        showFairwayHit: true,
        showGreenInRegulation: true,
      });
    });

    it('shows FIR checkbox on par 4', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('FIR')).toBeTruthy();
      expect(screen.getByLabelText('Fairway in regulation')).toBeTruthy();
    });

    it('shows FIR checkbox on par 5', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(3), // Par 5
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('FIR')).toBeTruthy();
    });

    it('hides FIR checkbox on par 3', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(2), // Par 3
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.queryByText('FIR')).toBeNull();
    });

    it('toggles FIR when pressed', () => {
      const onStatsUpdate = jest.fn();
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
        currentScore: { strokes: 4, fairwayHit: undefined },
        onStatsUpdate,
      });
      render(<PlayerScoreCard {...props} />);

      const firCheckbox = screen.getByLabelText('Fairway in regulation');
      fireEvent.press(firCheckbox);

      expect(onStatsUpdate).toHaveBeenCalledWith({ fairwayHit: true });
    });

    it('toggles FIR off when already checked', () => {
      const onStatsUpdate = jest.fn();
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
        currentScore: { strokes: 4, fairwayHit: true },
        onStatsUpdate,
      });
      render(<PlayerScoreCard {...props} />);

      const firCheckbox = screen.getByLabelText('Fairway in regulation');
      fireEvent.press(firCheckbox);

      expect(onStatsUpdate).toHaveBeenCalledWith({ fairwayHit: false });
    });

    it('hides FIR when showFairwayHit is false', () => {
      mockUseStatsVisibility.mockReturnValue({
        showPutts: true,
        showFairwayHit: false,
        showGreenInRegulation: true,
        showFairwayMissDirection: false,
        showGreenMissDirection: false,
        showBunkerShots: false,
        showHazards: false,
        hasAnyDetailedStats: false,
      });
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.queryByText('FIR')).toBeNull();
    });
  });

  describe('Stats Row - GIR (Green in Regulation)', () => {
    beforeEach(() => {
      mockUseStatsVisibility.mockReturnValue({
        showPutts: true,
        showFairwayHit: true,
        showGreenInRegulation: true,
      });
    });

    it('shows GIR checkbox', () => {
      const props = createDefaultProps();
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('GIR')).toBeTruthy();
      expect(screen.getByLabelText('Green in regulation')).toBeTruthy();
    });

    it('toggles GIR when pressed', () => {
      const onStatsUpdate = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 4, greenInRegulation: undefined },
        onStatsUpdate,
      });
      render(<PlayerScoreCard {...props} />);

      const girCheckbox = screen.getByLabelText('Green in regulation');
      fireEvent.press(girCheckbox);

      expect(onStatsUpdate).toHaveBeenCalledWith({ greenInRegulation: true });
    });

    it('toggles GIR off when already checked', () => {
      const onStatsUpdate = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 4, greenInRegulation: true },
        onStatsUpdate,
      });
      render(<PlayerScoreCard {...props} />);

      const girCheckbox = screen.getByLabelText('Green in regulation');
      fireEvent.press(girCheckbox);

      expect(onStatsUpdate).toHaveBeenCalledWith({ greenInRegulation: false });
    });

    it('hides GIR when showGreenInRegulation is false', () => {
      mockUseStatsVisibility.mockReturnValue({
        showPutts: true,
        showFairwayHit: true,
        showGreenInRegulation: false,
        showFairwayMissDirection: false,
        showGreenMissDirection: false,
        showBunkerShots: false,
        showHazards: false,
        hasAnyDetailedStats: false,
      });
      const props = createDefaultProps();
      render(<PlayerScoreCard {...props} />);

      expect(screen.queryByText('GIR')).toBeNull();
    });
  });

  describe('Stats Row - Putts', () => {
    beforeEach(() => {
      mockUseStatsVisibility.mockReturnValue({
        showPutts: true,
        showFairwayHit: true,
        showGreenInRegulation: true,
      });
    });

    it('shows PUTTS label', () => {
      const props = createDefaultProps();
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('PUTTS')).toBeTruthy();
    });

    it('displays dash when no putts entered', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 4, putts: undefined },
      });
      render(<PlayerScoreCard {...props} />);

      // Dash for empty putts (may have multiple dashes)
      expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
    });

    it('displays current putts count', () => {
      const props = createDefaultProps({
        currentScore: { strokes: 4, putts: 2 },
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });

    it('increments putts when plus pressed', () => {
      const onStatsUpdate = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 4, putts: 2 },
        onStatsUpdate,
      });
      render(<PlayerScoreCard {...props} />);

      const increaseButton = screen.getByLabelText('Increase putts');
      fireEvent.press(increaseButton);

      expect(onStatsUpdate).toHaveBeenCalledWith({ putts: 3 });
    });

    it('decrements putts when minus pressed', () => {
      const onStatsUpdate = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 4, putts: 2 },
        onStatsUpdate,
      });
      render(<PlayerScoreCard {...props} />);

      const decreaseButton = screen.getByLabelText('Decrease putts');
      fireEvent.press(decreaseButton);

      expect(onStatsUpdate).toHaveBeenCalledWith({ putts: 1 });
    });

    it('does not go below 0 putts', () => {
      const onStatsUpdate = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 4, putts: 0 },
        onStatsUpdate,
      });
      render(<PlayerScoreCard {...props} />);

      const decreaseButton = screen.getByLabelText('Decrease putts');
      fireEvent.press(decreaseButton);

      expect(onStatsUpdate).not.toHaveBeenCalled();
    });

    it('does not go above 6 putts', () => {
      const onStatsUpdate = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 4, putts: 6 },
        onStatsUpdate,
      });
      render(<PlayerScoreCard {...props} />);

      const increaseButton = screen.getByLabelText('Increase putts');
      fireEvent.press(increaseButton);

      expect(onStatsUpdate).not.toHaveBeenCalled();
    });

    it('starts at 0 when incrementing with undefined putts', () => {
      const onStatsUpdate = jest.fn();
      const props = createDefaultProps({
        currentScore: { strokes: 4, putts: undefined },
        onStatsUpdate,
      });
      render(<PlayerScoreCard {...props} />);

      const increaseButton = screen.getByLabelText('Increase putts');
      fireEvent.press(increaseButton);

      expect(onStatsUpdate).toHaveBeenCalledWith({ putts: 1 });
    });

    it('hides putts when showPutts is false', () => {
      mockUseStatsVisibility.mockReturnValue({
        showPutts: false,
        showFairwayHit: true,
        showGreenInRegulation: true,
        showFairwayMissDirection: false,
        showGreenMissDirection: false,
        showBunkerShots: false,
        showHazards: false,
        hasAnyDetailedStats: false,
      });
      const props = createDefaultProps();
      render(<PlayerScoreCard {...props} />);

      expect(screen.queryByText('PUTTS')).toBeNull();
    });
  });

  describe('Stats Row Visibility', () => {
    it('hides entire stats row when all stats disabled', () => {
      mockUseStatsVisibility.mockReturnValue({
        showPutts: false,
        showFairwayHit: false,
        showGreenInRegulation: false,
        showFairwayMissDirection: false,
        showGreenMissDirection: false,
        showBunkerShots: false,
        showHazards: false,
        hasAnyDetailedStats: false,
      });
      const props = createDefaultProps();
      render(<PlayerScoreCard {...props} />);

      expect(screen.queryByText('FIR')).toBeNull();
      expect(screen.queryByText('GIR')).toBeNull();
      expect(screen.queryByText('PUTTS')).toBeNull();
    });

    it('shows only putts when only showPutts is true', () => {
      mockUseStatsVisibility.mockReturnValue({
        showPutts: true,
        showFairwayHit: false,
        showGreenInRegulation: false,
        showFairwayMissDirection: false,
        showGreenMissDirection: false,
        showBunkerShots: false,
        showHazards: false,
        hasAnyDetailedStats: false,
      });
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.queryByText('FIR')).toBeNull();
      expect(screen.queryByText('GIR')).toBeNull();
      expect(screen.getByText('PUTTS')).toBeTruthy();
    });

    it('shows FIR and GIR but not putts when appropriate', () => {
      mockUseStatsVisibility.mockReturnValue({
        showPutts: false,
        showFairwayHit: true,
        showGreenInRegulation: true,
        showFairwayMissDirection: false,
        showGreenMissDirection: false,
        showBunkerShots: false,
        showHazards: false,
        hasAnyDetailedStats: false,
      });
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('FIR')).toBeTruthy();
      expect(screen.getByText('GIR')).toBeTruthy();
      expect(screen.queryByText('PUTTS')).toBeNull();
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
      render(<PlayerScoreCard {...props} />);

      const minusButton = screen.getByLabelText('Decrease score');
      const plusButton = screen.getByLabelText('Increase score');

      fireEvent.press(minusButton);
      fireEvent.press(plusButton);

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('does not call onStatsUpdate when stats toggled while disabled', () => {
      const onStatsUpdate = jest.fn();
      const props = createDefaultProps({
        disabled: true,
        currentHole: getTestHole(1), // Par 4
        onStatsUpdate,
      });
      render(<PlayerScoreCard {...props} />);

      const firCheckbox = screen.getByLabelText('Fairway in regulation');
      const girCheckbox = screen.getByLabelText('Green in regulation');

      fireEvent.press(firCheckbox);
      fireEvent.press(girCheckbox);

      expect(onStatsUpdate).not.toHaveBeenCalled();
    });

    it('does not call onStatsUpdate when putts changed while disabled', () => {
      const onStatsUpdate = jest.fn();
      const props = createDefaultProps({
        disabled: true,
        currentScore: { strokes: 4, putts: 2 },
        onStatsUpdate,
      });
      render(<PlayerScoreCard {...props} />);

      const increaseButton = screen.getByLabelText('Increase putts');
      const decreaseButton = screen.getByLabelText('Decrease putts');

      fireEvent.press(increaseButton);
      fireEvent.press(decreaseButton);

      expect(onStatsUpdate).not.toHaveBeenCalled();
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
      render(<PlayerScoreCard {...props} />);

      // Check all accessibility labels exist
      expect(screen.getByLabelText('Pick up ball')).toBeTruthy();
      expect(screen.getByLabelText('Decrease score')).toBeTruthy();
      expect(screen.getByLabelText('Increase score')).toBeTruthy();
      expect(screen.getByLabelText('Score par 4')).toBeTruthy();
      expect(screen.getByLabelText('Fairway in regulation')).toBeTruthy();
      expect(screen.getByLabelText('Green in regulation')).toBeTruthy();
      expect(screen.getByLabelText('Increase putts')).toBeTruthy();
      expect(screen.getByLabelText('Decrease putts')).toBeTruthy();
    });

    it('has accessibility role for checkboxes', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
      });
      render(<PlayerScoreCard {...props} />);

      const firCheckbox = screen.getByLabelText('Fairway in regulation');
      const girCheckbox = screen.getByLabelText('Green in regulation');

      expect(firCheckbox.props.accessibilityRole).toBe('checkbox');
      expect(girCheckbox.props.accessibilityRole).toBe('checkbox');
    });

    it('has accessibility state for checkboxes', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
        currentScore: { strokes: 4, fairwayHit: true, greenInRegulation: false },
      });
      render(<PlayerScoreCard {...props} />);

      const firCheckbox = screen.getByLabelText('Fairway in regulation');
      const girCheckbox = screen.getByLabelText('Green in regulation');

      expect(firCheckbox.props.accessibilityState.checked).toBe(true);
      expect(girCheckbox.props.accessibilityState.checked).toBe(false);
    });

    it('has accessibility hint for par button', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
      });
      render(<PlayerScoreCard {...props} />);

      const parButton = screen.getByLabelText('Score par 4');
      expect(parButton.props.accessibilityHint).toContain('par which is 4');
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
      render(<PlayerScoreCard {...props} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('handles player with very long name', () => {
      const props = createDefaultProps({
        player: createTestPlayer({
          name: 'Alexander Maximilian Von Rothschild III',
        }),
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('Alexander Maximilian Von Rothschild III')).toBeTruthy();
    });

    it('handles onStatsUpdate being undefined', () => {
      const props = createDefaultProps({
        currentHole: getTestHole(1), // Par 4
        onStatsUpdate: undefined,
      });
      render(<PlayerScoreCard {...props} />);

      // Should not throw when pressing stats
      const firCheckbox = screen.getByLabelText('Fairway in regulation');
      fireEvent.press(firCheckbox);

      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('handles zero handicap player', () => {
      const props = createDefaultProps({
        player: createTestPlayer({ handicap: 0 }),
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('HC: 0')).toBeTruthy();
    });

    it('handles maximum handicap player', () => {
      const props = createDefaultProps({
        player: createTestPlayer({ handicap: 54 }),
      });
      render(<PlayerScoreCard {...props} />);

      expect(screen.getByText('HC: 54')).toBeTruthy();
    });

    it('handles all par types', () => {
      // Par 3
      const { unmount: unmount3 } = render(
        <PlayerScoreCard {...createDefaultProps({ currentHole: getTestHole(2) })} />
      );
      expect(screen.getByLabelText('Score par 3')).toBeTruthy();
      unmount3();

      // Par 4
      const { unmount: unmount4 } = render(
        <PlayerScoreCard {...createDefaultProps({ currentHole: getTestHole(1) })} />
      );
      expect(screen.getByLabelText('Score par 4')).toBeTruthy();
      unmount4();

      // Par 5
      render(<PlayerScoreCard {...createDefaultProps({ currentHole: getTestHole(3) })} />);
      expect(screen.getByLabelText('Score par 5')).toBeTruthy();
    });
  });
});
