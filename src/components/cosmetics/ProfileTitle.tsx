/**
 * ProfileTitle Component
 *
 * Display equipped title cosmetic below player name.
 * Shows title text with styled appearance based on title tier.
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { typography, spacing } from '@/constants/theme';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';
import { TITLE_STYLES } from '@/types/database/cosmetic.types';

/**
 * Props for ProfileTitle component
 */
interface ProfileTitleProps {
  /** The equipped title cosmetic. If null, renders nothing */
  title: CosmeticDefinition | null;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Get title style from title code
 */
function getTitleStyle(title: CosmeticDefinition | null) {
  if (!title) return null;
  return TITLE_STYLES[title.code] || null;
}

/**
 * ProfileTitle - Display equipped title below name
 *
 * @example
 * ```tsx
 * // With equipped title
 * <View style={styles.userInfo}>
 *   <Text style={styles.name}>{player.name}</Text>
 *   <ProfileTitle title={equippedTitle} />
 * </View>
 *
 * // Without title (renders nothing)
 * <ProfileTitle title={null} />
 * ```
 */
export const ProfileTitle = React.memo(function ProfileTitle({
  title,
  testID,
}: ProfileTitleProps) {
  const colors = useThemeColors();

  // Don't render if no title equipped
  if (!title) return null;

  const titleStyle = getTitleStyle(title);

  // Use title-specific color or fall back to primary
  const titleColor = titleStyle?.color || colors.primary;
  // Use display text from style or fall back to name
  const displayText = titleStyle?.displayText || title.name;

  return (
    <Text
      style={[styles.title, { color: titleColor }]}
      testID={testID}
      accessibilityLabel={`Title: ${displayText}`}
    >
      {displayText}
    </Text>
  );
});

const styles = StyleSheet.create({
  title: {
    ...typography.caption,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});

export default ProfileTitle;
