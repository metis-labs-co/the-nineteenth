// src/components/teams/TeamCard.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Card, Text, Avatar, IconButton, Divider } from 'react-native-paper';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows, layout, type ColorPalette } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeamWithMembers, Player } from '@/types/database.types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
   * Whether member list is initially expanded
   */
  initiallyExpanded?: boolean;

  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * TeamCard - Display team with members and statistics
 *
 * @description
 * Shows team name (editable if isEditable), member list with avatars,
 * and team statistics (average and total handicap). Supports
 * expandable/collapsible member details.
 *
 * @example
 * ```tsx
 * <TeamCard
 *   team={teamWithMembers}
 *   isEditable={isOrganizer}
 *   onEdit={(team) => handleEditTeam(team)}
 *   onDelete={(team) => handleDeleteTeam(team)}
 *   onNameChange={(teamId, name) => updateTeamName(teamId, name)}
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
  initiallyExpanded = false,
  testID,
}: TeamCardProps) {
  const colors = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const { averageHandicap, totalHandicap } = calculateTeamStats(team.members);
  const memberCount = team.members?.length ?? 0;

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

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
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Team: ${team.name}. ${memberCount} members. Average handicap: ${averageHandicap}`}
      accessibilityHint={onPress ? 'Double tap to view team details' : undefined}
    >
      <Card.Content style={styles.content}>
        {/* Header: Team Name + Edit Action */}
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
              {team.name}
            </Text>
          </View>

          {isEditable && (
            <IconButton
              icon="pencil"
              size={20}
              onPress={handleEditPress}
              accessibilityLabel="Edit team name"
              accessibilityHint="Opens dialog to edit team name"
              style={styles.actionButton}
            />
          )}
        </View>

        {/* Stats Row: Average HC + Total HC Badges */}
        <View style={styles.statsRow}>
          <View style={[styles.statBadge, { backgroundColor: colors.primaryLighter }]}>
            <Text style={[styles.statLabel, { color: colors.primaryDark }]}>Avg HC</Text>
            <Text style={[styles.statValue, { color: colors.primaryDark }]}>
              {averageHandicap.toFixed(1)}
            </Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: colors.gray200 }]}>
            <Text style={[styles.statLabel, { color: colors.gray700 }]}>Total HC</Text>
            <Text style={[styles.statValue, { color: colors.gray700 }]}>
              {totalHandicap.toFixed(1)}
            </Text>
          </View>
          <View style={styles.memberCountBadge}>
            <Text style={[styles.memberCountText, { color: colors.textSecondary }]}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Expandable Member List Toggle */}
        <Pressable
          style={styles.expandToggle}
          onPress={handleToggleExpand}
          accessibilityRole="button"
          accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} member list`}
          accessibilityState={{ expanded: isExpanded }}
        >
          <Text style={[styles.expandToggleText, { color: colors.textSecondary }]}>
            {isExpanded ? 'Hide members' : 'Show members'}
          </Text>
          {isExpanded ? (
            <IconChevronUp size={20} color={colors.textSecondary} />
          ) : (
            <IconChevronDown size={20} color={colors.textSecondary} />
          )}
        </Pressable>

        {/* Member List (Expandable) */}
        {isExpanded && (
          <View style={styles.memberList}>
            {team.members && team.members.length > 0 ? (
              team.members.map((member, index) => (
                <MemberRow
                  key={member.player_id}
                  player={member.player}
                  isLast={index === team.members.length - 1}
                  colors={colors}
                />
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No members in this team
              </Text>
            )}
          </View>
        )}
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
}

const MemberRow = React.memo(function MemberRow({ player, isLast, colors }: MemberRowProps) {
  if (!player) {
    return null;
  }

  const initials = getInitials(player.name);
  const styles = createMemberStyles(colors);

  return (
    <View
      style={[styles.memberRow, !isLast && styles.memberRowBorder]}
      accessibilityRole="text"
      accessibilityLabel={`${player.name}, Handicap: ${player.handicap ?? 'N/A'}`}
    >
      {player.photo_url ? (
        <Avatar.Image
          size={36}
          source={{ uri: player.photo_url }}
          style={styles.avatar}
        />
      ) : (
        <Avatar.Text
          size={36}
          label={initials}
          style={[styles.avatar, { backgroundColor: colors.primary }]}
          labelStyle={styles.avatarLabel}
        />
      )}

      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">
          {player.name}
        </Text>
      </View>

      <View style={styles.handicapBadge}>
        <Text style={[styles.handicapLabel, { color: colors.textTertiary }]}>HC:</Text>
        <Text style={[styles.handicapValue, { color: colors.textPrimary }]}>
          {player.handicap ?? 'N/A'}
        </Text>
      </View>
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
      padding: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      minHeight: layout.iconButtonSize,
    },
    nameContainer: {
      flex: 1,
      marginRight: spacing.sm,
    },
    teamName: {
      ...typography.h4,
      color: colors.textPrimary,
    },
    actionButton: {
      margin: 0,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    statBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      gap: spacing.xs,
    },
    statLabel: {
      ...typography.caption,
      fontWeight: '500',
    },
    statValue: {
      ...typography.smallBold,
    },
    memberCountBadge: {
      marginLeft: 'auto',
    },
    memberCountText: {
      ...typography.small,
    },
    divider: {
      marginBottom: spacing.sm,
    },
    expandToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      minHeight: layout.iconButtonSize,
    },
    expandToggleText: {
      ...typography.small,
      marginRight: spacing.xs,
    },
    memberList: {
      marginTop: spacing.sm,
    },
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
    memberName: {
      ...typography.body,
      color: colors.textPrimary,
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
