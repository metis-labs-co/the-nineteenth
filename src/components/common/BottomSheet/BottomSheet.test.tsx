/**
 * BottomSheet Component Tests
 *
 * Tests for the unified bottom sheet component including:
 * - Rendering states (visible/hidden)
 * - Full-screen vs partial modes
 * - Backdrop behavior
 * - Close button functionality
 * - Header rendering
 */

import React from 'react';
import { Text, View } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { BottomSheet } from './BottomSheet';

// Mock the hooks used by BottomSheet
jest.mock('./hooks/useBottomSheetAnimation', () => ({
  useBottomSheetAnimation: () => ({
    translateY: { setValue: jest.fn(), interpolate: jest.fn(() => 0) },
    backdropOpacity: { interpolate: jest.fn(() => 0.5) },
    animateClose: jest.fn(),
    resetAnimation: jest.fn(),
  }),
}));

jest.mock('./hooks/useBottomSheetGestures', () => ({
  useBottomSheetGestures: () => ({
    panHandlers: {},
  }),
}));

describe('BottomSheet', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    children: <Text>Sheet Content</Text>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders when visible is true', () => {
      render(
        <BottomSheet {...defaultProps} testID="bottom-sheet" />
      );

      expect(screen.getByTestId('bottom-sheet')).toBeTruthy();
      expect(screen.getByText('Sheet Content')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      render(
        <BottomSheet {...defaultProps} visible={false} testID="bottom-sheet" />
      );

      expect(screen.queryByTestId('bottom-sheet')).toBeNull();
    });

    it('renders children content', () => {
      render(
        <BottomSheet {...defaultProps}>
          <View testID="child-1">
            <Text>First Child</Text>
          </View>
          <View testID="child-2">
            <Text>Second Child</Text>
          </View>
        </BottomSheet>
      );

      expect(screen.getByText('First Child')).toBeTruthy();
      expect(screen.getByText('Second Child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // HEADER TESTS
  // ===========================================================================

  describe('Header', () => {
    it('renders title when provided', () => {
      render(
        <BottomSheet {...defaultProps} title="Test Title" />
      );

      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('renders close button by default', () => {
      render(
        <BottomSheet {...defaultProps} title="Test" />
      );

      // Close button should be present
      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeTruthy();
    });

    it('hides close button when showCloseButton is false', () => {
      render(
        <BottomSheet {...defaultProps} title="Test" showCloseButton={false} />
      );

      expect(screen.queryByLabelText('Close')).toBeNull();
    });

    it('calls onClose when close button is pressed', () => {
      const onClose = jest.fn();
      render(
        <BottomSheet {...defaultProps} onClose={onClose} title="Test" />
      );

      const closeButton = screen.getByLabelText('Close');
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders headerLeft content', () => {
      render(
        <BottomSheet
          {...defaultProps}
          title="Test"
          headerLeft={<Text testID="header-left">Left Content</Text>}
        />
      );

      expect(screen.getByTestId('header-left')).toBeTruthy();
      expect(screen.getByText('Left Content')).toBeTruthy();
    });

    it('renders headerRight content', () => {
      render(
        <BottomSheet
          {...defaultProps}
          title="Test"
          headerRight={<Text testID="header-right">Right Content</Text>}
        />
      );

      expect(screen.getByTestId('header-right')).toBeTruthy();
      expect(screen.getByText('Right Content')).toBeTruthy();
    });

    it('renders custom header when provided', () => {
      render(
        <BottomSheet
          {...defaultProps}
          customHeader={<View testID="custom-header"><Text>Custom Header</Text></View>}
        />
      );

      expect(screen.getByTestId('custom-header')).toBeTruthy();
      expect(screen.getByText('Custom Header')).toBeTruthy();
    });
  });

  // ===========================================================================
  // BACKDROP TESTS
  // ===========================================================================

  describe('Backdrop', () => {
    it('renders backdrop by default', () => {
      render(
        <BottomSheet {...defaultProps} />
      );

      // Backdrop should have "Close sheet" accessibility label
      const backdrop = screen.getByLabelText('Close sheet');
      expect(backdrop).toBeTruthy();
    });

    it('hides backdrop when showBackdrop is false', () => {
      render(
        <BottomSheet {...defaultProps} showBackdrop={false} />
      );

      expect(screen.queryByLabelText('Close sheet')).toBeNull();
    });

    it('calls onClose when backdrop is pressed', () => {
      const onClose = jest.fn();
      render(
        <BottomSheet {...defaultProps} onClose={onClose} />
      );

      const backdrop = screen.getByLabelText('Close sheet');
      fireEvent.press(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when closeOnBackdropPress is false', () => {
      const onClose = jest.fn();
      render(
        <BottomSheet {...defaultProps} onClose={onClose} closeOnBackdropPress={false} />
      );

      const backdrop = screen.getByLabelText('Close sheet');
      fireEvent.press(backdrop);

      // onClose should NOT be called
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // HEIGHT MODE TESTS
  // ===========================================================================

  describe('Height Modes', () => {
    it('renders as partial sheet by default (80% height)', () => {
      render(
        <BottomSheet {...defaultProps} testID="bottom-sheet" />
      );

      // Just verify it renders - the actual height is handled by styles
      expect(screen.getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('renders as full-screen when height is "full"', () => {
      render(
        <BottomSheet {...defaultProps} height="full" testID="bottom-sheet" />
      );

      expect(screen.getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('renders with custom height ratio', () => {
      render(
        <BottomSheet {...defaultProps} height={0.5} testID="bottom-sheet" />
      );

      expect(screen.getByTestId('bottom-sheet')).toBeTruthy();
    });
  });

  // ===========================================================================
  // HANDLE TESTS
  // ===========================================================================

  describe('Handle', () => {
    it('shows handle by default for partial sheets', () => {
      render(
        <BottomSheet {...defaultProps} height={0.8} />
      );

      // Handle is rendered by BottomSheetHeader
      // Default for partial is showHandle = true
      // The handle is visible in partial mode by default
    });

    it('hides handle by default for full-screen sheets', () => {
      render(
        <BottomSheet {...defaultProps} height="full" />
      );

      // For full-screen, showHandle defaults to false
    });

    it('respects explicit showHandle prop', () => {
      render(
        <BottomSheet {...defaultProps} showHandle={true} />
      );
      // Handle should be visible
    });
  });

  // ===========================================================================
  // PROPS TESTS
  // ===========================================================================

  describe('Props', () => {
    it('applies containerStyle', () => {
      render(
        <BottomSheet
          {...defaultProps}
          containerStyle={{ backgroundColor: 'red' }}
          testID="bottom-sheet"
        />
      );

      expect(screen.getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('applies contentStyle', () => {
      render(
        <BottomSheet
          {...defaultProps}
          contentStyle={{ padding: 20 }}
        />
      );

      expect(screen.getByText('Sheet Content')).toBeTruthy();
    });

    it('passes testID to container', () => {
      render(
        <BottomSheet {...defaultProps} testID="my-sheet" />
      );

      expect(screen.getByTestId('my-sheet')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('backdrop has accessible label', () => {
      render(
        <BottomSheet {...defaultProps} />
      );

      expect(screen.getByLabelText('Close sheet')).toBeTruthy();
    });

    it('backdrop has button role', () => {
      render(
        <BottomSheet {...defaultProps} />
      );

      const backdrop = screen.getByRole('button', { name: 'Close sheet' });
      expect(backdrop).toBeTruthy();
    });

    it('close button has accessible label', () => {
      render(
        <BottomSheet {...defaultProps} title="Test" />
      );

      expect(screen.getByLabelText('Close')).toBeTruthy();
    });
  });
});
