/**
 * ScoringPairsToggle - Unified toggle component for scoring pairs (Premium feature)
 *
 * Used in admin forms for creating/editing rounds. Provides:
 * - Toggle switch to enable/disable scoring pairs requirement
 * - Optional shuffle button (for edit mode)
 * - Optional team match play info message
 * - Premium locked state with upgrade prompt
 *
 * @example
 * ```tsx
 * // In AddRoundScreen
 * <ScoringPairsToggle
 *   isPremium={isPremium}
 *   scoringPairsRequired={values.scoringPairsRequired}
 *   onToggle={(value) => setFieldValue('scoringPairsRequired', value)}
 *   onUpgradePress={handleUpgradePress}
 *   isTeamMatchPlay={values.gameType === 'team-match-play'}
 *   showDivider
 * />
 *
 * // In EditRoundScreen
 * <ScoringPairsToggle
 *   isPremium={isPremium}
 *   scoringPairsRequired={values.scoringPairsRequired}
 *   onToggle={(value) => setFieldValue('scoringPairsRequired', value)}
 *   onUpgradePress={handleUpgradePress}
 *   onShuffle={handleShuffle}
 *   isShuffling={isShuffling}
 *   containerStyle="card"
 * />
 * ```
 */

import React, { memo } from 'react';
import { View, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export interface ScoringPairsToggleProps {
  /** Current value of scoring pairs toggle */
  scoringPairsRequired: boolean;
  /** Callback when toggle value changes */
  onToggle: (value: boolean) => void;
  /** Callback when upgrade button is pressed (non-premium) */
  onUpgradePress: () => void;
  /** Callback to shuffle scoring pairs (edit mode) */
  onShuffle?: () => void;
  /** Whether shuffle is in progress */
  isShuffling?: boolean;
  /** Whether this is a team match play round (shows info message) */
  isTeamMatchPlay?: boolean;
  /** Whether toggle is disabled */
  disabled?: boolean;
  /** Show divider above component */
  showDivider?: boolean;
  /** Container style - 'card' wraps in bordered container, 'inline' is minimal */
  containerStyle?: 'card' | 'inline';
}

export const ScoringPairsToggle = memo(function ScoringPairsToggle({
  scoringPairsRequired,
  onToggle,
  onUpgradePress,
  onShuffle,
  isShuffling,
  isTeamMatchPlay,
  disabled,
  showDivider,
  containerStyle = 'inline',
}: ScoringPairsToggleProps) {
  const colors = useThemeColors();
  const checkFeature = useCheckFeature();
  const isPremium = checkFeature('scoring_pairs').allowed;

  const content = (
    <>
      {showDivider && (
        <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
      )}

      {isPremium ? (
        <>
          {/* Toggle Row */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryLighter }]}>
                <Icon source="account-switch" size={24} color={colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  Require Scoring Pairs
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  Specify which players score each other
                </Text>
              </View>
            </View>
            <Switch
              value={scoringPairsRequired}
              onValueChange={onToggle}
              trackColor={{ false: colors.gray300, true: colors.primaryLight }}
              thumbColor={scoringPairsRequired ? colors.primary : colors.gray100}
              disabled={disabled}
            />
          </View>

          {/* Team Match Play Info Message */}
          {scoringPairsRequired && isTeamMatchPlay && (
            <View
              style={[styles.infoBox, { backgroundColor: colors.infoLight, marginTop: spacing.md }]}
            >
              <Icon source="information-outline" size={20} color={colors.info} />
              <Text style={[styles.infoText, { color: colors.infoDark }]}>
                Cross-team scoring pairs will be auto-suggested
              </Text>
            </View>
          )}

          {/* Shuffle Button (Edit Mode) */}
          {scoringPairsRequired && onShuffle && (
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
        /* Locked for non-premium */
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={onUpgradePress}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Premium to use scoring pairs"
          activeOpacity={0.7}
        >
          <View style={styles.toggleContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
              <Icon source="lock" size={24} color={colors.gray500} />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Require Scoring Pairs
                </Text>
                <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                  <Text style={[styles.premiumBadgeText, { color: colors.textOnColored }]}>
                    Premium
                  </Text>
                </View>
              </View>
              <Text style={[styles.description, { color: colors.textTertiary }]}>
                Upgrade to Premium to assign designated markers
              </Text>
            </View>
          </View>
          <Icon source="chevron-right" size={24} color={colors.gray400} />
        </TouchableOpacity>
      )}
    </>
  );

  if (containerStyle === 'card') {
    return (
      <View
        style={[
          styles.cardContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Scoring Pairs</Text>
        {content}
      </View>
    );
  }

  return <>{content}</>;
});

const styles = StyleSheet.create({
  // Card container style
  cardContainer: {
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

  // Divider
  divider: {
    marginVertical: spacing.lg,
  },

  // Toggle row
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typography.bodyBold,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  description: {
    ...typography.small,
    marginTop: 2,
  },

  // Premium badge
  premiumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },

  // Info box (team match play)
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },

  // Shuffle button
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

export default ScoringPairsToggle;
