/**
 * InvitationStatusBadge
 *
 * Small visual indicator for a competition player's invitation status.
 * Surfaces the difference between an accepted participant, a player who
 * was invited but hasn't responded, and one who declined — matters
 * because non-accepted players still appear in some views (Teams tab,
 * score-entry contributors) but are silently dropped from others (round
 * leaderboard's team member list, "tick" on round details).
 *
 * Three visual states:
 *   - 'accepted'  → small green check pill
 *   - 'invited'   → amber "Invited" pill (pending response)
 *   - 'declined'  → red "Declined" pill
 *
 * Unknown statuses fall through to no render so the component is safe
 * to drop in without breaking existing rows.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

export interface InvitationStatusBadgeProps {
  /** competition_players.status — typically 'invited' | 'accepted' | 'declined' */
  status: string | null | undefined;
  /** Test ID for testing */
  testID?: string;
}

export function InvitationStatusBadge({
  status,
  testID,
}: InvitationStatusBadgeProps) {
  const colors = useThemeColors();

  if (!status) return null;

  if (status === 'accepted') {
    return (
      <View
        style={[
          styles.iconOnly,
          { backgroundColor: colors.successLight },
        ]}
        testID={testID ?? 'invitation-status-accepted'}
        accessibilityLabel="Accepted invitation"
      >
        <Icon source="check" size={14} color={colors.success} />
      </View>
    );
  }

  if (status === 'invited') {
    return (
      <View
        style={[styles.pill, { backgroundColor: colors.warningLight }]}
        testID={testID ?? 'invitation-status-invited'}
        accessibilityLabel="Invitation pending"
      >
        <Icon source="clock-outline" size={12} color={colors.warningDark} />
        <Text style={[styles.label, { color: colors.warningDark }]}>Invited</Text>
      </View>
    );
  }

  if (status === 'declined') {
    return (
      <View
        style={[styles.pill, { backgroundColor: colors.errorLight }]}
        testID={testID ?? 'invitation-status-declined'}
        accessibilityLabel="Invitation declined"
      >
        <Icon source="close" size={12} color={colors.error} />
        <Text style={[styles.label, { color: colors.error }]}>Declined</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  iconOnly: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});

export default InvitationStatusBadge;
