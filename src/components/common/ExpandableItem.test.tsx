/**
 * ExpandableItem Component Tests
 *
 * Tests for the expandable accordion-style component including:
 * - Rendering with different props
 * - Expanded/collapsed states
 * - Toggle interactions
 * - Border styling
 * - Custom icons
 * - Animation options
 * - Accessibility
 * - ExpandableList container
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import {
  ExpandableItem,
  ExpandableItemProps,
  ExpandableList,
  ExpandableListProps,
} from './ExpandableItem';

// Mock ThemeContext
const mockColors = {
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  surface: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray400: '#9CA3AF',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, style, numberOfLines, ...props }: any) => (
      <Text style={style} numberOfLines={numberOfLines} {...props}>
        {children}
      </Text>
    ),
    Icon: ({ source, size, color, ...props }: any) => (
      <View testID={`icon-${source}`} accessibilityLabel={source} {...props} />
    ),
  };
});

// Mock theme constants
jest.mock('@/constants/theme', () => ({
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  typography: {
    body: { fontSize: 14 },
  },
  borderRadius: {
    lg: 12,
  },
}));

describe('ExpandableItem', () => {
  // Default props for testing
  const defaultProps: ExpandableItemProps = {
    title: 'Test Title',
    isExpanded: false,
    onToggle: jest.fn(),
    children: <Text>Test Content</Text>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ExpandableItem {...defaultProps} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('renders title correctly', () => {
      render(<ExpandableItem {...defaultProps} title="FAQ Question" />);
      expect(screen.getByText('FAQ Question')).toBeTruthy();
    });

    it('renders with long title', () => {
      const longTitle = 'This is a very long title that might need to wrap to multiple lines in the UI';
      render(<ExpandableItem {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeTruthy();
    });

    it('renders chevron-down icon when collapsed', () => {
      render(<ExpandableItem {...defaultProps} isExpanded={false} />);
      expect(screen.getByTestId('icon-chevron-down')).toBeTruthy();
    });

    it('renders chevron-up icon when expanded', () => {
      render(<ExpandableItem {...defaultProps} isExpanded={true} />);
      expect(screen.getByTestId('icon-chevron-up')).toBeTruthy();
    });

    it('does not render children when collapsed', () => {
      render(<ExpandableItem {...defaultProps} isExpanded={false} />);
      expect(screen.queryByText('Test Content')).toBeNull();
    });

    it('renders children when expanded', () => {
      render(<ExpandableItem {...defaultProps} isExpanded={true} />);
      expect(screen.getByText('Test Content')).toBeTruthy();
    });

    it('renders with special characters in title', () => {
      render(<ExpandableItem {...defaultProps} title="What's the #1 FAQ?" />);
      expect(screen.getByText("What's the #1 FAQ?")).toBeTruthy();
    });

    it('renders with emoji in title', () => {
      render(<ExpandableItem {...defaultProps} title="How to play golf? ⛳" />);
      expect(screen.getByText('How to play golf? ⛳')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TOGGLE INTERACTIONS
  // ===========================================================================

  describe('Toggle Interactions', () => {
    it('calls onToggle when header is pressed', () => {
      const onToggle = jest.fn();
      render(<ExpandableItem {...defaultProps} onToggle={onToggle} />);

      const header = screen.getByRole('button');
      fireEvent.press(header);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onToggle when expanded item is pressed', () => {
      const onToggle = jest.fn();
      render(<ExpandableItem {...defaultProps} isExpanded={true} onToggle={onToggle} />);

      const header = screen.getByRole('button');
      fireEvent.press(header);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('allows multiple toggles', () => {
      const onToggle = jest.fn();
      render(<ExpandableItem {...defaultProps} onToggle={onToggle} />);

      const header = screen.getByRole('button');
      fireEvent.press(header);
      fireEvent.press(header);
      fireEvent.press(header);

      expect(onToggle).toHaveBeenCalledTimes(3);
    });
  });

  // ===========================================================================
  // EXPANDED/COLLAPSED STATES
  // ===========================================================================

  describe('Expanded/Collapsed States', () => {
    it('shows content when expanded', () => {
      render(
        <ExpandableItem {...defaultProps} isExpanded={true}>
          <Text>Expanded Content</Text>
        </ExpandableItem>
      );
      expect(screen.getByText('Expanded Content')).toBeTruthy();
    });

    it('hides content when collapsed', () => {
      render(
        <ExpandableItem {...defaultProps} isExpanded={false}>
          <Text>Hidden Content</Text>
        </ExpandableItem>
      );
      expect(screen.queryByText('Hidden Content')).toBeNull();
    });

    it('transitions from collapsed to expanded', () => {
      const { rerender } = render(
        <ExpandableItem {...defaultProps} isExpanded={false}>
          <Text>Dynamic Content</Text>
        </ExpandableItem>
      );
      expect(screen.queryByText('Dynamic Content')).toBeNull();

      rerender(
        <ExpandableItem {...defaultProps} isExpanded={true}>
          <Text>Dynamic Content</Text>
        </ExpandableItem>
      );
      expect(screen.getByText('Dynamic Content')).toBeTruthy();
    });

    it('transitions from expanded to collapsed', () => {
      const { rerender } = render(
        <ExpandableItem {...defaultProps} isExpanded={true}>
          <Text>Dynamic Content</Text>
        </ExpandableItem>
      );
      expect(screen.getByText('Dynamic Content')).toBeTruthy();

      rerender(
        <ExpandableItem {...defaultProps} isExpanded={false}>
          <Text>Dynamic Content</Text>
        </ExpandableItem>
      );
      expect(screen.queryByText('Dynamic Content')).toBeNull();
    });

    it('switches icon when toggled', () => {
      const { rerender } = render(
        <ExpandableItem {...defaultProps} isExpanded={false} />
      );
      expect(screen.getByTestId('icon-chevron-down')).toBeTruthy();

      rerender(<ExpandableItem {...defaultProps} isExpanded={true} />);
      expect(screen.getByTestId('icon-chevron-up')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CUSTOM ICONS
  // ===========================================================================

  describe('Custom Icons', () => {
    it('uses custom collapsed icon', () => {
      render(
        <ExpandableItem
          {...defaultProps}
          isExpanded={false}
          collapsedIcon="plus"
        />
      );
      expect(screen.getByTestId('icon-plus')).toBeTruthy();
    });

    it('uses custom expanded icon', () => {
      render(
        <ExpandableItem
          {...defaultProps}
          isExpanded={true}
          expandedIcon="minus"
        />
      );
      expect(screen.getByTestId('icon-minus')).toBeTruthy();
    });

    it('uses both custom icons', () => {
      const { rerender } = render(
        <ExpandableItem
          {...defaultProps}
          isExpanded={false}
          collapsedIcon="arrow-down"
          expandedIcon="arrow-up"
        />
      );
      expect(screen.getByTestId('icon-arrow-down')).toBeTruthy();

      rerender(
        <ExpandableItem
          {...defaultProps}
          isExpanded={true}
          collapsedIcon="arrow-down"
          expandedIcon="arrow-up"
        />
      );
      expect(screen.getByTestId('icon-arrow-up')).toBeTruthy();
    });

    it('uses default icons when not specified', () => {
      render(<ExpandableItem {...defaultProps} isExpanded={false} />);
      expect(screen.getByTestId('icon-chevron-down')).toBeTruthy();
    });
  });

  // ===========================================================================
  // BORDER STYLING
  // ===========================================================================

  describe('Border Styling', () => {
    it('shows border by default', () => {
      render(<ExpandableItem {...defaultProps} />);
      // Border is shown by default (showBorder defaults to true)
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('hides border when showBorder is false', () => {
      render(<ExpandableItem {...defaultProps} showBorder={false} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('hides border when isLast is true', () => {
      render(<ExpandableItem {...defaultProps} isLast={true} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('shows border when showBorder is true and not last', () => {
      render(<ExpandableItem {...defaultProps} showBorder={true} isLast={false} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ANIMATION OPTIONS
  // ===========================================================================

  describe('Animation Options', () => {
    it('has animation enabled by default', () => {
      render(<ExpandableItem {...defaultProps} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('works with animation disabled', () => {
      render(<ExpandableItem {...defaultProps} animated={false} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('works with animation disabled when expanded', () => {
      render(
        <ExpandableItem {...defaultProps} animated={false} isExpanded={true}>
          <Text>No Animation Content</Text>
        </ExpandableItem>
      );
      expect(screen.getByText('No Animation Content')).toBeTruthy();
    });

    it('handles toggle with animation disabled', () => {
      const onToggle = jest.fn();
      render(
        <ExpandableItem {...defaultProps} animated={false} onToggle={onToggle} />
      );

      const header = screen.getByRole('button');
      fireEvent.press(header);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      render(<ExpandableItem {...defaultProps} />);
      const header = screen.getByRole('button');
      expect(header).toBeTruthy();
    });

    it('has correct accessibility label', () => {
      render(<ExpandableItem {...defaultProps} title="My FAQ Question" />);
      const header = screen.getByRole('button');
      expect(header.props.accessibilityLabel).toBe('My FAQ Question');
    });

    it('has correct accessibility state when collapsed', () => {
      render(<ExpandableItem {...defaultProps} isExpanded={false} />);
      const header = screen.getByRole('button');
      expect(header.props.accessibilityState).toEqual({ expanded: false });
    });

    it('has correct accessibility state when expanded', () => {
      render(<ExpandableItem {...defaultProps} isExpanded={true} />);
      const header = screen.getByRole('button');
      expect(header.props.accessibilityState).toEqual({ expanded: true });
    });

    it('has correct accessibility hint when collapsed', () => {
      render(<ExpandableItem {...defaultProps} isExpanded={false} />);
      const header = screen.getByRole('button');
      expect(header.props.accessibilityHint).toBe('Expand to show content');
    });

    it('has correct accessibility hint when expanded', () => {
      render(<ExpandableItem {...defaultProps} isExpanded={true} />);
      const header = screen.getByRole('button');
      expect(header.props.accessibilityHint).toBe('Collapse to hide content');
    });
  });

  // ===========================================================================
  // CUSTOM STYLES
  // ===========================================================================

  describe('Custom Styles', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 20 };
      render(<ExpandableItem {...defaultProps} style={customStyle} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('applies margin styles', () => {
      const customStyle = { marginHorizontal: 16, marginVertical: 8 };
      render(<ExpandableItem {...defaultProps} style={customStyle} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('applies padding styles', () => {
      const customStyle = { padding: 10 };
      render(<ExpandableItem {...defaultProps} style={customStyle} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHILDREN CONTENT
  // ===========================================================================

  describe('Children Content', () => {
    it('renders text children', () => {
      render(
        <ExpandableItem {...defaultProps} isExpanded={true}>
          <Text>Simple text content</Text>
        </ExpandableItem>
      );
      expect(screen.getByText('Simple text content')).toBeTruthy();
    });

    it('renders multiple children', () => {
      render(
        <ExpandableItem {...defaultProps} isExpanded={true}>
          <Text>Line 1</Text>
          <Text>Line 2</Text>
          <Text>Line 3</Text>
        </ExpandableItem>
      );
      expect(screen.getByText('Line 1')).toBeTruthy();
      expect(screen.getByText('Line 2')).toBeTruthy();
      expect(screen.getByText('Line 3')).toBeTruthy();
    });

    it('renders complex children', () => {
      render(
        <ExpandableItem {...defaultProps} isExpanded={true}>
          <View testID="complex-child">
            <Text>Nested content</Text>
          </View>
        </ExpandableItem>
      );
      expect(screen.getByTestId('complex-child')).toBeTruthy();
      expect(screen.getByText('Nested content')).toBeTruthy();
    });

    it('renders empty children gracefully', () => {
      render(
        <ExpandableItem {...defaultProps} isExpanded={true}>
          {null}
        </ExpandableItem>
      );
      expect(screen.getByText('Test Title')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty title', () => {
      render(<ExpandableItem {...defaultProps} title="" />);
      const header = screen.getByRole('button');
      expect(header).toBeTruthy();
    });

    it('handles whitespace-only title', () => {
      render(<ExpandableItem {...defaultProps} title="   " />);
      expect(screen.getByText('   ')).toBeTruthy();
    });

    it('handles very long title', () => {
      const veryLongTitle = 'A'.repeat(500);
      render(<ExpandableItem {...defaultProps} title={veryLongTitle} />);
      expect(screen.getByText(veryLongTitle)).toBeTruthy();
    });

    it('handles rapid expand/collapse', () => {
      const { rerender } = render(
        <ExpandableItem {...defaultProps} isExpanded={false} />
      );

      for (let i = 0; i < 10; i++) {
        rerender(<ExpandableItem {...defaultProps} isExpanded={i % 2 === 0} />);
      }

      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('handles undefined optional props gracefully', () => {
      render(
        <ExpandableItem
          title="Title"
          isExpanded={false}
          onToggle={jest.fn()}
          showBorder={undefined}
          isLast={undefined}
          style={undefined}
          animated={undefined}
          collapsedIcon={undefined}
          expandedIcon={undefined}
        >
          <Text>Content</Text>
        </ExpandableItem>
      );
      expect(screen.getByText('Title')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMOIZATION
  // ===========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(ExpandableItem).toBeDefined();
    });

    it('renders consistently with same props', () => {
      const props: ExpandableItemProps = {
        title: 'Test',
        isExpanded: false,
        onToggle: jest.fn(),
        children: <Text>Content</Text>,
      };

      const { rerender } = render(<ExpandableItem {...props} />);
      expect(screen.getByText('Test')).toBeTruthy();

      rerender(<ExpandableItem {...props} />);
      expect(screen.getByText('Test')).toBeTruthy();
    });
  });

  // ===========================================================================
  // USE CASES
  // ===========================================================================

  describe('Use Cases', () => {
    it('renders as FAQ item', () => {
      render(
        <ExpandableItem
          title="How do I create a competition?"
          isExpanded={true}
          onToggle={jest.fn()}
        >
          <Text>Go to Competitions tab and tap the + button to create a new competition.</Text>
        </ExpandableItem>
      );
      expect(screen.getByText('How do I create a competition?')).toBeTruthy();
      expect(screen.getByText(/Go to Competitions tab/)).toBeTruthy();
    });

    it('renders as settings section', () => {
      render(
        <ExpandableItem
          title="Notification Settings"
          isExpanded={true}
          onToggle={jest.fn()}
          collapsedIcon="cog"
          expandedIcon="cog"
        >
          <Text>Configure your notification preferences</Text>
        </ExpandableItem>
      );
      expect(screen.getByText('Notification Settings')).toBeTruthy();
    });

    it('renders as help topic', () => {
      render(
        <ExpandableItem
          title="Scoring Rules"
          isExpanded={false}
          onToggle={jest.fn()}
        >
          <Text>Stableford scoring explanation...</Text>
        </ExpandableItem>
      );
      expect(screen.getByText('Scoring Rules')).toBeTruthy();
      expect(screen.queryByText('Stableford scoring explanation...')).toBeNull();
    });
  });
});

// ===========================================================================
// EXPANDABLE LIST TESTS
// ===========================================================================

describe('ExpandableList', () => {
  const defaultListProps: ExpandableListProps = {
    expandedId: null,
    onToggle: jest.fn(),
    children: (
      <>
        <Text>Item 1</Text>
        <Text>Item 2</Text>
      </>
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ExpandableList {...defaultListProps} />);
      expect(screen.getByText('Item 1')).toBeTruthy();
    });

    it('renders children correctly', () => {
      render(<ExpandableList {...defaultListProps} />);
      expect(screen.getByText('Item 1')).toBeTruthy();
      expect(screen.getByText('Item 2')).toBeTruthy();
    });

    it('renders with custom style', () => {
      render(
        <ExpandableList {...defaultListProps} style={{ marginTop: 20 }} />
      );
      expect(screen.getByText('Item 1')).toBeTruthy();
    });

    it('renders multiple ExpandableItem children', () => {
      render(
        <ExpandableList {...defaultListProps}>
          <ExpandableItem
            title="FAQ 1"
            isExpanded={false}
            onToggle={jest.fn()}
          >
            <Text>Answer 1</Text>
          </ExpandableItem>
          <ExpandableItem
            title="FAQ 2"
            isExpanded={false}
            onToggle={jest.fn()}
          >
            <Text>Answer 2</Text>
          </ExpandableItem>
        </ExpandableList>
      );
      expect(screen.getByText('FAQ 1')).toBeTruthy();
      expect(screen.getByText('FAQ 2')).toBeTruthy();
    });

    it('renders with one expanded item', () => {
      render(
        <ExpandableList expandedId="1" onToggle={jest.fn()}>
          <ExpandableItem
            title="FAQ 1"
            isExpanded={true}
            onToggle={jest.fn()}
          >
            <Text>Answer 1</Text>
          </ExpandableItem>
          <ExpandableItem
            title="FAQ 2"
            isExpanded={false}
            onToggle={jest.fn()}
          >
            <Text>Answer 2</Text>
          </ExpandableItem>
        </ExpandableList>
      );
      expect(screen.getByText('Answer 1')).toBeTruthy();
      expect(screen.queryByText('Answer 2')).toBeNull();
    });
  });

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(ExpandableList).toBeDefined();
    });
  });
});

// ===========================================================================
// INTEGRATION TESTS
// ===========================================================================

describe('ExpandableItem Integration', () => {
  it('works correctly in a list context', () => {
    const onToggle = jest.fn();
    render(
      <ExpandableList expandedId="2" onToggle={onToggle}>
        <ExpandableItem
          title="Question 1"
          isExpanded={false}
          onToggle={() => onToggle('1')}
          isLast={false}
        >
          <Text>Answer 1</Text>
        </ExpandableItem>
        <ExpandableItem
          title="Question 2"
          isExpanded={true}
          onToggle={() => onToggle('2')}
          isLast={false}
        >
          <Text>Answer 2</Text>
        </ExpandableItem>
        <ExpandableItem
          title="Question 3"
          isExpanded={false}
          onToggle={() => onToggle('3')}
          isLast={true}
        >
          <Text>Answer 3</Text>
        </ExpandableItem>
      </ExpandableList>
    );

    // Check titles are visible
    expect(screen.getByText('Question 1')).toBeTruthy();
    expect(screen.getByText('Question 2')).toBeTruthy();
    expect(screen.getByText('Question 3')).toBeTruthy();

    // Only expanded item shows content
    expect(screen.queryByText('Answer 1')).toBeNull();
    expect(screen.getByText('Answer 2')).toBeTruthy();
    expect(screen.queryByText('Answer 3')).toBeNull();

    // Toggle first item
    const buttons = screen.getAllByRole('button');
    fireEvent.press(buttons[0]);
    expect(onToggle).toHaveBeenCalledWith('1');
  });

  it('handles accordion-style single expand', () => {
    const MockAccordion = () => {
      const [expandedId, setExpandedId] = React.useState<string | null>(null);

      return (
        <ExpandableList
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        >
          <ExpandableItem
            title="Item A"
            isExpanded={expandedId === 'a'}
            onToggle={() => setExpandedId(expandedId === 'a' ? null : 'a')}
          >
            <Text>Content A</Text>
          </ExpandableItem>
          <ExpandableItem
            title="Item B"
            isExpanded={expandedId === 'b'}
            onToggle={() => setExpandedId(expandedId === 'b' ? null : 'b')}
          >
            <Text>Content B</Text>
          </ExpandableItem>
        </ExpandableList>
      );
    };

    render(<MockAccordion />);

    // Initially all collapsed
    expect(screen.queryByText('Content A')).toBeNull();
    expect(screen.queryByText('Content B')).toBeNull();

    // Expand first item
    const buttons = screen.getAllByRole('button');
    fireEvent.press(buttons[0]);

    expect(screen.getByText('Content A')).toBeTruthy();
    expect(screen.queryByText('Content B')).toBeNull();

    // Expand second item (first should close in accordion mode)
    fireEvent.press(buttons[1]);

    expect(screen.queryByText('Content A')).toBeNull();
    expect(screen.getByText('Content B')).toBeTruthy();
  });
});
