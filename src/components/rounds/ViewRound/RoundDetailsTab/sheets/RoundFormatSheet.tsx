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

import { BottomSheet } from '@/components/common/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { roundKeys, subMatchKeys } from '@/hooks/queryKeys';
import { updateRound } from '@/screens/admin/EditRoundScreen/hooks/useEditRoundData';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import {
  replaceSubMatches,
  deleteAllSubMatchesForRound,
} from '@/services/subMatches';
import {
  generateSubMatches,
  formatTeeTimeForDisplay,
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

type SubMatchSize = 1 | 2 | 3;
const SUB_MATCH_SIZES: SubMatchSize[] = [1, 2, 3];
const DEFAULT_INTERVAL_MINUTES = 8;

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

  const [format, setFormat] = useState<RoundFormat>(currentFormat);
  const [size, setSize] = useState<SubMatchSize>(
    (currentSubMatchSize as SubMatchSize | null) ?? 2
  );

  useEffect(() => {
    if (visible) {
      setFormat(currentFormat);
      setSize((currentSubMatchSize as SubMatchSize | null) ?? 2);
    }
  }, [visible, currentFormat, currentSubMatchSize]);

  // Teams drive the preview. Only relevant for split format.
  const { teams, isLoading: isTeamsLoading } = useRoundTeams(
    competitionId ?? undefined,
    isTeamRound,
    roundId
  );

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
    format === 'combined' ||
    (format === 'split' && !!preview && preview.subMatches.length > 0);

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
        <FormatOption
          label="Combined"
          description="One team match. Best-ball across all members. Players split across tee times for logistics."
          selected={format === 'combined'}
          onPress={() => setFormat('combined')}
        />
        <FormatOption
          label="Split into sub-matches"
          description="Multiple independent head-to-heads aggregated Ryder-Cup style (1 point per sub-match won, 0.5 halved)."
          selected={format === 'split'}
          onPress={() => setFormat('split')}
        />

        {format === 'split' && (
          <View style={styles.splitDetails}>
            <Text style={[styles.subHeader, { color: colors.textPrimary }]}>Sub-match size</Text>
            <View style={styles.chipRow}>
              {SUB_MATCH_SIZES.map((s) => (
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
}

function FormatOption({ label, description, selected, onPress }: FormatOptionProps) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.optionCard,
        {
          backgroundColor: selected ? colors.primaryLighter : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={styles.optionHeader}>
        <Icon
          source={selected ? 'radiobox-marked' : 'radiobox-blank'}
          size={22}
          color={selected ? colors.primary : colors.gray400}
        />
        <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
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
