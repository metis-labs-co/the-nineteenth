/**
 * AvatarSelectionModal Component Tests
 *
 * Tests for the bottom sheet modal for selecting player avatars including:
 * - Rendering all 12 avatar options from AVATARS array
 * - Highlighting current selection with border
 * - Calling onSelect with correct avatarId when avatar tapped
 * - Calling onClose when modal dismissed
 * - Accessibility roles and labels on each avatar option
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AvatarSelectionModal } from './AvatarSelectionModal';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  white: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

// Mock GolferIcon
jest.mock('./GolferIcon', () => {
  const { View } = require('react-native');
  return {
    GolferIcon: ({ size, colorPalette }: any) => (
      <View
        testID="golfer-icon"
        accessibilityLabel={`golfer-icon-${colorPalette?.mid || 'unknown'}`}
        style={{ width: size, height: size }}
      />
    ),
  };
});

// Mock SimpleGolferIcon
jest.mock('./SimpleGolferIcon', () => {
  const { View } = require('react-native');
  return {
    SimpleGolferIcon: ({ size, colorPalette }: any) => (
      <View
        testID="simple-golfer-icon"
        accessibilityLabel={`simple-golfer-icon-${colorPalette?.mid || 'unknown'}`}
        style={{ width: size, height: size }}
      />
    ),
  };
});

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, style, numberOfLines }: any) => (
      <Text style={style} numberOfLines={numberOfLines}>
        {children}
      </Text>
    ),
    Icon: ({ source, size, _color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }} />
    ),
  };
});

// Mock BottomSheet component
jest.mock('./BottomSheet', () => {
  const { View, TouchableOpacity } = require('react-native');
  const RNText = require('react-native').Text;
  return {
    BottomSheet: ({ visible, onClose, title, children }: any) =>
      visible ? (
        <View testID="modal-container">
          <TouchableOpacity
            testID="modal-backdrop"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close modal"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View testID="bottom-sheet-header">
            <RNText>{title}</RNText>
            <TouchableOpacity
              testID="close-button"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close avatar selection"
            >
              <RNText>Close</RNText>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      ) : null,
  };
});

// Import the actual AVATARS array for testing
const AVATARS = [
  { id: 'avatar-green', name: 'Green', colorPalette: { darkest: '#0a5d24', dark: '#2e8e36', mid: '#34953d', light: '#67a749', lightest: '#6eac4d' } },
  { id: 'avatar-blue', name: 'Blue', colorPalette: { darkest: '#0a3d5d', dark: '#2e6e8e', mid: '#3478a3', light: '#4998c7', lightest: '#4da0cf' } },
  { id: 'avatar-navy', name: 'Navy', colorPalette: { darkest: '#0a2445', dark: '#2e4a6e', mid: '#34567d', light: '#4978a1', lightest: '#4d82ab' } },
  { id: 'avatar-teal', name: 'Teal', colorPalette: { darkest: '#0a5d5d', dark: '#2e8e8e', mid: '#349d9d', light: '#49c7c7', lightest: '#4dcfcf' } },
  { id: 'avatar-purple', name: 'Purple', colorPalette: { darkest: '#3d0a5d', dark: '#6e2e8e', mid: '#7d349d', light: '#a149c7', lightest: '#ab4dcf' } },
  { id: 'avatar-violet', name: 'Violet', colorPalette: { darkest: '#4a0a5d', dark: '#7a2e8e', mid: '#8a349d', light: '#b249c7', lightest: '#bc4dcf' } },
  { id: 'avatar-red', name: 'Red', colorPalette: { darkest: '#5d0a0a', dark: '#8e2e2e', mid: '#9d3434', light: '#c74949', lightest: '#cf4d4d' } },
  { id: 'avatar-orange', name: 'Orange', colorPalette: { darkest: '#5d3d0a', dark: '#8e6e2e', mid: '#9d7d34', light: '#c7a149', lightest: '#cfab4d' } },
  { id: 'avatar-gold', name: 'Gold', colorPalette: { darkest: '#5d4a0a', dark: '#8e7a2e', mid: '#9d8a34', light: '#c7b249', lightest: '#cfbc4d' } },
  { id: 'avatar-pink', name: 'Pink', colorPalette: { darkest: '#5d0a3d', dark: '#8e2e6e', mid: '#9d347d', light: '#c749a1', lightest: '#cf4dab' } },
  { id: 'avatar-slate', name: 'Slate', colorPalette: { darkest: '#2a3d4a', dark: '#4a6070', mid: '#587080', light: '#7090a0', lightest: '#80a0b0' } },
  { id: 'avatar-charcoal', name: 'Charcoal', colorPalette: { darkest: '#1a1a1a', dark: '#3a3a3a', mid: '#4a4a4a', light: '#6a6a6a', lightest: '#7a7a7a' } },
];

jest.mock('@/constants/avatars', () => ({
  AVATARS,
  // Simple-style variants share the palettes; IDs gain the "avatar-simple-" prefix
  SIMPLE_AVATARS: AVATARS.map((a) => ({
    ...a,
    id: a.id.replace('avatar-', 'avatar-simple-'),
  })),
  AVATAR_PREFIX: 'avatar:',
  SIMPLE_AVATAR_PREFIX: 'avatar-simple-',
  isAvatarId: (photoUrl: string | null | undefined) =>
    !!photoUrl && photoUrl.startsWith('avatar:'),
  getAvatarId: (photoUrl: string) => photoUrl.replace('avatar:', ''),
  getAvatarVariant: (avatarId: string) =>
    avatarId.startsWith('avatar-simple-') ? 'simple' : 'beer',
}));

describe('AvatarSelectionModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
    currentAvatarUrl: null as string | null | undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING
  // ===========================================================================

  describe('Rendering', () => {
    it('renders when visible is true', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      expect(screen.getByTestId('modal-container')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      render(<AvatarSelectionModal {...defaultProps} visible={false} />);

      expect(screen.queryByTestId('modal-container')).toBeNull();
    });

    it('renders header with "Choose Avatar" title', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      expect(screen.getByText('Choose Avatar')).toBeTruthy();
    });

    it('renders close button in header', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      expect(screen.getByLabelText('Close avatar selection')).toBeTruthy();
    });
  });

  // ===========================================================================
  // AVATAR OPTIONS
  // ===========================================================================

  describe('Avatar Options', () => {
    it('renders all 12 avatar options from AVATARS array', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      // Check all 12 avatar names are rendered
      expect(screen.getByText('Green')).toBeTruthy();
      expect(screen.getByText('Blue')).toBeTruthy();
      expect(screen.getByText('Navy')).toBeTruthy();
      expect(screen.getByText('Teal')).toBeTruthy();
      expect(screen.getByText('Purple')).toBeTruthy();
      expect(screen.getByText('Violet')).toBeTruthy();
      expect(screen.getByText('Red')).toBeTruthy();
      expect(screen.getByText('Orange')).toBeTruthy();
      expect(screen.getByText('Gold')).toBeTruthy();
      expect(screen.getByText('Pink')).toBeTruthy();
      expect(screen.getByText('Slate')).toBeTruthy();
      expect(screen.getByText('Charcoal')).toBeTruthy();
    });

    it('renders 12 GolferIcon components', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      const golferIcons = screen.getAllByTestId('golfer-icon');
      expect(golferIcons).toHaveLength(12);
    });

    it('renders each avatar with correct accessibility label', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      expect(screen.getByLabelText('Green golfer avatar')).toBeTruthy();
      expect(screen.getByLabelText('Blue golfer avatar')).toBeTruthy();
      expect(screen.getByLabelText('Navy golfer avatar')).toBeTruthy();
      expect(screen.getByLabelText('Teal golfer avatar')).toBeTruthy();
      expect(screen.getByLabelText('Purple golfer avatar')).toBeTruthy();
      expect(screen.getByLabelText('Violet golfer avatar')).toBeTruthy();
      expect(screen.getByLabelText('Red golfer avatar')).toBeTruthy();
      expect(screen.getByLabelText('Orange golfer avatar')).toBeTruthy();
      expect(screen.getByLabelText('Gold golfer avatar')).toBeTruthy();
      expect(screen.getByLabelText('Pink golfer avatar')).toBeTruthy();
      expect(screen.getByLabelText('Slate golfer avatar')).toBeTruthy();
      expect(screen.getByLabelText('Charcoal golfer avatar')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CURRENT SELECTION HIGHLIGHTING
  // ===========================================================================

  describe('Current Selection Highlighting', () => {
    it('highlights current selection when currentAvatarUrl matches avatar:avatar-blue', () => {
      render(
        <AvatarSelectionModal
          {...defaultProps}
          currentAvatarUrl="avatar:avatar-blue"
        />
      );

      // The Blue avatar button should have selected state
      const blueAvatarButton = screen.getByLabelText('Blue golfer avatar');
      expect(blueAvatarButton.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true })
      );
    });

    it('highlights current selection when currentAvatarUrl matches avatar:avatar-green', () => {
      render(
        <AvatarSelectionModal
          {...defaultProps}
          currentAvatarUrl="avatar:avatar-green"
        />
      );

      const greenAvatarButton = screen.getByLabelText('Green golfer avatar');
      expect(greenAvatarButton.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true })
      );
    });

    it('does not highlight any avatar when currentAvatarUrl is null', () => {
      render(<AvatarSelectionModal {...defaultProps} currentAvatarUrl={null} />);

      // No avatar should be selected
      const greenAvatarButton = screen.getByLabelText('Green golfer avatar');
      expect(greenAvatarButton.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false })
      );

      const blueAvatarButton = screen.getByLabelText('Blue golfer avatar');
      expect(blueAvatarButton.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false })
      );
    });

    it('does not highlight any avatar when currentAvatarUrl is a remote URL', () => {
      render(
        <AvatarSelectionModal
          {...defaultProps}
          currentAvatarUrl="https://example.com/photo.jpg"
        />
      );

      // No bundled avatar should be selected for remote URL
      const greenAvatarButton = screen.getByLabelText('Green golfer avatar');
      expect(greenAvatarButton.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false })
      );
    });

    it('sets correct accessibilityHint for selected avatar', () => {
      render(
        <AvatarSelectionModal
          {...defaultProps}
          currentAvatarUrl="avatar:avatar-purple"
        />
      );

      const purpleAvatarButton = screen.getByLabelText('Purple golfer avatar');
      expect(purpleAvatarButton.props.accessibilityHint).toBe('Currently selected');
    });

    it('sets correct accessibilityHint for unselected avatars', () => {
      render(
        <AvatarSelectionModal
          {...defaultProps}
          currentAvatarUrl="avatar:avatar-purple"
        />
      );

      const greenAvatarButton = screen.getByLabelText('Green golfer avatar');
      expect(greenAvatarButton.props.accessibilityHint).toBe('Double tap to select');
    });
  });

  // ===========================================================================
  // AVATAR SELECTION
  // ===========================================================================

  describe('Avatar Selection', () => {
    it('calls onSelect with correct avatarId when avatar tapped', () => {
      const onSelect = jest.fn();
      render(<AvatarSelectionModal {...defaultProps} onSelect={onSelect} />);

      const blueAvatarButton = screen.getByLabelText('Blue golfer avatar');
      fireEvent.press(blueAvatarButton);

      expect(onSelect).toHaveBeenCalledWith('avatar-blue');
    });

    it('calls onSelect with avatar-green when Green avatar tapped', () => {
      const onSelect = jest.fn();
      render(<AvatarSelectionModal {...defaultProps} onSelect={onSelect} />);

      const greenAvatarButton = screen.getByLabelText('Green golfer avatar');
      fireEvent.press(greenAvatarButton);

      expect(onSelect).toHaveBeenCalledWith('avatar-green');
    });

    it('calls onSelect with avatar-charcoal when Charcoal avatar tapped', () => {
      const onSelect = jest.fn();
      render(<AvatarSelectionModal {...defaultProps} onSelect={onSelect} />);

      const charcoalAvatarButton = screen.getByLabelText('Charcoal golfer avatar');
      fireEvent.press(charcoalAvatarButton);

      expect(onSelect).toHaveBeenCalledWith('avatar-charcoal');
    });

    it('calls onClose after selecting an avatar', () => {
      const onClose = jest.fn();
      render(<AvatarSelectionModal {...defaultProps} onClose={onClose} />);

      const redAvatarButton = screen.getByLabelText('Red golfer avatar');
      fireEvent.press(redAvatarButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls both onSelect and onClose when avatar is tapped', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();
      render(
        <AvatarSelectionModal
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
        />
      );

      const tealAvatarButton = screen.getByLabelText('Teal golfer avatar');
      fireEvent.press(tealAvatarButton);

      expect(onSelect).toHaveBeenCalledWith('avatar-teal');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // MODAL DISMISSAL
  // ===========================================================================

  describe('Modal Dismissal', () => {
    it('calls onClose when close button is pressed', () => {
      const onClose = jest.fn();
      render(<AvatarSelectionModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close avatar selection');
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when modal is dismissed (backdrop press)', () => {
      const onClose = jest.fn();
      render(<AvatarSelectionModal {...defaultProps} onClose={onClose} />);

      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.press(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onSelect when close button is pressed', () => {
      const onSelect = jest.fn();
      render(<AvatarSelectionModal {...defaultProps} onSelect={onSelect} />);

      const closeButton = screen.getByLabelText('Close avatar selection');
      fireEvent.press(closeButton);

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe('Accessibility', () => {
    it('each avatar option has accessibilityRole="button"', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      const greenAvatarButton = screen.getByLabelText('Green golfer avatar');
      expect(greenAvatarButton.props.accessibilityRole).toBe('button');

      const blueAvatarButton = screen.getByLabelText('Blue golfer avatar');
      expect(blueAvatarButton.props.accessibilityRole).toBe('button');
    });

    it('close button has accessibilityRole="button"', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close avatar selection');
      expect(closeButton.props.accessibilityRole).toBe('button');
    });

    it('all 12 avatars have accessible labels', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      const avatarNames = [
        'Green',
        'Blue',
        'Navy',
        'Teal',
        'Purple',
        'Violet',
        'Red',
        'Orange',
        'Gold',
        'Pink',
        'Slate',
        'Charcoal',
      ];

      avatarNames.forEach((name) => {
        const avatarButton = screen.getByLabelText(`${name} golfer avatar`);
        expect(avatarButton).toBeTruthy();
        expect(avatarButton.props.accessibilityRole).toBe('button');
      });
    });

    it('selected avatar has accessibilityState.selected = true', () => {
      render(
        <AvatarSelectionModal
          {...defaultProps}
          currentAvatarUrl="avatar:avatar-gold"
        />
      );

      const goldAvatarButton = screen.getByLabelText('Gold golfer avatar');
      expect(goldAvatarButton.props.accessibilityState.selected).toBe(true);
    });

    it('unselected avatars have accessibilityState.selected = false', () => {
      render(
        <AvatarSelectionModal
          {...defaultProps}
          currentAvatarUrl="avatar:avatar-gold"
        />
      );

      const greenAvatarButton = screen.getByLabelText('Green golfer avatar');
      expect(greenAvatarButton.props.accessibilityState.selected).toBe(false);

      const blueAvatarButton = screen.getByLabelText('Blue golfer avatar');
      expect(blueAvatarButton.props.accessibilityState.selected).toBe(false);
    });
  });

  // ===========================================================================
  // SUB-CATEGORY TABS (BEER / SIMPLE)
  // ===========================================================================

  describe('Sub-category Tabs', () => {
    it('renders Beer and Simple tabs', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      expect(screen.getByLabelText('Beer avatars')).toBeTruthy();
      expect(screen.getByLabelText('Simple avatars')).toBeTruthy();
    });

    it('defaults to the Beer tab (golfer icons, no simple icons)', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      expect(screen.getAllByTestId('golfer-icon')).toHaveLength(12);
      expect(screen.queryAllByTestId('simple-golfer-icon')).toHaveLength(0);
    });

    it('shows simple avatars after tapping the Simple tab', () => {
      render(<AvatarSelectionModal {...defaultProps} />);

      fireEvent.press(screen.getByLabelText('Simple avatars'));

      expect(screen.getAllByTestId('simple-golfer-icon')).toHaveLength(12);
      expect(screen.queryAllByTestId('golfer-icon')).toHaveLength(0);
      expect(screen.getByLabelText('Green simple avatar')).toBeTruthy();
    });

    it('selects a simple avatar with the avatar-simple- id', () => {
      const onSelect = jest.fn();
      render(<AvatarSelectionModal {...defaultProps} onSelect={onSelect} />);

      fireEvent.press(screen.getByLabelText('Simple avatars'));
      fireEvent.press(screen.getByLabelText('Blue simple avatar'));

      expect(onSelect).toHaveBeenCalledWith('avatar-simple-blue');
    });

    it('opens on the Simple tab when the current avatar is a simple variant', () => {
      render(
        <AvatarSelectionModal
          {...defaultProps}
          currentAvatarUrl="avatar:avatar-simple-red"
        />
      );

      // Simple grid should be active without any tab interaction
      expect(screen.getAllByTestId('simple-golfer-icon')).toHaveLength(12);
      const redSimple = screen.getByLabelText('Red simple avatar');
      expect(redSimple.props.accessibilityState.selected).toBe(true);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles undefined currentAvatarUrl', () => {
      render(
        <AvatarSelectionModal {...defaultProps} currentAvatarUrl={undefined} />
      );

      // Should render without errors and no avatar selected
      expect(screen.getByTestId('modal-container')).toBeTruthy();
      const greenAvatarButton = screen.getByLabelText('Green golfer avatar');
      expect(greenAvatarButton.props.accessibilityState.selected).toBe(false);
    });

    it('handles empty string currentAvatarUrl', () => {
      render(<AvatarSelectionModal {...defaultProps} currentAvatarUrl="" />);

      // Should render without errors and no avatar selected
      expect(screen.getByTestId('modal-container')).toBeTruthy();
    });

    it('handles unknown avatar ID in currentAvatarUrl', () => {
      render(
        <AvatarSelectionModal
          {...defaultProps}
          currentAvatarUrl="avatar:avatar-unknown"
        />
      );

      // Should render without errors but no avatar selected (ID doesn't match any)
      expect(screen.getByTestId('modal-container')).toBeTruthy();
    });

    it('can select different avatars in sequence', () => {
      const onSelect = jest.fn();
      const { rerender } = render(
        <AvatarSelectionModal {...defaultProps} onSelect={onSelect} />
      );

      // Select first avatar
      fireEvent.press(screen.getByLabelText('Blue golfer avatar'));
      expect(onSelect).toHaveBeenCalledWith('avatar-blue');

      // Rerender with new selection and select another
      rerender(
        <AvatarSelectionModal
          {...defaultProps}
          onSelect={onSelect}
          currentAvatarUrl="avatar:avatar-blue"
        />
      );

      fireEvent.press(screen.getByLabelText('Pink golfer avatar'));
      expect(onSelect).toHaveBeenCalledWith('avatar-pink');
    });
  });

  // ===========================================================================
  // MEMOIZATION
  // ===========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(AvatarSelectionModal).toBeDefined();
      expect(typeof AvatarSelectionModal).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props = {
        visible: true,
        onClose: jest.fn(),
        onSelect: jest.fn(),
        currentAvatarUrl: 'avatar:avatar-blue',
      };

      const { rerender } = render(<AvatarSelectionModal {...props} />);
      expect(screen.getByText('Choose Avatar')).toBeTruthy();

      rerender(<AvatarSelectionModal {...props} />);
      expect(screen.getByText('Choose Avatar')).toBeTruthy();
    });

    it('updates selection highlighting when currentAvatarUrl changes', () => {
      const { rerender } = render(
        <AvatarSelectionModal
          {...defaultProps}
          currentAvatarUrl="avatar:avatar-green"
        />
      );

      let greenButton = screen.getByLabelText('Green golfer avatar');
      expect(greenButton.props.accessibilityState.selected).toBe(true);

      rerender(
        <AvatarSelectionModal
          {...defaultProps}
          currentAvatarUrl="avatar:avatar-blue"
        />
      );

      greenButton = screen.getByLabelText('Green golfer avatar');
      expect(greenButton.props.accessibilityState.selected).toBe(false);

      const blueButton = screen.getByLabelText('Blue golfer avatar');
      expect(blueButton.props.accessibilityState.selected).toBe(true);
    });
  });
});
