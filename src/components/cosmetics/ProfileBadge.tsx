/**
 * ProfileBadge Component
 *
 * Display equipped badge cosmetic next to player name.
 * Shows badge icon with colored background based on badge tier.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
// borderRadius is unused - badge uses dynamic borderRadius
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';
import { BADGE_STYLES } from '@/types/database/cosmetic.types';

/**
 * Props for ProfileBadge component
 */
interface ProfileBadgeProps {
  /** The equipped badge cosmetic. If null, renders nothing */
  badge: CosmeticDefinition | null;
  /** Size of the badge icon (default 16) */
  size?: number;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Get badge style from badge code
 */
function getBadgeStyle(badge: CosmeticDefinition | null) {
  if (!badge) return null;
  return BADGE_STYLES[badge.code] || null;
}

/**
 * ProfileBadge - Display equipped badge next to name
 *
 * @example
 * ```tsx
 * // With equipped badge
 * <View style={styles.nameRow}>
 *   <Text style={styles.name}>{player.name}</Text>
 *   <ProfileBadge badge={equippedBadge} />
 * </View>
 *
 * // Without badge (renders nothing)
 * <ProfileBadge badge={null} />
 * ```
 */
export const ProfileBadge = React.memo(function ProfileBadge({
  badge,
  size = 16,
  testID,
}: ProfileBadgeProps) {
  const colors = useThemeColors();

  // Don't render if no badge equipped
  if (!badge) return null;

  const badgeStyle = getBadgeStyle(badge);

  // Use badge-specific color or fall back to primary
  const badgeColor = badgeStyle?.color || colors.primary;
  const iconName = badgeStyle?.icon || badge.icon || 'shield-star';

  // Calculate container size (slightly larger than icon)
  const containerSize = size + 8;

  // Glow effect for premium badges
  const glowStyle =
    badge.points_required >= 1500
      ? Platform.select({
          ios: {
            shadowColor: badgeColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 4,
          },
          android: {
            elevation: 4,
          },
        })
      : null;

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: `${badgeColor}20`, // 20% opacity background
        },
        glowStyle,
      ]}
      testID={testID}
      accessibilityLabel={`${badge.name} badge`}
    >
      <Icon source={iconName} size={size} color={badgeColor} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileBadge;
