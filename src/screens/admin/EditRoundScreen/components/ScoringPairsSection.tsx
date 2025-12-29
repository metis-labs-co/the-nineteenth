/**
 * ScoringPairsSection - Scoring pairs toggle and shuffle (Premium feature)
 */

import React from 'react';
import { View, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

interface ScoringPairsSectionProps {
  isPremium: boolean;
  scoringPairsRequired: boolean;
  onToggle: (value: boolean) => void;
  onShuffle: () => void;
  onUpgradePress: () => void;
  isSubmitting?: boolean;
  isShuffling?: boolean;
}

export function ScoringPairsSection({
  isPremium,
  scoringPairsRequired,
  onToggle,
  onShuffle,
  onUpgradePress,
  isSubmitting,
  isShuffling,
}: ScoringPairsSectionProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Scoring Pairs
      </Text>

      {isPremium ? (
        <>
          {/* Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleContent}>
              <View style={[styles.toggleIcon, { backgroundColor: colors.primaryLighter }]}>
                <Icon source="account-switch" size={24} color={colors.primary} />
              </View>
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                  Require Scoring Pairs
                </Text>
                <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                  Specify which players score each other
                </Text>
              </View>
            </View>
            <Switch
              value={scoringPairsRequired}
              onValueChange={onToggle}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={scoringPairsRequired ? colors.primary : colors.surfaceVariant}
              disabled={isSubmitting}
            />
          </View>

          {/* Shuffle Button - Only show if scoring pairs are enabled */}
          {scoringPairsRequired && (
            <>
              <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={[styles.shuffleButton, { borderColor: colors.border }]}
                onPress={onShuffle}
                disabled={isShuffling}
                activeOpacity={0.7}
              >
                <Icon
                  source="shuffle-variant"
                  size={20}
                  color={isShuffling ? colors.textDisabled : colors.primary}
                />
                <Text
                  style={[
                    styles.shuffleButtonText,
                    { color: isShuffling ? colors.textDisabled : colors.primary },
                  ]}
                >
                  {isShuffling ? 'Shuffling...' : 'Shuffle Scoring Pairs'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.shuffleHint, { color: colors.textSecondary }]}>
                Clear existing pairs and generate new random assignments
              </Text>
            </>
          )}
        </>
      ) : (
        // Locked for non-premium
        <TouchableOpacity
          style={styles.lockedContainer}
          onPress={onUpgradePress}
          activeOpacity={0.7}
        >
          <View style={styles.toggleContent}>
            <View style={[styles.toggleIcon, { backgroundColor: colors.surfaceVariant }]}>
              <Icon source="lock" size={24} color={colors.textSecondary} />
            </View>
            <View style={styles.toggleTextContainer}>
              <View style={styles.lockedLabelRow}>
                <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                  Require Scoring Pairs
                </Text>
                <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                  <Text style={[styles.premiumBadgeText, { color: colors.textOnColored }]}>
                    Premium
                  </Text>
                </View>
              </View>
              <Text style={[styles.toggleDescription, { color: colors.textTertiary }]}>
                Upgrade to Premium to assign designated markers
              </Text>
            </View>
          </View>
          <Icon source="chevron-right" size={24} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  toggleIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.bodyBold,
  },
  toggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  lockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  premiumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  divider: {
    marginVertical: spacing.md,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  shuffleButtonText: {
    ...typography.bodyBold,
  },
  shuffleHint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
