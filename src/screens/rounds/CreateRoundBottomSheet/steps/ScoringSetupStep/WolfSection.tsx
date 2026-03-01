/**
 * WolfSection - Wolf game toggle and configuration (wizard step)
 *
 * Handles the wolf toggle card, disclaimer modal flow,
 * config bottom sheet trigger, and config summary display.
 *
 * NOTE: This is the wizard step section, not the standalone
 * component at src/components/wolf/WolfSection.tsx.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconCheck, IconLock, IconDog } from '@tabler/icons-react-native';
import { Divider } from 'react-native-paper';
import { spacing, typography, borderRadius, wolfColor } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { Pill } from '@/components/common';
import {
  WolfConfigBottomSheet,
  WolfDisclaimerModal,
  hasAcceptedWolfDisclaimer,
} from '@/components/wolf';
import type { WolfConfig, WolfParticipant } from '@/types/database/wolf.types';
import type { PlayingPartner } from '../../types';

interface WolfSectionProps {
  isPremiumWolf: boolean;
  wolfEnabled: boolean;
  wolfConfig: WolfConfig | null;
  selectedPartners: PlayingPartner[];
  currentUserId: string;
  currentUserName: string;
  currentUserHandicap: number | null;
  onWolfEnabledChange: (enabled: boolean) => void;
  onWolfConfigChange: (config: WolfConfig) => void;
}

export const WolfSection = memo(function WolfSection({
  isPremiumWolf,
  wolfEnabled,
  wolfConfig,
  selectedPartners,
  currentUserId,
  currentUserName,
  currentUserHandicap,
  onWolfEnabledChange,
  onWolfConfigChange,
}: WolfSectionProps) {
  const colors = useThemeColors();

  // Local state for wolf modals
  const [showWolfConfigSheet, setShowWolfConfigSheet] = useState(false);
  const [showWolfDisclaimer, setShowWolfDisclaimer] = useState(false);

  // Wolf requires exactly 3-4 players (including current user)
  const totalPlayers = selectedPartners.length + 1;

  // Build Wolf participants list for the config sheet
  const wolfParticipants: WolfParticipant[] = useMemo(() => {
    const currentUserParticipant: WolfParticipant = {
      id: currentUserId,
      name: currentUserName,
      handicap: currentUserHandicap,
    };

    return [
      currentUserParticipant,
      ...selectedPartners.map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap ?? null,
      })),
    ];
  }, [currentUserId, currentUserName, currentUserHandicap, selectedPartners]);

  // Wolf validation - requires 3-4 players
  const hasValidWolfPlayerCount = totalPlayers >= 3 && totalPlayers <= 4;
  const wolfPlayerError = totalPlayers < 3
    ? 'Wolf requires at least 3 players'
    : totalPlayers > 4
      ? 'Wolf is limited to 4 players maximum'
      : null;

  /**
   * Handle wolf toggle press
   * Shows disclaimer on first use, then opens config sheet
   */
  const handleWolfToggle = useCallback(async () => {
    if (wolfEnabled) {
      // Disable wolf
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
  }, [wolfEnabled, onWolfEnabledChange]);

  /**
   * Handle wolf disclaimer acceptance
   */
  const handleWolfDisclaimerAccept = useCallback(() => {
    setShowWolfDisclaimer(false);
    setShowWolfConfigSheet(true);
  }, []);

  /**
   * Handle wolf disclaimer cancel
   */
  const handleWolfDisclaimerCancel = useCallback(() => {
    setShowWolfDisclaimer(false);
  }, []);

  /**
   * Handle wolf config save
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
   * Handle wolf config sheet dismiss
   */
  const handleWolfConfigDismiss = useCallback(() => {
    setShowWolfConfigSheet(false);
  }, []);

  /**
   * Open wolf config sheet for editing
   */
  const handleEditWolfConfig = useCallback(() => {
    setShowWolfConfigSheet(true);
  }, []);

  return (
    <>
      <Divider style={[styles.wolfDivider, { backgroundColor: colors.gray200 }]} />

      {isPremiumWolf ? (
        <>
          {/* Wolf Toggle - Disabled if wrong player count */}
          {!hasValidWolfPlayerCount ? (
            <View
              style={[
                styles.wolfToggle,
                styles.wolfToggleLocked,
                { backgroundColor: colors.gray100, borderColor: colors.gray200 },
              ]}
            >
              <View style={styles.wolfToggleContent}>
                <View style={[styles.wolfIconContainer, { backgroundColor: colors.gray200 }]}>
                  <IconDog size={20} color={colors.gray400} />
                </View>
                <View style={styles.wolfToggleText}>
                  <Text style={[styles.wolfToggleLabel, { color: colors.textSecondary }]}>
                    Add Wolf Game
                  </Text>
                  <Text style={[styles.wolfToggleDescription, { color: colors.textTertiary }]}>
                    {wolfPlayerError}. Current: {totalPlayers} players
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.wolfToggle,
                {
                  backgroundColor: colors.surface,
                  borderColor: wolfEnabled ? wolfColor : colors.border,
                },
              ]}
              onPress={handleWolfToggle}
              activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityState={{ checked: wolfEnabled }}
              accessibilityLabel={wolfEnabled ? 'Wolf game enabled' : 'Enable wolf game'}
              accessibilityHint="Strategic partner selection side-game"
            >
              <View style={styles.wolfToggleContent}>
                <View
                  style={[
                    styles.wolfIconContainer,
                    { backgroundColor: wolfEnabled ? `${wolfColor}20` : colors.gray100 },
                  ]}
                >
                  <IconDog
                    size={20}
                    color={wolfEnabled ? wolfColor : colors.gray400}
                  />
                </View>
                <View style={styles.wolfToggleText}>
                  <Text style={[styles.wolfToggleLabel, { color: colors.textPrimary }]}>
                    Add Wolf Game
                  </Text>
                  <Text style={[styles.wolfToggleDescription, { color: colors.textSecondary }]}>
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
          )}

          {/* Wolf Config Summary (when enabled) */}
          {wolfEnabled && wolfConfig && (
            <TouchableOpacity
              style={[styles.wolfConfigSummary, { backgroundColor: `${wolfColor}10`, borderColor: `${wolfColor}40` }]}
              onPress={handleEditWolfConfig}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Edit wolf configuration"
            >
              <View style={styles.wolfConfigSummaryContent}>
                <View style={styles.wolfConfigRow}>
                  <Text style={[styles.wolfConfigLabel, { color: colors.textSecondary }]}>
                    Scoring:
                  </Text>
                  <Text style={[styles.wolfConfigValue, { color: colors.textPrimary }]}>
                    {wolfConfig.scoring_type === 'gross' ? 'Gross' : 'Net (with handicap)'}
                  </Text>
                </View>
                <View style={styles.wolfConfigRow}>
                  <Text style={[styles.wolfConfigLabel, { color: colors.textSecondary }]}>
                    Blind Wolf:
                  </Text>
                  <Text style={[styles.wolfConfigValue, { color: colors.textPrimary }]}>
                    {wolfConfig.blind_wolf_enabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
                {wolfConfig.pot_enabled && (
                  <View style={styles.wolfConfigRow}>
                    <Text style={[styles.wolfConfigLabel, { color: colors.textSecondary }]}>
                      Pot:
                    </Text>
                    <Text style={[styles.wolfConfigValue, { color: colors.textPrimary }]}>
                      ${wolfConfig.pot_value_per_point}/point
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.wolfConfigTapHint, { color: wolfColor }]}>
                Tap to edit
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        /* Locked state for non-premium users */
        <View
          style={[
            styles.wolfToggle,
            styles.wolfToggleLocked,
            { backgroundColor: colors.gray100, borderColor: colors.gray200 },
          ]}
        >
          <View style={styles.wolfToggleContent}>
            <View style={[styles.wolfIconContainer, { backgroundColor: colors.gray200 }]}>
              <IconLock size={20} color={colors.gray500} />
            </View>
            <View style={styles.wolfToggleText}>
              <View style={styles.wolfLabelRow}>
                <Text style={[styles.wolfToggleLabel, { color: colors.textSecondary }]}>
                  Add Wolf Game
                </Text>
                <Pill label="Premium" variant="warning" filled size="sm" />
              </View>
              <Text style={[styles.wolfToggleDescription, { color: colors.textTertiary }]}>
                Upgrade to Premium for Wolf side-game
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Wolf Config Bottom Sheet */}
      <WolfConfigBottomSheet
        visible={showWolfConfigSheet}
        onDismiss={handleWolfConfigDismiss}
        initialConfig={wolfConfig}
        onSave={handleWolfConfigSave}
        participants={wolfParticipants}
        showBackdrop={false}
      />

      {/* Wolf Disclaimer Modal */}
      <WolfDisclaimerModal
        visible={showWolfDisclaimer}
        onAccept={handleWolfDisclaimerAccept}
        onCancel={handleWolfDisclaimerCancel}
      />
    </>
  );
});

const styles = StyleSheet.create({
  wolfDivider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  wolfToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  wolfToggleLocked: {
    opacity: 0.8,
  },
  wolfToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  wolfIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wolfToggleText: {
    flex: 1,
  },
  wolfToggleLabel: {
    ...typography.bodyBold,
  },
  wolfLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wolfToggleDescription: {
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
  wolfConfigSummary: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wolfConfigSummaryContent: {
    flex: 1,
    gap: spacing.xs,
  },
  wolfConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wolfConfigLabel: {
    ...typography.small,
  },
  wolfConfigValue: {
    ...typography.smallBold,
  },
  wolfConfigTapHint: {
    ...typography.caption,
    fontWeight: '600',
  },
});
