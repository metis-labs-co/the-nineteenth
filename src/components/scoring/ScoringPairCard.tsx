// src/components/scoring/ScoringPairCard.tsx
import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { PlayerAvatar } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
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
   * Team the scorer belongs to — shown as a small italic label under
   * the scorer's name when present. Optional for non-team rounds.
   */
  scorerTeamName?: string;
  /**
   * Team the scored player belongs to — small italic label under name.
   */
  scoredTeamName?: string;
  /**
   * Tint colour for the scorer's team — tints the team label beneath
   * the scorer's name so team membership reads at a glance. Optional;
   * omit on non-team rounds to keep the default neutral styling.
   */
  scorerTeamColor?: string;
  /**
   * Tint colour for the scored player's team — same behaviour.
   */
  scoredTeamColor?: string;
  /**
   * When true, the card renders a bidirectional arrow (A ↔ B) to
   * convey that the two players mark each other — one card stands for
   * both directions. When false, the default one-way arrow is used.
   */
  reciprocal?: boolean;
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
  scorerTeamName,
  scoredTeamName,
  scorerTeamColor,
  scoredTeamColor,
  reciprocal = false,
  onRemove,
  showRemove = false,
  testID,
}: ScoringPairCardProps) {
  const colors = useThemeColors();

  /**
   * Renders a player section with avatar, name, optional team label,
   * and handicap badge.
   */
  const renderPlayerSection = (
    player: Player,
    role: 'scorer' | 'scored',
    teamName?: string,
    teamColor?: string
  ) => {
    const accessibilityLabel = role === 'scorer'
      ? `${player.name} is scoring${teamName ? `, ${teamName}` : ''}`
      : `${player.name} is being scored${teamName ? `, ${teamName}` : ''}`;

    return (
      <View
        style={styles.playerSection}
        accessibilityLabel={accessibilityLabel}
      >
        {/* Avatar */}
        <PlayerAvatar
          photoUrl={player.photoUrl}
          name={player.name}
          size={44}
        />

        {/* Name, optional team, and Handicap */}
        <View style={styles.playerInfo}>
          <Text
            style={[styles.playerName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {player.name}
          </Text>
          {teamName && (
            <View style={styles.teamRow}>
              {teamColor && (
                <View
                  style={[styles.teamDot, { backgroundColor: teamColor }]}
                />
              )}
              <Text
                style={[
                  styles.teamName,
                  teamColor
                    ? { color: teamColor, opacity: 1 }
                    : { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {teamName}
              </Text>
            </View>
          )}
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
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      testID={testID}
      accessibilityRole="none"
      accessibilityLabel={`${scorerPlayer.name} scores for ${scoredPlayer.name}`}
    >
      {/* Scorer Player (Left) */}
      {renderPlayerSection(scorerPlayer, 'scorer', scorerTeamName, scorerTeamColor)}

      {/* Arrow Indicator — bidirectional when players score each other,
          one-way for directional (circular chain) pairs. */}
      <View
        style={styles.arrowContainer}
        accessibilityLabel={reciprocal ? 'score each other' : 'scores for'}
      >
        <Icon
          source={reciprocal ? 'arrow-left-right' : 'arrow-right'}
          size={24}
          color={colors.textSecondary}
        />
      </View>

      {/* Scored Player (Right) */}
      {renderPlayerSection(scoredPlayer, 'scored', scoredTeamName, scoredTeamColor)}

      {/* Remove Button */}
      {showRemove && onRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          activeOpacity={0.7}
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
        </TouchableOpacity>
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
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  teamDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },
  teamName: {
    ...typography.caption,
    fontSize: 11,
    fontStyle: 'italic',
    opacity: 0.7,
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
