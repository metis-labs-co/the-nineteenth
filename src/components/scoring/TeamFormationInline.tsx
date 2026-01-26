/**
 * TeamFormationInline - Compact inline team formation display for scramble rounds
 *
 * Features:
 * - Displays auto-generated teams from provided players
 * - Compact card view showing team members
 * - Shuffle button to randomize teams (disabled when locked)
 * - Lock indicator for competition teams that cannot be modified
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { PlayerAvatar } from '@/components/common';
import { IconRefresh, IconLock, IconUsers } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { ScrambleTeam } from '@/screens/rounds/CreateRoundBottomSheet/types';

// =====================================================
// TYPES
// =====================================================

export interface TeamFormationInlineProps {
  /**
   * List of teams to display
   */
  teams: ScrambleTeam[];

  /**
   * Callback when shuffle button is pressed
   */
  onShuffle: () => void;

  /**
   * Whether teams are locked (competition teams that can't be shuffled)
   */
  locked?: boolean;

  /**
   * Test ID for testing
   */
  testID?: string;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get first name with surname initial (e.g., "John Smith" → "John S.")
 * Helps differentiate players with the same first name
 */
const getDisplayName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  }
  const firstName = parts[0];
  const surname = parts[parts.length - 1];
  return `${firstName} ${surname.charAt(0).toUpperCase()}.`;
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export function TeamFormationInline({
  teams,
  onShuffle,
  locked = false,
  testID,
}: TeamFormationInlineProps) {
  const colors = useThemeColors();

  // Check if any team has 3 players (odd count scenario)
  const hasThreePlayerTeam = teams.some((team) => team.members.length === 3);

  // No teams to display
  if (teams.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.gray100 }]} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconUsers size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Teams</Text>
        </View>

        {locked ? (
          <View style={[styles.lockedBadge, { backgroundColor: colors.surface }]}>
            <IconLock size={14} color={colors.textTertiary} />
            <Text style={[styles.lockedText, { color: colors.textTertiary }]}>
              Competition teams
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.shuffleButton, { backgroundColor: colors.surface }]}
            onPress={onShuffle}
            accessibilityLabel="Shuffle teams"
            accessibilityRole="button"
          >
            <IconRefresh size={16} color={colors.primary} />
            <Text style={[styles.shuffleText, { color: colors.primary }]}>Shuffle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Teams List */}
      <View style={styles.teamsList}>
        {teams.map((team, index) => (
          <View
            key={team.id}
            style={[
              styles.teamCard,
              { backgroundColor: colors.surface },
              index === teams.length - 1 && styles.teamCardLast,
            ]}
          >
            {/* Team Name */}
            <Text style={[styles.teamName, { color: colors.textSecondary }]}>{team.name}</Text>

            {/* Team Members */}
            <View style={styles.membersRow}>
              {team.members.map((member, memberIndex) => (
                <View
                  key={member.id}
                  style={[
                    styles.memberChip,
                    memberIndex < team.members.length - 1 && styles.memberChipWithGap,
                  ]}
                >
                  <PlayerAvatar
                    photoUrl={null}
                    name={member.name}
                    size={28}
                  />
                  <Text
                    style={[styles.memberName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {getDisplayName(member.name)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Help text */}
      <Text style={[styles.helpText, { color: colors.textTertiary }]}>
        {hasThreePlayerTeam
          ? 'One team has 3 players due to odd count'
          : 'Players are paired into teams'}
      </Text>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.smallBold,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  shuffleText: {
    ...typography.caption,
    fontWeight: '600',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  lockedText: {
    ...typography.caption,
  },
  teamsList: {
    gap: spacing.sm,
  },
  teamCard: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  teamCardLast: {
    marginBottom: 0,
  },
  teamName: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberChipWithGap: {
    marginRight: spacing.md,
  },
  memberName: {
    ...typography.small,
    fontWeight: '500',
  },
  helpText: {
    ...typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default TeamFormationInline;
