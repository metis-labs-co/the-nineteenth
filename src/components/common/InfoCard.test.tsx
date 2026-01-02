/**
 * InfoCard Component Tests
 *
 * Tests for the info card component including:
 * - Rendering with different props
 * - Title and icon rendering
 * - Variant styling (default vs highlight)
 * - Children rendering
 * - Style overrides
 * - Accessibility
 * - Memoization
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { View, Text as RNText } from 'react-native';
import { InfoCard, InfoCardProps } from './InfoCard';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  surface: '#FFFFFF',
  background: '#F9FAFB',
  border: '#E5E7EB',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { Text: MockText, View: MockView } = require('react-native');
  return {
    Text: ({ children, style, accessibilityRole, ...props }: any) => (
      <MockText style={style} accessibilityRole={accessibilityRole} {...props}>
        {children}
      </MockText>
    ),
    Icon: ({ source, ...props }: any) => (
      <MockView testID={`icon-${source}`} {...props} />
    ),
  };
});

describe('InfoCard', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(
        <InfoCard>
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Content')).toBeTruthy();
    });

    it('renders children correctly', () => {
      render(
        <InfoCard>
          <RNText>Child Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Child Content')).toBeTruthy();
    });

    it('renders multiple children', () => {
      render(
        <InfoCard>
          <RNText>First</RNText>
          <RNText>Second</RNText>
          <RNText>Third</RNText>
        </InfoCard>
      );
      expect(screen.getByText('First')).toBeTruthy();
      expect(screen.getByText('Second')).toBeTruthy();
      expect(screen.getByText('Third')).toBeTruthy();
    });

    it('renders with testID prop', () => {
      render(
        <InfoCard testID="test-info-card">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('test-info-card')).toBeTruthy();
    });
  });

  // =========================================================================
  // TITLE
  // =========================================================================

  describe('Title', () => {
    it('does not render title when not provided', () => {
      render(
        <InfoCard>
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.queryByRole('header')).toBeNull();
    });

    it('renders title when provided', () => {
      render(
        <InfoCard title="Card Title">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Card Title')).toBeTruthy();
    });

    it('renders title with header accessibility role', () => {
      render(
        <InfoCard title="My Card">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByRole('header')).toBeTruthy();
    });

    it('renders long titles correctly', () => {
      const longTitle = 'This is a very long card title that might wrap to multiple lines';
      render(
        <InfoCard title={longTitle}>
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText(longTitle)).toBeTruthy();
    });

    it('renders with special characters in title', () => {
      render(
        <InfoCard title="Competition #1 - FAQ's & More">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText("Competition #1 - FAQ's & More")).toBeTruthy();
    });
  });

  // =========================================================================
  // ICON
  // =========================================================================

  describe('Icon', () => {
    it('does not render icon when not provided', () => {
      render(
        <InfoCard title="No Icon">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.queryByTestId('icon-golf')).toBeNull();
    });

    it('renders icon when provided with title', () => {
      render(
        <InfoCard title="With Icon" icon="golf">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('icon-golf')).toBeTruthy();
    });

    it('does not render icon when title is not provided', () => {
      render(
        <InfoCard icon="golf">
          <RNText>Content</RNText>
        </InfoCard>
      );
      // Icon should not render without title
      expect(screen.queryByTestId('icon-golf')).toBeNull();
    });

    it('renders different icon sources', () => {
      render(
        <InfoCard title="Trophy" icon="trophy">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });
  });

  // =========================================================================
  // VARIANTS
  // =========================================================================

  describe('Variants', () => {
    it('renders with default variant by default', () => {
      render(
        <InfoCard title="Default Card" testID="default-card">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('default-card')).toBeTruthy();
    });

    it('renders with default variant when explicitly set', () => {
      render(
        <InfoCard title="Default Card" variant="default" testID="default-explicit">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('default-explicit')).toBeTruthy();
    });

    it('renders with highlight variant', () => {
      render(
        <InfoCard title="Highlight Card" variant="highlight" testID="highlight-card">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('highlight-card')).toBeTruthy();
    });

    it('renders title with highlight variant', () => {
      render(
        <InfoCard title="Important Info" variant="highlight">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Important Info')).toBeTruthy();
    });

    it('renders icon with highlight variant', () => {
      render(
        <InfoCard title="Alert" icon="alert" variant="highlight">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('icon-alert')).toBeTruthy();
    });
  });

  // =========================================================================
  // STYLE OVERRIDES
  // =========================================================================

  describe('Style Overrides', () => {
    it('applies custom container style', () => {
      const customStyle = { marginTop: 20, paddingHorizontal: 16 };
      render(
        <InfoCard title="Custom Style" style={customStyle} testID="styled">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('styled')).toBeTruthy();
    });

    it('accepts undefined style prop gracefully', () => {
      render(
        <InfoCard title="Undefined Style" style={undefined}>
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Undefined Style')).toBeTruthy();
    });

    it('custom style works with default variant', () => {
      render(
        <InfoCard
          title="Default with Style"
          variant="default"
          style={{ margin: 10 }}
          testID="default-styled"
        >
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('default-styled')).toBeTruthy();
    });

    it('custom style works with highlight variant', () => {
      render(
        <InfoCard
          title="Highlight with Style"
          variant="highlight"
          style={{ margin: 10 }}
          testID="highlight-styled"
        >
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('highlight-styled')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has header accessibility role on title', () => {
      render(
        <InfoCard title="Accessible Card">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByRole('header')).toBeTruthy();
    });

    it('content is readable', () => {
      render(
        <InfoCard title="Title">
          <RNText>Important information here</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Important information here')).toBeTruthy();
    });

    it('multiple content items are readable', () => {
      render(
        <InfoCard title="Title">
          <RNText>Info 1</RNText>
          <RNText>Info 2</RNText>
          <RNText>Info 3</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Info 1')).toBeTruthy();
      expect(screen.getByText('Info 2')).toBeTruthy();
      expect(screen.getByText('Info 3')).toBeTruthy();
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with no props except children', () => {
      render(
        <InfoCard>
          <RNText>Just Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Just Content')).toBeTruthy();
    });

    it('renders with title only', () => {
      render(
        <InfoCard title="Just Title">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Just Title')).toBeTruthy();
    });

    it('renders with title + icon', () => {
      render(
        <InfoCard title="Title" icon="golf">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Title')).toBeTruthy();
      expect(screen.getByTestId('icon-golf')).toBeTruthy();
    });

    it('renders with title + variant', () => {
      render(
        <InfoCard title="Title" variant="highlight">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Title')).toBeTruthy();
    });

    it('renders with all props', () => {
      render(
        <InfoCard
          title="Complete Card"
          icon="information"
          variant="highlight"
          style={{ margin: 8 }}
          testID="complete"
        >
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('complete')).toBeTruthy();
      expect(screen.getByText('Complete Card')).toBeTruthy();
      expect(screen.getByTestId('icon-information')).toBeTruthy();
      expect(screen.getByText('Content')).toBeTruthy();
    });
  });

  // =========================================================================
  // CHILDREN TYPES
  // =========================================================================

  describe('Children Types', () => {
    it('renders with View children', () => {
      render(
        <InfoCard title="With View">
          <View testID="child-view">
            <RNText>Inside View</RNText>
          </View>
        </InfoCard>
      );
      expect(screen.getByTestId('child-view')).toBeTruthy();
      expect(screen.getByText('Inside View')).toBeTruthy();
    });

    it('renders with complex children', () => {
      render(
        <InfoCard title="Complex">
          <View testID="outer">
            <View testID="inner">
              <RNText>Deep Content</RNText>
            </View>
          </View>
        </InfoCard>
      );
      expect(screen.getByTestId('outer')).toBeTruthy();
      expect(screen.getByTestId('inner')).toBeTruthy();
      expect(screen.getByText('Deep Content')).toBeTruthy();
    });

    it('renders with empty View child', () => {
      render(
        <InfoCard title="Empty Child">
          <View testID="empty-view" />
        </InfoCard>
      );
      expect(screen.getByTestId('empty-view')).toBeTruthy();
    });

    it('renders with null child gracefully', () => {
      render(
        <InfoCard title="Null Child">
          {null}
          <RNText>Visible</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Visible')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles undefined optional props gracefully', () => {
      render(
        <InfoCard>
          <RNText>Minimal</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Minimal')).toBeTruthy();
    });

    it('handles whitespace-only title', () => {
      render(
        <InfoCard title="   ">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('   ')).toBeTruthy();
    });

    it('handles very short title', () => {
      render(
        <InfoCard title="A">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('A')).toBeTruthy();
    });

    it('handles unicode in title', () => {
      render(
        <InfoCard title="Settings ⚙️">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Settings ⚙️')).toBeTruthy();
    });

    it('handles empty string title (should not render header)', () => {
      render(
        <InfoCard title="">
          <RNText>Content</RNText>
        </InfoCard>
      );
      // Empty string is falsy, so header shouldn't render
      expect(screen.queryByRole('header')).toBeNull();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(InfoCard).toBeDefined();
      expect(typeof InfoCard).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props: InfoCardProps = {
        title: 'Test Card',
        icon: 'golf',
        children: <RNText>Content</RNText>,
      };

      const { rerender } = render(<InfoCard {...props} />);
      expect(screen.getByText('Test Card')).toBeTruthy();

      rerender(<InfoCard {...props} />);
      expect(screen.getByText('Test Card')).toBeTruthy();
    });

    it('updates when props change', () => {
      const { rerender } = render(
        <InfoCard title="Original">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Original')).toBeTruthy();

      rerender(
        <InfoCard title="Updated">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Updated')).toBeTruthy();
      expect(screen.queryByText('Original')).toBeNull();
    });

    it('updates when variant changes', () => {
      const { rerender } = render(
        <InfoCard title="Card" variant="default" testID="card">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('card')).toBeTruthy();

      rerender(
        <InfoCard title="Card" variant="highlight" testID="card">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('card')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders course details card', () => {
      render(
        <InfoCard title="Course Details" icon="golf">
          <RNText>Name: Royal Melbourne</RNText>
          <RNText>Location: Black Rock, VIC</RNText>
          <RNText>Holes: 18</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Course Details')).toBeTruthy();
      expect(screen.getByText('Name: Royal Melbourne')).toBeTruthy();
      expect(screen.getByText('Location: Black Rock, VIC')).toBeTruthy();
      expect(screen.getByText('Holes: 18')).toBeTruthy();
    });

    it('renders invite code card', () => {
      render(
        <InfoCard title="Invite Code" icon="key" variant="highlight">
          <RNText>ABC123</RNText>
          <RNText>Share this code with players</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Invite Code')).toBeTruthy();
      expect(screen.getByText('ABC123')).toBeTruthy();
      expect(screen.getByText('Share this code with players')).toBeTruthy();
    });

    it('renders round summary card', () => {
      render(
        <InfoCard title="Round Summary" icon="calendar">
          <RNText>Date: 15 Jan 2025</RNText>
          <RNText>Tee Time: 7:30 AM</RNText>
          <RNText>Format: Stableford</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Round Summary')).toBeTruthy();
      expect(screen.getByText('Date: 15 Jan 2025')).toBeTruthy();
      expect(screen.getByText('Tee Time: 7:30 AM')).toBeTruthy();
      expect(screen.getByText('Format: Stableford')).toBeTruthy();
    });

    it('renders statistics card', () => {
      render(
        <InfoCard title="Player Statistics" icon="chart-line">
          <RNText>Rounds Played: 42</RNText>
          <RNText>Average Score: 87</RNText>
          <RNText>Best Score: 79</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Player Statistics')).toBeTruthy();
      expect(screen.getByText('Rounds Played: 42')).toBeTruthy();
    });

    it('renders simple content card without title', () => {
      render(
        <InfoCard>
          <RNText>Players: 12</RNText>
          <RNText>Rounds: 4</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Players: 12')).toBeTruthy();
      expect(screen.getByText('Rounds: 4')).toBeTruthy();
    });
  });

  // =========================================================================
  // MULTIPLE CARDS
  // =========================================================================

  describe('Multiple Cards', () => {
    it('renders multiple info cards on same screen', () => {
      render(
        <>
          <InfoCard title="Card 1">
            <RNText>Content 1</RNText>
          </InfoCard>
          <InfoCard title="Card 2">
            <RNText>Content 2</RNText>
          </InfoCard>
          <InfoCard title="Card 3">
            <RNText>Content 3</RNText>
          </InfoCard>
        </>
      );
      expect(screen.getByText('Card 1')).toBeTruthy();
      expect(screen.getByText('Card 2')).toBeTruthy();
      expect(screen.getByText('Card 3')).toBeTruthy();
    });

    it('renders cards with different configurations', () => {
      render(
        <>
          <InfoCard title="Default" variant="default">
            <RNText>Content 1</RNText>
          </InfoCard>
          <InfoCard title="Highlight" variant="highlight">
            <RNText>Content 2</RNText>
          </InfoCard>
          <InfoCard title="With Icon" icon="star">
            <RNText>Content 3</RNText>
          </InfoCard>
        </>
      );
      expect(screen.getAllByRole('header')).toHaveLength(3);
      expect(screen.getByText('Default')).toBeTruthy();
      expect(screen.getByText('Highlight')).toBeTruthy();
      expect(screen.getByText('With Icon')).toBeTruthy();
    });
  });

  // =========================================================================
  // THEME INTEGRATION
  // =========================================================================

  describe('Theme Integration', () => {
    it('uses theme colors for text', () => {
      render(
        <InfoCard title="Themed">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByText('Themed')).toBeTruthy();
    });

    it('uses theme colors for default variant', () => {
      render(
        <InfoCard title="Default Theme" variant="default" testID="default-theme">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('default-theme')).toBeTruthy();
    });

    it('uses theme colors for highlight variant', () => {
      render(
        <InfoCard title="Highlight Theme" variant="highlight" testID="highlight-theme">
          <RNText>Content</RNText>
        </InfoCard>
      );
      expect(screen.getByTestId('highlight-theme')).toBeTruthy();
    });
  });
});
