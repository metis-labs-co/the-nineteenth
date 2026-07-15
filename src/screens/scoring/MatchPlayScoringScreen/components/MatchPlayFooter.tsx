/**
 * MatchPlayFooter Component
 *
 * Renders the footer navigation section for match play:
 * - Previous chevron / View Full Scorecard / gradient CTA
 * - CTA is Next Hole while holes remain, Submit Match on the last hole
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows, typography } from '@/constants/theme';

export interface MatchPlayFooterProps {
  currentHole: number;
  /** First and last hole numbers for the round (handles back-9 / combo). */
  firstHoleNumber: number;
  lastHoleNumber: number;
  isMatchComplete: boolean;
  isSubmitting: boolean;
  onPreviousHole: () => void;
  onNextHole: () => void;
  onSubmitMatch: () => void;
  onViewScorecard: () => void;
}

export function MatchPlayFooter({
  currentHole,
  firstHoleNumber,
  lastHoleNumber,
  isMatchComplete,
  isSubmitting,
  onPreviousHole,
  onNextHole,
  onSubmitMatch,
  onViewScorecard,
}: MatchPlayFooterProps) {
  const colors = useThemeColors();

  const canGoPrevious = currentHole > firstHoleNumber;
  // Allow navigation even after match is complete so user can review/edit scores
  const canGoNext = currentHole < lastHoleNumber;

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
            styles.iconNavButton,
            { borderColor: colors.border, backgroundColor: colors.surfaceVariant },
            !canGoPrevious && { opacity: 0.5 },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Previous hole"
        >
          <Icon source="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onViewScorecard}
          style={[
            styles.iconNavButton,
            { borderColor: colors.border, backgroundColor: colors.surfaceVariant },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="View full scorecard"
        >
          <Icon source="clipboard-list-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Show Next Hole when not on last hole, Submit Match on the last hole */}
        {/* Allow navigation even after match complete so user can review/edit */}
        {canGoNext ? (
          <TouchableOpacity
            onPress={onNextHole}
            style={styles.ctaButton}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={[styles.navButtonLabelPrimary, { color: colors.textOnColored }]}>Next Hole</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onSubmitMatch}
            disabled={isSubmitting || !isMatchComplete}
            style={[
              styles.ctaButton,
              (isSubmitting || !isMatchComplete) && { opacity: 0.5 },
            ]}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              {isSubmitting && <ActivityIndicator size="small" color={colors.textOnColored} style={{ marginRight: spacing.sm }} />}
              <Text style={[styles.navButtonLabelPrimary, { color: colors.textOnColored }]}>Submit Match</Text>
            </LinearGradient>
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
    alignItems: 'center',
    gap: spacing.md,
  },
  iconNavButton: {
    width: 52,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonLabelPrimary: {
    ...typography.bodyBold,
  },
});

export default MatchPlayFooter;
