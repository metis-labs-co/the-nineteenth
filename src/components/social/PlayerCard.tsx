// src/components/social/PlayerCard.tsx
import React from 'react';
import { StyleSheet, View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { StatusBadge } from '@/components/common/StatusBadge';

/**
 * Player data interface for the PlayerCard component
 */
export interface PlayerCardData {
  id: string;
  name: string;
  email?: string | null;
  handicap?: number | null;
  photo_url?: string | null;
}

/**
 * Badge configuration for displaying status badges
 */
export interface BadgeConfig {
  label: string;
  backgroundColor: string;
  textColor: string;
}

/**
 * Props for the PlayerCard component
 */
export interface PlayerCardProps {
  /**
   * Player data to display
   */
  player: PlayerCardData;
  /**
   * Callback when the card is pressed (optional - card won't be pressable if not provided)
   */
  onPress?: () => void;
  /**
   * Optional badge to display next to the name
   */
  badge?: BadgeConfig;
  /**
   * Optional right action component (e.g., remove button, chevron)
   */
  rightAction?: React.ReactNode;
  /**
   * Whether to show email (default: true)
   */
  showEmail?: boolean;
  /**
   * Whether to show handicap (default: true)
   */
  showHandicap?: boolean;
  /**
   * Custom handicap color (defaults to colors.primary)
   */
  handicapColor?: string;
  /**
   * Test ID for testing
   */
  testID?: string;
  /**
   * Custom container style variant
   */
  variant?: 'card' | 'list-item';
  /**
   * Custom container style (e.g., for margins between cards)
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Whether to navigate to player profile on press (default: true if onPress not provided)
   */
  navigateToProfile?: boolean;
}

/**
 * PlayerCard - Reusable component for displaying player information
 *
 * Shows player information including:
 * - Avatar (photo or default icon)
 * - Name with optional badge
 * - Email (optional)
 * - Handicap (optional)
 * - Right action area (optional)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PlayerCard
 *   player={{
 *     id: '1',
 *     name: 'John Smith',
 *     email: 'john@example.com',
 *     handicap: 12,
 *     photo_url: null,
 *   }}
 * />
 *
 * // With badge and action
 * <PlayerCard
 *   player={player}
 *   badge={{ label: 'You', backgroundColor: colors.primaryLighter, textColor: colors.primaryDark }}
 *   rightAction={<Icon source="chevron-right" size={20} color={colors.gray400} />}
 *   onPress={() => navigation.navigate('PlayerDetail', { id: player.id })}
 * />
 * ```
 */
export const PlayerCard = React.memo(function PlayerCard({
  player,
  onPress,
  badge,
  rightAction,
  showEmail = true,
  showHandicap = true,
  handicapColor,
  testID,
  variant = 'card',
  containerStyle,
  navigateToProfile = true,
}: PlayerCardProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Light mode: white background, Dark mode: gray100 to match other card components
  const cardBackground = isDark ? colors.gray100 : colors.white;
  const pressedBackground = isDark ? colors.gray200 : colors.gray50;

  const isListItem = variant === 'list-item';

  // Handle press - use custom onPress if provided, otherwise navigate to profile
  const handlePress = React.useCallback(() => {
    if (onPress) {
      onPress();
    } else if (navigateToProfile) {
      navigation.navigate('PlayerDetail', { id: player.id });
    }
  }, [onPress, navigateToProfile, navigation, player.id]);

  // Determine if card should be pressable
  const isPressable = !!onPress || navigateToProfile;

  const content = (
    <View style={styles.content}>
      {/* Avatar */}
      {player.photo_url ? (
        <Avatar.Image
          size={56}
          source={{ uri: player.photo_url }}
          style={{ backgroundColor: colors.primary }}
        />
      ) : (
        <Avatar.Icon
          size={56}
          icon="account"
          style={{ backgroundColor: isListItem ? colors.gray200 : colors.primary }}
        />
      )}

      {/* Player Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {player.name}
          </Text>
          {badge && (
            <StatusBadge
              status="custom"
              label={badge.label}
              backgroundColor={badge.backgroundColor}
              textColor={badge.textColor}
              size="sm"
            />
          )}
        </View>
        {showEmail && player.email && (
          <Text
            style={[styles.email, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {player.email}
          </Text>
        )}
        {showHandicap && player.handicap !== null && player.handicap !== undefined && (
          <Text style={[styles.handicap, { color: handicapColor || colors.textSecondary }]}>
            HC: {player.handicap}
          </Text>
        )}
      </View>

      {/* Right Action */}
      {rightAction && (
        <View style={styles.rightAction}>
          {rightAction}
        </View>
      )}
    </View>
  );

  // If not pressable, render without Pressable wrapper
  if (!isPressable) {
    return (
      <View
        style={[
          isListItem ? styles.listItemContainer : styles.cardContainer,
          {
            backgroundColor: isListItem ? 'transparent' : cardBackground,
            borderColor: colors.border,
          },
          containerStyle,
        ]}
        testID={testID}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        isListItem ? styles.listItemContainer : styles.cardContainer,
        {
          backgroundColor: isListItem ? 'transparent' : cardBackground,
          borderColor: colors.border,
        },
        pressed && { backgroundColor: pressedBackground },
        containerStyle,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`View ${player.name}'s profile`}
      accessibilityHint="Tap to view profile and stats"
      testID={testID}
    >
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.sm,
  },
  listItemContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.bodyBold,
    flex: 1,
  },
  email: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  handicap: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  rightAction: {
    marginLeft: spacing.sm,
  },
});

export default PlayerCard;
