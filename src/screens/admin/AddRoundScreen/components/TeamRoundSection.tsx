/**
 * TeamRoundSection - Team round configuration section
 */

import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  Switch,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { PlayerAvatar } from '@/components/common';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { TeamFormatSelector } from '@/components/competitionWizard/create';
import type { TeamFormat, TeamWithMembers } from '@/types/database.types';

/**
 * Helper function to get player initials
 */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Team preview card component
 */
interface TeamPreviewCardProps {
  team: TeamWithMembers;
}

const TeamPreviewCard = memo(function TeamPreviewCard({ team }: TeamPreviewCardProps) {
  const colors = useThemeColors();
  const memberNames = team.members
    .map((m) => m.player?.name || 'Unknown')
    .slice(0, 3)
    .join(', ');
  const extraMembers = team.members.length > 3 ? ` +${team.members.length - 3}` : '';

  return (
    <View style={[styles.teamCard, { backgroundColor: colors.gray100, borderColor: colors.gray200 }]}>
      <View style={styles.teamCardHeader}>
        <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={1}>
          {team.name}
        </Text>
        <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
          {team.members.length} players
        </Text>
      </View>
      <View style={styles.avatarRow}>
        {team.members.slice(0, 3).map((member, index) => (
          <View
            key={member.player_id}
            style={[
              styles.avatarContainer,
              index > 0 && styles.avatarOverlap,
            ]}
          >
            <PlayerAvatar
              photoUrl={member.player?.photo_url}
              name={member.player?.name}
              size={28}
            />
          </View>
        ))}
        {team.members.length > 3 && (
          <View style={[styles.avatarContainer, styles.avatarOverlap]}>
            <View style={[styles.moreAvatar, { backgroundColor: colors.gray300 }]}>
              <Text style={[styles.moreAvatarText, { color: colors.textSecondary }]}>
                +{team.members.length - 3}
              </Text>
            </View>
          </View>
        )}
      </View>
      <Text style={[styles.memberNames, { color: colors.textSecondary }]} numberOfLines={1}>
        {memberNames}{extraMembers}
      </Text>
    </View>
  );
});

interface TeamRoundSectionProps {
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  teams: TeamWithMembers[];
  teamFormatError?: string;
  onTeamRoundToggle: (value: boolean) => void;
  onTeamFormatChange: (format: TeamFormat) => void;
  disabled?: boolean;
}

export const TeamRoundSection = memo(function TeamRoundSection({
  isTeamRound,
  teamFormat,
  teams,
  teamFormatError,
  onTeamRoundToggle,
  onTeamFormatChange,
  disabled,
}: TeamRoundSectionProps) {
  const colors = useThemeColors();

  return (
    <>
      <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

      <View style={styles.toggleContainer}>
        <View style={styles.toggleContent}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="account-group" size={24} color={colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Team Round
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Enable team-based scoring for this round
            </Text>
          </View>
        </View>
        <Switch
          value={isTeamRound}
          onValueChange={onTeamRoundToggle}
          trackColor={{ false: colors.gray300, true: colors.primaryLight }}
          thumbColor={isTeamRound ? colors.primary : colors.gray100}
          disabled={disabled}
        />
      </View>

      {/* Team Format Selection */}
      {isTeamRound && (
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
            Team Format *
          </Text>
          <TeamFormatSelector
            value={teamFormat}
            onChange={onTeamFormatChange}
            disabled={disabled}
            error={teamFormatError}
          />
        </View>
      )}

      {/* Team Pairing Preview */}
      {isTeamRound && teams.length > 0 && (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Icon source="account-group-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>
              Team Pairing Preview
            </Text>
          </View>
          <View style={styles.previewList}>
            {teams.slice(0, 4).map((team) => (
              <TeamPreviewCard key={team.id} team={team} />
            ))}
            {teams.length > 4 && (
              <Text style={[styles.previewMore, { color: colors.textTertiary }]}>
                +{teams.length - 4} more teams
              </Text>
            )}
          </View>
        </View>
      )}

      {/* No teams warning */}
      {isTeamRound && teams.length === 0 && (
        <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
          <Icon source="alert-outline" size={20} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            No teams have been created yet. Create teams in the competition settings before
            adding a team round.
          </Text>
        </View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  divider: {
    marginVertical: spacing.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typography.bodyBold,
  },
  description: {
    ...typography.small,
    marginTop: 2,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  previewContainer: {
    marginTop: spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  previewTitle: {
    ...typography.smallBold,
  },
  previewList: {
    gap: spacing.sm,
  },
  previewMore: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  warningText: {
    ...typography.small,
    flex: 1,
  },
  // Team card styles
  teamCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  teamCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  teamName: {
    ...typography.smallBold,
    flex: 1,
  },
  memberCount: {
    ...typography.caption,
  },
  avatarRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: borderRadius.full,
  },
  avatarOverlap: {
    marginLeft: -spacing.sm,
  },
  moreAvatar: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAvatarText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  memberNames: {
    ...typography.caption,
  },
});
