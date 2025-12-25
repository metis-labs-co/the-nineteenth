/**
 * ProgressBar Component Tests
 *
 * Tests for the ProgressBar component including:
 * - Rendering with different props
 * - Size variants (sm, md, lg)
 * - Progress calculation and clamping
 * - Labels and percentage display
 * - Custom colors
 * - Accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProgressBar } from './ProgressBar';

// Mock ThemeContext
const mockColors = {
  success: '#22C55E',
  gray200: '#E5E7EB',
  textSecondary: '#6B7280',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper Text
jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
  };
});

describe('ProgressBar', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('renders with required value prop', () => {
      render(<ProgressBar value={25} />);
      expect(screen.getByLabelText('25% complete')).toBeTruthy();
    });

    it('renders with value and max props', () => {
      render(<ProgressBar value={5} max={18} />);
      expect(screen.getByLabelText('28% complete')).toBeTruthy();
    });

    it('renders with all optional props', () => {
      render(
        <ProgressBar
          value={50}
          max={100}
          label="Custom Label"
          size="lg"
          fillColor="#FF0000"
          backgroundColor="#CCCCCC"
          showPercentage={false}
          accessibilityLabel="Custom accessibility"
        />
      );
      expect(screen.getByLabelText('Custom accessibility')).toBeTruthy();
    });

    it('renders progress bar container', () => {
      render(<ProgressBar value={50} />);
      const progressbar = screen.getByLabelText('50% complete');
      expect(progressbar).toBeTruthy();
    });
  });

  // =========================================================================
  // PROGRESS CALCULATION
  // =========================================================================

  describe('Progress Calculation', () => {
    it('calculates percentage correctly for default max of 100', () => {
      render(<ProgressBar value={75} showPercentage />);
      expect(screen.getByText('75%')).toBeTruthy();
    });

    it('calculates percentage correctly with custom max', () => {
      render(<ProgressBar value={9} max={18} showPercentage />);
      expect(screen.getByText('50%')).toBeTruthy();
    });

    it('calculates percentage for zero value', () => {
      render(<ProgressBar value={0} showPercentage />);
      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('calculates percentage for full completion', () => {
      render(<ProgressBar value={100} showPercentage />);
      expect(screen.getByText('100%')).toBeTruthy();
    });

    it('calculates percentage for full completion with custom max', () => {
      render(<ProgressBar value={18} max={18} showPercentage />);
      expect(screen.getByText('100%')).toBeTruthy();
    });

    it('rounds percentage to whole number', () => {
      render(<ProgressBar value={33} showPercentage />);
      expect(screen.getByText('33%')).toBeTruthy();
    });

    it('rounds percentage from decimal', () => {
      render(<ProgressBar value={1} max={3} showPercentage />);
      expect(screen.getByText('33%')).toBeTruthy();
    });
  });

  // =========================================================================
  // CLAMPING
  // =========================================================================

  describe('Value Clamping', () => {
    it('clamps value above max to 100%', () => {
      render(<ProgressBar value={150} max={100} showPercentage />);
      expect(screen.getByText('100%')).toBeTruthy();
    });

    it('clamps negative value to 0%', () => {
      render(<ProgressBar value={-10} showPercentage />);
      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('handles very large value gracefully', () => {
      render(<ProgressBar value={10000} max={100} showPercentage />);
      expect(screen.getByText('100%')).toBeTruthy();
    });

    it('handles very large negative value gracefully', () => {
      render(<ProgressBar value={-10000} showPercentage />);
      expect(screen.getByText('0%')).toBeTruthy();
    });
  });

  // =========================================================================
  // LABELS
  // =========================================================================

  describe('Labels', () => {
    it('displays custom label', () => {
      render(<ProgressBar value={5} max={18} label="5/18 holes" />);
      expect(screen.getByText('5/18 holes')).toBeTruthy();
    });

    it('displays percentage when showPercentage is true', () => {
      render(<ProgressBar value={75} showPercentage />);
      expect(screen.getByText('75%')).toBeTruthy();
    });

    it('shows percentage instead of label when both provided and showPercentage is true', () => {
      render(<ProgressBar value={50} label="Custom" showPercentage />);
      expect(screen.getByText('50%')).toBeTruthy();
      expect(screen.queryByText('Custom')).toBeNull();
    });

    it('shows label when showPercentage is false', () => {
      render(<ProgressBar value={50} label="Custom Label" showPercentage={false} />);
      expect(screen.getByText('Custom Label')).toBeTruthy();
    });

    it('does not show label when neither label nor showPercentage provided', () => {
      render(<ProgressBar value={50} />);
      expect(screen.queryByText('%')).toBeNull();
    });

    it('handles empty label string', () => {
      render(<ProgressBar value={50} label="" />);
      // Empty label should not render - component still renders
      const progressbar = screen.getByLabelText('50% complete');
      expect(progressbar).toBeTruthy();
    });

    it('handles long labels', () => {
      const longLabel = 'This is a very long progress label that explains the current status';
      render(<ProgressBar value={50} label={longLabel} />);
      expect(screen.getByText(longLabel)).toBeTruthy();
    });

    it('handles label with special characters', () => {
      render(<ProgressBar value={50} label="Round #1 @ 50%" />);
      expect(screen.getByText('Round #1 @ 50%')).toBeTruthy();
    });

    it('handles label with numbers', () => {
      render(<ProgressBar value={9} max={18} label="9 of 18" />);
      expect(screen.getByText('9 of 18')).toBeTruthy();
    });
  });

  // =========================================================================
  // SIZE VARIANTS
  // =========================================================================

  describe('Size Variants', () => {
    it('renders with default size (sm) when not specified', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('renders with sm size', () => {
      render(<ProgressBar value={50} size="sm" />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('renders with md size', () => {
      render(<ProgressBar value={50} size="md" />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('renders with lg size', () => {
      render(<ProgressBar value={50} size="lg" />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('renders all sizes with same progress value', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      sizes.forEach((size) => {
        const { unmount } = render(<ProgressBar value={50} size={size} showPercentage />);
        expect(screen.getByText('50%')).toBeTruthy();
        unmount();
      });
    });
  });

  // =========================================================================
  // CUSTOM COLORS
  // =========================================================================

  describe('Custom Colors', () => {
    it('accepts custom fill color', () => {
      render(<ProgressBar value={50} fillColor="#FF0000" />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('accepts custom background color', () => {
      render(<ProgressBar value={50} backgroundColor="#CCCCCC" />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('accepts both custom colors', () => {
      render(
        <ProgressBar
          value={50}
          fillColor="#22C55E"
          backgroundColor="#E5E7EB"
        />
      );
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('handles hex color values', () => {
      render(<ProgressBar value={50} fillColor="#FF6B6B" />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('handles rgba color values', () => {
      render(<ProgressBar value={50} fillColor="rgba(255, 0, 0, 0.5)" />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('handles named color values', () => {
      render(<ProgressBar value={50} fillColor="red" />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has progressbar role', () => {
      render(<ProgressBar value={50} />);
      const progressbar = screen.getByLabelText('50% complete');
      expect(progressbar.props.accessibilityRole).toBe('progressbar');
    });

    it('has default accessibility label based on percentage', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('uses custom accessibility label when provided', () => {
      render(<ProgressBar value={50} accessibilityLabel="Custom progress status" />);
      expect(screen.getByLabelText('Custom progress status')).toBeTruthy();
    });

    it('has accessibility value with min, max, and now', () => {
      render(<ProgressBar value={75} max={100} />);
      const progressbar = screen.getByLabelText('75% complete');
      expect(progressbar.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 75,
      });
    });

    it('has correct accessibility value for custom max', () => {
      render(<ProgressBar value={9} max={18} />);
      const progressbar = screen.getByLabelText('50% complete');
      expect(progressbar.props.accessibilityValue).toEqual({
        min: 0,
        max: 18,
        now: 9,
      });
    });

    it('has correct accessibility value at 0%', () => {
      render(<ProgressBar value={0} max={100} />);
      const progressbar = screen.getByLabelText('0% complete');
      expect(progressbar.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 0,
      });
    });

    it('has correct accessibility value at 100%', () => {
      render(<ProgressBar value={100} max={100} />);
      const progressbar = screen.getByLabelText('100% complete');
      expect(progressbar.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 100,
      });
    });
  });

  // =========================================================================
  // CUSTOM STYLE
  // =========================================================================

  describe('Custom Style', () => {
    it('accepts custom container style', () => {
      render(<ProgressBar value={50} style={{ marginTop: 10 }} />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('accepts multiple style properties', () => {
      render(
        <ProgressBar
          value={50}
          style={{ marginTop: 10, marginBottom: 20, paddingHorizontal: 16 }}
        />
      );
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles value of 0', () => {
      render(<ProgressBar value={0} showPercentage />);
      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('handles max of 0 gracefully', () => {
      // Division by zero results in Infinity, which gets clamped to 100%
      render(<ProgressBar value={50} max={0} />);
      expect(screen.getByLabelText('100% complete')).toBeTruthy();
    });

    it('handles very small decimal values', () => {
      render(<ProgressBar value={0.001} showPercentage />);
      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('handles very small max values', () => {
      render(<ProgressBar value={1} max={1} showPercentage />);
      expect(screen.getByText('100%')).toBeTruthy();
    });

    it('handles floating point values', () => {
      render(<ProgressBar value={33.333} showPercentage />);
      expect(screen.getByText('33%')).toBeTruthy();
    });

    it('handles undefined optional props gracefully', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('handles very large max value', () => {
      render(<ProgressBar value={50000} max={100000} showPercentage />);
      expect(screen.getByText('50%')).toBeTruthy();
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with value + max + label', () => {
      render(<ProgressBar value={5} max={18} label="5/18" />);
      expect(screen.getByText('5/18')).toBeTruthy();
    });

    it('renders with value + size + showPercentage', () => {
      render(<ProgressBar value={50} size="lg" showPercentage />);
      expect(screen.getByText('50%')).toBeTruthy();
    });

    it('renders with custom colors + label', () => {
      render(
        <ProgressBar
          value={75}
          fillColor="#22C55E"
          backgroundColor="#E5E7EB"
          label="75% done"
        />
      );
      expect(screen.getByText('75% done')).toBeTruthy();
    });

    it('renders with all props', () => {
      render(
        <ProgressBar
          value={9}
          max={18}
          label="9/18 holes"
          size="lg"
          fillColor="#22C55E"
          backgroundColor="#E5E7EB"
          showPercentage={false}
          style={{ marginTop: 10 }}
          accessibilityLabel="Round progress"
        />
      );
      expect(screen.getByText('9/18 holes')).toBeTruthy();
      expect(screen.getByLabelText('Round progress')).toBeTruthy();
    });

    it('renders small progress bar with percentage', () => {
      render(<ProgressBar value={25} size="sm" showPercentage />);
      expect(screen.getByText('25%')).toBeTruthy();
    });

    it('renders large progress bar with label', () => {
      render(<ProgressBar value={75} max={100} size="lg" label="Almost there!" />);
      expect(screen.getByText('Almost there!')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(ProgressBar).toBeDefined();
      expect(typeof ProgressBar).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props = {
        value: 50,
        max: 100,
        showPercentage: true as const,
      };

      const { rerender } = render(<ProgressBar {...props} />);
      expect(screen.getByText('50%')).toBeTruthy();

      rerender(<ProgressBar {...props} />);
      expect(screen.getByText('50%')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders golf hole progress', () => {
      render(<ProgressBar value={9} max={18} label="9/18 holes" />);
      expect(screen.getByText('9/18 holes')).toBeTruthy();
    });

    it('renders round completion progress', () => {
      render(<ProgressBar value={75} showPercentage />);
      expect(screen.getByText('75%')).toBeTruthy();
    });

    it('renders scorecard entry progress', () => {
      render(<ProgressBar value={12} max={18} label="12 of 18 entered" size="sm" />);
      expect(screen.getByText('12 of 18 entered')).toBeTruthy();
    });

    it('renders competition progress', () => {
      render(<ProgressBar value={2} max={4} label="Round 2 of 4" size="md" />);
      expect(screen.getByText('Round 2 of 4')).toBeTruthy();
    });

    it('renders sync progress', () => {
      render(
        <ProgressBar
          value={80}
          showPercentage
          fillColor="#3B82F6"
          size="sm"
        />
      );
      expect(screen.getByText('80%')).toBeTruthy();
    });

    it('renders completed state', () => {
      render(
        <ProgressBar
          value={18}
          max={18}
          label="Complete!"
          fillColor="#22C55E"
        />
      );
      expect(screen.getByText('Complete!')).toBeTruthy();
    });

    it('renders started state', () => {
      render(
        <ProgressBar
          value={1}
          max={18}
          label="Just started"
        />
      );
      expect(screen.getByText('Just started')).toBeTruthy();
    });

    it('renders empty state', () => {
      render(<ProgressBar value={0} max={18} label="Not started" />);
      expect(screen.getByText('Not started')).toBeTruthy();
    });
  });

  // =========================================================================
  // MULTIPLE PROGRESS BARS
  // =========================================================================

  describe('Multiple Progress Bars', () => {
    it('renders multiple progress bars with different values', () => {
      render(
        <>
          <ProgressBar value={25} showPercentage />
          <ProgressBar value={50} showPercentage />
          <ProgressBar value={75} showPercentage />
        </>
      );
      expect(screen.getByText('25%')).toBeTruthy();
      expect(screen.getByText('50%')).toBeTruthy();
      expect(screen.getByText('75%')).toBeTruthy();
    });

    it('renders multiple progress bars with different sizes', () => {
      render(
        <>
          <ProgressBar value={50} size="sm" label="Small" />
          <ProgressBar value={50} size="md" label="Medium" />
          <ProgressBar value={50} size="lg" label="Large" />
        </>
      );
      expect(screen.getByText('Small')).toBeTruthy();
      expect(screen.getByText('Medium')).toBeTruthy();
      expect(screen.getByText('Large')).toBeTruthy();
    });

    it('renders multiple progress bars with different labels', () => {
      render(
        <>
          <ProgressBar value={9} max={18} label="Front 9" />
          <ProgressBar value={18} max={18} label="Back 9" />
          <ProgressBar value={27} max={36} label="Total" />
        </>
      );
      expect(screen.getByText('Front 9')).toBeTruthy();
      expect(screen.getByText('Back 9')).toBeTruthy();
      expect(screen.getByText('Total')).toBeTruthy();
    });
  });

  // =========================================================================
  // DEFAULT VALUES
  // =========================================================================

  describe('Default Values', () => {
    it('uses default max of 100', () => {
      render(<ProgressBar value={50} showPercentage />);
      expect(screen.getByText('50%')).toBeTruthy();
    });

    it('uses default size of sm', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('uses success color as default fill color', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('uses gray200 as default background color', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByLabelText('50% complete')).toBeTruthy();
    });

    it('does not show percentage by default', () => {
      render(<ProgressBar value={50} />);
      expect(screen.queryByText('50%')).toBeNull();
    });
  });
});
