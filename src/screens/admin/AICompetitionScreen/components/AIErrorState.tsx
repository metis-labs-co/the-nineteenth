/**
 * AIErrorState - Error state display for AI generation
 *
 * Shows error message and retry button
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

interface AIErrorStateProps {
  errorMessage: string;
  onRetry: () => void;
}

export function AIErrorState({ errorMessage, onRetry }: AIErrorStateProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View
        style={[styles.errorContainer, { backgroundColor: colors.errorLight }]}
      >
        <Icon source="alert-circle" size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.error }]}>
          Generation Failed
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {errorMessage}
        </Text>
      </View>
      <View style={styles.errorActions}>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={onRetry}
        >
          <Icon source="refresh" size={20} color={colors.white} />
          <Text style={[styles.retryButtonText, { color: colors.white }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    maxWidth: 300,
  },
  errorTitle: {
    ...typography.h4,
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
  },
  errorActions: {
    marginTop: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  retryButtonText: {
    ...typography.bodyBold,
  },
});
