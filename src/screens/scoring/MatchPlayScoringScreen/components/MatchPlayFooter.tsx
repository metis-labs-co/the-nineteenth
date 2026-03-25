/**
 * MatchPlayFooter Component
 *
 * Renders the footer navigation section for match play:
 * - View Full Scorecard link
 * - Previous/Next hole navigation buttons
 * - Submit Match button when complete
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
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

      {/* Navigation Buttons */}
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

        {/* Show Next Hole when not on last hole, Submit Match on hole 18 */}
        {/* Allow navigation even after match complete so user can review/edit */}
        {canGoNext ? (
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
        ) : (
          <TouchableOpacity
            onPress={onSubmitMatch}
            disabled={isSubmitting || !isMatchComplete}
            style={[
              styles.navButton,
              styles.navButtonContent,
              { backgroundColor: colors.success, flexDirection: 'row' },
              (isSubmitting || !isMatchComplete) && { opacity: 0.5 },
            ]}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            {isSubmitting && <ActivityIndicator size="small" color={colors.white} style={{ marginRight: spacing.sm }} />}
            <Text style={[styles.navButtonLabelPrimary, { color: colors.white }]}>Submit Match</Text>
          </TouchableOpacity>
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

export default MatchPlayFooter;
