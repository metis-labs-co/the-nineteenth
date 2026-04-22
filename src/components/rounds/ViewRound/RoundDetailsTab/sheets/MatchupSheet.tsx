/**
 * MatchupSheet — Pick the two teams squaring off in a team match play round.
 *
 * Only relevant when:
 *   - game_type === 'match-play'
 *   - is_team_round === true
 *   - the competition has 3+ teams (2-team competitions don't need a picker;
 *     the legacy "first two teams" fallback does the right thing).
 *
 * Save flow: writes `team1_id` / `team2_id` on the rounds row. A CHECK
 * constraint in the DB ensures the two are distinct.
 *
 * The sheet blocks saves whenever any sub-match has moved past 'upcoming'
 * so we don't invalidate in-progress scoring — same pattern as
 * RoundFormatSheet.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BottomSheet } from '@/components/common/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { roundKeys } from '@/hooks/queryKeys';
import { updateRound } from '@/screens/admin/EditRoundScreen/hooks/useEditRoundData';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { useSubMatches } from '@/hooks/rounds';

export interface MatchupSheetProps {
  visible: boolean;
  onDismiss: () => void;
  roundId: string;
  competitionId: string | null;
  currentTeam1Id: string | null;
  currentTeam2Id: string | null;
}

type SlotSide = 'a' | 'b';

export function MatchupSheet({
  visible,
  onDismiss,
  roundId,
  competitionId,
  currentTeam1Id,
  currentTeam2Id,
}: MatchupSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  const [team1, setTeam1] = useState<string | null>(currentTeam1Id);
  const [team2, setTeam2] = useState<string | null>(currentTeam2Id);

  useEffect(() => {
    if (visible) {
      setTeam1(currentTeam1Id);
      setTeam2(currentTeam2Id);
    }
  }, [visible, currentTeam1Id, currentTeam2Id]);

  // Team roster for the competition / standalone team_config.
  const { teams, isLoading } = useRoundTeams(
    competitionId ?? undefined,
    true,
    roundId
  );

  // Block the save whenever any sub-match has started so we don't
  // invalidate in-progress scoring.
  const { data: existingSubMatches } = useSubMatches(roundId);
  const hasInProgressSubMatches = useMemo(
    () => (existingSubMatches ?? []).some((sm) => sm.status !== 'upcoming'),
    [existingSubMatches]
  );

  const handlePickTeam = useCallback(
    (slot: SlotSide, teamId: string) => {
      if (slot === 'a') {
        // Picking the same team as slot B clears B to preserve the
        // distinct-teams invariant (also enforced by the DB CHECK).
        setTeam1(teamId);
        if (team2 === teamId) setTeam2(null);
      } else {
        setTeam2(teamId);
        if (team1 === teamId) setTeam1(null);
      }
    },
    [team1, team2]
  );

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      await updateRound(roundId, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase types not regenerated
        team1_id: team1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        team2_id: team2,
      } as never);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      onDismiss();
    },
    onError: (err: Error) => {
      Alert.alert('Unable to save', err.message);
    },
  });

  const bothPicked = !!team1 && !!team2 && team1 !== team2;
  const canSave = bothPicked && !hasInProgressSubMatches;

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Matchup"
      height={0.7}
      useModal
      testID="matchup-sheet"
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
              Scoring has already started on one or more sub-matches. Reset
              them before changing the matchup.
            </Text>
          </View>
        )}

        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          Pick the two teams playing this round. Other teams in the competition
          sit out.
        </Text>

        {isLoading ? (
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Loading teams…
          </Text>
        ) : teams.length < 2 ? (
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Add at least two teams to the competition first.
          </Text>
        ) : (
          <>
            <SlotPicker
              label="Team A"
              accent={colors.success}
              selectedTeamId={team1}
              teams={teams}
              disabledTeamId={team2}
              onPick={(id) => handlePickTeam('a', id)}
            />
            <SlotPicker
              label="Team B"
              accent={colors.error}
              selectedTeamId={team2}
              teams={teams}
              disabledTeamId={team1}
              onPick={(id) => handlePickTeam('b', id)}
            />
          </>
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
          onPress={() => save()}
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

interface SlotPickerProps {
  label: string;
  accent: string;
  selectedTeamId: string | null;
  teams: ReturnType<typeof useRoundTeams>['teams'];
  /** Team ID that's been taken by the other slot — disabled here. */
  disabledTeamId: string | null;
  onPick: (teamId: string) => void;
}

function SlotPicker({
  label,
  accent,
  selectedTeamId,
  teams,
  disabledTeamId,
  onPick,
}: SlotPickerProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.slotBlock}>
      <View style={styles.slotHeader}>
        <View style={[styles.slotDot, { backgroundColor: accent }]} />
        <Text style={[styles.slotLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <View style={styles.optionsColumn}>
        {teams.map((t) => {
          const isSelected = selectedTeamId === t.id;
          const isDisabled = disabledTeamId === t.id && !isSelected;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => !isDisabled && onPick(t.id)}
              disabled={isDisabled}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}
              style={[
                styles.optionRow,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected
                    ? colors.primaryLighter
                    : colors.surface,
                  opacity: isDisabled ? 0.4 : 1,
                },
              ]}
            >
              <Icon
                source={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                size={20}
                color={isSelected ? colors.primary : colors.gray400}
              />
              <Text
                style={[styles.optionLabel, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {t.name}
              </Text>
              <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
                {t.members?.length ?? 0} players
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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
  helperText: {
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

  slotBlock: {
    gap: spacing.sm,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  slotDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  slotLabel: {
    ...typography.captionBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optionsColumn: {
    gap: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  optionLabel: {
    ...typography.bodyBold,
    flex: 1,
  },
  memberCount: {
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

export default MatchupSheet;
