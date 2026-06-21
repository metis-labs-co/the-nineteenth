/**
 * GameFormatStep - Step 2: Round preset selection
 *
 * Renders the canonical RoundPresetPicker so the wizard exposes the same
 * 15-preset catalog (Individual / Team — whole match / Sub-matches) the
 * View Round screen offers via RoundTypeSheet.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { FormSection } from '@/components/common';
import { RoundPresetPicker } from '@/components/rounds/RoundPresetPicker';
import { ROUND_PRESETS, type RoundPresetId } from '@/constants/roundPresets';
import type { GeneratedSubMatch } from '@/utils/pairingAlgorithm';

interface GameFormatStepProps {
  presetId: RoundPresetId;
  /** Competition's `team_mode !== 'none'`. When false, team & sub-match presets are hidden. */
  supportsTeams: boolean;
  /** Competition's `per_round_rules_enabled`. Drives the "rules will be ignored" notice. */
  perRoundRulesEnabled: boolean;
  /** Number of teams configured on the competition. */
  teamCount: number;
  /** Pre-computed sub-match preview for split presets (from useAddRoundForm). */
  subMatchPreview: GeneratedSubMatch[] | null;
  presetError?: string;
  disabled: boolean;
  onPresetChange: (presetId: RoundPresetId) => void;
  onUpgradePress: () => void;
}

export function GameFormatStep({
  presetId,
  supportsTeams,
  perRoundRulesEnabled,
  teamCount,
  subMatchPreview,
  presetError,
  disabled,
  onPresetChange,
  onUpgradePress,
}: GameFormatStepProps) {
  const colors = useThemeColors();

  const selectedPresetConfig = presetId ? ROUND_PRESETS[presetId]?.config : null;
  const showAltShotPairsWarning =
    selectedPresetConfig?.game_type === 'alt-shot' &&
    selectedPresetConfig?.round_format === 'combined';

  return (
    <View style={styles.container}>
      <FormSection noCard title="Round Type *">
        <RoundPresetPicker
          selectedPresetId={presetId}
          onSelect={onPresetChange}
          perRoundRulesEnabled={perRoundRulesEnabled}
          isStandalone={false}
          teamCount={teamCount}
          subMatchPreview={subMatchPreview}
          disabled={disabled}
          onUpgrade={onUpgradePress}
          hideTeamGroups={!supportsTeams}
        />
        {showAltShotPairsWarning && (
          <View style={[styles.altShotNote, { backgroundColor: colors.infoLight, borderColor: colors.info }]}>
            <Icon source="information-outline" size={14} color={colors.info} />
            <Text style={[styles.altShotNoteText, { color: colors.infoDark }]}>
              Alt Shot is played in pairs — make sure every team has exactly 2 players.
            </Text>
          </View>
        )}
        {presetError && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {presetError}
          </Text>
        )}
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  altShotNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  altShotNoteText: {
    ...typography.small,
    flex: 1,
  },
  errorText: {
    ...typography.small,
    marginTop: spacing.sm,
  },
});
