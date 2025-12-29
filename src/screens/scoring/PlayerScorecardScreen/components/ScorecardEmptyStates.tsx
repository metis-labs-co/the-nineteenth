/**
 * ScorecardEmptyStates Component
 *
 * Handles loading, player not found, and no scorecard states
 * for the PlayerScorecardScreen.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSpinner } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface ScorecardLoadingStateProps {
  message?: string;
}

export function ScorecardLoadingState({
  message = 'Loading scorecard...',
}: ScorecardLoadingStateProps) {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.centeredContainer, { backgroundColor: colors.background }]}
    >
      <LoadingSpinner size="lg" message={message} />
    </SafeAreaView>
  );
}

interface ScorecardPlayerNotFoundProps {
  onGoBack: () => void;
}

export function ScorecardPlayerNotFound({
  onGoBack,
}: ScorecardPlayerNotFoundProps) {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.centeredContainer, { backgroundColor: colors.background }]}
    >
      <MaterialCommunityIcons
        name="account-question"
        size={64}
        color={colors.gray400}
      />
      <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
        Player Not Found
      </Text>
      <Text style={[styles.errorText, { color: colors.textSecondary }]}>
        The requested player could not be found in this round.
      </Text>
      <TouchableOpacity
        style={[styles.errorButton, { backgroundColor: colors.primary }]}
        onPress={onGoBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Text style={[styles.errorButtonText, { color: colors.textInverse }]}>
          Go Back
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

interface ScorecardNoScoresProps {
  playerName: string;
  onGoBack: () => void;
}

export function ScorecardNoScores({
  playerName,
  onGoBack,
}: ScorecardNoScoresProps) {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.centeredContainer, { backgroundColor: colors.background }]}
    >
      <MaterialCommunityIcons
        name="card-text-outline"
        size={64}
        color={colors.gray400}
      />
      <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
        No Scores Yet
      </Text>
      <Text style={[styles.errorText, { color: colors.textSecondary }]}>
        {playerName} hasn&apos;t recorded any scores for this round yet.
      </Text>
      <TouchableOpacity
        style={[styles.errorButton, { backgroundColor: colors.primary }]}
        onPress={onGoBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Text style={[styles.errorButtonText, { color: colors.textInverse }]}>
          Go Back
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  errorButtonText: {
    ...typography.bodyBold,
  },
});
