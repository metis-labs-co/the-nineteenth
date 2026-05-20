// src/components/teams/TeamCard.tsx
import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Divider } from 'react-native-paper';
import { PlayerAvatar } from '@/components/common';
import { spacing, typography, borderRadius, shadows, type ColorPalette } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { getTeamColorHex } from '@/utils/teamColor';
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
 * Get initials for avatar fallback
 */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export interface TeamCardProps {
  /**
   * Team data with members populated
   */
  team: TeamWithMembers;

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
   *   - Member rows for this player display a "You" pill next to the name.
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
 * TeamCard - Display team with members and statistics
 *
 * @description
 * Shows team name (tappable to edit when isEditable), the average/total team
 * handicap in the header's top-right, and the full member list (always
 * visible) with avatars and per-player handicaps.
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

  const { averageHandicap, totalHandicap } = calculateTeamStats(team.members);
  const members = team.members ?? [];
  const memberCount = members.length;

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

  const nameRow = (
    <>
      <View
        style={[
          styles.colorDot,
          { backgroundColor: getTeamColorHex(team.color, 0, colors) },
        ]}
      />
      <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
        {team.name}
      </Text>
    </>
  );

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
        {/* Header: tappable team name (left) + handicap stats (top-right) */}
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            {isEditable ? (
              <TouchableOpacity
                style={styles.nameButton}
                onPress={handleEditPress}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel="Edit team name"
                accessibilityHint="Opens dialog to edit team name"
              >
                {nameRow}
              </TouchableOpacity>
            ) : (
              <View style={styles.nameButton}>{nameRow}</View>
            )}
            <Text style={styles.memberCountText}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>

          <View style={styles.statsColumn}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg HC</Text>
              <Text style={[styles.statValue, { color: colors.primaryDark }]}>
                {averageHandicap.toFixed(1)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total HC</Text>
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                {totalHandicap.toFixed(1)}
              </Text>
            </View>
          </View>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Member list — always visible */}
        <View style={styles.memberList}>
          {memberCount > 0 ? (
            members.map((member, index) => (
              <MemberRow
                key={member.player_id}
                player={member.player}
                isLast={index === memberCount - 1}
                colors={colors}
                onPress={onMemberPress}
                isCurrentUser={!!currentUserId && member.player_id === currentUserId}
              />
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No members in this team
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
});

/**
 * Individual member row within the team card
 */
interface MemberRowProps {
  player?: Player;
  isLast: boolean;
  colors: ColorPalette;
  onPress?: (player: Player) => void;
  isCurrentUser?: boolean;
}

const MemberRow = React.memo(function MemberRow({
  player,
  isLast,
  colors,
  onPress,
  isCurrentUser = false,
}: MemberRowProps) {
  if (!player) {
    return null;
  }

  // Note: initials calculated but not used - PlayerAvatar handles this internally
  const _initials = getInitials(player.name);
  const styles = createMemberStyles(colors);

  const rowContent = (
    <>
      <PlayerAvatar
        photoUrl={player.photo_url}
        name={player.name}
        size={36}
        style={styles.avatar}
      />

      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">
            {player.name}
          </Text>
          {isCurrentUser && (
            <View
              style={[styles.youPill, { backgroundColor: colors.primaryLighter }]}
              accessibilityLabel="You"
            >
              <Text style={[styles.youPillText, { color: colors.primaryDark }]}>You</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.handicapBadge}>
        <Text style={[styles.handicapLabel, { color: colors.textTertiary }]}>HC:</Text>
        <Text style={[styles.handicapValue, { color: colors.textPrimary }]}>
          {player.handicap ?? 'N/A'}
        </Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.memberRow, !isLast && styles.memberRowBorder]}
        onPress={() => onPress(player)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Move ${player.name}. Handicap ${player.handicap ?? 'N/A'}.`}
        accessibilityHint="Opens a menu to move this player to a different team"
      >
        {rowContent}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.memberRow, !isLast && styles.memberRowBorder]}
      accessibilityRole="text"
      accessibilityLabel={`${player.name}, Handicap: ${player.handicap ?? 'N/A'}`}
    >
      {rowContent}
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
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    content: {
      padding: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    nameContainer: {
      flex: 1,
    },
    nameButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: borderRadius.full,
    },
    teamName: {
      ...typography.h4,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    memberCountText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    statsColumn: {
      alignItems: 'flex-end',
      gap: spacing.xxs,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
    },
    statLabel: {
      ...typography.caption,
      color: colors.textTertiary,
    },
    statValue: {
      ...typography.smallBold,
    },
    divider: {
      marginVertical: spacing.sm,
    },
    memberList: {},
    emptyText: {
      ...typography.small,
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
  });

/**
 * Create member row styles with theme colors
 */
const createMemberStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      minHeight: 48, // Minimum touch target
    },
    memberRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    avatar: {
      marginRight: spacing.md,
    },
    avatarLabel: {
      ...typography.captionBold,
      color: colors.textInverse,
    },
    memberInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    memberNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    memberName: {
      ...typography.body,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    youPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    youPillText: {
      ...typography.caption,
      fontWeight: '600',
    },
    handicapBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    handicapLabel: {
      ...typography.caption,
    },
    handicapValue: {
      ...typography.smallBold,
    },
  });

export default TeamCard;
