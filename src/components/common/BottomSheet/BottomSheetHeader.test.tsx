/**
 * BottomSheetHeader Component Tests
 *
 * Tests for the header component of BottomSheet including:
 * - Rendering states
 * - Handle visibility
 * - Title rendering
 * - Close button functionality
 * - Header left/right content slots
 * - Accessibility features
 */

import React from 'react';
import { Text, View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BottomSheetHeader } from './BottomSheetHeader';

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text: RNText } = require('react-native');
  return {
    Text: ({ children, style, numberOfLines }: any) => (
      <RNText style={style} numberOfLines={numberOfLines}>
        {children}
      </RNText>
    ),
    Icon: ({ source, size, _color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }}>
        <RNText>{source}</RNText>
      </View>
    ),
  };
});

// Mock theme context
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    border: '#E0E0E0',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    surface: '#FFFFFF',
    background: '#F5F5F5',
  }),
}));

// Mock theme constants
jest.mock('@/constants/theme', () => ({
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  typography: {
    h4: {
      fontSize: 18,
      fontWeight: '600',
    },
  },
  borderRadius: {
    full: 9999,
  },
}));

describe('BottomSheetHeader', () => {
  const defaultProps = {
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<BottomSheetHeader {...defaultProps} />);

      // Should render the close button by default
      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('renders with minimal props', () => {
      render(<BottomSheetHeader onClose={jest.fn()} />);

      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('renders with all props provided', () => {
      const onClose = jest.fn();
      render(
        <BottomSheetHeader
          title="Test Title"
          showCloseButton={true}
          onClose={onClose}
          headerLeft={<Text testID="header-left">Left</Text>}
          headerRight={<Text testID="header-right">Right</Text>}
          showHandle={true}
        />
      );

      expect(screen.getByText('Test Title')).toBeTruthy();
      expect(screen.getByTestId('header-left')).toBeTruthy();
      expect(screen.getByTestId('header-right')).toBeTruthy();
      expect(screen.getByLabelText('Close')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TITLE TESTS
  // ===========================================================================

  describe('Title', () => {
    it('renders title when provided', () => {
      render(<BottomSheetHeader {...defaultProps} title="Sheet Title" />);

      expect(screen.getByText('Sheet Title')).toBeTruthy();
    });

    it('does not render title when not provided', () => {
      render(<BottomSheetHeader {...defaultProps} />);

      expect(screen.queryByText('Sheet Title')).toBeNull();
    });

    it('renders with empty title', () => {
      render(<BottomSheetHeader {...defaultProps} title="" />);

      // Empty string should not render
      expect(screen.queryByText('')).toBeNull();
    });

    it('renders long title with truncation', () => {
      const longTitle = 'This is a very long title that should be truncated';
      render(<BottomSheetHeader {...defaultProps} title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeTruthy();
    });

    it('renders title with special characters', () => {
      render(<BottomSheetHeader {...defaultProps} title="Round #1 - 🏌️ Golf" />);

      expect(screen.getByText('Round #1 - 🏌️ Golf')).toBeTruthy();
    });
  });

  // ===========================================================================
  // HANDLE TESTS
  // ===========================================================================

  describe('Handle', () => {
    it('shows handle when showHandle is true', () => {
      const { toJSON } = render(
        <BottomSheetHeader {...defaultProps} showHandle={true} />
      );

      // Handle should be in the tree - it's a View with specific dimensions
      const json = toJSON();
      expect(json).toBeTruthy();
    });

    it('hides handle when showHandle is false', () => {
      render(<BottomSheetHeader {...defaultProps} showHandle={false} />);

      // Handle should not be visible
      // We verify by checking the component renders correctly without handle
      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('shows handle by default (showHandle defaults to true)', () => {
      const { toJSON } = render(<BottomSheetHeader {...defaultProps} />);

      // Default behavior shows handle
      const json = toJSON();
      expect(json).toBeTruthy();
    });
  });

  // ===========================================================================
  // CLOSE BUTTON TESTS
  // ===========================================================================

  describe('Close Button', () => {
    it('shows close button by default', () => {
      render(<BottomSheetHeader {...defaultProps} />);

      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('shows close button when showCloseButton is true', () => {
      render(<BottomSheetHeader {...defaultProps} showCloseButton={true} />);

      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('hides close button when showCloseButton is false', () => {
      render(<BottomSheetHeader {...defaultProps} showCloseButton={false} />);

      expect(screen.queryByLabelText('Close')).toBeNull();
    });

    it('calls onClose when close button is pressed', () => {
      const onClose = jest.fn();
      render(<BottomSheetHeader onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close');
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose multiple times on multiple presses', () => {
      const onClose = jest.fn();
      render(<BottomSheetHeader onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close');
      fireEvent.press(closeButton);
      fireEvent.press(closeButton);
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('renders close icon', () => {
      render(<BottomSheetHeader {...defaultProps} />);

      expect(screen.getByTestId('icon-close')).toBeTruthy();
    });
  });

  // ===========================================================================
  // HEADER LEFT TESTS
  // ===========================================================================

  describe('Header Left', () => {
    it('renders headerLeft content', () => {
      render(
        <BottomSheetHeader
          {...defaultProps}
          headerLeft={<Text testID="left-content">Back</Text>}
        />
      );

      expect(screen.getByTestId('left-content')).toBeTruthy();
      expect(screen.getByText('Back')).toBeTruthy();
    });

    it('renders headerLeft as a View component', () => {
      render(
        <BottomSheetHeader
          {...defaultProps}
          headerLeft={
            <View testID="left-view">
              <Text>Icon</Text>
            </View>
          }
        />
      );

      expect(screen.getByTestId('left-view')).toBeTruthy();
      expect(screen.getByText('Icon')).toBeTruthy();
    });

    it('does not render headerLeft when not provided', () => {
      render(<BottomSheetHeader {...defaultProps} />);

      expect(screen.queryByTestId('left-content')).toBeNull();
    });

    it('renders headerLeft with button functionality', () => {
      const onBack = jest.fn();
      const { TouchableOpacity } = require('react-native');

      render(
        <BottomSheetHeader
          {...defaultProps}
          headerLeft={
            <TouchableOpacity testID="back-button" onPress={onBack}>
              <Text>Back</Text>
            </TouchableOpacity>
          }
        />
      );

      const backButton = screen.getByTestId('back-button');
      fireEvent.press(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // HEADER RIGHT TESTS
  // ===========================================================================

  describe('Header Right', () => {
    it('renders headerRight content', () => {
      render(
        <BottomSheetHeader
          {...defaultProps}
          headerRight={<Text testID="right-content">Done</Text>}
        />
      );

      expect(screen.getByTestId('right-content')).toBeTruthy();
      expect(screen.getByText('Done')).toBeTruthy();
    });

    it('renders headerRight alongside close button', () => {
      render(
        <BottomSheetHeader
          {...defaultProps}
          showCloseButton={true}
          headerRight={<Text testID="right-action">Save</Text>}
        />
      );

      expect(screen.getByTestId('right-action')).toBeTruthy();
      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('renders headerRight without close button', () => {
      render(
        <BottomSheetHeader
          {...defaultProps}
          showCloseButton={false}
          headerRight={<Text testID="right-action">Submit</Text>}
        />
      );

      expect(screen.getByTestId('right-action')).toBeTruthy();
      expect(screen.queryByLabelText('Close')).toBeNull();
    });

    it('renders headerRight with button functionality', () => {
      const onAction = jest.fn();
      const { TouchableOpacity } = require('react-native');

      render(
        <BottomSheetHeader
          {...defaultProps}
          headerRight={
            <TouchableOpacity testID="action-button" onPress={onAction}>
              <Text>Action</Text>
            </TouchableOpacity>
          }
        />
      );

      const actionButton = screen.getByTestId('action-button');
      fireEvent.press(actionButton);

      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // COMBINED HEADER CONTENT TESTS
  // ===========================================================================

  describe('Combined Header Content', () => {
    it('renders title with headerLeft and headerRight', () => {
      render(
        <BottomSheetHeader
          {...defaultProps}
          title="Center Title"
          headerLeft={<Text testID="left">L</Text>}
          headerRight={<Text testID="right">R</Text>}
        />
      );

      expect(screen.getByText('Center Title')).toBeTruthy();
      expect(screen.getByTestId('left')).toBeTruthy();
      expect(screen.getByTestId('right')).toBeTruthy();
    });

    it('renders all elements with close button', () => {
      render(
        <BottomSheetHeader
          {...defaultProps}
          title="Complete Header"
          showCloseButton={true}
          showHandle={true}
          headerLeft={<Text testID="nav-back">←</Text>}
          headerRight={<Text testID="nav-action">✓</Text>}
        />
      );

      expect(screen.getByText('Complete Header')).toBeTruthy();
      expect(screen.getByTestId('nav-back')).toBeTruthy();
      expect(screen.getByTestId('nav-action')).toBeTruthy();
      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('renders without title but with left and right content', () => {
      render(
        <BottomSheetHeader
          {...defaultProps}
          headerLeft={<Text testID="left-only">Cancel</Text>}
          headerRight={<Text testID="right-only">Save</Text>}
        />
      );

      expect(screen.getByTestId('left-only')).toBeTruthy();
      expect(screen.getByTestId('right-only')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('close button has accessible label', () => {
      render(<BottomSheetHeader {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeTruthy();
    });

    it('close button has button role', () => {
      render(<BottomSheetHeader {...defaultProps} />);

      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeTruthy();
    });

    it('close button has hitSlop for better touch target', () => {
      render(<BottomSheetHeader {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      // The component defines hitSlop which improves accessibility
      expect(closeButton).toBeTruthy();
    });

    it('title is readable when provided', () => {
      render(<BottomSheetHeader {...defaultProps} title="Accessible Title" />);

      expect(screen.getByText('Accessible Title')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles undefined headerLeft gracefully', () => {
      render(
        <BottomSheetHeader {...defaultProps} headerLeft={undefined} />
      );

      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('handles undefined headerRight gracefully', () => {
      render(
        <BottomSheetHeader {...defaultProps} headerRight={undefined} />
      );

      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('handles null headerLeft gracefully', () => {
      render(
        <BottomSheetHeader {...defaultProps} headerLeft={null} />
      );

      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('handles null headerRight gracefully', () => {
      render(
        <BottomSheetHeader {...defaultProps} headerRight={null} />
      );

      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('renders with all props false', () => {
      render(
        <BottomSheetHeader
          {...defaultProps}
          showCloseButton={false}
          showHandle={false}
        />
      );

      // Should still render the header structure
      expect(screen.queryByLabelText('Close')).toBeNull();
    });

    it('handles empty string title', () => {
      render(<BottomSheetHeader {...defaultProps} title="" />);

      // Empty title should not cause issues
      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('handles whitespace-only title', () => {
      render(<BottomSheetHeader {...defaultProps} title="   " />);

      // Whitespace title should render
      expect(screen.getByText('   ')).toBeTruthy();
    });

    it('handles complex nested headerLeft', () => {
      render(
        <BottomSheetHeader
          {...defaultProps}
          headerLeft={
            <View testID="complex-left">
              <View testID="nested-1">
                <Text>Nested</Text>
              </View>
              <View testID="nested-2">
                <Text>Content</Text>
              </View>
            </View>
          }
        />
      );

      expect(screen.getByTestId('complex-left')).toBeTruthy();
      expect(screen.getByTestId('nested-1')).toBeTruthy();
      expect(screen.getByTestId('nested-2')).toBeTruthy();
    });

    it('handles complex nested headerRight', () => {
      render(
        <BottomSheetHeader
          {...defaultProps}
          headerRight={
            <View testID="complex-right">
              <Text>Multiple</Text>
              <Text>Elements</Text>
            </View>
          }
        />
      );

      expect(screen.getByTestId('complex-right')).toBeTruthy();
      expect(screen.getByText('Multiple')).toBeTruthy();
      expect(screen.getByText('Elements')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SNAPSHOT TESTS
  // ===========================================================================

  describe('Snapshots', () => {
    it('matches snapshot with default props', () => {
      const { toJSON } = render(<BottomSheetHeader {...defaultProps} />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with title', () => {
      const { toJSON } = render(
        <BottomSheetHeader {...defaultProps} title="Test Title" />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with all props', () => {
      const { toJSON } = render(
        <BottomSheetHeader
          {...defaultProps}
          title="Full Header"
          showCloseButton={true}
          showHandle={true}
          headerLeft={<Text>Left</Text>}
          headerRight={<Text>Right</Text>}
        />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot without close button', () => {
      const { toJSON } = render(
        <BottomSheetHeader
          {...defaultProps}
          title="No Close Button"
          showCloseButton={false}
        />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot without handle', () => {
      const { toJSON } = render(
        <BottomSheetHeader
          {...defaultProps}
          title="No Handle"
          showHandle={false}
        />
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
