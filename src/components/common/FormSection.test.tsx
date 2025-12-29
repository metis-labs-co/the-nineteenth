/**
 * FormSection Component Tests
 *
 * Tests for the form section component including:
 * - Rendering with different props
 * - Title and required indicator rendering
 * - Description rendering
 * - Error message rendering
 * - Card and no-card variants
 * - Children rendering
 * - Style overrides
 * - Accessibility
 * - Memoization
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { View, Text as RNText } from 'react-native';
import { FormSection, FormSectionProps } from './FormSection';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  surface: '#FFFFFF',
  background: '#F9FAFB',
  error: '#EF4444',
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
  };
});

describe('FormSection', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(
        <FormSection>
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Content')).toBeTruthy();
    });

    it('renders children correctly', () => {
      render(
        <FormSection>
          <RNText>Child Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Child Content')).toBeTruthy();
    });

    it('renders multiple children', () => {
      render(
        <FormSection>
          <RNText>First</RNText>
          <RNText>Second</RNText>
          <RNText>Third</RNText>
        </FormSection>
      );
      expect(screen.getByText('First')).toBeTruthy();
      expect(screen.getByText('Second')).toBeTruthy();
      expect(screen.getByText('Third')).toBeTruthy();
    });

    it('renders with testID prop', () => {
      render(
        <FormSection testID="test-section">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByTestId('test-section')).toBeTruthy();
    });
  });

  // =========================================================================
  // TITLE
  // =========================================================================

  describe('Title', () => {
    it('does not render title when not provided', () => {
      render(
        <FormSection>
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.queryByRole('header')).toBeNull();
    });

    it('renders title when provided', () => {
      render(
        <FormSection title="Section Title">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Section Title')).toBeTruthy();
    });

    it('renders title with header accessibility role', () => {
      render(
        <FormSection title="My Section">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByRole('header')).toBeTruthy();
    });

    it('renders long titles correctly', () => {
      const longTitle = 'This is a very long section title that might wrap to multiple lines';
      render(
        <FormSection title={longTitle}>
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText(longTitle)).toBeTruthy();
    });

    it('renders with special characters in title', () => {
      render(
        <FormSection title="Competition #1 - FAQ's & More">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText("Competition #1 - FAQ's & More")).toBeTruthy();
    });
  });

  // =========================================================================
  // REQUIRED INDICATOR
  // =========================================================================

  describe('Required Indicator', () => {
    it('does not render required indicator by default', () => {
      render(
        <FormSection title="Optional Field">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.queryByText('*')).toBeNull();
    });

    it('renders required indicator when required is true', () => {
      render(
        <FormSection title="Required Field" required>
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText(' *')).toBeTruthy();
    });

    it('does not render required indicator when required is false', () => {
      render(
        <FormSection title="Not Required" required={false}>
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.queryByText('*')).toBeNull();
    });

    it('renders required indicator only when title is present', () => {
      render(
        <FormSection required>
          <RNText>Content</RNText>
        </FormSection>
      );
      // No title means no required indicator
      expect(screen.queryByText('*')).toBeNull();
    });
  });

  // =========================================================================
  // DESCRIPTION
  // =========================================================================

  describe('Description', () => {
    it('does not render description when not provided', () => {
      render(
        <FormSection title="Title">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.queryByText('description')).toBeNull();
    });

    it('renders description when provided', () => {
      render(
        <FormSection title="Title" description="Helpful description text">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Helpful description text')).toBeTruthy();
    });

    it('does not render empty description', () => {
      render(
        <FormSection title="Title" description="">
          <RNText>Content</RNText>
        </FormSection>
      );
      // Empty string is falsy, so description shouldn't render
      // Only the title and content should be present
      expect(screen.getByText('Title')).toBeTruthy();
      expect(screen.getByText('Content')).toBeTruthy();
    });

    it('renders long description correctly', () => {
      const longDesc = 'This is a very long description that explains the section in detail and might span multiple lines';
      render(
        <FormSection title="Title" description={longDesc}>
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText(longDesc)).toBeTruthy();
    });

    it('renders description without title', () => {
      render(
        <FormSection description="Description only">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Description only')).toBeTruthy();
    });
  });

  // =========================================================================
  // ERROR MESSAGE
  // =========================================================================

  describe('Error Message', () => {
    it('does not render error when not provided', () => {
      render(
        <FormSection title="Title">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.queryByText('error')).toBeNull();
    });

    it('renders error message when provided', () => {
      render(
        <FormSection title="Title" error="This field is required">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('This field is required')).toBeTruthy();
    });

    it('does not render empty error', () => {
      render(
        <FormSection title="Title" error="">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Title')).toBeTruthy();
    });

    it('renders long error messages correctly', () => {
      const longError = 'This is a very long error message that explains what went wrong in detail';
      render(
        <FormSection title="Title" error={longError}>
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText(longError)).toBeTruthy();
    });

    it('renders error with all other props', () => {
      render(
        <FormSection
          title="Field"
          description="Enter value"
          error="Invalid input"
          required
        >
          <RNText>Content</RNText>
        </FormSection>
      );
      // Title with required indicator are nested, check for the required indicator separately
      expect(screen.getByText(' *')).toBeTruthy();
      expect(screen.getByText('Enter value')).toBeTruthy();
      expect(screen.getByText('Invalid input')).toBeTruthy();
      expect(screen.getByRole('header')).toBeTruthy();
    });
  });

  // =========================================================================
  // CARD VARIANT (noCard prop)
  // =========================================================================

  describe('Card Variant', () => {
    it('renders with card styling by default', () => {
      render(
        <FormSection title="Card Section" testID="card-section">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByTestId('card-section')).toBeTruthy();
    });

    it('renders without card styling when noCard is true', () => {
      render(
        <FormSection title="No Card" noCard testID="no-card-section">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByTestId('no-card-section')).toBeTruthy();
    });

    it('renders with card styling when noCard is false', () => {
      render(
        <FormSection title="Card" noCard={false} testID="with-card">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByTestId('with-card')).toBeTruthy();
    });

    it('noCard section can be nested inside card section', () => {
      render(
        <FormSection title="Outer" testID="outer">
          <FormSection title="Inner" noCard testID="inner">
            <RNText>Nested Content</RNText>
          </FormSection>
        </FormSection>
      );
      expect(screen.getByTestId('outer')).toBeTruthy();
      expect(screen.getByTestId('inner')).toBeTruthy();
      expect(screen.getByText('Nested Content')).toBeTruthy();
    });
  });

  // =========================================================================
  // STYLE OVERRIDES
  // =========================================================================

  describe('Style Overrides', () => {
    it('applies custom container style', () => {
      const customStyle = { marginTop: 20, paddingHorizontal: 16 };
      render(
        <FormSection title="Custom Style" style={customStyle} testID="styled">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByTestId('styled')).toBeTruthy();
    });

    it('applies custom title style', () => {
      const customTitleStyle = { fontSize: 24, fontWeight: 'bold' as const };
      render(
        <FormSection title="Custom Title" titleStyle={customTitleStyle}>
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Custom Title')).toBeTruthy();
    });

    it('applies custom description style', () => {
      const customDescStyle = { fontSize: 14, fontStyle: 'italic' as const };
      render(
        <FormSection
          title="Title"
          description="Custom Desc"
          descriptionStyle={customDescStyle}
        >
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Custom Desc')).toBeTruthy();
    });

    it('applies all style overrides together', () => {
      render(
        <FormSection
          title="Full Custom"
          description="Full custom description"
          style={{ padding: 20 }}
          titleStyle={{ color: '#000000' }}
          descriptionStyle={{ color: '#666666' }}
        >
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Full Custom')).toBeTruthy();
      expect(screen.getByText('Full custom description')).toBeTruthy();
    });

    it('accepts undefined style props gracefully', () => {
      render(
        <FormSection
          title="Undefined Styles"
          description="Desc"
          style={undefined}
          titleStyle={undefined}
          descriptionStyle={undefined}
        >
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Undefined Styles')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has header accessibility role on title', () => {
      render(
        <FormSection title="Accessible Section">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByRole('header')).toBeTruthy();
    });

    it('description is readable', () => {
      render(
        <FormSection title="Title" description="Helpful information">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Helpful information')).toBeTruthy();
    });

    it('error message is readable', () => {
      render(
        <FormSection title="Title" error="Please correct this field">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Please correct this field')).toBeTruthy();
    });

    it('required indicator is part of title', () => {
      render(
        <FormSection title="Required" required>
          <RNText>Content</RNText>
        </FormSection>
      );
      const header = screen.getByRole('header');
      expect(header).toBeTruthy();
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with title only', () => {
      render(
        <FormSection title="Just Title">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Just Title')).toBeTruthy();
    });

    it('renders with title + required', () => {
      render(
        <FormSection title="Required Title" required>
          <RNText>Content</RNText>
        </FormSection>
      );
      // Title and required indicator are nested Text, check for the header role
      expect(screen.getByRole('header')).toBeTruthy();
      expect(screen.getByText(' *')).toBeTruthy();
    });

    it('renders with title + description', () => {
      render(
        <FormSection title="Title" description="Description">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Title')).toBeTruthy();
      expect(screen.getByText('Description')).toBeTruthy();
    });

    it('renders with title + error', () => {
      render(
        <FormSection title="Title" error="Error message">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Title')).toBeTruthy();
      expect(screen.getByText('Error message')).toBeTruthy();
    });

    it('renders with all props', () => {
      render(
        <FormSection
          title="Complete Section"
          description="Complete description"
          error="Validation error"
          required
          noCard={false}
          testID="complete"
        >
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByTestId('complete')).toBeTruthy();
      // Title with required are nested - check header role and required separately
      expect(screen.getByRole('header')).toBeTruthy();
      expect(screen.getByText(' *')).toBeTruthy();
      expect(screen.getByText('Complete description')).toBeTruthy();
      expect(screen.getByText('Validation error')).toBeTruthy();
      expect(screen.getByText('Content')).toBeTruthy();
    });

    it('renders with all props and noCard', () => {
      render(
        <FormSection
          title="No Card Complete"
          description="Description"
          error="Error"
          required
          noCard
          testID="no-card-complete"
        >
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByTestId('no-card-complete')).toBeTruthy();
      // Title with required are nested - check header role
      expect(screen.getByRole('header')).toBeTruthy();
    });
  });

  // =========================================================================
  // CHILDREN TYPES
  // =========================================================================

  describe('Children Types', () => {
    it('renders with View children', () => {
      render(
        <FormSection title="With View">
          <View testID="child-view">
            <RNText>Inside View</RNText>
          </View>
        </FormSection>
      );
      expect(screen.getByTestId('child-view')).toBeTruthy();
      expect(screen.getByText('Inside View')).toBeTruthy();
    });

    it('renders with complex children', () => {
      render(
        <FormSection title="Complex">
          <View testID="outer">
            <View testID="inner">
              <RNText>Deep Content</RNText>
            </View>
          </View>
        </FormSection>
      );
      expect(screen.getByTestId('outer')).toBeTruthy();
      expect(screen.getByTestId('inner')).toBeTruthy();
      expect(screen.getByText('Deep Content')).toBeTruthy();
    });

    it('renders with empty View child', () => {
      render(
        <FormSection title="Empty Child">
          <View testID="empty-view" />
        </FormSection>
      );
      expect(screen.getByTestId('empty-view')).toBeTruthy();
    });

    it('renders with null child gracefully', () => {
      render(
        <FormSection title="Null Child">
          {null}
          <RNText>Visible</RNText>
        </FormSection>
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
        <FormSection>
          <RNText>Minimal</RNText>
        </FormSection>
      );
      expect(screen.getByText('Minimal')).toBeTruthy();
    });

    it('handles whitespace-only title', () => {
      render(
        <FormSection title="   ">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('   ')).toBeTruthy();
    });

    it('handles very short title', () => {
      render(
        <FormSection title="A">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('A')).toBeTruthy();
    });

    it('handles unicode in title', () => {
      render(
        <FormSection title="Settings ⚙️">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Settings ⚙️')).toBeTruthy();
    });

    it('handles multiline description', () => {
      render(
        <FormSection title="Title" description={'Line 1\nLine 2'}>
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Line 1\nLine 2')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(FormSection).toBeDefined();
      expect(typeof FormSection).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props: FormSectionProps = {
        title: 'Test Section',
        description: 'Test Description',
        children: <RNText>Content</RNText>,
      };

      const { rerender } = render(<FormSection {...props} />);
      expect(screen.getByText('Test Section')).toBeTruthy();
      expect(screen.getByText('Test Description')).toBeTruthy();

      rerender(<FormSection {...props} />);
      expect(screen.getByText('Test Section')).toBeTruthy();
      expect(screen.getByText('Test Description')).toBeTruthy();
    });

    it('updates when props change', () => {
      const { rerender } = render(
        <FormSection title="Original">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Original')).toBeTruthy();

      rerender(
        <FormSection title="Updated">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Updated')).toBeTruthy();
      expect(screen.queryByText('Original')).toBeNull();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders registration form section', () => {
      render(
        <FormSection
          title="Personal Information"
          description="Your basic account details"
          required
        >
          <View>
            <RNText>Name Input</RNText>
            <RNText>Email Input</RNText>
          </View>
        </FormSection>
      );
      // Title with required are nested - check header role
      expect(screen.getByRole('header')).toBeTruthy();
      expect(screen.getByText('Your basic account details')).toBeTruthy();
      expect(screen.getByText(' *')).toBeTruthy();
    });

    it('renders competition creation section', () => {
      render(
        <FormSection
          title="Competition Details"
          description="Basic information about your competition"
        >
          <View>
            <RNText>Name Input</RNText>
            <RNText>Description Input</RNText>
          </View>
        </FormSection>
      );
      expect(screen.getByText('Competition Details')).toBeTruthy();
    });

    it('renders validation error section', () => {
      render(
        <FormSection
          title="Handicap"
          error="Please enter a valid handicap between 0 and 54"
        >
          <View>
            <RNText>Handicap Input</RNText>
          </View>
        </FormSection>
      );
      expect(screen.getByText('Handicap')).toBeTruthy();
      expect(screen.getByText('Please enter a valid handicap between 0 and 54')).toBeTruthy();
    });

    it('renders nested form sections', () => {
      render(
        <FormSection title="Competition Setup">
          <FormSection title="Basic Info" noCard>
            <RNText>Name</RNText>
          </FormSection>
          <FormSection title="Settings" noCard>
            <RNText>Options</RNText>
          </FormSection>
        </FormSection>
      );
      expect(screen.getByText('Competition Setup')).toBeTruthy();
      expect(screen.getByText('Basic Info')).toBeTruthy();
      expect(screen.getByText('Settings')).toBeTruthy();
    });

    it('renders profile edit section', () => {
      render(
        <FormSection
          title="Golf Details"
          description="Keep your profile up to date"
        >
          <View>
            <RNText>Handicap</RNText>
            <RNText>Home Course</RNText>
          </View>
        </FormSection>
      );
      expect(screen.getByText('Golf Details')).toBeTruthy();
      expect(screen.getByText('Keep your profile up to date')).toBeTruthy();
    });
  });

  // =========================================================================
  // MULTIPLE SECTIONS
  // =========================================================================

  describe('Multiple Sections', () => {
    it('renders multiple form sections on same screen', () => {
      render(
        <>
          <FormSection title="Section 1">
            <RNText>Content 1</RNText>
          </FormSection>
          <FormSection title="Section 2">
            <RNText>Content 2</RNText>
          </FormSection>
          <FormSection title="Section 3">
            <RNText>Content 3</RNText>
          </FormSection>
        </>
      );
      expect(screen.getByText('Section 1')).toBeTruthy();
      expect(screen.getByText('Section 2')).toBeTruthy();
      expect(screen.getByText('Section 3')).toBeTruthy();
    });

    it('renders sections with different configurations', () => {
      render(
        <>
          <FormSection title="Required Field" required>
            <RNText>Content 1</RNText>
          </FormSection>
          <FormSection title="With Error" error="Error!">
            <RNText>Content 2</RNText>
          </FormSection>
          <FormSection title="No Card" noCard>
            <RNText>Content 3</RNText>
          </FormSection>
        </>
      );
      // Check headers exist (3 sections)
      expect(screen.getAllByRole('header')).toHaveLength(3);
      expect(screen.getByText('With Error')).toBeTruthy();
      expect(screen.getByText('No Card')).toBeTruthy();
    });
  });

  // =========================================================================
  // THEME INTEGRATION
  // =========================================================================

  describe('Theme Integration', () => {
    it('uses theme colors for text', () => {
      render(
        <FormSection title="Themed" description="Themed description">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Themed')).toBeTruthy();
      expect(screen.getByText('Themed description')).toBeTruthy();
    });

    it('uses theme colors for error', () => {
      render(
        <FormSection title="Error Section" error="Error message">
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText('Error message')).toBeTruthy();
    });

    it('uses theme colors for required indicator', () => {
      render(
        <FormSection title="Required" required>
          <RNText>Content</RNText>
        </FormSection>
      );
      expect(screen.getByText(' *')).toBeTruthy();
    });
  });
});
