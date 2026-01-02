/**
 * InviteCodeSection - Read-only invite code display
 * Uses InfoCard component with highlight variant
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { InfoCard } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface InviteCodeSectionProps {
  inviteCode: string;
}

export function InviteCodeSection({ inviteCode }: InviteCodeSectionProps) {
  const colors = useThemeColors();

  return (
    <InfoCard
      title="Invite Code"
      icon="key"
      variant="highlight"
      style={styles.container}
      testID="invite-code-section"
    >
      <View style={[styles.codeContainer, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.code, { color: colors.primaryDark }]}>{inviteCode}</Text>
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Share this code with players to let them join
      </Text>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  codeContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
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
