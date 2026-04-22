/**
 * RoundFormatSheet - Choose between Combined and Split (Ryder-Cup) formats.
 *
 * Only relevant for team rounds. When the organizer picks Split, they also
 * choose a sub-match size (1v1 / 2v2 / 3v3) and the system auto-generates
 * balanced head-to-head sub-matches using snake-draft-by-handicap across
 * both teams.
 *
 * Save flow:
 *   - Combined: update rounds.round_format='combined', clear sub_match_size,
 *               delete any existing sub_matches rows.
 *   - Split:    update rounds.round_format='split', set sub_match_size,
 *               replace sub_matches with the generated set.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BottomSheet } from '@/components/common/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsSocial } from '@/context/SubscriptionContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { roundKeys, subMatchKeys } from '@/hooks/queryKeys';
import { updateRound } from '@/screens/admin/EditRoundScreen/hooks/useEditRoundData';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { useSubMatches } from '@/hooks/rounds';
import type { RootStackParamList } from '@/navigation/types';
import {
  replaceSubMatches,
  deleteAllSubMatchesForRound,
} from '@/services/subMatches';
import {
  generateSubMatches,
  formatTeeTimeForDisplay,
  divisorsOf,
  type GeneratedSubMatch,
} from '@/utils/pairingAlgorithm';
import type { PairingPlayer } from '@/types';
import type { RoundFormat } from '@/types';

export interface RoundFormatSheetProps {
  visible: boolean;
  onDismiss: () => void;
  roundId: string;
  competitionId: string | null;
  isTeamRound: boolean;
  currentFormat: RoundFormat;
  currentSubMatchSize: number | null;
  /** Round-level default tee time (HH:mm:ss or null) used for staggered auto-generation. */
  roundTeeTime: string | null;
}

type SubMatchSize = number;
/** Fallback size options shown while teams are loading or unavailable. */
const FALLBACK_SIZES: SubMatchSize[] = [1, 2, 3];
const DEFAULT_INTERVAL_MINUTES = 8;
/** Team rounds with more than 4 total players physically can't tee off
 * together, so we recommend the Split format as the default. */
const AUTO_SPLIT_PLAYER_THRESHOLD = 4;

export function RoundFormatSheet({
  visible,
  onDismiss,
  roundId,
  competitionId,
  isTeamRound,
  currentFormat,
  currentSubMatchSize,
  roundTeeTime,
}: RoundFormatSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Split format is a Social-tier-or-above feature. Free users see the
  // option locked; tapping it routes to the Subscription screen instead of
  // toggling the round state. `useIsSocial()` returns true for Social,
  // Premium, Enterprise, Super Admin, and Developer tiers.
  const canUseSplit = useIsSocial();
  const handleUpgradePress = useCallback(() => {
    onDismiss();
    navigation.navigate('Subscription');
  }, [navigation, onDismiss]);

  const [format, setFormat] = useState<RoundFormat>(currentFormat);
  const [size, setSize] = useState<SubMatchSize>(currentSubMatchSize ?? 2);

  // Teams drive the preview. Only relevant for split format.
  const { teams, isLoading: isTeamsLoading } = useRoundTeams(
    competitionId ?? undefined,
    isTeamRound,
    roundId
  );

  // Valid sub-match sizes derive from the smaller team's size — every
  // divisor of the team size is a valid sub-team size (e.g. team of 4 →
  // 1v1, 2v2, 4v4). When teams haven't loaded yet we show the legacy
  // 1/2/3 options so the sheet still renders meaningfully.
  const teamSize = useMemo(() => {
    const a = teams[0]?.members?.length ?? 0;
    const b = teams[1]?.members?.length ?? 0;
    if (a === 0 || b === 0) return 0;
    return Math.min(a, b);
  }, [teams]);

  const sizeOptions = useMemo<SubMatchSize[]>(
    () => (teamSize > 0 ? divisorsOf(teamSize) : FALLBACK_SIZES),
    [teamSize]
  );

  const totalPlayers = useMemo(
    () =>
      (teams[0]?.members?.length ?? 0) + (teams[1]?.members?.length ?? 0),
    [teams]
  );

  useEffect(() => {
    if (!visible) return;

    // Recommend Split for team rounds that physically can't play as one
    // group. The organizer still has to hit Save, so this is a default,
    // not an auto-write.
    const shouldRecommendSplit =
      isTeamRound &&
      currentFormat === 'combined' &&
      canUseSplit &&
      totalPlayers > AUTO_SPLIT_PLAYER_THRESHOLD;

    setFormat(shouldRecommendSplit ? 'split' : currentFormat);

    // Seed the size: respect the saved value if valid, else prefer 2v2
    // (fits in a foursome), else fall back to the largest option ≤2, else
    // the first valid option.
    const saved = currentSubMatchSize ?? null;
    const fallback =
      sizeOptions.find((s) => s === 2) ??
      [...sizeOptions].reverse().find((s) => s <= 2) ??
      sizeOptions[0] ??
      2;
    const seeded =
      saved !== null && sizeOptions.includes(saved) ? saved : fallback;
    setSize(seeded);
    // We intentionally re-run when sizeOptions changes so the size chip
    // stays in sync when teams finish loading.
  }, [visible, currentFormat, currentSubMatchSize, isTeamRound, canUseSplit, totalPlayers, sizeOptions]);

  // Existing sub-matches — used to block format switches that would
  // overwrite scoring state mid-round. A sub-match past 'upcoming' means
  // scores have been entered; changing the format would lose that work.
  const { data: existingSubMatches } = useSubMatches(roundId);
  const hasInProgressSubMatches = useMemo(
    () => (existingSubMatches ?? []).some((sm) => sm.status !== 'upcoming'),
    [existingSubMatches]
  );
  const isSwitchingFormat = format !== currentFormat;
  const isSwitchBlocked = isSwitchingFormat && hasInProgressSubMatches;

  const startTime = (roundTeeTime ?? '07:00:00').substring(0, 5);

  // Generate preview any time format/size/teams change while split is selected
  const preview = useMemo<{ subMatches: GeneratedSubMatch[]; warnings: string[] } | null>(() => {
    if (format !== 'split') return null;
    if (teams.length < 2) return null;

    const toPairingPlayers = (memberList: typeof teams[number]['members']): PairingPlayer[] =>
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

    return generateSubMatches({
      teamAPlayers: teamA,
      teamBPlayers: teamB,
      subMatchSize: size,
      startTime,
      intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    });
  }, [format, size, teams, startTime]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      if (format === 'combined') {
        await updateRound(roundId, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase types not regenerated
          round_format: 'combined',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sub_match_size: null,
        } as never);
        await deleteAllSubMatchesForRound(roundId);
        return;
      }

      // Split: need teams + a valid preview
      if (!preview || preview.subMatches.length === 0) {
        throw new Error('Unable to generate sub-matches — check that both teams have players.');
      }

      await updateRound(roundId, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        round_format: 'split',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sub_match_size: size,
      } as never);

      await replaceSubMatches({
        roundId,
        subMatches: preview.subMatches.map((sm) => ({
          sortOrder: sm.sortOrder,
          teamAPlayerIds: sm.teamAPlayerIds,
          teamBPlayerIds: sm.teamBPlayerIds,
          teeTime: sm.teeTime,
          pairingId: null,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      queryClient.invalidateQueries({ queryKey: subMatchKeys.list(roundId) });
      onDismiss();
    },
    onError: (err: Error) => {
      Alert.alert('Unable to save', err.message);
    },
  });

  const handleSave = useCallback(() => save(), [save]);

  const canSave =
    !isSwitchBlocked &&
    // Belt-and-braces: if a Free user somehow has Split selected (e.g. the
    // sheet opened on an already-split round after a tier downgrade), they
    // can switch back to Combined but must not be able to keep / re-save
    // Split. The Split option itself is locked, so this only triggers for
    // stale in-memory state.
    !(format === 'split' && !canUseSplit) &&
    (format === 'combined' ||
      (format === 'split' && !!preview && preview.subMatches.length > 0));

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Round Format"
      height={0.7}
      useModal
      testID="edit-round-format-sheet"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {isSwitchBlocked && (
          <View
            style={[
              styles.blockerBox,
              { backgroundColor: colors.warningBackground ?? colors.surfaceVariant, borderColor: colors.warning },
            ]}
          >
            <Icon source="alert-outline" size={18} color={colors.warning} />
            <Text style={[styles.blockerText, { color: colors.warning }]}>
              Can’t change the format: scoring has already started on one or more
              sub-matches. Reset sub-match results first, or keep the current format.
            </Text>
          </View>
        )}

        <FormatOption
          testID="round-format-combined"
          label="Combined"
          description="One team match. Best-ball across all members. Players split across tee times for logistics."
          selected={format === 'combined'}
          onPress={() => setFormat('combined')}
        />
        <FormatOption
          testID="round-format-split"
          label="Split into sub-matches"
          description="Multiple independent head-to-heads aggregated Ryder-Cup style (1 point per sub-match won, 0.5 halved)."
          selected={format === 'split'}
          locked={!canUseSplit}
          lockedLabel="Social tier"
          onPress={() => {
            if (!canUseSplit) {
              handleUpgradePress();
              return;
            }
            setFormat('split');
          }}
        />

        {format === 'split' && (
          <View style={styles.splitDetails}>
            <Text style={[styles.subHeader, { color: colors.textPrimary }]}>Sub-match size</Text>
            <View style={styles.chipRow}>
              {sizeOptions.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.sizeChip,
                    {
                      backgroundColor: size === s ? colors.primary : colors.surfaceVariant,
                      borderColor: size === s ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSize(s)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: size === s }}
                >
                  <Text
                    style={[
                      styles.sizeChipText,
                      { color: size === s ? colors.white : colors.textPrimary },
                    ]}
                  >
                    {s}v{s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.subHeader, { color: colors.textPrimary, marginTop: spacing.lg }]}>
              Preview
            </Text>
            {isTeamsLoading ? (
              <Text style={[styles.previewHint, { color: colors.textSecondary }]}>
                Loading teams…
              </Text>
            ) : teams.length < 2 ? (
              <Text style={[styles.previewHint, { color: colors.textSecondary }]}>
                Set up two teams for this round before choosing Split.
              </Text>
            ) : !preview || preview.subMatches.length === 0 ? (
              <Text style={[styles.previewHint, { color: colors.textSecondary }]}>
                Not enough players to form sub-matches.
              </Text>
            ) : (
              <View style={styles.previewList}>
                {preview.subMatches.map((sm, i) => (
                  <View
                    key={i}
                    style={[styles.previewCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                  >
                    <View style={styles.previewHeader}>
                      <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                        Sub-Match {i + 1}
                      </Text>
                      <View style={[styles.previewTee, { backgroundColor: colors.primaryLighter }]}>
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
                {preview.warnings.length > 0 && (
                  <View
                    style={[styles.warningBox, { backgroundColor: colors.warningBackground ?? colors.surfaceVariant }]}
                  >
                    {preview.warnings.map((w, i) => (
                      <Text key={i} style={[styles.warningText, { color: colors.warning }]}>
                        {w}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
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
        >
          <Text style={[styles.buttonLabel, { color: colors.white }]}>
            {isPending ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

interface FormatOptionProps {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  /** When true, the card dims and shows a lock indicator + tier pill. Tap
   * still fires `onPress` so the caller can route to an upgrade screen. */
  locked?: boolean;
  /** Label shown inside the tier pill when locked (e.g. "Social tier"). */
  lockedLabel?: string;
  testID?: string;
}

function FormatOption({
  label,
  description,
  selected,
  onPress,
  locked = false,
  lockedLabel,
  testID,
}: FormatOptionProps) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      style={[
        styles.optionCard,
        {
          backgroundColor: selected ? colors.primaryLighter : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: locked ? 0.55 : 1,
        },
      ]}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityLabel={label}
      // NOTE: Do not set accessibilityState.disabled here. The tap must
      // remain active even when locked (it routes to the Subscription
      // screen). `disabled: true` would also cause testing-library's
      // fireEvent.press to skip the press, breaking the tier-gate test.
      accessibilityState={{ selected }}
      accessibilityHint={locked ? 'Upgrade required' : undefined}
    >
      <View style={styles.optionHeader}>
        <Icon
          source={
            locked
              ? 'lock-outline'
              : selected
              ? 'radiobox-marked'
              : 'radiobox-blank'
          }
          size={22}
          color={locked ? colors.gray400 : selected ? colors.primary : colors.gray400}
        />
        <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
        {locked && lockedLabel && (
          <View style={[styles.tierPill, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="star-four-points" size={12} color={colors.primary} />
            <Text style={[styles.tierPillText, { color: colors.primary }]}>
              {lockedLabel}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLabel: {
    ...typography.bodyBold,
    flex: 1,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tierPillText: {
    ...typography.captionBold,
  },
  optionDescription: {
    ...typography.small,
    marginLeft: 30,
  },
  splitDetails: {
    marginTop: spacing.sm,
  },
  subHeader: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sizeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  sizeChipText: {
    ...typography.bodyBold,
  },
  previewHint: {
    ...typography.small,
    fontStyle: 'italic',
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
  warningBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 2,
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
  warningText: {
    ...typography.caption,
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

export default RoundFormatSheet;
