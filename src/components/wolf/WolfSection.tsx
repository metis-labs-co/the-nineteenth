/**
 * WolfSection - Wolf game configuration section for round setup
 *
 * Allows organizers to enable and configure Wolf games for competition rounds.
 * Supports both Add Round (no editState) and Edit Round (with editState) scenarios.
 *
 * When editState is provided:
 * - Shows lock icon instead of switch when canEditWolf is false
 * - Shows warning message when disabling existing Wolf game
 * - Changes label text based on existing Wolf state
 * - Displays locked reason message
 *
 * Wolf Game Rules:
 * - Requires exactly 3-4 players (not teams)
 * - Rotating "Wolf" player chooses to partner or go alone
 * - Blind Wolf declared before seeing tee shots for bonus points
 * - Points system based on hole outcomes
 */

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { IconDog, IconLock, IconAlertCircle } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { WolfConfigBottomSheet } from './WolfConfigBottomSheet';
import { WolfDisclaimerModal, hasAcceptedWolfDisclaimer } from './WolfDisclaimerModal';
import type { WolfConfig, WolfParticipant } from '@/types/database/wolf.types';

/** Wolf theme color (gray-500) */
export const WOLF_COLOR = '#6B7280';

/**
 * State for tracking existing Wolf game in edit mode
 */
export interface WolfEditState {
  /** Whether the round has an existing Wolf game */
  hasExistingWolf: boolean;
  /** The ID of the existing Wolf game (if any) */
  existingWolfGameId: string | null;
  /** Whether the Wolf config can be edited (only if round hasn't started) */
  canEditWolf: boolean;
  /** Reason why Wolf can't be edited (if applicable) */
  lockedReason: string | null;
}

export interface WolfSectionProps {
  /** Whether the user has Premium access */
  isPremium: boolean;
  /** Whether Wolf game is enabled */
  wolfEnabled: boolean;
  /** Current Wolf configuration */
  wolfConfig: WolfConfig | null;
  /** Handler for Wolf enable/disable toggle */
  onWolfEnabledChange: (enabled: boolean) => void;
  /** Handler for Wolf config changes */
  onWolfConfigChange: (config: WolfConfig) => void;
  /** Handler for upgrade button press */
  onUpgradePress: () => void;
  /** Whether the section is disabled (e.g., form is submitting) */
  disabled?: boolean;
  /** Optional edit mode state - when provided, component behaves in "Edit" mode */
  editState?: WolfEditState;
  /** Number of participants in the round (Wolf requires 3-4) */
  participantCount: number;
  /** Participants for Wolf order configuration */
  participants?: WolfParticipant[];
}

export const WolfSection = memo(function WolfSection({
  isPremium,
  wolfEnabled,
  wolfConfig,
  onWolfEnabledChange,
  onWolfConfigChange,
  onUpgradePress,
  disabled,
  editState,
  participantCount,
  participants = [],
}: WolfSectionProps) {
  const colors = useThemeColors();

  // Local state for modals
  const [showWolfConfigSheet, setShowWolfConfigSheet] = useState(false);
  const [showWolfDisclaimer, setShowWolfDisclaimer] = useState(false);

  // Determine if we're in edit mode and if Wolf can be modified
  const isEditMode = editState !== undefined;
  const isLocked = isEditMode && !editState.canEditWolf;
  const hasExistingWolf = isEditMode && editState.hasExistingWolf;

  // Wolf requires 3-4 players (individual game, not teams)
  const hasValidParticipantCount = participantCount >= 3 && participantCount <= 4;
  const participantError = participantCount < 3
    ? 'Wolf requires at least 3 players'
    : participantCount > 4
      ? 'Wolf is limited to 4 players maximum'
      : null;

  // Combined disabled state
  const isDisabled = disabled || isLocked || !hasValidParticipantCount;

  /**
   * Handle Wolf toggle press
   * Shows disclaimer on first use, then opens config sheet
   */
  const handleWolfToggle = useCallback(async () => {
    if (isDisabled) return;

    if (wolfEnabled) {
      // Disable Wolf
      onWolfEnabledChange(false);
    } else {
      // Check if disclaimer has been accepted
      const accepted = await hasAcceptedWolfDisclaimer();
      if (accepted) {
        // Show config sheet directly
        setShowWolfConfigSheet(true);
      } else {
        // Show disclaimer first
        setShowWolfDisclaimer(true);
      }
    }
  }, [wolfEnabled, onWolfEnabledChange, isDisabled]);

  /**
   * Handle disclaimer acceptance
   * Opens config sheet after acceptance
   */
  const handleDisclaimerAccept = useCallback(() => {
    setShowWolfDisclaimer(false);
    setShowWolfConfigSheet(true);
  }, []);

  /**
   * Handle disclaimer cancel
   */
  const handleDisclaimerCancel = useCallback(() => {
    setShowWolfDisclaimer(false);
  }, []);

  /**
   * Handle Wolf config save
   * Enables Wolf and stores the config
   */
  const handleWolfConfigSave = useCallback(
    (config: WolfConfig) => {
      onWolfConfigChange(config);
      onWolfEnabledChange(true);
      setShowWolfConfigSheet(false);
    },
    [onWolfConfigChange, onWolfEnabledChange]
  );

  /**
   * Handle Wolf config sheet dismiss (without save)
   */
  const handleWolfConfigDismiss = useCallback(() => {
    setShowWolfConfigSheet(false);
  }, []);

  /**
   * Open config sheet for editing existing config
   */
  const handleEditWolfConfig = useCallback(() => {
    if (isLocked) return;
    setShowWolfConfigSheet(true);
  }, [isLocked]);

  // Get label and description based on mode
  const labelText = hasExistingWolf ? 'Wolf Game Enabled' : 'Enable Wolf Game';

  const getDescriptionText = (): string => {
    if (isLocked && editState?.lockedReason) {
      return editState.lockedReason;
    }
    if (participantError) {
      return participantError;
    }
    return 'Strategic partner selection side-game';
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
                  { backgroundColor: wolfEnabled ? `${WOLF_COLOR}20` : colors.gray200 },
                ]}
              >
                <IconDog size={24} color={wolfEnabled ? WOLF_COLOR : colors.gray500} />
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
                value={wolfEnabled}
                onValueChange={handleWolfToggle}
                trackColor={{ false: colors.gray300, true: `${WOLF_COLOR}80` }}
                thumbColor={wolfEnabled ? WOLF_COLOR : colors.gray100}
                disabled={isDisabled}
              />
            )}
          </View>

          {/* Participant count warning */}
          {!hasValidParticipantCount && (
            <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
              <IconAlertCircle size={20} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warningDark }]}>
                {participantError}. Current players: {participantCount}
              </Text>
            </View>
          )}

          {/* Config Summary (when enabled) */}
          {wolfEnabled && wolfConfig && (
            <TouchableOpacity
              style={[
                styles.configSummary,
                {
                  backgroundColor: isLocked ? colors.surfaceVariant : `${WOLF_COLOR}10`,
                  borderColor: isLocked ? colors.border : `${WOLF_COLOR}40`,
                },
              ]}
              onPress={handleEditWolfConfig}
              activeOpacity={isLocked ? 1 : 0.7}
              accessibilityRole="button"
              accessibilityLabel={isLocked ? 'Wolf configuration (locked)' : 'Edit Wolf configuration'}
              accessibilityHint={`Current config: ${wolfConfig.scoring_type} scoring${wolfConfig.blind_wolf_enabled ? ', Blind Wolf enabled' : ''}`}
              accessibilityState={{ disabled: isLocked }}
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
                    {wolfConfig.blind_wolf_enabled ? 'Enabled (2x points)' : 'Disabled'}
                  </Text>
                </View>
                {wolfConfig.pot_enabled && (
                  <View style={styles.configRow}>
                    <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
                      Pot:
                    </Text>
                    <Text style={[styles.configValue, { color: colors.textPrimary }]}>
                      ${wolfConfig.pot_value_per_point}/point
                    </Text>
                  </View>
                )}
                <View style={styles.configRow}>
                  <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
                    Players:
                  </Text>
                  <Text style={[styles.configValue, { color: colors.textPrimary }]}>
                    {wolfConfig.wolf_order?.length ?? participantCount}
                  </Text>
                </View>
              </View>
              {isLocked ? (
                <View style={styles.lockedHint}>
                  <IconLock size={16} color={colors.gray400} />
                  <Text style={[styles.lockedHintText, { color: colors.gray400 }]}>Locked</Text>
                </View>
              ) : (
                <Text style={[styles.configTapHint, { color: WOLF_COLOR }]}>Tap to edit</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Warning when disabling existing Wolf (edit mode only) */}
          {hasExistingWolf && !wolfEnabled && !isLocked && (
            <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
              <IconAlertCircle size={20} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warningDark }]}>
                Disabling Wolf will delete the existing Wolf game for this round
              </Text>
            </View>
          )}

          {/* Info message when Wolf is enabled */}
          {wolfEnabled && !isLocked && (
            <View style={[styles.infoBox, { backgroundColor: colors.infoLight, marginTop: spacing.md }]}>
              <Icon source="information-outline" size={20} color={colors.info} />
              <Text style={[styles.infoText, { color: colors.infoDark }]}>
                {isEditMode && !hasExistingWolf
                  ? 'Wolf game will be created when you save changes'
                  : 'Wolf game will be available when the round starts'}
              </Text>
            </View>
          )}

          {/* Info message for locked Wolf (edit mode only) */}
          {isLocked && wolfEnabled && editState?.lockedReason && (
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
          accessibilityLabel="Upgrade to Premium to use Wolf games"
          activeOpacity={0.7}
        >
          <View style={styles.toggleContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
              <IconLock size={24} color={colors.gray500} />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Enable Wolf Game
                </Text>
                <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                  <Text style={[styles.premiumBadgeText, { color: colors.textOnColored }]}>
                    Premium
                  </Text>
                </View>
              </View>
              <Text style={[styles.description, { color: colors.textTertiary }]}>
                Upgrade to Premium for Wolf side-game
              </Text>
            </View>
          </View>
          <Icon source="chevron-right" size={24} color={colors.gray400} />
        </TouchableOpacity>
      )}

      {/* Wolf Config Bottom Sheet */}
      <WolfConfigBottomSheet
        visible={showWolfConfigSheet}
        onDismiss={handleWolfConfigDismiss}
        initialConfig={wolfConfig}
        onSave={handleWolfConfigSave}
        participants={participants}
      />

      {/* Wolf Disclaimer Modal */}
      <WolfDisclaimerModal
        visible={showWolfDisclaimer}
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
  premiumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    ...typography.caption,
    fontWeight: '600',
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
