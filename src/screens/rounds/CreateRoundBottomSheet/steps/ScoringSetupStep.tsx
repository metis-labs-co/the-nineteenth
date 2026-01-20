/**
 * ScoringSetupStep - Fifth step in the create round wizard
 *
 * Features:
 * - Display summary of selections
 * - Configure scoring pairs (Premium feature)
 * - Configure skins game (Premium feature)
 * - Start the round
 */

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  IconGolf,
  IconCheck,
  IconLock,
  IconArrowsExchange,
  IconDice,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ScoringPairFormationInline } from '@/components/scoring';
import {
  SkinsConfigBottomSheet,
  SkinsDisclaimerModal,
  hasAcceptedSkinsDisclaimer,
} from '@/components/skins';
import type { TeeBox, GameType } from '@/types/database.types';
import type { ScoringPairCreateInput, SkinsConfig } from '@/types';
import type { SelectedCourse, PlayingPartner } from '../types';
import { MATCH_TYPES } from '../types';

/** Amber/gold color for skins feature */
const SKINS_AMBER = '#f59e0b';

interface ScoringSetupStepProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType;
  selectedPartners: PlayingPartner[];
  isPremium: boolean;
  // Scoring pairs
  scoringPairsEnabled: boolean;
  scoringPairs: ScoringPairCreateInput[];
  onScoringPairsEnabledChange: (enabled: boolean) => void;
  onScoringPairsChange: (pairs: ScoringPairCreateInput[], type: 'reciprocal' | 'circular') => void;
  // Skins game
  skinsEnabled: boolean;
  skinsConfig: SkinsConfig | null;
  onSkinsEnabledChange: (enabled: boolean) => void;
  onSkinsConfigChange: (config: SkinsConfig) => void;
  // Actions
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
  skinsEnabled,
  skinsConfig,
  onSkinsEnabledChange,
  onSkinsConfigChange,
  onStartScoring,
}: ScoringSetupStepProps) {
  const colors = useThemeColors();

  // Local state for skins modals
  const [showSkinsConfigSheet, setShowSkinsConfigSheet] = useState(false);
  const [showSkinsDisclaimer, setShowSkinsDisclaimer] = useState(false);

  // Skins is only available for 2+ players (current user + at least 1 partner)
  const canUseSkins = selectedPartners.length >= 1;

  /**
   * Handle skins toggle press
   * Shows disclaimer on first use, then opens config sheet
   */
  const handleSkinsToggle = useCallback(async () => {
    if (skinsEnabled) {
      // Disable skins
      onSkinsEnabledChange(false);
    } else {
      // Check if disclaimer has been accepted
      const accepted = await hasAcceptedSkinsDisclaimer();
      if (accepted) {
        // Show config sheet directly
        setShowSkinsConfigSheet(true);
      } else {
        // Show disclaimer first
        setShowSkinsDisclaimer(true);
      }
    }
  }, [skinsEnabled, onSkinsEnabledChange]);

  /**
   * Handle disclaimer acceptance
   * Opens config sheet after acceptance
   */
  const handleDisclaimerAccept = useCallback(() => {
    setShowSkinsDisclaimer(false);
    // Show config sheet after disclaimer accepted
    setShowSkinsConfigSheet(true);
  }, []);

  /**
   * Handle disclaimer cancel
   */
  const handleDisclaimerCancel = useCallback(() => {
    setShowSkinsDisclaimer(false);
  }, []);

  /**
   * Handle skins config save
   * Enables skins and stores the config
   */
  const handleSkinsConfigSave = useCallback(
    (config: SkinsConfig) => {
      // DEBUG: Log skins config being saved
      console.log('[ScoringSetupStep] handleSkinsConfigSave:', {
        config,
        partnersCount: selectedPartners.length,
      });
      onSkinsConfigChange(config);
      onSkinsEnabledChange(true);
      setShowSkinsConfigSheet(false);
    },
    [onSkinsConfigChange, onSkinsEnabledChange, selectedPartners.length]
  );

  /**
   * Handle skins config sheet dismiss (without save)
   */
  const handleSkinsConfigDismiss = useCallback(() => {
    setShowSkinsConfigSheet(false);
  }, []);

  /**
   * Open config sheet for editing existing config
   */
  const handleEditSkinsConfig = useCallback(() => {
    setShowSkinsConfigSheet(true);
  }, []);

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* Skins Game Section - Only show for 2+ players */}
        {canUseSkins && (
          <>
            {/* Divider */}
            <View style={[styles.skinsDivider, { backgroundColor: colors.border }]} />

            {/* Skins Toggle */}
            {isPremium ? (
              <TouchableOpacity
                style={[
                  styles.skinsToggle,
                  {
                    backgroundColor: colors.surface,
                    borderColor: skinsEnabled ? SKINS_AMBER : colors.border,
                  },
                ]}
                onPress={handleSkinsToggle}
                activeOpacity={0.7}
                accessibilityRole="switch"
                accessibilityState={{ checked: skinsEnabled }}
                accessibilityLabel={skinsEnabled ? 'Skins game enabled' : 'Enable skins game'}
                accessibilityHint="Hole-by-hole betting between players"
              >
                <View style={styles.skinsToggleContent}>
                  <View
                    style={[
                      styles.skinsIconContainer,
                      { backgroundColor: skinsEnabled ? `${SKINS_AMBER}20` : colors.gray100 },
                    ]}
                  >
                    <IconDice
                      size={20}
                      color={skinsEnabled ? SKINS_AMBER : colors.gray400}
                    />
                  </View>
                  <View style={styles.skinsToggleText}>
                    <Text style={[styles.skinsToggleLabel, { color: colors.textPrimary }]}>
                      Add Skins Game
                    </Text>
                    <Text style={[styles.skinsToggleDescription, { color: colors.textSecondary }]}>
                      Hole-by-hole betting between players
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: skinsEnabled ? SKINS_AMBER : colors.surface,
                      borderColor: skinsEnabled ? SKINS_AMBER : colors.gray300,
                    },
                  ]}
                >
                  {skinsEnabled && <IconCheck size={14} color={colors.white} />}
                </View>
              </TouchableOpacity>
            ) : (
              /* Locked state for non-premium users */
              <View
                style={[
                  styles.skinsToggle,
                  styles.skinsToggleLocked,
                  { backgroundColor: colors.gray100, borderColor: colors.gray200 },
                ]}
              >
                <View style={styles.skinsToggleContent}>
                  <View style={[styles.skinsIconContainer, { backgroundColor: colors.gray200 }]}>
                    <IconLock size={20} color={colors.gray500} />
                  </View>
                  <View style={styles.skinsToggleText}>
                    <View style={styles.skinsLabelRow}>
                      <Text style={[styles.skinsToggleLabel, { color: colors.textSecondary }]}>
                        Add Skins Game
                      </Text>
                      <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                        <Text style={[styles.premiumBadgeText, { color: colors.textOnColored }]}>
                          Premium
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.skinsToggleDescription, { color: colors.textTertiary }]}>
                      Upgrade to Premium for skins betting
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Skins Config Summary (when enabled) */}
            {skinsEnabled && skinsConfig && (
              <TouchableOpacity
                style={[styles.skinsConfigSummary, { backgroundColor: `${SKINS_AMBER}10`, borderColor: `${SKINS_AMBER}40` }]}
                onPress={handleEditSkinsConfig}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Edit skins configuration"
                accessibilityHint={`Current config: $${skinsConfig.pot_value} ${skinsConfig.pot_type === 'per_hole' ? 'per hole' : 'total pot'}, ${skinsConfig.scoring_type} scoring`}
              >
                <View style={styles.skinsConfigSummaryContent}>
                  <View style={styles.skinsConfigRow}>
                    <Text style={[styles.skinsConfigLabel, { color: colors.textSecondary }]}>
                      Pot:
                    </Text>
                    <Text style={[styles.skinsConfigValue, { color: colors.textPrimary }]}>
                      ${skinsConfig.pot_value}{skinsConfig.pot_type === 'per_hole' ? '/hole' : ' total'}
                    </Text>
                  </View>
                  <View style={styles.skinsConfigRow}>
                    <Text style={[styles.skinsConfigLabel, { color: colors.textSecondary }]}>
                      Scoring:
                    </Text>
                    <Text style={[styles.skinsConfigValue, { color: colors.textPrimary }]}>
                      {skinsConfig.scoring_type === 'gross' ? 'Gross' : 'Net (with handicap)'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.skinsConfigTapHint, { color: SKINS_AMBER }]}>
                  Tap to edit
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
      </ScrollView>

      {/* Start Scoring Button */}
      {/* Disabled while skins config sheet is open to require confirmation first */}
      <View
        style={[styles.buttonContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}
      >
        <TouchableOpacity
          style={[
            styles.startButton,
            {
              backgroundColor: showSkinsConfigSheet ? colors.surfaceVariant : colors.primary,
              opacity: showSkinsConfigSheet ? 0.6 : 1,
            },
          ]}
          onPress={onStartScoring}
          disabled={showSkinsConfigSheet}
          activeOpacity={0.8}
        >
          <IconGolf size={20} color={showSkinsConfigSheet ? colors.textDisabled : colors.white} />
          <Text style={[styles.startButtonText, { color: showSkinsConfigSheet ? colors.textDisabled : colors.white }]}>
            {selectedPartners.length > 0
              ? `Start Scoring (${selectedPartners.length + 1} players)`
              : 'Start Solo Round'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Skins Config Bottom Sheet - rendered last to stack above everything */}
      <SkinsConfigBottomSheet
        visible={showSkinsConfigSheet}
        onDismiss={handleSkinsConfigDismiss}
        initialConfig={skinsConfig}
        onSave={handleSkinsConfigSave}
        showBackdrop={false}
      />

      {/* Skins Disclaimer Modal */}
      <SkinsDisclaimerModal
        visible={showSkinsDisclaimer}
        onAccept={handleDisclaimerAccept}
        onCancel={handleDisclaimerCancel}
      />
    </>
  );
});

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
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
  // Skins styles
  skinsDivider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  skinsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  skinsToggleLocked: {
    opacity: 0.8,
  },
  skinsToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  skinsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skinsToggleText: {
    flex: 1,
  },
  skinsToggleLabel: {
    ...typography.bodyBold,
  },
  skinsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skinsToggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  skinsConfigSummary: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skinsConfigSummaryContent: {
    flex: 1,
    gap: spacing.xs,
  },
  skinsConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skinsConfigLabel: {
    ...typography.small,
  },
  skinsConfigValue: {
    ...typography.smallBold,
  },
  skinsConfigTapHint: {
    ...typography.caption,
    fontWeight: '600',
  },
});
