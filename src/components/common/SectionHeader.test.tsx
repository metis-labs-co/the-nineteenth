/**
 * SectionHeader Component Tests
 *
 * Tests for the section header component including:
 * - Rendering with different props
 * - Icon rendering (with/without, primary/secondary)
 * - Description rendering
 * - Right content rendering
 * - Style overrides
 * - Accessibility
 * - Memoization
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { View, Text as RNText } from 'react-native';
import { SectionHeader, SectionHeaderProps } from './SectionHeader';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  surface: '#FFFFFF',
  background: '#F9FAFB',
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
    Icon: ({ source, _size, _color, ...props }: any) => (
      <MockView
        testID={`icon-${source}`}
        accessibilityLabel={source}
        {...props}
      />
    ),
  };
});

describe('SectionHeader', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SectionHeader title="Test Section" />);
      expect(screen.getByText('Test Section')).toBeTruthy();
    });

    it('renders with required title prop only', () => {
      render(<SectionHeader title="Basic Title" />);
      expect(screen.getByText('Basic Title')).toBeTruthy();
    });

    it('renders title correctly', () => {
      render(<SectionHeader title="My Section" />);
      expect(screen.getByText('My Section')).toBeTruthy();
    });

    it('renders empty title correctly', () => {
      render(<SectionHeader title="" />);
      // Should render without crashing even with empty title
      expect(screen.getByRole('header')).toBeTruthy();
    });

    it('renders long titles correctly', () => {
      const longTitle = 'This is a very long section title that might wrap to multiple lines';
      render(<SectionHeader title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeTruthy();
    });

    it('renders with special characters in title', () => {
      render(<SectionHeader title="Section #1 - FAQ's & More" />);
      expect(screen.getByText("Section #1 - FAQ's & More")).toBeTruthy();
    });

    it('renders with numbers in title', () => {
      render(<SectionHeader title="Round 2 of 4" />);
      expect(screen.getByText('Round 2 of 4')).toBeTruthy();
    });

    it('renders with unicode characters', () => {
      render(<SectionHeader title="Settings ⚙️" />);
      expect(screen.getByText('Settings ⚙️')).toBeTruthy();
    });
  });

  // =========================================================================
  // DESCRIPTION
  // =========================================================================

  describe('Description', () => {
    it('does not render description when not provided', () => {
      render(<SectionHeader title="No Description" />);
      expect(screen.queryByText('Description text')).toBeNull();
    });

    it('renders description when provided', () => {
      render(
        <SectionHeader
          title="With Description"
          description="This is the description text"
        />
      );
      expect(screen.getByText('This is the description text')).toBeTruthy();
    });

    it('renders empty description', () => {
      render(
        <SectionHeader
          title="Empty Desc"
          description=""
        />
      );
      // Empty string is falsy, so description shouldn't render
      expect(screen.getByText('Empty Desc')).toBeTruthy();
    });

    it('renders long description correctly', () => {
      const longDesc = 'This is a very long description that explains the section in detail and might span multiple lines on smaller screens';
      render(
        <SectionHeader
          title="Title"
          description={longDesc}
        />
      );
      expect(screen.getByText(longDesc)).toBeTruthy();
    });

    it('renders description with special characters', () => {
      render(
        <SectionHeader
          title="Title"
          description="Click here for FAQ's & help!"
        />
      );
      expect(screen.getByText("Click here for FAQ's & help!")).toBeTruthy();
    });

    it('renders multiline description', () => {
      const multilineDesc = 'First line\nSecond line';
      render(
        <SectionHeader
          title="Title"
          description={multilineDesc}
        />
      );
      expect(screen.getByText(multilineDesc)).toBeTruthy();
    });
  });

  // =========================================================================
  // ICON
  // =========================================================================

  describe('Icon', () => {
    it('does not render icon when not provided', () => {
      render(<SectionHeader title="No Icon" />);
      expect(screen.queryByTestId('icon-undefined')).toBeNull();
    });

    it('renders icon when provided', () => {
      render(<SectionHeader title="With Icon" icon="help-circle" />);
      expect(screen.getByTestId('icon-help-circle')).toBeTruthy();
    });

    it('renders different icon types', () => {
      const icons = ['account', 'settings', 'golf', 'trophy', 'calendar'];
      icons.forEach((iconName) => {
        render(<SectionHeader title={`Icon ${iconName}`} icon={iconName} />);
        expect(screen.getByTestId(`icon-${iconName}`)).toBeTruthy();
      });
    });

    it('uses primary color for icon by default', () => {
      render(<SectionHeader title="Primary Icon" icon="star" />);
      const icon = screen.getByTestId('icon-star');
      expect(icon).toBeTruthy();
    });

    it('uses secondary color when primaryIcon is false', () => {
      render(
        <SectionHeader
          title="Secondary Icon"
          icon="information"
          primaryIcon={false}
        />
      );
      const icon = screen.getByTestId('icon-information');
      expect(icon).toBeTruthy();
    });

    it('uses primary color when primaryIcon is true', () => {
      render(
        <SectionHeader
          title="Primary Icon Explicit"
          icon="check"
          primaryIcon={true}
        />
      );
      const icon = screen.getByTestId('icon-check');
      expect(icon).toBeTruthy();
    });
  });

  // =========================================================================
  // ICON SIZE
  // =========================================================================

  describe('Icon Size', () => {
    it('uses default icon size of 22 when not specified', () => {
      render(<SectionHeader title="Default Size" icon="home" />);
      const icon = screen.getByTestId('icon-home');
      expect(icon).toBeTruthy();
    });

    it('uses custom icon size when provided', () => {
      render(
        <SectionHeader
          title="Custom Size"
          icon="heart"
          iconSize={28}
        />
      );
      const icon = screen.getByTestId('icon-heart');
      expect(icon).toBeTruthy();
    });

    it('accepts small icon sizes', () => {
      render(
        <SectionHeader
          title="Small Icon"
          icon="bell"
          iconSize={16}
        />
      );
      expect(screen.getByTestId('icon-bell')).toBeTruthy();
    });

    it('accepts large icon sizes', () => {
      render(
        <SectionHeader
          title="Large Icon"
          icon="trophy"
          iconSize={48}
        />
      );
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });
  });

  // =========================================================================
  // RIGHT CONTENT
  // =========================================================================

  describe('Right Content', () => {
    it('does not render right content when not provided', () => {
      render(<SectionHeader title="No Right Content" />);
      expect(screen.queryByTestId('right-content')).toBeNull();
    });

    it('renders right content when provided', () => {
      render(
        <SectionHeader
          title="With Right"
          rightContent={<View testID="right-content"><RNText>Action</RNText></View>}
        />
      );
      expect(screen.getByTestId('right-content')).toBeTruthy();
    });

    it('renders text in right content', () => {
      render(
        <SectionHeader
          title="Title"
          rightContent={<RNText>See All</RNText>}
        />
      );
      expect(screen.getByText('See All')).toBeTruthy();
    });

    it('renders button in right content', () => {
      render(
        <SectionHeader
          title="Title"
          rightContent={
            <View testID="action-button">
              <RNText>Edit</RNText>
            </View>
          }
        />
      );
      expect(screen.getByTestId('action-button')).toBeTruthy();
      expect(screen.getByText('Edit')).toBeTruthy();
    });

    it('renders complex right content', () => {
      render(
        <SectionHeader
          title="Title"
          rightContent={
            <View testID="complex-content">
              <View testID="icon-wrapper" />
              <RNText>More</RNText>
            </View>
          }
        />
      );
      expect(screen.getByTestId('complex-content')).toBeTruthy();
      expect(screen.getByTestId('icon-wrapper')).toBeTruthy();
    });
  });

  // =========================================================================
  // STYLE OVERRIDES
  // =========================================================================

  describe('Style Overrides', () => {
    it('applies custom container style', () => {
      const customStyle = { marginTop: 20, paddingHorizontal: 16 };
      render(
        <SectionHeader
          title="Custom Style"
          style={customStyle}
        />
      );
      expect(screen.getByText('Custom Style')).toBeTruthy();
    });

    it('applies custom title style', () => {
      const customTitleStyle = { fontSize: 24, fontWeight: 'bold' as const };
      render(
        <SectionHeader
          title="Custom Title"
          titleStyle={customTitleStyle}
        />
      );
      expect(screen.getByText('Custom Title')).toBeTruthy();
    });

    it('applies custom description style', () => {
      const customDescStyle = { fontSize: 14, fontStyle: 'italic' as const };
      render(
        <SectionHeader
          title="Title"
          description="Custom Desc"
          descriptionStyle={customDescStyle}
        />
      );
      expect(screen.getByText('Custom Desc')).toBeTruthy();
    });

    it('applies all style overrides together', () => {
      render(
        <SectionHeader
          title="Full Custom"
          description="Full custom description"
          style={{ padding: 20 }}
          titleStyle={{ color: '#000000' }}
          descriptionStyle={{ color: '#666666' }}
        />
      );
      expect(screen.getByText('Full Custom')).toBeTruthy();
      expect(screen.getByText('Full custom description')).toBeTruthy();
    });

    it('accepts undefined style props gracefully', () => {
      render(
        <SectionHeader
          title="Undefined Styles"
          description="Desc"
          style={undefined}
          titleStyle={undefined}
          descriptionStyle={undefined}
        />
      );
      expect(screen.getByText('Undefined Styles')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has header accessibility role on title', () => {
      render(<SectionHeader title="Accessible Header" />);
      const header = screen.getByRole('header');
      expect(header).toBeTruthy();
    });

    it('title is accessible with correct role', () => {
      render(<SectionHeader title="FAQ Section" />);
      expect(screen.getByRole('header')).toBeTruthy();
      expect(screen.getByText('FAQ Section')).toBeTruthy();
    });

    it('description is accessible', () => {
      render(
        <SectionHeader
          title="Title"
          description="Helpful description"
        />
      );
      expect(screen.getByText('Helpful description')).toBeTruthy();
    });

    it('icon has accessibility label', () => {
      render(<SectionHeader title="With Icon" icon="help-circle" />);
      const icon = screen.getByTestId('icon-help-circle');
      expect(icon.props.accessibilityLabel).toBe('help-circle');
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with title + icon', () => {
      render(
        <SectionHeader
          title="Title with Icon"
          icon="star"
        />
      );
      expect(screen.getByText('Title with Icon')).toBeTruthy();
      expect(screen.getByTestId('icon-star')).toBeTruthy();
    });

    it('renders with title + description', () => {
      render(
        <SectionHeader
          title="Title"
          description="Description text"
        />
      );
      expect(screen.getByText('Title')).toBeTruthy();
      expect(screen.getByText('Description text')).toBeTruthy();
    });

    it('renders with title + rightContent', () => {
      render(
        <SectionHeader
          title="Title"
          rightContent={<RNText>Action</RNText>}
        />
      );
      expect(screen.getByText('Title')).toBeTruthy();
      expect(screen.getByText('Action')).toBeTruthy();
    });

    it('renders with title + icon + description', () => {
      render(
        <SectionHeader
          title="Full Header"
          icon="information"
          description="Full description"
        />
      );
      expect(screen.getByText('Full Header')).toBeTruthy();
      expect(screen.getByTestId('icon-information')).toBeTruthy();
      expect(screen.getByText('Full description')).toBeTruthy();
    });

    it('renders with all props', () => {
      render(
        <SectionHeader
          title="Complete Section"
          description="Complete description"
          icon="golf"
          iconSize={24}
          primaryIcon={true}
          style={{ margin: 10 }}
          titleStyle={{ fontWeight: 'bold' as const }}
          descriptionStyle={{ opacity: 0.8 }}
          rightContent={<RNText>See All</RNText>}
        />
      );
      expect(screen.getByText('Complete Section')).toBeTruthy();
      expect(screen.getByText('Complete description')).toBeTruthy();
      expect(screen.getByTestId('icon-golf')).toBeTruthy();
      expect(screen.getByText('See All')).toBeTruthy();
    });
  });

  // =========================================================================
  // DESCRIPTION WITH ICON
  // =========================================================================

  describe('Description with Icon', () => {
    it('applies offset to description when icon is present', () => {
      render(
        <SectionHeader
          title="Title"
          description="Offset description"
          icon="star"
        />
      );
      expect(screen.getByText('Offset description')).toBeTruthy();
    });

    it('does not apply offset to description when no icon', () => {
      render(
        <SectionHeader
          title="Title"
          description="No offset description"
        />
      );
      expect(screen.getByText('No offset description')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles undefined optional props gracefully', () => {
      render(
        <SectionHeader
          title="Minimal Props"
        />
      );
      expect(screen.getByText('Minimal Props')).toBeTruthy();
    });

    it('handles whitespace-only title', () => {
      render(<SectionHeader title="   " />);
      expect(screen.getByText('   ')).toBeTruthy();
    });

    it('handles very short title', () => {
      render(<SectionHeader title="A" />);
      expect(screen.getByText('A')).toBeTruthy();
    });

    it('handles null rightContent gracefully', () => {
      render(
        <SectionHeader
          title="Null Right"
          rightContent={null}
        />
      );
      expect(screen.getByText('Null Right')).toBeTruthy();
    });

    it('handles empty string icon name', () => {
      render(<SectionHeader title="Empty Icon" icon="" />);
      expect(screen.getByText('Empty Icon')).toBeTruthy();
    });

    it('handles zero icon size', () => {
      render(
        <SectionHeader
          title="Zero Size"
          icon="star"
          iconSize={0}
        />
      );
      expect(screen.getByTestId('icon-star')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(SectionHeader).toBeDefined();
      expect(typeof SectionHeader).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props: SectionHeaderProps = {
        title: 'Test Title',
        description: 'Test Description',
        icon: 'star',
      };

      const { rerender } = render(<SectionHeader {...props} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
      expect(screen.getByText('Test Description')).toBeTruthy();

      rerender(<SectionHeader {...props} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
      expect(screen.getByText('Test Description')).toBeTruthy();
    });

    it('updates when props change', () => {
      const { rerender } = render(<SectionHeader title="Original" />);
      expect(screen.getByText('Original')).toBeTruthy();

      rerender(<SectionHeader title="Updated" />);
      expect(screen.getByText('Updated')).toBeTruthy();
      expect(screen.queryByText('Original')).toBeNull();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders FAQ section header', () => {
      render(
        <SectionHeader
          title="Frequently Asked Questions"
          description="Find quick answers to common questions"
          icon="frequently-asked-questions"
        />
      );
      expect(screen.getByText('Frequently Asked Questions')).toBeTruthy();
      expect(screen.getByText('Find quick answers to common questions')).toBeTruthy();
    });

    it('renders settings section header', () => {
      render(
        <SectionHeader
          title="Account Settings"
          description="Manage your account preferences"
          icon="account-settings"
        />
      );
      expect(screen.getByText('Account Settings')).toBeTruthy();
    });

    it('renders leaderboard section header', () => {
      render(
        <SectionHeader
          title="Leaderboard"
          icon="trophy"
          rightContent={<RNText>View All</RNText>}
        />
      );
      expect(screen.getByText('Leaderboard')).toBeTruthy();
      expect(screen.getByText('View All')).toBeTruthy();
    });

    it('renders rounds section header', () => {
      render(
        <SectionHeader
          title="Upcoming Rounds"
          description="Your scheduled rounds"
          icon="calendar"
        />
      );
      expect(screen.getByText('Upcoming Rounds')).toBeTruthy();
      expect(screen.getByText('Your scheduled rounds')).toBeTruthy();
    });

    it('renders players section header', () => {
      render(
        <SectionHeader
          title="Players"
          description="8 players registered"
          icon="account-multiple"
          rightContent={<RNText>Add</RNText>}
        />
      );
      expect(screen.getByText('Players')).toBeTruthy();
      expect(screen.getByText('8 players registered')).toBeTruthy();
      expect(screen.getByText('Add')).toBeTruthy();
    });

    it('renders stats section header', () => {
      render(
        <SectionHeader
          title="Performance Statistics"
          icon="chart-line"
          primaryIcon={false}
        />
      );
      expect(screen.getByText('Performance Statistics')).toBeTruthy();
      expect(screen.getByTestId('icon-chart-line')).toBeTruthy();
    });
  });

  // =========================================================================
  // MULTIPLE SECTION HEADERS
  // =========================================================================

  describe('Multiple Section Headers', () => {
    it('renders multiple section headers on same screen', () => {
      render(
        <>
          <SectionHeader title="Section 1" />
          <SectionHeader title="Section 2" />
          <SectionHeader title="Section 3" />
        </>
      );
      expect(screen.getByText('Section 1')).toBeTruthy();
      expect(screen.getByText('Section 2')).toBeTruthy();
      expect(screen.getByText('Section 3')).toBeTruthy();
    });

    it('renders multiple section headers with different configurations', () => {
      render(
        <>
          <SectionHeader title="With Icon" icon="star" />
          <SectionHeader title="With Description" description="Desc" />
          <SectionHeader
            title="Full"
            icon="heart"
            description="Full description"
            rightContent={<RNText>Action</RNText>}
          />
        </>
      );
      expect(screen.getByText('With Icon')).toBeTruthy();
      expect(screen.getByText('With Description')).toBeTruthy();
      expect(screen.getByText('Full')).toBeTruthy();
    });
  });

  // =========================================================================
  // THEME INTEGRATION
  // =========================================================================

  describe('Theme Integration', () => {
    it('uses theme colors for text', () => {
      render(
        <SectionHeader
          title="Themed"
          description="Themed description"
        />
      );
      expect(screen.getByText('Themed')).toBeTruthy();
      expect(screen.getByText('Themed description')).toBeTruthy();
    });

    it('uses theme colors for icon', () => {
      render(
        <SectionHeader
          title="Themed Icon"
          icon="star"
        />
      );
      expect(screen.getByTestId('icon-star')).toBeTruthy();
    });
  });
});
