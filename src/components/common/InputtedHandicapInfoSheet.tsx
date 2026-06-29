/**
 * InputtedHandicapInfoSheet - Small info bottom sheet explaining the handicap
 * value a user has manually entered on their profile (the `players.handicap`
 * field), as opposed to the app-computed Social Handicap Index.
 *
 * For the fuller explainer covering all handicap types, see HandicapInfoSheet.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { BottomSheet } from './BottomSheet';

export interface InputtedHandicapInfoSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function InputtedHandicapInfoSheet({ visible, onClose }: InputtedHandicapInfoSheetProps) {
  const colors = useThemeColors();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.32}
      title="Handicap"
      showCloseButton
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <Icon source="card-account-details" size={24} color={colors.primary} />
        </View>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          This is your inputted handicap, saved to your profile. You set it
          manually, and it stays fixed until you change it.
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          It&apos;s separate from your Social Handicap Index, which The
          Nineteenth calculates automatically from your completed rounds.
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    ...typography.body,
    lineHeight: 22,
  },
});
