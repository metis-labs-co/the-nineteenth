/**
 * PlayerCompareHeader - Side-by-side player avatar and info display
 *
 * Shows two players with their avatars, names, and handicaps
 * with a "VS" indicator in the middle.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PlayerAvatar } from '@/components/common';
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
  /** When provided, the player's avatar/name/handicap become pressable */
  onPress?: () => void;
}

const SinglePlayer = React.memo(function SinglePlayer({
  player,
  displayName,
  onPress,
}: SinglePlayerProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={styles.playerSection}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `View ${player.name}'s profile` : undefined}
    >
      <PlayerAvatar
        photoUrl={player.photo_url}
        name={player.name}
        size={48}
      />
      <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
        {displayName}
      </Text>
      {player.handicap !== null && player.handicap !== undefined && (
        <Text style={[styles.playerHandicap, { color: colors.primary }]}>
          HC: {player.handicap}
        </Text>
      )}
    </TouchableOpacity>
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
        onPress={() => navigation.navigate('PlayerDetail', { id: player2.id })}
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
