/**
 * SkinsSection - Unified skins game configuration section
 *
 * Allows organizers to enable and configure skins games for competition rounds.
 * Supports both Add Round (no editState) and Edit Round (with editState) scenarios.
 *
 * When editState is provided:
 * - Shows lock icon instead of switch when canEditSkins is false
 * - Shows warning message when disabling existing skins
 * - Changes label text based on existing skins state
 * - Displays locked reason message
 *
 * Skins config is always direct (players pay in). Pool source toggle has been removed.
 */

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { IconDice, IconLock, IconAlertCircle } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, skinsColor } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { Pill } from '@/components/common';
import {
  SkinsConfigBottomSheet,
  SkinsDisclaimerModal,
  hasAcceptedSkinsDisclaimer,
} from '@/components/skins';
import type { SkinsConfig, TeamFormat } from '@/types';
import { TEAM_ONLY_GAME_TYPES } from '@/services/rounds/resultsEngine';

/**
 * Team format types that require team mode for skins
 */
const TEAM_GAME_TYPES: string[] = TEAM_ONLY_GAME_TYPES;

/**
 * Simple team info for display
 */
export interface SkinsTeamInfo {
  id: string;
  name: string;
  memberCount: number;
}

/**
 * State for tracking existing skins game in edit mode
 */
export interface SkinsEditState {
  /** Whether the round has an existing skins game */
  hasExistingSkins: boolean;
  /** The ID of the existing skins game (if any) */
  existingSkinsGameId: string | null;
  /** Whether the skins config can be edited (only if round hasn't started) */
  canEditSkins: boolean;
  /** Reason why skins can't be edited (if applicable) */
  lockedReason: string | null;
}

export interface SkinsSectionProps {
  skinsEnabled: boolean;
  skinsConfig: SkinsConfig | null;
  onSkinsEnabledChange: (enabled: boolean) => void;
  onSkinsConfigChange: (config: SkinsConfig) => void;
  onUpgradePress: () => void;
  disabled?: boolean;
  /** Optional edit mode state - when provided, component behaves in "Edit" mode */
  editState?: SkinsEditState;
  /** Whether this is a team round (splitIntoTeams=true) */
  isTeamRound?: boolean;
  /** The team format (best-ball, scramble, shamble, etc.) */
  teamFormat?: TeamFormat | null;
  /** Available teams for team skins selection */
  teams?: SkinsTeamInfo[];
}

export const SkinsSection = memo(function SkinsSection({
  skinsEnabled,
  skinsConfig,
  onSkinsEnabledChange,
  onSkinsConfigChange,
  onUpgradePress,
  disabled,
  editState,
  isTeamRound = false,
  teamFormat,
  teams,
}: SkinsSectionProps) {
  const colors = useThemeColors();
  const checkFeature = useCheckFeature();
  const isPremium = checkFeature('skins_game').allowed;

  // Local state for modals
  const [showSkinsConfigSheet, setShowSkinsConfigSheet] = useState(false);
  const [showSkinsDisclaimer, setShowSkinsDisclaimer] = useState(false);

  // Determine if we're in edit mode and if skins can be modified
  const isEditMode = editState !== undefined;
  const isLocked = isEditMode && !editState.canEditSkins;
  const hasExistingSkins = isEditMode && editState.hasExistingSkins;

  // Team skins validation
  // Team formats (best-ball, scramble, shamble) require team mode for skins
  const isTeamFormat = teamFormat && TEAM_GAME_TYPES.includes(teamFormat);
  const needsTeamModeForSkins = isTeamFormat && !isTeamRound;
  const isTeamSkins = !!(isTeamRound && isTeamFormat);
  const hasValidTeams = teams && teams.length >= 2;

  // Combined disabled state
  const isDisabled = !!(disabled || isLocked || needsTeamModeForSkins);

  /**
   * Handle skins toggle press
   * Shows disclaimer on first use, then opens config sheet
   */
  const handleSkinsToggle = useCallback(async () => {
    if (isDisabled) return;

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
  }, [skinsEnabled, onSkinsEnabledChange, isDisabled]);

  /**
   * Handle disclaimer acceptance
   * Opens config sheet after acceptance
   */
  const handleDisclaimerAccept = useCallback(() => {
    setShowSkinsDisclaimer(false);
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
      onSkinsConfigChange(config);
      onSkinsEnabledChange(true);
      setShowSkinsConfigSheet(false);
    },
    [onSkinsConfigChange, onSkinsEnabledChange]
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
    if (isLocked) return;
    setShowSkinsConfigSheet(true);
  }, [isLocked]);

  // Get label and description based on mode
  const labelText = hasExistingSkins
    ? (isTeamSkins ? 'Team Skins Enabled' : 'Skins Game Enabled')
    : (isTeamSkins ? 'Enable Team Skins' : 'Enable Skins Game');

  const getDescriptionText = (): string => {
    if (isLocked && editState?.lockedReason) {
      return editState.lockedReason;
    }
    if (needsTeamModeForSkins) {
      return 'Enable "Split Into Teams" to use skins with team formats';
    }
    if (isTeamSkins) {
      return `Team vs team betting - ${teams?.length ?? 0} teams`;
    }
    return 'Hole-by-hole betting between players';
  };
  const descriptionText = getDescriptionText();

  return (
    <>
      <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

      {isPremium ? (
        <>
          {/* Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: skinsEnabled ? `${skinsColor}20` : colors.gray200 },
                ]}
              >
                <IconDice size={24} color={skinsEnabled ? skinsColor : colors.gray500} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  {labelText}
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {descriptionText}
                </Text>
              </View>
            </View>
            {isLocked ? (
              <IconLock size={24} color={colors.gray400} />
            ) : (
              <Switch
                value={skinsEnabled}
                onValueChange={handleSkinsToggle}
                trackColor={{ false: colors.gray300, true: `${skinsColor}80` }}
                thumbColor={skinsEnabled ? skinsColor : colors.gray100}
                disabled={isDisabled}
              />
            )}
          </View>

          {/* Config Summary (when enabled) */}
          {skinsEnabled && skinsConfig && (
            <TouchableOpacity
              style={[
                styles.configSummary,
                {
                  backgroundColor: isLocked ? colors.surfaceVariant : `${skinsColor}10`,
                  borderColor: isLocked ? colors.border : `${skinsColor}40`,
                },
              ]}
              onPress={handleEditSkinsConfig}
              activeOpacity={isLocked ? 1 : 0.7}
              accessibilityRole="button"
              accessibilityLabel={isLocked ? 'Skins configuration (locked)' : 'Edit skins configuration'}
              accessibilityHint={`Current config: $${skinsConfig.pot_value} ${skinsConfig.pot_type === 'per_hole' ? 'per hole' : 'total pot'}, ${skinsConfig.scoring_type} scoring`}
              accessibilityState={{ disabled: isLocked }}
            >
              <View style={styles.configSummaryContent}>
                <View style={styles.configRow}>
                  <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Pot:</Text>
                  <Text style={[styles.configValue, { color: colors.textPrimary }]}>
                    ${skinsConfig.pot_value}
                    {skinsConfig.pot_type === 'per_hole' ? '/hole' : ' total'}
                    {skinsConfig.pot_type === 'per_hole' && ` ($${(skinsConfig.pot_value * 18).toFixed(2)} total)`}
                  </Text>
                </View>
                <View style={styles.configRow}>
                  <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
                    Scoring:
                  </Text>
                  <Text style={[styles.configValue, { color: colors.textPrimary }]}>
                    {skinsConfig.scoring_type === 'gross' ? 'Gross' : 'Net (with handicap)'}
                  </Text>
                </View>
                {isTeamSkins && (
                  <View style={styles.configRow}>
                    <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
                      Mode:
                    </Text>
                    <Text style={[styles.configValue, { color: skinsColor }]}>
                      Team Skins ({teams?.length ?? 0} teams)
                    </Text>
                  </View>
                )}
              </View>
              {isLocked ? (
                <View style={styles.lockedHint}>
                  <IconLock size={16} color={colors.gray400} />
                  <Text style={[styles.lockedHintText, { color: colors.gray400 }]}>Locked</Text>
                </View>
              ) : (
                <Text style={[styles.configTapHint, { color: skinsColor }]}>Tap to edit</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Warning for team skins without enough teams */}
          {skinsEnabled && isTeamSkins && !hasValidTeams && (
            <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
              <IconAlertCircle size={20} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warningDark }]}>
                Team skins requires at least 2 teams. Create teams in the team settings step.
              </Text>
            </View>
          )}

          {/* Info message for team format without team mode */}
          {needsTeamModeForSkins && (
            <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant, marginTop: spacing.md }]}>
              <IconAlertCircle size={20} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {teamFormat === 'scramble' ? 'Scramble' : teamFormat === 'shamble' ? 'Shamble' : 'Best Ball'} format requires teams to be enabled for skins games. Enable &quot;Split Into Teams&quot; in the match type settings.
              </Text>
            </View>
          )}

          {/* Warning when disabling existing skins (edit mode only) */}
          {hasExistingSkins && !skinsEnabled && !isLocked && (
            <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
              <IconAlertCircle size={20} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warningDark }]}>
                Disabling skins will delete the existing skins game for this round
              </Text>
            </View>
          )}

          {/* Info message when skins is enabled */}
          {skinsEnabled && !isLocked && (
            <View style={[styles.infoBox, { backgroundColor: colors.infoLight, marginTop: spacing.md }]}>
              <Icon source="information-outline" size={20} color={colors.info} />
              <Text style={[styles.infoText, { color: colors.infoDark }]}>
                {isEditMode && !hasExistingSkins
                  ? 'Skins will be created when you save changes'
                  : 'Skins will be available for all players when the round starts'}
              </Text>
            </View>
          )}

          {/* Info message for locked skins (edit mode only) */}
          {isLocked && skinsEnabled && editState?.lockedReason && (
            <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant, marginTop: spacing.md }]}>
              <IconLock size={20} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {editState.lockedReason}
              </Text>
            </View>
          )}
        </>
      ) : (
        /* Locked state for non-premium users */
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={onUpgradePress}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Premium to use skins games"
          activeOpacity={0.7}
        >
          <View style={styles.toggleContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
              <IconLock size={24} color={colors.gray500} />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Enable Skins Game
                </Text>
                <Pill label="Premium" variant="warning" filled size="sm" />
              </View>
              <Text style={[styles.description, { color: colors.textTertiary }]}>
                Upgrade to Premium for skins betting
              </Text>
            </View>
          </View>
          <Icon source="chevron-right" size={24} color={colors.gray400} />
        </TouchableOpacity>
      )}

      {/* Skins Config Bottom Sheet */}
      <SkinsConfigBottomSheet
        visible={showSkinsConfigSheet}
        onDismiss={handleSkinsConfigDismiss}
        initialConfig={skinsConfig}
        onSave={handleSkinsConfigSave}
        isTeamSkins={isTeamSkins}
        teams={teams}
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
  configSummary: {
    marginTop: spacing.md,
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
  lockedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lockedHintText: {
    ...typography.caption,
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  warningText: {
    ...typography.small,
    flex: 1,
  },
});
