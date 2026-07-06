/**
 * ScorecardEmptyStates Component
 *
 * Handles loading, player not found, and no scorecard states
 * for the PlayerScorecardScreen.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, LoadingSpinner } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';

interface ScorecardLoadingStateProps {
  message?: string;
}

export function ScorecardLoadingState({
  message = 'Loading scorecard...',
}: ScorecardLoadingStateProps) {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ErrorState
        title="Player Not Found"
        error="The requested player could not be found in this round."
        onRetry={onGoBack}
        retryLabel="Go Back"
      />
    </SafeAreaView>
  );
}

interface ScorecardLoadErrorProps {
  onRetry: () => void;
}

export function ScorecardLoadError({ onRetry }: ScorecardLoadErrorProps) {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ErrorState
        title="Couldn't Load Scorecard"
        error="We couldn't load this scorecard. Check your connection and try again."
        onRetry={onRetry}
        retryLabel="Retry"
      />
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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <EmptyState
        title="No Scores Yet"
        message={`${playerName} hasn't recorded any scores for this round yet.`}
        icon="card-text-outline"
        actionLabel="Go Back"
        onAction={onGoBack}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
