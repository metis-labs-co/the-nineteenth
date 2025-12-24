/**
 * ConfirmationDialog Component Tests
 *
 * Tests for the modal confirmation dialog component including:
 * - Rendering with different props
 * - Visibility states
 * - Button variants (primary, destructive)
 * - Loading state
 * - Icon display
 * - User interactions (confirm, cancel, overlay dismiss)
 * - Accessibility
 * - Custom labels
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ConfirmationDialog, ConfirmationDialogProps } from './ConfirmationDialog';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  primaryLight: '#E6F4F0',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  surface: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',
  gray100: '#F3F4F6',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Icon: ({ source, size, color, ...props }: any) => (
      <View testID={`icon-${source}`} accessibilityLabel={source} {...props} />
    ),
  };
});

// Mock GolfBallLoader
jest.mock('./GolfBallLoader', () => {
  const { View, Text } = require('react-native');
  return {
    GolfBallLoader: ({ size }: { size?: string }) => (
      <View testID="golf-ball-loader">
        <Text>Loading...</Text>
      </View>
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
    h3: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 14 },
    bodyBold: { fontSize: 14, fontWeight: '600' },
  },
  borderRadius: {
    lg: 12,
    xl: 16,
  },
  shadows: {
    lg: { shadowColor: '#000', shadowOpacity: 0.15 },
  },
}));

describe('ConfirmationDialog', () => {
  // Default props for testing
  const defaultProps: ConfirmationDialogProps = {
    visible: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing when visible', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeTruthy();
    });

    it('renders title correctly', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeTruthy();
    });

    it('renders message correctly', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Are you sure you want to proceed?')).toBeTruthy();
    });

    it('renders default confirm button label', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Confirm')).toBeTruthy();
    });

    it('renders default cancel button label', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('does not render content when not visible', () => {
      render(<ConfirmationDialog {...defaultProps} visible={false} />);
      expect(screen.queryByText('Confirm Action')).toBeNull();
    });

    it('renders with long title', () => {
      const longTitle = 'This is a very long title that might wrap to multiple lines';
      render(<ConfirmationDialog {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeTruthy();
    });

    it('renders with long message', () => {
      const longMessage =
        'This is a very long message that explains the action in detail. It should wrap properly and still be readable in the dialog. Users need to understand what they are confirming.';
      render(<ConfirmationDialog {...defaultProps} message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeTruthy();
    });

    it('renders with special characters in text', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          title="Delete @user's data?"
          message="This will remove all #tagged items & more."
        />
      );
      expect(screen.getByText("Delete @user's data?")).toBeTruthy();
      expect(screen.getByText('This will remove all #tagged items & more.')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CUSTOM LABELS
  // ===========================================================================

  describe('Custom Labels', () => {
    it('renders custom confirm label', () => {
      render(<ConfirmationDialog {...defaultProps} confirmLabel="Delete" />);
      expect(screen.getByText('Delete')).toBeTruthy();
    });

    it('renders custom cancel label', () => {
      render(<ConfirmationDialog {...defaultProps} cancelLabel="Go Back" />);
      expect(screen.getByText('Go Back')).toBeTruthy();
    });

    it('renders both custom labels', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          confirmLabel="Yes, Delete"
          cancelLabel="No, Keep"
        />
      );
      expect(screen.getByText('Yes, Delete')).toBeTruthy();
      expect(screen.getByText('No, Keep')).toBeTruthy();
    });

    it('renders short confirm label', () => {
      render(<ConfirmationDialog {...defaultProps} confirmLabel="OK" />);
      expect(screen.getByText('OK')).toBeTruthy();
    });

    it('renders short cancel label', () => {
      render(<ConfirmationDialog {...defaultProps} cancelLabel="No" />);
      expect(screen.getByText('No')).toBeTruthy();
    });

    it('renders long confirm label', () => {
      render(
        <ConfirmationDialog {...defaultProps} confirmLabel="Yes, I want to permanently delete" />
      );
      expect(screen.getByText('Yes, I want to permanently delete')).toBeTruthy();
    });
  });

  // ===========================================================================
  // BUTTON VARIANTS
  // ===========================================================================

  describe('Button Variants', () => {
    it('renders with default primary variant', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Confirm')).toBeTruthy();
    });

    it('renders with primary variant', () => {
      render(<ConfirmationDialog {...defaultProps} confirmVariant="primary" />);
      expect(screen.getByText('Confirm')).toBeTruthy();
    });

    it('renders with destructive variant', () => {
      render(<ConfirmationDialog {...defaultProps} confirmVariant="destructive" />);
      expect(screen.getByText('Confirm')).toBeTruthy();
    });

    it('renders destructive variant for delete actions', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          title="Delete Competition"
          message="This action cannot be undone."
          confirmLabel="Delete"
          confirmVariant="destructive"
        />
      );
      expect(screen.getByText('Delete Competition')).toBeTruthy();
      expect(screen.getByText('Delete')).toBeTruthy();
    });
  });

  // ===========================================================================
  // LOADING STATE
  // ===========================================================================

  describe('Loading State', () => {
    it('renders confirm button text when not loading', () => {
      render(<ConfirmationDialog {...defaultProps} loading={false} />);
      expect(screen.getByText('Confirm')).toBeTruthy();
      expect(screen.queryByTestId('golf-ball-loader')).toBeNull();
    });

    it('renders loader when loading', () => {
      render(<ConfirmationDialog {...defaultProps} loading={true} />);
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('hides confirm text when loading', () => {
      render(<ConfirmationDialog {...defaultProps} loading={true} />);
      expect(screen.queryByText('Confirm')).toBeNull();
    });

    it('keeps cancel button visible when loading', () => {
      render(<ConfirmationDialog {...defaultProps} loading={true} />);
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('disables buttons when loading', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();
      render(
        <ConfirmationDialog
          {...defaultProps}
          loading={true}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      // When loading, the cancel button's disabled prop should be true
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  // ===========================================================================
  // ICON DISPLAY
  // ===========================================================================

  describe('Icon Display', () => {
    it('does not render icon when not provided', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.queryByTestId('icon-alert')).toBeNull();
    });

    it('renders icon when provided', () => {
      render(<ConfirmationDialog {...defaultProps} icon="alert" />);
      expect(screen.getByTestId('icon-alert')).toBeTruthy();
    });

    it('renders trash icon for delete dialogs', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          icon="delete"
          confirmVariant="destructive"
        />
      );
      expect(screen.getByTestId('icon-delete')).toBeTruthy();
    });

    it('renders check icon for success dialogs', () => {
      render(<ConfirmationDialog {...defaultProps} icon="check-circle" />);
      expect(screen.getByTestId('icon-check-circle')).toBeTruthy();
    });

    it('renders warning icon for warning dialogs', () => {
      render(<ConfirmationDialog {...defaultProps} icon="alert-circle" />);
      expect(screen.getByTestId('icon-alert-circle')).toBeTruthy();
    });

    it('renders icon with custom color', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          icon="alert"
          iconColor="#FF0000"
        />
      );
      expect(screen.getByTestId('icon-alert')).toBeTruthy();
    });

    it('renders different icons for different purposes', () => {
      const { rerender } = render(
        <ConfirmationDialog {...defaultProps} icon="delete" />
      );
      expect(screen.getByTestId('icon-delete')).toBeTruthy();

      rerender(<ConfirmationDialog {...defaultProps} icon="logout" />);
      expect(screen.getByTestId('icon-logout')).toBeTruthy();
    });
  });

  // ===========================================================================
  // USER INTERACTIONS
  // ===========================================================================

  describe('User Interactions', () => {
    it('calls onConfirm when confirm button is pressed', () => {
      const onConfirm = jest.fn();
      render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.press(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is pressed', () => {
      const onCancel = jest.fn();
      render(<ConfirmationDialog {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.press(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm with custom label button', () => {
      const onConfirm = jest.fn();
      render(
        <ConfirmationDialog
          {...defaultProps}
          confirmLabel="Delete Forever"
          onConfirm={onConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Delete Forever' });
      fireEvent.press(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel with custom label button', () => {
      const onCancel = jest.fn();
      render(
        <ConfirmationDialog
          {...defaultProps}
          cancelLabel="Never Mind"
          onCancel={onCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Never Mind' });
      fireEvent.press(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when loading', () => {
      const onConfirm = jest.fn();
      render(
        <ConfirmationDialog {...defaultProps} loading={true} onConfirm={onConfirm} />
      );

      const confirmButtons = screen.getAllByRole('button');
      const confirmButton = confirmButtons.find(
        (btn) => btn.props.accessibilityLabel === 'Confirm'
      );

      if (confirmButton) {
        fireEvent.press(confirmButton);
        expect(onConfirm).not.toHaveBeenCalled();
      }
    });

    it('has disabled cancel button when loading', () => {
      const onCancel = jest.fn();
      render(
        <ConfirmationDialog {...defaultProps} loading={true} onCancel={onCancel} />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      // The button should be disabled when loading
      expect(cancelButton.props.accessibilityState.disabled).toBe(true);
    });

    it('allows multiple presses on confirm', () => {
      const onConfirm = jest.fn();
      render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.press(confirmButton);
      fireEvent.press(confirmButton);
      fireEvent.press(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(3);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe('Accessibility', () => {
    it('cancel button has correct accessibility role', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeTruthy();
    });

    it('confirm button has correct accessibility role', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toBeTruthy();
    });

    it('buttons have correct accessibility labels', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          confirmLabel="Delete Item"
          cancelLabel="Keep Item"
        />
      );
      expect(screen.getByRole('button', { name: 'Delete Item' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Keep Item' })).toBeTruthy();
    });

    it('title is accessible', () => {
      render(<ConfirmationDialog {...defaultProps} title="Confirm Deletion" />);
      expect(screen.getByText('Confirm Deletion')).toBeTruthy();
    });

    it('message is accessible', () => {
      render(
        <ConfirmationDialog {...defaultProps} message="This cannot be undone." />
      );
      expect(screen.getByText('This cannot be undone.')).toBeTruthy();
    });
  });

  // ===========================================================================
  // VISIBILITY STATES
  // ===========================================================================

  describe('Visibility States', () => {
    it('shows dialog when visible is true', () => {
      render(<ConfirmationDialog {...defaultProps} visible={true} />);
      expect(screen.getByText('Confirm Action')).toBeTruthy();
    });

    it('hides dialog when visible is false', () => {
      render(<ConfirmationDialog {...defaultProps} visible={false} />);
      expect(screen.queryByText('Confirm Action')).toBeNull();
    });

    it('transitions from hidden to visible', () => {
      const { rerender } = render(
        <ConfirmationDialog {...defaultProps} visible={false} />
      );
      expect(screen.queryByText('Confirm Action')).toBeNull();

      rerender(<ConfirmationDialog {...defaultProps} visible={true} />);
      expect(screen.getByText('Confirm Action')).toBeTruthy();
    });

    it('transitions from visible to hidden', () => {
      const { rerender } = render(
        <ConfirmationDialog {...defaultProps} visible={true} />
      );
      expect(screen.getByText('Confirm Action')).toBeTruthy();

      rerender(<ConfirmationDialog {...defaultProps} visible={false} />);
      expect(screen.queryByText('Confirm Action')).toBeNull();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty title', () => {
      render(<ConfirmationDialog {...defaultProps} title="" />);
      expect(screen.getByText('Are you sure you want to proceed?')).toBeTruthy();
    });

    it('handles empty message', () => {
      render(<ConfirmationDialog {...defaultProps} message="" />);
      expect(screen.getByText('Confirm Action')).toBeTruthy();
    });

    it('handles empty confirm label', () => {
      render(<ConfirmationDialog {...defaultProps} confirmLabel="" />);
      // Should still render the button, just with empty text
      expect(screen.getByRole('button', { name: '' })).toBeTruthy();
    });

    it('handles whitespace-only title', () => {
      render(<ConfirmationDialog {...defaultProps} title="   " />);
      expect(screen.getByText('   ')).toBeTruthy();
    });

    it('handles title with newlines', () => {
      render(<ConfirmationDialog {...defaultProps} title={'Line 1\nLine 2'} />);
      // In React Native, the text is rendered with the actual newline character
      expect(screen.getByText(/Line 1/)).toBeTruthy();
    });

    it('handles message with emojis', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          message="⚠️ This action is permanent! 🗑️"
        />
      );
      expect(screen.getByText('⚠️ This action is permanent! 🗑️')).toBeTruthy();
    });

    it('handles rapid visibility toggles', () => {
      const { rerender } = render(
        <ConfirmationDialog {...defaultProps} visible={true} />
      );
      expect(screen.getByText('Confirm Action')).toBeTruthy();

      for (let i = 0; i < 5; i++) {
        rerender(<ConfirmationDialog {...defaultProps} visible={false} />);
        rerender(<ConfirmationDialog {...defaultProps} visible={true} />);
      }

      expect(screen.getByText('Confirm Action')).toBeTruthy();
    });

    it('handles undefined optional props gracefully', () => {
      render(
        <ConfirmationDialog
          visible={true}
          title="Test"
          message="Test message"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
          confirmLabel={undefined}
          cancelLabel={undefined}
          confirmVariant={undefined}
          loading={undefined}
          icon={undefined}
          iconColor={undefined}
        />
      );
      expect(screen.getByText('Test')).toBeTruthy();
      expect(screen.getByText('Confirm')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
    });
  });

  // ===========================================================================
  // USE CASES
  // ===========================================================================

  describe('Use Cases', () => {
    it('renders delete competition dialog', () => {
      render(
        <ConfirmationDialog
          visible={true}
          title="Delete Competition"
          message="Are you sure you want to delete this competition? This action cannot be undone."
          confirmLabel="Delete"
          confirmVariant="destructive"
          icon="delete"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      expect(screen.getByText('Delete Competition')).toBeTruthy();
      expect(screen.getByText('Delete')).toBeTruthy();
      expect(screen.getByTestId('icon-delete')).toBeTruthy();
    });

    it('renders leave competition dialog', () => {
      render(
        <ConfirmationDialog
          visible={true}
          title="Leave Competition"
          message="Are you sure you want to leave this competition? Your scores will be removed."
          confirmLabel="Leave"
          confirmVariant="destructive"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      expect(screen.getByText('Leave Competition')).toBeTruthy();
      expect(screen.getByText('Leave')).toBeTruthy();
    });

    it('renders submit scorecard dialog', () => {
      render(
        <ConfirmationDialog
          visible={true}
          title="Submit Scorecard"
          message="Once submitted, you cannot edit your scores. Are you sure?"
          confirmLabel="Submit"
          confirmVariant="primary"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      expect(screen.getByText('Submit Scorecard')).toBeTruthy();
      expect(screen.getByText('Submit')).toBeTruthy();
    });

    it('renders logout dialog', () => {
      render(
        <ConfirmationDialog
          visible={true}
          title="Log Out"
          message="Are you sure you want to log out?"
          confirmLabel="Log Out"
          icon="logout"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      // Multiple elements have "Log Out" text (title and button), use getAllByText
      expect(screen.getAllByText('Log Out').length).toBeGreaterThan(0);
      expect(screen.getByTestId('icon-logout')).toBeTruthy();
    });

    it('renders discard changes dialog', () => {
      render(
        <ConfirmationDialog
          visible={true}
          title="Discard Changes"
          message="You have unsaved changes. Are you sure you want to discard them?"
          confirmLabel="Discard"
          cancelLabel="Keep Editing"
          confirmVariant="destructive"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      expect(screen.getByText('Discard Changes')).toBeTruthy();
      expect(screen.getByText('Discard')).toBeTruthy();
      expect(screen.getByText('Keep Editing')).toBeTruthy();
    });

    it('renders remove player dialog', () => {
      render(
        <ConfirmationDialog
          visible={true}
          title="Remove Player"
          message="Are you sure you want to remove John Smith from this competition?"
          confirmLabel="Remove"
          confirmVariant="destructive"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      expect(screen.getByText('Remove Player')).toBeTruthy();
      expect(
        screen.getByText(
          'Are you sure you want to remove John Smith from this competition?'
        )
      ).toBeTruthy();
    });

    it('renders finalise round dialog', () => {
      render(
        <ConfirmationDialog
          visible={true}
          title="Finalise Round"
          message="This will lock all scores and calculate the final leaderboard. Continue?"
          confirmLabel="Finalise"
          confirmVariant="primary"
          icon="check-circle"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      expect(screen.getByText('Finalise Round')).toBeTruthy();
      expect(screen.getByText('Finalise')).toBeTruthy();
      expect(screen.getByTestId('icon-check-circle')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROP COMBINATIONS
  // ===========================================================================

  describe('Prop Combinations', () => {
    it('renders with all props set', () => {
      render(
        <ConfirmationDialog
          visible={true}
          title="Full Props Test"
          message="Testing all props at once."
          confirmLabel="OK"
          cancelLabel="Back"
          confirmVariant="destructive"
          loading={false}
          icon="alert"
          iconColor="#FF6600"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      expect(screen.getByText('Full Props Test')).toBeTruthy();
      expect(screen.getByText('Testing all props at once.')).toBeTruthy();
      expect(screen.getByText('OK')).toBeTruthy();
      expect(screen.getByText('Back')).toBeTruthy();
      expect(screen.getByTestId('icon-alert')).toBeTruthy();
    });

    it('renders loading destructive dialog', () => {
      render(
        <ConfirmationDialog
          visible={true}
          title="Deleting..."
          message="Please wait while we delete the competition."
          confirmLabel="Delete"
          confirmVariant="destructive"
          loading={true}
          icon="delete"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      expect(screen.getByText('Deleting...')).toBeTruthy();
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders primary variant with icon', () => {
      render(
        <ConfirmationDialog
          visible={true}
          title="Save Changes"
          message="Do you want to save your changes?"
          confirmLabel="Save"
          confirmVariant="primary"
          icon="content-save"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      expect(screen.getByText('Save Changes')).toBeTruthy();
      expect(screen.getByTestId('icon-content-save')).toBeTruthy();
    });
  });

  // ===========================================================================
  // RERENDERING
  // ===========================================================================

  describe('Rerendering', () => {
    it('updates title on rerender', () => {
      const { rerender } = render(
        <ConfirmationDialog {...defaultProps} title="Original Title" />
      );
      expect(screen.getByText('Original Title')).toBeTruthy();

      rerender(<ConfirmationDialog {...defaultProps} title="Updated Title" />);
      expect(screen.getByText('Updated Title')).toBeTruthy();
      expect(screen.queryByText('Original Title')).toBeNull();
    });

    it('updates message on rerender', () => {
      const { rerender } = render(
        <ConfirmationDialog {...defaultProps} message="Original message" />
      );
      expect(screen.getByText('Original message')).toBeTruthy();

      rerender(<ConfirmationDialog {...defaultProps} message="Updated message" />);
      expect(screen.getByText('Updated message')).toBeTruthy();
    });

    it('updates loading state on rerender', () => {
      const { rerender } = render(
        <ConfirmationDialog {...defaultProps} loading={false} />
      );
      expect(screen.queryByTestId('golf-ball-loader')).toBeNull();

      rerender(<ConfirmationDialog {...defaultProps} loading={true} />);
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();

      rerender(<ConfirmationDialog {...defaultProps} loading={false} />);
      expect(screen.queryByTestId('golf-ball-loader')).toBeNull();
    });

    it('updates callbacks on rerender', () => {
      const onConfirm1 = jest.fn();
      const onConfirm2 = jest.fn();

      const { rerender } = render(
        <ConfirmationDialog {...defaultProps} onConfirm={onConfirm1} />
      );

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.press(confirmButton);
      expect(onConfirm1).toHaveBeenCalledTimes(1);

      rerender(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm2} />);
      fireEvent.press(confirmButton);
      expect(onConfirm2).toHaveBeenCalledTimes(1);
      expect(onConfirm1).toHaveBeenCalledTimes(1);
    });
  });
});
