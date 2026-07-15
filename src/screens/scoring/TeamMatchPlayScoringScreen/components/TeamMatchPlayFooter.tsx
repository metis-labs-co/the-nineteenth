/**
 * TeamMatchPlayFooter Component
 *
 * Renders the footer navigation section for team match play:
 * - Previous/Next hole chevron buttons
 * - View scorecard button
 * - Gradient Next Hole / Submit Match action button
 *
 * Same pattern as MatchPlayFooter.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows, typography } from '@/constants/theme';

export interface TeamMatchPlayFooterProps {
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

export function TeamMatchPlayFooter({
  currentHole,
  firstHoleNumber,
  lastHoleNumber,
  isMatchComplete,
  isSubmitting,
  onPreviousHole,
  onNextHole,
  onSubmitMatch,
  onViewScorecard,
}: TeamMatchPlayFooterProps) {
  const colors = useThemeColors();

  const canGoPrevious = currentHole > firstHoleNumber;
  const canGoNext = currentHole < lastHoleNumber && !isMatchComplete;

  const gradientColors: [string, string] = [colors.primaryLight, colors.primary];

  const renderPrimaryAction = (label: string) => (
    <TouchableOpacity
      onPress={onSubmitMatch}
      disabled={isSubmitting}
      style={[styles.primaryButton, isSubmitting && { opacity: 0.5 }]}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryGradient}
      >
        {isSubmitting && (
          <ActivityIndicator
            size="small"
            color={colors.white}
            style={{ marginRight: spacing.sm }}
          />
        )}
        <Text style={[styles.primaryButtonLabel, { color: colors.white }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
      ]}
    >
      <View style={styles.navButtonsRow}>
        {/* Previous hole chevron */}
        <TouchableOpacity
          onPress={onPreviousHole}
          disabled={!canGoPrevious}
          style={[
            styles.chevronButton,
            { borderColor: colors.border, backgroundColor: colors.surfaceVariant },
            !canGoPrevious && { opacity: 0.5 },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Previous"
        >
          <Icon source="chevron-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* View scorecard */}
        <TouchableOpacity
          onPress={onViewScorecard}
          style={[
            styles.chevronButton,
            { borderColor: colors.border, backgroundColor: colors.surfaceVariant },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="View full scorecard"
        >
          <Icon source="clipboard-list-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Primary action: Next Hole while the match is live, Submit Match otherwise */}
        {isMatchComplete ? (
          renderPrimaryAction('Submit Match')
        ) : canGoNext ? (
          <TouchableOpacity
            onPress={onNextHole}
            style={styles.primaryButton}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryGradient}
            >
              <Text style={[styles.primaryButtonLabel, { color: colors.white }]}>
                Next Hole
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          renderPrimaryAction('Submit Match')
        )}

        {/* Next hole chevron */}
        <TouchableOpacity
          onPress={onNextHole}
          disabled={!canGoNext}
          style={[
            styles.chevronButton,
            { borderColor: colors.border, backgroundColor: colors.surfaceVariant },
            !canGoNext && { opacity: 0.5 },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Next Hole"
        >
          <Icon source="chevron-right" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    borderTopWidth: 1,
    ...shadows.sm,
  },
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chevronButton: {
    width: 52,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryGradient: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    ...typography.bodyBold,
  },
});

export default TeamMatchPlayFooter;
