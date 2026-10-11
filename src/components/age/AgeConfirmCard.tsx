/**
 * AgeConfirmCard - the permanent route back for anyone not yet resolved.
 *
 * Shown on the Profile screen whenever age_status is not 'eligible'. This is
 * the guaranteed escape hatch: unlike the one-time sheet it is never
 * suppressed by dismissal count or timing, so nobody can end up stranded with
 * social features off and no way to fix it.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';

import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useSocialAccess } from '@/hooks/useSocialAccess';
import { useAgeCheckPrompt } from '@/hooks/useAgeCheckPrompt';
import { AgeCheckSheet } from './AgeCheckSheet';

export function AgeConfirmCard() {
  const colors = useThemeColors();
  const { status, isLoading } = useSocialAccess();
  const { confirm } = useAgeCheckPrompt();
  const [showSheet, setShowSheet] = useState(false);

  const handleConfirm = useCallback(
    async (dob: Date) => {
      await confirm(dob);
      setShowSheet(false);
    },
    [confirm]
  );

  // Nothing to offer once resolved, and nothing to claim while still loading.
  if (isLoading || status === 'eligible') return null;

  const isUnresolved = status === 'unknown';

  return (
    <>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowSheet(true)}
        accessibilityRole="button"
        accessibilityLabel="Confirm your age"
      >
        <Icon source="shield-account" size={24} color={colors.primary} />
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Confirm your age
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {isUnresolved
              ? 'Social features are off until you confirm your age.'
              : 'Turned 13? Confirm your age to turn social features on.'}
          </Text>
        </View>
        <Icon source="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <AgeCheckSheet
        visible={showSheet}
        onConfirm={handleConfirm}
        onDismiss={() => setShowSheet(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  text: { flex: 1, gap: 2 },
  title: { ...typography.bodyBold },
  body: { ...typography.caption },
});
