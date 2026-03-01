/**
 * LadderRow - Ladder position row with challenge button
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { LadderStandingsEntry } from '@/types/database';

interface LadderRowProps {
  entry: LadderStandingsEntry;
  isCurrentUser: boolean;
  canChallenge: boolean;
  hasActiveChallenge: boolean;
  onChallenge: () => void;
  onPress?: () => void;
}

export default React.memo(function LadderRow({
  entry,
  isCurrentUser,
  canChallenge,
  hasActiveChallenge,
  onChallenge,
  onPress,
}: LadderRowProps) {
  const colors = useThemeColors();

  const positionIcon = entry.ladder_position === 1 ? 'crown' : undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.row,
        {
          backgroundColor: isCurrentUser ? colors.primaryBackground : colors.surface,
          borderColor: isCurrentUser ? colors.primary : colors.border,
        },
      ]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Position */}
      <View style={[styles.positionContainer, { backgroundColor: entry.ladder_position <= 3 ? colors.primary : colors.gray100 }]}>
        {positionIcon ? (
          <Icon source={positionIcon} size={18} color={colors.white} />
        ) : (
          <Text style={[styles.positionText, { color: entry.ladder_position <= 3 ? colors.white : colors.textPrimary }]}>
            {entry.ladder_position}
          </Text>
        )}
      </View>

      {/* Player Info */}
      <View style={styles.playerInfo}>
        <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
          {entry.name}
          {isCurrentUser && (
            <Text style={[styles.youLabel, { color: colors.primary }]}> (You)</Text>
          )}
        </Text>
        <Text style={[styles.record, { color: colors.textSecondary }]}>
          {entry.wins}W - {entry.losses}L
          {entry.active_challenge_id && (
            <Text style={{ color: colors.warning }}> (In Challenge)</Text>
          )}
        </Text>
      </View>

      {/* Challenge Button */}
      {canChallenge && !hasActiveChallenge && !isCurrentUser && (
        <TouchableOpacity
          onPress={onChallenge}
          style={[styles.challengeButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
          accessibilityLabel={`Challenge ${entry.name}`}
        >
          <Icon source="sword-cross" size={16} color={colors.white} />
          <Text style={[styles.challengeText, { color: colors.white }]}>
            Challenge
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  positionContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    ...typography.bodyBold,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    ...typography.body,
  },
  youLabel: {
    ...typography.smallBold,
  },
  record: {
    ...typography.small,
    marginTop: 2,
  },
  challengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  challengeText: {
    ...typography.smallBold,
  },
});
