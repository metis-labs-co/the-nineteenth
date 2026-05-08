/**
 * usePlayerScoreCardLogic Hook Tests
 *
 * Tests for auto-clear logic:
 * - handleFairwayToggle clears fairwayMissDirection when toggling to "hit"
 * - handleGIRToggle clears greenMissDirection when toggling to "hit"
 * - handleDetailedStatsUpdate passes through partial HoleScore
 */

import { renderHook, act } from '@testing-library/react-native';
import { usePlayerScoreCardLogic, MAX_SCORE, MIN_SCORE } from './usePlayerScoreCardLogic';
import { PICKUP_SCORE } from '@/constants/scoring';
import type { Hole, HoleScore } from '@/types';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@/utils/scoring', () => ({
  getStrokesOnHole: jest.fn(() => 0),
  calculateStablefordPointsNet: jest.fn(() => 2),
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

const testHole: Hole = { number: 1, par: 4, strokeIndex: 7 };

// ============================================================================
// TESTS
// ============================================================================

describe('usePlayerScoreCardLogic', () => {
  describe('handleFairwayToggle auto-clear', () => {
    it('clears fairwayMissDirection when toggling fairway to hit', () => {
      const onStatsUpdate = jest.fn();
      const onScoreSelect = jest.fn();

      // currentScore has fairwayHit: false with a miss direction set
      const currentScore: HoleScore = {
        strokes: 5,
        fairwayHit: false,
        fairwayMissDirection: 'left',
      };

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore,
          onScoreSelect,
          onStatsUpdate,
        })
      );

      act(() => {
        result.current.handleFairwayToggle();
      });

      expect(onStatsUpdate).toHaveBeenCalledTimes(1);
      expect(onStatsUpdate).toHaveBeenCalledWith({
        fairwayHit: true,
        fairwayMissDirection: undefined,
      });
    });

    it('does not clear direction when toggling fairway to miss', () => {
      const onStatsUpdate = jest.fn();
      const onScoreSelect = jest.fn();

      // currentScore has fairwayHit: true — toggling will set it to false
      const currentScore: HoleScore = {
        strokes: 4,
        fairwayHit: true,
      };

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore,
          onScoreSelect,
          onStatsUpdate,
        })
      );

      act(() => {
        result.current.handleFairwayToggle();
      });

      expect(onStatsUpdate).toHaveBeenCalledTimes(1);
      expect(onStatsUpdate).toHaveBeenCalledWith({ fairwayHit: false });
    });
  });

  describe('handleGIRToggle auto-clear', () => {
    it('clears greenMissDirection when toggling GIR to hit', () => {
      const onStatsUpdate = jest.fn();
      const onScoreSelect = jest.fn();

      // currentScore has greenInRegulation: false with a miss direction set
      const currentScore: HoleScore = {
        strokes: 5,
        greenInRegulation: false,
        greenMissDirection: 'right',
      };

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore,
          onScoreSelect,
          onStatsUpdate,
        })
      );

      act(() => {
        result.current.handleGIRToggle();
      });

      expect(onStatsUpdate).toHaveBeenCalledTimes(1);
      expect(onStatsUpdate).toHaveBeenCalledWith({
        greenInRegulation: true,
        greenMissDirection: undefined,
      });
    });

    it('does not clear direction when toggling GIR to miss', () => {
      const onStatsUpdate = jest.fn();
      const onScoreSelect = jest.fn();

      // currentScore has greenInRegulation: true — toggling will set it to false
      const currentScore: HoleScore = {
        strokes: 3,
        greenInRegulation: true,
      };

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore,
          onScoreSelect,
          onStatsUpdate,
        })
      );

      act(() => {
        result.current.handleGIRToggle();
      });

      expect(onStatsUpdate).toHaveBeenCalledTimes(1);
      expect(onStatsUpdate).toHaveBeenCalledWith({ greenInRegulation: false });
    });
  });

  describe('handleShotIncrement (auto-bump from logged shot)', () => {
    it('sets strokes to 1 on first shot when no score exists', () => {
      const onScoreSelect = jest.fn();

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore: undefined,
          onScoreSelect,
        })
      );

      act(() => {
        result.current.handleShotIncrement();
      });

      expect(onScoreSelect).toHaveBeenCalledWith(1);
    });

    it('adds 1 stroke on subsequent shots', () => {
      const onScoreSelect = jest.fn();
      const currentScore: HoleScore = { strokes: 3 };

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore,
          onScoreSelect,
        })
      );

      act(() => {
        result.current.handleShotIncrement();
      });

      expect(onScoreSelect).toHaveBeenCalledWith(4);
    });

    it('caps at MAX_SCORE', () => {
      const onScoreSelect = jest.fn();
      const currentScore: HoleScore = { strokes: MAX_SCORE };

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore,
          onScoreSelect,
        })
      );

      act(() => {
        result.current.handleShotIncrement();
      });

      expect(onScoreSelect).toHaveBeenCalledWith(MAX_SCORE);
    });

    it('no-ops when disabled', () => {
      const onScoreSelect = jest.fn();

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore: { strokes: 3 },
          onScoreSelect,
          disabled: true,
        })
      );

      act(() => {
        result.current.handleShotIncrement();
      });

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('no-ops when picked up', () => {
      const onScoreSelect = jest.fn();

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore: { strokes: PICKUP_SCORE },
          onScoreSelect,
        })
      );

      act(() => {
        result.current.handleShotIncrement();
      });

      expect(onScoreSelect).not.toHaveBeenCalled();
    });
  });

  describe('handleShotDecrement (auto-decrement on undo)', () => {
    it('removes 1 stroke from current score', () => {
      const onScoreSelect = jest.fn();
      const currentScore: HoleScore = { strokes: 4 };

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore,
          onScoreSelect,
        })
      );

      act(() => {
        result.current.handleShotDecrement();
      });

      expect(onScoreSelect).toHaveBeenCalledWith(3);
    });

    it('floors at MIN_SCORE', () => {
      const onScoreSelect = jest.fn();
      const currentScore: HoleScore = { strokes: MIN_SCORE };

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore,
          onScoreSelect,
        })
      );

      act(() => {
        result.current.handleShotDecrement();
      });

      expect(onScoreSelect).toHaveBeenCalledWith(MIN_SCORE);
    });

    it('no-ops when no score is set', () => {
      const onScoreSelect = jest.fn();

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore: undefined,
          onScoreSelect,
        })
      );

      act(() => {
        result.current.handleShotDecrement();
      });

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('no-ops when disabled', () => {
      const onScoreSelect = jest.fn();

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore: { strokes: 4 },
          onScoreSelect,
          disabled: true,
        })
      );

      act(() => {
        result.current.handleShotDecrement();
      });

      expect(onScoreSelect).not.toHaveBeenCalled();
    });

    it('no-ops when picked up', () => {
      const onScoreSelect = jest.fn();

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore: { strokes: PICKUP_SCORE },
          onScoreSelect,
        })
      );

      act(() => {
        result.current.handleShotDecrement();
      });

      expect(onScoreSelect).not.toHaveBeenCalled();
    });
  });

  describe('handleDetailedStatsUpdate', () => {
    it('passes through partial HoleScore to onStatsUpdate', () => {
      const onStatsUpdate = jest.fn();
      const onScoreSelect = jest.fn();

      const currentScore: HoleScore = { strokes: 4 };

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore,
          onScoreSelect,
          onStatsUpdate,
        })
      );

      const updates: Partial<HoleScore> = { putts: 2, penalties: 1 };

      act(() => {
        result.current.handleDetailedStatsUpdate(updates);
      });

      expect(onStatsUpdate).toHaveBeenCalledTimes(1);
      expect(onStatsUpdate).toHaveBeenCalledWith(updates);
    });

    it('does not call onStatsUpdate when disabled', () => {
      const onStatsUpdate = jest.fn();
      const onScoreSelect = jest.fn();

      const currentScore: HoleScore = { strokes: 4 };

      const { result } = renderHook(() =>
        usePlayerScoreCardLogic({
          handicap: 10,
          currentHole: testHole,
          currentScore,
          onScoreSelect,
          onStatsUpdate,
          disabled: true,
        })
      );

      act(() => {
        result.current.handleDetailedStatsUpdate({ putts: 2 });
      });

      expect(onStatsUpdate).not.toHaveBeenCalled();
    });
  });
});
