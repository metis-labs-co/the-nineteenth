/**
 * MatchPlayFooter Component
 *
 * Renders the footer navigation section for match play:
 * - View Full Scorecard link
 * - Previous/Next hole navigation buttons
 * - Submit Match button when complete
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows, borderRadius, typography } from '@/constants/theme';

export interface MatchPlayFooterProps {
  currentHole: number;
  isMatchComplete: boolean;
  isSubmitting: boolean;
  onPreviousHole: () => void;
  onNextHole: () => void;
  onSubmitMatch: () => void;
  onViewScorecard: () => void;
}

export function MatchPlayFooter({
  currentHole,
  isMatchComplete,
  isSubmitting,
  onPreviousHole,
  onNextHole,
  onSubmitMatch,
  onViewScorecard,
}: MatchPlayFooterProps) {
  const colors = useThemeColors();

  const canGoPrevious = currentHole > 1;
  // Allow navigation even after match is complete so user can review/edit scores
  const canGoNext = currentHole < 18;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
      ]}
    >
      {/* View Full Scorecard Link */}
      <View style={styles.viewScorecardRow}>
        <Button
          mode="text"
          onPress={onViewScorecard}
          style={styles.viewScorecardButton}
          labelStyle={[styles.viewScorecardLabel, { color: colors.primary }]}
          compact
        >
          View Full Scorecard
        </Button>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navButtonsRow}>
        <Button
          mode="outlined"
          onPress={onPreviousHole}
          disabled={!canGoPrevious}
          style={styles.navButton}
          labelStyle={[styles.navButtonLabel, { color: colors.textPrimary }]}
          contentStyle={styles.navButtonContent}
        >
          Previous
        </Button>

        {/* Show Next Hole when not on last hole, Submit Match on hole 18 */}
        {/* Allow navigation even after match complete so user can review/edit */}
        {canGoNext ? (
          <Button
            mode="contained"
            onPress={onNextHole}
            style={[styles.navButton, { backgroundColor: colors.primary }]}
            labelStyle={[styles.navButtonLabelPrimary, { color: colors.white }]}
            contentStyle={styles.navButtonContent}
          >
            Next Hole
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={onSubmitMatch}
            loading={isSubmitting}
            disabled={isSubmitting || !isMatchComplete}
            style={[styles.navButton, { backgroundColor: colors.success }]}
            labelStyle={[styles.navButtonLabelPrimary, { color: colors.white }]}
            contentStyle={styles.navButtonContent}
          >
            Submit Match
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    borderTopWidth: 1,
    ...shadows.sm,
  },
  viewScorecardRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  viewScorecardButton: {
    marginVertical: 0,
  },
  viewScorecardLabel: {
    ...typography.small,
    textDecorationLine: 'underline',
  },
  navButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
  },
  navButtonContent: {
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  navButtonLabel: {
    ...typography.bodyBold,
  },
  navButtonLabelPrimary: {
    ...typography.bodyBold,
  },
});

export default MatchPlayFooter;
