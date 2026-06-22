/**
 * PlayerAvatar Component Tests
 *
 * Tests for the unified avatar display component including:
 * - Rendering bundled avatars (avatar:avatar-blue format)
 * - Rendering remote URL images
 * - Rendering default fallback for null/undefined
 * - Size prop application
 * - Accessibility labels
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PlayerAvatar, PlayerAvatarProps } from './PlayerAvatar';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray400: '#9CA3AF',
  gray600: '#6B7280',
  gray900: '#111827',
  surface: '#FFFFFF',
  textPrimary: '#111827',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
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

// Mock AppImage so we can assert the (possibly transformed) uri it receives.
// The remote-URL branch renders AppImage instead of Paper's Avatar.Image.
jest.mock('./AppImage', () => {
  const { Text } = require('react-native');
  return {
    AppImage: ({
      uri,
      accessibilityLabel,
    }: {
      uri?: string;
      accessibilityLabel?: string;
    }) => (
      <Text testID="app-image" accessibilityLabel={accessibilityLabel}>
        {uri}
      </Text>
    ),
  };
});

// Mock avatar constants
jest.mock('@/constants/avatars', () => ({
  AVATAR_PREFIX: 'avatar:',
  SIMPLE_AVATAR_PREFIX: 'avatar-simple-',
  DEFAULT_AVATAR_ID: 'avatar-green',
  isAvatarId: (photoUrl: string | null | undefined) =>
    !!photoUrl && photoUrl.startsWith('avatar:'),
  getAvatarId: (photoUrl: string) => photoUrl.replace('avatar:', ''),
  getAvatarVariant: (avatarId: string) =>
    avatarId.startsWith('avatar-simple-') ? 'simple' : 'beer',
  getAvatarById: (avatarId: string) => {
    const avatars: Record<string, any> = {
      'avatar-green': {
        id: 'avatar-green',
        name: 'Green',
        colorPalette: {
          darkest: '#0a5d24',
          dark: '#2e8e36',
          mid: '#34953d',
          light: '#67a749',
          lightest: '#6eac4d',
        },
      },
      'avatar-blue': {
        id: 'avatar-blue',
        name: 'Blue',
        colorPalette: {
          darkest: '#0a3d5d',
          dark: '#2e6e8e',
          mid: '#3478a3',
          light: '#4998c7',
          lightest: '#4da0cf',
        },
      },
      'avatar-simple-blue': {
        id: 'avatar-simple-blue',
        name: 'Blue',
        colorPalette: {
          darkest: '#0a3d5d',
          dark: '#2e6e8e',
          mid: '#3478a3',
          light: '#4998c7',
          lightest: '#4da0cf',
        },
      },
    };
    return avatars[avatarId];
  },
  getDefaultAvatar: () => ({
    id: 'avatar-simple-green',
    name: 'Green',
    colorPalette: {
      darkest: '#0a5d24',
      dark: '#2e8e36',
      mid: '#34953d',
      light: '#67a749',
      lightest: '#6eac4d',
    },
  }),
}));

describe('PlayerAvatar', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PlayerAvatar photoUrl={null} />);
      expect(screen.getByTestId('simple-golfer-icon')).toBeTruthy();
    });

    it('renders with all props', () => {
      render(
        <PlayerAvatar
          photoUrl="avatar:avatar-blue"
          name="John Smith"
          size={100}
        />
      );
      expect(screen.getByTestId('golfer-icon')).toBeTruthy();
    });
  });

  // =========================================================================
  // BUNDLED AVATARS
  // =========================================================================

  describe('Bundled Avatars (avatar:avatar-id format)', () => {
    it('renders GolferIcon for "avatar:avatar-blue" URL', () => {
      render(<PlayerAvatar photoUrl="avatar:avatar-blue" />);

      expect(screen.getByTestId('golfer-icon')).toBeTruthy();
      expect(screen.queryByTestId('app-image')).toBeNull();
    });

    it('renders GolferIcon for "avatar:avatar-green" URL', () => {
      render(<PlayerAvatar photoUrl="avatar:avatar-green" />);

      expect(screen.getByTestId('golfer-icon')).toBeTruthy();
      expect(screen.queryByTestId('app-image')).toBeNull();
    });

    it('uses correct color palette for bundled avatar', () => {
      render(<PlayerAvatar photoUrl="avatar:avatar-blue" />);

      // The mock GolferIcon includes the mid colour in its accessibility label
      const golferIcon = screen.getByTestId('golfer-icon');
      expect(golferIcon.props.accessibilityLabel).toBe('golfer-icon-#3478a3');
    });

    it('does not render a render-image URL for a bundled avatar', () => {
      render(<PlayerAvatar photoUrl="avatar:avatar-blue" />);

      // No AppImage at all for bundled avatars (uses GolferIcon instead)
      expect(screen.queryByTestId('app-image')).toBeNull();
      expect(screen.queryByText(/render\/image\/public/)).toBeNull();
    });

    it('renders SimpleGolferIcon for a "simple" bundled avatar', () => {
      render(<PlayerAvatar photoUrl="avatar:avatar-simple-blue" />);

      expect(screen.getByTestId('simple-golfer-icon')).toBeTruthy();
      // The beer GolferIcon must NOT be used for simple avatars
      expect(screen.queryByTestId('golfer-icon')).toBeNull();
      expect(screen.queryByTestId('app-image')).toBeNull();
    });

    it('uses the matching palette for a simple bundled avatar', () => {
      render(<PlayerAvatar photoUrl="avatar:avatar-simple-blue" />);

      const simpleIcon = screen.getByTestId('simple-golfer-icon');
      expect(simpleIcon.props.accessibilityLabel).toBe('simple-golfer-icon-#3478a3');
    });
  });

  // =========================================================================
  // REMOTE URLS
  // =========================================================================

  describe('Remote URLs', () => {
    it('renders AppImage for remote URL "https://example.com/photo.jpg"', () => {
      render(<PlayerAvatar photoUrl="https://example.com/photo.jpg" />);

      expect(screen.getByTestId('app-image')).toBeTruthy();
      expect(screen.queryByTestId('golfer-icon')).toBeNull();
    });

    it('renders AppImage for any https URL', () => {
      render(
        <PlayerAvatar photoUrl="https://storage.googleapis.com/avatars/user123.png" />
      );

      expect(screen.getByTestId('app-image')).toBeTruthy();
      expect(screen.queryByTestId('golfer-icon')).toBeNull();
    });

    it('renders AppImage for http URL', () => {
      render(<PlayerAvatar photoUrl="http://example.com/photo.jpg" />);

      expect(screen.getByTestId('app-image')).toBeTruthy();
      expect(screen.queryByTestId('golfer-icon')).toBeNull();
    });

    it('renders a transformed render-image URL for a Supabase public avatar URL', () => {
      render(
        <PlayerAvatar photoUrl="https://proj.supabase.co/storage/v1/object/public/avatars/u1/a.jpg" />
      );

      // transformPublicUrl rewrites the public object path to a render/image path
      expect(
        screen.getByText(/render\/image\/public\/avatars\/u1\/a\.jpg/)
      ).toBeTruthy();
    });
  });

  // =========================================================================
  // NULL/UNDEFINED FALLBACK
  // =========================================================================

  describe('Null/Undefined Fallback', () => {
    it('renders default simple green icon for null photoUrl', () => {
      render(<PlayerAvatar photoUrl={null} />);

      // Default avatar is now the first simple avatar (simple green)
      expect(screen.getByTestId('simple-golfer-icon')).toBeTruthy();
      expect(screen.queryByTestId('golfer-icon')).toBeNull();
      expect(screen.queryByTestId('app-image')).toBeNull();

      // Check it uses default green palette (mid colour)
      const simpleIcon = screen.getByTestId('simple-golfer-icon');
      expect(simpleIcon.props.accessibilityLabel).toBe('simple-golfer-icon-#34953d');
    });

    it('renders default simple green icon for undefined photoUrl', () => {
      render(<PlayerAvatar photoUrl={undefined} />);

      expect(screen.getByTestId('simple-golfer-icon')).toBeTruthy();
      expect(screen.queryByTestId('golfer-icon')).toBeNull();
      expect(screen.queryByTestId('app-image')).toBeNull();

      const simpleIcon = screen.getByTestId('simple-golfer-icon');
      expect(simpleIcon.props.accessibilityLabel).toBe('simple-golfer-icon-#34953d');
    });

    it('renders default simple green icon for empty string photoUrl', () => {
      render(<PlayerAvatar photoUrl="" />);

      expect(screen.getByTestId('simple-golfer-icon')).toBeTruthy();
      expect(screen.queryByTestId('golfer-icon')).toBeNull();
      expect(screen.queryByTestId('app-image')).toBeNull();
    });
  });

  // =========================================================================
  // SIZE PROP
  // =========================================================================

  describe('Size Prop', () => {
    it('applies default size (64) to container when size not specified', () => {
      render(<PlayerAvatar photoUrl={null} />);

      // The container should have default size
      const container = screen.getByLabelText('Player avatar');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 64,
            height: 64,
            borderRadius: 32,
          }),
        ])
      );
    });

    it('applies size=100 to container', () => {
      render(<PlayerAvatar photoUrl={null} size={100} />);

      const container = screen.getByLabelText('Player avatar');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 100,
            height: 100,
            borderRadius: 50,
          }),
        ])
      );
    });

    it('applies size=40 to container', () => {
      render(<PlayerAvatar photoUrl={null} size={40} />);

      const container = screen.getByLabelText('Player avatar');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 40,
            height: 40,
            borderRadius: 20,
          }),
        ])
      );
    });

    it('applies size to GolferIcon', () => {
      render(<PlayerAvatar photoUrl="avatar:avatar-blue" size={80} />);

      const golferIcon = screen.getByTestId('golfer-icon');
      expect(golferIcon.props.style).toEqual(
        expect.objectContaining({
          width: 80,
          height: 80,
        })
      );
    });

    it('renders AppImage for a remote URL regardless of size', () => {
      render(<PlayerAvatar photoUrl="https://example.com/photo.jpg" size={50} />);

      // AppImage owns its own sizing internally (style passed by component);
      // here we simply confirm the remote branch renders AppImage.
      expect(screen.getByTestId('app-image')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has accessibility label "Player avatar" when name not provided', () => {
      render(<PlayerAvatar photoUrl={null} />);

      expect(screen.getByLabelText('Player avatar')).toBeTruthy();
    });

    it('has accessibility label including name when provided', () => {
      render(<PlayerAvatar photoUrl={null} name="John Smith" />);

      expect(screen.getByLabelText("John Smith's avatar")).toBeTruthy();
    });

    it('has accessibility label with name for bundled avatar', () => {
      render(<PlayerAvatar photoUrl="avatar:avatar-blue" name="Jane Doe" />);

      expect(screen.getByLabelText("Jane Doe's avatar")).toBeTruthy();
    });

    it('has accessibility label with name for remote URL', () => {
      render(
        <PlayerAvatar
          photoUrl="https://example.com/photo.jpg"
          name="Bob Wilson"
        />
      );

      // Both the container View and the AppImage carry the label, so use getAllByLabelText
      expect(screen.getAllByLabelText("Bob Wilson's avatar").length).toBeGreaterThan(
        0
      );
    });

    it('has accessibilityRole="image"', () => {
      render(<PlayerAvatar photoUrl={null} name="Test User" />);

      // Use getByLabelText and check the role on the found element
      const container = screen.getByLabelText("Test User's avatar");
      expect(container.props.accessibilityRole).toBe('image');
    });
  });

  // =========================================================================
  // CUSTOM STYLES
  // =========================================================================

  describe('Custom Styles', () => {
    it('applies custom style to container', () => {
      const customStyle = { marginTop: 20 };
      render(<PlayerAvatar photoUrl={null} style={customStyle} />);

      const container = screen.getByLabelText('Player avatar');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)])
      );
    });

    it('merges custom style with default styles', () => {
      const customStyle = { backgroundColor: 'red' };
      render(<PlayerAvatar photoUrl={null} size={80} style={customStyle} />);

      const container = screen.getByLabelText('Player avatar');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 80,
            height: 80,
            borderRadius: 40,
          }),
          expect.objectContaining(customStyle),
        ])
      );
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles avatar prefix with unknown avatar ID', () => {
      // Unknown avatar ID should still render GolferIcon with fallback
      render(<PlayerAvatar photoUrl="avatar:avatar-unknown" />);

      // Should still render a golfer icon (with default palette fallback)
      expect(screen.getByTestId('golfer-icon')).toBeTruthy();
    });

    it('handles whitespace-only photoUrl', () => {
      render(<PlayerAvatar photoUrl="   " />);

      // Whitespace is truthy but not a valid avatar prefix or URL
      // Should render as AppImage (truthy string that's not avatar:)
      expect(screen.getByTestId('app-image')).toBeTruthy();
    });

    it('handles very long name in accessibility label', () => {
      const longName = 'Alexander Bartholomew Christopher Davidson III';
      render(<PlayerAvatar photoUrl={null} name={longName} />);

      expect(screen.getByLabelText(`${longName}'s avatar`)).toBeTruthy();
    });

    it('handles special characters in name', () => {
      render(<PlayerAvatar photoUrl={null} name="O'Brien-Smith" />);

      expect(screen.getByLabelText("O'Brien-Smith's avatar")).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(PlayerAvatar).toBeDefined();
      expect(typeof PlayerAvatar).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props: PlayerAvatarProps = {
        photoUrl: 'avatar:avatar-blue',
        name: 'Test User',
        size: 64,
      };

      const { rerender } = render(<PlayerAvatar {...props} />);
      expect(screen.getByTestId('golfer-icon')).toBeTruthy();

      rerender(<PlayerAvatar {...props} />);
      expect(screen.getByTestId('golfer-icon')).toBeTruthy();
    });

    it('updates when props change', () => {
      const { rerender } = render(<PlayerAvatar photoUrl={null} name="First" />);
      expect(screen.getByLabelText("First's avatar")).toBeTruthy();

      rerender(<PlayerAvatar photoUrl={null} name="Second" />);
      expect(screen.getByLabelText("Second's avatar")).toBeTruthy();
      expect(screen.queryByLabelText("First's avatar")).toBeNull();
    });

    it('switches from GolferIcon to AppImage when photoUrl changes', () => {
      const { rerender } = render(<PlayerAvatar photoUrl="avatar:avatar-blue" />);
      expect(screen.getByTestId('golfer-icon')).toBeTruthy();

      rerender(<PlayerAvatar photoUrl="https://example.com/photo.jpg" />);
      expect(screen.getByTestId('app-image')).toBeTruthy();
      expect(screen.queryByTestId('golfer-icon')).toBeNull();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders player profile avatar with bundled avatar', () => {
      render(
        <PlayerAvatar
          photoUrl="avatar:avatar-green"
          name="Sam Kay"
          size={100}
        />
      );

      expect(screen.getByTestId('golfer-icon')).toBeTruthy();
      expect(screen.getByLabelText("Sam Kay's avatar")).toBeTruthy();
    });

    it('renders player list item avatar with remote photo', () => {
      render(
        <PlayerAvatar
          photoUrl="https://storage.supabase.co/avatars/player123.jpg"
          name="Jane Smith"
          size={48}
        />
      );

      expect(screen.getByTestId('app-image')).toBeTruthy();
      // Both the container View and the AppImage carry the label
      expect(
        screen.getAllByLabelText("Jane Smith's avatar").length
      ).toBeGreaterThan(0);
    });

    it('renders new player avatar with no photo (default simple)', () => {
      render(
        <PlayerAvatar
          photoUrl={null}
          name="New Player"
          size={64}
        />
      );

      expect(screen.getByTestId('simple-golfer-icon')).toBeTruthy();
      expect(screen.getByLabelText("New Player's avatar")).toBeTruthy();
    });

    it('renders team formation avatar', () => {
      render(
        <PlayerAvatar
          photoUrl="avatar:avatar-blue"
          name="Team Captain"
          size={40}
        />
      );

      const container = screen.getByLabelText("Team Captain's avatar");
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 40,
            height: 40,
            borderRadius: 20,
          }),
        ])
      );
    });
  });
});
