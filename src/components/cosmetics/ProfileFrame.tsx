/**
 * ProfileFrame Component
 *
 * Display frame around avatar/image based on equipped cosmetic.
 * Supports multiple frame tiers: Bronze, Silver, Gold, Platinum, Diamond.
 * Premium frames use LinearGradient for gradient borders.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/context/ThemeContext';
import type { CosmeticDefinition, FrameStyle } from '@/types/database/cosmetic.types';

/**
 * Props for ProfileFrame component
 */
interface ProfileFrameProps {
  /** The equipped frame cosmetic. If null, renders default border */
  frame: CosmeticDefinition | null;
  /** Size of the frame container in pixels */
  size: number;
  /** The avatar/image to display inside the frame */
  children: React.ReactNode;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Frame styles mapping for rendering
 * Maps frame codes to visual styles
 */
const FRAME_STYLE_MAP: Record<string, FrameStyle> = {
  FRAME_BRONZE: {
    borderColor: '#CD7F32',
    borderWidth: 3,
    gradient: ['#CD7F32', '#B87333'],
  },
  FRAME_SILVER: {
    borderColor: '#C0C0C0',
    borderWidth: 3,
    gradient: ['#E8E8E8', '#A8A8A8'],
  },
  FRAME_GOLD: {
    borderColor: '#FFD700',
    borderWidth: 4,
    gradient: ['#FFD700', '#FFA500'],
    glow: true,
  },
  FRAME_PLATINUM: {
    borderColor: '#E5E4E2',
    borderWidth: 4,
    gradient: ['#E5E4E2', '#D4D4D4', '#C0C0C0'],
    shimmer: true,
  },
  FRAME_DIAMOND: {
    borderColor: '#B9F2FF',
    borderWidth: 5,
    gradient: ['#B9F2FF', '#E0FFFF', '#87CEEB', '#B9F2FF'],
    animated: true,
  },
};

/**
 * Get frame style from cosmetic definition
 */
function getFrameStyle(frame: CosmeticDefinition | null): FrameStyle | null {
  if (!frame) return null;
  return FRAME_STYLE_MAP[frame.code] || null;
}

/**
 * ProfileFrame - Display decorative frame around avatar/image
 *
 * @example
 * ```tsx
 * // With equipped frame
 * <ProfileFrame frame={equippedFrame} size={80}>
 *   <Avatar.Image source={{ uri: photoUrl }} size={72} />
 * </ProfileFrame>
 *
 * // Without frame (default border)
 * <ProfileFrame frame={null} size={80}>
 *   <Avatar.Image source={{ uri: photoUrl }} size={72} />
 * </ProfileFrame>
 * ```
 */
export const ProfileFrame = React.memo(function ProfileFrame({
  frame,
  size,
  children,
  testID,
}: ProfileFrameProps) {
  const colors = useThemeColors();
  const frameStyle = getFrameStyle(frame);

  // Calculate inner size based on border width
  const borderWidth = frameStyle?.borderWidth ?? 2;
  const innerSize = size - borderWidth * 2;

  // Memoize glow style for performance
  const glowStyle = useMemo(() => {
    if (!frameStyle?.glow) return null;

    return Platform.select({
      ios: {
        shadowColor: frameStyle.borderColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    });
  }, [frameStyle]);

  // Default frame (no cosmetic equipped)
  if (!frameStyle) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
        testID={testID}
        accessibilityLabel="Profile frame"
      >
        <View
          style={[
            styles.innerContainer,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  // Check if frame uses gradient (premium frames)
  const useGradient = frameStyle.gradient.length > 1;

  // Premium frame with gradient border
  if (useGradient) {
    return (
      <View
        style={[
          styles.gradientWrapper,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          glowStyle,
        ]}
        testID={testID}
        accessibilityLabel={`${frame?.name || 'Premium'} profile frame`}
      >
        <LinearGradient
          colors={frameStyle.gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientBorder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              padding: borderWidth,
            },
          ]}
        >
          <View
            style={[
              styles.innerContainer,
              styles.gradientInner,
              {
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
                backgroundColor: colors.surface,
              },
            ]}
          >
            {children}
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Simple colored frame (fallback)
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: frameStyle.borderWidth,
          borderColor: frameStyle.borderColor,
          backgroundColor: colors.surface,
        },
        glowStyle,
      ]}
      testID={testID}
      accessibilityLabel={`${frame?.name || 'Custom'} profile frame`}
    >
      <View
        style={[
          styles.innerContainer,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradientWrapper: {
    overflow: 'hidden',
  },
  gradientBorder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientInner: {
    overflow: 'hidden',
  },
  innerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});

export default ProfileFrame;
