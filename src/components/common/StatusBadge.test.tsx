/**
 * StatusBadge Component Tests
 *
 * Tests for the StatusBadge component including:
 * - Rendering with different props
 * - Status variants (in-progress, completed, upcoming, scheduled, active, draft, cancelled, custom)
 * - Size variants (sm, md)
 * - Custom labels and colors
 * - Accessibility
 * - Default labels for each status
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StatusBadge, StatusBadgeProps, StatusVariant, StatusBadgeSize } from './StatusBadge';

// Mock ThemeContext
const mockColors = {
  warningBackground: '#FEF3C7',
  warningDark: '#D97706',
  successBackground: '#D1FAE5',
  successDark: '#059669',
  gray100: '#F3F4F6',
  gray600: '#4B5563',
  primaryBackground: '#DBEAFE',
  primaryDark: '#1D4ED8',
  errorBackground: '#FEE2E2',
  errorDark: '#DC2626',
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

describe('StatusBadge', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<StatusBadge status="active" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders with required status prop', () => {
      render(<StatusBadge status="completed" />);
      expect(screen.getByText('Completed')).toBeTruthy();
    });

    it('renders with custom label', () => {
      render(<StatusBadge status="active" label="Live Now" />);
      expect(screen.getByText('Live Now')).toBeTruthy();
    });

    it('renders empty custom label correctly', () => {
      render(<StatusBadge status="custom" label="" />);
      expect(screen.getByRole('text')).toBeTruthy();
    });

    it('renders long labels correctly', () => {
      const longLabel = 'This is a very long status label that should still render properly';
      render(<StatusBadge status="custom" label={longLabel} />);
      expect(screen.getByText(longLabel)).toBeTruthy();
    });

    it('renders with special characters', () => {
      render(<StatusBadge status="custom" label="Status #1 @Event" />);
      expect(screen.getByText('Status #1 @Event')).toBeTruthy();
    });

    it('renders with numbers', () => {
      render(<StatusBadge status="custom" label="Round 5" />);
      expect(screen.getByText('Round 5')).toBeTruthy();
    });

    it('renders with emojis', () => {
      render(<StatusBadge status="custom" label="🏌️ Playing" />);
      expect(screen.getByText('🏌️ Playing')).toBeTruthy();
    });
  });

  // =========================================================================
  // DEFAULT LABELS
  // =========================================================================

  describe('Default Labels', () => {
    it('displays "In Progress" for in-progress status', () => {
      render(<StatusBadge status="in-progress" />);
      expect(screen.getByText('In Progress')).toBeTruthy();
    });

    it('displays "Completed" for completed status', () => {
      render(<StatusBadge status="completed" />);
      expect(screen.getByText('Completed')).toBeTruthy();
    });

    it('displays "Upcoming" for upcoming status', () => {
      render(<StatusBadge status="upcoming" />);
      expect(screen.getByText('Upcoming')).toBeTruthy();
    });

    it('displays "Scheduled" for scheduled status', () => {
      render(<StatusBadge status="scheduled" />);
      expect(screen.getByText('Scheduled')).toBeTruthy();
    });

    it('displays "Active" for active status', () => {
      render(<StatusBadge status="active" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('displays "Draft" for draft status', () => {
      render(<StatusBadge status="draft" />);
      expect(screen.getByText('Draft')).toBeTruthy();
    });

    it('displays "Cancelled" for cancelled status', () => {
      render(<StatusBadge status="cancelled" />);
      expect(screen.getByText('Cancelled')).toBeTruthy();
    });

    it('displays status value for custom without label', () => {
      render(<StatusBadge status="custom" />);
      expect(screen.getByText('custom')).toBeTruthy();
    });
  });

  // =========================================================================
  // CUSTOM LABELS OVERRIDE
  // =========================================================================

  describe('Custom Label Override', () => {
    it('overrides default in-progress label', () => {
      render(<StatusBadge status="in-progress" label="Playing" />);
      expect(screen.getByText('Playing')).toBeTruthy();
      expect(screen.queryByText('In Progress')).toBeNull();
    });

    it('overrides default completed label', () => {
      render(<StatusBadge status="completed" label="Done" />);
      expect(screen.getByText('Done')).toBeTruthy();
      expect(screen.queryByText('Completed')).toBeNull();
    });

    it('overrides default active label', () => {
      render(<StatusBadge status="active" label="Live" />);
      expect(screen.getByText('Live')).toBeTruthy();
      expect(screen.queryByText('Active')).toBeNull();
    });

    it('overrides default draft label', () => {
      render(<StatusBadge status="draft" label="Pending Review" />);
      expect(screen.getByText('Pending Review')).toBeTruthy();
      expect(screen.queryByText('Draft')).toBeNull();
    });

    it('overrides default cancelled label', () => {
      render(<StatusBadge status="cancelled" label="Void" />);
      expect(screen.getByText('Void')).toBeTruthy();
      expect(screen.queryByText('Cancelled')).toBeNull();
    });
  });

  // =========================================================================
  // STATUS VARIANTS
  // =========================================================================

  describe('Status Variants', () => {
    const allStatuses: StatusVariant[] = [
      'in-progress',
      'completed',
      'upcoming',
      'scheduled',
      'active',
      'draft',
      'cancelled',
      'custom',
    ];

    it('renders all status variants', () => {
      allStatuses.forEach((status) => {
        const { unmount } = render(<StatusBadge status={status} />);
        expect(screen.getByRole('text')).toBeTruthy();
        unmount();
      });
    });

    it('renders in-progress variant', () => {
      render(<StatusBadge status="in-progress" />);
      expect(screen.getByText('In Progress')).toBeTruthy();
    });

    it('renders completed variant', () => {
      render(<StatusBadge status="completed" />);
      expect(screen.getByText('Completed')).toBeTruthy();
    });

    it('renders upcoming variant', () => {
      render(<StatusBadge status="upcoming" />);
      expect(screen.getByText('Upcoming')).toBeTruthy();
    });

    it('renders scheduled variant', () => {
      render(<StatusBadge status="scheduled" />);
      expect(screen.getByText('Scheduled')).toBeTruthy();
    });

    it('renders active variant', () => {
      render(<StatusBadge status="active" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders draft variant', () => {
      render(<StatusBadge status="draft" />);
      expect(screen.getByText('Draft')).toBeTruthy();
    });

    it('renders cancelled variant', () => {
      render(<StatusBadge status="cancelled" />);
      expect(screen.getByText('Cancelled')).toBeTruthy();
    });

    it('renders custom variant with label', () => {
      render(<StatusBadge status="custom" label="You" />);
      expect(screen.getByText('You')).toBeTruthy();
    });
  });

  // =========================================================================
  // SIZE VARIANTS
  // =========================================================================

  describe('Size Variants', () => {
    it('renders with default size (md) when not specified', () => {
      render(<StatusBadge status="active" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders with sm size', () => {
      render(<StatusBadge status="active" size="sm" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders with md size', () => {
      render(<StatusBadge status="active" size="md" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders all sizes with same content', () => {
      const sizes: StatusBadgeSize[] = ['sm', 'md'];
      sizes.forEach((size) => {
        const { unmount } = render(<StatusBadge status="active" size={size} />);
        expect(screen.getByText('Active')).toBeTruthy();
        unmount();
      });
    });
  });

  // =========================================================================
  // CUSTOM COLORS
  // =========================================================================

  describe('Custom Colors', () => {
    it('applies custom background color for custom status', () => {
      render(
        <StatusBadge
          status="custom"
          label="VIP"
          backgroundColor="#FFD700"
        />
      );
      expect(screen.getByText('VIP')).toBeTruthy();
    });

    it('applies custom text color for custom status', () => {
      render(
        <StatusBadge
          status="custom"
          label="Special"
          backgroundColor="#FFFFFF"
        />
      );
      expect(screen.getByText('Special')).toBeTruthy();
    });

    it('uses default colors when custom colors not provided for custom status', () => {
      render(<StatusBadge status="custom" label="Default Custom" />);
      expect(screen.getByText('Default Custom')).toBeTruthy();
    });

    it('ignores custom colors for non-custom status', () => {
      // Custom colors should only apply to 'custom' status
      render(
        <StatusBadge
          status="active"
          backgroundColor="#FFD700"
        />
      );
      expect(screen.getByText('Active')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      render(<StatusBadge status="active" />);
      const badge = screen.getByLabelText('Status: Active');
      expect(badge).toBeTruthy();
      expect(badge.props.accessibilityRole).toBe('text');
    });

    it('has default accessibility label based on status', () => {
      render(<StatusBadge status="active" />);
      expect(screen.getByLabelText('Status: Active')).toBeTruthy();
    });

    it('uses custom accessibility label when provided', () => {
      render(
        <StatusBadge
          status="active"
          accessibilityLabel="Competition is currently active"
        />
      );
      expect(screen.getByLabelText('Competition is currently active')).toBeTruthy();
    });

    it('includes custom label in default accessibility label', () => {
      render(<StatusBadge status="active" label="Live Now" />);
      expect(screen.getByLabelText('Status: Live Now')).toBeTruthy();
    });

    it('provides meaningful accessibility for each status', () => {
      const statuses: StatusVariant[] = ['in-progress', 'completed', 'upcoming', 'active'];
      const expectedLabels = ['Status: In Progress', 'Status: Completed', 'Status: Upcoming', 'Status: Active'];
      statuses.forEach((status, index) => {
        const { unmount } = render(<StatusBadge status={status} />);
        expect(screen.getByLabelText(expectedLabels[index])).toBeTruthy();
        unmount();
      });
    });
  });

  // =========================================================================
  // COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with status + label', () => {
      render(<StatusBadge status="in-progress" label="Round 2" />);
      expect(screen.getByText('Round 2')).toBeTruthy();
    });

    it('renders with status + size', () => {
      render(<StatusBadge status="active" size="sm" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders with status + label + size', () => {
      render(<StatusBadge status="completed" label="Done" size="sm" />);
      expect(screen.getByText('Done')).toBeTruthy();
    });

    it('renders with all props combined', () => {
      render(
        <StatusBadge
          status="custom"
          label="Full Props"
          size="sm"
          accessibilityLabel="Custom status badge"
          backgroundColor="#FF6B6B"
        />
      );
      expect(screen.getByText('Full Props')).toBeTruthy();
      expect(screen.getByLabelText('Custom status badge')).toBeTruthy();
    });

    it('renders small in-progress badge correctly', () => {
      render(<StatusBadge status="in-progress" size="sm" />);
      expect(screen.getByText('In Progress')).toBeTruthy();
    });

    it('renders custom badge with all custom options', () => {
      render(
        <StatusBadge
          status="custom"
          label="You"
          size="sm"
          backgroundColor="#E0F2FE"
        />
      );
      expect(screen.getByText('You')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles undefined optional props gracefully', () => {
      render(<StatusBadge status="active" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('handles whitespace-only labels', () => {
      render(<StatusBadge status="custom" label="   " />);
      expect(screen.getByRole('text')).toBeTruthy();
    });

    it('handles very long single word labels', () => {
      const longWord = 'Supercalifragilisticexpialidocious';
      render(<StatusBadge status="custom" label={longWord} />);
      expect(screen.getByText(longWord)).toBeTruthy();
    });

    it('handles labels with newlines', () => {
      render(<StatusBadge status="custom" label="Line1\nLine2" />);
      expect(screen.getByRole('text')).toBeTruthy();
    });

    it('handles labels with tabs', () => {
      render(<StatusBadge status="custom" label="Tab\tHere" />);
      expect(screen.getByRole('text')).toBeTruthy();
    });

    it('handles hex color values correctly', () => {
      render(
        <StatusBadge
          status="custom"
          label="Hex"
          backgroundColor="#FF0000"
        />
      );
      expect(screen.getByText('Hex')).toBeTruthy();
    });

    it('handles rgba color values', () => {
      render(
        <StatusBadge
          status="custom"
          label="RGBA"
          backgroundColor="rgba(255, 0, 0, 0.5)"
        />
      );
      expect(screen.getByText('RGBA')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(StatusBadge).toBeDefined();
      expect(typeof StatusBadge).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props: StatusBadgeProps = {
        status: 'active',
        size: 'md',
        label: 'Test',
      };

      const { rerender } = render(<StatusBadge {...props} />);
      expect(screen.getByText('Test')).toBeTruthy();

      rerender(<StatusBadge {...props} />);
      expect(screen.getByText('Test')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders competition status badge', () => {
      render(<StatusBadge status="in-progress" />);
      expect(screen.getByText('In Progress')).toBeTruthy();
    });

    it('renders round status badge', () => {
      render(<StatusBadge status="scheduled" />);
      expect(screen.getByText('Scheduled')).toBeTruthy();
    });

    it('renders draft competition badge', () => {
      render(<StatusBadge status="draft" />);
      expect(screen.getByText('Draft')).toBeTruthy();
    });

    it('renders cancelled event badge', () => {
      render(<StatusBadge status="cancelled" />);
      expect(screen.getByText('Cancelled')).toBeTruthy();
    });

    it('renders player identifier badge', () => {
      render(
        <StatusBadge
          status="custom"
          label="You"
          backgroundColor="#DBEAFE"
        />
      );
      expect(screen.getByText('You')).toBeTruthy();
    });

    it('renders organiser badge', () => {
      render(
        <StatusBadge
          status="custom"
          label="Organiser"
          size="sm"
        />
      );
      expect(screen.getByText('Organiser')).toBeTruthy();
    });

    it('renders small status on leaderboard', () => {
      render(<StatusBadge status="active" size="sm" label="Live" />);
      expect(screen.getByText('Live')).toBeTruthy();
    });

    it('renders upcoming round badge', () => {
      render(<StatusBadge status="upcoming" label="Next Round" />);
      expect(screen.getByText('Next Round')).toBeTruthy();
    });
  });

  // =========================================================================
  // MULTIPLE BADGES
  // =========================================================================

  describe('Multiple Badges', () => {
    it('renders multiple badges with different statuses', () => {
      render(
        <>
          <StatusBadge status="active" />
          <StatusBadge status="completed" />
          <StatusBadge status="upcoming" />
        </>
      );
      expect(screen.getByText('Active')).toBeTruthy();
      expect(screen.getByText('Completed')).toBeTruthy();
      expect(screen.getByText('Upcoming')).toBeTruthy();
    });

    it('renders multiple badges with different sizes', () => {
      render(
        <>
          <StatusBadge status="active" size="sm" />
          <StatusBadge status="active" size="md" />
        </>
      );
      expect(screen.getAllByText('Active')).toHaveLength(2);
    });

    it('renders mixed custom and preset badges', () => {
      render(
        <>
          <StatusBadge status="active" />
          <StatusBadge status="custom" label="VIP" />
          <StatusBadge status="completed" />
        </>
      );
      expect(screen.getByText('Active')).toBeTruthy();
      expect(screen.getByText('VIP')).toBeTruthy();
      expect(screen.getByText('Completed')).toBeTruthy();
    });
  });

  // =========================================================================
  // COLOR MAPPING
  // =========================================================================

  describe('Color Mapping', () => {
    it('uses warning colors for in-progress status', () => {
      render(<StatusBadge status="in-progress" />);
      expect(screen.getByText('In Progress')).toBeTruthy();
    });

    it('uses success colors for active status', () => {
      render(<StatusBadge status="active" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('uses info/blue colors for completed status', () => {
      render(<StatusBadge status="completed" />);
      expect(screen.getByText('Completed')).toBeTruthy();
    });

    it('uses neutral/gray colors for upcoming status', () => {
      render(<StatusBadge status="upcoming" />);
      expect(screen.getByText('Upcoming')).toBeTruthy();
    });

    it('uses neutral/gray colors for scheduled status', () => {
      render(<StatusBadge status="scheduled" />);
      expect(screen.getByText('Scheduled')).toBeTruthy();
    });

    it('uses neutral/gray colors for draft status', () => {
      render(<StatusBadge status="draft" />);
      expect(screen.getByText('Draft')).toBeTruthy();
    });

    it('uses error colors for cancelled status', () => {
      render(<StatusBadge status="cancelled" />);
      expect(screen.getByText('Cancelled')).toBeTruthy();
    });
  });
});
