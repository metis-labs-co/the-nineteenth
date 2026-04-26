/**
 * RoundTypeSheet
 *
 * Single bottom-sheet replacement for the three legacy edit sheets
 * (EditGameTypeSheet, RoundFormatSheet, EditRoundRulesSheet). Lets the
 * organiser pick a canonical round preset that resolves to the full set
 * of format fields the engine consumes.
 *
 * Sub-match generation for split presets happens inline — the sheet
 * reads team rosters via `useRoundTeams` and feeds `generateSubMatches`
 * (same algorithm and preview the old RoundFormatSheet used) before
 * delegating the write to `applyPresetToRound`.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BottomSheet } from '@/components/common/BottomSheet';
import { useTier } from '@/context/SubscriptionContext';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { leaderboardKeys, roundKeys, subMatchKeys } from '@/hooks/queryKeys';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { useSubMatches } from '@/hooks/rounds';
import {
  ROUND_PRESET_GROUP_LABELS,
  ROUND_PRESET_GROUP_ORDER,
  ROUND_PRESET_ORDER,
  ROUND_PRESETS,
  getPresetAvailability,
  inferPresetIdFromRound,
  type PresetAvailability,
  type RoundPreset,
  type RoundPresetId,
  type RoundShapeForPresets,
} from '@/constants/roundPresets';
import { applyPresetToRound } from '@/services/rounds/applyPresetToRound';
import {
  formatTeeTimeForDisplay,
  generateSubMatches,
  type GeneratedSubMatch,
} from '@/utils/pairingAlgorithm';
import type { RootStackParamList } from '@/navigation/types';
import type { PairingPlayer } from '@/types';
import type { SubscriptionTier } from '@/types/subscription.types';

// =============================================================================
// Props
// =============================================================================

export interface RoundTypeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  roundId: string;
  competitionId: string | null;
  /**
   * The round's current format quintet. Used to pre-select the matching
   * preset in the picker and to decide whether split → combined requires
   * deleting existing sub-matches.
   */
  round: RoundShapeForPresets;
  /**
   * Reflects `competitions.per_round_rules_enabled`. When false, presets
   * that carry a `rules_override` will show an "override will be ignored"
   * note — the engine skips overrides in general-rules mode.
   */
  perRoundRulesEnabled: boolean;
  /** Tee time used when regenerating split sub-match start times. */
  roundTeeTime: string | null;
}

const DEFAULT_INTERVAL_MINUTES = 8;
const TIER_DISPLAY: Record<SubscriptionTier, string> = {
  free: 'Free',
  social: 'Social',
  premium: 'Premium',
  enterprise: 'Enterprise',
  super_admin: 'Super Admin',
  developer: 'Developer',
};

// =============================================================================
// Component
// =============================================================================

export function RoundTypeSheet({
  visible,
  onDismiss,
  roundId,
  competitionId,
  round,
  perRoundRulesEnabled,
  roundTeeTime,
}: RoundTypeSheetProps) {
  const colors = useThemeColors();
  const tier = useTier();
  const queryClient = useQueryClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isStandalone = !competitionId;

  // Currently-saved preset, for pre-selection. null = the round's fields
  // don't match any catalog entry (displayed as "Custom" in the picker).
  const currentPresetId = useMemo(() => inferPresetIdFromRound(round), [round]);

  // Local selection state. Starts at the saved preset on open so the
  // "Selected" marker reflects reality.
  const [pendingPresetId, setPendingPresetId] = useState<RoundPresetId | null>(
    currentPresetId
  );

  // Reset the pending selection whenever the sheet is (re)opened — avoids
  // a stale choice lingering between opens.
  React.useEffect(() => {
    if (visible) setPendingPresetId(currentPresetId);
  }, [visible, currentPresetId]);

  // Teams for the competition — needed to generate split sub-matches and
  // to grey-out team presets when the round has no teams configured.
  const { teams } = useRoundTeams(
    competitionId ?? undefined,
    round.is_team_round,
    roundId
  );

  // Block switching away from the current preset if sub-matches have
  // already been scored. Matches the hasInProgressSubMatches guard from
  // the legacy RoundFormatSheet.
  const { data: existingSubMatches } = useSubMatches(roundId);
  const hasInProgressSubMatches = useMemo(
    () => (existingSubMatches ?? []).some((sm) => sm.status !== 'upcoming'),
    [existingSubMatches]
  );

  const startTime = (roundTeeTime ?? '07:00:00').substring(0, 5);

  // Preview the split pairings for whichever preset is currently selected
  // (if split). Drives the "What this does" block and the save guard.
  const pendingPreset = pendingPresetId ? ROUND_PRESETS[pendingPresetId] : null;
  const preview = useMemo<GeneratedSubMatch[] | null>(() => {
    if (!pendingPreset) return null;
    if (pendingPreset.config.round_format !== 'split') return null;
    if (teams.length < 2) return null;
    const size = pendingPreset.config.sub_match_size ?? 2;

    const toPairingPlayers = (
      memberList: typeof teams[number]['members']
    ): PairingPlayer[] =>
      (memberList || [])
        .filter((m) => m.player_id)
        .map((m) => ({
          id: m.player_id,
          name: m.player?.name ?? 'Unknown',
          handicap: m.player?.handicap ?? null,
          handicapIndex: m.player?.handicap_index ?? null,
          gender: m.player?.gender ?? null,
          photoUrl: m.player?.photo_url ?? null,
        }));

    const teamA = toPairingPlayers(teams[0].members);
    const teamB = toPairingPlayers(teams[1].members);

    const result = generateSubMatches({
      teamAPlayers: teamA,
      teamBPlayers: teamB,
      subMatchSize: size,
      startTime,
      intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    });
    return result.subMatches.length > 0 ? result.subMatches : null;
  }, [pendingPreset, teams, startTime]);

  // Apply mutation. Delegates to the service; sub-match regeneration
  // (when the target preset is split) happens inside the callback.
  const { mutate: apply, isPending } = useMutation({
    mutationFn: async () => {
      if (!pendingPresetId) return;
      const target = ROUND_PRESETS[pendingPresetId];
      const needsSubMatches = target.config.round_format === 'split';

      await applyPresetToRound({
        roundId,
        presetId: pendingPresetId,
        currentRoundFormat: round.round_format,
        subMatches: needsSubMatches
          ? (preview ?? []).map((sm) => ({
              sortOrder: sm.sortOrder,
              teamAPlayerIds: sm.teamAPlayerIds,
              teamBPlayerIds: sm.teamBPlayerIds,
              teeTime: sm.teeTime,
              pairingId: null,
            }))
          : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      queryClient.invalidateQueries({ queryKey: subMatchKeys.list(roundId) });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(roundId) });
      if (competitionId) {
        queryClient.invalidateQueries({
          queryKey: leaderboardKeys.competition(competitionId),
        });
      }
      onDismiss();
    },
    onError: (err: Error) => {
      Alert.alert('Unable to save round type', err.message);
    },
  });

  const handleSave = useCallback(() => apply(), [apply]);

  const handleUpgrade = useCallback(() => {
    onDismiss();
    navigation.navigate('Subscription');
  }, [navigation, onDismiss]);

  const availabilityFor = useCallback(
    (preset: RoundPreset): PresetAvailability =>
      getPresetAvailability(preset, {
        tier,
        isStandalone,
        perRoundRulesEnabled,
      }),
    [tier, isStandalone, perRoundRulesEnabled]
  );

  const handleSelect = useCallback(
    (preset: RoundPreset) => {
      const avail = availabilityFor(preset);
      if (avail.comingSoon) return;
      if (!avail.tierAllowed) {
        handleUpgrade();
        return;
      }
      if (!avail.contextAllowed) return; // cannot happen — we don't render
      setPendingPresetId(preset.id);
    },
    [availabilityFor, handleUpgrade]
  );

  // Guard whether Save is usable — covers tier, in-progress scoring,
  // unchanged selection, and split presets with no valid pairings.
  const isSplitTarget = pendingPreset?.config.round_format === 'split';
  const canSave = (() => {
    if (!pendingPresetId) return false;
    if (pendingPresetId === currentPresetId) return false;
    if (hasInProgressSubMatches) return false;
    if (!pendingPreset) return false;
    if (availabilityFor(pendingPreset).comingSoon) return false;
    if (!availabilityFor(pendingPreset).tierAllowed) return false;
    if (!availabilityFor(pendingPreset).contextAllowed) return false;
    if (isSplitTarget && (!preview || preview.length === 0)) return false;
    return true;
  })();

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Round Type"
      height={0.9}
      useModal
      testID="round-type-sheet"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {hasInProgressSubMatches && (
          <View
            style={[
              styles.blockerBox,
              {
                backgroundColor: colors.warningBackground ?? colors.surfaceVariant,
                borderColor: colors.warning,
              },
            ]}
          >
            <Icon source="alert-outline" size={18} color={colors.warning} />
            <Text style={[styles.blockerText, { color: colors.warning }]}>
              Can&apos;t change the round type — scoring has already started on one or
              more sub-matches. Reset sub-match results first.
            </Text>
          </View>
        )}

        {currentPresetId === null && (
          <View
            style={[
              styles.blockerBox,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon source="puzzle-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.blockerText, { color: colors.textSecondary }]}>
              This round currently uses a custom format combination. Pick a preset
              below to switch to a canonical setup.
            </Text>
          </View>
        )}

        {ROUND_PRESET_GROUP_ORDER.map((group) => {
          const ids = ROUND_PRESET_ORDER.filter(
            (id) => ROUND_PRESETS[id].group === group
          );
          const visibleIds = ids.filter((id) => {
            const avail = availabilityFor(ROUND_PRESETS[id]);
            // Hide context-incompatible presets (e.g. team presets on
            // a standalone round) entirely — showing them disabled only
            // creates noise.
            return avail.contextAllowed;
          });
          if (visibleIds.length === 0) return null;

          return (
            <View key={group} style={styles.groupBlock}>
              <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                {ROUND_PRESET_GROUP_LABELS[group]}
              </Text>
              {visibleIds.map((id) => {
                const preset = ROUND_PRESETS[id];
                const avail = availabilityFor(preset);
                const isSelected = pendingPresetId === id;
                const isCurrent = currentPresetId === id;
                return (
                  <PresetCard
                    key={id}
                    preset={preset}
                    availability={avail}
                    selected={isSelected}
                    isCurrent={isCurrent}
                    disabled={isPending || hasInProgressSubMatches}
                    onPress={() => handleSelect(preset)}
                  />
                );
              })}
            </View>
          );
        })}

        {pendingPreset && (
          <PendingDetailsBlock
            preset={pendingPreset}
            isSplitTarget={isSplitTarget}
            preview={preview}
            hasTeams={teams.length >= 2}
            rulesWouldBeIgnored={availabilityFor(pendingPreset).rulesWouldBeIgnored}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={onDismiss}
          style={[styles.button, styles.cancelButton, { borderColor: colors.gray300 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          disabled={isPending}
        >
          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={[
            styles.button,
            { backgroundColor: canSave ? colors.primary : colors.gray300 },
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          disabled={isPending || !canSave}
          testID="round-type-save"
        >
          <Text style={[styles.buttonLabel, { color: colors.white }]}>
            {isPending ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// =============================================================================
// Preset card
// =============================================================================

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
              <View style={[styles.currentPill, { backgroundColor: colors.primaryBackground, borderColor: colors.primary }]}>
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

// =============================================================================
// Pending-selection details (long description + sub-match preview)
// =============================================================================

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
            be saved but ignored at finalization until per-round rules are
            enabled in Competition Settings.
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

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
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
  blockerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  blockerText: {
    ...typography.small,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});

export default RoundTypeSheet;
