/**
 * SkinsDisclaimerModal Component Tests
 *
 * Tests for the skins disclaimer modal including:
 * - Rendering when visible/not visible
 * - Checkbox enables accept button
 * - Accept/cancel callbacks
 * - AsyncStorage integration
 * - Accessibility
 *
 * @see src/components/skins/SkinsDisclaimerModal.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import {
  SkinsDisclaimerModal,
  hasAcceptedSkinsDisclaimer,
  clearSkinsDisclaimerAcceptance,
} from '@/components/skins/SkinsDisclaimerModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock AccessibilityInfo
const mockAnnounceForAccessibility = jest.fn();
jest.spyOn(
  require('react-native').AccessibilityInfo,
  'announceForAccessibility'
).mockImplementation(mockAnnounceForAccessibility);

// ============================================================================
// TEST SUITE
// ============================================================================

describe('SkinsDisclaimerModal', () => {
  const mockOnAccept = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('renders when visible', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
          testID="disclaimer-modal"
        />
      );

      expect(screen.getByTestId('disclaimer-modal')).toBeTruthy();
    });

    it('does not render when not visible', () => {
      render(
        <SkinsDisclaimerModal
          visible={false}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
          testID="disclaimer-modal"
        />
      );

      expect(screen.queryByTestId('disclaimer-modal')).toBeNull();
    });

    it('renders the title', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Side Game Notice')).toBeTruthy();
    });

    it('renders the message', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByText(/Skins is a social side game that tracks friendly competitions between players/)
      ).toBeTruthy();
    });

    it('renders all disclaimer points', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('This feature tracks side game scores for social entertainment')).toBeTruthy();
      expect(
        screen.getByText('The app does not process, hold, or transfer any money')
      ).toBeTruthy();
      expect(
        screen.getByText('Any settlements are arranged privately between players')
      ).toBeTruthy();
      expect(
        screen.getByText('The Nineteenth is not responsible for any arrangements between players')
      ).toBeTruthy();
    });

    it('renders checkbox', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId('skins-disclaimer-checkbox')).toBeTruthy();
      expect(screen.getByText('I understand and accept these terms')).toBeTruthy();
    });

    it('renders cancel button', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId('skins-disclaimer-cancel')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('renders accept button', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId('skins-disclaimer-accept')).toBeTruthy();
      expect(screen.getByText('I Understand, Continue')).toBeTruthy();
    });
  });

  describe('Checkbox Behavior', () => {
    it('checkbox starts unchecked', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      const checkbox = screen.getByTestId('skins-disclaimer-checkbox');
      expect(checkbox.props.accessibilityState.checked).toBe(false);
    });

    it('checkbox toggles on press', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      const checkbox = screen.getByTestId('skins-disclaimer-checkbox');

      // Toggle on
      fireEvent.press(checkbox);
      expect(checkbox.props.accessibilityState.checked).toBe(true);

      // Toggle off
      fireEvent.press(checkbox);
      expect(checkbox.props.accessibilityState.checked).toBe(false);
    });

    it('accept button is disabled when checkbox is unchecked', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      const acceptButton = screen.getByTestId('skins-disclaimer-accept');
      expect(acceptButton.props.accessibilityState.disabled).toBe(true);
    });

    it('accept button is enabled when checkbox is checked', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      const checkbox = screen.getByTestId('skins-disclaimer-checkbox');
      fireEvent.press(checkbox);

      const acceptButton = screen.getByTestId('skins-disclaimer-accept');
      expect(acceptButton.props.accessibilityState.disabled).toBe(false);
    });

    it('checkbox resets when modal is hidden and shown again', () => {
      const { rerender } = render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      // Check the checkbox
      const checkbox = screen.getByTestId('skins-disclaimer-checkbox');
      fireEvent.press(checkbox);
      expect(checkbox.props.accessibilityState.checked).toBe(true);

      // Hide modal
      rerender(
        <SkinsDisclaimerModal
          visible={false}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      // Show modal again
      rerender(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      // Checkbox should be reset
      const newCheckbox = screen.getByTestId('skins-disclaimer-checkbox');
      expect(newCheckbox.props.accessibilityState.checked).toBe(false);
    });
  });

  describe('Button Callbacks', () => {
    it('calls onCancel when cancel button is pressed', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.press(screen.getByTestId('skins-disclaimer-cancel'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when backdrop is pressed', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      // Find the backdrop pressable
      const backdrop = screen.getByLabelText('Close disclaimer');
      fireEvent.press(backdrop);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onAccept when accept button pressed but checkbox unchecked', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      // Try to press accept without checking checkbox (button is disabled)
      fireEvent.press(screen.getByTestId('skins-disclaimer-accept'));

      expect(mockOnAccept).not.toHaveBeenCalled();
    });

    it('calls onAccept when accept button pressed with checkbox checked', async () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      // Check the checkbox
      fireEvent.press(screen.getByTestId('skins-disclaimer-checkbox'));

      // Press accept
      fireEvent.press(screen.getByTestId('skins-disclaimer-accept'));

      await waitFor(() => {
        expect(mockOnAccept).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('AsyncStorage Integration', () => {
    it('saves acceptance to AsyncStorage when accepted', async () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      // Check the checkbox
      fireEvent.press(screen.getByTestId('skins-disclaimer-checkbox'));

      // Press accept
      fireEvent.press(screen.getByTestId('skins-disclaimer-accept'));

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          '@skins_disclaimer_accepted',
          'true'
        );
      });
    });

    it('does not save to AsyncStorage when cancelled', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.press(screen.getByTestId('skins-disclaimer-cancel'));

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('checkbox has correct accessibility role', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      const checkbox = screen.getByTestId('skins-disclaimer-checkbox');
      expect(checkbox.props.accessibilityRole).toBe('checkbox');
    });

    it('checkbox has correct accessibility label', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      const checkbox = screen.getByTestId('skins-disclaimer-checkbox');
      expect(checkbox.props.accessibilityLabel).toBe(
        'I understand and accept these terms'
      );
    });

    it('cancel button has correct accessibility role', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByTestId('skins-disclaimer-cancel');
      expect(cancelButton.props.accessibilityRole).toBe('button');
    });

    it('accept button has correct accessibility label', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      const acceptButton = screen.getByTestId('skins-disclaimer-accept');
      expect(acceptButton.props.accessibilityLabel).toBe('I Understand, Continue');
    });

    it('accept button has correct accessibility hint when disabled', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      const acceptButton = screen.getByTestId('skins-disclaimer-accept');
      expect(acceptButton.props.accessibilityHint).toBe(
        'Check the box above to enable this button'
      );
    });

    it('accept button has correct accessibility hint when enabled', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      // Check the checkbox to enable the button
      fireEvent.press(screen.getByTestId('skins-disclaimer-checkbox'));

      const acceptButton = screen.getByTestId('skins-disclaimer-accept');
      expect(acceptButton.props.accessibilityHint).toBe(
        'Tap to continue with skins setup'
      );
    });

    it('modal container has alert role', () => {
      render(
        <SkinsDisclaimerModal
          visible={true}
          onAccept={mockOnAccept}
          onCancel={mockOnCancel}
        />
      );

      const alertContainer = screen.getByLabelText('Side Game Notice');
      expect(alertContainer.props.accessibilityRole).toBe('alert');
    });
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('hasAcceptedSkinsDisclaimer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when disclaimer has been accepted', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    const result = await hasAcceptedSkinsDisclaimer();

    expect(result).toBe(true);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@skins_disclaimer_accepted');
  });

  it('returns false when disclaimer has not been accepted', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const result = await hasAcceptedSkinsDisclaimer();

    expect(result).toBe(false);
  });

  it('returns false when AsyncStorage throws error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const result = await hasAcceptedSkinsDisclaimer();

    expect(result).toBe(false);
  });

  it('returns false for invalid stored value', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');

    const result = await hasAcceptedSkinsDisclaimer();

    expect(result).toBe(false);
  });
});

describe('clearSkinsDisclaimerAcceptance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes the disclaimer acceptance from AsyncStorage', async () => {
    await clearSkinsDisclaimerAcceptance();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@skins_disclaimer_accepted');
  });

  it('handles AsyncStorage errors gracefully', async () => {
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

    // Should not throw
    await expect(clearSkinsDisclaimerAcceptance()).resolves.not.toThrow();
  });
});
