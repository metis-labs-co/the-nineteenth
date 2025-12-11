// src/components/scoring/ScoringPairCard.tsx
import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Text, Avatar, Icon } from 'react-native-paper';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { Player } from '@/types';

/**
 * Props for the ScoringPairCard component
 */
export interface ScoringPairCardProps {
  /**
   * The player who is scoring/marking
   */
  scorerPlayer: Player;
  /**
   * The player being scored
   */
  scoredPlayer: Player;
  /**
   * Callback when remove button is pressed
   */
  onRemove?: () => void;
  /**
   * Whether to show the remove button
   */
  showRemove?: boolean;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * ScoringPairCard - Displays a scoring pair relationship
 *
 * Shows which player is responsible for scoring another player.
 * Layout: scorer avatar + name on left, arrow in middle, scored player on right.
 *
 * @example
 * ```tsx
 * <ScoringPairCard
 *   scorerPlayer={player1}
 *   scoredPlayer={player2}
 *   showRemove={true}
 *   onRemove={() => handleRemovePair(pairId)}
 * />
 * ```
 */
export const ScoringPairCard = React.memo(function ScoringPairCard({
  scorerPlayer,
  scoredPlayer,
  onRemove,
  showRemove = false,
  testID,
}: ScoringPairCardProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  const cardBackground = isDark ? colors.gray100 : colors.white;

  /**
   * Renders a player section with avatar, name, and handicap badge
   */
  const renderPlayerSection = (player: Player, role: 'scorer' | 'scored') => {
    const accessibilityLabel = role === 'scorer'
      ? `${player.name} is scoring`
      : `${player.name} is being scored`;

    return (
      <View
        style={styles.playerSection}
        accessibilityLabel={accessibilityLabel}
      >
        {/* Avatar */}
        {player.photoUrl ? (
          <Avatar.Image
            size={44}
            source={{ uri: player.photoUrl }}
            style={{ backgroundColor: colors.primary }}
          />
        ) : (
          <Avatar.Icon
            size={44}
            icon="account"
            style={{ backgroundColor: colors.primary }}
          />
        )}

        {/* Name and Handicap */}
        <View style={styles.playerInfo}>
          <Text
            style={[styles.playerName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {player.name}
          </Text>
          {player.handicap !== undefined && player.handicap !== null && (
            <View
              style={[
                styles.handicapBadge,
                { backgroundColor: colors.primaryBackground },
              ]}
            >
              <Text
                style={[styles.handicapText, { color: colors.primary }]}
              >
                HC: {player.handicap}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: cardBackground,
          borderColor: colors.border,
        },
      ]}
      testID={testID}
      accessibilityRole="none"
      accessibilityLabel={`${scorerPlayer.name} scores for ${scoredPlayer.name}`}
    >
      {/* Scorer Player (Left) */}
      {renderPlayerSection(scorerPlayer, 'scorer')}

      {/* Arrow Indicator */}
      <View
        style={styles.arrowContainer}
        accessibilityLabel="scores for"
      >
        <Icon
          source="arrow-right"
          size={24}
          color={colors.textSecondary}
        />
      </View>

      {/* Scored Player (Right) */}
      {renderPlayerSection(scoredPlayer, 'scored')}

      {/* Remove Button */}
      {showRemove && onRemove && (
        <Pressable
          style={({ pressed }) => [
            styles.removeButton,
            {
              backgroundColor: pressed ? colors.errorBackground : 'transparent',
            },
          ]}
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove scoring pair between ${scorerPlayer.name} and ${scoredPlayer.name}`}
          accessibilityHint="Tap to remove this scoring assignment"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon
            source="close"
            size={20}
            color={colors.error}
          />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.sm,
  },
  playerSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  playerName: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  handicapBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  handicapText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  arrowContainer: {
    paddingHorizontal: spacing.sm,
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});

export default ScoringPairCard;
