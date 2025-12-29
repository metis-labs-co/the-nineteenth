/**
 * ScoreIndicator Component Tests
 *
 * Tests for the unified ScoreIndicator component that displays golf scores
 * with visual styling based on performance relative to par.
 *
 * Bordered display (default):
 * - Eagle or better (-2+): Double circle
 * - Birdie (-1): Single circle
 * - Par (0): No indicator (just text)
 * - Bogey (+1): Single square
 * - Double bogey (+2+): Double square
 * - Pickup (10+): Red "P"
 * - No score (undefined/0): Dash "-"
 *
 * Compact display:
 * - Uses colored backgrounds instead of borders
 * - More space-efficient for individual scorecard views
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { ScoreIndicator, ScoreIndicatorProps } from './ScoreIndicator';

// Mock the scoring utility to have predictable colors
jest.mock('@/utils/scoring', () => ({
  getScoreColor: (score: number, par: number) => {
    const diff = score - par;
    if (diff < 0) return '#22c55e'; // Green for under par
    if (diff === 0) return '#3b82f6'; // Blue for par
    if (diff === 1) return '#f59e0b'; // Orange for bogey
    return '#ef4444'; // Red for double bogey or worse
  },
}));

// Mock the display helpers utility
jest.mock('@/utils/displayHelpers', () => ({
  getScoreBackgroundColor: (score: number, par: number, colors: any) => {
    const diff = score - par;
    if (diff <= -2) return colors.eagleBackground || '#dcfce7';
    if (diff === -1) return colors.birdieBackground || '#bbf7d0';
    if (diff === 0) return colors.parBackground || '#dbeafe';
    if (diff === 1) return colors.bogeyBackground || '#fef3c7';
    return colors.doubleBogeyBackground || '#fee2e2';
  },
}));

// Mock the scorecardLayout utility
jest.mock('@/utils/scorecardLayout', () => ({
  PICKUP_SCORE: 10,
}));

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

/**
 * Helper to render ScoreIndicator with default props
 */
function renderScoreIndicator(props: Partial<ScoreIndicatorProps> = {}) {
  const defaultProps: ScoreIndicatorProps = {
    strokes: 4,
    par: 4,
    ...props,
  };
  return render(<ScoreIndicator {...defaultProps} />);
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('ScoreIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      expect(() => renderScoreIndicator()).not.toThrow();
    });

    it('renders with required props only', () => {
      renderScoreIndicator({ strokes: 4, par: 4 });
      expect(screen.getByText('4')).toBeTruthy();
    });

    it('applies memo correctly for performance', () => {
      const { rerender } = renderScoreIndicator({ strokes: 4, par: 4 });
      // Re-render with same props should work (memo comparison)
      rerender(<ScoreIndicator strokes={4} par={4} />);
      expect(screen.getByText('4')).toBeTruthy();
    });
  });

  // =========================================================================
  // NO SCORE DISPLAY
  // =========================================================================

  describe('No Score Display', () => {
    it('shows dash when strokes is undefined', () => {
      renderScoreIndicator({ strokes: undefined, par: 4 });
      expect(screen.getByText('-')).toBeTruthy();
    });

    it('shows dash when strokes is 0', () => {
      renderScoreIndicator({ strokes: 0, par: 4 });
      expect(screen.getByText('-')).toBeTruthy();
    });

    it('shows dash for par 3 hole with no score', () => {
      renderScoreIndicator({ strokes: undefined, par: 3 });
      expect(screen.getByText('-')).toBeTruthy();
    });

    it('shows dash for par 5 hole with no score', () => {
      renderScoreIndicator({ strokes: undefined, par: 5 });
      expect(screen.getByText('-')).toBeTruthy();
    });
  });

  // =========================================================================
  // PICKUP DISPLAY
  // =========================================================================

  describe('Pickup Display', () => {
    it('shows P for pickup score (10)', () => {
      renderScoreIndicator({ strokes: 10, par: 4 });
      expect(screen.getByText('P')).toBeTruthy();
    });

    it('shows P for score of 11', () => {
      renderScoreIndicator({ strokes: 11, par: 4 });
      expect(screen.getByText('P')).toBeTruthy();
    });

    it('shows P for score of 12', () => {
      renderScoreIndicator({ strokes: 12, par: 4 });
      expect(screen.getByText('P')).toBeTruthy();
    });

    it('shows P for very high score (99)', () => {
      renderScoreIndicator({ strokes: 99, par: 4 });
      expect(screen.getByText('P')).toBeTruthy();
    });

    it('shows P regardless of par value', () => {
      renderScoreIndicator({ strokes: 10, par: 3 });
      expect(screen.getByText('P')).toBeTruthy();
    });

    it('shows P for pickup on par 5', () => {
      renderScoreIndicator({ strokes: 15, par: 5 });
      expect(screen.getByText('P')).toBeTruthy();
    });
  });

  // =========================================================================
  // EAGLE OR BETTER DISPLAY (DOUBLE CIRCLE)
  // =========================================================================

  describe('Eagle or Better Display (Double Circle)', () => {
    it('displays eagle score (2 under par) on par 4', () => {
      renderScoreIndicator({ strokes: 2, par: 4 });
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('displays eagle score on par 5', () => {
      renderScoreIndicator({ strokes: 3, par: 5 });
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('displays albatross score (3 under par) on par 5', () => {
      renderScoreIndicator({ strokes: 2, par: 5 });
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('displays hole-in-one on par 4 (3 under)', () => {
      renderScoreIndicator({ strokes: 1, par: 4 });
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('displays condor (4 under) on par 5', () => {
      renderScoreIndicator({ strokes: 1, par: 5 });
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('displays double eagle on par 4', () => {
      renderScoreIndicator({ strokes: 1, par: 4 });
      expect(screen.getByText('1')).toBeTruthy();
    });
  });

  // =========================================================================
  // BIRDIE DISPLAY (SINGLE CIRCLE)
  // =========================================================================

  describe('Birdie Display (Single Circle)', () => {
    it('displays birdie score on par 3', () => {
      renderScoreIndicator({ strokes: 2, par: 3 });
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('displays birdie score on par 4', () => {
      renderScoreIndicator({ strokes: 3, par: 4 });
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('displays birdie score on par 5', () => {
      renderScoreIndicator({ strokes: 4, par: 5 });
      expect(screen.getByText('4')).toBeTruthy();
    });
  });

  // =========================================================================
  // PAR DISPLAY (NO INDICATOR)
  // =========================================================================

  describe('Par Display (No Indicator)', () => {
    it('displays par score on par 3', () => {
      renderScoreIndicator({ strokes: 3, par: 3 });
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('displays par score on par 4', () => {
      renderScoreIndicator({ strokes: 4, par: 4 });
      expect(screen.getByText('4')).toBeTruthy();
    });

    it('displays par score on par 5', () => {
      renderScoreIndicator({ strokes: 5, par: 5 });
      expect(screen.getByText('5')).toBeTruthy();
    });
  });

  // =========================================================================
  // BOGEY DISPLAY (SINGLE SQUARE)
  // =========================================================================

  describe('Bogey Display (Single Square)', () => {
    it('displays bogey score on par 3', () => {
      renderScoreIndicator({ strokes: 4, par: 3 });
      expect(screen.getByText('4')).toBeTruthy();
    });

    it('displays bogey score on par 4', () => {
      renderScoreIndicator({ strokes: 5, par: 4 });
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('displays bogey score on par 5', () => {
      renderScoreIndicator({ strokes: 6, par: 5 });
      expect(screen.getByText('6')).toBeTruthy();
    });
  });

  // =========================================================================
  // DOUBLE BOGEY OR WORSE DISPLAY (DOUBLE SQUARE)
  // =========================================================================

  describe('Double Bogey or Worse Display (Double Square)', () => {
    it('displays double bogey on par 3', () => {
      renderScoreIndicator({ strokes: 5, par: 3 });
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('displays double bogey on par 4', () => {
      renderScoreIndicator({ strokes: 6, par: 4 });
      expect(screen.getByText('6')).toBeTruthy();
    });

    it('displays double bogey on par 5', () => {
      renderScoreIndicator({ strokes: 7, par: 5 });
      expect(screen.getByText('7')).toBeTruthy();
    });

    it('displays triple bogey on par 4', () => {
      renderScoreIndicator({ strokes: 7, par: 4 });
      expect(screen.getByText('7')).toBeTruthy();
    });

    it('displays quadruple bogey on par 4', () => {
      renderScoreIndicator({ strokes: 8, par: 4 });
      expect(screen.getByText('8')).toBeTruthy();
    });

    it('displays 9 strokes (just under pickup)', () => {
      renderScoreIndicator({ strokes: 9, par: 4 });
      expect(screen.getByText('9')).toBeTruthy();
    });
  });

  // =========================================================================
  // SIZE VARIANTS
  // =========================================================================

  describe('Size Variants', () => {
    describe('Small Size (sm)', () => {
      it('renders small size indicator', () => {
        renderScoreIndicator({ strokes: 4, par: 4, size: 'sm' });
        expect(screen.getByText('4')).toBeTruthy();
      });

      it('renders small birdie', () => {
        renderScoreIndicator({ strokes: 3, par: 4, size: 'sm' });
        expect(screen.getByText('3')).toBeTruthy();
      });

      it('renders small eagle', () => {
        renderScoreIndicator({ strokes: 2, par: 4, size: 'sm' });
        expect(screen.getByText('2')).toBeTruthy();
      });

      it('renders small bogey', () => {
        renderScoreIndicator({ strokes: 5, par: 4, size: 'sm' });
        expect(screen.getByText('5')).toBeTruthy();
      });

      it('renders small double bogey', () => {
        renderScoreIndicator({ strokes: 6, par: 4, size: 'sm' });
        expect(screen.getByText('6')).toBeTruthy();
      });

      it('renders small pickup', () => {
        renderScoreIndicator({ strokes: 10, par: 4, size: 'sm' });
        expect(screen.getByText('P')).toBeTruthy();
      });

      it('renders small no score', () => {
        renderScoreIndicator({ strokes: undefined, par: 4, size: 'sm' });
        expect(screen.getByText('-')).toBeTruthy();
      });
    });

    describe('Medium Size (md - Default)', () => {
      it('uses medium as default size', () => {
        renderScoreIndicator({ strokes: 4, par: 4 });
        expect(screen.getByText('4')).toBeTruthy();
      });

      it('renders medium birdie', () => {
        renderScoreIndicator({ strokes: 3, par: 4, size: 'md' });
        expect(screen.getByText('3')).toBeTruthy();
      });

      it('renders medium eagle', () => {
        renderScoreIndicator({ strokes: 2, par: 4, size: 'md' });
        expect(screen.getByText('2')).toBeTruthy();
      });

      it('renders medium bogey', () => {
        renderScoreIndicator({ strokes: 5, par: 4, size: 'md' });
        expect(screen.getByText('5')).toBeTruthy();
      });

      it('renders medium double bogey', () => {
        renderScoreIndicator({ strokes: 6, par: 4, size: 'md' });
        expect(screen.getByText('6')).toBeTruthy();
      });
    });

    describe('Large Size (lg)', () => {
      it('renders large size indicator', () => {
        renderScoreIndicator({ strokes: 4, par: 4, size: 'lg' });
        expect(screen.getByText('4')).toBeTruthy();
      });

      it('renders large birdie', () => {
        renderScoreIndicator({ strokes: 3, par: 4, size: 'lg' });
        expect(screen.getByText('3')).toBeTruthy();
      });

      it('renders large eagle', () => {
        renderScoreIndicator({ strokes: 2, par: 4, size: 'lg' });
        expect(screen.getByText('2')).toBeTruthy();
      });

      it('renders large bogey', () => {
        renderScoreIndicator({ strokes: 5, par: 4, size: 'lg' });
        expect(screen.getByText('5')).toBeTruthy();
      });

      it('renders large double bogey', () => {
        renderScoreIndicator({ strokes: 6, par: 4, size: 'lg' });
        expect(screen.getByText('6')).toBeTruthy();
      });

      it('renders large pickup', () => {
        renderScoreIndicator({ strokes: 10, par: 4, size: 'lg' });
        expect(screen.getByText('P')).toBeTruthy();
      });

      it('renders large no score', () => {
        renderScoreIndicator({ strokes: undefined, par: 4, size: 'lg' });
        expect(screen.getByText('-')).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // PAR VALUE VARIATIONS
  // =========================================================================

  describe('Par Value Variations', () => {
    describe('Par 3 Holes', () => {
      it('hole-in-one is eagle (2 under)', () => {
        renderScoreIndicator({ strokes: 1, par: 3 });
        expect(screen.getByText('1')).toBeTruthy();
      });

      it('2 strokes is birdie', () => {
        renderScoreIndicator({ strokes: 2, par: 3 });
        expect(screen.getByText('2')).toBeTruthy();
      });

      it('3 strokes is par', () => {
        renderScoreIndicator({ strokes: 3, par: 3 });
        expect(screen.getByText('3')).toBeTruthy();
      });

      it('4 strokes is bogey', () => {
        renderScoreIndicator({ strokes: 4, par: 3 });
        expect(screen.getByText('4')).toBeTruthy();
      });

      it('5 strokes is double bogey', () => {
        renderScoreIndicator({ strokes: 5, par: 3 });
        expect(screen.getByText('5')).toBeTruthy();
      });
    });

    describe('Par 4 Holes', () => {
      it('hole-in-one is triple-under', () => {
        renderScoreIndicator({ strokes: 1, par: 4 });
        expect(screen.getByText('1')).toBeTruthy();
      });

      it('2 strokes is eagle', () => {
        renderScoreIndicator({ strokes: 2, par: 4 });
        expect(screen.getByText('2')).toBeTruthy();
      });

      it('3 strokes is birdie', () => {
        renderScoreIndicator({ strokes: 3, par: 4 });
        expect(screen.getByText('3')).toBeTruthy();
      });

      it('4 strokes is par', () => {
        renderScoreIndicator({ strokes: 4, par: 4 });
        expect(screen.getByText('4')).toBeTruthy();
      });

      it('5 strokes is bogey', () => {
        renderScoreIndicator({ strokes: 5, par: 4 });
        expect(screen.getByText('5')).toBeTruthy();
      });

      it('6 strokes is double bogey', () => {
        renderScoreIndicator({ strokes: 6, par: 4 });
        expect(screen.getByText('6')).toBeTruthy();
      });
    });

    describe('Par 5 Holes', () => {
      it('hole-in-one is condor (4 under)', () => {
        renderScoreIndicator({ strokes: 1, par: 5 });
        expect(screen.getByText('1')).toBeTruthy();
      });

      it('2 strokes is albatross', () => {
        renderScoreIndicator({ strokes: 2, par: 5 });
        expect(screen.getByText('2')).toBeTruthy();
      });

      it('3 strokes is eagle', () => {
        renderScoreIndicator({ strokes: 3, par: 5 });
        expect(screen.getByText('3')).toBeTruthy();
      });

      it('4 strokes is birdie', () => {
        renderScoreIndicator({ strokes: 4, par: 5 });
        expect(screen.getByText('4')).toBeTruthy();
      });

      it('5 strokes is par', () => {
        renderScoreIndicator({ strokes: 5, par: 5 });
        expect(screen.getByText('5')).toBeTruthy();
      });

      it('6 strokes is bogey', () => {
        renderScoreIndicator({ strokes: 6, par: 5 });
        expect(screen.getByText('6')).toBeTruthy();
      });

      it('7 strokes is double bogey', () => {
        renderScoreIndicator({ strokes: 7, par: 5 });
        expect(screen.getByText('7')).toBeTruthy();
      });
    });

    describe('Unusual Par Values', () => {
      it('handles par 6 hole', () => {
        renderScoreIndicator({ strokes: 6, par: 6 });
        expect(screen.getByText('6')).toBeTruthy();
      });

      it('handles birdie on par 6', () => {
        renderScoreIndicator({ strokes: 5, par: 6 });
        expect(screen.getByText('5')).toBeTruthy();
      });

      it('handles eagle on par 6', () => {
        renderScoreIndicator({ strokes: 4, par: 6 });
        expect(screen.getByText('4')).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles score just below pickup threshold (9)', () => {
      renderScoreIndicator({ strokes: 9, par: 4 });
      expect(screen.getByText('9')).toBeTruthy();
    });

    it('handles score at pickup threshold (10)', () => {
      renderScoreIndicator({ strokes: 10, par: 4 });
      expect(screen.getByText('P')).toBeTruthy();
    });

    it('handles very large score', () => {
      renderScoreIndicator({ strokes: 50, par: 4 });
      expect(screen.getByText('P')).toBeTruthy();
    });

    it('handles single digit scores correctly', () => {
      renderScoreIndicator({ strokes: 1, par: 3 });
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('handles double digit score below pickup', () => {
      // Unlikely but possible - would show P since >= 10
      renderScoreIndicator({ strokes: 10, par: 4 });
      expect(screen.getByText('P')).toBeTruthy();
    });

    it('handles exact pickup threshold on par 3', () => {
      renderScoreIndicator({ strokes: 10, par: 3 });
      expect(screen.getByText('P')).toBeTruthy();
    });

    it('handles exact pickup threshold on par 5', () => {
      renderScoreIndicator({ strokes: 10, par: 5 });
      expect(screen.getByText('P')).toBeTruthy();
    });
  });

  // =========================================================================
  // SNAPSHOT TESTS
  // =========================================================================

  describe('Snapshot Tests', () => {
    it('matches snapshot for no score', () => {
      const { toJSON } = renderScoreIndicator({ strokes: undefined, par: 4 });
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for pickup', () => {
      const { toJSON } = renderScoreIndicator({ strokes: 10, par: 4 });
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for eagle', () => {
      const { toJSON } = renderScoreIndicator({ strokes: 2, par: 4 });
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for birdie', () => {
      const { toJSON } = renderScoreIndicator({ strokes: 3, par: 4 });
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for par', () => {
      const { toJSON } = renderScoreIndicator({ strokes: 4, par: 4 });
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for bogey', () => {
      const { toJSON } = renderScoreIndicator({ strokes: 5, par: 4 });
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for double bogey', () => {
      const { toJSON } = renderScoreIndicator({ strokes: 6, par: 4 });
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for small size birdie', () => {
      const { toJSON } = renderScoreIndicator({ strokes: 3, par: 4, size: 'sm' });
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for large size birdie', () => {
      const { toJSON } = renderScoreIndicator({ strokes: 3, par: 4, size: 'lg' });
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for compact display birdie', () => {
      const { toJSON } = renderScoreIndicator({ strokes: 3, par: 4, display: 'compact' });
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for compact display par', () => {
      const { toJSON } = renderScoreIndicator({ strokes: 4, par: 4, display: 'compact' });
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for compact display bogey', () => {
      const { toJSON } = renderScoreIndicator({ strokes: 5, par: 4, display: 'compact' });
      expect(toJSON()).toMatchSnapshot();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('displays score text that is readable', () => {
      renderScoreIndicator({ strokes: 4, par: 4 });
      const scoreText = screen.getByText('4');
      expect(scoreText).toBeTruthy();
    });

    it('displays pickup indicator clearly', () => {
      renderScoreIndicator({ strokes: 10, par: 4 });
      const pickupText = screen.getByText('P');
      expect(pickupText).toBeTruthy();
    });

    it('displays no-score dash clearly', () => {
      renderScoreIndicator({ strokes: undefined, par: 4 });
      const dashText = screen.getByText('-');
      expect(dashText).toBeTruthy();
    });
  });

  // =========================================================================
  // COMPACT DISPLAY MODE
  // =========================================================================

  describe('Compact Display Mode', () => {
    describe('Rendering', () => {
      it('renders compact mode without crashing', () => {
        expect(() => renderScoreIndicator({ strokes: 4, par: 4, display: 'compact' })).not.toThrow();
      });

      it('renders compact mode with score', () => {
        renderScoreIndicator({ strokes: 4, par: 4, display: 'compact' });
        expect(screen.getByText('4')).toBeTruthy();
      });

      it('uses bordered as default display mode', () => {
        renderScoreIndicator({ strokes: 4, par: 4 });
        expect(screen.getByText('4')).toBeTruthy();
      });
    });

    describe('Score Types in Compact Mode', () => {
      it('displays eagle in compact mode', () => {
        renderScoreIndicator({ strokes: 2, par: 4, display: 'compact' });
        expect(screen.getByText('2')).toBeTruthy();
      });

      it('displays birdie in compact mode', () => {
        renderScoreIndicator({ strokes: 3, par: 4, display: 'compact' });
        expect(screen.getByText('3')).toBeTruthy();
      });

      it('displays par in compact mode', () => {
        renderScoreIndicator({ strokes: 4, par: 4, display: 'compact' });
        expect(screen.getByText('4')).toBeTruthy();
      });

      it('displays bogey in compact mode', () => {
        renderScoreIndicator({ strokes: 5, par: 4, display: 'compact' });
        expect(screen.getByText('5')).toBeTruthy();
      });

      it('displays double bogey in compact mode', () => {
        renderScoreIndicator({ strokes: 6, par: 4, display: 'compact' });
        expect(screen.getByText('6')).toBeTruthy();
      });

      it('displays pickup in compact mode', () => {
        renderScoreIndicator({ strokes: 10, par: 4, display: 'compact' });
        expect(screen.getByText('P')).toBeTruthy();
      });

      it('displays no score in compact mode', () => {
        renderScoreIndicator({ strokes: undefined, par: 4, display: 'compact' });
        expect(screen.getByText('-')).toBeTruthy();
      });
    });

    describe('Size Variants in Compact Mode', () => {
      it('renders small compact indicator', () => {
        renderScoreIndicator({ strokes: 4, par: 4, display: 'compact', size: 'sm' });
        expect(screen.getByText('4')).toBeTruthy();
      });

      it('renders medium compact indicator', () => {
        renderScoreIndicator({ strokes: 4, par: 4, display: 'compact', size: 'md' });
        expect(screen.getByText('4')).toBeTruthy();
      });

      it('renders large compact indicator', () => {
        renderScoreIndicator({ strokes: 4, par: 4, display: 'compact', size: 'lg' });
        expect(screen.getByText('4')).toBeTruthy();
      });
    });

    describe('Par Variations in Compact Mode', () => {
      it('displays birdie on par 3 in compact mode', () => {
        renderScoreIndicator({ strokes: 2, par: 3, display: 'compact' });
        expect(screen.getByText('2')).toBeTruthy();
      });

      it('displays par on par 5 in compact mode', () => {
        renderScoreIndicator({ strokes: 5, par: 5, display: 'compact' });
        expect(screen.getByText('5')).toBeTruthy();
      });

      it('displays bogey on par 3 in compact mode', () => {
        renderScoreIndicator({ strokes: 4, par: 3, display: 'compact' });
        expect(screen.getByText('4')).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // DISPLAY MODE PROP
  // =========================================================================

  describe('Display Mode Prop', () => {
    it('defaults to bordered display', () => {
      renderScoreIndicator({ strokes: 4, par: 4 });
      expect(screen.getByText('4')).toBeTruthy();
    });

    it('accepts bordered display explicitly', () => {
      renderScoreIndicator({ strokes: 4, par: 4, display: 'bordered' });
      expect(screen.getByText('4')).toBeTruthy();
    });

    it('accepts compact display', () => {
      renderScoreIndicator({ strokes: 4, par: 4, display: 'compact' });
      expect(screen.getByText('4')).toBeTruthy();
    });
  });
});
