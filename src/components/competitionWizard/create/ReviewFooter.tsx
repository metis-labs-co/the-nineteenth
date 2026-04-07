/**
 * ReviewFooter - Sticky footer with back and create buttons for the review step
 */

import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface ReviewFooterProps {
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function ReviewFooter({ onSubmit, onBack, isSubmitting }: ReviewFooterProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          backgroundColor: colors.surface,
          borderTopColor: colors.gray200,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={[styles.backButton, { borderColor: colors.gray300, borderWidth: 1 }, isSubmitting && { opacity: 0.5 }]}
        activeOpacity={0.7}
        accessibilityRole="button"
        disabled={isSubmitting}
      >
        <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSubmit}
        style={[styles.createButton, { backgroundColor: colors.primary }, isSubmitting && { opacity: 0.5 }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        disabled={isSubmitting}
      >
        {isSubmitting && <ActivityIndicator size="small" color={colors.white} />}
        <Text style={[styles.buttonLabel, { color: colors.white }]}>
          {isSubmitting ? 'Creating...' : 'Create Competition'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  backButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    flex: 2,
    borderRadius: borderRadius.md,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});
