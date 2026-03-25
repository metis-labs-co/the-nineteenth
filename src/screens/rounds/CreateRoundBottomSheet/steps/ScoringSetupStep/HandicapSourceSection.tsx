/**
 * HandicapSourceSection - Handicap mode selector for round creation
 *
 * Allows Premium users to choose between GA Handicap and Social Handicap Index
 * for daily handicap calculations. Locked for Free tier users.
 *
 * When tee and course data is provided, also displays:
 * - The selected handicap value (GA or Social Index)
 * - The calculated Daily Handicap based on the selected course/tee
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { SegmentedButton, Pill } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { getBaseHandicap } from '@/utils/scorecardCalculations';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import type { TeeBox } from '@/types/database.types';
import type { HandicapSource, Hole } from '@/types/database';

interface HandicapSourceSectionProps {
  handicapSource: HandicapSource;
  onHandicapSourceChange: (source: HandicapSource) => void;
  /** Selected tee for daily handicap calculation */
  selectedTee?: TeeBox | null;
  /** Course holes for par calculation (passed directly to avoid async fetch) */
  holes?: Hole[] | null;
}

export const HandicapSourceSection = memo(function HandicapSourceSection({
  handicapSource,
  onHandicapSourceChange,
  selectedTee,
  holes,
}: HandicapSourceSectionProps) {
  const colors = useThemeColors();
  const isPremium = useIsPremium();
  const { player } = useAuth();

  // Calculate handicap values
  const handicapInfo = useMemo(() => {
    if (!player) return null;

    const gaHandicap = player.handicap ?? null;
    const socialIndex = player.handicap_index ?? null;

    // Get the base handicap for the selected source
    const baseHandicap = getBaseHandicap(
      player as Parameters<typeof getBaseHandicap>[0],
      handicapSource
    );

    // Calculate daily handicap if tee data and holes are available
    let dailyHandicap: number | null = null;
    if (
      selectedTee?.slopeRating &&
      selectedTee?.courseRating &&
      holes?.length
    ) {
      const coursePar = holes.reduce((sum, h) => sum + h.par, 0);
      if (coursePar > 0) {
        const result = calculateGADailyHandicap({
          gaHandicap: baseHandicap,
          slopeRating: selectedTee.slopeRating,
          courseRating: selectedTee.courseRating,
          par: coursePar,
          gender: player.gender,
        });
        dailyHandicap = result.dailyHandicap;
      }
    }

    return {
      gaHandicap,
      socialIndex,
      baseHandicap,
      dailyHandicap,
    };
  }, [player, handicapSource, selectedTee, holes]);

  const hintText = handicapSource === 'calculated'
    ? 'Uses Social Handicap Index from your app rounds (profile handicap fallback)'
    : 'Uses your handicap as entered in your profile';

  // Format handicap display value
  const formatHandicap = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return value >= 0 ? value.toFixed(1) : `+${Math.abs(value).toFixed(1)}`;
  };

  if (!isPremium) {
    return (
      <View style={[styles.container, styles.lockedContainer, { backgroundColor: colors.gray100, borderColor: colors.gray200 }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
            <Icon source="golf-tee" size={18} color={colors.gray500} />
          </View>
          <View style={styles.labelContainer}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.gray500 }]}>Handicap Mode</Text>
              <Pill label="Premium" variant="warning" size="sm" />
            </View>
            <Text style={[styles.hint, { color: colors.gray400 }]}>
              Upgrade to choose between your handicap and Social Index
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <Icon source="golf-tee" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Handicap Mode</Text>
      </View>

      <SegmentedButton
        value={handicapSource}
        onValueChange={(value) => onHandicapSourceChange(value as HandicapSource)}
        buttons={[
          {
            value: 'profile',
            label: `Handicap${handicapInfo?.gaHandicap != null ? ` (${formatHandicap(handicapInfo.gaHandicap)})` : ''}`,
            icon: 'card-account-details',
          },
          {
            value: 'calculated',
            label: `Social Index${handicapInfo?.socialIndex != null ? ` (${formatHandicap(handicapInfo.socialIndex)})` : ''}`,
            icon: 'calculator',
          },
        ]}
        size="medium"
      />

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {hintText}
      </Text>

      {/* Daily Handicap display */}
      {handicapInfo && handicapInfo.dailyHandicap !== null && (
        <View style={[styles.dailyHandicapRow, { backgroundColor: colors.primaryLighter }]}>
          <Icon source="calculator-variant" size={16} color={colors.primary} />
          <View style={styles.dailyHandicapText}>
            <Text style={[styles.dailyHandicapLabel, { color: colors.primary }]}>
              Daily Handicap
            </Text>
            <Text style={[styles.dailyHandicapHint, { color: colors.textSecondary }]}>
              {selectedTee?.name} tees · Slope {selectedTee?.slopeRating} · CR {selectedTee?.courseRating}
            </Text>
          </View>
          <Text style={[styles.dailyHandicapValue, { color: colors.primary }]}>
            {handicapInfo.dailyHandicap}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  lockedContainer: {
    opacity: 0.8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyBold,
  },
  hint: {
    ...typography.small,
    lineHeight: 18,
  },
  dailyHandicapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  dailyHandicapText: {
    flex: 1,
  },
  dailyHandicapLabel: {
    ...typography.smallBold,
  },
  dailyHandicapHint: {
    ...typography.caption,
    lineHeight: 16,
  },
  dailyHandicapValue: {
    ...typography.h3,
  },
});
