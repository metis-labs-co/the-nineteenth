/**
 * PlayerCompareHeader - Side-by-side player avatar and info display
 *
 * Shows two players with their avatars, names, and handicaps
 * with a "VS" indicator in the middle.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// =====================================================
// TYPES
// =====================================================

export interface PlayerInfo {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  handicap: number | null;
}

export interface PlayerCompareHeaderProps {
  /** Player 1 data (typically the current user) */
  player1: PlayerInfo;
  /** Player 2 data (the opponent) */
  player2: PlayerInfo;
  /** Whether player 1 is the current user */
  isPlayer1You?: boolean;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface SinglePlayerProps {
  player: PlayerInfo;
  displayName: string;
}

const SinglePlayer = React.memo(function SinglePlayer({ player, displayName }: SinglePlayerProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.playerSection}>
      {player.photo_url ? (
        <Avatar.Image
          size={48}
          source={{ uri: player.photo_url }}
          style={{ backgroundColor: colors.primary }}
        />
      ) : (
        <Avatar.Icon
          size={48}
          icon="account"
          style={{ backgroundColor: colors.primary }}
        />
      )}
      <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
        {displayName}
      </Text>
      {player.handicap !== null && player.handicap !== undefined && (
        <Text style={[styles.playerHandicap, { color: colors.primary }]}>
          HC: {player.handicap}
        </Text>
      )}
    </View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const PlayerCompareHeader = React.memo(function PlayerCompareHeader({
  player1,
  player2,
  isPlayer1You = false,
}: PlayerCompareHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <SinglePlayer
        player={player1}
        displayName={isPlayer1You ? 'You' : player1.name}
      />
      <View style={styles.vsContainer}>
        <Text style={[styles.vsText, { color: colors.gray400 }]}>VS</Text>
      </View>
      <SinglePlayer
        player={player2}
        displayName={player2.name}
      />
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  playerSection: {
    flex: 1,
    alignItems: 'center',
  },
  playerName: {
    ...typography.bodyBold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  playerHandicap: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  vsContainer: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  vsText: {
    ...typography.smallBold,
  },
});

export default PlayerCompareHeader;
