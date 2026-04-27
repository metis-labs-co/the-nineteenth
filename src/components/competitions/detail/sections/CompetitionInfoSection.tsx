/**
 * CompetitionInfoSection - Competition header card with key information
 *
 * Displays:
 * - Competition icon and name
 * - Competition status badge
 * - Description (if provided)
 * - Invite code (tappable to copy)
 *
 * Rounds/player counts have moved into the Rounds and Players tab labels.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useIsDark, useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { StatusBadge, type StatusVariant } from '@/components/common/StatusBadge';
import { type CompetitionInfoSectionProps } from './types';

export function CompetitionInfoSection({
  competition,
}: CompetitionInfoSectionProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const iconBackground = isDark ? `${colors.primary}33` : colors.primaryLighter;
  const { showSuccessToast } = useToast();

  const handleCopyInviteCode = async () => {
    await Clipboard.setStringAsync(competition.invite_code);
    showSuccessToast('Copied!', 'Invite code copied to clipboard');
  };

  return (
    <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerTop}>
        <View style={[styles.competitionIcon, { backgroundColor: iconBackground }]}>
          <Icon source="trophy-outline" size={32} color={colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.competitionName, { color: colors.textPrimary }]}>
            {competition.name}
          </Text>
          {/* Competition Status Badge */}
          <View style={styles.statusBadgeContainer}>
            <StatusBadge status={competition.status as StatusVariant} />
          </View>
        </View>

      </View>

      {/* Description */}
      {competition.description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {competition.description}
        </Text>
      )}

      {/* Invite Code - Tappable to copy */}
      <TouchableOpacity
        style={[styles.inviteCodeBox, { backgroundColor: colors.primaryBackground }]}
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
  description: {
    ...typography.body,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  statusBadgeContainer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
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
