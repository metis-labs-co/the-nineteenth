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
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows, borderRadius, typography } from '@/constants/theme';

export interface TeamMatchPlayFooterProps {
  currentHole: number;
  isMatchComplete: boolean;
  isSubmitting: boolean;
  onPreviousHole: () => void;
  onNextHole: () => void;
  onSubmitMatch: () => void;
  onViewScorecard: () => void;
}

export function TeamMatchPlayFooter({
  currentHole,
  isMatchComplete,
  isSubmitting,
  onPreviousHole,
  onNextHole,
  onSubmitMatch,
  onViewScorecard,
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

        <TouchableOpacity
          onPress={onViewScorecard}
          style={[
            styles.iconNavButton,
            styles.navButtonContent,
            { borderWidth: 1, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="View full scorecard"
        >
          <Icon source="clipboard-list-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {isMatchComplete ? (
          <TouchableOpacity
            onPress={onSubmitMatch}
            disabled={isSubmitting}
            style={[
              styles.navButton,
              styles.navButtonContent,
              { backgroundColor: colors.success, flexDirection: 'row' },
              isSubmitting && { opacity: 0.5 },
            ]}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            {isSubmitting && <ActivityIndicator size="small" color={colors.white} style={{ marginRight: spacing.sm }} />}
            <Text style={[styles.navButtonLabelPrimary, { color: colors.white }]}>Submit Match</Text>
          </TouchableOpacity>
        ) : canGoNext ? (
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
            disabled={isSubmitting}
            style={[
              styles.navButton,
              styles.navButtonContent,
              { backgroundColor: colors.success, flexDirection: 'row' },
              isSubmitting && { opacity: 0.5 },
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
  navButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
  },
  iconNavButton: {
    width: 56,
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

export default TeamMatchPlayFooter;
