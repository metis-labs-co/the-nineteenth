/**
 * ScoringPairsSection - Scoring pairs toggle and configuration
 *
 * Handles the toggle card for enabling/disabling scoring pairs (Premium feature)
 * and renders inline scoring pair formation when enabled.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  IconCheck,
  IconLock,
  IconArrowsExchange,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ScoringPairFormationInline } from '@/components/scoring';
import type { ScoringPairCreateInput } from '@/types';
import type { PlayingPartner } from '../../types';

interface ScoringPairsSectionProps {
  isPremium: boolean;
  scoringPairsEnabled: boolean;
  scoringPairs: ScoringPairCreateInput[];
  selectedPartners: PlayingPartner[];
  onScoringPairsEnabledChange: (enabled: boolean) => void;
  onScoringPairsChange: (pairs: ScoringPairCreateInput[], type: 'reciprocal' | 'circular') => void;
}

export const ScoringPairsSection = memo(function ScoringPairsSection({
  isPremium,
  scoringPairsEnabled,
  scoringPairs,
  selectedPartners,
  onScoringPairsEnabledChange,
  onScoringPairsChange,
}: ScoringPairsSectionProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Premium Toggle */}
      {isPremium ? (
        <TouchableOpacity
          style={[
            styles.scoringPairsToggle,
            {
              backgroundColor: colors.surface,
              borderColor: scoringPairsEnabled ? colors.primary : colors.border,
            },
          ]}
          onPress={() => onScoringPairsEnabledChange(!scoringPairsEnabled)}
          activeOpacity={0.7}
        >
          <View style={styles.scoringPairsToggleContent}>
            <View
              style={[
                styles.scoringPairsIconContainer,
                { backgroundColor: scoringPairsEnabled ? colors.primaryLighter : colors.gray100 },
              ]}
            >
              <IconArrowsExchange
                size={20}
                color={scoringPairsEnabled ? colors.primary : colors.gray400}
              />
            </View>
            <View style={styles.scoringPairsToggleText}>
              <Text style={[styles.scoringPairsToggleLabel, { color: colors.textPrimary }]}>
                Require Scoring Pairs
              </Text>
              <Text style={[styles.scoringPairsToggleDescription, { color: colors.textSecondary }]}>
                Specify which players score each other
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: scoringPairsEnabled ? colors.primary : colors.surface,
                borderColor: scoringPairsEnabled ? colors.primary : colors.gray300,
              },
            ]}
          >
            {scoringPairsEnabled && <IconCheck size={14} color={colors.white} />}
          </View>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.scoringPairsToggle,
            styles.scoringPairsToggleLocked,
            { backgroundColor: colors.gray100, borderColor: colors.gray200 },
          ]}
        >
          <View style={styles.scoringPairsToggleContent}>
            <View style={[styles.scoringPairsIconContainer, { backgroundColor: colors.gray200 }]}>
              <IconLock size={20} color={colors.gray500} />
            </View>
            <View style={styles.scoringPairsToggleText}>
              <View style={styles.scoringPairsLabelRow}>
                <Text style={[styles.scoringPairsToggleLabel, { color: colors.textSecondary }]}>
                  Require Scoring Pairs
                </Text>
                <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                  <Text style={[styles.premiumBadgeText, { color: colors.textOnColored }]}>Premium</Text>
                </View>
              </View>
              <Text style={[styles.scoringPairsToggleDescription, { color: colors.textTertiary }]}>
                Upgrade to Premium to assign designated markers
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Inline Scoring Pair Formation (when enabled) */}
      {scoringPairsEnabled && selectedPartners.length > 0 && (
        <View style={styles.scoringPairsFormation}>
          <ScoringPairFormationInline
            players={[
              // Current user (placeholder - RoundListScreen will add actual user)
              { id: 'current-user', name: 'You' },
              ...selectedPartners.map((p) => ({
                id: p.id,
                name: p.name,
                handicap: p.handicap ?? undefined,
              })),
            ]}
            pairs={scoringPairs}
            onPairsChange={onScoringPairsChange}
          />
        </View>
      )}

      {/* Info for solo rounds with scoring pairs enabled */}
      {scoringPairsEnabled && selectedPartners.length === 0 && (
        <View style={[styles.infoBox, { backgroundColor: colors.infoLight }]}>
          <Text style={[styles.infoText, { color: colors.infoDark }]}>
            Scoring pairs require at least one playing partner
          </Text>
        </View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  scoringPairsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  scoringPairsToggleLocked: {
    opacity: 0.8,
  },
  scoringPairsToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  scoringPairsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoringPairsToggleText: {
    flex: 1,
  },
  scoringPairsToggleLabel: {
    ...typography.bodyBold,
  },
  scoringPairsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoringPairsToggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
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
  scoringPairsFormation: {
    marginTop: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
});
