/**
 * EditCompetitionStates - Loading and error states
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { BottomSheet, LoadingSpinner } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface LoadingStateProps {
  onClose: () => void;
}

export function LoadingState({ onClose }: LoadingStateProps) {
  return (
    <BottomSheet
      visible={true}
      onClose={onClose}
      height="full"
      title="Edit Competition"
      showHandle={false}
      safeAreaTop
      showCloseButton
      testID="edit-competition-bottom-sheet"
    >
      <LoadingSpinner size="lg" message="Loading competition..." fullScreen />
    </BottomSheet>
  );
}

interface ErrorStateProps {
  onClose: () => void;
  errorMessage?: string;
}

export function ErrorState({ onClose, errorMessage }: ErrorStateProps) {
  const colors = useThemeColors();

  return (
    <BottomSheet
      visible={true}
      onClose={onClose}
      height="full"
      title="Edit Competition"
      showHandle={false}
      safeAreaTop
      showCloseButton
      testID="edit-competition-bottom-sheet"
    >
      <View style={styles.centerContent}>
        <Icon source="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Unable to load competition
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {errorMessage || 'Competition not found'}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.errorButton, { backgroundColor: colors.primary }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.textOnColored }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
