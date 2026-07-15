/**
 * ScorecardFooter Component
 *
 * Renders the footer navigation section (Score & Round redesign):
 * - 52x50 bordered previous / next chevron buttons
 * - Flexible gradient-green "Review" CTA (opens the full scorecard)
 * - Optional camera button that opens the round's photos
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows } from '@/constants/theme';

export interface ScorecardFooterProps {
  currentHole: number;
  onPreviousHole: () => void;
  onNextHole: () => void;
  onViewScorecard: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  /** Whether all holes have been scored */
  isAllComplete?: boolean;
  /** When provided, renders a camera button that opens the round's photos. */
  onAddPhotos?: () => void;
}

export function ScorecardFooter({
  currentHole: _currentHole,
  onPreviousHole,
  onNextHole,
  onViewScorecard,
  canGoPrevious,
  canGoNext,
  // The Review CTA is now always visible in the centre of the footer, so the
  // conditional full-width "Review Scores" row this flag used to gate is gone.
  isAllComplete: _isAllComplete = false,
  onAddPhotos,
}: ScorecardFooterProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.navigationContainer,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
      ]}
    >
      <View style={styles.navButtonsRow}>
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
          <Icon source="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onViewScorecard}
          style={styles.reviewButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="View full scorecard"
        >
          <LinearGradient
            colors={[colors.primaryLight, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reviewGradient}
          >
            <Text style={[styles.reviewLabel, { color: colors.white }]}>Review</Text>
          </LinearGradient>
        </TouchableOpacity>

        {onAddPhotos ? (
          <TouchableOpacity
            onPress={onAddPhotos}
            style={[
              styles.chevronButton,
              { borderColor: colors.border, backgroundColor: colors.surfaceVariant },
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add round photos"
          >
            <Icon source="camera-plus-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}

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
          <Icon source="chevron-right" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navigationContainer: {
    padding: spacing.lg,
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
  reviewButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  reviewGradient: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewLabel: {
    ...typography.bodyBold,
    fontSize: 15,
  },
});
