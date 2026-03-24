/**
 * ScorecardFooter Component
 *
 * Renders the footer navigation section:
 * - View Full Scorecard link
 * - Previous/Next hole navigation buttons
 * - Review & Submit button on hole 18 OR when all holes are complete
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
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
        <TouchableOpacity
          onPress={onViewScorecard}
          style={styles.viewScorecardButton}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={[styles.viewScorecardLabel, { color: colors.primary }]}>
            View Full Scorecard
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.navButtonsRow}>
        <TouchableOpacity
          onPress={onPreviousHole}
          disabled={!canGoPrevious}
          style={[
            styles.navButton,
            styles.navButtonContent,
            { borderWidth: 1, borderColor: colors.border },
            !canGoPrevious && { opacity: 0.5 },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={[styles.navButtonLabel, { color: colors.textPrimary }]}>Previous</Text>
        </TouchableOpacity>

        {showReviewButton ? (
          <>
            {/* Show Next Hole button if not on last hole */}
            {canGoNext && (
              <TouchableOpacity
                onPress={onNextHole}
                style={[
                  styles.navButton,
                  styles.navButtonContent,
                  { borderWidth: 1, borderColor: colors.border },
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={[styles.navButtonLabel, { color: colors.textPrimary }]}>Next Hole</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onViewScorecard}
              style={[
                styles.navButton,
                styles.navButtonContent,
                { backgroundColor: colors.success },
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={[styles.navButtonLabelPrimary, { color: colors.white }]}>Review Scores</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={onNextHole}
            style={[
              styles.navButton,
              styles.navButtonContent,
              { backgroundColor: colors.primary },
            ]}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={[styles.navButtonLabelPrimary, { color: colors.white }]}>Next Hole</Text>
          </TouchableOpacity>
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
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonLabel: {
    ...typography.bodyBold,
  },
  navButtonLabelPrimary: {
    ...typography.bodyBold,
  },
});
