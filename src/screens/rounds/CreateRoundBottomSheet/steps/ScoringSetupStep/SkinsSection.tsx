/**
 * SkinsSection - Skins game toggle and configuration
 *
 * Handles the skins toggle card, disclaimer modal flow,
 * config bottom sheet trigger, config summary display,
 * and pool source selection.
 */

import React, { memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconCheck, IconLock, IconDice } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, skinsColor } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import {
  SkinsConfigBottomSheet,
  SkinsDisclaimerModal,
  hasAcceptedSkinsDisclaimer,
} from '@/components/skins';
import type { SkinsConfig } from '@/types';
import type { GameType } from '@/types/database.types';
import type { PlayingPartner, ScrambleTeam } from '../../types';

/** Team game types that require splitIntoTeams for skins */
const TEAM_GAME_TYPES: GameType[] = ['best-ball', 'scramble', 'shamble'];

/**
 * Check if skins can be enabled for the given game configuration
 * Team formats require splitIntoTeams=true with at least 2 teams to use skins
 */
function canEnableSkinsForGameType(
  gameType: GameType,
  splitIntoTeams: boolean,
  teamCount: number
): { canEnable: boolean; reason: string | null } {
  if (TEAM_GAME_TYPES.includes(gameType) && !splitIntoTeams) {
    return {
      canEnable: false,
      reason: 'Skins requires team mode for team formats. Enable "Split into Teams" above to use skins.',
    };
  }
  if (TEAM_GAME_TYPES.includes(gameType) && splitIntoTeams && teamCount < 2) {
    return {
      canEnable: false,
      reason: 'Skins requires at least 2 teams.',
    };
  }
  return { canEnable: true, reason: null };
}

interface SkinsSectionProps {
  isPremiumSkins: boolean;
  skinsEnabled: boolean;
  skinsConfig: SkinsConfig | null;
  selectedPartners: PlayingPartner[];
  selectedMatchType: GameType;
  splitIntoTeams: boolean;
  teams: ScrambleTeam[];
  onSkinsEnabledChange: (enabled: boolean) => void;
  onSkinsConfigChange: (config: SkinsConfig) => void;
  /** Expose whether the config sheet is open (used by parent for button disable) */
  onConfigSheetVisibleChange?: (visible: boolean) => void;
}

export const SkinsSection = memo(function SkinsSection({
  isPremiumSkins,
  skinsEnabled,
  skinsConfig,
  selectedPartners,
  selectedMatchType,
  splitIntoTeams,
  teams,
  onSkinsEnabledChange,
  onSkinsConfigChange,
  onConfigSheetVisibleChange,
}: SkinsSectionProps) {
  const colors = useThemeColors();

  // Local state for skins modals
  const [showSkinsConfigSheet, setShowSkinsConfigSheet] = useState(false);
  const [showSkinsDisclaimer, setShowSkinsDisclaimer] = useState(false);

  // Skins is only available for 2+ players (current user + at least 1 partner)
  const hasEnoughPlayers = selectedPartners.length >= 1;

  // Check if skins is allowed for this game type and team count
  const skinsGameTypeValidation = canEnableSkinsForGameType(selectedMatchType, splitIntoTeams, teams.length);
  const canUseSkins = hasEnoughPlayers && skinsGameTypeValidation.canEnable;
  const skinsDisabledReason = !hasEnoughPlayers
    ? 'Skins requires at least 2 players'
    : skinsGameTypeValidation.reason;

  const updateConfigSheetVisible = useCallback((visible: boolean) => {
    setShowSkinsConfigSheet(visible);
    onConfigSheetVisibleChange?.(visible);
  }, [onConfigSheetVisibleChange]);

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
        updateConfigSheetVisible(true);
      } else {
        // Show disclaimer first
        setShowSkinsDisclaimer(true);
      }
    }
  }, [skinsEnabled, onSkinsEnabledChange, updateConfigSheetVisible]);

  /**
   * Handle disclaimer acceptance
   * Opens config sheet after acceptance
   */
  const handleDisclaimerAccept = useCallback(() => {
    setShowSkinsDisclaimer(false);
    // Show config sheet after disclaimer accepted
    updateConfigSheetVisible(true);
  }, [updateConfigSheetVisible]);

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
      updateConfigSheetVisible(false);
    },
    [onSkinsConfigChange, onSkinsEnabledChange, selectedPartners.length, updateConfigSheetVisible]
  );

  /**
   * Handle skins config sheet dismiss (without save)
   */
  const handleSkinsConfigDismiss = useCallback(() => {
    updateConfigSheetVisible(false);
  }, [updateConfigSheetVisible]);

  /**
   * Open config sheet for editing existing config
   */
  const handleEditSkinsConfig = useCallback(() => {
    updateConfigSheetVisible(true);
  }, [updateConfigSheetVisible]);

  // Don't render if not enough players
  if (!hasEnoughPlayers) {
    return null;
  }

  return (
    <>
      {/* Divider */}
      <View style={[styles.skinsDivider, { backgroundColor: colors.border }]} />

      {/* Skins Toggle - Disabled for team formats without team mode */}
      {!canUseSkins && skinsDisabledReason && isPremiumSkins ? (
        <View
          style={[
            styles.skinsToggle,
            styles.skinsToggleLocked,
            { backgroundColor: colors.gray100, borderColor: colors.gray200 },
          ]}
        >
          <View style={styles.skinsToggleContent}>
            <View style={[styles.skinsIconContainer, { backgroundColor: colors.gray200 }]}>
              <IconDice size={20} color={colors.gray400} />
            </View>
            <View style={styles.skinsToggleText}>
              <Text style={[styles.skinsToggleLabel, { color: colors.textSecondary }]}>
                Add Skins Game
              </Text>
              <Text style={[styles.skinsToggleDescription, { color: colors.textTertiary }]}>
                {skinsDisabledReason}
              </Text>
            </View>
          </View>
        </View>
      ) : isPremiumSkins ? (
        <TouchableOpacity
          style={[
            styles.skinsToggle,
            {
              backgroundColor: colors.surface,
              borderColor: skinsEnabled ? skinsColor : colors.border,
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
                { backgroundColor: skinsEnabled ? `${skinsColor}20` : colors.gray100 },
              ]}
            >
              <IconDice
                size={20}
                color={skinsEnabled ? skinsColor : colors.gray400}
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
                backgroundColor: skinsEnabled ? skinsColor : colors.surface,
                borderColor: skinsEnabled ? skinsColor : colors.gray300,
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
          style={[styles.skinsConfigSummary, { backgroundColor: `${skinsColor}10`, borderColor: `${skinsColor}40` }]}
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
          <Text style={[styles.skinsConfigTapHint, { color: skinsColor }]}>
            Tap to edit
          </Text>
        </TouchableOpacity>
      )}

      {/* Skins Config Bottom Sheet */}
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
