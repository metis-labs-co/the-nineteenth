/**
 * MultiBallScoreInput Component Tests
 *
 * Tests for the multi-ball score input component including:
 * - FIR/GIR checkbox visibility and interaction
 * - FIR checkbox behavior on par 3 vs par 4+ holes
 * - Picked up ball disabling FIR/GIR inputs
 * - Stats change callback handling
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { MultiBallScoreInput } from './MultiBallScoreInput';
import type { Player, Hole, HoleScore } from '@/types';

// Mock the scoring utilities
jest.mock('@/utils/scoring', () => ({
  getStrokesOnHole: jest.fn().mockReturnValue(1),
  calculateStablefordPoints: jest.fn().mockReturnValue(2),
}));

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

const createTestPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-1',
  name: 'Test Player',
  handicap: 18,
  ...overrides,
});

const createPar4Hole = (overrides: Partial<Hole> = {}): Hole => ({
  number: 1 as Hole['number'],
  par: 4,
  strokeIndex: 7,
  yardages: { white: 380 },
  ...overrides,
});

const createPar3Hole = (overrides: Partial<Hole> = {}): Hole => ({
  number: 3 as Hole['number'],
  par: 3,
  strokeIndex: 17,
  yardages: { white: 150 },
  ...overrides,
});

const createBallScore = (overrides: Partial<HoleScore> = {}): HoleScore => ({
  strokes: 4,
  ...overrides,
});

describe('MultiBallScoreInput FIR/GIR', () => {
  const defaultProps = {
    player: createTestPlayer(),
    currentHole: createPar4Hole(),
    ballCount: 2 as const,
    ballScores: [undefined, undefined] as (HoleScore | undefined)[],
    onBallScoreChange: jest.fn(),
    onBallStatsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // VISIBILITY TESTS
  // ===========================================================================

  describe('Checkbox Visibility', () => {
    it('should not show FIR/GIR checkboxes when showFIR and showGIR are false', () => {
      render(
        <MultiBallScoreInput
          {...defaultProps}
          showFIR={false}
          showGIR={false}
        />
      );

      // Look for the checkbox labels - they should not be present
      expect(screen.queryByText('FIR')).toBeNull();
      expect(screen.queryByText('GIR')).toBeNull();
    });

    it('should show FIR checkbox when showFIR is true and hole is par 4+', () => {
      render(
        <MultiBallScoreInput
          {...defaultProps}
          currentHole={createPar4Hole()}
          showFIR={true}
          showGIR={false}
        />
      );

      // FIR checkbox should be visible (one for each ball)
      expect(screen.getAllByText('FIR').length).toBeGreaterThanOrEqual(1);
    });

    it('should not show FIR checkbox when showFIR is true but hole is par 3', () => {
      render(
        <MultiBallScoreInput
          {...defaultProps}
          currentHole={createPar3Hole()}
          showFIR={true}
          showGIR={false}
        />
      );

      // FIR checkbox should not be visible on par 3
      expect(screen.queryByText('FIR')).toBeNull();
    });

    it('should show GIR checkbox when showGIR is true', () => {
      render(
        <MultiBallScoreInput
          {...defaultProps}
          showFIR={false}
          showGIR={true}
        />
      );

      // GIR checkbox should be visible (one for each ball)
      expect(screen.getAllByText('GIR').length).toBeGreaterThanOrEqual(1);
    });

    it('should show both FIR and GIR checkboxes when both are true and hole is par 4+', () => {
      render(
        <MultiBallScoreInput
          {...defaultProps}
          currentHole={createPar4Hole()}
          showFIR={true}
          showGIR={true}
        />
      );

      expect(screen.getAllByText('FIR').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('GIR').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // INTERACTION TESTS
  // ===========================================================================

  describe('Checkbox Interactions', () => {
    it('should call onBallStatsChange with fairwayHit when FIR checkbox tapped', () => {
      const onBallStatsChange = jest.fn();

      render(
        <MultiBallScoreInput
          {...defaultProps}
          ballScores={[createBallScore(), createBallScore()]}
          onBallStatsChange={onBallStatsChange}
          showFIR={true}
          showGIR={false}
        />
      );

      // Find and tap the first FIR checkbox (accessibility label contains "fairway")
      const firButtons = screen.getAllByLabelText(/fairway in regulation/i);
      fireEvent.press(firButtons[0]);

      expect(onBallStatsChange).toHaveBeenCalledWith(0, { fairwayHit: true });
    });

    it('should call onBallStatsChange with greenInRegulation when GIR checkbox tapped', () => {
      const onBallStatsChange = jest.fn();

      render(
        <MultiBallScoreInput
          {...defaultProps}
          ballScores={[createBallScore(), createBallScore()]}
          onBallStatsChange={onBallStatsChange}
          showFIR={false}
          showGIR={true}
        />
      );

      // Find and tap the first GIR checkbox
      const girButtons = screen.getAllByLabelText(/green in regulation/i);
      fireEvent.press(girButtons[0]);

      expect(onBallStatsChange).toHaveBeenCalledWith(0, { greenInRegulation: true });
    });

    it('should toggle fairwayHit off when already true', () => {
      const onBallStatsChange = jest.fn();

      render(
        <MultiBallScoreInput
          {...defaultProps}
          ballScores={[
            createBallScore({ fairwayHit: true }),
            createBallScore(),
          ]}
          onBallStatsChange={onBallStatsChange}
          showFIR={true}
          showGIR={false}
        />
      );

      const firButtons = screen.getAllByLabelText(/fairway in regulation/i);
      fireEvent.press(firButtons[0]);

      // Should toggle to false
      expect(onBallStatsChange).toHaveBeenCalledWith(0, { fairwayHit: false });
    });

    it('should toggle greenInRegulation off when already true', () => {
      const onBallStatsChange = jest.fn();

      render(
        <MultiBallScoreInput
          {...defaultProps}
          ballScores={[
            createBallScore({ greenInRegulation: true }),
            createBallScore(),
          ]}
          onBallStatsChange={onBallStatsChange}
          showFIR={false}
          showGIR={true}
        />
      );

      const girButtons = screen.getAllByLabelText(/green in regulation/i);
      fireEvent.press(girButtons[0]);

      expect(onBallStatsChange).toHaveBeenCalledWith(0, { greenInRegulation: false });
    });
  });

  // ===========================================================================
  // PICKED UP BALL TESTS
  // ===========================================================================

  describe('Picked Up Ball Behavior', () => {
    const PICKUP_SCORE = 10; // from constants/scoring

    it('should disable FIR/GIR checkboxes when ball is picked up', () => {
      const onBallStatsChange = jest.fn();

      render(
        <MultiBallScoreInput
          {...defaultProps}
          ballScores={[
            { strokes: PICKUP_SCORE }, // Picked up
            createBallScore(),
          ]}
          onBallStatsChange={onBallStatsChange}
          showFIR={true}
          showGIR={true}
        />
      );

      // Both FIR and GIR buttons should be present
      const firButtons = screen.getAllByLabelText(/fairway in regulation/i);
      const girButtons = screen.getAllByLabelText(/green in regulation/i);

      // Press the first ball's FIR button (which is picked up)
      fireEvent.press(firButtons[0]);
      expect(onBallStatsChange).not.toHaveBeenCalled();

      // Press the first ball's GIR button (which is picked up)
      fireEvent.press(girButtons[0]);
      expect(onBallStatsChange).not.toHaveBeenCalled();

      // Press the second ball's buttons (which is NOT picked up)
      fireEvent.press(firButtons[1]);
      expect(onBallStatsChange).toHaveBeenCalledWith(1, { fairwayHit: true });
    });
  });

  // ===========================================================================
  // CHECKED STATE TESTS
  // ===========================================================================

  describe('Checked State Display', () => {
    it('should show checked state when fairwayHit is true', () => {
      render(
        <MultiBallScoreInput
          {...defaultProps}
          ballScores={[
            createBallScore({ fairwayHit: true }),
            createBallScore({ fairwayHit: false }),
          ]}
          showFIR={true}
          showGIR={false}
        />
      );

      // First ball should show checked state
      const firButtons = screen.getAllByLabelText(/fairway in regulation/i);
      expect(firButtons[0].props.accessibilityState.checked).toBe(true);
      expect(firButtons[1].props.accessibilityState.checked).toBe(false);
    });

    it('should show checked state when greenInRegulation is true', () => {
      render(
        <MultiBallScoreInput
          {...defaultProps}
          ballScores={[
            createBallScore({ greenInRegulation: true }),
            createBallScore({ greenInRegulation: false }),
          ]}
          showFIR={false}
          showGIR={true}
        />
      );

      const girButtons = screen.getAllByLabelText(/green in regulation/i);
      expect(girButtons[0].props.accessibilityState.checked).toBe(true);
      expect(girButtons[1].props.accessibilityState.checked).toBe(false);
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('should not allow FIR/GIR interaction when disabled prop is true', () => {
      const onBallStatsChange = jest.fn();

      render(
        <MultiBallScoreInput
          {...defaultProps}
          ballScores={[createBallScore(), createBallScore()]}
          onBallStatsChange={onBallStatsChange}
          showFIR={true}
          showGIR={true}
          disabled={true}
        />
      );

      const firButtons = screen.getAllByLabelText(/fairway in regulation/i);
      fireEvent.press(firButtons[0]);

      expect(onBallStatsChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // MULTIPLE BALLS TESTS
  // ===========================================================================

  describe('Multiple Balls', () => {
    it('should call onBallStatsChange with correct ball index for each ball', () => {
      const onBallStatsChange = jest.fn();

      render(
        <MultiBallScoreInput
          {...defaultProps}
          ballCount={3}
          ballScores={[createBallScore(), createBallScore(), createBallScore()]}
          onBallStatsChange={onBallStatsChange}
          showFIR={true}
          showGIR={false}
        />
      );

      const firButtons = screen.getAllByLabelText(/fairway in regulation/i);

      // Tap each ball's FIR button
      fireEvent.press(firButtons[0]);
      expect(onBallStatsChange).toHaveBeenLastCalledWith(0, { fairwayHit: true });

      fireEvent.press(firButtons[1]);
      expect(onBallStatsChange).toHaveBeenLastCalledWith(1, { fairwayHit: true });

      fireEvent.press(firButtons[2]);
      expect(onBallStatsChange).toHaveBeenLastCalledWith(2, { fairwayHit: true });
    });

    it('should handle 4 balls correctly', () => {
      render(
        <MultiBallScoreInput
          {...defaultProps}
          ballCount={4}
          ballScores={[
            createBallScore(),
            createBallScore(),
            createBallScore(),
            createBallScore(),
          ]}
          showFIR={true}
          showGIR={true}
        />
      );

      // Should have 4 FIR and 4 GIR checkboxes
      const firButtons = screen.getAllByLabelText(/fairway in regulation/i);
      const girButtons = screen.getAllByLabelText(/green in regulation/i);

      expect(firButtons.length).toBe(4);
      expect(girButtons.length).toBe(4);
    });
  });

  // ===========================================================================
  // NO CALLBACK TESTS
  // ===========================================================================

  describe('No Stats Callback', () => {
    it('should not throw when onBallStatsChange is not provided', () => {
      expect(() => {
        render(
          <MultiBallScoreInput
            {...defaultProps}
            onBallStatsChange={undefined}
            showFIR={true}
            showGIR={true}
          />
        );
      }).not.toThrow();
    });
  });
});
