/**
 * OptionsStep - Step 3: Scoring Pairs, Skins, Wolf
 *
 * Uses checkbox-style toggle cards (same pattern as CreateRoundBottomSheet/ScoringSetupStep)
 *
 * Note: Bottom sheets are rendered at the parent (AddRoundScreen) level to avoid
 * z-index issues with the ScrollView container.
 */

import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import {
  IconArrowsExchange,
  IconDice,
  IconDog,
  IconLock,
  IconCheck,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, skinsColor, wolfColor } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { Pill } from '@/components/common';
import type { SkinsConfig } from '@/types';
import type { WolfConfig } from '@/types/database/wolf.types';
import type {
  BracketSeedingStyle,
  PairingSource,
  QualifyingMetric,
} from '@/types/database/enums';

interface OptionsStepProps {
  // Scoring pairs
  scoringPairsRequired: boolean;
  isTeamMatchPlay: boolean;
  onScoringPairsToggle: (value: boolean) => void;

  // Standings-driven pairing (1v1 match-play presets only)
  /** Whether the selected preset can opt into standings-based pairing. */
  supportsStandingsPairing: boolean;
  pairingSource: PairingSource;
  pairingStyle: BracketSeedingStyle;
  pairingMetric: QualifyingMetric;
  onPairingSourceToggle: (enabled: boolean) => void;
  onPairingStyleChange: (style: BracketSeedingStyle) => void;
  onPairingMetricChange: (metric: QualifyingMetric) => void;

  // Skins
  skinsEnabled: boolean;
  skinsConfig: SkinsConfig | null;
  onSkinsTogglePress: () => void;
  onSkinsEditPress: () => void;
  canEnableSkins: boolean;
  skinsDisabledReason: string | null;

  // Wolf
  wolfEnabled: boolean;
  wolfConfig: WolfConfig | null;
  isTeamRound: boolean;
  onWolfTogglePress: () => void;
  onWolfEditPress: () => void;
  canEnableWolf: boolean;
  wolfDisabledReason: string | null;

  // Common
  disabled: boolean;
  supportsTeams: boolean;
  competitionPlayerCount: number;
  onUpgradePress: () => void;
}

export const OptionsStep = memo(function OptionsStep({
  scoringPairsRequired,
  isTeamMatchPlay,
  onScoringPairsToggle,
  supportsStandingsPairing,
  pairingSource,
  pairingStyle,
  pairingMetric,
  onPairingSourceToggle,
  onPairingStyleChange,
  onPairingMetricChange,
  skinsEnabled,
  skinsConfig,
  onSkinsTogglePress,
  onSkinsEditPress,
  canEnableSkins,
  skinsDisabledReason,
  wolfEnabled,
  wolfConfig,
  isTeamRound,
  onWolfTogglePress,
  onWolfEditPress,
  canEnableWolf,
  wolfDisabledReason,
  disabled,
  supportsTeams,
  competitionPlayerCount: _competitionPlayerCount,
  onUpgradePress: _onUpgradePress,
}: OptionsStepProps) {
  const colors = useThemeColors();
  const checkFeature = useCheckFeature();
  const isPremium = checkFeature('scoring_pairs').allowed;
  const isPremiumSkins = checkFeature('skins_game').allowed;
  const isPremiumWolf = checkFeature('wolf_game').allowed;

  const pairingStandingsOn = pairingSource === 'current_standings';

  return (
    <View style={styles.container}>
      {/* Section Title */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Scoring Configuration
      </Text>

      {/* ===== Standings-Driven Pairings (1v1 match-play presets only) ===== */}
      {supportsStandingsPairing && (
        <>
          <TouchableOpacity
            style={[
              styles.toggleCard,
              {
                backgroundColor: colors.surface,
                borderColor: pairingStandingsOn ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onPairingSourceToggle(!pairingStandingsOn)}
            activeOpacity={0.7}
            disabled={disabled}
            accessibilityRole="switch"
            accessibilityState={{ checked: pairingStandingsOn }}
            accessibilityLabel={
              pairingStandingsOn
                ? 'Disable auto-pair from current standings'
                : 'Enable auto-pair from current standings'
            }
          >
            <View style={styles.toggleContent}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: pairingStandingsOn
                      ? colors.primaryLighter
                      : colors.gray100,
                  },
                ]}
              >
                <IconArrowsExchange
                  size={20}
                  color={pairingStandingsOn ? colors.primary : colors.gray400}
                />
              </View>
              <View style={styles.toggleText}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                  Auto-pair from current standings
                </Text>
                <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                  Pairings are generated from the cumulative individual leaderboard
                  of completed prior rounds.
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: pairingStandingsOn ? colors.primary : colors.surface,
                  borderColor: pairingStandingsOn ? colors.primary : colors.gray300,
                },
              ]}
            >
              {pairingStandingsOn && <IconCheck size={14} color={colors.white} />}
            </View>
          </TouchableOpacity>

          {pairingStandingsOn && (
            <View style={styles.pairingConfigBox}>
              {/* Style picker */}
              <Text style={[styles.pairingFieldLabel, { color: colors.textSecondary }]}>
                Pairing style
              </Text>
              <View style={styles.pairingChipRow}>
                {(['standard', 'adjacent'] as const).map((style) => {
                  const selected = pairingStyle === style;
                  return (
                    <TouchableOpacity
                      key={style}
                      style={[
                        styles.pairingChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.surface,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => onPairingStyleChange(style)}
                      disabled={disabled}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={
                        style === 'standard'
                          ? 'Standard pairing style'
                          : 'Adjacent pairing style'
                      }
                    >
                      <Text
                        style={[
                          styles.pairingChipLabel,
                          { color: selected ? colors.white : colors.textPrimary },
                        ]}
                      >
                        {style === 'standard'
                          ? 'Standard (1 vs N, 2 vs N-1…)'
                          : 'Adjacent (1 vs 2, 3 vs 4…)'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Metric picker */}
              <Text
                style={[
                  styles.pairingFieldLabel,
                  { color: colors.textSecondary, marginTop: spacing.md },
                ]}
              >
                Standings metric
              </Text>
              <View style={styles.pairingChipColumn}>
                {(
                  [
                    ['competition_points', 'Competition points'],
                    ['stableford_points', 'Stableford points'],
                    ['net_strokes', 'Net strokes'],
                  ] as const
                ).map(([metric, label]) => {
                  const selected = pairingMetric === metric;
                  return (
                    <TouchableOpacity
                      key={metric}
                      style={[
                        styles.pairingChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.surface,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => onPairingMetricChange(metric)}
                      disabled={disabled}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Use ${label} for standings`}
                    >
                      <Text
                        style={[
                          styles.pairingChipLabel,
                          { color: selected ? colors.white : colors.textPrimary },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: colors.infoLight, marginTop: spacing.md },
                ]}
              >
                <Icon source="information-outline" size={20} color={colors.info} />
                <Text style={[styles.infoText, { color: colors.infoDark }]}>
                  Pairings are generated when the round is created. Needs at least
                  one completed prior round in this competition.
                </Text>
              </View>
            </View>
          )}

          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
        </>
      )}

      {/* ===== Scoring Pairs Toggle ===== */}
      {isPremium ? (
        <TouchableOpacity
          style={[
            styles.toggleCard,
            {
              backgroundColor: colors.surface,
              borderColor: scoringPairsRequired ? colors.primary : colors.border,
            },
          ]}
          onPress={() => onScoringPairsToggle(!scoringPairsRequired)}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <View style={styles.toggleContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: scoringPairsRequired ? colors.primaryLighter : colors.gray100 },
              ]}
            >
              <IconArrowsExchange
                size={20}
                color={scoringPairsRequired ? colors.primary : colors.gray400}
              />
            </View>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                Require Scoring Pairs
              </Text>
              <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                Specify which players score each other
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: scoringPairsRequired ? colors.primary : colors.surface,
                borderColor: scoringPairsRequired ? colors.primary : colors.gray300,
              },
            ]}
          >
            {scoringPairsRequired && <IconCheck size={14} color={colors.white} />}
          </View>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.toggleCard,
            styles.toggleCardLocked,
            { backgroundColor: colors.gray100, borderColor: colors.gray200 },
          ]}
        >
          <View style={styles.toggleContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
              <IconLock size={20} color={colors.gray500} />
            </View>
            <View style={styles.toggleText}>
              <View style={styles.labelRow}>
                <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                  Require Scoring Pairs
                </Text>
                <Pill label="Premium" variant="warning" filled size="sm" />
              </View>
              <Text style={[styles.toggleDescription, { color: colors.textTertiary }]}>
                Upgrade to Premium to assign designated markers
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Team Match Play Info */}
      {scoringPairsRequired && isTeamMatchPlay && (
        <View style={[styles.infoBox, { backgroundColor: colors.infoLight }]}>
          <Icon source="information-outline" size={20} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.infoDark }]}>
            Cross-team scoring pairs will be auto-suggested
          </Text>
        </View>
      )}

      {/* Divider */}
      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* ===== Skins Game Toggle ===== */}
      {/* Locked: Not enough players */}
      {!canEnableSkins && isPremiumSkins ? (
        <View
          style={[
            styles.toggleCard,
            styles.toggleCardLocked,
            { backgroundColor: colors.gray100, borderColor: colors.gray200 },
          ]}
        >
          <View style={styles.toggleContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
              <IconLock size={20} color={colors.gray500} />
            </View>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                Add Skins Game
              </Text>
              <Text style={[styles.toggleDescription, { color: colors.textTertiary }]}>
                {skinsDisabledReason}
              </Text>
            </View>
          </View>
        </View>
      ) : isPremiumSkins ? (
        <TouchableOpacity
          style={[
            styles.toggleCard,
            {
              backgroundColor: colors.surface,
              borderColor: skinsEnabled ? skinsColor : colors.border,
            },
          ]}
          onPress={onSkinsTogglePress}
          activeOpacity={0.7}
          disabled={disabled}
          accessibilityRole="switch"
          accessibilityState={{ checked: skinsEnabled }}
          accessibilityLabel={skinsEnabled ? 'Skins game enabled' : 'Enable skins game'}
        >
          <View style={styles.toggleContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: skinsEnabled ? `${skinsColor}20` : colors.gray100 },
              ]}
            >
              <IconDice size={20} color={skinsEnabled ? skinsColor : colors.gray400} />
            </View>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                Add Skins Game
              </Text>
              <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                Hole-by-hole betting between players
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: skinsEnabled ? skinsColor : colors.surface,
                borderColor: skinsEnabled ? skinsColor : colors.gray300,
              },
            ]}
          >
            {skinsEnabled && <IconCheck size={14} color={colors.white} />}
          </View>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.toggleCard,
            styles.toggleCardLocked,
            { backgroundColor: colors.gray100, borderColor: colors.gray200 },
          ]}
        >
          <View style={styles.toggleContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
              <IconLock size={20} color={colors.gray500} />
            </View>
            <View style={styles.toggleText}>
              <View style={styles.labelRow}>
                <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                  Add Skins Game
                </Text>
                <Pill label="Premium" variant="warning" filled size="sm" />
              </View>
              <Text style={[styles.toggleDescription, { color: colors.textTertiary }]}>
                Upgrade to Premium for skins betting
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Skins Config Summary */}
      {skinsEnabled && skinsConfig && (
        <TouchableOpacity
          style={[
            styles.configSummary,
            { backgroundColor: `${skinsColor}10`, borderColor: `${skinsColor}40` },
          ]}
          onPress={onSkinsEditPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Edit skins configuration"
        >
          <View style={styles.configSummaryContent}>
            <View style={styles.configRow}>
              <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Pot:</Text>
              <Text style={[styles.configValue, { color: colors.textPrimary }]}>
                ${skinsConfig.pot_value}
                {skinsConfig.pot_type === 'per_hole' ? '/hole' : ' total'}
              </Text>
            </View>
            <View style={styles.configRow}>
              <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Scoring:</Text>
              <Text style={[styles.configValue, { color: colors.textPrimary }]}>
                {skinsConfig.scoring_type === 'gross' ? 'Gross' : 'Net (with handicap)'}
              </Text>
            </View>
          </View>
          <Text style={[styles.configTapHint, { color: skinsColor }]}>Tap to edit</Text>
        </TouchableOpacity>
      )}

      {/* ===== Wolf Game Toggle (only for non-team rounds) ===== */}
      {!isTeamRound && (
        <>
          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Locked: Not enough players or too many players */}
          {!canEnableWolf && isPremiumWolf ? (
            <View
              style={[
                styles.toggleCard,
                styles.toggleCardLocked,
                { backgroundColor: colors.gray100, borderColor: colors.gray200 },
              ]}
            >
              <View style={styles.toggleContent}>
                <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
                  <IconLock size={20} color={colors.gray500} />
                </View>
                <View style={styles.toggleText}>
                  <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                    Add Wolf Game
                  </Text>
                  <Text style={[styles.toggleDescription, { color: colors.textTertiary }]}>
                    {wolfDisabledReason}
                  </Text>
                </View>
              </View>
            </View>
          ) : isPremiumWolf ? (
            <TouchableOpacity
              style={[
                styles.toggleCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: wolfEnabled ? wolfColor : colors.border,
                },
              ]}
              onPress={onWolfTogglePress}
              activeOpacity={0.7}
              disabled={disabled}
              accessibilityRole="switch"
              accessibilityState={{ checked: wolfEnabled }}
              accessibilityLabel={wolfEnabled ? 'Wolf game enabled' : 'Enable wolf game'}
            >
              <View style={styles.toggleContent}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: wolfEnabled ? `${wolfColor}20` : colors.gray100 },
                  ]}
                >
                  <IconDog size={20} color={wolfEnabled ? wolfColor : colors.gray400} />
                </View>
                <View style={styles.toggleText}>
                  <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                    Add Wolf Game
                  </Text>
                  <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                    Strategic partner selection side-game
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: wolfEnabled ? wolfColor : colors.surface,
                    borderColor: wolfEnabled ? wolfColor : colors.gray300,
                  },
                ]}
              >
                {wolfEnabled && <IconCheck size={14} color={colors.white} />}
              </View>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.toggleCard,
                styles.toggleCardLocked,
                { backgroundColor: colors.gray100, borderColor: colors.gray200 },
              ]}
            >
              <View style={styles.toggleContent}>
                <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
                  <IconLock size={20} color={colors.gray500} />
                </View>
                <View style={styles.toggleText}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                      Add Wolf Game
                    </Text>
                    <Pill label="Premium" variant="warning" filled size="sm" />
                  </View>
                  <Text style={[styles.toggleDescription, { color: colors.textTertiary }]}>
                    Upgrade to Premium for Wolf side-game
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Wolf Config Summary */}
          {wolfEnabled && wolfConfig && (
            <TouchableOpacity
              style={[
                styles.configSummary,
                { backgroundColor: `${wolfColor}10`, borderColor: `${wolfColor}40` },
              ]}
              onPress={onWolfEditPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Edit wolf configuration"
            >
              <View style={styles.configSummaryContent}>
                <View style={styles.configRow}>
                  <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
                    Scoring:
                  </Text>
                  <Text style={[styles.configValue, { color: colors.textPrimary }]}>
                    {wolfConfig.scoring_type === 'gross' ? 'Gross' : 'Net (with handicap)'}
                  </Text>
                </View>
                <View style={styles.configRow}>
                  <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
                    Blind Wolf:
                  </Text>
                  <Text style={[styles.configValue, { color: colors.textPrimary }]}>
                    {wolfConfig.blind_wolf_enabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
                {wolfConfig.pot_enabled && (
                  <View style={styles.configRow}>
                    <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Pot:</Text>
                    <Text style={[styles.configValue, { color: colors.textPrimary }]}>
                      ${wolfConfig.pot_value_per_point}/point
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.configTapHint, { color: wolfColor }]}>Tap to edit</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Info box for non-team competitions */}
      {!supportsTeams && (
        <View style={[styles.infoBox, { backgroundColor: colors.gray100, marginTop: spacing.lg }]}>
          <Icon source="information-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Team rounds are not available for this competition. Enable team mode in competition
            settings to use team formats.
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  // Toggle card styles (matches ScoringSetupStep)
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  toggleCardLocked: {
    opacity: 0.8,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.bodyBold,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleDescription: {
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
  // Config summary styles
  configSummary: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  configSummaryContent: {
    flex: 1,
    gap: spacing.xs,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  configLabel: {
    ...typography.small,
  },
  configValue: {
    ...typography.smallBold,
  },
  configTapHint: {
    ...typography.caption,
    fontWeight: '600',
  },
  // Divider
  divider: {
    marginVertical: spacing.sm,
  },
  // Info box
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
  // Standings-driven pairing config
  pairingConfigBox: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  pairingFieldLabel: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  pairingChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pairingChipColumn: {
    gap: spacing.sm,
  },
  pairingChip: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  pairingChipLabel: {
    ...typography.small,
    fontWeight: '600',
  },
});
