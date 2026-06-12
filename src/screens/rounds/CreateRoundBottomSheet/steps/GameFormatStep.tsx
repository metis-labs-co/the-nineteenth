/**
 * GameFormatStep - First step in the create round wizard.
 *
 * Renders the canonical round-preset catalog (shared with competition
 * rounds), filtered to standalone-eligible presets. Tier gating uses
 * limits.allowedGameTypes (DB-driven) rather than preset.tier, so the
 * per-tier game-type entitlements in the DB remain the single source of truth.
 */
import React, { memo, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';
import { RoundPresetPicker } from '@/components/rounds/RoundPresetPicker';
import type { RoundPreset, RoundPresetId } from '@/constants/roundPresets';

interface GameFormatStepProps {
  selectedPresetId: RoundPresetId | null;
  onSelectPreset: (presetId: RoundPresetId) => void;
  onUpgradePress?: () => void;
}

export const GameFormatStep = memo(function GameFormatStep({
  selectedPresetId,
  onSelectPreset,
  onUpgradePress,
}: GameFormatStepProps) {
  const colors = useThemeColors();
  const { limits } = useSubscription();

  // Call useCallback unconditionally (rules-of-hooks). When limits hasn't
  // resolved yet the body safely falls back via optional chaining so the
  // early-return loading guard below can handle the null case.
  const tierAllowsPreset = useCallback(
    (preset: RoundPreset) =>
      limits?.allowedGameTypes.includes(preset.config.game_type) ?? false,
    [limits]
  );

  if (!limits) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        How would you like to play?
      </Text>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <RoundPresetPicker
          selectedPresetId={selectedPresetId}
          onSelect={onSelectPreset}
          // perRoundRulesEnabled=true suppresses the "rules will be ignored"
          // note (which is competition-specific copy); standalone finalization
          // ignores rules_override entirely, so the flag is cosmetic here.
          perRoundRulesEnabled={true}
          isStandalone={true}
          teamCount={0}
          tierAllowsPreset={tierAllowsPreset}
          onUpgrade={onUpgradePress}
        />
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  title: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  scrollView: { flex: 1 },
  list: { paddingBottom: spacing.lg },
});
