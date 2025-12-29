/**
 * InviteCodeSection - Read-only invite code display
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

interface InviteCodeSectionProps {
  inviteCode: string;
}

export function InviteCodeSection({ inviteCode }: InviteCodeSectionProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Invite Code</Text>
      <View style={[styles.codeContainer, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.code, { color: colors.primaryDark }]}>{inviteCode}</Text>
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Share this code with players to let them join
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  codeContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  code: {
    ...typography.h3,
    letterSpacing: 2,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});
