// src/components/teams/TeamFormationCard.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { IconCheck } from '@tabler/icons-react-native';
import { PlayerAvatar } from '@/components/common';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
  type ColorPalette,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeamWithMembers } from '@/types/database.types';
import { calculateTeamHandicap } from './teamAlgorithms';
import type { SelectedPlayerState } from './useTeamFormation';

interface TeamFormationCardProps {
  team: TeamWithMembers;
  teamIndex: number;
  selectedPlayer: SelectedPlayerState | null;
  onPlayerPress: (teamIndex: number, memberIndex: number, playerId: string) => void;
}

/**
 * TeamFormationCard - Individual team display for formation/editing
 *
 * Displays a team card with:
 * - Team name and average handicap badge
 * - List of team members with handicaps
 * - Visual selection state for player swapping
 *
 * Used within TeamFormationUI for creating and editing teams.
 */
export const TeamFormationCard = React.memo(function TeamFormationCard({
  team,
  teamIndex,
  selectedPlayer,
  onPlayerPress,
}: TeamFormationCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const teamHandicap = calculateTeamHandicap(team.members);

  return (
    <View style={styles.card}>
      {/* Team Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.teamName}>{team.name}</Text>
        <View style={styles.handicapBadge}>
          <Text style={styles.handicapLabel}>Avg HC:</Text>
          <Text style={styles.handicapValue}>{teamHandicap.toFixed(1)}</Text>
        </View>
      </View>

      {/* Members */}
      <View style={styles.membersList}>
        {team.members.map((member, memberIndex) => {
          const player = member.player;
          if (!player) return null;

          const isSelected =
            selectedPlayer?.teamIndex === teamIndex &&
            selectedPlayer?.memberIndex === memberIndex;
          const isSwapTarget =
            selectedPlayer !== null &&
            (selectedPlayer.teamIndex !== teamIndex ||
              selectedPlayer.memberIndex !== memberIndex);

          return (
            <TouchableOpacity
              key={player.id}
              style={[
                styles.memberRow,
                isSelected && styles.memberRowSelected,
                isSwapTarget && styles.memberRowSwapTarget,
              ]}
              onPress={() => onPlayerPress(teamIndex, memberIndex, player.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${player.name}, Handicap ${player.handicap ?? 'N/A'}${
                isSelected ? ', selected for swap' : ''
              }`}
              accessibilityHint="Tap to select for swapping"
            >
              <PlayerAvatar
                photoUrl={player.photo_url}
                name={player.name}
                size={36}
                style={styles.avatar}
              />

              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {player.name}
                </Text>
              </View>

              <View style={styles.memberHandicap}>
                <Text style={styles.memberHandicapLabel}>HC:</Text>
                <Text style={styles.memberHandicapValue}>
                  {player.handicap ?? 'N/A'}
                </Text>
              </View>

              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <IconCheck size={16} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
      overflow: 'hidden',
      ...shadows.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surfaceVariant,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    teamName: {
      ...typography.h4,
      color: colors.textPrimary,
    },
    handicapBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLighter,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      gap: spacing.xs,
    },
    handicapLabel: {
      ...typography.caption,
      color: colors.primaryDark,
    },
    handicapValue: {
      ...typography.captionBold,
      color: colors.primaryDark,
    },
    membersList: {
      paddingVertical: spacing.sm,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      minHeight: 52,
      borderRadius: borderRadius.md,
      marginHorizontal: spacing.sm,
      marginVertical: spacing.xs,
    },
    memberRowSelected: {
      backgroundColor: `${colors.primary}20`,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    memberRowSwapTarget: {
      backgroundColor: colors.surfaceVariant,
    },
    avatar: {
      marginRight: spacing.md,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      ...typography.body,
      color: colors.textPrimary,
    },
    memberHandicap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    memberHandicapLabel: {
      ...typography.caption,
      color: colors.textTertiary,
    },
    memberHandicapValue: {
      ...typography.smallBold,
      color: colors.textPrimary,
    },
    selectedIndicator: {
      marginLeft: spacing.sm,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default TeamFormationCard;
