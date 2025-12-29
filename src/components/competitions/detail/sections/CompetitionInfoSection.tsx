/**
 * CompetitionInfoSection - Competition header card with key information
 *
 * Displays:
 * - Competition icon and name
 * - Date range
 * - Competition type badge
 * - Description (if provided)
 * - Quick stats (rounds, players)
 * - Invite code (tappable to copy)
 * - Edit button (organizers only)
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { IconCalendar } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { formatDateAustralian } from '@/utils/formatting';
import { Pill } from '@/components/common/Pill';
import { competitionTypeLabels, type CompetitionInfoSectionProps } from './types';

export function CompetitionInfoSection({
  competition,
  rounds,
  playerCount,
  isOrganizer,
  onEdit,
}: CompetitionInfoSectionProps) {
  const colors = useThemeColors();

  const handleCopyInviteCode = async () => {
    await Clipboard.setStringAsync(competition.invite_code);
    const Toast = require('react-native-toast-message').default;
    Toast.show({
      type: 'success',
      text1: 'Copied!',
      text2: 'Invite code copied to clipboard',
      visibilityTime: 2000,
      position: 'bottom',
    });
  };

  return (
    <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerTop}>
        <View style={[styles.competitionIcon, { backgroundColor: colors.primaryLighter }]}>
          <Icon source="trophy-outline" size={32} color={colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.competitionName, { color: colors.textPrimary }]}>
            {competition.name}
          </Text>
          <View style={styles.dateRow}>
            <IconCalendar size={14} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatDateAustralian(competition.start_date)}
              {competition.end_date && ` - ${formatDateAustralian(competition.end_date)}`}
            </Text>
          </View>
          {/* Competition Type Badge */}
          <View style={styles.typeBadgeContainer}>
            <Pill
              label={competitionTypeLabels[competition.competition_type] || 'Event'}
              variant="primary"
              size="md"
            />
          </View>
        </View>

        {/* Edit Button (Organizer only) */}
        {isOrganizer && (
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.gray100 }]}
            onPress={onEdit}
            accessibilityLabel="Edit competition"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Icon source="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Description */}
      {competition.description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {competition.description}
        </Text>
      )}

      {/* Quick Stats */}
      <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{rounds.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rounds</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{playerCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Players</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      </View>

      {/* Invite Code - Tappable to copy */}
      <TouchableOpacity
        style={[styles.inviteCodeBox, { backgroundColor: colors.primaryLighter }]}
        onPress={handleCopyInviteCode}
        accessibilityLabel={`Copy invite code ${competition.invite_code}`}
        accessibilityHint="Double tap to copy invite code to clipboard"
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <View style={styles.inviteCodeRow}>
          <Text style={[styles.inviteCodeLabel, { color: colors.primaryDark }]}>INVITE CODE</Text>
          <View style={styles.inviteCodeValueRow}>
            <Text style={[styles.inviteCode, { color: colors.primaryDark }]}>
              {competition.invite_code}
            </Text>
            <Icon source="content-copy" size={18} color={colors.primaryDark} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  competitionIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  competitionName: {
    ...typography.h3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  dateText: {
    ...typography.small,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    ...typography.body,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  typeBadgeContainer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h4,
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
  },

  // Invite Code
  inviteCodeBox: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCodeLabel: {
    ...typography.captionBold,
    letterSpacing: 0.5,
  },
  inviteCodeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inviteCode: {
    ...typography.h4,
    letterSpacing: 2,
  },
});

export default CompetitionInfoSection;
