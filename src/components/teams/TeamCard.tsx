// src/components/teams/TeamCard.tsx
import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows, type ColorPalette } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { getTeamColorHex } from '@/utils/teamColor';
import { getInitials, formatHandicapIndex } from '@/utils/displayHelpers';
import type { TeamWithMembers, Player } from '@/types/database.types';

/**
 * Calculate team statistics
 */
const calculateTeamStats = (
  members: TeamWithMembers['members']
): { averageHandicap: number; totalHandicap: number } => {
  if (!members || members.length === 0) {
    return { averageHandicap: 0, totalHandicap: 0 };
  }

  const handicaps = members
    .map((m) => m.player?.handicap ?? 0)
    .filter((h): h is number => typeof h === 'number');

  const totalHandicap = handicaps.reduce((sum, h) => sum + h, 0);
  const averageHandicap = handicaps.length > 0 ? totalHandicap / handicaps.length : 0;

  return {
    averageHandicap: Math.round(averageHandicap * 10) / 10, // Round to 1 decimal
    totalHandicap: Math.round(totalHandicap * 10) / 10,
  };
};

/**
 * Derive a 2-3 letter abbreviation for the team colour chip.
 * "Team Wales" → "WA", "The Fairway Bandits" → "FB", "Eagles" → "EAG".
 */
export function getTeamAbbreviation(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(team|the)$/i.test(w));

  if (words.length === 0) {
    // Name was only filler words ("Team", "The") — fall back to raw name
    const raw = name.trim();
    return raw.slice(0, 3).toUpperCase() || '?';
  }
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

export interface TeamCardProps {
  /**
   * Team data with members populated
   */
  team: TeamWithMembers;

  /**
   * Fallback index used for legacy team colours (teams without a stored
   * colour cycle through the theme palette by position in the list).
   */
  teamIndex?: number;

  /**
   * Whether the team name and actions are editable
   */
  isEditable?: boolean;

  /**
   * Callback when edit button is pressed
   */
  onEdit?: (team: TeamWithMembers) => void;

  /**
   * Callback when delete button is pressed
   */
  onDelete?: (team: TeamWithMembers) => void;

  /**
   * Callback when team name is changed (inline editing)
   */
  onNameChange?: (teamId: string, newName: string) => void;

  /**
   * Callback when card is pressed
   */
  onPress?: () => void;

  /**
   * Callback when a member row is pressed. When provided, members become
   * tappable — used by organizers on the Teams tab to open the move sheet.
   */
  onMemberPress?: (player: Player) => void;

  /**
   * The currently logged-in user's player ID. When provided:
   *   - The member chip for this player is marked "· You".
   *   - The card itself gets a primary-coloured border to visually
   *     identify the user's own team at a glance.
   */
  currentUserId?: string;

  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * TeamCard - Display team with members (Competition Details redesign)
 *
 * @description
 * Header: rounded-square team-colour chip with a 2-3 letter abbreviation,
 * team name, "{n} players · Avg HC x" subtitle and a pencil edit button
 * (when editable). Below: a two-column grid of member chips (initials
 * circle on the team colour, name, handicap).
 *
 * @example
 * ```tsx
 * <TeamCard
 *   team={teamWithMembers}
 *   isEditable={isOrganizer}
 *   onEdit={(team) => handleEditTeam(team)}
 * />
 * ```
 */
export const TeamCard = React.memo(function TeamCard({
  team,
  teamIndex = 0,
  isEditable = false,
  onEdit,
  onDelete,
  onNameChange,
  onPress,
  onMemberPress,
  currentUserId,
  testID,
}: TeamCardProps) {
  const colors = useThemeColors();

  const { averageHandicap } = calculateTeamStats(team.members);
  const members = team.members ?? [];
  const memberCount = members.length;
  const teamColor = getTeamColorHex(team.color, teamIndex, colors);

  // Highlight the user's own team with a primary-colour border so it
  // stands out at a glance among many teams.
  const isUsersTeam =
    !!currentUserId && members.some((m) => m.player_id === currentUserId);

  const handleEditPress = useCallback(() => {
    onEdit?.(team);
  }, [onEdit, team]);

  // Keep these for potential future use but they're not used in current UI
  const _handleDeletePress = useCallback(() => {
    onDelete?.(team);
  }, [onDelete, team]);

  const _handleNameChange = onNameChange; // Suppress unused warning

  const styles = createStyles(colors);

  return (
    <Card
      style={[
        styles.card,
        isUsersTeam && {
          borderWidth: 2,
          borderColor: colors.primary,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Team: ${team.name}.${isUsersTeam ? ' Your team.' : ''} ${memberCount} members. Average handicap: ${averageHandicap}`}
      accessibilityHint={onPress ? 'Double tap to view team details' : undefined}
    >
      <Card.Content style={styles.content}>
        {/* Header: colour chip + name/subtitle (left), pencil edit (right) */}
        <View style={styles.header}>
          <View style={[styles.abbrChip, { backgroundColor: teamColor }]}>
            <Text style={[styles.abbrText, { color: colors.white }]}>
              {getTeamAbbreviation(team.name)}
            </Text>
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
              {team.name}
            </Text>
            <Text style={styles.subtitle}>
              {`${memberCount} ${memberCount === 1 ? 'player' : 'players'} · Avg HC ${formatHandicapIndex(averageHandicap)}`}
            </Text>
          </View>

          {isEditable && (
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={handleEditPress}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Edit team name"
              accessibilityHint="Opens dialog to edit team name"
            >
              <Icon source="pencil-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Member grid — two-column chips, always visible */}
        {memberCount > 0 ? (
          <View style={styles.memberGrid}>
            {members.map((member) => (
              <MemberChip
                key={member.player_id}
                player={member.player}
                teamColor={teamColor}
                colors={colors}
                onPress={onMemberPress}
                isCurrentUser={!!currentUserId && member.player_id === currentUserId}
              />
            ))}
          </View>
        ) : (
          <Text
            style={[
              styles.emptyText,
              { color: onPress ? colors.primary : colors.textTertiary },
            ]}
          >
            {onPress ? 'Tap to add players' : 'No members in this team'}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
});

/**
 * Individual member chip within the team card grid
 */
interface MemberChipProps {
  player?: Player;
  teamColor: string;
  colors: ColorPalette;
  onPress?: (player: Player) => void;
  isCurrentUser?: boolean;
}

const MemberChip = React.memo(function MemberChip({
  player,
  teamColor,
  colors,
  onPress,
  isCurrentUser = false,
}: MemberChipProps) {
  if (!player) {
    return null;
  }

  const styles = createMemberStyles(colors);
  const hcLabel = `HC ${formatHandicapIndex(player.handicap)}${isCurrentUser ? ' · You' : ''}`;

  const chipContent = (
    <>
      <View style={[styles.initialsAvatar, { backgroundColor: teamColor }]}>
        <Text style={[styles.initialsText, { color: colors.white }]}>
          {getInitials(player.name)}
        </Text>
      </View>
      <View style={styles.chipInfo}>
        <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">
          {player.name}
        </Text>
        <Text style={styles.handicapText} numberOfLines={1}>
          {hcLabel}
        </Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.chip}
        onPress={() => onPress(player)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Move ${player.name}. Handicap ${player.handicap ?? 'N/A'}.`}
        accessibilityHint="Opens a menu to move this player to a different team"
      >
        {chipContent}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={styles.chip}
      accessibilityRole="text"
      accessibilityLabel={`${player.name}, Handicap: ${player.handicap ?? 'N/A'}`}
    >
      {chipContent}
    </View>
  );
});

/**
 * Create styles with theme colors
 */
const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      marginBottom: spacing.sm + 2,
      ...shadows.sm,
    },
    content: {
      padding: spacing.md + 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm + 2,
    },
    abbrChip: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.md + 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    abbrText: {
      fontSize: 12,
      fontWeight: '800',
    },
    nameContainer: {
      flex: 1,
    },
    teamName: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 1,
    },
    editButton: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.md + 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs + 3,
      marginTop: spacing.md,
    },
    emptyText: {
      ...typography.small,
      textAlign: 'center',
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
    },
  });

/**
 * Create member chip styles with theme colors
 */
const createMemberStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surfaceVariant,
      borderRadius: borderRadius.lg - 1,
      paddingVertical: spacing.xs + 3,
      paddingHorizontal: spacing.sm + 1,
      flexGrow: 1,
      flexBasis: '46%',
      minHeight: 44, // Minimum touch target
    },
    initialsAvatar: {
      width: 24,
      height: 24,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initialsText: {
      fontSize: 9,
      fontWeight: '800',
    },
    chipInfo: {
      flex: 1,
      minWidth: 0,
    },
    memberName: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    handicapText: {
      fontSize: 9.5,
      color: colors.textTertiary,
      marginTop: 1,
    },
  });

export default TeamCard;
