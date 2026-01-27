/**
 * ScorecardFooter Component
 *
 * Renders the footer navigation section:
 * - View Full Scorecard link
 * - Previous/Next hole navigation buttons
 * - Review & Submit button on hole 18 OR when all holes are complete
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
  onViewScorecard: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  /** Whether all holes have been scored */
  isAllComplete?: boolean;
}

export function ScorecardFooter({
  currentHole: _currentHole,
  onPreviousHole,
  onNextHole,
  onViewScorecard,
  canGoPrevious,
  canGoNext,
  isAllComplete = false,
}: ScorecardFooterProps) {
  const colors = useThemeColors();

  // Show review button when on last hole OR when all holes are complete
  const showReviewButton = !canGoNext || isAllComplete;

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

        {showReviewButton ? (
          <>
            {/* Show Next Hole button if not on last hole */}
            {canGoNext && (
              <Button
                mode="outlined"
                onPress={onNextHole}
                style={styles.navButton}
                labelStyle={[styles.navButtonLabel, { color: colors.textPrimary }]}
                contentStyle={styles.navButtonContent}
              >
                Next Hole
              </Button>
            )}
            <Button
              mode="contained"
              onPress={onViewScorecard}
              style={[styles.navButton, { backgroundColor: colors.success }]}
              labelStyle={[styles.navButtonLabelPrimary, { color: colors.white }]}
              contentStyle={styles.navButtonContent}
            >
              Review Scores
            </Button>
          </>
        ) : (
          <Button
            mode="contained"
            onPress={onNextHole}
            style={[styles.navButton, { backgroundColor: colors.primary }]}
            labelStyle={[styles.navButtonLabelPrimary, { color: colors.white }]}
            contentStyle={styles.navButtonContent}
          >
            Next Hole
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
