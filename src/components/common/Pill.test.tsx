/**
 * Pill Component Tests
 *
 * Tests for the non-interactive pill/badge component including:
 * - Rendering with different props
 * - Size variants (sm, md, lg)
 * - Color variants (default, primary, success, warning, error, info, golf scores)
 * - Filled vs unfilled styles
 * - Accessibility
 * - Custom styles
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Pill, PillProps, PillSize, PillVariant } from './Pill';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  success: '#10B981',
  warning: '#F59E0B',
  warningDark: '#D97706',
  error: '#EF4444',
  info: '#3B82F6',
  birdie: '#22C55E',
  par: '#6B7280',
  bogey: '#EAB308',
  doubleBogey: '#EF4444',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',
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

describe('Pill', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Pill label="Test" />);
      expect(screen.getByText('Test')).toBeTruthy();
    });

    it('renders with required label prop', () => {
      render(<Pill label="Round 2 of 4" />);
      expect(screen.getByText('Round 2 of 4')).toBeTruthy();
    });

    it('renders with testID', () => {
      render(<Pill label="Test" testID="pill-component" />);
      expect(screen.getByTestId('pill-component')).toBeTruthy();
    });

    it('renders empty label correctly', () => {
      render(<Pill label="" testID="empty-pill" />);
      expect(screen.getByTestId('empty-pill')).toBeTruthy();
    });

    it('renders long labels correctly', () => {
      const longLabel = 'This is a very long label that should still render properly';
      render(<Pill label={longLabel} />);
      expect(screen.getByText(longLabel)).toBeTruthy();
    });

    it('renders with special characters', () => {
      render(<Pill label="Round #1 @Event" />);
      expect(screen.getByText('Round #1 @Event')).toBeTruthy();
    });

    it('renders with numbers', () => {
      render(<Pill label="12345" />);
      expect(screen.getByText('12345')).toBeTruthy();
    });

    it('renders with emojis', () => {
      render(<Pill label="🏌️ Golf" />);
      expect(screen.getByText('🏌️ Golf')).toBeTruthy();
    });
  });

  // =========================================================================
  // SIZE VARIANTS
  // =========================================================================

  describe('Size Variants', () => {
    it('renders with default size (md) when not specified', () => {
      render(<Pill label="Default" testID="default-size" />);
      const pill = screen.getByTestId('default-size');
      expect(pill).toBeTruthy();
    });

    it('renders with sm size', () => {
      render(<Pill label="Small" size="sm" testID="small-pill" />);
      const pill = screen.getByTestId('small-pill');
      expect(pill).toBeTruthy();
    });

    it('renders with md size', () => {
      render(<Pill label="Medium" size="md" testID="medium-pill" />);
      const pill = screen.getByTestId('medium-pill');
      expect(pill).toBeTruthy();
    });

    it('renders with lg size', () => {
      render(<Pill label="Large" size="lg" testID="large-pill" />);
      const pill = screen.getByTestId('large-pill');
      expect(pill).toBeTruthy();
    });

    it('renders all sizes with same content', () => {
      const sizes: PillSize[] = ['sm', 'md', 'lg'];
      sizes.forEach((size) => {
        render(<Pill label={`Size ${size}`} size={size} testID={`pill-${size}`} />);
        expect(screen.getByTestId(`pill-${size}`)).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // COLOR VARIANTS
  // =========================================================================

  describe('Color Variants', () => {
    it('renders with default variant when not specified', () => {
      render(<Pill label="Default" testID="default-variant" />);
      const pill = screen.getByTestId('default-variant');
      expect(pill).toBeTruthy();
    });

    it('renders with primary variant', () => {
      render(<Pill label="Primary" variant="primary" testID="primary-pill" />);
      expect(screen.getByTestId('primary-pill')).toBeTruthy();
    });

    it('renders with success variant', () => {
      render(<Pill label="Success" variant="success" testID="success-pill" />);
      expect(screen.getByTestId('success-pill')).toBeTruthy();
    });

    it('renders with warning variant', () => {
      render(<Pill label="Warning" variant="warning" testID="warning-pill" />);
      expect(screen.getByTestId('warning-pill')).toBeTruthy();
    });

    it('renders with error variant', () => {
      render(<Pill label="Error" variant="error" testID="error-pill" />);
      expect(screen.getByTestId('error-pill')).toBeTruthy();
    });

    it('renders with info variant', () => {
      render(<Pill label="Info" variant="info" testID="info-pill" />);
      expect(screen.getByTestId('info-pill')).toBeTruthy();
    });

    // Golf score variants
    it('renders with birdie variant', () => {
      render(<Pill label="Birdie" variant="birdie" testID="birdie-pill" />);
      expect(screen.getByTestId('birdie-pill')).toBeTruthy();
    });

    it('renders with par variant', () => {
      render(<Pill label="Par" variant="par" testID="par-pill" />);
      expect(screen.getByTestId('par-pill')).toBeTruthy();
    });

    it('renders with bogey variant', () => {
      render(<Pill label="Bogey" variant="bogey" testID="bogey-pill" />);
      expect(screen.getByTestId('bogey-pill')).toBeTruthy();
    });

    it('renders with doubleBogey variant', () => {
      render(<Pill label="Double" variant="doubleBogey" testID="double-bogey-pill" />);
      expect(screen.getByTestId('double-bogey-pill')).toBeTruthy();
    });

    it('renders all variants correctly', () => {
      const variants: PillVariant[] = [
        'default',
        'primary',
        'success',
        'warning',
        'error',
        'info',
        'birdie',
        'par',
        'bogey',
        'doubleBogey',
      ];
      variants.forEach((variant) => {
        render(<Pill label={variant} variant={variant} testID={`variant-${variant}`} />);
        expect(screen.getByTestId(`variant-${variant}`)).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // FILLED PROP
  // =========================================================================

  describe('Filled Prop', () => {
    it('renders unfilled by default', () => {
      render(<Pill label="Unfilled" testID="unfilled-default" />);
      expect(screen.getByTestId('unfilled-default')).toBeTruthy();
    });

    it('renders filled when filled=true', () => {
      render(<Pill label="Filled" filled testID="filled-pill" />);
      expect(screen.getByTestId('filled-pill')).toBeTruthy();
    });

    it('renders unfilled when filled=false', () => {
      render(<Pill label="Unfilled" filled={false} testID="unfilled-explicit" />);
      expect(screen.getByTestId('unfilled-explicit')).toBeTruthy();
    });

    it('renders filled primary variant', () => {
      render(<Pill label="Filled Primary" variant="primary" filled testID="filled-primary" />);
      expect(screen.getByTestId('filled-primary')).toBeTruthy();
    });

    it('renders filled success variant', () => {
      render(<Pill label="Filled Success" variant="success" filled testID="filled-success" />);
      expect(screen.getByTestId('filled-success')).toBeTruthy();
    });

    it('renders filled warning variant', () => {
      render(<Pill label="Filled Warning" variant="warning" filled testID="filled-warning" />);
      expect(screen.getByTestId('filled-warning')).toBeTruthy();
    });

    it('renders filled error variant', () => {
      render(<Pill label="Filled Error" variant="error" filled testID="filled-error" />);
      expect(screen.getByTestId('filled-error')).toBeTruthy();
    });

    it('renders filled golf score variants', () => {
      const golfVariants: PillVariant[] = ['birdie', 'par', 'bogey', 'doubleBogey'];
      golfVariants.forEach((variant) => {
        render(<Pill label={variant} variant={variant} filled testID={`filled-${variant}`} />);
        expect(screen.getByTestId(`filled-${variant}`)).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      render(<Pill label="Accessible" testID="accessible-pill" />);
      const pill = screen.getByTestId('accessible-pill');
      expect(pill.props.accessibilityRole).toBe('text');
    });

    it('uses label as accessibility label by default', () => {
      render(<Pill label="Round 2" testID="default-a11y" />);
      const pill = screen.getByTestId('default-a11y');
      expect(pill.props.accessibilityLabel).toBe('Round 2');
    });

    it('uses custom accessibility label when provided', () => {
      render(
        <Pill
          label="R2"
          accessibilityLabel="Round 2 of 4"
          testID="custom-a11y"
        />
      );
      const pill = screen.getByTestId('custom-a11y');
      expect(pill.props.accessibilityLabel).toBe('Round 2 of 4');
    });

    it('provides meaningful accessibility for score variants', () => {
      render(
        <Pill
          label="-2"
          variant="birdie"
          accessibilityLabel="Birdie, 2 under par"
          testID="birdie-a11y"
        />
      );
      const pill = screen.getByTestId('birdie-a11y');
      expect(pill.props.accessibilityLabel).toBe('Birdie, 2 under par');
    });
  });

  // =========================================================================
  // CUSTOM STYLES
  // =========================================================================

  describe('Custom Styles', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 10 };
      render(<Pill label="Custom" style={customStyle} testID="custom-style" />);
      const pill = screen.getByTestId('custom-style');
      const styles = Array.isArray(pill.props.style)
        ? pill.props.style
        : [pill.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.marginTop).toBe(10);
    });

    it('applies margin styles', () => {
      const customStyle = { marginHorizontal: 8, marginVertical: 4 };
      render(<Pill label="Margins" style={customStyle} testID="margin-style" />);
      expect(screen.getByTestId('margin-style')).toBeTruthy();
    });

    it('applies padding override styles', () => {
      const customStyle = { paddingHorizontal: 20 };
      render(<Pill label="Padding" style={customStyle} testID="padding-style" />);
      expect(screen.getByTestId('padding-style')).toBeTruthy();
    });

    it('allows overriding default styles', () => {
      const customStyle = { borderRadius: 4, borderWidth: 2 };
      render(<Pill label="Override" style={customStyle} testID="override-style" />);
      expect(screen.getByTestId('override-style')).toBeTruthy();
    });
  });

  // =========================================================================
  // COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with size + variant', () => {
      render(<Pill label="Large Success" size="lg" variant="success" testID="size-variant" />);
      expect(screen.getByTestId('size-variant')).toBeTruthy();
    });

    it('renders with size + variant + filled', () => {
      render(
        <Pill
          label="Small Error Filled"
          size="sm"
          variant="error"
          filled
          testID="size-variant-filled"
        />
      );
      expect(screen.getByTestId('size-variant-filled')).toBeTruthy();
    });

    it('renders with all props combined', () => {
      render(
        <Pill
          label="Full Props"
          size="lg"
          variant="primary"
          filled
          style={{ marginLeft: 10 }}
          accessibilityLabel="Custom label"
          testID="all-props"
        />
      );
      const pill = screen.getByTestId('all-props');
      expect(pill).toBeTruthy();
      expect(pill.props.accessibilityLabel).toBe('Custom label');
    });

    it('renders small birdie pill correctly', () => {
      render(
        <Pill
          label="-1"
          size="sm"
          variant="birdie"
          filled
          testID="small-birdie"
        />
      );
      expect(screen.getByTestId('small-birdie')).toBeTruthy();
      expect(screen.getByText('-1')).toBeTruthy();
    });

    it('renders large warning unfilled pill correctly', () => {
      render(
        <Pill
          label="Warning"
          size="lg"
          variant="warning"
          filled={false}
          testID="large-warning"
        />
      );
      expect(screen.getByTestId('large-warning')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles undefined optional props gracefully', () => {
      render(<Pill label="Minimal" testID="minimal" />);
      expect(screen.getByTestId('minimal')).toBeTruthy();
    });

    it('handles whitespace-only labels', () => {
      render(<Pill label="   " testID="whitespace" />);
      expect(screen.getByTestId('whitespace')).toBeTruthy();
    });

    it('handles very long single word labels', () => {
      const longWord = 'Supercalifragilisticexpialidocious';
      render(<Pill label={longWord} testID="long-word" />);
      expect(screen.getByText(longWord)).toBeTruthy();
    });

    it('handles numeric strings', () => {
      render(<Pill label="42" testID="numeric" />);
      expect(screen.getByText('42')).toBeTruthy();
    });

    it('handles negative numbers', () => {
      render(<Pill label="-3" testID="negative" />);
      expect(screen.getByText('-3')).toBeTruthy();
    });

    it('handles plus sign in labels', () => {
      render(<Pill label="+5" testID="plus-sign" />);
      expect(screen.getByText('+5')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      // Pill is exported as a memoized component
      expect(Pill).toBeDefined();
      expect(typeof Pill).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props: PillProps = {
        label: 'Test',
        size: 'md',
        variant: 'primary',
      };

      const { rerender } = render(<Pill {...props} testID="memo-test" />);
      expect(screen.getByTestId('memo-test')).toBeTruthy();

      rerender(<Pill {...props} testID="memo-test" />);
      expect(screen.getByTestId('memo-test')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders round indicator pill', () => {
      render(<Pill label="Round 2 of 4" testID="round-indicator" />);
      expect(screen.getByText('Round 2 of 4')).toBeTruthy();
    });

    it('renders status pill', () => {
      render(<Pill label="Active" variant="success" filled testID="status-pill" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders category pill', () => {
      render(<Pill label="Stableford" variant="primary" testID="category-pill" />);
      expect(screen.getByText('Stableford')).toBeTruthy();
    });

    it('renders score result pill', () => {
      render(<Pill label="Birdie" variant="birdie" filled testID="score-pill" />);
      expect(screen.getByText('Birdie')).toBeTruthy();
    });

    it('renders player count pill', () => {
      render(<Pill label="8 Players" size="sm" testID="player-count" />);
      expect(screen.getByText('8 Players')).toBeTruthy();
    });

    it('renders error message pill', () => {
      render(<Pill label="Failed" variant="error" filled testID="error-msg" />);
      expect(screen.getByText('Failed')).toBeTruthy();
    });

    it('renders handicap pill', () => {
      render(<Pill label="HC: 12" variant="info" size="sm" testID="handicap-pill" />);
      expect(screen.getByText('HC: 12')).toBeTruthy();
    });
  });

  // =========================================================================
  // MULTIPLE PILLS
  // =========================================================================

  describe('Multiple Pills', () => {
    it('renders multiple pills with different variants', () => {
      render(
        <>
          <Pill label="Birdie" variant="birdie" testID="pill-1" />
          <Pill label="Par" variant="par" testID="pill-2" />
          <Pill label="Bogey" variant="bogey" testID="pill-3" />
        </>
      );
      expect(screen.getByTestId('pill-1')).toBeTruthy();
      expect(screen.getByTestId('pill-2')).toBeTruthy();
      expect(screen.getByTestId('pill-3')).toBeTruthy();
    });

    it('renders multiple pills with different sizes', () => {
      render(
        <>
          <Pill label="Small" size="sm" testID="size-1" />
          <Pill label="Medium" size="md" testID="size-2" />
          <Pill label="Large" size="lg" testID="size-3" />
        </>
      );
      expect(screen.getByTestId('size-1')).toBeTruthy();
      expect(screen.getByTestId('size-2')).toBeTruthy();
      expect(screen.getByTestId('size-3')).toBeTruthy();
    });

    it('renders mixed filled and unfilled pills', () => {
      render(
        <>
          <Pill label="Filled" variant="success" filled testID="filled" />
          <Pill label="Unfilled" variant="success" testID="unfilled" />
        </>
      );
      expect(screen.getByTestId('filled')).toBeTruthy();
      expect(screen.getByTestId('unfilled')).toBeTruthy();
    });
  });
});
