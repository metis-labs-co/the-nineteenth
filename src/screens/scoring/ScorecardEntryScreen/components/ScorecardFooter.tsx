/**
 * ScorecardFooter Component
 *
 * Renders the footer navigation section:
 * - View Full Scorecard link
 * - Previous/Next hole navigation buttons
 * - Review & Submit button on hole 18
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows, borderRadius } from '@/constants/theme';

export interface ScorecardFooterProps {
  currentHole: number;
  onPreviousHole: () => void;
  onNextHole: () => void;
  onSubmit: () => void;
  onViewScorecard: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function ScorecardFooter({
  currentHole,
  onPreviousHole,
  onNextHole,
  onSubmit,
  onViewScorecard,
  canGoPrevious,
  canGoNext,
}: ScorecardFooterProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.navigationContainer,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
      ]}
    >
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
            onPress={onSubmit}
            style={[styles.navButton, { backgroundColor: colors.success }]}
            labelStyle={[styles.navButtonLabelPrimary, { color: colors.white }]}
            contentStyle={styles.navButtonContent}
          >
            Review & Submit
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navigationContainer: {
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
