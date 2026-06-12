/**
 * RoundPresetPicker
 *
 * Embeddable picker over the canonical `ROUND_PRESETS` catalog. Renders the
 * grouped preset cards (Individual / Team — whole match / Sub-matches) and the
 * "What this does" details block with optional sub-match preview.
 *
 * Used by:
 *  - `RoundTypeSheet` (post-creation edit, in a bottom sheet wrapper)
 *  - `GameFormatStep` in the Add Round wizard
 *
 * The component is purely presentational w.r.t. the catalog — it doesn't
 * persist the choice. Parents own the selected preset id and the sub-match
 * preview (which they generate via `generateSubMatches` from team rosters).
 */

import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import {
  ROUND_PRESET_GROUP_LABELS,
  ROUND_PRESET_GROUP_ORDER,
  ROUND_PRESET_ORDER,
  ROUND_PRESETS,
  getPresetAvailability,
  type PresetAvailability,
  type RoundPreset,
  type RoundPresetGroup,
  type RoundPresetId,
} from '@/constants/roundPresets';
import { useTier } from '@/context/SubscriptionContext';
import { useThemeColors } from '@/context/ThemeContext';
import { withOpacity } from '@/constants/colors';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import {
  formatTeeTimeForDisplay,
  type GeneratedSubMatch,
} from '@/utils/pairingAlgorithm';
import type { SubscriptionTier } from '@/types/subscription.types';

const TIER_DISPLAY: Record<SubscriptionTier, string> = {
  free: 'Free',
  social: 'Social',
  premium: 'Premium',
  enterprise: 'Enterprise',
  super_admin: 'Super Admin',
  developer: 'Developer',
};

export interface RoundPresetPickerProps {
  selectedPresetId: RoundPresetId | null;
  onSelect: (presetId: RoundPresetId) => void;
  /** Reflects `competitions.per_round_rules_enabled`. When false, presets carrying a
   *  rules_override are flagged with a "rules will be ignored" note. */
  perRoundRulesEnabled: boolean;
  /** When true, presets that need competition team rosters (e.g. team / sub-match
   *  presets) are hidden entirely. */
  isStandalone: boolean;
  /** Number of teams currently configured. Drives the sub-match preview gating. */
  teamCount: number;
  /** Pre-computed sub-match preview for the selected preset (when split). Parent
   *  generates this via `generateSubMatches` from team rosters. */
  subMatchPreview?: GeneratedSubMatch[] | null;
  /** When set, surfaces a "Current" pill on this preset's card. */
  currentPresetId?: RoundPresetId | null;
  /** Top-of-list blocker banner (e.g. "scoring already started"). */
  topNotice?: { tone: 'warning' | 'info'; text: string } | null;
  /** Disable selection (e.g. while a save mutation is in flight). */
  disabled?: boolean;
  /** Called when the user taps a locked (tier-gated) preset. */
  onUpgrade?: () => void;
  /** Hide the entire `team_combined` and `sub_matches` groups (e.g. for
   *  competitions with `team_mode = 'none'`). */
  hideTeamGroups?: boolean;
  /**
   * Override tier gating per preset. When provided, replaces the
   * tier check from getPresetAvailability (used by the standalone
   * wizard, which gates by limits.allowedGameTypes instead of preset.tier).
   */
  tierAllowsPreset?: (preset: RoundPreset) => boolean;
}

export function RoundPresetPicker({
  selectedPresetId,
  onSelect,
  perRoundRulesEnabled,
  isStandalone,
  teamCount,
  subMatchPreview = null,
  currentPresetId = null,
  topNotice = null,
  disabled = false,
  onUpgrade,
  hideTeamGroups = false,
  tierAllowsPreset,
}: RoundPresetPickerProps) {
  const colors = useThemeColors();
  const tier = useTier();

  const availabilityFor = useCallback(
    (preset: RoundPreset): PresetAvailability => {
      const availability = getPresetAvailability(preset, {
        tier,
        isStandalone,
        perRoundRulesEnabled,
      });
      if (tierAllowsPreset) {
        return { ...availability, tierAllowed: tierAllowsPreset(preset) };
      }
      return availability;
    },
    [tier, isStandalone, perRoundRulesEnabled, tierAllowsPreset]
  );

  const handleSelect = useCallback(
    (preset: RoundPreset) => {
      if (disabled) return;
      const avail = availabilityFor(preset);
      if (avail.comingSoon) return;
      if (!avail.tierAllowed) {
        onUpgrade?.();
        return;
      }
      if (!avail.contextAllowed) return;
      onSelect(preset.id);
    },
    [availabilityFor, disabled, onSelect, onUpgrade]
  );

  const selectedPreset = selectedPresetId ? ROUND_PRESETS[selectedPresetId] : null;
  const isSplitTarget = selectedPreset?.config.round_format === 'split';

  return (
    <View style={styles.root}>
      {topNotice && (
        <View
          style={[
            styles.noticeBox,
            {
              backgroundColor:
                topNotice.tone === 'warning'
                  ? colors.warningBackground ?? colors.surfaceVariant
                  : colors.surfaceVariant,
              borderColor:
                topNotice.tone === 'warning' ? colors.warning : colors.border,
            },
          ]}
        >
          <Icon
            source={topNotice.tone === 'warning' ? 'alert-outline' : 'information-outline'}
            size={18}
            color={topNotice.tone === 'warning' ? colors.warning : colors.textSecondary}
          />
          <Text
            style={[
              styles.noticeText,
              {
                color: topNotice.tone === 'warning' ? colors.warning : colors.textSecondary,
              },
            ]}
          >
            {topNotice.text}
          </Text>
        </View>
      )}

      {ROUND_PRESET_GROUP_ORDER.map((group) => {
        if (hideTeamGroups && group !== 'individual') return null;

        const ids = ROUND_PRESET_ORDER.filter(
          (id) => ROUND_PRESETS[id].group === group
        );
        const visibleIds = ids.filter((id) => {
          const avail = availabilityFor(ROUND_PRESETS[id]);
          return avail.contextAllowed;
        });
        if (visibleIds.length === 0) return null;

        return (
          <PresetGroupBlock
            key={group}
            group={group}
            ids={visibleIds}
            selectedPresetId={selectedPresetId}
            currentPresetId={currentPresetId}
            disabled={disabled}
            availabilityFor={availabilityFor}
            onPress={handleSelect}
          />
        );
      })}

      {selectedPreset && (
        <PendingDetailsBlock
          preset={selectedPreset}
          isSplitTarget={isSplitTarget}
          preview={subMatchPreview}
          hasTeams={teamCount >= 2}
          rulesWouldBeIgnored={availabilityFor(selectedPreset).rulesWouldBeIgnored}
        />
      )}
    </View>
  );
}

interface PresetGroupBlockProps {
  group: RoundPresetGroup;
  ids: RoundPresetId[];
  selectedPresetId: RoundPresetId | null;
  currentPresetId: RoundPresetId | null;
  disabled: boolean;
  availabilityFor: (preset: RoundPreset) => PresetAvailability;
  onPress: (preset: RoundPreset) => void;
}

function PresetGroupBlock({
  group,
  ids,
  selectedPresetId,
  currentPresetId,
  disabled,
  availabilityFor,
  onPress,
}: PresetGroupBlockProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.groupBlock}>
      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
        {ROUND_PRESET_GROUP_LABELS[group]}
      </Text>
      {ids.map((id) => {
        const preset = ROUND_PRESETS[id];
        const avail = availabilityFor(preset);
        return (
          <PresetCard
            key={id}
            preset={preset}
            availability={avail}
            selected={selectedPresetId === id}
            isCurrent={currentPresetId === id}
            disabled={disabled}
            onPress={() => onPress(preset)}
          />
        );
      })}
    </View>
  );
}

interface PresetCardProps {
  preset: RoundPreset;
  availability: PresetAvailability;
  selected: boolean;
  isCurrent: boolean;
  disabled: boolean;
  onPress: () => void;
}

function PresetCard({
  preset,
  availability,
  selected,
  isCurrent,
  disabled,
  onPress,
}: PresetCardProps) {
  const colors = useThemeColors();
  const comingSoon = availability.comingSoon;
  const locked = comingSoon || !availability.tierAllowed;

  return (
    <TouchableOpacity
      testID={`round-type-preset-${preset.id}`}
      onPress={onPress}
      disabled={disabled || comingSoon}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          borderColor: selected ? colors.primary : colors.gray300,
          backgroundColor: selected
            ? withOpacity(colors.primaryLighter, 0.13)
            : colors.surface,
          opacity: locked ? 0.7 : 1,
        },
      ]}
      accessibilityRole="radio"
      accessibilityLabel={preset.title}
      accessibilityState={{ selected, disabled: disabled || comingSoon }}
      accessibilityHint={
        comingSoon
          ? 'Coming soon'
          : !availability.tierAllowed
            ? `Upgrade to ${TIER_DISPLAY[preset.tier]}`
            : preset.summary
      }
    >
      <View style={styles.cardContent}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: selected
                ? colors.primary
                : locked
                  ? colors.gray300
                  : colors.gray200,
            },
          ]}
        >
          <Icon
            source={
              comingSoon
                ? 'clock-outline'
                : !availability.tierAllowed
                  ? 'lock-outline'
                  : preset.icon
            }
            size={20}
            color={
              selected
                ? colors.white
                : locked
                  ? colors.gray500
                  : colors.gray600
            }
          />
        </View>
        <View style={styles.cardText}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[
                styles.cardTitle,
                { color: locked ? colors.textDisabled : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {preset.title}
            </Text>
            {isCurrent && !selected && (
              <View
                style={[
                  styles.currentPill,
                  { backgroundColor: colors.primaryBackground, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.currentPillText, { color: colors.primary }]}>
                  Current
                </Text>
              </View>
            )}
            {comingSoon ? (
              <View style={[styles.tierPill, { backgroundColor: colors.infoLight }]}>
                <Text style={[styles.tierPillText, { color: colors.info }]}>
                  Coming Soon
                </Text>
              </View>
            ) : (
              !availability.tierAllowed && (
                <View style={[styles.tierPill, { backgroundColor: colors.warningLight }]}>
                  <Text style={[styles.tierPillText, { color: colors.warning }]}>
                    {TIER_DISPLAY[preset.tier]}
                  </Text>
                </View>
              )
            )}
          </View>
          <Text
            style={[
              styles.cardSummary,
              { color: locked ? colors.textDisabled : colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {preset.summary}
          </Text>
        </View>
        {selected && (
          <View style={[styles.marker, { backgroundColor: colors.primary }]}>
            <Icon source="check" size={14} color={colors.white} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface PendingDetailsBlockProps {
  preset: RoundPreset;
  isSplitTarget: boolean;
  preview: GeneratedSubMatch[] | null;
  hasTeams: boolean;
  rulesWouldBeIgnored: boolean;
}

function PendingDetailsBlock({
  preset,
  isSplitTarget,
  preview,
  hasTeams,
  rulesWouldBeIgnored,
}: PendingDetailsBlockProps) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.detailsBlock,
        { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.detailsHeading, { color: colors.textPrimary }]}>
        What this does
      </Text>
      <Text style={[styles.detailsBody, { color: colors.textSecondary }]}>
        {preset.longDescription}
      </Text>

      {rulesWouldBeIgnored && (
        <View style={styles.detailsRow}>
          <Icon source="information-outline" size={14} color={colors.warning} />
          <Text style={[styles.detailsNote, { color: colors.warning }]}>
            This competition uses general rules. The override in this preset will
            be saved but ignored at finalization until per-round rules are enabled
            in Competition Settings.
          </Text>
        </View>
      )}

      {isSplitTarget && (
        <>
          <Text style={[styles.previewHeading, { color: colors.textPrimary }]}>
            Sub-match preview
          </Text>
          {!hasTeams ? (
            <Text style={[styles.detailsBody, { color: colors.textSecondary }]}>
              Set up two teams for this round before selecting this preset.
            </Text>
          ) : !preview || preview.length === 0 ? (
            <Text style={[styles.detailsBody, { color: colors.textSecondary }]}>
              Not enough players on both teams to form sub-matches.
            </Text>
          ) : (
            <View style={styles.previewList}>
              {preview.map((sm, i) => (
                <View
                  key={i}
                  style={[
                    styles.previewCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.previewHeader}>
                    <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                      Sub-Match {i + 1}
                    </Text>
                    <View
                      style={[styles.previewTee, { backgroundColor: colors.primaryLighter }]}
                    >
                      <Icon source="clock-outline" size={12} color={colors.primary} />
                      <Text style={[styles.previewTeeText, { color: colors.primary }]}>
                        {formatTeeTimeForDisplay(sm.teeTime)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.previewSide, { color: colors.textSecondary }]}>
                    Team A: {sm.teamAPlayers.map((p) => p.name).join(', ') || '—'}
                  </Text>
                  <Text style={[styles.previewSide, { color: colors.textSecondary }]}>
                    Team B: {sm.teamBPlayers.map((p) => p.name).join(', ') || '—'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  noticeText: {
    ...typography.small,
    flex: 1,
  },
  groupBlock: {
    gap: spacing.sm,
  },
  groupLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 2,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 72,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  cardSummary: {
    ...typography.small,
  },
  currentPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  currentPillText: {
    ...typography.caption,
    fontWeight: '600',
  },
  tierPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tierPillText: {
    ...typography.caption,
    fontWeight: '600',
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsBlock: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  detailsHeading: {
    ...typography.bodyBold,
  },
  detailsBody: {
    ...typography.small,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailsNote: {
    ...typography.small,
    flex: 1,
  },
  previewHeading: {
    ...typography.bodyBold,
    marginTop: spacing.xs,
  },
  previewList: {
    gap: spacing.sm,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  previewTitle: {
    ...typography.bodyBold,
  },
  previewTee: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 3,
  },
  previewTeeText: {
    ...typography.captionBold,
  },
  previewSide: {
    ...typography.small,
  },
});

export default RoundPresetPicker;
