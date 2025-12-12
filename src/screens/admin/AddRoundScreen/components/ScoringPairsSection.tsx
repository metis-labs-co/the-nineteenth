/**
 * ScoringPairsSection - Scoring pairs toggle (Premium feature)
 */

import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface ScoringPairsSectionProps {
  isPremium: boolean;
  scoringPairsRequired: boolean;
  isTeamMatchPlay: boolean;
  onToggle: (value: boolean) => void;
  onUpgradePress: () => void;
  disabled?: boolean;
}

export const ScoringPairsSection = memo(function ScoringPairsSection({
  isPremium,
  scoringPairsRequired,
  isTeamMatchPlay,
  onToggle,
  onUpgradePress,
  disabled,
}: ScoringPairsSectionProps) {
  const colors = useThemeColors();

  return (
    <>
      <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

      {isPremium ? (
        <>
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

          {/* Cross-team scoring pairs info message */}
          {scoringPairsRequired && isTeamMatchPlay && (
            <View style={[styles.infoBox, { backgroundColor: colors.infoLight, marginTop: spacing.md }]}>
              <Icon source="information-outline" size={20} color={colors.info} />
              <Text style={[styles.infoText, { color: colors.infoDark }]}>
                Cross-team scoring pairs will be auto-suggested
              </Text>
            </View>
          )}
        </>
      ) : (
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
                  <Text style={[styles.premiumBadgeText, { color: colors.textOnColored }]}>Premium</Text>
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
});

const styles = StyleSheet.create({
  divider: {
    marginVertical: spacing.lg,
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
  premiumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
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
});
