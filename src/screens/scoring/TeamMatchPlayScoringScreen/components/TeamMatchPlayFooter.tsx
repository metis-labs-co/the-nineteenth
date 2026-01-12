/**
 * TeamMatchPlayFooter Component
 *
 * Renders the footer navigation section for team match play:
 * - Previous/Next hole navigation buttons
 * - Submit Match button when complete
 *
 * Same pattern as MatchPlayFooter.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows, borderRadius, typography } from '@/constants/theme';

export interface TeamMatchPlayFooterProps {
  currentHole: number;
  isMatchComplete: boolean;
  isSubmitting: boolean;
  onPreviousHole: () => void;
  onNextHole: () => void;
  onSubmitMatch: () => void;
}

export function TeamMatchPlayFooter({
  currentHole,
  isMatchComplete,
  isSubmitting,
  onPreviousHole,
  onNextHole,
  onSubmitMatch,
}: TeamMatchPlayFooterProps) {
  const colors = useThemeColors();

  const canGoPrevious = currentHole > 1;
  const canGoNext = currentHole < 18 && !isMatchComplete;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
      ]}
    >
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

        {isMatchComplete ? (
          <Button
            mode="contained"
            onPress={onSubmitMatch}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={[styles.navButton, { backgroundColor: colors.success }]}
            labelStyle={[styles.navButtonLabelPrimary, { color: colors.white }]}
            contentStyle={styles.navButtonContent}
          >
            Submit Match
          </Button>
        ) : canGoNext ? (
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
            disabled={isSubmitting}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    borderTopWidth: 1,
    ...shadows.sm,
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

export default TeamMatchPlayFooter;
