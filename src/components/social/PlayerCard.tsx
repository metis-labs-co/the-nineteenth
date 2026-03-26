// src/components/social/PlayerCard.tsx
import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { PlayerAvatar, CardContainer } from '@/components/common';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { StatusBadge } from '@/components/common/StatusBadge';

/**
 * Player data interface for the PlayerCard component
 */
export interface PlayerCardData {
  id: string;
  name: string;
  email?: string | null;
  handicap?: number | null; // WHS Handicap Index (profile)
  handicap_index?: number | null; // Social Handicap Index (calculated from app rounds)
  photo_url?: string | null;
}

/**
 * Badge configuration for displaying status badges
 */
export interface BadgeConfig {
  label: string;
  backgroundColor: string;
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
 *   badge={{ label: 'You', backgroundColor: colors.primaryLighter }}
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
      <PlayerAvatar
        photoUrl={player.photo_url}
        name={player.name}
        size={56}
      />

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
        {showHandicap && (player.handicap != null || player.handicap_index != null) && (
          <View style={styles.handicapRow}>
            <Text style={[styles.handicap, { color: handicapColor || colors.textSecondary }]}>
              HC: {player.handicap != null ? player.handicap : '-'}
            </Text>
            <Text style={[styles.handicapSeparator, { color: colors.textTertiary }]}>|</Text>
            <Text style={[styles.handicap, { color: colors.primary }]}>
              Social: {player.handicap_index != null ? player.handicap_index.toFixed(1) : '-'}
            </Text>
          </View>
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

  // For list-item variant, use simpler styling without card container
  if (isListItem) {
    return (
      <CardContainer
        onPress={isPressable ? handlePress : undefined}
        padding="md"
        noBorder
        elevated={false}
        style={[
          styles.listItemStyle,
          { backgroundColor: 'transparent' },
          containerStyle,
        ]}
        accessibilityLabel={`View ${player.name}'s profile`}
        accessibilityHint="Tap to view profile and stats"
        testID={testID}
      >
        {content}
      </CardContainer>
    );
  }

  // Card variant with full styling
  return (
    <CardContainer
      onPress={isPressable ? handlePress : undefined}
      accessibilityLabel={`View ${player.name}'s profile`}
      accessibilityHint="Tap to view profile and stats"
      testID={testID}
      style={containerStyle}
    >
      {content}
    </CardContainer>
  );
});

const styles = StyleSheet.create({
  listItemStyle: {
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
  handicapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  handicap: {
    ...typography.small,
  },
  handicapSeparator: {
    ...typography.small,
  },
  rightAction: {
    marginLeft: spacing.sm,
  },
});

export default PlayerCard;
