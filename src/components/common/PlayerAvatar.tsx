import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Avatar } from 'react-native-paper';
import { GolferIcon } from './GolferIcon';
import {
  isAvatarId,
  getAvatarId,
  getAvatarById,
  getDefaultAvatar,
} from '@/constants/avatars';

/**
 * Props for the PlayerAvatar component
 */
export interface PlayerAvatarProps {
  /** The photo URL - can be a remote URL, bundled avatar ID (avatar:avatar-blue), or null */
  photoUrl: string | null | undefined;
  /** Player name for accessibility label */
  name?: string;
  /** Size of the avatar in pixels (default: 64) */
  size?: number;
  /** Additional styles for the container */
  style?: StyleProp<ViewStyle>;
}

/**
 * PlayerAvatar - Unified avatar display component
 *
 * Handles three types of avatar sources:
 * 1. Bundled avatars (format: "avatar:avatar-blue") - renders GolferIcon with colour palette
 * 2. Remote URLs (format: "https://...") - renders Avatar.Image with remote source
 * 3. Null/undefined - renders default green GolferIcon
 *
 * @example
 * ```tsx
 * // Bundled avatar
 * <PlayerAvatar photoUrl="avatar:avatar-blue" name="John" size={64} />
 *
 * // Remote URL
 * <PlayerAvatar photoUrl="https://example.com/photo.jpg" size={100} />
 *
 * // Fallback to default
 * <PlayerAvatar photoUrl={null} name="Guest" />
 * ```
 */
function PlayerAvatarComponent({
  photoUrl,
  name,
  size = 64,
  style,
}: PlayerAvatarProps) {
  const accessibilityLabel = name ? `${name}'s avatar` : 'Player avatar';

  // Determine what to render based on photoUrl
  const renderAvatarContent = () => {
    // Case 1: Bundled avatar (avatar:avatar-blue format)
    if (isAvatarId(photoUrl)) {
      const avatarId = getAvatarId(photoUrl!);
      const avatarConfig = getAvatarById(avatarId);

      // Use the avatar's colour palette, or fall back to default if not found
      const colorPalette = avatarConfig?.colorPalette ?? getDefaultAvatar().colorPalette;

      return (
        <GolferIcon
          size={size}
          colorPalette={colorPalette}
          testID="avatar-icon"
        />
      );
    }

    // Case 2: Remote URL
    if (photoUrl) {
      return (
        <Avatar.Image
          size={size}
          source={{ uri: photoUrl }}
          style={styles.image}
          testID="avatar-image"
        />
      );
    }

    // Case 3: Null/undefined - render default green GolferIcon
    return (
      <GolferIcon
        size={size}
        colorPalette={getDefaultAvatar().colorPalette}
        testID="avatar-icon"
      />
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      pointerEvents="none"
    >
      {renderAvatarContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    // Avatar.Image handles its own sizing
  },
});

/**
 * Memoized PlayerAvatar component for performance
 */
export const PlayerAvatar = React.memo(PlayerAvatarComponent);

export default PlayerAvatar;
