/**
 * ScoringSetupStep - Fifth step in the create round wizard
 *
 * Features:
 * - Display summary of selections
 * - Configure scoring pairs (Premium feature)
 * - Start the round
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  IconGolf,
  IconCheck,
  IconLock,
  IconArrowsExchange,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ScoringPairFormationInline } from '@/components/scoring';
import type { TeeBox, GameType } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';
import type { SelectedCourse, PlayingPartner } from '../types';
import { MATCH_TYPES } from '../types';

interface ScoringSetupStepProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType;
  selectedPartners: PlayingPartner[];
  isPremium: boolean;
  scoringPairsEnabled: boolean;
  scoringPairs: ScoringPairCreateInput[];
  onScoringPairsEnabledChange: (enabled: boolean) => void;
  onScoringPairsChange: (pairs: ScoringPairCreateInput[], type: 'reciprocal' | 'circular') => void;
  onStartScoring: () => void;
}

export const ScoringSetupStep = memo(function ScoringSetupStep({
  selectedCourse,
  selectedTee,
  selectedMatchType,
  selectedPartners,
  isPremium,
  scoringPairsEnabled,
  scoringPairs,
  onScoringPairsEnabledChange,
  onScoringPairsChange,
  onStartScoring,
}: ScoringSetupStepProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Selected Course & Partners Banner */}
      <View style={[styles.selectedBanner, { backgroundColor: colors.primaryLighter }]}>
        <IconGolf size={20} color={colors.primary} />
        <View style={styles.selectedBannerText}>
          <Text style={[styles.selectedBannerName, { color: colors.primaryDark }]}>
            {selectedCourse?.courseName}
            {selectedTee && (
              <Text style={{ color: colors.primary }}> · {selectedTee.name}</Text>
            )}
          </Text>
          <Text style={[styles.selectedBannerLocation, { color: colors.primary }]}>
            {MATCH_TYPES.find((m) => m.value === selectedMatchType)?.label}
            {' · '}
            {selectedPartners.length + 1} players
          </Text>
        </View>
      </View>

      {/* Scoring Pairs Toggle - Premium Feature */}
      <View style={styles.scoringSetupContainer}>
        <Text style={[styles.scoringSetupTitle, { color: colors.textSecondary }]}>
          Scoring Configuration
        </Text>

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
                    <Text style={styles.premiumBadgeText}>Premium</Text>
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
                  handicap: p.handicap,
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
      </View>

      {/* Start Scoring Button */}
      <View
        style={[styles.buttonContainer, { borderTopColor: colors.border, backgroundColor: colors.white }]}
      >
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: colors.primary }]}
          onPress={onStartScoring}
          activeOpacity={0.8}
        >
          <IconGolf size={20} color={colors.white} />
          <Text style={[styles.startButtonText, { color: colors.white }]}>
            {selectedPartners.length > 0
              ? `Start Scoring (${selectedPartners.length + 1} players)`
              : 'Start Solo Round'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  selectedBannerText: {
    flex: 1,
  },
  selectedBannerName: {
    ...typography.bodyBold,
  },
  selectedBannerLocation: {
    ...typography.caption,
  },
  scoringSetupContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scoringSetupTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
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
    color: '#ffffff',
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
  buttonContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  startButtonText: {
    ...typography.bodyBold,
  },
});
